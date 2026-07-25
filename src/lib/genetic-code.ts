/**
 * Genetic code tables.
 *
 * Encoded in the NCBI layout: 64 characters ordered by base1, base2, base3
 * over T, C, A, G. Storing them as the published strings rather than as
 * hand-typed codon maps means a table can be checked against the source by eye,
 * and a transcription error shows up as an obviously wrong character.
 *
 * Source: NCBI Taxonomy genetic codes.
 * https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi
 */

const BASES = ['T', 'C', 'A', 'G'] as const;

export interface GeneticCode {
  id: string;
  /** NCBI translation table number. */
  ncbiId: number;
  name: string;
  aminoAcids: string;
  starts: string;
}

export const GENETIC_CODES: readonly GeneticCode[] = [
  {
    id: 'standard',
    ncbiId: 1,
    name: 'Standard',
    aminoAcids: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
    starts: '---M------**--*----M---------------M----------------------------',
  },
  {
    id: 'vertebrate-mitochondrial',
    ncbiId: 2,
    name: 'Vertebrate mitochondrial',
    aminoAcids: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG',
    starts: '----------**--------------------MMMM----------**---M------------',
  },
  {
    id: 'bacterial',
    ncbiId: 11,
    name: 'Bacterial, archaeal and plant plastid',
    aminoAcids: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
    starts: '---M------**--*----M------------MMMM---------------M------------',
  },
] as const;

export function getGeneticCode(id: string): GeneticCode {
  const code = GENETIC_CODES.find((entry) => entry.id === id);
  if (!code) throw new Error(`Unknown genetic code: ${id}`);
  return code;
}

function baseIndex(base: string): number {
  const index = BASES.indexOf(base as (typeof BASES)[number]);
  return index;
}

/** Codon index in the NCBI ordering, or -1 if the codon contains ambiguity. */
export function codonIndex(codon: string): number {
  if (codon.length !== 3) return -1;
  const normalized = codon.toUpperCase().replace(/U/g, 'T');
  const first = baseIndex(normalized[0] ?? '');
  const second = baseIndex(normalized[1] ?? '');
  const third = baseIndex(normalized[2] ?? '');
  if (first < 0 || second < 0 || third < 0) return -1;
  return first * 16 + second * 4 + third;
}

/** Translates one codon. Ambiguous or incomplete codons give 'X'. */
export function translateCodon(codon: string, code: GeneticCode): string {
  const index = codonIndex(codon);
  if (index < 0) return 'X';
  return code.aminoAcids[index] ?? 'X';
}

export function isStartCodon(codon: string, code: GeneticCode): boolean {
  const index = codonIndex(codon);
  return index >= 0 && code.starts[index] === 'M';
}

export interface TranslationOptions {
  code: GeneticCode;
  /** 1, 2 or 3 for the forward frames; -1, -2, -3 for the reverse strand. */
  frame: number;
  /** Render initiator codons as M even where the codon is not itself ATG. */
  useStartCodonRules?: boolean;
}

/**
 * Translates a nucleotide sequence in a single frame.
 *
 * A trailing partial codon is dropped rather than padded — inventing bases to
 * complete a codon would produce a residue that is not in the sequence.
 */
export function translateFrame(residues: string, options: TranslationOptions): string {
  const { code, frame, useStartCodonRules = false } = options;
  const offset = Math.abs(frame) - 1;
  let protein = '';

  for (let index = offset; index + 3 <= residues.length; index += 3) {
    const codon = residues.slice(index, index + 3);
    const isFirst = index === offset;
    if (useStartCodonRules && isFirst && isStartCodon(codon, code)) {
      protein += 'M';
    } else {
      protein += translateCodon(codon, code);
    }
  }

  return protein;
}
