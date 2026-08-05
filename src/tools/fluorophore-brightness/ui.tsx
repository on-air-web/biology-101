'use client';

import { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { fluorophoreColour } from '@/lib/bio/spectra';
import { formatNumber } from '@/lib/format';
import { OpticsError, buildSetup, compareBrightness, findReversals, type SortKey } from './compute';
import { fluorophoreBrightnessMeta } from './meta';

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'protein', label: 'Proteins' },
  { value: 'dye', label: 'Dyes' },
] as const;

const SORTS = [
  { value: 'practical', label: 'In this setup' },
  { value: 'molecular', label: 'ε × Φ' },
  { value: 'emission', label: 'Wavelength' },
] as const;

export default function FluorophoreBrightnessTool() {
  const [laser, setLaser] = useState('488');
  const [excitationFilter, setExcitationFilter] = useState('');
  const [emissionFilter, setEmissionFilter] = useState('525/50');
  const [kind, setKind] = useState<'all' | 'protein' | 'dye'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('practical');

  const { rows, reversals, error } = useMemo(() => {
    try {
      const setup = buildSetup({ laser, excitationFilter, emissionFilter });
      const computed = compareBrightness({
        setup,
        kind: kind === 'all' ? undefined : kind,
        sortBy,
      });
      return { rows: computed, reversals: findReversals(computed), error: undefined };
    } catch (caught) {
      return {
        rows: [],
        reversals: [],
        error: caught instanceof OpticsError ? caught.message : 'Could not read that setup.',
      };
    }
  }, [laser, excitationFilter, emissionFilter, kind, sortBy]);

  const visible = rows.filter((row) => (row.relative ?? 0) > 0.001 || sortBy !== 'practical');

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="field-brightness-laser" className="lbl">
            Laser (nm)
          </label>
          <input
            id="field-brightness-laser"
            value={laser}
            onChange={(event) => setLaser(event.target.value)}
            placeholder="488"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="field-brightness-ex" className="lbl">
            or Ex filter
          </label>
          <input
            id="field-brightness-ex"
            value={excitationFilter}
            onChange={(event) => setExcitationFilter(event.target.value)}
            placeholder="470/40"
            disabled={laser.trim() !== ''}
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-sunken disabled:text-ink-faint"
          />
        </div>
        <div>
          <label htmlFor="field-brightness-em" className="lbl">
            Emission filter
          </label>
          <input
            id="field-brightness-em"
            value={emissionFilter}
            onChange={(event) => setEmissionFilter(event.target.value)}
            placeholder="525/50"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Segmented
          name="brightness-kind"
          label="Show"
          options={KINDS}
          value={kind}
          onChange={setKind}
        />
        <Segmented
          name="brightness-sort"
          label="Rank by"
          options={SORTS}
          value={sortBy}
          onChange={setSortBy}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab border border-signal-error/50 bg-signal-error/10 p-3 text-[12.5px] text-ink-muted">
          {error}
        </p>
      ) : null}

      {reversals.map((reversal) => (
        <p
          key={reversal.message}
          className="mt-4 flex gap-2.5 rounded-lab border border-line-strong bg-surface-raised p-3 text-[12.5px] leading-[1.6] text-ink-muted"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-gfp-400" aria-hidden />
          <span>{reversal.message}</span>
        </p>
      ))}

      {visible.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-1.5 pr-3 font-medium text-ink-muted">Fluorophore</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Em</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">ε</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Φ</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">ε × Φ</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Excited</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Collected</th>
                <th className="py-1.5 pr-3 font-medium text-ink-muted">In this setup</th>
                <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Bleach t½</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {visible.map((row) => (
                <tr key={row.fluorophore.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 font-sans whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: fluorophoreColour(row.fluorophore) }}
                        aria-hidden
                      />
                      {row.fluorophore.name}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right">{row.fluorophore.emMax ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right">
                    {row.fluorophore.extCoeff === null
                      ? '—'
                      : (row.fluorophore.extCoeff / 1000).toFixed(0) + 'k'}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    {/* Two decimals: a couple of source records carry an
                        unrounded figure such as 0.8118, and a column where one
                        row claims four significant figures and the rest claim
                        two reads as a precision nobody measured. */}
                    {row.fluorophore.quantumYield === null
                      ? '—'
                      : row.fluorophore.quantumYield.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    {row.molecular === undefined ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      formatNumber(row.molecular, 3)
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink-muted">
                    {(row.excitation * 100).toFixed(0)}%
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink-muted">
                    {(row.collection * 100).toFixed(0)}%
                  </td>
                  <td className="py-1.5 pr-3">
                    {row.relative === undefined ? (
                      <span className="text-ink-faint">not published</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className="block h-full rounded-full bg-gfp-400"
                            style={{ width: `${Math.max(row.relative * 100, 1)}%` }}
                          />
                        </span>
                        <span className="text-ink-muted">{(row.relative * 100).toFixed(0)}%</span>
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink-faint">
                    {row.bleachHalfLife === null ? '—' : `${row.bleachHalfLife.toFixed(0)} s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 rounded-lab bg-surface-raised p-3.5 text-[12px] leading-[1.6] text-ink-muted">
        <p>
          <span className="text-ink">ε × Φ</span> is the fluorophore&rsquo;s own brightness, in the
          usual units of 1000, and is the number papers tabulate.{' '}
          <span className="text-ink">In this setup</span> multiplies it by how well your line
          excites the molecule and how much of its emission your filter passes, relative to the best
          row on show. Neither accounts for maturation, folding, expression level or how well the
          fusion tolerates the tag — in a real cell those routinely matter more than either column.
        </p>
        <p className="mt-2">
          <span className="text-ink">Bleach t½</span> is seconds to half the initial emission, as
          published. It is deliberately not sorted on and the rows are not ranked by it:{' '}
          <span className="text-ink">these figures are not comparable with one another.</span> Each
          comes from a different paper at a different illumination intensity, in a different medium,
          on a different objective, and the same protein has been published with values an order of
          magnitude apart. Treat a small number as a flag to test the fluorophore yourself, not as
          evidence it is worse than the row above. Dyes carry none here at all.
        </p>
      </div>

      <ShareButton
        state={{ l: laser, ex: excitationFilter, em: emissionFilter, k: kind, s: sortBy }}
      />

      <Ladder
        formula="ε × Φ ÷ 1000;  in this setup = ε × Φ × EX(λ) × ∫EM(λ)T(λ)dλ ÷ ∫EM(λ)dλ"
        citations={fluorophoreBrightnessMeta.citations}
      />
    </div>
  );
}
