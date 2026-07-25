/**
 * Descriptive statistics.
 *
 * Sample statistics throughout — variance and standard deviation use n − 1,
 * because experimental data is a sample from a population, never the whole of
 * it. Population versions are not offered, since offering both invites the
 * wrong choice for no benefit.
 */

export class DescriptiveError extends Error {}

function requireValues(values: readonly number[], minimum = 1) {
  if (values.length < minimum) {
    throw new DescriptiveError(`Need at least ${minimum} value${minimum === 1 ? '' : 's'}.`);
  }
}

export function mean(values: readonly number[]): number {
  requireValues(values);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Sample variance, denominator n − 1. */
export function variance(values: readonly number[]): number {
  requireValues(values, 2);
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}

export function standardDeviation(values: readonly number[]): number {
  return Math.sqrt(variance(values));
}

/** Standard error of the mean. Describes the estimate, not the spread. */
export function standardError(values: readonly number[]): number {
  return standardDeviation(values) / Math.sqrt(values.length);
}

export function median(values: readonly number[]): number {
  requireValues(values);
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

/** Linear interpolation between order statistics — the R type 7 default. */
export function quantile(values: readonly number[], probability: number): number {
  requireValues(values);
  if (probability < 0 || probability > 1) {
    throw new DescriptiveError('Quantile probability must lie between 0 and 1.');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (position - lower) * (sorted[upper]! - sorted[lower]!);
}

export interface Summary {
  n: number;
  mean: number;
  sd: number;
  sem: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

export function summarise(values: readonly number[]): Summary {
  requireValues(values, 2);
  return {
    n: values.length,
    mean: mean(values),
    sd: standardDeviation(values),
    sem: standardError(values),
    median: median(values),
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Parses pasted numbers.
 *
 * Accepts anything a spreadsheet column, a comma list or a space-separated row
 * produces, because that is how the data actually arrives.
 */
export function parseNumberList(input: string): number[] {
  return input
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token !== '')
    .map((token) => {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new DescriptiveError(`"${token}" is not a number.`);
      return value;
    });
}
