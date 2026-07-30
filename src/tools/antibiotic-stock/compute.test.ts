import { describe, expect, it } from 'vitest';
import { ANTIBIOTICS, AntibioticError, doseCulture, getAntibiotic, massForStock } from './compute';

const mL = (value: number) => value * 1e-3;
const uL = (value: number) => value * 1e-6;

describe('dosing a culture', () => {
  /**
   * The everyday case, hand checkable: 100 mg/mL ampicillin to 100 µg/mL in
   * 1 L of medium is a thousandfold dilution, so 1 mL of stock.
   */
  it('handles the standard ampicillin dose', () => {
    const amp = getAntibiotic('ampicillin')!;
    const result = doseCulture({
      stockConcentration: amp.stock,
      workingConcentration: amp.working,
      cultureVolume: 1,
    });
    expect(result.foldDilution).toBeCloseTo(1000, 9);
    expect(result.volumeToAdd).toBeCloseTo(mL(1), 15);
    expect(result.massDelivered).toBeCloseTo(0.1, 12);
  });

  /** 50 mg/mL kanamycin to 50 µg/mL in 250 mL is 250 µL. */
  it('handles a smaller flask', () => {
    const kan = getAntibiotic('kanamycin')!;
    const result = doseCulture({
      stockConcentration: kan.stock,
      workingConcentration: kan.working,
      cultureVolume: mL(250),
    });
    expect(result.volumeToAdd).toBeCloseTo(uL(250), 15);
  });

  it('scales with the culture volume', () => {
    const small = doseCulture({
      stockConcentration: 50,
      workingConcentration: 0.05,
      cultureVolume: mL(10),
    });
    const large = doseCulture({
      stockConcentration: 50,
      workingConcentration: 0.05,
      cultureVolume: mL(100),
    });
    expect(large.volumeToAdd).toBeCloseTo(small.volumeToAdd * 10, 15);
    expect(large.foldDilution).toBeCloseTo(small.foldDilution, 12);
  });

  it('refuses a working concentration above the stock, and says why', () => {
    expect(() =>
      doseCulture({ stockConcentration: 0.05, workingConcentration: 50, cultureVolume: mL(10) }),
    ).toThrow(/mg\/mL while the other is in µg\/mL/);
  });

  it('refuses non-positive inputs', () => {
    expect(() =>
      doseCulture({ stockConcentration: 0, workingConcentration: 0.05, cultureVolume: 1 }),
    ).toThrow(AntibioticError);
    expect(() =>
      doseCulture({ stockConcentration: 50, workingConcentration: 0.05, cultureVolume: 0 }),
    ).toThrow(AntibioticError);
  });
});

describe('warnings', () => {
  it('flags a dose too small to pipette', () => {
    // 100 mg/mL into 1 mL at 100 µg/mL is 1 µL.
    const result = doseCulture({
      stockConcentration: 100,
      workingConcentration: 0.1,
      cultureVolume: mL(1),
    });
    expect(result.volumeToAdd).toBeCloseTo(uL(1), 15);
    expect(result.warnings.join(' ')).toMatch(/limit of what a pipette/);
  });

  it('flags a stock so dilute it changes the medium', () => {
    const result = doseCulture({
      stockConcentration: 1,
      workingConcentration: 0.1,
      cultureVolume: mL(100),
    });
    // A tenfold dilution means a tenth of the final volume is solvent.
    expect(result.warnings.join(' ')).toMatch(/more than a twentieth/);
  });

  it('stays quiet on a routine dose', () => {
    const result = doseCulture({
      stockConcentration: 100,
      workingConcentration: 0.1,
      cultureVolume: mL(500),
    });
    expect(result.warnings).toHaveLength(0);
  });
});

describe('making a stock', () => {
  /** 100 mg/mL in 10 mL is 1 g. */
  it('multiplies concentration by volume', () => {
    expect(massForStock(100, mL(10))).toBeCloseTo(1, 12);
    expect(massForStock(50, mL(5))).toBeCloseTo(0.25, 12);
  });

  it('refuses non-positive input', () => {
    expect(() => massForStock(0, mL(10))).toThrow(AntibioticError);
    expect(() => massForStock(50, 0)).toThrow(AntibioticError);
  });
});

describe('reference data', () => {
  it('has unique ids and a solvent for each entry', () => {
    const ids = ANTIBIOTICS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ANTIBIOTICS) {
      expect(entry.solvent.length, entry.id).toBeGreaterThan(2);
      expect(entry.note.length, entry.id).toBeGreaterThan(30);
    }
  });

  /**
   * Every stock is a thousandfold above its working concentration, which is
   * the convention that makes the mg/mL against µg/mL confusion so easy: the
   * two numbers on the page are identical.
   */
  it('keeps every stock a thousandfold above its working concentration', () => {
    for (const entry of ANTIBIOTICS) {
      expect(entry.stock / entry.working, entry.id).toBeCloseTo(1000, 6);
    }
  });

  it('returns undefined for an unknown id rather than guessing', () => {
    expect(getAntibiotic('penicillin')).toBeUndefined();
  });
});
