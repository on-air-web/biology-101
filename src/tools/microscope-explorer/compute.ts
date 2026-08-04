/**
 * Microscope explorer.
 *
 * The drawing lives in the component; this is the part that turns a chosen
 * modality and objective into numbers, so that changing the instrument changes
 * what it can actually resolve rather than only what it looks like.
 *
 * Canonical units: nanometres.
 */

import { getModality, type Modality, type Part, type RayBand } from '@/lib/bio/microscopes';
import {
  ResolutionError,
  TECHNIQUE_GAINS,
  resolve,
  type CriterionId,
  type ResolutionResult,
} from '@/lib/bio/resolution';

export { ResolutionError } from '@/lib/bio/resolution';

export interface ExplorerInput {
  modalityId: string;
  /** Overrides the modality's own objective, when the user changes it. */
  numericalAperture?: number;
  refractiveIndex?: number;
  wavelength?: number;
  criterion: CriterionId;
}

export interface ExplorerResult {
  modality: Modality;
  resolution: ResolutionResult;
  /** What the technique claims over the conventional limit, and the caveat. */
  gain: { lateral: number; axial: number; note: string };
  /** Resolution after the technique's own gain, nm. */
  effectiveLateral: number;
  effectiveAxial: number;
  /** Total magnification is not modelled; this says so where it would be asked. */
  notes: string[];
}

export function explore(input: ExplorerInput): ExplorerResult {
  const modality = getModality(input.modalityId);
  if (!modality) {
    throw new ResolutionError(`No modality with id "${input.modalityId}".`);
  }

  const numericalAperture = input.numericalAperture ?? modality.optics.numericalAperture;
  const refractiveIndex = input.refractiveIndex ?? modality.optics.refractiveIndex;
  const wavelength = input.wavelength ?? modality.optics.wavelength;

  const resolution = resolve({
    wavelength,
    numericalAperture,
    refractiveIndex,
    criterion: input.criterion,
    condenserNA: modality.optics.condenserNA,
  });

  const gain = TECHNIQUE_GAINS[modality.optics.gainKey];
  if (!gain) {
    throw new ResolutionError(`No resolution model for technique "${modality.optics.gainKey}".`);
  }

  const notes = [...resolution.notes];
  if (gain.lateral === 1 && gain.axial === 1) {
    notes.push(
      `${modality.shortName} does not move the diffraction limit. Whatever it buys — contrast, sectioning, specificity — it buys without resolving anything finer.`,
    );
  }

  return {
    modality,
    resolution,
    gain,
    effectiveLateral: resolution.lateral / gain.lateral,
    effectiveAxial: resolution.axial / gain.axial,
    notes,
  };
}

/**
 * The parts in the order light meets them.
 *
 * Sorting by height along the optical axis gets the column right but puts the
 * epi arm — which sits beside the column, not below it — in the wrong place. So
 * illumination-side parts that are off-axis are pulled to the front, which is
 * where the light actually starts.
 */
export function partsInLightOrder(modality: Modality): Part[] {
  const offAxis = modality.parts.filter((part) => Math.abs(part.at[0]) > 1);
  const onAxis = modality.parts.filter((part) => Math.abs(part.at[0]) <= 1);

  return [
    // Furthest out along the arm first: that is the source end of it.
    ...offAxis.sort((a, b) => a.at[0] - b.at[0]),
    ...onAxis.sort((a, b) => a.at[1] - b.at[1]),
  ];
}

/** Conjugate-plane groups, which are the thing a light path is read for. */
export interface ConjugateSet {
  kind: 'field' | 'aperture';
  label: string;
  description: string;
  partIds: string[];
}

export function conjugateSets(modality: Modality): ConjugateSet[] {
  const of = (kind: 'field' | 'aperture') =>
    modality.parts.filter((part) => part.conjugate === kind).map((part) => part.id);

  const sets: ConjugateSet[] = [];
  const field = of('field');
  const aperture = of('aperture');

  if (field.length > 1) {
    sets.push({
      kind: 'field',
      label: 'Field planes',
      description:
        'In focus together. Anything placed in one of these is seen sharply along with the specimen, which is why a graticule goes in the intermediate image and why the field diaphragm can be focused.',
      partIds: field,
    });
  }
  if (aperture.length > 1) {
    sets.push({
      kind: 'aperture',
      label: 'Aperture planes',
      description:
        'Also in focus together, and never with the field set. This is where the diffraction pattern lives, and why a phase plate, a DIC prism and the condenser diaphragm all have to sit in one of them.',
      partIds: aperture,
    });
  }
  return sets;
}

/** Bands on by default: everything the modality declares. */
export function defaultBands(modality: Modality): RayBand[] {
  return modality.bands.map((band) => band.band);
}
