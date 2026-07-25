import type { Metadata } from 'next';
import { CatalogBrowser } from '@/components/catalog/catalog-browser';
import { CatalogJsonLd } from '@/components/seo/json-ld';
import { getLiveTools } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'All tools',
  description:
    'Every calculator, sequence tool and laboratory utility on Biology 101, grouped by category.',
  alternates: { canonical: absoluteUrl(routes.catalog()) },
};

export default function CatalogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <CatalogJsonLd tools={getLiveTools()} />
      <h1 className="text-display">All tools</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-muted">
        Everything in one place. Each tool shows the formula it uses and runs in your browser.
      </p>
      <div className="mt-8">
        <CatalogBrowser />
      </div>
    </div>
  );
}
