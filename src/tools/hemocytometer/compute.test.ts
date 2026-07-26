import { describe, expect, it } from 'vitest';
import { HemocytometerError, cellsToCount, countCells } from './compute';
import { CHAMBERS, getChamber, squareVolumeMl } from './chambers';

const neubauer = getChamber('neubauer-improved')!;
const NEUBAUER_SQUARE_ML = squareVolumeMl(neubauer);

const base = {
  squares: 4,
  squareVolumeMl: NEUBAUER_SQUARE_ML,
  dilutionFactor: 1,
};

describe('chamber geometry', () => {
  /**
   * 1 mm² × 0.1 mm is 0.1 mm³, and 1 mm³ is 1 µL, so a square holds 0.1 µL =
   * 1e-4 mL. Its reciprocal is the 10⁴ printed in every protocol — derived
   * here rather than assumed, which is what lets a deeper chamber work.
   */
  it('derives the familiar ten-thousand multiplier', () => {
    expect(NEUBAUER_SQUARE_ML).toBeCloseTo(1e-4, 12);
    expect(1 / NEUBAUER_SQUARE_ML).toBeCloseTo(1e4, 6);
  });

  it('halves the multiplier for a chamber of twice the depth', () => {
    const fuchs = getChamber('fuchs-rosenthal')!;
    expect(squareVolumeMl(fuchs)).toBeCloseTo(2 * NEUBAUER_SQUARE_ML, 12);
  });

  it('gives every chamber a positive geometry and a unique id', () => {
    const ids = CHAMBERS.map((chamber) => chamber.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const chamber of CHAMBERS) {
      expect(chamber.squareAreaMm2, chamber.id).toBeGreaterThan(0);
      expect(chamber.depthMm, chamber.id).toBeGreaterThan(0);
    }
  });
});

describe('cell density', () => {
  /** 400 cells over 4 squares is 100 per square; 100 / 1e-4 mL = 1e6 per mL. */
  it('scales a count to the suspension', () => {
    const result = countCells({ ...base, liveCount: 400 });
    expect(result.meanPerSquare).toBe(100);
    expect(result.cellsPerMl).toBeCloseTo(1e6, 3);
  });

  it('multiplies back through the dilution', () => {
    const neat = countCells({ ...base, liveCount: 400 });
    const diluted = countCells({ ...base, liveCount: 400, dilutionFactor: 2 });
    expect(diluted.cellsPerMl).toBeCloseTo(neat.cellsPerMl * 2, 3);
  });

  it('is unchanged by counting more squares at the same density', () => {
    const four = countCells({ ...base, liveCount: 400, squares: 4 });
    const eight = countCells({ ...base, liveCount: 800, squares: 8 });
    expect(eight.cellsPerMl).toBeCloseTo(four.cellsPerMl, 6);
    // But the interval must tighten, because more cells were actually counted.
    expect(eight.relativeError).toBeLessThan(four.relativeError);
  });

  it('doubles the density in a chamber of half the depth at equal counts', () => {
    const shallow = countCells({ ...base, liveCount: 400 });
    const deep = countCells({
      ...base,
      liveCount: 400,
      squareVolumeMl: squareVolumeMl(getChamber('fuchs-rosenthal')!),
    });
    expect(shallow.cellsPerMl).toBeCloseTo(deep.cellsPerMl * 2, 3);
  });
});

describe('counting uncertainty', () => {
  /**
   * The interval must scale exactly as the estimate does, since both come from
   * the same count through the same multiplier.
   */
  it('scales the interval with the estimate', () => {
    const neat = countCells({ ...base, liveCount: 400 });
    const diluted = countCells({ ...base, liveCount: 400, dilutionFactor: 5 });
    expect(diluted.interval.lower).toBeCloseTo(neat.interval.lower * 5, 3);
    expect(diluted.interval.upper).toBeCloseTo(neat.interval.upper * 5, 3);
    expect(diluted.relativeError).toBeCloseTo(neat.relativeError, 12);
  });

  it('brackets the estimate', () => {
    for (const liveCount of [1, 25, 100, 400, 2000]) {
      const result = countCells({ ...base, liveCount });
      expect(result.interval.lower).toBeLessThan(result.cellsPerMl);
      expect(result.interval.upper).toBeGreaterThan(result.cellsPerMl);
    }
  });

  /**
   * The headline claim: the conventional minimum of 100 cells still leaves
   * roughly a fifth either way. Checked against the Poisson interval rather
   * than asserted as a round number.
   */
  it('puts a count of one hundred at about a fifth either way', () => {
    const result = countCells({ ...base, liveCount: 100, squares: 1 });
    expect(result.relativeError).toBeGreaterThan(0.15);
    expect(result.relativeError).toBeLessThan(0.25);
  });

  it('tightens as roughly one over the square root of the count', () => {
    const hundred = countCells({ ...base, liveCount: 100, squares: 1 });
    const tenThousand = countCells({ ...base, liveCount: 10000, squares: 100 });
    // A hundredfold more cells should be about tenfold more precise.
    expect(hundred.relativeError / tenThousand.relativeError).toBeGreaterThan(8);
    expect(hundred.relativeError / tenThousand.relativeError).toBeLessThan(12);
  });

  /** n = (z/r)²; at 95% the multiplier is 1.96, so ±10% needs about 385. */
  it('inverts the relation to a required count', () => {
    expect(cellsToCount(0.1)).toBeGreaterThan(380);
    expect(cellsToCount(0.1)).toBeLessThan(390);
    // Halving the tolerance quadruples the work.
    expect(cellsToCount(0.05) / cellsToCount(0.1)).toBeCloseTo(4, 1);
    expect(() => cellsToCount(0)).toThrow(HemocytometerError);
    expect(() => cellsToCount(1)).toThrow(HemocytometerError);
  });

  it('reports an empty count without dividing by zero', () => {
    const result = countCells({ ...base, liveCount: 0 });
    expect(result.cellsPerMl).toBe(0);
    expect(result.interval.lower).toBe(0);
    expect(result.interval.upper).toBeGreaterThan(0);
    expect(result.relativeError).toBe(Infinity);
    expect(result.warnings.join(' ')).toMatch(/Nothing was counted/);
  });
});

describe('viability', () => {
  it('reports the live fraction with an interval', () => {
    const result = countCells({ ...base, liveCount: 90, deadCount: 10, dilutionFactor: 2 });
    expect(result.viability?.fraction).toBeCloseTo(0.9, 12);
    expect(result.viability!.lower).toBeLessThan(0.9);
    expect(result.viability!.upper).toBeGreaterThan(0.9);
  });

  /** Wilson does not collapse at the boundary, which is the reason for using it. */
  it('keeps a finite interval at one hundred per cent viable', () => {
    const result = countCells({ ...base, liveCount: 50, deadCount: 0, dilutionFactor: 2 });
    expect(result.viability?.fraction).toBe(1);
    expect(result.viability!.lower).toBeLessThan(1);
    expect(result.viability!.lower).toBeGreaterThan(0.9);
    expect(result.viability!.upper).toBeLessThanOrEqual(1);
  });

  it('separates live density from total density', () => {
    const result = countCells({ ...base, liveCount: 300, deadCount: 100, dilutionFactor: 1 });
    expect(result.totalCellsPerMl).toBeCloseTo((result.cellsPerMl * 400) / 300, 3);
  });

  it('is absent when no dead cells were counted', () => {
    expect(countCells({ ...base, liveCount: 400 }).viability).toBeUndefined();
  });

  it('reminds you that trypan blue is itself a dilution', () => {
    const result = countCells({ ...base, liveCount: 90, deadCount: 10, dilutionFactor: 1 });
    expect(result.warnings.join(' ')).toMatch(/one to one/);
  });
});

describe('warnings', () => {
  it('flags a thin count', () => {
    expect(countCells({ ...base, liveCount: 40 }).warnings.join(' ')).toMatch(/cells counted/);
  });

  it('flags an overcrowded chamber', () => {
    const result = countCells({ ...base, liveCount: 4000 });
    expect(result.warnings.join(' ')).toMatch(/too crowded/);
  });

  it('says nothing about either at a comfortable count', () => {
    const result = countCells({ ...base, liveCount: 600 });
    expect(result.warnings).toHaveLength(0);
  });
});

describe('input handling', () => {
  it('refuses fractional or negative counts rather than rounding', () => {
    expect(() => countCells({ ...base, liveCount: 12.5 })).toThrow(HemocytometerError);
    expect(() => countCells({ ...base, liveCount: -1 })).toThrow(HemocytometerError);
    expect(() => countCells({ ...base, liveCount: 10, deadCount: 1.5 })).toThrow(
      HemocytometerError,
    );
  });

  it('rejects impossible chamber and dilution values', () => {
    expect(() => countCells({ ...base, liveCount: 10, squares: 0 })).toThrow(HemocytometerError);
    expect(() => countCells({ ...base, liveCount: 10, squareVolumeMl: 0 })).toThrow(
      HemocytometerError,
    );
    expect(() => countCells({ ...base, liveCount: 10, dilutionFactor: 0.5 })).toThrow(
      HemocytometerError,
    );
  });
});
