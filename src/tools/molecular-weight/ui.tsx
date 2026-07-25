'use client';

import { useMemo, useState } from 'react';
import { Ladder } from '@/components/brand/ladder';
import { CopyButton } from '@/components/ui/copy-button';
import { Result } from '@/components/ui/result';
import { formatNumber } from '@/lib/format';
import { FormulaError, orderElements, parseFormula } from '@/lib/formula';
import { getAtomicMass } from '@/lib/atomic-masses';
import { molecularWeightMeta } from './meta';

/** Formulae people actually look up, as one-tap starting points. */
const EXAMPLES = ['NaCl', 'C6H12O6', 'C4H11NO3', 'MgSO4·7H2O', '(NH4)2SO4', 'Na2HPO4'];

export default function MolecularWeightTool() {
  const [formula, setFormula] = useState('');

  const { result, error } = useMemo(() => {
    if (formula.trim() === '') return { result: undefined, error: undefined };
    try {
      return { result: parseFormula(formula), error: undefined };
    } catch (caught) {
      return {
        result: undefined,
        error: caught instanceof FormulaError ? caught.message : 'Could not parse that formula.',
      };
    }
  }, [formula]);

  const rows = result ? orderElements(result.composition) : [];

  return (
    <div className="rounded-lab-lg border border-line bg-surface-raised p-5 sm:p-6">
      <label
        htmlFor="formula"
        className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase"
      >
        Chemical formula
      </label>
      <input
        id="formula"
        value={formula}
        onChange={(event) => setFormula(event.target.value)}
        placeholder="CuSO4·5H2O"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        className={`mt-1.5 h-12 w-full rounded-lab border bg-surface px-3 font-mono outline-none focus:ring-2 focus:ring-brand ${
          error ? 'border-signal-error' : 'border-line-strong'
        }`}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setFormula(example)}
            className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-ink-muted hover:border-line-strong hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>

      <Result
        className="mt-5"
        label="Molar mass"
        value={result ? formatNumber(result.molarMass, 6) : undefined}
        unit="g/mol"
        placeholder={error ?? 'Enter a formula to calculate.'}
      />

      {result ? (
        <>
          <div className="mt-3">
            <CopyButton value={formatNumber(result.molarMass, 6)} label="Copy mass" />
          </div>

          <table className="mt-5 w-full text-sm">
            <caption className="sr-only">Elemental composition</caption>
            <thead>
              <tr className="text-label tracking-[0.09em] text-ink-muted uppercase">
                <th scope="col" className="py-2 text-left font-medium">
                  Element
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Atoms
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Mass contribution
                </th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((symbol) => {
                const count = result.composition[symbol] ?? 0;
                const mass = (getAtomicMass(symbol) ?? 0) * count;
                return (
                  <tr key={symbol} className="border-t border-line">
                    <td className="py-1.5">{symbol}</td>
                    <td className="py-1.5 text-right">{count}</td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {formatNumber(mass, 5)} g/mol
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}

      <Ladder
        formula="M = Σ (atomic weight × atom count)"
        model="IUPAC 2021 abridged standard atomic weights"
        citations={molecularWeightMeta.citations}
        computeLocation={molecularWeightMeta.computeLocation}
      />

      <p className="mt-3 text-sm text-ink-muted">
        Values follow IUPAC&rsquo;s current abridged atomic weights, so a result may differ from a
        supplier&rsquo;s catalogue in the last digit. Ammonium sulfate, for instance, comes to
        132.13 here against the 132.14 printed on most bottles — the difference is sulfur.
      </p>
    </div>
  );
}
