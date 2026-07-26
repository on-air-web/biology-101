import { describe, expect, it } from 'vitest';
import {
  SuperposeError,
  type Vec3,
  applyTransform,
  centroid,
  deviations,
  jacobiEigen,
  superpose,
} from './superpose';
import { mulberry32 } from '@/lib/brand/geometry';

/**
 * Reference values here are constructed, not recalled. A known rotation is
 * applied to a known point cloud and the algorithm has to recover it, so the
 * expected answer is exact by construction and there is no table to misquote.
 */

function rotationMatrix(axis: 'x' | 'y' | 'z', radians: number): number[][] {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  if (axis === 'x')
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c],
    ];
  if (axis === 'y')
    return [
      [c, 0, s],
      [0, 1, 0],
      [-s, 0, c],
    ];
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

function multiply(a: number[][], b: number[][]): number[][] {
  return a.map((row) => b[0]!.map((_, j) => row.reduce((sum, v, k) => sum + v * b[k]![j]!, 0)));
}

function transform(points: Vec3[], rotation: number[][], shift: Vec3): Vec3[] {
  return points.map(([x, y, z]) => [
    rotation[0]![0]! * x + rotation[0]![1]! * y + rotation[0]![2]! * z + shift[0],
    rotation[1]![0]! * x + rotation[1]![1]! * y + rotation[1]![2]! * z + shift[1],
    rotation[2]![0]! * x + rotation[2]![1]! * y + rotation[2]![2]! * z + shift[2],
  ]);
}

/** A deterministic, non-degenerate cloud — not planar, not symmetric. */
function cloud(count = 30, seed = 4242): Vec3[] {
  const random = mulberry32(seed);
  return Array.from(
    { length: count },
    () => [random() * 40 - 20, random() * 40 - 20, random() * 40 - 20] as Vec3,
  );
}

describe('jacobiEigen', () => {
  it('diagonalises a matrix whose eigenvalues are on the diagonal', () => {
    const { values } = jacobiEigen([
      [3, 0, 0],
      [0, -1, 0],
      [0, 0, 7],
    ]);
    expect([...values].sort((a, b) => a - b)).toEqual([-1, 3, 7]);
  });

  /** Av = λv is the definition, checked directly rather than against a table. */
  it('returns eigenvectors satisfying the definition', () => {
    const m = [
      [4, 1, -2, 0.5],
      [1, 3, 0.7, -1],
      [-2, 0.7, 6, 2],
      [0.5, -1, 2, -3],
    ];
    const { values, vectors } = jacobiEigen(m);
    for (let col = 0; col < 4; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        const av = m[row]!.reduce((sum, v, k) => sum + v * vectors[k]![col]!, 0);
        expect(av).toBeCloseTo(values[col]! * vectors[row]![col]!, 8);
      }
    }
  });

  it('conserves the trace, which is the sum of the eigenvalues', () => {
    const m = [
      [2, -1, 0],
      [-1, 5, 3],
      [0, 3, -4],
    ];
    const { values } = jacobiEigen(m);
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(2 + 5 - 4, 9);
  });
});

describe('superpose', () => {
  it('finds zero RMSD for a set moved by a known rigid transform', () => {
    const points = cloud();
    const rotation = multiply(rotationMatrix('z', 0.7), rotationMatrix('x', -1.1));
    const moved = transform(points, rotation, [13, -4, 26]);

    const fit = superpose(moved, points);
    expect(fit.rmsd).toBeCloseTo(0, 9);
  });

  it('recovers the transform, so the points land on their targets', () => {
    const points = cloud();
    const moved = transform(points, rotationMatrix('y', 2.4), [-7, 11, 3]);
    const fit = superpose(moved, points);

    for (let i = 0; i < points.length; i += 1) {
      const [x, y, z] = applyTransform(moved[i]!, fit);
      expect(x).toBeCloseTo(points[i]![0], 8);
      expect(y).toBeCloseTo(points[i]![1], 8);
      expect(z).toBeCloseTo(points[i]![2], 8);
    }
  });

  it('is unchanged by where the structures sit in space', () => {
    const a = cloud(25, 11);
    const b = cloud(25, 99);
    const here = superpose(a, b).rmsd;
    const moved = superpose(transform(a, rotationMatrix('x', 0.3), [100, -250, 40]), b).rmsd;
    expect(moved).toBeCloseTo(here, 8);
  });

  it('is symmetric: fitting either way gives the same RMSD', () => {
    const a = cloud(25, 3);
    const b = cloud(25, 8);
    expect(superpose(a, b).rmsd).toBeCloseTo(superpose(b, a).rmsd, 9);
  });

  /**
   * The classic failure of a naive Kabsch is returning a reflection when the
   * clouds are near-degenerate. A quaternion is a rotation by construction, so
   * the determinant must be +1 and never -1.
   */
  it('returns a proper rotation, never a reflection', () => {
    for (const seed of [1, 2, 3, 17, 250]) {
      const a = cloud(12, seed);
      const b = cloud(12, seed + 1000);
      const r = superpose(a, b).rotation;
      const det =
        r[0]![0]! * (r[1]![1]! * r[2]![2]! - r[1]![2]! * r[2]![1]!) -
        r[0]![1]! * (r[1]![0]! * r[2]![2]! - r[1]![2]! * r[2]![0]!) +
        r[0]![2]! * (r[1]![0]! * r[2]![1]! - r[1]![1]! * r[2]![0]!);
      expect(det, `seed ${seed}`).toBeCloseTo(1, 8);
    }
  });

  /** A mirrored structure cannot be rotated onto the original. */
  it('cannot fit a reflected structure onto its original', () => {
    const points = cloud(20, 55);
    const mirrored = points.map(([x, y, z]) => [x, y, -z] as Vec3);
    expect(superpose(mirrored, points).rmsd).toBeGreaterThan(1);
  });

  /** Displacing one atom by d raises the RMSD by exactly d/sqrt(N). */
  it('responds to a single displaced atom by the expected amount', () => {
    const points = cloud(16, 77);
    const moved: Vec3[] = points.map((p, i) => (i === 0 ? [p[0] + 3, p[1], p[2]] : p));
    // Superposition will absorb a little of the shift, so this is an upper bound.
    expect(superpose(moved, points).rmsd).toBeLessThanOrEqual(3 / Math.sqrt(16) + 1e-9);
    expect(superpose(moved, points).rmsd).toBeGreaterThan(0);
  });

  it('refuses mismatched or degenerate input rather than truncating', () => {
    expect(() => superpose(cloud(5), cloud(6))).toThrow(SuperposeError);
    expect(() => superpose(cloud(2), cloud(2))).toThrow(SuperposeError);
    expect(() => centroid([])).toThrow(SuperposeError);
  });
});

describe('deviations', () => {
  it('is zero everywhere for an exact fit', () => {
    const points = cloud(18, 21);
    const moved = transform(points, rotationMatrix('z', 1.9), [5, 5, -5]);
    const fit = superpose(moved, points);
    for (const d of deviations(moved, points, fit)) expect(d).toBeCloseTo(0, 8);
  });

  it('recovers the RMSD as the root mean square of itself', () => {
    const a = cloud(24, 31);
    const b = cloud(24, 32);
    const fit = superpose(a, b);
    const d = deviations(a, b, fit);
    const rms = Math.sqrt(d.reduce((sum, value) => sum + value * value, 0) / d.length);
    expect(rms).toBeCloseTo(fit.rmsd, 9);
  });
});
