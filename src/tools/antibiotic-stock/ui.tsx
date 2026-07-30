'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, fromCanonical, toCanonical } from '@/lib/units';
import { ANTIBIOTICS, AntibioticError, doseCulture, getAntibiotic, massForStock } from './compute';
import { antibioticStockMeta } from './meta';

type Mode = 'dose' | 'make';

const MODES = [
  { value: 'dose', label: 'Add to a culture' },
  { value: 'make', label: 'Make a stock' },
] as const satisfies readonly { value: Mode; label: string }[];

const CUSTOM = 'custom';

export default function AntibioticStockTool() {
  const [mode, setMode] = useState<Mode>('dose');
  const [antibioticId, setAntibioticId] = useState('ampicillin');
  const [stock, setStock] = useState<Quantity>({ raw: '100', unitId: 'mg_mL' });
  const [working, setWorking] = useState<Quantity>({ raw: '100', unitId: 'ug_mL' });
  const [cultureVolume, setCultureVolume] = useState<Quantity>({ raw: '500', unitId: 'mL' });
  const [stockVolume, setStockVolume] = useState<Quantity>({ raw: '10', unitId: 'mL' });

  const antibiotic = antibioticId === CUSTOM ? undefined : getAntibiotic(antibioticId);

  function select(id: string) {
    setAntibioticId(id);
    const entry = getAntibiotic(id);
    if (!entry) return;
    // The reference values are in g/L; show them in the units people read.
    setStock({ raw: String(fromCanonical(entry.stock, 'mg_mL')), unitId: 'mg_mL' });
    setWorking({ raw: String(fromCanonical(entry.working, 'ug_mL')), unitId: 'ug_mL' });
  }

  const { dose, error } = useMemo(() => {
    const stockValue = parseNumber(stock.raw);
    const workingValue = parseNumber(working.raw);
    const volume = parseNumber(cultureVolume.raw);
    if (stockValue === undefined || workingValue === undefined || volume === undefined) {
      return { dose: undefined, error: undefined };
    }
    try {
      return {
        dose: doseCulture({
          stockConcentration: toCanonical(stockValue, stock.unitId),
          workingConcentration: toCanonical(workingValue, working.unitId),
          cultureVolume: toCanonical(volume, cultureVolume.unitId),
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        dose: undefined,
        error: caught instanceof AntibioticError ? caught.message : 'Could not work that out.',
      };
    }
  }, [stock, working, cultureVolume]);

  const weighOut = useMemo(() => {
    const stockValue = parseNumber(stock.raw);
    const volume = parseNumber(stockVolume.raw);
    if (stockValue === undefined || volume === undefined) return undefined;
    try {
      return massForStock(
        toCanonical(stockValue, stock.unitId),
        toCanonical(volume, stockVolume.unitId),
      );
    } catch {
      return undefined;
    }
  }, [stock, stockVolume]);

  const dosed = dose ? autoScale(dose.volumeToAdd, 'volume') : undefined;
  const weighed = weighOut === undefined ? undefined : autoScale(weighOut, 'mass');

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <Segmented
        name="antibiotic-mode"
        label="Calculate"
        options={MODES}
        value={mode}
        onChange={setMode}
      />

      <div className="mt-4">
        <label className="lbl" htmlFor="antibiotic">
          Antibiotic
        </label>
        <select
          id="antibiotic"
          value={antibioticId}
          onChange={(event) => select(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
        >
          {ANTIBIOTICS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} — {fromCanonical(entry.working, 'ug_mL')} µg/mL in{' '}
              {entry.solvent.toLowerCase()}
            </option>
          ))}
          <option value={CUSTOM}>Something else</option>
        </select>
        {antibiotic ? (
          <p className="mt-1.5 text-[12px] leading-[1.6] text-ink-faint">
            <span className="text-ink-muted">Solvent: {antibiotic.solvent}.</span> {antibiotic.note}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Enter the concentrations yourself. Every field below is editable whichever you pick.
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <QuantityInput
          name="stock-concentration"
          label="Stock concentration"
          dimension="mass-concentration"
          value={stock}
          onChange={setStock}
        />
        {mode === 'dose' ? (
          <QuantityInput
            name="working-concentration"
            label="Working concentration"
            dimension="mass-concentration"
            value={working}
            onChange={setWorking}
          />
        ) : (
          <QuantityInput
            name="stock-volume"
            label="Stock volume to make"
            dimension="volume"
            value={stockVolume}
            onChange={setStockVolume}
          />
        )}
      </div>

      {mode === 'dose' ? (
        <div className="mt-4 sm:w-1/2">
          <QuantityInput
            name="culture-volume"
            label="Medium to treat"
            dimension="volume"
            value={cultureVolume}
            onChange={setCultureVolume}
          />
        </div>
      ) : null}

      {mode === 'dose' ? (
        <>
          <Result
            className="mt-5"
            label="Stock to add"
            value={dosed ? formatNumber(dosed.value, 4) : undefined}
            unit={dosed?.unit.label}
            detail={
              dose
                ? `A 1 in ${formatNumber(dose.foldDilution, 4)} dilution, delivering ${formatNumber(autoScale(dose.massDelivered, 'mass').value, 3)} ${autoScale(dose.massDelivered, 'mass').unit.label}.`
                : undefined
            }
            placeholder={error ?? 'Fill in the fields above.'}
          />

          {dose?.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}
        </>
      ) : (
        <Result
          className="mt-5"
          label="Weigh out"
          value={weighed ? formatNumber(weighed.value, 4) : undefined}
          unit={weighed?.unit.label}
          detail={
            antibiotic
              ? `Dissolve in ${antibiotic.solvent.toLowerCase()} and filter sterilise — do not autoclave, which destroys most antibiotics.`
              : 'Filter sterilise rather than autoclaving.'
          }
          placeholder="Fill in the fields above."
        />
      )}

      {dose ? (
        <ShareButton
          state={{
            ab: antibioticId,
            s: parseNumber(stock.raw) ?? 0,
            su: stock.unitId,
            w: parseNumber(working.raw) ?? 0,
            wu: working.unitId,
            v: parseNumber(cultureVolume.raw) ?? 0,
            vu: cultureVolume.unitId,
          }}
        />
      ) : null}

      <Ladder
        formula={
          mode === 'dose' ? 'V_stock = C_working × V_culture ÷ C_stock' : 'mass = C_stock × V_stock'
        }
        citations={antibioticStockMeta.citations}
        computeLocation={antibioticStockMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        The reference concentrations are the usual ones for selecting plasmids in E. coli. A
        low-copy plasmid, a rich medium or a different organism all change them. Add antibiotics to
        molten agar only once it has cooled to about 50 °C — poured hot, several of them are
        destroyed before the plate sets.
      </p>
    </div>
  );
}
