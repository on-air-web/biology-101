'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A full-bleed image band with parallax.
 *
 * The motion is deliberately slight. Heavy parallax reads as a marketing site,
 * and this needs to read as an instrument. Disabled entirely under
 * prefers-reduced-motion.
 */
export function Band({
  children,
  layer,
  speed = 0.18,
  className,
}: {
  children: ReactNode;
  layer: ReactNode;
  speed?: number;
  className?: string;
}) {
  const bandRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    function update() {
      const band = bandRef.current;
      const element = layerRef.current;
      if (band && element) {
        const rect = band.getBoundingClientRect();
        const viewport = window.innerHeight;
        if (rect.bottom > -300 && rect.top < viewport + 300) {
          const offset = (rect.top + rect.height / 2 - viewport / 2) * speed;
          element.style.transform = `translate3d(-50%, calc(-50% + ${offset.toFixed(1)}px), 0)`;
        }
      }
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [speed]);

  return (
    <div ref={bandRef} className={cn('relative isolate overflow-hidden bg-black', className)}>
      <div
        ref={layerRef}
        className="absolute top-1/2 left-1/2 w-[118%] -translate-x-1/2 -translate-y-1/2 will-change-transform"
      >
        {layer}
      </div>
      <div className="band-veil pointer-events-none absolute inset-0" />
      <div className="relative z-[3]">{children}</div>
    </div>
  );
}
