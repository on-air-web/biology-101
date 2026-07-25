import type { ToolMeta } from '@/lib/tools/types';

export const reverseComplementMeta: ToolMeta = {
  id: 'reverse-complement',
  name: 'Reverse complement',
  category: 'molecular-biology',
  summary: 'Generate the reverse, complement or reverse complement of a sequence.',
  description:
    'Convert a DNA or RNA sequence into its reverse, complement or reverse complement. ' +
    'IUPAC ambiguity codes are complemented properly rather than discarded, so degenerate ' +
    'primer sequences survive the conversion intact.',
  keywords: [
    'reverse complement',
    'revcomp',
    'rev comp',
    'complement',
    'antisense',
    'reverse strand',
    'dna',
    'rna',
    'primer',
  ],
  kind: 'builtin',
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
  relatedToolIds: ['gc-content', 'translate'],
  reviewedAt: '2026-07-25',
};
