'use client';

import { useId } from 'react';
import type { ParsedSequence } from '@/lib/sequence';
import { cn } from '@/lib/utils';

/**
 * Shared sequence entry field.
 *
 * Reports what it understood — length, kind, ambiguity, unrecognised
 * characters — rather than silently cleaning the input. A sequence tool that
 * quietly discards characters gives a plausible wrong answer, which is worse
 * than refusing.
 */
export function SequenceInput({
  label,
  value,
  onChange,
  parsed,
  placeholder,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  parsed: ParsedSequence;
  placeholder?: string;
  rows?: number;
}) {
  const inputId = useId();
  const hasInput = parsed.residues.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
        >
          {label}
        </label>
        {hasInput ? (
          <p className="font-mono text-xs text-ink-muted">
            {parsed.residues.length} nt · {parsed.kind.toUpperCase()}
            {parsed.ambiguousCount > 0 ? ` · ${parsed.ambiguousCount} ambiguous` : ''}
          </p>
        ) : null}
      </div>

      <textarea
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={false}
        autoCapitalize="characters"
        autoComplete="off"
        placeholder={placeholder ?? 'Paste a sequence, with or without a FASTA header…'}
        className={cn(
          'mt-1.5 w-full resize-y rounded-lab border bg-surface p-3',
          'font-mono text-sm break-all outline-none focus:ring-2 focus:ring-brand',
          parsed.invalidCharacters.length > 0 ? 'border-signal-error' : 'border-line-strong',
        )}
      />

      {parsed.header ? (
        <p className="mt-1.5 truncate text-sm text-ink-muted">Header: {parsed.header}</p>
      ) : null}

      {parsed.invalidCharacters.length > 0 ? (
        <p className="mt-1.5 text-sm text-signal-error">
          Unrecognised character{parsed.invalidCharacters.length === 1 ? '' : 's'}:{' '}
          <span className="font-mono">{parsed.invalidCharacters.join(' ')}</span>. These are counted
          in the length but cannot be interpreted.
        </p>
      ) : null}
    </div>
  );
}

/** Sequence output in numbered blocks, the way a sequence viewer shows it. */
export function SequenceOutput({
  label,
  residues,
  unit = 'nt',
}: {
  label: string;
  residues: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">{label}</p>
        <p className="font-mono text-xs text-ink-muted">
          {residues.length} {unit}
        </p>
      </div>
      <output className="mt-1.5 block rounded-lab bg-surface-sunken p-3 font-mono text-sm break-all">
        {residues || '—'}
      </output>
    </div>
  );
}
