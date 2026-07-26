'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical } from '@/lib/units';
import { MIN_RELIABLE_TRANSFER_LITRES, SerialDilutionError, planSerialDilution } from './compute';
import { serialDilutionMeta } from './meta';

function volume(litres: number): string {
  const scaled = autoScale(litres, 'volume');
  return `${formatNumber(scaled.value)} ${scaled.unit.label}`;
}

export default function SerialDilutionTool() {
  const [stock, setStock] = useState<Quantity>({ raw: '1', unitId: 'M' });
  const [fold, setFold] = useState('10');
  const [steps, setSteps] = useState('6');
  const [perTube, setPerTube] = useState<Quantity>({ raw: '1', unitId: 'mL' });

  const { plan, error } = useMemo(() => {
    const stockValue = parseNumber(stock.raw);
    const foldValue = parseNumber(fold);
    const stepsValue = parseNumber(steps);
    const perTubeValue = parseNumber(perTube.raw);

    if ([stockValue, foldValue, stepsValue, perTubeValue].some((value) => value === undefined)) {
      return { plan: undefined, error: undefined };
    }

    try {
      return {
        plan: planSerialDilution({
          stockConcentration: toCanonical(stockValue!, stock.unitId),
          foldPerStep: foldValue!,
          steps: stepsValue!,
          volumePerStep: toCanonical(perTubeValue!, perTube.unitId),
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        plan: undefined,
        error: caught instanceof SerialDilutionError ? caught.message : 'Could not build a plan.',
      };
    }
  }, [stock, fold, steps, perTube]);

  const transfer = plan?.[1]?.transferVolume;
  const transferTooSmall = transfer !== undefined && transfer < MIN_RELIABLE_TRANSFER_LITRES;

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <QuantityInput
          name="stock-concentration"
          label="Stock concentration"
          dimension="concentration"
          value={stock}
          onChange={setStock}
        />
        <QuantityInput
          name="volume-per-tube"
          label="Volume per tube"
          dimension="volume"
          value={perTube}
          onChange={setPerTube}
          hint="Total volume in each tube after mixing."
        />
        <NumberInput
          name="dilution-factor"
          label="Dilution factor per step"
          value={fold}
          onChange={setFold}
          suffix="fold"
        />
        <NumberInput name="steps" label="Number of steps" value={steps} onChange={setSteps} />
      </div>

      {error ? (
        <p className="mt-5 rounded-lab bg-surface-sunken p-4 text-sm text-signal-error">{error}</p>
      ) : null}

      {transferTooSmall ? (
        <p className="mt-5 flex gap-2 rounded-lab border border-phenol-300 bg-phenol-100 p-3 text-sm text-phenol-700 dark:bg-transparent dark:text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Each transfer is {volume(transfer)}, below what a pipette handles reliably. Increase the
            volume per tube, or use a smaller dilution factor over more steps.
          </span>
        </p>
      ) : null}

      {plan ? (
        <div className="mt-5 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-md text-sm">
            <caption className="sr-only">Serial dilution plan</caption>
            <thead>
              <tr className="text-label tracking-[0.09em] text-ink-muted uppercase">
                <th scope="col" className="py-2 text-left font-medium">
                  Tube
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Concentration
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  1 in
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Transfer
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Diluent
                </th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {plan.map((step) => {
                const concentration = autoScale(step.concentration, 'concentration');
                return (
                  <tr key={step.index} className="border-t border-line">
                    <td className="py-1.5">{step.index === 0 ? 'Stock' : step.index}</td>
                    <td className="py-1.5 text-right">
                      {formatNumber(concentration.value)} {concentration.unit.label}
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {step.index === 0 ? '—' : formatNumber(step.cumulativeFold, 4)}
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {step.transferVolume === undefined ? '—' : volume(step.transferVolume)}
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {step.diluentVolume === undefined ? '—' : volume(step.diluentVolume)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Ladder
        formula="Cₙ = C₀ ÷ fⁿ, transfer = V ÷ f"
        citations={serialDilutionMeta.citations}
        computeLocation={serialDilutionMeta.computeLocation}
      />
    </div>
  );
}
