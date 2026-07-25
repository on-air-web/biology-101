'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_PREFERENCES,
  PREFERENCES_KEY,
  type Preferences,
  isFavourite as isFavouriteIn,
  pruneToKnownTools,
  readPreferences,
  recordVisit as recordVisitIn,
  toggleFavourite as toggleFavouriteIn,
  writePreferences,
} from '@/lib/preferences';
import { TOOLS } from '@/lib/tools/registry';

const KNOWN_IDS = new Set(TOOLS.map((tool) => tool.id));

/**
 * Preferences with hydration safety.
 *
 * Pages are prerendered at build time with no knowledge of any user, so the
 * first client render must match that empty HTML exactly. `ready` stays false
 * until the stored values are loaded, and callers render nothing personal
 * before then.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(EMPTY_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = pruneToKnownTools(readPreferences(window.localStorage), KNOWN_IDS);
    setPreferences(loaded);
    setReady(true);

    // Keep tabs in step: starring a tool in one window should not be silently
    // undone by a stale write from another.
    function onStorage(event: StorageEvent) {
      if (event.key !== PREFERENCES_KEY) return;
      setPreferences(pruneToKnownTools(readPreferences(window.localStorage), KNOWN_IDS));
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((next: (current: Preferences) => Preferences) => {
    setPreferences((current) => {
      const updated = next(current);
      writePreferences(window.localStorage, updated);
      return updated;
    });
  }, []);

  const toggleFavourite = useCallback(
    (toolId: string) => update((current) => toggleFavouriteIn(current, toolId)),
    [update],
  );

  const recordVisit = useCallback(
    (toolId: string) => update((current) => recordVisitIn(current, toolId)),
    [update],
  );

  const isFavourite = useCallback(
    (toolId: string) => isFavouriteIn(preferences, toolId),
    [preferences],
  );

  return { preferences, ready, toggleFavourite, recordVisit, isFavourite };
}
