import { describe, expect, it } from 'vitest';
import { reverseComplement } from '@/lib/sequence';
import {
  ALLAWI_SANTALUCIA_1997,
  DEFAULT_SALT,
  SANTALUCIA_HICKS_2004,
  ThermoError,
  duplexThermodynamics,
  freeEnergy,
  gcFraction,
  isSelfComplementary,
  meltingTemperatureGC,
  meltingTemperatureNN,
  meltingTemperatureWallace,
  monovalentEquivalent,
  parseOligo,
} from './dna-thermo';

/**
 * The nearest-neighbour reference values come from Biopython's
 * Bio.SeqUtils.MeltingTemp doctests — a separate implementation, in another
 * language, whose numbers were produced without reference to this code. The
 * conditions are recorded beside each one because a Tm without its salt and
 * strand concentration is not reproducible.
 *
 * Everything else is either hand-summed from the published table or an
 * invariant that must hold whatever the parameters are.
 */
const REFERENCE = 'CGTTCCAAAGATGTGGGCATGAGCTTAC';

const nn = (sequence: string, salt = DEFAULT_SALT, strandConcentration = 25) =>
  meltingTemperatureNN({
    sequence,
    table: ALLAWI_SANTALUCIA_1997,
    strandConcentration,
    salt,
  }).celsius;

describe('sequence handling', () => {
  it('accepts what people paste, and transcribes RNA to DNA', () => {
    expect(parseOligo(' acgt\n')).toBe('ACGT');
    expect(parseOligo('>primer forward\nACG\nTAC\n')).toBe('ACGTAC');
    expect(parseOligo('ACGU')).toBe('ACGT');
    expect(parseOligo('1 ACGT 5 TTTT')).toBe('ACGTTTTT');
  });

  it('refuses ambiguity codes rather than guessing a parameter', () => {
    expect(() => parseOligo('ACGTN')).toThrow(ThermoError);
    expect(() => parseOligo('ACGT-ACGT')).toThrow(/no nearest-neighbour parameters/i);
    expect(() => parseOligo('  ')).toThrow(ThermoError);
  });

  it('identifies a self-complementary oligo', () => {
    expect(isSelfComplementary('AATT')).toBe(true);
    expect(isSelfComplementary('GAATTC')).toBe(true);
    expect(isSelfComplementary('ACGT')).toBe(true);
    expect(isSelfComplementary('AAAA')).toBe(false);
    expect(isSelfComplementary(REFERENCE)).toBe(false);
  });

  it('counts GC', () => {
    expect(gcFraction('GCGC')).toBe(1);
    expect(gcFraction('ATAT')).toBe(0);
    expect(gcFraction('ACGT')).toBe(0.5);
  });
});

describe('stacking thermodynamics', () => {
  /**
   * Hand-summed from the Allawi & SantaLucia table. AATT is
   * self-complementary, so it takes the symmetry entropy as well:
   *
   *   steps  AA/TT + AT/TA + AA/TT  (the final TT step reads as AA/TT)
   *   dH     -7.9 + -7.2 + -7.9                            = -23.0
   *   ends   two A/T terminals, 2 x 2.3                    = +4.6
   *   total  dH = -18.4
   *   dS     -22.2 + -20.4 + -22.2 + 2(4.1) + (-1.4)       = -56.6 - 1.4
   */
  it('sums to the hand-computed value for AATT', () => {
    const thermo = duplexThermodynamics('AATT', ALLAWI_SANTALUCIA_1997);
    expect(thermo.enthalpy).toBeCloseTo(-18.4, 9);
    expect(thermo.entropy).toBeCloseTo(-58.0, 9);
    expect(thermo.selfComplementary).toBe(true);
  });

  /** A duplex is the same object read from either end. */
  it('is identical for a sequence and its reverse complement', () => {
    for (const sequence of [REFERENCE, 'GGGCCC', 'ATGCATGCTT', 'CAGT']) {
      const forward = duplexThermodynamics(sequence, ALLAWI_SANTALUCIA_1997);
      const back = duplexThermodynamics(reverseComplement(sequence), ALLAWI_SANTALUCIA_1997);
      expect(back.enthalpy, sequence).toBeCloseTo(forward.enthalpy, 9);
      expect(back.entropy, sequence).toBeCloseTo(forward.entropy, 9);
    }
  });

  /** Stacking releases heat and orders the strands: both terms are negative. */
  it('gives every step a negative enthalpy and entropy', () => {
    for (const [key, [h, s]] of Object.entries(ALLAWI_SANTALUCIA_1997.steps)) {
      expect(h, key).toBeLessThan(0);
      expect(s, key).toBeLessThan(0);
    }
  });

  /** GC pairs have three hydrogen bonds and stack better than AT pairs. */
  it('makes a GC-rich duplex more stable than an AT-rich one', () => {
    const gc = freeEnergy(duplexThermodynamics('GCGCGCGCGC', ALLAWI_SANTALUCIA_1997));
    const at = freeEnergy(duplexThermodynamics('ATATATATAT', ALLAWI_SANTALUCIA_1997));
    expect(gc).toBeLessThan(at);
  });

  /** The order of the same bases changes the answer — the whole NN premise. */
  it('distinguishes sequences the GC formula cannot', () => {
    const a = duplexThermodynamics('GGGCCC', ALLAWI_SANTALUCIA_1997);
    const b = duplexThermodynamics('GCGCGC', ALLAWI_SANTALUCIA_1997);
    expect(a.enthalpy).not.toBeCloseTo(b.enthalpy, 2);
    // ...whereas the GC formula returns exactly the same temperature.
    expect(meltingTemperatureGC('GGGCCC', DEFAULT_SALT)).toBeCloseTo(
      meltingTemperatureGC('GCGCGC', DEFAULT_SALT),
      12,
    );
  });

  it('refuses a sequence too short to stack', () => {
    expect(() => duplexThermodynamics('A', ALLAWI_SANTALUCIA_1997)).toThrow(ThermoError);
  });
});

describe('nearest-neighbour melting temperature', () => {
  /**
   * Biopython, Bio.SeqUtils.MeltingTemp.Tm_NN, at its documented defaults:
   * Allawi & SantaLucia 1997 parameters, 25 nM of each strand, 50 mM Na+,
   * entropy-based salt correction. Its doctest prints 60.32.
   */
  it('matches an independent implementation at 50 mM sodium', () => {
    expect(nn(REFERENCE)).toBeCloseTo(60.32, 2);
  });

  /** Same source: adding 10 mM Tris, which counts as 5 mM monovalent. */
  it('matches when Tris contributes half its concentration', () => {
    expect(nn(REFERENCE, { ...DEFAULT_SALT, tris: 10 })).toBeCloseTo(60.79, 2);
  });

  /** Same source: 1.5 mM magnesium, converted by the von Ahsen relation. */
  it('matches with magnesium in the buffer', () => {
    expect(nn(REFERENCE, { ...DEFAULT_SALT, tris: 10, magnesium: 1.5 })).toBeCloseTo(67.39, 2);
  });

  /** dNTPs chelate magnesium, so adding them must lower the Tm again. */
  it('removes chelated magnesium from the salt term', () => {
    const withMg = nn(REFERENCE, { ...DEFAULT_SALT, magnesium: 2 });
    const withBoth = nn(REFERENCE, { ...DEFAULT_SALT, magnesium: 2, dntps: 1.6 });
    expect(withBoth).toBeLessThan(withMg);
    // Once dNTPs match magnesium there is no free Mg2+ left to help.
    expect(nn(REFERENCE, { ...DEFAULT_SALT, magnesium: 2, dntps: 2 })).toBeCloseTo(
      nn(REFERENCE),
      9,
    );
  });

  it('rises with salt and with strand concentration', () => {
    expect(nn(REFERENCE, { ...DEFAULT_SALT, sodium: 500 })).toBeGreaterThan(nn(REFERENCE));
    expect(nn(REFERENCE, DEFAULT_SALT, 1000)).toBeGreaterThan(nn(REFERENCE, DEFAULT_SALT, 25));
  });

  it('gives a duplex the same temperature from either strand', () => {
    expect(nn(reverseComplement(REFERENCE))).toBeCloseTo(nn(REFERENCE), 9);
  });

  it('puts the two published parameter sets within a degree of each other', () => {
    const a = nn(REFERENCE);
    const b = meltingTemperatureNN({
      sequence: REFERENCE,
      table: SANTALUCIA_HICKS_2004,
      strandConcentration: 25,
      salt: DEFAULT_SALT,
    }).celsius;
    expect(Math.abs(a - b)).toBeLessThan(1.5);
  });

  it('refuses impossible conditions rather than returning a number', () => {
    expect(() => nn(REFERENCE, DEFAULT_SALT, 0)).toThrow(ThermoError);
    expect(() => nn(REFERENCE, { ...DEFAULT_SALT, sodium: 0 })).toThrow(/salt/);
  });
});

describe('the simpler models', () => {
  /**
   * Wallace is 2(A+T) + 4(G+C), so for a 28-mer it is 56 + 2·(GC count). The
   * reference sequence has 14 GC, giving 84 — which is what Biopython prints.
   */
  it('counts bases, and agrees with the independent implementation', () => {
    expect(meltingTemperatureWallace(REFERENCE)).toBe(84);
    expect(meltingTemperatureWallace(REFERENCE)).toBe(
      56 + 2 * Math.round(gcFraction(REFERENCE) * REFERENCE.length),
    );
    expect(meltingTemperatureWallace('AT')).toBe(4);
    expect(meltingTemperatureWallace('GC')).toBe(8);
  });

  /** It has no length term, which is exactly why it fails on long oligos. */
  it('overestimates badly for a long oligo, as the model predicts', () => {
    const long = 'ATGC'.repeat(15);
    expect(meltingTemperatureWallace(long)).toBeGreaterThan(nn(long) + 40);
  });

  it('makes the salt-adjusted formula respond to length and salt', () => {
    const short = meltingTemperatureGC('ATGCATGCATGCATGC', DEFAULT_SALT);
    const long = meltingTemperatureGC('ATGCATGCATGCATGC'.repeat(4), DEFAULT_SALT);
    expect(long).toBeGreaterThan(short);
    expect(meltingTemperatureGC(REFERENCE, { ...DEFAULT_SALT, sodium: 500 })).toBeGreaterThan(
      meltingTemperatureGC(REFERENCE, DEFAULT_SALT),
    );
  });

  /** The headline claim: the models genuinely disagree on the same oligo. */
  it('shows the three models spanning a wide range', () => {
    const wallace = meltingTemperatureWallace(REFERENCE);
    const gc = meltingTemperatureGC(REFERENCE, DEFAULT_SALT);
    const neighbour = nn(REFERENCE);
    const spread = Math.max(wallace, gc, neighbour) - Math.min(wallace, gc, neighbour);
    expect(spread).toBeGreaterThan(10);
  });
});

describe('salt bookkeeping', () => {
  it('counts Tris as half and converts magnesium', () => {
    expect(monovalentEquivalent({ ...DEFAULT_SALT, sodium: 0, tris: 100 })).toBeCloseTo(0.05, 12);
    expect(monovalentEquivalent({ ...DEFAULT_SALT, sodium: 10, potassium: 40 })).toBeCloseTo(
      0.05,
      12,
    );
    // 120 * sqrt(4) = 240 mM equivalent, on top of the 50 mM sodium.
    expect(monovalentEquivalent({ ...DEFAULT_SALT, magnesium: 4 })).toBeCloseTo(0.29, 12);
  });

  it('ignores magnesium fully chelated by dNTPs', () => {
    expect(monovalentEquivalent({ ...DEFAULT_SALT, magnesium: 1, dntps: 5 })).toBeCloseTo(0.05, 12);
  });
});
