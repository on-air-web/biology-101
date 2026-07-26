/**
 * Cells per millilitre at OD600 = 1.0, in a 1 cm path.
 *
 * These are nominal figures, and the interface presents them as a starting
 * value in an editable field rather than as a constant. Three reasons they
 * cannot be treated as one:
 *
 *   1. OD600 measures scattering, not absorption. How much scattered light
 *      reaches the detector depends on the instrument's geometry, so two
 *      spectrophotometers legitimately disagree on the same tube.
 *   2. The factor moves with cell size, and cell size moves with growth rate.
 *      A culture doubling every 20 minutes has visibly larger cells than the
 *      same strain doubling every 60, so fewer of them make up an OD unit.
 *   3. Strain and morphology matter — filamentous or flocculent growth breaks
 *      the relation entirely.
 *
 * The published spread is quoted alongside each entry rather than hidden,
 * because it is the honest measure of how much weight the number carries. Work
 * that depends on the absolute count should be calibrated against plate counts
 * or a haemocytometer on the instrument actually being used.
 *
 * Only organisms with a well-established figure are listed. A longer table
 * would be more impressive and less true; anything else goes in via Custom.
 */

export interface OrganismCalibration {
  id: string;
  name: string;
  /** Cells per mL at OD600 = 1.0, 1 cm path. */
  cellsPerMlPerOd: number;
  /** Range commonly reported across strains, instruments and growth phases. */
  range: readonly [number, number];
  note: string;
}

export const ORGANISMS: readonly OrganismCalibration[] = [
  {
    id: 'e-coli',
    name: 'Escherichia coli',
    cellsPerMlPerOd: 8e8,
    range: [2e8, 2e9],
    note: 'The 8 × 10⁸ figure assumes exponential growth in rich medium on a 1 cm benchtop spectrophotometer. Slow-growing cells are smaller, so the same OD represents more of them.',
  },
  {
    id: 's-cerevisiae',
    name: 'Saccharomyces cerevisiae',
    cellsPerMlPerOd: 3e7,
    range: [1e7, 5e7],
    note: 'Yeast cells scatter far more light per cell than bacteria, so an OD unit is worth roughly thirty times fewer cells. Budding and flocculation both shift the figure.',
  },
] as const;

export function getOrganism(id: string): OrganismCalibration | undefined {
  return ORGANISMS.find((organism) => organism.id === id);
}
