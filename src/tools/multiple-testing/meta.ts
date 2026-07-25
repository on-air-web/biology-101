import type { ToolMeta } from '@/lib/tools/types';

export const multipleTestingMeta: ToolMeta = {
  id: 'multiple-testing',
  name: 'Multiple testing correction',
  category: 'statistics',
  summary: 'Adjust a list of p-values by Benjamini\u2013Hochberg or Bonferroni.',
  description:
    'Paste a column of p-values and get adjusted values, with a count of how many results survive ' +
    'correction. Benjamini\u2013Hochberg controls the false discovery rate; Bonferroni controls ' +
    'the chance of any false positive at all.',
  keywords: [
    'multiple testing',
    'multiple comparisons',
    'bonferroni',
    'benjamini-hochberg',
    'benjamini hochberg',
    'fdr',
    'false discovery rate',
    'q value',
    'adjusted p value',
    'p.adjust',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Controlling the false discovery rate',
      authors: 'Benjamini, Y. & Hochberg, Y.',
      source: 'Journal of the Royal Statistical Society B',
      year: 1995,
      doi: '10.1111/j.2517-6161.1995.tb02031.x',
      url: 'https://doi.org/10.1111/j.2517-6161.1995.tb02031.x',
    },
  ],
  taskIds: ['multiple-testing'],
  relatedToolIds: ['t-test'],
  reviewedAt: '2026-07-25',
};
