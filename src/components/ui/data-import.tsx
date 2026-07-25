'use client';

import { useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { TableError, delimiterName, parseTable, type Column } from '@/lib/data/table';
import { cn } from '@/lib/utils';

/**
 * File import with column assignment.
 *
 * Reads with FileReader, so the file is never uploaded — the promise on every
 * tool page holds unchanged. The column picker exists because a real export
 * has six columns and you want two of them, and retyping is how mistakes get
 * made.
 */
export function DataImport({
  slots,
  onAssign,
}: {
  /** The inputs this tool needs filled, in order. */
  slots: readonly string[];
  onAssign: (values: Record<string, number[]>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<Column[] | undefined>();
  const [meta, setMeta] = useState<string>('');
  const [error, setError] = useState<string | undefined>();
  const [assignment, setAssignment] = useState<Record<string, number>>({});

  function ingest(text: string, source: string) {
    try {
      const table = parseTable(text);
      const numeric = table.columns.filter((column) => column.numeric);
      if (numeric.length === 0) {
        setError('No numeric columns found in that file.');
        return;
      }
      setColumns(table.columns);
      setError(undefined);
      setMeta(
        `${source} · ${table.rowCount} rows · ${delimiterName(table.delimiter)}-separated` +
          (table.headerDetected ? ' · header detected' : ''),
      );
      setAssignment({});
    } catch (caught) {
      setError(caught instanceof TableError ? caught.message : 'Could not read that file.');
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ''), file.name);
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  }

  function assign(slot: string, columnIndex: number) {
    const next = { ...assignment, [slot]: columnIndex };
    setAssignment(next);

    const values: Record<string, number[]> = {};
    for (const [key, index] of Object.entries(next)) {
      const column = columns?.find((entry) => entry.index === index);
      if (column) values[key] = column.values;
    }
    onAssign(values);
  }

  return (
    <div className="rounded-lab border border-dashed border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lab border border-line-strong px-3 text-[12.5px] text-ink-muted hover:text-ink"
        >
          <FileUp className="size-3.5" aria-hidden />
          Import CSV or TSV
        </button>
        <span className="text-[11.5px] text-ink-faint">
          {meta || 'Read in your browser. The file is not uploaded.'}
        </span>
        {columns ? (
          <button
            type="button"
            onClick={() => {
              setColumns(undefined);
              setMeta('');
              setAssignment({});
            }}
            aria-label="Clear imported file"
            className="ml-auto grid size-7 place-items-center rounded text-ink-faint hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = '';
        }}
      />

      {error ? <p className="mt-2 text-[12.5px] text-signal-error">{error}</p> : null}

      {columns ? (
        <div className="mt-3 space-y-2">
          {slots.map((slot) => (
            <div key={slot} className="flex flex-wrap items-center gap-2">
              <span className="lbl w-24 shrink-0">{slot}</span>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((column) => (
                  <button
                    key={column.index}
                    type="button"
                    disabled={!column.numeric}
                    onClick={() => assign(slot, column.index)}
                    className={cn(
                      'rounded-lab border px-2 py-1 text-[12px] transition-colors',
                      assignment[slot] === column.index
                        ? 'border-gfp-400 text-gfp-400'
                        : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                      !column.numeric && 'cursor-not-allowed opacity-35',
                    )}
                  >
                    {column.name}
                    <span className="ml-1 text-ink-faint">
                      {column.numeric ? `n=${column.values.length}` : 'text'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11.5px] text-ink-faint">
            Pick a column for each input. Text columns are shown but cannot be selected.
          </p>
        </div>
      ) : null}
    </div>
  );
}
