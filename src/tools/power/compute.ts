/**
 * Power and sample size.
 *
 * Answers "how many replicates do I need?" — the question biologists get wrong
 * most often, and the one that can only be fixed before the experiment runs.
 *
 * Uses the noncentral t distribution rather than a normal approximation. The
 * approximation is fine at large n and understates the requirement at small n,
 * which is precisely where bench experiments live.
 */

import { noncentralTCdf, tCritical } from '@/lib/stats/distributions';

export type Design = 'two-sample' | 'paired' | 'one-sample';

export class PowerError extends Error {}

export interface PowerInput {
  design: Design;
  /** Standardised effect size: Cohen's d, or dz for a paired design. */
  effectSize: number;
  /** Per group for a two-sample design; total otherwise. */
  n: number;
  alpha: number;
}

export interface PowerResult {
  power: number;
  df: number;
  noncentrality: number;
  criticalT: number;
}

export interface SampleSizeResult {
  /** Per group for a two-sample design; total otherwise. */
  n: number;
  /** Total across both groups, for a two-sample design. */
  totalN: number;
  achievedPower: number;
  /** Power one step below, so the reader can see how sharp the edge is. */
  powerBelow: number;
}

const MAX_N = 100000;

function parameters(design: Design, effectSize: number, n: number) {
  if (design === 'two-sample') {
    return { df: 2 * n - 2, ncp: effectSize * Math.sqrt(n / 2) };
  }
  // Paired and one-sample both reduce to a single sample of differences.
  return { df: n - 1, ncp: effectSize * Math.sqrt(n) };
}

export function computePower(input: PowerInput): PowerResult {
  const { design, effectSize, n, alpha } = input;

  if (!Number.isFinite(effectSize) || effectSize === 0) {
    throw new PowerError('Enter an effect size you would care about detecting.');
  }
  if (!Number.isInteger(n) || n < 2)
    throw new PowerError('n must be a whole number of at least 2.');
  if (alpha <= 0 || alpha >= 1) throw new PowerError('Alpha must lie between 0 and 1.');

  const { df, ncp } = parameters(design, Math.abs(effectSize), n);
  if (df < 1) throw new PowerError('Not enough observations for this design.');

  const criticalT = tCritical(1 - alpha, df);

  // Two-sided: reject in either tail.
  const power = 1 - noncentralTCdf(criticalT, df, ncp) + noncentralTCdf(-criticalT, df, ncp);

  return { power: Math.min(Math.max(power, 0), 1), df, noncentrality: ncp, criticalT };
}

/**
 * Smallest n reaching the target power.
 *
 * Searched by stepping upward rather than solved in closed form: power is a
 * step function of an integer n, so the honest answer is the first integer
 * that clears the bar.
 */
export function requiredSampleSize(
  design: Design,
  effectSize: number,
  targetPower: number,
  alpha = 0.05,
): SampleSizeResult {
  if (targetPower <= 0 || targetPower >= 1) {
    throw new PowerError('Target power must lie between 0 and 1.');
  }
  if (!Number.isFinite(effectSize) || effectSize === 0) {
    throw new PowerError('Enter an effect size you would care about detecting.');
  }

  let n = 2;
  let previous = 0;

  while (n <= MAX_N) {
    const { power } = computePower({ design, effectSize: Math.abs(effectSize), n, alpha });
    if (power >= targetPower) {
      return {
        n,
        totalN: design === 'two-sample' ? n * 2 : n,
        achievedPower: power,
        powerBelow: previous,
      };
    }
    previous = power;
    n += 1;
  }

  throw new PowerError(
    'That effect is too small to detect at any practical sample size. Reconsider the design.',
  );
}
