'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { DataImport } from '@/components/ui/data-import';
import { ShareButton } from '@/components/ui/share-button';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber } from '@/lib/format';
import { DescriptiveError, parseNumberList } from '@/lib/stats/descriptives';
import { CorrectionError, correctPValues, type CorrectionMethod } from './compute';
import { multipleTestingMeta } from './meta';

const METHODS = [
  { value: 'benjamini-hochberg', label: 'Benjamini–Hochberg' },
  { value: 'bonferroni', label: 'Bonferroni' },
] as const satisfies readonly { value: CorrectionMethod; label: string }[];

const NOTE: Record<CorrectionMethod, string> = {
  'benjamini-hochberg':
    'Controls the false discovery rate — the expected share of false positives among your hits. The standard for genomics.',
  bonferroni:
    'Controls the chance of even one false positive anywhere. Severe, and suited to a few pre-planned comparisons.',
};

export default function MultipleTestingTool() {
  const [method, setMethod] = useState<CorrectionMethod>('benjamini-hochberg');
  const [input, setInput] = useState('');

  const { result, error } = useMemo(() => {
    let values: number[];
    try {
      values = parseNumberList(input);
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof DescriptiveError ? caught.message : 'Could not read those values.',
      };
    }
    if (values.length === 0) return { result: undefined, error: undefined };

    try {
      return { result: correctPValues(values, method), error: undefined };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof CorrectionError ? caught.message : 'Could not correct those.',
      };
    }
  }, [input, method]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <label className="lbl" htmlFor="pvalues">
        p-values
      </label>
      <textarea
        id="pvalues"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={7}
        spellCheck={false}
        placeholder={'Paste a column\n0.001\n0.008\n0.039\n0.205'}
        className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
      />

      <div className="mt-4">
        <DataImport
          slots={['p-values']}
          onAssign={(values) => {
            if (values['p-values']) setInput(values['p-values'].join('\n'));
          }}
        />
      </div>

      <div className="mt-4">
        <Segmented
          name="correction-method"
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
          <p className="lbl">Significant at {result.threshold}</p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {result.significantAfter}
            <span className="ml-2 text-[18px] text-ink-muted">of {result.values.length}</span>
          </output>
          <p className="mt-2 text-[13px] text-ink-muted">
            {result.significantBefore} would have passed uncorrected
            {result.significantBefore > result.significantAfter
              ? `; ${result.significantBefore - result.significantAfter} did not survive correction.`
              : '.'}
          </p>

          <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[380px] text-[12.5px]">
              <caption className="sr-only">Adjusted p-values</caption>
              <thead>
                <tr className="lbl">
                  <th scope="col" className="py-1.5 text-left font-semibold">
                    #
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    p
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Adjusted
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {result.values.map((value) => (
                  <tr key={value.index} className="border-t border-line">
                    <td className="py-1.5 text-ink-faint">{value.index + 1}</td>
                    <td className="py-1.5 text-right">{formatNumber(value.p, 4)}</td>
                    <td
                      className={
                        value.adjusted < result.threshold
                          ? 'py-1.5 text-right text-gfp-400'
                          : 'py-1.5 text-right text-ink-muted'
                      }
                    >
                      {formatNumber(value.adjusted, 4)}
                    </td>
                    <td className="py-1.5 text-right text-ink-faint">{value.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Paste a column of p-values to correct.
        </p>
      ) : null}

      {result ? <ShareButton state={{ p: parseNumberList(input), method }} /> : null}

      <Ladder
        formula={
          method === 'bonferroni'
            ? 'p_adj = min(p × m, 1)'
            : 'p_adj = min over k ≥ i of (p₍ₖ₎ × m ÷ k)'
        }
        model={METHODS.find((entry) => entry.value === method)?.label}
        citations={multipleTestingMeta.citations}
      />
    </div>
  );
}
