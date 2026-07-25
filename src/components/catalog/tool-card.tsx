import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ToolMeta } from '@/lib/tools/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * Planned tools render as a non-interactive card. They are shown so the
 * catalog reflects the real shape of the product, but a card that looks
 * clickable and is not would be worse than omitting them.
 */
export function ToolCard({ tool }: { tool: ToolMeta }) {
  const isPlanned = tool.status === 'planned';

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{tool.name}</h3>
        {isPlanned ? (
          <span className="shrink-0 text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
            Planned
          </span>
        ) : (
          <ArrowUpRight
            className="size-4 shrink-0 text-ink-faint transition-colors group-hover:text-brand"
            aria-hidden
          />
        )}
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">{tool.summary}</p>
    </>
  );

  const shared = 'block rounded-lab-lg border p-4 h-full';

  if (isPlanned) {
    return (
      <div className={cn(shared, 'border-dashed border-line bg-transparent')}>
        {body}
        <span className="sr-only">Not yet available</span>
      </div>
    );
  }

  return (
    <Link
      href={routes.tool(tool.id)}
      className={cn(
        shared,
        'group border-line bg-surface-raised transition-colors hover:border-line-strong hover:bg-surface-sunken',
      )}
    >
      {body}
    </Link>
  );
}
