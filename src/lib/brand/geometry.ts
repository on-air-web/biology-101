/**
 * Brand geometry, as data.
 *
 * Pure functions with no React and no DOM, for the same reason `compute.ts`
 * is: the mark is drawn in three places that cannot share a component — the
 * nav (React), the favicon and the link card (both written to disk by
 * scripts/make-brand.mjs at build time). Sharing the geometry rather than the
 * markup is what stops the favicon drifting away from the logo the day someone
 * adjusts a radius.
 *
 * Everything here is deterministic. The field is seeded because a random one
 * renders differently on the server and the client and mismatches on every
 * load, and because a link card that changed between builds would defeat
 * caching for no benefit.
 */

/** Small, fast, seedable PRNG. Deterministic across platforms. */
export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// The mark
// ---------------------------------------------------------------------------

/** The mark is drawn in a 64-unit square and scales from there. */
export const MARK_SIZE = 64;

const CENTRE = MARK_SIZE / 2;
const RING_RADIUS = 21;

/**
 * Ring vertices, first one at twelve o'clock.
 *
 * Same construction as the banner field's rings — six vertices at sixty degree
 * steps — so the mark is visibly the same object as the artwork behind it,
 * rather than a separate drawing that happens to be a hexagon.
 */
export function ringVertices(radius = RING_RADIUS): [number, number][] {
  return Array.from({ length: 6 }, (_, k) => {
    const angle = -Math.PI / 2 + (k * Math.PI) / 3;
    return [CENTRE + radius * Math.cos(angle), CENTRE + radius * Math.sin(angle)];
  });
}

export function ringPoints(radius = RING_RADIUS): string {
  return ringVertices(radius)
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

/**
 * The filled node, at the top vertex.
 *
 * It sits proud of the ring rather than inside it, and that is the whole
 * design: it breaks the hexagon's outline, so the silhouette stays
 * recognisable at sixteen pixels where interior detail turns to mud. It also
 * carries the meaning — one node picked out in the accent colour is exactly
 * how the rest of the product uses green, for the state that matters.
 */
export const MARK_NODE = {
  x: ringVertices()[0]![0],
  y: ringVertices()[0]![1],
  radius: 6,
  /** Knocked-out gap so the node reads as separate from the stroke. */
  haloRadius: 7.6,
} as const;

export const MARK_STROKE = 5;

// ---------------------------------------------------------------------------
// The banner field
// ---------------------------------------------------------------------------

export interface FieldRing {
  points: string;
  colour: string;
  width: number;
  opacity: number;
  blur: boolean;
}

export interface FieldBond {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  opacity: number;
}

export interface FieldNode {
  x: number;
  y: number;
  radius: number;
  colour: string;
  opacity: number;
  blur: 'far' | 'near' | undefined;
}

export interface MolecularFieldGeometry {
  rings: FieldRing[];
  bonds: FieldBond[];
  nodes: FieldNode[];
}

/**
 * Rings, bonds and atoms at varying depth. Not a specific molecule — it does
 * not pretend to be data, it just belongs to the subject.
 */
export function buildMolecularField(
  seed: number,
  width: number,
  height: number,
  ringCount = 26,
  looseNodes = 70,
): MolecularFieldGeometry {
  const random = mulberry32(seed);
  const between = (min: number, max: number) => min + random() * (max - min);

  const raw: [number, number, number][] = [];
  const rings: FieldRing[] = [];

  for (let i = 0; i < ringCount; i += 1) {
    const cx = between(-40, width + 40);
    const cy = between(-20, height + 20);
    const radius = between(18, 46);
    const depth = random();
    const rotation = between(0, Math.PI);
    const points: string[] = [];

    for (let k = 0; k < 6; k += 1) {
      const angle = rotation + (k * Math.PI) / 3;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      raw.push([x, y, depth]);
    }

    rings.push({
      points: points.join(' '),
      colour: depth > 0.75 ? '#9fd8ff' : depth > 0.45 ? '#5f8fd0' : '#2f4a6b',
      width: 0.6 + depth * 1.5,
      opacity: 0.1 + depth * 0.5,
      blur: depth < 0.35,
    });
  }

  for (let i = 0; i < looseNodes; i += 1) {
    raw.push([between(0, width), between(0, height), random()]);
  }

  const bonds: FieldBond[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    for (let j = i + 1; j < raw.length; j += 1) {
      const a = raw[i]!;
      const b = raw[j]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 62 && random() < 0.1) {
        const depth = (a[2] + b[2]) / 2;
        bonds.push({
          x1: a[0],
          y1: a[1],
          x2: b[0],
          y2: b[1],
          width: 0.4 + depth,
          opacity: 0.06 + depth * 0.26,
        });
      }
    }
  }

  const nodes: FieldNode[] = raw.map(([x, y, depth]) => ({
    x,
    y,
    radius: 0.9 + depth * 3.2,
    colour: depth > 0.82 ? '#d6ecff' : depth > 0.5 ? '#8fc4f5' : '#3d6b9e',
    opacity: 0.16 + depth * 0.62,
    blur: depth < 0.3 ? 'far' : depth > 0.85 ? 'near' : undefined,
  }));

  return { rings, bonds, nodes };
}
