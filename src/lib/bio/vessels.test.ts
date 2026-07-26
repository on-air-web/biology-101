import { describe, expect, it } from 'vitest';
import { VESSELS, getPlates, getVessel } from './vessels';

describe('vessel geometry', () => {
  it('has unique ids', () => {
    const ids = VESSELS.map((vessel) => vessel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Growth area and well diameter are catalogued separately by suppliers, so
   * checking one against the other is a genuine cross-check rather than a
   * restatement: a flat-bottomed well of diameter d has area πd²/4. Three per
   * cent covers the rounding in published figures and the slight taper of a
   * real well, and is far tighter than any plausible typo.
   */
  it('agrees with its own well diameter on growth area', () => {
    for (const vessel of getPlates()) {
      const radiusCm = vessel.wellDiameterMm! / 20;
      const derived = Math.PI * radiusCm * radiusCm;
      const error = Math.abs(derived - vessel.growthAreaCm2) / vessel.growthAreaCm2;
      expect(
        error,
        `${vessel.id}: stored ${vessel.growthAreaCm2}, πr² gives ${derived}`,
      ).toBeLessThan(0.03);
    }
  });

  it('gives every vessel a positive area and working volume', () => {
    for (const vessel of VESSELS) {
      expect(vessel.growthAreaCm2, vessel.id).toBeGreaterThan(0);
      expect(vessel.workingVolumeMl, vessel.id).toBeGreaterThan(0);
    }
  });

  it('counts wells only on plates', () => {
    for (const vessel of VESSELS) {
      if (vessel.kind === 'plate') expect(vessel.wells, vessel.id).toBeGreaterThan(0);
      else expect(vessel.wells, vessel.id).toBeUndefined();
    }
  });

  /** A 35 mm dish and one well of a 6-well plate are the same size of surface. */
  it('keeps areas ordered by vessel size', () => {
    const plate96 = getVessel('96-well')!;
    const plate6 = getVessel('6-well')!;
    const t175 = getVessel('t175')!;
    expect(plate96.growthAreaCm2).toBeLessThan(plate6.growthAreaCm2);
    expect(plate6.growthAreaCm2).toBeLessThan(t175.growthAreaCm2);
    expect(getVessel('dish-35')!.growthAreaCm2).toBeCloseTo(plate6.growthAreaCm2, 5);
  });

  it('returns undefined for an unknown id rather than guessing', () => {
    expect(getVessel('t500')).toBeUndefined();
  });
});
