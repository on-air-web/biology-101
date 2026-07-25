import type { Metadata } from 'next';
import { ALL_IMAGES, allImagesCommercialSafe } from '@/lib/images';
import { absoluteUrl, routes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Image credits',
  description: 'Creators, sources and licensing for every photographic image used on Biology 101.',
  alternates: { canonical: absoluteUrl(routes.credits()) },
};

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-11">
      <h1 className="text-[clamp(24px,5vw,32px)] font-bold tracking-[-0.03em]">Image credits</h1>
      <p className="mt-3 text-[14px] text-ink-muted">
        Photographic images are credited here in the same spirit as the citations under every
        calculation: if we can&rsquo;t say where it came from and what we&rsquo;re permitted to do
        with it, it doesn&rsquo;t ship. Banners that are generated rather than photographed are
        noted at the bottom and need no credit.
      </p>

      <ul className="mt-7 space-y-4">
        {ALL_IMAGES.map((image) => (
          <li key={image.id} className="rounded-lab-lg border border-line bg-surface p-4">
            <p className="text-[13.5px] leading-[1.5] font-semibold">{image.caption}</p>
            <dl className="mt-3 grid grid-cols-[76px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
              <dt className="text-ink-faint">Creator</dt>
              <dd>{image.creator}</dd>
              <dt className="text-ink-faint">Collection</dt>
              <dd>
                <a
                  href={image.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link-400 underline underline-offset-2"
                >
                  {image.collection}
                </a>
              </dd>
              <dt className="text-ink-faint">Licence</dt>
              <dd>
                <a
                  href={image.licenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link-400 underline underline-offset-2"
                >
                  {image.licence}
                </a>
                {image.commercialUse ? null : (
                  <span className="text-ink-faint"> · non-commercial use only</span>
                )}
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      {allImagesCommercialSafe() ? null : (
        <p className="mt-6 rounded-lab border border-amber-700 bg-amber-700/10 p-3.5 text-[12.5px] text-ink-muted">
          These images are licensed for non-commercial use and carry a ShareAlike condition. That
          suits Biology 101 as it stands — free, with no advertising — but it would need revisiting
          before any paid tier or sponsorship.
        </p>
      )}

      <p className="mt-6 text-[12.5px] text-ink-faint">
        The laboratory calculators banner is generated procedurally from a fixed seed. It is not a
        photograph and depicts no particular molecule.
      </p>
    </div>
  );
}
