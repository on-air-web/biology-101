'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { DataImport } from '@/components/ui/data-import';
import { ShareButton } from '@/components/ui/share-button';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber } from '@/lib/format';
import { DescriptiveError, parseNumberList } from '@/lib/stats/descriptives';
import { CorrelationError, correlate, linearRegression, type CorrelationMethod } from './compute';
import { correlationMeta } from './meta';

const METHODS = [
  { value: 'pearson', label: 'Pearson' },
  { value: 'spearman', label: 'Spearman' },
] as const satisfies readonly { value: CorrelationMethod; label: string }[];

const NOTE: Record<CorrelationMethod, string> = {
  pearson: 'Pearson — assumes a straight-line relationship and roughly normal data.',
  spearman: 'Spearman — works on ranks, so it handles curves and outliers.',
};

export default function CorrelationTool() {
  const [method, setMethod] = useState<CorrelationMethod>('pearson');
  const [xText, setXText] = useState('');
  const [yText, setYText] = useState('');

  const { result, fit, error } = useMemo(() => {
    let x: number[];
    let y: number[];
    try {
      x = parseNumberList(xText);
      y = parseNumberList(yText);
    } catch (caught) {
      return {
        result: undefined,
        fit: undefined,
        error: caught instanceof DescriptiveError ? caught.message : 'Could not read those values.',
      };
    }

    if (x.length < 3 || y.length < 3)
      return { result: undefined, fit: undefined, error: undefined };

    try {
      return {
        result: correlate(x, y, method),
        fit: method === 'pearson' ? linearRegression(x, y) : undefined,
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        fit: undefined,
        error: caught instanceof CorrelationError ? caught.message : 'Could not compute that.',
      };
    }
  }, [xText, yText, method]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'x (predictor)', value: xText, set: setXText },
          { label: 'y (response)', value: yText, set: setYText },
        ].map((field) => {
          let count = 0;
          try {
            count = parseNumberList(field.value).length;
          } catch {
            count = 0;
          }
          return (
            <div key={field.label}>
              <div className="flex items-baseline justify-between gap-2">
                <label className="lbl" htmlFor={`field-${field.label}`}>
                  {field.label}
                </label>
                {count > 0 ? (
                  <span className="font-mono text-[11px] text-ink-faint">n = {count}</span>
                ) : null}
              </div>
              <textarea
                id={`field-${field.label}`}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                rows={7}
                spellCheck={false}
                placeholder={'Paste a column\n10\n8\n13'}
                className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <DataImport
          slots={['x', 'y']}
          onAssign={(values) => {
            if (values.x) setXText(values.x.join('\n'));
            if (values.y) setYText(values.y.join('\n'));
          }}
        />
      </div>

      <div className="mt-4">
        <Segmented
          name="correlation-method"
          label="Method"
          options={METHODS}
          value={method}
          onChange={setMethod}
        />
        <p className="mt-1.5 text-[12.5px] text-ink-muted">{NOTE[method]}</p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          {/* r is itself the effect size, so it leads — with its interval. */}
          <p className="lbl">{method === 'pearson' ? 'Pearson r' : 'Spearman ρ'}</p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {result.r > 0 ? '+' : ''}
            {formatNumber(result.r, 4)}
          </output>
          {result.ci ? (
            <p className="mt-2 font-mono text-[14px] text-ink-muted">
              {Math.round(result.confidence * 100)}% CI [{formatNumber(result.ci[0], 3)},{' '}
              {formatNumber(result.ci[1], 3)}]
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-muted">
              An interval on r needs more than three pairs.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3">
            <span className="lbl">Variance shared</span>
            <span className="font-mono text-[16px]">{formatNumber(result.rSquared * 100, 3)}%</span>
            <span className="text-[12.5px] text-ink-muted">r² across {result.n} pairs</span>
          </div>

          <p className="mt-2.5 font-mono text-[12.5px] text-ink-faint">
            t({result.df}) = {formatNumber(result.t, 4)}, p ={' '}
            {result.p < 0.0001 ? '< 0.0001' : formatNumber(result.p, 3)}
          </p>

          {fit ? (
            <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
              <p className="lbl">Fitted line</p>
              <p className="mt-1.5 font-mono text-[15px]">
                y = {formatNumber(fit.slope, 4)}x {fit.intercept >= 0 ? '+' : '−'}{' '}
                {formatNumber(Math.abs(fit.intercept), 4)}
              </p>
              <p className="mt-1.5 font-mono text-[12.5px] text-ink-muted">
                slope 95% CI [{formatNumber(fit.slopeCi[0], 4)}, {formatNumber(fit.slopeCi[1], 4)}]
                · residual SE {formatNumber(fit.residualStandardError, 4)}
              </p>
            </div>
          ) : null}
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Paste at least three paired values into each column.
        </p>
      ) : null}

      {result ? (
        <ShareButton state={{ x: parseNumberList(xText), y: parseNumberList(yText), method }} />
      ) : null}

      <Ladder
        formula={
          method === 'pearson'
            ? 'r = Σ(x−x̄)(y−ȳ) ÷ √(Σ(x−x̄)²Σ(y−ȳ)²);  CI via atanh(r) ± z·(n−3)^−½'
            : 'Pearson r computed on midranks;  CI via Fisher z'
        }
        model={NOTE[method].split(' — ')[0]}
        citations={correlationMeta.citations}
        computeLocation={correlationMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        Plot the data before trusting any of this. Anscombe&rsquo;s quartet is four datasets with
        identical correlation coefficients and entirely different shapes.
      </p>
    </div>
  );
}
