/**
 * Spectrum primitives.
 *
 * Everything downstream — filter efficiencies, channel cross-talk, Förster
 * radii — is an integral of a product of spectra, so all of it rests on two
 * operations: read a stored spectrum at an arbitrary wavelength, and integrate
 * a function of wavelength over a range.
 *
 * Canonical units: wavelength in nanometres throughout. Spectra are
 * peak-normalised and dimensionless; the extinction coefficient that turns an
 * excitation spectrum into ε(λ) is applied by the caller, not stored here.
 */

import {
  FLUOROPHORES,
  SPECTRUM_STEP,
  type EncodedSpectrum,
  type Fluorophore,
} from './fluorophores';

export type { EncodedSpectrum, Fluorophore, FluorophoreKind } from './fluorophores';
export { FLUOROPHORES, SPECTRUM_STEP } from './fluorophores';

/**
 * Integration grid, nanometres.
 *
 * Finer than the 2 nm the data is stored on, because the other factor in most
 * of these integrals is a filter edge, which is modelled analytically and can
 * be as steep as the optics vendor cares to make it. Interpolating smooth
 * fluorophore spectra onto a finer grid is free of error in a way that
 * sampling a step function on a coarse one is not.
 */
export const INTEGRATION_STEP = 1;

const BY_ID = new Map(FLUOROPHORES.map((f) => [f.id, f]));

export function getFluorophore(id: string): Fluorophore | undefined {
  return BY_ID.get(id);
}

/** Inclusive wavelength bounds of the stored data, nm. */
export function spectrumRange(spectrum: EncodedSpectrum): [number, number] {
  return [spectrum.start, spectrum.start + (spectrum.values.length - 1) * SPECTRUM_STEP];
}

/**
 * Value at a wavelength, linearly interpolated; zero outside the stored range.
 *
 * Reading zero past the ends is the right answer rather than a convenience:
 * the dataset trims where a normalised spectrum falls below 0.001, so outside
 * the range the true value is not merely unknown but known to be negligible.
 */
export function sampleSpectrum(spectrum: EncodedSpectrum, nm: number): number {
  const offset = (nm - spectrum.start) / SPECTRUM_STEP;
  if (offset < 0 || offset > spectrum.values.length - 1) return 0;

  const lower = Math.floor(offset);
  const upper = Math.min(lower + 1, spectrum.values.length - 1);
  const fraction = offset - lower;
  const a = spectrum.values[lower] ?? 0;
  const b = spectrum.values[upper] ?? 0;
  return a + (b - a) * fraction;
}

/**
 * Trapezoid integral of `f` from `from` to `to` on the integration grid.
 *
 * Trapezoid rather than Simpson because the integrands here contain filter
 * edges, and a higher-order rule buys accuracy only on a function whose
 * derivatives exist. On a step it does not, and Simpson's alternating weights
 * make the answer depend on which side of the grid the edge lands.
 */
export function integrate(f: (nm: number) => number, from: number, to: number): number {
  if (!(to > from)) return 0;
  const steps = Math.max(1, Math.round((to - from) / INTEGRATION_STEP));
  const width = (to - from) / steps;

  let total = (f(from) + f(to)) / 2;
  for (let i = 1; i < steps; i += 1) total += f(from + i * width);
  return total * width;
}

/** Area under a stored spectrum, over exactly the range it covers. */
export function spectrumArea(spectrum: EncodedSpectrum): number {
  const [from, to] = spectrumRange(spectrum);
  return integrate((nm) => sampleSpectrum(spectrum, nm), from, to);
}

/**
 * A display colour for a wavelength.
 *
 * This is a UI convention, not colorimetry. It interpolates a hand-picked ramp
 * of anchor colours chosen to stay legible on the near-black surface the site
 * uses — a true CIE conversion renders 400 nm as something almost exactly the
 * colour of the page background, and 700 nm as a red so dark the curve
 * disappears. Nothing scientific is claimed for it and nothing computed
 * depends on it.
 */
const COLOUR_ANCHORS: readonly [number, [number, number, number]][] = [
  [350, [140, 100, 220]],
  [400, [120, 110, 245]],
  [440, [70, 150, 255]],
  [470, [40, 200, 250]],
  [495, [40, 225, 180]],
  [510, [80, 230, 90]],
  [540, [160, 225, 60]],
  [565, [235, 210, 50]],
  [590, [250, 160, 50]],
  [615, [255, 105, 75]],
  [645, [250, 80, 110]],
  [680, [230, 90, 150]],
  [720, [200, 110, 180]],
  [800, [170, 130, 190]],
];

export function wavelengthColour(nm: number): string {
  const first = COLOUR_ANCHORS[0]!;
  const last = COLOUR_ANCHORS[COLOUR_ANCHORS.length - 1]!;
  if (nm <= first[0]) return toHex(first[1]);
  if (nm >= last[0]) return toHex(last[1]);

  for (let i = 1; i < COLOUR_ANCHORS.length; i += 1) {
    const lower = COLOUR_ANCHORS[i - 1]!;
    const upper = COLOUR_ANCHORS[i]!;
    if (nm > upper[0]) continue;
    const t = (nm - lower[0]) / (upper[0] - lower[0]);
    return toHex([
      Math.round(lower[1][0] + t * (upper[1][0] - lower[1][0])),
      Math.round(lower[1][1] + t * (upper[1][1] - lower[1][1])),
      Math.round(lower[1][2] + t * (upper[1][2] - lower[1][2])),
    ]);
  }
  return toHex(last[1]);
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The colour a fluorophore is drawn in: its emission, which is what you see. */
export function fluorophoreColour(fluorophore: Fluorophore): string {
  return wavelengthColour(fluorophore.emMax ?? 550);
}

/**
 * Molar extinction coefficient at a wavelength, M⁻¹cm⁻¹.
 *
 * The stored excitation spectrum is peak-normalised, so scaling it by the
 * quoted coefficient recovers ε(λ) — exact when the stored curve is a true
 * absorption spectrum, and an approximation when it is an excitation spectrum,
 * which differs wherever some molecules absorb without emitting. `Fluorophore`
 * records which one it holds, and tools that depend on the distinction say so.
 */
export function extinctionAt(fluorophore: Fluorophore, nm: number): number | undefined {
  if (fluorophore.extCoeff === null) return undefined;
  return fluorophore.extCoeff * sampleSpectrum(fluorophore.ex, nm);
}

/**
 * Molecular brightness, ε × Φ, conventionally quoted in units of 1000.
 *
 * This is the fluorophore's own property, before any microscope touches it —
 * the number FPbase and every protein paper tabulate.
 */
export function molecularBrightness(fluorophore: Fluorophore): number | undefined {
  if (fluorophore.extCoeff === null || fluorophore.quantumYield === null) return undefined;
  return (fluorophore.extCoeff * fluorophore.quantumYield) / 1000;
}

/** Emission minus excitation maximum, nm. Large shifts are what let two
 *  fluorophores share an excitation line and still be separated. */
export function stokesShift(fluorophore: Fluorophore): number | undefined {
  if (fluorophore.exMax === null || fluorophore.emMax === null) return undefined;
  return fluorophore.emMax - fluorophore.exMax;
}
