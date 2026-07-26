import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Band } from '@/components/brand/band';

/**
 * A titled section banner that goes somewhere.
 *
 * The arrow is the point: a band that only decorates is wasted height on a
 * page whose job is to get people to a tool. It leads to the category page,
 * which holds everything rather than the handful shown below.
 */
export function SectionBand({
  title,
  description,
  href,
  count,
  layer,
  speed = 0.14,
}: {
  title: string;
  description: string;
  href: string;
  count: number;
  layer: ReactNode;
  speed?: number;
}) {
  return (
    <Band
      speed={speed}
      className="mt-11 flex min-h-[210px] items-end border-t border-line"
      layer={layer}
    >
      <div className="on-photo mx-auto flex w-full max-w-[1120px] flex-wrap items-end justify-between gap-x-6 gap-y-3 px-5 pb-5">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1.5 max-w-[56ch] text-[13.5px] text-ink-muted">{description}</p>
        </div>

        <Link
          href={href}
          aria-label={`See all ${count} tools in ${title}`}
          className="group inline-flex h-10 flex-none items-center gap-2 rounded-lab border border-line-strong bg-black/40 px-4 text-[13px] font-semibold backdrop-blur-sm transition-colors hover:border-gfp-400 hover:bg-black/70"
        >
          All {count}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </Band>
  );
}
