'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Tool id to interactive component.
 *
 * This map lives in a Client Component on purpose. When a Server Component
 * holds the `next/dynamic` calls, every referenced client component is pulled
 * into the shared route bundle and nothing splits — measured at ~1.3 kB
 * gzipped per tool, which would be ~100 kB by the time the catalogue is full.
 * Declaring the boundary here lets webpack emit one chunk per tool and fetch
 * only the one being viewed.
 */
const TOOL_COMPONENTS: Record<string, ComponentType> = {
  molarity: dynamic(() => import('@/tools/molarity/ui')),
  'molecular-weight': dynamic(() => import('@/tools/molecular-weight/ui')),
  dilution: dynamic(() => import('@/tools/dilution/ui')),
  'serial-dilution': dynamic(() => import('@/tools/serial-dilution/ui')),
  'reverse-complement': dynamic(() => import('@/tools/reverse-complement/ui')),
  'gc-content': dynamic(() => import('@/tools/gc-content/ui')),
  translate: dynamic(() => import('@/tools/translate/ui')),
  't-test': dynamic(() => import('@/tools/t-test/ui')),
  'multiple-testing': dynamic(() => import('@/tools/multiple-testing/ui')),
  anova: dynamic(() => import('@/tools/anova/ui')),
  correlation: dynamic(() => import('@/tools/correlation/ui')),
  contingency: dynamic(() => import('@/tools/contingency/ui')),
  power: dynamic(() => import('@/tools/power/ui')),
  'buffer-preparation': dynamic(() => import('@/tools/buffer/ui')),
  'centrifuge-rcf-rpm': dynamic(() => import('@/tools/centrifuge-rcf-rpm/ui')),
  od600: dynamic(() => import('@/tools/od600/ui')),
};

export function ToolBody({ toolId }: { toolId: string }) {
  const Component = TOOL_COMPONENTS[toolId];

  if (!Component) {
    return (
      <p className="rounded-lab-lg border border-line bg-surface-sunken p-6 text-ink-muted">
        This tool is registered but its calculator is not built yet.
      </p>
    );
  }

  return <Component />;
}
