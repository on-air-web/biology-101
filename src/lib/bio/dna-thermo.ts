/**
 * DNA duplex thermodynamics and melting temperature.
 *
 * Three models are implemented, and the reason all three exist rather than one
 * is the point of the tool: they disagree by more than ten degrees on the same
 * oligo, and a Tm quoted without its model is not a number anyone can act on.
 * The roadmap called this "the clearest case where hiding the model hides the
 * answer", and it is.
 *
 *   Wallace       2(A+T) + 4(G+C). A counting rule from 1979, valid only for
 *                 short oligos in 1 M salt. Still the default in a lot of
 *                 people's heads, which is why it is shown rather than hidden.
 *   Salt-adjusted A GC-content formula with a log salt term. Accounts for
 *                 length and ionic strength but not sequence order, so it
 *                 gives the same answer for GCGCGC and GGGCCC.
 *   Nearest       Stacking thermodynamics: each adjacent base pair step has
 *   neighbour     its own enthalpy and entropy. This is what primer suppliers
 *                 use, and the only one of the three that knows sequence order
 *                 matters.
 *
 * Parameter tables are transcribed from the published sets and the salt
 * handling follows von Ahsen for divalent and Tris buffers, so the numbers can
 * be checked against an independent implementation rather than taken on trust.
 *
 * Units: kcal/mol for enthalpy, cal/(mol·K) for entropy, °C for temperature,
 * and millimolar for every ion, which is how buffers are actually written.
 */

import { complement } from '@/lib/sequence';

export class ThermoError extends Error {}

/** Universal gas constant in cal/(mol·K), matching the units of the tables. */
const R = 1.987;

export interface NearestNeighbourTable {
  id: string;
  name: string;
  guidance: string;
  /** Enthalpy and entropy per stacking step, keyed "XY/WZ". */
  steps: Record<string, readonly [number, number]>;
  /** Applied once regardless of ends. */
  init: readonly [number, number];
  /** Applied once per terminal base pair of that type. */
  initAT: readonly [number, number];
  initGC: readonly [number, number];
  /** Entropy penalty for a self-complementary duplex. */
  symmetry: readonly [number, number];
}

/**
 * Allawi & SantaLucia's unified parameters. This is the set primer suppliers
 * calculate with, so it is the one to match when a number has to agree with an
 * order form.
 */
export const ALLAWI_SANTALUCIA_1997: NearestNeighbourTable = {
  id: 'santalucia-1997',
  name: 'Nearest neighbour — Allawi & SantaLucia 1997',
  guidance:
    'The unified parameter set most primer suppliers and design tools use. Match this one when your number has to agree with an order form.',
  steps: {
    'AA/TT': [-7.9, -22.2],
    'AT/TA': [-7.2, -20.4],
    'TA/AT': [-7.2, -21.3],
    'CA/GT': [-8.5, -22.7],
    'GT/CA': [-8.4, -22.4],
    'CT/GA': [-7.8, -21.0],
    'GA/CT': [-8.2, -22.2],
    'CG/GC': [-10.6, -27.2],
    'GC/CG': [-9.8, -24.4],
    'GG/CC': [-8.0, -19.9],
  },
  init: [0, 0],
  initAT: [2.3, 4.1],
  initGC: [0.1, -2.8],
  symmetry: [0, -1.4],
};

/** The later revision. Differs only in AA/TT and in how initiation is split. */
export const SANTALUCIA_HICKS_2004: NearestNeighbourTable = {
  id: 'santalucia-2004',
  name: 'Nearest neighbour — SantaLucia & Hicks 2004',
  guidance:
    'The later revision of the same method. Prefer it for its own sake; expect it to sit within a degree or so of the 1997 set.',
  steps: {
    ...ALLAWI_SANTALUCIA_1997.steps,
    'AA/TT': [-7.6, -21.3],
  },
  init: [0.2, -5.7],
  initAT: [2.2, 6.9],
  initGC: [0, 0],
  symmetry: [0, -1.4],
};

export const NN_TABLES = [ALLAWI_SANTALUCIA_1997, SANTALUCIA_HICKS_2004] as const;

export interface SaltConditions {
  /** Sodium, mM. */
  sodium: number;
  /** Potassium, mM. */
  potassium: number;
  /** Tris buffer, mM. Contributes half its concentration as monovalent. */
  tris: number;
  /** Magnesium, mM. */
  magnesium: number;
  /** Total dNTPs, mM. These chelate magnesium and remove it from play. */
  dntps: number;
}

export const DEFAULT_SALT: SaltConditions = {
  sodium: 50,
  potassium: 0,
  tris: 0,
  magnesium: 0,
  dntps: 0,
};

/**
 * Monovalent-equivalent cation concentration, in molar.
 *
 * Tris counts for half because only the protonated form is a cation at working
 * pH. Magnesium is converted to a sodium equivalent by von Ahsen's square-root
 * relation, and dNTPs are subtracted first: they bind Mg2+ tightly enough that
 * chelated magnesium does not stabilise the duplex. A PCR buffer with 1.5 mM
 * Mg2+ and 0.8 mM dNTPs is a genuinely different ionic environment from one
 * without the nucleotides, and it moves the Tm by degrees.
 */
export function monovalentEquivalent(salt: SaltConditions): number {
  let monovalent = salt.sodium + salt.potassium + salt.tris / 2;
  const free = salt.magnesium - salt.dntps;
  if (free > 0) monovalent += 120 * Math.sqrt(free);
  return monovalent * 1e-3;
}

const BASES = new Set(['A', 'C', 'G', 'T']);

/** Cleans a sequence, refusing anything that has no thermodynamic parameters. */
export function parseOligo(input: string): string {
  const cleaned = input
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('>'))
    .join('')
    .replace(/[\s\d]/g, '')
    .toUpperCase()
    .replace(/U/g, 'T');

  if (cleaned === '') throw new ThermoError('Enter a DNA sequence.');

  const unknown = [...new Set([...cleaned])].filter((base) => !BASES.has(base));
  if (unknown.length > 0) {
    throw new ThermoError(
      `${unknown.map((base) => `"${base}"`).join(', ')} has no nearest-neighbour parameters. Ambiguity codes and gaps cannot be given a melting temperature; use a specific sequence.`,
    );
  }
  return cleaned;
}

export function gcFraction(sequence: string): number {
  if (sequence.length === 0) return 0;
  let gc = 0;
  for (const base of sequence) if (base === 'G' || base === 'C') gc += 1;
  return gc / sequence.length;
}

export function isSelfComplementary(sequence: string): boolean {
  return sequence === [...complement(sequence)].reverse().join('');
}

export interface Thermodynamics {
  /** kcal/mol. */
  enthalpy: number;
  /** cal/(mol·K), before any salt correction. */
  entropy: number;
  selfComplementary: boolean;
}

/**
 * Sums the stacking terms over a duplex.
 *
 * The key for a step is the two bases read 5'→3' on the top strand over their
 * partners on the bottom. Only ten of the sixteen steps are independent —
 * reading the duplex from the other end maps each onto another — so a step
 * missing from the table is looked up by its reversed key rather than being
 * stored twice.
 */
export function duplexThermodynamics(
  sequence: string,
  table: NearestNeighbourTable,
): Thermodynamics {
  if (sequence.length < 2) {
    throw new ThermoError('A duplex needs at least two bases to have a stacking term.');
  }

  const bottom = complement(sequence);
  let enthalpy = table.init[0];
  let entropy = table.init[1];

  for (let i = 0; i < sequence.length - 1; i += 1) {
    const key = `${sequence.slice(i, i + 2)}/${bottom.slice(i, i + 2)}`;
    const step = table.steps[key] ?? table.steps[[...key].reverse().join('')];
    if (!step) throw new ThermoError(`No nearest-neighbour parameters for step ${key}.`);
    enthalpy += step[0];
    entropy += step[1];
  }

  for (const terminal of [sequence[0]!, sequence[sequence.length - 1]!]) {
    const [h, s] = terminal === 'G' || terminal === 'C' ? table.initGC : table.initAT;
    enthalpy += h;
    entropy += s;
  }

  const selfComplementary = isSelfComplementary(sequence);
  if (selfComplementary) {
    enthalpy += table.symmetry[0];
    entropy += table.symmetry[1];
  }

  return { enthalpy, entropy, selfComplementary };
}

/** Gibbs free energy at a temperature, kcal/mol. Entropy is per kelvin. */
export function freeEnergy(thermo: Thermodynamics, celsius = 37): number {
  return thermo.enthalpy - ((celsius + 273.15) * thermo.entropy) / 1000;
}

export interface NearestNeighbourInput {
  sequence: string;
  table: NearestNeighbourTable;
  /** Concentration of the strand in excess, nM — usually the primer. */
  strandConcentration: number;
  salt: SaltConditions;
}

/**
 * Melting temperature from stacking thermodynamics.
 *
 * Tm = ΔH / (ΔS + R·ln(C)), where C is a concentration term whose exact form
 * is a convention worth stating, because getting it wrong shifts every answer
 * by a fixed amount and it is invisible in the result.
 *
 * The textbook expression is C_T/4 for two different strands, where C_T is the
 * **total** of both. `strandConcentration` here is the concentration of one
 * strand, as printed on a primer tube, so with both strands present in equal
 * amounts C_T is twice that and the term comes to half the input — not a
 * quarter of it. Halving twice costs about 0.7 °C, uniformly.
 *
 * A self-complementary oligo is its own partner, so the term is the strand
 * concentration itself with no factor at all.
 */
export function meltingTemperatureNN(input: NearestNeighbourInput): {
  celsius: number;
  thermo: Thermodynamics;
  entropyWithSalt: number;
} {
  const { sequence, table, strandConcentration, salt } = input;
  if (!(strandConcentration > 0)) {
    throw new ThermoError('Strand concentration must be greater than zero.');
  }

  const thermo = duplexThermodynamics(sequence, table);
  const monovalent = monovalentEquivalent(salt);
  if (!(monovalent > 0)) {
    throw new ThermoError('There must be some salt present for a duplex to form.');
  }

  // SantaLucia's entropy-based salt correction, which scales with the number
  // of phosphates rather than being a flat offset on the temperature.
  const entropyWithSalt = thermo.entropy + 0.368 * (sequence.length - 1) * Math.log(monovalent);

  const concentration = thermo.selfComplementary
    ? strandConcentration * 1e-9
    : (strandConcentration * 1e-9) / 2;

  const celsius =
    (1000 * thermo.enthalpy) / (entropyWithSalt + R * Math.log(concentration)) - 273.15;

  return { celsius, thermo, entropyWithSalt };
}

/**
 * Wallace's counting rule.
 *
 * Assumes 1 M salt and breaks down above about 14 bases, where it starts
 * overestimating badly — it has no length term at all, so it says a 40-mer and
 * a 14-mer of the same composition ratio melt alike.
 */
export function meltingTemperatureWallace(sequence: string): number {
  let at = 0;
  let gc = 0;
  for (const base of sequence) {
    if (base === 'G' || base === 'C') gc += 1;
    else at += 1;
  }
  return 2 * at + 4 * gc;
}

/**
 * The GC-content formula with a logarithmic salt term.
 *
 * Reasonable for long duplexes and probes, and blind to sequence order: it
 * returns the same temperature for GGGCCC and GCGCGC, which differ by several
 * degrees in reality.
 */
export function meltingTemperatureGC(sequence: string, salt: SaltConditions): number {
  const monovalent = monovalentEquivalent(salt);
  if (!(monovalent > 0)) {
    throw new ThermoError('There must be some salt present for a duplex to form.');
  }
  return 81.5 + 16.6 * Math.log10(monovalent) + 41 * gcFraction(sequence) - 600 / sequence.length;
}
