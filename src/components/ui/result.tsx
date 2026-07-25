import { cn } from '@/lib/utils';

/**
 * The computed answer. Announced politely rather than assertively: on a live
 * calculator an assertive region would interrupt a screen reader on every
 * keystroke.
 */
export function Result({
  label,
  value,
  unit,
  detail,
  placeholder,
  className,
}: {
  label: string;
  value?: string;
  unit?: string;
  detail?: string;
  placeholder?: string;
  className?: string;
}) {
  const hasValue = value !== undefined;

  return (
    <div className={cn('rounded-lab-lg bg-surface-sunken p-5', className)} aria-live="polite">
      <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">{label}</p>
      {hasValue ? (
        <>
          <output className="mt-1 block text-4xl font-medium break-words">
            {value}
            {unit ? <span className="ml-1 text-2xl text-ink-muted">{unit}</span> : null}
          </output>
          {detail ? <p className="mt-2 text-sm text-ink-muted">{detail}</p> : null}
        </>
      ) : (
        <p className="mt-2 text-ink-muted">{placeholder ?? 'Enter values to calculate.'}</p>
      )}
    </div>
  );
}
