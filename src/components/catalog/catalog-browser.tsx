'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ToolCard } from './tool-card';
import { CATEGORIES } from '@/lib/tools/categories';
import { TOOLS } from '@/lib/tools/registry';
import { searchTools } from '@/lib/search';
import { SavedTools } from '@/components/tools/saved-tools';

export function CatalogBrowser() {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const results = useMemo(() => (trimmed ? searchTools(TOOLS, trimmed) : []), [trimmed]);

  const grouped = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        tools: TOOLS.filter((tool) => tool.category === category.id),
      })).filter((group) => group.tools.length > 0),
    [],
  );

  const builtCount = TOOLS.filter((tool) => tool.status !== 'planned').length;

  return (
    <div>
      <div className="mb-6 empty:mb-0">
        <SavedTools />
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
        <label htmlFor="catalog-search" className="sr-only">
          Search tools
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, abbreviation or task…"
          autoComplete="off"
          className="h-12 w-full rounded-lab border border-line-strong bg-surface pr-10 pl-9 outline-none focus:ring-2 focus:ring-brand"
        />
        {trimmed ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lab text-ink-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {trimmed ? (
        <section className="mt-8" aria-live="polite">
          <p className="text-sm text-ink-muted">
            {results.length === 0
              ? 'No tools match that.'
              : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </p>

          {results.length === 0 ? (
            <p className="mt-4 rounded-lab-lg border border-dashed border-line p-6 text-ink-muted">
              Nothing here yet for “{trimmed}”. If it is a tool you would use, that is worth knowing
              — the catalog is still growing.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {results.map(({ tool }) => (
                <li key={tool.id}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            {builtCount} available now, {TOOLS.length - builtCount} on the way.
          </p>

          <nav aria-label="Jump to category" className="mt-4 flex flex-wrap gap-2">
            {grouped.map(({ category }) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-line-strong hover:text-ink"
              >
                {category.name}
              </a>
            ))}
          </nav>

          {grouped.map(({ category, tools }) => (
            <section key={category.id} id={category.id} className="mt-12 scroll-mt-20">
              <h2 className="text-xl">{category.name}</h2>
              <p className="mt-1 text-sm text-ink-muted">{category.summary}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
