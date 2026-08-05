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
import { Od600Error, diluteCulture, readCulture, wellPathLength, type Instrument } from './compute';
import { getPlates, getVessel } from '@/lib/bio/vessels';
import { ORGANISMS, getOrganism } from './organisms';
import { od600Meta } from './meta';

type Mode = 'density' | 'dilute';

const MODE_OPTIONS = [
  { value: 'density', label: 'Cell density' },
  { value: 'dilute', label: 'Dilute to target' },
] as const satisfies readonly { value: Mode; label: string }[];

const INSTRUMENT_OPTIONS = [
  { value: 'cuvette', label: 'Cuvette' },
  { value: 'plate', label: 'Plate reader' },
] as const satisfies readonly { value: Instrument; label: string }[];

const CUSTOM = 'custom';

/**
 * Splits formatNumber's "3.2e+8" into parts. The plus is dropped: it is
 * meaningful in a machine-readable exponent and noise in a printed one.
 */
function splitScientific(value: number, significantFigures: number) {
  const text = formatNumber(value, significantFigures);
  const [mantissa = text, exponent] = text.split('e');
  return { mantissa, exponent: exponent?.replace('+', '') };
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
};

/** Scientific notation for strings that cannot carry markup. */
function sci(value: number, significantFigures = 3): string {
  const { mantissa, exponent } = splitScientific(value, significantFigures);
  if (exponent === undefined) return mantissa;
  const digits = [...exponent].map((character) => SUPERSCRIPT[character] ?? character).join('');
  return `${mantissa} × 10${digits}`;
}

/** Renders 3.2e+8 as 3.2 × 10⁸, which is how a cell count is written. */
function CellCount({ value }: { value: number }) {
  const { mantissa, exponent } = splitScientific(value, 3);
  if (exponent === undefined) return <>{mantissa}</>;
  return (
    <>
      {mantissa} × 10<sup className="text-[0.6em]">{exponent}</sup>
    </>
  );
}

export default function Od600Tool() {
  const [mode, setMode] = useState<Mode>('density');
  const [measuredOd, setMeasuredOd] = useState('0.4');
  const [dilutionFactor, setDilutionFactor] = useState('1');
  const [instrument, setInstrument] = useState<Instrument>('cuvette');

  const [cuvettePath, setCuvettePath] = useState<Quantity>({ raw: '1', unitId: 'cm' });
  const [plateId, setPlateId] = useState('96-well');
  const [wellVolume, setWellVolume] = useState<Quantity>({ raw: '200', unitId: 'uL' });
  const [wellDiameter, setWellDiameter] = useState<Quantity>({ raw: '6.4', unitId: 'mm' });

  const [organismId, setOrganismId] = useState('e-coli');
  const [cellsPerOd, setCellsPerOd] = useState('8e8');
  const [cultureVolume, setCultureVolume] = useState<Quantity>({ raw: '', unitId: 'mL' });

  const [targetOd, setTargetOd] = useState('0.05');
  const [targetVolume, setTargetVolume] = useState<Quantity>({ raw: '200', unitId: 'mL' });

  function selectOrganism(id: string) {
    setOrganismId(id);
    const organism = getOrganism(id);
    if (organism) setCellsPerOd(String(organism.cellsPerMlPerOd));
  }

  function selectPlate(id: string) {
    setPlateId(id);
    const plate = getVessel(id);
    if (!plate?.wellDiameterMm) return;
    setWellDiameter({ raw: String(plate.wellDiameterMm), unitId: 'mm' });
    setWellVolume({ raw: String(plate.workingVolumeMl * 1000), unitId: 'uL' });
  }

  const organism = organismId === CUSTOM ? undefined : getOrganism(organismId);

  const pathLength = useMemo(() => {
    if (instrument === 'cuvette') {
      const value = parseNumber(cuvettePath.raw);
      return value === undefined ? undefined : toCanonical(value, cuvettePath.unitId);
    }
    const volume = parseNumber(wellVolume.raw);
    const diameter = parseNumber(wellDiameter.raw);
    if (volume === undefined || diameter === undefined) return undefined;
    try {
      return wellPathLength(
        toCanonical(volume, wellVolume.unitId),
        toCanonical(diameter, wellDiameter.unitId),
      );
    } catch {
      return undefined;
    }
  }, [instrument, cuvettePath, wellVolume, wellDiameter]);

  const { reading, error } = useMemo(() => {
    const od = parseNumber(measuredOd);
    const dilution = parseNumber(dilutionFactor);
    const factor = parseNumber(cellsPerOd);
    const volume = parseNumber(cultureVolume.raw);

    if (od === undefined || dilution === undefined || factor === undefined) {
      return { reading: undefined, error: undefined };
    }
    if (pathLength === undefined) return { reading: undefined, error: undefined };

    try {
      return {
        reading: readCulture({
          measuredOd: od,
          dilutionFactor: dilution,
          pathLength,
          cellsPerMlPerOd: factor,
          instrument,
          cultureVolume:
            volume === undefined ? undefined : toCanonical(volume, cultureVolume.unitId),
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        reading: undefined,
        error: caught instanceof Od600Error ? caught.message : 'Could not read that.',
      };
    }
  }, [measuredOd, dilutionFactor, cellsPerOd, cultureVolume, pathLength, instrument]);

  const { dilution, dilutionError } = useMemo(() => {
    if (mode !== 'dilute' || !reading) return { dilution: undefined, dilutionError: undefined };
    const target = parseNumber(targetOd);
    const volume = parseNumber(targetVolume.raw);
    if (target === undefined || volume === undefined) {
      return { dilution: undefined, dilutionError: undefined };
    }

    try {
      return {
        dilution: diluteCulture({
          currentOd: reading.cultureOd,
          targetOd: target,
          targetVolume: toCanonical(volume, targetVolume.unitId),
        }),
        dilutionError: undefined,
      };
    } catch (caught) {
      return {
        dilution: undefined,
        dilutionError:
          caught instanceof Od600Error ? caught.message : 'Could not plan that dilution.',
      };
    }
  }, [mode, reading, targetOd, targetVolume]);

  const cultureScaled = dilution ? autoScale(dilution.cultureVolume, 'volume') : undefined;
  const mediumScaled = dilution ? autoScale(dilution.mediumVolume, 'volume') : undefined;

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <Segmented
        name="od600-mode"
        label="Calculate"
        options={MODE_OPTIONS}
        value={mode}
        onChange={setMode}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <NumberInput
          name="reading"
          label="Reading"
          value={measuredOd}
          onChange={setMeasuredOd}
          suffix="OD600"
          hint="Exactly what the instrument displayed."
        />
        <NumberInput
          name="dilution-factor"
          label="Diluted before reading"
          value={dilutionFactor}
          onChange={setDilutionFactor}
          suffix="fold"
          hint="1 if you read it neat, 10 for a 1 in 10."
        />
      </div>

      <div className="mt-4">
        <Segmented
          name="od600-instrument"
          label="Read on"
          options={INSTRUMENT_OPTIONS}
          value={instrument}
          onChange={setInstrument}
        />
      </div>

      {instrument === 'cuvette' ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <QuantityInput
            name="cuvette-path"
            label="Cuvette path length"
            dimension="length"
            value={cuvettePath}
            onChange={setCuvettePath}
            hint="1 cm unless you are using a short-path cuvette."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="lbl" htmlFor="plate">
              Plate
            </label>
            <select
              id="plate"
              value={plateId}
              onChange={(event) => selectPlate(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
            >
              {getPlates().map((plate) => (
                <option key={plate.id} value={plate.id}>
                  {plate.name}
                </option>
              ))}
            </select>
          </div>
          <QuantityInput
            name="well-volume"
            label="Volume in the well"
            dimension="volume"
            value={wellVolume}
            onChange={setWellVolume}
          />
          <QuantityInput
            name="well-diameter"
            label="Well diameter"
            dimension="length"
            value={wellDiameter}
            onChange={setWellDiameter}
          />
          {pathLength !== undefined ? (
            <p className="sm:col-span-2 font-mono text-[12px] text-ink-faint">
              Path length {formatNumber(pathLength * 100, 3)} cm, from volume ÷ πr². The cylinder
              model ignores the meniscus and reads a few per cent long; if your reader has a path
              length correction, prefer it.
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="organism">
            Organism
          </label>
          <select
            id="organism"
            value={organismId}
            onChange={(event) => selectOrganism(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-black px-3 outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {ORGANISMS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
            <option value={CUSTOM}>Custom calibration</option>
          </select>
        </div>

        <NumberInput
          name="cells-per-od"
          label="Cells per mL at OD 1.0"
          value={cellsPerOd}
          onChange={(value) => {
            setCellsPerOd(value);
            setOrganismId(CUSTOM);
          }}
          hint={
            organism
              ? `Commonly reported between ${sci(organism.range[0], 2)} and ${sci(organism.range[1], 2)}.`
              : 'Your own calibration against plate counts.'
          }
        />

        {mode === 'density' ? (
          <QuantityInput
            name="culture-volume"
            label="Culture volume"
            dimension="volume"
            value={cultureVolume}
            onChange={setCultureVolume}
            hint="Optional, for a total cell count."
          />
        ) : null}
      </div>

      {mode === 'dilute' ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberInput
            name="target-od"
            label="Target density"
            value={targetOd}
            onChange={setTargetOd}
            suffix="OD600"
          />
          <QuantityInput
            name="target-volume"
            label="Volume wanted"
            dimension="volume"
            value={targetVolume}
            onChange={setTargetVolume}
          />
        </div>
      ) : null}

      {(error ?? dilutionError) ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error ?? dilutionError}
        </p>
      ) : null}

      {mode === 'density' ? (
        <Result
          className="mt-5"
          label="Culture density"
          value={reading ? formatNumber(reading.cultureOd, 4) : undefined}
          unit="OD600"
          detail={
            reading ? `Corrected to a 1 cm path and back to the undiluted culture.` : undefined
          }
          placeholder={error ?? 'Enter a reading to calculate.'}
        />
      ) : (
        <Result
          className="mt-5"
          label="Culture to take"
          value={cultureScaled ? formatNumber(cultureScaled.value, 4) : undefined}
          unit={cultureScaled?.unit.label}
          detail={
            dilution && mediumScaled && reading
              ? `Add ${formatNumber(mediumScaled.value, 4)} ${mediumScaled.unit.label} of fresh medium. That is a 1 in ${formatNumber(dilution.foldDilution, 3)} dilution from OD ${formatNumber(reading.cultureOd, 3)}.`
              : undefined
          }
          placeholder={error ?? dilutionError ?? 'Enter a reading and a target to calculate.'}
        />
      )}

      {reading ? (
        <div className="mt-4" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lab bg-surface-raised px-3.5 py-3">
              <p className="text-[11.5px] text-ink-faint">Cells per mL</p>
              <p className="mt-0.5 font-mono text-[24px] leading-none font-medium">
                <CellCount value={reading.cellsPerMl} />
              </p>
            </div>
            {reading.totalCells !== undefined ? (
              <div className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="text-[11.5px] text-ink-faint">Cells in the culture</p>
                <p className="mt-0.5 font-mono text-[24px] leading-none font-medium">
                  <CellCount value={reading.totalCells} />
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-3 font-mono text-[12.5px] text-ink-faint">
            Beam saw {formatNumber(reading.odPerCmInBeam, 3)} per cm · culture OD{' '}
            {formatNumber(reading.cultureOd, 4)}
          </p>

          {reading.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{warning}</span>
            </p>
          ))}

          {organism ? (
            <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[12.5px] leading-[1.6] text-ink-muted">
              <span className="lbl mr-1.5">About {organism.name}</span>
              {organism.note}
            </p>
          ) : null}

          <ShareButton
            state={{
              mode,
              od: parseNumber(measuredOd) ?? 0,
              d: parseNumber(dilutionFactor) ?? 1,
              inst: instrument,
              org: organismId,
              f: parseNumber(cellsPerOd) ?? 0,
              tod: mode === 'dilute' ? (parseNumber(targetOd) ?? 0) : undefined,
              tv: mode === 'dilute' ? (parseNumber(targetVolume.raw) ?? 0) : undefined,
              tvu: mode === 'dilute' ? targetVolume.unitId : undefined,
            }}
          />
        </div>
      ) : null}

      <Ladder
        formula="OD_culture = OD_read ÷ ℓ(cm) × D;  cells/mL = OD_culture × F;  ℓ_well = V ÷ πr²"
        model={
          organism
            ? `${organism.name}, F = ${sci(organism.cellsPerMlPerOd)} cells/mL per OD unit`
            : 'Custom calibration'
        }
        citations={od600Meta.citations}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        OD600 measures scattered light, not absorption, so the cells-per-OD factor belongs to an
        instrument as much as to an organism, and it drifts with cell size as growth rate changes.
        Treat the count as an estimate good to a factor of about two unless you have calibrated
        against plate counts or a haemocytometer on the instrument you are using.
      </p>
    </div>
  );
}
