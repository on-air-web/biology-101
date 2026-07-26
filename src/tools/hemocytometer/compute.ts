/**
 * Haemocytometer counting.
 *
 * The arithmetic is a division. What this tool exists for is the uncertainty
 * on it, which almost no counting calculator reports.
 *
 * Cells settling into a chamber are a Poisson process: the number landing over
 * any square varies, and counting n of them carries a standard error of √n
 * whether or not anyone says so. Count 100 cells — the number every protocol
 * asks for — and the 95% interval is roughly ±20%. That is not a defect in the
 * method, it is the method, and a user deciding whether a difference between
 * two flasks is real needs it in front of them. This is the site's rule about
 * never reporting an estimate without an interval, applied to a pipette rather
 * than a p-value.
 *
 * The interval is exact rather than n ± 1.96√n, because the normal
 * approximation is poor at exactly the counts people work with and can run
 * negative below about four.
 *
 * Canonical units: millilitres throughout; counts are dimensionless.
 */

import { normalCritical, poissonExactInterval } from '@/lib/stats/distributions';

export class HemocytometerError extends Error {}

/** Below this the interval is wider than most people assume it is. */
export const SPARSE_TOTAL = 100;
/** Per square, above which cells overlap and are undercounted. */
export const CROWDED_PER_SQUARE = 250;

export interface CountInput {
  /** Unstained (live) cells counted across all squares. */
  liveCount: number;
  /** Stained (dead) cells counted, when assessing viability. */
  deadCount?: number;
  /** How many counting squares those totals came from. */
  squares: number;
  /** Volume above one counting square, mL. */
  squareVolumeMl: number;
  /** Fold dilution before loading, including any trypan blue step. */
  dilutionFactor: number;
  confidence?: number;
}

export interface Interval {
  lower: number;
  upper: number;
}

export interface CountResult {
  /** Live cells per mL of the original, undiluted suspension. */
  cellsPerMl: number;
  /** From the Poisson interval on the number actually counted. */
  interval: Interval;
  /** Half-width of the interval as a fraction of the estimate. */
  relativeError: number;
  /** Total cells per mL including the dead ones, when counted. */
  totalCellsPerMl: number;
  meanPerSquare: number;
  totalCounted: number;
  /** Wilson score interval on the live fraction, when dead cells were counted. */
  viability?: { fraction: number; lower: number; upper: number };
  warnings: string[];
}

/**
 * Cells that must be counted to reach a given relative half-width.
 *
 * Inverts the Poisson relation: the 95% half-width is about z√n, so its size
 * relative to n falls as z/√n. Answering "how many more should I count?" is
 * the only useful response to an interval someone is unhappy with.
 */
export function cellsToCount(relativeHalfWidth: number, confidence = 0.95): number {
  if (!(relativeHalfWidth > 0) || relativeHalfWidth >= 1) {
    throw new HemocytometerError('Target precision must lie between 0 and 1.');
  }
  const z = normalCritical(confidence);
  return Math.ceil((z / relativeHalfWidth) ** 2);
}

/**
 * Wilson score interval for a proportion.
 *
 * Preferred over p̂ ± z√(p̂(1−p̂)/n), which collapses to zero width at 100%
 * viability — a claim no count of finite size supports.
 */
function wilsonInterval(successes: number, total: number, confidence: number): Interval {
  const z = normalCritical(confidence);
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const halfWidth =
    (z / denominator) * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return { lower: Math.max(0, centre - halfWidth), upper: Math.min(1, centre + halfWidth) };
}

function requireCount(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new HemocytometerError(`${field} must be a whole number of cells, zero or more.`);
  }
  return value;
}

export function countCells(input: CountInput): CountResult {
  const { squares, squareVolumeMl, dilutionFactor, confidence = 0.95 } = input;

  const liveCount = requireCount(input.liveCount, 'The live count');
  const deadCount =
    input.deadCount === undefined ? undefined : requireCount(input.deadCount, 'The dead count');

  if (!Number.isFinite(squares) || squares <= 0) {
    throw new HemocytometerError('You must count at least one square.');
  }
  if (!Number.isFinite(squareVolumeMl) || squareVolumeMl <= 0) {
    throw new HemocytometerError('The volume over a square must be greater than zero.');
  }
  if (!Number.isFinite(dilutionFactor) || dilutionFactor < 1) {
    throw new HemocytometerError('The dilution factor is 1 for an undiluted sample, or more.');
  }

  // Everything counted scales to the original suspension by the same factor,
  // so the interval scales with the estimate and stays exact.
  const perMl = 1 / (squares * squareVolumeMl);
  const scale = perMl * dilutionFactor;

  const cellsPerMl = liveCount * scale;
  const raw = poissonExactInterval(liveCount, confidence);
  const interval = { lower: raw.lower * scale, upper: raw.upper * scale };

  const totalCounted = liveCount + (deadCount ?? 0);
  const meanPerSquare = totalCounted / squares;

  const warnings: string[] = [];

  if (totalCounted === 0) {
    warnings.push(
      'Nothing was counted. The upper bound is what a count of zero can rule out, not a measurement — load more squares before concluding the suspension is empty.',
    );
  } else if (totalCounted < SPARSE_TOTAL) {
    warnings.push(
      `Only ${totalCounted} cells counted, so the interval spans roughly ±${Math.round(((raw.upper - raw.lower) * 50) / liveCount)}% of the estimate. Counting ${SPARSE_TOTAL} is the usual minimum and still leaves about ±20%; reaching ±10% takes about ${cellsToCount(0.1, confidence)}.`,
    );
  }

  if (meanPerSquare > CROWDED_PER_SQUARE) {
    warnings.push(
      `At ${Math.round(meanPerSquare)} cells per square the field is too crowded to count reliably — cells overlap and are missed, which biases the result downwards rather than just scattering it. Dilute and count again.`,
    );
  }

  if (deadCount !== undefined && dilutionFactor === 1) {
    warnings.push(
      'Trypan blue is normally mixed with the sample one to one, which is a two-fold dilution. If you did that, the dilution factor is 2, not 1.',
    );
  }

  return {
    cellsPerMl,
    interval,
    relativeError: liveCount === 0 ? Infinity : (interval.upper - interval.lower) / 2 / cellsPerMl,
    totalCellsPerMl: totalCounted * scale,
    meanPerSquare,
    totalCounted,
    viability:
      deadCount === undefined || totalCounted === 0
        ? undefined
        : {
            fraction: liveCount / totalCounted,
            ...wilsonInterval(liveCount, totalCounted, confidence),
          },
    warnings,
  };
}
