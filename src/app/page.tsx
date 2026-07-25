import type { Metadata } from 'next';
import Link from 'next/link';
import { Band } from '@/components/brand/band';
import { MolecularField } from '@/components/brand/molecular-field';
import { ToolCard } from '@/components/catalog/tool-card';
import { CATEGORIES } from '@/lib/tools/categories';
import { TOOLS, getBuiltinTools, getExternalTools, getTool } from '@/lib/tools/registry';
import { IMAGES } from '@/lib/images';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Biology 101 — your one stop shop for biology',
  description:
    'Everything you need, from a homework problem set to a research project. Calculators that ' +
    'run in your browser, plus a curated directory of the external platforms worth using.',
  alternates: { canonical: absoluteUrl(routes.home()) },
};

const FEATURED = ['alphafold-server', 'molarity', 'fiji-imagej', 'clustal-omega'];

export default function HomePage() {
  const builtin = getBuiltinTools();
  const externalTools = getExternalTools();
  const featured = FEATURED.map((id) => getTool(id)).filter((tool) => tool !== undefined);
  const calculators = TOOLS.filter((tool) => tool.category === 'lab-calculators');
  const cellTools = TOOLS.filter((tool) => tool.category === 'cell-biology');

  return (
    <>
      <Band
        speed={0.2}
        className="flex min-h-[62vh] items-end md:min-h-[74vh]"
        layer={
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={IMAGES.zebrafish.src}
            alt={IMAGES.zebrafish.alt}
            className="block h-auto w-full"
          />
        }
      >
        <div className="mx-auto w-full max-w-[1120px] px-5 pb-11">
          <h1 className="text-[clamp(40px,9vw,80px)] leading-[0.96] font-bold tracking-[-0.045em]">
            Biology&nbsp;101
          </h1>
          <p className="mt-4 text-[clamp(18px,3vw,26px)] font-semibold tracking-[-0.02em]">
            Your one stop shop for biology.
          </p>
          <p className="mt-2 max-w-[52ch] text-[14.5px] text-ink-muted">
            Everything you need, from a homework problem set to a research project. Most of it runs
            right here in your browser — and for the rest, we point you to the best tool for the
            job.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={routes.catalog()}
              className="inline-flex h-10 items-center rounded-lab bg-ink px-4 text-[13.5px] font-semibold text-black hover:bg-white"
            >
              Browse the catalogue
            </Link>
            <Link
              href={routes.about()}
              className="inline-flex h-10 items-center rounded-lab border border-line-strong bg-black/35 px-4 text-[13.5px] font-semibold hover:bg-hover"
            >
              How tools are chosen
            </Link>
          </div>
        </div>
      </Band>

      <div className="border-y border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap gap-x-7 gap-y-3 px-5 py-4">
          <div>
            <b className="block text-[18px] font-semibold">{TOOLS.length}</b>
            <span className="text-[11.5px] text-ink-faint">tools indexed</span>
          </div>
          <div>
            <b className="block text-[18px] font-semibold">{builtin.length}</b>
            <span className="text-[11.5px] text-ink-faint">run locally</span>
          </div>
          <div>
            <b className="block text-[18px] font-semibold">{externalTools.length}</b>
            <span className="text-[11.5px] text-ink-faint">external, reviewed</span>
          </div>
          <div>
            <b className="block text-[18px] font-semibold">100%</b>
            <span className="text-[11.5px] text-ink-faint">cited</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-5">
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Start here</h2>
            <Link href={routes.catalog()} className="text-[12.5px] text-link-400">
              All {TOOLS.length} →
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Band
        speed={0.14}
        className="mt-11 flex min-h-[210px] items-end border-t border-line"
        layer={<MolecularField />}
      >
        <div className="mx-auto w-full max-w-[1120px] px-5 pb-5">
          <h2 className="text-[22px] font-bold tracking-[-0.025em]">Laboratory calculators</h2>
          <p className="mt-1.5 max-w-[56ch] text-[13.5px] text-ink-muted">
            Dilutions, molarity, buffers and reagent maths. All of it runs here, and every result
            shows the formula behind it.
          </p>
        </div>
      </Band>

      <div className="mx-auto max-w-[1120px] px-5">
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {calculators.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </div>

      <Band
        speed={0.14}
        className="mt-11 flex min-h-[210px] items-end border-t border-line"
        layer={
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={IMAGES.microtubules.src}
            alt={IMAGES.microtubules.alt}
            className="block h-auto w-full"
          />
        }
      >
        <div className="mx-auto w-full max-w-[1120px] px-5 pb-5">
          <h2 className="text-[22px] font-bold tracking-[-0.025em]">
            Cell &amp; developmental biology
          </h2>
          <p className="mt-1.5 max-w-[56ch] text-[13.5px] text-ink-muted">
            Growth rates, viability and seeding density, plus the databases people actually use for
            model organisms.
          </p>
        </div>
      </Band>

      <div className="mx-auto max-w-[1120px] px-5">
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cellTools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>

        <section className="mt-11">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Browse by category</h2>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => {
              const count = TOOLS.filter((tool) => tool.category === category.id).length;
              return (
                <li key={category.id}>
                  <Link
                    href={routes.category(category.id)}
                    className="block h-full rounded-lab-lg border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-hover"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <strong className="text-[13.5px] font-semibold">{category.name}</strong>
                      <span className="flex-none text-[11px] text-ink-faint">{count}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-muted">{category.summary}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
