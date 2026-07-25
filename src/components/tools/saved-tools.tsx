'use client';

import Link from 'next/link';
import { usePreferences } from '@/hooks/use-preferences';
import { getTool } from '@/lib/tools/registry';
import { routes } from '@/lib/routes';

/**
 * Saved and recent tools. Renders nothing at all until preferences load and
 * only if there is something to show — an empty personalisation panel on a
 * first visit is pure noise.
 */
export function SavedTools() {
  const { preferences, ready } = usePreferences();
  if (!ready) return null;

  const favourites = preferences.favourites
    .map((id) => getTool(id))
    .filter((tool) => tool !== undefined);

  const recents = preferences.recents
    .map((entry) => getTool(entry.toolId))
    .filter((tool) => tool !== undefined)
    .filter((tool) => !preferences.favourites.includes(tool.id))
    .slice(0, 4);

  if (favourites.length === 0 && recents.length === 0) return null;

  return (
    <section className="rounded-lab-lg border border-line bg-surface-sunken p-4">
      {favourites.length > 0 ? (
        <>
          <h2 className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
            Your tools
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {favourites.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={routes.tool(tool.id)}
                  className="inline-flex min-h-9 items-center rounded-lab border border-line bg-surface px-3 text-sm hover:border-line-strong"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {recents.length > 0 ? (
        <>
          <h2 className="mt-4 text-label font-medium tracking-[0.09em] text-ink-muted uppercase first:mt-0">
            Recently used
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recents.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={routes.tool(tool.id)}
                  className="inline-flex min-h-9 items-center rounded-lab px-3 text-sm text-ink-muted hover:text-ink"
                >
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
