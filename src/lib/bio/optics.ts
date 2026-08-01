/**
 * Filters, light sources and detection channels.
 *
 * THE MODEL, stated once here because every number downstream inherits it.
 *
 * Filters are described analytically from the designation printed on the ring
 * — "525/50", "495 LP" — rather than from a measured transmission curve. That
 * is a deliberate trade. A curve library would be more faithful to one
 * vendor's part and useless for the filter actually in the turret; a passband
 * model works for any filter anyone can name, which is what makes the tool
 * usable at all. Two consequences follow, and both are surfaced in the
 * interface rather than left here:
 *
 *   - Out-of-band transmission is taken as zero. Real hard-coated filters
 *     block to OD5 or OD6, so this is optimistic by roughly one part in 10⁵ —
 *     negligible beside in-band spectral overlap, which is where cross-talk
 *     actually comes from, and which this does model.
 *   - Edges are finite but idealised: a raised cosine over EDGE_FRACTION of
 *     the edge wavelength, passing through 50% at the nominal edge, which is
 *     what a catalogue number means. A real edge is steeper at the top and
 *     has ripple; neither changes an integral over a 40 nm band appreciably.
 *
 * Canonical units: nanometres, and transmission as a fraction of one.
 */

import {
  SPECTRUM_STEP,
  integrate,
  sampleSpectrum,
  spectrumArea,
  spectrumRange,
  type Fluorophore,
} from './spectra';

export class OpticsError extends Error {}

export type FilterKind = 'bandpass' | 'longpass' | 'shortpass';

export interface OpticalFilter {
  kind: FilterKind;
  /** As the user wrote it, so the interface can echo it back unaltered. */
  label: string;
  /** Bandpass centre, or the 50% edge of a long- or shortpass. */
  centre: number;
  /** Full width at half maximum. Zero for edge filters. */
  width: number;
  /** Peak transmission. Catalogue parts are 90–98%; the default is 0.95. */
  peak: number;
}

/**
 * Edge steepness as a fraction of the edge wavelength — 1% is 5 nm at 500 nm,
 * which is what a modern hard-coated filter achieves. Older soft-coated and
 * dyed-glass filters are several times worse.
 */
export const EDGE_FRACTION = 0.01;

const DEFAULT_PEAK = 0.95;

/**
 * Transmission at a wavelength, 0 to `peak`.
 *
 * The transition is a raised cosine rather than a straight ramp because it has
 * to be continuous at both ends: a linear edge has corners, and a corner in
 * the integrand shows up as a kink in an efficiency plotted against filter
 * position, which reads as a bug in the tool rather than a feature of the
 * model.
 */
export function transmission(filter: OpticalFilter, nm: number): number {
  const edgeWidth = Math.max(1, filter.centre * EDGE_FRACTION);

  const risingAt = (edge: number) => softStep((nm - edge) / edgeWidth);
  const fallingAt = (edge: number) => softStep((edge - nm) / edgeWidth);

  switch (filter.kind) {
    case 'longpass':
      return filter.peak * risingAt(filter.centre);
    case 'shortpass':
      return filter.peak * fallingAt(filter.centre);
    case 'bandpass': {
      const half = filter.width / 2;
      return filter.peak * risingAt(filter.centre - half) * fallingAt(filter.centre + half);
    }
  }
}

/** 0 below −0.5, 1 above +0.5, raised cosine between. */
function softStep(x: number): number {
  if (x <= -0.5) return 0;
  if (x >= 0.5) return 1;
  return 0.5 * (1 + Math.sin(Math.PI * x));
}

/** Combined transmission of a stack — an emission filter behind a dichroic. */
export function stackTransmission(filters: readonly OpticalFilter[], nm: number): number {
  let total = 1;
  for (const filter of filters) total *= transmission(filter, nm);
  return total;
}

const BANDPASS = /(\d{3,4})\s*[/x×]\s*(\d{1,3})/;
const EDGE = /(?:^|[^\d])(\d{3,4})\s*(lp|sp)|(?:^|\b)(lp|sp)\s*(\d{3,4})/i;

/**
 * Read a filter designation.
 *
 * Accepts what is actually written on parts and in methods sections:
 * "525/50", "ET525/50m", "FF01-525/50-25", "495LP", "LP 495", "T495lpxr",
 * "690/50m". Refuses a bare number rather than guessing — "525" alone could be
 * a bandpass centre or a longpass edge, and the two differ by everything.
 */
export function parseFilter(input: string): OpticalFilter {
  const text = input.trim();
  if (!text) throw new OpticsError('Enter a filter, such as 525/50 or 495 LP.');

  const band = BANDPASS.exec(text);
  if (band) {
    const centre = Number(band[1]);
    const width = Number(band[2]);
    if (width < 2) {
      throw new OpticsError(`A ${width} nm passband is narrower than any catalogue filter.`);
    }
    assertVisible(centre);
    return { kind: 'bandpass', label: text, centre, width, peak: DEFAULT_PEAK };
  }

  const edge = EDGE.exec(text);
  if (edge) {
    const centre = Number(edge[1] ?? edge[4]);
    const type = (edge[2] ?? edge[3] ?? '').toLowerCase();
    assertVisible(centre);
    return {
      kind: type === 'sp' ? 'shortpass' : 'longpass',
      label: text,
      centre,
      width: 0,
      peak: DEFAULT_PEAK,
    };
  }

  throw new OpticsError(
    `Could not read "${text}". Write a bandpass as centre/width (525/50) and an edge filter ` +
      'with LP or SP (495 LP, 680 SP). A number on its own is ambiguous.',
  );
}

function assertVisible(nm: number): void {
  if (nm < 200 || nm > 1200) {
    throw new OpticsError(`${nm} nm is outside the range these tools cover (200–1200 nm).`);
  }
}

/** Where the light comes from. A laser line is monochromatic; a lamp is not. */
export type Illumination =
  { kind: 'laser'; nm: number } | { kind: 'filtered'; filter: OpticalFilter };

/**
 * Common laser lines, as fitted to real instruments. Offered as a starting
 * point; any wavelength can be typed.
 */
export const LASER_LINES: readonly number[] = [405, 445, 488, 514, 561, 594, 633, 640, 730];

/**
 * The fraction of peak absorptivity the illumination reaches.
 *
 * For a laser this is just the excitation spectrum read at the line, which is
 * the number everyone means by "how well does 488 excite mCherry".
 *
 * For a filtered lamp it is the same quantity averaged over the passband,
 * weighted by transmission — which ASSUMES A FLAT SOURCE across that band. A
 * metal-halide or LED source is not flat, and the interface says so. The
 * alternative, shipping lamp spectra, would make the number right for one lamp
 * and wrong for every other.
 *
 * Multiply by the extinction coefficient and this is ε at the working
 * wavelength, which is why it is defined against the peak rather than against
 * the area under the excitation spectrum.
 */
export function excitationEfficiency(fluorophore: Fluorophore, source: Illumination): number {
  if (source.kind === 'laser') return sampleSpectrum(fluorophore.ex, source.nm);

  const filter = source.filter;
  const [from, to] = bandOf(filter);
  const weighted = integrate(
    (nm) => sampleSpectrum(fluorophore.ex, nm) * transmission(filter, nm),
    from,
    to,
  );
  const total = integrate((nm) => transmission(filter, nm), from, to);
  return total > 0 ? weighted / total : 0;
}

/**
 * The fraction of emitted photons that get through to the detector.
 *
 * Unambiguous, unlike excitation efficiency: the emission spectrum is a
 * probability distribution over wavelength, and this is its integral against
 * the transmission of everything in the path.
 */
export function collectionEfficiency(
  fluorophore: Fluorophore,
  filters: readonly OpticalFilter[],
): number {
  const [from, to] = spectrumRange(fluorophore.em);
  const collected = integrate(
    (nm) => sampleSpectrum(fluorophore.em, nm) * stackTransmission(filters, nm),
    from,
    to,
  );
  const emitted = spectrumArea(fluorophore.em);
  return emitted > 0 ? collected / emitted : 0;
}

/** The wavelength span a filter passes anything at, padded past its edges. */
function bandOf(filter: OpticalFilter): [number, number] {
  const edgeWidth = Math.max(1, filter.centre * EDGE_FRACTION);
  if (filter.kind === 'bandpass') {
    return [
      filter.centre - filter.width / 2 - edgeWidth,
      filter.centre + filter.width / 2 + edgeWidth,
    ];
  }
  if (filter.kind === 'longpass') return [filter.centre - edgeWidth, 1200];
  return [200, filter.centre + edgeWidth];
}

/** One detection channel: how it is lit, and what reaches the camera. */
export interface Channel {
  id: string;
  label: string;
  illumination: Illumination;
  /** Dichroic and emission filter, in any order — they multiply. */
  emission: OpticalFilter[];
}

export interface ChannelResponse {
  /**
   * Excitation efficiency times collection efficiency. Purely spectral, and
   * therefore free of every assumption about how much protein is expressed or
   * how bright the fluorophore is.
   */
  spectral: number;
  excitation: number;
  collection: number;
  /**
   * ε × Φ × spectral, in units of 1000 — signal per molecule in this channel.
   * Undefined where the fluorophore has no published extinction coefficient or
   * quantum yield, which is true of several older dyes.
   */
  detected?: number;
}

export function channelResponse(fluorophore: Fluorophore, channel: Channel): ChannelResponse {
  const excitation = excitationEfficiency(fluorophore, channel.illumination);
  const collection = collectionEfficiency(fluorophore, channel.emission);
  const spectral = excitation * collection;

  const detected =
    fluorophore.extCoeff !== null && fluorophore.quantumYield !== null
      ? (fluorophore.extCoeff * fluorophore.quantumYield * spectral) / 1000
      : undefined;

  return { spectral, excitation, collection, detected };
}

export interface Bleedthrough {
  /** The channel this fluorophore is meant to be seen in — its strongest. */
  homeChannelId: string;
  /** Response in each channel, keyed by channel id. */
  responses: Record<string, ChannelResponse>;
  /**
   * Response in each channel as a fraction of the home channel. Independent of
   * expression level and of the fluorophore's brightness, because both cancel:
   * this is the same molecule seen two ways.
   */
  relative: Record<string, number>;
}

/**
 * How much of one fluorophore appears in each channel.
 *
 * This is the assumption-free half of panel design, and the half worth leading
 * with. Whether channel B is *ruined* depends on how much of each fluorophore
 * is present, which nobody knows; whether fluorophore A puts 30% of its signal
 * into channel B is a property of the optics and the molecule alone.
 */
export function bleedthrough(
  fluorophore: Fluorophore,
  channels: readonly Channel[],
): Bleedthrough | undefined {
  if (channels.length === 0) return undefined;

  const responses: Record<string, ChannelResponse> = {};
  let home = channels[0]!;
  let best = -Infinity;

  for (const channel of channels) {
    const response = channelResponse(fluorophore, channel);
    responses[channel.id] = response;
    if (response.spectral > best) {
      best = response.spectral;
      home = channel;
    }
  }

  const relative: Record<string, number> = {};
  for (const channel of channels) {
    relative[channel.id] = best > 0 ? (responses[channel.id]?.spectral ?? 0) / best : 0;
  }

  return { homeChannelId: home.id, responses, relative };
}

export interface ChannelComposition {
  channelId: string;
  /** Fraction of the channel's signal contributed by each fluorophore id. */
  shares: { fluorophoreId: string; share: number }[];
  /** Fluorophores left out because their ε or Φ is not published. */
  excludedIds: string[];
}

/**
 * What each channel is actually looking at, assuming EQUAL MOLAR AMOUNTS of
 * every fluorophore.
 *
 * That assumption is doing a great deal of work and is almost never true — a
 * strong promoter and a knock-in tag can differ by two orders of magnitude,
 * which swamps any of this. It is stated on the page next to the number for
 * that reason. The bleed-through figures above carry no such assumption and
 * should be believed further.
 */
export function channelComposition(
  fluorophores: readonly Fluorophore[],
  channels: readonly Channel[],
): ChannelComposition[] {
  const usable = fluorophores.filter((f) => f.extCoeff !== null && f.quantumYield !== null);
  const excludedIds = fluorophores.filter((f) => !usable.includes(f)).map((f) => f.id);

  return channels.map((channel) => {
    const contributions = usable.map((fluorophore) => ({
      fluorophoreId: fluorophore.id,
      signal: channelResponse(fluorophore, channel).detected ?? 0,
    }));
    const total = contributions.reduce((sum, c) => sum + c.signal, 0);

    return {
      channelId: channel.id,
      shares: contributions
        .map((c) => ({ fluorophoreId: c.fluorophoreId, share: total > 0 ? c.signal / total : 0 }))
        .sort((a, b) => b.share - a.share),
      excludedIds,
    };
  });
}

/**
 * Where a fluorophore's excitation and emission curves cross, between the two
 * maxima. This is the conventional place to put a dichroic edge: below it the
 * molecule absorbs more than it emits, above it the reverse.
 */
export function crossoverWavelength(fluorophore: Fluorophore): number {
  const from = fluorophore.exMax ?? spectrumRange(fluorophore.ex)[1];
  const to = fluorophore.emMax ?? spectrumRange(fluorophore.em)[0];
  if (!(to > from)) return (from + to) / 2;

  let crossing = (from + to) / 2;
  let smallest = Infinity;
  for (let nm = from; nm <= to; nm += 1) {
    const gap = Math.abs(sampleSpectrum(fluorophore.ex, nm) - sampleSpectrum(fluorophore.em, nm));
    if (gap < smallest) {
      smallest = gap;
      crossing = nm;
    }
  }
  return crossing;
}

/** Passband widths that exist as catalogue parts. Used when suggesting a set. */
const CATALOGUE_WIDTHS: readonly number[] = [10, 20, 25, 30, 40, 50, 60, 70, 80];

/** Clearance either side of the dichroic edge, nm — enough that the two
 *  raised-cosine transitions do not overlap. */
const GUARD = 5;

export interface SuggestedFilterSet {
  excitation: OpticalFilter;
  dichroic: OpticalFilter;
  emission: OpticalFilter;
  excitationEfficiency: number;
  collectionEfficiency: number;
}

/**
 * A filter set derived from the fluorophore's own spectra.
 *
 * Computed rather than quoted from a vendor catalogue, which is the point:
 * catalogue cubes are named for the dye they were sold for, and a set chosen
 * for mNeonGreen is not the set sold as "GFP". The dichroic goes at the
 * crossover; each passband is then the catalogue width and centre that
 * collects the most light on its own side of it.
 */
export function suggestFilterSet(fluorophore: Fluorophore): SuggestedFilterSet {
  const edge = Math.round(crossoverWavelength(fluorophore));
  const dichroic: OpticalFilter = {
    kind: 'longpass',
    label: `${edge} LP`,
    centre: edge,
    width: 0,
    peak: DEFAULT_PEAK,
  };

  const excitation = bandFromEdge(fluorophore.ex, edge - GUARD, 'below');
  const emission = bandFromEdge(fluorophore.em, edge + GUARD, 'above');

  return {
    excitation,
    dichroic,
    emission,
    excitationEfficiency: excitationEfficiency(fluorophore, {
      kind: 'filtered',
      filter: excitation,
    }),
    collectionEfficiency: collectionEfficiency(fluorophore, [dichroic, emission]),
  };
}

/**
 * Where a passband stops, as a fraction of the curve's peak.
 *
 * Maximising captured light would always return the widest filter in the
 * catalogue, since a wider band never captures less. Width has a cost, and the
 * two sides of the cube pay a different one, which is why these differ rather
 * than being one tidy constant:
 *
 *   - Excitation light delivered where the fluorophore barely absorbs excites
 *     everything else in the sample instead — autofluorescence, and the other
 *     labels. The band is therefore cut at half maximum.
 *   - Emission light off the peak is the fluorophore's own signal, and a
 *     photon in the tail is worth exactly as much as one at the maximum. The
 *     band is cut far lower, and catalogue emission filters are correspondingly
 *     wider than the emission peak looks.
 *
 * EGFP is the case that settles the excitation figure: its protonated
 * chromophore puts a shoulder near 400 nm that never drops below a fifth of
 * peak, so a threshold of 0.2 returns an 80 nm filter spanning both bands.
 */
const EXCITATION_THRESHOLD = 0.5;
const EMISSION_THRESHOLD = 0.2;

/**
 * The passband running from a dichroic edge out to where `spectrum` falls to
 * its threshold, snapped to a width that exists as a real part.
 *
 * Deriving both filters from one rule with one number each is what keeps the
 * suggestion explicable: there are two thresholds to disagree with, and the
 * interface prints both.
 */
function bandFromEdge(
  spectrum: { start: number; values: number[] },
  edge: number,
  side: 'below' | 'above',
): OpticalFilter {
  const [rangeLow, rangeHigh] = spectrumRange(spectrum);
  const peak = Math.max(...spectrum.values);
  const cutoff = peak * (side === 'below' ? EXCITATION_THRESHOLD : EMISSION_THRESHOLD);
  const peakNm = spectrum.start + spectrum.values.indexOf(peak) * SPECTRUM_STEP;

  // Walk outwards from the peak, not inwards from the end of the data. Several
  // fluorescent proteins have a second absorption band far to the blue — EGFP's
  // protonated chromophore sits near 400 nm at about a fifth of peak — and a
  // scan from the blue end stops there and returns a filter 80 nm wide centred
  // on the gap between the two.
  let outer = side === 'below' ? Math.min(peakNm, edge) : Math.max(peakNm, edge);
  const stride = side === 'below' ? -1 : 1;
  for (let nm = outer; nm >= rangeLow && nm <= rangeHigh; nm += stride) {
    if (sampleSpectrum(spectrum, nm) < cutoff) break;
    outer = nm;
  }

  const low = side === 'below' ? Math.min(outer, edge) : edge;
  const high = side === 'below' ? edge : Math.max(outer, edge);

  const span = Math.max(high - low, CATALOGUE_WIDTHS[0]!);
  // Nearest catalogue width rather than the next one up: rounding a 51 nm span
  // to 60 pushes the far edge 5 nm into spectrum the threshold had excluded.
  const width = CATALOGUE_WIDTHS.reduce((best, w) =>
    Math.abs(w - span) < Math.abs(best - span) ? w : best,
  );

  // Anchor the band on the dichroic side and let the snapped width fall away
  // from it, so widening to a catalogue size can never push the filter back
  // across the edge it was placed to avoid.
  const centre = side === 'below' ? edge - width / 2 : edge + width / 2;

  return {
    kind: 'bandpass',
    label: `${Math.round(centre)}/${width}`,
    centre: Math.round(centre),
    width,
    peak: DEFAULT_PEAK,
  };
}
