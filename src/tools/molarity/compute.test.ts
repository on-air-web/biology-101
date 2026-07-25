import { describe, expect, it } from 'vitest';
import { MolarityInputError, solveMolarity } from './compute';

/**
 * Reference case: sodium chloride, M = 58.44 g/mol.
 * 1 L of 1 M NaCl requires 58.44 g — the figure every bench scientist knows
 * by heart, which makes it a good canary.
 */
const NACL = 58.44;

describe('solveMolarity', () => {
  it('computes mass for a known reference solution', () => {
    expect(solveMolarity({ molarMass: NACL, concentration: 1, volume: 1 }, 'mass')).toBeCloseTo(
      58.44,
      4,
    );
  });

  it('computes mass for a sub-litre volume', () => {
    // 500 mL of 0.15 M NaCl (physiological saline) -> 4.383 g
    expect(
      solveMolarity({ molarMass: NACL, concentration: 0.15, volume: 0.5 }, 'mass'),
    ).toBeCloseTo(4.383, 3);
  });

  it('computes concentration from mass and volume', () => {
    expect(solveMolarity({ molarMass: NACL, mass: 58.44, volume: 2 }, 'concentration')).toBeCloseTo(
      0.5,
      6,
    );
  });

  it('computes volume from mass and concentration', () => {
    expect(
      solveMolarity({ molarMass: NACL, mass: 5.844, concentration: 0.1 }, 'volume'),
    ).toBeCloseTo(1, 6);
  });

  it('round-trips between quantities', () => {
    const mass = solveMolarity({ molarMass: 180.16, concentration: 0.25, volume: 0.25 }, 'mass');
    const concentration = solveMolarity({ molarMass: 180.16, mass, volume: 0.25 }, 'concentration');
    expect(concentration).toBeCloseTo(0.25, 10);
  });

  it('rejects missing inputs', () => {
    expect(() => solveMolarity({ molarMass: NACL, volume: 1 }, 'mass')).toThrow(MolarityInputError);
  });

  it('rejects non-physical inputs', () => {
    expect(() => solveMolarity({ molarMass: NACL, concentration: 0, volume: 1 }, 'mass')).toThrow(
      MolarityInputError,
    );
    expect(() => solveMolarity({ molarMass: -1, concentration: 1, volume: 1 }, 'mass')).toThrow(
      MolarityInputError,
    );
  });
});
