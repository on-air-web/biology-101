/**
 * Generated banner for statistics and plotting sections.
 *
 * Overlapping distributions with the individual points scattered beneath them
 * — which is the argument those pages make, drawn rather than stated. No
 * photograph, nothing to license, nothing to load.
 *
 * Seeded so the server and client render identically; a random layout would
 * produce a hydration mismatch on every load.
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
const BASELINE = HEIGHT * 0.78;

/** Box–Muller, so the scatter actually looks like sampled data. */
function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-9);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function DistributionField({ seed = 20260726 }: { seed?: number }) {
  const random = mulberry32(seed);

  const groups = [
    { centre: 0.28, spread: 0.09, height: 150, colour: '#4ade80' },
    { centre: 0.52, spread: 0.07, height: 196, colour: '#6ba5ff' },
    { centre: 0.76, spread: 0.11, height: 124, colour: '#e0648b' },
  ];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" aria-hidden>
      <line
        x1={0}
        y1={BASELINE}
        x2={WIDTH}
        y2={BASELINE}
        stroke="#3a3a3a"
        strokeWidth={1}
        opacity={0.5}
      />

      {groups.map((group, index) => {
        const centreX = group.centre * WIDTH;
        const sigma = group.spread * WIDTH;

        // Density curve, sampled across the width.
        const points: string[] = [];
        for (let x = 0; x <= WIDTH; x += 8) {
          const z = (x - centreX) / sigma;
          const y = BASELINE - group.height * Math.exp(-0.5 * z * z);
          points.push(`${x},${y.toFixed(1)}`);
        }

        // The raw observations the curve is drawn from.
        const dots = Array.from({ length: 46 }, () => {
          const x = centreX + gaussian(random) * sigma * 0.62;
          const y = BASELINE - 6 - random() * 34;
          return { x, y, r: 1.6 + random() * 2 };
        });

        return (
          <g key={index}>
            <polyline
              points={`0,${BASELINE} ${points.join(' ')} ${WIDTH},${BASELINE}`}
              fill={group.colour}
              opacity={0.09}
            />
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke={group.colour}
              strokeWidth={1.6}
              opacity={0.5}
            />
            {dots.map((dot, dotIndex) => (
              <circle
                key={dotIndex}
                cx={dot.x.toFixed(1)}
                cy={dot.y.toFixed(1)}
                r={dot.r.toFixed(2)}
                fill={group.colour}
                opacity={0.42}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
