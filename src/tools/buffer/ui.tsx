'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { toCanonical } from '@/lib/units';
import { BUFFERS, buffersForPh, getBuffer } from '@/lib/chem/buffers';
import { BufferError, prepareBuffer, type PreparationRoute } from './compute';
import { bufferMeta } from './meta';

const ROUTES = [
  { value: 'two-salts', label: 'Two salts' },
  { value: 'titrate', label: 'Base + HCl' },
] as const satisfies readonly { value: PreparationRoute; label: string }[];

export default function BufferTool() {
  const [bufferId, setBufferId] = useState('tris');
  const [ph, setPh] = useState('7.4');
  const [route, setRoute] = useState<PreparationRoute>('two-salts');
  const [concentration, setConcentration] = useState<Quantity>({ raw: '50', unitId: 'mM' });
  const [volume, setVolume] = useState<Quantity>({ raw: '500', unitId: 'mL' });
  const [prepareAt, setPrepareAt] = useState('25');
  const [useAt, setUseAt] = useState('25');

  const spec = getBuffer(bufferId);
  const targetPh = parseNumber(ph);

  /** Buffers whose range actually covers the target, best-centred first. */
  const suggestions = useMemo(
    () => (targetPh === undefined ? [] : buffersForPh(targetPh).slice(0, 3)),
    [targetPh],
  );

  const { result, error } = useMemo(() => {
    const c = parseNumber(concentration.raw);
    const v = parseNumber(volume.raw);
    const prep = parseNumber(prepareAt);
    const use = parseNumber(useAt);

    if (!spec || targetPh === undefined || c === undefined || v === undefined) {
      return { result: undefined, error: undefined };
    }
    if (prep === undefined || use === undefined) return { result: undefined, error: undefined };

    try {
      return {
        result: prepareBuffer({
          spec,
          targetPh,
          concentration: toCanonical(c, concentration.unitId),
          volume: toCanonical(v, volume.unitId),
          prepareAtC: prep,
          useAtC: use,
          route,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof BufferError ? caught.message : 'Could not compute that recipe.',
      };
    }
  }, [spec, targetPh, concentration, volume, prepareAt, useAt, route]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="buffer">
            Buffer
          </label>
          <select
            id="buffer"
            value={bufferId}
            onChange={(event) => setBufferId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {BUFFERS.map((buffer) => (
              <option key={buffer.id} value={buffer.id}>
                {buffer.name} — pKa {buffer.pKa25}
              </option>
            ))}
          </select>
          {suggestions.length > 0 && !suggestions.some((entry) => entry.id === bufferId) ? (
            <p className="mt-1.5 text-[12.5px] text-amber-400">
              Better suited to pH {ph}:{' '}
              {suggestions.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setBufferId(entry.id)}
                  className="underline underline-offset-2"
                >
                  {entry.name}
                  {index < suggestions.length - 1 ? ', ' : ''}
                </button>
              ))}
            </p>
          ) : null}
        </div>

        <NumberInput name="target-ph" label="Target pH" value={ph} onChange={setPh} />

        <QuantityInput
          name="concentration"
          label="Concentration"
          dimension="concentration"
          value={concentration}
          onChange={setConcentration}
        />
        <QuantityInput
          name="final-volume"
          label="Final volume"
          dimension="volume"
          value={volume}
          onChange={setVolume}
        />

        <NumberInput
          name="prepare-at"
          label="Adjust pH at"
          value={prepareAt}
          onChange={setPrepareAt}
          suffix="°C"
          hint="The temperature of the meter when you titrate."
        />
        <NumberInput
          name="use-at"
          label="Use at"
          value={useAt}
          onChange={setUseAt}
          suffix="°C"
          hint="Where the experiment actually runs."
        />
      </div>

      <div className="mt-4">
        <Segmented
          name="route"
          label="Prepare from"
          options={ROUTES}
          value={route}
          onChange={setRoute}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result && spec ? (
        <div className="mt-5" aria-live="polite">
          <p className="lbl">Weigh out</p>
          <div className="mt-2 space-y-2">
            {result.components.map((component) => (
              <div
                key={component.name}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lab bg-surface-raised px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold">{component.name}</p>
                  <p className="font-mono text-[11.5px] text-ink-faint">
                    {component.formula} · {formatNumber(component.molarMass, 5)} g/mol ·{' '}
                    {formatNumber(component.moles * 1000, 4)} mmol
                  </p>
                </div>
                <output className="font-mono text-[24px] leading-none font-medium">
                  {formatNumber(component.grams, 4)}
                  <span className="ml-1 text-[14px] text-ink-muted">g</span>
                </output>
              </div>
            ))}

            {result.titrant ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lab bg-surface-raised px-3.5 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold">
                    Then titrate with {result.titrant.name}
                  </p>
                  <p className="text-[11.5px] text-ink-faint">
                    To pH {ph} at {prepareAt} °C
                  </p>
                </div>
                <output className="font-mono text-[24px] leading-none font-medium">
                  {formatNumber(result.titrant.moles * 1000, 4)}
                  <span className="ml-1 text-[14px] text-ink-muted">mmol</span>
                </output>
              </div>
            ) : null}
          </div>

          <p className="mt-3 font-mono text-[12.5px] text-ink-faint">
            pKa {formatNumber(result.pKaAtPrep, 4)} at {prepareAt} °C · base fraction{' '}
            {formatNumber(result.baseFraction, 3)} · reads pH {formatNumber(result.phAtUse, 3)} at{' '}
            {useAt} °C
          </p>

          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}

          {spec.note ? (
            <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[12.5px] leading-[1.6] text-ink-muted">
              <span className="lbl mr-1.5">About {spec.name}</span>
              {spec.note}
            </p>
          ) : null}

          <ShareButton
            state={{
              buffer: bufferId,
              ph: targetPh ?? 7,
              c: parseNumber(concentration.raw) ?? 0,
              cu: concentration.unitId,
              v: parseNumber(volume.raw) ?? 0,
              vu: volume.unitId,
              prep: parseNumber(prepareAt) ?? 25,
              use: parseNumber(useAt) ?? 25,
              route,
            }}
          />
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Choose a buffer and enter a target pH.
        </p>
      ) : null}

      <Ladder
        formula="pH = pKa(T) + log₁₀([base]/[acid]);  pKa(T) = pKa₂₅ + (dpKa/dT)(T − 25)"
        model="Henderson–Hasselbalch, temperature-corrected pKa"
        citations={bufferMeta.citations}
        computeLocation={bufferMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        No correction for ionic strength is applied. Activity effects shift real pH by roughly 0.1
        units at physiological salt, so use this to get close and then check with a meter at your
        working temperature.
      </p>
    </div>
  );
}
