import { describe, expect, it } from 'vitest';
import { TOOLS, getRoutableTools, getTool } from './registry';
import { TOOL_CATEGORIES } from './types';
import { CATEGORIES } from './categories';

/**
 * These tests are the enforcement mechanism for the project's standards.
 * A tool that is uncited, mis-slugged or cross-linked to nothing fails CI
 * rather than quietly shipping.
 */
describe('tool registry', () => {
  it('has unique ids', () => {
    const ids = TOOLS.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses url-safe kebab-case ids', () => {
    for (const tool of TOOLS) {
      expect(tool.id, `${tool.id} is not kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('assigns every tool to a known category', () => {
    for (const tool of TOOLS) {
      expect(TOOL_CATEGORIES).toContain(tool.category);
    }
  });

  it('defines every category exactly once', () => {
    expect(CATEGORIES.map((c) => c.id).sort()).toEqual([...TOOL_CATEGORIES].sort());
  });

  it('cites a source for every shipped tool', () => {
    for (const tool of TOOLS) {
      if (tool.status === 'planned') continue;
      expect(tool.citations.length, `${tool.id} has no citation`).toBeGreaterThan(0);
    }
  });

  it('gives every citation a resolvable reference', () => {
    for (const tool of TOOLS) {
      for (const citation of tool.citations) {
        expect(
          Boolean(citation.doi ?? citation.url),
          `${tool.id}: citation "${citation.label}" has neither DOI nor URL`,
        ).toBe(true);
      }
    }
  });

  it('marks exactly one default when a tool offers multiple models', () => {
    for (const tool of TOOLS) {
      if (!tool.models?.length) continue;
      const defaults = tool.models.filter((model) => model.isDefault);
      expect(defaults.length, `${tool.id} must have exactly one default model`).toBe(1);
    }
  });

  it('resolves every related tool id', () => {
    for (const tool of TOOLS) {
      for (const relatedId of tool.relatedToolIds ?? []) {
        expect(getTool(relatedId), `${tool.id} links to missing tool ${relatedId}`).toBeDefined();
      }
    }
  });

  it('requires every external tool to identify its provider and URL', () => {
    for (const tool of TOOLS) {
      if (tool.kind !== 'external') continue;
      expect(tool.external, `${tool.id} is external but has no external block`).toBeDefined();
      expect(tool.external?.url, `${tool.id} has no URL`).toMatch(/^https:\/\//);
      expect(tool.external?.provider.length, `${tool.id} has no provider`).toBeGreaterThan(1);
    }
  });

  it('requires curated picks to carry judgement, not just a link', () => {
    for (const tool of TOOLS) {
      // A pick is a recommendation, and a recommendation with no reason is a
      // bookmark. Listed entries are exempt: they exist for coverage.
      if (tool.kind !== 'external' || tool.tier !== 'pick') continue;
      expect(
        tool.external?.useWhen.length,
        `${tool.id} is a pick but has no "use when" guidance`,
      ).toBeGreaterThan(40);
    }
  });

  it('keeps pipeline tools out of the routed set', () => {
    const routable = new Set(getRoutableTools().map((tool) => tool.id));
    for (const tool of TOOLS) {
      if (tool.kind !== 'pipeline') continue;
      expect(tool.pipeline, `${tool.id} is a pipeline but has no pipeline block`).toBeDefined();
      expect(routable.has(tool.id), `${tool.id} is a pipeline and must not be routable`).toBe(
        false,
      );
    }
  });

  it('does not attach external metadata to built-in tools', () => {
    for (const tool of TOOLS) {
      if (tool.kind === 'builtin') expect(tool.external, tool.id).toBeUndefined();
    }
  });

  it('gives every tool searchable keywords and a summary', () => {
    for (const tool of TOOLS) {
      expect(tool.keywords.length, `${tool.id} has no keywords`).toBeGreaterThan(0);
      expect(tool.summary.length, `${tool.id} summary is too short`).toBeGreaterThan(10);
    }
  });
});
