import type { ToolCategoryId, ToolMeta } from './types';
import { molarityMeta } from '@/tools/molarity/meta';
import { reverseComplementMeta } from '@/tools/reverse-complement/meta';
import { gcContentMeta } from '@/tools/gc-content/meta';
import { translateMeta } from '@/tools/translate/meta';
import { molecularWeightMeta } from '@/tools/molecular-weight/meta';
import { dilutionMeta } from '@/tools/dilution/meta';
import { serialDilutionMeta } from '@/tools/serial-dilution/meta';
import { PLANNED_TOOLS } from './planned';

/**
 * The single source of truth for which tools exist.
 * Adding a tool = create src/tools/<id>/ and add one line here.
 */
export const TOOLS: readonly ToolMeta[] = [
  molarityMeta,
  molecularWeightMeta,
  dilutionMeta,
  serialDilutionMeta,
  reverseComplementMeta,
  gcContentMeta,
  translateMeta,
  ...PLANNED_TOOLS,
];

const BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]));

export function getTool(id: string): ToolMeta | undefined {
  return BY_ID.get(id);
}

/** Tools users can actually open. Planned tools appear in the catalog only. */
export function getLiveTools(): ToolMeta[] {
  return TOOLS.filter((tool) => tool.status !== 'planned');
}

export function getToolsByCategory(category: ToolCategoryId): ToolMeta[] {
  return TOOLS.filter((tool) => tool.category === category);
}

/** Flat text blob per tool, used to build the client-side search index. */
export function getSearchDocuments(): { id: string; text: string }[] {
  return TOOLS.map((tool) => ({
    id: tool.id,
    text: [tool.name, tool.shortName, tool.summary, ...tool.keywords]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }));
}
