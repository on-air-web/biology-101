/**
 * Multiple testing correction.
 *
 * Two methods, controlling two different things, and the distinction matters
 * more than the arithmetic:
 *
 *   Bonferroni — controls the family-wise error rate: the probability of even
 *                one false positive anywhere. Severe, and right for a handful
 *                of pre-planned comparisons.
 *   Benjamini–Hochberg — controls the false discovery rate: the expected
 *                proportion of false positives among the results you call
 *                significant. The standard for genomics, where a 5% error rate
 *                inside a hit list is an acceptable trade.
 */

export type CorrectionMethod = 'bonferroni' | 'benjamini-hochberg';

export class CorrectionError extends Error {}

export interface CorrectedValue {
  /** Position in the input, so results can be matched back to their labels. */
  index: number;
  p: number;
  adjusted: number;
  rank: number;
}

export interface CorrectionResult {
  method: CorrectionMethod;
  values: CorrectedValue[];
  /** Count passing the threshold before and after correction. */
  significantBefore: number;
  significantAfter: number;
  threshold: number;
}

export function correctPValues(
  pValues: readonly number[],
  method: CorrectionMethod = 'benjamini-hochberg',
  threshold = 0.05,
): CorrectionResult {
  if (pValues.length === 0) throw new CorrectionError('Enter at least one p-value.');
  for (const p of pValues) {
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new CorrectionError(`${p} is not a p-value — they lie between 0 and 1.`);
    }
  }
  if (threshold <= 0 || threshold >= 1) {
    throw new CorrectionError('The threshold must lie between 0 and 1.');
  }

  const m = pValues.length;
  const ordered = pValues
    .map((p, index) => ({ p, index }))
    .sort((a, b) => a.p - b.p)
    .map((entry, position) => ({ ...entry, rank: position + 1 }));

  let adjustedByRank: number[];

  if (method === 'bonferroni') {
    adjustedByRank = ordered.map((entry) => Math.min(entry.p * m, 1));
  } else {
    // Step-up: scale by m/rank, then enforce monotonicity from the largest
    // p downwards so an adjusted value never falls below a smaller one.
    const raw = ordered.map((entry) => Math.min((entry.p * m) / entry.rank, 1));
    adjustedByRank = new Array<number>(m);
    let runningMinimum = 1;
    for (let position = m - 1; position >= 0; position -= 1) {
      runningMinimum = Math.min(runningMinimum, raw[position]!);
      adjustedByRank[position] = runningMinimum;
    }
  }

  const values = ordered
    .map((entry, position) => ({
      index: entry.index,
      p: entry.p,
      adjusted: adjustedByRank[position]!,
      rank: entry.rank,
    }))
    .sort((a, b) => a.index - b.index);

  return {
    method,
    values,
    significantBefore: pValues.filter((p) => p < threshold).length,
    significantAfter: values.filter((value) => value.adjusted < threshold).length,
    threshold,
  };
}
