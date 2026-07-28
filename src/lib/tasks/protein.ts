import type { Task } from './types';

/**
 * Protein tasks.
 *
 * The structure prediction guide is the one that most needs to exist. Three
 * tools do nominally the same thing and the right choice turns on constraints
 * nobody publishes together — what you may upload, how long you can wait, and
 * whether the answer needs a confidence estimate.
 *
 * All drafted, none reviewed. That distinction is shown on the page.
 */
export const PROTEIN_TASKS: readonly Task[] = [
  {
    id: 'protein-properties',
    name: 'Work out a protein’s properties',
    question: 'What is the mass, pI and extinction coefficient of my protein?',
    category: 'protein',
    summary: 'Physicochemical parameters from a sequence, and how much to trust each one.',
    guidance:
      'Mass is the reliable one. Sum the residues, add a water, and the answer is right to the ' +
      'precision of the atomic weights — with one decision to make: average mass for ordinary ' +
      'use, monoisotopic for mass spectrometry, where the difference is a whole dalton on a small ' +
      'protein.\n\n' +
      'The extinction coefficient at 280 nm is next most reliable, and it is the number that gets ' +
      'you a concentration from a spectrophotometer. It counts tryptophans, tyrosines and ' +
      'disulfide bonds — bonds, not cysteines, which is why a reduced and an oxidised protein have ' +
      'different coefficients and why the tool has to ask. A protein with no tryptophan rests ' +
      'entirely on tyrosine and is worth a few per cent of doubt; one with neither does not absorb ' +
      'at 280 at all, and no amount of arithmetic will get a concentration out of that reading.\n\n' +
      'Isoelectric point is the least reliable, and not because the arithmetic is hard. It depends ' +
      'on which published pKa set you use, and the common sets disagree — which is why two ' +
      'calculators give different answers for the same sequence. Worse, it assumes every ionisable ' +
      'group is freely exposed, and in a folded protein many are not. Treat a computed pI as a ' +
      'starting point for choosing a buffer or an ion exchange column, not as a measurement.',
    caution:
      'These are all properties of the sequence you typed. Post-translational modification, a ' +
      'cleaved signal peptide or an affinity tag left on all change the real molecule, and ' +
      'phosphorylation alone will move a pI substantially.',
    toolIds: ['protein-parameters', 'molecular-weight', 'uniprot'],
    keywords: [
      'protein molecular weight',
      'isoelectric point',
      'pi',
      'extinction coefficient',
      'a280',
      'protein concentration',
      'monoisotopic',
      'gravy',
      'amino acid composition',
      'protparam',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'predict-a-structure',
    name: 'Predict a protein structure',
    question: 'Which structure prediction tool should I use for my sequence?',
    category: 'protein',
    summary: 'Choosing between AlphaFold Server, ColabFold and the older threading servers.',
    guidance:
      'Check first whether the answer already exists. If your protein is a known one, the AlphaFold ' +
      'database very likely has a model already, and an experimental structure in the PDB beats any ' +
      'prediction. Predicting something that has been crystallised is a common waste of a week.\n\n' +
      'For a single chain or a straightforward complex, AlphaFold Server is the path of least ' +
      'resistance: no installation, no queue worth mentioning, and the current model. Its limits ' +
      'are the ones that matter for real work — a daily job cap, a ceiling on total residues, and ' +
      'the fact that your sequence goes to someone else’s machine. For an unpublished or ' +
      'commercially sensitive sequence, that last point may decide it on its own.\n\n' +
      'ColabFold is the answer when the server’s limits bite. It runs the same class of model with ' +
      'the parameters exposed, so you can raise the recycle count on a difficult target, feed a ' +
      'custom multiple sequence alignment, or batch through a hundred sequences unattended. The ' +
      'cost is that you are managing a notebook and a runtime.\n\n' +
      'The older threading servers such as I-TASSER have not been superseded for every case. They ' +
      'remain useful when a good template exists and you want a model built explicitly on it, and ' +
      'their output includes functional inference — ligand and binding site predictions — that ' +
      'the folding models do not attempt.',
    caution:
      'Read the confidence scores before the picture. pLDDT below about 70 means the local ' +
      'geometry is unreliable, and long stretches below 50 usually indicate genuine disorder ' +
      'rather than a failed prediction. For a multi-chain model, the interface score matters more ' +
      'than the per-chain confidence: well-folded domains placed wrongly against each other look ' +
      'entirely convincing at a glance.',
    toolIds: ['alphafold-server', 'colabfold', 'i-tasser', 'rcsb-pdb', 'molstar'],
    keywords: [
      'structure prediction',
      'alphafold',
      'colabfold',
      'i-tasser',
      'protein folding',
      'plddt',
      'pae',
      'homology model',
      'threading',
      'predicted structure',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'compare-two-structures',
    name: 'Compare two protein structures',
    question: 'How similar are these two structures, and where do they differ?',
    category: 'protein',
    summary: 'Superposition, TM-score against RMSD, and reading the difference honestly.',
    guidance:
      'Decide first what question you are asking, because the two common metrics answer different ' +
      'ones. RMSD is an average deviation over the residues you paired, in ångströms. It is the ' +
      'right measure for two copies of the same protein — a predicted model against its ' +
      'experimental structure, or the same protein with and without a ligand.\n\n' +
      'RMSD is a poor measure of whether two different proteins share a fold, for two reasons. It ' +
      'grows with length, so 4 Å across 60 residues and across 600 mean quite different things; ' +
      'and one flexible loop swinging away drags the average as hard as a genuinely wrong ' +
      'topology. TM-score was built to fix both: it normalises by length and saturates, so distant ' +
      'residues stop adding penalty. Above about 0.5 two structures share a fold; below about 0.3 ' +
      'they are no more alike than two proteins picked at random.\n\n' +
      'A single number of either kind hides where the difference is, and that is usually the ' +
      'interesting part. A per-residue deviation plot separates the case of two structures ' +
      'differing everywhere a little from the far more common one of a rigid core with one hinge ' +
      'or one loop moving — which is a result, not noise.',
    caution:
      'TM-score is asymmetric: it depends which structure’s length you divide by. A small domain ' +
      'matching part of a large protein scores high one way and low the other, and both numbers ' +
      'are correct. Quote the normalisation along with the score.',
    toolIds: ['structure-alignment', 'molstar', 'rcsb-pdb'],
    keywords: [
      'structure comparison',
      'structural alignment',
      'superposition',
      'rmsd',
      'tm-score',
      'tm-align',
      'fold similarity',
      'compare pdb',
      'align structures',
      'conformational change',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
];
