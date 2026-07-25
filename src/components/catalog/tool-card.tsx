import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ToolMeta } from '@/lib/tools/types';
import { ACCESS_LABELS } from '@/lib/tools/types';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        'lbl rounded-[3px] border px-1.5 py-px',
        tone === 'built' && 'border-gfp-600 text-gfp-400',
        tone === 'ext' && 'border-link-700 text-link-400',
        tone === 'warn' && 'border-amber-700 text-amber-400',
        tone === 'neutral' && 'border-line text-ink-faint',
      )}
    >
      {children}
    </span>
  );
}

export function ToolCard({ tool }: { tool: ToolMeta }) {
  const planned = tool.status === 'planned';
  const external = tool.kind === 'external';

  const body = (
    <>
      <div className="flex items-center gap-2">
        <strong className="text-[13.5px] font-semibold">{tool.name}</strong>
        {planned ? (
          <span className="lbl ml-auto flex-none">Planned</span>
        ) : external ? (
          <ArrowUpRight className="ml-auto size-3.5 flex-none text-ink-faint" aria-hidden />
        ) : null}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-[1.45] text-ink-muted">{tool.summary}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {external ? <Tag tone="ext">External</Tag> : <Tag tone="built">Built in</Tag>}
        {tool.external ? <Tag>{tool.external.provider}</Tag> : null}
        {tool.external ? (
          <Tag tone={tool.external.access === 'free' ? 'neutral' : 'warn'}>
            {ACCESS_LABELS[tool.external.access]}
          </Tag>
        ) : (
          <Tag>No upload</Tag>
        )}
      </div>
    </>
  );

  if (planned) {
    return <div className="h-full rounded-lab-lg border border-dashed border-line p-3">{body}</div>;
  }

  return (
    <Link
      href={routes.tool(tool.id)}
      className="block h-full rounded-lab-lg border border-line bg-surface p-3 transition-all hover:-translate-y-px hover:border-line-strong hover:bg-hover"
    >
      {body}
    </Link>
  );
}
