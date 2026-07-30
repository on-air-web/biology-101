/**
 * Antibiotic stocks and working dilutions.
 *
 * Two questions, both trivial arithmetic and both routinely got wrong at the
 * bench because the units differ by a thousand: stocks are labelled in mg/mL
 * and working concentrations quoted in µg/mL, so a factor of 1000 sits between
 * the two numbers you are holding.
 *
 * The reference concentrations below are the usual ones for selecting
 * plasmids in E. coli. They are starting values, not specifications — a
 * low-copy plasmid, a rich medium or a different organism all change them, and
 * every field is editable.
 *
 * Canonical units: g/L for concentration, litres for volume, grams for mass.
 */

export class AntibioticError extends Error {}

export interface Antibiotic {
  id: string;
  name: string;
  /** Usual working concentration for E. coli selection, g/L. */
  working: number;
  /** Usual stock concentration, g/L. */
  stock: number;
  solvent: string;
  note: string;
}

/** 1 mg/mL is 1 g/L, so these read across directly. */
export const ANTIBIOTICS: readonly Antibiotic[] = [
  {
    id: 'ampicillin',
    name: 'Ampicillin',
    working: 0.1,
    stock: 100,
    solvent: 'Water',
    note: 'Degraded by β-lactamase secreted into the plate, so satellite colonies appear around a resistant one on older plates. Carbenicillin is the more stable substitute.',
  },
  {
    id: 'carbenicillin',
    name: 'Carbenicillin',
    working: 0.1,
    stock: 100,
    solvent: 'Water',
    note: 'Same resistance gene as ampicillin but more stable, so fewer satellite colonies.',
  },
  {
    id: 'kanamycin',
    name: 'Kanamycin',
    working: 0.05,
    stock: 50,
    solvent: 'Water',
    note: 'Stable and reliable. Selection is weaker in very rich medium.',
  },
  {
    id: 'chloramphenicol',
    name: 'Chloramphenicol',
    working: 0.034,
    stock: 34,
    solvent: 'Ethanol',
    note: 'Dissolved in ethanol, so add it to molten agar that has cooled, and keep the volume small relative to the medium.',
  },
  {
    id: 'tetracycline',
    name: 'Tetracycline',
    working: 0.01,
    stock: 10,
    solvent: 'Ethanol',
    note: 'Light sensitive and chelated by magnesium. Store in the dark and expect plates to lose potency within weeks.',
  },
  {
    id: 'streptomycin',
    name: 'Streptomycin',
    working: 0.05,
    stock: 50,
    solvent: 'Water',
    note: 'Resistance can also arise by spontaneous ribosomal mutation, so a resistant colony is not proof of transformation.',
  },
  {
    id: 'spectinomycin',
    name: 'Spectinomycin',
    working: 0.05,
    stock: 50,
    solvent: 'Water',
    note: 'Often used where kanamycin resistance is already occupied.',
  },
  {
    id: 'gentamicin',
    name: 'Gentamicin',
    working: 0.01,
    stock: 10,
    solvent: 'Water',
    note: 'Common in mammalian culture as well as bacterial selection.',
  },
] as const;

export function getAntibiotic(id: string): Antibiotic | undefined {
  return ANTIBIOTICS.find((entry) => entry.id === id);
}

/** Under this, the dose is mostly pipette error. */
export const MIN_PRACTICAL_LITRES = 2e-6;

export interface DoseInput {
  /** Concentration of the stock in hand, g/L. */
  stockConcentration: number;
  /** Concentration wanted in the culture, g/L. */
  workingConcentration: number;
  /** Volume of medium being treated, litres. */
  cultureVolume: number;
}

export interface DoseResult {
  /** Stock to add, litres. */
  volumeToAdd: number;
  /** How many fold the stock is diluted into the culture. */
  foldDilution: number;
  /** Mass of antibiotic delivered, grams. */
  massDelivered: number;
  warnings: string[];
}

function requirePositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AntibioticError(`${field} must be greater than zero.`);
  }
  return value;
}

export function doseCulture(input: DoseInput): DoseResult {
  const stockConcentration = requirePositive(input.stockConcentration, 'The stock concentration');
  const workingConcentration = requirePositive(
    input.workingConcentration,
    'The working concentration',
  );
  const cultureVolume = requirePositive(input.cultureVolume, 'The culture volume');

  if (workingConcentration > stockConcentration) {
    throw new AntibioticError(
      'The working concentration is higher than the stock, so no amount of stock will reach it. Check that one is not in mg/mL while the other is in µg/mL.',
    );
  }

  const volumeToAdd = (workingConcentration * cultureVolume) / stockConcentration;
  const warnings: string[] = [];

  if (volumeToAdd < MIN_PRACTICAL_LITRES) {
    warnings.push(
      `Only ${(volumeToAdd * 1e6).toFixed(2)} µL of stock is needed, which is at the limit of what a pipette delivers accurately. Dilute the stock tenfold and add ten times as much, or treat a larger volume of medium.`,
    );
  }

  if (volumeToAdd > cultureVolume * 0.05) {
    warnings.push(
      'The stock makes up more than a twentieth of the final volume, which dilutes the medium noticeably. A more concentrated stock would be better, and if the solvent is ethanol this much of it will affect growth.',
    );
  }

  return {
    volumeToAdd,
    foldDilution: stockConcentration / workingConcentration,
    massDelivered: workingConcentration * cultureVolume,
    warnings,
  };
}

/** Mass to weigh out to make a stock of a given concentration and volume. */
export function massForStock(concentration: number, volume: number): number {
  requirePositive(concentration, 'The stock concentration');
  requirePositive(volume, 'The stock volume');
  return concentration * volume;
}
