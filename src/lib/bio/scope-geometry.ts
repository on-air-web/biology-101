/**
 * A very small 3D renderer, for drawing an optical train.
 *
 * WHY THIS EXISTS RATHER THAN A LIBRARY. The whole point of the microscope
 * explorer is that the ray diagram is *correct* — that the light bends at the
 * lens the label points at, and that rotating the instrument moves rays and
 * glass together because they are the same geometry. A mesh library would give
 * better shading and a second, separate coordinate system to keep the rays in
 * sync with by hand, which is exactly where an optical diagram goes quietly
 * wrong. It would also be the first runtime dependency added since launch, for
 * a page that would then weigh more than the rest of the site put together.
 *
 * Everything an optical bench contains is a surface of revolution — lenses,
 * apertures, mirrors, filters, tube bodies — so a renderer that draws exactly
 * that, and nothing else, is about two hundred lines.
 *
 * CONVENTIONS. The optical axis is +Y, pointing up, because that is how a
 * microscope stands. Distances are millimetres on a schematic scale: the
 * spacings are ordered and proportioned like a real instrument but are not a
 * lens prescription, and the interface says so rather than implying otherwise.
 * Screen coordinates are SVG's, with y increasing downwards.
 */

export type Vec3 = readonly [number, number, number];

export interface Point2 {
  x: number;
  y: number;
}

/** Where the camera is. Yaw turns the instrument about its own optical axis. */
export interface View {
  /** Radians about the optical axis. */
  yaw: number;
  /** Radians of elevation, clamped by the caller to keep the axis vertical-ish. */
  pitch: number;
  /** Screen units per millimetre. */
  scale: number;
}

export function vec(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalise(a: Vec3): Vec3 {
  const l = length(a);
  if (l === 0) return [0, 1, 0];
  return scale(a, 1 / l);
}

/**
 * World to camera space: yaw about the optical axis, then pitch about the
 * screen's horizontal.
 *
 * In that order rather than the reverse, so that dragging sideways always spins
 * the instrument about its own axis however far it has been tilted. Composing
 * them the other way round makes the horizontal drag axis wander as the pitch
 * changes, which feels broken long before anyone can say why.
 */
export function toCamera(p: Vec3, view: View): Vec3 {
  const cy = Math.cos(view.yaw);
  const sy = Math.sin(view.yaw);
  const x1 = p[0] * cy + p[2] * sy;
  const z1 = -p[0] * sy + p[2] * cy;

  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const y2 = p[1] * cp - z1 * sp;
  const z2 = p[1] * sp + z1 * cp;

  return [x1, y2, z2];
}

/**
 * Camera space to the screen. Orthographic on purpose.
 *
 * A ray diagram is read by comparing angles and heights against the axis, and
 * perspective changes both with depth. Every optical diagram ever printed is
 * orthographic for that reason; the 3D is carried by rotation and occlusion
 * instead, which is where it belongs.
 */
export function project(p: Vec3, view: View): Point2 & { depth: number } {
  const c = toCamera(p, view);
  return { x: c[0] * view.scale, y: -c[1] * view.scale, depth: c[2] };
}

/** Two unit vectors spanning the plane perpendicular to `axis`. */
export function basisFor(axis: Vec3): [Vec3, Vec3] {
  const a = normalise(axis);
  // Pick whichever cardinal direction is least parallel to the axis, so the
  // cross product never collapses.
  const seed: Vec3 = Math.abs(a[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalise(cross(a, seed));
  const v = cross(a, u);
  return [u, v];
}

/** A circle of `segments` points, centred on `centre`, normal to `axis`. */
export function ring(centre: Vec3, axis: Vec3, radius: number, segments: number): Vec3[] {
  const [u, v] = basisFor(axis);
  const points: Vec3[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (2 * Math.PI * i) / segments;
    points.push(
      add(centre, add(scale(u, radius * Math.cos(angle)), scale(v, radius * Math.sin(angle)))),
    );
  }
  return points;
}

/**
 * Andrew's monotone chain convex hull.
 *
 * The silhouette of a convex solid of revolution is the convex hull of its
 * projected rings, which is what makes this the whole of the outline
 * calculation. Components that are genuinely not convex — an annulus, a
 * doughnut stop — are drawn as two hulls with an even-odd fill rather than
 * being forced through this.
 */
export function convexHull(points: readonly Point2[]): Point2[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const turn = (o: Point2, a: Point2, b: Point2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const build = (source: Point2[]) => {
    const chain: Point2[] = [];
    for (const point of source) {
      while (
        chain.length >= 2 &&
        turn(chain[chain.length - 2]!, chain[chain.length - 1]!, point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    }
    chain.pop();
    return chain;
  };

  return [...build(sorted), ...build([...sorted].reverse())];
}

/** A station along a component's own axis: how far along, and how wide. */
export interface ProfileStation {
  /** Offset along the component axis from its centre, mm. */
  t: number;
  /** Radius at that offset, mm. Zero closes the surface to a point. */
  r: number;
}

/**
 * A part of the instrument: a surface of revolution somewhere in space.
 *
 * `innerRadius` turns it into an annulus — the condenser's phase ring and every
 * aperture stop are holes rather than discs, and drawing them as solid would
 * hide the light path they exist to shape.
 */
export interface Solid {
  at: Vec3;
  axis: Vec3;
  profile: readonly ProfileStation[];
  innerRadius?: number;
}

const RING_SEGMENTS = 24;

/**
 * An optional world-space transform, applied to every point before the camera.
 *
 * The one use is compressing the optical axis. A real stand is roughly eighteen
 * times taller than it is wide, which draws as a thread; every optical diagram
 * ever printed squashes that ratio. Doing it here, in world space and before
 * the rotation, keeps parts and rays squashed identically and keeps the result
 * consistent under rotation — squashing the projected image instead would shear
 * the scene as soon as it was pitched.
 */
export type WorldTransform = (p: Vec3) => Vec3;

const IDENTITY: WorldTransform = (p) => p;

/** Every projected ring point of a solid, with the depth of its centre. */
function projectedRings(
  solid: Solid,
  view: View,
  radiusOf: (r: number) => number,
  transform: WorldTransform,
) {
  const axis = normalise(solid.axis);
  const points: Point2[] = [];
  let depthSum = 0;

  for (const station of solid.profile) {
    const centre = add(solid.at, scale(axis, station.t));
    const radius = radiusOf(station.r);
    if (radius <= 0) {
      points.push(project(transform(centre), view));
      depthSum += project(transform(centre), view).depth;
      continue;
    }
    for (const point of ring(centre, axis, radius, RING_SEGMENTS)) {
      points.push(project(transform(point), view));
    }
    depthSum += project(transform(centre), view).depth;
  }

  return { points, depth: depthSum / Math.max(1, solid.profile.length) };
}

export interface DrawnSolid {
  /** SVG path data for the silhouette. */
  d: string;
  /** Mean depth in camera space; larger is nearer the viewer. */
  depth: number;
  /** 1 when the component's face is square to the camera, 0 when edge-on. */
  facing: number;
}

function toPath(points: readonly Point2[]): string {
  if (points.length === 0) return '';
  return `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} Z`;
}

/**
 * The silhouette of a solid, ready to hand to an SVG path.
 *
 * An annulus emits two subpaths, outer then inner, to be filled even-odd.
 */
export function drawSolid(
  solid: Solid,
  view: View,
  transform: WorldTransform = IDENTITY,
): DrawnSolid {
  const outer = projectedRings(solid, view, (r) => r, transform);
  let d = toPath(convexHull(outer.points));

  if (solid.innerRadius !== undefined && solid.innerRadius > 0) {
    const inner = projectedRings(
      solid,
      view,
      (r) => Math.min(r, solid.innerRadius as number),
      transform,
    );
    d += ` ${toPath(convexHull(inner.points))}`;
  }

  // How square the component is to the camera, from its axis in camera space.
  // Used only for shading, so that a dichroic edge-on reads as a line and the
  // same dichroic turned towards the viewer reads as a disc.
  const axisCamera = toCamera(normalise(solid.axis), view);
  const facing = Math.abs(axisCamera[2]);

  return { d, depth: outer.depth, facing };
}

/**
 * A rectangular block: the base, the limb, the stage.
 *
 * The optics are all surfaces of revolution, but the stand a student actually
 * puts their hands on is not, and a light path floating in space is the thing
 * that makes an optical diagram hard to connect to the instrument on the bench.
 * A box costs almost nothing to add here because its silhouette is the convex
 * hull of eight projected corners, which is the machinery the revolutions
 * already use.
 */
export interface BoxSolid {
  at: Vec3;
  /** Half-extents along x, y and z, before any rotation of the view. */
  half: Vec3;
}

export function boxCorners(box: BoxSolid): Vec3[] {
  const corners: Vec3[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corners.push([
          box.at[0] + sx * box.half[0],
          box.at[1] + sy * box.half[1],
          box.at[2] + sz * box.half[2],
        ]);
      }
    }
  }
  return corners;
}

export function drawBox(
  box: BoxSolid,
  view: View,
  transform: WorldTransform = IDENTITY,
): DrawnSolid {
  const projected = boxCorners(box).map((corner) => project(transform(corner), view));
  const centre = project(transform(box.at), view);
  return {
    d: toPath(convexHull(projected)),
    depth: centre.depth,
    // A block has no single face to catch the light, so it shades flat. Using
    // the revolutions' `facing` here would make the stand flicker as it turned.
    facing: 1,
  };
}

/** Painter's algorithm: furthest first, so nearer parts draw over them. */
export function sortByDepth<T extends { depth: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.depth - b.depth);
}

/** Project a polyline — a ray, or the edge of a light cone. */
export function drawPolyline(
  points: readonly Vec3[],
  view: View,
  transform: WorldTransform = IDENTITY,
): string {
  return points
    .map((point, index) => {
      const p = project(transform(point), view);
      return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');
}

/** Mean depth of a polyline, for sorting rays against the glass. */
export function polylineDepth(
  points: readonly Vec3[],
  view: View,
  transform: WorldTransform = IDENTITY,
): number {
  if (points.length === 0) return 0;
  return points.reduce((sum, p) => sum + project(transform(p), view).depth, 0) / points.length;
}

/** Screen-space bounds of a projected shape, for placing a hover label. */
export function boundsOf(points: readonly Point2[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Where a solid's centre lands on screen. Used to anchor labels and leaders. */
export function anchorOf(
  solid: Solid,
  view: View,
  transform: WorldTransform = IDENTITY,
): Point2 & { depth: number } {
  return project(transform(solid.at), view);
}
