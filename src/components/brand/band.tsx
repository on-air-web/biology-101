'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A full-bleed band with parallax.
 *
 * The layer is inset slightly beyond the band on both vertical edges so the
 * parallax has room to travel without exposing a hard edge.
 *
 * The motion is deliberately slight. Heavy parallax reads as a marketing site,
 * and this needs to read as an instrument. Disabled under
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
          element.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
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
      <div ref={layerRef} className="absolute inset-x-0 -inset-y-[12%] will-change-transform">
        {layer}
      </div>
      <div className="band-veil pointer-events-none absolute inset-0" />
      <div className="relative z-[3]">{children}</div>
    </div>
  );
}

/**
 * Photographic band layer.
 *
 * Fitting is art-directed by viewport, because one crop cannot serve both:
 *
 *   Narrow — `contain`. The whole organism stays visible and the surrounding
 *            black merges into the page, since these images are shot on black.
 *            Cropping to fill a tall phone band would cut the specimen in half.
 *   Wide   — `cover`. The band is wider than it is tall, close to the image's
 *            own proportions, so filling it edge to edge costs almost nothing
 *            and avoids the letterboxing that looks broken on a large screen.
 *
 * The earlier version sized the image to 118% of the viewport width regardless
 * of aspect, which on a wide monitor scaled it far past the band height and
 * showed a magnified slice.
 */
export function BandImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain object-center md:object-cover"
    />
  );
}

/** Generated (SVG) band layer. Always fills, nothing to crop badly. */
export function BandGraphic({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center">{children}</div>;
}
