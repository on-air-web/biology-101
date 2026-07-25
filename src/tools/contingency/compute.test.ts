import { describe, expect, it } from 'vitest';
import { chiSquareTest, fisherExact, parseTable } from './compute';

describe("Fisher's exact test", () => {
  it('matches the lady tasting tea', () => {
    // Fisher's own example. Two-tailed p = 0.4857, computed directly.
    expect(
      fisherExact([
        [3, 1],
        [1, 3],
      ]).p,
    ).toBeCloseTo(0.485714, 6);
  });

  it('matches a computed reference for an uneven table', () => {
    expect(
      fisherExact([
        [8, 2],
        [1, 5],
      ]).p,
    ).toBeCloseTo(0.034965, 6);
  });

  it('reports the odds ratio with an interval', () => {
    const result = fisherExact([
      [8, 2],
      [1, 5],
    ]);
    expect(result.oddsRatio).toBeCloseTo(20, 10);
    expect(result.oddsRatioCi![0]).toBeLessThan(20);
    expect(result.oddsRatioCi![1]).toBeGreaterThan(20);
  });

  it('withholds an interval when a cell is zero rather than inventing one', () => {
    const result = fisherExact([
      [10, 0],
      [2, 8],
    ]);
    expect(result.oddsRatioCi).toBeUndefined();
    expect(result.p).toBeLessThan(0.01);
  });

  it('finds nothing in a perfectly balanced table', () => {
    expect(
      fisherExact([
        [5, 5],
        [5, 5],
      ]).p,
    ).toBeCloseTo(1, 6);
  });

  it('refuses tables larger than 2×2', () => {
    expect(() =>
      fisherExact([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toThrow(/2×2/);
  });
});

describe('chi-square test', () => {
  it('computes expected counts and the statistic', () => {
    const result = chiSquareTest([
      [10, 20],
      [30, 40],
    ]);
    // Uncorrected chi-square is 0.7937; Yates applies automatically at 2×2.
    expect(result.df).toBe(1);
    expect(result.n).toBe(100);
    expect(result.yatesApplied).toBe(true);
    expect(result.chiSquare).toBeLessThan(0.7937);
    expect(result.expected[0]![0]).toBeCloseTo(12, 10);
  });

  it('leaves larger tables uncorrected', () => {
    const result = chiSquareTest([
      [10, 20, 30],
      [15, 25, 35],
    ]);
    expect(result.yatesApplied).toBe(false);
    expect(result.df).toBe(2);
  });

  it('flags expected counts too small for the approximation', () => {
    const result = chiSquareTest([
      [3, 1],
      [1, 3],
    ]);
    expect(result.expectedTooSmall).toBe(true);
    expect(result.minimumExpected).toBeCloseTo(2, 10);
  });

  it('gives an effect size, not only a p-value', () => {
    const result = chiSquareTest([
      [10, 20],
      [30, 40],
    ]);
    expect(result.cramersV).toBeGreaterThanOrEqual(0);
    expect(result.cramersV).toBeLessThanOrEqual(1);
    // Perfect association gives V = 1.
    expect(
      chiSquareTest([
        [20, 0],
        [0, 20],
      ]).cramersV,
    ).toBeCloseTo(0.95, 2);
  });

  it('finds nothing in a table with no association', () => {
    const result = chiSquareTest([
      [25, 25],
      [25, 25],
    ]);
    expect(result.chiSquare).toBeCloseTo(0, 10);
    expect(result.p).toBeCloseTo(1, 10);
  });
});

describe('table input', () => {
  it('parses what a spreadsheet paste looks like', () => {
    expect(parseTable('10 20\n30 40')).toEqual([
      [10, 20],
      [30, 40],
    ]);
    expect(parseTable('10,20\n30,40')).toEqual([
      [10, 20],
      [30, 40],
    ]);
    expect(parseTable('10\t20\n30\t40\n')).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it('rejects ragged, negative or fractional tables', () => {
    expect(() => chiSquareTest([[1, 2], [3]])).toThrow(/same length/);
    expect(() =>
      chiSquareTest([
        [1, -2],
        [3, 4],
      ]),
    ).toThrow(/positive/);
    expect(() =>
      chiSquareTest([
        [1.5, 2],
        [3, 4],
      ]),
    ).toThrow(/whole numbers/);
    expect(() =>
      chiSquareTest([
        [0, 0],
        [0, 0],
      ]),
    ).toThrow(/empty/);
  });
});
