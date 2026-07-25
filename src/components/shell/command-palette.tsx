'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { TOOLS } from '@/lib/tools/registry';
import { searchTools } from '@/lib/search';
import { routes } from '@/lib/routes';
import { usePreferences } from '@/hooks/use-preferences';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 8;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Only openable tools appear here. The palette is a launcher, and offering
  // something that cannot be launched wastes the fastest path in the product.
  const openable = useMemo(() => TOOLS.filter((tool) => tool.status !== 'planned'), []);

  const { preferences, ready } = usePreferences();

  /**
   * With no query, lead with the tools this person actually uses — saved
   * first, then recent, then everything else. The palette is the fastest path
   * in the product, so its default ordering should reflect real habit rather
   * than registration order.
   */
  const results = useMemo(() => {
    if (query.trim()) {
      return searchTools(openable, query)
        .map((result) => result.tool)
        .slice(0, MAX_RESULTS);
    }

    if (!ready) return openable.slice(0, MAX_RESULTS);

    const priority = new Map<string, number>();
    preferences.favourites.forEach((id, index) => priority.set(id, index));
    preferences.recents.forEach((entry, index) => {
      if (!priority.has(entry.toolId)) priority.set(entry.toolId, 1000 + index);
    });

    return [...openable]
      .sort((a, b) => (priority.get(a.id) ?? 10000) - (priority.get(b.id) ?? 10000))
      .slice(0, MAX_RESULTS);
  }, [openable, query, preferences, ready]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function go(index: number) {
    const tool = results[index];
    if (!tool) return;
    onClose();
    router.push(routes.tool(tool.id));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(activeIndex);
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div
        className="absolute inset-0 bg-slate-lab-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        className="relative w-full max-w-lg overflow-hidden rounded-lab-lg border border-line bg-surface shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            aria-controls="palette-results"
            aria-activedescendant={
              results[activeIndex] ? `palette-${results[activeIndex].id}` : undefined
            }
            autoComplete="off"
            className="h-12 flex-1 bg-transparent outline-none placeholder:text-ink-faint"
          />
          <kbd className="hidden font-mono text-xs text-ink-faint sm:block">esc</kbd>
        </div>

        <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-muted">
              No tools match that yet.
            </li>
          ) : (
            results.map((tool, index) => (
              <li
                key={tool.id}
                id={`palette-${tool.id}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => go(index)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-lab px-3 py-2 text-left',
                    index === activeIndex ? 'bg-surface-sunken' : 'bg-transparent',
                  )}
                >
                  <span className="text-sm text-ink">{tool.name}</span>
                  <span className="text-xs text-ink-muted">{tool.summary}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-xs text-ink-muted">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
