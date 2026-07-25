import type { ToolMeta } from '@/lib/tools/types';

export const molarityMeta: ToolMeta = {
  id: 'molarity',
  name: 'Molarity calculator',
  category: 'lab-calculators',
  summary: 'Convert between mass, molar concentration and volume for a solution.',
  description:
    'Calculate how much of a compound to weigh out for a target concentration and volume, ' +
    'or work backwards from a known mass. Solves for mass, concentration or volume using the ' +
    'relationship between moles, molar mass and volume.',
  keywords: [
    'molarity',
    'molar',
    'concentration',
    'mol/L',
    'mM',
    'uM',
    'nM',
    'moles',
    'stock solution',
    'how much to weigh',
    'mass to concentration',
  ],
  kind: 'builtin',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Definition of amount-of-substance concentration (molarity)',
      source: 'IUPAC Compendium of Chemical Terminology (the Gold Book)',
      year: 2019,
      doi: '10.1351/goldbook',
      url: 'https://goldbook.iupac.org/terms/view/A00295',
    },
  ],
  reviewedAt: '2026-07-25',
};
