import type { ToolCategory } from './types';

/** Ordered as they appear in the catalog: most-used first, not alphabetical. */
export const CATEGORIES: readonly ToolCategory[] = [
  {
    id: 'lab-calculators',
    name: 'Laboratory calculators',
    summary: 'Dilutions, molarity, buffers and reagent maths for the bench.',
  },
  {
    id: 'molecular-biology',
    name: 'Molecular biology',
    summary: 'Primers, PCR, cloning, restriction analysis and sequence manipulation.',
  },
  {
    id: 'bioinformatics',
    name: 'Bioinformatics',
    summary: 'Sequence formats, alignment, motifs and database lookups.',
  },
  {
    id: 'protein',
    name: 'Protein tools',
    summary: 'Peptide properties, composition, isoelectric point and structure viewing.',
  },
  {
    id: 'cell-biology',
    name: 'Cell biology',
    summary: 'Culture planning, growth rates, viability and seeding density.',
  },
  {
    id: 'imaging',
    name: 'Imaging & microscopy',
    summary: 'Image analysis, segmentation, deconvolution and slide handling.',
  },
  {
    id: 'statistics',
    name: 'Statistics and plotting',
    summary: 'Significance testing, regression and publication-ready figures.',
  },
  {
    id: 'lab-utilities',
    name: 'Laboratory utilities',
    summary: 'Unit conversion, timers, protocols and everyday lab housekeeping.',
  },
] as const;

export function getCategory(id: ToolCategory['id']): ToolCategory {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
