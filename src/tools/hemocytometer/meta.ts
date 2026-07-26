import type { ToolMeta } from '@/lib/tools/types';
import { CHAMBERS } from './chambers';

const chamberCitation = {
  label: 'Counting accuracy in a Neubauer chamber',
  authors: 'Zhang M, Gu L, Zheng P, Chen Z',
  source: 'Journal of Clinical Laboratory Analysis',
  year: 2019,
  doi: '10.1002/jcla.23024',
};

export const hemocytometerMeta: ToolMeta = {
  id: 'hemocytometer',
  name: 'Haemocytometer calculator',
  shortName: 'Cell counting',
  category: 'cell-biology',
  summary: 'Turn a chamber count into cells per millilitre, with the counting error stated.',
  description:
    'Convert a haemocytometer count into cells per millilitre for any chamber depth, with ' +
    'trypan blue viability, and see the confidence interval that the number of cells you ' +
    'counted actually supports. Counting is a Poisson process: 100 cells is roughly ±20%, and ' +
    'the tool says how many more to count for the precision you want.',
  keywords: [
    'hemocytometer',
    'haemocytometer',
    'cell counting',
    'cell count',
    'neubauer',
    'counting chamber',
    'trypan blue',
    'viability',
    'cells per ml',
    'fuchs rosenthal',
    'counting error',
    'burker',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Exact confidence limits for a Poisson count',
      authors: 'Garwood F',
      source: 'Biometrika',
      year: 1936,
      doi: '10.1093/biomet/28.3-4.437',
    },
    {
      label: 'Score interval for a proportion, used for viability',
      authors: 'Wilson EB',
      source: 'Journal of the American Statistical Association',
      year: 1927,
      doi: '10.1080/01621459.1927.10502953',
    },
    {
      label: 'Trypan blue exclusion test of cell viability',
      authors: 'Strober W',
      source: 'Current Protocols in Immunology',
      year: 1997,
      doi: '10.1002/0471142735.ima03bs21',
    },
    chamberCitation,
  ],
  /** The chamber decides the volume a count refers to, so it is declared. */
  models: CHAMBERS.map((chamber, index) => ({
    id: chamber.id,
    name: chamber.name,
    guidance: chamber.note,
    citation: chamberCitation,
    isDefault: index === 0,
  })),
  relatedToolIds: ['cell-seeding', 'od600', 'cell-doubling-time'],
  reviewedAt: '2026-07-26',
};
