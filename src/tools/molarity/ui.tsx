'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { QuantityInput, NumberInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical, type Dimension } from '@/lib/units';
import { MolarityInputError, solveMolarity, type MolaritySolveFor } from './compute';
import { molarityMeta } from './meta';

const SOLVE_OPTIONS = [
  { value: 'mass', label: 'Mass' },
  { value: 'concentration', label: 'Concentration' },
  { value: 'volume', label: 'Volume' },
] as const satisfies readonly { value: MolaritySolveFor; label: string }[];

const OUTPUT: Record<MolaritySolveFor, { label: string; dimension: Dimension; formula: string }> = {
  mass: { label: 'Mass required', dimension: 'mass', formula: 'm = c × V × M' },
  concentration: { label: 'Concentration', dimension: 'concentration', formula: 'c = m ÷ M ÷ V' },
  volume: { label: 'Volume', dimension: 'volume', formula: 'V = m ÷ M ÷ c' },
};

export default function MolarityTool() {
  const [solveFor, setSolveFor] = useState<MolaritySolveFor>('mass');
  const [molarMass, setMolarMass] = useState('58.44');
  const [mass, setMass] = useState<Quantity>({ raw: '', unitId: 'mg' });
  const [concentration, setConcentration] = useState<Quantity>({ raw: '1', unitId: 'M' });
  const [volume, setVolume] = useState<Quantity>({ raw: '1', unitId: 'L' });

  const output = OUTPUT[solveFor];

  const { display, error } = useMemo(() => {
    const molarMassValue = parseNumber(molarMass);
    const parsed = {
      mass: parseNumber(mass.raw),
      concentration: parseNumber(concentration.raw),
      volume: parseNumber(volume.raw),
    };

    // An incomplete form is not an error state. Showing a red message while
    // someone is still typing is noise, so we simply show no result yet.
    const required = (['mass', 'concentration', 'volume'] as const).filter(
      (field) => field !== solveFor,
    );
    if (molarMassValue === undefined || required.some((field) => parsed[field] === undefined)) {
      return { display: undefined, error: undefined };
    }

    try {
      const canonical = solveMolarity(
        {
          molarMass: molarMassValue,
          mass: parsed.mass === undefined ? undefined : toCanonical(parsed.mass, mass.unitId),
          concentration:
            parsed.concentration === undefined
              ? undefined
              : toCanonical(parsed.concentration, concentration.unitId),
          volume:
            parsed.volume === undefined ? undefined : toCanonical(parsed.volume, volume.unitId),
        },
        solveFor,
      );

      const scaled = autoScale(canonical, output.dimension);
      return {
        display: { value: formatNumber(scaled.value), unit: scaled.unit.label },
        error: undefined,
      };
    } catch (caught) {
      return {
        display: undefined,
        error: caught instanceof MolarityInputError ? caught.message : 'Could not calculate.',
      };
    }
  }, [solveFor, molarMass, mass, concentration, volume, output.dimension]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <Segmented
        name="solve-for"
        label="Solve for"
        options={SOLVE_OPTIONS}
        value={solveFor}
        onChange={setSolveFor}
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <NumberInput
          label="Molar mass"
          value={molarMass}
          onChange={setMolarMass}
          suffix="g/mol"
          hint="From the reagent bottle or supplier datasheet."
        />

        {solveFor !== 'mass' ? (
          <QuantityInput label="Mass" dimension="mass" value={mass} onChange={setMass} />
        ) : null}

        {solveFor !== 'concentration' ? (
          <QuantityInput
            label="Concentration"
            dimension="concentration"
            value={concentration}
            onChange={setConcentration}
          />
        ) : null}

        {solveFor !== 'volume' ? (
          <QuantityInput label="Volume" dimension="volume" value={volume} onChange={setVolume} />
        ) : null}
      </div>

      <Result
        className="mt-6"
        label={output.label}
        value={display?.value}
        unit={display?.unit}
        placeholder={error ?? 'Fill in the fields above to calculate.'}
      />

      <Ladder
        formula={output.formula}
        citations={molarityMeta.citations}
        computeLocation={molarityMeta.computeLocation}
      />
    </div>
  );
}
