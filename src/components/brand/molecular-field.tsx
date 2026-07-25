/**
 * A generated banner for chemistry-flavoured sections.
 *
 * Rings, bonds and atoms at varying depth. Not a specific molecule — it does
 * not pretend to be data, it just belongs to the subject. Generated rather
 * than photographed, so there is nothing to license and nothing to load.
 *
 * The layout is seeded and therefore identical on the server and the client;
 * a random one would produce a hydration mismatch on every render.
 */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WIDTH = 1200;
const HEIGHT = 520;

export function MolecularField({ seed = 20260725 }: { seed?: number }) {
  const random = mulberry32(seed);
  const between = (min: number, max: number) => min + random() * (max - min);

  const nodes: [number, number, number][] = [];
  const rings: { points: string; colour: string; width: number; opacity: number; blur: boolean }[] =
    [];

  for (let i = 0; i < 26; i += 1) {
    const cx = between(-40, WIDTH + 40);
    const cy = between(-20, HEIGHT + 20);
    const radius = between(18, 46);
    const depth = random();
    const rotation = between(0, Math.PI);
    const points: string[] = [];

    for (let k = 0; k < 6; k += 1) {
      const angle = rotation + (k * Math.PI) / 3;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      nodes.push([x, y, depth]);
    }

    rings.push({
      points: points.join(' '),
      colour: depth > 0.75 ? '#9fd8ff' : depth > 0.45 ? '#5f8fd0' : '#2f4a6b',
      width: 0.6 + depth * 1.5,
      opacity: 0.1 + depth * 0.5,
      blur: depth < 0.35,
    });
  }

  for (let i = 0; i < 70; i += 1) {
    nodes.push([between(0, WIDTH), between(0, HEIGHT), random()]);
  }

  const bonds: { x1: number; y1: number; x2: number; y2: number; w: number; o: number }[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (distance < 62 && random() < 0.1) {
        const depth = (a[2] + b[2]) / 2;
        bonds.push({
          x1: a[0],
          y1: a[1],
          x2: b[0],
          y2: b[1],
          w: 0.4 + depth,
          o: 0.06 + depth * 0.26,
        });
      }
    }
  }

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
          strokeWidth={bond.w.toFixed(2)}
          opacity={bond.o.toFixed(2)}
        />
      ))}

      {nodes.map((node, index) => {
        const [x, y, depth] = node;
        return (
          <circle
            key={`n${index}`}
            cx={x.toFixed(1)}
            cy={y.toFixed(1)}
            r={(0.9 + depth * 3.2).toFixed(2)}
            fill={depth > 0.82 ? '#d6ecff' : depth > 0.5 ? '#8fc4f5' : '#3d6b9e'}
            opacity={(0.16 + depth * 0.62).toFixed(2)}
            filter={depth < 0.3 ? 'url(#mf-far)' : depth > 0.85 ? 'url(#mf-near)' : undefined}
          />
        );
      })}
    </svg>
  );
}
