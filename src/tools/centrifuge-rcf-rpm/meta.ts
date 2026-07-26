import type { ToolMeta } from '@/lib/tools/types';

export const centrifugeMeta: ToolMeta = {
  id: 'centrifuge-rcf-rpm',
  name: 'Centrifuge RCF and RPM converter',
  shortName: 'RCF / RPM',
  category: 'lab-calculators',
  summary: 'Convert between relative centrifugal field and rotor speed, for a stated radius.',
  description:
    'Convert × g to rpm and back for your rotor, and see how far the field varies along the ' +
    'tube — the bottom commonly experiences twice the force of the top, which is why two labs ' +
    'following the same protocol can disagree. Also converts a run time between rotors using ' +
    'the clearing factor.',
  keywords: [
    'rcf',
    'rpm',
    'centrifuge',
    'relative centrifugal force',
    'relative centrifugal field',
    'g force',
    'times g',
    'xg',
    'rotor',
    'rotor radius',
    'spin speed',
    'k factor',
    'clearing factor',
    'rcf to rpm',
    'rpm to rcf',
    'convert g to rpm',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'Sedimentation in a centrifugal field, and the clearing factor derived from it',
      authors: 'Svedberg T, Rinde H',
      source: 'Journal of the American Chemical Society',
      year: 1924,
      doi: '10.1021/ja01677a011',
    },
    {
      label: 'Standard gravity, 9.80665 m/s², as fixed by the CGPM',
      source: '3rd General Conference on Weights and Measures, Resolution 2 (BIPM)',
      year: 1901,
      url: 'https://www.bipm.org/en/committees/cg/cgpm/3-1901/resolution-2',
    },
  ],
  relatedToolIds: ['od600'],
  reviewedAt: '2026-07-26',
};
