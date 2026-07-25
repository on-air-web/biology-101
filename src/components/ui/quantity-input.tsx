'use client';

import { useId } from 'react';
import { type Dimension, unitsFor } from '@/lib/units';
import { cn } from '@/lib/utils';

export interface Quantity {
  /** Raw text, kept as typed. Storing a parsed number here would fight the
   *  user mid-entry: "0.", "1e-", and "-" are all valid states while typing. */
  raw: string;
  unitId: string;
}

interface QuantityInputProps {
  label: string;
  dimension: Dimension;
  value: Quantity;
  onChange: (value: Quantity) => void;
  hint?: string;
  error?: string;
  autoFocus?: boolean;
}

export function QuantityInput({
  label,
  dimension,
  value,
  onChange,
  hint,
  error,
  autoFocus,
}: QuantityInputProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const units = unitsFor(dimension);

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
      >
        {label}
      </label>

      <div
        className={cn(
          'mt-1.5 flex items-stretch overflow-hidden rounded-lab border bg-surface',
          'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-1 focus-within:ring-offset-surface',
          error ? 'border-signal-error' : 'border-line-strong',
        )}
      >
        <input
          id={inputId}
          value={value.raw}
          onChange={(event) => onChange({ ...value, raw: event.target.value })}
          autoFocus={autoFocus}
          // Not type="number": it blocks exponent entry in some browsers, and
          // scroll-wheel focus silently changes values, which is dangerous on
          // a page people copy figures from.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          aria-describedby={hint || error ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono tabular-nums outline-none placeholder:text-ink-faint"
        />

        <label className="sr-only" htmlFor={`${inputId}-unit`}>
          {label} unit
        </label>
        <select
          id={`${inputId}-unit`}
          value={value.unitId}
          onChange={(event) => onChange({ ...value, unitId: event.target.value })}
          className="h-11 shrink-0 border-l border-line-strong bg-surface-sunken px-2 text-sm outline-none"
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p id={hintId} className="mt-1.5 text-sm text-signal-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A plain numeric field for dimensionless quantities such as molar mass. */
export function NumberInput({
  label,
  value,
  onChange,
  suffix,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
  error?: string;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
      >
        {label}
      </label>
      <div
        className={cn(
          'mt-1.5 flex items-stretch overflow-hidden rounded-lab border bg-surface',
          'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-1 focus-within:ring-offset-surface',
          error ? 'border-signal-error' : 'border-line-strong',
        )}
      >
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          aria-describedby={hint || error ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono tabular-nums outline-none placeholder:text-ink-faint"
        />
        {suffix ? (
          <span className="flex h-11 shrink-0 items-center border-l border-line-strong bg-surface-sunken px-3 text-sm text-ink-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={hintId} className="mt-1.5 text-sm text-signal-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
