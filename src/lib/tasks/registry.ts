import type { Task } from './types';
import { STATISTICS_TASKS } from './statistics';

/** Every task, across every domain. One file per domain feeds this. */
export const TASKS: readonly Task[] = [...STATISTICS_TASKS];

const BY_ID = new Map(TASKS.map((task) => [task.id, task]));

export function getTask(id: string): Task | undefined {
  return BY_ID.get(id);
}

export function getTasksByCategory(categoryId: string): Task[] {
  return TASKS.filter((task) => task.category === categoryId);
}

/** Tasks a given tool is an answer to. */
export function getTasksForTool(toolId: string): Task[] {
  return TASKS.filter(
    (task) => task.toolIds.includes(toolId) || (task.pipelineIds ?? []).includes(toolId),
  );
}
