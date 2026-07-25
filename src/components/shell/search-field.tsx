'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { TOOLS } from '@/lib/tools/registry';
import { searchTools, normalize } from '@/lib/search';
import { getCategory } from '@/lib/tools/categories';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { ToolMeta } from '@/lib/tools/types';

const MAX_RESULTS = 8;

/** Highlights the matched span without dangerouslySetInnerHTML. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const terms = normalize(query).split(' ').filter(Boolean);
  const lower = text.toLowerCase();

  let cut: [number, number] | undefined;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index > -1) {
      cut = [index, index + term.length];
      break;
    }
  }

  if (!cut) return <>{text}</>;
  return (
    <>
      {text.slice(0, cut[0])}
      <mark className="bg-transparent p-0 text-gfp-400">{text.slice(cut[0], cut[1])}</mark>
      {text.slice(cut[1])}
    </>
  );
}

export function SearchField() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results: ToolMeta[] = useMemo(() => {
    if (!query.trim()) return [];
    return searchTools(TOOLS, query)
      .slice(0, MAX_RESULTS)
      .map((result) => result.tool);
  }, [query]);

  useEffect(() => setActive(-1), [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === 'Escape') close();
    }
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node) && !inputRef.current?.value) close();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  function close() {
    setOpen(false);
    setQuery('');
    setActive(-1);
  }

  function go(tool: ToolMeta | undefined) {
    if (!tool) return;
    close();
    router.push(routes.tool(tool.id));
  }

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative flex-none transition-[width] duration-300 ease-out',
        open ? 'w-[min(430px,62vw)]' : 'w-[38px]',
      )}
    >
      <div
        className={cn(
          'flex h-[34px] items-center overflow-hidden rounded-lab border transition-colors',
          open ? 'border-line bg-surface' : 'border-transparent bg-transparent',
        )}
      >
        <button
          type="button"
          aria-label={open ? 'Close search' : 'Search tools'}
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className="grid h-[34px] w-9 flex-none place-items-center text-ink-muted hover:text-ink"
        >
          <Search className="size-4" aria-hidden />
        </button>

        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (!results.length) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % results.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + results.length) % results.length);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              go(results[active === -1 ? 0 : active]);
            }
          }}
          type="text"
          placeholder="Search tools, tasks or techniques…"
          aria-label="Search tools"
          autoComplete="off"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
          className={cn(
            'h-[34px] min-w-0 flex-1 bg-transparent font-sans text-[13.5px] outline-none placeholder:text-ink-faint',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />

        {!open ? (
          <kbd className="mr-2 flex-none rounded-[3px] border border-line px-1 text-[10px] text-ink-faint">
            /
          </kbd>
        ) : null}
      </div>

      {open && query.trim() ? (
        <div className="absolute top-[42px] right-0 max-h-[62vh] w-[min(480px,88vw)] overflow-y-auto rounded-lab-lg border border-line bg-[#0c0c0c]/98 p-1.5 shadow-2xl backdrop-blur-xl">
          {results.length === 0 ? (
            <p className="px-3 py-5 text-center text-[12.5px] text-ink-faint">
              Nothing matches “{query.trim()}” yet.
              <br />
              If it is a tool you would use, that is worth telling us.
            </p>
          ) : (
            <>
              <p className="lbl px-2.5 pt-2 pb-1">
                {results.length} result{results.length > 1 ? 's' : ''}
              </p>
              <ul role="listbox" aria-label="Search results">
                {results.map((tool, index) => (
                  <li key={tool.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(tool)}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-lab px-2.5 py-2 text-left',
                        index === active ? 'bg-hover' : 'bg-transparent',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 flex-none rounded-[2px]',
                          tool.kind === 'builtin' ? 'bg-gfp-400' : 'bg-link-400',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">
                          <Highlighted text={tool.name} query={query} />
                        </span>
                        <span className="mt-px block truncate text-[11.5px] text-ink-faint">
                          {tool.summary}
                        </span>
                      </span>
                      <span className="lbl flex-none rounded-[3px] border border-line px-1 py-px">
                        {tool.kind === 'builtin'
                          ? 'Local'
                          : getCategory(tool.category).name.split(' ')[0]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
