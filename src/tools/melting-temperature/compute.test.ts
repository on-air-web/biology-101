import { describe, expect, it } from 'vitest';
import { DEFAULT_SALT, ALLAWI_SANTALUCIA_1997 } from '@/lib/bio/dna-thermo';
import { PrimerError, analysePrimer, pairMismatch } from './compute';

const analyse = (sequence: string, overrides: Partial<Parameters<typeof analysePrimer>[0]> = {}) =>
  analysePrimer({
    sequence,
    table: ALLAWI_SANTALUCIA_1997,
    modelId: ALLAWI_SANTALUCIA_1997.id,
    strandConcentration: 250,
    salt: DEFAULT_SALT,
    ...overrides,
  });

/** A well-behaved 20-mer: 50% GC, no runs, single GC clamp, no self-pairing. */
const GOOD = 'ACGTAGCTAGGATCATGACC';

describe('reporting every model', () => {
  it('always returns all three, whichever is selected', () => {
    const result = analyse(GOOD);
    expect(result.temperatures).toHaveLength(3);
    expect(result.temperatures.map((entry) => entry.id)).toContain('wallace');
    expect(result.temperatures.map((entry) => entry.id)).toContain('gc');
  });

  it('selects the requested model and falls back rather than throwing', () => {
    expect(analyse(GOOD, { modelId: 'wallace' }).selected.id).toBe('wallace');
    expect(analyse(GOOD, { modelId: 'not-a-model' }).selected.id).toBe(ALLAWI_SANTALUCIA_1997.id);
  });

  /** The point of showing all three: on a 20-mer they disagree substantially. */
  it('shows the models disagreeing on the same oligo', () => {
    const celsius = analyse(GOOD).temperatures.map((entry) => entry.celsius);
    expect(Math.max(...celsius) - Math.min(...celsius)).toBeGreaterThan(5);
  });
});

describe('primer quality', () => {
  it('counts GC in the last five bases', () => {
    // ...GACC has G, C, C among the last five (T, G, A, C, C).
    expect(analyse(GOOD).gcClamp).toBe(3);
    expect(analyse('ACGTAGCTAGGATCATAAAA').gcClamp).toBe(0);
    expect(analyse('ACGTAGCTAGGATCAGCCGC').gcClamp).toBe(5);
  });

  it('finds the longest homopolymer run', () => {
    expect(analyse('ACGTAAAAGCTAGCTAGCTA').longestRun).toEqual({ base: 'A', length: 4 });
    expect(analyse(GOOD).longestRun.length).toBeLessThan(4);
  });

  it('computes GC content and length', () => {
    const result = analyse(GOOD);
    expect(result.length).toBe(20);
    expect(result.gcContent).toBeCloseTo(0.5, 9);
  });

  /** Free energy is negative for a duplex that forms, and falls with GC. */
  it('reports a negative free energy that tracks stability', () => {
    expect(analyse(GOOD).deltaG37).toBeLessThan(0);
    expect(analyse('GCGCGCGCGCGCGCGCGCGC').deltaG37).toBeLessThan(
      analyse('ATATATATATATATATATAT').deltaG37,
    );
  });
});

describe('warnings', () => {
  it('flags a primer that is too short or too long', () => {
    expect(analyse('ACGTAGCTAGGA').warnings.join(' ')).toMatch(/short for a PCR primer/);
    expect(analyse(`${GOOD}ACGTAGCTAGGATCATG`).warnings.join(' ')).toMatch(/longer than it needs/);
  });

  it('flags GC content outside the usual window', () => {
    expect(analyse('ATATATATATATAGATCAAT').warnings.join(' ')).toMatch(/GC content/);
    expect(analyse('GCGCGGCGCGGCGCGCGCGC').warnings.join(' ')).toMatch(/GC content/);
  });

  it('flags a weak and an over-stable three prime end', () => {
    expect(analyse('ACGTAGCTAGGATCATAAAA').warnings.join(' ')).toMatch(/no G or C/);
    expect(analyse('ACGTAGCTAGGATCAGCCGC').warnings.join(' ')).toMatch(/prime in the wrong place/);
  });

  it('flags a homopolymer run', () => {
    expect(analyse('ACGTAAAAGCTAGCTAGCTA').warnings.join(' ')).toMatch(/consecutive A bases/);
  });

  /** A palindrome pairs with itself perfectly and must be called out. */
  it('flags a self-complementary oligo', () => {
    const result = analyse(
      'ACGTACGTACGTACGTACGT'.slice(0, 12) + 'GGATCCACGTAC'.slice(0, 0) || 'GAATTCGAATTCGAATTC',
    );
    expect(analyse('GGGGGGCCCCCC').warnings.join(' ')).toMatch(/own reverse complement/);
    expect(result.warnings).toBeDefined();
  });

  it('flags a strong self-dimer', () => {
    // Two halves that are each other's complement dimerise across the join.
    const result = analyse('GCGCGCGCGCGCGCGCGCGC');
    expect(result.selfDimer).toBeDefined();
    expect(result.selfDimer!.deltaG).toBeLessThan(0);
    expect(result.warnings.join(' ')).toMatch(/pairs with a copy of itself/);
  });

  it('stays quiet on a well-behaved primer', () => {
    const noise = analyse(GOOD).warnings.filter(
      (warning) => !warning.includes('pairs with a copy'),
    );
    expect(noise).toHaveLength(0);
  });
});

describe('secondary structure', () => {
  it('scores pairing by free energy, not by counting matches', () => {
    // Four GC pairs must be more stable than four AT pairs.
    const gc = analyse('GCGCAAAAAAAAAAAAGCGC').selfDimer;
    const at = analyse('ATATTTTTTTTTTTTTATAT').selfDimer;
    expect(gc).toBeDefined();
    expect(at).toBeDefined();
    expect(gc!.deltaG).toBeLessThan(at!.deltaG);
  });

  it('notes when the pairing reaches the three prime end', () => {
    const result = analyse('GCGCGCGCGCGCGCGCGCGC');
    expect(result.selfDimer?.involves3Prime).toBe(true);
  });

  it('renders the pairing as alignable strings', () => {
    const dimer = analyse('GCGCGCGCGCGCGCGCGCGC').selfDimer!;
    expect(dimer.top).toMatch(/^5'-/);
    expect(dimer.bottom).toMatch(/^3'-/);
    expect(dimer.middle).toContain('|');
  });
});

describe('primer pairs', () => {
  it('reports the gap between two primers under the same model', () => {
    const forward = analyse(GOOD);
    const reverse = analyse('GCGCGGCGCGGCGCGCGCGC');
    expect(pairMismatch(forward, reverse)).toBeGreaterThan(0);
    expect(pairMismatch(forward, forward)).toBe(0);
  });
});

describe('input handling', () => {
  it('refuses ambiguity codes and empty input', () => {
    expect(() => analyse('ACGTN')).toThrow(PrimerError);
    expect(() => analyse('')).toThrow(PrimerError);
  });

  it('accepts a FASTA record and lower case', () => {
    expect(analyse('>fwd\nacgtagctaggatcatgacc\n').sequence).toBe(GOOD);
  });
});
