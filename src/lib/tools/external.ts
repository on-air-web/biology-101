import type { ToolMeta } from './types';
import type { AccessModel, ExternalInfo, ToolCategoryId } from './types';

/**
 * The external directory.
 *
 * Every entry must answer one question a bookmark cannot: when is this the
 * right choice, and when is something else better? That judgement is the whole
 * reason to index a tool we do not host. An entry without it is link rot
 * waiting to happen.
 *
 * `reviewedAt` here means the last time someone checked that the tool still
 * exists, still works, and that the guidance is still true. External tools
 * change under us — this field is how we notice.
 */
function external(
  meta: {
    id: string;
    name: string;
    category: ToolCategoryId;
    summary: string;
    description: string;
    keywords: string[];
    relatedToolIds?: string[];
  } & ExternalInfo,
): ToolMeta {
  const { provider, url, access, licenseNote, useWhen, inputNote, ...rest } = meta;
  return {
    ...rest,
    kind: 'external',
    tier: 'pick',
    reviewStatus: 'drafted',
    external: { provider, url, access, licenseNote, useWhen, inputNote },
    status: 'stable',
    computeLocation: 'server',
    citations: [{ label: `${meta.name} — project site`, source: provider, url }],
    reviewedAt: '2026-07-25',
  };
}

export const EXTERNAL_TOOLS: readonly ToolMeta[] = [
  // ---- Structure and protein ---------------------------------------------
  external({
    id: 'alphafold-server',
    name: 'AlphaFold Server',
    category: 'protein',
    summary: 'Predicts protein, DNA, RNA and ligand complexes with AlphaFold 3.',
    description:
      'A hosted interface to AlphaFold 3. Handles complexes rather than single chains: protein ' +
      'with nucleic acid, ions, or small molecules, without any local setup.',
    keywords: [
      'alphafold',
      'alphafold3',
      'af3',
      'structure prediction',
      'complex',
      'fold',
      'docking',
    ],
    provider: 'Google DeepMind',
    url: 'https://alphafoldserver.com',
    access: 'free-registration',
    licenseNote: 'Non-commercial use only',
    inputNote: 'Token limit per job; daily job quota',
    useWhen:
      'You need a complex — protein with DNA, RNA, ions or a ligand. For a single protein chain ' +
      'ColabFold is faster and has no daily cap, and for commercial work neither is licensed; ' +
      'look at ESMFold or Boltz instead.',
    relatedToolIds: ['colabfold', 'i-tasser'],
  }),
  external({
    id: 'colabfold',
    name: 'ColabFold',
    category: 'protein',
    summary: 'AlphaFold2 and multimer predictions in a notebook, with no local GPU.',
    description:
      'Runs AlphaFold2 with a fast MMseqs2 homology search in Google Colab. The practical way to ' +
      'fold a sequence when you do not have cluster access.',
    keywords: ['colabfold', 'alphafold2', 'mmseqs2', 'structure prediction', 'colab', 'multimer'],
    provider: 'Steinegger & Mirdita',
    url: 'https://github.com/sokrypton/ColabFold',
    access: 'free',
    inputNote: 'Free Colab tiers time out on very long sequences',
    useWhen:
      'The default for single chains and small multimers. Faster than AlphaFold Server and with ' +
      'no daily limit. Choose AlphaFold Server instead when your system includes DNA, RNA or a ' +
      'ligand.',
    relatedToolIds: ['alphafold-server'],
  }),
  external({
    id: 'i-tasser',
    name: 'I-TASSER',
    category: 'protein',
    summary: 'Threading-based modelling with function and ligand-site prediction.',
    description:
      'Builds models by threading against known folds, and reports predicted function, ligand ' +
      'binding sites and GO terms alongside the structure.',
    keywords: ['i-tasser', 'itasser', 'threading', 'homology modelling', 'function prediction'],
    provider: 'Zhang Lab',
    url: 'https://zhanggroup.org/I-TASSER/',
    access: 'free-registration',
    licenseNote: 'Academic use; commercial licence required',
    inputNote: 'Server queue, often hours to days',
    useWhen:
      'You want function and binding-site prediction alongside a model, not just coordinates. For ' +
      'raw structural accuracy the AlphaFold family has overtaken it, and returns results in ' +
      'minutes rather than days.',
  }),
  external({
    id: 'charmm-gui',
    name: 'CHARMM-GUI',
    category: 'protein',
    summary: 'Builds ready-to-run input files for molecular dynamics simulations.',
    description:
      'A guided builder that produces complete, correctly parameterised MD inputs — membranes, ' +
      'solvation, ions, glycans — for CHARMM, GROMACS, NAMD, AMBER and OpenMM.',
    keywords: [
      'charmm-gui',
      'charmm',
      'molecular dynamics',
      'md',
      'membrane builder',
      'gromacs',
      'namd',
      'solvation',
    ],
    provider: 'Lehigh University',
    url: 'https://www.charmm-gui.org',
    access: 'free-registration',
    licenseNote: 'Free for academic use',
    useWhen:
      'Setting up any MD simulation, and especially a membrane system. System building is where ' +
      'most MD projects fail silently, and this removes almost all of that risk.',
  }),
  external({
    id: 'molstar',
    name: 'Mol* Viewer',
    category: 'protein',
    summary: 'Fast 3D structure viewing in the browser; the PDB default.',
    description:
      'The viewer used by RCSB PDB and PDBe. Handles very large assemblies, cryo-EM maps and ' +
      'trajectories without leaving the browser.',
    keywords: ['molstar', 'mol*', 'structure viewer', '3d', 'pdb', 'visualisation', 'cryo-em'],
    provider: 'RCSB PDB / PDBe',
    url: 'https://molstar.org/viewer/',
    access: 'free',
    useWhen:
      'Looking at a structure quickly, or embedding one. For figure-quality rendering and complex ' +
      'scenes, PyMOL or ChimeraX still win.',
  }),
  external({
    id: 'rcsb-pdb',
    name: 'RCSB PDB',
    category: 'protein',
    summary: 'The Protein Data Bank: every experimentally determined structure.',
    description:
      'The primary archive of experimental macromolecular structures, with search, sequence and ' +
      'ligand tools layered on top.',
    keywords: ['pdb', 'protein data bank', 'rcsb', 'structure database', 'crystal structure'],
    provider: 'RCSB',
    url: 'https://www.rcsb.org',
    access: 'free',
    useWhen:
      'Anywhere an experimental structure exists. Check here before predicting anything — a ' +
      'measured structure beats a predicted one.',
  }),

  // ---- Bioinformatics -----------------------------------------------------
  external({
    id: 'ncbi-blast',
    name: 'NCBI BLAST',
    category: 'bioinformatics',
    summary: 'Similarity search against every public sequence database.',
    description:
      'The reference sequence similarity search. Nucleotide, protein and translated searches ' +
      'against the full NCBI holdings.',
    keywords: ['blast', 'blastn', 'blastp', 'alignment', 'similarity', 'homology', 'ncbi'],
    provider: 'NCBI',
    url: 'https://blast.ncbi.nlm.nih.gov',
    access: 'free',
    inputNote: 'Shared queue; large batches are rate limited',
    useWhen:
      'Almost any "what is this sequence" question. For very large batches, run BLAST+ locally or ' +
      'use DIAMOND — the web queue is not built for thousands of queries.',
  }),
  external({
    id: 'clustal-omega',
    name: 'Clustal Omega',
    category: 'bioinformatics',
    summary: 'Multiple sequence alignment that scales to thousands of sequences.',
    description:
      'The current Clustal generation, accurate and fast enough for very large protein and ' +
      'nucleotide alignments.',
    keywords: ['clustal', 'clustal omega', 'msa', 'multiple sequence alignment', 'ebi'],
    provider: 'EMBL-EBI',
    url: 'https://www.ebi.ac.uk/jdispatcher/msa/clustalo',
    access: 'free',
    useWhen:
      'Large alignments where speed matters. For small sets of divergent sequences MAFFT L-INS-i ' +
      'or T-Coffee are usually more accurate.',
    relatedToolIds: ['mafft', 'emboss-needle'],
  }),
  external({
    id: 'mafft',
    name: 'MAFFT',
    category: 'bioinformatics',
    summary: 'Multiple alignment with accuracy modes for difficult sequence sets.',
    description:
      'Offers a range of strategies from very fast to very accurate, including iterative ' +
      'refinement modes suited to divergent sequences.',
    keywords: ['mafft', 'msa', 'alignment', 'l-ins-i', 'ebi'],
    provider: 'EMBL-EBI',
    url: 'https://www.ebi.ac.uk/jdispatcher/msa/mafft',
    access: 'free',
    useWhen:
      'Fewer than a few hundred sequences, especially divergent ones — L-INS-i is usually the most ' +
      'accurate option available. Clustal Omega scales better past that.',
  }),
  external({
    id: 'emboss-needle',
    name: 'EMBOSS Needle',
    category: 'bioinformatics',
    summary: 'Global pairwise alignment, the reference implementation.',
    description:
      'Needleman–Wunsch global alignment of two sequences, with the gap penalties and scoring ' +
      'matrix exposed.',
    keywords: ['needle', 'emboss', 'needleman-wunsch', 'pairwise', 'global alignment', 'ebi'],
    provider: 'EMBL-EBI',
    url: 'https://www.ebi.ac.uk/jdispatcher/psa/emboss_needle',
    access: 'free',
    useWhen:
      'Two sequences of similar length that you expect to align end to end. Use EMBOSS Water ' +
      'instead when you only expect a shared region.',
  }),
  external({
    id: 'uniprot',
    name: 'UniProt',
    category: 'bioinformatics',
    summary: 'The reference protein sequence and functional annotation database.',
    description:
      'Curated protein records with function, domains, variants, PTMs and cross-references to ' +
      'nearly every other resource.',
    keywords: ['uniprot', 'swiss-prot', 'protein database', 'annotation', 'accession'],
    provider: 'EMBL-EBI / SIB / PIR',
    url: 'https://www.uniprot.org',
    access: 'free',
    useWhen:
      'The starting point for anything about a known protein. Prefer reviewed Swiss-Prot entries; ' +
      'TrEMBL records are automatic and unverified.',
  }),
  external({
    id: 'interpro',
    name: 'InterPro',
    category: 'bioinformatics',
    summary: 'Protein family, domain and functional site annotation in one place.',
    description:
      'Combines Pfam, PROSITE, SMART, CDD and others into a single domain annotation for a ' +
      'sequence.',
    keywords: ['interpro', 'pfam', 'domain', 'protein family', 'motif', 'prosite', 'ebi'],
    provider: 'EMBL-EBI',
    url: 'https://www.ebi.ac.uk/interpro/',
    access: 'free',
    useWhen:
      'You want domain architecture from an unknown sequence and would rather not query five ' +
      'databases separately.',
  }),
  external({
    id: 'ensembl',
    name: 'Ensembl',
    category: 'bioinformatics',
    summary: 'Genome browser with comparative genomics and variation data.',
    description:
      'Annotated genomes across vertebrates and beyond, with orthology, regulation and variant ' +
      'consequence tooling.',
    keywords: ['ensembl', 'genome browser', 'variation', 'orthologue', 'vep', 'ebi'],
    provider: 'EMBL-EBI',
    url: 'https://www.ensembl.org',
    access: 'free',
    useWhen:
      'Comparative genomics and variant interpretation. UCSC Genome Browser is often better for ' +
      'custom track display; NCBI Datasets is better for bulk download.',
  }),

  // ---- Molecular biology ---------------------------------------------------
  external({
    id: 'primer3',
    name: 'Primer3',
    category: 'molecular-biology',
    summary: 'The reference primer design engine, still the one to beat.',
    description:
      'Designs PCR primers with full control over Tm, GC, product size, self-complementarity and ' +
      'mispriming against a background set.',
    keywords: ['primer3', 'primer design', 'pcr', 'tm', 'oligo', 'amplicon'],
    provider: 'Whitehead Institute',
    url: 'https://primer3.ut.ee',
    access: 'free',
    useWhen:
      'Standard PCR primer design. Use NCBI Primer-BLAST when specificity against a whole genome ' +
      'matters more than fine parameter control.',
  }),
  external({
    id: 'primer-blast',
    name: 'Primer-BLAST',
    category: 'molecular-biology',
    summary: 'Primer design with a specificity check against a whole genome.',
    description:
      'Wraps Primer3 and then BLASTs each candidate pair against a chosen database to flag ' +
      'off-target amplification.',
    keywords: ['primer-blast', 'primer blast', 'specificity', 'pcr', 'primer design', 'off-target'],
    provider: 'NCBI',
    url: 'https://www.ncbi.nlm.nih.gov/tools/primer-blast/',
    access: 'free',
    useWhen:
      'Any primer that will run against complex template — genomic DNA, cDNA from a whole ' +
      'transcriptome. Slower than Primer3 alone, and worth it.',
  }),
  external({
    id: 'nebcutter',
    name: 'NEBcutter',
    category: 'molecular-biology',
    summary: 'Restriction mapping and digest planning against a real enzyme catalogue.',
    description:
      'Maps restriction sites on a sequence, shows predicted gel patterns, and accounts for ' +
      'methylation sensitivity and buffer compatibility.',
    keywords: ['nebcutter', 'restriction', 'digest', 'enzyme', 'cloning', 'gel', 'neb'],
    provider: 'New England Biolabs',
    url: 'https://nc3.neb.com/NEBcutter/',
    access: 'free',
    useWhen:
      'Planning a digest you will actually run. It knows which enzymes NEB sells, their buffers ' +
      'and their methylation sensitivity, which generic site-finders do not.',
  }),
  external({
    id: 'benchling',
    name: 'Benchling',
    category: 'molecular-biology',
    summary: 'Cloud plasmid editor and lab notebook, free for academic use.',
    description:
      'Sequence editing, cloning simulation, primer design and an electronic notebook, shared ' +
      'across a lab.',
    keywords: ['benchling', 'plasmid editor', 'cloning', 'notebook', 'eln', 'sequence editor'],
    provider: 'Benchling',
    url: 'https://www.benchling.com',
    access: 'freemium',
    licenseNote: 'Free academic tier; paid for industry',
    useWhen:
      'A lab that wants shared constructs and a notebook in one place. SnapGene Viewer is free ' +
      'and fine if you only need to open and inspect files.',
  }),
  external({
    id: 'snapgene-viewer',
    name: 'SnapGene Viewer',
    category: 'molecular-biology',
    summary: 'Free viewer for annotated plasmid maps and sequence files.',
    description:
      'Opens and displays .dna, GenBank and FASTA files with annotated maps. Editing requires the ' +
      'paid version.',
    keywords: ['snapgene', 'plasmid map', 'viewer', 'genbank', 'dna file', 'vector'],
    provider: 'Dotmatics',
    url: 'https://www.snapgene.com/snapgene-viewer',
    access: 'install',
    licenseNote: 'Viewer free; editing requires a licence',
    useWhen:
      'Someone sends you a .dna file. For anything you need to edit or design, Benchling free tier ' +
      'goes further at no cost.',
  }),
  external({
    id: 'chopchop',
    name: 'CHOPCHOP',
    category: 'molecular-biology',
    summary: 'CRISPR guide RNA design with off-target scoring.',
    description:
      'Designs guides for Cas9, Cas12a, base editing and knock-in across a wide set of genomes, ' +
      'with efficiency and off-target ranking.',
    keywords: ['chopchop', 'crispr', 'guide rna', 'sgrna', 'cas9', 'off-target', 'knockout'],
    provider: 'University of Bergen',
    url: 'https://chopchop.cbu.uib.no',
    access: 'free',
    useWhen:
      'Guide design for a sequenced model organism. For a custom or unannotated genome, run ' +
      'CRISPOR or a local pipeline instead.',
  }),

  // ---- Imaging -------------------------------------------------------------
  external({
    id: 'fiji-imagej',
    name: 'Fiji / ImageJ',
    category: 'imaging',
    summary: 'The standard for scientific image analysis, with a plugin for almost everything.',
    description:
      'ImageJ bundled with the plugins most life scientists need: segmentation, registration, ' +
      'deconvolution, tracking and scripting.',
    keywords: ['fiji', 'imagej', 'image analysis', 'microscopy', 'segmentation', 'macro', 'roi'],
    provider: 'Open source',
    url: 'https://fiji.sc',
    access: 'install',
    useWhen:
      'Nearly any microscopy measurement. For high-throughput batches with no scripting, ' +
      'CellProfiler is the better fit; for very large multidimensional data, napari.',
    relatedToolIds: ['cellprofiler', 'napari'],
  }),
  external({
    id: 'cellprofiler',
    name: 'CellProfiler',
    category: 'imaging',
    summary: 'High-throughput image analysis pipelines without writing code.',
    description:
      'Builds reusable measurement pipelines across thousands of images — object identification, ' +
      'intensity, morphology and per-cell export.',
    keywords: ['cellprofiler', 'high content', 'pipeline', 'segmentation', 'phenotype', 'batch'],
    provider: 'Broad Institute',
    url: 'https://cellprofiler.org',
    access: 'free',
    useWhen:
      'Measuring the same thing across a plate or a screen. For one-off measurements on a handful ' +
      'of images, Fiji is faster to reach an answer with.',
  }),
  external({
    id: 'napari',
    name: 'napari',
    category: 'imaging',
    summary: 'Multidimensional image viewer built for Python workflows.',
    description:
      'Fast n-dimensional viewing of large volumes and time series, with a plugin ecosystem and ' +
      'direct integration with the scientific Python stack.',
    keywords: ['napari', 'viewer', 'python', 'n-dimensional', 'light sheet', 'volume', 'zarr'],
    provider: 'Open source',
    url: 'https://napari.org',
    access: 'install',
    useWhen:
      'Large light-sheet or volumetric data, or anywhere your analysis is already in Python. Fiji ' +
      'remains better supplied with ready-made plugins.',
  }),
  external({
    id: 'qupath',
    name: 'QuPath',
    category: 'imaging',
    summary: 'Whole-slide and digital pathology image analysis.',
    description:
      'Handles gigapixel slide formats with cell detection, classification and stain ' +
      'deconvolution built in.',
    keywords: ['qupath', 'pathology', 'whole slide', 'histology', 'ihc', 'stain', 'wsi'],
    provider: 'University of Edinburgh',
    url: 'https://qupath.github.io',
    access: 'install',
    useWhen:
      'Histology and whole-slide images. General image tools will not open these formats at a ' +
      'usable speed.',
  }),

  // ---- Cell biology --------------------------------------------------------
  external({
    id: 'zfin',
    name: 'ZFIN',
    category: 'cell-biology',
    summary: 'The zebrafish model organism database: genes, lines and expression.',
    description:
      'Curated zebrafish genetics: gene records, mutant and transgenic lines, expression patterns ' +
      'and phenotypes, with links to stock centres.',
    keywords: [
      'zfin',
      'zebrafish',
      'danio',
      'model organism',
      'transgenic',
      'mutant',
      'expression',
    ],
    provider: 'ZFIN',
    url: 'https://zfin.org',
    access: 'free',
    useWhen:
      'Anything zebrafish. Check here for an existing line before making one — most published ' +
      'alleles are already deposited.',
  }),
  external({
    id: 'flybase',
    name: 'FlyBase',
    category: 'cell-biology',
    summary: 'Drosophila genes, stocks, phenotypes and reagents.',
    description:
      'The reference database for Drosophila genetics, with gene reports, alleles, expression and ' +
      'stock availability.',
    keywords: ['flybase', 'drosophila', 'fly', 'genetics', 'stocks', 'alleles', 'gal4'],
    provider: 'FlyBase Consortium',
    url: 'https://flybase.org',
    access: 'free',
    useWhen:
      'Anything Drosophila, and especially before ordering — it tells you which stock centre ' +
      'actually holds a line.',
  }),

  // ---- Statistics ----------------------------------------------------------
  external({
    id: 'jasp',
    name: 'JASP',
    category: 'statistics',
    summary: 'Free statistics software with both classical and Bayesian tests.',
    description:
      'A point-and-click statistics package with publication-ready output and Bayesian ' +
      'equivalents of the standard tests.',
    keywords: ['jasp', 'statistics', 'bayesian', 'anova', 't-test', 'spss alternative'],
    provider: 'University of Amsterdam',
    url: 'https://jasp-stats.org',
    access: 'install',
    useWhen:
      'You want more than a single test and would rather not write R. The Bayesian side is ' +
      'genuinely useful when a null result needs interpreting.',
  }),
];

export const ACCESS_ORDER: readonly AccessModel[] = [
  'free',
  'free-registration',
  'freemium',
  'install',
  'academic-only',
  'paid',
];
