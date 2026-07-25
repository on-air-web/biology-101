import { describe, expect, it } from 'vitest';
import {
  EMPTY_PREFERENCES,
  type Preferences,
  isFavourite,
  parsePreferences,
  pruneToKnownTools,
  recordVisit,
  toggleFavourite,
} from './preferences';

describe('parsePreferences', () => {
  it('returns empty preferences for missing or corrupt data', () => {
    expect(parsePreferences(null)).toEqual(EMPTY_PREFERENCES);
    expect(parsePreferences('not json')).toEqual(EMPTY_PREFERENCES);
    expect(parsePreferences('[]')).toEqual(EMPTY_PREFERENCES);
  });

  it('discards data from an unknown schema version', () => {
    const stored = JSON.stringify({ version: 99, favourites: ['molarity'], recents: [] });
    expect(parsePreferences(stored).favourites).toEqual([]);
  });

  it('drops malformed entries rather than trusting them', () => {
    const stored = JSON.stringify({
      version: 1,
      favourites: ['molarity', 42, null],
      recents: [{ toolId: 'translate', at: 5 }, { toolId: 'broken' }, 'nope'],
    });
    const parsed = parsePreferences(stored);
    expect(parsed.favourites).toEqual(['molarity']);
    expect(parsed.recents).toEqual([{ toolId: 'translate', at: 5 }]);
  });
});

describe('favourites', () => {
  it('toggles on and off', () => {
    const once = toggleFavourite(EMPTY_PREFERENCES, 'molarity');
    expect(isFavourite(once, 'molarity')).toBe(true);
    expect(isFavourite(toggleFavourite(once, 'molarity'), 'molarity')).toBe(false);
  });

  it('does not mutate the input', () => {
    toggleFavourite(EMPTY_PREFERENCES, 'molarity');
    expect(EMPTY_PREFERENCES.favourites).toEqual([]);
  });
});

describe('recordVisit', () => {
  it('moves the most recent tool to the front without duplicating it', () => {
    let preferences: Preferences = EMPTY_PREFERENCES;
    preferences = recordVisit(preferences, 'molarity', 1);
    preferences = recordVisit(preferences, 'translate', 2);
    preferences = recordVisit(preferences, 'molarity', 3);

    expect(preferences.recents.map((entry) => entry.toolId)).toEqual(['molarity', 'translate']);
    expect(preferences.recents[0]?.at).toBe(3);
  });

  it('caps the list', () => {
    let preferences: Preferences = EMPTY_PREFERENCES;
    for (let index = 0; index < 20; index += 1) {
      preferences = recordVisit(preferences, `tool-${index}`, index);
    }
    expect(preferences.recents).toHaveLength(8);
    expect(preferences.recents[0]?.toolId).toBe('tool-19');
  });
});

describe('pruneToKnownTools', () => {
  it('removes references to tools that no longer exist', () => {
    const preferences: Preferences = {
      version: 1,
      favourites: ['molarity', 'withdrawn'],
      recents: [
        { toolId: 'withdrawn', at: 2 },
        { toolId: 'translate', at: 1 },
      ],
    };
    const pruned = pruneToKnownTools(preferences, new Set(['molarity', 'translate']));
    expect(pruned.favourites).toEqual(['molarity']);
    expect(pruned.recents.map((entry) => entry.toolId)).toEqual(['translate']);
  });
});
