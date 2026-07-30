import type { ToolMeta } from '@/lib/tools/types';

export const agaroseGelMeta: ToolMeta = {
  id: 'agarose-gel',
  name: 'Agarose gel preparation',
  shortName: 'Agarose gel',
  category: 'lab-calculators',
  summary: 'Agarose to weigh for a gel, and which percentage resolves your fragment.',
  description:
    'Weigh the agarose for a gel of a given percentage and volume, and check that the percentage ' +
    'suits what you are trying to separate. The second half is the useful one: the working range ' +
    'of each percentage is a table nobody has to hand, and running a 500 bp product on a 0.7% gel ' +
    'costs an afternoon.',
  keywords: [
    'agarose',
    'gel',
    'electrophoresis',
    'percent gel',
    'w/v',
    'gel percentage',
    'dna gel',
    'fragment size',
    'resolution',
    'tae',
    'tbe',
    'how much agarose',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Agarose percentage and the fragment range it resolves',
      authors: 'Lee PY, Costumbrado J, Hsu CY, Kim YH',
      source: 'Journal of Visualized Experiments',
      year: 2012,
      doi: '10.3791/3923',
    },
  ],
  relatedToolIds: ['recipe-scaler', 'nucleic-acid-quant', 'molarity'],
  reviewedAt: '2026-07-26',
};
