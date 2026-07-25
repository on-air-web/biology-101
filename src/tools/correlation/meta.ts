import type { ToolMeta } from '@/lib/tools/types';

export const correlationMeta: ToolMeta = {
  id: 'correlation',
  name: 'Correlation and regression',
  category: 'statistics',
  summary: 'Pearson or Spearman with a confidence interval on r, plus a fitted line.',
  description:
    'Correlate two variables and fit a straight line through them. Reports r with its confidence ' +
    'interval \u2014 the part most calculators omit, and the part that distinguishes r = 0.6 from ' +
    'eight points from r = 0.6 from eight hundred.',
  keywords: [
    'correlation',
    'pearson',
    'spearman',
    'regression',
    'linear regression',
    'least squares',
    'r squared',
    'slope',
    'scatter',
    'trend line',
    'rho',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Fisher\u2019s z transformation for intervals on r',
      authors: 'Fisher, R. A.',
      source: 'Metron',
      year: 1921,
      url: 'https://digital.library.adelaide.edu.au/dspace/handle/2440/15169',
    },
  ],
  taskIds: ['correlation-regression'],
  relatedToolIds: ['t-test', 'anova'],
  reviewedAt: '2026-07-25',
};
