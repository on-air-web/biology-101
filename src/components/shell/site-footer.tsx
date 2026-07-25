import Link from 'next/link';
import { CATEGORIES } from '@/lib/tools/categories';
import { routes } from '@/lib/routes';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="font-display text-lg font-semibold [font-variation-settings:'wdth'_112]">
            Biology<span className="text-brand">101</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Calculators, sequence tools and laboratory utilities in one place. Every result shows
            the formula behind it, and nothing you enter leaves your browser.
          </p>
        </div>

        <div>
          <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">Tools</p>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link href={routes.category(category.id)} className="text-ink-muted hover:text-ink">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
            Project
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={routes.about()} className="text-ink-muted hover:text-ink">
                About
              </Link>
            </li>
            {SITE.repoUrl ? (
              <li>
                <a href={SITE.repoUrl} className="text-ink-muted hover:text-ink" rel="noreferrer">
                  Source code
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-muted sm:px-6">
          Results are provided for laboratory planning. Verify critical calculations independently.
        </p>
      </div>
    </footer>
  );
}
