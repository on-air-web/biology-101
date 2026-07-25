import type { ToolMeta } from '@/lib/tools/types';

export const molecularWeightMeta: ToolMeta = {
  id: 'molecular-weight',
  name: 'Molecular weight calculator',
  category: 'lab-calculators',
  summary: 'Compute molar mass from a chemical formula, including hydrates.',
  description:
    'Parse a chemical formula and sum standard atomic weights to give molar mass in g/mol. ' +
    'Nested groups and hydrates are supported, so formulae can be pasted straight from a ' +
    'supplier catalogue.',
  keywords: [
    'molecular weight',
    'mw',
    'molar mass',
    'formula weight',
    'fw',
    'relative molecular mass',
    'mr',
    'g/mol',
    'chemical formula',
    'hydrate',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Standard atomic weights of the elements 2021',
      authors: 'Prohaska, T. et al.',
      source: 'Pure and Applied Chemistry',
      year: 2021,
      doi: '10.1515/pac-2019-0603',
      url: 'https://doi.org/10.1515/pac-2019-0603',
    },
  ],
  relatedToolIds: ['molarity', 'dilution'],
  reviewedAt: '2026-07-25',
};
