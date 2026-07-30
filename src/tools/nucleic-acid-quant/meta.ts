import type { ToolMeta } from '@/lib/tools/types';

export const nucleicAcidQuantMeta: ToolMeta = {
  id: 'nucleic-acid-quant',
  name: 'DNA and RNA quantification',
  shortName: 'A260 quant',
  category: 'lab-calculators',
  summary: 'Concentration and purity from A260, with the conversion factor made explicit.',
  description:
    'Turn a spectrophotometer reading into a concentration in ng/µL or µg/mL, corrected for the ' +
    'dilution you made and the path length your instrument uses. The factor differs for ' +
    'double-stranded DNA, single-stranded DNA and RNA, so it is a choice rather than a constant. ' +
    'Reports the 260/280 and 260/230 purity ratios and says what a low one means, because ' +
    'concentration alone cannot tell a clean prep from one carrying phenol.',
  keywords: [
    'dna concentration',
    'rna concentration',
    'a260',
    'nanodrop',
    'ng/ul',
    'purity ratio',
    '260/280',
    '260/230',
    'spectrophotometer',
    'nucleic acid quantification',
    'dna yield',
    'phenol contamination',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Purity ratios and what shifts them',
      authors: 'Wilfinger WW, Mackey K, Chomczynski P',
      source: 'BioTechniques',
      year: 1997,
      doi: '10.2144/97223st01',
    },
  ],
  relatedToolIds: ['dilution', 'molarity', 'protein-parameters'],
  reviewedAt: '2026-07-26',
};
