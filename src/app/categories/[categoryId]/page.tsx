import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ToolCard } from '@/components/catalog/tool-card';
import { CATEGORIES } from '@/lib/tools/categories';
import { byTier, getToolsByCategory } from '@/lib/tools/registry';
import { getTasksByCategory } from '@/lib/tasks/registry';
import { absoluteUrl, routes } from '@/lib/routes';
import type { ToolCategoryId } from '@/lib/tools/types';

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ categoryId: category.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const category = CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return {};

  return {
    title: category.name,
    description: category.summary,
    alternates: { canonical: absoluteUrl(routes.category(category.id)) },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { categoryId } = await params;
  const category = CATEGORIES.find((item) => item.id === categoryId);
  if (!category) notFound();

  const all = getToolsByCategory(category.id as ToolCategoryId);
  const { picks, listed } = byTier(all.filter((tool) => tool.kind !== 'pipeline'));
  const pipelines = all.filter((tool) => tool.kind === 'pipeline');
  const tasks = getTasksByCategory(category.id);

  return (
    <div className="mx-auto max-w-[1120px] px-5 py-8 sm:py-11">
      <Breadcrumbs items={[{ label: 'Tools', href: routes.catalog() }, { label: category.name }]} />

      <h1 className="mt-5 text-[clamp(26px,5vw,36px)] leading-tight font-bold tracking-[-0.03em]">
        {category.name}
      </h1>
      <p className="mt-3 max-w-[62ch] text-[14.5px] text-ink-muted">{category.summary}</p>

      {/* Tasks come first: most people know the job, not the tool name. */}
      {tasks.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Start from the task</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={routes.task(task.id)}
                  className="block h-full rounded-lab-lg border border-line bg-surface p-3 transition-all hover:-translate-y-px hover:border-line-strong hover:bg-hover"
                >
                  <p className="lbl">{task.question}</p>
                  <strong className="mt-1.5 block text-[13.5px] font-semibold">{task.name}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {picks.length > 0 ? (
        <section className="mt-9">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Recommended</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {listed.length > 0 ? (
        <section className="mt-9">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Also available</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Indexed for completeness. We haven&rsquo;t formed a view on these yet.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pipelines.length > 0 ? (
        <section className="mt-9">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">If you script</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Command-line and library options, named in the task guides above.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {pipelines.map((tool) => (
              <li key={tool.id}>
                <a
                  href={tool.pipeline?.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[12.5px] text-ink-muted hover:text-ink"
                >
                  {tool.name}
                  <span className="lbl ml-1.5">{tool.pipeline?.environment}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {all.length === 0 ? (
        <p className="mt-8 rounded-lab-lg border border-line bg-surface p-6 text-[13.5px] text-ink-muted">
          Nothing here yet. Tools in this category are on the way.
        </p>
      ) : null}
    </div>
  );
}
