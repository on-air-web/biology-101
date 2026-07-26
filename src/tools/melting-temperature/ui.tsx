'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput } from '@/components/ui/quantity-input';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { NN_TABLES, type SaltConditions } from '@/lib/bio/dna-thermo';
import { PrimerError, analysePrimer, type Duplexing, type PrimerResult } from './compute';
import { meltingTemperatureMeta } from './meta';

const DEFAULT_PRIMER = 'CGTTCCAAAGATGTGGGCATGAGCTTAC';

function Pairing({ label, duplexing }: { label: string; duplexing: Duplexing }) {
  return (
    <div className="mt-2.5">
      <p className="text-[12px] text-ink-muted">
        {label} · {duplexing.basePairs} bp · {formatNumber(duplexing.deltaG, 3)} kcal/mol
        {duplexing.involves3Prime ? ' · reaches the 3′ end' : ''}
      </p>
      <pre className="mt-1 overflow-x-auto font-mono text-[11.5px] leading-[1.5] text-ink-faint">
        {duplexing.top}
        {'\n'}
        {duplexing.middle}
        {'\n'}
        {duplexing.bottom}
      </pre>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lab bg-surface-raised px-3.5 py-3">
      <p className="lbl">{label}</p>
      <output className="mt-1 block font-mono text-[22px] leading-none font-medium">
        {value}
        {unit ? <span className="ml-1 text-[12px] text-ink-muted">{unit}</span> : null}
      </output>
    </div>
  );
}

export default function MeltingTemperatureTool() {
  const [sequence, setSequence] = useState(DEFAULT_PRIMER);
  const [modelId, setModelId] = useState(NN_TABLES[0]!.id);
  const [concentration, setConcentration] = useState('250');
  const [sodium, setSodium] = useState('50');
  const [tris, setTris] = useState('10');
  const [magnesium, setMagnesium] = useState('1.5');
  const [dntps, setDntps] = useState('0.8');

  const salt: SaltConditions = useMemo(
    () => ({
      sodium: parseNumber(sodium) ?? 0,
      potassium: 0,
      tris: parseNumber(tris) ?? 0,
      magnesium: parseNumber(magnesium) ?? 0,
      dntps: parseNumber(dntps) ?? 0,
    }),
    [sodium, tris, magnesium, dntps],
  );

  const table = NN_TABLES.find((entry) => entry.id === modelId) ?? NN_TABLES[0]!;

  const { result, error } = useMemo(() => {
    const strand = parseNumber(concentration);
    if (strand === undefined) return { result: undefined, error: undefined };
    try {
      return {
        result: analysePrimer({ sequence, table, modelId, strandConcentration: strand, salt }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof PrimerError ? caught.message : 'Could not analyse that oligo.',
      };
    }
  }, [sequence, table, modelId, concentration, salt]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <label className="lbl" htmlFor="oligo">
        Oligonucleotide
      </label>
      <textarea
        id="oligo"
        value={sequence}
        onChange={(event) => setSequence(event.target.value)}
        rows={3}
        spellCheck={false}
        className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black/40 p-3 font-mono text-[13px] tracking-[0.06em] outline-none focus:ring-2 focus:ring-gfp-400"
        placeholder="Paste a primer sequence"
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="model">
            Report
          </label>
          <select
            id="model"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {meltingTemperatureMeta.models?.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-ink-faint">
            {meltingTemperatureMeta.models?.find((model) => model.id === modelId)?.guidance}
          </p>
        </div>

        <NumberInput
          name="strand-concentration"
          label="Oligo concentration"
          value={concentration}
          onChange={setConcentration}
          suffix="nM"
          hint="Of the primer strand. 200–500 nM is typical in PCR."
        />
      </div>

      <p className="lbl mt-4">Buffer</p>
      <div className="mt-1.5 grid gap-3 sm:grid-cols-4">
        <NumberInput name="sodium" label="Na⁺" value={sodium} onChange={setSodium} suffix="mM" />
        <NumberInput name="tris" label="Tris" value={tris} onChange={setTris} suffix="mM" />
        <NumberInput
          name="magnesium"
          label="Mg²⁺"
          value={magnesium}
          onChange={setMagnesium}
          suffix="mM"
        />
        <NumberInput name="dntps" label="dNTPs" value={dntps} onChange={setDntps} suffix="mM" />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-faint">
        Tris counts as half its concentration. dNTPs chelate magnesium, so they are subtracted
        before it is converted — which is why adding nucleotides lowers the melting temperature.
      </p>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <Results result={result} modelId={modelId} salt={salt} concentration={concentration} />
      ) : null}

      <Ladder
        formula="Tm = ΔH° / (ΔS° + R·ln(C_T/4)),  ΔS° corrected by 0.368·(N−1)·ln[Na⁺]"
        model={meltingTemperatureMeta.models?.find((model) => model.id === modelId)?.name}
        citations={meltingTemperatureMeta.citations}
        computeLocation={meltingTemperatureMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        Melting temperature is not annealing temperature. A common starting point is 3–5 °C below
        the lower primer Tm, but the optimum is found by gradient. The secondary structure check
        finds contiguous pairing, not a minimum free energy fold — it catches the ordinary mistakes
        and does not replace a folding program.
      </p>
    </div>
  );
}

function Results({
  result,
  modelId,
  salt,
  concentration,
}: {
  result: PrimerResult;
  modelId: string;
  salt: SaltConditions;
  concentration: string;
}) {
  const spread =
    Math.max(...result.temperatures.map((entry) => entry.celsius)) -
    Math.min(...result.temperatures.map((entry) => entry.celsius));

  return (
    <div className="mt-5" aria-live="polite">
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Tm" value={formatNumber(result.selected.celsius, 4)} unit="°C" />
        <Metric label="Length" value={`${result.length}`} unit="nt" />
        <Metric label="GC" value={formatNumber(result.gcContent * 100, 3)} unit="%" />
        <Metric label="ΔG 37 °C" value={formatNumber(result.deltaG37, 3)} unit="kcal/mol" />
      </div>

      {/* The comparison is the argument: one sequence, three answers. */}
      <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
        <p className="lbl">Every model, same sequence</p>
        <ul className="mt-2 space-y-1.5">
          {result.temperatures.map((entry) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-4 text-[13px]">
              <span
                className={entry.id === modelId ? 'font-semibold text-gfp-400' : 'text-ink-muted'}
              >
                {entry.name}
              </span>
              <span className="font-mono tabular-nums">{formatNumber(entry.celsius, 4)} °C</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12px] leading-[1.6] text-ink-faint">
          A spread of {formatNumber(spread, 3)} °C across the three. This is why a melting
          temperature quoted without its model, salt and concentration cannot be reproduced.
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="ΔH°" value={formatNumber(result.thermo.enthalpy, 4)} unit="kcal/mol" />
        <Metric label="ΔS°" value={formatNumber(result.thermo.entropy, 4)} unit="cal/mol·K" />
        <Metric label="3′ GC clamp" value={`${result.gcClamp}`} unit="of 5" />
      </div>

      {result.selfDimer || result.hairpin ? (
        <div className="mt-3 rounded-lab bg-surface-raised p-3.5">
          <p className="lbl">Secondary structure</p>
          {result.selfDimer ? <Pairing label="Self-dimer" duplexing={result.selfDimer} /> : null}
          {result.hairpin ? <Pairing label="Hairpin" duplexing={result.hairpin} /> : null}
        </div>
      ) : null}

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
          seq: result.sequence,
          model: modelId,
          c: parseNumber(concentration) ?? 250,
          na: salt.sodium,
          tris: salt.tris,
          mg: salt.magnesium,
          dntp: salt.dntps,
        }}
      />
    </div>
  );
}
