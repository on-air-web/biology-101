'use client';

import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { NumberInput, QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { Segmented } from '@/components/ui/segmented';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical } from '@/lib/units';
import { VESSELS, getVessel } from '@/lib/bio/vessels';
import { SeedingError, planSeeding, type SeedingRoute, type TargetBasis } from './compute';
import { cellSeedingMeta } from './meta';

const ROUTE_OPTIONS = [
  { value: 'master', label: 'One master mix' },
  { value: 'direct', label: 'Each vessel' },
] as const satisfies readonly { value: SeedingRoute; label: string }[];

const BASIS_OPTIONS = [
  { value: 'per-area', label: 'Cells / cm²' },
  { value: 'per-vessel', label: 'Cells / well' },
] as const satisfies readonly { value: TargetBasis; label: string }[];

const CUSTOM = 'custom';

export default function CellSeedingTool() {
  const [route, setRoute] = useState<SeedingRoute>('master');
  const [vesselId, setVesselId] = useState('6-well');
  const [area, setArea] = useState('9.6');
  const [workingVolume, setWorkingVolume] = useState<Quantity>({ raw: '2.5', unitId: 'mL' });
  const [count, setCount] = useState('6');
  const [stock, setStock] = useState('1e6');
  const [targetBasis, setTargetBasis] = useState<TargetBasis>('per-area');
  const [target, setTarget] = useState('50000');
  const [overage, setOverage] = useState('10');

  function selectVessel(id: string) {
    setVesselId(id);
    const vessel = getVessel(id);
    if (!vessel) return;
    setArea(String(vessel.growthAreaCm2));
    setWorkingVolume({ raw: String(vessel.workingVolumeMl), unitId: 'mL' });
    if (vessel.wells) setCount(String(vessel.wells));
  }

  const { result, error } = useMemo(() => {
    const growthAreaCm2 = parseNumber(area);
    const working = parseNumber(workingVolume.raw);
    const vessels = parseNumber(count);
    const stockCellsPerMl = parseNumber(stock);
    const targetValue = parseNumber(target);
    const overagePercent = parseNumber(overage);

    if (growthAreaCm2 === undefined || working === undefined) {
      return { result: undefined, error: undefined };
    }
    if (vessels === undefined || stockCellsPerMl === undefined || targetValue === undefined) {
      return { result: undefined, error: undefined };
    }
    if (overagePercent === undefined) return { result: undefined, error: undefined };

    try {
      return {
        result: planSeeding({
          stockCellsPerMl,
          target: targetValue,
          targetBasis,
          growthAreaCm2,
          // Canonical litres at the boundary, then millilitres for the compute
          // layer, which works in the units cell culture is published in.
          workingVolumeMl: toCanonical(working, workingVolume.unitId) * 1000,
          vessels,
          overage: overagePercent / 100,
          route,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof SeedingError ? caught.message : 'Could not plan that.',
      };
    }
  }, [area, workingVolume, count, stock, target, targetBasis, overage, route]);

  const suspension = result ? autoScale(result.suspensionVolumeMl / 1000, 'volume') : undefined;
  const medium = result ? autoScale(result.mediumVolumeMl / 1000, 'volume') : undefined;
  const total = result ? autoScale(result.totalVolumeMl / 1000, 'volume') : undefined;
  const perVessel = result
    ? autoScale(result.totalVolumeMl / result.effectiveVessels / 1000, 'volume')
    : undefined;

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <Segmented
        name="seeding-route"
        label="Prepare as"
        options={ROUTE_OPTIONS}
        value={route}
        onChange={setRoute}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="lbl" htmlFor="vessel">
            Vessel
          </label>
          <select
            id="vessel"
            value={vesselId}
            onChange={(event) => selectVessel(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {VESSELS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} — {entry.growthAreaCm2} cm²
              </option>
            ))}
            <option value={CUSTOM}>Custom vessel</option>
          </select>
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Nominal growth areas. They differ a little between manufacturers and more between
            surface treatments, so check the catalogue if the density has to be exact.
          </p>
        </div>

        <NumberInput
          name="area"
          label="Growth area"
          value={area}
          onChange={(value) => {
            setArea(value);
            setVesselId(CUSTOM);
          }}
          suffix="cm²"
        />
        <QuantityInput
          name="working-volume"
          label="Medium per vessel"
          dimension="volume"
          value={workingVolume}
          onChange={(value) => {
            setWorkingVolume(value);
            setVesselId(CUSTOM);
          }}
        />

        <NumberInput
          name="stock"
          label="Suspension density"
          value={stock}
          onChange={setStock}
          suffix="cells/mL"
          hint="From a haemocytometer count or a cell counter."
        />
        <NumberInput name="count" label="Vessels to seed" value={count} onChange={setCount} />
      </div>

      <div className="mt-4">
        <Segmented
          name="seeding-basis"
          label="Target expressed as"
          options={BASIS_OPTIONS}
          value={targetBasis}
          onChange={setTargetBasis}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <NumberInput
          name="target"
          label={targetBasis === 'per-area' ? 'Seeding density' : 'Cells per vessel'}
          value={target}
          onChange={setTarget}
          suffix={targetBasis === 'per-area' ? 'cells/cm²' : 'cells'}
        />
        <NumberInput
          name="overage"
          label="Prepare extra"
          value={overage}
          onChange={setOverage}
          suffix="%"
          hint="Covers what stays in the reservoir and the pipette."
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      <Result
        className="mt-5"
        label={route === 'master' ? 'Suspension into the master mix' : 'Suspension per vessel'}
        value={suspension ? formatNumber(suspension.value, 4) : undefined}
        unit={suspension?.unit.label}
        detail={
          result && medium && total && perVessel
            ? `Make up to ${formatNumber(total.value, 4)} ${total.unit.label} with ${formatNumber(medium.value, 4)} ${medium.unit.label} of medium${route === 'master' ? `, then dispense ${formatNumber(perVessel.value, 3)} ${perVessel.unit.label} per vessel.` : '.'}`
            : undefined
        }
        placeholder={error ?? 'Enter a density and a target to calculate.'}
      />

      {result ? (
        <div className="mt-4" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['Cells per vessel', formatNumber(result.cellsPerVessel, 3)],
                ['Cells per cm²', formatNumber(result.cellsPerCm2, 3)],
                ['Seeded at', `${formatNumber(result.seedingCellsPerMl, 3)}/mL`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="text-[11.5px] text-ink-faint">{label}</p>
                <p className="mt-0.5 font-mono text-[18px] leading-none font-medium">{value}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-[12.5px] text-ink-faint">
            {route === 'master'
              ? `${formatNumber(result.totalCells, 3)} cells needed in total · ${formatNumber(result.effectiveVessels, 3)} vessels-worth prepared`
              : `${formatNumber(result.totalCells, 3)} cells per vessel · overage does not apply when dosing each one`}
          </p>

          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}

          <ShareButton
            state={{
              route,
              vessel: vesselId,
              a: parseNumber(area) ?? 0,
              wv: parseNumber(workingVolume.raw) ?? 0,
              wvu: workingVolume.unitId,
              n: parseNumber(count) ?? 1,
              stock: parseNumber(stock) ?? 0,
              basis: targetBasis,
              t: parseNumber(target) ?? 0,
              ov: parseNumber(overage) ?? 0,
            }}
          />
        </div>
      ) : null}

      <Ladder
        formula="cells/vessel = density × area;  V_suspension = cells ÷ stock;  V_medium = V_total − V_suspension"
        model={
          route === 'master'
            ? 'One bulk mix at the final density, dispensed equally'
            : 'Suspension dosed into each vessel, then topped up'
        }
        citations={cellSeedingMeta.citations}
        computeLocation={cellSeedingMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        The count you start from carries its own uncertainty — a haemocytometer read to 100 cells is
        good to about a fifth, and that error passes straight through to the density seeded here.
        Where the seeding density matters, count enough cells to earn the precision you are
        assuming.
      </p>
    </div>
  );
}
