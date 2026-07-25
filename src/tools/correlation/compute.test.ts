import { describe, expect, it } from 'vitest';
import { CorrelationError, correlate, linearRegression } from './compute';

/**
 * Anscombe's quartet, set I — the dataset built to show that a correlation
 * coefficient describes almost nothing on its own. Reference values computed
 * directly, not recalled.
 */
const ANSCOMBE_X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const ANSCOMBE_Y = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68];

describe('Pearson correlation', () => {
  const result = correlate(ANSCOMBE_X, ANSCOMBE_Y, 'pearson');

  it('matches the computed reference', () => {
    expect(result.r).toBeCloseTo(0.816421, 6);
    expect(result.rSquared).toBeCloseTo(0.666542, 6);
    expect(result.t).toBeCloseTo(4.241455, 5);
    expect(result.df).toBe(9);
  });

  it('gives an interval on r, which is the part that matters', () => {
    expect(result.ci?.[0]).toBeCloseTo(0.424391, 5);
    expect(result.ci?.[1]).toBeCloseTo(0.950693, 5);
  });

  it('narrows the interval as n grows, at the same r', () => {
    const small = correlate([1, 2, 3, 4, 5, 6], [1, 3, 2, 5, 4, 6]);
    const large = correlate(
      [...Array(60)].map((_, i) => i),
      [...Array(60)].map((_, i) => i + (i % 3)),
    );
    const width = (ci?: [number, number]) => (ci ? ci[1] - ci[0] : Number.POSITIVE_INFINITY);
    expect(width(large.ci)).toBeLessThan(width(small.ci));
  });

  it('handles perfect correlation without dividing by zero', () => {
    const perfect = correlate([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(perfect.r).toBeCloseTo(1, 10);
    expect(perfect.p).toBe(0);
  });

  it('is symmetric in its arguments', () => {
    const forward = correlate(ANSCOMBE_X, ANSCOMBE_Y);
    const backward = correlate(ANSCOMBE_Y, ANSCOMBE_X);
    expect(backward.r).toBeCloseTo(forward.r, 12);
  });
});

describe('Spearman correlation', () => {
  it('reaches 1 on a monotonic curve where Pearson does not', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [1, 4, 9, 16, 25];
    expect(correlate(x, y, 'spearman').r).toBeCloseTo(1, 10);
    expect(correlate(x, y, 'pearson').r).toBeCloseTo(0.981105, 6);
  });

  it('shares ranks between tied values', () => {
    const result = correlate([1, 2, 2, 3], [1, 2, 3, 4], 'spearman');
    expect(Number.isFinite(result.r)).toBe(true);
    expect(result.r).toBeGreaterThan(0.9);
  });
});

describe('linear regression', () => {
  const fit = linearRegression(ANSCOMBE_X, ANSCOMBE_Y);

  it('recovers the famous slope and intercept', () => {
    expect(fit.slope).toBeCloseTo(0.500091, 6);
    expect(fit.intercept).toBeCloseTo(3.000091, 5);
    expect(fit.rSquared).toBeCloseTo(0.666542, 6);
  });

  it('brackets the slope with an interval', () => {
    expect(fit.slopeCi[0]).toBeLessThan(fit.slope);
    expect(fit.slopeCi[1]).toBeGreaterThan(fit.slope);
    expect(fit.p).toBeLessThan(0.01);
  });

  it('fits an exact line with no residual', () => {
    const exact = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(exact.slope).toBeCloseTo(2, 10);
    expect(exact.intercept).toBeCloseTo(1, 10);
    expect(exact.rSquared).toBeCloseTo(1, 10);
    expect(exact.residualStandardError).toBeCloseTo(0, 10);
  });

  it('agrees with the correlation coefficient squared', () => {
    expect(fit.rSquared).toBeCloseTo(correlate(ANSCOMBE_X, ANSCOMBE_Y).rSquared, 10);
  });
});

describe('input handling', () => {
  it('requires matched, sufficient, numeric data', () => {
    expect(() => correlate([1, 2, 3], [1, 2])).toThrow(/same number/);
    expect(() => correlate([1, 2], [1, 2])).toThrow(/at least 3/);
    expect(() => correlate([1, 2, Number.NaN], [1, 2, 3])).toThrow(CorrelationError);
  });

  it('refuses a variable that does not vary', () => {
    expect(() => correlate([1, 1, 1, 1], [1, 2, 3, 4])).toThrow(/does not vary/);
  });
});
