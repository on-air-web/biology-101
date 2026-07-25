import type { MetadataRoute } from 'next';
import { getLiveTools } from '@/lib/tools/registry';
import { CATEGORIES } from '@/lib/tools/categories';
import { absoluteUrl, routes } from '@/lib/routes';

/* Static export needs this stated explicitly; without it the route is treated
 * as dynamic and the build fails. */
export const dynamic = 'force-static';

/** Derived from the registry: a new tool is indexed without touching this file. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl(routes.home()), priority: 1 },
    { url: absoluteUrl(routes.catalog()), priority: 0.8 },
    { url: absoluteUrl(routes.directory()), priority: 0.8 },
    { url: absoluteUrl(routes.about()), priority: 0.4 },
    { url: absoluteUrl(routes.credits()), priority: 0.2 },
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(routes.category(category.id)),
      priority: 0.6,
    })),
    ...getLiveTools().map((tool) => ({
      url: absoluteUrl(routes.tool(tool.id)),
      lastModified: tool.reviewedAt,
      priority: 0.9,
    })),
  ];
}
