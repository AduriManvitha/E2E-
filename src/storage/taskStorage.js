// The ONLY module that touches localStorage. Neither function ever throws:
// problems are reported as error codes so the UI can show a warning.

import { isTask } from '../domain/tasks.js';

export const STORAGE_KEY = 'todo-app.tasks.v1';

/** @returns {{ tasks: object[], error: null | 'corrupted' | 'unavailable' }} */
export function loadTasks(storage = globalThis.localStorage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { tasks: [], error: 'unavailable' };
  }

  if (raw === null) return { tasks: [], error: null };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isTask)) {
      return { tasks: [], error: 'corrupted' };
    }
    return { tasks: parsed, error: null };
  } catch {
    return { tasks: [], error: 'corrupted' };
  }
}

/** @returns {{ ok: boolean, error: null | 'unavailable' }} */
export function saveTasks(tasks, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
