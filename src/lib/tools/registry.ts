import type { ToolCategoryId, ToolMeta } from './types';
import { molarityMeta } from '@/tools/molarity/meta';
import { reverseComplementMeta } from '@/tools/reverse-complement/meta';
import { gcContentMeta } from '@/tools/gc-content/meta';
import { translateMeta } from '@/tools/translate/meta';
import { molecularWeightMeta } from '@/tools/molecular-weight/meta';
import { dilutionMeta } from '@/tools/dilution/meta';
import { serialDilutionMeta } from '@/tools/serial-dilution/meta';
import { tTestMeta } from '@/tools/t-test/meta';
import { multipleTestingMeta } from '@/tools/multiple-testing/meta';
import { anovaMeta } from '@/tools/anova/meta';
import { correlationMeta } from '@/tools/correlation/meta';
import { contingencyMeta } from '@/tools/contingency/meta';
import { powerMeta } from '@/tools/power/meta';
import { bufferMeta } from '@/tools/buffer/meta';
import { od600Meta } from '@/tools/od600/meta';
import { centrifugeMeta } from '@/tools/centrifuge-rcf-rpm/meta';
import { proteinParametersMeta } from '@/tools/protein-parameters/meta';
import { structureAlignmentMeta } from '@/tools/structure-alignment/meta';
import { meltingTemperatureMeta } from '@/tools/melting-temperature/meta';
import { recipeScalerMeta } from '@/tools/recipe-scaler/meta';
import { nucleicAcidQuantMeta } from '@/tools/nucleic-acid-quant/meta';
import { antibioticStockMeta } from '@/tools/antibiotic-stock/meta';
import { agaroseGelMeta } from '@/tools/agarose-gel/meta';
import { hemocytometerMeta } from '@/tools/hemocytometer/meta';
import { cellSeedingMeta } from '@/tools/cell-seeding/meta';
import { PLANNED_TOOLS } from './planned';
import { EXTERNAL_TOOLS } from './external';
import { STATISTICS_TOOLS } from './statistics-tools';

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
  tTestMeta,
  multipleTestingMeta,
  anovaMeta,
  correlationMeta,
  contingencyMeta,
  powerMeta,
  bufferMeta,
  centrifugeMeta,
  od600Meta,
  proteinParametersMeta,
  structureAlignmentMeta,
  meltingTemperatureMeta,
  recipeScalerMeta,
  nucleicAcidQuantMeta,
  antibioticStockMeta,
  agaroseGelMeta,
  hemocytometerMeta,
  cellSeedingMeta,
  ...EXTERNAL_TOOLS,
  ...STATISTICS_TOOLS,
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

/** Tools that run here, in the browser. */
export function getBuiltinTools(): ToolMeta[] {
  return TOOLS.filter((tool) => tool.kind === 'builtin' && tool.status !== 'planned');
}

/** Curated entries we link to rather than host. */
export function getExternalTools(): ToolMeta[] {
  return TOOLS.filter((tool) => tool.kind === 'external');
}

/** Tools that get their own page. Pipelines are searchable but not routable. */
export function getRoutableTools(): ToolMeta[] {
  return TOOLS.filter((tool) => tool.kind !== 'pipeline' && tool.status !== 'planned');
}

/** Curated picks first, then plain listings, within a set of tools. */
export function byTier(tools: readonly ToolMeta[]): { picks: ToolMeta[]; listed: ToolMeta[] } {
  return {
    picks: tools.filter((tool) => tool.tier === 'pick'),
    listed: tools.filter((tool) => tool.tier === 'listed'),
  };
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
