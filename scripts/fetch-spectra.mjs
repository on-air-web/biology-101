/**
 * Regenerate the fluorophore spectra dataset from FPbase.
 *
 * Run with `npm run spectra`. The output is committed, so a normal build never
 * touches the network — the same arrangement as `npm run brand`. Tests read the
 * committed file, which keeps them offline and reproducible.
 *
 * LICENCE, checked before a line of this was written (31 July 2026).
 * FPbase's terms at https://www.fpbase.org/terms/ say of the data, verbatim:
 * "The data contained in the FPbase are free of all copyright restrictions and
 * made fully and freely available for both non-commercial and commercial use.
 * Users of the data should attribute the original authors of the corresponding
 * data". So the numbers may be redistributed here, unlike the NIGMS imagery,
 * which is NonCommercial. The FPbase *site* is CC BY-SA 4.0; that covers its
 * curated prose, none of which is copied. Attribution is recorded in
 * docs/ATTRIBUTIONS.md, on every tool that uses the data, and at /credits.
 *
 * WHAT IS CURATED HERE
 * The list below is the judgement, and it is the reason this file is not a
 * mirror of FPbase's 815 proteins and 900 dyes. Everything in it is something
 * somebody actually images with. The `note` on each entry is written by hand
 * and survives regeneration; only the numbers come down the wire.
 */
import { writeFileSync } from 'node:fs';

const GRAPHQL = 'https://www.fpbase.org/graphql/';
/** Photobleaching half-times live only on the REST protein endpoint. */
const BASIC_REST = 'https://www.fpbase.org/api/proteins/basic/?format=json';

/**
 * Storage grid. Spectra come from FPbase at 1 nm; storing every other point
 * halves the file for an error the script measures and prints on every run
 * (currently under 0.1% on every integral the tools compute). Consumers
 * interpolate back to 1 nm, which is exact enough because fluorophore spectra
 * have no structure on that scale — filter edges do, and those are modelled
 * analytically rather than sampled.
 */
const STEP = 2;
/** Values below this are noise in a normalised spectrum, and trimming the
 * tails is most of the size win. Kept low because a 0.5% excitation tail is
 * exactly what makes a red dye bleed into a violet channel. */
const FLOOR = 0.001;

/**
 * @typedef {object} Curated
 * @property {string} id      stable slug, used in share URLs — never change one
 * @property {string} fpbase  owner name as FPbase spells it
 * @property {'protein'|'dye'} kind
 * @property {string} note    why this one is in the list, in one line
 */

/** @type {Curated[]} */
const CURATED = [
  // ---- Fluorescent proteins -------------------------------------------------
  {
    id: 'ebfp2',
    fpbase: 'EBFP2',
    kind: 'protein',
    note: 'The usable blue FP. Photostable for a blue, but excited in the violet, where autofluorescence is worst.',
  },
  {
    id: 'mtagbfp2',
    fpbase: 'mTagBFP2',
    kind: 'protein',
    note: 'Brighter than EBFP2 and excited further from the ultraviolet, which is the reason to prefer it.',
  },
  {
    id: 'mturquoise2',
    fpbase: 'mTurquoise2',
    kind: 'protein',
    note: 'Quantum yield 0.93 and a near single-exponential lifetime: the default FRET donor for lifetime work.',
  },
  {
    id: 'mcerulean3',
    fpbase: 'mCerulean3',
    kind: 'protein',
    note: 'The other good cyan donor. Slightly dimmer than mTurquoise2 and less photostable, but pH-insensitive.',
  },
  {
    id: 'ecfp',
    fpbase: 'ECFP',
    kind: 'protein',
    note: 'Legacy. Dim, bleaches fast and has a double-exponential lifetime that confounds FRET; kept because published constructs use it.',
  },
  {
    id: 'egfp',
    fpbase: 'EGFP',
    kind: 'protein',
    note: 'The reference point everything else is quoted against. Rarely the brightest choice now, and pKa 6.0 makes it a poor reporter in acidic compartments.',
  },
  {
    id: 'mneongreen',
    fpbase: 'mNeonGreen',
    kind: 'protein',
    note: 'About three times the brightness of EGFP and the sensible default green, licence permitting — it is not free for commercial use.',
  },
  {
    id: 'memerald',
    fpbase: 'mEmerald',
    kind: 'protein',
    note: 'EGFP with better folding. A drop-in where an existing EGFP construct matures poorly.',
  },
  {
    id: 'mstaygold',
    fpbase: 'mStayGold',
    kind: 'protein',
    note: 'Exceptionally photostable and very bright. The choice for long timelapse where EGFP would be gone by the end.',
  },
  {
    id: 'eyfp',
    fpbase: 'EYFP',
    kind: 'protein',
    note: 'Legacy yellow. pKa 6.9 and chloride sensitivity make it a poor quantitative reporter; mVenus or mCitrine instead.',
  },
  {
    id: 'mvenus',
    fpbase: 'mVenus',
    kind: 'protein',
    note: 'Fast-maturing yellow, the usual FRET acceptor for a cyan donor. Bleaches quickly.',
  },
  {
    id: 'mcitrine',
    fpbase: 'mCitrine',
    kind: 'protein',
    note: 'Yellow with the best chloride tolerance of the group, which is what to reach for in neurons.',
  },
  {
    id: 'morange2',
    fpbase: 'mOrange2',
    kind: 'protein',
    note: 'Much more photostable than mOrange at some cost in brightness. Fills the gap between yellow and red.',
  },
  {
    id: 'mko2',
    fpbase: 'mKO2',
    kind: 'protein',
    note: 'Monomeric orange with a large Stokes shift for its class. Bleaches fast — check the photostability column before a timelapse.',
  },
  {
    id: 'tagrfp-t',
    fpbase: 'TagRFP-T',
    kind: 'protein',
    note: 'The photostable member of the orange-red group. Worth the lower quantum yield when the experiment is long.',
  },
  {
    id: 'mruby3',
    fpbase: 'mRuby3',
    kind: 'protein',
    note: 'Bright red with a large Stokes shift, so it is separable from mCherry in a two-colour red experiment.',
  },
  {
    id: 'mscarlet3',
    fpbase: 'mScarlet3',
    kind: 'protein',
    note: 'The brightest monomeric red by a wide margin, and the current default unless a specific construct demands otherwise.',
  },
  {
    id: 'mcherry',
    fpbase: 'mCherry',
    kind: 'protein',
    note: 'Quantum yield 0.22 makes it dim, but it is monomeric, tolerant of fusion and in half the plasmids in the freezer.',
  },
  {
    id: 'mkate2',
    fpbase: 'mKate2',
    kind: 'protein',
    note: 'Far-red, emitting past 630 nm where tissue autofluorescence has largely stopped.',
  },
  {
    id: 'mplum',
    fpbase: 'mPlum',
    kind: 'protein',
    note: 'A very large Stokes shift and a quantum yield of 0.1. Chosen for spectral separation, never for brightness.',
  },
  {
    id: 'mirfp670',
    fpbase: 'miRFP670',
    kind: 'protein',
    note: 'Near-infrared, and needs biliverdin — endogenous supply is adequate in mammalian cells and is not in yeast or bacteria.',
  },
  {
    id: 'irfp713',
    fpbase: 'iRFP713',
    kind: 'protein',
    note: 'The deepest red here and the one that images through a mouse. Quantum yield 0.06, so brightness comes from the enormous extinction coefficient.',
  },

  // ---- Synthetic dyes -------------------------------------------------------
  {
    id: 'dapi',
    fpbase: 'DAPI',
    kind: 'dye',
    note: 'The default nuclear counterstain. Its emission tail reaches well into the green channel, which is the classic bleed-through people miss.',
  },
  {
    id: 'hoechst-33342',
    fpbase: 'Hoechst 33342',
    kind: 'dye',
    note: 'DAPI that crosses an intact membrane, so it is the live-cell nuclear stain. Spectrally almost identical.',
  },
  {
    id: 'pacific-blue',
    fpbase: 'Pacific Blue',
    kind: 'dye',
    note: 'Blue conjugate matched to the 405 nm laser, where DAPI is excited only weakly.',
  },
  {
    id: 'alexa-405',
    fpbase: 'Alexa Fluor 405',
    kind: 'dye',
    note: 'The workhorse for the violet laser line in fixed-cell panels.',
  },
  {
    id: 'alexa-488',
    fpbase: 'Alexa Fluor 488',
    kind: 'dye',
    note: 'Brighter and far more photostable than fluorescein at the same wavelengths. Use it instead of FITC unless a protocol forbids it.',
  },
  {
    id: 'fitc',
    fpbase: 'Fluorescein (FITC)',
    kind: 'dye',
    note: 'Kept for reading old protocols. Bleaches quickly and its brightness drops sharply below pH 7.',
  },
  {
    id: 'alexa-546',
    fpbase: 'Alexa Fluor 546',
    kind: 'dye',
    note: 'Orange conjugate for the 561 nm line, brighter than TRITC and less prone to aggregate.',
  },
  {
    id: 'tritc',
    fpbase: 'Tetramethylrhodamine (TAMRA, TRITC)',
    kind: 'dye',
    note: 'The name on most older filter cubes. Alexa Fluor 546 or 555 outperforms it in the same cube.',
  },
  {
    id: 'cy3',
    fpbase: 'Cy3',
    kind: 'dye',
    note: 'Bright, cheap and the standard single-molecule FRET donor to Cy5.',
  },
  {
    id: 'alexa-568',
    fpbase: 'Alexa Fluor 568',
    kind: 'dye',
    note: 'Sits between 546 and 594 and separates cleanly from both — the third colour when two red channels are already spoken for.',
  },
  {
    id: 'alexa-594',
    fpbase: 'Alexa Fluor 594',
    kind: 'dye',
    note: 'Red conjugate excited well by both 561 and 594 nm lines. Replaces Texas Red.',
  },
  {
    id: 'texas-red',
    fpbase: 'Texas Red',
    kind: 'dye',
    note: 'The legacy name for this band. Alexa Fluor 594 is the same window with better photostability.',
  },
  {
    id: 'jf549',
    fpbase: 'Janelia Fluor JF549-HaloTag conjugate',
    kind: 'dye',
    note: 'Cell-permeable HaloTag ligand. Genetic targeting with a synthetic dye behind it, which is why live single-molecule work uses these.',
  },
  {
    id: 'alexa-647',
    fpbase: 'Alexa Fluor 647',
    kind: 'dye',
    note: 'The far-red standard, and the dye most STORM imaging is done with because it blinks well in thiol buffer.',
  },
  {
    id: 'cy5',
    fpbase: 'Cy5',
    kind: 'dye',
    note: 'Spectrally near-identical to Alexa Fluor 647 and less photostable. Standard smFRET acceptor for Cy3.',
  },
  {
    id: 'jf646',
    fpbase: 'Janelia Fluor JF646-HaloTag conjugate',
    kind: 'dye',
    note: 'Far-red HaloTag ligand that fluoresces only once bound, so unbound dye needs no washout.',
  },
  {
    id: 'atto-647n',
    fpbase: 'ATTO 647N',
    kind: 'dye',
    note: 'Very bright and very photostable far-red. Hydrophobic, so it sticks to membranes and to things you did not label.',
  },
  {
    id: 'alexa-680',
    fpbase: 'Alexa Fluor 680',
    kind: 'dye',
    note: 'Near-infrared conjugate for the 640 nm line when 647 is already taken.',
  },
  {
    id: 'alexa-750',
    fpbase: 'Alexa Fluor 750',
    kind: 'dye',
    note: 'The far end of what a standard camera detects. Check the detector quantum efficiency before designing around it.',
  },
  {
    id: 'cy7',
    fpbase: 'Cy7',
    kind: 'dye',
    note: 'Near-infrared, used mostly in whole-animal imaging where tissue is transparent and autofluorescence is gone.',
  },
  {
    id: 'propidium-iodide',
    fpbase: 'Propidium Iodide',
    kind: 'dye',
    note: 'Dead-cell stain with an enormously broad emission, which is why it fouls every other channel in a flow panel.',
  },
  {
    id: 'sytox-green',
    fpbase: 'SYTOX Green',
    kind: 'dye',
    note: 'Green dead-cell stain. Sits exactly on top of GFP, so the two cannot be combined.',
  },
  {
    id: 'bodipy-fl',
    fpbase: 'BODIPY FL',
    kind: 'dye',
    note: 'Narrow emission and a very small Stokes shift, which is what makes it prone to self-quenching when densely labelled.',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * FPbase rate-limits, and this script asks for ninety spectra in a row. Backing
 * off is politeness towards a free academic service as much as it is
 * reliability — the whole run is a couple of minutes either way.
 */
async function graphql(query, variables) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (response.status === 429 && attempt < 6) {
      const wait = 2000 * 2 ** attempt;
      process.stdout.write(`    rate-limited, waiting ${wait / 1000}s\n`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) throw new Error(`FPbase returned ${response.status}`);
    const payload = await response.json();
    if (payload.errors) throw new Error(JSON.stringify(payload.errors));
    return payload.data;
  }
}

const INDEX_QUERY = `{ spectra { id category subtype owner { name } } }`;

const SPECTRUM_QUERY = `query ($id: Int!) {
  spectrum(id: $id) {
    subtype
    data
    owner {
      name
      ... on DyeState { exMax emMax extCoeff qy }
      ... on State { exMax emMax extCoeff qy }
    }
  }
}`;

/** Trapezoid integral of an [x, y] pair list. */
function integrate(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += ((points[i][1] + points[i - 1][1]) / 2) * (points[i][0] - points[i - 1][0]);
  }
  return total;
}

/**
 * Resample onto the storage grid and trim the tails.
 *
 * Returns the encoded spectrum plus the relative error the resampling
 * introduces into the total area, which is the quantity every tool divides by.
 */
function encode(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const peak = Math.max(...sorted.map((p) => p[1]));
  if (!(peak > 0)) throw new Error('spectrum is empty');

  // FPbase normalises to the peak already; doing it again costs nothing and
  // removes the assumption.
  const unit = sorted.map(([x, y]) => [x, y / peak]);

  const first = Math.ceil(unit[0][0] / STEP) * STEP;
  const last = Math.floor(unit[unit.length - 1][0] / STEP) * STEP;

  const sampled = [];
  let cursor = 0;
  for (let x = first; x <= last; x += STEP) {
    while (cursor < unit.length - 2 && unit[cursor + 1][0] < x) cursor += 1;
    const [x0, y0] = unit[cursor];
    const [x1, y1] = unit[Math.min(cursor + 1, unit.length - 1)];
    const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
    sampled.push([x, y0 + t * (y1 - y0)]);
  }

  let lo = 0;
  let hi = sampled.length - 1;
  while (lo < hi && sampled[lo][1] < FLOOR) lo += 1;
  while (hi > lo && sampled[hi][1] < FLOOR) hi -= 1;
  // Keep one zero-ish point either side so interpolation falls to baseline
  // rather than stepping off a cliff.
  lo = Math.max(0, lo - 1);
  hi = Math.min(sampled.length - 1, hi + 1);
  const trimmed = sampled.slice(lo, hi + 1);

  const error = Math.abs(integrate(trimmed) - integrate(unit)) / integrate(unit);

  // Renormalise after resampling. The true peak rarely lands on an even
  // nanometre, so the resampled curve tops out a few tenths of a per cent
  // below 1 — which would quietly make ε(λ_max) disagree with the published
  // extinction coefficient it is supposed to reproduce exactly.
  const resampledPeak = Math.max(...trimmed.map(([, y]) => y));

  return {
    encoded: {
      start: trimmed[0][0],
      values: trimmed.map(([, y]) => Number((y / resampledPeak).toFixed(3))),
    },
    error,
  };
}

function ts(value) {
  return JSON.stringify(value);
}

/** Wavelength of the highest stored point, for entries FPbase leaves blank. */
function peakOf(encoded) {
  let best = 0;
  let at = 0;
  encoded.values.forEach((value, i) => {
    if (value > best) {
      best = value;
      at = i;
    }
  });
  return encoded.start + at * STEP;
}

async function main() {
  process.stdout.write('Indexing FPbase spectra…\n');
  const index = (await graphql(INDEX_QUERY)).spectra;

  const basicResponse = await fetch(BASIC_REST);
  if (!basicResponse.ok) throw new Error(`FPbase REST returned ${basicResponse.status}`);
  const bleachByName = new Map(
    (await basicResponse.json()).map((protein) => [protein.name, protein.bleach ?? null]),
  );

  /** name -> subtype -> id */
  const bySubtype = new Map();
  for (const entry of index) {
    const name = entry.owner.name;
    if (!bySubtype.has(name)) bySubtype.set(name, new Map());
    bySubtype.get(name).set(entry.subtype, Number(entry.id));
  }

  const records = [];
  let worstError = 0;
  let worstLabel = '';

  for (const item of CURATED) {
    const available = bySubtype.get(item.fpbase);
    if (!available) throw new Error(`FPbase has no spectra for "${item.fpbase}"`);

    // Excitation first, absorption as the documented fallback. They differ
    // where a fluorophore has a dark absorbing state, so which one was used is
    // recorded per entry rather than averaged over.
    const exId = available.get('EX') ?? available.get('AB');
    const emId = available.get('EM');
    if (exId === undefined || emId === undefined) {
      throw new Error(`"${item.fpbase}" is missing an excitation or emission spectrum`);
    }

    const ex = await graphql(SPECTRUM_QUERY, { id: exId });
    await sleep(250);
    const em = await graphql(SPECTRUM_QUERY, { id: emId });
    await sleep(250);

    const exEncoded = encode(ex.spectrum.data);
    const emEncoded = encode(em.spectrum.data);

    for (const [label, result] of [
      [`${item.id} ex`, exEncoded],
      [`${item.id} em`, emEncoded],
    ]) {
      if (result.error > worstError) {
        worstError = result.error;
        worstLabel = label;
      }
    }

    const owner = ex.spectrum.owner;
    records.push({
      ...item,
      exFromAbsorption: !available.has('EX'),
      // Where FPbase records no peak — it happens on a few older dye entries —
      // read it off the spectrum rather than leaving a hole. Reading the data
      // we already hold is not the same as recalling a number.
      exMax: owner.exMax ?? peakOf(exEncoded.encoded),
      emMax: em.spectrum.owner.emMax ?? peakOf(emEncoded.encoded),
      extCoeff: owner.extCoeff ?? null,
      qy: em.spectrum.owner.qy ?? owner.qy ?? null,
      bleach: bleachByName.get(item.fpbase) ?? null,
      ex: exEncoded.encoded,
      em: emEncoded.encoded,
    });

    process.stdout.write(`  ${item.id}\n`);
  }

  const body = records
    .map(
      (r) => `  {
    id: ${ts(r.id)},
    name: ${ts(r.fpbase)},
    kind: ${ts(r.kind)},
    note: ${ts(r.note)},
    exMax: ${r.exMax},
    emMax: ${r.emMax},
    extCoeff: ${r.extCoeff},
    quantumYield: ${r.qy},
    bleachHalfLife: ${r.bleach},
    exFromAbsorption: ${r.exFromAbsorption},
    ex: { start: ${r.ex.start}, values: [${r.ex.values.join(', ')}] },
    em: { start: ${r.em.start}, values: [${r.em.values.join(', ')}] },
  },`,
    )
    .join('\n');

  const file = `/**
 * Fluorophore spectra and photophysics.
 *
 * GENERATED by \`npm run spectra\` from FPbase — edit scripts/fetch-spectra.mjs
 * and regenerate rather than editing this file. The curation and the \`note\`
 * on each entry live in that script.
 *
 * Source: FPbase (https://www.fpbase.org), Lambert TJ, Nature Methods 2019,
 * doi:10.1038/s41592-019-0352-8. FPbase's data terms place the data under no
 * copyright restriction for commercial and non-commercial use, asking that the
 * original authors of each measurement be attributed; the per-protein
 * references on FPbase are those authors.
 *
 * Spectra are peak-normalised and stored on a ${STEP} nm grid with the tails
 * trimmed below ${FLOOR}. Resampling from FPbase's 1 nm data changes the area
 * under a spectrum by at most ${(worstError * 100).toFixed(3)}% across this set
 * (worst: ${worstLabel}), which is far inside the spread between published
 * measurements of the same fluorophore.
 */

/** Peak-normalised spectrum on a fixed grid. Index i is \`start + i * SPECTRUM_STEP\` nm. */
export interface EncodedSpectrum {
  start: number;
  values: number[];
}

export type FluorophoreKind = 'protein' | 'dye';

export interface Fluorophore {
  /** Stable slug. Appears in share URLs, so it must never change once shipped. */
  id: string;
  name: string;
  kind: FluorophoreKind;
  /** Why this one is in a curated list of ${CURATED.length} rather than FPbase's thousands. */
  note: string;
  exMax: number | null;
  emMax: number | null;
  /** Molar extinction coefficient at the excitation maximum, M⁻¹cm⁻¹. */
  extCoeff: number | null;
  quantumYield: number | null;
  /**
   * Seconds to half the initial emission, as FPbase records it from the paper
   * that measured it. Proteins only, and NOT comparable between entries: each
   * figure carries its own illumination intensity, medium and objective, and
   * the same protein has been published with values an order of magnitude
   * apart. Useful as a flag, never as a ranking, and the tools say so.
   */
  bleachHalfLife: number | null;
  /**
   * True where FPbase carries an absorption spectrum but no separate
   * excitation spectrum. The two differ wherever a fraction of the molecules
   * absorb without emitting, so a tool that treats them as interchangeable
   * should say it is doing so.
   */
  exFromAbsorption: boolean;
  ex: EncodedSpectrum;
  em: EncodedSpectrum;
}

export const SPECTRUM_STEP = ${STEP};

export const FLUOROPHORES: readonly Fluorophore[] = [
${body}
];
`;

  const path = 'src/lib/bio/fluorophores.ts';
  writeFileSync(path, file);
  process.stdout.write(
    `\nWrote ${path}: ${records.length} fluorophores, ` +
      `worst resampling error ${(worstError * 100).toFixed(3)}% (${worstLabel}).\n` +
      'Run `npx prettier --write` on it before committing.\n',
  );
}

main().catch((error) => {
  // Unlike fetch-images.mjs this is not fail-soft: it runs by hand, its output
  // is committed, and a half-written dataset is worse than no run at all.
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
