import { describe, expect, it } from 'vitest';
import { AnovaError, oneWayAnova } from './compute';

/**
 * Worked example chosen so the sums of squares are checkable by hand:
 *   A = 1,2,3   (mean 2)
 *   B = 4,5,6   (mean 5)
 *   C = 7,8,9   (mean 8)
 * Grand mean 5. SS between = 3(9) + 3(0) + 3(9) = 54. SS within = 3 × 2 = 6.
 * F = (54/2) / (6/6) = 27.
 */
const GROUPS = [
  { label: 'A', values: [1, 2, 3] },
  { label: 'B', values: [4, 5, 6] },
  { label: 'C', values: [7, 8, 9] },
];

describe('one-way ANOVA', () => {
  const result = oneWayAnova(GROUPS);

  it('computes F and its degrees of freedom exactly', () => {
    expect(result.f).toBeCloseTo(27, 10);
    expect(result.df1).toBe(2);
    expect(result.df2).toBe(6);
  });

  it('reports the p-value', () => {
    // Upper tail of F(2,6) at 27.
    expect(result.p).toBeCloseTo(0.001, 3);
    expect(result.p).toBeLessThan(0.05);
  });

  it('reports variance explained, and the less biased version too', () => {
    // eta² = 54 / 60 = 0.9
    expect(result.etaSquared).toBeCloseTo(0.9, 10);
    // omega² = (54 − 2×1) / (60 + 1) = 52/61
    expect(result.omegaSquared).toBeCloseTo(52 / 61, 10);
    expect(result.omegaSquared).toBeLessThan(result.etaSquared);
  });

  it('compares every pair', () => {
    expect(result.pairwise).toHaveLength(3);
    expect(result.pairwise.map((pair) => `${pair.a}-${pair.b}`)).toEqual(['A-B', 'A-C', 'B-C']);
  });

  it('corrects pairwise p-values upward, never downward', () => {
    for (const pair of result.pairwise) {
      expect(pair.adjustedP).toBeGreaterThanOrEqual(pair.p - 1e-12);
      expect(pair.adjustedP).toBeLessThanOrEqual(1);
    }
  });

  it('keeps Holm no more severe than Bonferroni', () => {
    for (const pair of result.pairwise) {
      expect(pair.adjustedP).toBeLessThanOrEqual(Math.min(pair.p * 3, 1) + 1e-12);
    }
  });

  it('finds nothing when the groups are identical', () => {
    const flat = oneWayAnova([
      { label: 'A', values: [1, 2, 3] },
      { label: 'B', values: [1, 2, 3] },
      { label: 'C', values: [1, 2, 3] },
    ]);
    expect(flat.f).toBeCloseTo(0, 10);
    expect(flat.p).toBeCloseTo(1, 10);
    expect(flat.etaSquared).toBeCloseTo(0, 10);
  });

  it('handles unequal group sizes', () => {
    const unequal = oneWayAnova([
      { label: 'A', values: [1, 2, 3, 4] },
      { label: 'B', values: [4, 5] },
      { label: 'C', values: [7, 8, 9] },
    ]);
    expect(unequal.totalN).toBe(9);
    expect(unequal.df1).toBe(2);
    expect(unequal.df2).toBe(6);
  });
});

describe('input handling', () => {
  it('sends two groups to the t-test instead', () => {
    expect(() =>
      oneWayAnova([
        { label: 'A', values: [1, 2, 3] },
        { label: 'B', values: [4, 5, 6] },
      ]),
    ).toThrow(/at least three groups/);
  });

  it('requires two values per group', () => {
    expect(() =>
      oneWayAnova([
        { label: 'A', values: [1] },
        { label: 'B', values: [4, 5] },
        { label: 'C', values: [7, 8] },
      ]),
    ).toThrow(AnovaError);
  });

  it('refuses data with no within-group variation', () => {
    expect(() =>
      oneWayAnova([
        { label: 'A', values: [1, 1] },
        { label: 'B', values: [2, 2] },
        { label: 'C', values: [3, 3] },
      ]),
    ).toThrow(/no variation within groups/);
  });
});
