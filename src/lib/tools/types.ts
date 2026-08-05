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
  'imaging',
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
 * A worked example: real numbers going in, a real answer coming out.
 *
 * The single most useful thing on a tool page after the tool itself. Someone
 * who is unsure whether they are holding the right problem can check their
 * situation against a concrete one in a few seconds, which no amount of prose
 * about the formula achieves.
 */
export interface WorkedExample {
  /** The situation, in the words someone would use at the bench. */
  scenario: string;
  /** What goes in the fields. */
  inputs: { label: string; value: string }[];
  /** What comes out. */
  result: string;
  /** The one line of interpretation that makes the number mean something. */
  reading: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * The teaching layer on a tool page.
 *
 * A calculator answers the question you knew how to ask. This is for the far
 * more common case: knowing roughly what you need and not being certain this
 * is the right tool, or what the answer implies. Required on every built-in
 * tool — `registry.test.ts` fails the build without it, for the same reason
 * `useWhen` is required on a curated pick. A tool that cannot explain when it
 * is the wrong choice is not finished.
 */
export interface ToolExplainer {
  /** When this is the right tool, and when it is not. Two or three sentences. */
  whenToUse: string;
  workedExample: WorkedExample;
  /** What people actually get wrong. Usually the most useful section. */
  commonMistakes: string[];
  faq: FaqEntry[];
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

/**
 * How much friction stands between a user and actually running the tool. This
 * is the single most useful thing to know before clicking through, and almost
 * nobody publishes it.
 */
export type AccessModel =
  'free' | 'free-registration' | 'academic-only' | 'freemium' | 'paid' | 'install';

export const ACCESS_LABELS: Record<AccessModel, string> = {
  free: 'Free',
  'free-registration': 'Sign-in',
  'academic-only': 'Academic only',
  freemium: 'Free tier',
  paid: 'Paid',
  install: 'Desktop install',
};

/** A tool we point to rather than host. */
export interface ExternalInfo {
  /** Who runs it — EMBL-EBI, NCBI, DeepMind, a named lab. */
  provider: string;
  url: string;
  access: AccessModel;
  /** Licensing or usage restriction that would change someone's decision. */
  licenseNote?: string;
  /**
   * The reason this entry exists. Says when this is the right choice and,
   * where relevant, when it is not. Required — an external entry without
   * judgement is just a bookmark.
   */
  useWhen: string;
  /** Practical limits: sequence length, job quota, file size. */
  inputNote?: string;
}

/** Where a pipeline tool is documented, since it has no page of its own. */
export interface PipelineInfo {
  provider: string;
  url: string;
  /** Language or environment: R package, Python, C++ binary, Nextflow. */
  environment: string;
}

/**
 * How a tool reaches the user.
 *
 *   builtin  — runs here, in the browser
 *   external — a site we link to, with its own page
 *   pipeline — command-line or cluster software (GATK, GROMACS, Salmon).
 *              Searchable so the name resolves, but generates no page: nobody
 *              "opens" these, and a stub page nobody can act on is worse than
 *              being named in context inside a task guide.
 */
export type ToolKind = 'builtin' | 'external' | 'pipeline';

/**
 * Curated pick, or simply listed.
 *
 * A pick carries real judgement and must fill in `useWhen` — the build fails
 * without it. A listed entry needs only a description. This is what lets the
 * catalogue be both opinionated and reasonably complete: recommendations stay
 * expensive, coverage stays cheap, and an entry is promoted the day someone
 * has an actual opinion about it.
 */
export type ToolTier = 'pick' | 'listed';

/**
 * Whether a human with relevant expertise has checked the guidance.
 *
 * Drafted entries are shown as such rather than quietly presented as
 * authoritative. Neither of us should be writing confident advice about
 * clinical variant interpretation without saying who checked it.
 */
export type ReviewStatus = 'reviewed' | 'drafted';

export type ToolStatus = 'stable' | 'beta' | 'planned';

/**
 * 'client' means the calculation happens on the user's own device and the
 * inputs are never sent anywhere.
 *
 * No longer rendered — the badge and the Ladder line that carried it were
 * removed. Kept because it is a true and useful property of a tool, and
 * because external and pipeline entries legitimately differ; drop it if
 * nothing has read it by the next consolidation pass.
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
  /**
   * A paragraph for the meta description and the catalogue card. Built-in
   * tools do not print it in the page body — the explainer's `whenToUse`
   * covers the same ground and reads better in place.
   */
  description: string;
  /**
   * Search synonyms and the things people actually type: abbreviations, unit
   * names, vendor tool names, common misspellings. The search index is only as
   * good as this list.
   */
  keywords: string[];
  kind: ToolKind;
  /** Curated pick or plain listing. Built-in tools are always picks. */
  tier: ToolTier;
  /** Defaults to 'drafted' where absent. */
  reviewStatus?: ReviewStatus;
  /** Present exactly when kind is 'external'. */
  external?: ExternalInfo;
  /** Present exactly when kind is 'pipeline'. */
  pipeline?: PipelineInfo;
  /** Tasks this tool is an answer to. */
  taskIds?: string[];
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
