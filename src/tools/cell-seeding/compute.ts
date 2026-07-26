/**
 * Cell seeding.
 *
 * Two routes, because they are genuinely different jobs at the bench:
 *
 *   master  — dilute the suspension to the seeding density in one bulk volume,
 *             then dispense an equal volume into every well. This is how a
 *             plate actually gets seeded, and it is why wells come out even.
 *   direct  — add a measured volume of suspension to each vessel, then top up
 *             with medium. Sensible for a handful of flasks, and a way to
 *             pipetting error across a 96-well plate.
 *
 * The failure this tool is built to catch is a volume that cannot be pipetted.
 * A dense suspension seeded sparsely can work out at under a microlitre per
 * well, where the error on the pipette is a large fraction of the dose and
 * every well gets a different number of cells. The answer is an intermediate
 * dilution, and nothing tells you that unless it does the division.
 *
 * Canonical units: millilitres, square centimetres, cells per millilitre.
 * Areas stay in cm² rather than m² because seeding densities are published in
 * cells/cm² universally, and converting at the boundary would put a factor of
 * 10⁴ between this code and every protocol it implements.
 */

export class SeedingError extends Error {}

export type SeedingRoute = 'master' | 'direct';
export type TargetBasis = 'per-area' | 'per-vessel';

/** Under this, the dose is comparable to the error on the pipette. */
export const MIN_PRACTICAL_ML = 0.005;

export interface SeedingInput {
  /** Cells per mL in the suspension you have. */
  stockCellsPerMl: number;
  /** Seeding density, read as cells/cm² or cells per vessel. */
  target: number;
  targetBasis: TargetBasis;
  growthAreaCm2: number;
  /** Medium per well or flask at the end, mL. */
  workingVolumeMl: number;
  /** How many wells or flasks to seed. */
  vessels: number;
  /** Fraction extra to prepare, e.g. 0.1 for 10%. */
  overage: number;
  route: SeedingRoute;
}

export interface SeedingResult {
  cellsPerVessel: number;
  cellsPerCm2: number;
  /** Density of the master mix, or of each vessel once made up. */
  seedingCellsPerMl: number;
  /** Suspension to take, mL: per vessel on the direct route, in total on master. */
  suspensionVolumeMl: number;
  /** Medium to add, mL, on the same basis as suspensionVolumeMl. */
  mediumVolumeMl: number;
  /** Total volume prepared, including overage, mL. */
  totalVolumeMl: number;
  totalCells: number;
  /** Vessels-worth actually prepared, counting overage. */
  effectiveVessels: number;
  warnings: string[];
}

function requirePositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SeedingError(`${field} must be greater than zero.`);
  }
  return value;
}

export function planSeeding(input: SeedingInput): SeedingResult {
  const { targetBasis, route, overage } = input;

  const stockCellsPerMl = requirePositive(input.stockCellsPerMl, 'The suspension density');
  const target = requirePositive(input.target, 'The seeding density');
  const growthAreaCm2 = requirePositive(input.growthAreaCm2, 'The growth area');
  const workingVolumeMl = requirePositive(input.workingVolumeMl, 'The working volume');
  const vessels = requirePositive(input.vessels, 'The number of vessels');

  if (!Number.isFinite(overage) || overage < 0 || overage > 1) {
    throw new SeedingError('Overage must lie between 0 and 100 per cent.');
  }

  const cellsPerVessel = targetBasis === 'per-area' ? target * growthAreaCm2 : target;
  const cellsPerCm2 = cellsPerVessel / growthAreaCm2;
  const seedingCellsPerMl = cellsPerVessel / workingVolumeMl;

  const effectiveVessels = vessels * (1 + overage);
  const warnings: string[] = [];

  let suspensionVolumeMl: number;
  let totalVolumeMl: number;
  let totalCells: number;

  if (route === 'master') {
    totalVolumeMl = workingVolumeMl * effectiveVessels;
    totalCells = cellsPerVessel * effectiveVessels;
    suspensionVolumeMl = totalCells / stockCellsPerMl;
  } else {
    totalVolumeMl = workingVolumeMl;
    totalCells = cellsPerVessel;
    suspensionVolumeMl = cellsPerVessel / stockCellsPerMl;
  }

  const mediumVolumeMl = totalVolumeMl - suspensionVolumeMl;

  if (suspensionVolumeMl > totalVolumeMl) {
    warnings.push(
      `The suspension needed (${suspensionVolumeMl.toFixed(2)} mL) is more than the volume being made up (${totalVolumeMl.toFixed(2)} mL). The stock is too dilute to reach this density — concentrate it, or accept a larger working volume.`,
    );
  } else if (suspensionVolumeMl < MIN_PRACTICAL_ML) {
    warnings.push(
      `Only ${(suspensionVolumeMl * 1000).toFixed(1)} µL of suspension is needed, which is at or below the point where pipetting error dominates. Dilute the stock about tenfold first and take a measurable volume of that instead.`,
    );
  }

  if (route === 'direct' && suspensionVolumeMl < MIN_PRACTICAL_ML * 2 && vessels > 12) {
    warnings.push(
      'Pipetting a volume this small into every well separately will scatter the seeding density across the plate. Make a master mix and dispense one volume instead.',
    );
  }

  if (overage === 0 && vessels > 1) {
    warnings.push(
      'With no overage the last vessel gets whatever is left in the reservoir, which is always short. Ten per cent is the usual allowance.',
    );
  }

  return {
    cellsPerVessel,
    cellsPerCm2,
    seedingCellsPerMl,
    suspensionVolumeMl,
    mediumVolumeMl,
    totalVolumeMl,
    totalCells,
    effectiveVessels,
    warnings,
  };
}
