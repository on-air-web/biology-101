/**
 * Pure computation for the molarity tool.
 *
 * No React, no framework, no DOM. Everything here is a plain function over
 * plain values so it can be unit-tested against reference figures, moved into
 * a Web Worker, or exposed through a public API without change.
 *
 * Canonical units inside the compute layer: grams, litres, mol/L.
 * Unit parsing belongs at the UI edge, never in here.
 */

export type MolaritySolveFor = 'mass' | 'concentration' | 'volume';

export interface MolarityInput {
  /** Molar mass of the compound, g/mol. */
  molarMass: number;
  /** Grams of solute. Required unless solving for mass. */
  mass?: number;
  /** Concentration in mol/L. Required unless solving for concentration. */
  concentration?: number;
  /** Volume in litres. Required unless solving for volume. */
  volume?: number;
}

export class MolarityInputError extends Error {}

function requirePositive(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new MolarityInputError(`${field} is required.`);
  }
  if (value <= 0) {
    throw new MolarityInputError(`${field} must be greater than zero.`);
  }
  return value;
}

/**
 * Solves n = m / M and c = n / V for the requested quantity.
 * Returns the value in the canonical unit for that quantity.
 */
export function solveMolarity(input: MolarityInput, solveFor: MolaritySolveFor): number {
  const molarMass = requirePositive(input.molarMass, 'Molar mass');

  switch (solveFor) {
    case 'mass': {
      const concentration = requirePositive(input.concentration, 'Concentration');
      const volume = requirePositive(input.volume, 'Volume');
      return concentration * volume * molarMass;
    }
    case 'concentration': {
      const mass = requirePositive(input.mass, 'Mass');
      const volume = requirePositive(input.volume, 'Volume');
      return mass / molarMass / volume;
    }
    case 'volume': {
      const mass = requirePositive(input.mass, 'Mass');
      const concentration = requirePositive(input.concentration, 'Concentration');
      return mass / molarMass / concentration;
    }
  }
}
