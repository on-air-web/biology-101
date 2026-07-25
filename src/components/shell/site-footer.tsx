import Link from 'next/link';
import { CATEGORIES } from '@/lib/tools/categories';
import { routes } from '@/lib/routes';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-[15px] font-bold tracking-[-0.015em]">
            Biology<span className="text-gfp-400">101</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Your one stop shop for biology. Free, cited, and built in the open.
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
            <li>
              <Link href={routes.directory()} className="text-ink-muted hover:text-ink">
                External directory
              </Link>
            </li>
            <li>
              <Link href={routes.credits()} className="text-ink-muted hover:text-ink">
                Image credits
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-6 sm:px-6">
          <p className="text-sm text-ink-muted">
            Results are provided for laboratory planning. Verify critical calculations
            independently.
          </p>
          <p className="text-sm text-ink-faint">
            Made with love for the community by Diganta Chaudhury
          </p>
        </div>
      </div>
    </footer>
  );
}
