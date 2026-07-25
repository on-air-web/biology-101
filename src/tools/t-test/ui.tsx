'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber } from '@/lib/format';
import { DescriptiveError, parseNumberList, summarise } from '@/lib/stats/descriptives';
import { TwoGroupError, compareTwoGroups, type TestKind } from './compute';
import { tTestMeta } from './meta';

const TESTS = [
  { value: 'welch', label: 'Welch' },
  { value: 'student', label: 'Student' },
  { value: 'paired', label: 'Paired' },
  { value: 'mann-whitney', label: 'Mann-Whitney' },
] as const satisfies readonly { value: TestKind; label: string }[];

const MODEL_NOTE: Record<TestKind, string> = {
  welch: "Welch's t-test — does not assume equal variances. The sensible default.",
  student: "Student's t-test — assumes equal variances. Use to match a published analysis.",
  paired: 'Paired t-test — for measurements that come in matched pairs.',
  'mann-whitney': 'Mann-Whitney U — ranks rather than values, no distributional assumption.',
};

function GroupField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  let count = 0;
  try {
    count = parseNumberList(value).length;
  } catch {
    count = -1;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="lbl" htmlFor={`group-${label}`}>
          {label}
        </label>
        {count > 0 ? (
          <span className="font-mono text-[11px] text-ink-faint">n = {count}</span>
        ) : null}
      </div>
      <textarea
        id={`group-${label}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        spellCheck={false}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-lab border border-line-strong bg-black p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
      />
    </div>
  );
}

export default function TTestTool() {
  const [kind, setKind] = useState<TestKind>('welch');
  const [groupA, setGroupA] = useState('');
  const [groupB, setGroupB] = useState('');

  const { result, summaries, error } = useMemo(() => {
    let a: number[];
    let b: number[];
    try {
      a = parseNumberList(groupA);
      b = parseNumberList(groupB);
    } catch (caught) {
      return {
        result: undefined,
        summaries: undefined,
        error: caught instanceof DescriptiveError ? caught.message : 'Could not read those values.',
      };
    }

    if (a.length < 2 || b.length < 2) {
      return { result: undefined, summaries: undefined, error: undefined };
    }

    try {
      return {
        result: compareTwoGroups(a, b, kind),
        summaries: [summarise(a), summarise(b)] as const,
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        summaries: undefined,
        error: caught instanceof TwoGroupError ? caught.message : 'Could not run that test.',
      };
    }
  }, [groupA, groupB, kind]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <GroupField
          label="Group A"
          value={groupA}
          onChange={setGroupA}
          placeholder={'Paste a column\n12.4\n11.8\n13.1'}
        />
        <GroupField
          label="Group B"
          value={groupB}
          onChange={setGroupB}
          placeholder={'Paste a column\n15.2\n14.9\n16.0'}
        />
      </div>

      <div className="mt-4">
        <Segmented name="test-kind" label="Test" options={TESTS} value={kind} onChange={setKind} />
        <p className="mt-1.5 text-[12.5px] text-ink-muted">{MODEL_NOTE[kind]}</p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          {/* The estimate leads. This ordering is the whole point of the tool:
              the size of the difference and its uncertainty are the result;
              the p-value is a footnote about whether zero is plausible. */}
          <p className="lbl">
            {kind === 'mann-whitney' ? 'Difference in medians' : 'Difference in means'}
          </p>
          <output className="mt-1 block font-mono text-[34px] leading-none font-medium">
            {result.difference > 0 ? '+' : ''}
            {formatNumber(result.difference, 4)}
          </output>

          {result.ci ? (
            <p className="mt-2 font-mono text-[14px] text-ink-muted">
              {Math.round(result.confidence * 100)}% CI [{formatNumber(result.ci[0], 4)},{' '}
              {formatNumber(result.ci[1], 4)}]
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-muted">
              No interval: a rank test does not estimate the size of a difference.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-3">
            <span className="lbl">{result.effectSize.name}</span>
            <span className="font-mono text-[16px]">
              {formatNumber(result.effectSize.value, 3)}
            </span>
            <span className="text-[12.5px] text-ink-muted">
              conventionally {result.effectSize.magnitude}
            </span>
          </div>

          {/* Deliberately quiet, and last. */}
          <p className="mt-2.5 font-mono text-[12.5px] text-ink-faint">
            {result.statistic.label} = {formatNumber(result.statistic.value, 4)}
            {result.df !== undefined ? `, df = ${formatNumber(result.df, 4)}` : ''}, p ={' '}
            {result.p < 0.0001 ? '< 0.0001' : formatNumber(result.p, 3)}
          </p>

          {summaries ? (
            <table className="mt-4 w-full text-[12.5px]">
              <caption className="sr-only">Group summaries</caption>
              <thead>
                <tr className="lbl">
                  <th scope="col" className="py-1.5 text-left font-semibold">
                    Group
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    n
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Mean
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    SD
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Median
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {summaries.map((summary, index) => (
                  <tr key={index} className="border-t border-line">
                    <td className="py-1.5">{index === 0 ? 'A' : 'B'}</td>
                    <td className="py-1.5 text-right">{summary.n}</td>
                    <td className="py-1.5 text-right">{formatNumber(summary.mean, 4)}</td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {formatNumber(summary.sd, 4)}
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {formatNumber(summary.median, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : !error ? (
        <p className="mt-5 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Paste at least two values into each group.
        </p>
      ) : null}

      <Ladder
        formula={
          kind === 'mann-whitney'
            ? 'U from midranks, normal approximation with tie and continuity correction'
            : 'difference ± t(1−α/2, df) × SE'
        }
        model={MODEL_NOTE[kind].split(' — ')[0]}
        citations={tTestMeta.citations}
        computeLocation={tTestMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] text-ink-faint">
        If your values are technical replicates from a smaller number of independent experiments,
        your n is the number of experiments. Pooling them here will overstate significance.
      </p>
    </div>
  );
}
