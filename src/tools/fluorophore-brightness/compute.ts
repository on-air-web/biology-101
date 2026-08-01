/**
 * Brightness comparison.
 *
 * Two different questions get two different answers here, and keeping them
 * apart is the whole point of the tool:
 *
 *   Molecular brightness, ε × Φ, is a property of the fluorophore. It is what
 *   every protein paper tabulates and what FPbase sorts on, and it is the
 *   right number when choosing between fluorophores in the abstract.
 *
 *   Practical brightness is what you will actually see, on your microscope,
 *   with your line and your filters. A fluorophore with twice the molecular
 *   brightness is dimmer in practice if your laser sits on the shoulder of its
 *   excitation spectrum, and that reversal is common enough to be the reason
 *   this tool exists.
 *
 * Photostability appears alongside both and is deliberately not ranked — see
 * the note on `bleachHalfLife`.
 *
 * Canonical units: nanometres, ε in M⁻¹cm⁻¹, brightness in units of 1000.
 */

import {
  OpticsError,
  channelResponse,
  parseFilter,
  type Channel,
  type Illumination,
} from '@/lib/bio/optics';
import { FLUOROPHORES, molecularBrightness, type Fluorophore } from '@/lib/bio/spectra';

export { OpticsError } from '@/lib/bio/optics';

export interface SetupInput {
  /** Laser line in nm, or empty to use the excitation filter. */
  laser: string;
  excitationFilter: string;
  emissionFilter: string;
}

export interface BrightnessRow {
  fluorophore: Fluorophore;
  /** ε × Φ ÷ 1000. Undefined where either is unpublished. */
  molecular: number | undefined;
  /** Molecular brightness scaled by excitation and collection efficiency. */
  practical: number | undefined;
  excitation: number;
  collection: number;
  /** Practical brightness relative to the best row, 0 to 1. */
  relative: number | undefined;
  /** Seconds to half intensity, as published. NOT comparable between rows. */
  bleachHalfLife: number | null;
}

/**
 * Build the detection channel a comparison is made in.
 *
 * Throws rather than falling back to a default: silently comparing under an
 * optical setup the user did not ask for would produce a ranking that looks
 * authoritative and answers a different question.
 */
export function buildSetup(input: SetupInput): Channel {
  let illumination: Illumination;

  const laserText = input.laser.trim();
  if (laserText) {
    const nm = Number(laserText);
    if (!Number.isFinite(nm) || nm < 200 || nm > 1200) {
      throw new OpticsError(`"${laserText}" is not a wavelength between 200 and 1200 nm.`);
    }
    illumination = { kind: 'laser', nm };
  } else {
    illumination = { kind: 'filtered', filter: parseFilter(input.excitationFilter) };
  }

  return {
    id: 'setup',
    label: 'Your setup',
    illumination,
    emission: [parseFilter(input.emissionFilter)],
  };
}

export type SortKey = 'practical' | 'molecular' | 'emission';

export interface ComparisonInput {
  setup: Channel;
  /** Restrict to proteins, dyes, or neither. */
  kind?: 'protein' | 'dye';
  /** Only fluorophores emitting within this window, nm. */
  emissionWindow?: [number, number];
  sortBy: SortKey;
}

export function compareBrightness(input: ComparisonInput): BrightnessRow[] {
  const candidates = FLUOROPHORES.filter((fluorophore) => {
    if (input.kind && fluorophore.kind !== input.kind) return false;
    if (input.emissionWindow) {
      const [low, high] = input.emissionWindow;
      const emission = fluorophore.emMax;
      if (emission === null || emission < low || emission > high) return false;
    }
    return true;
  });

  const rows: BrightnessRow[] = candidates.map((fluorophore) => {
    const response = channelResponse(fluorophore, input.setup);
    return {
      fluorophore,
      molecular: molecularBrightness(fluorophore),
      practical: response.detected,
      excitation: response.excitation,
      collection: response.collection,
      relative: undefined,
      bleachHalfLife: fluorophore.bleachHalfLife,
    };
  });

  const best = Math.max(...rows.map((row) => row.practical ?? 0), 0);
  for (const row of rows) {
    row.relative = row.practical === undefined || best === 0 ? undefined : row.practical / best;
  }

  return sortRows(rows, input.sortBy);
}

function sortRows(rows: BrightnessRow[], sortBy: SortKey): BrightnessRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === 'emission') return (a.fluorophore.emMax ?? 0) - (b.fluorophore.emMax ?? 0);
    const key = sortBy === 'practical' ? 'practical' : 'molecular';
    // Rows with no published photophysics sink to the bottom rather than
    // sorting as zero among real values.
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    return bValue - aValue;
  });
}

/**
 * Fluorophores whose practical ranking differs sharply from their molecular
 * one — the finding the tool exists to surface.
 */
export interface Reversal {
  brighterInPractice: Fluorophore;
  brighterInPrinciple: Fluorophore;
  message: string;
}

/**
 * How much of the best signal a fluorophore must still deliver to count as a
 * contender.
 *
 * Without this the comparison reaches for whichever molecule in the whole
 * catalogue has the largest ε × Φ, which in a green setup is a far-red dye
 * that the laser does not touch — producing a true but useless sentence about
 * one fluorophore being three thousand times brighter than another. A reversal
 * is only interesting between two fluorophores somebody might actually choose
 * between.
 */
const CONTENDER_THRESHOLD = 0.1;

export function findReversals(rows: readonly BrightnessRow[]): Reversal[] {
  const scored = rows.filter(
    (row) => row.molecular !== undefined && row.practical !== undefined && row.practical > 0,
  );
  const best = Math.max(...scored.map((row) => row.practical!), 0);
  const usable = scored.filter((row) => row.practical! >= best * CONTENDER_THRESHOLD);

  const byMolecular = [...usable].sort((a, b) => b.molecular! - a.molecular!);
  const byPractical = [...usable].sort((a, b) => b.practical! - a.practical!);

  const topMolecular = byMolecular[0];
  const topPractical = byPractical[0];
  if (!topMolecular || !topPractical) return [];
  if (topMolecular.fluorophore.id === topPractical.fluorophore.id) return [];

  return [
    {
      brighterInPractice: topPractical.fluorophore,
      brighterInPrinciple: topMolecular.fluorophore,
      message:
        `${topMolecular.fluorophore.name} is the brighter molecule — ${topMolecular.molecular!.toFixed(1)} against ` +
        `${topPractical.molecular!.toFixed(1)} — but in this setup ${topPractical.fluorophore.name} gives ` +
        `${(topPractical.practical! / topMolecular.practical!).toFixed(1)}× the signal, because it is ` +
        `${(topPractical.excitation * 100).toFixed(0)}% excited here against ${(topMolecular.excitation * 100).toFixed(0)}%.`,
    },
  ];
}
