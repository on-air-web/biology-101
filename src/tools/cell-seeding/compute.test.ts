import { describe, expect, it } from 'vitest';
import { SeedingError, planSeeding } from './compute';
import { getVessel } from '@/lib/bio/vessels';

const sixWell = getVessel('6-well')!;

const base = {
  stockCellsPerMl: 1e6,
  targetBasis: 'per-area' as const,
  growthAreaCm2: sixWell.growthAreaCm2,
  workingVolumeMl: sixWell.workingVolumeMl,
  vessels: 6,
  overage: 0.1,
  route: 'master' as const,
};

describe('target conversion', () => {
  /** 5e4 cells/cm² over a 9.6 cm² well is 4.8e5 cells per well. */
  it('turns a density per area into cells per vessel', () => {
    const result = planSeeding({ ...base, target: 5e4 });
    expect(result.cellsPerVessel).toBeCloseTo(4.8e5, 6);
    expect(result.cellsPerCm2).toBeCloseTo(5e4, 6);
  });

  it('accepts the target the other way round and agrees with itself', () => {
    const byArea = planSeeding({ ...base, target: 5e4 });
    const byVessel = planSeeding({ ...base, target: 4.8e5, targetBasis: 'per-vessel' });
    expect(byVessel.cellsPerCm2).toBeCloseTo(byArea.cellsPerCm2, 6);
    expect(byVessel.suspensionVolumeMl).toBeCloseTo(byArea.suspensionVolumeMl, 9);
  });

  /** 4.8e5 cells in 2.5 mL of medium is 1.92e5 per mL. */
  it('reports the density the vessel ends up at', () => {
    expect(planSeeding({ ...base, target: 5e4 }).seedingCellsPerMl).toBeCloseTo(1.92e5, 4);
  });
});

describe('master mix route', () => {
  /**
   * 6 wells plus 10% is 6.6 wells-worth; at 2.5 mL each that is 16.5 mL, and
   * 4.8e5 cells per well needs 3.168e6 cells, which from a 1e6/mL stock is
   * 3.168 mL. All hand-checkable.
   */
  it('scales the whole mix by the overage', () => {
    const result = planSeeding({ ...base, target: 5e4 });
    expect(result.effectiveVessels).toBeCloseTo(6.6, 12);
    expect(result.totalVolumeMl).toBeCloseTo(16.5, 12);
    expect(result.totalCells).toBeCloseTo(3.168e6, 3);
    expect(result.suspensionVolumeMl).toBeCloseTo(3.168, 9);
    expect(result.mediumVolumeMl).toBeCloseTo(16.5 - 3.168, 9);
  });

  it('conserves volume', () => {
    const result = planSeeding({ ...base, target: 5e4 });
    expect(result.suspensionVolumeMl + result.mediumVolumeMl).toBeCloseTo(result.totalVolumeMl, 12);
  });

  it('leaves the per-vessel density untouched by overage', () => {
    const none = planSeeding({ ...base, target: 5e4, overage: 0 });
    const plenty = planSeeding({ ...base, target: 5e4, overage: 0.5 });
    expect(plenty.seedingCellsPerMl).toBeCloseTo(none.seedingCellsPerMl, 9);
    expect(plenty.suspensionVolumeMl / none.suspensionVolumeMl).toBeCloseTo(1.5, 9);
  });
});

describe('direct route', () => {
  /** One well: 4.8e5 cells from a 1e6/mL stock is 0.48 mL, topped to 2.5 mL. */
  it('works per vessel rather than in bulk', () => {
    const result = planSeeding({ ...base, target: 5e4, route: 'direct' });
    expect(result.suspensionVolumeMl).toBeCloseTo(0.48, 9);
    expect(result.mediumVolumeMl).toBeCloseTo(2.02, 9);
    expect(result.totalVolumeMl).toBeCloseTo(2.5, 12);
  });

  it('is independent of how many vessels are being seeded', () => {
    const few = planSeeding({ ...base, target: 5e4, route: 'direct', vessels: 2 });
    const many = planSeeding({ ...base, target: 5e4, route: 'direct', vessels: 40 });
    expect(many.suspensionVolumeMl).toBeCloseTo(few.suspensionVolumeMl, 12);
  });
});

describe('warnings', () => {
  it('refuses to pretend a too-dilute stock can work', () => {
    const result = planSeeding({ ...base, target: 5e4, stockCellsPerMl: 1e4 });
    expect(result.suspensionVolumeMl).toBeGreaterThan(result.totalVolumeMl);
    expect(result.warnings.join(' ')).toMatch(/too dilute/);
  });

  /** A 96-well seeded sparsely from a dense stock lands under a microlitre. */
  it('flags a volume too small to pipette', () => {
    const plate = getVessel('96-well')!;
    const result = planSeeding({
      ...base,
      target: 5e3,
      growthAreaCm2: plate.growthAreaCm2,
      workingVolumeMl: plate.workingVolumeMl,
      vessels: 1,
      route: 'direct',
      stockCellsPerMl: 5e6,
    });
    expect(result.suspensionVolumeMl).toBeLessThan(0.005);
    expect(result.warnings.join(' ')).toMatch(/pipetting error dominates/);
  });

  it('suggests a master mix when dosing many wells individually', () => {
    const plate = getVessel('96-well')!;
    const result = planSeeding({
      ...base,
      target: 1e4,
      growthAreaCm2: plate.growthAreaCm2,
      workingVolumeMl: plate.workingVolumeMl,
      vessels: 96,
      route: 'direct',
      stockCellsPerMl: 5e6,
    });
    expect(result.warnings.join(' ')).toMatch(/master mix/);
  });

  it('mentions the short last well when no overage is allowed', () => {
    expect(planSeeding({ ...base, target: 5e4, overage: 0 }).warnings.join(' ')).toMatch(
      /no overage/,
    );
  });

  it('stays quiet on a routine plan', () => {
    expect(planSeeding({ ...base, target: 5e4 }).warnings).toHaveLength(0);
  });
});

describe('input handling', () => {
  it('rejects non-positive quantities', () => {
    expect(() => planSeeding({ ...base, target: 0 })).toThrow(SeedingError);
    expect(() => planSeeding({ ...base, target: 5e4, stockCellsPerMl: 0 })).toThrow(SeedingError);
    expect(() => planSeeding({ ...base, target: 5e4, vessels: 0 })).toThrow(SeedingError);
    expect(() => planSeeding({ ...base, target: 5e4, workingVolumeMl: -1 })).toThrow(SeedingError);
  });

  it('rejects an implausible overage rather than accepting a typo', () => {
    expect(() => planSeeding({ ...base, target: 5e4, overage: -0.1 })).toThrow(SeedingError);
    // 10 would be a user meaning "10%" and typing the number, not the fraction.
    expect(() => planSeeding({ ...base, target: 5e4, overage: 10 })).toThrow(SeedingError);
  });
});
