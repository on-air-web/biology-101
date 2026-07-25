import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/tools/categories';
import { TASKS } from '@/lib/tasks/registry';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Tasks',
  description:
    'Guides organised by what you are trying to do, each naming the tools worth using and why.',
  alternates: { canonical: absoluteUrl(routes.tasks()) },
};

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-8 sm:py-11">
      <h1 className="text-[clamp(26px,5vw,36px)] leading-tight font-bold tracking-[-0.03em]">
        Tasks
      </h1>
      <p className="mt-3 max-w-[62ch] text-[14.5px] text-ink-muted">
        Most people arrive knowing what they need to do, not what the tool is called. These pages
        start from the job — what decides the choice, what tends to go wrong, and which two or three
        tools are worth your time.
      </p>

      {CATEGORIES.map((category) => {
        const inCategory = TASKS.filter((task) => task.category === category.id);
        if (inCategory.length === 0) return null;
        return (
          <section key={category.id} className="mt-9">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{category.name}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inCategory.map((task) => (
                <li key={task.id}>
                  <Link
                    href={routes.task(task.id)}
                    className="block h-full rounded-lab-lg border border-line bg-surface p-3 transition-all hover:-translate-y-px hover:border-line-strong hover:bg-hover"
                  >
                    <p className="lbl">{task.question}</p>
                    <strong className="mt-1.5 block text-[13.5px] font-semibold">
                      {task.name}
                    </strong>
                    <p className="mt-1 text-[12.5px] leading-[1.45] text-ink-muted">
                      {task.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
