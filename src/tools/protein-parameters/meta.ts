import type { ToolMeta } from '@/lib/tools/types';

const bjellqvistCitation = {
  label: 'Bjellqvist pKa set, as used by ExPASy Compute pI/Mw',
  authors: 'Bjellqvist B, Hughes GJ, Pasquali C, et al.',
  source: 'Electrophoresis',
  year: 1993,
  doi: '10.1002/elps.11501401163',
};

export const proteinParametersMeta: ToolMeta = {
  id: 'protein-parameters',
  name: 'Peptide analyser',
  shortName: 'Peptide',
  category: 'protein',
  summary: 'Mass, isoelectric point, extinction coefficient and composition from a sequence.',
  description:
    'Compute molecular weight, monoisotopic mass, isoelectric point, net charge, the 280 nm ' +
    'extinction coefficient and amino acid composition for a protein or peptide. The pKa set ' +
    'and the cysteine state are yours to choose, because both change the answer.',
  keywords: [
    'peptide',
    'protein mw',
    'protein molecular weight',
    'isoelectric point',
    'pi',
    'pI calculator',
    'extinction coefficient',
    'a280',
    'molar absorptivity',
    'net charge',
    'gravy',
    'hydropathy',
    'amino acid composition',
    'monoisotopic mass',
    'protparam',
    'pepstats',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  models: [
    {
      id: 'bjellqvist',
      name: 'Bjellqvist (ExPASy)',
      guidance:
        'Match this one when you need to agree with ExPASy Compute pI/Mw, which most published pI values are quoted from.',
      citation: bjellqvistCitation,
      isDefault: true,
    },
    {
      id: 'emboss',
      name: 'EMBOSS',
      guidance:
        'Use when comparing against EMBOSS iep or pepstats, or anything in a pipeline built on them.',
      citation: {
        label: 'EMBOSS Epk.dat pKa values',
        authors: 'Rice P, Longden I, Bleasby A',
        source: 'Trends in Genetics',
        year: 2000,
        doi: '10.1016/S0168-9525(00)02024-2',
      },
    },
  ],
  citations: [
    {
      label: 'Extinction coefficient at 280 nm from sequence',
      authors: 'Gill SC, von Hippel PH',
      source: 'Analytical Biochemistry',
      year: 1989,
      doi: '10.1016/0003-2697(89)90602-7',
    },
    bjellqvistCitation,
    {
      label: 'Hydropathy scale used for GRAVY',
      authors: 'Kyte J, Doolittle RF',
      source: 'Journal of Molecular Biology',
      year: 1982,
      doi: '10.1016/0022-2836(82)90515-0',
    },
  ],
  relatedToolIds: ['molecular-weight', 'translate', 'molarity'],
  reviewedAt: '2026-07-26',
};
