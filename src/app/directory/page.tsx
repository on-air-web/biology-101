import type { Metadata } from 'next';
import { ToolCard } from '@/components/catalog/tool-card';
import { CATEGORIES } from '@/lib/tools/categories';
import { getExternalTools } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'External tool directory',
  description:
    'A curated index of the external biology platforms worth using, each with a note on when ' +
    'it is the right choice — and when something else is better.',
  alternates: { canonical: absoluteUrl(routes.directory()) },
};

export default function DirectoryPage() {
  const tools = getExternalTools();

  return (
    <div className="mx-auto max-w-[1120px] px-5 py-8 sm:py-11">
      <h1 className="text-[clamp(26px,5vw,36px)] leading-tight font-bold tracking-[-0.03em]">
        External directory
      </h1>
      <p className="mt-3 max-w-[62ch] text-[14.5px] text-ink-muted">
        Tools we don&rsquo;t host, indexed because they are the right answer to something. Every
        entry says when to reach for it, what it costs you in access or licensing, and what to use
        instead when it isn&rsquo;t the right fit.
      </p>

      {CATEGORIES.map((category) => {
        const inCategory = tools.filter((tool) => tool.category === category.id);
        if (inCategory.length === 0) return null;
        return (
          <section key={category.id} className="mt-9">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{category.name}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inCategory.map((tool) => (
                <li key={tool.id}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
