'use client';

import { useMemo, useState } from 'react';
import { Plus, TriangleAlert, Wand2, X } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { FluorophoreMultiSelect } from '@/components/tools/fluorophore-picker';
import { SpectraChart, type ChartFilter } from '@/components/tools/spectra-chart';
import { ShareButton } from '@/components/ui/share-button';
import { suggestFilterSet } from '@/lib/bio/optics';
import { fluorophoreColour, getFluorophore } from '@/lib/bio/spectra';
import { analyseFilterSet, parseChannels, type ChannelDraft } from './compute';
import { filterCompatibilityMeta } from './meta';

const INITIAL: ChannelDraft[] = [
  {
    id: 'c1',
    label: 'Green',
    laser: '488',
    excitationFilter: '',
    dichroic: '495 LP',
    emissionFilter: '525/50',
  },
  {
    id: 'c2',
    label: 'Red',
    laser: '561',
    excitationFilter: '',
    dichroic: '570 LP',
    emissionFilter: '600/50',
  },
];

export default function FilterCompatibilityTool() {
  const [selected, setSelected] = useState<string[]>(['egfp', 'mcherry']);
  const [drafts, setDrafts] = useState<ChannelDraft[]>(INITIAL);

  const { channels, issues } = useMemo(() => parseChannels(drafts), [drafts]);
  const report = useMemo(() => analyseFilterSet(selected, channels), [selected, channels]);

  const fluorophores = useMemo(
    () => selected.map(getFluorophore).filter((f) => f !== undefined),
    [selected],
  );

  const chartFilters: ChartFilter[] = useMemo(
    () =>
      channels.flatMap((channel) => [
        ...(channel.illumination.kind === 'filtered'
          ? [{ filter: channel.illumination.filter, role: 'excitation' as const }]
          : []),
        ...channel.emission
          .filter((filter) => filter.kind === 'bandpass')
          .map((filter) => ({ filter, role: 'emission' as const })),
      ]),
    [channels],
  );

  const laserLines = channels
    .map((channel) => (channel.illumination.kind === 'laser' ? channel.illumination.nm : undefined))
    .filter((nm) => nm !== undefined);

  function update(id: string, patch: Partial<ChannelDraft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  function addChannel() {
    const nextId = `c${Date.now().toString(36)}`;
    setDrafts((current) => [
      ...current,
      {
        id: nextId,
        label: `Channel ${current.length + 1}`,
        laser: '',
        excitationFilter: '',
        dichroic: '',
        emissionFilter: '',
      },
    ]);
  }

  /** Fill a channel from a fluorophore's own spectra rather than a catalogue. */
  function suggestFor(channelId: string, fluorophoreId: string) {
    const fluorophore = getFluorophore(fluorophoreId);
    if (!fluorophore) return;
    const set = suggestFilterSet(fluorophore);
    update(channelId, {
      label: fluorophore.name,
      laser: '',
      excitationFilter: set.excitation.label,
      dichroic: set.dichroic.label,
      emissionFilter: set.emission.label,
    });
  }

  const issueFor = (channelId: string, field: ChannelDraft extends never ? never : string) =>
    issues.find((issue) => issue.channelId === channelId && issue.field === field)?.message;

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <FluorophoreMultiSelect
        name="panel-fluorophores"
        label="Fluorophores in the sample"
        values={selected}
        onChange={setSelected}
        max={6}
        hint="Everything that will be on the slide, including counterstains."
      />

      <div className="mt-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="lbl">Channels</p>
          <button
            type="button"
            onClick={addChannel}
            className="inline-flex h-7 items-center gap-1.5 rounded-lab border border-line-strong px-2.5 text-[12.5px] text-ink-muted hover:text-ink"
          >
            <Plus className="size-3.5" aria-hidden /> Add channel
          </button>
        </div>

        {drafts.map((channelDraft) => (
          <div
            key={channelDraft.id}
            className="rounded-lab border border-line bg-surface-raised p-3"
          >
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`field-${channelDraft.id}-label`}>
                Channel name
              </label>
              <input
                id={`field-${channelDraft.id}-label`}
                value={channelDraft.label}
                onChange={(event) => update(channelDraft.id, { label: event.target.value })}
                className="h-8 min-w-0 flex-1 rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
              <label className="sr-only" htmlFor={`field-${channelDraft.id}-suggest`}>
                Fill this channel from a fluorophore
              </label>
              <div className="flex h-8 items-center gap-1 rounded-lab border border-line-strong px-1.5 text-[12.5px] text-ink-muted">
                <Wand2 className="size-3.5" aria-hidden />
                <select
                  id={`field-${channelDraft.id}-suggest`}
                  value=""
                  onChange={(event) => suggestFor(channelDraft.id, event.target.value)}
                  className="h-full bg-transparent text-[12.5px] outline-none"
                >
                  <option value="">Fit to…</option>
                  {selected.map((id) => (
                    <option key={id} value={id}>
                      {getFluorophore(id)?.name}
                    </option>
                  ))}
                </select>
              </div>
              {drafts.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((current) => current.filter((d) => d.id !== channelDraft.id))
                  }
                  className="flex size-8 items-center justify-center rounded-lab border border-line-strong text-ink-faint hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">Remove {channelDraft.label}</span>
                </button>
              ) : null}
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-4">
              <FilterField
                name={`${channelDraft.id}-laser`}
                label="Laser (nm)"
                value={channelDraft.laser}
                onChange={(value) => update(channelDraft.id, { laser: value })}
                placeholder="488"
                error={issueFor(channelDraft.id, 'laser')}
              />
              <FilterField
                name={`${channelDraft.id}-ex`}
                label="or Ex filter"
                value={channelDraft.excitationFilter}
                onChange={(value) => update(channelDraft.id, { excitationFilter: value })}
                placeholder="470/40"
                disabled={channelDraft.laser.trim() !== ''}
                error={issueFor(channelDraft.id, 'excitationFilter')}
              />
              <FilterField
                name={`${channelDraft.id}-dic`}
                label="Dichroic"
                value={channelDraft.dichroic}
                onChange={(value) => update(channelDraft.id, { dichroic: value })}
                placeholder="495 LP"
                error={issueFor(channelDraft.id, 'dichroic')}
              />
              <FilterField
                name={`${channelDraft.id}-em`}
                label="Em filter"
                value={channelDraft.emissionFilter}
                onChange={(value) => update(channelDraft.id, { emissionFilter: value })}
                placeholder="525/50"
                error={issueFor(channelDraft.id, 'emissionFilter')}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <SpectraChart
          name="panel"
          fluorophores={fluorophores}
          filters={chartFilters}
          laserLines={laserLines}
          description={`Spectra of ${fluorophores.map((f) => f.name).join(', ') || 'no fluorophores'} with the channel passbands shaded. The tables below carry the same figures.`}
        />
      </div>

      {report.rows.length > 0 && channels.length > 0 ? (
        <>
          <div className="mt-5 overflow-x-auto">
            <p className="lbl">Where each fluorophore&rsquo;s signal goes</p>
            <table className="mt-2 w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="py-1.5 pr-3 font-medium text-ink-muted">Fluorophore</th>
                  {channels.map((channel) => (
                    <th
                      key={channel.id}
                      className="py-1.5 pr-3 text-right font-medium text-ink-muted"
                    >
                      {channel.label}
                    </th>
                  ))}
                  <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Excited</th>
                  <th className="py-1.5 pr-3 text-right font-medium text-ink-muted">Collected</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {report.rows.map((row) => (
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
                    {channels.map((channel) => {
                      const share = row.relative[channel.id] ?? 0;
                      const home = channel.id === row.homeChannelId;
                      return (
                        <td
                          key={channel.id}
                          className={`py-1.5 pr-3 text-right ${
                            home
                              ? 'font-semibold text-gfp-400'
                              : share >= 0.1
                                ? 'text-amber-400'
                                : share < 0.005
                                  ? 'text-ink-faint'
                                  : ''
                          }`}
                        >
                          {share >= 0.005 ? `${(share * 100).toFixed(1)}%` : '—'}
                        </td>
                      );
                    })}
                    <td className="py-1.5 pr-3 text-right text-ink-muted">
                      {(row.homeExcitation * 100).toFixed(0)}%
                    </td>
                    <td className="py-1.5 pr-3 text-right text-ink-muted">
                      {(row.homeCollection * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
              Each row is one fluorophore as a percentage of its own best channel, so it does not
              depend on how much is expressed or on how bright the fluorophore is — those cancel.
              The last two columns are, in that best channel, the fraction of peak absorptivity the
              illumination reaches and the fraction of emitted photons the filters pass.
            </p>
          </div>

          {report.composition.some((channel) => channel.shares.length > 1) ? (
            <div className="mt-5">
              <p className="lbl">What each channel is looking at</p>
              <ul className="mt-2 space-y-1.5">
                {report.composition.map((channel) => {
                  const label = channels.find((c) => c.id === channel.channelId)?.label;
                  return (
                    <li key={channel.channelId} className="text-[12.5px] text-ink-muted">
                      <span className="text-ink">{label}</span>
                      {' — '}
                      {channel.shares
                        .filter((share) => share.share >= 0.005)
                        .map(
                          (share) =>
                            `${(share.share * 100).toFixed(1)}% ${getFluorophore(share.fluorophoreId)?.name}`,
                        )
                        .join(', ')}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
                This one assumes equal molar amounts of every fluorophore, which is almost never
                true — a strong promoter and a knock-in tag differ by orders of magnitude, and that
                swamps everything here. Read it as a ranking, not a prediction. The table above
                carries no such assumption.
                {report.composition[0]?.excludedIds.length
                  ? ` Left out for want of a published extinction coefficient or quantum yield: ${report.composition[0].excludedIds
                      .map((id) => getFluorophore(id)?.name)
                      .join(', ')}.`
                  : null}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {report.findings.map((finding) => (
        <p
          key={finding.message}
          className={`mt-3 flex gap-2.5 rounded-lab border p-3 text-[12.5px] leading-[1.6] text-ink-muted ${
            finding.severity === 'problem'
              ? 'border-signal-error/50 bg-signal-error/10'
              : 'border-amber-700 bg-amber-700/10'
          }`}
        >
          <TriangleAlert
            className={`mt-0.5 size-4 shrink-0 ${
              finding.severity === 'problem' ? 'text-signal-error' : 'text-amber-400'
            }`}
            aria-hidden
          />
          <span>{finding.message}</span>
        </p>
      ))}

      {report.rows.length > 0 ? (
        <ShareButton
          state={{
            f: selected.join('.'),
            c: drafts
              .map((d) =>
                [d.label, d.laser, d.excitationFilter, d.dichroic, d.emissionFilter].join('~'),
              )
              .join('|'),
          }}
        />
      ) : null}

      <Ladder
        formula="collected = ∫EM(λ)·T(λ)dλ ÷ ∫EM(λ)dλ;  excited = EX(λ_laser), or ∫EX·T dλ ÷ ∫T dλ through a filter"
        model={filterCompatibilityMeta.models?.[0]?.name}
        citations={filterCompatibilityMeta.citations}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        Filters are modelled from their designation, not from a measured curve, so any part you can
        name works — but out-of-band blocking is taken as perfect and a real filter is not. Where a
        channel uses an excitation filter rather than a laser, the lamp is assumed flat across the
        band; LED and metal-halide sources are not, and a source spectrum would change the
        excitation column by a few per cent. Detector sensitivity is not modelled at all, which
        matters past about 700 nm on a silicon camera.
      </p>
    </div>
  );
}

function FilterField({
  name,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
}) {
  const inputId = `field-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="lbl">
        {label}
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        className={`mt-1 h-9 w-full rounded-lab border bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-sunken disabled:text-ink-faint ${
          error ? 'border-signal-error' : 'border-line-strong'
        }`}
      />
      {error ? <p className="mt-1 text-[11.5px] text-signal-error">{error}</p> : null}
    </div>
  );
}
