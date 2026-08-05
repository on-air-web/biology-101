import type { ToolMeta } from '@/lib/tools/types';

export const structureAlignmentMeta: ToolMeta = {
  id: 'structure-alignment',
  name: 'Structure alignment',
  shortName: 'Align structures',
  category: 'protein',
  summary: 'Superpose two structures and score how similar their folds are, with TM-score.',
  description:
    'Load two PDB or mmCIF files and align them by geometry alone, without needing their ' +
    'sequences to match. Reports TM-score under both normalisations, RMSD over the aligned ' +
    'residues, the alignment itself and where the two structures diverge. Both files are read ' +
    'locally and neither is uploaded.',
  keywords: [
    'structure alignment',
    'structural alignment',
    'superposition',
    'superimpose',
    'tm-score',
    'tmscore',
    'tm-align',
    'tmalign',
    'rmsd',
    'pdb',
    'mmcif',
    'cif',
    'compare structures',
    'fold similarity',
    'kabsch',
    'protein structure comparison',
    'alphafold comparison',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    {
      label: 'TM-align, the structural alignment algorithm implemented here',
      authors: 'Zhang Y, Skolnick J',
      source: 'Nucleic Acids Research',
      year: 2005,
      doi: '10.1093/nar/gki524',
    },
    {
      label: 'TM-score and the d0 length normalisation',
      authors: 'Zhang Y, Skolnick J',
      source: 'Proteins: Structure, Function, and Bioinformatics',
      year: 2004,
      doi: '10.1002/prot.20264',
    },
    {
      label: 'Closed-form optimal superposition of two point sets',
      authors: 'Kabsch W',
      source: 'Acta Crystallographica Section A',
      year: 1976,
      doi: '10.1107/S0567739476001873',
    },
  ],
  relatedToolIds: ['protein-parameters', 'molecular-weight'],
  reviewedAt: '2026-07-26',
};
