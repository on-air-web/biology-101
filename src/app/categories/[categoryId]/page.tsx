import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ToolCard } from '@/components/catalog/tool-card';
import { CATEGORIES } from '@/lib/tools/categories';
import { getToolsByCategory } from '@/lib/tools/registry';
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

  const tools = getToolsByCategory(category.id as ToolCategoryId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs items={[{ label: 'Tools', href: routes.catalog() }, { label: category.name }]} />

      <h1 className="mt-6 text-display">{category.name}</h1>
      <p className="mt-3 text-lg text-ink-muted">{category.summary}</p>

      {tools.length ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-lab-lg border border-line bg-surface-sunken p-6 text-ink-muted">
          Nothing here yet. Tools in this category are on the way.
        </p>
      )}
    </div>
  );
}
