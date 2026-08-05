'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { toCanonical } from '@/lib/units';
import {
  CentrifugeError,
  clearingFactor,
  computeSpin,
  equivalentTime,
  type CentrifugeSolveFor,
  type RcfReference,
} from './compute';
import { ROTOR_CLASSES, getRotorClass } from './rotors';
import { centrifugeMeta } from './meta';

const SOLVE_OPTIONS = [
  { value: 'rpm', label: 'Speed (rpm)' },
  { value: 'rcf', label: 'Field (× g)' },
] as const satisfies readonly { value: CentrifugeSolveFor; label: string }[];

const REFERENCE_OPTIONS = [
  { value: 'max', label: 'Tube bottom' },
  { value: 'average', label: 'Average' },
  { value: 'min', label: 'Liquid top' },
] as const satisfies readonly { value: RcfReference; label: string }[];

const CUSTOM = 'custom';

export default function CentrifugeTool() {
  const [solveFor, setSolveFor] = useState<CentrifugeSolveFor>('rpm');
  const [rotorId, setRotorId] = useState('microfuge');
  const [maxRadius, setMaxRadius] = useState<Quantity>({ raw: '8.5', unitId: 'cm' });
  const [minRadius, setMinRadius] = useState<Quantity>({ raw: '4', unitId: 'cm' });
  const [rcf, setRcf] = useState('12000');
  const [rpm, setRpm] = useState('14000');
  const [reference, setReference] = useState<RcfReference>('max');

  const [priorMax, setPriorMax] = useState<Quantity>({ raw: '10.8', unitId: 'cm' });
  const [priorMin, setPriorMin] = useState<Quantity>({ raw: '4.5', unitId: 'cm' });
  const [priorRpm, setPriorRpm] = useState('10000');
  const [priorMinutes, setPriorMinutes] = useState('20');

  function selectRotor(id: string) {
    setRotorId(id);
    const rotor = getRotorClass(id);
    if (!rotor) return;
    setMaxRadius({ raw: String(rotor.maxRadiusCm), unitId: 'cm' });
    setMinRadius({ raw: String(rotor.minRadiusCm), unitId: 'cm' });
  }

  /** Editing a radius by hand no longer describes the preset it came from. */
  function editRadius(setter: (value: Quantity) => void) {
    return (value: Quantity) => {
      setter(value);
      setRotorId(CUSTOM);
    };
  }

  const geometry = useMemo(() => {
    const max = parseNumber(maxRadius.raw);
    const min = parseNumber(minRadius.raw);
    if (max === undefined) return undefined;
    return {
      maxRadius: toCanonical(max, maxRadius.unitId),
      minRadius: min === undefined ? undefined : toCanonical(min, minRadius.unitId),
    };
  }, [maxRadius, minRadius]);

  const { result, error } = useMemo(() => {
    if (!geometry) return { result: undefined, error: undefined };
    const target = parseNumber(solveFor === 'rcf' ? rpm : rcf);
    if (target === undefined) return { result: undefined, error: undefined };

    try {
      return {
        result: computeSpin({
          geometry,
          rpm: solveFor === 'rcf' ? target : undefined,
          rcf: solveFor === 'rpm' ? target : undefined,
          reference,
          solveFor,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof CentrifugeError ? caught.message : 'Could not convert that.',
      };
    }
  }, [geometry, solveFor, rpm, rcf, reference]);

  /** Equivalent run time on this rotor, from a run on a different one. */
  const transfer = useMemo(() => {
    if (!result?.kFactor) return undefined;
    const max = parseNumber(priorMax.raw);
    const min = parseNumber(priorMin.raw);
    const speed = parseNumber(priorRpm);
    const minutes = parseNumber(priorMinutes);
    if (max === undefined || min === undefined || speed === undefined || minutes === undefined) {
      return undefined;
    }
    if (min >= max || speed <= 0 || minutes <= 0) return undefined;

    const priorK = clearingFactor(speed, {
      maxRadius: toCanonical(max, priorMax.unitId),
      minRadius: toCanonical(min, priorMin.unitId),
    });
    if (priorK === undefined) return undefined;

    try {
      return { priorK, minutes: equivalentTime(minutes, priorK, result.kFactor) };
    } catch {
      return undefined;
    }
  }, [result, priorMax, priorMin, priorRpm, priorMinutes]);

  const display = result
    ? solveFor === 'rcf'
      ? { value: formatNumber(result.rcfMax, 4), unit: '× g' }
      : { value: formatNumber(result.rpm, 4), unit: 'rpm' }
    : undefined;

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <Segmented
        name="centrifuge-solve-for"
        label="Solve for"
        options={SOLVE_OPTIONS}
        value={solveFor}
        onChange={setSolveFor}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="lbl" htmlFor="rotor">
            Rotor
          </label>
          <select
            id="rotor"
            value={rotorId}
            onChange={(event) => selectRotor(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {ROTOR_CLASSES.map((rotor) => (
              <option key={rotor.id} value={rotor.id}>
                {rotor.name} — r{'ₘₐₓ'} ≈ {rotor.maxRadiusCm} cm
              </option>
            ))}
            <option value={CUSTOM}>Custom radii</option>
          </select>
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Nominal figures for the class, not a specification. Rotors within a class vary by
            roughly a tenth, and so does the field they produce — take the radii from your
            rotor&rsquo;s manual where accuracy matters.
          </p>
        </div>

        <QuantityInput
          name="max-radius"
          label="Maximum radius"
          dimension="length"
          value={maxRadius}
          onChange={editRadius(setMaxRadius)}
          hint="Axis to the bottom of the tube."
        />
        <QuantityInput
          name="min-radius"
          label="Minimum radius"
          dimension="length"
          value={minRadius}
          onChange={editRadius(setMinRadius)}
          hint="Axis to the top of the liquid. Optional."
        />

        {solveFor === 'rcf' ? (
          <NumberInput name="speed" label="Speed" value={rpm} onChange={setRpm} suffix="rpm" />
        ) : (
          <NumberInput
            name="target-field"
            label="Target field"
            value={rcf}
            onChange={setRcf}
            suffix="× g"
          />
        )}
      </div>

      {solveFor === 'rpm' ? (
        <div className="mt-4">
          <Segmented
            name="centrifuge-reference"
            label="The target is measured at"
            options={REFERENCE_OPTIONS}
            value={reference}
            onChange={setReference}
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Published protocols almost always mean the bottom of the tube, which is what rotor
            specifications quote.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      <Result
        className="mt-5"
        label={solveFor === 'rcf' ? 'Field at the bottom of the tube' : 'Set the centrifuge to'}
        value={display?.value}
        unit={display?.unit}
        placeholder={error ?? 'Enter a rotor radius and a speed or field.'}
      />

      {result ? (
        <div className="mt-4" aria-live="polite">
          <p className="lbl">Across the tube</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(
              [
                ['Liquid top', result.rcfMin],
                ['Average', result.rcfAverage],
                ['Tube bottom', result.rcfMax],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="text-[11.5px] text-ink-faint">{label}</p>
                <p className="mt-0.5 font-mono text-[19px] leading-none font-medium">
                  {value === undefined ? '—' : formatNumber(value, 4)}
                  <span className="ml-1 text-[12px] text-ink-muted">× g</span>
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-[12.5px] text-ink-faint">
            {formatNumber(result.rpm, 5)} rpm
            {result.spread === undefined
              ? ' · enter a minimum radius for the spread and clearing factor'
              : ` · ${result.spread.toFixed(2)}× from top to bottom · k = ${formatNumber(result.kFactor ?? 0, 3)}`}
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

          <ShareButton
            state={{
              solve: solveFor,
              rmax: parseNumber(maxRadius.raw) ?? 0,
              rmaxu: maxRadius.unitId,
              rmin: parseNumber(minRadius.raw),
              rminu: minRadius.unitId,
              rpm: parseNumber(rpm),
              rcf: parseNumber(rcf),
              ref: reference,
            }}
          />
        </div>
      ) : null}

      <details className="mt-5 rounded-lab border border-line bg-surface-sunken p-4">
        <summary className="cursor-pointer text-[13.5px] font-semibold">
          Transfer a spin from another rotor
        </summary>
        <p className="mt-2 text-[12.5px] leading-[1.6] text-ink-muted">
          Matching × g between rotors does not reproduce a separation, because a longer tube gives a
          particle further to travel. The clearing factor accounts for that: run time scales with k.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <QuantityInput
            name="prior-max-radius"
            label="Its maximum radius"
            dimension="length"
            value={priorMax}
            onChange={setPriorMax}
          />
          <QuantityInput
            name="prior-min-radius"
            label="Its minimum radius"
            dimension="length"
            value={priorMin}
            onChange={setPriorMin}
          />
          <NumberInput
            name="prior-speed"
            label="Its speed"
            value={priorRpm}
            onChange={setPriorRpm}
            suffix="rpm"
          />
          <NumberInput
            name="prior-time"
            label="Its run time"
            value={priorMinutes}
            onChange={setPriorMinutes}
            suffix="min"
          />
        </div>

        {transfer ? (
          <div className="mt-4 rounded-lab bg-surface-raised px-3.5 py-3">
            <p className="text-[11.5px] text-ink-faint">
              Equivalent time on this rotor, at {formatNumber(result?.rpm ?? 0, 5)} rpm
            </p>
            <p className="mt-0.5 font-mono text-[24px] leading-none font-medium">
              {formatNumber(transfer.minutes, 3)}
              <span className="ml-1 text-[14px] text-ink-muted">min</span>
            </p>
            <p className="mt-2 font-mono text-[12px] text-ink-faint">
              k {formatNumber(transfer.priorK, 3)} → {formatNumber(result?.kFactor ?? 0, 3)}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[12.5px] text-ink-muted">
            Fill in both rotors, including a minimum radius for each, to convert a run time.
          </p>
        )}

        <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
          The clearing factor describes an ideal particle sedimenting through water at 20 °C, all
          the way from the top of the liquid to the bottom of the tube. Viscous media, partly filled
          tubes and anything that pellets by aggregating rather than sedimenting will all depart
          from it, so treat the result as a starting point to check rather than a substitution.
        </p>
      </details>

      <Ladder
        formula="RCF = ω²r ÷ g,  ω = 2πN ÷ 60;  k = ln(r_max/r_min) × 10¹³ ÷ (3600 ω²)"
        model="Radii in metres, g = 9.80665 m/s². Equivalent to RCF = 1.118 × 10⁻⁵ · r(cm) · N²"
        citations={centrifugeMeta.citations}
      />
    </div>
  );
}
