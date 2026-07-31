import { describe, expect, it } from 'vitest';
import { TOOLS, getBuiltinTools, getRoutableTools, getTool } from './registry';
import { TOOL_EXPLAINERS } from './explainers';
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

  /**
   * The explainer layer is required, for the same reason `useWhen` is required
   * on a curated pick: a tool that cannot say when it is the wrong choice, or
   * show one worked example, is not finished. Making it a build failure is what
   * stops it going the way the task guides did, where the gap quietly widened
   * over five milestones.
   */
  describe('the explainer layer', () => {
    it('covers every built-in tool', () => {
      for (const tool of getBuiltinTools()) {
        expect(TOOL_EXPLAINERS[tool.id], `${tool.id} has no explainer`).toBeDefined();
      }
    });

    it('has no explainer for a tool that does not exist', () => {
      for (const id of Object.keys(TOOL_EXPLAINERS)) {
        expect(getTool(id), `explainer "${id}" matches no tool`).toBeDefined();
      }
    });

    it('says something substantial in each section', () => {
      for (const [id, explainer] of Object.entries(TOOL_EXPLAINERS)) {
        expect(explainer.whenToUse.length, `${id}: whenToUse`).toBeGreaterThan(120);
        expect(explainer.commonMistakes.length, `${id}: commonMistakes`).toBeGreaterThanOrEqual(2);
        expect(explainer.faq.length, `${id}: faq`).toBeGreaterThanOrEqual(3);
        for (const mistake of explainer.commonMistakes) {
          expect(mistake.length, `${id}: a mistake is too short to be useful`).toBeGreaterThan(60);
        }
        for (const entry of explainer.faq) {
          expect(entry.question.trim().endsWith('?'), `${id}: "${entry.question}"`).toBe(true);
          expect(entry.answer.length, `${id}: answer to "${entry.question}"`).toBeGreaterThan(60);
        }
      }
    });

    it('gives every worked example real inputs and a reading', () => {
      for (const [id, explainer] of Object.entries(TOOL_EXPLAINERS)) {
        const { scenario, inputs, result, reading } = explainer.workedExample;
        expect(scenario.length, `${id}: scenario`).toBeGreaterThan(25);
        expect(inputs.length, `${id}: inputs`).toBeGreaterThan(0);
        for (const input of inputs) {
          expect(input.label.length, `${id}: an input has no label`).toBeGreaterThan(0);
          expect(input.value.length, `${id}: ${input.label} has no value`).toBeGreaterThan(0);
        }
        expect(result.length, `${id}: result`).toBeGreaterThan(0);
        // The reading is what makes the number mean something; a bare result
        // repeated back is not one.
        expect(reading.length, `${id}: reading`).toBeGreaterThan(40);
      }
    });
  });
});
