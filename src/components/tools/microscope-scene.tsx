'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  anchorOf,
  drawPolyline,
  drawSolid,
  polylineDepth,
  sortByDepth,
  type Vec3,
  type View,
} from '@/lib/bio/scope-geometry';
import { extentOf, solidFor, type Modality, type Part, type RayBand } from '@/lib/bio/microscopes';
import { cn } from '@/lib/utils';

/**
 * The interactive instrument.
 *
 * Drag to rotate, scroll or pinch to zoom, hover or focus a part to read what
 * it does. Parts and rays are projected by the same code, so the light path
 * stays attached to the glass at every angle — the argument for building this
 * rather than reaching for a mesh library.
 *
 * Keyboard: every part is a focusable element in the same order as the light
 * path, so tabbing through the scene walks the optical train from source to
 * detector. That is a better way to read a light path than a mouse, and it is
 * the reason the parts are real SVG elements rather than pixels on a canvas.
 */

const VIEWBOX = { width: 620, height: 520 };
const PITCH_LIMIT = 0.62;
const SCALE_LIMITS = { min: 0.4, max: 4 };

/**
 * How far the optical axis is squashed for display.
 *
 * A real stand is about eighteen times taller than it is wide, which draws as a
 * thread with some specks on it. Every printed optical diagram compresses that
 * ratio, and so does this one — applied in world space before the rotation, so
 * parts and rays are squashed identically and the scene stays consistent at any
 * angle. The caption under the tool says the drawing is schematic; this is the
 * largest part of what that word is covering.
 */
const AXIAL_COMPRESSION = 0.45;

/** Fraction of the frame the instrument should occupy at the default zoom. */
const FIT_MARGIN = 0.86;

/**
 * The zoom that frames a whole instrument.
 *
 * Computed rather than fixed because the epifluorescence and confocal stands
 * carry an illumination arm reaching well out to one side, while the
 * transmitted-light columns are narrow and tall. One hard-coded scale either
 * clipped the lamp off the arm or left the brightfield column adrift in the
 * middle of an empty frame.
 */
function fitScale(modality: Modality): number {
  const { minY, maxY } = extentOf(modality);
  const centre = (minY + maxY) / 2;

  let halfWidth = 0;
  let halfHeight = 0;
  for (const part of modality.parts) {
    halfWidth = Math.max(halfWidth, Math.abs(part.at[0]) + part.radius);
    halfHeight = Math.max(
      halfHeight,
      Math.abs((part.at[1] - centre) * AXIAL_COMPRESSION) + part.radius * AXIAL_COMPRESSION,
    );
  }

  return Math.min(
    (VIEWBOX.width / 2 / Math.max(halfWidth, 1)) * FIT_MARGIN,
    (VIEWBOX.height / 2 / Math.max(halfHeight, 1)) * FIT_MARGIN,
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
};

export interface MicroscopeSceneProps {
  modality: Modality;
  /** Ray bands currently switched on. */
  visibleBands: readonly RayBand[];
  selectedPartId?: string;
  onSelectPart: (id: string | undefined) => void;
}

export function MicroscopeScene({
  modality,
  visibleBands,
  selectedPartId,
  onSelectPart,
}: MicroscopeSceneProps) {
  const defaultView = useMemo<View>(
    () => ({ yaw: 0.5, pitch: 0.34, scale: fitScale(modality) }),
    [modality],
  );
  const [view, setView] = useState<View>(defaultView);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragFrom = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const reset = useCallback(() => setView(defaultView), [defaultView]);

  // Reframe when the instrument changes: the arm on an epi stand reaches much
  // further sideways than a transmitted-light column does.
  useEffect(() => setView(defaultView), [defaultView]);

  // Wheel is bound here rather than through onWheel because React attaches
  // wheel listeners passively, and a passive listener cannot preventDefault —
  // so the page would scroll away underneath the zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((current) => ({
        ...current,
        scale: clamp(
          current.scale * Math.exp(-event.deltaY * 0.0012),
          SCALE_LIMITS.min,
          SCALE_LIMITS.max,
        ),
      }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  function startDrag(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragFrom.current = { x: event.clientX, y: event.clientY, yaw: view.yaw, pitch: view.pitch };
    setDragging(true);
  }

  function onDrag(event: React.PointerEvent) {
    const from = dragFrom.current;
    if (!from) return;
    setView((current) => ({
      ...current,
      yaw: from.yaw + (event.clientX - from.x) * 0.008,
      pitch: clamp(from.pitch + (event.clientY - from.y) * 0.005, -PITCH_LIMIT, PITCH_LIMIT),
    }));
  }

  function endDrag() {
    dragFrom.current = null;
    setDragging(false);
  }

  // Squash the column and centre it on the origin, so switching instrument
  // does not make the stand jump about the frame.
  const squash = useMemo(() => {
    const { minY, maxY } = extentOf(modality);
    const centre = (minY + maxY) / 2;
    return (p: Vec3): Vec3 => [p[0], (p[1] - centre) * AXIAL_COMPRESSION, p[2]];
  }, [modality]);

  const rendered = useMemo(() => {
    const parts = modality.parts.map((part) => {
      const solid = solidFor(part);
      return {
        part,
        drawn: drawSolid(solid, view, squash),
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
  }, [modality, view, visibleBands, squash]);

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

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2} ${VIEWBOX.width} ${VIEWBOX.height}`}
        className={cn(
          'w-full touch-none rounded-lab border border-line bg-surface-sunken select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ aspectRatio: `${VIEWBOX.width} / ${VIEWBOX.height}` }}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="application"
        aria-label={`Interactive cutaway of a ${modality.name}. Drag to rotate, scroll to zoom. The parts are listed below the drawing and can be reached with the keyboard.`}
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

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <p className="rounded-lab bg-surface/80 px-2 py-1 text-[11.5px] text-ink-faint backdrop-blur-sm">
          Drag to rotate · scroll to zoom
        </p>
        <button
          type="button"
          onClick={reset}
          className="pointer-events-auto rounded-lab border border-line-strong bg-surface/80 px-2 py-1 text-[11.5px] text-ink-muted backdrop-blur-sm hover:text-ink"
        >
          Reset view
        </button>
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
  const opacity = (selected ? 0.62 : dimmed ? 0.14 : 0.38) * (0.62 + 0.38 * facing);

  return (
    <path
      d={d}
      fillRule="evenodd"
      fill={fill}
      fillOpacity={opacity}
      stroke={fill}
      strokeOpacity={selected ? 1 : dimmed ? 0.3 : 0.75}
      strokeWidth={selected ? 2 : 1.1}
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
