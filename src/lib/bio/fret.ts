/**
 * Förster resonance energy transfer.
 *
 * Canonical units: wavelength in nanometres, distances in nanometres, the
 * overlap integral in M⁻¹cm⁻¹nm⁴ — the convention every published R₀ is
 * quoted against.
 */

import {
  integrate,
  sampleSpectrum,
  spectrumArea,
  spectrumRange,
  type Fluorophore,
} from './spectra';

export class FretError extends Error {}

const AVOGADRO = 6.02214076e23; // exact, SI 2019
const NM2_PER_CM2 = 1e14;

/**
 * The Förster prefactor, derived rather than quoted.
 *
 *     R₀⁶ = 9000 (ln 10) κ² Φ_D J / (128 π⁵ N_A n⁴)
 *
 * where the 9000 is 9 × 1000 cm³/L, carrying ε's litres into the cubic
 * centimetres the rest of the expression is in. With J in M⁻¹cm⁻¹nm⁴ the
 * bracket comes out in cm²·nm⁴, so one conversion to nm² finishes it.
 *
 * The literature shortcut is R₀(Å) = 0.211 (κ² n⁻⁴ Φ_D J)^(1/6). That number
 * is not used here — it is what fret.test.ts checks this derivation against,
 * which is the point: an external reference beats a self-consistent test, and
 * a constant typed in from memory is exactly how milestone 24 lost a day.
 */
export const FORSTER_PREFACTOR_NM6 =
  ((9000 * Math.LN10) / (128 * Math.PI ** 5 * AVOGADRO)) * NM2_PER_CM2;

/**
 * Spectral overlap integral J, in M⁻¹cm⁻¹nm⁴.
 *
 *     J = ∫ F_D(λ) ε_A(λ) λ⁴ dλ / ∫ F_D(λ) dλ
 *
 * F_D is the donor emission; its normalisation cancels, so the peak-normalised
 * curve stored in the dataset gives the same answer as a photon-count spectrum
 * would. ε_A is the acceptor's extinction coefficient at each wavelength,
 * recovered by scaling its peak-normalised excitation spectrum.
 *
 * That last step is exact where the stored curve is a true absorption spectrum
 * and approximate where it is an excitation spectrum, since a molecule that
 * absorbs without emitting still accepts energy. `Fluorophore.exFromAbsorption`
 * records which is held, and the tool reports it.
 */
export function overlapIntegral(donor: Fluorophore, acceptor: Fluorophore): number {
  if (acceptor.extCoeff === null) {
    throw new FretError(
      `${acceptor.name} has no published extinction coefficient, so the overlap integral cannot ` +
        'be put on an absolute scale. Choose a different acceptor.',
    );
  }

  // Only the donor's emission range contributes: outside it F_D is zero.
  const [from, to] = spectrumRange(donor.em);
  const numerator = integrate(
    (nm) =>
      sampleSpectrum(donor.em, nm) * acceptor.extCoeff! * sampleSpectrum(acceptor.ex, nm) * nm ** 4,
    from,
    to,
  );
  const denominator = spectrumArea(donor.em);
  return denominator > 0 ? numerator / denominator : 0;
}

export interface ForsterInput {
  /** Overlap integral, M⁻¹cm⁻¹nm⁴. */
  overlap: number;
  /** Donor quantum yield in the absence of acceptor. */
  donorQuantumYield: number;
  /** Orientation factor κ². 2/3 for free rotation. */
  kappaSquared: number;
  /** Refractive index of the medium between the pair. */
  refractiveIndex: number;
}

/** Förster radius in nanometres — the separation giving 50% transfer. */
export function forsterRadius(input: ForsterInput): number {
  const { overlap, donorQuantumYield, kappaSquared, refractiveIndex } = input;

  if (!(donorQuantumYield > 0 && donorQuantumYield <= 1)) {
    throw new FretError('The donor quantum yield must be between 0 and 1.');
  }
  if (!(kappaSquared >= 0 && kappaSquared <= 4)) {
    throw new FretError(
      'κ² lies between 0 and 4 by definition — 0 for perpendicular dipoles, 4 for collinear ones.',
    );
  }
  if (!(refractiveIndex >= 1)) {
    throw new FretError('The refractive index cannot be below 1.');
  }
  if (!(overlap > 0)) {
    throw new FretError(
      'These two do not overlap: the donor emits nothing where the acceptor absorbs, so no ' +
        'transfer is possible at any distance.',
    );
  }

  return Math.pow(
    (FORSTER_PREFACTOR_NM6 * kappaSquared * donorQuantumYield * overlap) / refractiveIndex ** 4,
    1 / 6,
  );
}

/** Transfer efficiency at separation `nm`. E = 1 / (1 + (r/R₀)⁶). */
export function transferEfficiency(separation: number, forsterRadiusNm: number): number {
  if (!(separation >= 0)) throw new FretError('A separation cannot be negative.');
  if (!(forsterRadiusNm > 0)) throw new FretError('The Förster radius must be positive.');
  if (separation === 0) return 1;
  return 1 / (1 + (separation / forsterRadiusNm) ** 6);
}

/** The separation giving a stated efficiency. The inverse of the above. */
export function separationForEfficiency(efficiency: number, forsterRadiusNm: number): number {
  if (!(efficiency > 0 && efficiency < 1)) {
    throw new FretError('Efficiency must be above 0 and below 1 for a finite separation.');
  }
  return forsterRadiusNm * Math.pow(1 / efficiency - 1, 1 / 6);
}

/**
 * Orientation factor presets.
 *
 * κ² = 2/3 is the dynamic isotropic average and is what essentially every
 * published R₀ assumes. It is justified when both dipoles rotate freely and
 * fast compared with the donor lifetime, which is a reasonable claim for a dye
 * on a long linker and a poor one for a fluorescent protein, whose chromophore
 * is rigidly held inside a β-barrel. The uncertainty this introduces enters R₀
 * only as the sixth root, which is the saving grace: the full range 0 to 4
 * moves R₀ by a factor of about 2.9, and the plausible range for a tethered
 * protein pair moves it by well under 20%.
 */
export const KAPPA_SQUARED_PRESETS = [
  {
    id: 'dynamic',
    name: 'Free rotation (2/3)',
    value: 2 / 3,
    guidance:
      'The dynamic isotropic average, and the assumption behind every published Förster radius. Sound for dyes on flexible linkers.',
  },
  {
    id: 'static',
    name: 'Random but static (0.476)',
    value: 0.476,
    guidance:
      'Dipoles randomly oriented but frozen over the donor lifetime. Note this is ⟨|κ|⟩², not ⟨κ²⟩ — the mean of κ² is 2/3 whether or not the dipoles move, and it is the averaging that differs.',
  },
  {
    id: 'collinear',
    name: 'Collinear (4)',
    value: 4,
    guidance:
      'The theoretical maximum, with both dipoles aligned head to tail. An upper bound for a worst case, not a working value.',
  },
] as const;

/**
 * Refractive index presets. R₀ goes as n^(-2/3), so the difference between
 * water and cytoplasm is a couple of per cent — worth offering, not worth
 * agonising over.
 */
export const REFRACTIVE_INDEX_PRESETS = [
  { id: 'water', name: 'Aqueous buffer (1.33)', value: 1.33 },
  { id: 'cytoplasm', name: 'Cytoplasm (1.37)', value: 1.37 },
  { id: 'protein', name: 'Protein interior (1.4)', value: 1.4 },
] as const;
