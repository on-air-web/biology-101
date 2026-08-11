import { describe, expect, it } from 'vitest';
import {
  CRITERIA,
  ResolutionError,
  STED_SATURATION_FACTOR,
  TECHNIQUE_GAINS,
  criticalAngle,
  evanescentDepth,
  maximumIncidence,
  resolve,
} from './resolution';

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

describe('total internal reflection', () => {
  // Reference values here come from microscopyu's TIRF article, not from the
  // implementation: glass at 1.518 against an aqueous specimen at 1.33 to 1.38,
  // an evanescent field "typically less than 100 nanometers in thickness", and
  // an objective NA that has to exceed the specimen's refractive index before
  // total internal reflection is reachable at all.

  it('puts the critical angle where Snell says, checked against a hand case', () => {
    // sin θc = n2/n1. Chosen so the ratio is exactly 1/2 and the answer is 30°
    // by inspection rather than by running the same formula twice.
    expect(criticalAngle(2, 1)).toBeCloseTo(30, 10);
    // The glass–water case microscopyu quotes, ~61°.
    expect(criticalAngle(1.518, 1.33)).toBeCloseTo(61.16, 1);
  });

  it('refuses a pairing that cannot reflect at all', () => {
    // No critical angle exists going into a denser medium; returning a number
    // would describe an instrument that cannot be built.
    expect(() => criticalAngle(1.33, 1.518)).toThrow(ResolutionError);
    expect(() => criticalAngle(1.515, 1.515)).toThrow(ResolutionError);
  });

  it('keeps the evanescent field under 100 nm at a usable TIRF angle', () => {
    // The external claim being tested: a real TIRF objective produces a section
    // "typically less than 100 nanometers". A 1.49 NA lens in 1.515 glass can
    // reach 79.6°, and at that angle the field must come out well under 100 nm.
    const angle = maximumIncidence(1.49, 1.515);
    expect(angle).toBeGreaterThan(criticalAngle(1.515, 1.33));
    const depth = evanescentDepth({
      wavelength: 488,
      coreIndex: 1.515,
      sampleIndex: 1.33,
      angle,
    });
    expect(depth).toBeGreaterThan(20);
    expect(depth).toBeLessThan(100);
  });

  it('makes the field shallower as the angle steepens', () => {
    // microscopyu: increasing the radial distance of the laser focus from the
    // axis "serve[s] to reduce the evanescent field penetration depth in a
    // smooth and reproducible manner". Monotonic, and that is checkable.
    const at = (angle: number) =>
      evanescentDepth({ wavelength: 488, coreIndex: 1.515, sampleIndex: 1.33, angle });
    const depths = [63, 66, 70, 75, 79].map(at);
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]!, `${i}`).toBeLessThan(depths[i - 1]!);
    }
  });

  it('refuses to extrapolate below the critical angle', () => {
    // Below it the beam refracts into the specimen and there is no evanescent
    // field. Returning a very large depth would be a plausible-looking answer
    // to a question with no answer.
    expect(() =>
      evanescentDepth({ wavelength: 488, coreIndex: 1.515, sampleIndex: 1.33, angle: 55 }),
    ).toThrow(ResolutionError);
  });

  it('ties the STED gain to the depletion power rather than fixing it', () => {
    // The saturation form: resolution scales as sqrt(1 + I/Isat). Checked
    // against the closed form written out independently here, and against the
    // limiting case of no depletion at all, which must give a plain confocal.
    expect(TECHNIQUE_GAINS['sted']!.lateral).toBeCloseTo(Math.sqrt(1 + STED_SATURATION_FACTOR), 10);
    expect(Math.sqrt(1 + 0)).toBe(1);
    // A doughnut confines the spot laterally and does nothing axially.
    expect(TECHNIQUE_GAINS['sted']!.axial).toBe(1);
  });

  it('claims only the optical gain for Airyscan, not the deconvolution', () => {
    // sqrt(2) is the pixel-reassignment gain and is derivable; the ~1.7x
    // vendors quote includes a deconvolution afterwards. Folding processing
    // into an optical figure is the kind of overstatement rule 7 exists for.
    expect(TECHNIQUE_GAINS['airyscan']!.lateral).toBeCloseTo(Math.SQRT2, 10);
    expect(TECHNIQUE_GAINS['airyscan']!.lateral).toBeLessThan(1.7);
  });

  it('claims no resolution gain for either light sheet', () => {
    // The lateral resolution is the detection objective's, and the axial is
    // bounded by it too. Light sheet buys photobleaching and speed, and a tool
    // that implied it resolved finer would be teaching the wrong lesson.
    for (const id of ['light-sheet', 'lattice-light-sheet']) {
      expect(TECHNIQUE_GAINS[id]!.lateral, id).toBe(1);
      expect(TECHNIQUE_GAINS[id]!.axial, id).toBe(1);
    }
  });
});
