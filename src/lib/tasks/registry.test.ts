import { describe, expect, it } from 'vitest';
import { TASKS, getTask } from './registry';
import { TOOLS, getTool } from '../tools/registry';
import { TOOL_CATEGORIES } from '../tools/types';

describe('task registry', () => {
  it('has unique, url-safe ids', () => {
    const ids = TASKS.map((task) => task.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('assigns every task to a known category', () => {
    for (const task of TASKS) expect(TOOL_CATEGORIES).toContain(task.category);
  });

  it('resolves every referenced tool', () => {
    for (const task of TASKS) {
      for (const id of task.toolIds) {
        expect(getTool(id), `${task.id} references missing tool ${id}`).toBeDefined();
      }
    }
  });

  it('lists only pipeline tools under pipelineIds', () => {
    for (const task of TASKS) {
      for (const id of task.pipelineIds ?? []) {
        const tool = getTool(id);
        expect(tool, `${task.id} references missing pipeline ${id}`).toBeDefined();
        expect(tool?.kind, `${id} is listed as a pipeline but is not one`).toBe('pipeline');
      }
    }
  });

  it('carries guidance substantial enough to be worth a page', () => {
    for (const task of TASKS) {
      expect(task.guidance.length, `${task.id} guidance is too thin`).toBeGreaterThan(200);
      expect(task.question.length, `${task.id} has no question`).toBeGreaterThan(10);
      expect(task.keywords.length, `${task.id} has no keywords`).toBeGreaterThan(2);
    }
  });

  it('recommends at least one tool per task', () => {
    for (const task of TASKS) {
      expect(task.toolIds.length, `${task.id} recommends nothing`).toBeGreaterThan(0);
    }
  });

  it('is reachable from the tools it recommends', () => {
    // Every task must name tools that exist in the registry, so a reader can
    // always get from guidance to something they can open.
    const ids = new Set(TOOLS.map((tool) => tool.id));
    for (const task of TASKS) {
      expect(
        task.toolIds.every((id) => ids.has(id)),
        task.id,
      ).toBe(true);
    }
    expect(getTask('compare-two-groups')).toBeDefined();
  });
});
