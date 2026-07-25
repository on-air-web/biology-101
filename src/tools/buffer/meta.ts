import type { ToolMeta } from '@/lib/tools/types';

export const bufferMeta: ToolMeta = {
  id: 'buffer-preparation',
  name: 'Buffer preparation',
  category: 'lab-calculators',
  summary: 'What to weigh out for a buffer, with the pKa corrected for temperature.',
  description:
    'Calculates the masses needed for a buffer at a chosen pH, concentration and volume, using a ' +
    'pKa corrected to the temperature you are working at. Tells you how far the pH will drift if ' +
    'you adjust it on the bench and use it in the cold room \u2014 which for Tris is more than half ' +
    'a pH unit.',
  keywords: [
    'buffer',
    'buffer preparation',
    'buffer recipe',
    'ph',
    'henderson hasselbalch',
    'pka',
    'tris',
    'hepes',
    'phosphate',
    'pbs',
    'mes',
    'mops',
    'pipes',
    'acetate',
    'temperature',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Hydrogen ion buffers for biological research',
      authors: 'Good, N. E. et al.',
      source: 'Biochemistry',
      year: 1966,
      doi: '10.1021/bi00866a011',
      url: 'https://doi.org/10.1021/bi00866a011',
    },
    {
      label: 'The Henderson\u2013Hasselbalch relationship',
      authors: 'Po, H. N. & Senozan, N. M.',
      source: 'Journal of Chemical Education',
      year: 2001,
      doi: '10.1021/ed078p1499',
      url: 'https://doi.org/10.1021/ed078p1499',
    },
  ],
  taskIds: [],
  relatedToolIds: ['molarity', 'molecular-weight', 'dilution'],
  reviewedAt: '2026-07-25',
};
