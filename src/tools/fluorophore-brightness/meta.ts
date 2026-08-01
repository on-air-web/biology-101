import type { ToolMeta } from '@/lib/tools/types';
import { FPBASE_CITATION } from '@/tools/spectra-viewer/meta';

export const fluorophoreBrightnessMeta: ToolMeta = {
  id: 'fluorophore-brightness',
  name: 'Fluorophore brightness comparison',
  shortName: 'Brightness',
  category: 'imaging',
  summary: 'Rank fluorophores by what your setup will actually detect, not by ε × Φ alone.',
  description:
    'Compare fluorescent proteins and dyes on molecular brightness — the extinction coefficient ' +
    'times the quantum yield — and then on what your own laser line and emission filter will ' +
    'actually collect from each. The two rankings disagree more often than not, which is why a ' +
    'brighter molecule so often gives a darker image. Photobleaching half-lives are shown beside ' +
    'them and pointedly not ranked.',
  keywords: [
    'brightness',
    'fluorophore brightness',
    'extinction coefficient',
    'quantum yield',
    'molecular brightness',
    'photostability',
    'photobleaching',
    'bleaching',
    'fluorescent protein comparison',
    'which fluorophore',
    'signal to noise',
    'dim',
    'bright',
    'mneongreen',
    'mscarlet',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    FPBASE_CITATION,
    {
      label:
        'Side-by-side comparison of fluorescent protein brightness and photostability in cells',
      authors: 'Cranfill PJ, Sell BR, Baird MA, et al.',
      source: 'Nature Methods',
      year: 2016,
      doi: '10.1038/nmeth.3891',
    },
    {
      label: 'Choosing a fluorescent protein, and how photostability is measured',
      authors: 'Shaner NC, Steinbach PA, Tsien RY',
      source: 'Nature Methods',
      year: 2005,
      doi: '10.1038/nmeth819',
    },
  ],
  relatedToolIds: ['spectra-viewer', 'filter-compatibility', 'fret-pair'],
  reviewedAt: '2026-07-31',
};
