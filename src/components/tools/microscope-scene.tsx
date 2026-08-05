'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  anchorOf,
  drawBox,
  drawPolyline,
  drawSolid,
  polylineDepth,
  project,
  sortByDepth,
  type Vec3,
  type View,
} from '@/lib/bio/scope-geometry';
import {
  boxFor,
  isBox,
  solidFor,
  type Modality,
  type Part,
  type RayBand,
} from '@/lib/bio/microscopes';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The interactive instrument.
 *
 * Drag to rotate, pinch to zoom, hover or focus a part to read what it does.
 * Parts and rays are projected by the same code, so the light path stays
 * attached to the glass at every angle — the argument for building this rather
 * than reaching for a mesh library.
 *
 * Zoom is pinch only: two fingers on a touch screen, or the ctrl+wheel a
 * trackpad pinch generates. A plain wheel is left to scroll the page, because
 * a 3D view that eats the scroll is a view nobody can get past.
 *
 * Keyboard: every part is a focusable element in the same order as the light
 * path, so tabbing through the scene walks the optical train from source to
 * detector. That is a better way to read a light path than a mouse, and it is
 * the reason the parts are real SVG elements rather than pixels on a canvas.
 */

const VIEWBOX = { width: 620, height: 520 };
const PITCH_LIMIT = 0.62;
/** How far past the fitted view a pinch may zoom in. */
const MAX_ZOOM = 6;

/**
 * How far the optical axis is squashed for display, with and without the stand.
 *
 * Two values because the two views have opposite problems. The bare optical
 * train is about eighteen times taller than it is wide and draws as a thread
 * with specks on it, so it needs squashing hard — which is what every printed
 * ray diagram does. The stand is wide enough to carry itself, and squashing it
 * that far turns the base and the stage into pancakes and the instrument stops
 * being recognisable, which defeats the point of drawing it.
 *
 * Applied in world space before the rotation, so parts, stand and rays are
 * squashed identically and the scene stays consistent at any angle.
 */
const AXIAL_COMPRESSION = { withBody: 0.85, bare: 0.42 } as const;

const compressionFor = (showBody: boolean) =>
  showBody ? AXIAL_COMPRESSION.withBody : AXIAL_COMPRESSION.bare;

/** Fraction of the frame the instrument should occupy at the default zoom. */
const FIT_MARGIN = 0.86;

/** Minimum vertical separation between two ray labels, in viewBox units. */
const LABEL_GAP = 22;

/**
 * The zoom that frames a whole instrument.
 *
 * Computed rather than fixed because the epifluorescence and confocal stands
 * carry an illumination arm reaching well out to one side, while the
 * transmitted-light columns are narrow and tall. One hard-coded scale either
 * clipped the lamp off the arm or left the brightfield column adrift in the
 * middle of an empty frame.
 */
/**
 * The bounding box of whatever is currently drawn.
 *
 * Takes `showBody` because hiding the stand changes the answer: an epi column
 * without its base spans a quite different range, and framing on the hidden
 * foot would leave the optics stranded in the top half of the frame.
 */
function framing(modality: Modality, showBody: boolean) {
  const visible = modality.parts.filter((part) => showBody || !part.structural);

  let minY = Infinity;
  let maxY = -Infinity;
  for (const part of visible) {
    const spanY = part.box ? part.box[1] : part.thickness / 2;
    minY = Math.min(minY, part.at[1] - spanY);
    maxY = Math.max(maxY, part.at[1] + spanY);
  }
  const centre = (minY + maxY) / 2;

  let halfWidth = 0;
  for (const part of visible) {
    const spanX = part.box ? part.box[0] : part.radius;
    halfWidth = Math.max(halfWidth, Math.abs(part.at[0]) + spanX);
  }
  const halfHeight = ((maxY - minY) / 2) * compressionFor(showBody);

  return { centre, halfWidth: Math.max(halfWidth, 1), halfHeight: Math.max(halfHeight, 1) };
}

function fitScale(modality: Modality, showBody: boolean): number {
  const { halfWidth, halfHeight } = framing(modality, showBody);
  return Math.min(
    (VIEWBOX.width / 2 / halfWidth) * FIT_MARGIN,
    (VIEWBOX.height / 2 / halfHeight) * FIT_MARGIN,
  );
}

/** Colours per ray band. Bands are named, not numbered, so a legend can
 *  explain each one — an unlabelled colour on an optical diagram is noise. */
const BAND_STYLE: Record<RayBand, { stroke: string; width: number; dash?: string }> = {
  illumination: { stroke: 'var(--color-amber-400)', width: 1.4, dash: '5 3' },
  imaging: { stroke: 'var(--color-gfp-400)', width: 1.6 },
  excitation: { stroke: 'var(--color-link-400)', width: 1.7 },
  emission: { stroke: 'var(--color-gfp-400)', width: 1.7 },
  surround: { stroke: 'var(--color-amber-400)', width: 1.4, dash: '4 3' },
  diffracted: { stroke: 'var(--color-rose-lab-400)', width: 1.6 },
  ordinary: { stroke: 'var(--color-link-400)', width: 1.5 },
  extraordinary: { stroke: 'var(--color-rose-lab-400)', width: 1.5, dash: '5 3' },
};

const PART_FILL: Record<Part['kind'], string> = {
  source: 'var(--color-amber-400)',
  lens: 'var(--color-link-400)',
  objective: 'var(--color-ink-muted)',
  mirror: 'var(--color-ink-muted)',
  dichroic: 'var(--color-gfp-400)',
  filter: 'var(--color-gfp-400)',
  aperture: 'var(--color-ink-faint)',
  sample: 'var(--color-rose-lab-400)',
  detector: 'var(--color-ink-muted)',
  prism: 'var(--color-link-400)',
  polariser: 'var(--color-ink-faint)',
  pinhole: 'var(--color-ink-faint)',
  body: 'var(--color-ink-muted)',
};

export interface MicroscopeSceneProps {
  modality: Modality;
  /** Ray bands currently switched on. */
  visibleBands: readonly RayBand[];
  selectedPartId?: string;
  onSelectPart: (id: string | undefined) => void;
  /** Draw the stand. Turning it off leaves the bare optical train. */
  showBody: boolean;
  /** Name each ray band on the drawing itself rather than only in the legend. */
  showRayLabels: boolean;
}

export function MicroscopeScene({
  modality,
  visibleBands,
  selectedPartId,
  onSelectPart,
  showBody,
  showRayLabels,
}: MicroscopeSceneProps) {
  const defaultView = useMemo<View>(
    () => ({ yaw: 0.5, pitch: 0.34, scale: fitScale(modality, showBody) }),
    [modality, showBody],
  );
  const [view, setView] = useState<View>(defaultView);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragFrom = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  /**
   * Live pointers, so two of them can be told from one.
   *
   * A Map rather than component state: it is written on every pointermove and
   * re-rendering for it would drop frames during a drag.
   */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchFrom = useRef<{ distance: number; scale: number } | null>(null);

  /**
   * The instrument may never be zoomed out smaller than it fits.
   *
   * Below that there is nothing to see but empty frame, and it is a state
   * people reach by accident on a trackpad and then cannot recognise their way
   * out of. The floor is therefore the fitted scale itself, which makes "Reset
   * view" and "zoomed all the way out" the same thing.
   */
  const scaleLimits = useMemo(
    () => ({ min: defaultView.scale, max: defaultView.scale * MAX_ZOOM }),
    [defaultView],
  );

  const zoomTo = useCallback(
    (next: number) =>
      setView((current) => ({ ...current, scale: clamp(next, scaleLimits.min, scaleLimits.max) })),
    [scaleLimits],
  );

  const reset = useCallback(() => setView(defaultView), [defaultView]);

  // Reframe when the instrument changes: the arm on an epi stand reaches much
  // further sideways than a transmitted-light column does.
  useEffect(() => setView(defaultView), [defaultView]);

  /**
   * Trackpad pinch, which browsers deliver as a wheel event with ctrlKey set.
   *
   * Bound here rather than through onWheel because React attaches wheel
   * listeners passively and a passive listener cannot preventDefault. A plain
   * wheel is deliberately left alone: scroll should scroll the page, and
   * hijacking it to zoom is the thing that makes an embedded 3D view a
   * nuisance to scroll past.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setView((current) => ({
        ...current,
        scale: clamp(
          current.scale * Math.exp(-event.deltaY * 0.01),
          scaleLimits.min,
          scaleLimits.max,
        ),
      }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [scaleLimits]);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function startDrag(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      // Second finger down: stop rotating and start pinching, or the scene
      // spins wildly as the two fingers move apart.
      dragFrom.current = null;
      pinchFrom.current = { distance: spread(), scale: view.scale };
      setDragging(false);
      return;
    }

    dragFrom.current = { x: event.clientX, y: event.clientY, yaw: view.yaw, pitch: view.pitch };
    setDragging(true);
  }

  function onDrag(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pinch = pinchFrom.current;
    if (pointers.current.size >= 2 && pinch && pinch.distance > 0) {
      zoomTo((pinch.scale * spread()) / pinch.distance);
      return;
    }

    const from = dragFrom.current;
    if (!from) return;
    setView((current) => ({
      ...current,
      yaw: from.yaw + (event.clientX - from.x) * 0.008,
      pitch: clamp(from.pitch + (event.clientY - from.y) * 0.005, -PITCH_LIMIT, PITCH_LIMIT),
    }));
  }

  function endDrag(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchFrom.current = null;
    if (pointers.current.size === 0) {
      dragFrom.current = null;
      setDragging(false);
    }
  }

  // Squash the column and centre it on the origin, so switching instrument
  // does not make the stand jump about the frame.
  const squash = useMemo(() => {
    const { centre } = framing(modality, showBody);
    const compression = compressionFor(showBody);
    return (p: Vec3): Vec3 => [p[0], (p[1] - centre) * compression, p[2]];
  }, [modality, showBody]);

  const rendered = useMemo(() => {
    const parts = modality.parts
      .filter((part) => showBody || !part.structural)
      .map((part) => {
        const solid = solidFor(part);
        return {
          part,
          drawn: isBox(part) ? drawBox(boxFor(part), view, squash) : drawSolid(solid, view, squash),
          anchor: anchorOf(solid, view, squash),
        };
      });

    const rays = modality.rays
      .filter((ray) => visibleBands.includes(ray.band))
      .map((ray) => ({
        ray,
        d: drawPolyline(ray.points, view, squash),
        depth: polylineDepth(ray.points, view, squash),
      }));

    return { parts, rays };
  }, [modality, view, visibleBands, squash, showBody]);

  /**
   * Where to write each band's name on the drawing.
   *
   * One label per band, not per ray — three rays of the same colour want one
   * name between them. The anchor is the point on the band's first ray that
   * sits furthest from the optical axis, because that is where there is room,
   * and labels are then pushed apart vertically so two bands leaving the same
   * side of the column do not overprint each other.
   */
  const rayLabels = useMemo(() => {
    if (!showRayLabels) return [];

    const anchors = modality.bands
      .filter((band) => visibleBands.includes(band.band))
      .map((band) => {
        const ray = modality.rays.find((candidate) => candidate.band === band.band);
        if (!ray) return undefined;

        let best = project(squash(ray.points[0]!), view);
        for (const worldPoint of ray.points) {
          const projected = project(squash(worldPoint), view);
          if (Math.abs(projected.x) > Math.abs(best.x)) best = projected;
        }
        return { band, x: best.x, y: best.y };
      })
      .filter((entry) => entry !== undefined);

    // Keep them legible: sort down the frame and enforce a gap.
    const placed = [...anchors].sort((a, b) => a.y - b.y);
    for (let i = 1; i < placed.length; i += 1) {
      const previous = placed[i - 1]!;
      const current = placed[i]!;
      if (current.y - previous.y < LABEL_GAP) current.y = previous.y + LABEL_GAP;
    }

    // Set the text outside the instrument rather than beside the ray. The
    // illumination rays run close to the axis all the way up the column, so a
    // label placed a few pixels from one lands squarely on the condenser. The
    // clearance follows the drawn half-width, so it holds as the scene is
    // zoomed, and a leader line keeps the text tied to its own ray.
    const clearance = Math.min(
      framing(modality, showBody).halfWidth * view.scale + 14,
      VIEWBOX.width / 2 - 90,
    );

    return placed.map((entry) => {
      const side: 1 | -1 = entry.x >= 0 ? 1 : -1;
      return { ...entry, side, textX: side * Math.max(Math.abs(entry.x) + 14, clearance) };
    });
  }, [modality, view, visibleBands, squash, showRayLabels, showBody]);

  // Rays and parts are depth-sorted together, so a ray genuinely passes behind
  // the far side of a lens and in front of the near side.
  const painted = useMemo(
    () =>
      sortByDepth([
        ...rendered.parts.map((entry) => ({
          kind: 'part' as const,
          depth: entry.drawn.depth,
          entry,
        })),
        ...rendered.rays.map((entry) => ({ kind: 'ray' as const, depth: entry.depth, entry })),
      ]),
    [rendered],
  );

  const selected = rendered.parts.find((entry) => entry.part.id === selectedPartId);

  /**
   * Full screen as a fixed overlay rather than the Fullscreen API.
   *
   * The API is refused on iOS Safari for anything that is not a video, and
   * falling back would mean maintaining both paths. An overlay behaves the
   * same everywhere, keeps the React tree intact, and can be dismissed with
   * Escape, which is what people try first.
   */
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    // Stop the page scrolling underneath the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullScreen]);

  return (
    <div
      className={cn(
        'relative',
        fullScreen && 'fixed inset-0 z-50 flex flex-col bg-page p-3 sm:p-5',
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2} ${VIEWBOX.width} ${VIEWBOX.height}`}
        className={cn(
          'touch-none rounded-lab border border-line bg-surface-sunken select-none',
          fullScreen ? 'min-h-0 w-full flex-1' : 'w-full',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={fullScreen ? undefined : { aspectRatio: `${VIEWBOX.width} / ${VIEWBOX.height}` }}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="application"
        aria-label={`Interactive cutaway of a ${modality.name}. Drag to rotate, pinch to zoom. The parts are listed below the drawing and can be reached with the keyboard.`}
      >
        {/* The optical axis, so the instrument reads as a column even when
            every part is edge-on. */}
        <line
          x1={0}
          y1={-VIEWBOX.height / 2 + 8}
          x2={0}
          y2={VIEWBOX.height / 2 - 8}
          stroke="var(--color-line)"
          strokeDasharray="2 6"
        />

        <g>
          {painted.map((item) =>
            item.kind === 'part' ? (
              <PartShape
                key={`p-${item.entry.part.id}`}
                part={item.entry.part}
                d={item.entry.drawn.d}
                facing={item.entry.drawn.facing}
                selected={item.entry.part.id === selectedPartId}
                dimmed={selectedPartId !== undefined && item.entry.part.id !== selectedPartId}
                onSelect={onSelectPart}
              />
            ) : (
              <path
                key={`r-${item.entry.ray.id}`}
                d={item.entry.d}
                fill="none"
                stroke={BAND_STYLE[item.entry.ray.band].stroke}
                strokeWidth={BAND_STYLE[item.entry.ray.band].width}
                strokeDasharray={BAND_STYLE[item.entry.ray.band].dash}
                strokeLinejoin="round"
                strokeOpacity={selectedPartId ? 0.32 : 0.9}
                pointerEvents="none"
              />
            ),
          )}

          {rayLabels.map((entry) => (
            <g
              key={`label-${entry.band.band}`}
              pointerEvents="none"
              opacity={selectedPartId ? 0.35 : 1}
            >
              <line
                x1={entry.x}
                y1={entry.y}
                x2={entry.textX - entry.side * 4}
                y2={entry.y}
                stroke={BAND_STYLE[entry.band.band].stroke}
                strokeWidth={0.8}
                strokeOpacity={0.5}
              />
              <text
                x={entry.textX}
                y={entry.y}
                textAnchor={entry.side > 0 ? 'start' : 'end'}
                dominantBaseline="middle"
                fontSize={13}
                fill={BAND_STYLE[entry.band.band].stroke}
              >
                {entry.band.label}
              </text>
            </g>
          ))}

          {selected ? (
            <g pointerEvents="none">
              <circle
                cx={selected.anchor.x}
                cy={selected.anchor.y}
                r={3.5}
                fill="var(--color-gfp-400)"
              />
              <line
                x1={selected.anchor.x}
                y1={selected.anchor.y}
                x2={selected.anchor.x + leaderDirection(selected.anchor.x) * 46}
                y2={selected.anchor.y - 28}
                stroke="var(--color-gfp-400)"
                strokeWidth={1}
              />
              <text
                x={selected.anchor.x + leaderDirection(selected.anchor.x) * 52}
                y={selected.anchor.y - 32}
                textAnchor={leaderDirection(selected.anchor.x) > 0 ? 'start' : 'end'}
                fontSize={13}
                className="fill-[var(--color-gfp-300)]"
              >
                {selected.part.name}
              </text>
            </g>
          ) : null}
        </g>
      </svg>

      <div
        className={cn(
          'pointer-events-none absolute flex items-start justify-between gap-3',
          fullScreen ? 'inset-x-6 top-6 sm:inset-x-8 sm:top-8' : 'inset-x-3 top-3',
        )}
      >
        <p className="rounded-lab bg-surface/80 px-2 py-1 text-[11.5px] text-ink-faint backdrop-blur-sm">
          Drag to rotate · pinch to zoom
        </p>
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={reset}
            className="rounded-lab border border-line-strong bg-surface/80 px-2 py-1 text-[11.5px] text-ink-muted backdrop-blur-sm hover:text-ink"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={() => setFullScreen((current) => !current)}
            className="flex items-center gap-1.5 rounded-lab border border-line-strong bg-surface/80 px-2 py-1 text-[11.5px] text-ink-muted backdrop-blur-sm hover:text-ink"
          >
            {fullScreen ? (
              <>
                <Minimize2 className="size-3.5" aria-hidden /> Exit
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5" aria-hidden /> Full screen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PartShape({
  part,
  d,
  facing,
  selected,
  dimmed,
  onSelect,
}: {
  part: Part;
  d: string;
  facing: number;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | undefined) => void;
}) {
  const fill = PART_FILL[part.kind];
  // Edge-on components get more fill and less outline, so a dichroic turned
  // flat to the viewer reads as a disc and the same part side-on reads as a
  // line. Shading carries the 3D that flat colour cannot.
  //
  // The stand is drawn much fainter than the optics on purpose: it is there to
  // say where you are on the instrument, and it would otherwise bury the light
  // path it exists to give context to. This is the cutaway idiom — the casting
  // is present but you can see through it.
  const structural = part.structural === true;
  const base = structural
    ? selected
      ? 0.3
      : dimmed
        ? 0.05
        : 0.12
    : selected
      ? 0.62
      : dimmed
        ? 0.14
        : 0.38;
  const opacity = base * (structural ? 1 : 0.62 + 0.38 * facing);

  return (
    <path
      d={d}
      fillRule="evenodd"
      fill={fill}
      fillOpacity={opacity}
      stroke={fill}
      strokeOpacity={selected ? 1 : dimmed ? 0.22 : structural ? 0.42 : 0.75}
      strokeWidth={selected ? 2 : structural ? 0.9 : 1.1}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${part.name}. ${part.role}`}
      className="cursor-pointer outline-none focus-visible:stroke-[var(--color-gfp-300)] focus-visible:[stroke-width:2.5]"
      onPointerEnter={() => onSelect(part.id)}
      onFocus={() => onSelect(part.id)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(selected ? undefined : part.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(selected ? undefined : part.id);
        }
      }}
    />
  );
}

/** Point the label away from the axis, so it never lies across the column. */
function leaderDirection(x: number): 1 | -1 {
  return x >= 0 ? 1 : -1;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
