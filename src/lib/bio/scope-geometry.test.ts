import { describe, expect, it } from 'vitest';
import {
  basisFor,
  convexHull,
  cross,
  drawSolid,
  dot,
  length,
  normalise,
  polylineDepth,
  project,
  ring,
  sortByDepth,
  toCamera,
  type Solid,
  type View,
} from './scope-geometry';

const FRONT: View = { yaw: 0, pitch: 0, scale: 1 };

describe('vector arithmetic', () => {
  it('normalises to unit length and keeps direction', () => {
    const n = normalise([0, 3, 4]);
    expect(length(n)).toBeCloseTo(1, 12);
    expect(n[1] / n[2]).toBeCloseTo(3 / 4, 12);
  });

  it('returns the optical axis rather than NaN for a zero vector', () => {
    // A degenerate axis is a data error, but returning NaN would propagate
    // silently into every path in the drawing and blank the whole scene.
    expect(normalise([0, 0, 0])).toEqual([0, 1, 0]);
  });

  it('gives a cross product perpendicular to both inputs', () => {
    const a: [number, number, number] = [1, 2, 3];
    const b: [number, number, number] = [-2, 1, 0.5];
    const c = cross(a, b);
    expect(dot(c, a)).toBeCloseTo(0, 12);
    expect(dot(c, b)).toBeCloseTo(0, 12);
  });
});

describe('the camera', () => {
  it('leaves a point on the optical axis alone under any yaw', () => {
    // Spinning the instrument about its own axis must not move the axis.
    for (const yaw of [0, 0.5, 1.7, Math.PI, 5.9]) {
      const c = toCamera([0, 10, 0], { ...FRONT, yaw });
      expect(c[0]).toBeCloseTo(0, 12);
      expect(c[1]).toBeCloseTo(10, 12);
      expect(c[2]).toBeCloseTo(0, 12);
    }
  });

  it('turns an off-axis point through a quarter turn of yaw', () => {
    const c = toCamera([5, 0, 0], { ...FRONT, yaw: Math.PI / 2 });
    expect(c[0]).toBeCloseTo(0, 12);
    expect(c[2]).toBeCloseTo(-5, 12);
  });

  it('preserves length — it is a rotation, not a transform', () => {
    const p: [number, number, number] = [3, -4, 12];
    const c = toCamera(p, { yaw: 1.1, pitch: 0.4, scale: 1 });
    expect(length(c)).toBeCloseTo(length(p), 10);
  });

  it('flips y for SVG, where the axis points down', () => {
    expect(project([0, 10, 0], FRONT).y).toBeCloseTo(-10, 12);
  });

  it('scales screen coordinates but not depth ordering', () => {
    const near = project([0, 0, 5], { ...FRONT, scale: 3 });
    const far = project([0, 0, -5], { ...FRONT, scale: 3 });
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('basisFor', () => {
  it('returns two unit vectors perpendicular to the axis and to each other', () => {
    for (const axis of [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
      [1, 1, 0],
      [0.3, -0.9, 0.2],
    ] as const) {
      const [u, v] = basisFor(axis);
      expect(length(u)).toBeCloseTo(1, 10);
      expect(length(v)).toBeCloseTo(1, 10);
      expect(dot(u, axis)).toBeCloseTo(0, 10);
      expect(dot(v, axis)).toBeCloseTo(0, 10);
      expect(dot(u, v)).toBeCloseTo(0, 10);
    }
  });

  it('does not collapse for an axis parallel to the seed direction', () => {
    // The failure mode this guards: crossing the axis with a parallel vector
    // gives the zero vector, and every ring becomes a point.
    const [u] = basisFor([0, 1, 0]);
    expect(length(u)).toBeCloseTo(1, 10);
  });
});

describe('ring', () => {
  it('places every point at the requested radius from the centre', () => {
    const points = ring([0, 5, 0], [0, 1, 0], 3, 16);
    expect(points).toHaveLength(16);
    for (const p of points) {
      const dx = p[0];
      const dz = p[2];
      expect(Math.sqrt(dx * dx + dz * dz)).toBeCloseTo(3, 10);
      expect(p[1]).toBeCloseTo(5, 10);
    }
  });

  it('lies in the plane perpendicular to a tilted axis', () => {
    const axis = normalise([0, 1, 1]);
    for (const p of ring([0, 0, 0], axis, 2, 12)) {
      expect(dot(p, axis)).toBeCloseTo(0, 10);
    }
  });
});

describe('convexHull', () => {
  it('reduces a filled square to its four corners', () => {
    const points = [];
    for (let x = 0; x <= 4; x += 1) for (let y = 0; y <= 4; y += 1) points.push({ x, y });
    const hull = convexHull(points);
    expect(hull).toHaveLength(4);
    for (const corner of [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]) {
      expect(hull).toContainEqual(corner);
    }
  });

  it('keeps every input point inside or on the hull', () => {
    // The property that matters for a silhouette: nothing sticks out.
    const points = Array.from({ length: 60 }, (_, i) => ({
      x: Math.cos(i * 2.4) * (1 + (i % 5)),
      y: Math.sin(i * 2.4) * (1 + (i % 7)),
    }));
    const hull = convexHull(points);
    const inside = (p: { x: number; y: number }) => {
      for (let i = 0; i < hull.length; i += 1) {
        const a = hull[i]!;
        const b = hull[(i + 1) % hull.length]!;
        const side = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (side < -1e-9) return false;
      }
      return true;
    };
    for (const p of points) expect(inside(p)).toBe(true);
  });

  it('handles degenerate input without throwing', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([{ x: 1, y: 1 }])).toHaveLength(1);
    expect(
      convexHull([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toHaveLength(2);
  });
});

describe('drawSolid', () => {
  const lens: Solid = {
    at: [0, 0, 0],
    axis: [0, 1, 0],
    profile: [
      { t: -2, r: 6 },
      { t: 0, r: 8 },
      { t: 2, r: 6 },
    ],
  };

  it('produces a closed path', () => {
    const drawn = drawSolid(lens, FRONT);
    expect(drawn.d).toMatch(/^M/);
    expect(drawn.d.trim().endsWith('Z')).toBe(true);
  });

  it('reads edge-on for a disc whose axis points at the camera', () => {
    // A dichroic face-on should shade as a disc; the same part edge-on should
    // shade as a line. `facing` is what carries that distinction.
    const alongAxis = drawSolid({ ...lens, axis: [0, 0, 1] }, FRONT);
    const acrossAxis = drawSolid({ ...lens, axis: [0, 1, 0] }, FRONT);
    expect(alongAxis.facing).toBeCloseTo(1, 6);
    expect(acrossAxis.facing).toBeCloseTo(0, 6);
  });

  it('emits a second subpath for an annulus', () => {
    const solid = drawSolid({ ...lens, innerRadius: 3 }, FRONT);
    // Two 'M' commands: outer boundary then the hole, filled even-odd.
    expect(solid.d.match(/M/g)).toHaveLength(2);
  });

  it('keeps its silhouette width when spun, to within the ring sampling', () => {
    // A solid of revolution is symmetric about its axis, so yawing it must not
    // change its outline — except that the rings are sampled as 24-gons, and an
    // inscribed polygon is narrowest when the view falls between two vertices.
    // The bound is therefore 2r·cos(π/24), which is 15.863 for this lens, and
    // it is asserted rather than a tolerance picked until the test passed. Any
    // wider a swing means the basis has acquired a dependence on absolute
    // orientation.
    const RING_SEGMENTS = 24;
    const widest = 16;
    const narrowest = widest * Math.cos(Math.PI / RING_SEGMENTS);

    const widthAt = (yaw: number) => {
      const d = drawSolid(lens, { ...FRONT, yaw }).d;
      const xs = [...d.matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]));
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(widthAt(0)).toBeCloseTo(widest, 6);
    expect(widthAt(Math.PI / RING_SEGMENTS)).toBeCloseTo(narrowest, 1);
    for (const yaw of [0.3, 1.2, 2.5, 4.4]) {
      expect(widthAt(yaw)).toBeGreaterThanOrEqual(narrowest - 0.02);
      expect(widthAt(yaw)).toBeLessThanOrEqual(widest + 0.02);
    }
  });

  it('shrinks on screen as the scale falls', () => {
    const big = drawSolid(lens, { ...FRONT, scale: 4 });
    const small = drawSolid(lens, { ...FRONT, scale: 1 });
    const spread = (d: string) => {
      const xs = [...d.matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spread(big.d)).toBeCloseTo(spread(small.d) * 4, 1);
  });
});

describe('depth ordering', () => {
  it('sorts furthest first, so nearer parts paint over them', () => {
    const sorted = sortByDepth([{ depth: 5 }, { depth: -3 }, { depth: 0 }]);
    expect(sorted.map((s) => s.depth)).toEqual([-3, 0, 5]);
  });

  it('averages a polyline to a single depth', () => {
    expect(
      polylineDepth(
        [
          [0, 0, 2],
          [0, 0, 4],
        ],
        FRONT,
      ),
    ).toBeCloseTo(3, 10);
    expect(polylineDepth([], FRONT)).toBe(0);
  });
});
