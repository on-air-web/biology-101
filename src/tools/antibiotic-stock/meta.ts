import type { ToolMeta } from '@/lib/tools/types';

export const antibioticStockMeta: ToolMeta = {
  id: 'antibiotic-stock',
  name: 'Antibiotic stocks and dilutions',
  shortName: 'Antibiotics',
  category: 'lab-calculators',
  summary: 'How much stock to add to a culture, and what to weigh to make the stock.',
  description:
    'Work out the volume of an antibiotic stock to add to a given volume of medium for a target ' +
    'working concentration, and the mass to weigh out to make the stock in the first place. ' +
    'Carries the usual working and stock concentrations for selecting plasmids in E. coli, with ' +
    'the solvent each needs and what tends to go wrong with it — all editable, because a ' +
    'different organism or a low-copy plasmid changes them.',
  keywords: [
    'antibiotic',
    'ampicillin',
    'kanamycin',
    'chloramphenicol',
    'tetracycline',
    'carbenicillin',
    'spectinomycin',
    'gentamicin',
    'selection',
    'working concentration',
    'stock solution',
    'lb agar',
    'plasmid selection',
    'ug/ml',
    'mg/ml',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Working and stock concentrations for bacterial selection',
      source: 'Addgene molecular biology reference',
      url: 'https://www.addgene.org/mol-bio-reference/antibiotics/',
    },
  ],
  relatedToolIds: ['dilution', 'recipe-scaler', 'molarity'],
  reviewedAt: '2026-07-26',
};
