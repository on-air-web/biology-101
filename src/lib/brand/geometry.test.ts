import { describe, expect, it } from 'vitest';
import {
  MARK_NODE,
  MARK_SIZE,
  buildMolecularField,
  mulberry32,
  ringPoints,
  ringVertices,
} from './geometry';

describe('mark geometry', () => {
  /**
   * A regular hexagon of radius r has every vertex at distance r from the
   * centre and every side equal to r. Checked from the construction rather
   * than against stored coordinates, so it still means something if the
   * radius changes.
   */
  it('builds a regular hexagon', () => {
    const radius = 21;
    const centre = MARK_SIZE / 2;
    const vertices = ringVertices(radius);

    expect(vertices).toHaveLength(6);
    for (const [x, y] of vertices) {
      expect(Math.hypot(x - centre, y - centre)).toBeCloseTo(radius, 9);
    }
    for (let i = 0; i < 6; i += 1) {
      const a = vertices[i]!;
      const b = vertices[(i + 1) % 6]!;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeCloseTo(radius, 9);
    }
  });

  it('puts the first vertex at twelve o clock', () => {
    const [x, y] = ringVertices()[0]!;
    expect(x).toBeCloseTo(MARK_SIZE / 2, 9);
    expect(y).toBeLessThan(MARK_SIZE / 2);
  });

  /** The node sits on that vertex; if it drifts the silhouette stops working. */
  it('anchors the node to the top vertex', () => {
    const [x, y] = ringVertices()[0]!;
    expect(MARK_NODE.x).toBeCloseTo(x, 9);
    expect(MARK_NODE.y).toBeCloseTo(y, 9);
    // The knockout must be wider than the node or there is no visible gap.
    expect(MARK_NODE.haloRadius).toBeGreaterThan(MARK_NODE.radius);
  });

  it('stays inside its own viewBox', () => {
    const reach = MARK_NODE.y - MARK_NODE.haloRadius;
    expect(reach).toBeGreaterThan(0);
    expect(MARK_NODE.x + MARK_NODE.haloRadius).toBeLessThan(MARK_SIZE);
  });

  it('emits points SVG can parse', () => {
    const pair = String.raw`-?\d+\.\d{2},-?\d+\.\d{2}`;
    expect(ringPoints()).toMatch(new RegExp(`^(${pair} ){5}${pair}$`));
    expect(ringPoints().split(' ')).toHaveLength(6);
  });
});

describe('seeded field', () => {
  /**
   * Determinism is the whole contract. The banner renders on the server and
   * again on the client, and the link card is drawn at build time by a
   * separate process — a field that differed between any two of those would be
   * a hydration mismatch on every page load.
   */
  it('produces identical geometry for the same seed', () => {
    const a = buildMolecularField(20260725, 1200, 520);
    const b = buildMolecularField(20260725, 1200, 520);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces different geometry for a different seed', () => {
    const a = buildMolecularField(1, 1200, 520);
    const b = buildMolecularField(2, 1200, 520);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('scales its element counts with the arguments', () => {
    const small = buildMolecularField(7, 400, 300, 4, 10);
    // Six vertices per ring, plus the loose nodes.
    expect(small.nodes).toHaveLength(4 * 6 + 10);
    expect(small.rings).toHaveLength(4);
  });

  it('gives every element a finite, drawable value', () => {
    const { rings, bonds, nodes } = buildMolecularField(99, 1200, 630);
    for (const ring of rings) {
      expect(ring.width).toBeGreaterThan(0);
      expect(ring.opacity).toBeGreaterThan(0);
      expect(ring.points.split(' ')).toHaveLength(6);
    }
    for (const bond of bonds) {
      for (const value of [bond.x1, bond.y1, bond.x2, bond.y2, bond.width]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
    for (const node of nodes) {
      expect(node.radius).toBeGreaterThan(0);
      expect(node.colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('mulberry32', () => {
  it('is reproducible and stays in the unit interval', () => {
    const first = Array.from({ length: 50 }, mulberry32(12345));
    const second = Array.from({ length: 50 }, mulberry32(12345));
    expect(first).toEqual(second);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
