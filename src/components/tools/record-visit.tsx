'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/hooks/use-preferences';

/**
 * Records that a tool page was opened. Renders nothing.
 *
 * Deliberately not a page-view metric: it exists so someone can get back to
 * the four tools they actually use, and it never leaves the device.
 */
export function RecordVisit({ toolId }: { toolId: string }) {
  const { ready, recordVisit } = usePreferences();

  useEffect(() => {
    if (!ready) return;
    recordVisit(toolId);
    // Recording once per mount is the intent; recordVisit changes identity on
    // every preferences update, which would otherwise loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, toolId]);

  return null;
}
