'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { SequenceInput, SequenceOutput } from '@/components/ui/sequence-input';
import { Segmented } from '@/components/ui/segmented';
import { complement, parseSequence, reverse, reverseComplement } from '@/lib/sequence';
import { reverseComplementMeta } from './meta';

const MODES = [
  { value: 'reverse-complement', label: 'Reverse complement' },
  { value: 'complement', label: 'Complement' },
  { value: 'reverse', label: 'Reverse' },
] as const;

type Mode = (typeof MODES)[number]['value'];

const FORMULA: Record<Mode, string> = {
  'reverse-complement': "3'→5' complement, read 5'→3'",
  complement: 'base-for-base complement, same orientation',
  reverse: 'sequence read backwards, bases unchanged',
};

export default function ReverseComplementTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('reverse-complement');

  const parsed = useMemo(() => parseSequence(input), [input]);
  const asRna = parsed.kind === 'rna';

  const output = useMemo(() => {
    const { residues } = parsed;
    if (mode === 'reverse') return reverse(residues);
    if (mode === 'complement') return complement(residues, asRna);
    return reverseComplement(residues, asRna);
  }, [parsed, mode, asRna]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <SequenceInput label="Sequence" value={input} onChange={setInput} parsed={parsed} />

      <div className="mt-5">
        <Segmented name="mode" label="Output" options={MODES} value={mode} onChange={setMode} />
      </div>

      <div className="mt-5">
        <SequenceOutput label="Result" residues={output} />
      </div>

      <Ladder
        formula={FORMULA[mode]}
        model={asRna ? 'RNA output (input contains U)' : undefined}
        citations={reverseComplementMeta.citations}
      />
    </div>
  );
}
