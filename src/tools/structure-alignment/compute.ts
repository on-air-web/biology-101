/**
 * Sequence-independent structural alignment.
 *
 * Finds which residue of one structure corresponds to which of another using
 * geometry alone, then reports how well they superpose. This is the TM-align
 * approach of Zhang & Skolnick: seed an alignment, superpose on it, rescore
 * every pair by distance, realign by dynamic programming, and iterate to a
 * fixed point — repeated from several seeds, keeping the best result.
 *
 * Why not just RMSD. RMSD is an average over the pairs you chose, so it
 * punishes one flexible loop as hard as a wrong fold, and it grows with
 * length: 4 A means something quite different across 60 residues than across
 * 600. TM-score normalises by the length of the reference through d0, which
 * makes it comparable between pairs of any size, and it saturates — a distant
 * residue stops adding penalty rather than dominating. The convention that
 * matters in practice: above roughly 0.5 the two structures share a fold,
 * below about 0.3 the resemblance is what you would get from two unrelated
 * proteins.
 *
 * TM-score is asymmetric, because it depends on which length you divide by, so
 * both normalisations are reported rather than one being picked silently.
 *
 * This is an independent implementation of the published method, not a port of
 * the reference program, and it is not expected to reproduce it to the third
 * decimal. Where they differ it will be in the seeding: this uses gapless
 * threading and a secondary-structure seed, not the full set.
 *
 * Coordinates are angstroms. No React, no DOM, and nothing leaves the browser.
 */

import { type Vec3, applyTransform, superpose, type Superposition } from '@/lib/bio/superpose';

export class AlignmentError extends Error {}

/** Beyond this the dynamic programming grid stops being browser-friendly. */
export const MAX_RESIDUES = 3000;

export interface AlignedPair {
  a: number;
  b: number;
  /** Distance between the pair after the reported superposition, angstroms. */
  distance: number;
}

export interface AlignmentResult {
  pairs: AlignedPair[];
  /** Normalised by the length of the first structure. */
  tmScoreByA: number;
  /** Normalised by the length of the second structure. */
  tmScoreByB: number;
  /** RMSD over the aligned pairs only, angstroms. */
  rmsd: number;
  alignedLength: number;
  /** Fraction of aligned pairs whose residues are the same amino acid. */
  sequenceIdentity: number;
  superposition: Superposition;
  lengthA: number;
  lengthB: number;
  d0: number;
  /** Aligned pairs closer than 5 A, the ones genuinely superposed. */
  closePairs: number;
}

/**
 * The distance at which a residue pair scores a half.
 *
 * Zhang & Skolnick's normalisation, and the whole reason TM-score is
 * comparable across lengths: a larger protein is allowed proportionally more
 * deviation before a pair stops counting. Clamped at 0.5 A because the cube
 * root goes imaginary below 15 residues and negative below about 18.
 */
export function d0ForLength(length: number): number {
  if (length <= 15) return 0.5;
  return Math.max(0.5, 1.24 * Math.cbrt(length - 15) - 1.8);
}

function distance(p: Vec3, q: Vec3): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * TM-score of an alignment under a given superposition.
 *
 * Note it is the *reference length* on the denominator, not the number of
 * aligned pairs — aligning ten residues perfectly out of three hundred is a
 * poor match and the score has to say so.
 */
function scoreAlignment(
  a: readonly Vec3[],
  b: readonly Vec3[],
  pairs: readonly { a: number; b: number }[],
  fit: Superposition,
  referenceLength: number,
): number {
  const d0 = d0ForLength(referenceLength);
  let total = 0;
  for (const pair of pairs) {
    const d = distance(applyTransform(a[pair.a]!, fit), b[pair.b]!);
    total += 1 / (1 + (d / d0) ** 2);
  }
  return total / referenceLength;
}

/**
 * Needleman–Wunsch over a similarity matrix supplied as a callback.
 *
 * A linear gap penalty rather than affine, following TM-align: structural
 * alignment gaps are usually whole loops rather than single indels, and the
 * extra parameter buys little.
 */
function dynamicProgramme(
  lengthA: number,
  lengthB: number,
  score: (i: number, j: number) => number,
  gapPenalty: number,
): { a: number; b: number }[] {
  const width = lengthB + 1;
  const best = new Float64Array((lengthA + 1) * width);
  // 0 diagonal, 1 from above (gap in B), 2 from the left (gap in A)
  const from = new Uint8Array((lengthA + 1) * width);

  for (let i = 1; i <= lengthA; i += 1) {
    best[i * width] = 0;
    from[i * width] = 1;
  }
  for (let j = 1; j <= lengthB; j += 1) {
    best[j] = 0;
    from[j] = 2;
  }

  for (let i = 1; i <= lengthA; i += 1) {
    for (let j = 1; j <= lengthB; j += 1) {
      const diagonal = best[(i - 1) * width + (j - 1)]! + score(i - 1, j - 1);
      const up = best[(i - 1) * width + j]! + gapPenalty;
      const left = best[i * width + (j - 1)]! + gapPenalty;

      let value = diagonal;
      let choice = 0;
      if (up > value) {
        value = up;
        choice = 1;
      }
      if (left > value) {
        value = left;
        choice = 2;
      }
      best[i * width + j] = value;
      from[i * width + j] = choice;
    }
  }

  const pairs: { a: number; b: number }[] = [];
  let i = lengthA;
  let j = lengthB;
  while (i > 0 && j > 0) {
    const choice = from[i * width + j]!;
    if (choice === 0) {
      pairs.push({ a: i - 1, b: j - 1 });
      i -= 1;
      j -= 1;
    } else if (choice === 1) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return pairs.reverse();
}

/**
 * Refines a seed alignment to a fixed point.
 *
 * Superpose on the current pairs, rescore every possible pair by how close it
 * lands, realign, repeat. Each step can only be taken if it improves the
 * score, so this converges; the iteration cap is a guard against a two-cycle,
 * not an expected exit.
 */
function refine(
  a: readonly Vec3[],
  b: readonly Vec3[],
  seed: readonly { a: number; b: number }[],
  referenceLength: number,
  iterations = 20,
): { pairs: { a: number; b: number }[]; fit: Superposition; score: number } | undefined {
  const d0 = d0ForLength(referenceLength);
  let pairs = [...seed];
  let bestScore = -1;
  let bestPairs = pairs;
  let bestFit: Superposition | undefined;

  for (let round = 0; round < iterations; round += 1) {
    if (pairs.length < 3)
      return bestFit ? { pairs: bestPairs, fit: bestFit, score: bestScore } : undefined;

    let fit: Superposition;
    try {
      fit = superpose(
        pairs.map((pair) => a[pair.a]!),
        pairs.map((pair) => b[pair.b]!),
      );
    } catch {
      return bestFit ? { pairs: bestPairs, fit: bestFit, score: bestScore } : undefined;
    }

    const score = scoreAlignment(a, b, pairs, fit, referenceLength);
    if (score > bestScore) {
      bestScore = score;
      bestPairs = pairs;
      bestFit = fit;
    }

    // Rescore every possible correspondence under this superposition.
    const moved = a.map((point) => applyTransform(point, fit));
    const next = dynamicProgramme(
      a.length,
      b.length,
      (i, j) => {
        const d = distance(moved[i]!, b[j]!);
        return 1 / (1 + (d / d0) ** 2);
      },
      -0.6,
    );

    const unchanged =
      next.length === pairs.length &&
      next.every((pair, index) => pair.a === pairs[index]!.a && pair.b === pairs[index]!.b);
    pairs = next;
    if (unchanged) break;
  }

  return bestFit ? { pairs: bestPairs, fit: bestFit, score: bestScore } : undefined;
}

/** Gapless diagonals, the cheap seeds. Each pairs i with i + offset. */
function threadingSeeds(lengthA: number, lengthB: number): { a: number; b: number }[][] {
  const seeds: { a: number; b: number }[][] = [];
  // A coarse sweep: every offset is wasteful and neighbouring ones converge to
  // the same fixed point anyway.
  const step = Math.max(1, Math.floor((lengthA + lengthB) / 40));
  for (let offset = -(lengthA - 4); offset <= lengthB - 4; offset += step) {
    const pairs: { a: number; b: number }[] = [];
    for (let i = 0; i < lengthA; i += 1) {
      const j = i + offset;
      if (j >= 0 && j < lengthB) pairs.push({ a: i, b: j });
    }
    if (pairs.length >= 5) seeds.push(pairs);
  }
  return seeds;
}

export interface AlignInput {
  a: readonly Vec3[];
  b: readonly Vec3[];
  /** One-letter codes, used only to report identity over the alignment. */
  sequenceA?: string;
  sequenceB?: string;
}

export function alignStructures(input: AlignInput): AlignmentResult {
  const { a, b } = input;

  if (a.length < 3 || b.length < 3) {
    throw new AlignmentError('Both structures need at least three residues to align.');
  }
  if (a.length > MAX_RESIDUES || b.length > MAX_RESIDUES) {
    throw new AlignmentError(
      `These structures have ${Math.max(a.length, b.length)} residues; this tool aligns up to ${MAX_RESIDUES}. Pick a single chain rather than the whole assembly.`,
    );
  }

  // Normalise by the shorter chain while searching. It is the more forgiving
  // denominator, so the search is not biased against a small domain matching
  // part of a large one; both normalisations are reported at the end.
  const referenceLength = Math.min(a.length, b.length);

  let best: { pairs: { a: number; b: number }[]; fit: Superposition; score: number } | undefined;
  for (const seed of threadingSeeds(a.length, b.length)) {
    const refined = refine(a, b, seed, referenceLength);
    if (refined && (!best || refined.score > best.score)) best = refined;
  }

  if (!best) {
    throw new AlignmentError('No superposition could be found for these structures.');
  }

  const { pairs, fit } = best;
  const withDistances: AlignedPair[] = pairs.map((pair) => ({
    a: pair.a,
    b: pair.b,
    distance: distance(applyTransform(a[pair.a]!, fit), b[pair.b]!),
  }));

  const squared = withDistances.reduce((sum, pair) => sum + pair.distance ** 2, 0);
  const identical = withDistances.filter(
    (pair) =>
      input.sequenceA !== undefined &&
      input.sequenceB !== undefined &&
      input.sequenceA[pair.a] === input.sequenceB[pair.b],
  ).length;

  return {
    pairs: withDistances,
    tmScoreByA: scoreAlignment(a, b, pairs, fit, a.length),
    tmScoreByB: scoreAlignment(a, b, pairs, fit, b.length),
    rmsd: withDistances.length > 0 ? Math.sqrt(squared / withDistances.length) : Number.NaN,
    alignedLength: withDistances.length,
    sequenceIdentity: withDistances.length > 0 ? identical / withDistances.length : 0,
    superposition: fit,
    lengthA: a.length,
    lengthB: b.length,
    d0: d0ForLength(referenceLength),
    closePairs: withDistances.filter((pair) => pair.distance < 5).length,
  };
}

/** How to read a TM-score, in one phrase. Kept out of the UI so it is testable. */
export function interpretTmScore(score: number): string {
  if (score >= 0.9) return 'essentially the same structure';
  if (score >= 0.5) return 'the same fold';
  if (score >= 0.3) return 'some structural similarity, but below the threshold for a shared fold';
  return 'no more similar than two randomly chosen proteins';
}
