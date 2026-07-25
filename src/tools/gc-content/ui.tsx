'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { Result } from '@/components/ui/result';
import { SequenceInput } from '@/components/ui/sequence-input';
import { formatNumber } from '@/lib/format';
import { baseComposition, parseSequence } from '@/lib/sequence';
import { gcContentMeta } from './meta';

export default function GcContentTool() {
  const [input, setInput] = useState('');

  const parsed = useMemo(() => parseSequence(input), [input]);
  const composition = useMemo(() => baseComposition(parsed.residues), [parsed.residues]);

  const counts = Object.entries(composition.counts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <SequenceInput label="Sequence" value={input} onChange={setInput} parsed={parsed} />

      <Result
        className="mt-5"
        label="GC content"
        value={
          composition.gcFraction === undefined
            ? undefined
            : formatNumber(composition.gcFraction * 100, 4)
        }
        unit="%"
        detail={
          composition.ambiguous > 0
            ? `${composition.ambiguous} ambiguous position${composition.ambiguous === 1 ? '' : 's'} excluded from the denominator.`
            : undefined
        }
        placeholder="Paste a sequence to calculate."
      />

      {counts.length > 0 ? (
        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">Base composition</caption>
          <thead>
            <tr className="text-label tracking-[0.09em] text-ink-muted uppercase">
              <th scope="col" className="py-2 text-left font-medium">
                Base
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Count
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {counts.map(([base, count]) => (
              <tr key={base} className="border-t border-line">
                <td className="py-1.5">{base}</td>
                <td className="py-1.5 text-right">{count}</td>
                <td className="py-1.5 text-right text-ink-muted">
                  {formatNumber((count / parsed.residues.length) * 100, 3)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Ladder
        formula="GC% = (G + C + S) ÷ (G + C + S + A + T + W) × 100"
        citations={gcContentMeta.citations}
        computeLocation={gcContentMeta.computeLocation}
      />
    </div>
  );
}
