import { describe, expect, it } from 'vitest';
import {
  CentrifugeError,
  clearingFactor,
  computeSpin,
  equivalentTime,
  rcfFromRpm,
  rpmFromRcf,
} from './compute';
import { ROTOR_CLASSES } from './rotors';

const cm = (value: number) => value / 100;

describe('relative centrifugal field', () => {
  /**
   * Exact by construction rather than recalled. Choosing r = g/100 metres
   * makes ω = sqrt(g/r) exactly 10 rad/s, so RCF = ω²r/g is exactly 1 and the
   * corresponding speed is 10 · 60/2π rpm. Nothing here is looked up.
   */
  it('returns exactly one g at the speed where ω²r equals g', () => {
    const radius = 9.80665 / 100;
    expect(rcfFromRpm(600 / (2 * Math.PI), radius)).toBeCloseTo(1, 12);
  });

  /**
   * Centrifuge manuals print RCF = 1.118e-5 · r(cm) · N². That is this
   * implementation with the centimetre and minute conversions folded in, so
   * recovering it checks the SI form against a constant from an independent
   * source rather than against itself.
   */
  it('reproduces the constant printed in centrifuge manuals', () => {
    const oneRpmAtOneCm = rcfFromRpm(1, cm(1));
    expect(oneRpmAtOneCm * 1e5).toBeCloseTo(1.11824, 5);
    expect(oneRpmAtOneCm / 1.118e-5).toBeCloseTo(1, 3);
  });

  it('scales with the square of speed and linearly with radius', () => {
    const base = rcfFromRpm(5000, cm(9));
    expect(rcfFromRpm(10000, cm(9))).toBeCloseTo(base * 4, 6);
    expect(rcfFromRpm(5000, cm(18))).toBeCloseTo(base * 2, 6);
  });

  it('round-trips through the inverse', () => {
    for (const rcf of [100, 3000, 12000, 100000]) {
      expect(rcfFromRpm(rpmFromRcf(rcf, cm(8.5)), cm(8.5))).toBeCloseTo(rcf, 6);
    }
  });

  it('is zero at rest', () => {
    expect(rcfFromRpm(0, cm(8.5))).toBe(0);
  });
});

describe('field across the tube', () => {
  const geometry = { maxRadius: cm(8.5), minRadius: cm(4) };

  /** RCF is linear in radius, so the ratio must be exactly the radius ratio. */
  it('spreads in proportion to the radius ratio', () => {
    const result = computeSpin({ geometry, rpm: 14000, reference: 'max', solveFor: 'rcf' });
    expect(result.spread).toBeCloseTo(8.5 / 4, 12);
    expect(result.rcfMin! * (8.5 / 4)).toBeCloseTo(result.rcfMax, 6);
  });

  it('puts the average midway between the ends', () => {
    const result = computeSpin({ geometry, rpm: 14000, reference: 'max', solveFor: 'rcf' });
    expect(result.rcfAverage).toBeCloseTo((result.rcfMax + result.rcfMin!) / 2, 6);
  });

  it('warns when the two ends differ by half again', () => {
    const result = computeSpin({ geometry, rpm: 14000, reference: 'max', solveFor: 'rcf' });
    expect(result.warnings.join(' ')).toMatch(/bottom of the tube/);
  });

  it('says nothing about spread on a nearly uniform rotor', () => {
    const result = computeSpin({
      geometry: { maxRadius: cm(10), minRadius: cm(9) },
      rpm: 5000,
      reference: 'max',
      solveFor: 'rcf',
    });
    expect(result.warnings.join(' ')).not.toMatch(/bottom of the tube/);
  });

  it('reports no spread when only the maximum radius is known', () => {
    const result = computeSpin({
      geometry: { maxRadius: cm(8.5) },
      rpm: 14000,
      reference: 'max',
      solveFor: 'rcf',
    });
    expect(result.rcfMin).toBeUndefined();
    expect(result.spread).toBeUndefined();
    expect(result.kFactor).toBeUndefined();
  });
});

describe('solving for speed', () => {
  const geometry = { maxRadius: cm(8.5), minRadius: cm(4) };

  it('hits the target at the reference radius, not elsewhere', () => {
    const result = computeSpin({ geometry, rcf: 12000, reference: 'max', solveFor: 'rpm' });
    expect(result.rcfMax).toBeCloseTo(12000, 6);
    expect(result.rcfMin).toBeLessThan(12000);
  });

  it('spins faster when the target is read as an average', () => {
    const atMax = computeSpin({ geometry, rcf: 12000, reference: 'max', solveFor: 'rpm' });
    const atAverage = computeSpin({ geometry, rcf: 12000, reference: 'average', solveFor: 'rpm' });
    expect(atAverage.rpm).toBeGreaterThan(atMax.rpm);
    expect(atAverage.rcfAverage).toBeCloseTo(12000, 6);
    expect(atAverage.warnings.join(' ')).toMatch(/maximum/);
  });

  it('refuses an average reference without a minimum radius', () => {
    expect(() =>
      computeSpin({
        geometry: { maxRadius: cm(8.5) },
        rcf: 12000,
        reference: 'average',
        solveFor: 'rpm',
      }),
    ).toThrow(CentrifugeError);
  });
});

describe('clearing factor', () => {
  /**
   * k = ln(r_max/r_min) · 10¹³ / (3600 ω²). At 1000 rpm the denominator is
   * 4π² · 10⁶, so a tube whose radius ratio is e has k = 10⁷/4π² ≈ 253303 —
   * the 2.53e5 quoted in rotor catalogues, derived rather than recalled.
   */
  it('derives the catalogue constant', () => {
    const k = clearingFactor(1000, { maxRadius: Math.E * 0.01, minRadius: 0.01 });
    expect(k).toBeCloseTo(1e7 / (4 * Math.PI ** 2), 6);
    expect(k! / 2.533e5).toBeCloseTo(1, 3);
  });

  it('falls with the square of speed', () => {
    const geometry = { maxRadius: cm(8.5), minRadius: cm(4) };
    const slow = clearingFactor(5000, geometry)!;
    expect(clearingFactor(10000, geometry)).toBeCloseTo(slow / 4, 9);
  });

  it('is independent of the unit the radii are given in', () => {
    expect(clearingFactor(9000, { maxRadius: cm(8.5), minRadius: cm(4) })).toBeCloseTo(
      clearingFactor(9000, { maxRadius: 8.5, minRadius: 4 })!,
      9,
    );
  });

  it('converts a run time between rotors in proportion to k', () => {
    expect(equivalentTime(30, 200, 400)).toBeCloseTo(60, 9);
    expect(equivalentTime(30, 400, 200)).toBeCloseTo(15, 9);
  });

  it('refuses to convert from a rotor with no clearing factor', () => {
    expect(() => equivalentTime(30, 0, 400)).toThrow(CentrifugeError);
  });
});

describe('rotor classes', () => {
  it('keeps the minimum radius inside the maximum', () => {
    for (const rotor of ROTOR_CLASSES) {
      expect(rotor.minRadiusCm, rotor.id).toBeLessThan(rotor.maxRadiusCm);
      expect(rotor.minRadiusCm, rotor.id).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = ROTOR_CLASSES.map((rotor) => rotor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('input handling', () => {
  const geometry = { maxRadius: cm(8.5), minRadius: cm(4) };

  it('rejects impossible geometry rather than guessing', () => {
    expect(() =>
      computeSpin({ geometry: { maxRadius: 0 }, rpm: 1000, reference: 'max', solveFor: 'rcf' }),
    ).toThrow(CentrifugeError);
    expect(() =>
      computeSpin({
        geometry: { maxRadius: cm(4), minRadius: cm(8.5) },
        rpm: 1000,
        reference: 'max',
        solveFor: 'rcf',
      }),
    ).toThrow(CentrifugeError);
  });

  it('rejects a missing or non-positive target', () => {
    expect(() => computeSpin({ geometry, reference: 'max', solveFor: 'rcf' })).toThrow(
      CentrifugeError,
    );
    expect(() => computeSpin({ geometry, rpm: -1, reference: 'max', solveFor: 'rcf' })).toThrow(
      CentrifugeError,
    );
    expect(() => computeSpin({ geometry, rcf: 0, reference: 'max', solveFor: 'rpm' })).toThrow(
      CentrifugeError,
    );
  });
});
