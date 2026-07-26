import { describe, expect, it } from 'vitest';
import {
  LINEAR_LIMIT_OD_PER_CM,
  Od600Error,
  diluteCulture,
  readCulture,
  wellPathLength,
} from './compute';
import { ORGANISMS } from './organisms';

const CUVETTE = 0.01; // one centimetre, in metres

const base = {
  dilutionFactor: 1,
  pathLength: CUVETTE,
  cellsPerMlPerOd: 8e8,
  instrument: 'cuvette' as const,
};

describe('cell density', () => {
  /** 0.4 × 8e8. Hand-checkable: the path is 1 cm and nothing is diluted. */
  it('multiplies a neat cuvette reading by the calibration factor', () => {
    const result = readCulture({ ...base, measuredOd: 0.4 });
    expect(result.cultureOd).toBeCloseTo(0.4, 12);
    expect(result.cellsPerMl).toBeCloseTo(3.2e8, 2);
  });

  /** 0.25 × 10 = 2.5 OD; 2.5 × 8e8 = 2e9. Both exact by hand. */
  it('undoes the dilution made before reading', () => {
    const result = readCulture({ ...base, measuredOd: 0.25, dilutionFactor: 10 });
    expect(result.cultureOd).toBeCloseTo(2.5, 12);
    expect(result.cellsPerMl).toBeCloseTo(2e9, 2);
  });

  /** 3.2e8 cells/mL in 50 mL is 1.6e10 cells. */
  it('scales to a whole culture when a volume is given', () => {
    const result = readCulture({ ...base, measuredOd: 0.4, cultureVolume: 0.05 });
    expect(result.totalCells).toBeCloseTo(1.6e10, 0);
  });

  it('leaves the total undefined when no volume is given', () => {
    expect(readCulture({ ...base, measuredOd: 0.4 }).totalCells).toBeUndefined();
  });

  it('reads zero as zero rather than failing', () => {
    const result = readCulture({ ...base, measuredOd: 0 });
    expect(result.cellsPerMl).toBe(0);
  });
});

describe('path length', () => {
  /**
   * Exact by construction: a well of diameter 2/√π metres has a cross-section
   * of exactly 1 m², so the depth in metres equals the volume in cubic metres.
   * One cubic metre is 1000 litres, so the answer must be exactly 1 m.
   */
  it('is volume over cross-section', () => {
    expect(wellPathLength(1000, 2 / Math.sqrt(Math.PI))).toBeCloseTo(1, 12);
  });

  it('is linear in volume and inverse-square in diameter', () => {
    expect(wellPathLength(4e-4, 6.4e-3)).toBeCloseTo(wellPathLength(2e-4, 6.4e-3) * 2, 12);
    expect(wellPathLength(2e-4, 12.8e-3)).toBeCloseTo(wellPathLength(2e-4, 6.4e-3) / 4, 12);
  });

  /**
   * Cross-check against the figure quoted for real instruments. 200 µL in a
   * 96-well is widely given as roughly 0.58 cm measured; the cylinder model
   * gives about 0.62 cm because it ignores the meniscus. The bracket is wide
   * enough to admit both — the point is that the geometry lands in the right
   * place, not that it replaces a measured correction.
   */
  it('puts a standard 96-well fill near six millimetres', () => {
    const metres = wellPathLength(2e-4, 6.4e-3);
    expect(metres * 100).toBeGreaterThan(0.55);
    expect(metres * 100).toBeLessThan(0.7);
  });

  it('corrects a plate reading back to a 1 cm basis', () => {
    const pathLength = wellPathLength(2e-4, 6.4e-3);
    const result = readCulture({
      ...base,
      measuredOd: 0.3,
      pathLength,
      instrument: 'plate',
    });
    // A short path reads low, so the corrected density must exceed the reading.
    expect(result.cultureOd).toBeGreaterThan(0.3);
    expect(result.cultureOd).toBeCloseTo(0.3 / (pathLength * 100), 12);
  });

  it('rejects impossible well geometry', () => {
    expect(() => wellPathLength(0, 6.4e-3)).toThrow(Od600Error);
    expect(() => wellPathLength(2e-4, 0)).toThrow(Od600Error);
  });
});

describe('linearity ceiling', () => {
  /**
   * The whole point of the tool. The ceiling applies to what the beam saw, so
   * a dense culture read on a dilution is fine and a neat dense reading is not.
   */
  it('stays quiet when a dense culture was diluted before reading', () => {
    const result = readCulture({ ...base, measuredOd: 0.24, dilutionFactor: 10 });
    expect(result.cultureOd).toBeCloseTo(2.4, 12);
    expect(result.warnings.join(' ')).not.toMatch(/linear ceiling/);
  });

  it('warns when the instrument itself was over the ceiling', () => {
    const result = readCulture({ ...base, measuredOd: 0.9 });
    expect(result.warnings.join(' ')).toMatch(/linear ceiling/);
  });

  it('warns on a plate reading only once corrected past the ceiling', () => {
    const pathLength = wellPathLength(2e-4, 6.4e-3);
    // 0.3 in a ~0.62 cm well is ~0.48 per cm: over the ceiling despite looking safe.
    const over = readCulture({ ...base, measuredOd: 0.3, pathLength, instrument: 'plate' });
    expect(over.odPerCmInBeam).toBeGreaterThan(LINEAR_LIMIT_OD_PER_CM);
    expect(over.warnings.join(' ')).toMatch(/linear ceiling/);
  });

  it('flags a reading lost in the blank', () => {
    const result = readCulture({ ...base, measuredOd: 0.01 });
    expect(result.warnings.join(' ')).toMatch(/close to the blank/);
  });

  it('does not call a zero reading noisy', () => {
    expect(readCulture({ ...base, measuredOd: 0 }).warnings.join(' ')).not.toMatch(/blank/);
  });

  it('always notes that a plate reader is a different instrument', () => {
    const result = readCulture({ ...base, measuredOd: 0.2, instrument: 'plate' });
    expect(result.warnings.join(' ')).toMatch(/different geometry/);
  });
});

describe('diluting to a target density', () => {
  /** 0.05 × 200 mL ÷ 2.0 = 5 mL of culture, so 195 mL of medium, 40-fold. */
  it('solves C1V1 = C2V2 on optical density', () => {
    const result = diluteCulture({ currentOd: 2, targetOd: 0.05, targetVolume: 0.2 });
    expect(result.cultureVolume).toBeCloseTo(0.005, 12);
    expect(result.mediumVolume).toBeCloseTo(0.195, 12);
    expect(result.foldDilution).toBeCloseTo(40, 12);
  });

  it('conserves the final volume', () => {
    const result = diluteCulture({ currentOd: 3.4, targetOd: 0.1, targetVolume: 1 });
    expect(result.cultureVolume + result.mediumVolume).toBeCloseTo(1, 12);
  });

  it('refuses to dilute up to a denser target rather than returning a negative', () => {
    expect(() => diluteCulture({ currentOd: 0.2, targetOd: 0.5, targetVolume: 0.1 })).toThrow(
      Od600Error,
    );
  });

  it('rejects non-positive inputs', () => {
    expect(() => diluteCulture({ currentOd: 0, targetOd: 0.1, targetVolume: 1 })).toThrow(
      Od600Error,
    );
    expect(() => diluteCulture({ currentOd: 1, targetOd: 0.1, targetVolume: 0 })).toThrow(
      Od600Error,
    );
  });
});

describe('input handling', () => {
  it('refuses a dilution factor below one', () => {
    // 0.1 would mean the sample was concentrated, which no protocol does here.
    expect(() => readCulture({ ...base, measuredOd: 0.3, dilutionFactor: 0.1 })).toThrow(
      Od600Error,
    );
  });

  it('rejects negative readings and impossible calibration', () => {
    expect(() => readCulture({ ...base, measuredOd: -0.1 })).toThrow(Od600Error);
    expect(() => readCulture({ ...base, measuredOd: 0.3, cellsPerMlPerOd: 0 })).toThrow(Od600Error);
    expect(() => readCulture({ ...base, measuredOd: 0.3, pathLength: 0 })).toThrow(Od600Error);
    expect(() => readCulture({ ...base, measuredOd: 0.3, cultureVolume: 0 })).toThrow(Od600Error);
  });
});

describe('reference data', () => {
  it('brackets every calibration factor with its reported range', () => {
    for (const organism of ORGANISMS) {
      const [low, high] = organism.range;
      expect(low, organism.id).toBeLessThan(high);
      expect(organism.cellsPerMlPerOd, organism.id).toBeGreaterThanOrEqual(low);
      expect(organism.cellsPerMlPerOd, organism.id).toBeLessThanOrEqual(high);
    }
  });

  it('has unique organism ids', () => {
    const ids = ORGANISMS.map((organism) => organism.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
