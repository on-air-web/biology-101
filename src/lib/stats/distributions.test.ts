import { describe, expect, it } from 'vitest';
import {
  chiSquareCdf,
  chiSquareInv,
  chiSquareP,
  poissonExactInterval,
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

/**
 * Poisson probabilities, summed directly from the pmf. A second implementation
 * whose only shared assumption with the chi-square route is arithmetic, which
 * is what makes it usable as a reference here.
 */
function poissonCdf(k: number, lambda: number): number {
  let term = Math.exp(-lambda);
  let sum = term;
  for (let index = 1; index <= k; index += 1) {
    term *= lambda / index;
    sum += term;
  }
  return sum;
}

describe('chiSquareInv', () => {
  /**
   * Chi-square with two degrees of freedom is exponential with mean 2, so its
   * CDF is 1 − e^(−x/2) and the quantile is −2·ln(1−p) in closed form. Nothing
   * is looked up.
   */
  it('matches the closed form at two degrees of freedom', () => {
    for (const p of [0.025, 0.1, 0.5, 0.9, 0.975, 0.999]) {
      expect(chiSquareInv(p, 2)).toBeCloseTo(-2 * Math.log(1 - p), 8);
    }
  });

  it('round-trips through the CDF', () => {
    for (const df of [1, 3, 8, 30, 200, 2000]) {
      for (const p of [0.01, 0.25, 0.5, 0.95, 0.99]) {
        expect(chiSquareCdf(chiSquareInv(p, df), df), `df=${df} p=${p}`).toBeCloseTo(p, 8);
      }
    }
  });

  it('increases with probability and with degrees of freedom', () => {
    expect(chiSquareInv(0.9, 10)).toBeGreaterThan(chiSquareInv(0.5, 10));
    expect(chiSquareInv(0.9, 20)).toBeGreaterThan(chiSquareInv(0.9, 10));
  });

  it('rejects probabilities outside the open unit interval', () => {
    expect(() => chiSquareInv(0, 4)).toThrow();
    expect(() => chiSquareInv(1, 4)).toThrow();
    expect(() => chiSquareInv(0.5, 0)).toThrow();
  });
});

describe('poissonExactInterval', () => {
  /**
   * The defining property, checked against the pmf sums above rather than a
   * published table: the bounds are the rates at which the observed count sits
   * exactly at the tail probability.
   */
  it('places each bound at its own tail probability', () => {
    for (const count of [1, 5, 10, 47, 200]) {
      const { lower, upper } = poissonExactInterval(count, 0.95);
      // P(X >= count | lower) = 0.025
      expect(1 - poissonCdf(count - 1, lower), `lower at n=${count}`).toBeCloseTo(0.025, 8);
      // P(X <= count | upper) = 0.025
      expect(poissonCdf(count, upper), `upper at n=${count}`).toBeCloseTo(0.025, 8);
    }
  });

  /** With zero observed, P(X = 0 | upper) = e^(−upper) = 0.025, so upper = −ln(0.025). */
  it('is one-sided at a count of zero', () => {
    const { lower, upper } = poissonExactInterval(0, 0.95);
    expect(lower).toBe(0);
    expect(upper).toBeCloseTo(-Math.log(0.025), 8);
  });

  it('brackets the count and tightens in relative terms as it grows', () => {
    const small = poissonExactInterval(10);
    const large = poissonExactInterval(1000);
    expect(small.lower).toBeLessThan(10);
    expect(small.upper).toBeGreaterThan(10);
    // Relative width falls roughly as 1/sqrt(n): about 62% at 10, 12% at 1000.
    expect((small.upper - small.lower) / 10).toBeGreaterThan((large.upper - large.lower) / 1000);
  });

  /** The normal approximation goes negative below about four; this must not. */
  it('never returns a negative rate', () => {
    for (let count = 0; count <= 6; count += 1) {
      expect(poissonExactInterval(count).lower, `n=${count}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('widens with confidence and rejects impossible input', () => {
    expect(poissonExactInterval(20, 0.99).upper).toBeGreaterThan(
      poissonExactInterval(20, 0.95).upper,
    );
    expect(() => poissonExactInterval(-1)).toThrow();
    expect(() => poissonExactInterval(2.5)).toThrow();
    expect(() => poissonExactInterval(10, 1)).toThrow();
  });
});
