import type { ToolMeta } from '@/lib/tools/types';

export const tTestMeta: ToolMeta = {
  id: 't-test',
  name: 't-test calculator',
  category: 'statistics',
  summary: 'Compare two groups and get the effect size and interval, not just a p-value.',
  description:
    'Runs Welch\u2019s, Student\u2019s, paired t-tests and Mann-Whitney U on pasted data. Leads with ' +
    'the difference between groups and its confidence interval, then the effect size, then the ' +
    'p-value \u2014 because that is the order in which those numbers matter.',
  keywords: [
    't-test',
    'ttest',
    't test',
    'welch',
    'student',
    'paired t-test',
    'mann-whitney',
    'wilcoxon',
    'two groups',
    'p value',
    'effect size',
    'cohens d',
    'hedges g',
    'confidence interval',
    'significance',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Welch\u2019s correction for unequal variances',
      authors: 'Welch, B. L.',
      source: 'Biometrika',
      year: 1947,
      doi: '10.2307/2332510',
      url: 'https://doi.org/10.2307/2332510',
    },
    {
      label: 'Hedges\u2019 small-sample correction to Cohen\u2019s d',
      authors: 'Hedges, L. V.',
      source: 'Journal of Educational Statistics',
      year: 1981,
      doi: '10.3102/10769986006002107',
      url: 'https://doi.org/10.3102/10769986006002107',
    },
  ],
  taskIds: ['compare-two-groups'],
  relatedToolIds: ['multiple-testing'],
  reviewedAt: '2026-07-25',
};
