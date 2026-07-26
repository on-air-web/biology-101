/**
 * Centrifugation: relative centrifugal field, rotor speed, and the geometry
 * that decides both.
 *
 * The arithmetic here is trivial. The reason the tool exists is the radius.
 * A protocol says "spin at 12,000 × g", but g varies along the tube: the
 * bottom sits further from the axis than the top, often by a factor of two,
 * so the pellet and the meniscus experience very different fields. Converters
 * that ask for "the radius" without saying which one are the reason two labs
 * following the same protocol disagree.
 *
 * No magic constant appears below. The familiar RCF = 1.118e-5 · r(cm) · N²
 * is that expression with the unit conversions folded in; keeping ω²r/g in SI
 * means the formula is checkable against a physics textbook rather than
 * against another calculator, and `compute.test.ts` derives 1.118e-5 from it.
 *
 * Canonical units: radii in metres, per src/lib/units.ts.
 */

/** Standard gravity, m/s². The CGPM definition, not a local measured value. */
export const STANDARD_GRAVITY = 9.80665;

export class CentrifugeError extends Error {}

/** Which radius a quoted RCF refers to. Manufacturers quote max. */
export type RcfReference = 'max' | 'average' | 'min';

export type CentrifugeSolveFor = 'rcf' | 'rpm';

export interface RotorGeometry {
  /** Axis to the bottom of the tube, metres. The rotor's quoted r_max. */
  maxRadius: number;
  /** Axis to the top of the liquid column, metres. Optional. */
  minRadius?: number;
}

export interface SpinResult {
  rpm: number;
  /** At the bottom of the tube — the figure a rotor spec sheet quotes. */
  rcfMax: number;
  /** At the top of the liquid column. Undefined without a minimum radius. */
  rcfMin?: number;
  rcfAverage?: number;
  /** rcfMax / rcfMin: how unevenly the tube is loaded. */
  spread?: number;
  /**
   * Clearing factor at this speed, in hours × Svedberg. Undefined without a
   * minimum radius.
   */
  kFactor?: number;
  warnings: string[];
}

function angularVelocity(rpm: number): number {
  return (2 * Math.PI * rpm) / 60;
}

/** RCF = ω²r/g. Radius in metres, result dimensionless (multiples of g). */
export function rcfFromRpm(rpm: number, radiusMetres: number): number {
  const omega = angularVelocity(rpm);
  return (omega * omega * radiusMetres) / STANDARD_GRAVITY;
}

/** The inverse. Radius in metres. */
export function rpmFromRcf(rcf: number, radiusMetres: number): number {
  const omega = Math.sqrt((rcf * STANDARD_GRAVITY) / radiusMetres);
  return (omega * 60) / (2 * Math.PI);
}

/**
 * Clearing (k) factor, in hours × Svedberg.
 *
 * A particle of sedimentation coefficient s travels from r_min to r_max in
 * t = ln(r_max/r_min)/(s·ω²). Expressing t in hours and s in Svedbergs
 * (10⁻¹³ s) collects everything but s into k, so t(h) = k / s(S).
 *
 * Quoted k factors in a catalogue are at the rotor's *maximum rated speed*.
 * This is computed at the speed actually entered, which is what makes
 * `equivalentTime` usable directly on two real runs.
 */
export function clearingFactor(rpm: number, geometry: RotorGeometry): number | undefined {
  const { maxRadius, minRadius } = geometry;
  if (minRadius === undefined) return undefined;
  const omega = angularVelocity(rpm);
  if (omega === 0) return undefined;
  return (Math.log(maxRadius / minRadius) * 1e13) / (3600 * omega * omega);
}

/**
 * Run time on a second rotor that pellets the same particle as `minutes` on
 * the first. Proportional to k because both runs clear the same particle.
 */
export function equivalentTime(minutes: number, fromK: number, toK: number): number {
  if (fromK <= 0) throw new CentrifugeError('The original run has no usable clearing factor.');
  return (minutes * toK) / fromK;
}

function radiusFor(geometry: RotorGeometry, reference: RcfReference): number {
  const { maxRadius, minRadius } = geometry;
  if (reference === 'max') return maxRadius;
  if (minRadius === undefined) {
    throw new CentrifugeError(
      'Enter the minimum radius to use the average or minimum as the reference.',
    );
  }
  return reference === 'min' ? minRadius : (maxRadius + minRadius) / 2;
}

export interface SpinInput {
  geometry: RotorGeometry;
  /** Required when solving for RCF. */
  rpm?: number;
  /** Required when solving for RPM. Read at `reference`. */
  rcf?: number;
  reference: RcfReference;
  solveFor: CentrifugeSolveFor;
}

export function computeSpin(input: SpinInput): SpinResult {
  const { geometry, reference, solveFor } = input;
  const { maxRadius, minRadius } = geometry;

  if (!Number.isFinite(maxRadius) || maxRadius <= 0) {
    throw new CentrifugeError('The maximum radius must be greater than zero.');
  }
  if (minRadius !== undefined) {
    if (!Number.isFinite(minRadius) || minRadius <= 0) {
      throw new CentrifugeError('The minimum radius must be greater than zero.');
    }
    if (minRadius >= maxRadius) {
      throw new CentrifugeError(
        'The minimum radius must be smaller than the maximum — it is measured to the top of the liquid, not the bottom of the tube.',
      );
    }
  }

  let rpm: number;
  if (solveFor === 'rcf') {
    if (input.rpm === undefined || !Number.isFinite(input.rpm) || input.rpm <= 0) {
      throw new CentrifugeError('Enter a speed greater than zero.');
    }
    rpm = input.rpm;
  } else {
    if (input.rcf === undefined || !Number.isFinite(input.rcf) || input.rcf <= 0) {
      throw new CentrifugeError('Enter a relative centrifugal field greater than zero.');
    }
    rpm = rpmFromRcf(input.rcf, radiusFor(geometry, reference));
  }

  const rcfMax = rcfFromRpm(rpm, maxRadius);
  const rcfMin = minRadius === undefined ? undefined : rcfFromRpm(rpm, minRadius);
  const rcfAverage =
    minRadius === undefined ? undefined : rcfFromRpm(rpm, (maxRadius + minRadius) / 2);
  const spread = rcfMin === undefined ? undefined : rcfMax / rcfMin;

  const warnings: string[] = [];

  // Two-to-one across a tube is normal for a fixed-angle rotor and still worth
  // stating: it is the difference between a protocol reproducing and not.
  if (spread !== undefined && spread >= 1.5) {
    warnings.push(
      `The bottom of the tube sees ${spread.toFixed(1)}× the force at the top of the liquid. A protocol quoting a single number almost always means the maximum, which is what a rotor's specification sheet gives.`,
    );
  }

  if (reference !== 'max' && solveFor === 'rpm') {
    warnings.push(
      'You are treating the target as an average or minimum. Most published protocols mean the maximum, so this will spin faster than the author intended unless you know otherwise.',
    );
  }

  return {
    rpm,
    rcfMax,
    rcfMin,
    rcfAverage,
    spread,
    kFactor: clearingFactor(rpm, geometry),
    warnings,
  };
}
