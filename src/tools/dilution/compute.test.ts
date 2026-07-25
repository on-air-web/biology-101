import { describe, expect, it } from 'vitest';
import { DilutionInputError, dilutionFactor, solveDilution } from './compute';

describe('solveDilution', () => {
  it('computes the stock volume for a routine dilution', () => {
    // 10 mL of 0.1 M from a 1 M stock needs 1 mL of stock.
    expect(
      solveDilution(
        { stockConcentration: 1, finalConcentration: 0.1, finalVolume: 0.01 },
        'stockVolume',
      ),
    ).toBeCloseTo(0.001, 9);
  });

  it('solves each of the four terms consistently', () => {
    const base = { stockConcentration: 5, stockVolume: 0.002, finalVolume: 0.05 };
    const c2 = solveDilution(base, 'finalConcentration');
    expect(c2).toBeCloseTo(0.2, 9);
    expect(solveDilution({ ...base, finalConcentration: c2 }, 'stockVolume')).toBeCloseTo(0.002, 9);
    expect(solveDilution({ ...base, finalConcentration: c2 }, 'finalVolume')).toBeCloseTo(0.05, 9);
    expect(solveDilution({ ...base, finalConcentration: c2 }, 'stockConcentration')).toBeCloseTo(
      5,
      9,
    );
  });

  it('refuses to dilute up to a higher concentration', () => {
    expect(() =>
      solveDilution(
        { stockConcentration: 0.1, finalConcentration: 1, finalVolume: 0.01 },
        'stockVolume',
      ),
    ).toThrow(/higher than the stock/);
  });

  it('rejects a stock volume larger than the final volume', () => {
    expect(() =>
      solveDilution(
        { stockConcentration: 1, stockVolume: 0.1, finalVolume: 0.01 },
        'finalConcentration',
      ),
    ).toThrow(DilutionInputError);
  });

  it('requires every other term', () => {
    expect(() => solveDilution({ stockConcentration: 1 }, 'stockVolume')).toThrow(
      DilutionInputError,
    );
  });
});

describe('dilutionFactor', () => {
  it('reports the 1-in-N a protocol states', () => {
    expect(dilutionFactor(1, 0.1)).toBeCloseTo(10, 9);
    expect(dilutionFactor(100, 4)).toBeCloseTo(25, 9);
  });
});
