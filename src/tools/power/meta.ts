import type { ToolMeta } from '@/lib/tools/types';

export const powerMeta: ToolMeta = {
  id: 'power',
  name: 'Power and sample size',
  category: 'statistics',
  summary: 'How many replicates you need — worked out before the experiment, not after.',
  description:
    'Calculates the sample size required to detect an effect, or the power you have at a given n. ' +
    'Uses the noncentral t distribution rather than a normal approximation, which matters most at ' +
    'the small sample sizes bench experiments actually run at.',
  keywords: [
    'power analysis',
    'sample size',
    'how many replicates',
    'how many samples',
    'n',
    'statistical power',
    'gpower',
    'effect size',
    'cohens d',
    'underpowered',
    'beta',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Cumulative distribution function of the noncentral t',
      authors: 'Lenth, R. V.',
      source: 'Applied Statistics',
      year: 1989,
      doi: '10.2307/2347693',
      url: 'https://doi.org/10.2307/2347693',
    },
    {
      label: 'Conventional small, medium and large effect sizes',
      authors: 'Cohen, J.',
      source: 'Statistical Power Analysis for the Behavioral Sciences',
      year: 1988,
      url: 'https://doi.org/10.4324/9780203771587',
    },
  ],
  taskIds: ['sample-size'],
  relatedToolIds: ['t-test', 'anova'],
  reviewedAt: '2026-07-25',
};
