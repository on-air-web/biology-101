/**
 * Site-level configuration.
 *
 * The two values here are the only things that differ between a fork and the
 * canonical deployment, so they live in one place rather than being scattered
 * through components.
 */
export const SITE = {
  name: 'Biology 101',
  tagline: 'Calculators, sequence tools and laboratory utilities for biology, in one place.',

  /**
   * Public repository. Set NEXT_PUBLIC_REPO_URL in the deployment environment,
   * or replace the fallback below with your own URL. When it is unset the
   * source links are hidden rather than rendered as dead links.
   */
  repoUrl: process.env.NEXT_PUBLIC_REPO_URL ?? undefined,
} as const;
