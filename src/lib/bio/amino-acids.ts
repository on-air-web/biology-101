/**
 * Amino acid reference data.
 *
 * Residues are stored as **formulae**, not masses, for the same reason the
 * buffer data is: mass is then derived by the parser the molecular weight
 * calculator already uses, so there is one fewer number to mistype and the
 * element composition comes out for free. A residue is the free amino acid
 * less the water lost in forming the peptide bond, so a chain's formula is the
 * sum of its residues plus one water.
 *
 * The pKa sets are the interesting part. Two calculators disagreeing on a
 * protein's pI is almost always the pKa set rather than a bug, so the set is
 * an explicit choice here rather than a hidden constant — the same position
 * this project takes on melting temperature models.
 */

export interface AminoAcid {
  code: string;
  threeLetter: string;
  name: string;
  /** Residue formula: the free amino acid minus H2O. */
  formula: string;
  /** Kyte & Doolittle hydropathy index. */
  hydropathy: number;
}

export const AMINO_ACIDS: readonly AminoAcid[] = [
  { code: 'A', threeLetter: 'Ala', name: 'Alanine', formula: 'C3H5NO', hydropathy: 1.8 },
  { code: 'R', threeLetter: 'Arg', name: 'Arginine', formula: 'C6H12N4O', hydropathy: -4.5 },
  { code: 'N', threeLetter: 'Asn', name: 'Asparagine', formula: 'C4H6N2O2', hydropathy: -3.5 },
  { code: 'D', threeLetter: 'Asp', name: 'Aspartic acid', formula: 'C4H5NO3', hydropathy: -3.5 },
  { code: 'C', threeLetter: 'Cys', name: 'Cysteine', formula: 'C3H5NOS', hydropathy: 2.5 },
  { code: 'Q', threeLetter: 'Gln', name: 'Glutamine', formula: 'C5H8N2O2', hydropathy: -3.5 },
  { code: 'E', threeLetter: 'Glu', name: 'Glutamic acid', formula: 'C5H7NO3', hydropathy: -3.5 },
  { code: 'G', threeLetter: 'Gly', name: 'Glycine', formula: 'C2H3NO', hydropathy: -0.4 },
  { code: 'H', threeLetter: 'His', name: 'Histidine', formula: 'C6H7N3O', hydropathy: -3.2 },
  { code: 'I', threeLetter: 'Ile', name: 'Isoleucine', formula: 'C6H11NO', hydropathy: 4.5 },
  { code: 'L', threeLetter: 'Leu', name: 'Leucine', formula: 'C6H11NO', hydropathy: 3.8 },
  { code: 'K', threeLetter: 'Lys', name: 'Lysine', formula: 'C6H12N2O', hydropathy: -3.9 },
  { code: 'M', threeLetter: 'Met', name: 'Methionine', formula: 'C5H9NOS', hydropathy: 1.9 },
  { code: 'F', threeLetter: 'Phe', name: 'Phenylalanine', formula: 'C9H9NO', hydropathy: 2.8 },
  { code: 'P', threeLetter: 'Pro', name: 'Proline', formula: 'C5H7NO', hydropathy: -1.6 },
  { code: 'S', threeLetter: 'Ser', name: 'Serine', formula: 'C3H5NO2', hydropathy: -0.8 },
  { code: 'T', threeLetter: 'Thr', name: 'Threonine', formula: 'C4H7NO2', hydropathy: -0.7 },
  { code: 'W', threeLetter: 'Trp', name: 'Tryptophan', formula: 'C11H10N2O', hydropathy: -0.9 },
  { code: 'Y', threeLetter: 'Tyr', name: 'Tyrosine', formula: 'C9H9NO2', hydropathy: -1.3 },
  { code: 'V', threeLetter: 'Val', name: 'Valine', formula: 'C5H9NO', hydropathy: 4.2 },
] as const;

const BY_CODE = new Map(AMINO_ACIDS.map((acid) => [acid.code, acid]));

export function getAminoAcid(code: string): AminoAcid | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** The twenty one-letter codes, in the order above. */
export const STANDARD_CODES = AMINO_ACIDS.map((acid) => acid.code).join('');

// ---------------------------------------------------------------------------
// Ionisation
// ---------------------------------------------------------------------------

export interface PkaSet {
  id: string;
  name: string;
  /** When to prefer this set, in one sentence. */
  guidance: string;
  /** Groups that are neutral when protonated and negative when not. */
  acidic: Record<string, number>;
  /** Groups that are positive when protonated and neutral when not. */
  basic: Record<string, number>;
  cTerminus: number;
  nTerminus: number;
  /**
   * Bjellqvist makes the terminal pKa depend on which residue occupies the
   * terminus. Leaving these out is the usual reason a calculator claiming to
   * implement ExPASy disagrees with it in the second decimal.
   */
  cTerminusByResidue?: Record<string, number>;
  nTerminusByResidue?: Record<string, number>;
}

export const PKA_SETS: readonly PkaSet[] = [
  {
    id: 'bjellqvist',
    name: 'Bjellqvist (ExPASy)',
    guidance:
      'Match this one when you need to agree with ExPASy Compute pI/Mw, which most published pI values are quoted from.',
    acidic: { C: 9.0, D: 4.05, E: 4.45, Y: 10.0 },
    basic: { H: 5.98, K: 10.0, R: 12.0 },
    cTerminus: 3.55,
    nTerminus: 7.5,
    cTerminusByResidue: { D: 4.55, E: 4.75 },
    nTerminusByResidue: { A: 7.59, M: 7.0, S: 6.93, P: 8.36, T: 6.82, V: 7.44, E: 7.7 },
  },
  {
    id: 'emboss',
    name: 'EMBOSS',
    guidance:
      'Use when comparing against EMBOSS iep or pepstats, or anything in a pipeline built on them.',
    acidic: { C: 8.5, D: 3.9, E: 4.1, Y: 10.1 },
    basic: { H: 6.5, K: 10.8, R: 12.5 },
    cTerminus: 3.6,
    nTerminus: 8.6,
  },
] as const;

export function getPkaSet(id: string): PkaSet | undefined {
  return PKA_SETS.find((set) => set.id === id);
}

// ---------------------------------------------------------------------------
// Absorbance
// ---------------------------------------------------------------------------

/**
 * Molar extinction coefficients at 280 nm in water, per Gill & von Hippel.
 *
 * Only three groups absorb meaningfully at 280 nm, and the cystine figure is
 * per disulfide **bond**, not per cysteine — which is why the reduced and
 * oxidised numbers differ and why a tool has to ask which one you have.
 */
export const EXTINCTION_280 = { W: 5500, Y: 1490, cystine: 125 } as const;

// ---------------------------------------------------------------------------
// Monoisotopic element masses
// ---------------------------------------------------------------------------

/**
 * Masses of the most abundant isotope of each element, in u.
 *
 * Needed separately from the formula parser, which works in average atomic
 * weights. Mass spectrometry measures a single isotopologue, so the average
 * mass is the wrong number there by around one part in ten thousand — a whole
 * dalton on a small protein.
 */
export const MONOISOTOPIC: Record<string, number> = {
  H: 1.0078250319,
  C: 12,
  N: 14.0030740052,
  O: 15.9949146221,
  S: 31.97207069,
};
