'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { Segmented } from '@/components/ui/segmented';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical, type Dimension } from '@/lib/units';
import {
  DilutionInputError,
  dilutionFactor,
  solveDilution,
  type DilutionSolveFor,
} from './compute';
import { dilutionMeta } from './meta';

const SOLVE_OPTIONS = [
  { value: 'stockVolume', label: 'Stock volume' },
  { value: 'finalVolume', label: 'Final volume' },
  { value: 'finalConcentration', label: 'Final conc.' },
  { value: 'stockConcentration', label: 'Stock conc.' },
] as const satisfies readonly { value: DilutionSolveFor; label: string }[];

const OUTPUT: Record<
  DilutionSolveFor,
  { label: string; isConcentration: boolean; formula: string }
> = {
  stockVolume: {
    label: 'Stock volume to take',
    isConcentration: false,
    formula: 'V₁ = C₂V₂ ÷ C₁',
  },
  finalVolume: { label: 'Final volume', isConcentration: false, formula: 'V₂ = C₁V₁ ÷ C₂' },
  finalConcentration: {
    label: 'Final concentration',
    isConcentration: true,
    formula: 'C₂ = C₁V₁ ÷ V₂',
  },
  stockConcentration: {
    label: 'Stock concentration',
    isConcentration: true,
    formula: 'C₁ = C₂V₂ ÷ V₁',
  },
};

/**
 * C₁V₁ = C₂V₂ holds in whatever unit the two concentrations share, so the only
 * requirement is that both sides are the same kind. Molar and mass-per-volume
 * are offered as a pair rather than mixed in one selector: picking µg/mL
 * against mM would need a molar mass, and the relation does not have one.
 */
const KINDS = [
  { value: 'concentration', label: 'Molar' },
  { value: 'mass-concentration', label: 'Mass / volume' },
] as const satisfies readonly { value: Dimension; label: string }[];

type ConcentrationKind = (typeof KINDS)[number]['value'];

/** Sensible starting units when the kind is switched. */
const DEFAULTS: Record<ConcentrationKind, { stock: string; final: string }> = {
  concentration: { stock: 'M', final: 'mM' },
  'mass-concentration': { stock: 'mg_mL', final: 'ug_mL' },
};

export default function DilutionTool() {
  const [solveFor, setSolveFor] = useState<DilutionSolveFor>('stockVolume');
  const [kind, setKind] = useState<ConcentrationKind>('concentration');
  const [stockConcentration, setStockConcentration] = useState<Quantity>({ raw: '1', unitId: 'M' });
  const [stockVolume, setStockVolume] = useState<Quantity>({ raw: '', unitId: 'uL' });
  const [finalConcentration, setFinalConcentration] = useState<Quantity>({
    raw: '50',
    unitId: 'mM',
  });
  const [finalVolume, setFinalVolume] = useState<Quantity>({ raw: '10', unitId: 'mL' });

  const output = OUTPUT[solveFor];
  const outputDimension: Dimension = output.isConcentration ? kind : 'volume';

  /**
   * Switching kind has to move the units too. Leaving 'M' selected while the
   * selector lists mg/mL would show a value the dropdown cannot represent, and
   * the result would be scaled against the wrong dimension.
   */
  function switchKind(next: ConcentrationKind) {
    setKind(next);
    setStockConcentration((current) => ({ ...current, unitId: DEFAULTS[next].stock }));
    setFinalConcentration((current) => ({ ...current, unitId: DEFAULTS[next].final }));
  }

  const { display, detail, error } = useMemo(() => {
    const fields = {
      stockConcentration: {
        value: parseNumber(stockConcentration.raw),
        unitId: stockConcentration.unitId,
      },
      stockVolume: { value: parseNumber(stockVolume.raw), unitId: stockVolume.unitId },
      finalConcentration: {
        value: parseNumber(finalConcentration.raw),
        unitId: finalConcentration.unitId,
      },
      finalVolume: { value: parseNumber(finalVolume.raw), unitId: finalVolume.unitId },
    };

    const required = (Object.keys(fields) as DilutionSolveFor[]).filter(
      (field) => field !== solveFor,
    );
    if (required.some((field) => fields[field].value === undefined)) {
      return { display: undefined, detail: undefined, error: undefined };
    }

    const canonicalInput = Object.fromEntries(
      (Object.keys(fields) as DilutionSolveFor[]).map((field) => {
        const entry = fields[field];
        return [
          field,
          entry.value === undefined ? undefined : toCanonical(entry.value, entry.unitId),
        ];
      }),
    );

    try {
      const canonical = solveDilution(canonicalInput, solveFor);
      const scaled = autoScale(canonical, outputDimension);

      // The number people actually need next is how much diluent to add.
      let extra: string | undefined;
      if (solveFor === 'stockVolume' && canonicalInput.finalVolume !== undefined) {
        const diluent = autoScale(canonicalInput.finalVolume - canonical, 'volume');
        const fold = dilutionFactor(
          canonicalInput.stockConcentration ?? 0,
          canonicalInput.finalConcentration ?? 1,
        );
        extra = `Add ${formatNumber(diluent.value)} ${diluent.unit.label} of diluent. That is a 1 in ${formatNumber(fold, 3)} dilution.`;
      }

      return {
        display: { value: formatNumber(scaled.value), unit: scaled.unit.label },
        detail: extra,
        error: undefined,
      };
    } catch (caught) {
      return {
        display: undefined,
        detail: undefined,
        error: caught instanceof DilutionInputError ? caught.message : 'Could not calculate.',
      };
    }
  }, [solveFor, stockConcentration, stockVolume, finalConcentration, finalVolume, outputDimension]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <Segmented
        name="dilution-solve-for"
        label="Solve for"
        options={SOLVE_OPTIONS}
        value={solveFor}
        onChange={setSolveFor}
      />

      <div className="mt-5">
        <Segmented
          name="dilution-kind"
          label="Concentration in"
          options={KINDS}
          value={kind}
          onChange={switchKind}
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {solveFor !== 'stockConcentration' ? (
          <QuantityInput
            name="stock-concentration"
            label="Stock concentration (C₁)"
            dimension={kind}
            value={stockConcentration}
            onChange={setStockConcentration}
          />
        ) : null}

        {solveFor !== 'stockVolume' ? (
          <QuantityInput
            name="stock-volume"
            label="Stock volume (V₁)"
            dimension="volume"
            value={stockVolume}
            onChange={setStockVolume}
          />
        ) : null}

        {solveFor !== 'finalConcentration' ? (
          <QuantityInput
            name="final-concentration"
            label="Final concentration (C₂)"
            dimension={kind}
            value={finalConcentration}
            onChange={setFinalConcentration}
          />
        ) : null}

        {solveFor !== 'finalVolume' ? (
          <QuantityInput
            name="final-volume"
            label="Final volume (V₂)"
            dimension="volume"
            value={finalVolume}
            onChange={setFinalVolume}
          />
        ) : null}
      </div>

      <Result
        className="mt-6"
        label={output.label}
        value={display?.value}
        unit={display?.unit}
        detail={detail}
        placeholder={error ?? 'Fill in the fields above to calculate.'}
      />

      <Ladder
        formula={output.formula}
        citations={dilutionMeta.citations}
        computeLocation={dilutionMeta.computeLocation}
      />
    </div>
  );
}
