'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput } from '@/components/ui/quantity-input';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { PowerError, computePower, requiredSampleSize, type Design } from './compute';
import { powerMeta } from './meta';

const DESIGNS = [
  { value: 'two-sample', label: 'Two groups' },
  { value: 'paired', label: 'Paired' },
  { value: 'one-sample', label: 'One sample' },
] as const satisfies readonly { value: Design; label: string }[];

const MODES = [
  { value: 'size', label: 'Find n' },
  { value: 'power', label: 'Find power' },
] as const;

type Mode = (typeof MODES)[number]['value'];

/** Cohen's conventions, offered as anchors rather than as targets. */
const ANCHORS = [
  { d: 0.2, label: 'small' },
  { d: 0.5, label: 'medium' },
  { d: 0.8, label: 'large' },
];

export default function PowerTool() {
  const [design, setDesign] = useState<Design>('two-sample');
  const [mode, setMode] = useState<Mode>('size');
  const [effect, setEffect] = useState('0.5');
  const [targetPower, setTargetPower] = useState('80');
  const [n, setN] = useState('20');
  const [alpha, setAlpha] = useState('0.05');

  const { size, power, error } = useMemo(() => {
    const d = parseNumber(effect);
    const a = parseNumber(alpha);
    if (d === undefined || a === undefined) {
      return { size: undefined, power: undefined, error: undefined };
    }

    try {
      if (mode === 'size') {
        const target = parseNumber(targetPower);
        if (target === undefined) return { size: undefined, power: undefined, error: undefined };
        return {
          size: requiredSampleSize(design, d, target / 100, a),
          power: undefined,
          error: undefined,
        };
      }
      const count = parseNumber(n);
      if (count === undefined) return { size: undefined, power: undefined, error: undefined };
      return {
        size: undefined,
        power: computePower({ design, effectSize: d, n: count, alpha: a }),
        error: undefined,
      };
    } catch (caught) {
      return {
        size: undefined,
        power: undefined,
        error: caught instanceof PowerError ? caught.message : 'Could not compute that.',
      };
    }
  }, [design, mode, effect, targetPower, n, alpha]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented
          name="design"
          label="Design"
          options={DESIGNS}
          value={design}
          onChange={setDesign}
        />
        <Segmented name="mode" label="Solve for" options={MODES} value={mode} onChange={setMode} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <NumberInput
            label="Effect size (d)"
            value={effect}
            onChange={setEffect}
            hint="The smallest difference worth acting on."
          />
          <div className="mt-1.5 flex gap-1.5">
            {ANCHORS.map((anchor) => (
              <button
                key={anchor.d}
                type="button"
                onClick={() => setEffect(String(anchor.d))}
                className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted hover:border-line-strong hover:text-ink"
              >
                {anchor.d} {anchor.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'size' ? (
          <NumberInput
            label="Target power"
            value={targetPower}
            onChange={setTargetPower}
            suffix="%"
          />
        ) : (
          <NumberInput
            label={design === 'two-sample' ? 'n per group' : 'n'}
            value={n}
            onChange={setN}
          />
        )}

        <NumberInput label="Alpha" value={alpha} onChange={setAlpha} />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {size ? (
        <div className="mt-5" aria-live="polite">
          <p className="lbl">{design === 'two-sample' ? 'Per group' : 'Sample size'}</p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {size.n}
          </output>
          {design === 'two-sample' ? (
            <p className="mt-2 font-mono text-[14px] text-ink-muted">{size.totalN} in total</p>
          ) : null}
          <p className="mt-2.5 text-[13px] text-ink-muted">
            Gives {formatNumber(size.achievedPower * 100, 3)}% power.{' '}
            {size.n > 2
              ? `One fewer drops it to ${formatNumber(size.powerBelow * 100, 3)}%.`
              : null}
          </p>
        </div>
      ) : power ? (
        <div className="mt-5" aria-live="polite">
          <p className="lbl">Power</p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {formatNumber(power.power * 100, 3)}
            <span className="ml-1 text-[20px] text-ink-muted">%</span>
          </output>
          <p className="mt-2 text-[13px] text-ink-muted">
            {power.power < 0.8
              ? `Below the conventional 80%. You would miss a real effect of this size ${formatNumber((1 - power.power) * 100, 2)}% of the time.`
              : 'At or above the conventional 80% threshold.'}
          </p>
          <p className="mt-2.5 font-mono text-[12.5px] text-ink-faint">
            df = {formatNumber(power.df, 4)}, noncentrality = {formatNumber(power.noncentrality, 4)}
            , critical t = {formatNumber(power.criticalT, 4)}
          </p>
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Enter an effect size to calculate.
        </p>
      ) : null}

      {size || power ? (
        <ShareButton
          state={{
            design,
            mode,
            d: parseNumber(effect) ?? 0,
            alpha: parseNumber(alpha) ?? 0.05,
            ...(mode === 'size'
              ? { target: parseNumber(targetPower) ?? 80 }
              : { n: parseNumber(n) ?? 0 }),
          }}
        />
      ) : null}

      <Ladder
        formula="power = P(|T′| > t₍₁−α/2₎),  T′ noncentral t with δ = d√(n/2)"
        model="Noncentral t, two-sided"
        citations={powerMeta.citations}
        computeLocation={powerMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        Do this before the experiment. Power computed after a non-significant result, from the
        effect you happened to observe, is circular and tells you nothing.
      </p>
    </div>
  );
}
