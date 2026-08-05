'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { HemocytometerError, cellsToCount, countCells } from './compute';
import { CHAMBERS, getChamber, squareVolumeMl } from './chambers';
import { hemocytometerMeta } from './meta';

const CUSTOM = 'custom';

/** Renders 1.2e+6 as 1.2 × 10⁶. */
function Count({ value, figures = 3 }: { value: number; figures?: number }) {
  const text = formatNumber(value, figures);
  const [mantissa = text, exponent] = text.split('e');
  if (exponent === undefined) return <>{mantissa}</>;
  return (
    <>
      {mantissa} × 10<sup className="text-[0.6em]">{exponent.replace('+', '')}</sup>
    </>
  );
}

export default function HemocytometerTool() {
  const [chamberId, setChamberId] = useState('neubauer-improved');
  const [squareArea, setSquareArea] = useState('1');
  const [depth, setDepth] = useState('0.1');
  const [squares, setSquares] = useState('4');
  const [live, setLive] = useState('320');
  const [dead, setDead] = useState('');
  const [dilution, setDilution] = useState('1');

  function selectChamber(id: string) {
    setChamberId(id);
    const chamber = getChamber(id);
    if (!chamber) return;
    setSquareArea(String(chamber.squareAreaMm2));
    setDepth(String(chamber.depthMm));
  }

  function editGeometry(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setChamberId(CUSTOM);
    };
  }

  const chamber = chamberId === CUSTOM ? undefined : getChamber(chamberId);

  const { result, error } = useMemo(() => {
    const area = parseNumber(squareArea);
    const depthMm = parseNumber(depth);
    const squareCount = parseNumber(squares);
    const liveCount = parseNumber(live);
    const dilutionFactor = parseNumber(dilution);
    const deadCount = dead.trim() === '' ? undefined : parseNumber(dead);

    if (area === undefined || depthMm === undefined) return { result: undefined, error: undefined };
    if (squareCount === undefined || liveCount === undefined || dilutionFactor === undefined) {
      return { result: undefined, error: undefined };
    }
    if (dead.trim() !== '' && deadCount === undefined) {
      return { result: undefined, error: undefined };
    }

    try {
      return {
        result: countCells({
          liveCount,
          deadCount,
          squares: squareCount,
          squareVolumeMl: squareVolumeMl({ squareAreaMm2: area, depthMm }),
          dilutionFactor,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof HemocytometerError ? caught.message : 'Could not count that.',
      };
    }
  }, [squareArea, depth, squares, live, dead, dilution]);

  const volumePerSquare = useMemo(() => {
    const area = parseNumber(squareArea);
    const depthMm = parseNumber(depth);
    if (area === undefined || depthMm === undefined) return undefined;
    return squareVolumeMl({ squareAreaMm2: area, depthMm });
  }, [squareArea, depth]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="lbl" htmlFor="chamber">
            Chamber
          </label>
          <select
            id="chamber"
            value={chamberId}
            onChange={(event) => selectChamber(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {CHAMBERS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} — {entry.squareAreaMm2} mm² × {entry.depthMm} mm
              </option>
            ))}
            <option value={CUSTOM}>Custom geometry</option>
          </select>
          {volumePerSquare !== undefined ? (
            <p className="mt-1.5 font-mono text-[12px] text-ink-faint">
              One square holds {formatNumber(volumePerSquare * 1e6, 3)} nL, so a count over one
              square multiplies by {formatNumber(1 / volumePerSquare, 4)} per mL.
            </p>
          ) : null}
        </div>

        <NumberInput
          name="square-area"
          label="Square area"
          value={squareArea}
          onChange={editGeometry(setSquareArea)}
          suffix="mm²"
        />
        <NumberInput
          name="depth"
          label="Chamber depth"
          value={depth}
          onChange={editGeometry(setDepth)}
          suffix="mm"
        />

        <NumberInput
          name="squares"
          label="Squares counted"
          value={squares}
          onChange={setSquares}
          hint="Four corner squares is the usual protocol."
        />
        <NumberInput
          name="dilution"
          label="Dilution before loading"
          value={dilution}
          onChange={setDilution}
          suffix="fold"
          hint="2 if you mixed one to one with trypan blue."
        />

        <NumberInput
          name="live"
          label="Live cells counted"
          value={live}
          onChange={setLive}
          hint="Unstained, across all the squares."
        />
        <NumberInput
          name="dead"
          label="Dead cells counted"
          value={dead}
          onChange={setDead}
          hint="Stained blue. Leave blank to skip viability."
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      <Result
        className="mt-5"
        label="Live cells per mL"
        value={result ? formatNumber(result.cellsPerMl, 3) : undefined}
        placeholder={error ?? 'Enter a count to calculate.'}
        detail={
          result && Number.isFinite(result.relativeError)
            ? `95% interval ${formatNumber(result.interval.lower, 3)} to ${formatNumber(result.interval.upper, 3)} — about ±${(result.relativeError * 100).toFixed(0)}% on ${result.totalCounted} cells counted.`
            : undefined
        }
      />

      {result ? (
        <div className="mt-4" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lab bg-surface-raised px-3.5 py-3">
              <p className="text-[11.5px] text-ink-faint">Total cells per mL</p>
              <p className="mt-0.5 font-mono text-[22px] leading-none font-medium">
                <Count value={result.totalCellsPerMl} />
              </p>
            </div>
            {result.viability ? (
              <div className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="text-[11.5px] text-ink-faint">Viability</p>
                <p className="mt-0.5 font-mono text-[22px] leading-none font-medium">
                  {(result.viability.fraction * 100).toFixed(1)}
                  <span className="ml-0.5 text-[13px] text-ink-muted">%</span>
                </p>
                <p className="mt-1.5 font-mono text-[11.5px] text-ink-faint">
                  {(result.viability.lower * 100).toFixed(1)}–
                  {(result.viability.upper * 100).toFixed(1)}% (Wilson)
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-3 font-mono text-[12.5px] text-ink-faint">
            {formatNumber(result.meanPerSquare, 3)} cells per square · {result.totalCounted} counted
            {Number.isFinite(result.relativeError)
              ? ` · ±10% would need about ${cellsToCount(0.1)} cells, ±5% about ${cellsToCount(0.05)}`
              : ''}
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

          {chamber ? (
            <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[12.5px] leading-[1.6] text-ink-muted">
              <span className="lbl mr-1.5">About the {chamber.name}</span>
              {chamber.note}
            </p>
          ) : null}

          <ShareButton
            state={{
              chamber: chamberId,
              a: parseNumber(squareArea) ?? 1,
              d: parseNumber(depth) ?? 0.1,
              sq: parseNumber(squares) ?? 4,
              live: parseNumber(live) ?? 0,
              dead: dead.trim() === '' ? undefined : (parseNumber(dead) ?? 0),
              df: parseNumber(dilution) ?? 1,
            }}
          />
        </div>
      ) : null}

      <Ladder
        formula="cells/mL = n ÷ (squares × area × depth) × D;  95% CI from ½·χ²(α/2, 2n) and ½·χ²(1−α/2, 2n+2)"
        model={
          chamber
            ? `${chamber.name}, ${chamber.squareAreaMm2} mm² × ${chamber.depthMm} mm per square`
            : 'Custom chamber geometry'
        }
        citations={hemocytometerMeta.citations}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        The interval covers counting error only — the randomness of how many cells happen to settle
        over the squares you read. It does not cover an unmixed suspension, cells lost to the
        coverslip edge, or clumps counted as one, all of which move the answer further than the
        statistics do. Mix well and load two chambers if the number matters.
      </p>
    </div>
  );
}
