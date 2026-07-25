import type { ToolMeta } from '@/lib/tools/types';
import { GENETIC_CODES } from '@/lib/genetic-code';

const NCBI_CITATION = {
  label: 'Genetic code tables',
  source: 'NCBI Taxonomy',
  year: 2024,
  url: 'https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi',
};

export const translateMeta: ToolMeta = {
  id: 'translate',
  name: 'DNA translation',
  category: 'molecular-biology',
  summary: 'Translate a nucleotide sequence into protein in any reading frame.',
  description:
    'Translate DNA or RNA across all six reading frames using a selectable genetic code. ' +
    'Trailing partial codons are dropped rather than padded, and ambiguous codons translate ' +
    'to X rather than to a guess.',
  keywords: [
    'translation',
    'translate',
    'dna to protein',
    'codon',
    'reading frame',
    'six frame',
    'orf',
    'protein sequence',
    'genetic code',
  ],
  kind: 'builtin',
  status: 'stable',
  computeLocation: 'client',
  citations: [NCBI_CITATION],
  models: GENETIC_CODES.map((code, index) => ({
    id: code.id,
    name: `${code.name} (NCBI table ${code.ncbiId})`,
    guidance:
      code.id === 'standard'
        ? 'The default for nuclear genes in most organisms.'
        : code.id === 'vertebrate-mitochondrial'
          ? 'Use for vertebrate mitochondrial genes, where TGA encodes tryptophan.'
          : 'Use for bacterial, archaeal and plant plastid genes.',
    citation: NCBI_CITATION,
    isDefault: index === 0,
  })),
  relatedToolIds: ['reverse-complement', 'gc-content'],
  reviewedAt: '2026-07-25',
};
