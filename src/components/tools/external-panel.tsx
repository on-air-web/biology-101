import { ArrowUpRight } from 'lucide-react';
import type { ToolMeta } from '@/lib/tools/types';
import { ACCESS_LABELS } from '@/lib/tools/types';

/**
 * The detail view for a tool we do not host.
 *
 * The "use when" block is the reason this page exists. Everything else is
 * metadata a user could eventually find themselves; the judgement is not.
 */
export function ExternalPanel({ tool }: { tool: ToolMeta }) {
  const info = tool.external;
  if (!info) return null;

  return (
    <div className="rounded-lab-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3.5">
        <h2 className="text-[15.5px] font-semibold tracking-[-0.01em]">
          {tool.name} <ArrowUpRight className="inline size-3.5 text-ink-faint" aria-hidden />
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {info.provider} · {new URL(info.url).hostname.replace(/^www\./, '')}
        </p>
      </div>

      <div className="px-4 py-3.5">
        <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-[12.5px] sm:grid-cols-[104px_1fr]">
          <dt className="text-ink-faint">Does</dt>
          <dd>{tool.summary}</dd>
          <dt className="text-ink-faint">Access</dt>
          <dd>{ACCESS_LABELS[info.access]}</dd>
          {info.licenseNote ? (
            <>
              <dt className="text-ink-faint">Licence</dt>
              <dd>{info.licenseNote}</dd>
            </>
          ) : null}
          {info.inputNote ? (
            <>
              <dt className="text-ink-faint">Limits</dt>
              <dd>{info.inputNote}</dd>
            </>
          ) : null}
        </dl>

        <div className="mt-3.5 rounded-lab border-l-2 border-gfp-400 bg-surface-raised px-3 py-2.5">
          <p className="lbl mb-1">Use this when</p>
          <p className="text-[12.5px] text-ink-muted">{info.useWhen}</p>
        </div>

        <a
          href={info.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3.5 inline-flex h-8 items-center gap-1.5 rounded-lab bg-ink px-3 text-[12.5px] font-semibold text-black"
        >
          Open {tool.name}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>

        <p className="mt-2.5 text-[11.5px] text-ink-faint">
          External tool. We link, we don&rsquo;t host — nothing you enter on Biology 101 reaches
          them.
        </p>
      </div>
    </div>
  );
}
