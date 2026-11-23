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
    timeSpentSeconds: 0,
    timerStartedAt: null,
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
  // Completing a task stops its timer so the running time is not lost.
  const base = completed ? stopTimerOn(task, now) : task;
  return {
    ...base,
    completed,
    completedAt: completed ? now.toISOString() : null,
  };
}

export const MAX_MINUTES_PER_ENTRY = 1440; // 24 hours

/** Checks minutes typed by the user: a whole number from 1 to 1440. */
export function validateMinutes(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return { ok: false, error: 'invalid' };
  const minutes = Number(text);
  if (minutes < 1 || minutes > MAX_MINUTES_PER_ENTRY) return { ok: false, error: 'invalid' };
  return { ok: true, minutes };
}

/** Adds a manual entry of minutes to the task's time spent. */
export function addTimeSpent(tasks, id, minutes) {
  return tasks.map((task) =>
    task.id === id
      ? { ...task, timeSpentSeconds: (task.timeSpentSeconds ?? 0) + minutes * 60 }
      : task,
  );
}

function elapsedSeconds(task, now) {
  if (!task.timerStartedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(task.timerStartedAt)) / 1000));
}

function stopTimerOn(task, now) {
  if (!task.timerStartedAt) return task;
  return {
    ...task,
    timeSpentSeconds: (task.timeSpentSeconds ?? 0) + elapsedSeconds(task, now),
    timerStartedAt: null,
  };
}

/** Starts the timer on a task (does nothing if it is already running). */
export function startTimer(tasks, id, now = new Date()) {
  return tasks.map((task) =>
    task.id === id && !task.timerStartedAt ? { ...task, timerStartedAt: now.toISOString() } : task,
  );
}

/** Stops the timer on a task and adds the elapsed seconds to its time spent. */
export function stopTimer(tasks, id, now = new Date()) {
  return tasks.map((task) => (task.id === id ? stopTimerOn(task, now) : task));
}

/** Total seconds spent on a task, including a timer that is still running. */
export function totalSeconds(task, now = new Date()) {
  return (task.timeSpentSeconds ?? 0) + elapsedSeconds(task, now);
}

/** Formats seconds like "1h 30m", "5m" or "<1m". */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return '<1m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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
    (value.completedAt === null || typeof value.completedAt === 'string') &&
    // Time fields were added later, so tasks saved before them are still valid.
    (value.timeSpentSeconds === undefined || typeof value.timeSpentSeconds === 'number') &&
    (value.timerStartedAt === undefined ||
      value.timerStartedAt === null ||
      typeof value.timerStartedAt === 'string')
  );
}
