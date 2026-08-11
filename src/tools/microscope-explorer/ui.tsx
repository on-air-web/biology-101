'use client';

import { useMemo, useState } from 'react';
import { CircleAlert, Eye, EyeOff, Info, Tag } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { MicroscopeScene } from '@/components/tools/microscope-scene';
import { NumberInput } from '@/components/ui/quantity-input';
import { Result } from '@/components/ui/result';
import { ShareButton } from '@/components/ui/share-button';
import { MODALITIES, MODALITY_GROUPS, getModality, type RayBand } from '@/lib/bio/microscopes';
import { CRITERIA, type CriterionId } from '@/lib/bio/resolution';
import { formatNumber, parseNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  ResolutionError,
  conjugateSets,
  defaultBands,
  explore,
  partsInLightOrder,
  standParts,
} from './compute';
import { microscopeExplorerMeta } from './meta';

const IMMERSION = [
  { id: 'air', name: 'Air', index: 1.0 },
  { id: 'water', name: 'Water', index: 1.33 },
  { id: 'glycerol', name: 'Glycerol', index: 1.47 },
  { id: 'oil', name: 'Oil', index: 1.515 },
] as const;

export default function MicroscopeExplorerTool() {
  const [modalityId, setModalityId] = useState('brightfield');
  const [criterion, setCriterion] = useState<CriterionId>('abbe');
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>();
  const [hiddenBands, setHiddenBands] = useState<RayBand[]>([]);
  const [showBody, setShowBody] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [na, setNa] = useState('');
  const [wavelength, setWavelength] = useState('');
  const [immersionId, setImmersionId] = useState<string>('');

  const modality = getModality(modalityId)!;

  // Switching instrument resets the overrides: a 1.4 NA oil objective carried
  // onto a brightfield stand would be quietly wrong rather than obviously so.
  function chooseModality(id: string) {
    setModalityId(id);
    setSelectedPartId(undefined);
    setHiddenBands([]);
    setNa('');
    setWavelength('');
    setImmersionId('');
  }

  const immersion = IMMERSION.find((entry) => entry.id === immersionId);

  const { result, error } = useMemo(() => {
    try {
      return {
        result: explore({
          modalityId,
          criterion,
          numericalAperture: parseNumber(na),
          wavelength: parseNumber(wavelength),
          refractiveIndex: immersion?.index,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof ResolutionError ? caught.message : 'Could not work that out.',
      };
    }
  }, [modalityId, criterion, na, wavelength, immersion]);

  const visibleBands = useMemo(
    () => defaultBands(modality).filter((band) => !hiddenBands.includes(band)),
    [modality, hiddenBands],
  );

  const selectedPart = modality.parts.find((part) => part.id === selectedPartId);
  const ordered = useMemo(() => partsInLightOrder(modality), [modality]);
  const stand = useMemo(() => standParts(modality), [modality]);
  const sets = useMemo(() => conjugateSets(modality), [modality]);
  const setOf = (partId: string) => sets.find((set) => set.partIds.includes(partId));

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      {/* A dropdown rather than a row of chips: twelve instruments wrap to
          three lines as buttons and stop reading as one choice, and the groups
          say something a flat row cannot — that TIRF is a kind of widefield
          fluorescence and Airyscan is a kind of confocal. */}
      <div className="max-w-md">
        <label htmlFor="field-scope-modality" className="lbl">
          Instrument
        </label>
        <select
          id="field-scope-modality"
          value={modalityId}
          onChange={(event) => chooseModality(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
        >
          {MODALITY_GROUPS.map((group) => {
            const inGroup = MODALITIES.filter((entry) => entry.group === group);
            if (inGroup.length === 0) return null;
            return (
              <optgroup key={group} label={group}>
                {inGroup.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <p className="mt-1.5 text-[12px] leading-[1.6] text-ink-faint">{modality.summary}</p>
      </div>

      <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted">{modality.principle}</p>

      <div className="mt-5">
        <div>
          <MicroscopeScene
            modality={modality}
            visibleBands={visibleBands}
            selectedPartId={selectedPartId}
            onSelectPart={setSelectedPartId}
            showBody={showBody}
            showLabels={showLabels}
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            <label
              className={cn(
                'flex h-8 cursor-pointer items-center gap-2 rounded-lab border px-2.5 text-[12.5px]',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                showBody ? 'border-line-strong text-ink' : 'border-line text-ink-faint',
              )}
            >
              <input
                type="checkbox"
                checked={showBody}
                onChange={() => setShowBody((current) => !current)}
                className="sr-only"
              />
              {showBody ? (
                <Eye className="size-3.5 text-ink-muted" aria-hidden />
              ) : (
                <EyeOff className="size-3.5" aria-hidden />
              )}
              Stand and body
            </label>

            <label
              className={cn(
                'flex h-8 cursor-pointer items-center gap-2 rounded-lab border px-2.5 text-[12.5px]',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                showLabels ? 'border-line-strong text-ink' : 'border-line text-ink-faint',
              )}
            >
              <input
                type="checkbox"
                checked={showLabels}
                onChange={() => setShowLabels((current) => !current)}
                className="sr-only"
              />
              <Tag
                className={cn('size-3.5', showLabels ? 'text-ink-muted' : 'text-ink-faint')}
                aria-hidden
              />
              Labels
            </label>
          </div>

          <fieldset className="mt-3">
            <legend className="lbl">Light paths</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {modality.bands.map((band) => {
                const on = visibleBands.includes(band.band);
                return (
                  <label
                    key={band.band}
                    title={band.description}
                    className={cn(
                      'flex h-7 cursor-pointer items-center gap-1.5 rounded-lab border px-2.5 text-[12px]',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                      on ? 'border-line-strong text-ink' : 'border-line text-ink-faint',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setHiddenBands((current) =>
                          on ? [...current, band.band] : current.filter((b) => b !== band.band),
                        )
                      }
                      className="sr-only"
                    />
                    <span
                      className="h-0.5 w-4 rounded-full"
                      style={{ backgroundColor: bandColour(band.band) }}
                      aria-hidden
                    />
                    {band.label}
                  </label>
                );
              })}
            </div>
            <ul className="mt-2 space-y-1">
              {modality.bands
                .filter((band) => visibleBands.includes(band.band))
                .map((band) => (
                  <li key={band.band} className="text-[11.5px] leading-[1.6] text-ink-faint">
                    <span className="text-ink-muted">{band.label}</span> — {band.description}
                  </li>
                ))}
            </ul>
          </fieldset>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <p className="lbl">Parts, in the order light meets them</p>
          <ol className="mt-1.5 max-h-[280px] space-y-0.5 overflow-y-auto pr-1">
            {ordered.map((part) => {
              const on = part.id === selectedPartId;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onFocus={() => setSelectedPartId(part.id)}
                    onClick={() => setSelectedPartId(on ? undefined : part.id)}
                    className={cn(
                      'flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-[12.5px]',
                      'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                      on ? 'bg-gfp-400/10 text-ink' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                      {String(ordered.indexOf(part) + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1">{part.name}</span>
                    {part.conjugate ? (
                      <span className="font-mono text-[10.5px] text-ink-faint uppercase">
                        {part.conjugate}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          {modality.parts.some((part) => part.kind === 'dichroic') ? (
            <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
              The dichroic and the objective are each passed twice — once by the excitation on its
              way down, once by the emission coming back up — and are listed where the light first
              reaches them.
            </p>
          ) : null}

          <p className="lbl mt-4">The stand</p>
          <ul className="mt-1.5 space-y-0.5">
            {stand.map((part) => {
              const on = part.id === selectedPartId;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onFocus={() => setSelectedPartId(part.id)}
                    onClick={() => setSelectedPartId(on ? undefined : part.id)}
                    className={cn(
                      'flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-[12.5px]',
                      'focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                      on ? 'bg-gfp-400/10 text-ink' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <span className="flex-1">{part.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
            Carries no light. It is here so the parts above can be found on a real instrument — hide
            it with the toggle above the drawing to see the bare optical train.
          </p>
        </div>

        <div>
          <p className="lbl">What it does</p>
          <div className="mt-1.5 min-h-[220px] rounded-lab border border-line bg-surface-raised p-3.5">
            {selectedPart ? (
              <>
                <p className="text-[13.5px] font-medium text-ink">{selectedPart.name}</p>
                <p className="mt-1.5 text-[12.5px] leading-[1.65] text-ink-muted">
                  {selectedPart.role}
                </p>
                {selectedPart.ifWrong ? (
                  <p className="mt-2 flex gap-2 text-[12px] leading-[1.6] text-ink-faint">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden />
                    <span>{selectedPart.ifWrong}</span>
                  </p>
                ) : null}
                {selectedPart.conjugate ? (
                  <p className="mt-2 flex gap-2 text-[12px] leading-[1.6] text-ink-faint">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-link-400" aria-hidden />
                    <span>{setOf(selectedPart.id)?.description}</span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[12.5px] leading-[1.65] text-ink-faint">
                Click a part in the drawing or the list to read what it does. Tabbing through the
                drawing walks the optical train from the source to the detector.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <NumberInput
          name="scope-na"
          label="Objective NA"
          value={na}
          onChange={setNa}
          hint={`Fitted: ${modality.optics.numericalAperture}`}
        />
        <div>
          <label htmlFor="field-scope-immersion" className="lbl">
            Immersion
          </label>
          <select
            id="field-scope-immersion"
            value={immersionId}
            onChange={(event) => setImmersionId(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Fitted: n = {modality.optics.refractiveIndex}</option>
            {IMMERSION.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} (n = {entry.index})
              </option>
            ))}
          </select>
        </div>
        <NumberInput
          name="scope-wavelength"
          label="Wavelength"
          value={wavelength}
          onChange={setWavelength}
          suffix="nm"
          hint={`Fitted: ${modality.optics.wavelength} nm`}
        />
        <div>
          <label htmlFor="field-scope-criterion" className="lbl">
            Criterion
          </label>
          <select
            id="field-scope-criterion"
            value={criterion}
            onChange={(event) => setCriterion(event.target.value as CriterionId)}
            className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            {CRITERIA.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Result
        className="mt-4"
        label="Lateral resolution"
        value={result ? formatNumber(result.resolution.lateral, 4) : undefined}
        unit="nm"
        detail={
          result
            ? `Axial ${formatNumber(result.resolution.axial, 4)} nm, Airy radius ${formatNumber(result.resolution.airyRadius, 4)} nm, collection half-angle ${formatNumber(result.resolution.acceptanceAngle, 3)}°.`
            : undefined
        }
        placeholder={error ?? 'Choose an instrument.'}
      />

      {result ? (
        <>
          <p className="mt-3 flex gap-2.5 rounded-lab border border-line bg-surface-raised p-3 text-[12.5px] leading-[1.6] text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-link-400" aria-hidden />
            <span>{result.gain.note}</span>
          </p>

          {result.notes.map((note) => (
            <p key={note} className="mt-2 text-[12px] leading-[1.6] text-ink-faint">
              {note}
            </p>
          ))}

          <ShareButton
            state={{
              m: modalityId,
              c: criterion,
              na: parseNumber(na) ?? 0,
              w: parseNumber(wavelength) ?? 0,
              i: immersionId,
            }}
          />
        </>
      ) : null}

      <Ladder
        formula="d = k·λ ÷ NA, with k = 0.5 (Abbe), 0.61 (Rayleigh) or 0.47 (Sparrow);  axial = 2nλ ÷ NA²;  NA = n·sin θ"
        model={CRITERIA.find((entry) => entry.id === criterion)?.name}
        citations={microscopeExplorerMeta.citations}
      />

      <div className="mt-3 space-y-2">
        {modality.caveats.map((caveat) => (
          <p key={caveat} className="text-[12px] leading-[1.6] text-ink-faint">
            {caveat}
          </p>
        ))}
        <p className="text-[12px] leading-[1.6] text-ink-faint">
          The drawing is a schematic, not an optical design: parts sit in the right order and every
          ray passes through the correct sequence of conjugate planes, but nothing is traced through
          a lens prescription and no focal length is claimed. The stand is a generic upright one,
          drawn so the optics can be found on a real instrument rather than to match any
          manufacturer — and much fluorescence work is done on inverted stands, where the objective
          sits under the specimen and everything above the sample here is below it. The optical axis
          is compressed for legibility, more so with the stand hidden. The resolution figures beside
          the drawing are real closed forms and do not depend on it.
        </p>
      </div>
    </div>
  );
}

/** Kept in step with BAND_STYLE in microscope-scene.tsx. */
function bandColour(band: RayBand): string {
  switch (band) {
    case 'illumination':
    case 'surround':
      return 'var(--color-amber-400)';
    case 'excitation':
    case 'ordinary':
      return 'var(--color-link-400)';
    case 'depletion':
    case 'diffracted':
    case 'extraordinary':
      return 'var(--color-rose-lab-400)';
    default:
      return 'var(--color-gfp-400)';
  }
}
