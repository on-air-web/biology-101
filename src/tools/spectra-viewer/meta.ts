import type { Citation, ToolMeta } from '@/lib/tools/types';

export const FPBASE_CITATION: Citation = {
  label: 'Fluorophore spectra, extinction coefficients and quantum yields',
  authors: 'Lambert TJ',
  source: 'FPbase, Nature Methods',
  year: 2019,
  doi: '10.1038/s41592-019-0352-8',
};

export const spectraViewerMeta: ToolMeta = {
  id: 'spectra-viewer',
  name: 'Fluorescence spectra viewer',
  shortName: 'Spectra viewer',
  category: 'imaging',
  summary: 'Overlay excitation and emission spectra and see which pairs will separate.',
  description:
    'Plot the excitation and emission spectra of up to six fluorescent proteins and dyes together, ' +
    'read off how strongly each is excited by the laser lines on your microscope, and see which ' +
    'pairs overlap too far to be told apart by filters. Spectra come from FPbase; the tool names ' +
    'the pairs that will need unmixing rather than leaving you to judge two curves by eye.',
  keywords: [
    'spectra viewer',
    'fluorescence spectra',
    'excitation emission',
    'fluorophore',
    'fluorescent protein',
    'gfp',
    'mcherry',
    'alexa fluor',
    'stokes shift',
    'spectral overlap',
    'bleed through',
    'crosstalk',
    'laser line',
    'fpbase',
    'microscopy',
    'confocal',
    'flow cytometry panel',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    FPBASE_CITATION,
    {
      label: 'Fluorescent protein properties and the trade-offs between them',
      authors: 'Cranfill PJ, Sell BR, Baird MA, et al.',
      source: 'Nature Methods',
      year: 2016,
      doi: '10.1038/nmeth.3891',
    },
  ],
  relatedToolIds: ['filter-compatibility', 'fret-pair', 'fluorophore-brightness'],
  reviewedAt: '2026-07-31',
};
