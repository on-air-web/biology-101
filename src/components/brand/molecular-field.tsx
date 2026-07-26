/**
 * A generated banner for chemistry-flavoured sections.
 *
 * Rings, bonds and atoms at varying depth. Not a specific molecule — it does
 * not pretend to be data, it just belongs to the subject. Generated rather
 * than photographed, so there is nothing to license and nothing to load.
 *
 * The geometry lives in src/lib/brand/geometry.ts because the link card is
 * drawn from the same code at build time, and because the layout is seeded and
 * therefore identical on the server and the client — a random one would
 * produce a hydration mismatch on every render.
 */

import { buildMolecularField } from '@/lib/brand/geometry';

const WIDTH = 1200;
const HEIGHT = 520;

export function MolecularField({ seed = 20260725 }: { seed?: number }) {
  const { rings, bonds, nodes } = buildMolecularField(seed, WIDTH, HEIGHT);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <filter id="mf-far">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="mf-near">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {rings.map((ring, index) => (
        <polygon
          key={`r${index}`}
          points={ring.points}
          fill="none"
          stroke={ring.colour}
          strokeWidth={ring.width.toFixed(2)}
          opacity={ring.opacity.toFixed(2)}
          filter={ring.blur ? 'url(#mf-far)' : undefined}
        />
      ))}

      {bonds.map((bond, index) => (
        <line
          key={`b${index}`}
          x1={bond.x1.toFixed(1)}
          y1={bond.y1.toFixed(1)}
          x2={bond.x2.toFixed(1)}
          y2={bond.y2.toFixed(1)}
          stroke="#7fb6e8"
          strokeWidth={bond.width.toFixed(2)}
          opacity={bond.opacity.toFixed(2)}
        />
      ))}

      {nodes.map((node, index) => (
        <circle
          key={`n${index}`}
          cx={node.x.toFixed(1)}
          cy={node.y.toFixed(1)}
          r={node.radius.toFixed(2)}
          fill={node.colour}
          opacity={node.opacity.toFixed(2)}
          filter={node.blur ? `url(#mf-${node.blur})` : undefined}
        />
      ))}
    </svg>
  );
}
