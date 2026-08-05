import type { ToolExplainer } from './types';

/**
 * The teaching layer, keyed by tool id.
 *
 * Kept in one file rather than beside each tool's meta because it is content
 * rather than identity, and because a body of prose written together reads as
 * one voice. Every built-in tool must appear here and every key must resolve
 * to a real tool; `registry.test.ts` enforces both.
 *
 * What each section is for:
 *
 *   whenToUse       Whether the reader is in the right place at all, including
 *                   when they are not. Written to be read before the tool.
 *   workedExample   Real numbers in, real answer out. The fastest way for
 *                   someone to check their situation matches.
 *   commonMistakes  What actually goes wrong. Usually the most useful part,
 *                   and the part no other calculator site bothers with.
 *   faq             The questions people arrive already carrying.
 */
export const TOOL_EXPLAINERS: Record<string, ToolExplainer> = {
  // ---------------------------------------------------------------- lab ----
  molarity: {
    whenToUse:
      'Use this to get from a concentration you want to a mass on the balance, or to work backwards from a mass you have already weighed. It needs a molar mass, so it is for defined compounds — for a protein or an extract quoted in mg/mL, the mass-concentration route in the dilution calculator is the right one instead.',
    workedExample: {
      scenario: 'You need 500 mL of 50 mM Tris for a buffer.',
      inputs: [
        { label: 'Solve for', value: 'Mass' },
        { label: 'Molar mass', value: '121.14 g/mol (Tris base)' },
        { label: 'Concentration', value: '50 mM' },
        { label: 'Volume', value: '500 mL' },
      ],
      result: '3.034 g',
      reading:
        'Weigh 3.034 g, dissolve in about 400 mL, adjust the pH, then make up to 500 mL — not the other way round.',
    },
    commonMistakes: [
      'Taking the molar mass from the compound name rather than the bottle. Tris base is 121.14 g/mol and Tris·HCl is 157.6; the hydrate on the label decides the number, not the name of the chemical.',
      'Dissolving into the full final volume. Solids take up space, so a solid dissolved in 500 mL of water gives more than 500 mL of solution and a concentration below target.',
      'Ignoring purity. A reagent quoted at 95% needs proportionally more mass, and the certificate of analysis is where that number lives.',
    ],
    faq: [
      {
        question: 'Where do I find the molar mass?',
        answer:
          'On the bottle, or from the formula using the molecular weight calculator, which parses hydrates such as CuSO4·5H2O correctly.',
      },
      {
        question: 'Why does my answer differ from a supplier’s calculator in the last digit?',
        answer:
          'Molar masses here follow IUPAC’s current abridged atomic weights. Suppliers sometimes use older values, and for elements such as sulfur the standard atomic weight is an interval rather than a single number.',
      },
      {
        question: 'Can I use this for a protein?',
        answer:
          'Only if you know its molar mass, which the peptide analyser will compute from a sequence. In practice protein stocks are quoted in mg/mL, so the mass-concentration units are usually easier.',
      },
    ],
  },

  'molecular-weight': {
    whenToUse:
      'Use this to turn a chemical formula into a molar mass, including hydrates and nested groups. It is the step before the molarity calculator when the bottle gives a formula but no molecular weight, and it is the honest way to handle a hydrate rather than guessing.',
    workedExample: {
      scenario: 'Your bottle says copper(II) sulfate pentahydrate, CuSO4·5H2O.',
      inputs: [{ label: 'Formula', value: 'CuSO4·5H2O' }],
      result: '249.68 g/mol',
      reading:
        'The anhydrous salt is 159.61, so weighing by that figure would leave you 36% short with nothing about the solution looking wrong.',
    },
    commonMistakes: [
      'Dropping the water of crystallisation. The hydrate is a different compound with a different mass, and it is the commonest silent error in solution preparation.',
      'Confusing case: Co is cobalt, CO is carbon monoxide. The parser reads element symbols strictly, which is why it refuses rather than guessing.',
      'Expecting an exact match to a supplier’s catalogue. Atomic weights are periodically revised and some are intervals, so the last digit can legitimately differ.',
    ],
    faq: [
      {
        question: 'How do I write a hydrate?',
        answer:
          'Either CuSO4·5H2O with a middle dot, or CuSO4.5H2O with a full stop. Both parse the same way.',
      },
      {
        question: 'Does it handle brackets?',
        answer:
          'Yes, including nesting — Ca(NO3)2 and K3[Fe(CN)6] both parse, with the multipliers applied outward.',
      },
      {
        question: 'Is this the average or the monoisotopic mass?',
        answer:
          'The average, from standard atomic weights, which is what solution preparation needs. For mass spectrometry the peptide analyser reports monoisotopic mass as well.',
      },
    ],
  },

  dilution: {
    whenToUse:
      'Use this whenever you have a stock and need a working solution: it solves C₁V₁ = C₂V₂ for whichever of the four terms you are missing. It works in molar or mass-per-volume units, as long as both concentrations are the same kind. If you instead need to keep a recipe’s proportions while changing the batch size, the recipe scaler is the right tool.',
    workedExample: {
      scenario: 'You have a 1 M stock and need 10 mL at 50 mM.',
      inputs: [
        { label: 'Solve for', value: 'Stock volume' },
        { label: 'Stock concentration', value: '1 M' },
        { label: 'Final concentration', value: '50 mM' },
        { label: 'Final volume', value: '10 mL' },
      ],
      result: '500 µL of stock',
      reading: 'Add 9.5 mL of diluent to it — a 1 in 20 dilution.',
    },
    commonMistakes: [
      'Adding the final volume of diluent to the stock rather than making up to the final volume. The number the tool gives for diluent is already the difference.',
      'Mixing unit kinds. Molar and mass-per-volume cannot be compared without a molar mass, which is why they are a toggle rather than one list.',
      'Pipetting under about 5 µL for a single step. Below that the instrument error is a real fraction of the dose; make an intermediate dilution instead.',
    ],
    faq: [
      {
        question: 'Does "1:10" mean one part in ten, or one part in eleven?',
        answer:
          'Both are used in the wild, which is why this tool asks for concentrations and volumes rather than a ratio. Write down which convention you meant.',
      },
      {
        question: 'Can I dilute in mg/mL?',
        answer:
          'Yes — switch the concentration kind to mass per volume. C₁V₁ = C₂V₂ holds in any unit as long as both sides share it.',
      },
      {
        question: 'What if I need a very large dilution?',
        answer:
          'Do it in steps. A 1 in 10,000 dilution in one move means 1 µL into 10 mL, where a single bubble ruins it; four tenfold steps use volumes you can see.',
      },
    ],
  },

  'serial-dilution': {
    whenToUse:
      'Use this to plan a dilution series — a standard curve, an MIC plate, a viable count. It gives the concentration at every step and the volumes to move. For a single dilution, the dilution calculator is simpler.',
    workedExample: {
      scenario: 'A tenfold series from a 1 mg/mL stock, six tubes, 1 mL per tube.',
      inputs: [
        { label: 'Stock concentration', value: '1 mg/mL' },
        { label: 'Dilution factor per step', value: '10' },
        { label: 'Number of steps', value: '6' },
        { label: 'Volume per tube', value: '1 mL' },
      ],
      result: 'Move 111 µL into 1 mL at each step',
      reading: 'The series runs 1 mg/mL down to 10 ng/mL, each tube a tenth of the one before it.',
    },
    commonMistakes: [
      'Not mixing before drawing the next transfer. Every step inherits the one before it, so an unmixed tube propagates its error the whole way down the row.',
      'Keeping the same tip between steps. Concentrated stock on the outside of the tip carries down the series and flattens the low end.',
      'Reading the transfer volume as the volume to add to a full tube. A tenfold step into a 1 mL final volume means 111 µL into 889 µL, not 100 µL into 1 mL.',
    ],
    faq: [
      {
        question: 'Why is the transfer 111 µL and not 100 µL?',
        answer:
          'Because the tube ends at 1 mL total. One part in ten of the final volume is 100 µL into 900 µL; if you want 1 mL in the tube after adding, the transfer is 1000/9 = 111 µL.',
      },
      {
        question: 'How many steps before the error matters?',
        answer:
          'Errors compound multiplicatively, so a consistent 2% pipetting error is about 13% off by the sixth tube. For a standard curve, prepare the extremes independently as a check.',
      },
      {
        question: 'Can I use a factor other than ten?',
        answer:
          'Yes. Twofold series are standard for MIC plates and the tool handles any factor above one.',
      },
    ],
  },

  'buffer-preparation': {
    whenToUse:
      'Use this to get a recipe for a buffer at a target pH, from either two salts or a single salt titrated with acid. It corrects the pKa for temperature, which is the reason it exists — a buffer adjusted warm and used cold is not at the pH you set.',
    workedExample: {
      scenario: 'You need 500 mL of 50 mM Tris at pH 8.0, adjusted at 25 °C but used at 4 °C.',
      inputs: [
        { label: 'Buffer', value: 'Tris, pKa 8.06' },
        { label: 'Target pH', value: '8.0' },
        { label: 'Concentration / volume', value: '50 mM, 500 mL' },
        { label: 'Adjust at / use at', value: '25 °C / 4 °C' },
      ],
      result: 'Weigh both forms in a roughly even ratio',
      reading:
        'The tool warns that this buffer will read about pH 8.59 in the cold room — adjust at 4 °C instead if that matters.',
    },
    commonMistakes: [
      'Adjusting the pH at bench temperature for an experiment that runs in the cold. Tris moves about 0.028 units per degree, so a 21 degree drop is more than half a pH unit.',
      'Choosing a buffer whose pKa is far from the target. Outside about one unit either side the buffering capacity collapses and the pH drifts on the first addition.',
      'Trusting the calculated recipe to the second decimal. No ionic strength correction is applied, which is worth roughly 0.1 units at physiological salt.',
    ],
    faq: [
      {
        question: 'Two salts or titration — which should I use?',
        answer:
          'Two salts is more reproducible and needs no meter. Titration is easier when you only stock one form, and it is what most published protocols describe.',
      },
      {
        question: 'Why does the tool still tell me to use a pH meter?',
        answer:
          'Because activity effects, temperature and the exact salt you weighed all move the real pH. The calculation gets you close; the meter confirms it.',
      },
      {
        question: 'Which buffer should I pick?',
        answer:
          'One whose pKa is within a unit of your target. The tool suggests better-suited buffers when your target sits outside the selected one’s useful range.',
      },
    ],
  },

  'centrifuge-rcf-rpm': {
    whenToUse:
      'Use this when a protocol specifies a force in × g and your centrifuge is set in rpm, or the reverse. The conversion depends entirely on your rotor’s radius, so the same rpm is a different force on every machine.',
    workedExample: {
      scenario:
        'A protocol says 12,000 × g and your microcentrifuge rotor has an 8.5 cm maximum radius.',
      inputs: [
        { label: 'Solve for', value: 'Speed' },
        { label: 'Target field', value: '12,000 × g' },
        { label: 'Maximum radius', value: '8.5 cm' },
      ],
      result: '11,220 rpm',
      reading:
        'That is the field at the tube bottom. Nearer the top of the tube the sample sees appreciably less.',
    },
    commonMistakes: [
      'Using the centrifuge’s radius rather than the rotor’s. The number belongs to the rotor, and swapping rotors changes it.',
      'Matching rpm when moving a protocol between machines. Match the force instead — matching rpm on a larger rotor turns a gentle spin into a hard one.',
      'Treating × g as a single number. A fixed-angle rotor can deliver more than twice the field at the tube bottom as at the liquid surface.',
    ],
    faq: [
      {
        question: 'Which radius should I enter?',
        answer:
          'The maximum, unless the protocol says otherwise. Manufacturers quote maximum RCF and protocols almost always mean it — but the tool shows the minimum and average too, so you can see the spread.',
      },
      {
        question: 'Where do I find my rotor’s radius?',
        answer:
          'In the rotor manual or stamped on the rotor itself. The tool offers nominal values by rotor class if you cannot find it, but they are starting points, not specifications.',
      },
      {
        question: 'Does time convert too?',
        answer:
          'Not by this tool. Keep the time and match the force; for a rigorous transfer between rotors of different geometry you need the k-factor, which is not implemented here.',
      },
    ],
  },

  'recipe-scaler': {
    whenToUse:
      'Use this when a recipe is written for one batch size and you need a different one, and every concentration must stay the same. It is the unitary method applied to a whole recipe. If you need to reach a target concentration from a stock of known strength, use the dilution calculator instead.',
    workedExample: {
      scenario:
        'A protocol adds 230 µL of a supplement to make up 10 mL of medium. You want 25 mL.',
      inputs: [
        { label: 'Recipe is written for', value: '10 mL' },
        { label: 'You want to make', value: '25 mL' },
        { label: 'Supplement', value: '230 µL' },
      ],
      result: '575 µL of supplement',
      reading: 'Made up to 25 mL with medium — 24.43 mL of it. The factor is 2.5 throughout.',
    },
    commonMistakes: [
      'Scaling some components and not others. Every component takes the same factor, including the ones that felt like round numbers at the original scale.',
      'Forgetting that the medium is what makes up the difference, not an extra 25 mL on top of the components.',
      'Scaling down past what a pipette can deliver. A component that becomes 0.5 µL needs an intermediate dilution, not a steadier hand.',
    ],
    faq: [
      {
        question: 'Do I need to know the concentration of the supplement?',
        answer:
          'No. The concentration cancels — what is preserved is the ratio of component to batch. Supplying it only lets the tool report what the stock must be, which is a useful check on an inherited recipe.',
      },
      {
        question: 'Can I scale a recipe with powders in it?',
        answer:
          'Yes. Masses scale by the same factor but do not displace medium, so the make-up volume stays correct.',
      },
      {
        question: 'Does this work for a PCR master mix?',
        answer:
          'Yes — treat one reaction as the reference batch and the number of reactions as the target, remembering to add overage for pipetting loss.',
      },
    ],
  },

  'nucleic-acid-quant': {
    whenToUse:
      'Use this to turn a spectrophotometer reading into a DNA or RNA concentration, and to judge whether the prep is clean enough to use. Absorbance cannot distinguish nucleic acid from free nucleotides, so for low or contaminated samples a fluorescent assay is the better measurement.',
    workedExample: {
      scenario: 'A plasmid prep read on a cuvette spectrophotometer.',
      inputs: [
        { label: 'Sample is', value: 'Double-stranded DNA' },
        { label: 'A260', value: '0.42' },
        { label: 'A280 / A230', value: '0.23 / 0.19' },
        { label: 'Path length', value: '1 cm' },
      ],
      result: '21 ng/µL',
      reading:
        'Ratios of 1.83 and 2.21 are both healthy, so the number can be trusted for a downstream reaction.',
    },
    commonMistakes: [
      'Using the dsDNA factor for RNA. The conversion is 50 µg/mL per A260 for duplex DNA and 40 for RNA, so the wrong one overstates an RNA prep by a quarter.',
      'Reading above about 1.0 absorbance. Past that the detector under-reports without complaining; dilute and read again.',
      'Ignoring a low 260/230. Guanidine and phenol carried through an extraction inhibit downstream enzymes even when the concentration looks perfectly good.',
    ],
    faq: [
      {
        question: 'What should the ratios be?',
        answer:
          'About 1.8 at 260/280 for DNA and 2.0 for RNA, and roughly 2.0 to 2.2 at 260/230 for both. Lower at 280 suggests protein; lower at 230 suggests salts, phenol or carbohydrate.',
      },
      {
        question: 'My microvolume instrument reports ng/µL already — do I need this?',
        answer:
          'For the concentration, usually not. For the interpretation, yes: this states which factor was applied and what the ratios imply, which the instrument does not.',
      },
      {
        question: 'Why does the 260/280 ratio change between readings?',
        answer:
          'It is sensitive to pH and ionic strength. Read against the same buffer the sample is in, and expect a slightly lower ratio in pure water.',
      },
    ],
  },

  'antibiotic-stock': {
    whenToUse:
      'Use this to work out how much antibiotic stock to add to a volume of medium, or what to weigh to make the stock in the first place. The reference concentrations are the usual ones for plasmid selection in E. coli and every field is editable for anything else.',
    workedExample: {
      scenario: 'Adding ampicillin to 500 mL of LB from a 100 mg/mL stock.',
      inputs: [
        { label: 'Antibiotic', value: 'Ampicillin' },
        { label: 'Stock concentration', value: '100 mg/mL' },
        { label: 'Working concentration', value: '100 µg/mL' },
        { label: 'Medium to treat', value: '500 mL' },
      ],
      result: '500 µL of stock',
      reading: 'A thousandfold dilution, delivering 50 mg of ampicillin into the flask.',
    },
    commonMistakes: [
      'Confusing mg/mL with µg/mL. Stocks are conventionally a thousandfold above the working concentration, so the two numbers on the page are identical and only the unit differs.',
      'Adding antibiotic to agar that is still near boiling. Let it cool to about 50 °C first — several antibiotics are destroyed before the plate sets.',
      'Autoclaving the stock. Filter sterilise instead; autoclaving destroys most antibiotics.',
    ],
    faq: [
      {
        question: 'Are these concentrations right for my organism?',
        answer:
          'They are the usual figures for selecting plasmids in E. coli. A low-copy plasmid, a rich medium or a different species all change them, so treat them as starting points.',
      },
      {
        question: 'Why are there satellite colonies on my ampicillin plate?',
        answer:
          'Ampicillin is degraded by β-lactamase secreted from resistant colonies, leaving pockets where sensitive cells grow. Carbenicillin is more stable and largely avoids it.',
      },
      {
        question: 'How long do plates keep?',
        answer:
          'Weeks in the dark at 4 °C for most, less for light-sensitive or unstable antibiotics such as tetracycline. If selection looks leaky, suspect the plates before the construct.',
      },
    ],
  },

  'agarose-gel': {
    whenToUse:
      'Use this to weigh the agarose for a gel, and to check the percentage actually resolves the fragment you are trying to see. The second half matters more — the arithmetic is easy and the choice of percentage is what costs an afternoon.',
    workedExample: {
      scenario: 'A 100 mL gel to resolve a 500 bp PCR product.',
      inputs: [
        { label: 'Gel percentage', value: '1.5% (w/v)' },
        { label: 'Buffer volume', value: '100 mL' },
        { label: 'Fragment', value: '500 bp' },
      ],
      result: '1.5 g of agarose',
      reading: '1.5% resolves 200–3000 bp, so a 500 bp band will run well clear of its neighbours.',
    },
    commonMistakes: [
      'Running a small product on a loose gel. A 500 bp fragment on 0.7% agarose runs near the front and cannot be distinguished from anything else down there.',
      'Adding stain to gel that is still too hot. Wait until it has cooled to about 60 °C, or the stain degrades.',
      'Pouring before the agarose has fully dissolved. Undissolved grains scatter light and read as bands under UV.',
    ],
    faq: [
      {
        question: 'TAE or TBE?',
        answer:
          'TBE resolves small fragments better and buffers longer. TAE is kinder to DNA you intend to extract, because borate inhibits several downstream enzymes.',
      },
      {
        question: 'What is 1% w/v in grams?',
        answer:
          'One gram in 100 mL, which is 10 g/L. The tool accepts the percentage directly and converts.',
      },
      {
        question: 'What if my fragment is under 100 bp?',
        answer:
          'Use polyacrylamide. Agarose above about 3% is difficult to pour and still resolves small fragments poorly.',
      },
    ],
  },
  // ------------------------------------------------- molecular biology ----
  'reverse-complement': {
    whenToUse:
      'Use this to get the complement, the reverse, or the reverse complement of a DNA or RNA sequence. The reverse complement is the one you almost always want: it is the opposite strand written the conventional way, and it is what a reverse primer has to be.',
    workedExample: {
      scenario: 'You need the reverse primer for a region beginning 5′-ATGGCTAGCTAG-3′.',
      inputs: [{ label: 'Sequence', value: '5′-ATGGCTAGCTAG-3′' }],
      result: '5′-CTAGCTAGCCAT-3′',
      reading:
        'That is the sequence to order. The plain complement, CATCGATCGATC, anneals to nothing useful because it is written backwards.',
    },
    commonMistakes: [
      'Ordering the complement instead of the reverse complement. It looks like a plausible sequence and anneals nowhere, and the error only surfaces after a failed PCR.',
      'Losing the strand convention. Sequences are written 5′ to 3′; a reverse complement written the other way round is the same molecule described unusably.',
      'Assuming ambiguity codes are handled elsewhere. This tool is IUPAC-aware, so N, R, Y and the rest complement correctly rather than being dropped.',
    ],
    faq: [
      {
        question: 'What is the difference between complement and reverse complement?',
        answer:
          'The complement swaps each base for its partner in place. The reverse complement does that and then reverses the order, which is how the opposite strand is actually written.',
      },
      {
        question: 'Does it handle RNA?',
        answer:
          'Yes — U is treated as T for pairing, and you can ask for the RNA form of the output.',
      },
      {
        question: 'Are lower case and line breaks a problem?',
        answer: 'No. Whitespace, numbers and case are cleaned up; FASTA headers are ignored.',
      },
    ],
  },

  'gc-content': {
    whenToUse:
      'Use this for the base composition of a sequence: GC percentage, counts, and GC skew. It is a quick sanity check on a primer, a read, or an assembly, and an input to older melting temperature formulas.',
    workedExample: {
      scenario: 'Checking a 20-mer primer before ordering.',
      inputs: [{ label: 'Sequence', value: 'ACGTAGCTAGGATCATGACC (20 nt)' }],
      result: '50% GC',
      reading:
        'Between 40 and 60% is the usual target for a PCR primer, so this one is comfortable.',
    },
    commonMistakes: [
      'Comparing GC percentages between sequences of very different length. A 20-mer moves 5% per base; a 2 kb sequence does not.',
      'Deciding what ambiguity codes should count as after the fact. Fix the convention first, because counting, ignoring or refusing them gives three different denominators.',
      'Using GC content alone to judge a primer. It says nothing about where the G and C sit, and a 3′ end matters far more than the overall figure.',
    ],
    faq: [
      {
        question: 'What GC content should a primer have?',
        answer:
          'Roughly 40 to 60%. Outside that range annealing behaves less predictably, though the distribution along the primer matters more than the total.',
      },
      {
        question: 'What is GC skew for?',
        answer:
          'It is (G − C)/(G + C) along a sequence, and it changes sign at the replication origin and terminus in many bacterial genomes.',
      },
      {
        question: 'Does GC content predict melting temperature?',
        answer:
          'Only loosely. The salt-adjusted formula uses it, but nearest-neighbour thermodynamics accounts for sequence order and is what primer suppliers quote.',
      },
    ],
  },

  translate: {
    whenToUse:
      'Use this to translate DNA or RNA into protein in any of the six reading frames, under a genetic code you choose. Reach for it when you need to confirm a construct is in frame, or find the open reading frame in a sequence you have just been handed.',
    workedExample: {
      scenario: 'Checking that a cloned insert is in frame.',
      inputs: [
        { label: 'Sequence', value: 'ATGGCTAGCTAGCCATGG' },
        { label: 'Genetic code', value: 'Standard' },
      ],
      result: 'Frame +1: MAS*',
      reading:
        'The stop at codon four is a frameshift or a genuine stop — either way this construct will not express the full protein.',
    },
    commonMistakes: [
      'Assuming frame +1. Six frames exist and the biologically meaningful one is often not the first; the tool shows all six so the choice is visible.',
      'Using the standard code for mitochondrial genes. Vertebrate mitochondria read TGA as tryptophan rather than stop, so the standard table truncates the protein at the first one.',
      'Translating a sequence whose length is not a multiple of three without noticing the trailing bases are dropped.',
    ],
    faq: [
      {
        question: 'Which reading frame should I use?',
        answer:
          'The one that gives a long open reading frame starting at a methionine and ending at a stop. For a known construct, the frame is set by where the ATG sits relative to your cloning site.',
      },
      {
        question: 'Why does my mitochondrial gene stop early?',
        answer:
          'Because you are probably using the standard code. Select the vertebrate mitochondrial code, where TGA is tryptophan.',
      },
      {
        question: 'What do the asterisks mean?',
        answer:
          'Stop codons. A stop in the middle of an expected coding region is the thing to look at.',
      },
    ],
  },

  'melting-temperature': {
    whenToUse:
      'Use this to estimate the melting temperature of a primer or probe, and to check the oligo is worth ordering at all. It reports every model at once because they disagree by more than ten degrees on the same sequence, and a Tm quoted without its model, salt and concentration is not reproducible.',
    workedExample: {
      scenario: 'A 28-mer primer in an ordinary PCR buffer.',
      inputs: [
        { label: 'Oligo', value: 'CGTTCCAAAGATGTGGGCATGAGCTTAC' },
        { label: 'Oligo concentration', value: '250 nM' },
        { label: 'Buffer', value: '50 mM Na⁺, 10 mM Tris, 1.5 mM Mg²⁺, 0.8 mM dNTPs' },
      ],
      result: 'Nearest neighbour 68.4 °C',
      reading:
        'The salt-adjusted formula says 67.2 and the Wallace rule 84.0 — a 16.9 °C spread, which is why the model has to be stated.',
    },
    commonMistakes: [
      'Using a Tm from one tool with an annealing temperature rule from another. The models disagree, so mixing sources silently shifts your annealing temperature by degrees.',
      'Leaving the salt at a default. Magnesium raises the Tm substantially and dNTPs chelate it back down, so a PCR buffer is a genuinely different environment from 50 mM sodium.',
      'Treating melting temperature as annealing temperature. A common starting point is 3–5 °C below the lower primer Tm, but the optimum comes from a gradient.',
    ],
    faq: [
      {
        question: 'Which model should I use?',
        answer:
          'Nearest neighbour, and the Allawi & SantaLucia 1997 set if your number has to agree with a supplier. The other two are shown so you can see how far a simpler rule drifts.',
      },
      {
        question: 'Why is my supplier’s Tm different?',
        answer:
          'Almost always the parameter set, the salt, or the oligo concentration. Match all three and the numbers converge.',
      },
      {
        question: 'What is a self-dimer and does it matter?',
        answer:
          'A primer pairing with a copy of itself. It consumes primer and can amplify, and it matters most when the pairing reaches the 3′ end, because then the primer can extend on itself.',
      },
    ],
  },

  // -------------------------------------------------------- cell biology ----
  od600: {
    whenToUse:
      'Use this to correct an optical density reading for dilution and path length, to estimate cell density from it, and to plan a dilution to a target OD. Remember it is a scattering measurement, not an absorbance one, so any conversion to cells per millilitre is a calibration rather than a constant.',
    workedExample: {
      scenario: 'An overnight culture read after a 1 in 10 dilution.',
      inputs: [
        { label: 'Reading', value: '0.24' },
        { label: 'Diluted before reading', value: '10-fold' },
        { label: 'Read on', value: 'Cuvette, 1 cm' },
        { label: 'Organism', value: 'E. coli, 8 × 10⁸ cells/mL per OD' },
      ],
      result: 'Culture OD600 = 2.4',
      reading:
        'About 1.9 × 10⁹ cells/mL. The reading of 0.24 is inside the linear range, so the figure is sound.',
    },
    commonMistakes: [
      'Reading a dense culture neat. Above about 0.4 on a 1 cm path the detector under-reports badly; dilute into the linear range and multiply back.',
      'Applying a cuvette assumption to a plate reader. A 200 µL well is roughly 0.6 cm deep, so a plate reading of 0.3 is about 0.5 per centimetre.',
      'Quoting a conversion factor to three significant figures. It moves with strain, growth phase and instrument; calibrate against plate counts if the number matters.',
    ],
    faq: [
      {
        question: 'Why do my spectrophotometer and plate reader disagree?',
        answer:
          'Different path length and different collection geometry. Cells scatter rather than absorb, so the fraction of scattered light reaching the detector depends on the instrument.',
      },
      {
        question: 'What is the linear range?',
        answer:
          'Roughly up to 0.4 absorbance on a standard 1 cm path. The check belongs on the reading the instrument took, not on the corrected culture value.',
      },
      {
        question: 'How do I get to a target OD for an induction?',
        answer:
          'Switch the tool to the dilution mode: give it your current OD, the target and the volume you want, and it returns the culture and medium volumes.',
      },
    ],
  },

  hemocytometer: {
    whenToUse:
      'Use this to turn a chamber count into cells per millilitre, with an honest interval on it, and to work out viability from a trypan blue count. The interval is the reason it exists — counting is a Poisson process and almost nothing else reports the uncertainty.',
    workedExample: {
      scenario:
        'Four large squares counted on a Neubauer improved chamber, after a 1:1 trypan blue mix.',
      inputs: [
        { label: 'Live / dead counted', value: '180 / 20' },
        { label: 'Squares counted', value: '4' },
        { label: 'Dilution factor', value: '2' },
      ],
      result: '9.0 × 10⁵ live cells/mL',
      reading: 'The 95% interval spans roughly ±15%, and viability is 90% with its own interval.',
    },
    commonMistakes: [
      'Forgetting that trypan blue is itself a dilution. Mixed one to one it is a twofold dilution, and omitting it halves every number downstream.',
      'Counting 100 cells and reporting three significant figures. A hundred cells is worth about ±20%; the extra digits are not measurements.',
      'Using the familiar × 10⁴ on a chamber that is not a Neubauer. A Fuchs–Rosenthal is twice as deep, so the same multiplier doubles the answer.',
    ],
    faq: [
      {
        question: 'How many cells do I need to count?',
        answer:
          'For ±10% at 95% confidence, about 385. The conventional 100 gives roughly ±20%, which is fine for a passage and not fine for comparing two flasks.',
      },
      {
        question: 'Why is the interval not symmetric at low counts?',
        answer:
          'Because it is the exact Poisson interval rather than count ± 1.96√count. The normal approximation is poor at low counts and can even go negative.',
      },
      {
        question: 'Is trypan blue exclusion a good viability measure?',
        answer:
          'It is quick and adequate for routine passaging. It measures membrane integrity, so it will call an early-apoptotic cell alive.',
      },
    ],
  },

  'cell-seeding': {
    whenToUse:
      'Use this to turn a seeding density into the volumes you actually pipette, for one vessel or a whole plate. It offers a master mix route and a per-vessel route because they are different jobs, and it catches doses too small to pipette reliably.',
    workedExample: {
      scenario: 'Seeding a 6-well plate at 5 × 10⁴ cells/cm² from a 1 × 10⁶ cells/mL suspension.',
      inputs: [
        { label: 'Vessel', value: '6-well plate, 9.6 cm² per well' },
        { label: 'Target density', value: '5 × 10⁴ cells/cm²' },
        { label: 'Suspension', value: '1 × 10⁶ cells/mL' },
        { label: 'Wells + overage', value: '6 wells, 10%' },
      ],
      result: '3.17 mL of suspension into 16.5 mL total',
      reading: 'Dispense 2.5 mL per well from that master mix and every well matches.',
    },
    commonMistakes: [
      'Dosing each well separately across a plate. Small per-well volumes scatter the density; a master mix dispensed evenly is what makes a plate uniform.',
      'Forgetting overage. Without it the last well gets whatever is left in the reservoir, which is always short.',
      'Mixing up cells per cm² and cells per well. They differ by the growth area, which is 0.32 cm² for a 96-well and 175 cm² for a T175.',
    ],
    faq: [
      {
        question: 'Cells per cm² or per well?',
        answer:
          'Publications quote per cm² because it transfers between vessel formats. The tool accepts either and shows the conversion.',
      },
      {
        question: 'How much overage should I allow?',
        answer:
          'Ten per cent is the usual allowance for a plate. More if you are using a multichannel pipette and a reservoir, where dead volume is larger.',
      },
      {
        question: 'What if the volume needed is under a microlitre?',
        answer:
          'Dilute the suspension first and take a measurable volume. The tool warns when a dose falls below what a pipette delivers accurately.',
      },
    ],
  },

  // ------------------------------------------------------------ protein ----
  'protein-parameters': {
    whenToUse:
      'Use this to get mass, isoelectric point, extinction coefficient and composition from a protein sequence. The extinction coefficient is what turns an A280 reading into a concentration; the pI is the least reliable output and should be treated as a starting point rather than a measurement.',
    workedExample: {
      scenario: 'You have a purified protein and an A280 reading of 0.55.',
      inputs: [
        { label: 'Sequence', value: 'Your protein, 1 Trp and 2 Tyr' },
        { label: 'Cysteines', value: 'Reduced' },
        { label: 'pKa set', value: 'Bjellqvist (ExPASy)' },
      ],
      result: 'ε₂₈₀ = 8480 M⁻¹cm⁻¹',
      reading: 'A280 of 0.55 through 1 cm is therefore about 65 µM.',
    },
    commonMistakes: [
      'Guessing the cysteine state. The 280 nm coefficient counts disulfide bonds, not cysteines, so reduced and oxidised protein give different answers and different concentrations.',
      'Quoting a computed pI as though it were measured. It depends on the pKa set, and it assumes every ionisable group is freely exposed, which in a folded protein they are not.',
      'Forgetting the tag. A His tag, a cleaved signal peptide or a phosphorylation all change the real molecule, and phosphorylation moves the pI substantially.',
    ],
    faq: [
      {
        question: 'Why do two tools give different pI values?',
        answer:
          'Different pKa sets. Bjellqvist matches ExPASy, which is where most published values come from; EMBOSS is used by pipelines built on it. The tool lets you pick.',
      },
      {
        question: 'My protein has no tryptophan — can I still use A280?',
        answer:
          'Cautiously. With tyrosine alone the coefficient is least reliable, and with neither residue the protein does not absorb at 280 at all. Use a colourimetric assay instead.',
      },
      {
        question: 'Average or monoisotopic mass?',
        answer:
          'Average for ordinary use. Monoisotopic for mass spectrometry, where the difference is a whole dalton on a small protein. Both are reported.',
      },
    ],
  },

  'structure-alignment': {
    whenToUse:
      'Use this to superpose two structures and measure how similar they are, without needing their sequences to match. Reach for TM-score when the question is whether two proteins share a fold, and RMSD when they are the same protein in two states.',
    workedExample: {
      scenario: 'Comparing the alpha and beta chains of haemoglobin.',
      inputs: [
        { label: 'First structure', value: '4HHB chain A, 141 residues' },
        { label: 'Second structure', value: '4HHB chain B, 146 residues' },
      ],
      result: 'TM-score 0.90, RMSD 1.41 Å over 139 residues',
      reading:
        'The globin fold, found from geometry alone at only 43% sequence identity — which is the point of a sequence-independent alignment.',
    },
    commonMistakes: [
      'Judging fold similarity by RMSD. It grows with length and one flexible loop drags it as hard as a wrong topology; 4 Å means different things across 60 and 600 residues.',
      'Quoting a TM-score without saying which length normalised it. The measure is asymmetric, and a small domain inside a large protein scores high one way and low the other.',
      'Reading a single number and stopping. The per-residue plot is where a rigid core with one moving hinge separates from two structures differing everywhere.',
    ],
    faq: [
      {
        question: 'What TM-score counts as the same fold?',
        answer:
          'Above about 0.5 two structures share a fold; below about 0.3 they are no more alike than two proteins picked at random.',
      },
      {
        question: 'Are my files uploaded anywhere?',
        answer:
          'No. Both are read locally with FileReader and never leave your machine, which for an unreleased structure is the difference between a usable tool and one your institution will not allow.',
      },
      {
        question: 'Does it accept mmCIF?',
        answer:
          'Yes, and PDB. The RCSB has served mmCIF by default since 2019, and large structures cannot be represented in the older fixed-column format at all.',
      },
    ],
  },

  // --------------------------------------------------------- statistics ----
  't-test': {
    whenToUse:
      'Use this to compare two groups. Welch’s test is the sensible default and the tool reports the difference with its confidence interval and an effect size, because a p-value on its own does not tell you whether the difference matters.',
    workedExample: {
      scenario: 'Treated versus control, six replicates each.',
      inputs: [
        { label: 'Test', value: 'Welch’s unpaired' },
        { label: 'Group sizes', value: '6 and 6' },
      ],
      result: 'Difference of means with a 95% interval',
      reading:
        'Read the interval first: if it spans values that would and would not change your conclusion, the experiment is underpowered whatever the p-value says.',
    },
    commonMistakes: [
      'Pooling technical replicates as though they were independent. Three dishes from one experiment is an n of one, and this is the commonest way papers report significance that is not there.',
      'Choosing the paired test because the groups are the same size. Pairing requires each measurement to have a genuine partner — the same animal, the same dish, before and after.',
      'Reporting only the p-value. Give the difference and its interval; the p-value belongs last and small.',
    ],
    faq: [
      {
        question: 'Welch’s or Student’s?',
        answer:
          'Welch’s, as the default. It costs almost nothing when the variances match and protects you when they do not, so there is little reason to assume equal variance.',
      },
      {
        question: 'What if my data are not normal?',
        answer:
          'Mann–Whitney is the usual fallback, though at small n it has little power. Note that it returns no confidence interval here, because it does not estimate one.',
      },
      {
        question: 'What effect size does it report?',
        answer:
          'Hedges’ g, which applies a small-sample correction to Cohen’s d. The correction vanishes at large n, so there is no case for the uncorrected version.',
      },
    ],
  },

  anova: {
    whenToUse:
      'Use this to compare three or more groups at once, and to follow up with pairwise comparisons that are corrected for the number of tests. Reach for it instead of running several t-tests, which inflates the error rate.',
    workedExample: {
      scenario: 'Four treatment groups, five replicates each.',
      inputs: [
        { label: 'Groups', value: '4' },
        { label: 'Replicates', value: '5 per group' },
      ],
      result: 'F statistic with its p-value, and Holm-corrected pairwise comparisons',
      reading:
        'A significant F says the groups are not all alike; the pairwise table says which differ.',
    },
    commonMistakes: [
      'Running every pairwise t-test instead. Six comparisons at α = 0.05 give roughly a one in four chance of a false positive somewhere.',
      'Stopping at the F statistic. It tells you something differs, not what, which is why the pairwise comparisons are there.',
      'Treating a non-significant F as evidence the groups are the same. It is evidence of nothing in particular, especially at small n.',
    ],
    faq: [
      {
        question: 'Why Holm rather than Bonferroni?',
        answer:
          'Holm controls the same family-wise error rate and is uniformly more powerful, so there is no reason to prefer plain Bonferroni.',
      },
      {
        question: 'Do I need equal group sizes?',
        answer: 'No, though unequal sizes make the test more sensitive to unequal variances.',
      },
      {
        question: 'What if the assumptions do not hold?',
        answer:
          'Kruskal–Wallis is the rank-based alternative. As with Mann–Whitney, you trade the ability to state an effect size and interval for fewer assumptions.',
      },
    ],
  },

  correlation: {
    whenToUse:
      'Use this to measure how strongly two variables move together, and to fit a line if that is what you need. Pearson measures a linear relationship; Spearman measures a monotonic one and is the right choice when the relationship is curved or the data have outliers.',
    workedExample: {
      scenario: 'Protein concentration against absorbance across a standard curve.',
      inputs: [
        { label: 'Method', value: 'Pearson' },
        { label: 'Pairs', value: '8' },
      ],
      result: 'r with its confidence interval, plus slope and intercept',
      reading:
        'A high r says the points lie near a line. It says nothing about whether the slope is the one you expected.',
    },
    commonMistakes: [
      'Reading correlation as causation, or as agreement. Two methods can correlate almost perfectly and still disagree by a constant factor.',
      'Using Pearson on a curved relationship. It measures linear association only, and will understate a strong non-linear one.',
      'Quoting r without n. The same r means quite different things at 5 points and at 500.',
    ],
    faq: [
      {
        question: 'Pearson or Spearman?',
        answer:
          'Pearson if you expect a straight line and the data are roughly normal. Spearman if the relationship is monotonic but curved, or if outliers would dominate.',
      },
      {
        question: 'Does a high r² mean a good calibration?',
        answer:
          'Not on its own. Check the residuals for structure and the slope for the value you expected; r² is easy to inflate by spreading the standards further apart.',
      },
      {
        question: 'Can I use this for method comparison?',
        answer:
          'Correlation is the wrong tool for agreement. Use a Bland–Altman plot, which shows bias and limits of agreement rather than association.',
      },
    ],
  },

  contingency: {
    whenToUse:
      'Use this for counts in categories — how many colonies grew and did not, on each of two plates. Chi-square is the general test; Fisher’s exact is the one to use when any expected count is small, which in a typical biology table is often.',
    workedExample: {
      scenario: 'Transformation efficiency with two different plasmids.',
      inputs: [
        { label: 'Table', value: '2 × 2 counts' },
        { label: 'Test', value: 'Fisher’s exact' },
      ],
      result: 'Odds ratio with its confidence interval, and an exact p-value',
      reading:
        'The odds ratio is the effect size; an interval spanning 1 means the data are consistent with no difference.',
    },
    commonMistakes: [
      'Using chi-square when expected counts are small. Below about five per cell the approximation breaks down and Fisher’s exact is the honest test.',
      'Putting percentages into the table. These tests need raw counts; percentages discard the sample size the whole inference rests on.',
      'Testing a table whose cells are not independent. Repeated measures on the same animals need a different approach entirely.',
    ],
    faq: [
      {
        question: 'Chi-square or Fisher’s exact?',
        answer:
          'Fisher’s exact when any expected count is below about five, and it is always defensible for a 2 × 2 table. Chi-square scales better to larger tables.',
      },
      {
        question: 'What effect size should I report?',
        answer:
          'The odds ratio or the risk difference, with an interval. A p-value alone says nothing about how large the difference is.',
      },
      {
        question: 'Do I need Yates’ correction?',
        answer:
          'It is conservative and largely superseded by simply using Fisher’s exact when the counts are small.',
      },
    ],
  },

  'multiple-testing': {
    whenToUse:
      'Use this when you have run many tests at once — a differential expression list, a screen — and need to correct the p-values. Benjamini–Hochberg controls the proportion of your hits that are false; Bonferroni controls the chance of any false positive at all, and is far stricter.',
    workedExample: {
      scenario: 'A differential expression list of 20,000 genes.',
      inputs: [
        { label: 'Method', value: 'Benjamini–Hochberg' },
        { label: 'Threshold', value: 'FDR 0.05' },
      ],
      result: 'Adjusted p-values and the number passing',
      reading:
        'An FDR of 0.05 means about 5% of the genes you call significant are expected to be wrong — which is a different promise from Bonferroni’s.',
    },
    commonMistakes: [
      'Not correcting at all. Twenty thousand tests at α = 0.05 give a thousand false positives before any biology is involved.',
      'Using Bonferroni on a genome-wide screen. It controls a stricter error rate than you usually need and will discard almost everything real.',
      'Correcting a subset chosen after looking at the results. The family has to be defined before you see which tests were interesting.',
    ],
    faq: [
      {
        question: 'What does an FDR of 0.05 actually mean?',
        answer:
          'Of the tests you call significant, about 5% are expected to be false positives. It is a statement about your hit list, not about each individual test.',
      },
      {
        question: 'When is Bonferroni the right choice?',
        answer:
          'When a single false positive is costly — a clinical decision, a confirmatory test — and the number of comparisons is small.',
      },
      {
        question: 'Why is my adjusted p-value the same as another gene’s?',
        answer:
          'Benjamini–Hochberg enforces monotonicity, so adjacent adjusted values are often tied. That is expected behaviour, not a bug.',
      },
    ],
  },

  power: {
    whenToUse:
      'Use this before an experiment to work out how many replicates you need, or after one to understand what it could realistically have detected. It is most useful as a design tool — power computed after a null result mostly restates the p-value.',
    workedExample: {
      scenario: 'Planning a two-group comparison expecting a medium effect.',
      inputs: [
        { label: 'Design', value: 'Two-sample' },
        { label: 'Effect size (d)', value: '0.5' },
        { label: 'Power / alpha', value: '80% / 0.05' },
      ],
      result: '64 per group',
      reading:
        'If that is more animals than you can run, the honest conclusion is that the experiment cannot answer the question as designed.',
    },
    commonMistakes: [
      'Computing power after the fact from the observed effect. Observed power is a deterministic function of the p-value and adds nothing.',
      'Picking an effect size because it gives a convenient n. It should be the smallest difference that would change what you do, decided before you look.',
      'Forgetting that n is per group. A two-sample calculation returning 64 means 128 animals in total.',
    ],
    faq: [
      {
        question: 'Where do I get an effect size?',
        answer:
          'From pilot data, from the literature, or from the smallest difference that would matter biologically. The last is usually the most defensible.',
      },
      {
        question: 'Why does the tool use the noncentral t distribution?',
        answer:
          'Because the normal approximation understates the required sample size at small n, which is precisely where the answer matters.',
      },
      {
        question: 'Is 80% power a rule?',
        answer:
          'It is a convention, not a law. It means accepting a one in five chance of missing a real effect of the size you specified.',
      },
    ],
  },

  // ------------------------------------------------------------ imaging ----
  'spectra-viewer': {
    whenToUse:
      'Use this when you are choosing fluorophores and need to see whether they will separate, or when you want to know how well a laser line you actually have excites something. It answers questions about the molecules. If the question is about your filters — what a given cube will collect, or how much of one channel is really another — the filter set checker is the tool, and if you are choosing between fluorophores on brightness rather than colour, use the brightness comparison.',
    workedExample: {
      scenario: 'You are planning a two-colour experiment on a confocal with 488 and 561 nm lines.',
      inputs: [
        { label: 'Fluorophores', value: 'EGFP, mCherry' },
        { label: 'Laser lines', value: '488, 561' },
      ],
      result: 'EGFP 100% at 488 and 0% at 561; mCherry 8% at 488 and 64% at 561.',
      reading:
        'The pair is clean in one direction and not the other: 561 cannot excite EGFP at all, but 488 does excite mCherry to 8% of its peak, so some red signal will appear in a 488-only image and it will not be a filter fault.',
    },
    commonMistakes: [
      'Reading peak height as brightness. Every curve is normalised to its own maximum, so a fluorophore with a tenth of the extinction coefficient draws exactly as tall a peak. The brightness column is the number that compares them, and it can differ by a factor of ten between two curves that look identical.',
      'Judging separation from the two emission maxima alone. What causes bleed-through is the tail, not the peak — EGFP still emits about 1% of its photons beyond 625 nm, which is enough to see in a red channel from a bright sample.',
      'Assuming the excitation spectrum is negligible away from its peak. EGFP is still at about 17% of maximum on a 405 nm line, because its chromophore has a protonated form absorbing near 400 nm, so a violet channel is never as clean as the maxima suggest.',
      'Treating a published spectrum as what your sample will do. These are measured on purified protein or free dye in buffer; pH, chloride and the fusion partner all shift things, and for a pH-sensitive protein such as EYFP inside an acidic compartment the shift is large enough to change the experiment.',
    ],
    faq: [
      {
        question: 'Where do the spectra come from?',
        answer:
          'FPbase, whose data terms place it under no copyright restriction for commercial or non-commercial use, asking only that the original authors of each measurement are credited. The set here is curated to 45 fluorophores people actually image with rather than mirrored wholesale.',
      },
      {
        question: 'Why is the excitation curve dashed and the emission filled?',
        answer:
          'So the two are distinguishable without colour, since fluorophores are drawn in colours derived from their own emission wavelength and several of them are close together. The fill also makes overlapping emission — the thing that causes trouble — visible where two outlines would cross confusingly.',
      },
      {
        question: 'What is a Stokes shift and does a big one help?',
        answer:
          'It is the gap between the excitation and emission maxima. A large one makes a fluorophore easier to separate from its own excitation light and lets it share a laser line with something else, which is why large-shift proteins such as mPlum are chosen despite being dim.',
      },
      {
        question: 'Why do some entries have no brightness figure?',
        answer:
          'Because no extinction coefficient or quantum yield is published for them in the source database. Several older dyes are in that position. The tool shows a dash rather than a guess, and those entries also cannot be used as a FRET acceptor.',
      },
    ],
  },

  'filter-compatibility': {
    whenToUse:
      'Use this before staining anything, when you have a panel in mind and a microscope with particular filters, to find out what each channel will really collect. It is also the tool for diagnosing a channel that looks contaminated after the fact. It models filters from their designation rather than measured curves, so any part you can name works; it does not model your detector, which starts to matter past about 700 nm.',
    workedExample: {
      scenario:
        'EGFP and mCherry on a confocal: a green channel at 488 with a 525/50 emission filter, and a red channel at 561 with 600/50.',
      inputs: [
        { label: 'Fluorophores', value: 'EGFP, mCherry' },
        { label: 'Green channel', value: '488 nm, 495 LP, 525/50' },
        { label: 'Red channel', value: '561 nm, 570 LP, 600/50' },
      ],
      result:
        'EGFP: 100% green, 0.0% red. mCherry: 0.0% green, 100% red, excited to 64% and collected at 42%.',
      reading:
        'The panel works, and the interesting number is the last one: the red channel collects only 42% of what mCherry emits, so a wider emission filter is the cheapest signal available here — cross-talk is not what is limiting this experiment.',
    },
    commonMistakes: [
      'Choosing an emission filter from the fluorophore alone and never checking it against the other labels. A 600/50 is a perfectly good mCherry filter and a poor one if there is a TagRFP in the next channel, and nothing about the single-colour view reveals that.',
      'Blaming the filters for a fluorophore the illumination barely reaches. If a label is only 5% excited in its own best channel, no emission filter recovers light that was never emitted — that needs a different laser line, and the tool says so rather than suggesting a filter change.',
      'Forgetting that sequential excitation removes most cross-talk for free. DAPI emits well into a green passband, but at 488 nm it absorbs nothing at all, so a sequentially acquired green channel sees exactly none of it. The same two filters with a shared violet line leak badly.',
      'Reading the channel composition figures as a prediction. They assume equal molar amounts of every fluorophore, and a strong promoter against a knock-in tag differs by orders of magnitude — enough to swamp the entire calculation. The bleed-through table carries no such assumption.',
    ],
    faq: [
      {
        question: 'How do I write my filters?',
        answer:
          'As they are printed: a bandpass as centre/width such as 525/50, and an edge filter with LP or SP such as 495 LP. Vendor part numbers including ET525/50m and FF01-525/50-25 are read correctly. A bare number is refused, because 525 alone could be either a bandpass centre or a longpass edge.',
      },
      {
        question: 'Why is bleed-through independent of expression level?',
        answer:
          'Because each row compares one fluorophore against itself in two channels. How much of it is present, and how bright it is, multiply both numbers equally and cancel out. That is what makes the figure worth trusting when nothing else about the sample is known.',
      },
      {
        question: 'What does "fit to" do to a channel?',
        answer:
          'It derives a filter set from that fluorophore’s own spectra: the dichroic goes where its excitation and emission curves cross, the excitation band runs from there out to half maximum, and the emission band out to a fifth of maximum. It knows nothing of any vendor catalogue, which is why agreeing closely with the standard cubes is worth something.',
      },
      {
        question: 'How accurate is modelling a filter instead of measuring it?',
        answer:
          'Good enough for the question being asked. The model assumes perfect out-of-band blocking, and a real hard-coated filter blocks to about one part in 100,000 — far below the in-band spectral overlap that actually causes cross-talk, which is modelled properly. It will understate leakage from a damaged or badly angled filter.',
      },
    ],
  },

  'fret-pair': {
    whenToUse:
      'Use this when choosing a donor and acceptor for a FRET biosensor or an interaction assay, or to check whether the distance you are trying to measure falls inside the range a pair can report at all. It computes the Förster radius from the actual spectra rather than quoting a table. It does not tell you whether two proteins interact — it tells you whether you would be able to see it if they did.',
    workedExample: {
      scenario:
        'A cyan-to-yellow biosensor with the two fluorophores expected to sit about 5 nm apart.',
      inputs: [
        { label: 'Donor', value: 'mTurquoise2' },
        { label: 'Acceptor', value: 'mVenus' },
        { label: 'Orientation κ²', value: '2/3 (free rotation)' },
        { label: 'Refractive index', value: '1.4 (protein interior)' },
        { label: 'Separation', value: '5 nm' },
      ],
      result: 'R₀ = 5.66 nm, giving 67.8% transfer at 5 nm.',
      reading:
        'A good working point: efficiency is measurable between about 3.9 and 8.2 nm, and 5 nm sits inside that with room to move in both directions, which is what a sensor needs in order to have a signal to change.',
    },
    commonMistakes: [
      'Choosing a pair on Förster radius alone. Direct excitation of the acceptor by the donor line, and donor emission leaking into the acceptor channel, sink more intensity-based FRET experiments than a short R₀ does — and both need their own single-label controls rather than a better pair.',
      'Believing κ² = 2/3 without asking whether it applies. It assumes both dipoles rotate freely and fast compared with the donor lifetime, which is reasonable for a dye on a long linker and questionable for a fluorescent protein whose chromophore is rigidly held inside a β-barrel.',
      'Reading a change in acceptor intensity as a change in distance. Acceptor signal also rises with expression, with maturation, and with direct excitation; ratiometric measurements and donor lifetime exist precisely because raw acceptor intensity does not mean what it appears to.',
      'Picking a pair whose emissions are close together. EGFP into EYFP has a perfectly respectable Förster radius and is nearly useless ratiometrically, because no filter cleanly separates the two channels. Such pairs belong in a lifetime measurement on the donor.',
    ],
    faq: [
      {
        question: 'Why is my R₀ slightly different from the published value?',
        answer:
          'Published radii assume a particular quantum yield, refractive index and κ², and papers differ on all three — a value quoted at n = 1.33 is about 2% larger than the same pair at 1.4. The spectra themselves also vary between measurements. Agreement to within a few per cent is as close as this quantity gets.',
      },
      {
        question: 'How much does the orientation factor really matter?',
        answer:
          'Less than its reputation suggests, because R₀ depends on it only as the sixth root. The entire physical range from 0 to 4 moves the radius by a factor of about 2.9, and the plausible range for a tethered protein pair moves it by well under a fifth.',
      },
      {
        question: 'Is the static κ² of 0.476 the average of κ²?',
        answer:
          'No, and this is worth being careful about. The mean of κ² is 2/3 whether the dipoles are moving or frozen; 0.476 is the square of the mean of |κ|, an average appropriate to the static limit. The two differ by 40%, and they are frequently confused.',
      },
      {
        question: 'Can I use this for single-molecule FRET?',
        answer:
          'Yes — Cy3 to Cy5 is in the catalogue and comes out near the published 5.4 nm. For smFRET the dyes are on flexible linkers, so κ² = 2/3 is far better justified there than it is for a fluorescent protein pair.',
      },
    ],
  },

  'fluorophore-brightness': {
    whenToUse:
      'Use this when deciding which fluorophore to put in a construct or on an antibody, and you want to know what your own microscope will detect rather than what a table says. Molecular brightness is the fluorophore’s own property; practical brightness folds in how well your line excites it and how much of its emission your filter passes. Use the spectra viewer instead if the question is about colour separation rather than signal.',
    workedExample: {
      scenario: 'A widefield green channel: a 488 nm line and a 525/50 emission filter.',
      inputs: [
        { label: 'Laser', value: '488 nm' },
        { label: 'Emission filter', value: '525/50' },
        { label: 'Rank by', value: 'In this setup' },
      ],
      result:
        'mStayGold 100%, mNeonGreen 66%, Alexa Fluor 488 54%, mEmerald 41% — against molecular brightnesses of 136, 93, 67 and 39.',
      reading:
        'mEmerald is the only one of the four that this line excites fully, at 100%, and it still finishes last: being perfectly matched to the laser does not compensate for having a third of the extinction coefficient.',
    },
    commonMistakes: [
      'Choosing on ε × Φ alone. Move the same comparison to a 405 nm line and a 450/50 filter and mCerulean3 is the brighter molecule while mTagBFP2 delivers 3.9 times the signal, purely because the line excites it to 96% rather than 58%.',
      'Ranking fluorophores by the photobleaching half-lives shown here. Those figures are not comparable with one another: each comes from a different paper at a different illumination intensity, in a different medium, and the same protein has been published with values an order of magnitude apart. Read a small number as a prompt to test it yourself.',
      'Forgetting everything this does not model. Maturation time, folding efficiency, expression level, and whether the fusion tolerates the tag at all routinely matter more in a live cell than any column here — a bright protein that matures slowly is dark for the first hours of a timelapse.',
      'Assuming a dye conjugate behaves like the free dye. These figures are for the free fluorophore; on a densely labelled antibody, self-quenching can cost most of the brightness, and it is worst for exactly the narrow-Stokes-shift dyes that look best on paper.',
    ],
    faq: [
      {
        question: 'What are the units of brightness?',
        answer:
          'ε × Φ divided by 1000, which is the convention every fluorescent protein paper uses — EGFP is 33.5 on that scale. It has no physical meaning on its own and exists only to be compared with other entries in the same column.',
      },
      {
        question: 'Why is a bright far-red dye shown at zero in my green setup?',
        answer:
          'Because a 488 nm line does not excite it. The practical column is the molecular brightness multiplied by how much of the molecule the illumination reaches, so a fluorophore the laser cannot touch scores near zero however bright it is in principle.',
      },
      {
        question: 'Does this account for the camera?',
        answer:
          'No. Detector quantum efficiency is not modelled, which is fine across the visible range and increasingly wrong past about 700 nm, where a silicon sensor falls off steeply. A near-infrared dye will look better here than it will on your camera.',
      },
      {
        question: 'Should I always pick the brightest one?',
        answer:
          'No. Photostability decides long timelapses, monomeric behaviour decides whether a fusion works at all, and maturation decides what you see in the first hours. Brightness matters most when signal is genuinely the limit — which is worth confirming before optimising for it.',
      },
    ],
  },

  'microscope-explorer': {
    whenToUse:
      'Use this to learn what the parts of a microscope are for and how the light gets from the lamp to the detector, or to work out why a technique behaves as it does — why closing the condenser sharpens the image and costs resolution, why a phase plate has to sit at the back focal plane, why a confocal pinhole sections. It is a teaching diagram with real resolution figures attached; it is not an optical design tool, and it will not tell you which objective to buy.',
    workedExample: {
      scenario:
        'You are asked why phase contrast looks softer than brightfield on the same 0.75 NA objective.',
      inputs: [
        { label: 'Instrument', value: 'Brightfield, then Phase contrast' },
        { label: 'Objective', value: 'NA 0.75, air (fitted on both)' },
        { label: 'Wavelength', value: '550 nm' },
        { label: 'Criterion', value: 'Abbe' },
      ],
      result: 'Brightfield 333 nm; phase contrast 423 nm, from the same objective.',
      reading:
        'The condenser annulus cuts the illuminating aperture from 0.9 to 0.55, and Abbe’s two-NA form averages the two — so the contrast that makes an unstained cell visible is paid for in resolution, by about a quarter, before anything else happens.',
    },
    commonMistakes: [
      'Believing phase contrast or DIC resolves more than brightfield. Neither moves the diffraction limit by a nanometre. They convert phase into amplitude so a transparent object becomes visible at all, and phase contrast actually costs resolution through the annulus — visibility and resolution are different quantities and are traded against each other constantly.',
      'Treating the confocal pinhole as a resolution device. Closing it below one Airy unit buys at most a factor of √2 laterally, and only by discarding most of the signal. What a pinhole does is reject out-of-focus light, which is sectioning; the reason a confocal image looks so much better on a thick sample is that the haze is gone, not that anything finer is resolved.',
      'Confusing the two sets of conjugate planes. Field planes — field diaphragm, specimen, intermediate image — focus together; aperture planes — lamp filament, condenser diaphragm, objective back focal plane — focus together and never with the first set. Almost every alignment mistake in transmitted light is one of these mistaken for the other.',
      'Closing the condenser aperture for contrast without knowing the price. It is the easiest contrast available and it directly lowers the illuminating NA, so the crisper-looking image is carrying genuinely less information. Filling 70 to 90% of the objective back aperture is the usual compromise.',
      'Reading the drawing as an optical design. The spacings are schematic, chosen so the order of the parts and the conjugate planes are right; no focal length is claimed and no ray is traced through a prescription. The resolution figures are real closed forms and do not come from the drawing.',
    ],
    faq: [
      {
        question: 'Why do three different resolution figures exist for one objective?',
        answer:
          'Because Abbe, Rayleigh and Sparrow define "resolved" differently — the grating limit, the first-zero overlap, and the point at which the dip between two maxima vanishes. They differ by about 20% across the range, and a paper quoting one while naming another is common enough that the criterion is a selectable model here rather than a hidden constant.',
      },
      {
        question: 'Why is axial resolution so much worse than lateral?',
        answer:
          'Lateral resolution goes as λ/NA and axial as 2nλ/NA², so the axial figure degrades with the square of the aperture. For a 1.4 NA oil objective at 520 nm that is about 186 nm laterally and 804 nm axially — a factor of four, and the reason a widefield image of anything thick looks hazy rather than merely soft.',
      },
      {
        question: 'Can I really rotate it, or is it a fixed drawing?',
        answer:
          'It is genuinely three-dimensional: the parts are surfaces of revolution placed in 3D and projected, and the ray paths are polylines in the same coordinates. That is why the light path stays attached to the glass at every angle rather than being a second drawing kept in step by hand. Drag to turn it, pinch to zoom, click any part for its detail, and use full screen when the annotation matters — a plain scroll is left alone so the page still scrolls past. Labels drop away while you are turning it and come back a moment after you let go.',
      },
      {
        question: 'Why does epifluorescence use the objective as its condenser?',
        answer:
          'Because the emission is very much weaker than the excitation, and separating them by wavelength at a dichroic is far easier than separating them by geometry. Sending both down the same objective also means the illumination and collection are automatically aligned, which a transmitted arrangement has to achieve mechanically.',
      },
      {
        question: 'Where are TIRF, spinning disc and the super-resolution methods?',
        answer:
          'Not built yet. The five here share most of their hardware, so the part library and the ray machinery were built once and correctly on those; the rest drop in as data rather than code. STED and STORM also need concepts a ray diagram alone cannot carry — a depletion doughnut and photoswitching statistics — so they will want more than another light path.',
      },
    ],
  },
};

export function getExplainer(toolId: string): ToolExplainer | undefined {
  return TOOL_EXPLAINERS[toolId];
}
