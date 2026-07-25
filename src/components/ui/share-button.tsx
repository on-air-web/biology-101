'use client';

import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { ShareError, buildShareUrl, type ShareValue } from '@/lib/share';

/**
 * Copies a link that reproduces the current result.
 *
 * Nothing is written to the address bar until this is pressed. Auto-syncing
 * inputs to the URL would put every dataset into browser history, which can
 * sync to a signed-in account — and quietly break the promise made on every
 * tool page.
 */
export function ShareButton({ state }: { state: Record<string, ShareValue | undefined> }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    try {
      const base = `${window.location.origin}${window.location.pathname}`;
      const url = buildShareUrl(base, state);
      await navigator.clipboard.writeText(url);
      // Reflect it in the address bar too, now that sharing is deliberate.
      window.history.replaceState(null, '', url);
      setError(undefined);
      setCopied(true);
    } catch (caught) {
      setError(
        caught instanceof ShareError ? caught.message : 'Could not copy. Check clipboard access.',
      );
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={share}
        className="inline-flex h-8 items-center gap-1.5 rounded-lab border border-line-strong px-3 text-[12.5px] text-ink-muted hover:text-ink"
      >
        {copied ? (
          <Check className="size-3.5 text-gfp-400" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {copied ? 'Link copied' : 'Copy link to this result'}
      </button>
      {error ? <p className="mt-1.5 text-[12px] text-signal-error">{error}</p> : null}
      {copied ? (
        <p className="mt-1.5 text-[12px] text-ink-faint">
          The link contains your numbers. It stays private until you send it to someone.
        </p>
      ) : null}
    </div>
  );
}
