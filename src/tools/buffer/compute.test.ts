import { describe, expect, it } from 'vitest';
import { BUFFERS, getBuffer } from '@/lib/chem/buffers';
import { parseFormula } from '@/lib/formula';
import { BufferError, pKaAt, prepareBuffer } from './compute';

const tris = getBuffer('tris')!;
const phosphate = getBuffer('phosphate')!;

const base = {
  concentration: 0.1,
  volume: 1,
  prepareAtC: 25,
  useAtC: 25,
  route: 'two-salts' as const,
};

describe('buffer reference data', () => {
  it('gives every buffer a parseable formula for both forms', () => {
    for (const buffer of BUFFERS) {
      expect(() => parseFormula(buffer.acid.formula), `${buffer.id} acid`).not.toThrow();
      expect(() => parseFormula(buffer.base.formula), `${buffer.id} base`).not.toThrow();
    }
  });

  it('derives molar masses that match the supplier figures', () => {
    // Cross-checks the stored formulae against numbers on a reagent bottle.
    expect(parseFormula('C4H11NO3').molarMass).toBeCloseTo(121.14, 2);
    expect(parseFormula('C4H12ClNO3').molarMass).toBeCloseTo(157.6, 1);
    expect(parseFormula('C8H18N2O4S').molarMass).toBeCloseTo(238.3, 1);
    expect(parseFormula('NaH2PO4').molarMass).toBeCloseTo(119.98, 2);
    expect(parseFormula('Na2HPO4').molarMass).toBeCloseTo(141.96, 2);
  });

  it('centres each useful range on its pKa', () => {
    for (const buffer of BUFFERS) {
      expect(buffer.pKa25).toBeGreaterThanOrEqual(buffer.usefulRange[0]);
      expect(buffer.pKa25).toBeLessThanOrEqual(buffer.usefulRange[1]);
    }
  });
});

describe('temperature correction', () => {
  it('shifts Tris the documented amount', () => {
    // 8.06 + (−0.028)(4 − 25) = 8.648
    expect(pKaAt(tris, 4)).toBeCloseTo(8.648, 3);
    expect(pKaAt(tris, 37)).toBeCloseTo(7.724, 3);
    expect(pKaAt(tris, 25)).toBeCloseTo(8.06, 10);
  });

  it('barely moves phosphate', () => {
    expect(pKaAt(phosphate, 4)).toBeCloseTo(7.2588, 4);
  });

  it('warns when a buffer adjusted warm is used cold', () => {
    const result = prepareBuffer({
      ...base,
      spec: tris,
      targetPh: 8,
      prepareAtC: 25,
      useAtC: 4,
    });
    expect(result.phAtUse).toBeCloseTo(8.588, 3);
    expect(result.warnings.join(' ')).toMatch(/8\.59|shift/);
  });

  it('says nothing when preparation and use temperatures match', () => {
    const result = prepareBuffer({ ...base, spec: tris, targetPh: 8 });
    expect(result.phAtUse).toBeCloseTo(8, 10);
    expect(result.warnings.some((warning) => warning.includes('shift'))).toBe(false);
  });
});

describe('Henderson–Hasselbalch', () => {
  it('splits evenly when the target pH equals the pKa', () => {
    const result = prepareBuffer({ ...base, spec: phosphate, targetPh: 7.2 });
    expect(result.baseFraction).toBeCloseTo(0.5, 10);
    // 0.05 mol each in 1 L of 100 mM.
    expect(result.components[0]!.moles).toBeCloseTo(0.05, 10);
    expect(result.components[1]!.moles).toBeCloseTo(0.05, 10);
    expect(result.components[0]!.grams).toBeCloseTo(5.999, 2);
    expect(result.components[1]!.grams).toBeCloseTo(7.098, 2);
  });

  it('shifts towards the base form above the pKa', () => {
    const result = prepareBuffer({ ...base, spec: phosphate, targetPh: 8.2 });
    expect(result.baseFraction).toBeCloseTo(10 / 11, 6);
  });

  it('conserves total moles across both components', () => {
    const result = prepareBuffer({ ...base, spec: tris, targetPh: 7.5, concentration: 0.05 });
    const total = result.components.reduce((sum, component) => sum + component.moles, 0);
    expect(total).toBeCloseTo(0.05, 12);
  });

  it('scales with volume and concentration', () => {
    const one = prepareBuffer({ ...base, spec: tris, targetPh: 8, volume: 1 });
    const two = prepareBuffer({ ...base, spec: tris, targetPh: 8, volume: 2 });
    expect(two.components[0]!.grams).toBeCloseTo(one.components[0]!.grams * 2, 10);
  });
});

describe('titration route', () => {
  it('weighs out all base and titrates the rest with acid', () => {
    const result = prepareBuffer({ ...base, spec: tris, targetPh: 8, route: 'titrate' });
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.moles).toBeCloseTo(0.1, 10);
    // Acid fraction at pH 8 with pKa 8.06.
    expect(result.titrant?.moles).toBeCloseTo(0.1 * (1 - result.baseFraction), 12);
  });
});

describe('warnings', () => {
  it('flags a pH outside the useful range', () => {
    const result = prepareBuffer({ ...base, spec: tris, targetPh: 6 });
    expect(result.warnings.join(' ')).toMatch(/useful range/);
  });

  it('flags a lopsided ratio', () => {
    const result = prepareBuffer({ ...base, spec: phosphate, targetPh: 5.8 });
    expect(result.warnings.join(' ')).toMatch(/tenfold/);
  });
});

describe('input handling', () => {
  it('rejects impossible values', () => {
    expect(() => prepareBuffer({ ...base, spec: tris, targetPh: 15 })).toThrow(BufferError);
    expect(() => prepareBuffer({ ...base, spec: tris, targetPh: 8, volume: 0 })).toThrow(
      BufferError,
    );
    expect(() => prepareBuffer({ ...base, spec: tris, targetPh: 8, concentration: -1 })).toThrow(
      BufferError,
    );
    expect(() => prepareBuffer({ ...base, spec: tris, targetPh: 8, useAtC: 200 })).toThrow(
      BufferError,
    );
  });
});
