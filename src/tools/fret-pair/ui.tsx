'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { FluorophoreSelect } from '@/components/tools/fluorophore-picker';
import { SpectraChart } from '@/components/tools/spectra-chart';
import { NumberInput } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { ShareButton } from '@/components/ui/share-button';
import { KAPPA_SQUARED_PRESETS, REFRACTIVE_INDEX_PRESETS } from '@/lib/bio/fret';
import { getFluorophore } from '@/lib/bio/spectra';
import { formatNumber, parseNumber } from '@/lib/format';
import { FretError, assessPair } from './compute';
import { fretPairMeta } from './meta';

export default function FretPairTool() {
  const [donorId, setDonorId] = useState('mturquoise2');
  const [acceptorId, setAcceptorId] = useState('mvenus');
  const [kappaId, setKappaId] = useState<string>('dynamic');
  const [indexId, setIndexId] = useState<string>('protein');
  const [separation, setSeparation] = useState('5');
  const [acceptorFilter, setAcceptorFilter] = useState('535/30');

  const donor = getFluorophore(donorId);
  const acceptor = getFluorophore(acceptorId);

  const kappa = KAPPA_SQUARED_PRESETS.find((p) => p.id === kappaId) ?? KAPPA_SQUARED_PRESETS[0]!;
  const index =
    REFRACTIVE_INDEX_PRESETS.find((p) => p.id === indexId) ?? REFRACTIVE_INDEX_PRESETS[0]!;

  const { result, error } = useMemo(() => {
    const distance = parseNumber(separation);
    if (!donor || !acceptor || distance === undefined) {
      return { result: undefined, error: undefined };
    }
    try {
      return {
        result: assessPair({
          donor,
          acceptor,
          kappaSquared: kappa.value,
          refractiveIndex: index.value,
          separation: distance,
          acceptorFilter,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof FretError ? caught.message : 'Could not work that out.',
      };
    }
  }, [donor, acceptor, kappa, index, separation, acceptorFilter]);

  const pair = [donor, acceptor].filter((f) => f !== undefined);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FluorophoreSelect
          name="fret-donor"
          label="Donor"
          value={donorId}
          onChange={setDonorId}
          exclude={[acceptorId]}
        />
        <FluorophoreSelect
          name="fret-acceptor"
          label="Acceptor"
          value={acceptorId}
          onChange={setAcceptorId}
          exclude={[donorId]}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="field-fret-kappa" className="lbl">
            Orientation κ²
          </label>
          <select
            id="field-fret-kappa"
            value={kappaId}
            onChange={(event) => setKappaId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            {KAPPA_SQUARED_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="field-fret-index" className="lbl">
            Refractive index
          </label>
          <select
            id="field-fret-index"
            value={indexId}
            onChange={(event) => setIndexId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            {REFRACTIVE_INDEX_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <NumberInput
          name="fret-separation"
          label="Separation"
          value={separation}
          onChange={setSeparation}
          suffix="nm"
          hint="Centre to centre."
        />
        <div>
          <label htmlFor="field-fret-acceptor-filter" className="lbl">
            Acceptor filter
          </label>
          <input
            id="field-fret-acceptor-filter"
            value={acceptorFilter}
            onChange={(event) => setAcceptorFilter(event.target.value)}
            placeholder="535/30"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">Optional. Measures donor leak.</p>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-[1.6] text-ink-faint">{kappa.guidance}</p>

      <Result
        className="mt-5"
        label="Förster radius"
        value={result ? formatNumber(result.forsterRadius, 3) : undefined}
        unit="nm"
        detail={
          result
            ? `${(result.efficiency * 100).toFixed(1)}% transfer at ${formatNumber(parseNumber(separation) ?? 0, 3)} nm. Efficiency is measurable between about ${formatNumber(result.workingRange[0], 2)} and ${formatNumber(result.workingRange[1], 2)} nm and saturates outside that.`
            : undefined
        }
        placeholder={error ?? 'Choose a donor and an acceptor.'}
      />

      {result ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TransferCurve result={result} separation={parseNumber(separation) ?? 0} />
          <div className="rounded-lab bg-surface-raised p-3.5">
            <p className="lbl">The numbers behind it</p>
            <dl className="mt-2 space-y-1.5 text-[12.5px]">
              <Row
                term="Overlap integral J"
                value={`${formatNumber(result.overlap, 4)} M⁻¹cm⁻¹nm⁴`}
              />
              <Row term="Donor quantum yield" value={`${donor?.quantumYield ?? '—'}`} />
              <Row
                term="Acceptor ε"
                value={
                  acceptor?.extCoeff
                    ? `${acceptor.extCoeff.toLocaleString()} M⁻¹cm⁻¹`
                    : 'not published'
                }
              />
              <Row term="κ²" value={`${formatNumber(kappa.value, 3)}`} />
              <Row term="Refractive index" value={`${index.value}`} />
              <Row
                term={`Acceptor excited at ${result.donorLine} nm`}
                value={`${(result.directAcceptorExcitation * 100).toFixed(0)}% of its peak`}
              />
              {result.donorBleedIntoAcceptorChannel !== undefined ? (
                <Row
                  term="Donor leak into acceptor filter"
                  value={`${(result.donorBleedIntoAcceptorChannel * 100).toFixed(0)}% of acceptor`}
                />
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <SpectraChart
          name="fret"
          fluorophores={pair}
          height={220}
          description={
            donor && acceptor
              ? `Spectra of the donor ${donor.name} and acceptor ${acceptor.name}. Transfer depends on the donor emission lying under the acceptor excitation.`
              : 'No pair selected.'
          }
        />
        <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
          Transfer depends on the donor&rsquo;s emission (filled) lying under the acceptor&rsquo;s
          excitation (dashed). Where those two overlap is the overlap integral.
        </p>
      </div>

      {result?.concerns.map((concern) => (
        <p
          key={concern}
          className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
          <span>{concern}</span>
        </p>
      ))}

      {result ? (
        <ShareButton
          state={{
            d: donorId,
            a: acceptorId,
            k: kappaId,
            n: indexId,
            r: parseNumber(separation) ?? 0,
          }}
        />
      ) : null}

      <Ladder
        formula="J = ∫F_D(λ)ε_A(λ)λ⁴dλ ÷ ∫F_D(λ)dλ;  R₀ = [9000·ln10·κ²·Φ_D·J ÷ (128π⁵N_A n⁴)]^(1/6);  E = 1 ÷ (1 + (r/R₀)⁶)"
        model={kappa.name}
        citations={fretPairMeta.citations}
        computeLocation={fretPairMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        κ² is the weak point of every Förster radius ever published, including this one. It is
        almost always taken as 2/3, which assumes both dipoles rotate freely and fast compared with
        the donor lifetime — sound for a dye on a long linker, and questionable for a fluorescent
        protein whose chromophore is held rigid inside a β-barrel. R₀ depends on it only as the
        sixth root, so the error is smaller than it looks: the entire physical range moves the
        radius by a factor of about 2.9, and a plausible range for a tethered pair by well under a
        fifth. The acceptor absorption is taken from its excitation spectrum, which is exact for a
        single-species fluorophore and slightly low where a dark absorbing state exists.
      </p>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{term}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Transfer efficiency against separation.
 *
 * The steepness is the message: FRET is a ruler over one narrow range and
 * blind either side of it, and a curve shows that in a way a percentage never
 * does.
 */
function TransferCurve({
  result,
  separation,
}: {
  result: { curve: { separation: number; efficiency: number }[]; forsterRadius: number };
  separation: number;
}) {
  const width = 400;
  const height = 190;
  const pad = { top: 10, right: 10, bottom: 26, left: 32 };
  const maxSeparation = result.curve[result.curve.length - 1]!.separation;

  const x = (nm: number) => pad.left + (nm / maxSeparation) * (width - pad.left - pad.right);
  const y = (value: number) => height - pad.bottom - value * (height - pad.top - pad.bottom);

  const path = result.curve
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${x(point.separation)},${y(point.efficiency)}`)
    .join(' ');

  return (
    <figure className="rounded-lab bg-surface-raised p-3.5">
      <p className="lbl">Transfer efficiency against separation</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-hidden>
        {[0, 0.5, 1].map((value) => (
          <line
            key={value}
            x1={pad.left}
            x2={width - pad.right}
            y1={y(value)}
            y2={y(value)}
            stroke="var(--color-line)"
          />
        ))}
        <line
          x1={x(result.forsterRadius)}
          x2={x(result.forsterRadius)}
          y1={y(0)}
          y2={y(1)}
          stroke="var(--color-line-strong)"
          strokeDasharray="3 3"
        />
        <path d={path} fill="none" stroke="var(--color-gfp-400)" strokeWidth={2} />
        {separation > 0 && separation <= maxSeparation ? (
          <circle
            cx={x(separation)}
            cy={y(result.curve.find((p) => p.separation >= separation)?.efficiency ?? 0)}
            r={4}
            fill="var(--color-gfp-400)"
          />
        ) : null}
        <text
          x={x(result.forsterRadius)}
          y={height - 8}
          textAnchor="middle"
          fontSize={11}
          className="fill-[var(--color-ink-faint)] font-mono"
        >
          R₀
        </text>
        <text
          x={pad.left}
          y={height - 8}
          textAnchor="start"
          fontSize={11}
          className="fill-[var(--color-ink-faint)] font-mono"
        >
          0
        </text>
        <text
          x={width - pad.right}
          y={height - 8}
          textAnchor="end"
          fontSize={11}
          className="fill-[var(--color-ink-faint)] font-mono"
        >
          {maxSeparation.toFixed(0)} nm
        </text>
        <text
          x={pad.left - 5}
          y={y(1) + 4}
          textAnchor="end"
          fontSize={11}
          className="fill-[var(--color-ink-faint)] font-mono"
        >
          1
        </text>
        <text
          x={pad.left - 5}
          y={y(0) + 4}
          textAnchor="end"
          fontSize={11}
          className="fill-[var(--color-ink-faint)] font-mono"
        >
          0
        </text>
      </svg>
    </figure>
  );
}
