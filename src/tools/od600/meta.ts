import type { ToolMeta } from '@/lib/tools/types';
import { ORGANISMS } from './organisms';

const bioNumbers = {
  label: 'Cells per millilitre at OD600 = 1.0',
  authors: 'Milo R, Jorgensen P, Moran U, Weber G, Springer M',
  source: 'BioNumbers, Nucleic Acids Research',
  year: 2010,
  doi: '10.1093/nar/gkp889',
};

export const od600Meta: ToolMeta = {
  id: 'od600',
  name: 'OD600 calculator',
  category: 'cell-biology',
  summary: 'Convert optical density to cell density and plan culture dilutions.',
  description:
    'Turn an OD600 reading into cells per millilitre, correcting for the dilution you read on ' +
    'and the path length of the cuvette or plate well, and work out the volumes to dilute a ' +
    'culture to a target density. The linearity of the reading is checked against what the ' +
    'instrument actually saw rather than the corrected figure.',
  keywords: [
    'od600',
    'optical density',
    'cell density',
    'cells per ml',
    'bacterial growth',
    'spectrophotometer',
    'plate reader',
    'turbidity',
    'culture dilution',
    'back dilution',
    'inoculate',
    'path length',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    bioNumbers,
    {
      label: 'Path length and scattering in optical density measurements',
      authors: 'Myers JA, Curtis BS, Curtis WR',
      source: 'BMC Biophysics',
      year: 2013,
      doi: '10.1186/2046-1682-6-4',
    },
    {
      label: 'Non-linearity of optical density in microplate readers',
      authors: 'Stevenson K, McVey AF, Clark IBN, Swain PS, Pilizota T',
      source: 'Scientific Reports',
      year: 2016,
      doi: '10.1038/srep38828',
    },
  ],
  /**
   * The organism is the model here: it is the choice that changes the answer,
   * so it is declared rather than buried in a constant.
   */
  models: ORGANISMS.map((organism, index) => ({
    id: organism.id,
    name: organism.name,
    guidance: organism.note,
    citation: bioNumbers,
    isDefault: index === 0,
  })),
  relatedToolIds: ['dilution', 'serial-dilution', 'cell-doubling-time', 'centrifuge-rcf-rpm'],
  reviewedAt: '2026-07-26',
};
