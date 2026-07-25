/**
 * Contingency tables: chi-square, Fisher's exact, and the odds ratio.
 *
 * Effect size leads here too. Cramér's V for any table, and for a 2×2 the odds
 * ratio with its interval — which is what a clinician or a geneticist actually
 * wants, and what a bare p-value refuses to give them.
 *
 * Fisher's exact is recommended automatically when any expected count falls
 * below five, because that is when the chi-square approximation stops holding
 * and most bench data is small enough for it to matter.
 */

import { chiSquareP, normalCritical } from '@/lib/stats/distributions';
import { logGamma } from '@/lib/stats/distributions';

export class ContingencyError extends Error {}

export interface ChiSquareResult {
  chiSquare: number;
  df: number;
  p: number;
  expected: number[][];
  /** Cramér's V: 0 to 1, comparable across table sizes. */
  cramersV: number;
  minimumExpected: number;
  /** True when the chi-square approximation is unreliable. */
  expectedTooSmall: boolean;
  /** Applied automatically to 2×2 tables. */
  yatesApplied: boolean;
  n: number;
}

export interface FisherResult {
  p: number;
  oddsRatio: number;
  /** Woolf interval on the odds ratio. Undefined when a cell is zero. */
  oddsRatioCi?: [number, number];
}

function validate(table: number[][]) {
  if (table.length < 2) throw new ContingencyError('A table needs at least two rows.');
  const width = table[0]!.length;
  if (width < 2) throw new ContingencyError('A table needs at least two columns.');
  for (const row of table) {
    if (row.length !== width) throw new ContingencyError('Every row needs the same length.');
    for (const cell of row) {
      if (!Number.isFinite(cell) || cell < 0) {
        throw new ContingencyError('Counts must be zero or a positive number.');
      }
      if (!Number.isInteger(cell)) throw new ContingencyError('Counts must be whole numbers.');
    }
  }
  if (table.flat().reduce((sum, cell) => sum + cell, 0) === 0) {
    throw new ContingencyError('The table is empty.');
  }
}

export function chiSquareTest(table: number[][]): ChiSquareResult {
  validate(table);

  const rows = table.map((row) => row.reduce((sum, cell) => sum + cell, 0));
  const columns = table[0]!.map((_, index) => table.reduce((sum, row) => sum + row[index]!, 0));
  const n = rows.reduce((sum, value) => sum + value, 0);

  const expected = table.map((_, i) => columns.map((columnTotal) => (rows[i]! * columnTotal) / n));
  const minimumExpected = Math.min(...expected.flat());

  // Yates' continuity correction, applied only to 2×2 as convention dictates.
  const isTwoByTwo = table.length === 2 && table[0]!.length === 2;

  let chiSquare = 0;
  for (let i = 0; i < table.length; i += 1) {
    for (let j = 0; j < table[i]!.length; j += 1) {
      const e = expected[i]![j]!;
      if (e === 0) continue;
      const deviation = Math.abs(table[i]![j]! - e);
      const adjusted = isTwoByTwo ? Math.max(deviation - 0.5, 0) : deviation;
      chiSquare += (adjusted * adjusted) / e;
    }
  }

  const df = (table.length - 1) * (table[0]!.length - 1);
  const smallerDimension = Math.min(table.length, table[0]!.length) - 1;

  return {
    chiSquare,
    df,
    p: chiSquareP(chiSquare, df),
    expected,
    cramersV: smallerDimension === 0 ? 0 : Math.sqrt(chiSquare / (n * smallerDimension)),
    minimumExpected,
    expectedTooSmall: minimumExpected < 5,
    yatesApplied: isTwoByTwo,
    n,
  };
}

function logCombination(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/**
 * Fisher's exact test on a 2×2 table, two-tailed.
 *
 * Two-tailed by summing every table at least as extreme as the observed one,
 * measured by probability — the convention R uses, and stricter than doubling
 * one tail.
 */
export function fisherExact(table: number[][]): FisherResult {
  validate(table);
  if (table.length !== 2 || table[0]!.length !== 2) {
    throw new ContingencyError("Fisher's exact test here handles 2×2 tables only.");
  }

  const [[a, b], [c, d]] = table as [[number, number], [number, number]];
  const rowOne = a + b;
  const rowTwo = c + d;
  const columnOne = a + c;
  const n = rowOne + rowTwo;

  const probability = (i: number) =>
    Math.exp(
      logCombination(rowOne, i) +
        logCombination(rowTwo, columnOne - i) -
        logCombination(n, columnOne),
    );

  const observed = probability(a);
  const low = Math.max(0, columnOne - rowTwo);
  const high = Math.min(rowOne, columnOne);

  let p = 0;
  for (let i = low; i <= high; i += 1) {
    const value = probability(i);
    // Tolerance so floating point does not drop a table of equal probability.
    if (value <= observed * (1 + 1e-9)) p += value;
  }

  const oddsRatio = b * c === 0 ? Number.POSITIVE_INFINITY : (a * d) / (b * c);

  let oddsRatioCi: [number, number] | undefined;
  if (a > 0 && b > 0 && c > 0 && d > 0) {
    const logOr = Math.log(oddsRatio);
    const standardError = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    const margin = normalCritical(0.95) * standardError;
    oddsRatioCi = [Math.exp(logOr - margin), Math.exp(logOr + margin)];
  }

  return { p: Math.min(p, 1), oddsRatio, oddsRatioCi };
}

/** Parses a pasted table: rows on lines, cells separated by anything sensible. */
export function parseTable(input: string): number[][] {
  const rows = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) =>
      line
        .split(/[\s,;\t]+/)
        .filter((token) => token !== '')
        .map((token) => {
          const value = Number(token);
          if (!Number.isFinite(value)) throw new ContingencyError(`"${token}" is not a number.`);
          return value;
        }),
    );
  return rows;
}
