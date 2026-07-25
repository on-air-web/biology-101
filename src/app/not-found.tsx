import Link from 'next/link';
import { routes } from '@/lib/routes';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-display">No such page</h1>
      <p className="mt-3 text-ink-muted">
        This tool does not exist yet, or the address has changed. The catalog lists everything
        currently available.
      </p>
      <Link
        href={routes.catalog()}
        className="mt-6 inline-flex h-11 items-center rounded-lab bg-brand px-4 text-sm font-medium text-brand-ink"
      >
        Browse all tools
      </Link>
    </div>
  );
}
