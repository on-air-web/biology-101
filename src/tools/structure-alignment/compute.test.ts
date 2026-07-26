import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/brand/geometry';
import type { Vec3 } from '@/lib/bio/superpose';
import {
  AlignmentError,
  MAX_RESIDUES,
  alignStructures,
  d0ForLength,
  interpretTmScore,
} from './compute';

/**
 * Structures here are generated, not loaded, so every expected answer follows
 * from how the coordinates were built rather than from a published table. An
 * alpha helix is a real geometric object with known rise and radius, which
 * makes it a reference that can be reasoned about.
 */

/** Ideal alpha helix: 1.5 A rise per residue, 2.3 A radius, 100 degrees turn. */
function helix(length: number, offset: Vec3 = [0, 0, 0]): Vec3[] {
  return Array.from({ length }, (_, i) => {
    const angle = (i * 100 * Math.PI) / 180;
    return [
      2.3 * Math.cos(angle) + offset[0],
      2.3 * Math.sin(angle) + offset[1],
      1.5 * i + offset[2],
    ] as Vec3;
  });
}

/** A self-avoiding random walk at 3.8 A spacing — a plausible but unrelated fold. */
function randomChain(length: number, seed: number): Vec3[] {
  const random = mulberry32(seed);
  const points: Vec3[] = [[0, 0, 0]];
  for (let i = 1; i < length; i += 1) {
    const previous = points[i - 1]!;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    points.push([
      previous[0] + 3.8 * Math.sin(phi) * Math.cos(theta),
      previous[1] + 3.8 * Math.sin(phi) * Math.sin(theta),
      previous[2] + 3.8 * Math.cos(phi),
    ]);
  }
  return points;
}

function rotate(points: readonly Vec3[], radians: number, shift: Vec3): Vec3[] {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return points.map(([x, y, z]) => [
    c * x - s * y + shift[0],
    s * x + c * y + shift[1],
    z + shift[2],
  ]);
}

describe('d0', () => {
  /**
   * The published normalisation, evaluated rather than recalled: at length 100
   * d0 is 1.24 * cbrt(85) - 1.8, which is a number this test computes for
   * itself from the same expression the code claims to implement.
   */
  it('follows the Zhang-Skolnick expression once it clears the floor', () => {
    // The expression only rises above 0.5 A at about 21 residues, so shorter
    // lengths belong to the clamp test below rather than here.
    for (const length of [30, 60, 100, 300, 1000]) {
      const formula = 1.24 * Math.cbrt(length - 15) - 1.8;
      expect(formula).toBeGreaterThan(0.5);
      expect(d0ForLength(length)).toBeCloseTo(formula, 12);
    }
  });

  it('is clamped wherever the expression falls below half an angstrom', () => {
    // Below 15 residues the cube root is of a negative number; between 15 and
    // about 21 the expression is positive but too small to be meaningful.
    expect(d0ForLength(5)).toBe(0.5);
    expect(d0ForLength(15)).toBe(0.5);
    expect(d0ForLength(20)).toBe(0.5);
    expect(1.24 * Math.cbrt(20 - 15) - 1.8).toBeLessThan(0.5);
    // And it never returns less than the floor, at any length.
    for (let length = 1; length <= 60; length += 1) {
      expect(d0ForLength(length), `length ${length}`).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('grows with length, which is the point of it', () => {
    expect(d0ForLength(400)).toBeGreaterThan(d0ForLength(100));
    expect(d0ForLength(100)).toBeGreaterThan(d0ForLength(40));
  });
});

describe('aligning a structure to itself', () => {
  const chain = randomChain(80, 7);

  it('scores 1 and superposes exactly', () => {
    const result = alignStructures({ a: chain, b: chain });
    expect(result.tmScoreByA).toBeCloseTo(1, 6);
    expect(result.tmScoreByB).toBeCloseTo(1, 6);
    expect(result.rmsd).toBeCloseTo(0, 6);
    expect(result.alignedLength).toBe(chain.length);
  });

  /** Rigid motion cannot change a structural relationship. */
  it('is unaffected by where the copy sits in space', () => {
    const moved = rotate(chain, 2.1, [50, -30, 12]);
    const result = alignStructures({ a: chain, b: moved });
    expect(result.tmScoreByA).toBeCloseTo(1, 6);
    expect(result.rmsd).toBeCloseTo(0, 6);
  });

  it('pairs every residue with its own counterpart', () => {
    const result = alignStructures({ a: chain, b: rotate(chain, 0.9, [3, 3, 3]) });
    for (const pair of result.pairs) expect(pair.a).toBe(pair.b);
  });
});

describe('discrimination', () => {
  /**
   * The interpretive claim the tool makes has to hold: unrelated folds must
   * land below the 0.3 mark, or the thresholds printed in the interface are
   * misleading.
   */
  it('scores two unrelated chains low', () => {
    for (const seed of [11, 23, 44]) {
      const result = alignStructures({
        a: randomChain(90, seed),
        b: randomChain(90, seed + 500),
      });
      expect(result.tmScoreByA, `seed ${seed}`).toBeLessThan(0.35);
    }
  });

  it('scores two helices of the same length high', () => {
    const result = alignStructures({ a: helix(50), b: helix(50, [20, 20, 20]) });
    expect(result.tmScoreByA).toBeGreaterThan(0.9);
  });

  /** A helix and a random walk are different objects and must score as such. */
  it('separates a helix from a random walk', () => {
    const result = alignStructures({ a: helix(70), b: randomChain(70, 3) });
    expect(result.tmScoreByA).toBeLessThan(0.5);
  });

  it('finds a short domain inside a longer chain', () => {
    const long = randomChain(150, 61);
    // Residues 40-99 of the same chain, moved away.
    const fragment = rotate(long.slice(40, 100), 1.3, [40, 10, -20]);
    const result = alignStructures({ a: fragment, b: long });

    // Normalised by the fragment it is a near-perfect match; by the whole
    // chain it cannot exceed the fraction that was matched.
    expect(result.tmScoreByA).toBeGreaterThan(0.9);
    expect(result.tmScoreByB).toBeLessThan(0.6);
    // And it must find the right offset.
    const offsets = result.pairs.map((pair) => pair.b - pair.a);
    expect(offsets.filter((o) => o === 40).length / offsets.length).toBeGreaterThan(0.9);
  });
});

describe('asymmetry and reporting', () => {
  it('reports both normalisations, which differ when the lengths do', () => {
    const long = randomChain(120, 9);
    const result = alignStructures({ a: long.slice(0, 60), b: long });
    expect(result.tmScoreByA).not.toBeCloseTo(result.tmScoreByB, 2);
    expect(result.lengthA).toBe(60);
    expect(result.lengthB).toBe(120);
  });

  /** Swapping the inputs must swap the two scores, not change them. */
  it('is consistent when the inputs are swapped', () => {
    const a = randomChain(70, 13);
    const b = rotate(a.slice(0, 45), 0.6, [10, 0, 0]);
    const forward = alignStructures({ a, b });
    const backward = alignStructures({ a: b, b: a });
    expect(backward.tmScoreByA).toBeCloseTo(forward.tmScoreByB, 2);
    expect(backward.tmScoreByB).toBeCloseTo(forward.tmScoreByA, 2);
  });

  it('recomputes RMSD as the root mean square of the reported distances', () => {
    const result = alignStructures({ a: randomChain(60, 2), b: randomChain(60, 3) });
    const rms = Math.sqrt(
      result.pairs.reduce((sum, pair) => sum + pair.distance ** 2, 0) / result.pairs.length,
    );
    expect(rms).toBeCloseTo(result.rmsd, 9);
  });

  it('counts sequence identity over the alignment only', () => {
    const chain = randomChain(40, 5);
    const sequence = 'ACDEFGHIKLMNPQRSTVWY'.repeat(2);
    const result = alignStructures({
      a: chain,
      b: chain,
      sequenceA: sequence,
      sequenceB: sequence,
    });
    expect(result.sequenceIdentity).toBeCloseTo(1, 9);

    const different = alignStructures({
      a: chain,
      b: chain,
      sequenceA: sequence,
      sequenceB: 'W'.repeat(40),
    });
    // Only the tryptophans in the original can match.
    expect(different.sequenceIdentity).toBeCloseTo(2 / 40, 6);
  });

  it('counts the pairs that genuinely superpose', () => {
    const chain = randomChain(80, 17);
    const self = alignStructures({ a: chain, b: chain });
    expect(self.closePairs).toBe(self.alignedLength);
  });
});

describe('interpretation', () => {
  /** The wording drives what a user concludes, so the boundaries are tested. */
  it('describes each band of the scale', () => {
    expect(interpretTmScore(0.95)).toMatch(/same structure/);
    expect(interpretTmScore(0.5)).toMatch(/same fold/);
    expect(interpretTmScore(0.72)).toMatch(/same fold/);
    expect(interpretTmScore(0.35)).toMatch(/below the threshold/);
    expect(interpretTmScore(0.12)).toMatch(/randomly chosen/);
  });
});

describe('input handling', () => {
  it('refuses structures too small to orient', () => {
    expect(() => alignStructures({ a: randomChain(2, 1), b: randomChain(40, 2) })).toThrow(
      AlignmentError,
    );
  });

  it('refuses an assembly too large for the grid, and says what to do', () => {
    const huge = Array.from({ length: MAX_RESIDUES + 1 }, () => [0, 0, 0] as Vec3);
    expect(() => alignStructures({ a: huge, b: randomChain(40, 2) })).toThrow(/single chain/);
  });
});
