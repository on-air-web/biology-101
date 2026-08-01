/**
 * Spectra viewer.
 *
 * The tool is mostly a drawing, so this module is thin: it assembles the row
 * of numbers printed beneath each curve, and answers the one quantitative
 * question a viewer is usually opened to settle — how well does the line I
 * have excite the fluorophore I want.
 *
 * Canonical units: nanometres, and efficiencies as fractions of one.
 */

import { excitationEfficiency, type Illumination } from '@/lib/bio/optics';
import {
  molecularBrightness,
  sampleSpectrum,
  stokesShift,
  type Fluorophore,
} from '@/lib/bio/spectra';

export interface ViewerRow {
  fluorophore: Fluorophore;
  exMax: number | null;
  emMax: number | null;
  stokes: number | undefined;
  brightness: number | undefined;
  /** Fraction of peak absorptivity at each requested line, in the same order. */
  atLines: number[];
  /** Best of `atLines`, and which line achieved it. Undefined with no lines. */
  best?: { nm: number; efficiency: number };
}

export function describeFluorophores(
  fluorophores: readonly Fluorophore[],
  lines: readonly number[],
): ViewerRow[] {
  return fluorophores.map((fluorophore) => {
    const atLines = lines.map((nm) => sampleSpectrum(fluorophore.ex, nm));

    let best: { nm: number; efficiency: number } | undefined;
    lines.forEach((nm, index) => {
      const efficiency = atLines[index] ?? 0;
      if (!best || efficiency > best.efficiency) best = { nm, efficiency };
    });

    return {
      fluorophore,
      exMax: fluorophore.exMax,
      emMax: fluorophore.emMax,
      stokes: stokesShift(fluorophore),
      brightness: molecularBrightness(fluorophore),
      atLines,
      best,
    };
  });
}

/**
 * How much of A's emission lands underneath B's, as a fraction of A's own
 * total emission.
 *
 * This is the number that decides whether two fluorophores can share a slide,
 * and it is asymmetric: a blue-emitting dye with a long tail contaminates a
 * red channel far more than the reverse. Computed over the region where B
 * emits at all, weighted by how strongly B emits there — a wavelength where B
 * is barely present is not a wavelength where A's photons cause trouble.
 */
export function emissionOverlap(a: Fluorophore, b: Fluorophore): number {
  let shared = 0;
  let total = 0;
  const from = Math.min(a.em.start, b.em.start);
  const to = 900;

  for (let nm = from; nm <= to; nm += 1) {
    const aValue = sampleSpectrum(a.em, nm);
    total += aValue;
    shared += aValue * sampleSpectrum(b.em, nm);
  }
  return total > 0 ? shared / total : 0;
}

/** Excitation efficiency at a single line, for the illumination summary. */
export function efficiencyAt(fluorophore: Fluorophore, nm: number): number {
  const source: Illumination = { kind: 'laser', nm };
  return excitationEfficiency(fluorophore, source);
}

export interface SeparationWarning {
  aId: string;
  bId: string;
  message: string;
}

/**
 * Pairs that will be difficult to tell apart, and why.
 *
 * Two separate failure modes get separate warnings on purpose. Emission
 * overlap is fixable with a narrower filter at the cost of signal; coincident
 * excitation is not fixable with filters at all, only by changing a
 * fluorophore or by unmixing. Collapsing them into one "these clash" message
 * would hide which of those two afternoons the user is in for.
 */
export function findSeparationProblems(fluorophores: readonly Fluorophore[]): SeparationWarning[] {
  const warnings: SeparationWarning[] = [];

  for (let i = 0; i < fluorophores.length; i += 1) {
    for (let j = i + 1; j < fluorophores.length; j += 1) {
      const a = fluorophores[i]!;
      const b = fluorophores[j]!;

      const emissionGap = Math.abs((a.emMax ?? 0) - (b.emMax ?? 0));
      if (emissionGap < 25) {
        warnings.push({
          aId: a.id,
          bId: b.id,
          message: `${a.name} and ${b.name} emit ${emissionGap} nm apart. No filter separates these two; they need spectral unmixing, a lifetime measurement, or one of them replaced.`,
        });
        continue;
      }

      const overlap = Math.max(emissionOverlap(a, b), emissionOverlap(b, a));
      if (overlap > 0.25) {
        warnings.push({
          aId: a.id,
          bId: b.id,
          message: `${a.name} and ${b.name} have heavily overlapping emission. Expect real bleed-through and check it in the filter-set tool before committing to the panel.`,
        });
      }
    }
  }

  return warnings;
}
