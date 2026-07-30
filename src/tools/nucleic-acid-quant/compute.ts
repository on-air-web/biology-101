/**
 * Nucleic acid concentration and purity from absorbance.
 *
 * A260 gives concentration through Beer–Lambert with a conversion factor that
 * depends on what the sample is: double-stranded DNA absorbs less per base
 * than single-stranded, because stacked bases in a duplex are hypochromic. The
 * factor is therefore a declared choice, not a constant — reading an RNA prep
 * against the dsDNA factor overstates it by a quarter.
 *
 * The ratios are the more useful half of the measurement and the part people
 * skip. A260 alone cannot tell a clean prep from one carrying half its mass in
 * phenol: both give a number. A260/A280 and A260/A230 are what say whether the
 * number means anything.
 *
 * Canonical units: g/L for concentration, litres for volume, centimetres for
 * path length.
 */

export class QuantError extends Error {}

export interface NucleicAcidKind {
  id: string;
  name: string;
  /** Concentration in µg/mL when A260 is 1.0 through a 1 cm path. */
  factor: number;
  /** Ratio a clean prep of this material should give at 260/280. */
  expected280: number;
  guidance: string;
}

export const KINDS: readonly NucleicAcidKind[] = [
  {
    id: 'dsdna',
    name: 'Double-stranded DNA',
    factor: 50,
    expected280: 1.8,
    guidance: 'Genomic DNA, plasmid preps, PCR products — anything duplex.',
  },
  {
    id: 'ssdna',
    name: 'Single-stranded DNA',
    factor: 33,
    expected280: 1.8,
    guidance:
      'Denatured DNA and long single-stranded material. Short oligos are better quantified from their own extinction coefficient than from a generic factor.',
  },
  {
    id: 'rna',
    name: 'RNA',
    factor: 40,
    expected280: 2.0,
    guidance: 'Total RNA and mRNA. A clean RNA prep reads higher at 260/280 than DNA does.',
  },
] as const;

export function getKind(id: string): NucleicAcidKind | undefined {
  return KINDS.find((kind) => kind.id === id);
}

/** Above this the detector leaves its reliable range and under-reports. */
export const LINEAR_CEILING = 1.0;

export interface QuantInput {
  /** Absorbance at 260 nm, as displayed by the instrument. */
  a260: number;
  a280?: number;
  a230?: number;
  kind: NucleicAcidKind;
  /** Fold dilution made before reading. 1 for neat. */
  dilutionFactor: number;
  /** Optical path, cm. A cuvette is 1; a microvolume instrument is far less. */
  pathLength: number;
  /** Volume of the whole sample, litres. Optional — gives total yield. */
  sampleVolume?: number;
}

export interface QuantResult {
  /** Concentration of the original sample, g/L. */
  concentration: number;
  /** A260 corrected to a 1 cm path, before the dilution factor. */
  correctedA260: number;
  ratio280?: number;
  ratio230?: number;
  /** Total nucleic acid in the sample, grams. */
  totalMass?: number;
  warnings: string[];
}

function requireFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) throw new QuantError(`${field} must be a number.`);
  return value;
}

export function quantify(input: QuantInput): QuantResult {
  const { kind } = input;
  const a260 = requireFinite(input.a260, 'The A260 reading');
  const dilutionFactor = requireFinite(input.dilutionFactor, 'The dilution factor');
  const pathLength = requireFinite(input.pathLength, 'The path length');

  if (dilutionFactor < 1) {
    throw new QuantError('The dilution factor is 1 for a neat sample, or more.');
  }
  if (pathLength <= 0) throw new QuantError('Path length must be greater than zero.');
  if (a260 < 0) throw new QuantError('Absorbance cannot be negative.');

  // Beer–Lambert is linear in path length, so normalise to 1 cm first. A
  // microvolume instrument reading 0.3 over 0.1 cm is really a 3.0 sample.
  const correctedA260 = a260 / pathLength;

  // The factor is quoted in µg/mL, which is 1e-3 g/L.
  const concentration = correctedA260 * kind.factor * 1e-3 * dilutionFactor;

  const ratio280 = input.a280 !== undefined && input.a280 > 0 ? a260 / input.a280 : undefined;
  const ratio230 = input.a230 !== undefined && input.a230 > 0 ? a260 / input.a230 : undefined;

  const warnings: string[] = [];

  if (a260 > LINEAR_CEILING) {
    warnings.push(
      `The instrument read ${a260.toFixed(3)}, which is past the top of its reliable range. Above about 1.0 the detector under-reports, so dilute and read again rather than trusting this figure.`,
    );
  } else if (a260 < 0.02) {
    warnings.push(
      'The reading is close to the blank, where a small baseline error is a large fraction of the answer. Concentrate the sample or use a fluorescent assay, which stays accurate far lower.',
    );
  }

  if (ratio280 !== undefined && ratio280 < kind.expected280 - 0.15) {
    warnings.push(
      `A260/A280 is ${ratio280.toFixed(2)} against about ${kind.expected280} for clean ${kind.name.toLowerCase()}. A low ratio usually means protein carried over, since protein absorbs at 280.`,
    );
  }

  if (ratio230 !== undefined && ratio230 < 1.8) {
    warnings.push(
      `A260/A230 is ${ratio230.toFixed(2)} against about 2.0 to 2.2 for a clean prep. A low ratio points to guanidine, phenol or carbohydrate carried through from the extraction — all of which inhibit downstream enzymes even when the concentration looks fine.`,
    );
  }

  return {
    concentration,
    correctedA260,
    ratio280,
    ratio230,
    totalMass: input.sampleVolume === undefined ? undefined : concentration * input.sampleVolume,
    warnings,
  };
}
