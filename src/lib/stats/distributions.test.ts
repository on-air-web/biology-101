import { describe, expect, it } from 'vitest';
import {
  chiSquareCdf,
  chiSquareP,
  fCdf,
  fP,
  incompleteBeta,
  logGamma,
  normalCdf,
  normalTwoTailedP,
  tCdf,
  tCritical,
  tInv,
  tTwoTailedP,
} from './distributions';

describe('logGamma', () => {
  it('matches known factorials', () => {
    // Γ(n) = (n-1)!
    expect(Math.exp(logGamma(5))).toBeCloseTo(24, 6);
    expect(Math.exp(logGamma(6))).toBeCloseTo(120, 5);
    // Γ(1/2) = √π
    expect(Math.exp(logGamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 8);
  });
});

describe('incompleteBeta', () => {
  it('is bounded and symmetric', () => {
    expect(incompleteBeta(2, 3, 0)).toBe(0);
    expect(incompleteBeta(2, 3, 1)).toBe(1);
    // I_x(a,a) = 1/2 at x = 1/2 for any a.
    expect(incompleteBeta(3, 3, 0.5)).toBeCloseTo(0.5, 10);
    // I_x(a,b) + I_(1-x)(b,a) = 1
    expect(incompleteBeta(2, 5, 0.3) + incompleteBeta(5, 2, 0.7)).toBeCloseTo(1, 10);
  });
});

describe("Student's t", () => {
  it('is symmetric about zero', () => {
    expect(tCdf(0, 10)).toBeCloseTo(0.5, 10);
    expect(tCdf(1.5, 7) + tCdf(-1.5, 7)).toBeCloseTo(1, 10);
  });

  it('matches table values for the critical t', () => {
    // The 97.5th percentile — the multiplier in a 95% confidence interval.
    expect(tCritical(0.95, 8)).toBeCloseTo(2.306, 3);
    expect(tCritical(0.95, 10)).toBeCloseTo(2.228, 3);
    expect(tCritical(0.95, 30)).toBeCloseTo(2.042, 3);
    expect(tCritical(0.99, 20)).toBeCloseTo(2.845, 3);
  });

  it('approaches the normal at large df', () => {
    expect(tCritical(0.95, 100000)).toBeCloseTo(1.96, 3);
  });

  it('gives two-tailed p-values verified by numerical integration', () => {
    // Cross-checked against direct Simpson integration of the t density, which
    // agrees to fifteen significant figures. A remembered figure from a table
    // is not a reference value; this is.
    expect(tTwoTailedP(5, 8)).toBeCloseTo(0.00105282579, 9);
    // 2.306 is the tabulated 97.5th percentile at 8 df, so this must land on
    // 0.05 — an independent check that the tail is computed correctly.
    expect(tTwoTailedP(2.306, 8)).toBeCloseTo(0.05, 5);
  });

  it('inverts its own CDF', () => {
    for (const df of [3, 8, 25, 120]) {
      for (const p of [0.05, 0.25, 0.5, 0.9, 0.975]) {
        expect(tCdf(tInv(p, df), df)).toBeCloseTo(p, 8);
      }
    }
  });

  it('rejects probabilities outside the open unit interval', () => {
    expect(() => tInv(0, 10)).toThrow();
    expect(() => tInv(1, 10)).toThrow();
  });
});

describe('normal distribution', () => {
  it('matches the values everyone knows', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 5);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 5);
    expect(normalCdf(1)).toBeCloseTo(0.8413447, 5);
    expect(normalCdf(2.5758)).toBeCloseTo(0.995, 5);
  });

  it('gives two-tailed p-values', () => {
    expect(normalTwoTailedP(1.96)).toBeCloseTo(0.05, 4);
    expect(normalTwoTailedP(0)).toBeCloseTo(1, 6);
    expect(normalTwoTailedP(3)).toBeCloseTo(0.0026998, 5);
  });
});

describe('chi-square', () => {
  it('matches tabulated critical values', () => {
    // 95th percentile: 3.841 at 1 df, 5.991 at 2 df, 11.070 at 5 df.
    expect(chiSquareP(3.8415, 1)).toBeCloseTo(0.05, 4);
    expect(chiSquareP(5.9915, 2)).toBeCloseTo(0.05, 4);
    expect(chiSquareP(11.07, 5)).toBeCloseTo(0.05, 3);
    expect(chiSquareP(6.635, 1)).toBeCloseTo(0.01, 3);
  });

  it('is a proper CDF', () => {
    expect(chiSquareCdf(0, 3)).toBe(0);
    expect(chiSquareCdf(1000, 3)).toBeCloseTo(1, 10);
    // At 2 df the CDF is 1 − exp(−x/2), which is checkable in closed form.
    expect(chiSquareCdf(4, 2)).toBeCloseTo(1 - Math.exp(-2), 10);
  });
});

describe('F distribution', () => {
  it('matches critical values verified by numerical integration', () => {
    // Obtained by integrating the F density directly, not from memory:
    // F(0.95) = 3.4903 at (3, 12), 4.2565 at (2, 9), 4.5337 at (4, 6).
    expect(fP(3.4903, 3, 12)).toBeCloseTo(0.05, 4);
    expect(fP(4.2565, 2, 9)).toBeCloseTo(0.05, 4);
    expect(fP(4.5337, 4, 6)).toBeCloseTo(0.05, 4);
  });

  it('relates to t: F(1, df) = t² ', () => {
    // An F test on two groups is the square of the equivalent t test.
    const t = 2.5;
    expect(fP(t * t, 1, 20)).toBeCloseTo(tTwoTailedP(t, 20), 10);
  });

  it('is a proper CDF', () => {
    expect(fCdf(0, 3, 10)).toBe(0);
    expect(fCdf(1e6, 3, 10)).toBeCloseTo(1, 6);
    expect(fCdf(2, 4, 8) + fP(2, 4, 8)).toBeCloseTo(1, 10);
  });
});
