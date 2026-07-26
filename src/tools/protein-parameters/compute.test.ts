import { describe, expect, it } from 'vitest';
import { parseFormula } from '@/lib/formula';
import { EXTINCTION_280, getPkaSet } from '@/lib/bio/amino-acids';
import {
  PeptideError,
  analysePeptide,
  concentrationFromA280,
  isoelectricPoint,
  netCharge,
  parsePeptide,
} from './compute';

const bjellqvist = getPkaSet('bjellqvist')!;
const emboss = getPkaSet('emboss')!;

const analyse = (sequence: string, cysteineState: 'reduced' | 'cystine' = 'reduced') =>
  analysePeptide({ sequence, pkaSet: bjellqvist, cysteineState });

describe('sequence parsing', () => {
  it('accepts what people actually paste', () => {
    expect(parsePeptide('  ala\n')).toBe('ALA');
    expect(parsePeptide('>sp|P12345|Test protein\nMKW\nGGA\n')).toBe('MKWGGA');
    // Numbered listings from a paper or a viewer.
    expect(parsePeptide('1 MKWGG 6 AATTL')).toBe('MKWGGAATTL');
  });

  /** Refuse rather than guess: dropping a character silently changes the mass. */
  it('refuses ambiguity codes instead of dropping them', () => {
    expect(() => parsePeptide('MKXGG')).toThrow(PeptideError);
    expect(() => parsePeptide('MKBGG')).toThrow(/standard amino acids/);
    expect(() => parsePeptide('MK-GG')).toThrow(PeptideError);
    expect(() => parsePeptide('MK1GG*')).toThrow(PeptideError);
  });

  it('refuses an empty sequence', () => {
    expect(() => parsePeptide('   \n>header only\n')).toThrow(PeptideError);
  });
});

describe('mass', () => {
  /**
   * A single residue plus water is the free amino acid, so a one-residue
   * "peptide" must weigh what glycine weighs. Everything else builds on this.
   */
  it('gives a single residue the mass of the free amino acid', () => {
    expect(analyse('G').molarMass).toBeCloseTo(parseFormula('C2H5NO2').molarMass, 9);
  });

  /** Each bond loses one water, so a dimer is two residues plus one water. */
  it('loses one water per peptide bond', () => {
    const one = analyse('G').molarMass;
    const two = analyse('GG').molarMass;
    const water = parseFormula('H2O').molarMass;
    expect(two).toBeCloseTo(2 * one - water, 9);
    expect(analyse('GGG').molarMass).toBeCloseTo(3 * one - 2 * water, 9);
  });

  it('is independent of the order of residues', () => {
    expect(analyse('MKWGA').molarMass).toBeCloseTo(analyse('AGWKM').molarMass, 9);
  });

  it('reports a formula that parses back to the same mass', () => {
    const result = analyse('MKWGGAATTLYC');
    expect(parseFormula(result.formula).molarMass).toBeCloseTo(result.molarMass, 9);
  });

  it('puts the monoisotopic mass just below the average', () => {
    const result = analyse('MKWGGAATTLYC');
    expect(result.monoisotopicMass).toBeLessThan(result.molarMass);
    // The gap is small but grows with size; well under 1% either way.
    expect(result.monoisotopicMass / result.molarMass).toBeGreaterThan(0.999);
  });

  /** Forming a disulfide releases two hydrogens, so the mass drops by ~2.016. */
  it('subtracts two hydrogens per disulfide', () => {
    const reduced = analyse('CGGC', 'reduced');
    const oxidised = analyse('CGGC', 'cystine');
    expect(oxidised.disulfides).toBe(1);
    expect(reduced.molarMass - oxidised.molarMass).toBeCloseTo(2 * parseFormula('H').molarMass, 9);
  });
});

describe('extinction coefficient', () => {
  /**
   * Gill & von Hippel is a sum of three counts, so each term is checkable on
   * its own by construction rather than against a published total.
   */
  it('adds up its three contributions', () => {
    expect(analyse('W').extinction280).toBe(EXTINCTION_280.W);
    expect(analyse('Y').extinction280).toBe(EXTINCTION_280.Y);
    expect(analyse('WY').extinction280).toBe(EXTINCTION_280.W + EXTINCTION_280.Y);
    expect(analyse('WWYYY').extinction280).toBe(2 * EXTINCTION_280.W + 3 * EXTINCTION_280.Y);
  });

  it('counts disulfide bonds rather than cysteines', () => {
    expect(analyse('CGGC', 'reduced').extinction280).toBe(0);
    expect(analyse('CGGC', 'cystine').extinction280).toBe(EXTINCTION_280.cystine);
    // Four cysteines make two bonds, not four contributions.
    expect(analyse('CCGGCC', 'cystine').extinction280).toBe(2 * EXTINCTION_280.cystine);
  });

  it('warns when nothing absorbs, and when only tyrosine does', () => {
    expect(analyse('GGAAVVLL').warnings.join(' ')).toMatch(/does not absorb at 280/);
    expect(analyse('GGYYAA').warnings.join(' ')).toMatch(/tyrosine alone/);
    expect(analyse('GGWYAA').warnings.join(' ')).not.toMatch(/tyrosine alone/);
  });

  it('flags an odd number of cysteines when disulfides are assumed', () => {
    const result = analyse('CGGCGGC', 'cystine');
    expect(result.disulfides).toBe(1);
    expect(result.warnings.join(' ')).toMatch(/odd number/);
  });

  it('converts a measured absorbance to a concentration', () => {
    const result = analyse('W');
    // A = εcl, so c = A/ε. At A = 0.55 and ε = 5500, that is exactly 1e-4 M.
    expect(concentrationFromA280(0.55, result.extinction280)).toBeCloseTo(1e-4, 12);
    // Doubling the path halves the concentration for the same reading.
    expect(concentrationFromA280(0.55, result.extinction280, 2)).toBeCloseTo(0.5e-4, 12);
    expect(() => concentrationFromA280(0.5, 0)).toThrow(PeptideError);
  });
});

describe('charge', () => {
  /**
   * At extreme pH every group is fully protonated or fully stripped, so the
   * charge must approach the raw counts. Nothing is looked up: poly-K has one
   * basic side chain per residue plus the N-terminus.
   */
  it('approaches the group counts at extreme pH', () => {
    expect(netCharge('KKKK', 0, bjellqvist)).toBeCloseTo(5, 3);
    expect(netCharge('KKKK', 14, bjellqvist)).toBeCloseTo(-1, 3);
    expect(netCharge('DDDD', 14, bjellqvist)).toBeCloseTo(-5, 3);
    expect(netCharge('DDDD', 0, bjellqvist)).toBeCloseTo(1, 3);
  });

  it('falls monotonically with pH', () => {
    let previous = Infinity;
    for (let pH = 0; pH <= 14; pH += 0.5) {
      const charge = netCharge('MKWDDEGGRRHY', pH, bjellqvist);
      expect(charge).toBeLessThan(previous);
      previous = charge;
    }
  });
});

describe('isoelectric point', () => {
  /** The definition, checked directly: net charge at the pI must be zero. */
  it('lands where the net charge crosses zero', () => {
    for (const sequence of ['MKWGGAATTLYC', 'KKKKDDDD', 'RRRHHHEEE', 'GGGG']) {
      for (const set of [bjellqvist, emboss]) {
        const pI = isoelectricPoint(sequence, set);
        expect(Math.abs(netCharge(sequence, pI, set)), `${sequence} ${set.id}`).toBeLessThan(1e-9);
      }
    }
  });

  /**
   * A peptide with no ionisable side chains has only its two termini, so its
   * pI is the mean of those two pKa values — computable by hand from the set.
   */
  it('is the mean of the terminal pKa values when no side chain ionises', () => {
    const pI = isoelectricPoint('GGGG', emboss);
    expect(pI).toBeCloseTo((emboss.nTerminus + emboss.cTerminus) / 2, 6);
  });

  it('puts basic proteins high and acidic proteins low', () => {
    expect(isoelectricPoint('KKKKRRRR', bjellqvist)).toBeGreaterThan(10);
    expect(isoelectricPoint('DDDDEEEE', bjellqvist)).toBeLessThan(4.5);
  });

  /** The whole reason the set is a visible choice rather than a constant. */
  it('gives different answers for different pKa sets', () => {
    const sequence = 'MKWGGAATTLYCDDEKKRH';
    expect(isoelectricPoint(sequence, bjellqvist)).not.toBeCloseTo(
      isoelectricPoint(sequence, emboss),
      2,
    );
  });

  /** Bjellqvist's terminal pKa depends on the first residue; EMBOSS's does not. */
  it('respects position-specific termini where the method defines them', () => {
    const withAla = isoelectricPoint('AGGGG', bjellqvist);
    const withGly = isoelectricPoint('GGGGG', bjellqvist);
    expect(withAla).not.toBeCloseTo(withGly, 3);
    expect(isoelectricPoint('AGGGG', emboss)).toBeCloseTo(isoelectricPoint('GGGGG', emboss), 9);
  });
});

describe('derived indices', () => {
  it('averages hydropathy over the sequence', () => {
    // All-isoleucine is the maximum of the Kyte-Doolittle scale.
    expect(analyse('IIII').gravy).toBeCloseTo(4.5, 9);
    expect(analyse('RRRR').gravy).toBeCloseTo(-4.5, 9);
    // A half-and-half mix is the mean of the two.
    expect(analyse('IIRR').gravy).toBeCloseTo(0, 9);
  });

  it('scores the aliphatic index from its four residues only', () => {
    expect(analyse('GGGG').aliphaticIndex).toBe(0);
    expect(analyse('AAAA').aliphaticIndex).toBeCloseTo(100, 9);
    // Valine is weighted 2.9 relative to alanine.
    expect(analyse('VVVV').aliphaticIndex).toBeCloseTo(290, 9);
  });

  it('counts composition exhaustively', () => {
    const result = analyse('MKWGGAATTLYC');
    expect(result.composition).toHaveLength(20);
    const total = result.composition.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(result.length);
    expect(result.composition.find((entry) => entry.code === 'G')?.count).toBe(2);
    expect(result.composition.find((entry) => entry.code === 'A')?.fraction).toBeCloseTo(2 / 12, 9);
  });

  it('warns that a very short peptide is dominated by its termini', () => {
    expect(analyse('MKW').warnings.join(' ')).toMatch(/terminal charges dominate/);
    expect(analyse('MKWGGAATTLYCDDEK').warnings.join(' ')).not.toMatch(/terminal charges/);
  });
});

/**
 * Cross-check against UniProt.
 *
 * Sequences and the masses beside them are copied verbatim from the SQ line of
 * the UniProtKB flat file at rest.uniprot.org, which computes mass with its own
 * implementation and its own element table. That makes these genuine external
 * reference values rather than numbers recalled from anywhere, and it exercises
 * the whole path — parsing, residue formulae, water accounting — on real
 * proteins rather than constructed ones.
 *
 * UniProt rounds the mass to a whole number, so agreement is asserted against
 * that rounding rather than to more digits than the source carries.
 */
const UNIPROT = [
  {
    accession: 'P00698',
    name: 'Lysozyme C, chicken',
    // SQ   SEQUENCE   147 AA;  16239 MW;
    length: 147,
    mass: 16239,
    sequence:
      'MRSLLILVLCFLPLAALGKVFGRCELAAAMKRHGLDNYRGYSLGNWVCAAKFESNFNTQATNRNTDGSTDYGILQ' +
      'INSRWWCNDGRTPGSRNLCNIPCSALLSSDITASVNCAKKIVSDGNGMNAWVAWRNRCKGTDVQAWIRGCRL',
  },
  {
    accession: 'P01308',
    name: 'Insulin, human (preproinsulin)',
    // SQ   SEQUENCE   110 AA;  11981 MW;
    length: 110,
    mass: 11981,
    sequence:
      'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAG' +
      'SLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN',
  },
  {
    accession: 'P0CG48',
    name: 'Polyubiquitin-C, human',
    // SQ   SEQUENCE   685 AA;  77039 MW;
    length: 685,
    mass: 77039,
    sequence:
      'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG'.repeat(9) +
      'V',
  },
] as const;

describe('agreement with UniProt', () => {
  it('reproduces the stated length', () => {
    for (const entry of UNIPROT) {
      expect(analyse(entry.sequence).length, entry.accession).toBe(entry.length);
    }
  });

  it('reproduces the stated average mass to UniProt’s own precision', () => {
    for (const entry of UNIPROT) {
      const computed = analyse(entry.sequence).molarMass;
      // Within a dalton of a figure that is itself rounded to a dalton.
      expect(
        Math.abs(computed - entry.mass),
        `${entry.accession}: got ${computed.toFixed(2)}`,
      ).toBeLessThan(1);
    }
  });

  /** Polyubiquitin is nine identical repeats, so its mass must scale with them. */
  it('scales linearly across a tandem repeat protein', () => {
    const unit = 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG';
    const one = analyse(unit).molarMass;
    const two = analyse(unit.repeat(2)).molarMass;
    const water = parseFormula('H2O').molarMass;
    expect(two).toBeCloseTo(2 * one - water, 6);
  });
});
