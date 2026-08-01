'use client';

import {
  SPECTRUM_STEP,
  fluorophoreColour,
  spectrumRange,
  type EncodedSpectrum,
  type Fluorophore,
} from '@/lib/bio/spectra';
import { transmission, type OpticalFilter } from '@/lib/bio/optics';

/**
 * The spectra overlay.
 *
 * Drawn as SVG from the data rather than with a charting library: the site
 * carries four runtime dependencies and none of them is 40 kB of plotting
 * engine, and the "imagery generated from data" direction the rest of the
 * brand follows applies here more literally than anywhere else on the site.
 *
 * Everything here is a pure function of its props, so the server and client
 * renders are byte-identical — the trap MolecularField fell into with
 * Math.random() and a hydration mismatch on every load.
 */

const VIEW_WIDTH = 1000;
const PLOT = { top: 12, right: 12, bottom: 34, left: 40 };

/**
 * Nominal display width the `height` prop is quoted against.
 *
 * The chart keeps its aspect ratio rather than stretching to fill, so the
 * viewBox has to be shaped for the height the caller wants. Stretching would
 * scale the tick labels differently in x and y, and slightly squashed numerals
 * are the kind of thing that reads as a broken page without anyone being able
 * to say why.
 */
const NOMINAL_WIDTH = 900;

export interface ChartFilter {
  filter: OpticalFilter;
  /** 'excitation' bands are drawn under the curves, 'emission' over them. */
  role: 'excitation' | 'emission';
}

export interface SpectraChartProps {
  fluorophores: readonly Fluorophore[];
  /** Vertical rules for laser lines. */
  laserLines?: readonly number[];
  filters?: readonly ChartFilter[];
  /** Overrides the automatic wavelength window. */
  range?: [number, number];
  /** Announced to screen readers in place of the drawing. */
  description: string;
  height?: number;
  /**
   * Stable, unique within one page. Becomes the clip path's id.
   *
   * Not `useId`, for the reason quantity-input.tsx documents: tools mount
   * through next/dynamic, so the client render has a lazy boundary the server
   * render does not, the useId counters diverge, and every generated id
   * hydrates mismatched. It is not only field ids that suffer — a clipPath id
   * and the `url(#…)` that references it break the same way, and the chart
   * loses its clipping on hydration.
   */
  name: string;
}

export function SpectraChart({
  fluorophores,
  laserLines = [],
  filters = [],
  range,
  description,
  height = 300,
  name,
}: SpectraChartProps) {
  const clipId = `spectra-clip-${name}`;
  const viewHeight = Math.round((VIEW_WIDTH / NOMINAL_WIDTH) * height);

  const [low, high] = range ?? autoRange(fluorophores, filters, laserLines);
  const x = (nm: number) =>
    PLOT.left + ((nm - low) / (high - low)) * (VIEW_WIDTH - PLOT.left - PLOT.right);
  const y = (value: number) =>
    viewHeight - PLOT.bottom - value * (viewHeight - PLOT.top - PLOT.bottom);

  const ticks = axisTicks(low, high);

  return (
    <figure className="rounded-lab border border-line bg-surface-sunken p-3">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        style={{ width: '100%', height: 'auto' }}
        role="img"
        aria-label={description}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={PLOT.left}
              y={PLOT.top}
              width={VIEW_WIDTH - PLOT.left - PLOT.right}
              height={viewHeight - PLOT.top - PLOT.bottom}
            />
          </clipPath>
        </defs>

        {/* Horizontal rules at 0, 25, 50, 75, 100% of peak. */}
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <line
            key={value}
            x1={PLOT.left}
            x2={VIEW_WIDTH - PLOT.right}
            y1={y(value)}
            y2={y(value)}
            stroke="var(--color-line)"
            strokeWidth={value === 0 ? 1.5 : 1}
          />
        ))}

        <g clipPath={`url(#${clipId})`}>
          {filters
            .filter((entry) => entry.role === 'excitation')
            .map((entry) => (
              <FilterBand key={`ex-${entry.filter.label}`} entry={entry} x={x} y={y} />
            ))}

          {fluorophores.map((fluorophore) => (
            <g key={fluorophore.id}>
              <path
                d={areaPath(fluorophore.em, x, y)}
                fill={fluorophoreColour(fluorophore)}
                fillOpacity={0.22}
              />
              <path
                d={linePath(fluorophore.em, x, y)}
                fill="none"
                stroke={fluorophoreColour(fluorophore)}
                strokeWidth={2}
              />
              <path
                d={linePath(fluorophore.ex, x, y)}
                fill="none"
                stroke={fluorophoreColour(fluorophore)}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.85}
              />
            </g>
          ))}

          {filters
            .filter((entry) => entry.role === 'emission')
            .map((entry) => (
              <FilterBand key={`em-${entry.filter.label}`} entry={entry} x={x} y={y} />
            ))}

          {laserLines.map((nm) => (
            <line
              key={nm}
              x1={x(nm)}
              x2={x(nm)}
              y1={y(0)}
              y2={PLOT.top}
              stroke="var(--color-gfp-400)"
              strokeWidth={1.5}
              strokeDasharray="2 3"
            />
          ))}
        </g>

        {laserLines.map((nm) => (
          <text
            key={`label-${nm}`}
            x={x(nm)}
            y={PLOT.top + 10}
            textAnchor="middle"
            className="fill-[var(--color-gfp-400)] font-mono"
            fontSize={14}
          >
            {nm}
          </text>
        ))}

        {ticks.map((nm) => (
          <g key={nm}>
            <line x1={x(nm)} x2={x(nm)} y1={y(0)} y2={y(0) + 5} stroke="var(--color-line-strong)" />
            <text
              x={x(nm)}
              y={viewHeight - 12}
              textAnchor="middle"
              className="fill-[var(--color-ink-faint)] font-mono"
              fontSize={15}
            >
              {nm}
            </text>
          </g>
        ))}

        <text
          x={PLOT.left - 8}
          y={y(1) + 5}
          textAnchor="end"
          className="fill-[var(--color-ink-faint)] font-mono"
          fontSize={15}
        >
          100
        </text>
        <text
          x={PLOT.left - 8}
          y={y(0) + 5}
          textAnchor="end"
          className="fill-[var(--color-ink-faint)] font-mono"
          fontSize={15}
        >
          0
        </text>
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden>
            <line
              x1="0"
              y1="3"
              x2="22"
              y2="3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          </svg>
          excitation
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden>
            <rect width="22" height="8" fill="currentColor" fillOpacity="0.35" />
          </svg>
          emission
        </span>
        <span>percent of each curve&rsquo;s own maximum, so heights are not brightness</span>
      </figcaption>
    </figure>
  );
}

function FilterBand({
  entry,
  x,
  y,
}: {
  entry: ChartFilter;
  x: (nm: number) => number;
  y: (value: number) => number;
}) {
  const { filter } = entry;
  // Sample the transmission rather than drawing a rectangle: the shoulders are
  // part of the model, and a hard-edged box would show a filter the tool is
  // not actually using.
  const points: string[] = [];
  const [from, to] = filterSpan(filter);
  for (let nm = from; nm <= to; nm += 2) points.push(`${x(nm)},${y(transmission(filter, nm))}`);

  return (
    <polygon
      points={`${x(from)},${y(0)} ${points.join(' ')} ${x(to)},${y(0)}`}
      fill="var(--color-ink)"
      fillOpacity={entry.role === 'excitation' ? 0.07 : 0.1}
      stroke="var(--color-line-strong)"
      strokeWidth={1}
    />
  );
}

function filterSpan(filter: OpticalFilter): [number, number] {
  if (filter.kind === 'bandpass') {
    return [filter.centre - filter.width / 2 - 12, filter.centre + filter.width / 2 + 12];
  }
  if (filter.kind === 'longpass') return [filter.centre - 12, 900];
  return [280, filter.centre + 12];
}

function points(spectrum: EncodedSpectrum): [number, number][] {
  return spectrum.values.map((value, index) => [spectrum.start + index * SPECTRUM_STEP, value]);
}

function linePath(
  spectrum: EncodedSpectrum,
  x: (nm: number) => number,
  y: (value: number) => number,
): string {
  return points(spectrum)
    .map(([nm, value], index) => `${index === 0 ? 'M' : 'L'}${x(nm)},${y(value)}`)
    .join(' ');
}

function areaPath(
  spectrum: EncodedSpectrum,
  x: (nm: number) => number,
  y: (value: number) => number,
): string {
  const list = points(spectrum);
  const first = list[0]!;
  const last = list[list.length - 1]!;
  return `M${x(first[0])},${y(0)} ${linePath(spectrum, x, y).slice(1)} L${x(last[0])},${y(0)} Z`;
}

/** The window that holds every curve worth seeing, rounded to a tidy number. */
function autoRange(
  fluorophores: readonly Fluorophore[],
  filters: readonly ChartFilter[],
  laserLines: readonly number[],
): [number, number] {
  if (fluorophores.length === 0 && filters.length === 0) return [350, 750];

  let low = Infinity;
  let high = -Infinity;

  for (const fluorophore of fluorophores) {
    for (const spectrum of [fluorophore.ex, fluorophore.em]) {
      // Trim the long shallow tails: they add a hundred nanometres of empty
      // axis and squash everything worth reading into the middle third.
      const trimmed = significantRange(spectrum, 0.02);
      low = Math.min(low, trimmed[0]);
      high = Math.max(high, trimmed[1]);
    }
  }
  for (const { filter } of filters) {
    low = Math.min(low, filter.centre - filter.width / 2 - 20);
    high = Math.max(high, filter.centre + filter.width / 2 + 20);
  }
  for (const nm of laserLines) {
    low = Math.min(low, nm - 20);
    high = Math.max(high, nm + 20);
  }

  return [Math.floor(low / 25) * 25, Math.ceil(high / 25) * 25];
}

function significantRange(spectrum: EncodedSpectrum, threshold: number): [number, number] {
  const [from, to] = spectrumRange(spectrum);
  let lowIndex = 0;
  let highIndex = spectrum.values.length - 1;
  while (lowIndex < highIndex && (spectrum.values[lowIndex] ?? 0) < threshold) lowIndex += 1;
  while (highIndex > lowIndex && (spectrum.values[highIndex] ?? 0) < threshold) highIndex -= 1;
  return [
    Math.max(from, spectrum.start + lowIndex * SPECTRUM_STEP),
    Math.min(to, spectrum.start + highIndex * SPECTRUM_STEP),
  ];
}

function axisTicks(low: number, high: number): number[] {
  const span = high - low;
  const step = span > 400 ? 100 : span > 200 ? 50 : 25;
  const ticks: number[] = [];
  for (let nm = Math.ceil(low / step) * step; nm <= high; nm += step) ticks.push(nm);
  return ticks;
}
