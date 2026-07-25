import type { ToolMeta } from '@/lib/tools/types';

export const serialDilutionMeta: ToolMeta = {
  id: 'serial-dilution',
  name: 'Serial dilution calculator',
  category: 'lab-calculators',
  summary: 'Plan a dilution series and get the transfer volume for every step.',
  description:
    'Generate a full serial dilution plan: the concentration in each tube, how much to carry ' +
    'over, and how much diluent to pre-load. Transfers too small to pipette accurately are ' +
    'flagged rather than left for you to discover at the bench.',
  keywords: [
    'serial dilution',
    'dilution series',
    'twofold',
    '2-fold',
    'tenfold',
    '10-fold',
    'log dilution',
    'titration series',
    'standard curve',
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
  relatedToolIds: ['dilution', 'molarity'],
  reviewedAt: '2026-07-25',
};
