/**
 * OD600: turbidity, and the three corrections that decide whether it means
 * anything.
 *
 * OD600 is not absorbance. Cells do not absorb meaningfully at 600 nm; they
 * scatter, and the instrument records the light that failed to arrive. Three
 * consequences drive everything here:
 *
 *   1. **Linearity has a ceiling.** Once a beam is dense enough that light
 *      scattered out of it is scattered back in, optical density stops rising
 *      in proportion to cell number and starts to saturate. The remedy is to
 *      dilute and read again, then multiply back.
 *   2. **Path length is not always 1 cm.** A plate reader looks down through
 *      whatever depth of liquid is in the well — usually nearer 0.6 cm at a
 *      typical 96-well fill. Uncorrected, a plate reads low.
 *   3. **The cells-per-OD factor is instrument-specific**, because how much
 *      scattered light misses the detector depends on the detector's position.
 *
 * The subtle one is where the linearity check belongs. It applies to what the
 * beam actually saw — the reading normalised to 1 cm, before undoing any
 * dilution. A culture at OD 2.4 is perfectly well measured if it was read at
 * 0.24 on a 1-in-10 dilution. Checking the corrected figure would warn on
 * every correctly handled dense culture; checking neither is how wrong numbers
 * ship.
 *
 * Canonical units: litres and metres. Cell counts are per millilitre because
 * that is the unit the entire field uses, and inventing a per-litre convention
 * to satisfy the units layer would be pedantry at the user's expense.
 */

export class Od600Error extends Error {}

/**
 * Optical density per cm above which multiple scattering flattens the
 * response. Instruments vary; 0.4 is the conventional working ceiling for a
 * 1 cm benchtop spectrophotometer.
 */
export const LINEAR_LIMIT_OD_PER_CM = 0.4;

/** Below this, blank drift and instrument noise are a large share of the reading. */
export const NOISE_FLOOR_OD_PER_CM = 0.05;

export type Instrument = 'cuvette' | 'plate';

/**
 * Path length through a flat-bottomed well, in metres, from fill volume and
 * well diameter.
 *
 * Deriving it geometrically rather than storing a constant per plate format
 * keeps the assumption visible: it treats the well as a cylinder and ignores
 * the meniscus, which makes it read a few per cent long at small volumes.
 * Instruments with a path-length correction feature measure the real thing and
 * should be preferred.
 */
export function wellPathLength(volumeLitres: number, diameterMetres: number): number {
  if (!Number.isFinite(volumeLitres) || volumeLitres <= 0) {
    throw new Od600Error('Well volume must be greater than zero.');
  }
  if (!Number.isFinite(diameterMetres) || diameterMetres <= 0) {
    throw new Od600Error('Well diameter must be greater than zero.');
  }
  const radius = diameterMetres / 2;
  const areaSquareMetres = Math.PI * radius * radius;
  // Litres to cubic metres, then a depth from volume over cross-section.
  return (volumeLitres * 1e-3) / areaSquareMetres;
}

export interface OdInput {
  /** What the instrument displayed. */
  measuredOd: number;
  /** Fold dilution made before reading; 1 means read neat. */
  dilutionFactor: number;
  /** Optical path length, metres. */
  pathLength: number;
  /** Cells per mL at OD600 = 1.0 in a 1 cm path. */
  cellsPerMlPerOd: number;
  instrument: Instrument;
  /** Total culture volume, litres. Optional. */
  cultureVolume?: number;
}

export interface OdResult {
  /** OD600 of the undiluted culture, normalised to a 1 cm path. */
  cultureOd: number;
  /**
   * What the beam saw, per centimetre, still diluted. The quantity the
   * linearity ceiling applies to.
   */
  odPerCmInBeam: number;
  cellsPerMl: number;
  /** Only when a culture volume was given. */
  totalCells?: number;
  warnings: string[];
}

export function readCulture(input: OdInput): OdResult {
  const { measuredOd, dilutionFactor, pathLength, cellsPerMlPerOd, instrument, cultureVolume } =
    input;

  if (!Number.isFinite(measuredOd) || measuredOd < 0) {
    throw new Od600Error('The reading must be zero or greater.');
  }
  if (!Number.isFinite(dilutionFactor) || dilutionFactor < 1) {
    throw new Od600Error('The dilution factor is 1 for a neat reading and greater if diluted.');
  }
  if (!Number.isFinite(pathLength) || pathLength <= 0) {
    throw new Od600Error('Path length must be greater than zero.');
  }
  if (!Number.isFinite(cellsPerMlPerOd) || cellsPerMlPerOd <= 0) {
    throw new Od600Error('The cells per OD unit must be greater than zero.');
  }
  if (cultureVolume !== undefined && (!Number.isFinite(cultureVolume) || cultureVolume <= 0)) {
    throw new Od600Error('Culture volume must be greater than zero.');
  }

  const pathCm = pathLength * 100;
  const odPerCmInBeam = measuredOd / pathCm;
  const cultureOd = odPerCmInBeam * dilutionFactor;
  const cellsPerMl = cultureOd * cellsPerMlPerOd;

  const warnings: string[] = [];

  if (odPerCmInBeam > LINEAR_LIMIT_OD_PER_CM) {
    warnings.push(
      `The instrument read ${odPerCmInBeam.toFixed(2)} per cm, above the linear ceiling of about ${LINEAR_LIMIT_OD_PER_CM}. Light scattered out of a dense beam gets scattered back into it, so the reading understates the cells present. Dilute until the reading falls below ${LINEAR_LIMIT_OD_PER_CM} and let this tool multiply back up.`,
    );
  } else if (measuredOd > 0 && odPerCmInBeam < NOISE_FLOOR_OD_PER_CM) {
    warnings.push(
      `At ${odPerCmInBeam.toFixed(3)} per cm the reading is close to the blank. Drift between blanking and measuring is a large fraction of a number this small, so treat it as an order of magnitude rather than a measurement.`,
    );
  }

  if (instrument === 'plate') {
    warnings.push(
      'A plate reader collects scattered light over a different geometry from a cuvette spectrophotometer, so its OD is not the same quantity even after the path length is corrected. A conversion factor calibrated on a cuvette instrument will be systematically off here.',
    );
  }

  return {
    cultureOd,
    odPerCmInBeam,
    cellsPerMl,
    totalCells: cultureVolume === undefined ? undefined : cellsPerMl * cultureVolume * 1000,
    warnings,
  };
}

export interface CultureDilutionInput {
  /** Current OD600 of the undiluted culture, 1 cm basis. */
  currentOd: number;
  targetOd: number;
  /** Volume of diluted culture wanted, litres. */
  targetVolume: number;
}

export interface CultureDilutionResult {
  /** Volume of culture to take, litres. */
  cultureVolume: number;
  /** Fresh medium to add, litres. */
  mediumVolume: number;
  foldDilution: number;
}

/** C₁V₁ = C₂V₂, with optical density standing in for concentration. */
export function diluteCulture(input: CultureDilutionInput): CultureDilutionResult {
  const { currentOd, targetOd, targetVolume } = input;

  if (!Number.isFinite(currentOd) || currentOd <= 0) {
    throw new Od600Error('The current culture density must be greater than zero.');
  }
  if (!Number.isFinite(targetOd) || targetOd <= 0) {
    throw new Od600Error('The target density must be greater than zero.');
  }
  if (!Number.isFinite(targetVolume) || targetVolume <= 0) {
    throw new Od600Error('The final volume must be greater than zero.');
  }
  if (targetOd > currentOd) {
    throw new Od600Error(
      'The target is denser than the culture. Grow it further rather than diluting to reach this.',
    );
  }

  const cultureVolume = (targetOd * targetVolume) / currentOd;
  return {
    cultureVolume,
    mediumVolume: targetVolume - cultureVolume,
    foldDilution: currentOd / targetOd,
  };
}
