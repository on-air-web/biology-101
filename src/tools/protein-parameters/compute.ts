/**
 * Peptide parameters.
 *
 * Mass, composition, charge, isoelectric point and the 280 nm extinction
 * coefficient, from a sequence.
 *
 * Two things here are choices rather than facts, and both are exposed rather
 * than buried:
 *
 *   pKa set — two calculators disagreeing about a pI are almost always using
 *     different pKa sets. Reporting a pI without saying which set produced it
 *     is reporting a number nobody can reproduce.
 *
 *   cysteine state — the 280 nm coefficient counts disulfide bonds, not
 *     cysteines. A reduced protein and the same protein oxidised have
 *     different extinction coefficients, so a concentration from A280 is wrong
 *     by that ratio if the tool guesses.
 *
 * Canonical units: g/mol for mass, mol/L for concentration, M⁻¹cm⁻¹ for the
 * extinction coefficient.
 */

import { parseFormula } from '@/lib/formula';
import {
  EXTINCTION_280,
  MONOISOTOPIC,
  type PkaSet,
  getAminoAcid,
  AMINO_ACIDS,
} from '@/lib/bio/amino-acids';

export class PeptideError extends Error {}

/** Disulfides need two cysteines, and only form in an oxidising environment. */
export type CysteineState = 'reduced' | 'cystine';

export interface PeptideInput {
  sequence: string;
  pkaSet: PkaSet;
  cysteineState: CysteineState;
}

export interface ResidueCount {
  code: string;
  threeLetter: string;
  name: string;
  count: number;
  fraction: number;
}

export interface PeptideResult {
  residues: string;
  length: number;
  /** Average mass, from IUPAC atomic weights. */
  molarMass: number;
  /** Mass of the single most abundant isotopologue, for mass spectrometry. */
  monoisotopicMass: number;
  formula: string;
  composition: ResidueCount[];
  /** Molar extinction coefficient at 280 nm, M⁻¹cm⁻¹. */
  extinction280: number;
  /** A280 of a 1 mg/mL solution through 1 cm, the number a NanoDrop wants. */
  absorbance01Percent: number;
  disulfides: number;
  isoelectricPoint: number;
  /** Net charge at pH 7.0, the one worth seeing without asking. */
  chargeAtNeutral: number;
  /** Grand average of hydropathy. */
  gravy: number;
  aliphaticIndex: number;
  warnings: string[];
}

/**
 * Parses a sequence, tolerating what people actually paste.
 *
 * FASTA headers, whitespace, digits from a numbered listing and lower case all
 * get cleaned up. Anything else is refused rather than dropped: silently
 * discarding an unrecognised character would change the mass and the charge
 * without saying so, and a sequence with a typo in it is exactly when a wrong
 * answer is most expensive.
 */
export function parsePeptide(input: string): string {
  const withoutHeaders = input
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('>') && !line.startsWith(';'))
    .join('');

  const cleaned = withoutHeaders.replace(/[\s\d]/g, '').toUpperCase();
  if (cleaned === '') throw new PeptideError('Enter a peptide or protein sequence.');

  const unknown = [...new Set([...cleaned])].filter((character) => !getAminoAcid(character));
  if (unknown.length > 0) {
    const listed = unknown.map((character) => `"${character}"`).join(', ');
    throw new PeptideError(
      unknown.some((character) => 'BZJXU*-'.includes(character))
        ? `${listed} is not one of the twenty standard amino acids. Ambiguity codes, selenocysteine and gaps have no single mass or pKa, so they cannot be included in these figures.`
        : `${listed} is not an amino acid code.`,
    );
  }

  return cleaned;
}

/**
 * Net charge at a given pH, by Henderson–Hasselbalch over every ionisable
 * group. Positive groups are charged when protonated, negative ones when not.
 */
export function netCharge(residues: string, pH: number, set: PkaSet): number {
  const counts = new Map<string, number>();
  for (const code of residues) counts.set(code, (counts.get(code) ?? 0) + 1);

  const first = residues[0]!;
  const last = residues[residues.length - 1]!;
  const nTerm = set.nTerminusByResidue?.[first] ?? set.nTerminus;
  const cTerm = set.cTerminusByResidue?.[last] ?? set.cTerminus;

  // A basic group is protonated, and so positive, below its pKa.
  let charge = 1 / (1 + 10 ** (pH - nTerm));
  for (const [code, pKa] of Object.entries(set.basic)) {
    charge += (counts.get(code) ?? 0) / (1 + 10 ** (pH - pKa));
  }

  // An acidic group loses its proton, and so its charge, above its pKa.
  charge -= 1 / (1 + 10 ** (cTerm - pH));
  for (const [code, pKa] of Object.entries(set.acidic)) {
    charge -= (counts.get(code) ?? 0) / (1 + 10 ** (pKa - pH));
  }

  return charge;
}

/**
 * The pH at which net charge is zero, by bisection.
 *
 * Net charge falls monotonically with pH, so bisection cannot diverge and does
 * not care how many ionisable groups there are. Fifty iterations over 0–14
 * resolves to about 1e-14 of a pH unit, far past anything meaningful.
 */
export function isoelectricPoint(residues: string, set: PkaSet): number {
  let low = 0;
  let high = 14;
  for (let index = 0; index < 50; index += 1) {
    const mid = (low + high) / 2;
    if (netCharge(residues, mid, set) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Aliphatic index: relative volume occupied by aliphatic side chains, and a
 * reasonable proxy for thermostability in globular proteins.
 */
function aliphaticIndex(counts: Map<string, number>, length: number): number {
  const mole = (code: string) => (100 * (counts.get(code) ?? 0)) / length;
  return mole('A') + 2.9 * mole('V') + 3.9 * (mole('I') + mole('L'));
}

export function analysePeptide(input: PeptideInput): PeptideResult {
  const { pkaSet, cysteineState } = input;
  const residues = parsePeptide(input.sequence);
  const length = residues.length;

  const counts = new Map<string, number>();
  for (const code of residues) counts.set(code, (counts.get(code) ?? 0) + 1);

  // Sum the residue formulae, then add the water lost across every peptide
  // bond back once. Deriving mass from composition rather than storing it per
  // residue keeps this consistent with the molecular weight calculator.
  const elements: Record<string, number> = {};
  for (const [code, count] of counts) {
    const parsed = parseFormula(getAminoAcid(code)!.formula);
    for (const [element, atoms] of Object.entries(parsed.composition)) {
      elements[element] = (elements[element] ?? 0) + atoms * count;
    }
  }
  const water = parseFormula('H2O');
  for (const [element, atoms] of Object.entries(water.composition)) {
    elements[element] = (elements[element] ?? 0) + atoms;
  }

  const disulfides = cysteineState === 'cystine' ? Math.floor((counts.get('C') ?? 0) / 2) : 0;
  // Each disulfide costs two hydrogens.
  elements.H = (elements.H ?? 0) - disulfides * 2;

  const formula = Object.keys(elements)
    .sort((a, b) =>
      a === 'C' ? -1 : b === 'C' ? 1 : a === 'H' ? -1 : b === 'H' ? 1 : a < b ? -1 : 1,
    )
    .map((element) => `${element}${elements[element] === 1 ? '' : elements[element]}`)
    .join('');

  const molarMass = parseFormula(formula).molarMass;
  const monoisotopicMass = Object.entries(elements).reduce((total, [element, atoms]) => {
    const mass = MONOISOTOPIC[element];
    if (mass === undefined) throw new PeptideError(`No monoisotopic mass for ${element}.`);
    return total + mass * atoms;
  }, 0);

  const extinction280 =
    (counts.get('W') ?? 0) * EXTINCTION_280.W +
    (counts.get('Y') ?? 0) * EXTINCTION_280.Y +
    disulfides * EXTINCTION_280.cystine;

  const warnings: string[] = [];
  if (extinction280 === 0) {
    warnings.push(
      'No tryptophan, tyrosine or cystine, so this peptide does not absorb at 280 nm. A280 cannot measure its concentration — use a colourimetric assay such as BCA, or read at 205 nm.',
    );
  } else if ((counts.get('W') ?? 0) === 0) {
    warnings.push(
      'With no tryptophan the 280 nm coefficient rests on tyrosine alone, where it is least reliable. Expect an error of a few per cent against a colourimetric assay.',
    );
  }

  if (cysteineState === 'cystine' && (counts.get('C') ?? 0) % 2 === 1) {
    warnings.push(
      `There are ${counts.get('C')} cysteines, an odd number, so one is left unpaired. ${disulfides} disulfide${disulfides === 1 ? '' : 's'} ${disulfides === 1 ? 'has' : 'have'} been assumed.`,
    );
  }

  if (length < 10) {
    warnings.push(
      'Below about ten residues the terminal charges dominate, and pI values from any of these sets become rough. Short peptides also behave less ideally than the model assumes.',
    );
  }

  const composition: ResidueCount[] = AMINO_ACIDS.map((acid) => ({
    code: acid.code,
    threeLetter: acid.threeLetter,
    name: acid.name,
    count: counts.get(acid.code) ?? 0,
    fraction: (counts.get(acid.code) ?? 0) / length,
  }));

  const gravy =
    [...counts].reduce(
      (total, [code, count]) => total + getAminoAcid(code)!.hydropathy * count,
      0,
    ) / length;

  return {
    residues,
    length,
    molarMass,
    monoisotopicMass,
    formula,
    composition,
    extinction280,
    // A 1 mg/mL solution is 1/M molar, so its absorbance is ε divided by mass.
    absorbance01Percent: extinction280 / molarMass,
    disulfides,
    isoelectricPoint: isoelectricPoint(residues, pkaSet),
    chargeAtNeutral: netCharge(residues, 7, pkaSet),
    gravy,
    aliphaticIndex: aliphaticIndex(counts, length),
    warnings,
  };
}

/** Concentration from a measured A280, mol/L. Zero absorbers means no answer. */
export function concentrationFromA280(
  absorbance: number,
  extinction280: number,
  pathLengthCm = 1,
): number {
  if (extinction280 <= 0) {
    throw new PeptideError(
      'This peptide does not absorb at 280 nm, so A280 cannot give a concentration.',
    );
  }
  if (pathLengthCm <= 0) throw new PeptideError('Path length must be greater than zero.');
  return absorbance / (extinction280 * pathLengthCm);
}
