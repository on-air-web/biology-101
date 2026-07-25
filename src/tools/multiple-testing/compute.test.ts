import { describe, expect, it } from 'vitest';
import { CorrectionError, correctPValues } from './compute';

describe('Bonferroni', () => {
  it('multiplies by the number of tests and caps at one', () => {
    const { values } = correctPValues([0.01, 0.02, 0.5], 'bonferroni');
    expect(values.map((v) => v.adjusted)).toEqual([0.03, 0.06, 1]);
  });
});

describe('Benjamini-Hochberg', () => {
  it('matches the worked example where every value adjusts to the threshold', () => {
    // p = 0.01..0.05 with m = 5: each p × m / rank equals 0.05 exactly.
    const { values } = correctPValues([0.01, 0.02, 0.03, 0.04, 0.05], 'benjamini-hochberg');
    for (const value of values) expect(value.adjusted).toBeCloseTo(0.05, 12);
  });

  it('matches R p.adjust for an uneven set', () => {
    // R: p.adjust(c(0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205), "BH")
    const input = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205];
    const expected = [0.008, 0.032, 0.0672, 0.0672, 0.0672, 0.08, 0.0845714, 0.205];
    const { values } = correctPValues(input, 'benjamini-hochberg');
    values.forEach((value, index) => {
      expect(value.adjusted).toBeCloseTo(expected[index]!, 5);
    });
  });

  it('never lets an adjusted value fall below a smaller one', () => {
    const { values } = correctPValues([0.04, 0.01, 0.03, 0.005], 'benjamini-hochberg');
    const sorted = [...values].sort((a, b) => a.p - b.p);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index]!.adjusted).toBeGreaterThanOrEqual(sorted[index - 1]!.adjusted - 1e-12);
    }
  });

  it('is never more severe than Bonferroni', () => {
    const input = [0.001, 0.01, 0.02, 0.03, 0.04];
    const bh = correctPValues(input, 'benjamini-hochberg').values;
    const bonferroni = correctPValues(input, 'bonferroni').values;
    bh.forEach((value, index) => {
      expect(value.adjusted).toBeLessThanOrEqual(bonferroni[index]!.adjusted + 1e-12);
    });
  });
});

describe('reporting', () => {
  it('counts what survives correction', () => {
    const result = correctPValues([0.001, 0.01, 0.04, 0.5, 0.9], 'bonferroni', 0.05);
    expect(result.significantBefore).toBe(3);
    // Only 0.001 survives: 0.01 × 5 lands exactly on 0.05, which is not below it.
    expect(result.significantAfter).toBe(1);
  });

  it('preserves input order so results match their labels', () => {
    const { values } = correctPValues([0.5, 0.01, 0.2], 'benjamini-hochberg');
    expect(values.map((v) => v.p)).toEqual([0.5, 0.01, 0.2]);
    expect(values.map((v) => v.rank)).toEqual([3, 1, 2]);
  });
});

describe('input handling', () => {
  it('rejects values that are not p-values', () => {
    expect(() => correctPValues([0.5, 1.2])).toThrow(CorrectionError);
    expect(() => correctPValues([-0.1])).toThrow(CorrectionError);
    expect(() => correctPValues([])).toThrow(CorrectionError);
  });
});
