'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { FluorophoreMultiSelect } from '@/components/tools/fluorophore-picker';
import { SpectraChart } from '@/components/tools/spectra-chart';
import { ShareButton } from '@/components/ui/share-button';
import { LASER_LINES } from '@/lib/bio/optics';
import { fluorophoreColour, getFluorophore } from '@/lib/bio/spectra';
import { formatNumber } from '@/lib/format';
import { describeFluorophores, findSeparationProblems } from './compute';
import { spectraViewerMeta } from './meta';

const DEFAULT_SELECTION = ['egfp', 'mcherry'];
const DEFAULT_LINES = [488, 561];

export default function SpectraViewerTool() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [lines, setLines] = useState<number[]>(DEFAULT_LINES);

  const fluorophores = useMemo(
    () => selected.map(getFluorophore).filter((f) => f !== undefined),
    [selected],
  );

  const rows = useMemo(() => describeFluorophores(fluorophores, lines), [fluorophores, lines]);
  const warnings = useMemo(() => findSeparationProblems(fluorophores), [fluorophores]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <FluorophoreMultiSelect
        name="viewer-fluorophores"
        label="Fluorophores"
        values={selected}
        onChange={setSelected}
        max={6}
        hint="Up to six. Ordered by emission wavelength within each group."
      />

      <fieldset className="mt-4">
        <legend className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
          Laser lines
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {LASER_LINES.map((nm) => {
            const on = lines.includes(nm);
            return (
              <label
                key={nm}
                className={`flex h-8 cursor-pointer items-center rounded-lab border px-2.5 font-mono text-[12.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                  // text-ink rather than a green: gfp-300 on a gfp-600 tint is
                  // legible on the black surface and almost invisible in light
                  // mode, where the same tint sits on white. The border and
                  // the wash carry the state; the label stays readable.
                  on
                    ? 'border-gfp-400 bg-gfp-400/10 text-ink'
                    : 'border-line-strong text-ink-muted hover:text-ink'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setLines(
                      on
                        ? lines.filter((other) => other !== nm)
                        : [...lines, nm].sort((a, b) => a - b),
                    )
                  }
                  className="sr-only"
                />
                {nm} nm
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        <SpectraChart
          name="viewer"
          fluorophores={fluorophores}
          laserLines={lines}
          description={
            fluorophores.length > 0
              ? `Excitation and emission spectra of ${fluorophores.map((f) => f.name).join(', ')}, with laser lines at ${lines.join(', ')} nm. The table below carries the same figures.`
              : 'No fluorophores selected.'
          }
        />
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-1.5 pr-3 font-medium text-ink-muted">Fluorophore</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Ex</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Em</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Stokes</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Brightness</th>
                {lines.map((nm) => (
                  <th key={nm} className="py-1.5 pr-3 text-right font-medium text-ink-muted">
                    {nm} nm
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((row) => (
                <tr key={row.fluorophore.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 font-sans">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: fluorophoreColour(row.fluorophore) }}
                        aria-hidden
                      />
                      {row.fluorophore.name}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right">{row.exMax ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right">{row.emMax ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right">
                    {row.stokes === undefined ? '—' : `${row.stokes}`}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    {row.brightness === undefined ? (
                      <span className="text-ink-faint" title="Not published for this fluorophore">
                        —
                      </span>
                    ) : (
                      formatNumber(row.brightness, 3)
                    )}
                  </td>
                  {row.atLines.map((efficiency, index) => (
                    <td
                      key={lines[index]}
                      className={`py-1.5 pr-3 text-right ${
                        row.best?.nm === lines[index] && efficiency > 0.05
                          ? 'text-gfp-400'
                          : efficiency < 0.05
                            ? 'text-ink-faint'
                            : ''
                      }`}
                    >
                      {(efficiency * 100).toFixed(0)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
            Ex, Em and Stokes shift in nanometres. Brightness is ε × Φ ÷ 1000, a property of the
            molecule alone. The laser columns give the fraction of peak absorptivity at that line —
            multiply by the extinction coefficient to get ε where you are actually exciting.
          </p>
        </div>
      ) : null}

      {warnings.map((warning) => (
        <p
          key={`${warning.aId}-${warning.bId}`}
          className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
          <span>{warning.message}</span>
        </p>
      ))}

      {fluorophores.length > 0 ? (
        <ShareButton state={{ f: selected.join('.'), l: lines.join('.') }} />
      ) : null}

      <Ladder
        formula="curves are peak-normalised;  laser column = EX(λ) as a fraction of the excitation maximum"
        citations={spectraViewerMeta.citations}
        computeLocation={spectraViewerMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        Every curve is scaled to its own maximum, so a tall peak does not mean a bright fluorophore
        — compare the brightness column for that. Spectra are measured on purified protein or free
        dye in buffer; inside a cell, pH, chloride and the fusion partner all shift them a little,
        and a few of these are shifted enough to matter. Where FPbase carries an absorption spectrum
        but no separate excitation spectrum, the absorption curve is drawn in its place.
      </p>
    </div>
  );
}
