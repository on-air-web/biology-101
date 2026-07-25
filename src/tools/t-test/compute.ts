/**
 * Two-group comparison.
 *
 * The return shape is deliberate: `difference`, `ci` and `effectSize` are
 * required, `p` sits alongside them rather than above them. A test that can
 * return a p-value without an effect size makes it easy to report one without
 * the other, and that is the failure mode this whole domain is trying to
 * avoid.
 *
 * Pure. No React, no DOM, no formatting.
 */

import { normalTwoTailedP, tCritical, tTwoTailedP } from '@/lib/stats/distributions';
import { mean, standardDeviation } from '@/lib/stats/descriptives';

export type TestKind = 'welch' | 'student' | 'paired' | 'mann-whitney';

export class TwoGroupError extends Error {}

export interface EffectSize {
  name: string;
  value: number;
  /** Conventional bands. Reported as a hint, never as a verdict. */
  magnitude: 'negligible' | 'small' | 'medium' | 'large';
}

export interface TwoGroupResult {
  kind: TestKind;
  /** Mean difference (group B minus group A), or median difference for ranks. */
  difference: number;
  /** Confidence interval on the difference. Undefined for Mann-Whitney. */
  ci?: [number, number];
  confidence: number;
  effectSize: EffectSize;
  p: number;
  /** Test statistic and its label, for the record. */
  statistic: { label: string; value: number };
  df?: number;
  n: [number, number];
}

function magnitudeOfD(d: number): EffectSize['magnitude'] {
  const size = Math.abs(d);
  if (size < 0.2) return 'negligible';
  if (size < 0.5) return 'small';
  if (size < 0.8) return 'medium';
  return 'large';
}

function requireGroups(a: number[], b: number[], minimum = 2) {
  if (a.length < minimum || b.length < minimum) {
    throw new TwoGroupError(`Each group needs at least ${minimum} values.`);
  }
  if (![...a, ...b].every((value) => Number.isFinite(value))) {
    throw new TwoGroupError('All values must be numbers.');
  }
}

/**
 * Welch's t-test — the default.
 *
 * Welch's is used rather than Student's because it costs almost nothing when
 * variances are equal and protects against inflated error when they are not.
 * Student's remains available for anyone who needs to match a published
 * analysis.
 */
function tTest(a: number[], b: number[], kind: 'welch' | 'student', confidence: number) {
  const [n1, n2] = [a.length, b.length];
  const [m1, m2] = [mean(a), mean(b)];
  const [s1, s2] = [standardDeviation(a), standardDeviation(b)];
  const [v1, v2] = [s1 * s1, s2 * s2];

  let df: number;
  let standardError: number;

  if (kind === 'welch') {
    standardError = Math.sqrt(v1 / n1 + v2 / n2);
    const numerator = (v1 / n1 + v2 / n2) ** 2;
    const denominator = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
    df = denominator === 0 ? n1 + n2 - 2 : numerator / denominator;
  } else {
    df = n1 + n2 - 2;
    const pooledVariance = ((n1 - 1) * v1 + (n2 - 1) * v2) / df;
    standardError = Math.sqrt(pooledVariance * (1 / n1 + 1 / n2));
  }

  if (standardError === 0) {
    throw new TwoGroupError('Both groups have zero variance; no test is possible.');
  }

  const difference = m2 - m1;
  const t = difference / standardError;
  const margin = tCritical(confidence, df) * standardError;

  // Hedges' g: Cohen's d with the small-sample correction. At large n the
  // correction vanishes, so there is no reason to report the uncorrected one.
  const pooledSd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const d = pooledSd === 0 ? 0 : difference / pooledSd;
  const correction = 1 - 3 / (4 * (n1 + n2 - 2) - 1);
  const g = d * correction;

  return {
    difference,
    ci: [difference - margin, difference + margin] as [number, number],
    effectSize: { name: "Hedges' g", value: g, magnitude: magnitudeOfD(g) },
    p: tTwoTailedP(t, df),
    statistic: { label: 't', value: t },
    df,
  };
}

/** Paired t-test on the within-pair differences. */
function pairedTTest(a: number[], b: number[], confidence: number) {
  if (a.length !== b.length) {
    throw new TwoGroupError('A paired test needs the same number of values in each group.');
  }

  const differences = b.map((value, index) => value - a[index]!);
  const md = mean(differences);
  const sd = standardDeviation(differences);
  const n = differences.length;
  const standardError = sd / Math.sqrt(n);

  if (standardError === 0) {
    throw new TwoGroupError('Every pair differs by the same amount; no test is possible.');
  }

  const df = n - 1;
  const t = md / standardError;
  const margin = tCritical(confidence, df) * standardError;
  const dz = md / sd;

  return {
    difference: md,
    ci: [md - margin, md + margin] as [number, number],
    effectSize: { name: "Cohen's dz", value: dz, magnitude: magnitudeOfD(dz) },
    p: tTwoTailedP(t, df),
    statistic: { label: 't', value: t },
    df,
  };
}

/**
 * Mann-Whitney U, by normal approximation with tie and continuity correction.
 *
 * No confidence interval on a difference of means, because the test does not
 * estimate one. The rank-biserial correlation is reported instead: it is the
 * effect size the test actually supports.
 */
function mannWhitney(a: number[], b: number[]) {
  const combined = [...a.map((v) => ({ v, group: 0 })), ...b.map((v) => ({ v, group: 1 }))].sort(
    (x, y) => x.v - y.v,
  );

  // Midranks, so ties are shared rather than arbitrarily ordered.
  const ranks = new Array<number>(combined.length);
  let index = 0;
  const tieGroups: number[] = [];
  while (index < combined.length) {
    let end = index;
    while (end + 1 < combined.length && combined[end + 1]!.v === combined[index]!.v) end += 1;
    const midrank = (index + end + 2) / 2;
    for (let k = index; k <= end; k += 1) ranks[k] = midrank;
    tieGroups.push(end - index + 1);
    index = end + 1;
  }

  const n1 = a.length;
  const n2 = b.length;
  let rankSumA = 0;
  combined.forEach((item, position) => {
    if (item.group === 0) rankSumA += ranks[position]!;
  });

  const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);

  const meanU = (n1 * n2) / 2;
  const n = n1 + n2;
  const tieCorrection = tieGroups.reduce((sum, size) => sum + (size ** 3 - size), 0);
  const variance = ((n1 * n2) / 12) * (n + 1 - tieCorrection / (n * (n - 1)));

  if (variance <= 0) throw new TwoGroupError('All values are identical; no test is possible.');

  // Clamped at zero: when U sits exactly on its expected value there is no
  // evidence either way, and an uncorrected continuity term would push the
  // statistic negative and understate the p-value.
  const z = Math.max(Math.abs(u - meanU) - 0.5, 0) / Math.sqrt(variance);
  // Rank-biserial correlation: the proportion of pairs favouring one group.
  const rankBiserial = 1 - (2 * u) / (n1 * n2);

  return {
    difference: median(b) - median(a),
    ci: undefined,
    effectSize: {
      name: 'Rank-biserial r',
      value: u1 >= u2 ? rankBiserial : -rankBiserial,
      magnitude: magnitudeOfD(rankBiserial * 2),
    },
    p: normalTwoTailedP(z),
    statistic: { label: 'U', value: u },
    df: undefined,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

export function compareTwoGroups(
  a: number[],
  b: number[],
  kind: TestKind = 'welch',
  confidence = 0.95,
): TwoGroupResult {
  requireGroups(a, b, kind === 'mann-whitney' ? 3 : 2);
  if (confidence <= 0 || confidence >= 1) {
    throw new TwoGroupError('Confidence must lie between 0 and 1.');
  }

  const core =
    kind === 'paired'
      ? pairedTTest(a, b, confidence)
      : kind === 'mann-whitney'
        ? mannWhitney(a, b)
        : tTest(a, b, kind, confidence);

  return { kind, confidence, n: [a.length, b.length], ...core };
}
