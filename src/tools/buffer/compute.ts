/**
 * Buffer preparation.
 *
 * Henderson–Hasselbalch, with the pKa corrected for temperature — which is the
 * whole reason this tool exists rather than being a two-line formula.
 *
 * What it deliberately does not do: correct for ionic strength. Activity
 * coefficients shift real pH by roughly 0.1 units at physiological salt, and
 * pretending otherwise would give false precision. The honest instruction is
 * to use this to get close and then check with a meter, and the interface says
 * so.
 */

import { parseFormula } from '@/lib/formula';
import { type BufferSpec } from '@/lib/chem/buffers';

export class BufferError extends Error {}

export type PreparationRoute = 'two-salts' | 'titrate';

export interface BufferInput {
  spec: BufferSpec;
  targetPh: number;
  /** Total buffer species concentration, mol/L. */
  concentration: number;
  /** Final volume, litres. */
  volume: number;
  /** Temperature the pH is being adjusted at, °C. */
  prepareAtC: number;
  /** Temperature the buffer will be used at, °C. */
  useAtC: number;
  route: PreparationRoute;
}

export interface Component {
  name: string;
  formula: string;
  molarMass: number;
  moles: number;
  grams: number;
}

export interface BufferResult {
  /** pKa corrected to the preparation temperature. */
  pKaAtPrep: number;
  pKaAtUse: number;
  /** Fraction present as the conjugate base at the target pH. */
  baseFraction: number;
  components: Component[];
  /** Strong acid or base needed, when titrating a single species. */
  titrant?: { name: string; moles: number };
  /**
   * pH the buffer will actually show at the use temperature, if adjusted at
   * the preparation temperature. The number people get caught by.
   */
  phAtUse: number;
  warnings: string[];
}

/** pKa shifts linearly with temperature over the range a bench works in. */
export function pKaAt(spec: BufferSpec, temperatureC: number): number {
  return spec.pKa25 + spec.dpKadT * (temperatureC - 25);
}

function molarMass(formula: string): number {
  return parseFormula(formula).molarMass;
}

export function prepareBuffer(input: BufferInput): BufferResult {
  const { spec, targetPh, concentration, volume, prepareAtC, useAtC, route } = input;

  if (!Number.isFinite(targetPh) || targetPh < 0 || targetPh > 14) {
    throw new BufferError('Target pH must lie between 0 and 14.');
  }
  if (!Number.isFinite(concentration) || concentration <= 0) {
    throw new BufferError('Concentration must be greater than zero.');
  }
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new BufferError('Volume must be greater than zero.');
  }
  for (const temperature of [prepareAtC, useAtC]) {
    if (!Number.isFinite(temperature) || temperature < -20 || temperature > 100) {
      throw new BufferError('Temperature must lie between −20 and 100 °C.');
    }
  }

  const pKaAtPrep = pKaAt(spec, prepareAtC);
  const pKaAtUse = pKaAt(spec, useAtC);

  // Henderson–Hasselbalch: pH = pKa + log10([base]/[acid]).
  const ratio = 10 ** (targetPh - pKaAtPrep);
  const baseFraction = ratio / (1 + ratio);
  const acidFraction = 1 - baseFraction;

  const totalMoles = concentration * volume;

  const warnings: string[] = [];
  if (targetPh < spec.usefulRange[0] || targetPh > spec.usefulRange[1]) {
    warnings.push(
      `pH ${targetPh} is outside ${spec.name}'s useful range of ${spec.usefulRange[0]}–${spec.usefulRange[1]}. Buffering capacity here is poor; pick a buffer with a pKa closer to your target.`,
    );
  }
  if (baseFraction < 0.09 || baseFraction > 0.91) {
    warnings.push(
      'The two forms differ by more than tenfold, so the buffer resists pH change only weakly in one direction.',
    );
  }

  // A buffer adjusted at one temperature and used at another shifts by the
  // difference in pKa. This is the number that catches people out.
  const phAtUse = targetPh + (pKaAtUse - pKaAtPrep);
  if (Math.abs(phAtUse - targetPh) >= 0.1) {
    warnings.push(
      `Adjusted at ${prepareAtC} °C, this buffer will read about pH ${phAtUse.toFixed(2)} at ${useAtC} °C — a shift of ${(phAtUse - targetPh).toFixed(2)} units. Adjust the pH at the working temperature instead.`,
    );
  }

  const components: Component[] = [];
  let titrant: BufferResult['titrant'];

  if (route === 'two-salts') {
    for (const [species, fraction] of [
      [spec.acid, acidFraction],
      [spec.base, baseFraction],
    ] as const) {
      const mass = molarMass(species.formula);
      components.push({
        name: species.name,
        formula: species.formula,
        molarMass: mass,
        moles: totalMoles * fraction,
        grams: totalMoles * fraction * mass,
      });
    }
  } else {
    // Weigh out all of the base form, then titrate down with strong acid.
    // Every mole of acid form needed comes from one mole of H⁺.
    const mass = molarMass(spec.base.formula);
    components.push({
      name: spec.base.name,
      formula: spec.base.formula,
      molarMass: mass,
      moles: totalMoles,
      grams: totalMoles * mass,
    });
    titrant = { name: 'HCl', moles: totalMoles * acidFraction };
  }

  return { pKaAtPrep, pKaAtUse, baseFraction, components, titrant, phAtUse, warnings };
}
