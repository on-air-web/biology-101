import { describe, expect, it } from 'vitest';
import { CRITERIA, ResolutionError, TECHNIQUE_GAINS, resolve } from './resolution';

const OIL_100X = {
  wavelength: 520,
  numericalAperture: 1.4,
  refractiveIndex: 1.515,
  criterion: 'abbe' as const,
};

describe('resolve, against figures the field quotes', () => {
  it('gives about 186 nm for a 1.4 NA oil objective at 520 nm, Abbe', () => {
    // Hand-checkable: 520 / (2 × 1.4) = 185.7 nm. This is the number every
    // microscopy course opens with and every objective barrel implies.
    expect(resolve(OIL_100X).lateral).toBeCloseTo(185.71, 1);
  });

  it('gives about 227 nm for the same objective under Rayleigh', () => {
    // 0.61 × 520 / 1.4 = 226.6 nm. The 22% gap between this and Abbe is why
    // the criterion has to be named alongside the number.
    const rayleigh = resolve({ ...OIL_100X, criterion: 'rayleigh' }).lateral;
    expect(rayleigh).toBeCloseTo(226.57, 1);
    expect(rayleigh / resolve(OIL_100X).lateral).toBeCloseTo(0.61 / 0.5, 6);
  });

  it('gives about 175 nm under Sparrow, the most permissive', () => {
    expect(resolve({ ...OIL_100X, criterion: 'sparrow' }).lateral).toBeCloseTo(174.57, 1);
  });

  it('orders the three criteria as Sparrow < Abbe < Rayleigh', () => {
    const at = (criterion: (typeof CRITERIA)[number]['id']) =>
      resolve({ ...OIL_100X, criterion }).lateral;
    expect(at('sparrow')).toBeLessThan(at('abbe'));
    expect(at('abbe')).toBeLessThan(at('rayleigh'));
  });

  it('puts a dry 0.75 NA objective at about 347 nm', () => {
    // 520 / (2 × 0.75) = 346.7. A dry lens loses nearly a factor of two
    // against oil, which is the entire argument for immersion.
    const dry = resolve({
      wavelength: 520,
      numericalAperture: 0.75,
      refractiveIndex: 1,
      criterion: 'abbe',
    });
    expect(dry.lateral).toBeCloseTo(346.67, 1);
  });

  it('scales linearly with wavelength', () => {
    // Blue resolves better than red in exact proportion — the reason a 405 nm
    // line buys resolution and a 640 nm line spends it.
    const blue = resolve({ ...OIL_100X, wavelength: 405 }).lateral;
    const red = resolve({ ...OIL_100X, wavelength: 640 }).lateral;
    expect(red / blue).toBeCloseTo(640 / 405, 10);
  });

  it('scales inversely with numerical aperture', () => {
    const low = resolve({ ...OIL_100X, numericalAperture: 0.7 }).lateral;
    const high = resolve({ ...OIL_100X, numericalAperture: 1.4 }).lateral;
    expect(low / high).toBeCloseTo(2, 10);
  });
});

describe('axial resolution and depth of field', () => {
  it('is several times worse than lateral, as it must be', () => {
    const result = resolve(OIL_100X);
    // 2 × 1.515 × 520 / 1.4² = 803.9 nm, against 185.7 lateral.
    expect(result.axial).toBeCloseTo(803.88, 1);
    expect(result.axial / result.lateral).toBeGreaterThan(4);
  });

  it('degrades as the square of NA, unlike lateral resolution', () => {
    const halfNA = resolve({ ...OIL_100X, numericalAperture: 0.7 });
    const fullNA = resolve({ ...OIL_100X, numericalAperture: 1.4 });
    expect(halfNA.axial / fullNA.axial).toBeCloseTo(4, 10);
    expect(halfNA.lateral / fullNA.lateral).toBeCloseTo(2, 10);
  });

  it('reports the Airy radius from the Rayleigh coefficient regardless of criterion', () => {
    // The Airy disc is a fact about the point spread function; the criterion is
    // a choice about reading it. They must not be entangled.
    for (const criterion of CRITERIA) {
      expect(resolve({ ...OIL_100X, criterion: criterion.id }).airyRadius).toBeCloseTo(226.57, 1);
    }
  });

  it('gives an acceptance half-angle whose sine is NA over n', () => {
    const result = resolve(OIL_100X);
    expect(Math.sin((result.acceptanceAngle * Math.PI) / 180)).toBeCloseTo(1.4 / 1.515, 10);
    // About 67.5° for a 1.4 NA oil lens — a very wide cone, which is what the
    // working distance is traded away for.
    expect(result.acceptanceAngle).toBeCloseTo(67.53, 1);
  });
});

describe('the condenser', () => {
  it('averages with the objective, so closing it costs resolution', () => {
    // Abbe's two-NA form. Stopping the condenser down to 0.3 against a 1.4 NA
    // objective costs a factor of 1.65 in resolvable distance — the trade every
    // brightfield user makes for contrast without noticing. The mean of the two
    // apertures is 0.85, so 520/(2 × 0.85) = 305.9 nm against 185.7 wide open.
    const open = resolve({ ...OIL_100X, condenserNA: 1.4 });
    const closed = resolve({ ...OIL_100X, condenserNA: 0.3 });
    expect(open.lateral).toBeCloseTo(185.71, 1);
    expect(closed.lateral).toBeCloseTo(520 / (2 * 0.85), 1);
    expect(closed.lateral / open.lateral).toBeCloseTo(1.4 / 0.85, 6);
  });

  it('says which of the two is the limit', () => {
    expect(resolve({ ...OIL_100X, condenserNA: 0.3 }).notes.join(' ')).toContain(
      'is the limit here',
    );
    expect(resolve({ ...OIL_100X, condenserNA: 1.4 }).notes.join(' ')).toContain(
      'matches or exceeds',
    );
  });

  it('is ignored when absent, leaving the objective alone', () => {
    expect(resolve(OIL_100X).lateral).toBeCloseTo(
      resolve({ ...OIL_100X, condenserNA: 1.4 }).lateral,
      10,
    );
  });
});

describe('refusing the impossible', () => {
  it('rejects an NA above the refractive index', () => {
    // NA = n sin θ, so a 1.4 NA lens in air is not ambitious, it is impossible.
    // Rule 6: refuse rather than return a plausible number.
    expect(() => resolve({ ...OIL_100X, refractiveIndex: 1 })).toThrow(ResolutionError);
    expect(() => resolve({ ...OIL_100X, refractiveIndex: 1 })).toThrow(/cannot exceed/);
  });

  it('accepts an NA exactly at the refractive index', () => {
    // The grazing-incidence limit: physical, if not manufacturable.
    const result = resolve({ ...OIL_100X, numericalAperture: 1.515 });
    expect(result.acceptanceAngle).toBeCloseTo(90, 6);
  });

  it('rejects non-physical wavelengths, apertures and indices', () => {
    expect(() => resolve({ ...OIL_100X, wavelength: 0 })).toThrow(ResolutionError);
    expect(() => resolve({ ...OIL_100X, numericalAperture: 0 })).toThrow(ResolutionError);
    expect(() => resolve({ ...OIL_100X, refractiveIndex: 0.9 })).toThrow(ResolutionError);
  });

  it('rejects an unknown criterion', () => {
    expect(() =>
      resolve({ ...OIL_100X, criterion: 'nonesuch' as (typeof CRITERIA)[number]['id'] }),
    ).toThrow(ResolutionError);
  });
});

describe('technique gains', () => {
  it('claims no lateral improvement for confocal beyond the square-root bound', () => {
    // The commonest overstatement in the field. Confocal buys sectioning; the
    // lateral gain is at most √2 and only at a pinhole that discards most of
    // the signal, so the table claims none.
    expect(TECHNIQUE_GAINS.confocal!.lateral).toBe(1);
    expect(TECHNIQUE_GAINS.confocal!.axial).toBeGreaterThan(1);
    expect(TECHNIQUE_GAINS.confocal!.note).toContain('sectioning');
  });

  it('claims nothing at all for the contrast techniques', () => {
    // Phase contrast and DIC make invisible things visible. Neither moves the
    // diffraction limit, and a tool that implied otherwise would be teaching
    // the single most common misconception about them.
    for (const id of ['phase-contrast', 'dic']) {
      expect(TECHNIQUE_GAINS[id]!.lateral, id).toBe(1);
      expect(TECHNIQUE_GAINS[id]!.axial, id).toBe(1);
    }
  });

  it('covers every technique with a note that says why', () => {
    for (const [id, gain] of Object.entries(TECHNIQUE_GAINS)) {
      expect(gain.note.length, id).toBeGreaterThan(40);
      expect(gain.lateral, id).toBeGreaterThanOrEqual(1);
      expect(gain.axial, id).toBeGreaterThanOrEqual(1);
    }
  });
});
