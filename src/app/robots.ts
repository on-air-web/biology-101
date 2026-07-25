import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/routes';

/* Static export needs this stated explicitly; without it the route is treated
 * as dynamic and the build fails. */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
