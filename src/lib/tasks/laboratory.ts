import type { Task } from './types';

/**
 * Bench tasks.
 *
 * The arithmetic on this page is not the hard part — people can multiply. What
 * goes wrong is the unit, the assumption, or the step nobody wrote down, so
 * that is what each guidance block leads with.
 *
 * All drafted, none reviewed. That distinction is shown on the page.
 */
export const LABORATORY_TASKS: readonly Task[] = [
  {
    id: 'make-a-solution',
    name: 'Make up a solution',
    question: 'How much powder do I weigh out for a solution at this concentration?',
    category: 'lab-calculators',
    summary: 'Getting from a target molarity and volume to a mass on the balance.',
    guidance:
      'Mass equals concentration times volume times molar mass, and the only thing that makes it ' +
      'difficult is the molar mass. Take it from the formula on the bottle you are actually ' +
      'holding, not from the compound name: the hydrate matters. Copper sulfate pentahydrate is ' +
      '249.7 g/mol against 159.6 for the anhydrous salt, so weighing by the wrong one leaves you ' +
      '36% short and nothing about the solution will look wrong.\n\n' +
      'The same goes for salts of acids and bases. Sodium acetate and sodium acetate trihydrate ' +
      'are different powders. If the protocol does not say which, the safest reading is whichever ' +
      'one your stockroom carries, and it is worth writing down which you used.\n\n' +
      'Dissolve in most of the final volume and only then make up to the mark. Solids take up ' +
      'space: dissolving into the full volume gives you a solution more dilute than intended, and ' +
      'the error grows with concentration.',
    caution:
      'Purity and water content on a certificate of analysis are not decoration. A reagent quoted ' +
      'at 95% needs proportionally more mass, and hygroscopic powders weighed on a humid day carry ' +
      'water you did not intend to add.',
    toolIds: ['molarity', 'molecular-weight', 'dilution'],
    keywords: [
      'make a solution',
      'weigh out',
      'grams needed',
      'molarity',
      'molar mass',
      'stock solution',
      'hydrate',
      'anhydrous',
      'how much powder',
      'prepare solution',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'dilute-a-stock',
    name: 'Dilute a stock',
    question: 'How much stock and how much diluent do I need?',
    category: 'lab-calculators',
    summary: 'Single and serial dilutions, and when to do one rather than the other.',
    guidance:
      'C₁V₁ = C₂V₂ answers a single step, and the number you actually pipette ' +
      'is the diluent — the final volume minus the stock. The practical limit is the pipette, not ' +
      'the arithmetic: below about 5 µL the error on the instrument becomes a real fraction ' +
      'of the dose, and below 1 µL it dominates. If a single step asks for less than that, ' +
      'make an intermediate dilution and take a measurable volume of it.\n\n' +
      'That is also the case for going a long way. A 1 in 10,000 dilution in one step means taking ' +
      '1 µL into 10 mL, where one bubble ruins it. Four tenfold steps get to the same place ' +
      'with volumes you can see, and the errors partly cancel rather than compounding on a single ' +
      'bad transfer.\n\n' +
      'Serial dilutions carry their own trap: every step inherits the one before it. Mix each tube ' +
      'properly before drawing from it, and change tips between steps, or you are quietly carrying ' +
      'concentrated stock down the row on the outside of the tip.',
    caution:
      'A dilution factor and a fold-dilution are the same number said two ways, but "1:10" is ' +
      'ambiguous in the wild — some people mean one part in ten total, others one part stock to ' +
      'ten parts diluent, which is 1 in 11. Write which you mean.',
    toolIds: ['dilution', 'serial-dilution', 'molarity'],
    keywords: [
      'dilution',
      'c1v1',
      'serial dilution',
      'dilute stock',
      'working concentration',
      'fold dilution',
      'how much diluent',
      'intermediate dilution',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'prepare-a-buffer',
    name: 'Prepare a buffer',
    question: 'How do I make a buffer at the pH I need?',
    category: 'lab-calculators',
    summary: 'Choosing a buffer for a target pH, and the temperature trap that catches everyone.',
    guidance:
      'Pick a buffer whose pKa is within about one unit of your target pH. Outside that range the ' +
      'buffering capacity falls away quickly and the solution stops doing the one job it has. ' +
      'Henderson–Hasselbalch gives the ratio of acid to base; from there it is two weighings, ' +
      'or one weighing and a titration.\n\n' +
      'The mistake that costs the most time is temperature. Many buffers shift pKa substantially ' +
      'with temperature, and Tris is the worst offender in common use at about −0.028 units ' +
      'per degree. A Tris buffer adjusted to pH 8.0 on the bench at 25 °C reads about ' +
      '8.6 in a cold room at 4 °C. Adjust the pH at the temperature the experiment will ' +
      'run at, and if you cannot, at least know which direction it will move.\n\n' +
      'Phosphate barely moves with temperature, which is one reason it stays popular, but it ' +
      'precipitates with divalent cations and inhibits a number of enzymes. There is no buffer ' +
      'that is right for everything.',
    caution:
      'Calculated recipes get you close, not exact. Ionic strength shifts real pH by roughly 0.1 ' +
      'units at physiological salt, and no calculator here corrects for it. Check with a meter at ' +
      'the working temperature before you trust the number.',
    toolIds: ['buffer-preparation', 'molecular-weight', 'molarity'],
    keywords: [
      'buffer',
      'ph',
      'henderson hasselbalch',
      'tris',
      'phosphate',
      'pka',
      'buffering capacity',
      'temperature correction',
      'prepare buffer',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'spin-down-a-sample',
    name: 'Spin down a sample',
    question: 'My protocol says × g but my centrifuge is set in rpm — what speed do I use?',
    category: 'lab-calculators',
    summary:
      'Converting between relative centrifugal field and rotor speed, and which radius to use.',
    guidance:
      'A protocol that says "12,000 × g" is specifying a force, and a centrifuge dial is set ' +
      'in revolutions per minute. The two are related only through the radius of your rotor, so ' +
      'the same rpm is a different force on every machine. Converting is the whole job, and it ' +
      'needs a number from the rotor, not from the centrifuge.\n\n' +
      'Which radius matters more than people expect. A fixed-angle rotor might have its tube ' +
      'bottom at 9 cm and its top at 4 cm, so the pellet experiences more than twice the field the ' +
      'liquid surface does. Manufacturers quote the maximum, and protocols almost always mean it, ' +
      'so use the maximum unless something says otherwise — but be aware the number is a range, ' +
      'not a point.\n\n' +
      'When you move a protocol between machines, match the force and keep the time, not the other ' +
      'way round. Matching rpm on a different rotor is how a gentle spin becomes a hard one.',
    caution:
      'Swinging-bucket and fixed-angle rotors pellet differently even at the same force, because ' +
      'the path a particle travels to the wall is not the same shape. A protocol developed on one ' +
      'may need its time adjusted on the other.',
    toolIds: ['centrifuge-rcf-rpm'],
    keywords: [
      'centrifuge',
      'rcf',
      'rpm',
      'g force',
      'relative centrifugal force',
      'spin speed',
      'rotor radius',
      'pellet',
      'convert rcf to rpm',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
];
