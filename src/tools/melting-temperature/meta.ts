import type { ToolMeta } from '@/lib/tools/types';

const santaLucia1997 = {
  // The paper is titled for its G·T mismatch work; the Watson–Crick
  // nearest-neighbour parameters used here are reported in it, and this is the
  // attribution the set is known by.
  label: 'Nearest-neighbour parameters for Watson–Crick DNA base pairs',
  authors: 'Allawi HT, SantaLucia J',
  source: 'Biochemistry',
  year: 1997,
  doi: '10.1021/bi962590c',
};

export const meltingTemperatureMeta: ToolMeta = {
  id: 'melting-temperature',
  name: 'Melting temperature calculator',
  shortName: 'Tm & primers',
  category: 'molecular-biology',
  summary:
    'Primer Tm under every model at once, with the salt and concentration you actually used.',
  description:
    'Calculate oligonucleotide melting temperature by nearest-neighbour thermodynamics, the ' +
    'salt-adjusted GC formula and the Wallace rule — all three at once, because they disagree ' +
    'by more than ten degrees and a Tm without its model is not reproducible. Takes the sodium, ' +
    'potassium, Tris, magnesium and dNTP concentrations from your actual buffer, and checks the ' +
    'primer for self-dimers, hairpins, runs and a workable 3′ end.',
  keywords: [
    'melting temperature',
    'tm',
    'tm calculator',
    'primer tm',
    'oligo tm',
    'annealing temperature',
    'nearest neighbour',
    'nearest neighbor',
    'santalucia',
    'primer design',
    'primer analysis',
    'self dimer',
    'hairpin',
    'gc clamp',
    'oligoanalyzer',
    'pcr primer',
    'salt correction',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'reviewed',
  status: 'stable',
  computeLocation: 'client',
  models: [
    {
      id: 'santalucia-1997',
      name: 'Nearest neighbour — Allawi & SantaLucia 1997',
      guidance:
        'The unified parameter set most primer suppliers and design tools use. Match this one when your number has to agree with an order form.',
      citation: santaLucia1997,
      isDefault: true,
    },
    {
      id: 'santalucia-2004',
      name: 'Nearest neighbour — SantaLucia & Hicks 2004',
      guidance:
        'The later revision of the same method. Prefer it for its own sake; expect it to sit within a degree or so of the 1997 set.',
      citation: {
        label: 'Revised nearest-neighbour parameters and duplex thermodynamics',
        authors: 'SantaLucia J, Hicks D',
        source: 'Annual Review of Biophysics and Biomolecular Structure',
        year: 2004,
        doi: '10.1146/annurev.biophys.32.110601.141800',
      },
    },
    {
      id: 'gc',
      name: 'Salt-adjusted GC formula',
      guidance:
        'Reasonable for long duplexes and probes, but blind to sequence order — it gives GGGCCC and GCGCGC the same answer.',
      citation: {
        label: 'Salt and GC dependence of the melting temperature',
        authors: 'Schildkraut C, Lifson S',
        source: 'Biopolymers',
        year: 1965,
        doi: '10.1002/bip.360030207',
      },
    },
    {
      id: 'wallace',
      name: 'Wallace rule',
      guidance:
        'A counting rule for short oligos in 1 M salt. Shown because people still use it, and because seeing how far it drifts on a 25-mer is the fastest argument against it.',
      citation: {
        label: 'The 2(A+T) + 4(G+C) rule for short oligonucleotides',
        authors: 'Wallace RB, Shaffer J, Murphy RF, et al.',
        source: 'Nucleic Acids Research',
        year: 1979,
        doi: '10.1093/nar/6.11.3543',
      },
    },
  ],
  citations: [
    santaLucia1997,
    {
      label: 'Monovalent equivalent of magnesium and dNTPs in a PCR buffer',
      authors: 'von Ahsen N, Wittwer CT, Schütz E',
      source: 'Clinical Chemistry',
      year: 2001,
      doi: '10.1093/clinchem/47.11.1956',
    },
  ],
  relatedToolIds: ['reverse-complement', 'gc-content', 'translate'],
  reviewedAt: '2026-07-26',
};
