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

/**
 * Depletion intensity as a multiple of the dye's saturation intensity, for the
 * instrument the STED modality is drawn as.
 *
 * A representative figure, not a constant of nature. Exported so the gain it
 * produces can be recomputed rather than quoted — the resolution scales as
 * √(1 + I/I_sat), so every STED number in the literature is a claim about a
 * particular depletion power on a particular dye.
 */
export const STED_SATURATION_FACTOR = 100;

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
  tirf: {
    lateral: 1,
    axial: 1,
    note: 'TIRF resolves nothing finer. What it changes is how much of the specimen is excited at all: the evanescent field decays exponentially and reaches under about 100 nm past the coverslip, roughly a tenth of a confocal section. That is background excluded, not resolution gained.',
  },
  'spinning-disc': {
    lateral: 1,
    axial: 1.4,
    note: 'The same pinhole physics as a point-scanning confocal, run through thousands of pinholes at once. Sectioning is comparable in a thin specimen and worse in a thick one, because light returning through one pinhole reaches its neighbours — a crosstalk a single pinhole cannot suffer.',
  },
  sim: {
    lateral: 2,
    axial: 2,
    note: 'A factor of two, and exactly two rather than a measured figure. The illumination pattern is itself formed by the objective, so its finest fringe spacing is the microscope’s own cutoff; the moiré between that pattern and the specimen folds sample frequencies up to twice the cutoff into the passband, and the reconstruction unfolds them. Three-beam 3D-SIM does the same axially.',
  },
  sted: {
    // sqrt(1 + I/Isat), the saturation form. Written out rather than typed as a
    // number: the whole point is that the gain is a property of the depletion
    // power used, not of the method.
    lateral: Math.sqrt(1 + STED_SATURATION_FACTOR),
    axial: 1,
    note: `Resolution scales as √(1 + I/I_sat), so the gain is a statement about depletion power rather than about STED. Drawn here at I/I_sat = ${STED_SATURATION_FACTOR}, which is a factor of about ${Math.sqrt(1 + STED_SATURATION_FACTOR).toFixed(1)}. Turning the depletion laser up sharpens the image and bleaches the specimen faster, and that trade is the whole practical difficulty of the technique. A plain doughnut confines the spot laterally only; axial gain needs a second, differently shaped depletion pattern.`,
  },
  airyscan: {
    // √2 is the pixel-reassignment gain, and it is derivable: each detector
    // element sees a product of the excitation and detection PSFs, whose
    // width is the geometric mean of the two.
    lateral: Math.SQRT2,
    axial: 1.4,
    note: 'The √2 drawn here is the optical gain from pixel reassignment alone — each of the 32 elements is a small off-axis pinhole, and shifting its image back to the centre before summing narrows the effective PSF without discarding light. Vendors quote closer to 1.7×, which includes a linear deconvolution afterwards; that part is processing rather than optics and is left out of the figure above.',
  },
  'light-sheet': {
    lateral: 1,
    axial: 1,
    note: 'The lateral resolution is the detection objective’s, unchanged. The axial resolution is whichever is worse of the detection PSF and the thickness of the sheet, so a light sheet only sharpens the axial figure when the sheet is thinner than the depth of field — which for a high-NA detection objective it usually is not. What it does buy is that nothing outside the imaged plane is illuminated at all, and that is a photobleaching and speed argument rather than a resolution one.',
  },
  'lattice-light-sheet': {
    lateral: 1,
    axial: 1,
    note: 'A dithered lattice gives an effective sheet near 1 µm against the 4–5 µm of a tightly focused Gaussian sheet, which matches the depth of field of a high-NA objective far better — but the axial resolution is still set by the detection objective, so the figure above does not move. The structured-illumination mode of the same instrument reports roughly 1.3–1.5× finer than the dithered mode, at about 7.5× the acquisition time.',
  },
};

export interface EvanescentInput {
  /** Illumination wavelength in the incident medium, nm. */
  wavelength: number;
  /** Refractive index of the incident medium — the coverslip. */
  coreIndex: number;
  /** Refractive index of the specimen medium — buffer or cytosol. */
  sampleIndex: number;
  /** Angle of incidence measured from the normal to the interface, degrees. */
  angle: number;
}

const DEG = Math.PI / 180;

/**
 * The critical angle for total internal reflection, in degrees.
 *
 * Snell's law at the point where the refracted ray runs along the interface:
 * n1 sin θc = n2 sin 90°, so sin θc = n2/n1.
 */
export function criticalAngle(coreIndex: number, sampleIndex: number): number {
  if (!(coreIndex > sampleIndex)) {
    throw new ResolutionError(
      `Total internal reflection needs the incident medium to be denser than the specimen: ` +
        `n = ${coreIndex} against ${sampleIndex} gives no critical angle and no evanescent field.`,
    );
  }
  return Math.asin(sampleIndex / coreIndex) / DEG;
}

/**
 * Penetration depth of the evanescent field, nm — the 1/e depth of the
 * exponential decay, which is what sets the TIRF optical section.
 *
 *   d = λ / (4π √(n1² sin²θ − n2²))
 *
 * Refused rather than extrapolated below the critical angle: there is no
 * evanescent field there, the beam simply refracts into the specimen, and
 * returning a large number would describe an instrument that is not doing TIRF.
 */
export function evanescentDepth(input: EvanescentInput): number {
  const { wavelength, coreIndex, sampleIndex, angle } = input;
  if (!(wavelength > 0)) throw new ResolutionError('The wavelength must be greater than zero.');

  const critical = criticalAngle(coreIndex, sampleIndex);
  if (angle <= critical) {
    throw new ResolutionError(
      `At ${angle}° the beam is at or below the critical angle of ${critical.toFixed(1)}°, so it ` +
        `refracts into the specimen instead of reflecting. There is no evanescent field to measure.`,
    );
  }

  const sin = Math.sin(angle * DEG);
  return wavelength / (4 * Math.PI * Math.sqrt(coreIndex ** 2 * sin ** 2 - sampleIndex ** 2));
}

/**
 * The steepest angle an objective can deliver into the specimen, degrees.
 *
 * NA = n sin θ, so the objective's own aperture sets the ceiling — which is why
 * a TIRF objective has to have an NA above the refractive index of the specimen
 * and not merely a high one.
 */
export function maximumIncidence(numericalAperture: number, coreIndex: number): number {
  const ratio = numericalAperture / coreIndex;
  if (ratio > 1) {
    throw new ResolutionError(
      `NA ${numericalAperture} is impossible in a medium of n ${coreIndex}.`,
    );
  }
  return Math.asin(ratio) / DEG;
}
