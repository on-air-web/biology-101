import { cn } from '@/lib/utils';
import type { ComputeLocation, ToolStatus } from '@/lib/tools/types';

const TONES = {
  neutral: 'border-line-strong text-ink-muted',
  brand: 'border-coomassie-200 bg-coomassie-50 text-coomassie-600 dark:bg-transparent',
  // Amber reads as "check this" to anyone who has watched media turn.
  attention: 'border-phenol-300 bg-phenol-100 text-phenol-700 dark:bg-transparent',
} as const;

type Tone = keyof typeof TONES;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5',
        'text-label font-medium tracking-[0.09em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status and privacy badges are derived from registry data, never hand-written. */
export function StatusBadge({ status }: { status: ToolStatus }) {
  if (status === 'stable') return null;
  return <Badge tone="attention">{status}</Badge>;
}

export function ComputeBadge({ location }: { location: ComputeLocation }) {
  return (
    <Badge tone={location === 'client' ? 'brand' : 'neutral'}>
      {location === 'client' ? 'Runs in your browser' : 'Server'}
    </Badge>
  );
}
