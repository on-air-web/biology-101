'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/tools/categories';
import { TOOLS } from '@/lib/tools/registry';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Mark } from '@/components/brand/mark';
import { SearchField } from './search-field';

function Wordmark() {
  return (
    <Link href={routes.home()} className="mr-2 flex flex-none items-center gap-2">
      <Mark className="size-[25px] flex-none text-gfp-400" />
      <span className="text-[15.5px] font-bold tracking-[-0.015em] whitespace-nowrap">
        Biology&nbsp;101
      </span>
    </Link>
  );
}

export function SiteNav() {
  const [megaOpen, setMegaOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setMegaOpen(false), [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setMegaOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMegaOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const counts = new Map(
    CATEGORIES.map((category) => [
      category.id,
      TOOLS.filter((tool) => tool.category === category.id).length,
    ]),
  );

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b border-line bg-black/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-1.5 px-5">
        <Wordmark />

        <div className="hidden items-center gap-0.5 md:flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMegaOpen((open) => !open);
            }}
            aria-expanded={megaOpen}
            className={cn(
              'flex h-[34px] items-center gap-1.5 rounded-lab px-2.5 text-[13.5px] transition-colors',
              megaOpen ? 'bg-hover text-ink' : 'text-ink-muted hover:bg-hover hover:text-ink',
            )}
          >
            Tools
            <ChevronDown
              className={cn('size-3 transition-transform', megaOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          <Link
            href={routes.tasks()}
            className="flex h-[34px] items-center rounded-lab px-2.5 text-[13.5px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            Tasks
          </Link>
          <Link
            href={routes.directory()}
            className="flex h-[34px] items-center rounded-lab px-2.5 text-[13.5px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            Directory
          </Link>
          <Link
            href={routes.about()}
            className="flex h-[34px] items-center rounded-lab px-2.5 text-[13.5px] text-ink-muted transition-colors hover:bg-hover hover:text-ink"
          >
            About
          </Link>
        </div>

        <div className="flex-1" />

        <SearchField />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMegaOpen((open) => !open);
          }}
          aria-label={megaOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={megaOpen}
          className="grid size-[34px] place-items-center rounded-lab text-ink-muted hover:bg-hover hover:text-ink md:hidden"
        >
          {megaOpen ? (
            <X className="size-4" aria-hidden />
          ) : (
            <Menu className="size-4" aria-hidden />
          )}
        </button>
      </div>

      {/* Mega panel. Categories with counts and one line each — enough to
          choose from without opening anything. */}
      <div
        className={cn(
          'absolute inset-x-0 top-14 border-b border-line bg-[#0a0a0a]/97 backdrop-blur-xl transition-all duration-200',
          megaOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1.5 opacity-0',
        )}
      >
        <div className="mx-auto grid max-w-[1120px] gap-x-6 gap-y-1 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={routes.category(category.id)}
              className="flex gap-2.5 rounded-lab-lg border border-transparent px-2.5 py-2.5 hover:border-line hover:bg-hover"
            >
              <span className="mt-1.5 size-[7px] flex-none rounded-[2px] bg-gfp-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{category.name}</span>
                <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-ink-faint">
                  {category.summary}
                </span>
              </span>
              <span className="flex-none text-[11px] text-ink-faint">
                {counts.get(category.id) ?? 0}
              </span>
            </Link>
          ))}
        </div>

        <div className="mx-auto max-w-[1120px] border-t border-line px-5 py-3 md:hidden">
          <Link href={routes.tasks()} className="mr-4 text-[13px] text-ink-muted">
            Tasks
          </Link>
          <Link href={routes.directory()} className="mr-4 text-[13px] text-ink-muted">
            Directory
          </Link>
          <Link href={routes.about()} className="text-[13px] text-ink-muted">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

export { Search };
