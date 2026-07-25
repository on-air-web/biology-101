import type { ToolMeta } from '@/lib/tools/types';

export const dilutionMeta: ToolMeta = {
  id: 'dilution',
  name: 'Dilution calculator',
  category: 'lab-calculators',
  summary: 'Work out how much stock and diluent to combine for a target concentration.',
  description:
    'Solve C₁V₁ = C₂V₂ for whichever term you are missing, and see the volume of diluent to ' +
    'add alongside the dilution factor.',
  keywords: [
    'dilution',
    'c1v1',
    'c1v1=c2v2',
    'dilute',
    'stock',
    'diluent',
    'working solution',
    'dilution factor',
    'how much stock',
  ],
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Conservation of amount of substance on dilution',
      source: 'IUPAC Compendium of Chemical Terminology (the Gold Book)',
      year: 2019,
      doi: '10.1351/goldbook',
      url: 'https://goldbook.iupac.org/terms/view/D01737',
    },
  ],
  relatedToolIds: ['serial-dilution', 'molarity', 'molecular-weight'],
  reviewedAt: '2026-07-25',
};
