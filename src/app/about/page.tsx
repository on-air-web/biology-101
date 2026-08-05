import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getLiveTools } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Biology 101 exists, how its calculations are verified, and why nothing you enter ' +
    'is ever uploaded.',
  alternates: { canonical: absoluteUrl(routes.about()) },
};

export default function AboutPage() {
  const live = getLiveTools();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-display">About</h1>

      <div className="mt-6 space-y-5 text-ink-muted">
        <p className="text-lg">
          Biology tools are scattered across hundreds of websites, and a great many of them are
          unsourced. You get a number with no indication of which formula produced it, which model
          it assumed, or whether anyone ever checked it.
        </p>
        <p>
          Biology 101 is an attempt at the opposite. There are {live.length} tools here so far, and
          every one of them shows the expression it evaluated, names the model where more than one
          is accepted, and links to the source that formula comes from. A tool that cannot fill that
          in does not ship.
        </p>
      </div>

      <h2 className="mt-12 text-xl">Nothing you enter is uploaded</h2>
      <div className="mt-3 space-y-4 text-ink-muted">
        <p>
          Every calculation runs locally, on your device. Sequences, constructs and concentrations
          are never uploaded, never logged and never stored on a server — there is no server. The
          site is a set of static files, and the arithmetic happens in the page.
        </p>
        <p>
          This matters most for unpublished work. Pasting a proprietary construct into an unfamiliar
          website is a reasonable thing to be uneasy about, and the honest fix is not a privacy
          policy but an architecture where the data has nowhere to go.
        </p>
      </div>

      <h2 className="mt-12 text-xl">How the numbers are checked</h2>
      <div className="mt-3 space-y-4 text-ink-muted">
        <p>
          Each tool&rsquo;s calculation is tested against reference values — figures from the
          literature, from standards bodies, or from established tools — and those tests run on
          every change. Where a discrepancy is unavoidable, it is stated on the page rather than
          hidden. Molar masses, for instance, follow IUPAC&rsquo;s current abridged atomic weights,
          which can differ from a supplier&rsquo;s catalogue in the last digit.
        </p>
        <p>
          Where the science admits more than one accepted method, the choice is yours and the
          consequence is visible. Melting temperature is the clearest case: basic, salt-adjusted and
          nearest-neighbour models disagree, and a calculator that silently picks one is hiding the
          most important thing about its answer.
        </p>
        <p className="text-ink">
          Results are for planning. Verify anything critical independently — and if you find a
          number that is wrong, please report it. That is the most useful thing anyone can send us.
        </p>
      </div>

      <h2 className="mt-12 text-xl">Open source</h2>
      <div className="mt-3 space-y-4 text-ink-muted">
        <p>
          The site is MIT licensed. Anyone can read the code that produced a result, which is the
          only real way to make &ldquo;shows its work&rdquo; mean something. Third-party code and
          data are credited with their licences in the repository.
        </p>
        {SITE.repoUrl ? (
          <p>
            <a
              href={SITE.repoUrl}
              rel="noreferrer"
              className="text-brand underline decoration-line-strong underline-offset-2"
            >
              Read the source
            </a>
          </p>
        ) : null}
      </div>

      <h2 className="mt-12 text-xl">What&rsquo;s next</h2>
      <div className="mt-3 space-y-4 text-ink-muted">
        <p>
          The catalogue is early. Tools marked as planned are announced rather than built, and they
          are listed openly because a visible gap is more useful than a dead link. Which of them
          gets built next depends largely on what people arrive here looking for.
        </p>
        <p>
          <Link
            href={routes.catalog()}
            className="text-brand underline decoration-line-strong underline-offset-2"
          >
            Browse everything
          </Link>
        </p>
      </div>

      {/*
        The author credit closes the page. It sits after everything else on
        purpose: the argument for the site should stand on its own, and the
        byline is what you read once you have decided you care who made it.
      */}
      <footer className="mt-16 overflow-hidden rounded-lab-lg border border-line-strong bg-surface-raised">
        <div className="p-6 sm:p-8">
          <p className="text-label font-medium tracking-[0.09em] text-gfp-400 uppercase">
            Written and built by
          </p>
          <p className="mt-2 text-[clamp(30px,6vw,44px)] leading-[1.05] font-bold tracking-[-0.03em]">
            {SITE.author.name}
          </p>
          <p className="mt-3.5 text-sm leading-[1.7] text-ink-muted">
            Biology 101 is not backed by an institution or a company, which is why there is no
            sign-up, no tracking and nothing to sell you. It also means the guidance here has been
            written by one person rather than reviewed by a panel — pages carrying advice say
            whether they have been reviewed, and most currently say drafted. Corrections are welcome
            and are the fastest way to make the site better.
          </p>

          {/* Full width on a phone, sized to its label on anything wider. */}
          <a
            href={SITE.author.url}
            rel="noreferrer"
            className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lab bg-gfp-400 px-6 text-[14.5px] font-semibold text-black transition-colors hover:bg-gfp-300 sm:w-auto"
          >
            Visit my website
            <ArrowUpRight
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </a>
        </div>
      </footer>
    </div>
  );
}
