import type { Task } from './types';

/**
 * Molecular biology tasks.
 *
 * The primer guide carries most of the weight here, because a failed PCR is
 * usually a primer decision made weeks earlier and the feedback loop is too
 * slow to learn from.
 *
 * All drafted, none reviewed. That distinction is shown on the page.
 */
export const MOLECULAR_BIOLOGY_TASKS: readonly Task[] = [
  {
    id: 'design-a-pcr-primer',
    name: 'Design or check a PCR primer',
    question: 'Will this primer work, and what annealing temperature do I use?',
    category: 'molecular-biology',
    summary: 'What makes a primer work, and why two calculators give it different melting points.',
    guidance:
      'Aim for 18–25 bases, 40–60% GC, and a pair whose melting temperatures are within about ' +
      '2 °C of each other. The 3′ end matters more than the rest: one or two G or C bases in the ' +
      'last five anchors it enough to extend, while four or five makes it stable enough to ' +
      'tolerate a mismatch further back and prime somewhere you did not intend. Avoid runs of four ' +
      'or more identical bases, which slip during synthesis.\n\n' +
      'Then check that the primer is available to the template at all. A primer that pairs with a ' +
      'copy of itself, or folds back on its own 3′ end, is consumed before it ever finds the ' +
      'target — and self-dimers amplify, which is what a smear at the bottom of a gel often is.\n\n' +
      'The melting temperature itself is where people get caught. Three models are in common use ' +
      'and they disagree by more than ten degrees on the same oligo: the Wallace counting rule ' +
      'assumes 1 M salt and no length term, the GC formula ignores sequence order entirely, and ' +
      'nearest-neighbour thermodynamics — what suppliers quote — accounts for both. A Tm ' +
      'is not a property of a sequence alone. It depends on the model, the salt and the oligo ' +
      'concentration, so quoting one without them is quoting a number nobody can reproduce.',
    caution:
      'Melting temperature is not annealing temperature. A common starting point is 3–5 °C below ' +
      'the lower primer Tm, but that is a guess to begin a gradient with, not an answer. Specificity ' +
      'also cannot be judged from the primer alone — check it against the genome you are amplifying ' +
      'from.',
    toolIds: ['melting-temperature', 'gc-content', 'reverse-complement', 'primer3', 'primer-blast'],
    keywords: [
      'primer design',
      'pcr primer',
      'melting temperature',
      'tm',
      'annealing temperature',
      'self dimer',
      'hairpin',
      'gc clamp',
      'primer pair',
      'oligo',
      'nearest neighbour',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'work-with-a-sequence',
    name: 'Work with a DNA sequence',
    question: 'How do I reverse complement, translate, or check the composition of a sequence?',
    category: 'molecular-biology',
    summary: 'The everyday sequence operations, and the conventions that silently differ.',
    guidance:
      'Reverse complement, translation and GC content are the three operations you reach for ' +
      'without thinking, which is exactly why their conventions are worth stating once.\n\n' +
      'Reverse complement is not the same as complement. Sequences are written 5′→3′ by ' +
      'convention, so the partner strand has to be reversed as well as complemented to be written ' +
      'the same way. Getting this wrong produces a sequence that looks entirely reasonable and ' +
      'orders a primer that anneals nowhere.\n\n' +
      'Translation needs a reading frame and a genetic code, and neither is safe to assume. Six ' +
      'frames exist for any sequence, three on each strand. The standard code is not universal: ' +
      'vertebrate mitochondria read TGA as tryptophan rather than stop, and several ciliates ' +
      'reassign the stop codons entirely — so translating a mitochondrial gene with the standard ' +
      'table truncates it at the first TGA.\n\n' +
      'GC content is arithmetic, but decide in advance what ambiguity codes should do. Counting ' +
      'them, ignoring them, or refusing them all give different denominators.',
    caution:
      'For anything longer than a page — annotating a plasmid, tracking features, keeping a ' +
      'construct history — use a sequence editor rather than a string operation. Manual editing of ' +
      'long sequences is where silent frame shifts come from.',
    toolIds: ['reverse-complement', 'translate', 'gc-content', 'benchling', 'snapgene-viewer'],
    keywords: [
      'reverse complement',
      'complement',
      'translate',
      'reading frame',
      'orf',
      'genetic code',
      'codon',
      'gc content',
      'sequence manipulation',
      'dna sequence',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'plan-a-cloning-digest',
    name: 'Plan a restriction digest',
    question: 'Which enzymes cut my insert and vector where I need them to?',
    category: 'molecular-biology',
    summary: 'Choosing enzyme pairs for a clone, and the compatibility questions that decide it.',
    guidance:
      'The requirement is narrower than it looks: you need enzymes that cut the polylinker where ' +
      'you want them, do not cut inside your insert, and work in a shared buffer at a shared ' +
      'temperature. Start by mapping every site in both the insert and the vector — the sites you ' +
      'must avoid are as important as the ones you want.\n\n' +
      'Prefer two different enzymes producing incompatible ends. Directional cloning stops the ' +
      'insert going in backwards and stops the vector closing on itself, which together account ' +
      'for most of the white colonies on a bad plate. If a single enzyme is unavoidable, ' +
      'dephosphorylate the vector.\n\n' +
      'Two practical constraints are easy to miss. Enzymes need bases either side of the site to ' +
      'bind, so a site placed at the very end of a PCR product may not be cut at all — suppliers ' +
      'publish how much overhang each enzyme needs. And some sites are blocked by Dam or Dcm ' +
      'methylation when the DNA came out of a standard laboratory E. coli strain, which is why a ' +
      'digest that should work sometimes simply does not.',
    caution:
      'Star activity — cutting at near-miss sites — appears with too much enzyme, too much ' +
      'glycerol or too long an incubation. If a digest gives more bands than the map predicts, ' +
      'suspect the reaction before the map.',
    toolIds: ['nebcutter', 'snapgene-viewer', 'benchling', 'reverse-complement'],
    keywords: [
      'restriction digest',
      'restriction enzyme',
      'cloning',
      'polylinker',
      'multiple cloning site',
      'directional cloning',
      'sticky ends',
      'blunt ends',
      'dam methylation',
      'star activity',
      'vector insert',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
];
