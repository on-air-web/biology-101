import type { Metadata } from 'next';
import { SiteNav } from '@/components/shell/site-nav';
import { SiteFooter } from '@/components/shell/site-footer';
import { ThemeScript } from '@/components/shell/theme-script';
import { SITE_URL } from '@/lib/routes';
import { fontClassNames } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Biology 101 — laboratory calculators and sequence tools',
    template: '%s · Biology 101',
  },
  description:
    'Calculators, sequence tools and laboratory utilities for biology, in one place. ' +
    'Free, fast, and computed entirely in your browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lab focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
