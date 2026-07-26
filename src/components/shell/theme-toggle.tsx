'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Dark is the base theme on :root, so light is the class that exists.
    setIsDark(!document.documentElement.classList.contains('light'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle('light', !next);
    try {
      localStorage.setItem('b101-theme', next ? 'dark' : 'light');
    } catch {
      // Private browsing. The toggle still works for this session.
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-lab',
        'text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink',
        className,
      )}
    >
      {/* Render nothing until mounted: the server has no way to know the theme,
          so drawing an icon early guarantees a wrong one. */}
      {mounted ? (
        isDark ? (
          <Sun className="size-5" aria-hidden />
        ) : (
          <Moon className="size-5" aria-hidden />
        )
      ) : null}
    </button>
  );
}
