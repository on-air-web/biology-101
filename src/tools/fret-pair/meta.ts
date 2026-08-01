import type { ToolMeta } from '@/lib/tools/types';
import { KAPPA_SQUARED_PRESETS } from '@/lib/bio/fret';
import { FPBASE_CITATION } from '@/tools/spectra-viewer/meta';

const FORSTER: ToolMeta['citations'][number] = {
  label: 'Förster resonance energy transfer, the original derivation',
  authors: 'Förster T',
  source: 'Annalen der Physik',
  year: 1948,
  doi: '10.1002/andp.19484370105',
};

const LAKOWICZ = {
  label: 'Förster radius, the overlap integral and the orientation factor',
  authors: 'Lakowicz JR',
  source: 'Principles of Fluorescence Spectroscopy, 3rd edition',
  year: 2006,
  doi: '10.1007/978-0-387-46312-4',
};

export const fretPairMeta: ToolMeta = {
  id: 'fret-pair',
  name: 'FRET pair calculator',
  shortName: 'FRET pairs',
  category: 'imaging',
  summary: 'Förster radius from real spectra, and the artefacts that will spoil the measurement.',
  description:
    'Compute the spectral overlap integral and Förster radius for any donor and acceptor in the ' +
    'catalogue, see transfer efficiency against separation, and read the two artefacts that ' +
    'actually sink an intensity-based FRET experiment: direct excitation of the acceptor by the ' +
    'donor line, and donor emission leaking into the acceptor channel.',
  keywords: [
    'fret',
    'forster',
    'förster',
    'resonance energy transfer',
    'forster radius',
    'r0',
    'overlap integral',
    'transfer efficiency',
    'donor acceptor',
    'kappa squared',
    'orientation factor',
    'flim',
    'biosensor',
    'protein interaction',
    'smfret',
    'cfp yfp',
    'molecular ruler',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [FORSTER, LAKOWICZ, FPBASE_CITATION],
  /**
   * The orientation factor is the model here: it is the input nobody measures
   * and everybody assumes, and the assumption changes the answer.
   */
  models: KAPPA_SQUARED_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    guidance: preset.guidance,
    citation: LAKOWICZ,
    isDefault: preset.id === 'dynamic',
  })),
  relatedToolIds: ['spectra-viewer', 'filter-compatibility', 'fluorophore-brightness'],
  reviewedAt: '2026-07-31',
};
