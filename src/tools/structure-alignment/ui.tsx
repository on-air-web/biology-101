'use client';

import { useMemo, useRef, useState } from 'react';
import { TriangleAlert, Upload } from 'lucide-react';
import { Ladder } from '@/components/brand/ladder';
import { formatNumber } from '@/lib/format';
import { StructureError, chainSequence, parseStructure, type Structure } from '@/lib/bio/pdb';
import type { Vec3 } from '@/lib/bio/superpose';
import { AlignmentError, alignStructures, interpretTmScore } from './compute';
import { structureAlignmentMeta } from './meta';

interface Loaded {
  structure: Structure;
  chainId: string;
  filename: string;
}

/**
 * Reads a structure with FileReader.
 *
 * Nothing is uploaded, which for an unpublished or unreleased structure is not
 * a nicety — it is the difference between a tool someone can use and one their
 * institution will not let them near.
 */
function StructureSlot({
  label,
  loaded,
  onLoad,
  onChain,
  onError,
}: {
  label: string;
  loaded?: Loaded;
  onLoad: (loaded: Loaded) => void;
  onChain: (chainId: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function read(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const structure = parseStructure(String(reader.result), file.name);
        onLoad({ structure, chainId: structure.chains[0]!.id, filename: file.name });
      } catch (caught) {
        onError(
          caught instanceof StructureError
            ? `${file.name}: ${caught.message}`
            : `${file.name} could not be read.`,
        );
      }
    };
    reader.onerror = () => onError(`${file.name} could not be read.`);
    reader.readAsText(file);
  }

  const chain = loaded?.structure.chains.find((entry) => entry.id === loaded.chainId);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) read(file);
      }}
      className={`rounded-lab border p-3.5 transition-colors ${
        dragging ? 'border-gfp-400 bg-gfp-400/5' : 'border-line-strong bg-surface-raised'
      }`}
    >
      <p className="lbl">{label}</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex h-9 items-center gap-2 rounded-lab border border-line-strong px-3 text-[12.5px] hover:border-gfp-400"
      >
        <Upload className="size-3.5" aria-hidden />
        {loaded ? 'Replace file' : 'Choose a PDB or mmCIF file'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdb,.ent,.cif,.mmcif,.txt"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) read(file);
          event.target.value = '';
        }}
      />

      {loaded ? (
        <div className="mt-2.5">
          <p className="font-mono text-[12px] break-all text-ink-faint">
            {loaded.filename} · {loaded.structure.format === 'mmcif' ? 'mmCIF' : 'PDB'} ·{' '}
            {loaded.structure.id}
            {loaded.structure.modelCount > 1
              ? ` · ${loaded.structure.modelCount} models, first used`
              : ''}
          </p>

          <label className="lbl mt-2.5 block" htmlFor={`chain-${label}`}>
            Chain
          </label>
          <select
            id={`chain-${label}`}
            value={loaded.chainId}
            onChange={(event) => onChain(event.target.value)}
            className="mt-1 h-9 w-full rounded-lab border border-line-strong bg-black px-2 text-[13px] outline-none focus:ring-2 focus:ring-gfp-400"
          >
            {loaded.structure.chains.map((entry) => (
              <option key={entry.id} value={entry.id}>
                Chain {entry.id} — {entry.residues.length} residues
              </option>
            ))}
          </select>

          {chain ? (
            <p className="mt-2 font-mono text-[11px] leading-[1.6] break-all text-ink-faint">
              {chainSequence(chain).slice(0, 90)}
              {chain.residues.length > 90 ? '…' : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-ink-faint">Or drop a file here.</p>
      )}
    </div>
  );
}

/** Per-residue deviation. The plot is the part that says where they differ. */
function DeviationPlot({
  distances,
  d0,
}: {
  distances: { index: number; distance: number }[];
  d0: number;
}) {
  const width = 640;
  const height = 110;
  const max = Math.max(8, ...distances.map((entry) => entry.distance));
  const span = Math.max(...distances.map((entry) => entry.index)) || 1;

  const x = (index: number) => (index / span) * width;
  const y = (distance: number) => height - (distance / max) * (height - 8) - 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 block w-full"
      role="img"
      aria-label={`Per-residue deviation across the alignment, ranging from ${formatNumber(Math.min(...distances.map((d) => d.distance)), 2)} to ${formatNumber(max, 2)} angstroms.`}
    >
      {/* d0 is the distance at which a pair scores a half — the natural rule. */}
      <line
        x1="0"
        y1={y(d0)}
        x2={width}
        y2={y(d0)}
        stroke="var(--color-gfp-400, #4ade80)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.7"
      />
      <text x="2" y={y(d0) - 3} fontSize="9" fill="var(--color-gfp-400, #4ade80)" opacity="0.8">
        d₀ = {formatNumber(d0, 3)} Å
      </text>
      {distances.map((entry) => (
        <line
          key={entry.index}
          x1={x(entry.index)}
          y1={height - 4}
          x2={x(entry.index)}
          y2={y(entry.distance)}
          stroke="currentColor"
          strokeWidth={Math.max(0.8, width / span / 1.6)}
          opacity={entry.distance > d0 ? 0.95 : 0.45}
        />
      ))}
      <line
        x1="0"
        y1={height - 4}
        x2={width}
        y2={height - 4}
        stroke="var(--line-strong)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function StructureAlignmentTool() {
  const [first, setFirst] = useState<Loaded>();
  const [second, setSecond] = useState<Loaded>();
  const [fileError, setFileError] = useState<string>();

  const { result, error } = useMemo(() => {
    if (!first || !second) return { result: undefined, error: undefined };
    const a = first.structure.chains.find((entry) => entry.id === first.chainId);
    const b = second.structure.chains.find((entry) => entry.id === second.chainId);
    if (!a || !b) return { result: undefined, error: undefined };

    try {
      return {
        result: alignStructures({
          a: a.residues.map((r) => [r.x, r.y, r.z] as Vec3),
          b: b.residues.map((r) => [r.x, r.y, r.z] as Vec3),
          sequenceA: chainSequence(a),
          sequenceB: chainSequence(b),
        }),
        error: undefined,
      };
    } catch (caught) {
      return {
        result: undefined,
        error:
          caught instanceof AlignmentError
            ? caught.message
            : 'These structures could not be aligned.',
      };
    }
  }, [first, second]);

  const chainA = first?.structure.chains.find((entry) => entry.id === first.chainId);

  return (
    <div className="rounded-lab-lg border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StructureSlot
          label="First structure"
          loaded={first}
          onLoad={(loaded) => {
            setFirst(loaded);
            setFileError(undefined);
          }}
          onChain={(chainId) =>
            setFirst((current) => (current ? { ...current, chainId } : current))
          }
          onError={setFileError}
        />
        <StructureSlot
          label="Second structure"
          loaded={second}
          onLoad={(loaded) => {
            setSecond(loaded);
            setFileError(undefined);
          }}
          onChain={(chainId) =>
            setSecond((current) => (current ? { ...current, chainId } : current))
          }
          onError={setFileError}
        />
      </div>

      {fileError ? (
        <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {fileError}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[13px] text-signal-error">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5" aria-live="polite">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              {
                label: 'TM-score',
                value: formatNumber(result.tmScoreByA, 3),
                unit: `by ${result.lengthA} aa`,
              },
              {
                label: 'TM-score',
                value: formatNumber(result.tmScoreByB, 3),
                unit: `by ${result.lengthB} aa`,
              },
              { label: 'RMSD', value: formatNumber(result.rmsd, 3), unit: 'Å' },
              { label: 'Aligned', value: `${result.alignedLength}`, unit: 'residues' },
            ].map((cell, index) => (
              <div key={index} className="rounded-lab bg-surface-raised px-3.5 py-3">
                <p className="lbl">{cell.label}</p>
                <output className="mt-1 block font-mono text-[24px] leading-none font-medium">
                  {cell.value}
                </output>
                <p className="mt-1 text-[11px] text-ink-faint">{cell.unit}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 rounded-lab bg-surface-raised p-3 text-[13px] leading-[1.65]">
            Normalised by the shorter chain these structures show{' '}
            <span className="font-semibold text-gfp-400">
              {interpretTmScore(Math.max(result.tmScoreByA, result.tmScoreByB))}
            </span>
            . {result.closePairs} of {result.alignedLength} aligned residues sit within 5 Å, and{' '}
            {formatNumber(result.sequenceIdentity * 100, 3)}% of the aligned pairs are the same
            amino acid.
          </p>

          {result.tmScoreByA < 0.45 && result.sequenceIdentity > 0.3 ? (
            <p className="mt-3 flex gap-2.5 rounded-lab border border-amber-700 bg-amber-700/10 p-3 text-[12.5px] leading-[1.6] text-ink-muted">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>
                The sequences are similar but the structures are not. That usually means a large
                conformational change, a domain that has moved, or one model being poor — worth
                looking at before treating the low score as a lack of homology.
              </span>
            </p>
          ) : null}

          <div className="mt-4 rounded-lab bg-surface-raised p-3.5">
            <p className="lbl">Deviation along the first chain</p>
            <p className="mt-1 text-[12px] text-ink-faint">
              One bar per aligned residue. Bars above the dashed line are the regions that do not
              superpose.
            </p>
            <div className="text-gfp-400">
              <DeviationPlot
                distances={result.pairs.map((pair) => ({
                  index: pair.a,
                  distance: pair.distance,
                }))}
                d0={result.d0}
              />
            </div>
            {chainA ? (
              <p className="mt-1 font-mono text-[11px] text-ink-faint">
                residue {chainA.residues[result.pairs[0]!.a]?.number} to{' '}
                {chainA.residues[result.pairs[result.pairs.length - 1]!.a]?.number}
              </p>
            ) : null}
          </div>
        </div>
      ) : !first || !second ? (
        <p className="mt-4 rounded-lab bg-surface-raised p-4 text-[13px] text-ink-muted">
          Load two structures to align them. Files are read in your browser and neither is uploaded.
        </p>
      ) : null}

      <Ladder
        formula="TM-score = (1/L) Σ 1/(1 + (dᵢ/d₀)²);  d₀ = 1.24·∛(L−15) − 1.8"
        model="TM-align: iterative dynamic programming over a distance-weighted score matrix, with closed-form superposition"
        citations={structureAlignmentMeta.citations}
        computeLocation={structureAlignmentMeta.computeLocation}
      />

      <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">
        TM-score is asymmetric — it depends which length you divide by — so both are shown rather
        than one being chosen for you. Above about 0.5 two structures share a fold; below about 0.3
        they are no more alike than two proteins picked at random. Only alpha carbons are used. This
        is an independent implementation of the published method and will not agree with the
        reference program to the third decimal.
      </p>
    </div>
  );
}
