import { describe, expect, it } from 'vitest';
import { SerialDilutionError, planSerialDilution } from './compute';

describe('planSerialDilution', () => {
  const base = {
    stockConcentration: 1,
    foldPerStep: 10,
    steps: 5,
    volumePerStep: 0.001,
  };

  it('includes the undiluted stock as step zero', () => {
    const plan = planSerialDilution(base);
    expect(plan[0]).toMatchObject({ index: 0, concentration: 1, cumulativeFold: 1 });
    expect(plan[0]?.transferVolume).toBeUndefined();
  });

  it('produces one row per step plus the stock', () => {
    expect(planSerialDilution(base)).toHaveLength(6);
  });

  it('follows the powers of the dilution factor', () => {
    const plan = planSerialDilution(base);
    expect(plan[1]?.concentration).toBeCloseTo(0.1, 12);
    expect(plan[3]?.concentration).toBeCloseTo(1e-3, 12);
    expect(plan[5]?.concentration).toBeCloseTo(1e-5, 12);
    expect(plan[5]?.cumulativeFold).toBeCloseTo(1e5, 6);
  });

  it('splits each tube into transfer plus diluent', () => {
    const plan = planSerialDilution({ ...base, foldPerStep: 2, volumePerStep: 0.001 });
    expect(plan[1]?.transferVolume).toBeCloseTo(0.0005, 12);
    expect(plan[1]?.diluentVolume).toBeCloseTo(0.0005, 12);

    const tenfold = planSerialDilution(base);
    expect(tenfold[1]?.transferVolume).toBeCloseTo(0.0001, 12);
    expect(tenfold[1]?.diluentVolume).toBeCloseTo(0.0009, 12);
  });

  it('rejects a dilution factor of one or less', () => {
    expect(() => planSerialDilution({ ...base, foldPerStep: 1 })).toThrow(SerialDilutionError);
    expect(() => planSerialDilution({ ...base, foldPerStep: 0.5 })).toThrow(SerialDilutionError);
  });

  it('rejects fractional or absent steps', () => {
    expect(() => planSerialDilution({ ...base, steps: 2.5 })).toThrow(SerialDilutionError);
    expect(() => planSerialDilution({ ...base, steps: 0 })).toThrow(SerialDilutionError);
  });

  it('refuses a series longer than a plate', () => {
    expect(() => planSerialDilution({ ...base, steps: 40 })).toThrow(/beyond a single plate/);
  });
});
