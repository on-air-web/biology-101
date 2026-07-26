import type { ToolMeta } from '@/lib/tools/types';

export const cellSeedingMeta: ToolMeta = {
  id: 'cell-seeding',
  name: 'Cell seeding density calculator',
  shortName: 'Cell seeding',
  category: 'cell-biology',
  summary: 'Work out the suspension and medium to seed a plate or flask at a target density.',
  description:
    'Convert a seeding density in cells per square centimetre into the volumes to pipette, for ' +
    'standard plates, dishes and flasks. Prepare one master mix and dispense it, or dose each ' +
    'vessel directly, with an overage allowance and a warning when the volume is too small to ' +
    'pipette reliably.',
  keywords: [
    'cell seeding',
    'seeding density',
    'cells per cm2',
    'plate cells',
    'split cells',
    'subculture',
    'passage',
    'master mix',
    'cell culture',
    'well plate',
    'flask',
    'confluency',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Basic techniques for mammalian cell tissue culture',
      authors: 'Phelan MC',
      source: 'Current Protocols in Cell Biology',
      year: 1998,
      doi: '10.1002/0471143030.cb0101s00',
    },
  ],
  relatedToolIds: ['hemocytometer', 'dilution', 'od600'],
  reviewedAt: '2026-07-26',
};
