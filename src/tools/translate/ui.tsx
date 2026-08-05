'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { SequenceOutput, SequenceInput } from '@/components/ui/sequence-input';
import { GENETIC_CODES, getGeneticCode, translateFrame } from '@/lib/genetic-code';
import { parseSequence, reverseComplement } from '@/lib/sequence';
import { translateMeta } from './meta';

const FRAMES = [1, 2, 3, -1, -2, -3] as const;

function frameLabel(frame: number): string {
  return frame > 0 ? `Frame +${frame}` : `Frame ${frame}`;
}

export default function TranslateTool() {
  const [input, setInput] = useState('');
  const [codeId, setCodeId] = useState('standard');
  const [showAllFrames, setShowAllFrames] = useState(false);

  const parsed = useMemo(() => parseSequence(input), [input]);
  const code = getGeneticCode(codeId);

  const translations = useMemo(() => {
    const forward = parsed.residues;
    const reverse = reverseComplement(forward);
    return FRAMES.map((frame) => ({
      frame,
      protein: translateFrame(frame > 0 ? forward : reverse, { code, frame }),
    }));
  }, [parsed.residues, code]);

  const visible = showAllFrames ? translations : translations.slice(0, 1);
  const model = translateMeta.models?.find((entry) => entry.id === codeId);

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <SequenceInput
        label="Nucleotide sequence"
        value={input}
        onChange={setInput}
        parsed={parsed}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="genetic-code"
            className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
          >
            Genetic code
          </label>
          <select
            id="genetic-code"
            value={codeId}
            onChange={(event) => setCodeId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 outline-none focus:ring-2 focus:ring-brand"
          >
            {GENETIC_CODES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} (table {entry.ncbiId})
              </option>
            ))}
          </select>
          {model ? <p className="mt-1.5 text-sm text-ink-muted">{model.guidance}</p> : null}
        </div>

        <div className="flex items-end">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAllFrames}
              onChange={(event) => setShowAllFrames(event.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Show all six reading frames
          </label>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {visible.map(({ frame, protein }) => (
          <SequenceOutput key={frame} label={frameLabel(frame)} residues={protein} unit="aa" />
        ))}
      </div>

      <Ladder
        formula="codon → amino acid, 3 nt per residue"
        model={model?.name}
        citations={translateMeta.citations}
      />
    </div>
  );
}
