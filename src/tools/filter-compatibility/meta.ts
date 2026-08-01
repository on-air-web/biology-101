import type { ToolMeta } from '@/lib/tools/types';
import { FPBASE_CITATION } from '@/tools/spectra-viewer/meta';

export const filterCompatibilityMeta: ToolMeta = {
  id: 'filter-compatibility',
  name: 'Filter set and channel checker',
  shortName: 'Filter sets',
  category: 'imaging',
  summary: 'Check a multi-colour panel against your filters before you stain anything.',
  description:
    'Describe the channels on your microscope — laser line or excitation filter, dichroic, ' +
    'emission filter — and see how much of each fluorophore each channel actually collects, and ' +
    'how much lands in the wrong one. Reports bleed-through as a property of the molecule and the ' +
    'optics, independent of expression level, and names the pairs no filter can separate.',
  keywords: [
    'filter set',
    'filter cube',
    'bleed through',
    'bleedthrough',
    'crosstalk',
    'cross talk',
    'spectral overlap',
    'compensation',
    'dichroic',
    'bandpass',
    'longpass',
    'emission filter',
    'excitation filter',
    'multiplexing',
    'panel design',
    'flow cytometry',
    'confocal',
    'channel',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    FPBASE_CITATION,
    {
      label: 'Bleed-through, filter choice and the controls a multi-colour experiment needs',
      authors: 'North AJ',
      source: 'Journal of Cell Biology',
      year: 2006,
      doi: '10.1083/jcb.200507103',
    },
  ],
  models: [
    {
      id: 'ideal-passband',
      name: 'Idealised passband',
      guidance:
        'Filters are modelled from their designation: a raised-cosine edge over 1% of the edge wavelength, 95% peak transmission and no out-of-band leakage. Real parts block to OD5 or better, so in-band spectral overlap dominates and this holds up; it will understate cross-talk from a scratched or badly angled filter.',
      citation: {
        label: 'What a filter designation means, and how a cube is put together',
        source: 'Evident (Olympus) Microscope Resource Center, Fluorescence Filters',
        url: 'https://evidentscientific.com/en/microscope-resource/knowledge-hub/techniques/fluorescence/filters',
      },
      isDefault: true,
    },
  ],
  relatedToolIds: ['spectra-viewer', 'fluorophore-brightness', 'fret-pair'],
  reviewedAt: '2026-07-31',
};
