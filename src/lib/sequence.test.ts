import { describe, expect, it } from 'vitest';
import {
  baseComposition,
  chunk,
  complement,
  detectKind,
  parseSequence,
  reverseComplement,
} from './sequence';

describe('parseSequence', () => {
  it('strips FASTA headers, whitespace and line numbers', () => {
    const parsed = parseSequence('>sp|P12345| test protein\n  1 ATGC GGCA\n 11 TTAA\n');
    expect(parsed.header).toBe('sp|P12345| test protein');
    expect(parsed.residues).toBe('ATGCGGCATTAA');
  });

  it('reports invalid characters instead of dropping them silently', () => {
    const parsed = parseSequence('ATGC@@');
    expect(parsed.invalidCharacters).toEqual(['@']);
  });

  it('reclassifies as protein rather than flagging valid residues as invalid', () => {
    // Z and Q are legitimate protein codes, so this is a protein sequence with
    // no errors — not a DNA sequence with three bad characters.
    const parsed = parseSequence('ATGCZZQ');
    expect(parsed.kind).toBe('protein');
    expect(parsed.invalidCharacters).toEqual([]);
  });

  it('counts ambiguity codes', () => {
    expect(parseSequence('ATGCNNRY').ambiguousCount).toBe(4);
    expect(parseSequence('ATGC').ambiguousCount).toBe(0);
  });
});

describe('detectKind', () => {
  it('calls DNA, RNA and protein correctly', () => {
    expect(detectKind('ATGCGATC')).toBe('dna');
    expect(detectKind('AUGCGAUC')).toBe('rna');
    expect(detectKind('MKWVTFISLLFLFSSAYS')).toBe('protein');
  });

  it('does not guess protein for short nucleotide-only sequences', () => {
    // Conservative on purpose: calling this protein would break common DNA use.
    expect(detectKind('ACGT')).toBe('dna');
  });
});

describe('complement and reverse complement', () => {
  it('handles the unambiguous bases', () => {
    expect(complement('ATGC')).toBe('TACG');
    expect(reverseComplement('ATGC')).toBe('GCAT');
  });

  it('complements IUPAC ambiguity codes rather than discarding them', () => {
    // R (A/G) mirrors to Y (C/T); K (G/T) to M (A/C); S and W are self-complementary.
    expect(complement('RYKMSWBVDHN')).toBe('YRMKSWVBHDN');
  });

  it('produces RNA when asked', () => {
    expect(reverseComplement('ATGC', true)).toBe('GCAU');
  });

  it('round-trips', () => {
    const sequence = 'ATGGCGAGCAAGGGCGAGGAG';
    expect(reverseComplement(reverseComplement(sequence))).toBe(sequence);
  });
});

describe('baseComposition', () => {
  it('computes GC fraction', () => {
    expect(baseComposition('GGCC').gcFraction).toBe(1);
    expect(baseComposition('ATAT').gcFraction).toBe(0);
    expect(baseComposition('ATGC').gcFraction).toBe(0.5);
  });

  it('counts S and W as assignable but excludes true ambiguity', () => {
    const composition = baseComposition('GCSWAT');
    expect(composition.gc).toBe(3);
    expect(composition.at).toBe(3);
    expect(composition.ambiguous).toBe(0);

    const withN = baseComposition('GCNN');
    expect(withN.ambiguous).toBe(2);
    // N positions must not enter the denominator.
    expect(withN.gcFraction).toBe(1);
  });

  it('returns no fraction for an empty or fully ambiguous sequence', () => {
    expect(baseComposition('').gcFraction).toBeUndefined();
    expect(baseComposition('NNNN').gcFraction).toBeUndefined();
  });
});

describe('chunk', () => {
  it('splits into display blocks', () => {
    expect(chunk('ATGCATGCAT', 4)).toEqual(['ATGC', 'ATGC', 'AT']);
  });
});
