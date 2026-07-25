/**
 * Shareable results.
 *
 * A tool's inputs can be encoded into its URL, so a link reproduces a result
 * exactly — for a supervisor, a methods section, or your own notes.
 *
 * The important design decision: the URL is **never written automatically**.
 * Inbound links are read on load, but the address bar only changes when
 * someone deliberately asks for a link. Auto-syncing state to the URL would
 * push every keystroke of a dataset into browser history, which may then sync
 * to a signed-in account — quietly contradicting the promise that nothing you
 * type leaves your machine. Explicit sharing keeps that promise honest: the
 * data goes somewhere only when you decide it should.
 */

export class ShareError extends Error {}

/** Values a tool can round-trip through a URL. */
export type ShareValue = string | number | readonly number[];

const LIST_SEPARATOR = ',';
const MAX_URL_LENGTH = 8000;

export function encodeShareState(state: Record<string, ShareValue | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(state)) {
    if (value === undefined) continue;
    // Checked by typeof rather than Array.isArray, which does not narrow a
    // readonly array out of the union.
    if (typeof value === 'number') {
      params.set(key, String(Number(value.toPrecision(10))));
    } else if (typeof value === 'string') {
      if (value !== '') params.set(key, value);
    } else {
      if (value.length === 0) continue;
      // Trim to a sane precision: full float noise triples the URL length for
      // digits nobody is reading.
      params.set(key, value.map((entry) => Number(entry.toPrecision(10))).join(LIST_SEPARATOR));
    }
  }

  return params.toString();
}

export function decodeNumberList(params: URLSearchParams, key: string): number[] | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;

  const values = raw
    .split(LIST_SEPARATOR)
    .map((token) => token.trim())
    .filter((token) => token !== '')
    .map(Number);

  return values.every((value) => Number.isFinite(value)) ? values : undefined;
}

export function decodeString(
  params: URLSearchParams,
  key: string,
  allowed?: readonly string[],
): string | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  if (allowed && !allowed.includes(raw)) return undefined;
  return raw;
}

/**
 * Builds the shareable link, or explains why it cannot.
 *
 * Browsers and servers stop honouring very long URLs, and a link that silently
 * truncates a dataset would reproduce the wrong result — worse than no link.
 */
export function buildShareUrl(base: string, state: Record<string, ShareValue | undefined>): string {
  const query = encodeShareState(state);
  const url = query === '' ? base : `${base}?${query}`;

  if (url.length > MAX_URL_LENGTH) {
    throw new ShareError(
      'This dataset is too large to put in a link. Share the file instead — a truncated link would reproduce the wrong numbers.',
    );
  }

  return url;
}
