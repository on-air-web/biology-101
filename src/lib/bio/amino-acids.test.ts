import { describe, expect, it } from 'vitest';
import { parseFormula } from '@/lib/formula';
import {
  AMINO_ACIDS,
  MONOISOTOPIC,
  PKA_SETS,
  STANDARD_CODES,
  getAminoAcid,
  getPkaSet,
} from './amino-acids';

/** Residue plus the water lost on forming the bond gives the free amino acid. */
function freeAcidMass(formula: string): number {
  return parseFormula(formula).molarMass + parseFormula('H2O').molarMass;
}

describe('amino acid table', () => {
  it('covers the twenty standard residues exactly once', () => {
    expect(AMINO_ACIDS).toHaveLength(20);
    expect(new Set(STANDARD_CODES)).toHaveProperty('size', 20);
  });

  it('gives every residue a parseable formula', () => {
    for (const acid of AMINO_ACIDS) {
      expect(() => parseFormula(acid.formula), acid.code).not.toThrow();
    }
  });

  /**
   * Cross-checks the stored residue formulae against the free amino acid
   * masses printed in any catalogue. These are the numbers on a bottle, not
   * values recalled from a table, and they only agree if the residue formula
   * is right.
   */
  it('derives free amino acid masses that match catalogue figures', () => {
    // Every residue, not a sample. An earlier version of this test checked
    // eight of the twenty and passed while glutamate carried an extra oxygen,
    // which only the UniProt cross-check in the peptide tool caught. A partial
    // table check is worth very little.
    const expected: Record<string, number> = {
      G: 75.07,
      A: 89.09,
      S: 105.09,
      P: 115.13,
      V: 117.15,
      T: 119.12,
      L: 131.17,
      I: 131.17,
      N: 132.12,
      D: 133.1,
      Q: 146.14,
      K: 146.19,
      E: 147.13,
      H: 155.15,
      F: 165.19,
      R: 174.2,
      Y: 181.19,
      W: 204.23,
    };
    for (const [code, mass] of Object.entries(expected)) {
      expect(freeAcidMass(getAminoAcid(code)!.formula), code).toBeCloseTo(mass, 1);
    }

    // Sulfur is the one element here whose standard atomic weight is an
    // interval rather than a number — IUPAC gives [32.059, 32.076] — so
    // catalogues quote cysteine as 121.16 while the IUPAC weights give
    // 121.154. One decimal is the honest agreement to ask for, and the
    // difference is the documented one, not an error in the formula.
    expect(freeAcidMass(getAminoAcid('C')!.formula)).toBeCloseTo(121.16, 1);
    expect(freeAcidMass(getAminoAcid('M')!.formula)).toBeCloseTo(149.21, 1);
  });

  /** Leucine and isoleucine are isomers, which is why MS cannot separate them. */
  it('gives the isomeric pair identical formulae', () => {
    expect(getAminoAcid('L')!.formula).toBe(getAminoAcid('I')!.formula);
  });

  it('orders hydropathy the way Kyte and Doolittle do', () => {
    const byCode = (code: string) => getAminoAcid(code)!.hydropathy;
    // Isoleucine is the most hydrophobic, arginine the least.
    expect(Math.max(...AMINO_ACIDS.map((a) => a.hydropathy))).toBe(byCode('I'));
    expect(Math.min(...AMINO_ACIDS.map((a) => a.hydropathy))).toBe(byCode('R'));
    expect(byCode('I')).toBeGreaterThan(byCode('V'));
    expect(byCode('D')).toBeLessThan(0);
  });

  it('is case insensitive and refuses unknown codes', () => {
    expect(getAminoAcid('w')).toBe(getAminoAcid('W'));
    expect(getAminoAcid('X')).toBeUndefined();
    expect(getAminoAcid('B')).toBeUndefined();
  });
});

describe('monoisotopic masses', () => {
  /**
   * Carbon-12 defines the scale, so it is exactly 12 by definition. Anything
   * else means the table has drifted.
   */
  it('pins carbon to the definition of the unit', () => {
    expect(MONOISOTOPIC.C).toBe(12);
  });

  /**
   * Monoisotopic glycine, computed here from the element masses rather than
   * looked up: C2H5NO2 = 2(12) + 5(1.0078250319) + 14.0030740052 + 2(15.9949146221).
   */
  it('composes to the monoisotopic mass of glycine', () => {
    const gly = 2 * MONOISOTOPIC.C! + 5 * MONOISOTOPIC.H! + MONOISOTOPIC.N! + 2 * MONOISOTOPIC.O!;
    expect(gly).toBeCloseTo(75.03203, 5);
    // And it must sit below the average mass, since heavier isotopes exist.
    expect(gly).toBeLessThan(parseFormula('C2H5NO2').molarMass);
  });

  it('stays within a fraction of a unit of the average atomic weight', () => {
    for (const [element, mass] of Object.entries(MONOISOTOPIC)) {
      const average = parseFormula(element === 'C' ? 'C' : element).molarMass;
      expect(Math.abs(mass - average), element).toBeLessThan(1);
    }
  });
});

describe('pKa sets', () => {
  it('has unique ids and non-empty guidance', () => {
    const ids = PKA_SETS.map((set) => set.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const set of PKA_SETS) {
      expect(set.guidance.length, set.id).toBeGreaterThan(40);
    }
  });

  /**
   * The chemistry, not the specific numbers: carboxyl groups ionise well below
   * neutrality, the guanidinium of arginine well above it, and histidine sits
   * near physiological pH — which is the whole reason it buffers there.
   */
  it('keeps every value chemically sensible', () => {
    for (const set of PKA_SETS) {
      expect(set.cTerminus, set.id).toBeLessThan(5);
      expect(set.acidic.D!, set.id).toBeLessThan(5);
      expect(set.acidic.E!, set.id).toBeLessThan(5);
      expect(set.basic.R!, set.id).toBeGreaterThan(11);
      expect(set.basic.K!, set.id).toBeGreaterThan(9);
      expect(set.basic.H!, set.id).toBeGreaterThan(5);
      expect(set.basic.H!, set.id).toBeLessThan(7.5);
      // Tyrosine's phenol is far weaker an acid than any carboxyl.
      expect(set.acidic.Y!, set.id).toBeGreaterThan(9);
    }
  });

  it('covers the same ionisable groups in every set', () => {
    const groups = PKA_SETS.map((set) =>
      [...Object.keys(set.acidic), ...Object.keys(set.basic)].sort().join(''),
    );
    expect(new Set(groups).size).toBe(1);
  });

  /** Only Bjellqvist varies its terminal pKa by residue; EMBOSS does not. */
  it('carries position-specific termini only where the method defines them', () => {
    const bjellqvist = getPkaSet('bjellqvist')!;
    expect(bjellqvist.nTerminusByResidue).toBeDefined();
    expect(bjellqvist.cTerminusByResidue?.D).toBeCloseTo(4.55, 10);
    expect(getPkaSet('emboss')!.nTerminusByResidue).toBeUndefined();
  });
});
