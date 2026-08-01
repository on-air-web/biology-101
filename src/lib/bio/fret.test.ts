import { describe, expect, it } from 'vitest';
import {
  FORSTER_PREFACTOR_NM6,
  FretError,
  KAPPA_SQUARED_PRESETS,
  forsterRadius,
  overlapIntegral,
  separationForEfficiency,
  transferEfficiency,
} from './fret';
import { getFluorophore } from './spectra';

describe('the Förster prefactor', () => {
  /**
   * An external reference beats a self-consistent test.
   *
   * Every textbook quotes the shortcut R₀(Å) = 0.211 (κ² n⁻⁴ Φ_D J)^(1/6) with
   * J in M⁻¹cm⁻¹nm⁴. That number appears nowhere in the implementation, which
   * derives the prefactor from 9000 ln10 / (128 π⁵ N_A) and a cm²→nm²
   * conversion instead. Agreeing with the published constant to three figures
   * is therefore a genuine check on the derivation and on the unit bookkeeping,
   * which is where this kind of expression actually goes wrong.
   */
  it('reproduces the published 0.211 Å constant', () => {
    const constantInAngstroms = Math.pow(FORSTER_PREFACTOR_NM6, 1 / 6) * 10;
    expect(constantInAngstroms).toBeCloseTo(0.211, 3);
  });

  it('is the sixth power of that constant, in nm⁶', () => {
    expect(Math.pow(FORSTER_PREFACTOR_NM6, 1 / 6)).toBeCloseTo(0.0211, 4);
  });
});

describe('the orientation factor presets', () => {
  /**
   * Numerical quadrature over both dipole orientations, computed here rather
   * than recalled. κ = cos θ_T − 3 cos θ_D cos θ_A with the separation vector
   * along z; only the relative azimuth matters, so the average is a three-fold
   * integral with weight sin θ_D sin θ_A.
   *
   * This exists because the quoted "static random" value of 0.476 is NOT the
   * mean of κ², which is 2/3 whether the dipoles move or not. It is ⟨|κ|⟩².
   * Writing 0.476 down as ⟨κ²⟩ and moving on is exactly the mistake this
   * project has twice paid for.
   */
  function averages(n: number): { meanKappaSq: number; meanAbsKappaSquared: number } {
    let sumSq = 0;
    let sumAbs = 0;
    let weight = 0;

    for (let i = 0; i < n; i += 1) {
      const thetaD = (Math.PI * (i + 0.5)) / n;
      const sD = Math.sin(thetaD);
      const cD = Math.cos(thetaD);
      for (let j = 0; j < n; j += 1) {
        const thetaA = (Math.PI * (j + 0.5)) / n;
        const sA = Math.sin(thetaA);
        const cA = Math.cos(thetaA);
        const w = sD * sA;
        for (let k = 0; k < 2 * n; k += 1) {
          const dPhi = (2 * Math.PI * (k + 0.5)) / (2 * n);
          const cosThetaT = sD * sA * Math.cos(dPhi) + cD * cA;
          const kappa = cosThetaT - 3 * cD * cA;
          sumSq += w * kappa * kappa;
          sumAbs += w * Math.abs(kappa);
          weight += w;
        }
      }
    }
    return { meanKappaSq: sumSq / weight, meanAbsKappaSquared: (sumAbs / weight) ** 2 };
  }

  const computed = averages(40);

  it('confirms 2/3 as the mean of κ² for random orientations', () => {
    expect(computed.meanKappaSq).toBeCloseTo(2 / 3, 2);
    const dynamic = KAPPA_SQUARED_PRESETS.find((p) => p.id === 'dynamic')!;
    expect(dynamic.value).toBeCloseTo(computed.meanKappaSq, 2);
  });

  it('confirms the static preset is ⟨|κ|⟩², not ⟨κ²⟩', () => {
    expect(computed.meanAbsKappaSquared).toBeCloseTo(0.476, 2);
    const staticPreset = KAPPA_SQUARED_PRESETS.find((p) => p.id === 'static')!;
    expect(staticPreset.value).toBeCloseTo(computed.meanAbsKappaSquared, 2);
    // The two averages must not be confused: they differ by 40%.
    expect(computed.meanKappaSq).not.toBeCloseTo(computed.meanAbsKappaSquared, 1);
  });

  it('keeps every preset inside the physical range', () => {
    for (const preset of KAPPA_SQUARED_PRESETS) {
      expect(preset.value, preset.id).toBeGreaterThanOrEqual(0);
      expect(preset.value, preset.id).toBeLessThanOrEqual(4);
    }
  });
});

describe('overlapIntegral', () => {
  const mturquoise2 = getFluorophore('mturquoise2')!;
  const mvenus = getFluorophore('mvenus')!;
  const egfp = getFluorophore('egfp')!;
  const mcherry = getFluorophore('mcherry')!;

  it('is larger for a well-matched pair than a badly matched one', () => {
    // Cyan donor into yellow acceptor is the classic FRET pair precisely
    // because the donor emission sits on the acceptor absorption. Cyan into
    // red overlaps far less.
    const good = overlapIntegral(mturquoise2, mvenus);
    const poor = overlapIntegral(mturquoise2, mcherry);
    expect(good).toBeGreaterThan(poor);
  });

  it('is zero when the donor emits entirely below the acceptor absorption', () => {
    // Reversing a pair is the commonest way to get a nonsense answer: mCherry
    // emits from 590 nm up, where mTurquoise2 absorbs nothing at all.
    expect(overlapIntegral(mcherry, mturquoise2)).toBeLessThan(1e10);
  });

  it('scales linearly with the acceptor extinction coefficient', () => {
    // J is linear in ε_A by construction, and this is the cheapest way to
    // catch a normalisation that has crept into the wrong place.
    const doubled = { ...mvenus, extCoeff: mvenus.extCoeff! * 2 };
    expect(overlapIntegral(mturquoise2, doubled)).toBeCloseTo(
      overlapIntegral(mturquoise2, mvenus) * 2,
      -6,
    );
  });

  it('is unchanged by rescaling the donor emission, whose normalisation cancels', () => {
    const scaled = {
      ...mturquoise2,
      em: { ...mturquoise2.em, values: mturquoise2.em.values.map((v) => v * 0.4) },
    };
    expect(overlapIntegral(scaled, mvenus) / overlapIntegral(mturquoise2, mvenus)).toBeCloseTo(
      1,
      6,
    );
  });

  it('refuses an acceptor with no published extinction coefficient', () => {
    // Rule 6: refuse rather than guess. Without ε_A there is no absolute
    // scale, and a J on an arbitrary scale would produce a plausible-looking
    // R₀ that means nothing.
    const texasRed = getFluorophore('texas-red')!;
    expect(texasRed.extCoeff).toBeNull();
    expect(() => overlapIntegral(egfp, texasRed)).toThrow(FretError);
  });
});

describe('forsterRadius', () => {
  const mturquoise2 = getFluorophore('mturquoise2')!;
  const mvenus = getFluorophore('mvenus')!;
  const egfp = getFluorophore('egfp')!;
  const mcherry = getFluorophore('mcherry')!;

  const standard = { kappaSquared: 2 / 3, refractiveIndex: 1.4 };

  function radiusFor(donor = mturquoise2, acceptor = mvenus): number {
    return forsterRadius({
      overlap: overlapIntegral(donor, acceptor),
      donorQuantumYield: donor.quantumYield!,
      ...standard,
    });
  }

  it('puts mTurquoise2 to mVenus in the published 5–6 nm band', () => {
    // External check. Published Förster radii for cyan-to-yellow protein pairs
    // cluster around 5.4 nm (54 Å) — Bajar et al.'s FRET pair review tabulates
    // mTurquoise2–mVenus at 5.4 nm. Nothing in this calculation was tuned to
    // that figure: it comes from FPbase's spectra and the derived prefactor.
    expect(radiusFor()).toBeGreaterThan(5);
    expect(radiusFor()).toBeLessThan(6);
  });

  it('puts EGFP to mCherry in its published 5–6 nm band', () => {
    // The other pair with a well-known value, around 5.2 nm.
    expect(radiusFor(egfp, mcherry)).toBeGreaterThan(4.7);
    expect(radiusFor(egfp, mcherry)).toBeLessThan(6);
  });

  it('scales as the sixth root of κ², so even a factor of 6 moves it under 3×', () => {
    const base = radiusFor();
    const collinear = forsterRadius({
      overlap: overlapIntegral(mturquoise2, mvenus),
      donorQuantumYield: mturquoise2.quantumYield!,
      kappaSquared: 4,
      refractiveIndex: 1.4,
    });
    expect(collinear / base).toBeCloseTo(Math.pow(4 / (2 / 3), 1 / 6), 6);
    expect(collinear / base).toBeLessThan(1.4);
  });

  it('falls as n^(2/3)', () => {
    const inWater = forsterRadius({
      overlap: overlapIntegral(mturquoise2, mvenus),
      donorQuantumYield: mturquoise2.quantumYield!,
      kappaSquared: 2 / 3,
      refractiveIndex: 1.33,
    });
    expect(inWater / radiusFor()).toBeCloseTo(Math.pow(1.4 / 1.33, 2 / 3), 6);
  });

  it('rejects unphysical inputs rather than returning a number', () => {
    const overlap = overlapIntegral(mturquoise2, mvenus);
    expect(() => forsterRadius({ ...standard, overlap, donorQuantumYield: 0 })).toThrow(FretError);
    expect(() => forsterRadius({ ...standard, overlap, donorQuantumYield: 1.4 })).toThrow(
      FretError,
    );
    expect(() =>
      forsterRadius({ overlap, donorQuantumYield: 0.9, kappaSquared: 5, refractiveIndex: 1.4 }),
    ).toThrow(FretError);
    expect(() =>
      forsterRadius({ overlap, donorQuantumYield: 0.9, kappaSquared: 2 / 3, refractiveIndex: 0.5 }),
    ).toThrow(FretError);
    expect(() => forsterRadius({ ...standard, overlap: 0, donorQuantumYield: 0.9 })).toThrow(
      FretError,
    );
  });
});

describe('transferEfficiency', () => {
  it('is exactly one half at the Förster radius, which is its definition', () => {
    expect(transferEfficiency(5.4, 5.4)).toBeCloseTo(0.5, 12);
  });

  it('falls off as the sixth power', () => {
    // Doubling the separation from R₀ leaves 1/(1+64) — the steepness that
    // makes FRET a ruler over one narrow range of distances and blind outside
    // it.
    expect(transferEfficiency(10.8, 5.4)).toBeCloseTo(1 / 65, 10);
    expect(transferEfficiency(2.7, 5.4)).toBeCloseTo(64 / 65, 10);
  });

  it('is one at zero separation and approaches zero at large ones', () => {
    expect(transferEfficiency(0, 5.4)).toBe(1);
    expect(transferEfficiency(50, 5.4)).toBeLessThan(1e-5);
  });

  it('inverts exactly', () => {
    for (const efficiency of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const separation = separationForEfficiency(efficiency, 5.4);
      expect(transferEfficiency(separation, 5.4)).toBeCloseTo(efficiency, 10);
    }
  });

  it('refuses efficiencies that imply an infinite or negative separation', () => {
    expect(() => separationForEfficiency(0, 5.4)).toThrow(FretError);
    expect(() => separationForEfficiency(1, 5.4)).toThrow(FretError);
    expect(() => transferEfficiency(-1, 5.4)).toThrow(FretError);
    expect(() => transferEfficiency(5, 0)).toThrow(FretError);
  });
});
