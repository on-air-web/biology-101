import { describe, expect, it } from 'vitest';
import { QuantError, getKind, quantify } from './compute';

const dsDNA = getKind('dsdna')!;
const rna = getKind('rna')!;

const base = { dilutionFactor: 1, pathLength: 1 };

describe('concentration', () => {
  /**
   * The definition of the factor: A260 of 1.0 through 1 cm is 50 µg/mL of
   * double-stranded DNA. Everything else is that scaled, so the whole
   * conversion is checkable from one statement.
   */
  it('puts A260 of 1.0 at the factor for each material', () => {
    expect(quantify({ ...base, a260: 1, kind: dsDNA }).concentration).toBeCloseTo(50e-3, 12);
    expect(quantify({ ...base, a260: 1, kind: rna }).concentration).toBeCloseTo(40e-3, 12);
    expect(quantify({ ...base, a260: 1, kind: getKind('ssdna')! }).concentration).toBeCloseTo(
      33e-3,
      12,
    );
  });

  /** A routine plasmid prep: A260 0.2 is 10 µg/mL, which is 10 ng/µL. */
  it('scales linearly with absorbance', () => {
    const result = quantify({ ...base, a260: 0.2, kind: dsDNA });
    expect(result.concentration).toBeCloseTo(10e-3, 12);
  });

  it('multiplies back through the dilution', () => {
    const neat = quantify({ ...base, a260: 0.4, kind: dsDNA }).concentration;
    const diluted = quantify({ ...base, a260: 0.4, kind: dsDNA, dilutionFactor: 20 });
    expect(diluted.concentration).toBeCloseTo(neat * 20, 12);
  });

  /**
   * Path length is the trap on a microvolume instrument. A reading of 0.3 over
   * a 0.1 cm path is really a 3.0 sample, so the concentration is tenfold what
   * a naive 1 cm assumption would give.
   */
  it('normalises a short path to one centimetre', () => {
    const short = quantify({ a260: 0.3, kind: dsDNA, dilutionFactor: 1, pathLength: 0.1 });
    expect(short.correctedA260).toBeCloseTo(3, 12);
    expect(short.concentration).toBeCloseTo(150e-3, 12);
    // And a 1 cm cuvette leaves it alone.
    expect(quantify({ ...base, a260: 0.3, kind: dsDNA }).correctedA260).toBeCloseTo(0.3, 12);
  });

  it('reports total mass when the volume is known', () => {
    const result = quantify({ ...base, a260: 0.4, kind: dsDNA, sampleVolume: 50e-6 });
    // 20 µg/mL in 50 µL is 1 µg.
    expect(result.totalMass).toBeCloseTo(1e-6, 15);
    expect(quantify({ ...base, a260: 0.4, kind: dsDNA }).totalMass).toBeUndefined();
  });
});

describe('purity ratios', () => {
  it('divides the readings as stated', () => {
    const result = quantify({ ...base, a260: 1.8, a280: 1, a230: 0.9, kind: dsDNA });
    expect(result.ratio280).toBeCloseTo(1.8, 12);
    expect(result.ratio230).toBeCloseTo(2, 12);
  });

  it('is absent rather than infinite when a reading is missing or zero', () => {
    const result = quantify({ ...base, a260: 0.5, a280: 0, kind: dsDNA });
    expect(result.ratio280).toBeUndefined();
    expect(result.ratio230).toBeUndefined();
  });

  it('flags protein carryover from a low 260/280', () => {
    const result = quantify({ ...base, a260: 0.5, a280: 0.4, kind: dsDNA });
    expect(result.warnings.join(' ')).toMatch(/protein carried over/);
  });

  /** RNA is expected near 2.0, so 1.8 is low for RNA though fine for DNA. */
  it('holds each material to its own expected ratio', () => {
    const forDna = quantify({ ...base, a260: 0.9, a280: 0.5, kind: dsDNA });
    const forRna = quantify({ ...base, a260: 0.9, a280: 0.5, kind: rna });
    expect(forDna.warnings.join(' ')).not.toMatch(/A260\/A280/);
    expect(forRna.warnings.join(' ')).toMatch(/A260\/A280/);
  });

  it('flags phenol or guanidine from a low 260/230', () => {
    const result = quantify({ ...base, a260: 0.5, a280: 0.28, a230: 0.5, kind: dsDNA });
    expect(result.warnings.join(' ')).toMatch(/guanidine, phenol or carbohydrate/);
  });

  it('stays quiet on a clean prep', () => {
    const result = quantify({ ...base, a260: 0.5, a280: 0.277, a230: 0.238, kind: dsDNA });
    expect(result.warnings).toHaveLength(0);
  });
});

describe('range warnings', () => {
  it('says when the reading is off the top of the linear range', () => {
    expect(quantify({ ...base, a260: 1.6, kind: dsDNA }).warnings.join(' ')).toMatch(
      /past the top of its reliable range/,
    );
  });

  it('says when the reading is in the noise', () => {
    expect(quantify({ ...base, a260: 0.008, kind: dsDNA }).warnings.join(' ')).toMatch(
      /close to the blank/,
    );
  });
});

describe('input handling', () => {
  it('refuses impossible readings and settings', () => {
    expect(() => quantify({ ...base, a260: -0.1, kind: dsDNA })).toThrow(QuantError);
    expect(() => quantify({ ...base, a260: 0.5, kind: dsDNA, pathLength: 0 })).toThrow(QuantError);
    expect(() => quantify({ ...base, a260: 0.5, kind: dsDNA, dilutionFactor: 0.5 })).toThrow(
      QuantError,
    );
    expect(() => quantify({ ...base, a260: Number.NaN, kind: dsDNA })).toThrow(QuantError);
  });

  it('gives every material a distinct factor and sensible expectation', () => {
    const factors = [getKind('dsdna')!, getKind('ssdna')!, getKind('rna')!].map((k) => k.factor);
    expect(new Set(factors).size).toBe(3);
    // Duplex DNA is hypochromic, so it takes more material per unit absorbance.
    expect(getKind('dsdna')!.factor).toBeGreaterThan(getKind('rna')!.factor);
    expect(getKind('rna')!.factor).toBeGreaterThan(getKind('ssdna')!.factor);
  });
});
