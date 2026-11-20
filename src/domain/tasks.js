// Pure task operations. No React, no storage: every function takes the current
// list of tasks and returns a new one, so it is easy to test and reason about.

export const MAX_TITLE_LENGTH = 200;

export const FILTERS = ['all', 'active', 'completed'];

/**
 * Checks a title typed by the user.
 * @returns {{ ok: true, title: string } | { ok: false, error: 'empty' | 'too-long' }}
 */
export function validateTitle(rawTitle) {
  const title = String(rawTitle ?? '').trim();
  if (title.length === 0) return { ok: false, error: 'empty' };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: 'too-long' };
  return { ok: true, title };
}

/** Builds a new active task. Expects a title that already passed validateTitle. */
export function createTask(title, { now = new Date(), id = crypto.randomUUID() } = {}) {
  return {
    id,
    title,
    completed: false,
    createdAt: now.toISOString(),
    completedAt: null,
  };
}

export function addTask(tasks, title, options) {
  return [...tasks, createTask(title, options)];
}

export function renameTask(tasks, id, title) {
  return tasks.map((task) => (task.id === id ? { ...task, title } : task));
}

function setCompleted(task, completed, now) {
  if (task.completed === completed) return task;
  return {
    ...task,
    completed,
    completedAt: completed ? now.toISOString() : null,
  };
}

export function toggleTask(tasks, id, now = new Date()) {
  return tasks.map((task) => (task.id === id ? setCompleted(task, !task.completed, now) : task));
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

/** If any task is active, completes all of them; otherwise makes all of them active again. */
export function toggleAll(tasks, now = new Date()) {
  const completeAll = tasks.some((task) => !task.completed);
  return tasks.map((task) => setCompleted(task, completeAll, now));
}

export function clearCompleted(tasks) {
  return tasks.filter((task) => !task.completed);
}

/**
 * Display order (never stored): active tasks newest-created first,
 * then completed tasks most-recently-completed first.
 */
export function sortTasks(tasks) {
  const newestFirst = (a, b) => b.localeCompare(a);
  const active = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => newestFirst(a.createdAt, b.createdAt));
  const completed = tasks
    .filter((task) => task.completed)
    .sort(
      (a, b) => newestFirst(a.completedAt, b.completedAt) || newestFirst(a.createdAt, b.createdAt),
    );
  return [...active, ...completed];
}

export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return tasks;
}

export function countActive(tasks) {
  return tasks.filter((task) => !task.completed).length;
}

/** True if a value read from storage has the shape of a Task. */
export function isTask(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.completed === 'boolean' &&
    typeof value.createdAt === 'string' &&
    (value.completedAt === null || typeof value.completedAt === 'string')
  );
}
