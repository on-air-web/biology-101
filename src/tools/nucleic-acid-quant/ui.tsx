'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, fromCanonical, toCanonical } from '@/lib/units';
import { KINDS, QuantError, getKind, quantify } from './compute';
import { nucleicAcidQuantMeta } from './meta';

export default function NucleicAcidQuantTool() {
  const [kindId, setKindId] = useState('dsdna');
  const [a260, setA260] = useState('0.42');
  const [a280, setA280] = useState('0.23');
  const [a230, setA230] = useState('0.19');
  const [dilution, setDilution] = useState('1');
  const [pathLength, setPathLength] = useState('1');
  const [sampleVolume, setSampleVolume] = useState<Quantity>({ raw: '', unitId: 'uL' });

  const kind = getKind(kindId)!;

  const { result, error } = useMemo(() => {
    const reading = parseNumber(a260);
    const dilutionFactor = parseNumber(dilution);
    const path = parseNumber(pathLength);
    if (reading === undefined || dilutionFactor === undefined || path === undefined) {
      return { result: undefined, error: undefined };
    }
    const volume = parseNumber(sampleVolume.raw);
    try {
      return {
        result: quantify({
          a260: reading,
          a280: parseNumber(a280),
          a230: parseNumber(a230),
          kind,
          dilutionFactor,
          pathLength: path,
          sampleVolume: volume === undefined ? undefined : toCanonical(volume, sampleVolume.unitId),
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof QuantError ? caught.message : 'Could not read that.',
      };
    }
  }, [a260, a280, a230, kind, dilution, pathLength, sampleVolume]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="kind">
            Sample is
          </label>
          <select
            id="kind"
            value={kindId}
            onChange={(event) => setKindId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {KINDS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} — A260 of 1.0 is {entry.factor} µg/mL
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-ink-faint">{kind.guidance}</p>
        </div>

        <NumberInput
          name="a260"
          label="A260"
          value={a260}
          onChange={setA260}
          hint="Exactly what the instrument displayed."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <NumberInput name="a280" label="A280" value={a280} onChange={setA280} />
        <NumberInput name="a230" label="A230" value={a230} onChange={setA230} />
        <NumberInput
          name="dilution"
          label="Diluted"
          value={dilution}
          onChange={setDilution}
          suffix="fold"
        />
        <NumberInput
          name="path-length"
          label="Path length"
          value={pathLength}
          onChange={setPathLength}
          suffix="cm"
        />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-faint">
        A cuvette is 1 cm. A microvolume instrument uses a far shorter path and usually reports the
        1 cm equivalent already — if yours shows the raw reading, put the real path here.
      </p>

      <div className="mt-4 sm:w-1/2">
        <QuantityInput
          name="sample-volume"
          label="Sample volume (optional)"
          dimension="volume"
          value={sampleVolume}
          onChange={setSampleVolume}
          hint="Gives the total yield."
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lab bg-surface-raised px-3.5 py-3 sm:col-span-2">
              <p className="lbl">Concentration</p>
              <output className="mt-1 block font-mono text-[30px] leading-none font-medium">
                {formatNumber(fromCanonical(result.concentration, 'ng_uL'), 4)}
                <span className="ml-1 text-[14px] text-ink-muted">ng/µL</span>
              </output>
              <p className="mt-1.5 font-mono text-[12px] text-ink-faint">
                {formatNumber(fromCanonical(result.concentration, 'ug_mL'), 4)} µg/mL ·{' '}
                {formatNumber(fromCanonical(result.concentration, 'mg_mL'), 4)} mg/mL
              </p>
            </div>

            <div className="rounded-lab bg-surface-raised px-3.5 py-3">
              <p className="lbl">Total yield</p>
              <output className="mt-1 block font-mono text-[22px] leading-none font-medium">
                {result.totalMass === undefined ? (
                  <span className="text-[14px] text-ink-faint">Add a volume</span>
                ) : (
                  <>
                    {formatNumber(autoScale(result.totalMass, 'mass').value, 4)}
                    <span className="ml-1 text-[13px] text-ink-muted">
                      {autoScale(result.totalMass, 'mass').unit.label}
                    </span>
                  </>
                )}
              </output>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              {
                label: 'A260 / A280',
                value: result.ratio280,
                target: `~${kind.expected280} for clean ${kind.name.toLowerCase()}`,
                ok: result.ratio280 === undefined || result.ratio280 >= kind.expected280 - 0.15,
              },
              {
                label: 'A260 / A230',
                value: result.ratio230,
                target: '~2.0 to 2.2 for a clean prep',
                ok: result.ratio230 === undefined || result.ratio230 >= 1.8,
              },
            ].map((row) => (
              <div key={row.label} className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="lbl">{row.label}</p>
                <output
                  className={`mt-1 block font-mono text-[22px] leading-none font-medium ${
                    row.value !== undefined && !row.ok ? 'text-amber-400' : ''
                  }`}
                >
                  {row.value === undefined ? '—' : formatNumber(row.value, 3)}
                </output>
                <p className="mt-1 text-[11.5px] text-ink-faint">{row.target}</p>
              </div>
            ))}
          </div>

          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}

          <ShareButton
            state={{
              kind: kindId,
              a260: parseNumber(a260) ?? 0,
              a280: parseNumber(a280) ?? 0,
              a230: parseNumber(a230) ?? 0,
              d: parseNumber(dilution) ?? 1,
              p: parseNumber(pathLength) ?? 1,
            }}
          />
        </div>
      ) : null}

      <Ladder
        formula="c = A₂₆₀ ÷ path × factor × dilution"
        model={`${kind.name}, ${kind.factor} µg/mL per A260`}
        citations={nucleicAcidQuantMeta.citations}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        Absorbance cannot tell nucleic acid from free nucleotides, and it counts DNA in an RNA prep
        as though it were RNA. Where the distinction matters, a fluorescent assay is specific and
        stays accurate far lower. The 260/280 ratio also shifts with pH, so read against the same
        buffer the sample is in.
      </p>
    </div>
  );
}
