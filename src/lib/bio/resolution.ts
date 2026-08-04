/**
 * Diffraction-limited resolution.
 *
 * The microscope explorer needs a number as well as a picture: changing the
 * objective in the drawing has to change what the instrument can actually
 * resolve, or the drawing is decoration. These are the standard closed forms,
 * each returned with the criterion it came from, because the three in common
 * use disagree by up to 20% and papers routinely quote one while naming
 * another.
 *
 * Canonical units: nanometres in and nanometres out. Numerical aperture and
 * refractive index are dimensionless.
 */

export class ResolutionError extends Error {}

/**
 * The three criteria, and why there are three.
 *
 * They differ in what counts as "resolved", not in the physics:
 *
 *   Abbe      λ / (2 NA). The grating limit — the finest spacing whose first
 *             diffracted order the objective still collects. Abbe's own
 *             argument, and the number vendors quote.
 *   Rayleigh  0.61 λ / NA. Two point sources are resolved when the maximum of
 *             one falls on the first zero of the other. 22% larger than Abbe,
 *             and the criterion most microscopy texts teach.
 *   Sparrow   0.47 λ / NA. The spacing at which the dip between two maxima
 *             just vanishes. The most optimistic of the three, and the one
 *             super-resolution papers compare against when they want the
 *             conventional limit to look as good as possible.
 */
export const CRITERIA = [
  {
    id: 'abbe',
    name: 'Abbe',
    factor: 0.5,
    guidance:
      'The grating limit: the finest spacing whose first diffracted order still enters the objective. What an objective’s specification implies.',
  },
  {
    id: 'rayleigh',
    name: 'Rayleigh',
    factor: 0.61,
    guidance:
      'Two points are resolved when the maximum of one sits on the first dark ring of the other. The textbook criterion, and 22% more conservative than Abbe.',
  },
  {
    id: 'sparrow',
    name: 'Sparrow',
    factor: 0.47,
    guidance:
      'The separation at which the dip between two overlapping maxima just disappears. The most permissive of the three; treat a figure quoted this way with care.',
  },
] as const;

export type CriterionId = (typeof CRITERIA)[number]['id'];

export interface ResolutionInput {
  /** Emission wavelength, nm. Emission rather than excitation: the image is
   *  formed by the light that reaches the detector. */
  wavelength: number;
  numericalAperture: number;
  /** Refractive index of the immersion medium. Air 1.0, water 1.33, oil 1.515. */
  refractiveIndex: number;
  criterion: CriterionId;
  /** NA of the condenser, for a transmitted-light instrument. Raises the
   *  achievable resolution because it widens the cone of illumination. */
  condenserNA?: number;
}

export interface ResolutionResult {
  /** Smallest resolvable separation in the focal plane, nm. */
  lateral: number;
  /** Along the optical axis, nm. Always several times worse than lateral. */
  axial: number;
  /** Radius of the Airy disc to its first zero, nm. */
  airyRadius: number;
  /** Total depth of field, nm — wave term only. */
  depthOfField: number;
  /** Half-angle of the collection cone, degrees. */
  acceptanceAngle: number;
  notes: string[];
}

function criterionFor(id: CriterionId) {
  const criterion = CRITERIA.find((c) => c.id === id);
  if (!criterion) throw new ResolutionError(`Unknown criterion: ${id}`);
  return criterion;
}

export function resolve(input: ResolutionInput): ResolutionResult {
  const { wavelength, numericalAperture: na, refractiveIndex: n, condenserNA } = input;

  if (!(wavelength > 0)) throw new ResolutionError('The wavelength must be greater than zero.');
  if (!(na > 0)) throw new ResolutionError('The numerical aperture must be greater than zero.');
  if (!(n >= 1)) throw new ResolutionError('A refractive index below 1 is not physical.');
  if (na > n) {
    // NA = n sin θ, and sin θ cannot exceed 1. A 1.4 NA objective in air is a
    // specification error, not an ambitious objective.
    throw new ResolutionError(
      `NA ${na} is impossible in a medium of refractive index ${n}: NA = n·sin θ, so it cannot ` +
        `exceed ${n}. An oil objective needs oil (n ≈ 1.515), not air.`,
    );
  }

  const criterion = criterionFor(input.criterion);
  const notes: string[] = [];

  // With a condenser, the illumination cone adds to the collection cone —
  // Abbe's two-NA form. This is why closing the condenser aperture for contrast
  // costs resolution, and why the two are always a trade.
  const effectiveNA = condenserNA !== undefined && condenserNA > 0 ? (na + condenserNA) / 2 : na;

  if (condenserNA !== undefined && condenserNA > 0) {
    notes.push(
      condenserNA < na
        ? `The condenser at NA ${condenserNA} is the limit here, not the objective at NA ${na}. Opening it improves resolution and lowers contrast; that trade is the whole of Köhler alignment.`
        : `The condenser at NA ${condenserNA} matches or exceeds the objective, so the objective is the limit.`,
    );
  }

  const lateral = (criterion.factor * wavelength) / effectiveNA;

  // Axial resolution. The 2nλ/NA² form is the standard depth-of-field-like
  // expression; it degrades as the square of NA, which is why confocal
  // sectioning matters so much more than lateral resolution in practice.
  const axial = (2 * n * wavelength) / (na * na);

  const airyRadius = (0.61 * wavelength) / na;
  const depthOfField = (n * wavelength) / (na * na);
  const acceptanceAngle = (Math.asin(Math.min(1, na / n)) * 180) / Math.PI;

  if (na >= 1 && n <= 1.05) {
    notes.push('An NA at or above 1 requires an immersion medium; this is set to air.');
  }
  if (axial / lateral > 2.5) {
    notes.push(
      `Axial resolution is ${(axial / lateral).toFixed(1)}× worse than lateral, which is normal and is the reason a widefield image of a thick sample looks blurred rather than merely soft.`,
    );
  }

  return { lateral, axial, airyRadius, depthOfField, acceptanceAngle, notes };
}

/**
 * The improvement a technique claims over the conventional limit.
 *
 * Stored as a factor rather than a resolution because every one of these
 * depends on the objective underneath it: STED at 30 nm is a claim about a
 * particular depletion power on a particular dye, not a property of the method.
 * The interface prints the factor against the computed conventional figure so
 * the dependence stays visible.
 */
export interface TechniqueGain {
  lateral: number;
  axial: number;
  note: string;
}

export const TECHNIQUE_GAINS: Record<string, TechniqueGain> = {
  widefield: {
    lateral: 1,
    axial: 1,
    note: 'The diffraction limit itself — the reference every other row is quoted against, and the limit Abbe derived in 1873.',
  },
  epifluorescence: {
    lateral: 1,
    axial: 1,
    note: 'Same limit as widefield: epifluorescence changes where the light comes from, not what the objective can resolve.',
  },
  confocal: {
    lateral: 1,
    axial: 1.4,
    note: 'A closed pinhole improves lateral resolution by at most √2, and only at a pinhole size that throws away most of the light. The real gain is axial: out-of-focus light is rejected rather than resolved, which is sectioning rather than resolution.',
  },
  'phase-contrast': {
    lateral: 1,
    axial: 1,
    note: 'Phase contrast converts phase to amplitude. It makes transparent objects visible without changing the diffraction limit at all.',
  },
  dic: {
    lateral: 1,
    axial: 1,
    note: 'DIC gives a shear-direction gradient image with apparent relief. The resolution is the ordinary limit; the sectioning is better than brightfield because the shear is small.',
  },
};
