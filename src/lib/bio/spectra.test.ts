import { describe, expect, it } from 'vitest';
import {
  FLUOROPHORES,
  SPECTRUM_STEP,
  extinctionAt,
  getFluorophore,
  integrate,
  molecularBrightness,
  sampleSpectrum,
  spectrumArea,
  spectrumRange,
  stokesShift,
  wavelengthColour,
} from './spectra';

describe('sampleSpectrum', () => {
  const spectrum = { start: 500, values: [0, 0.5, 1, 0.5, 0] };

  it('reads stored points exactly', () => {
    expect(sampleSpectrum(spectrum, 500)).toBe(0);
    expect(sampleSpectrum(spectrum, 504)).toBe(1);
    expect(sampleSpectrum(spectrum, 508)).toBe(0);
  });

  it('interpolates linearly between them', () => {
    // 503 is halfway between the 0.5 at 502 and the 1.0 at 504.
    expect(sampleSpectrum(spectrum, 503)).toBeCloseTo(0.75, 12);
    expect(sampleSpectrum(spectrum, 501)).toBeCloseTo(0.25, 12);
  });

  it('reads zero outside the stored range', () => {
    // Not a convenience: the dataset trims where the normalised value falls
    // below 0.001, so outside the range the value is known to be negligible.
    expect(sampleSpectrum(spectrum, 499)).toBe(0);
    expect(sampleSpectrum(spectrum, 509)).toBe(0);
    expect(sampleSpectrum(spectrum, 1200)).toBe(0);
  });

  it('uses the declared grid step', () => {
    expect(SPECTRUM_STEP).toBe(2);
    expect(spectrumRange(spectrum)).toEqual([500, 508]);
  });
});

describe('integrate', () => {
  it('matches the closed form for a straight line', () => {
    // ∫₀¹⁰ x dx = 50, and the trapezoid rule is exact on a linear integrand.
    expect(integrate((x) => x, 0, 10)).toBeCloseTo(50, 10);
  });

  it('matches the closed form for a curved integrand', () => {
    // A half sine of period 200 nm, integrated over its arch: the closed form
    // is 400/π. Written at spectrum scale on purpose — the grid is fixed at
    // 1 nm, so a test over an interval a few nanometres wide would be
    // measuring the step size rather than the rule.
    // The residual is the trapezoid rule's O(h²) term over 200 steps, which is
    // what the tolerance is sized to rather than chosen by trial.
    const arch = (nm: number) => Math.sin((Math.PI * nm) / 200);
    expect(integrate(arch, 0, 200)).toBeCloseTo(400 / Math.PI, 2);
  });

  it('returns zero for an empty or reversed interval', () => {
    expect(integrate(() => 1, 5, 5)).toBe(0);
    expect(integrate(() => 1, 10, 5)).toBe(0);
  });

  it('agrees with the triangle area of a stored spectrum', () => {
    // Peak 1.0 at 504, falling to zero at 500 and 508: area = ½ × 8 × 1 = 4.
    expect(spectrumArea({ start: 500, values: [0, 0.5, 1, 0.5, 0] })).toBeCloseTo(4, 10);
  });
});

describe('the shipped dataset', () => {
  it('holds a peak-normalised excitation and emission curve for every entry', () => {
    for (const fluorophore of FLUOROPHORES) {
      for (const [which, spectrum] of [
        ['ex', fluorophore.ex],
        ['em', fluorophore.em],
      ] as const) {
        const peak = Math.max(...spectrum.values);
        expect(peak, `${fluorophore.id} ${which} peak`).toBeCloseTo(1, 2);
        expect(
          Math.min(...spectrum.values),
          `${fluorophore.id} ${which} minimum`,
        ).toBeGreaterThanOrEqual(0);
        expect(spectrum.values.length, `${fluorophore.id} ${which} length`).toBeGreaterThan(10);
      }
    }
  });

  it('gives every entry a unique id and a curated note', () => {
    const ids = FLUOROPHORES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fluorophore of FLUOROPHORES) {
      expect(fluorophore.id, `${fluorophore.name} id`).toMatch(/^[a-z0-9]+(-[a-z0-9.]+)*$/);
      // The note is the judgement that justifies a curated list of 45 rather
      // than a mirror of FPbase's thousands. An entry without one is a row in
      // a phone book.
      expect(fluorophore.note.length, `${fluorophore.id} note`).toBeGreaterThan(40);
    }
  });

  it('emits at a longer wavelength than it absorbs', () => {
    // Stokes' rule. A violation would mean the two spectra had been swapped,
    // which is the single most likely way this dataset could go wrong.
    for (const fluorophore of FLUOROPHORES) {
      const shift = stokesShift(fluorophore);
      expect(shift, `${fluorophore.id}`).toBeDefined();
      expect(shift!, `${fluorophore.id} Stokes shift`).toBeGreaterThan(0);
    }
  });

  it('places the recorded maximum on the peak of the stored curve', () => {
    // Cross-check between two independent fields: FPbase's quoted maximum,
    // and the curve it also supplied. They come from the same source but not
    // the same record, so a mismatch means an entry was mis-joined.
    for (const fluorophore of FLUOROPHORES) {
      for (const [which, spectrum, quoted] of [
        ['ex', fluorophore.ex, fluorophore.exMax],
        ['em', fluorophore.em, fluorophore.emMax],
      ] as const) {
        if (quoted === null) continue;
        const peakIndex = spectrum.values.indexOf(Math.max(...spectrum.values));
        const peakNm = spectrum.start + peakIndex * SPECTRUM_STEP;
        // Published maxima are rounded and occasionally taken from a different
        // measurement than the curve, so a few nanometres of disagreement is
        // expected; tens would mean the wrong curve.
        expect(
          Math.abs(peakNm - quoted),
          `${fluorophore.id} ${which} peak vs quoted`,
        ).toBeLessThanOrEqual(12);
      }
    }
  });

  it('keeps photophysical values inside their physical bounds', () => {
    for (const fluorophore of FLUOROPHORES) {
      if (fluorophore.quantumYield !== null) {
        expect(fluorophore.quantumYield, `${fluorophore.id} Φ`).toBeGreaterThan(0);
        expect(fluorophore.quantumYield, `${fluorophore.id} Φ`).toBeLessThanOrEqual(1);
      }
      if (fluorophore.extCoeff !== null) {
        expect(fluorophore.extCoeff, `${fluorophore.id} ε`).toBeGreaterThan(0);
      }
    }
  });
});

describe('EGFP, against the values UniProt-era literature quotes', () => {
  // An external reference beats a self-consistent test. EGFP is the most
  // measured fluorophore there is: ex 488, em 507, ε 55,900 M⁻¹cm⁻¹, Φ 0.60,
  // giving a brightness of 33.5. Every one of these is on the FPbase entry
  // page and in Tsien's 1998 review; if the pipeline ever mis-joins a record,
  // this is where it shows.
  const egfp = getFluorophore('egfp');

  it('is in the dataset', () => {
    expect(egfp).toBeDefined();
  });

  it('has the published maxima', () => {
    expect(egfp!.exMax).toBe(488);
    expect(egfp!.emMax).toBe(507);
  });

  it('has the published brightness', () => {
    expect(molecularBrightness(egfp!)).toBeCloseTo(33.54, 1);
  });

  it('is at full absorptivity on the 488 nm line and far down at 561', () => {
    // The whole reason 488 is the GFP line. Read off the excitation curve.
    expect(sampleSpectrum(egfp!.ex, 488)).toBeGreaterThan(0.98);
    expect(sampleSpectrum(egfp!.ex, 561)).toBeLessThan(0.01);
  });

  it('scales the extinction coefficient by the normalised curve', () => {
    expect(extinctionAt(egfp!, 488)).toBeCloseTo(
      egfp!.extCoeff! * sampleSpectrum(egfp!.ex, 488),
      6,
    );
    // Well off the peak, ε must fall but stay non-negative.
    expect(extinctionAt(egfp!, 450)!).toBeLessThan(egfp!.extCoeff!);
    expect(extinctionAt(egfp!, 450)!).toBeGreaterThanOrEqual(0);
  });
});

describe('mCherry, as the red cross-check', () => {
  const mcherry = getFluorophore('mcherry');

  it('has the published maxima and a low quantum yield', () => {
    expect(mcherry!.exMax).toBe(587);
    expect(mcherry!.emMax).toBe(610);
    // The well-known reason mCherry is dim despite a respectable ε.
    expect(mcherry!.quantumYield).toBeCloseTo(0.22, 3);
  });

  it('is barely excited on the 488 nm line', () => {
    // Not zero — this residual is exactly why GFP channels bleed into red.
    const at488 = sampleSpectrum(mcherry!.ex, 488);
    expect(at488).toBeGreaterThan(0);
    expect(at488).toBeLessThan(0.2);
  });
});

describe('wavelengthColour', () => {
  it('returns a hex triple across the whole range', () => {
    for (let nm = 300; nm <= 900; nm += 10) {
      expect(wavelengthColour(nm)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('is continuous — no visible jump between neighbouring wavelengths', () => {
    // The bound is 8 rather than something tighter because the steepest part
    // of the ramp is real: between 495 and 510 nm cyan becomes green, and the
    // blue channel drops 6 levels per nanometre. A genuine discontinuity — a
    // missing anchor, a mis-ordered table — moves a channel by tens.
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let nm = 350; nm < 800; nm += 1) {
      const a = channels(wavelengthColour(nm));
      const b = channels(wavelengthColour(nm + 1));
      for (let i = 0; i < 3; i += 1) {
        expect(Math.abs(a[i]! - b[i]!), `${nm} nm, channel ${i}`).toBeLessThanOrEqual(8);
      }
    }
  });

  it('stays clear of the near-black page background at both ends', () => {
    // The reason this is a hand-picked ramp rather than a colorimetric
    // conversion: true 400 nm and true 700 nm are both invisible on #000.
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    for (const nm of [350, 400, 700, 800]) {
      expect(luminance(wavelengthColour(nm)), `${nm} nm`).toBeGreaterThan(60);
    }
  });
});
