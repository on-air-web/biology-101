import { describe, expect, it } from 'vitest';
import { TwoGroupError, compareTwoGroups } from './compute';

/**
 * The worked example is chosen so every number can be checked by hand:
 *   A = 1..5  (mean 3, variance 2.5)
 *   B = 6..10 (mean 8, variance 2.5)
 * SE = √(2.5/5 + 2.5/5) = 1, so t = 5 exactly and Welch's df = 8 exactly.
 */
const A = [1, 2, 3, 4, 5];
const B = [6, 7, 8, 9, 10];

describe("Welch's t-test", () => {
  const result = compareTwoGroups(A, B, 'welch');

  it('computes the statistic and df exactly', () => {
    expect(result.statistic.value).toBeCloseTo(5, 10);
    expect(result.df).toBeCloseTo(8, 10);
  });

  it('reports the difference and its interval', () => {
    expect(result.difference).toBeCloseTo(5, 10);
    // 5 ± t(0.975, 8) × 1 = 5 ± 2.306
    expect(result.ci?.[0]).toBeCloseTo(2.694, 3);
    expect(result.ci?.[1]).toBeCloseTo(7.306, 3);
  });

  it('reports an effect size, corrected for small samples', () => {
    // Cohen's d = 5 / √2.5 = 3.1623; Hedges' correction at n=10 is 1 − 3/31.
    expect(result.effectSize.name).toBe("Hedges' g");
    expect(result.effectSize.value).toBeCloseTo(3.1623 * (1 - 3 / 31), 3);
    expect(result.effectSize.magnitude).toBe('large');
  });

  it('gives the p-value', () => {
    expect(result.p).toBeCloseTo(0.00105282579, 8);
  });

  it('is antisymmetric in the order of the groups', () => {
    const reversed = compareTwoGroups(B, A, 'welch');
    expect(reversed.difference).toBeCloseTo(-result.difference, 10);
    expect(reversed.p).toBeCloseTo(result.p, 12);
  });
});

describe("Student's t-test", () => {
  it('matches Welch when variances and sizes are equal', () => {
    const welch = compareTwoGroups(A, B, 'welch');
    const student = compareTwoGroups(A, B, 'student');
    expect(student.df).toBeCloseTo(8, 10);
    expect(student.p).toBeCloseTo(welch.p, 10);
  });

  it('diverges from Welch when variances differ sharply', () => {
    const wide = [0, 10, 20, 30, 40];
    const welch = compareTwoGroups(A, wide, 'welch');
    const student = compareTwoGroups(A, wide, 'student');
    expect(welch.df).toBeLessThan(student.df!);
  });
});

describe('paired t-test', () => {
  it('tests the within-pair differences', () => {
    // Every pair differs by exactly 5, but with variation added.
    const before = [10, 12, 14, 16, 18];
    const after = [12, 15, 15, 19, 20];
    const result = compareTwoGroups(before, after, 'paired');
    expect(result.difference).toBeCloseTo(2.2, 10);
    expect(result.df).toBe(4);
    expect(result.effectSize.name).toBe("Cohen's dz");
  });

  it('refuses unequal group sizes', () => {
    expect(() => compareTwoGroups([1, 2, 3], [1, 2], 'paired')).toThrow(/same number/);
  });

  it('refuses a constant difference, which has no variance', () => {
    expect(() => compareTwoGroups([1, 2, 3], [2, 3, 4], 'paired')).toThrow(TwoGroupError);
  });
});

describe('Mann-Whitney U', () => {
  it('reaches U = 0 for perfectly separated groups', () => {
    const result = compareTwoGroups(A, B, 'mann-whitney');
    expect(result.statistic.label).toBe('U');
    expect(result.statistic.value).toBeCloseTo(0, 10);
    expect(result.p).toBeLessThan(0.05);
  });

  it('offers no interval on a difference it does not estimate', () => {
    expect(compareTwoGroups(A, B, 'mann-whitney').ci).toBeUndefined();
  });

  it('finds no evidence at all between identical distributions', () => {
    // U lands exactly on its expected value, so the corrected statistic is
    // zero and p is 1. Anything less would be evidence conjured from nothing.
    const result = compareTwoGroups([1, 2, 3, 4], [1, 2, 3, 4], 'mann-whitney');
    expect(result.p).toBeCloseTo(1, 10);
    expect(result.effectSize.value).toBeCloseTo(0, 10);
  });

  it('handles ties without dividing by zero', () => {
    const result = compareTwoGroups([1, 1, 1, 2], [1, 2, 2, 2], 'mann-whitney');
    expect(Number.isFinite(result.p)).toBe(true);
  });
});

describe('input handling', () => {
  it('requires enough data', () => {
    expect(() => compareTwoGroups([1], [2, 3], 'welch')).toThrow(TwoGroupError);
  });

  it('rejects non-numeric values', () => {
    expect(() => compareTwoGroups([1, Number.NaN], [2, 3], 'welch')).toThrow(TwoGroupError);
  });

  it('rejects an impossible confidence level', () => {
    expect(() => compareTwoGroups(A, B, 'welch', 1.5)).toThrow(TwoGroupError);
  });

  it('widens the interval at higher confidence', () => {
    const ninetyFive = compareTwoGroups(A, B, 'welch', 0.95);
    const ninetyNine = compareTwoGroups(A, B, 'welch', 0.99);
    expect(ninetyNine.ci![1] - ninetyNine.ci![0]).toBeGreaterThan(
      ninetyFive.ci![1] - ninetyFive.ci![0],
    );
  });
});
