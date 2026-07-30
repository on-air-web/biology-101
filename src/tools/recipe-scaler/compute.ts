/**
 * Scaling a recipe up or down.
 *
 * The unitary method, applied to a batch: if 230 µL of something goes into
 * 10 mL of medium, then 25 mL needs 575 µL. Every component scales by the same
 * factor, and the final concentration comes out unchanged because it is a
 * ratio and the ratio is what is being preserved.
 *
 * The concentration is deliberately not part of the arithmetic. It cancels —
 * scaling works whether or not you know it. Where it is supplied it is used
 * only to report what the stock concentration must be, which is a useful check
 * on a bottle whose label has worn off, and to state the answer in the terms
 * the protocol was written in.
 *
 * Canonical units: litres for volumes, grams for masses.
 */

export class ScaleError extends Error {}

/** Under this, a pipetted volume is mostly instrument error. */
export const MIN_PRACTICAL_LITRES = 1e-6;

export type ComponentKind = 'volume' | 'mass';

export interface Component {
  /** Stable key for React and for reporting. */
  id: string;
  name: string;
  kind: ComponentKind;
  /** Litres for a volume, grams for a mass. */
  amount: number;
}

export interface ScaledComponent extends Component {
  scaled: number;
  /** Fraction of the target batch this component occupies, volumes only. */
  fractionOfBatch?: number;
}

export interface ScaleInput {
  /** Batch the recipe is written for, litres. */
  referenceBatch: number;
  /** Batch you want to make, litres. */
  targetBatch: number;
  components: readonly Component[];
}

export interface ScaleResult {
  factor: number;
  components: ScaledComponent[];
  /** Sum of the scaled volume components, litres. */
  addedVolume: number;
  /**
   * Medium or diluent to make the batch up to volume, litres. Negative would
   * mean the components alone overflow the batch, which is reported as a
   * warning rather than a negative number.
   */
  diluent: number;
  warnings: string[];
}

function requirePositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ScaleError(`${field} must be greater than zero.`);
  }
  return value;
}

export function scaleRecipe(input: ScaleInput): ScaleResult {
  const referenceBatch = requirePositive(
    input.referenceBatch,
    'The batch the recipe is written for',
  );
  const targetBatch = requirePositive(input.targetBatch, 'The batch you want to make');

  if (input.components.length === 0) {
    throw new ScaleError('Add at least one component to scale.');
  }
  for (const component of input.components) {
    if (!Number.isFinite(component.amount) || component.amount < 0) {
      throw new ScaleError(`${component.name || 'A component'} must be zero or more.`);
    }
  }

  const factor = targetBatch / referenceBatch;

  const components: ScaledComponent[] = input.components.map((component) => ({
    ...component,
    scaled: component.amount * factor,
    fractionOfBatch:
      component.kind === 'volume' ? (component.amount * factor) / targetBatch : undefined,
  }));

  const addedVolume = components
    .filter((component) => component.kind === 'volume')
    .reduce((total, component) => total + component.scaled, 0);

  const warnings: string[] = [];

  if (addedVolume > targetBatch) {
    warnings.push(
      `The components alone come to more than the batch volume, so there is no room for medium. Check that the recipe is written for ${formatLitres(referenceBatch)} and not for a different batch.`,
    );
  } else if (addedVolume > targetBatch * 0.9) {
    warnings.push(
      'The components take up more than nine tenths of the batch, which leaves very little medium. That is unusual and worth checking.',
    );
  }

  const tiny = components.filter(
    (component) =>
      component.kind === 'volume' &&
      component.scaled > 0 &&
      component.scaled < MIN_PRACTICAL_LITRES,
  );
  if (tiny.length > 0) {
    warnings.push(
      `${tiny.map((component) => component.name || 'One component').join(', ')} scales to under a microlitre, which is below what a pipette measures reliably. Make an intermediate dilution and take a larger volume of that.`,
    );
  }

  return {
    factor,
    components,
    addedVolume,
    diluent: Math.max(0, targetBatch - addedVolume),
    warnings,
  };
}

function formatLitres(litres: number): string {
  if (litres >= 1) return `${litres} L`;
  if (litres >= 1e-3) return `${litres * 1e3} mL`;
  return `${litres * 1e6} µL`;
}

/**
 * Concentration the stock must be for a known volume of it to reach a known
 * final concentration in a known batch.
 *
 * C_stock · V_stock = C_final · V_batch, rearranged. Useful as a sanity check
 * on a recipe someone inherited: if it implies a stock of 400 mg/mL for
 * something that is not soluble past 50, the recipe has been mistranscribed.
 */
export function impliedStockConcentration(
  componentVolume: number,
  batchVolume: number,
  finalConcentration: number,
): number {
  requirePositive(componentVolume, 'The component volume');
  requirePositive(batchVolume, 'The batch volume');
  if (!Number.isFinite(finalConcentration) || finalConcentration <= 0) {
    throw new ScaleError('The final concentration must be greater than zero.');
  }
  return (finalConcentration * batchVolume) / componentVolume;
}
