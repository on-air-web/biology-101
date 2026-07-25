'use client';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Radio group styled as a segmented control. Implemented with real radios so
 * arrow-key navigation and screen reader semantics come for free.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
        {label}
      </legend>
      <div className="mt-1.5 flex rounded-lab border border-line-strong bg-surface-sunken p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-[0.25rem] px-2',
                'text-sm font-medium transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
