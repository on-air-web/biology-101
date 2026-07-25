import { describe, expect, it } from 'vitest';
import { PowerError, computePower, requiredSampleSize } from './compute';

/**
 * Reference values computed with an independent implementation of the
 * noncentral t series, not recalled. These are the canonical two-sample
 * figures: 394, 64 and 26 per group for small, medium and large effects at
 * 80% power — the numbers G*Power returns.
 */
describe('required sample size, two-sample', () => {
  it('matches the canonical figures at 80% power', () => {
    expect(requiredSampleSize('two-sample', 0.2, 0.8).n).toBe(394);
    expect(requiredSampleSize('two-sample', 0.5, 0.8).n).toBe(64);
    expect(requiredSampleSize('two-sample', 0.8, 0.8).n).toBe(26);
  });

  it('reports the total as well as the per-group count', () => {
    const result = requiredSampleSize('two-sample', 0.5, 0.8);
    expect(result.totalN).toBe(128);
  });

  it('lands just above the target, and shows how sharp the edge is', () => {
    const result = requiredSampleSize('two-sample', 0.5, 0.8);
    expect(result.achievedPower).toBeGreaterThanOrEqual(0.8);
    expect(result.powerBelow).toBeLessThan(0.8);
    expect(result.achievedPower).toBeCloseTo(0.8015, 3);
  });

  it('needs more for higher power and less for a larger effect', () => {
    expect(requiredSampleSize('two-sample', 0.5, 0.9).n).toBeGreaterThan(
      requiredSampleSize('two-sample', 0.5, 0.8).n,
    );
    expect(requiredSampleSize('two-sample', 1.0, 0.8).n).toBeLessThan(
      requiredSampleSize('two-sample', 0.5, 0.8).n,
    );
  });

  it('is unaffected by the sign of the effect', () => {
    expect(requiredSampleSize('two-sample', -0.5, 0.8).n).toBe(
      requiredSampleSize('two-sample', 0.5, 0.8).n,
    );
  });
});

describe('power at a given n', () => {
  it('matches the computed reference', () => {
    expect(
      computePower({ design: 'two-sample', effectSize: 0.5, n: 64, alpha: 0.05 }).power,
    ).toBeCloseTo(0.8015, 4);
    expect(
      computePower({ design: 'two-sample', effectSize: 0.8, n: 26, alpha: 0.05 }).power,
    ).toBeCloseTo(0.8075, 4);
  });

  it('approaches alpha as the effect approaches zero', () => {
    const tiny = computePower({ design: 'two-sample', effectSize: 1e-6, n: 30, alpha: 0.05 });
    expect(tiny.power).toBeCloseTo(0.05, 4);
  });

  it('approaches one for a very large effect', () => {
    const huge = computePower({ design: 'two-sample', effectSize: 3, n: 30, alpha: 0.05 });
    expect(huge.power).toBeGreaterThan(0.999);
  });

  it('sets degrees of freedom by design', () => {
    expect(computePower({ design: 'two-sample', effectSize: 0.5, n: 10, alpha: 0.05 }).df).toBe(18);
    expect(computePower({ design: 'paired', effectSize: 0.5, n: 10, alpha: 0.05 }).df).toBe(9);
  });

  it('needs fewer subjects when the design is paired', () => {
    // A paired design uses each subject as its own control, so the same
    // standardised effect is detectable with far fewer of them.
    expect(requiredSampleSize('paired', 0.5, 0.8).n).toBeLessThan(
      requiredSampleSize('two-sample', 0.5, 0.8).n,
    );
  });
});

describe('input handling', () => {
  it('refuses an effect size of zero', () => {
    expect(() => requiredSampleSize('two-sample', 0, 0.8)).toThrow(PowerError);
    expect(() => computePower({ design: 'two-sample', effectSize: 0, n: 10, alpha: 0.05 })).toThrow(
      PowerError,
    );
  });

  it('refuses impossible power and alpha', () => {
    expect(() => requiredSampleSize('two-sample', 0.5, 1)).toThrow(PowerError);
    expect(() => computePower({ design: 'two-sample', effectSize: 0.5, n: 10, alpha: 0 })).toThrow(
      PowerError,
    );
  });

  it('refuses a fractional n', () => {
    expect(() =>
      computePower({ design: 'two-sample', effectSize: 0.5, n: 10.5, alpha: 0.05 }),
    ).toThrow(/whole number/);
  });
});
