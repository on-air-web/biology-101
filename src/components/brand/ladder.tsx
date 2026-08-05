import type { Citation } from '@/lib/tools/types';
import { cn } from '@/lib/utils';

interface LadderProps {
  /** The expression actually evaluated, written the way a paper would write it. */
  formula: string;
  /** Name of the selected model, where a tool offers more than one. */
  model?: string;
  citations: Citation[];
  className?: string;
}

/**
 * The Ladder.
 *
 * A gel ladder is the reference lane every other lane is read against. This is
 * the same idea: the strip that lets a user check a result rather than trust
 * it. It appears under every computed value in the product, always, and is not
 * collapsible — provenance that hides is provenance that gets ignored.
 */
export function Ladder({ formula, model, citations, className }: LadderProps) {
  return (
    <figure className={cn('mt-6', className)}>
      <div className="ladder-rule" aria-hidden="true" />

      <figcaption className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
            Formula
          </span>
          <code className="font-mono text-ink">{formula}</code>
        </div>

        {model ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
              Model
            </span>
            <span className="text-ink">{model}</span>
          </div>
        ) : null}

        <ul className="space-y-1">
          {citations.map((citation) => {
            const href = citation.doi ? `https://doi.org/${citation.doi}` : citation.url;
            return (
              <li key={citation.label} className="text-ink-muted">
                <span className="text-ink">{citation.label}</span>
                {' — '}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line-strong underline-offset-2 hover:decoration-brand"
                  >
                    {citation.source}
                    {citation.year ? `, ${citation.year}` : null}
                  </a>
                ) : (
                  <span>
                    {citation.source}
                    {citation.year ? `, ${citation.year}` : null}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}
