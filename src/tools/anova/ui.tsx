'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { formatNumber } from '@/lib/format';
import { DescriptiveError, parseNumberList } from '@/lib/stats/descriptives';
import { AnovaError, oneWayAnova } from './compute';
import { anovaMeta } from './meta';

interface GroupInput {
  label: string;
  text: string;
}

const INITIAL: GroupInput[] = [
  { label: 'Control', text: '' },
  { label: 'Treatment 1', text: '' },
  { label: 'Treatment 2', text: '' },
];

export default function AnovaTool() {
  const [groups, setGroups] = useState<GroupInput[]>(INITIAL);

  function update(index: number, patch: Partial<GroupInput>) {
    setGroups((current) =>
      current.map((group, position) => (position === index ? { ...group, ...patch } : group)),
    );
  }

  const { result, error } = useMemo(() => {
    let parsed;
    try {
      parsed = groups.map((group) => ({
        label: group.label.trim() || 'Group',
        values: parseNumberList(group.text),
      }));
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof DescriptiveError ? caught.message : 'Could not read those values.',
      };
    }

    if (parsed.some((group) => group.values.length < 2)) {
      return { result: undefined, error: undefined };
    }

    try {
      return { result: oneWayAnova(parsed), error: undefined };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof AnovaError ? caught.message : 'Could not run the test.',
      };
    }
  }, [groups]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group, index) => (
          <div key={index}>
            <div className="flex items-center gap-1">
              <input
                value={group.label}
                onChange={(event) => update(index, { label: event.target.value })}
                aria-label={`Name of group ${index + 1}`}
                className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 py-1 font-sans text-[12.5px] font-semibold outline-none hover:border-line focus:border-gfp-400"
              />
              {groups.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setGroups((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remove ${group.label}`}
                  className="grid size-6 place-items-center rounded text-ink-faint hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
            <textarea
              value={group.text}
              onChange={(event) => update(index, { text: event.target.value })}
              rows={6}
              spellCheck={false}
              aria-label={`Values for ${group.label}`}
              placeholder={'12.4\n11.8\n13.1'}
              className="mt-1 w-full resize-y rounded-lab border border-line-strong bg-black p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setGroups((current) => [...current, { label: `Group ${current.length + 1}`, text: '' }])
        }
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lab border border-line-strong px-3 text-[12.5px] text-ink-muted hover:text-ink"
      >
        <Plus className="size-3.5" aria-hidden />
        Add group
      </button>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          {/* Variance explained leads. F and p follow it. */}
          <p className="lbl">Variance explained (ω²)</p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {formatNumber(result.omegaSquared * 100, 3)}
            <span className="ml-1 text-[20px] text-ink-muted">%</span>
          </output>
          <p className="mt-2 text-[13px] text-ink-muted">
            η² = {formatNumber(result.etaSquared * 100, 3)}% before correcting for the upward bias
            at small n. Across {result.groupCount} groups, n = {result.totalN}.
          </p>

          <p className="mt-2.5 font-mono text-[12.5px] text-ink-faint">
            F({result.df1}, {result.df2}) = {formatNumber(result.f, 4)}, p ={' '}
            {result.p < 0.0001 ? '< 0.0001' : formatNumber(result.p, 3)}
          </p>

          <h3 className="mt-5 text-[13px] font-semibold">Pairwise comparisons</h3>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            Welch&rsquo;s t-tests, corrected together by Holm. Not Tukey&rsquo;s HSD — these do not
            assume equal variances.
          </p>
          <div className="mt-2.5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[420px] text-[12.5px]">
              <caption className="sr-only">Pairwise comparisons</caption>
              <thead>
                <tr className="lbl">
                  <th scope="col" className="py-1.5 text-left font-semibold">
                    Pair
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Difference
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    95% CI
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    p (Holm)
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {result.pairwise.map((pair) => (
                  <tr key={`${pair.a}-${pair.b}`} className="border-t border-line">
                    <td className="py-1.5 font-sans">
                      {pair.a} vs {pair.b}
                    </td>
                    <td className="py-1.5 text-right">
                      {pair.difference > 0 ? '+' : ''}
                      {formatNumber(pair.difference, 4)}
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">
                      [{formatNumber(pair.ci[0], 3)}, {formatNumber(pair.ci[1], 3)}]
                    </td>
                    <td
                      className={
                        pair.adjustedP < 0.05
                          ? 'py-1.5 text-right text-gfp-400'
                          : 'py-1.5 text-right text-ink-muted'
                      }
                    >
                      {pair.adjustedP < 0.0001 ? '< 0.0001' : formatNumber(pair.adjustedP, 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Paste at least two values into each of the three groups.
        </p>
      ) : null}

      <Ladder
        formula="F = MS between ÷ MS within;  ω² = (SS_b − df₁·MS_w) ÷ (SS_total + MS_w)"
        model="One-way ANOVA, Welch pairwise with Holm correction"
        citations={anovaMeta.citations}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        If each treatment is being compared only against the control rather than against every other
        group, Dunnett&rsquo;s test is more powerful than the all-pairs correction used here.
      </p>
    </div>
  );
}
