import type { ToolCategoryId } from '../tools/types';

/**
 * Tasks.
 *
 * A tool directory answers "what is X?". A biologist arrives asking "how do I
 * compare two groups?" — and often does not know the name of the thing that
 * would answer them. Tasks are that second index, and they are where the
 * judgement lives: the tools are just the endpoints.
 *
 * Granularity is deliberately broad. "Compare two groups" rather than
 * "Compare two groups with unequal variances and n < 10" — the sub-cases
 * belong inside one good page, not spread across forty thin ones.
 */
export interface Task {
  /** Stable slug. This is the URL. */
  id: string;
  /** Imperative and plain: "Compare two groups". */
  name: string;
  /** The question as someone would actually type it. Drives search. */
  question: string;
  category: ToolCategoryId;
  /** One line for cards and search results. */
  summary: string;
  /**
   * The guidance. What decides the choice, what people get wrong, and what
   * the honest default is. This is the page's reason to exist.
   */
  guidance: string;
  /** Recommended tools, in order. Ids must resolve in the tool registry. */
  toolIds: string[];
  /** Command-line software worth naming here. Ids must resolve. */
  pipelineIds?: string[];
  /** Search synonyms: test names, jargon, abbreviations. */
  keywords: string[];
  /** A caveat worth stating outright, where one exists. */
  caution?: string;
  reviewStatus: 'reviewed' | 'drafted';
  reviewedAt: string;
}
