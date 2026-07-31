import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ComputeBadge, StatusBadge } from '@/components/ui/badge';
import { ToolBody } from '@/components/tools/tool-body';
import { ExternalPanel } from '@/components/tools/external-panel';
import { FaqJsonLd, ToolJsonLd } from '@/components/seo/json-ld';
import { ToolExplainerSection } from '@/components/tools/tool-explainer';
import { getExplainer } from '@/lib/tools/explainers';
import { FavouriteButton } from '@/components/tools/favourite-button';
import { RecordVisit } from '@/components/tools/record-visit';
import { getCategory } from '@/lib/tools/categories';
import { getRoutableTools, getTool } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';

interface PageProps {
  params: Promise<{ toolId: string }>;
}

/** Pre-renders one HTML file per live tool at build time. */
export function generateStaticParams() {
  return getRoutableTools().map((tool) => ({ toolId: tool.id }));
}

/**
 * Metadata is derived from the registry, so a tool cannot ship with a missing
 * title or a stale description.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { toolId } = await params;
  const tool = getTool(toolId);
  if (!tool) return {};

  return {
    title: tool.name,
    description: tool.summary,
    alternates: { canonical: absoluteUrl(routes.tool(tool.id)) },
    openGraph: {
      title: `${tool.name} · Biology 101`,
      description: tool.summary,
      url: absoluteUrl(routes.tool(tool.id)),
      type: 'website',
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { toolId } = await params;
  const tool = getTool(toolId);
  if (!tool || tool.status === 'planned' || tool.kind === 'pipeline') notFound();

  const category = getCategory(tool.category);
  const explainer = getExplainer(tool.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <ToolJsonLd tool={tool} />
      {explainer ? <FaqJsonLd faq={explainer.faq} /> : null}
      <RecordVisit toolId={tool.id} />

      <Breadcrumbs
        items={[
          { label: 'Tools', href: routes.catalog() },
          { label: category.name, href: routes.category(category.id) },
          { label: tool.name },
        ]}
      />

      <header className="mt-6">
        <h1 className="text-display">{tool.name}</h1>
        <p className="mt-3 text-lg text-ink-muted">{tool.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ComputeBadge location={tool.computeLocation} />
          <StatusBadge status={tool.status} />
          <FavouriteButton toolId={tool.id} />
        </div>
      </header>

      {/* The tool supplies its own interactive body and Ladder, because both
          the formula and the chosen model change with what the user is solving
          for. Everything around it is shared, so no tool page reinvents its
          own layout. */}
      <section className="mt-8">
        {tool.kind === 'external' ? <ExternalPanel tool={tool} /> : <ToolBody toolId={tool.id} />}
      </section>

      {/*
        The description is not repeated in the body. It serves the meta tag and
        the catalogue card, and the explainer's "when to use this" says the same
        thing better — printing both made the page open with two paragraphs of
        near-identical prose. External tools have no explainer, so they keep it.
      */}
      {explainer ? (
        <ToolExplainerSection explainer={explainer} />
      ) : (
        <section className="mt-10">
          <h2 className="text-xl">About this tool</h2>
          <p className="mt-3 text-ink-muted">{tool.description}</p>
        </section>
      )}

      {tool.relatedToolIds?.length ? (
        <section className="mt-10">
          <h2 className="text-xl">Related tools</h2>
          <ul className="mt-3 space-y-2">
            {tool.relatedToolIds.map((relatedId) => {
              const related = getTool(relatedId);
              if (!related) return null;
              return (
                <li key={relatedId}>
                  <Link href={routes.tool(relatedId)} className="text-brand hover:underline">
                    {related.name}
                  </Link>
                  <span className="text-ink-muted"> — {related.summary}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-sm text-ink-muted">
        Science last reviewed{' '}
        <time dateTime={tool.reviewedAt}>
          {new Date(tool.reviewedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
        .
      </p>
    </div>
  );
}
