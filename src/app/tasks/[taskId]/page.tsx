import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ToolCard } from '@/components/catalog/tool-card';
import { TASKS, getTask } from '@/lib/tasks/registry';
import { getCategory } from '@/lib/tools/categories';
import { getTool } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export function generateStaticParams() {
  return TASKS.map((task) => ({ taskId: task.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { taskId } = await params;
  const task = getTask(taskId);
  if (!task) return {};

  return {
    title: task.name,
    description: task.summary,
    alternates: { canonical: absoluteUrl(routes.task(task.id)) },
    openGraph: { title: `${task.name} · Biology 101`, description: task.summary, type: 'article' },
  };
}

export default async function TaskPage({ params }: PageProps) {
  const { taskId } = await params;
  const task = getTask(taskId);
  if (!task) notFound();

  const category = getCategory(task.category);
  const tools = task.toolIds.map((id) => getTool(id)).filter((tool) => tool !== undefined);
  const pipelines = (task.pipelineIds ?? [])
    .map((id) => getTool(id))
    .filter((tool) => tool !== undefined);

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 sm:py-10">
      <Breadcrumbs
        items={[
          { label: 'Tasks', href: routes.tasks() },
          { label: category.name, href: routes.category(category.id) },
          { label: task.name },
        ]}
      />

      <header className="mt-5">
        <p className="lbl">{task.question}</p>
        <h1 className="mt-2 text-[clamp(24px,5vw,32px)] leading-tight font-bold tracking-[-0.03em]">
          {task.name}
        </h1>
        <p className="mt-2.5 text-[15px] text-ink-muted">{task.summary}</p>
      </header>

      {/* The guidance is the page. Tools are the endpoints. */}
      <div className="mt-7 space-y-4">
        {task.guidance.split('\n\n').map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-[14.5px] leading-[1.65] text-ink-muted">
            {paragraph}
          </p>
        ))}
      </div>

      {task.caution ? (
        <p className="mt-5 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3.5 text-[13px] leading-[1.6] text-ink-muted">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
          <span>{task.caution}</span>
        </p>
      ) : null}

      {tools.length > 0 ? (
        <section className="mt-9">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">What to use</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pipelines.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">If you script</h2>
          <p className="mt-1.5 text-[12.5px] text-ink-faint">
            Command-line and library options. No page here — they need an environment rather than a
            browser.
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {pipelines.map((tool) => (
              <li key={tool.id} className="py-2.5">
                <a
                  href={tool.pipeline?.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-baseline gap-2"
                >
                  <span className="text-[13.5px] font-semibold">{tool.name}</span>
                  <span className="lbl">{tool.pipeline?.environment}</span>
                  <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-ink-faint" aria-hidden />
                </a>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">{tool.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-line pt-4">
        <p className="text-[12px] text-ink-faint">
          {task.reviewStatus === 'reviewed'
            ? 'Reviewed guidance.'
            : 'Drafted from the literature and not yet reviewed by a specialist. Treat it as a starting point, and tell us if something here is wrong.'}{' '}
          Last touched{' '}
          <time dateTime={task.reviewedAt}>
            {new Date(task.reviewedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          .
        </p>
        <Link href={routes.tasks()} className="mt-2 inline-block text-[12.5px] text-link-400">
          All tasks →
        </Link>
      </footer>
    </div>
  );
}
