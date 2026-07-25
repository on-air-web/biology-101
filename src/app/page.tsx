import type { Metadata } from 'next';
import Link from 'next/link';
import MolarityTool from '@/tools/molarity/ui';
import { CATEGORIES } from '@/lib/tools/categories';
import { TOOLS, getLiveTools } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Biology 101 — laboratory calculators and sequence tools',
  description:
    'Free biology calculators and sequence tools that show the formula behind every result. ' +
    'Molarity, dilutions, GC content, reverse complement, translation and more — all computed ' +
    'in your browser.',
  alternates: { canonical: absoluteUrl(routes.home()) },
};

export default function HomePage() {
  const live = getLiveTools();

  return (
    <>
      {/* The hero is the product, working, before any argument for it. Someone
          arriving from a search for "molarity calculator" can finish their task
          without a second click, and everyone else learns what this is by
          watching a result appear with its formula attached. */}
      <section className="mx-auto max-w-4xl px-4 pt-10 pb-4 sm:px-6 sm:pt-16">
        <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
          Biology tools, in one place
        </p>
        <h1 className="mt-3 max-w-2xl text-display-lg">Every result shows its work.</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          Calculators and sequence tools for the bench. Each one names the formula it used and cites
          where that formula comes from — and none of them send your data anywhere.
        </p>

        <div className="mt-8">
          <MolarityTool />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={routes.catalog()}
            className="inline-flex h-11 items-center rounded-lab bg-brand px-4 text-sm font-medium text-brand-ink"
          >
            Browse all {live.length} tools
          </Link>
          <span className="text-sm text-ink-muted">
            or press <kbd className="font-mono text-ink">/</kbd> to search
          </span>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-4xl px-4 sm:px-6">
        <h2 className="text-display">What&rsquo;s here</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((category) => {
            const count = TOOLS.filter(
              (tool) => tool.category === category.id && tool.status !== 'planned',
            ).length;
            return (
              <li key={category.id}>
                <Link
                  href={routes.category(category.id)}
                  className="block h-full rounded-lab-lg border border-line bg-surface-raised p-4 transition-colors hover:border-line-strong hover:bg-surface-sunken"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold">{category.name}</h3>
                    <span className="shrink-0 font-mono text-xs text-ink-muted">
                      {count > 0 ? `${count} ready` : 'soon'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-muted">{category.summary}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Three claims, each of which is either true or a bug — not marketing
          copy. Every one is enforced somewhere in the codebase. */}
      <section className="mx-auto mt-20 max-w-4xl px-4 sm:px-6">
        <h2 className="text-display">Why trust the number</h2>
        <dl className="mt-6 space-y-8">
          <div>
            <dt className="text-base font-semibold">The formula is on the page</dt>
            <dd className="mt-1.5 max-w-xl text-ink-muted">
              Under every result sits the expression that produced it, the model chosen where more
              than one is accepted, and a link to the source. A tool that cannot fill that in does
              not ship.
            </dd>
          </div>
          <div>
            <dt className="text-base font-semibold">Nothing leaves your browser</dt>
            <dd className="mt-1.5 max-w-xl text-ink-muted">
              Every calculation runs locally. Unpublished sequences and constructs stay on your
              machine, because they should never have had to go anywhere in the first place.
            </dd>
          </div>
          <div>
            <dt className="text-base font-semibold">Tested against published values</dt>
            <dd className="mt-1.5 max-w-xl text-ink-muted">
              Each tool is checked against reference figures from the literature or from established
              tools, and the checks run on every change. Being wrong once costs more than every
              feature here is worth.
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
