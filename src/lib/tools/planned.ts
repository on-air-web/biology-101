import type { ToolMeta } from './types';

/**
 * Tools that are announced but not built.
 *
 * Metadata only — no folder, no compute, no route. They appear in the catalog
 * and in search so the catalog reflects the real shape of the product, and so
 * we learn what people look for before we build it. They are never linked and
 * never enter the sitemap.
 *
 * Being visibly honest about what does not exist yet costs nothing and is a
 * great deal better than a catalog of dead links.
 */
function planned(
  meta: Omit<ToolMeta, 'kind' | 'tier' | 'status' | 'computeLocation' | 'citations' | 'reviewedAt'>,
): ToolMeta {
  return {
    ...meta,
    kind: 'builtin',
    tier: 'pick',
    status: 'planned',
    computeLocation: 'client',
    citations: [],
    reviewedAt: '2026-07-25',
  };
}

export const PLANNED_TOOLS: readonly ToolMeta[] = [
  planned({
    id: 'cell-doubling-time',
    name: 'Doubling time calculator',
    category: 'cell-biology',
    summary: 'Derive doubling time and growth rate from two cell counts.',
    description: 'Calculate population doubling time from counts taken at two time points.',
    keywords: ['doubling time', 'growth rate', 'population doubling', 'generation time'],
  }),
  planned({
    id: 'melting-temperature',
    name: 'Melting temperature calculator',
    category: 'molecular-biology',
    summary: 'Estimate primer Tm, with the choice of model made explicit.',
    description:
      'Calculate oligonucleotide melting temperature using basic, salt-adjusted or ' +
      'nearest-neighbour models, with the salt and primer concentrations you actually used.',
    keywords: ['melting temperature', 'tm', 'primer tm', 'annealing', 'nearest neighbour', 'oligo'],
  }),
  planned({
    id: 'unit-converter',
    name: 'Unit converter',
    category: 'lab-utilities',
    summary: 'Convert between mass, volume, concentration and amount units.',
    description: 'A general converter covering the units used across the rest of the toolkit.',
    keywords: ['unit converter', 'convert', 'units', 'si prefix', 'micro', 'milli', 'nano'],
  }),
  planned({
    id: 'fasta-viewer',
    name: 'FASTA viewer',
    category: 'bioinformatics',
    summary: 'Inspect, validate and navigate FASTA files in the browser.',
    description: 'Parse multi-record FASTA, flag malformed entries and browse sequences.',
    keywords: ['fasta', 'sequence viewer', 'multi fasta', 'validate', 'parse'],
  }),
];
