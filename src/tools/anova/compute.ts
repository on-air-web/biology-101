/**
 * One-way ANOVA.
 *
 * Same editorial rule as the two-group test: the effect size is required, not
 * optional, and the p-value sits beside it rather than above it.
 *
 * Post-hoc comparisons are Welch t-tests with Holm's correction rather than
 * Tukey's HSD. Tukey needs the studentized range distribution, which is a
 * large amount of numerical machinery for a result that assumes equal
 * variances anyway; Welch pairs with Holm control the family-wise error rate
 * just as rigorously without that assumption. The page says which it used, so
 * nobody mistakes it for Tukey.
 */

import { fP } from '@/lib/stats/distributions';
import { mean, variance } from '@/lib/stats/descriptives';
import { compareTwoGroups } from '@/tools/t-test/compute';

export class AnovaError extends Error {}

export interface AnovaGroup {
  label: string;
  values: number[];
}

export interface PairwiseResult {
  a: string;
  b: string;
  difference: number;
  ci: [number, number];
  p: number;
  adjustedP: number;
}

export interface AnovaResult {
  f: number;
  df1: number;
  df2: number;
  p: number;
  /** Proportion of total variance explained. Biased upward at small n. */
  etaSquared: number;
  /** Less biased estimate of the same quantity; can go slightly negative. */
  omegaSquared: number;
  grandMean: number;
  groupCount: number;
  totalN: number;
  pairwise: PairwiseResult[];
}

/** Holm's step-down correction. Uniformly more powerful than Bonferroni. */
function holm(pValues: number[]): number[] {
  const m = pValues.length;
  const ordered = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);

  const adjusted = new Array<number>(m);
  let running = 0;
  ordered.forEach((entry, position) => {
    running = Math.max(running, Math.min((m - position) * entry.p, 1));
    adjusted[entry.index] = running;
  });
  return adjusted;
}

export function oneWayAnova(groups: AnovaGroup[], confidence = 0.95): AnovaResult {
  if (groups.length < 3) {
    throw new AnovaError('ANOVA needs at least three groups. For two, use the t-test.');
  }
  for (const group of groups) {
    if (group.values.length < 2) {
      throw new AnovaError(`Group "${group.label}" needs at least two values.`);
    }
    if (!group.values.every((value) => Number.isFinite(value))) {
      throw new AnovaError(`Group "${group.label}" contains a value that is not a number.`);
    }
  }

  const all = groups.flatMap((group) => group.values);
  const totalN = all.length;
  const grandMean = mean(all);
  const k = groups.length;

  const ssBetween = groups.reduce(
    (sum, group) => sum + group.values.length * (mean(group.values) - grandMean) ** 2,
    0,
  );
  const ssWithin = groups.reduce(
    (sum, group) => sum + (group.values.length - 1) * variance(group.values),
    0,
  );
  const ssTotal = ssBetween + ssWithin;

  const df1 = k - 1;
  const df2 = totalN - k;
  if (df2 <= 0) throw new AnovaError('Not enough data for the number of groups.');
  if (ssWithin === 0) {
    throw new AnovaError('There is no variation within groups; no test is possible.');
  }

  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  const f = msBetween / msWithin;

  const etaSquared = ssTotal === 0 ? 0 : ssBetween / ssTotal;
  const omegaSquared =
    ssTotal + msWithin === 0 ? 0 : (ssBetween - df1 * msWithin) / (ssTotal + msWithin);

  // Every pair, by Welch, then corrected together.
  const raw: Omit<PairwiseResult, 'adjustedP'>[] = [];
  for (let i = 0; i < k; i += 1) {
    for (let j = i + 1; j < k; j += 1) {
      const result = compareTwoGroups(groups[i]!.values, groups[j]!.values, 'welch', confidence);
      raw.push({
        a: groups[i]!.label,
        b: groups[j]!.label,
        difference: result.difference,
        ci: result.ci!,
        p: result.p,
      });
    }
  }

  const adjusted = holm(raw.map((entry) => entry.p));

  return {
    f,
    df1,
    df2,
    p: fP(f, df1, df2),
    etaSquared,
    omegaSquared,
    grandMean,
    groupCount: k,
    totalN,
    pairwise: raw.map((entry, index) => ({ ...entry, adjustedP: adjusted[index]! })),
  };
}
