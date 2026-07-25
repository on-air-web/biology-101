/**
 * Serial dilution.
 *
 * Produces the full plan: what to transfer at each step, how much diluent to
 * pre-load, and the concentration you end up with. Canonical units are mol/L
 * and litres, but the arithmetic is unit-agnostic as long as the caller is
 * consistent.
 */

export interface SerialDilutionInput {
  /** Concentration of the starting stock. */
  stockConcentration: number;
  /** Fold dilution at each step: 10 for a ten-fold series. */
  foldPerStep: number;
  /** Number of dilution steps after the stock. */
  steps: number;
  /** Volume present in each tube after mixing. */
  volumePerStep: number;
}

export interface SerialDilutionStep {
  /** 0 is the undiluted stock. */
  index: number;
  concentration: number;
  /** Cumulative dilution relative to the stock, as the N in "1 in N". */
  cumulativeFold: number;
  /** Volume carried over from the previous tube. Undefined for the stock. */
  transferVolume?: number;
  /** Diluent to pre-load in this tube. Undefined for the stock. */
  diluentVolume?: number;
}

export class SerialDilutionError extends Error {}

const MAX_STEPS = 24;

export function planSerialDilution(input: SerialDilutionInput): SerialDilutionStep[] {
  const { stockConcentration, foldPerStep, steps, volumePerStep } = input;

  if (!Number.isFinite(stockConcentration) || stockConcentration <= 0) {
    throw new SerialDilutionError('Stock concentration must be greater than zero.');
  }
  if (!Number.isFinite(foldPerStep) || foldPerStep <= 1) {
    throw new SerialDilutionError('The dilution factor must be greater than 1.');
  }
  if (!Number.isInteger(steps) || steps < 1) {
    throw new SerialDilutionError('Enter at least one dilution step.');
  }
  if (steps > MAX_STEPS) {
    throw new SerialDilutionError(`More than ${MAX_STEPS} steps is beyond a single plate.`);
  }
  if (!Number.isFinite(volumePerStep) || volumePerStep <= 0) {
    throw new SerialDilutionError('Volume per tube must be greater than zero.');
  }

  const transferVolume = volumePerStep / foldPerStep;
  const plan: SerialDilutionStep[] = [
    { index: 0, concentration: stockConcentration, cumulativeFold: 1 },
  ];

  for (let step = 1; step <= steps; step += 1) {
    const cumulativeFold = foldPerStep ** step;
    plan.push({
      index: step,
      concentration: stockConcentration / cumulativeFold,
      cumulativeFold,
      transferVolume,
      diluentVolume: volumePerStep - transferVolume,
    });
  }

  return plan;
}

/**
 * Warns when the carry-over volume is below what a normal pipette handles
 * accurately. A plan that is arithmetically perfect and physically
 * unpipettable is still a bad plan.
 */
export const MIN_RELIABLE_TRANSFER_LITRES = 2e-6;
