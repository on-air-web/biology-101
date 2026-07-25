import type { ToolMeta } from '@/lib/tools/types';

export const anovaMeta: ToolMeta = {
  id: 'anova',
  name: 'One-way ANOVA',
  category: 'statistics',
  summary: 'Compare three or more groups, with variance explained and every pair tested.',
  description:
    'Runs one-way ANOVA on pasted groups and reports the proportion of variance explained before ' +
    'the p-value. Follows up with every pairwise comparison by Welch\u2019s t-test, corrected ' +
    'together using Holm\u2019s method.',
  keywords: [
    'anova',
    'one-way anova',
    'f test',
    'three groups',
    'multiple groups',
    'post hoc',
    'holm',
    'eta squared',
    'omega squared',
    'variance explained',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Holm\u2019s sequentially rejective multiple test procedure',
      authors: 'Holm, S.',
      source: 'Scandinavian Journal of Statistics',
      year: 1979,
      url: 'https://www.jstor.org/stable/4615733',
    },
    {
      label: 'Welch\u2019s correction for unequal variances',
      authors: 'Welch, B. L.',
      source: 'Biometrika',
      year: 1947,
      doi: '10.2307/2332510',
      url: 'https://doi.org/10.2307/2332510',
    },
  ],
  taskIds: ['compare-many-groups'],
  relatedToolIds: ['t-test', 'multiple-testing'],
  reviewedAt: '2026-07-25',
};
