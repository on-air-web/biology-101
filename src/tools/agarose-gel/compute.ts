/**
 * Agarose gel preparation.
 *
 * Weighing the agarose is one multiplication. The part worth a tool is the
 * other direction: which percentage resolves the fragment you are trying to
 * see. Running a 500 bp product on a 0.7% gel wastes an afternoon and a gel,
 * and the answer is a table nobody has to hand.
 *
 * Percentage here is weight per volume — 1% is 1 g in 100 mL, which is 10 g/L
 * — and that is what `mass-concentration` in the units layer encodes, so the
 * conversion happens at the UI edge like every other unit.
 *
 * Canonical units: g/L for the gel percentage, litres for volume, grams for
 * mass.
 */

export class GelError extends Error {}

export interface GelGrade {
  /** Percentage as written on a protocol, w/v. */
  percent: number;
  /** Smallest and largest fragment this percentage separates well, in bp. */
  range: [number, number];
}

/**
 * Working ranges for standard agarose. The bounds are where resolution starts
 * to fail rather than hard limits: a fragment slightly outside still runs, it
 * just stops being distinguishable from its neighbours.
 */
export const GRADES: readonly GelGrade[] = [
  { percent: 0.5, range: [1000, 30000] },
  { percent: 0.7, range: [800, 12000] },
  { percent: 1.0, range: [500, 10000] },
  { percent: 1.2, range: [400, 7000] },
  { percent: 1.5, range: [200, 3000] },
  { percent: 2.0, range: [50, 2000] },
] as const;

/**
 * The percentage whose working range best suits a fragment size.
 *
 * Several grades usually cover a given size, and neither extreme is the right
 * pick: 2% technically spans 1500 bp but nobody runs a 1500 bp fragment on
 * one, and 0.5% spans it too while resolving nothing nearby. What matters is
 * sitting in the middle of a range rather than at its edge, so the grade whose
 * range is best centred on the fragment wins. The comparison is logarithmic
 * because the ranges are — 200 to 3000 is centred on about 775, not 1600.
 */
export function gradeForSize(basePairs: number): GelGrade | undefined {
  if (!Number.isFinite(basePairs) || basePairs <= 0) return undefined;

  const covering = GRADES.filter(
    (grade) => basePairs >= grade.range[0] && basePairs <= grade.range[1],
  );
  if (covering.length === 0) return undefined;

  let best = covering[0]!;
  let bestOffset = Infinity;
  for (const grade of covering) {
    const centre = Math.sqrt(grade.range[0] * grade.range[1]);
    const offset = Math.abs(Math.log(basePairs / centre));
    if (offset < bestOffset) {
      bestOffset = offset;
      best = grade;
    }
  }
  return best;
}

export interface GelInput {
  /** Gel concentration, g/L. 1% w/v is 10 g/L. */
  concentration: number;
  /** Volume of buffer the gel is cast in, litres. */
  volume: number;
  /** Fragment being resolved, base pairs. Optional. */
  targetSize?: number;
}

export interface GelResult {
  /** Agarose to weigh, grams. */
  agaroseMass: number;
  /** Percentage, w/v, for display against the table. */
  percent: number;
  /** The grade that would suit the target size, where one was given. */
  suggested?: GelGrade;
  warnings: string[];
}

export function prepareGel(input: GelInput): GelResult {
  if (!Number.isFinite(input.concentration) || input.concentration <= 0) {
    throw new GelError('The gel percentage must be greater than zero.');
  }
  if (!Number.isFinite(input.volume) || input.volume <= 0) {
    throw new GelError('The buffer volume must be greater than zero.');
  }

  // g/L divided by ten is percent w/v, since 1% is 10 g/L.
  const percent = input.concentration / 10;
  const agaroseMass = input.concentration * input.volume;

  const warnings: string[] = [];

  if (percent < 0.4) {
    warnings.push(
      `At ${percent.toFixed(2)}% the gel is too soft to handle without tearing. Below about 0.5% use a low-melting-point or specialised agarose rather than standard.`,
    );
  } else if (percent > 3) {
    warnings.push(
      `At ${percent.toFixed(2)}% standard agarose is hard to pour without lumps and resolves little that polyacrylamide would not resolve better. For fragments under about 100 bp, polyacrylamide is the honest answer.`,
    );
  }

  const suggested = input.targetSize === undefined ? undefined : gradeForSize(input.targetSize);

  if (input.targetSize !== undefined) {
    if (suggested === undefined) {
      warnings.push(
        `Nothing in the standard range resolves ${input.targetSize} bp well. Below about 50 bp use polyacrylamide; above about 30 kb use pulsed-field electrophoresis.`,
      );
    } else if (Math.abs(suggested.percent - percent) > 0.35) {
      warnings.push(
        `For ${input.targetSize} bp, ${suggested.percent}% would resolve better than ${percent.toFixed(2)}% — that grade separates ${suggested.range[0]} to ${suggested.range[1]} bp.`,
      );
    }
  }

  return { agaroseMass, percent, suggested, warnings };
}
