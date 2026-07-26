/**
 * Primer melting temperature and quality.
 *
 * The tool answers one question — should I order this oligo? — so it reports
 * the melting temperature under every model at once rather than only the
 * selected one. Seeing 84 °C, 59 °C and 60 °C side by side for the same
 * sequence is the fastest way to understand that a Tm without its model is not
 * a number, and it is why this tool exists.
 *
 * The secondary structure checks are deliberately modest. A primer that folds
 * on itself or pairs with its own copy is unavailable to the template, and
 * both failures are cheap to detect by looking for complementary runs and
 * costing them with the same stacking parameters used for the duplex. This is
 * not a folding algorithm: it finds contiguous pairing, not the minimum free
 * energy structure over all loops and bulges. It will catch the ordinary
 * mistakes and will not replace mfold.
 */

import { complement } from '@/lib/sequence';
import {
  ALLAWI_SANTALUCIA_1997,
  ThermoError,
  type NearestNeighbourTable,
  type SaltConditions,
  type Thermodynamics,
  duplexThermodynamics,
  freeEnergy,
  gcFraction,
  isSelfComplementary,
  meltingTemperatureGC,
  meltingTemperatureNN,
  meltingTemperatureWallace,
  parseOligo,
} from '@/lib/bio/dna-thermo';

export { ThermoError as PrimerError } from '@/lib/bio/dna-thermo';

/** Below this a self-dimer or hairpin is usually worth redesigning around. */
export const DIMER_WARNING_DG = -9;
/** A hairpin this stable near the 3' end will block extension. */
export const HAIRPIN_WARNING_DG = -3;

export interface ModelTemperature {
  id: string;
  name: string;
  celsius: number;
}

export interface Duplexing {
  /** Free energy of the most stable contiguous pairing found, kcal/mol. */
  deltaG: number;
  /** Length of that pairing, in base pairs. */
  basePairs: number;
  /** The two strands drawn against each other, for display. */
  top: string;
  middle: string;
  bottom: string;
  /** True when the pairing involves the last three bases of the primer. */
  involves3Prime: boolean;
}

export interface PrimerResult {
  sequence: string;
  length: number;
  gcContent: number;
  selfComplementary: boolean;
  /** Every model, always, so the spread is visible. */
  temperatures: ModelTemperature[];
  /** The one the user selected. */
  selected: ModelTemperature;
  thermo: Thermodynamics;
  deltaG37: number;
  /** G or C among the last five bases. Two or fewer is the usual advice. */
  gcClamp: number;
  /** Free energy of the last five bases, kcal/mol. */
  threePrimeDeltaG: number;
  longestRun: { base: string; length: number };
  selfDimer?: Duplexing;
  hairpin?: Duplexing;
  warnings: string[];
}

function pairs(a: string, b: string): boolean {
  return b === complement(a);
}

/**
 * Most stable contiguous pairing between a primer and a second strand.
 *
 * `partner` must already be written 3'→5', because two oligos anneal
 * antiparallel: the second copy runs the other way, so it is the reversed
 * sequence that lines up index for index with the first. Indexing both strands
 * in the same direction finds pairings that cannot physically form, and misses
 * the ones that can.
 *
 * Scored with the duplex parameters rather than by counting matches, so four
 * GC pairs outrank six AT pairs — which is the difference between a primer
 * that dimerises and one that does not.
 */
function bestPairing(
  top: string,
  partner: string,
  table: NearestNeighbourTable,
  minimumPairs: number,
): Duplexing | undefined {
  let best: Duplexing | undefined;

  for (let offset = -(partner.length - 1); offset < top.length; offset += 1) {
    let runStart = -1;
    for (let i = 0; i <= top.length; i += 1) {
      const j = i - offset;
      const matched = i < top.length && j >= 0 && j < partner.length && pairs(top[i]!, partner[j]!);

      if (matched && runStart < 0) runStart = i;
      if (!matched && runStart >= 0) {
        const run = top.slice(runStart, i);
        // A single pair has no stacking term, so only runs of two or more can
        // be costed at all.
        if (run.length >= minimumPairs) {
          const deltaG = freeEnergy(duplexThermodynamics(run, table));
          if (!best || deltaG < best.deltaG) {
            const topLead = Math.max(0, -offset);
            const partnerLead = Math.max(0, offset);
            best = {
              deltaG,
              basePairs: run.length,
              top: `5'-${' '.repeat(topLead)}${top}-3'`,
              middle: `   ${' '.repeat(topLead + runStart)}${'|'.repeat(run.length)}`,
              bottom: `3'-${' '.repeat(partnerLead)}${partner}-5'`,
              involves3Prime: i >= top.length - 3,
            };
          }
        }
        runStart = -1;
      }
    }
  }

  return best;
}

/** Minimum unpaired bases a hairpin loop can close over. */
const MIN_LOOP = 3;

/**
 * Most stable hairpin the primer can fold into.
 *
 * Distinct from a self-dimer: both arms come from the same molecule, so they
 * must be separated by a loop. Each candidate innermost pair is extended
 * outwards while the bases still pair, and the resulting stem is costed as a
 * duplex — its two arms are complementary by construction, so the 5' arm alone
 * describes it.
 */
function bestHairpin(sequence: string, table: NearestNeighbourTable): Duplexing | undefined {
  let best: Duplexing | undefined;

  for (let i = 0; i < sequence.length; i += 1) {
    for (let j = i + MIN_LOOP + 1; j < sequence.length; j += 1) {
      if (!pairs(sequence[i]!, sequence[j]!)) continue;

      // Extend outwards from this innermost pair.
      let stem = 1;
      while (
        i - stem >= 0 &&
        j + stem < sequence.length &&
        pairs(sequence[i - stem]!, sequence[j + stem]!)
      ) {
        stem += 1;
      }
      if (stem < 3) continue;

      const arm = sequence.slice(i - stem + 1, i + 1);
      const deltaG = freeEnergy(duplexThermodynamics(arm, table));
      if (!best || deltaG < best.deltaG) {
        const loop = j - i - 1;
        best = {
          deltaG,
          basePairs: stem,
          top: `5'-${sequence.slice(0, i + 1)}`,
          middle: `   ${' '.repeat(Math.max(0, i + 1 - stem))}${'|'.repeat(stem)}  loop ${loop} nt`,
          bottom: `3'-${[...sequence.slice(j)].reverse().join('')}`,
          involves3Prime: j + stem >= sequence.length - 3,
        };
      }
    }
  }

  return best;
}

function longestHomopolymer(sequence: string): { base: string; length: number } {
  let best = { base: sequence[0] ?? '', length: sequence.length > 0 ? 1 : 0 };
  let current = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    current = sequence[i] === sequence[i - 1] ? current + 1 : 1;
    if (current > best.length) best = { base: sequence[i]!, length: current };
  }
  return best;
}

export interface PrimerInput {
  sequence: string;
  table: NearestNeighbourTable;
  modelId: string;
  strandConcentration: number;
  salt: SaltConditions;
}

export function analysePrimer(input: PrimerInput): PrimerResult {
  const { table, modelId, strandConcentration, salt } = input;
  const sequence = parseOligo(input.sequence);

  if (sequence.length < 2) {
    throw new ThermoError('An oligo needs at least two bases to have a stacking term.');
  }

  const nn = meltingTemperatureNN({ sequence, table, strandConcentration, salt });

  const temperatures: ModelTemperature[] = [
    { id: table.id, name: table.name, celsius: nn.celsius },
    { id: 'gc', name: 'Salt-adjusted GC', celsius: meltingTemperatureGC(sequence, salt) },
    { id: 'wallace', name: 'Wallace rule', celsius: meltingTemperatureWallace(sequence) },
  ];

  const selected = temperatures.find((entry) => entry.id === modelId) ?? temperatures[0]!;

  const tail = sequence.slice(-5);
  const gcClamp = [...tail].filter((base) => base === 'G' || base === 'C').length;
  const threePrimeDeltaG =
    tail.length >= 2 ? freeEnergy(duplexThermodynamics(tail, table)) : Number.NaN;

  // The second copy runs antiparallel, so it is the reversed sequence that
  // lines up against this one.
  const selfDimer = bestPairing(sequence, [...sequence].reverse().join(''), table, 4);
  const hairpin = bestHairpin(sequence, table);

  const longestRun = longestHomopolymer(sequence);
  const gcContent = gcFraction(sequence);

  const warnings: string[] = [];

  if (sequence.length < 18) {
    warnings.push(
      `At ${sequence.length} bases this is short for a PCR primer. Below about 18 the sequence stops being unique in a mammalian genome, whatever its melting temperature.`,
    );
  } else if (sequence.length > 30) {
    warnings.push(
      `At ${sequence.length} bases this is longer than it needs to be. Past about 30 the extra length buys little specificity and raises the chance of secondary structure.`,
    );
  }

  if (gcContent < 0.4 || gcContent > 0.6) {
    warnings.push(
      `GC content is ${(gcContent * 100).toFixed(0)}%. Between 40 and 60% is the usual target; outside it, annealing behaves less predictably.`,
    );
  }

  if (gcClamp === 0) {
    warnings.push(
      'The last five bases contain no G or C, so the 3′ end is weakly anchored and the polymerase may not extend efficiently.',
    );
  } else if (gcClamp >= 4) {
    warnings.push(
      `${gcClamp} of the last five bases are G or C. A 3′ end this stable will tolerate a mismatch upstream and prime in the wrong place; one or two is the usual advice.`,
    );
  }

  if (longestRun.length >= 4) {
    warnings.push(
      `A run of ${longestRun.length} consecutive ${longestRun.base} bases. Runs of four or more slip during synthesis and during replication.`,
    );
  }

  if (selfDimer && selfDimer.deltaG <= DIMER_WARNING_DG) {
    warnings.push(
      `The primer pairs with a copy of itself over ${selfDimer.basePairs} bases at ${selfDimer.deltaG.toFixed(1)} kcal/mol${selfDimer.involves3Prime ? ', including its 3′ end, which lets it prime off itself' : ''}. Self-dimers consume primer and can amplify.`,
    );
  }

  if (hairpin && hairpin.deltaG <= HAIRPIN_WARNING_DG && hairpin.involves3Prime) {
    warnings.push(
      `The 3′ end can fold back on the primer at ${hairpin.deltaG.toFixed(1)} kcal/mol. A hairpin holding the 3′ end blocks extension.`,
    );
  }

  if (isSelfComplementary(sequence)) {
    warnings.push(
      'This sequence is its own reverse complement, so it pairs with a copy of itself perfectly. The melting temperature is computed for that self-duplex, not for a primer-template pair.',
    );
  }

  return {
    sequence,
    length: sequence.length,
    gcContent,
    selfComplementary: nn.thermo.selfComplementary,
    temperatures,
    selected,
    thermo: nn.thermo,
    deltaG37: freeEnergy(nn.thermo),
    gcClamp,
    threePrimeDeltaG,
    longestRun,
    selfDimer,
    hairpin,
    warnings,
  };
}

/** Difference in melting temperature between a primer pair, under one model. */
export function pairMismatch(a: PrimerResult, b: PrimerResult): number {
  return Math.abs(a.selected.celsius - b.selected.celsius);
}

export const DEFAULT_TABLE = ALLAWI_SANTALUCIA_1997;
