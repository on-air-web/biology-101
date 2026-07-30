/**
 * Units.
 *
 * The compute layer works only in canonical units (grams, litres, moles,
 * mol/L). This module is the translation boundary at the UI edge, and it is
 * deliberately the only place SI prefixes are understood.
 *
 * Keeping prefixes out of `compute.ts` is what stops the classic calculator
 * bug where a value is scaled twice, or not at all, on one code path.
 */

/**
 * `concentration` is amount per volume (molar); `mass-concentration` is mass
 * per volume (mg/mL and friends). They are deliberately separate dimensions
 * because converting between them needs a molar mass, and a units module that
 * silently bridged them would be inventing one.
 */
export type Dimension =
  'mass' | 'volume' | 'amount' | 'concentration' | 'mass-concentration' | 'length';

export interface Unit {
  id: string;
  /** Symbol as it should appear in the interface. */
  label: string;
  dimension: Dimension;
  /** Multiply by this to reach the canonical unit for the dimension. */
  factor: number;
  /**
   * Offered in a selector but never chosen to display a computed result.
   *
   * For units that are a different notation rather than another step on the
   * prefix ladder. Per cent weight per volume is the case: it is ten times
   * mg/mL, so autoScale would reach for it above 10 g/L and report a protein
   * stock as "5.8 % (w/v)" — arithmetically right and not what anybody wants
   * to read.
   */
  displayOnRequestOnly?: boolean;
}

export const CANONICAL_UNIT: Record<Dimension, string> = {
  mass: 'g',
  volume: 'L',
  amount: 'mol',
  concentration: 'M',
  'mass-concentration': 'g/L',
  length: 'm',
};

const UNIT_LIST: readonly Unit[] = [
  { id: 'ng', label: 'ng', dimension: 'mass', factor: 1e-9 },
  { id: 'ug', label: 'µg', dimension: 'mass', factor: 1e-6 },
  { id: 'mg', label: 'mg', dimension: 'mass', factor: 1e-3 },
  { id: 'g', label: 'g', dimension: 'mass', factor: 1 },
  { id: 'kg', label: 'kg', dimension: 'mass', factor: 1e3 },

  { id: 'nL', label: 'nL', dimension: 'volume', factor: 1e-9 },
  { id: 'uL', label: 'µL', dimension: 'volume', factor: 1e-6 },
  { id: 'mL', label: 'mL', dimension: 'volume', factor: 1e-3 },
  { id: 'L', label: 'L', dimension: 'volume', factor: 1 },

  { id: 'nmol', label: 'nmol', dimension: 'amount', factor: 1e-9 },
  { id: 'umol', label: 'µmol', dimension: 'amount', factor: 1e-6 },
  { id: 'mmol', label: 'mmol', dimension: 'amount', factor: 1e-3 },
  { id: 'mol', label: 'mol', dimension: 'amount', factor: 1 },

  { id: 'nM', label: 'nM', dimension: 'concentration', factor: 1e-9 },
  { id: 'uM', label: 'µM', dimension: 'concentration', factor: 1e-6 },
  { id: 'mM', label: 'mM', dimension: 'concentration', factor: 1e-3 },
  { id: 'M', label: 'M', dimension: 'concentration', factor: 1 },

  /**
   * Mass per volume, canonically g/L.
   *
   * Several of these are numerically identical — ng/µL is µg/mL, and µg/µL is
   * mg/mL — and both spellings are kept because both are what people write:
   * a NanoDrop reports ng/µL, a protein stock is labelled mg/mL. Where two
   * share a factor the "per mL" form is listed last, because autoScale reads
   * from the largest unit down and returns the last match, so that is the one
   * a computed result is displayed in.
   */
  { id: 'ng_mL', label: 'ng/mL', dimension: 'mass-concentration', factor: 1e-6 },
  { id: 'ng_uL', label: 'ng/µL', dimension: 'mass-concentration', factor: 1e-3 },
  { id: 'ug_mL', label: 'µg/mL', dimension: 'mass-concentration', factor: 1e-3 },
  { id: 'ug_uL', label: 'µg/µL', dimension: 'mass-concentration', factor: 1 },
  { id: 'mg_mL', label: 'mg/mL', dimension: 'mass-concentration', factor: 1 },
  // Percent weight per volume: 1% is 1 g in 100 mL, so 10 g/L. Selectable,
  // but never auto-chosen — see displayOnRequestOnly.
  {
    id: 'pct_wv',
    label: '% (w/v)',
    dimension: 'mass-concentration',
    factor: 10,
    displayOnRequestOnly: true,
  },

  { id: 'nm', label: 'nm', dimension: 'length', factor: 1e-9 },
  { id: 'um', label: 'µm', dimension: 'length', factor: 1e-6 },
  { id: 'mm', label: 'mm', dimension: 'length', factor: 1e-3 },
  { id: 'cm', label: 'cm', dimension: 'length', factor: 1e-2 },
  { id: 'm', label: 'm', dimension: 'length', factor: 1 },
] as const;

const BY_ID = new Map(UNIT_LIST.map((unit) => [unit.id, unit]));

export function getUnit(unitId: string): Unit {
  const unit = BY_ID.get(unitId);
  if (!unit) throw new Error(`Unknown unit: ${unitId}`);
  return unit;
}

/** Ordered smallest to largest, for populating a unit selector. */
export function unitsFor(dimension: Dimension): Unit[] {
  return UNIT_LIST.filter((unit) => unit.dimension === dimension);
}

export function toCanonical(value: number, unitId: string): number {
  return value * getUnit(unitId).factor;
}

export function fromCanonical(value: number, unitId: string): number {
  return value / getUnit(unitId).factor;
}

/**
 * Chooses the unit a scientist would actually write the value in — the one
 * that keeps the number between 1 and 1000.
 *
 * Nobody writes 0.0000058 mol; they write 5.8 µmol. Showing the former is how
 * a calculator loses a user's trust in one glance.
 */
export function autoScale(
  canonicalValue: number,
  dimension: Dimension,
): { value: number; unit: Unit } {
  const candidates = unitsFor(dimension).filter((unit) => !unit.displayOnRequestOnly);
  const fallback = candidates.find((unit) => unit.factor === 1) ?? candidates[0];
  if (!fallback) throw new Error(`No units defined for dimension: ${dimension}`);

  if (canonicalValue === 0 || !Number.isFinite(canonicalValue)) {
    return { value: canonicalValue, unit: fallback };
  }

  const magnitude = Math.abs(canonicalValue);

  // Largest unit that still leaves the displayed number at or above 1.
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const unit = candidates[index];
    if (unit && magnitude / unit.factor >= 1) {
      return { value: canonicalValue / unit.factor, unit };
    }
  }

  // Smaller than the smallest prefix we carry: use it anyway rather than
  // silently switching dimension.
  const smallest = candidates[0] ?? fallback;
  return { value: canonicalValue / smallest.factor, unit: smallest };
}
