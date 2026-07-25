/**
 * Correlation and simple linear regression.
 *
 * The correlation coefficient is itself the effect size, so it leads — with a
 * confidence interval, which is the part almost every calculator omits. An r
 * of 0.6 from eight points and an r of 0.6 from eight hundred are very
 * different claims, and only the interval says so.
 */

import { normalCritical, tCritical, tTwoTailedP } from '@/lib/stats/distributions';
import { mean } from '@/lib/stats/descriptives';

export type CorrelationMethod = 'pearson' | 'spearman';

export class CorrelationError extends Error {}

export interface CorrelationResult {
  method: CorrelationMethod;
  r: number;
  /** Interval on r via Fisher's z transformation. Needs n > 3. */
  ci?: [number, number];
  rSquared: number;
  t: number;
  df: number;
  p: number;
  n: number;
  confidence: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  slopeCi: [number, number];
  slopeStandardError: number;
  rSquared: number;
  /** Root mean squared residual — the typical distance from the line. */
  residualStandardError: number;
  n: number;
  p: number;
}

function requirePairs(x: readonly number[], y: readonly number[], minimum = 3) {
  if (x.length !== y.length) {
    throw new CorrelationError('Both variables need the same number of values.');
  }
  if (x.length < minimum) {
    throw new CorrelationError(`Need at least ${minimum} pairs.`);
  }
  if (![...x, ...y].every((value) => Number.isFinite(value))) {
    throw new CorrelationError('All values must be numbers.');
  }
}

/** Midranks, so tied values share a rank rather than being ordered arbitrarily. */
function rank(values: readonly number[]): number[] {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length);

  let position = 0;
  while (position < indexed.length) {
    let end = position;
    while (end + 1 < indexed.length && indexed[end + 1]!.value === indexed[position]!.value) {
      end += 1;
    }
    const midrank = (position + end + 2) / 2;
    for (let k = position; k <= end; k += 1) ranks[indexed[k]!.index] = midrank;
    position = end + 1;
  }
  return ranks;
}

function pearsonR(x: readonly number[], y: readonly number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let index = 0; index < x.length; index += 1) {
    const dx = x[index]! - mx;
    const dy = y[index]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) {
    throw new CorrelationError('One of the variables does not vary; correlation is undefined.');
  }
  return sxy / Math.sqrt(sxx * syy);
}

export function correlate(
  x: readonly number[],
  y: readonly number[],
  method: CorrelationMethod = 'pearson',
  confidence = 0.95,
): CorrelationResult {
  requirePairs(x, y);

  const [a, b] = method === 'spearman' ? [rank(x), rank(y)] : [x, y];
  const r = pearsonR(a, b);
  const n = x.length;
  const df = n - 2;

  if (Math.abs(r) >= 1) {
    return {
      method,
      r,
      rSquared: 1,
      t: Number.POSITIVE_INFINITY,
      df,
      p: 0,
      n,
      confidence,
      ci: [r, r],
    };
  }

  const t = r * Math.sqrt(df / (1 - r * r));

  // Fisher's z: atanh(r) is approximately normal with SE 1/√(n−3).
  let ci: [number, number] | undefined;
  if (n > 3) {
    const z = Math.atanh(r);
    const standardError = 1 / Math.sqrt(n - 3);
    const margin = normalCritical(confidence) * standardError;
    ci = [Math.tanh(z - margin), Math.tanh(z + margin)];
  }

  return { method, r, ci, rSquared: r * r, t, df, p: tTwoTailedP(t, df), n, confidence };
}

/** Ordinary least squares of y on x. */
export function linearRegression(
  x: readonly number[],
  y: readonly number[],
  confidence = 0.95,
): RegressionResult {
  requirePairs(x, y);

  const n = x.length;
  const mx = mean(x);
  const my = mean(y);

  let sxy = 0;
  let sxx = 0;
  for (let index = 0; index < n; index += 1) {
    sxy += (x[index]! - mx) * (y[index]! - my);
    sxx += (x[index]! - mx) ** 2;
  }
  if (sxx === 0) throw new CorrelationError('The predictor does not vary; no line can be fitted.');

  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  let residualSumSquares = 0;
  let totalSumSquares = 0;
  for (let index = 0; index < n; index += 1) {
    const predicted = intercept + slope * x[index]!;
    residualSumSquares += (y[index]! - predicted) ** 2;
    totalSumSquares += (y[index]! - my) ** 2;
  }

  const df = n - 2;
  const residualStandardError = Math.sqrt(residualSumSquares / df);
  const slopeStandardError = residualStandardError / Math.sqrt(sxx);
  const margin = tCritical(confidence, df) * slopeStandardError;
  const t = slopeStandardError === 0 ? Number.POSITIVE_INFINITY : slope / slopeStandardError;

  return {
    slope,
    intercept,
    slopeCi: [slope - margin, slope + margin],
    slopeStandardError,
    rSquared: totalSumSquares === 0 ? 0 : 1 - residualSumSquares / totalSumSquares,
    residualStandardError,
    n,
    p: Number.isFinite(t) ? tTwoTailedP(t, df) : 0,
  };
}
