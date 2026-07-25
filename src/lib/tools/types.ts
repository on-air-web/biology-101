/**
 * The tool contract.
 *
 * Every tool in Biology 101 declares itself here. The catalog, global search,
 * command palette, sitemap, page metadata and related-tool links are all
 * *derived* from this data — never hand-maintained per page. Adding a tool
 * should mean adding a folder, not editing eight files.
 */

export const TOOL_CATEGORIES = [
  'lab-calculators',
  'molecular-biology',
  'bioinformatics',
  'protein',
  'cell-biology',
  'statistics',
  'lab-utilities',
] as const;

export type ToolCategoryId = (typeof TOOL_CATEGORIES)[number];

export interface ToolCategory {
  id: ToolCategoryId;
  name: string;
  /** Shown under the category heading in the catalog. Plain language. */
  summary: string;
}

/**
 * A literature reference for a formula, constant or parameter set.
 * Displayed in the UI next to the result — not buried in a footer.
 */
export interface Citation {
  /** What this reference backs up, e.g. "Nearest-neighbour thermodynamic parameters". */
  label: string;
  authors?: string;
  /** Journal, book, database or vendor documentation. */
  source: string;
  year?: number;
  doi?: string;
  url?: string;
}

/**
 * Where several accepted calculation methods exist (Tm, protein concentration,
 * codon usage tables), we expose the choice rather than silently picking one.
 * Hiding the model is how calculators quietly disagree with each other.
 */
export interface ToolModel {
  id: string;
  name: string;
  /** When a user should choose this one, in one sentence. */
  guidance: string;
  citation: Citation;
  isDefault?: boolean;
}

/** Upstream open-source code or data we depend on, with its licence. */
export interface Attribution {
  name: string;
  /** SPDX identifier where one exists, e.g. "MIT", "GPL-3.0-or-later". */
  license: string;
  url: string;
  /** Usage restrictions worth recording, e.g. non-commercial data terms. */
  notes?: string;
}

export type ToolStatus = 'stable' | 'beta' | 'planned';

/**
 * 'client' means the calculation never leaves the browser. This is a privacy
 * guarantee we surface in the UI, so it must be accurate.
 */
export type ComputeLocation = 'client' | 'server';

export interface ToolMeta {
  /** Stable kebab-case slug. This is the URL and must never change once shipped. */
  id: string;
  name: string;
  /** Compact label for dense UI (palette rows, breadcrumbs). Defaults to name. */
  shortName?: string;
  category: ToolCategoryId;
  /** One line. Used on cards, in search results and as the meta description. */
  summary: string;
  /** A paragraph for the tool page and for search engines. */
  description: string;
  /**
   * Search synonyms and the things people actually type: abbreviations, unit
   * names, vendor tool names, common misspellings. The search index is only as
   * good as this list.
   */
  keywords: string[];
  status: ToolStatus;
  computeLocation: ComputeLocation;
  /** At least one required for any tool that computes a scientific result. */
  citations: Citation[];
  models?: ToolModel[];
  /** Cross-links shown at the foot of the tool page. Must resolve to real ids. */
  relatedToolIds?: string[];
  attribution?: Attribution[];
  /** ISO date of the last review of the science, not the last code change. */
  reviewedAt: string;
}
