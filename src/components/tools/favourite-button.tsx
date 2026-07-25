'use client';

import { Star } from 'lucide-react';
import { usePreferences } from '@/hooks/use-preferences';
import { cn } from '@/lib/utils';

/**
 * The one place the media-rose accent is used. Reserving it for a single
 * meaning is what keeps it meaningful.
 */
export function FavouriteButton({ toolId }: { toolId: string }) {
  const { ready, isFavourite, toggleFavourite } = usePreferences();
  const active = ready && isFavourite(toolId);

  return (
    <button
      type="button"
      onClick={() => toggleFavourite(toolId)}
      aria-pressed={active}
      // Before preferences load, the label must not claim a state we do not know.
      aria-label={active ? 'Remove from your tools' : 'Save to your tools'}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lab border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-rose-lab-500 text-rose-lab-500'
          : 'border-line-strong text-ink-muted hover:text-ink',
      )}
    >
      <Star className={cn('size-4', active && 'fill-current')} aria-hidden />
      {active ? 'Saved' : 'Save'}
    </button>
  );
}
