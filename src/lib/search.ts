import type { ToolMeta } from './tools/types';

/**
 * Search.
 *
 * Deliberately hand-rolled rather than pulling in a fuzzy-search library. The
 * corpus is small, entirely known at build time, and the ranking rules are
 * domain-specific: someone typing "mw" wants molecular weight, and someone
 * typing "tm" wants melting temperature. A generic edit-distance matcher gets
 * both of those wrong, and it costs ~15 kB to do so.
 *
 * Fuzzy matching is intentionally absent. In a scientific tool "dilution" and
 * "dilation" are different words, and silently treating them as neighbours is
 * worse than returning nothing.
 */

export interface SearchResult {
  tool: ToolMeta;
  score: number;
}

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  const normalized = normalize(input);
  return normalized === '' ? [] : normalized.split(' ');
}

/** Best score any single field achieves for one query term. */
function scoreTerm(tool: ToolMeta, term: string): number {
  const name = normalize(tool.name);
  const nameWords = name.split(' ');

  if (name === term) return 120;
  if (name.startsWith(term)) return 70;
  if (nameWords.some((word) => word.startsWith(term))) return 55;

  let best = 0;

  for (const keyword of tool.keywords) {
    const normalized = normalize(keyword);
    if (normalized === term) {
      best = Math.max(best, 60);
    } else if (normalized.startsWith(term)) {
      best = Math.max(best, 35);
    } else if (normalized.includes(term)) {
      best = Math.max(best, 18);
    }
  }

  // People search by who runs a tool: "ebi", "ncbi", "neb", "deepmind".
  if (tool.external) {
    const provider = normalize(tool.external.provider);
    if (provider === term) best = Math.max(best, 58);
    // Prefix matching on one or two characters is noise — "pi" would otherwise
    // match the PIR in UniProt's provider list and outrank the isoelectric
    // point calculator. Exact matches are still honoured at any length.
    else if (term.length >= 3 && provider.split(' ').some((word) => word.startsWith(term)))
      best = Math.max(best, 40);
  }

  if (name.includes(term)) best = Math.max(best, 30);
  if (normalize(tool.summary).includes(term)) best = Math.max(best, 12);

  return best;
}

/**
 * Ranks tools against a query. Every term must match something — an extra word
 * should narrow a search, never widen it.
 */
export function searchTools(tools: readonly ToolMeta[], query: string): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const tool of tools) {
    let total = 0;
    let matchedEveryTerm = true;

    for (const term of terms) {
      const score = scoreTerm(tool, term);
      if (score === 0) {
        matchedEveryTerm = false;
        break;
      }
      total += score;
    }

    if (!matchedEveryTerm) continue;

    // A tool you can actually use outranks one that is merely announced — but
    // proportionally, not by a flat penalty. A flat subtraction let a weak
    // prefix match on a live tool overtake an exact keyword match on a planned
    // one, which puts the wrong answer first for queries like "pi".
    if (tool.status === 'planned') total *= 0.7;
    // Prefer the more specific of two similar matches.
    total -= Math.min(tool.name.length / 10, 4);

    results.push({ tool, score: total });
  }

  return results.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
}
