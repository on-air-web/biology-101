/**
 * Preferences.
 *
 * Local only. There are no accounts, so this is the whole of the personal
 * layer: which tools someone starred and which they used recently. That is a
 * deliberate limit — favourites are worth remembering, and nothing here is
 * worth asking someone to create an account for.
 *
 * The data functions are pure and take the current state as an argument, so
 * they can be tested without a browser. Only `readPreferences` and
 * `writePreferences` touch storage.
 */

export const PREFERENCES_KEY = 'b101-preferences';
const CURRENT_VERSION = 1;
const MAX_RECENTS = 8;

export interface RecentEntry {
  toolId: string;
  /** Epoch milliseconds of the most recent visit. */
  at: number;
}

export interface Preferences {
  version: number;
  favourites: string[];
  recents: RecentEntry[];
}

export const EMPTY_PREFERENCES: Preferences = {
  version: CURRENT_VERSION,
  favourites: [],
  recents: [],
};

/** Minimal surface of the Storage API, so tests can pass a plain object. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads and validates stored preferences.
 *
 * Anything unrecognised is discarded rather than repaired. This data is
 * convenience only, so a corrupt blob should cost the user their favourites,
 * never a crash on a page they came to for a calculation.
 */
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return EMPTY_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_PREFERENCES;

    const candidate = parsed as Partial<Preferences>;
    if (candidate.version !== CURRENT_VERSION) return EMPTY_PREFERENCES;

    const favourites = Array.isArray(candidate.favourites)
      ? candidate.favourites.filter((id): id is string => typeof id === 'string')
      : [];

    const recents = Array.isArray(candidate.recents)
      ? candidate.recents.filter(
          (entry): entry is RecentEntry =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as RecentEntry).toolId === 'string' &&
            typeof (entry as RecentEntry).at === 'number',
        )
      : [];

    return { version: CURRENT_VERSION, favourites, recents };
  } catch {
    return EMPTY_PREFERENCES;
  }
}

export function readPreferences(storage: StorageLike): Preferences {
  return parsePreferences(storage.getItem(PREFERENCES_KEY));
}

export function writePreferences(storage: StorageLike, preferences: Preferences): void {
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing, or the quota is full. Preferences are a convenience;
    // failing to save one must never interrupt what the user was doing.
  }
}

export function isFavourite(preferences: Preferences, toolId: string): boolean {
  return preferences.favourites.includes(toolId);
}

export function toggleFavourite(preferences: Preferences, toolId: string): Preferences {
  const favourites = isFavourite(preferences, toolId)
    ? preferences.favourites.filter((id) => id !== toolId)
    : [...preferences.favourites, toolId];
  return { ...preferences, favourites };
}

/** Records a visit, moving the tool to the front and de-duplicating. */
export function recordVisit(
  preferences: Preferences,
  toolId: string,
  now: number = Date.now(),
): Preferences {
  const others = preferences.recents.filter((entry) => entry.toolId !== toolId);
  return {
    ...preferences,
    recents: [{ toolId, at: now }, ...others].slice(0, MAX_RECENTS),
  };
}

/**
 * Drops entries whose tool no longer exists. Ids are permanent once shipped,
 * but a tool can still be withdrawn, and a stale favourite must not become a
 * broken link.
 */
export function pruneToKnownTools(preferences: Preferences, knownIds: Set<string>): Preferences {
  return {
    ...preferences,
    favourites: preferences.favourites.filter((id) => knownIds.has(id)),
    recents: preferences.recents.filter((entry) => knownIds.has(entry.toolId)),
  };
}
