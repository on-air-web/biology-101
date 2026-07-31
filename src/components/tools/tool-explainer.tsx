import { AlertTriangle } from 'lucide-react';
import type { ToolExplainer } from '@/lib/tools/types';

/**
 * The teaching layer under a tool.
 *
 * Ordered by what an uncertain reader needs first: whether they are in the
 * right place, then a concrete example to check themselves against, then what
 * tends to go wrong, then the questions they arrived with. The tool itself
 * stays above all of it — someone who already knows what they are doing should
 * never have to scroll past prose to reach the fields.
 */
export function ToolExplainerSection({ explainer }: { explainer: ToolExplainer }) {
  const { whenToUse, workedExample, commonMistakes, faq } = explainer;

  return (
    <>
      <section className="mt-10">
        <h2 className="text-xl">When to use this</h2>
        <p className="mt-3 leading-[1.7] text-ink-muted">{whenToUse}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Worked example</h2>
        <div className="mt-3 rounded-lab-lg border border-line bg-surface-raised p-5">
          <p className="text-[14.5px] text-ink">{workedExample.scenario}</p>

          <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {workedExample.inputs.map((input) => (
              <div key={input.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
                  {input.label}
                </dt>
                <dd className="text-right font-mono text-[13px]">{input.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-label font-medium tracking-[0.09em] text-ink-muted uppercase">
              Result
            </p>
            <output className="mt-1 block font-mono text-[24px] leading-none font-medium text-gfp-400">
              {workedExample.result}
            </output>
            <p className="mt-2.5 text-[13.5px] leading-[1.7] text-ink-muted">
              {workedExample.reading}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">What people get wrong</h2>
        <ul className="mt-3 space-y-3">
          {commonMistakes.map((mistake) => (
            <li key={mistake} className="flex gap-3 text-[14px] leading-[1.7] text-ink-muted">
              <AlertTriangle className="mt-1 size-4 shrink-0 text-amber-400" aria-hidden />
              <span>{mistake}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Questions</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {faq.map((entry) => (
            <details key={entry.question} className="group py-3.5">
              <summary className="cursor-pointer list-none text-[14.5px] font-medium marker:hidden">
                <span className="mr-2 text-ink-faint transition-transform group-open:hidden">
                  +
                </span>
                <span className="mr-2 hidden text-gfp-400 group-open:inline">−</span>
                {entry.question}
              </summary>
              <p className="mt-2.5 pl-5 text-[14px] leading-[1.7] text-ink-muted">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
