'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput } from '@/components/ui/quantity-input';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale } from '@/lib/units';
import { AMINO_ACIDS, PKA_SETS, getPkaSet } from '@/lib/bio/amino-acids';
import {
  PeptideError,
  analysePeptide,
  concentrationFromA280,
  netCharge,
  type CysteineState,
} from './compute';
import { proteinParametersMeta } from './meta';

const CYSTEINE_OPTIONS = [
  { value: 'reduced', label: 'Reduced (–SH)' },
  { value: 'cystine', label: 'Disulfides' },
] as const satisfies readonly { value: CysteineState; label: string }[];

const DEFAULT_SEQUENCE =
  'MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAFAQYLQQCPFEDHVKLVNEVTEFAK';

/** A small charge-versus-pH curve. The pI is one point on a line worth seeing. */
function ChargeCurve({
  residues,
  pkaSetId,
  pI,
}: {
  residues: string;
  pkaSetId: string;
  pI: number;
}) {
  const set = getPkaSet(pkaSetId)!;
  const width = 320;
  const height = 96;

  const points = Array.from({ length: 71 }, (_, index) => {
    const pH = index / 5;
    return { pH, charge: netCharge(residues, pH, set) };
  });
  const max = Math.max(...points.map((p) => Math.abs(p.charge))) || 1;

  const x = (pH: number) => (pH / 14) * width;
  const y = (charge: number) => height / 2 - (charge / max) * (height / 2 - 6);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.pH).toFixed(1)},${y(p.charge).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 block w-full"
      role="img"
      aria-label={`Net charge falls from about ${formatNumber(points[0]!.charge, 2)} at pH 0 to about ${formatNumber(points[points.length - 1]!.charge, 2)} at pH 14, crossing zero at pH ${formatNumber(pI, 3)}.`}
    >
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="var(--line-strong)"
        strokeWidth="1"
      />
      <line
        x1={x(pI)}
        y1="0"
        x2={x(pI)}
        y2={height}
        stroke="var(--color-gfp-400, #4ade80)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx={x(pI)} cy={height / 2} r="3.5" fill="var(--color-gfp-400, #4ade80)" />
    </svg>
  );
}

export default function PeptideTool() {
  const [sequence, setSequence] = useState(DEFAULT_SEQUENCE);
  const [pkaSetId, setPkaSetId] = useState('bjellqvist');
  const [cysteineState, setCysteineState] = useState<CysteineState>('reduced');
  const [absorbance, setAbsorbance] = useState('');
  const [chargePh, setChargePh] = useState('7.4');

  const pkaSet = getPkaSet(pkaSetId)!;

  const { result, error } = useMemo(() => {
    try {
      return { result: analysePeptide({ sequence, pkaSet, cysteineState }), error: undefined };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof PeptideError ? caught.message : 'Could not analyse that sequence.',
      };
    }
  }, [sequence, pkaSet, cysteineState]);

  const ph = parseNumber(chargePh);
  const chargeAtPh =
    result && ph !== undefined ? netCharge(result.residues, ph, pkaSet) : undefined;

  const a280 = parseNumber(absorbance);
  const fromA280 = useMemo(() => {
    if (!result || a280 === undefined || result.extinction280 <= 0) return undefined;
    try {
      const molar = concentrationFromA280(a280, result.extinction280);
      return { molar, mgPerMl: molar * result.molarMass };
    } catch {
      return undefined;
    }
  }, [result, a280]);

  const present = result?.composition.filter((entry) => entry.count > 0) ?? [];

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <label className="lbl" htmlFor="sequence">
        Sequence
      </label>
      <textarea
        id="sequence"
        value={sequence}
        onChange={(event) => setSequence(event.target.value)}
        rows={5}
        spellCheck={false}
        className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black/40 p-3 font-mono text-[12.5px] leading-[1.7] outline-none focus:ring-2 focus:ring-gfp-400"
        placeholder="Paste one-letter amino acid codes, or a FASTA record"
      />
      <p className="mt-1.5 text-[12px] text-ink-faint">
        FASTA headers, whitespace, digits and lower case are all fine. Ambiguity codes are not —
        they have no single mass or pKa.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="pka-set">
            pKa set
          </label>
          <select
            id="pka-set"
            value={pkaSetId}
            onChange={(event) => setPkaSetId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {PKA_SETS.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-ink-faint">{pkaSet.guidance}</p>
        </div>

        <div>
          <Segmented
            name="cysteine-state"
            label="Cysteines"
            options={CYSTEINE_OPTIONS}
            value={cysteineState}
            onChange={setCysteineState}
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            The 280 nm coefficient counts disulfide bonds, not cysteines.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Length', value: `${result.length}`, unit: 'aa' },
              { label: 'Average mass', value: formatNumber(result.molarMass, 7), unit: 'g/mol' },
              {
                label: 'Isoelectric point',
                value: formatNumber(result.isoelectricPoint, 4),
                unit: 'pH',
              },
            ].map((cell) => (
              <div key={cell.label} className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="lbl">{cell.label}</p>
                <output className="mt-1 block font-mono text-[26px] leading-none font-medium">
                  {cell.value}
                  <span className="ml-1 text-[13px] text-ink-muted">{cell.unit}</span>
                </output>
              </div>
            ))}
          </div>

          <p className="mt-2.5 font-mono text-[12px] break-all text-ink-faint">
            {result.formula} · monoisotopic {formatNumber(result.monoisotopicMass, 8)} ·{' '}
            {result.disulfides > 0 ? `${result.disulfides} disulfide(s) · ` : ''}
            GRAVY {formatNumber(result.gravy, 3)} · aliphatic index{' '}
            {formatNumber(result.aliphaticIndex, 4)}
          </p>

          <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
            <p className="lbl">Net charge against pH</p>
            <div className="text-gfp-400">
              <ChargeCurve
                residues={result.residues}
                pkaSetId={pkaSetId}
                pI={result.isoelectricPoint}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-4">
              <div className="w-28">
                <NumberInput
                  name="charge-ph"
                  label="At pH"
                  value={chargePh}
                  onChange={setChargePh}
                />
              </div>
              <p className="pb-2.5 font-mono text-[13px]">
                {chargeAtPh === undefined
                  ? '—'
                  : `${chargeAtPh > 0 ? '+' : ''}${formatNumber(chargeAtPh, 3)}`}
                <span className="ml-1.5 text-[12px] text-ink-faint">net charge</span>
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
            <p className="lbl">Absorbance at 280 nm</p>
            <p className="mt-1.5 font-mono text-[13px]">
              ε = {formatNumber(result.extinction280, 6)} M⁻¹cm⁻¹
              {result.extinction280 > 0 ? (
                <>
                  {' · '}A(1 mg/mL, 1 cm) = {formatNumber(result.absorbance01Percent, 4)}
                </>
              ) : null}
            </p>
            {result.extinction280 > 0 ? (
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <div className="w-32">
                  <NumberInput
                    name="a280"
                    label="Measured A280"
                    value={absorbance}
                    onChange={setAbsorbance}
                  />
                </div>
                <p className="pb-2.5 font-mono text-[13px]">
                  {fromA280 ? (
                    <>
                      {formatNumber(autoScale(fromA280.molar, 'concentration').value, 4)}{' '}
                      {autoScale(fromA280.molar, 'concentration').unit.label}
                      <span className="mx-1.5 text-ink-faint">·</span>
                      {formatNumber(fromA280.mgPerMl, 4)} mg/mL
                    </>
                  ) : (
                    <span className="text-ink-faint">Enter a reading</span>
                  )}
                </p>
              </div>
            ) : null}
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

          <details className="mt-4 rounded-lab bg-surface-raised p-3.5">
            <summary className="lbl cursor-pointer">
              Composition · {present.length} of 20 present
            </summary>
            <ul className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {AMINO_ACIDS.map((acid) => {
                const entry = result.composition.find((item) => item.code === acid.code)!;
                return (
                  <li
                    key={acid.code}
                    className={`flex items-baseline justify-between gap-2 font-mono text-[12.5px] ${
                      entry.count === 0 ? 'text-ink-faint' : ''
                    }`}
                  >
                    <span>
                      {acid.code} <span className="text-ink-faint">{acid.threeLetter}</span>
                    </span>
                    <span className="tabular-nums">
                      {entry.count}
                      <span className="ml-1.5 text-ink-faint">
                        {formatNumber(entry.fraction * 100, 3)}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>

          <ShareButton
            state={{ seq: result.residues, pka: pkaSetId, cys: cysteineState, ph: ph ?? 7.4 }}
          />
        </div>
      ) : null}

      <Ladder
        formula="M = Σ residues + H₂O;  ε₂₈₀ = 5500·nW + 1490·nY + 125·nSS;  pI where Σq(pH) = 0"
        model={`${pkaSet.name} pKa set, cysteines ${cysteineState === 'cystine' ? 'in disulfides' : 'reduced'}`}
        citations={proteinParametersMeta.citations}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        Masses use IUPAC atomic weights and may differ from a supplier&rsquo;s last digit. The
        extinction coefficient is for the denatured protein in water; a folded protein in buffer
        typically reads a few per cent lower.
      </p>
    </div>
  );
}
