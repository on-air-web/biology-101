/**
 * FRET pair assessment.
 *
 * The Förster maths is in src/lib/bio/fret.ts. What this module adds is the
 * part that decides whether a pair is usable in practice rather than on paper:
 * a large R₀ is worth nothing if the acceptor is directly excited by the donor
 * line, or the donor's emission floods the acceptor channel, and those two
 * problems are what actually sink a ratiometric FRET experiment.
 *
 * Canonical units: nanometres for wavelength and distance.
 */

import {
  FretError,
  forsterRadius,
  overlapIntegral,
  separationForEfficiency,
  transferEfficiency,
} from '@/lib/bio/fret';
import { collectionEfficiency, parseFilter, type OpticalFilter } from '@/lib/bio/optics';
import { sampleSpectrum, type Fluorophore } from '@/lib/bio/spectra';

export { FretError } from '@/lib/bio/fret';

export interface FretInput {
  donor: Fluorophore;
  acceptor: Fluorophore;
  kappaSquared: number;
  refractiveIndex: number;
  /** Separation to evaluate, nm. */
  separation: number;
  /** Emission filter used for the acceptor channel, as typed. Optional. */
  acceptorFilter?: string;
}

export interface FretResult {
  overlap: number;
  forsterRadius: number;
  efficiency: number;
  /** Separations giving 10% and 90% transfer — the useful working range. */
  workingRange: [number, number];
  /** E against separation, for the curve. */
  curve: { separation: number; efficiency: number }[];
  /** Donor excitation at the acceptor's maximum, and the reverse. */
  directAcceptorExcitation: number;
  donorBleedIntoAcceptorChannel?: number;
  concerns: string[];
  /** The donor's own excitation maximum, the line a FRET experiment uses. */
  donorLine: number;
}

/**
 * Direct excitation of the acceptor at the donor's excitation maximum.
 *
 * The single largest artefact in intensity-based FRET. Light meant for the
 * donor also excites the acceptor, which then emits in the acceptor channel
 * without any transfer having taken place — and it looks exactly like FRET.
 */
export function directAcceptorExcitation(donor: Fluorophore, acceptor: Fluorophore): number {
  if (donor.exMax === null) return 0;
  return sampleSpectrum(acceptor.ex, donor.exMax);
}

const CURVE_POINTS = 90;

export function assessPair(input: FretInput): FretResult {
  const { donor, acceptor, kappaSquared, refractiveIndex, separation } = input;

  if (donor.quantumYield === null) {
    throw new FretError(
      `${donor.name} has no published quantum yield, and the Förster radius is proportional to ` +
        'it. Choose a different donor.',
    );
  }
  if (!Number.isFinite(separation) || separation <= 0) {
    throw new FretError('The separation must be greater than zero.');
  }

  const overlap = overlapIntegral(donor, acceptor);
  const radius = forsterRadius({
    overlap,
    donorQuantumYield: donor.quantumYield,
    kappaSquared,
    refractiveIndex,
  });

  const curve: FretResult['curve'] = [];
  const maxSeparation = Math.max(radius * 2.5, separation * 1.2);
  for (let i = 0; i <= CURVE_POINTS; i += 1) {
    const r = (maxSeparation * i) / CURVE_POINTS;
    curve.push({ separation: r, efficiency: transferEfficiency(r, radius) });
  }

  let acceptorFilter: OpticalFilter | undefined;
  if (input.acceptorFilter?.trim()) {
    // Let a bad filter throw: an acceptor channel the user believes in but
    // that was mistyped is worse than an error.
    acceptorFilter = parseFilter(input.acceptorFilter);
  }

  const direct = directAcceptorExcitation(donor, acceptor);
  const donorBleed = acceptorFilter
    ? collectionEfficiency(donor, [acceptorFilter]) /
      Math.max(collectionEfficiency(acceptor, [acceptorFilter]), 1e-9)
    : undefined;

  return {
    overlap,
    forsterRadius: radius,
    efficiency: transferEfficiency(separation, radius),
    workingRange: [separationForEfficiency(0.9, radius), separationForEfficiency(0.1, radius)],
    curve,
    directAcceptorExcitation: direct,
    donorBleedIntoAcceptorChannel: donorBleed,
    concerns: findConcerns(donor, acceptor, radius, direct, donorBleed),
    donorLine: donor.exMax ?? 0,
  };
}

function findConcerns(
  donor: Fluorophore,
  acceptor: Fluorophore,
  radius: number,
  direct: number,
  donorBleed: number | undefined,
): string[] {
  const concerns: string[] = [];

  if (direct > 0.15) {
    concerns.push(
      `Exciting the donor at ${donor.exMax} nm also excites ${acceptor.name} to ${(direct * 100).toFixed(0)}% of its maximum. That acceptor emission appears without any transfer and mimics FRET exactly — a sample expressing the acceptor alone is the control that measures it.`,
    );
  }

  if (donorBleed !== undefined && donorBleed > 0.1) {
    concerns.push(
      `${donor.name} contributes strongly to the acceptor channel through that filter. A donor-only sample is needed to subtract it, and a narrower or redder acceptor filter would reduce it.`,
    );
  }

  if (donor.quantumYield !== null && donor.quantumYield < 0.3) {
    concerns.push(
      `${donor.name} has a quantum yield of ${donor.quantumYield}. R₀ goes as the sixth root of it so the radius survives, but the donor signal you are measuring a decrease in is weak to start with.`,
    );
  }

  if (
    donor.emMax !== null &&
    acceptor.emMax !== null &&
    Math.abs(acceptor.emMax - donor.emMax) < 40
  ) {
    concerns.push(
      `The two emit only ${Math.abs(acceptor.emMax - donor.emMax)} nm apart, so donor and acceptor channels cannot be cleanly separated. This pair suits lifetime measurement on the donor far better than a ratiometric intensity measurement.`,
    );
  }

  if (radius < 4) {
    concerns.push(
      `An R₀ of ${radius.toFixed(1)} nm is short. Transfer will only be detectable over roughly ${(radius * 0.5).toFixed(1)} to ${(radius * 1.5).toFixed(1)} nm, which is a narrow window for a linker to land in.`,
    );
  }

  if (donor.exFromAbsorption || acceptor.exFromAbsorption) {
    const which = [donor, acceptor].filter((f) => f.exFromAbsorption).map((f) => f.name);
    concerns.push(
      `For ${which.join(' and ')} the dataset holds an absorption spectrum rather than a separate excitation spectrum. For the acceptor that is the more correct curve for this calculation; for the donor it slightly overstates the emitting population.`,
    );
  }

  return concerns;
}
