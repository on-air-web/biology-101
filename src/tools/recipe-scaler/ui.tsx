'use client';

import { useMemo, useState } from 'react';
import { Plus, TriangleAlert, X } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { QuantityInput, type Quantity } from '@/components/ui/quantity-input';
import { ShareButton } from '@/components/ui/share-button';
import { formatNumber, parseNumber } from '@/lib/format';
import { autoScale, toCanonical } from '@/lib/units';
import { ScaleError, type ComponentKind, impliedStockConcentration, scaleRecipe } from './compute';
import { recipeScalerMeta } from './meta';

interface Row {
  id: string;
  name: string;
  kind: ComponentKind;
  quantity: Quantity;
}

/** The example from the request: a supplement in medium, scaled to a bigger batch. */
const INITIAL_ROWS: Row[] = [
  { id: 'r1', name: 'Supplement', kind: 'volume', quantity: { raw: '230', unitId: 'uL' } },
];

let nextId = 2;

function scaled(value: number, kind: ComponentKind) {
  return autoScale(value, kind === 'volume' ? 'volume' : 'mass');
}

export default function RecipeScalerTool() {
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [reference, setReference] = useState<Quantity>({ raw: '10', unitId: 'mL' });
  const [target, setTarget] = useState<Quantity>({ raw: '25', unitId: 'mL' });
  const [finalConcentration, setFinalConcentration] = useState('250');

  function update(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const { result, error } = useMemo(() => {
    const referenceBatch = parseNumber(reference.raw);
    const targetBatch = parseNumber(target.raw);
    if (referenceBatch === undefined || targetBatch === undefined) {
      return { result: undefined, error: undefined };
    }

    const components = rows.map((row) => {
      const amount = parseNumber(row.quantity.raw) ?? 0;
      return {
        id: row.id,
        name: row.name.trim() || 'Component',
        kind: row.kind,
        amount: toCanonical(amount, row.quantity.unitId),
      };
    });

    try {
      return {
        result: scaleRecipe({
          referenceBatch: toCanonical(referenceBatch, reference.unitId),
          targetBatch: toCanonical(targetBatch, target.unitId),
          components,
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof ScaleError ? caught.message : 'Could not scale that recipe.',
      };
    }
  }, [rows, reference, target]);

  // Only meaningful for a single-component recipe, where the concentration
  // unambiguously belongs to that component.
  const stock = useMemo(() => {
    const concentration = parseNumber(finalConcentration);
    const referenceBatch = parseNumber(reference.raw);
    const first = rows[0];
    if (
      rows.length !== 1 ||
      !first ||
      first.kind !== 'volume' ||
      concentration === undefined ||
      referenceBatch === undefined
    ) {
      return undefined;
    }
    const amount = parseNumber(first.quantity.raw);
    if (amount === undefined || amount <= 0) return undefined;
    try {
      return impliedStockConcentration(
        toCanonical(amount, first.quantity.unitId),
        toCanonical(referenceBatch, reference.unitId),
        concentration,
      );
    } catch {
      return undefined;
    }
  }, [rows, reference, finalConcentration]);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <QuantityInput
          name="reference-batch"
          label="Recipe is written for"
          dimension="volume"
          value={reference}
          onChange={setReference}
          hint="The batch the numbers below belong to."
        />
        <QuantityInput
          name="target-batch"
          label="You want to make"
          dimension="volume"
          value={target}
          onChange={setTarget}
          hint="Scaling works downwards too."
        />
      </div>

      <p className="lbl mt-5">Components</p>
      <div className="mt-1.5 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_auto_1.2fr_auto] sm:items-end">
            <div>
              <label className="lbl" htmlFor={`name-${row.id}`}>
                Name
              </label>
              <input
                id={`name-${row.id}`}
                value={row.name}
                onChange={(event) => update(row.id, { name: event.target.value })}
                className="mt-1.5 h-11 w-full rounded-lab border border-line-strong bg-surface px-3 outline-none focus:ring-2 focus:ring-gfp-400"
                placeholder="Supplement"
              />
            </div>

            <div>
              {/* The options already read "Volume" and "Mass", so a visible
                  label only crowds the row. Kept for screen readers. */}
              <label className="sr-only" htmlFor={`kind-${row.id}`}>
                {row.name || 'Component'} is measured as
              </label>
              <select
                id={`kind-${row.id}`}
                value={row.kind}
                onChange={(event) => {
                  const kind = event.target.value as ComponentKind;
                  update(row.id, {
                    kind,
                    // The unit must follow the dimension or the selector shows
                    // millilitres against a mass.
                    quantity: { ...row.quantity, unitId: kind === 'volume' ? 'uL' : 'mg' },
                  });
                }}
                className="mt-1.5 h-11 rounded-lab border border-line-strong bg-black px-2 outline-none focus:ring-2 focus:ring-gfp-400"
              >
                <option value="volume">Volume</option>
                <option value="mass">Mass</option>
              </select>
            </div>

            <QuantityInput
              name={`amount-${row.id}`}
              label="Amount in that batch"
              dimension={row.kind === 'volume' ? 'volume' : 'mass'}
              value={row.quantity}
              onChange={(quantity) => update(row.id, { quantity })}
            />

            <button
              type="button"
              onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))}
              disabled={rows.length === 1}
              aria-label={`Remove ${row.name || 'component'}`}
              className="mb-0.5 inline-flex size-11 items-center justify-center rounded-lab border border-line-strong text-ink-muted hover:text-ink disabled:opacity-30"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setRows((current) => [
            ...current,
            {
              id: `r${nextId++}`,
              name: '',
              kind: 'volume',
              quantity: { raw: '', unitId: 'uL' },
            },
          ]);
        }}
        className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lab border border-line-strong px-3 text-[12.5px] text-ink-muted hover:text-ink"
      >
        <Plus className="size-3.5" aria-hidden />
        Add a component
      </button>

      {error ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          <p className="lbl">
            For {formatNumber(parseNumber(target.raw) ?? 0, 6)}{' '}
            {target.unitId === 'uL' ? 'µL' : target.unitId}
            {' · '}
            <span className="text-gfp-400">×{formatNumber(result.factor, 4)}</span>
          </p>

          <div className="mt-2 space-y-2">
            {result.components.map((component) => {
              const value = scaled(component.scaled, component.kind);
              return (
                <div
                  key={component.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lab bg-surface-raised px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold">{component.name}</p>
                    {component.fractionOfBatch !== undefined ? (
                      <p className="font-mono text-[11.5px] text-ink-faint">
                        {formatNumber(component.fractionOfBatch * 100, 3)}% of the batch
                      </p>
                    ) : null}
                  </div>
                  <output className="font-mono text-[24px] leading-none font-medium">
                    {formatNumber(value.value, 4)}
                    <span className="ml-1 text-[14px] text-ink-muted">{value.unit.label}</span>
                  </output>
                </div>
              );
            })}

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lab border border-line-strong px-3.5 py-3">
              <div>
                <p className="text-[13.5px] font-semibold">Medium, to make up</p>
                <p className="font-mono text-[11.5px] text-ink-faint">
                  Bringing the batch to volume
                </p>
              </div>
              <output className="font-mono text-[24px] leading-none font-medium">
                {formatNumber(scaled(result.diluent, 'volume').value, 4)}
                <span className="ml-1 text-[14px] text-ink-muted">
                  {scaled(result.diluent, 'volume').unit.label}
                </span>
              </output>
            </div>
          </div>

          {rows.length === 1 && rows[0]!.kind === 'volume' ? (
            <div className="mt-3 rounded-lab bg-surface-raised p-3.5">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-40">
                  <label className="lbl" htmlFor="final-concentration">
                    Final concentration
                  </label>
                  <div className="mt-1.5 flex items-stretch overflow-hidden rounded-lab border border-line-strong bg-surface focus-within:ring-2 focus-within:ring-brand">
                    <input
                      id="final-concentration"
                      value={finalConcentration}
                      onChange={(event) => setFinalConcentration(event.target.value)}
                      inputMode="decimal"
                      autoComplete="off"
                      className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono tabular-nums outline-none"
                    />
                    <span className="flex h-11 items-center border-l border-line-strong bg-surface-sunken px-3 text-sm text-ink-muted">
                      µg/mL
                    </span>
                  </div>
                </div>
                <p className="pb-2.5 text-[13px] leading-[1.6]">
                  {stock === undefined ? (
                    <span className="text-ink-faint">
                      Optional — it does not affect the scaling.
                    </span>
                  ) : (
                    <>
                      Your stock must be{' '}
                      <span className="font-mono font-semibold">
                        {formatNumber(stock / 1000, 4)} mg/mL
                      </span>
                      <span className="text-ink-faint">
                        {' '}
                        for that to come out right. Unchanged by the scaling.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : null}

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
              ref: parseNumber(reference.raw) ?? 0,
              refu: reference.unitId,
              tgt: parseNumber(target.raw) ?? 0,
              tgtu: target.unitId,
              c: rows.map((row) => parseNumber(row.quantity.raw) ?? 0),
            }}
          />
        </div>
      ) : null}

      <Ladder
        formula="amount_new = amount_old × (batch_new ÷ batch_old)"
        citations={recipeScalerMeta.citations}
        computeLocation={recipeScalerMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        Every concentration is preserved because both the component and the batch scale by the same
        factor. This assumes the components add to the volume — if your recipe means &ldquo;make up
        to&rdquo; rather than &ldquo;add to&rdquo;, the medium figure above is the one to use.
      </p>
    </div>
  );
}
