'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/tools/categories';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { CommandPalette } from './command-palette';
import { ThemeToggle } from './theme-toggle';

function Wordmark() {
  return (
    <Link
      href={routes.home()}
      className="font-display text-lg font-semibold tracking-tight text-ink [font-variation-settings:'wdth'_112]"
    >
      Biology<span className="text-brand">101</span>
    </Link>
  );
}

function SearchTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 items-center gap-2 rounded-lab border border-line px-3',
        'text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span>Search tools</span>
      <kbd className="ml-auto hidden font-mono text-xs text-ink-faint sm:block">/</kbd>
    </button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  // Route changes must close the menu, or a tap navigates behind an open panel.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);

      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      // Cmd/Ctrl+K anywhere; bare "/" only when not already typing, or the
      // shortcut would eat a slash in a sequence or a concentration field.
      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setPaletteOpen(true);
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          <Link
            href={routes.catalog()}
            className="rounded-lab px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            All tools
          </Link>
          {CATEGORIES.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={routes.category(category.id)}
              className="rounded-lab px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <SearchTrigger
          onClick={() => setPaletteOpen(true)}
          className="ml-auto hidden w-64 lg:flex"
        />

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex size-11 items-center justify-center rounded-lab text-ink-muted hover:bg-surface-sunken hover:text-ink lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-surface px-4 pt-4 pb-8 sm:px-6 lg:hidden"
        >
          <SearchTrigger onClick={() => setPaletteOpen(true)} className="w-full" />
          <nav aria-label="Categories" className="mt-6">
            <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
              Categories
            </p>
            <ul className="mt-2">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <Link
                    href={routes.category(category.id)}
                    className="flex min-h-11 flex-col justify-center border-b border-line py-2"
                  >
                    <span className="text-ink">{category.name}</span>
                    <span className="text-sm text-ink-muted">{category.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
