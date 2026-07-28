import type { Task } from './types';

/**
 * Cell culture tasks.
 *
 * Both of these are measurements people treat as exact and which are not. The
 * guidance leads with the uncertainty, because knowing a count is worth ±20%
 * changes what you conclude from it.
 *
 * All drafted, none reviewed. That distinction is shown on the page.
 */
export const CELL_BIOLOGY_TASKS: readonly Task[] = [
  {
    id: 'count-and-seed-cells',
    name: 'Count cells and seed a plate',
    question: 'How many cells do I have, and how much do I put in each well?',
    category: 'cell-biology',
    summary: 'Counting on a haemocytometer, and turning that count into a seeding plan.',
    guidance:
      'Counting is a two-part job and the second part is where the surprises are. The arithmetic ' +
      'is a division: cells counted, divided by the squares you counted over, divided by the ' +
      'volume above one square, times whatever dilution you made. For a Neubauer improved chamber ' +
      'that last figure is 10⁴, which is where the familiar multiplier comes from — but a ' +
      'Fuchs–Rosenthal chamber is twice as deep, so using the same number doubles your answer.\n\n' +
      'The part usually left out is precision. Cells settling into a chamber are a Poisson ' +
      'process, so counting n of them carries an uncertainty of about √n whatever you do. ' +
      'Count 100 cells — the number most protocols ask for — and the 95% interval is ' +
      'roughly ±20%. Getting to ±10% takes around 400. That does not make ' +
      'counting useless; it makes a 15% difference between two flasks not worth ' +
      'reacting to.\n\n' +
      'Seeding then works backwards from a density, usually cells per cm². Multiply by the growth ' +
      'area of the vessel to get cells per well, and prepare one bulk suspension at the final ' +
      'density rather than dosing each well separately. Dispensing an equal volume everywhere is ' +
      'what makes a plate even.',
    caution:
      'Trypan blue is normally mixed one to one with the sample, which is a two-fold dilution. ' +
      'Forgetting it halves every number downstream, and the result still looks entirely ' +
      'plausible.',
    toolIds: ['hemocytometer', 'cell-seeding'],
    keywords: [
      'cell counting',
      'haemocytometer',
      'hemocytometer',
      'neubauer',
      'trypan blue',
      'viability',
      'seeding density',
      'cells per well',
      'cells per cm2',
      'plate cells',
      'cell culture',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
  {
    id: 'measure-culture-density',
    name: 'Measure how dense a culture is',
    question: 'What does my OD600 reading actually mean in cells per millilitre?',
    category: 'cell-biology',
    summary: 'Reading optical density honestly, and converting it to cell density if you must.',
    guidance:
      'OD600 is not absorbance. Cells scatter light rather than absorbing it at 600 nm, which has ' +
      'two consequences. The first is that the reading depends on your instrument’s geometry, ' +
      'so a benchtop spectrophotometer and a plate reader genuinely disagree about the same ' +
      'culture. The second is that any conversion to cells per millilitre is a calibration, not a ' +
      'constant: the widely quoted 8 × 10⁸ cells/mL per OD for E. coli is a nominal ' +
      'figure that moves with strain, growth phase and instrument.\n\n' +
      'The reading is only linear at low density. Above about 0.4 on a 1 cm path, multiple ' +
      'scattering sets in and the instrument under-reports — badly, and without complaining. ' +
      'Dilute into the linear range, read that, and multiply back. The check belongs on the number ' +
      'the machine saw, not on the corrected culture value: a culture at OD 2.4 read as 0.24 on a ' +
      '1 in 10 dilution is perfectly well measured.\n\n' +
      'A plate reader looks down through the liquid, so its path length is the fill depth, not ' +
      '1 cm. Two hundred microlitres in a 96-well well is roughly 0.6 cm, which means a plate ' +
      'reading of 0.3 is about 0.5 per centimetre — already at the edge.',
    caution:
      'If you need cells per millilitre to better than a factor of two, calibrate against plate ' +
      'counts on your own instrument with your own strain. Quoting someone else’s conversion ' +
      'factor to three significant figures is precision the method does not have.',
    toolIds: ['od600', 'cell-seeding'],
    keywords: [
      'od600',
      'optical density',
      'cell density',
      'cfu',
      'bacterial growth',
      'spectrophotometer',
      'plate reader',
      'path length',
      'linear range',
      'culture density',
    ],
    reviewStatus: 'drafted',
    reviewedAt: '2026-07-26',
  },
];
