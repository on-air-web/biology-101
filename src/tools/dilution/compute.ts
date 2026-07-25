/**
 * Dilution: C₁V₁ = C₂V₂.
 *
 * Canonical units throughout: mol/L and litres. Concentrations may also be
 * mass-based (mg/mL, %), and the relation holds for any pair of matching
 * units — the UI is responsible for not mixing them.
 */

export type DilutionSolveFor =
  'stockVolume' | 'finalVolume' | 'stockConcentration' | 'finalConcentration';

export interface DilutionInput {
  stockConcentration?: number;
  stockVolume?: number;
  finalConcentration?: number;
  finalVolume?: number;
}

export class DilutionInputError extends Error {}

function requirePositive(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new DilutionInputError(`${field} is required.`);
  }
  if (value <= 0) throw new DilutionInputError(`${field} must be greater than zero.`);
  return value;
}

export function solveDilution(input: DilutionInput, solveFor: DilutionSolveFor): number {
  switch (solveFor) {
    case 'stockVolume': {
      const c1 = requirePositive(input.stockConcentration, 'Stock concentration');
      const c2 = requirePositive(input.finalConcentration, 'Final concentration');
      const v2 = requirePositive(input.finalVolume, 'Final volume');
      if (c2 > c1) {
        throw new DilutionInputError(
          'The final concentration is higher than the stock. You cannot dilute up to it.',
        );
      }
      return (c2 * v2) / c1;
    }
    case 'finalVolume': {
      const c1 = requirePositive(input.stockConcentration, 'Stock concentration');
      const v1 = requirePositive(input.stockVolume, 'Stock volume');
      const c2 = requirePositive(input.finalConcentration, 'Final concentration');
      if (c2 > c1) {
        throw new DilutionInputError(
          'The final concentration is higher than the stock. You cannot dilute up to it.',
        );
      }
      return (c1 * v1) / c2;
    }
    case 'stockConcentration': {
      const v1 = requirePositive(input.stockVolume, 'Stock volume');
      const c2 = requirePositive(input.finalConcentration, 'Final concentration');
      const v2 = requirePositive(input.finalVolume, 'Final volume');
      return (c2 * v2) / v1;
    }
    case 'finalConcentration': {
      const c1 = requirePositive(input.stockConcentration, 'Stock concentration');
      const v1 = requirePositive(input.stockVolume, 'Stock volume');
      const v2 = requirePositive(input.finalVolume, 'Final volume');
      if (v1 > v2) {
        throw new DilutionInputError('The stock volume is larger than the final volume.');
      }
      return (c1 * v1) / v2;
    }
  }
}

/** Dilution factor, the "1 in N" a protocol usually states. */
export function dilutionFactor(stockConcentration: number, finalConcentration: number): number {
  return stockConcentration / finalConcentration;
}
