import type { ToolMeta } from '@/lib/tools/types';

export const contingencyMeta: ToolMeta = {
  id: 'contingency',
  name: 'Chi-square and Fisher\u2019s exact',
  category: 'statistics',
  summary: 'Compare counts across categories, with the odds ratio and its interval.',
  description:
    'Tests a contingency table of counts. Chi-square with Yates\u2019 correction on 2\u00d72 tables, ' +
    'and Fisher\u2019s exact test recommended automatically when expected counts fall below five \u2014 ' +
    'which is most bench data.',
  keywords: [
    'chi-square',
    'chi squared',
    'chisq',
    'fisher exact',
    'contingency table',
    'proportions',
    'counts',
    'categorical',
    'odds ratio',
    'cramers v',
    '2x2',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'The exact test for a 2\u00d72 table',
      authors: 'Fisher, R. A.',
      source: 'Journal of the Royal Statistical Society',
      year: 1922,
      doi: '10.2307/2340521',
      url: 'https://doi.org/10.2307/2340521',
    },
    {
      label: 'Continuity correction for the chi-square test',
      authors: 'Yates, F.',
      source: 'Supplement to the Journal of the Royal Statistical Society',
      year: 1934,
      doi: '10.2307/2983604',
      url: 'https://doi.org/10.2307/2983604',
    },
  ],
  taskIds: ['categorical-counts'],
  relatedToolIds: ['t-test'],
  reviewedAt: '2026-07-25',
};
