import { MARK_NODE, MARK_SIZE, MARK_STROKE, ringPoints } from '@/lib/brand/geometry';

/**
 * The Biology 101 mark.
 *
 * A ring with one node picked out — the same rings, bonds and atoms the banner
 * artwork is built from, reduced to a single unit of it.
 *
 * Drawn with `currentColor` and no background, so it takes the accent colour
 * from wherever it sits and works on both themes without a second asset. The
 * favicon is the one place that cannot inherit anything, and it gets its own
 * self-contained tile from scripts/make-brand.mjs.
 */
export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <polygon
        points={ringPoints()}
        stroke="currentColor"
        strokeWidth={MARK_STROKE}
        strokeLinejoin="round"
      />
      {/*
        Knocked out of the ring so the node reads as a separate atom rather
        than a thickened corner. It matters most at nav size, where the two
        would otherwise merge into a blob. Defaults to the page background and
        can be overridden wherever the mark sits on a different surface.
      */}
      <circle
        cx={MARK_NODE.x}
        cy={MARK_NODE.y}
        r={MARK_NODE.haloRadius}
        fill="var(--mark-gap, var(--page))"
      />
      <circle cx={MARK_NODE.x} cy={MARK_NODE.y} r={MARK_NODE.radius} fill="currentColor" />
    </svg>
  );
}
