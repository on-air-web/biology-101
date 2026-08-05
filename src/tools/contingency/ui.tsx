'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { formatNumber } from '@/lib/format';
import { ContingencyError, chiSquareTest, fisherExact, parseTable } from './compute';
import { contingencyMeta } from './meta';

export default function ContingencyTool() {
  const [input, setInput] = useState('');

  const { chi, fisher, table, error } = useMemo(() => {
    let parsed: number[][];
    try {
      parsed = parseTable(input);
    } catch (caught) {
      return {
        chi: undefined,
        fisher: undefined,
        table: undefined,
        error: caught instanceof ContingencyError ? caught.message : 'Could not read that table.',
      };
    }

    if (parsed.length < 2)
      return { chi: undefined, fisher: undefined, table: undefined, error: undefined };

    try {
      const chiResult = chiSquareTest(parsed);
      const isTwoByTwo = parsed.length === 2 && parsed[0]!.length === 2;
      return {
        chi: chiResult,
        fisher: isTwoByTwo ? fisherExact(parsed) : undefined,
        table: parsed,
        error: undefined,
      };
    } catch (caught) {
      return {
        chi: undefined,
        fisher: undefined,
        table: undefined,
        error: caught instanceof ContingencyError ? caught.message : 'Could not test that table.',
      };
    }
  }, [input]);

  /** Fisher is the honest answer whenever the approximation is shaky. */
  const preferFisher = Boolean(fisher && chi?.expectedTooSmall);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <label className="lbl" htmlFor="table">
        Counts — one row per line
      </label>
      <textarea
        id="table"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={'8 2\n1 5'}
        className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
      />
      <p className="mt-1.5 text-[12px] text-ink-faint">
        Paste straight from a spreadsheet. Any table works; 2×2 also gets Fisher&rsquo;s exact test
        and an odds ratio.
      </p>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {chi ? (
        <div className="mt-5" aria-live="polite">
          {fisher ? (
            <>
              <p className="lbl">Odds ratio</p>
              <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
                {Number.isFinite(fisher.oddsRatio) ? formatNumber(fisher.oddsRatio, 4) : '∞'}
              </output>
              {fisher.oddsRatioCi ? (
                <p className="mt-2 font-mono text-[14px] text-ink-muted">
                  95% CI [{formatNumber(fisher.oddsRatioCi[0], 3)},{' '}
                  {formatNumber(fisher.oddsRatioCi[1], 3)}]
                </p>
              ) : (
                <p className="mt-2 text-[13px] text-ink-muted">
                  No interval: one cell is zero, so the usual formula breaks down.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="lbl">Cramér&rsquo;s V</p>
              <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
                {formatNumber(chi.cramersV, 4)}
              </output>
              <p className="mt-2 text-[13px] text-ink-muted">
                0 is no association, 1 is complete. Across {chi.n} observations.
              </p>
            </>
          )}

          {fisher ? (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3">
              <span className="lbl">Cramér&rsquo;s V</span>
              <span className="font-mono text-[16px]">{formatNumber(chi.cramersV, 3)}</span>
              <span className="text-[12.5px] text-ink-muted">n = {chi.n}</span>
            </div>
          ) : null}

          <p className="mt-2.5 font-mono text-[12.5px] text-ink-faint">
            {fisher ? (
              <>
                Fisher&rsquo;s exact p ={' '}
                {fisher.p < 0.0001 ? '< 0.0001' : formatNumber(fisher.p, 3)} · χ²({chi.df}) ={' '}
                {formatNumber(chi.chiSquare, 4)}, p ={' '}
                {chi.p < 0.0001 ? '< 0.0001' : formatNumber(chi.p, 3)}
              </>
            ) : (
              <>
                χ²({chi.df}) = {formatNumber(chi.chiSquare, 4)}, p ={' '}
                {chi.p < 0.0001 ? '< 0.0001' : formatNumber(chi.p, 3)}
              </>
            )}
          </p>

          {chi.expectedTooSmall ? (
            <p className="mt-4 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>
                The smallest expected count is {formatNumber(chi.minimumExpected, 3)}, below the
                usual threshold of 5.{' '}
                {preferFisher
                  ? "Use Fisher's exact p above; the chi-square approximation is not reliable here."
                  : 'Chi-square is unreliable at these counts — consider pooling categories or collecting more data.'}
              </span>
            </p>
          ) : null}

          {table ? (
            <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[300px] text-[12.5px]">
                <caption className="lbl mb-1.5 text-left">Observed, with expected beneath</caption>
                <tbody className="font-mono tabular-nums">
                  {table.map((row, i) => (
                    <tr key={i} className="border-t border-line">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 pr-4">
                          {cell}
                          <span className="ml-1.5 text-[11px] text-ink-faint">
                            ({formatNumber(chi.expected[i]![j]!, 3)})
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Paste a table of counts — at least two rows and two columns.
        </p>
      ) : null}

      <Ladder
        formula="χ² = Σ (|O − E| − c)² ÷ E, c = ½ on 2×2;  Fisher sums hypergeometric tables at least as extreme"
        model={chi?.yatesApplied ? 'Chi-square with Yates’ correction' : 'Chi-square, uncorrected'}
        citations={contingencyMeta.citations}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        Report the proportions as well. &ldquo;12 of 40 against 31 of 44&rdquo; tells a reader more
        than any p-value attached to it.
      </p>
    </div>
  );
}
