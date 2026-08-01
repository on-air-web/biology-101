'use client';

import { X } from 'lucide-react';
import {
  FLUOROPHORES,
  fluorophoreColour,
  getFluorophore,
  type Fluorophore,
} from '@/lib/bio/spectra';

/**
 * Fluorophore selection, shared by the imaging tools.
 *
 * Field ids come from a caller-supplied `name` rather than `useId`, for the
 * reason quantity-input.tsx sets out: these tools mount through next/dynamic,
 * so the client render has a lazy boundary the server render does not and the
 * useId counters diverge.
 */

/** Ordered by emission, which is the order the eye expects in a spectra list. */
const ORDERED = [...FLUOROPHORES].sort((a, b) => (a.emMax ?? 0) - (b.emMax ?? 0));

const PROTEINS = ORDERED.filter((f) => f.kind === 'protein');
const DYES = ORDERED.filter((f) => f.kind === 'dye');

function optionLabel(fluorophore: Fluorophore): string {
  return `${fluorophore.name} — ${fluorophore.exMax}/${fluorophore.emMax} nm`;
}

function Options({ exclude }: { exclude?: readonly string[] }) {
  const allowed = (fluorophore: Fluorophore) => !exclude?.includes(fluorophore.id);
  return (
    <>
      <optgroup label="Fluorescent proteins">
        {PROTEINS.filter(allowed).map((fluorophore) => (
          <option key={fluorophore.id} value={fluorophore.id}>
            {optionLabel(fluorophore)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Dyes and conjugates">
        {DYES.filter(allowed).map((fluorophore) => (
          <option key={fluorophore.id} value={fluorophore.id}>
            {optionLabel(fluorophore)}
          </option>
        ))}
      </optgroup>
    </>
  );
}

export function FluorophoreSelect({
  name,
  label,
  value,
  onChange,
  hint,
  exclude,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  hint?: string;
  exclude?: readonly string[];
}) {
  const inputId = `field-${name}`;
  const chosen = getFluorophore(value);

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
      >
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lab border border-line-strong bg-surface focus-within:ring-2 focus-within:ring-brand">
        <span
          className="w-1.5 shrink-0"
          style={{ backgroundColor: chosen ? fluorophoreColour(chosen) : 'transparent' }}
          aria-hidden
        />
        <select
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        >
          <Options exclude={exclude} />
        </select>
      </div>
      {hint ? <p className="mt-1.5 text-sm text-ink-muted">{hint}</p> : null}
      {chosen ? <p className="mt-1.5 text-[12px] text-ink-faint">{chosen.note}</p> : null}
    </div>
  );
}

export function FluorophoreMultiSelect({
  name,
  label,
  values,
  onChange,
  max = 6,
  hint,
}: {
  name: string;
  label: string;
  values: readonly string[];
  onChange: (ids: string[]) => void;
  max?: number;
  hint?: string;
}) {
  const inputId = `field-${name}`;
  const full = values.length >= max;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
      >
        {label}
      </label>

      <select
        id={inputId}
        // Always reads "add…" so it is a command rather than a state display;
        // what is selected is shown by the chips below, which can be removed.
        value=""
        disabled={full}
        onChange={(event) => {
          if (event.target.value) onChange([...values, event.target.value]);
        }}
        className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand disabled:text-ink-faint"
      >
        <option value="">{full ? `Maximum of ${max} selected` : 'Add a fluorophore…'}</option>
        <Options exclude={values} />
      </select>

      {values.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((id) => {
            const fluorophore = getFluorophore(id);
            if (!fluorophore) return null;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((other) => other !== id))}
                  className="flex h-7 items-center gap-1.5 rounded-lab border border-line-strong bg-surface-raised pr-1.5 pl-2 text-[12.5px] text-ink"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: fluorophoreColour(fluorophore) }}
                    aria-hidden
                  />
                  {fluorophore.name}
                  <X className="size-3.5 text-ink-faint" aria-hidden />
                  <span className="sr-only">Remove {fluorophore.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hint ? <p className="mt-1.5 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
