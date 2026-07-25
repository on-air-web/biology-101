import type { Metadata } from 'next';
import Link from 'next/link';
import { getLiveTools } from '@/lib/tools/registry';
import { absoluteUrl, routes } from '@/lib/routes';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Biology 101 exists, how its calculations are verified, and why nothing you enter ' +
    'leaves your browser.',
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

      <h2 className="mt-12 text-xl">Nothing you enter leaves your browser</h2>
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
    </div>
  );
}
