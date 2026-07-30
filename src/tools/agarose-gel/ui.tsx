'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical } from '@/lib/units';
import { GRADES, GelError, prepareGel } from './compute';
import { agaroseGelMeta } from './meta';

export default function AgaroseGelTool() {
  const [concentration, setConcentration] = useState<Quantity>({ raw: '1', unitId: 'pct_wv' });
  const [volume, setVolume] = useState<Quantity>({ raw: '100', unitId: 'mL' });
  const [targetSize, setTargetSize] = useState('');

  const { result, error } = useMemo(() => {
    const percent = parseNumber(concentration.raw);
    const gelVolume = parseNumber(volume.raw);
    if (percent === undefined || gelVolume === undefined) {
      return { result: undefined, error: undefined };
    }
    const size = parseNumber(targetSize);
    try {
      return {
        result: prepareGel({
          concentration: toCanonical(percent, concentration.unitId),
          volume: toCanonical(gelVolume, volume.unitId),
          targetSize: size,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof GelError ? caught.message : 'Could not work that out.',
      };
    }
  }, [concentration, volume, targetSize]);

  const mass = result ? autoScale(result.agaroseMass, 'mass') : undefined;
  const size = parseNumber(targetSize);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <QuantityInput
          name="gel-concentration"
          label="Gel percentage"
          dimension="mass-concentration"
          value={concentration}
          onChange={setConcentration}
          hint="1% is 1 g in 100 mL."
        />
        <QuantityInput
          name="gel-volume"
          label="Buffer volume"
          dimension="volume"
          value={volume}
          onChange={setVolume}
          hint="TAE or TBE, as the gel is cast in."
        />
        <NumberInput
          name="target-size"
          label="Fragment (optional)"
          value={targetSize}
          onChange={setTargetSize}
          suffix="bp"
          hint="Checks the percentage suits it."
        />
      </div>

      <Result
        className="mt-5"
        label="Agarose to weigh"
        value={mass ? formatNumber(mass.value, 4) : undefined}
        unit={mass?.unit.label}
        detail={
          result
            ? `Into ${formatNumber(parseNumber(volume.raw) ?? 0, 4)} ${volume.unitId === 'uL' ? 'µL' : volume.unitId} of buffer, for a ${formatNumber(result.percent, 3)}% gel.`
            : undefined
        }
        placeholder={error ?? 'Enter a percentage and a volume.'}
      />

      {result?.warnings.map((warning) => (
        <p
          key={warning}
          className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
          <span>{warning}</span>
        </p>
      ))}

      <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
        <p className="lbl">What each percentage resolves</p>
        <ul className="mt-2 space-y-1">
          {GRADES.map((grade) => {
            const isCurrent =
              result !== undefined && Math.abs(grade.percent - result.percent) < 0.05;
            const isSuggested = result?.suggested?.percent === grade.percent;
            const covers = size !== undefined && size >= grade.range[0] && size <= grade.range[1];
            return (
              <li
                key={grade.percent}
                className={`flex items-baseline justify-between gap-4 rounded px-2 py-1 font-mono text-[12.5px] ${
                  isCurrent ? 'bg-gfp-400/10 text-ink' : covers ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                <span className={isCurrent ? 'font-semibold text-gfp-400' : ''}>
                  {grade.percent.toFixed(1)}%{isCurrent ? ' — yours' : ''}
                  {isSuggested && !isCurrent ? ' — suggested' : ''}
                </span>
                <span className="tabular-nums">
                  {grade.range[0].toLocaleString()} – {grade.range[1].toLocaleString()} bp
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
          The bounds are where resolution starts to fail, not hard limits. A fragment just outside
          still runs; it stops being distinguishable from its neighbours.
        </p>
      </div>

      {result ? (
        <ShareButton
          state={{
            c: parseNumber(concentration.raw) ?? 0,
            cu: concentration.unitId,
            v: parseNumber(volume.raw) ?? 0,
            vu: volume.unitId,
            bp: size ?? 0,
          }}
        />
      ) : null}

      <Ladder
        formula="mass = percentage (w/v) × volume;  1% w/v = 10 g/L"
        citations={agaroseGelMeta.citations}
        computeLocation={agaroseGelMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        TBE resolves small fragments better and buffers longer; TAE is kinder to DNA you intend to
        extract from the gel, since borate inhibits several enzymes. Dissolve fully before pouring —
        undissolved grains scatter light and read as bands — and add stain once the gel has cooled
        below about 60 °C.
      </p>
    </div>
  );
}
