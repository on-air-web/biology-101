import type { ToolMeta } from '@/lib/tools/types';
import { absoluteUrl, routes } from '@/lib/routes';
import { getCategory } from '@/lib/tools/categories';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated from the registry, never authored by
      // hand, so it cannot drift from what the page actually says.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ToolJsonLd({ tool }: { tool: ToolMeta }) {
  const category = getCategory(tool.category);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.name,
          description: tool.summary,
          url: absoluteUrl(routes.tool(tool.id)),
          applicationCategory: 'EducationalApplication',
          applicationSubCategory: category.name,
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          citation: tool.citations.map((citation) => ({
            '@type': 'CreativeWork',
            name: citation.label,
            ...(citation.doi ? { identifier: `https://doi.org/${citation.doi}` } : {}),
            ...(citation.url ? { url: citation.url } : {}),
          })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { name: 'Tools', item: absoluteUrl(routes.catalog()) },
            { name: category.name, item: absoluteUrl(routes.category(category.id)) },
            { name: tool.name, item: absoluteUrl(routes.tool(tool.id)) },
          ].map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: entry.name,
            item: entry.item,
          })),
        }}
      />
    </>
  );
}

export function CatalogJsonLd({ tools }: { tools: readonly ToolMeta[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Biology 101 tools',
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.name,
          url: absoluteUrl(routes.tool(tool.id)),
        })),
      }}
    />
  );
}

/**
 * FAQPage markup for a tool's questions.
 *
 * The same text that is on the page — this describes the content, it does not
 * add any. Search engines surface these directly, which is how someone with a
 * one-line question finds a tool they did not know the name of.
 */
export function FaqJsonLd({ faq }: { faq: readonly { question: string; answer: string }[] }) {
  if (faq.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
          })),
        }),
      }}
    />
  );
}
