/**
 * Optimal rigid-body superposition of two point sets.
 *
 * Given a correspondence — which atom in one structure matches which in the
 * other — there is a closed-form rotation minimising the RMSD between them.
 * Finding the correspondence is the hard problem; this is the easy half, and
 * it is exact.
 *
 * Horn's quaternion method is used rather than the more familiar Kabsch SVD.
 * They give the same answer, but the quaternion route reduces to the largest
 * eigenvector of a symmetric 4x4 matrix, which cyclic Jacobi solves in a few
 * dozen lines and without an SVD implementation. It also handles the
 * reflection case for free: a quaternion is a rotation by construction, so
 * there is no determinant sign to correct, which is the classic Kabsch bug.
 *
 * No React, no DOM. Coordinates are angstroms throughout.
 */

export type Vec3 = readonly [number, number, number];

export class SuperposeError extends Error {}

export interface Superposition {
  /** Root mean square deviation after optimal superposition, angstroms. */
  rmsd: number;
  /** Row-major 3x3 rotation taking the centred mobile set onto the target. */
  rotation: number[][];
  /** Applied after rotation: rotate about mobileCentre, then add this. */
  translation: Vec3;
  mobileCentre: Vec3;
  targetCentre: Vec3;
}

export function centroid(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) throw new SuperposeError('Cannot take the centroid of no points.');
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [px, py, pz] of points) {
    x += px;
    y += py;
    z += pz;
  }
  const n = points.length;
  return [x / n, y / n, z / n];
}

/**
 * Eigen-decomposition of a real symmetric matrix by cyclic Jacobi rotations.
 *
 * Chosen for the same reason bisection is used elsewhere in this codebase: it
 * cannot diverge, it needs no pivoting strategy, and at 4x4 its cost is
 * irrelevant. Returns eigenvalues with their eigenvectors as columns.
 */
export function jacobiEigen(
  input: readonly (readonly number[])[],
  maxSweeps = 100,
): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
    let off = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) off += a[p]![q]! ** 2;
    }
    if (off < 1e-30) break;

    for (let p = 0; p < n - 1; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-300) continue;

        // Rotation angle that zeroes the (p, q) element.
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        for (let k = 0; k < n; k += 1) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }

  return { values: a.map((row, i) => row[i]!), vectors: v };
}

/** Rotation matrix from a unit quaternion (w, x, y, z). */
function quaternionToMatrix(w: number, x: number, y: number, z: number): number[][] {
  return [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ];
}

export function applyTransform(point: Vec3, superposition: Superposition): Vec3 {
  const { rotation, mobileCentre, targetCentre } = superposition;
  const dx = point[0] - mobileCentre[0];
  const dy = point[1] - mobileCentre[1];
  const dz = point[2] - mobileCentre[2];
  return [
    rotation[0]![0]! * dx + rotation[0]![1]! * dy + rotation[0]![2]! * dz + targetCentre[0],
    rotation[1]![0]! * dx + rotation[1]![1]! * dy + rotation[1]![2]! * dz + targetCentre[1],
    rotation[2]![0]! * dx + rotation[2]![1]! * dy + rotation[2]![2]! * dz + targetCentre[2],
  ];
}

/**
 * Superposes `mobile` onto `target`, pairing them by index.
 *
 * Both sets must be the same length: this function does not decide what
 * matches what, and silently truncating would answer a question nobody asked.
 */
export function superpose(mobile: readonly Vec3[], target: readonly Vec3[]): Superposition {
  if (mobile.length !== target.length) {
    throw new SuperposeError('Superposition needs the same number of points in both sets.');
  }
  if (mobile.length < 3) {
    throw new SuperposeError('At least three points are needed to define an orientation.');
  }

  const mobileCentre = centroid(mobile);
  const targetCentre = centroid(target);

  // Correlation matrix of the centred coordinates.
  let sxx = 0,
    sxy = 0,
    sxz = 0;
  let syx = 0,
    syy = 0,
    syz = 0;
  let szx = 0,
    szy = 0,
    szz = 0;

  for (let i = 0; i < mobile.length; i += 1) {
    const px = mobile[i]![0] - mobileCentre[0];
    const py = mobile[i]![1] - mobileCentre[1];
    const pz = mobile[i]![2] - mobileCentre[2];
    const qx = target[i]![0] - targetCentre[0];
    const qy = target[i]![1] - targetCentre[1];
    const qz = target[i]![2] - targetCentre[2];

    sxx += px * qx;
    sxy += px * qy;
    sxz += px * qz;
    syx += py * qx;
    syy += py * qy;
    syz += py * qz;
    szx += pz * qx;
    szy += pz * qy;
    szz += pz * qz;
  }

  // Horn's symmetric key matrix. Its largest eigenvector is the quaternion of
  // the optimal rotation.
  const n = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];

  const { values, vectors } = jacobiEigen(n);
  let best = 0;
  for (let i = 1; i < 4; i += 1) if (values[i]! > values[best]!) best = i;

  const w = vectors[0]![best]!;
  const x = vectors[1]![best]!;
  const y = vectors[2]![best]!;
  const z = vectors[3]![best]!;
  const norm = Math.hypot(w, x, y, z) || 1;
  const rotation = quaternionToMatrix(w / norm, x / norm, y / norm, z / norm);

  const superposition: Superposition = {
    rmsd: 0,
    rotation,
    translation: [0, 0, 0],
    mobileCentre,
    targetCentre,
  };

  // Computed from the transformed points rather than from the eigenvalue: the
  // residual form loses precision badly when the fit is near-perfect, which is
  // exactly the case a test would use.
  let total = 0;
  for (let i = 0; i < mobile.length; i += 1) {
    const [ax, ay, az] = applyTransform(mobile[i]!, superposition);
    total += (ax - target[i]![0]) ** 2 + (ay - target[i]![1]) ** 2 + (az - target[i]![2]) ** 2;
  }

  return { ...superposition, rmsd: Math.sqrt(total / mobile.length) };
}

/** Distances between paired points after a superposition, in order. */
export function deviations(
  mobile: readonly Vec3[],
  target: readonly Vec3[],
  superposition: Superposition,
): number[] {
  return mobile.map((point, index) => {
    const [x, y, z] = applyTransform(point, superposition);
    const q = target[index]!;
    return Math.hypot(x - q[0], y - q[1], z - q[2]);
  });
}
