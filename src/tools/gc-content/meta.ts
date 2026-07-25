import type { ToolMeta } from '@/lib/tools/types';

export const gcContentMeta: ToolMeta = {
  id: 'gc-content',
  name: 'GC content calculator',
  category: 'molecular-biology',
  summary: 'Measure GC content and base composition of a nucleotide sequence.',
  description:
    'Calculate GC content as a percentage of assignable positions, along with a full base ' +
    'count. Ambiguous positions are reported separately rather than folded into the ' +
    'denominator, because a GC value computed over positions that could go either way is not ' +
    'a GC value.',
  keywords: [
    'gc content',
    'gc',
    'gc percentage',
    'gc%',
    'at content',
    'base composition',
    'nucleotide composition',
    'gc skew',
  ],
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'IUPAC nucleotide ambiguity codes',
      authors: 'Cornish-Bowden, A.',
      source: 'Nucleic Acids Research',
      year: 1985,
      doi: '10.1093/nar/13.9.3021',
      url: 'https://doi.org/10.1093/nar/13.9.3021',
    },
  ],
  relatedToolIds: ['reverse-complement', 'translate'],
  reviewedAt: '2026-07-25',
};
