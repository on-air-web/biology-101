import type { ToolCategoryId } from './tools/types';

/**
 * Every internal URL is built here. Links then cannot drift from the registry,
 * and a future change to the URL scheme is one file rather than a grep.
 */
export const routes = {
  home: () => '/',
  catalog: () => '/tools',
  tool: (toolId: string) => `/tools/${toolId}`,
  tasks: () => '/tasks',
  task: (taskId: string) => `/tasks/${taskId}`,
  category: (categoryId: ToolCategoryId) => `/categories/${categoryId}`,
  directory: () => '/directory',
  about: () => '/about',
  credits: () => '/credits',
} as const;

/** Absolute origin, used for canonical URLs, sitemap and social metadata. */
/**
 * Set NEXT_PUBLIC_SITE_URL in the deployment environment. The fallback matches
 * a Cloudflare Pages project named `biology-101`, so canonical URLs and the
 * sitemap are correct out of the box before a custom domain exists.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biology-101.pages.dev';

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
