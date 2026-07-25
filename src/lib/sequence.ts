/**
 * Sequence handling.
 *
 * Shared by every sequence tool. Pure, framework-free, and strict about
 * ambiguity codes: silently discarding an N or an R would change a result
 * without telling the user, which is the worst failure mode a sequence tool
 * has.
 */

export type SequenceKind = 'dna' | 'rna' | 'protein' | 'unknown';

/** IUPAC nucleotide codes, including the ambiguity set. */
export const DNA_ALPHABET = 'ACGTURYSWKMBDHVN';
export const PROTEIN_ALPHABET = 'ACDEFGHIKLMNPQRSTVWYBZXU*';

export interface ParsedSequence {
  /** FASTA description line, without the leading '>' , when one was present. */
  header?: string;
  /** Uppercased residues with all formatting removed. */
  residues: string;
  kind: SequenceKind;
  /** Characters that are not valid for the detected kind, deduplicated. */
  invalidCharacters: string[];
  /** Count of residues outside the unambiguous four (or twenty). */
  ambiguousCount: number;
}

const UNAMBIGUOUS_NUCLEOTIDES = new Set('ACGTU');

/**
 * Strips everything a pasted sequence normally carries: FASTA headers, line
 * numbers from alignment viewers, whitespace, gap characters and digits.
 */
export function parseSequence(input: string): ParsedSequence {
  const lines = input.split(/\r?\n/);
  let header: string | undefined;
  const body: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>') || trimmed.startsWith(';')) {
      // Only the first header is kept; multi-record FASTA belongs in a
      // dedicated tool rather than being silently concatenated here.
      header ??= trimmed.slice(1).trim();
      continue;
    }
    body.push(trimmed);
  }

  const residues = body
    .join('')
    .toUpperCase()
    .replace(/[\s\d.\-*]/g, (match) => (match === '*' ? '*' : ''));

  const kind = detectKind(residues);
  const alphabet = kind === 'protein' ? PROTEIN_ALPHABET : DNA_ALPHABET;

  const invalid = new Set<string>();
  let ambiguousCount = 0;

  for (const character of residues) {
    if (!alphabet.includes(character)) {
      invalid.add(character);
    } else if (kind !== 'protein' && !UNAMBIGUOUS_NUCLEOTIDES.has(character)) {
      ambiguousCount += 1;
    }
  }

  return {
    header,
    residues,
    kind,
    invalidCharacters: [...invalid],
    ambiguousCount,
  };
}

/**
 * Distinguishes nucleotide from protein sequence.
 *
 * The heuristic is deliberately conservative: a sequence is only called
 * protein when it contains residues that cannot be nucleotide codes at all.
 * Short peptides made only of, say, ACGT are genuinely ambiguous, and guessing
 * protein there would break far more common DNA use.
 */
export function detectKind(residues: string): SequenceKind {
  if (residues.length === 0) return 'unknown';

  let proteinOnly = 0;
  let hasT = false;
  let hasU = false;

  for (const character of residues) {
    if (character === 'T') hasT = true;
    if (character === 'U') hasU = true;
    if (!DNA_ALPHABET.includes(character) && PROTEIN_ALPHABET.includes(character)) {
      proteinOnly += 1;
    }
  }

  if (proteinOnly > 0) return 'protein';
  if (hasU && !hasT) return 'rna';
  return 'dna';
}

const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  U: 'A',
  G: 'C',
  C: 'G',
  // Ambiguity codes complement to their mirrored sets. Dropping these would
  // quietly corrupt any sequence containing degenerate primer positions.
  R: 'Y',
  Y: 'R',
  S: 'S',
  W: 'W',
  K: 'M',
  M: 'K',
  B: 'V',
  V: 'B',
  D: 'H',
  H: 'D',
  N: 'N',
};

export function complement(residues: string, asRna = false): string {
  let output = '';
  for (const character of residues) {
    const complemented = COMPLEMENT[character] ?? 'N';
    output += asRna && complemented === 'T' ? 'U' : complemented;
  }
  return output;
}

export function reverse(residues: string): string {
  return [...residues].reverse().join('');
}

export function reverseComplement(residues: string, asRna = false): string {
  return reverse(complement(residues, asRna));
}

export interface BaseComposition {
  counts: Record<string, number>;
  gc: number;
  at: number;
  ambiguous: number;
  /** GC as a fraction of unambiguously assignable positions, or undefined. */
  gcFraction?: number;
}

/**
 * Base composition.
 *
 * S (G or C) and W (A or T) are assignable even though they are ambiguity
 * codes, so they are counted. Everything else degenerate is reported
 * separately rather than folded into the denominator — a GC value computed
 * over positions that could go either way is not a GC value.
 */
export function baseComposition(residues: string): BaseComposition {
  const counts: Record<string, number> = {};
  let gc = 0;
  let at = 0;
  let ambiguous = 0;

  for (const character of residues) {
    counts[character] = (counts[character] ?? 0) + 1;
    if (character === 'G' || character === 'C' || character === 'S') gc += 1;
    else if (character === 'A' || character === 'T' || character === 'U' || character === 'W')
      at += 1;
    else ambiguous += 1;
  }

  const assignable = gc + at;
  return {
    counts,
    gc,
    at,
    ambiguous,
    gcFraction: assignable > 0 ? gc / assignable : undefined,
  };
}

/** Splits into fixed-width blocks for display, as sequence viewers present it. */
export function chunk(residues: string, size = 10): string[] {
  const blocks: string[] = [];
  for (let index = 0; index < residues.length; index += size) {
    blocks.push(residues.slice(index, index + size));
  }
  return blocks;
}
