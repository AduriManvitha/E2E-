import { describe, it, expect } from 'vitest';
import {
  validateTitle,
  createTask,
  addTask,
  renameTask,
  toggleTask,
  deleteTask,
  toggleAll,
  clearCompleted,
  sortTasks,
  filterTasks,
  countActive,
  isTask,
  MAX_TITLE_LENGTH,
} from './tasks.js';

const at = (minute) => new Date(Date.UTC(2026, 0, 1, 0, minute));

function makeTask(id, { created = 0, completedAt = null } = {}) {
  return {
    id,
    title: `Task ${id}`,
    completed: completedAt !== null,
    createdAt: at(created).toISOString(),
    completedAt: completedAt === null ? null : at(completedAt).toISOString(),
  };
}

describe('validateTitle', () => {
  it('trims whitespace (US-1 AC3)', () => {
    expect(validateTitle('  Buy milk  ')).toEqual({ ok: true, title: 'Buy milk' });
  });

  it('rejects empty and whitespace-only titles (US-1 AC2)', () => {
    expect(validateTitle('')).toEqual({ ok: false, error: 'empty' });
    expect(validateTitle('   ')).toEqual({ ok: false, error: 'empty' });
  });

  it('accepts exactly 200 characters and rejects 201 (US-1 AC4)', () => {
    expect(validateTitle('a'.repeat(MAX_TITLE_LENGTH)).ok).toBe(true);
    expect(validateTitle('a'.repeat(MAX_TITLE_LENGTH + 1))).toEqual({
      ok: false,
      error: 'too-long',
    });
  });

  it('measures length after trimming', () => {
    expect(validateTitle(`  ${'a'.repeat(MAX_TITLE_LENGTH)}  `).ok).toBe(true);
  });
});

describe('createTask / addTask', () => {
  it('creates an active task with timestamps', () => {
    const task = createTask('Buy milk', { now: at(5), id: 'x' });
    expect(task).toEqual({
      id: 'x',
      title: 'Buy milk',
      completed: false,
      createdAt: at(5).toISOString(),
      completedAt: null,
    });
  });

  it('generates unique ids by default', () => {
    expect(createTask('a').id).not.toBe(createTask('a').id);
  });

  it('allows duplicate titles (US-1 AC5)', () => {
    const tasks = addTask(addTask([], 'Call mom'), 'Call mom');
    expect(tasks).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const tasks = [];
    addTask(tasks, 'a');
    expect(tasks).toEqual([]);
  });
});

describe('renameTask', () => {
  it('changes only the title of the matching task (US-2 AC5)', () => {
    const tasks = [makeTask('1', { completedAt: 3 }), makeTask('2')];
    const result = renameTask(tasks, '1', 'New');
    expect(result[0]).toEqual({ ...tasks[0], title: 'New' });
    expect(result[1]).toBe(tasks[1]);
  });
});

describe('toggleTask', () => {
  it('completes an active task and records completedAt (US-4 AC1)', () => {
    const [task] = toggleTask([makeTask('1')], '1', at(9));
    expect(task.completed).toBe(true);
    expect(task.completedAt).toBe(at(9).toISOString());
  });

  it('makes a completed task active and clears completedAt (US-4 AC2)', () => {
    const [task] = toggleTask([makeTask('1', { completedAt: 3 })], '1');
    expect(task.completed).toBe(false);
    expect(task.completedAt).toBeNull();
  });
});

describe('deleteTask', () => {
  it('removes the matching task only (US-3)', () => {
    const result = deleteTask([makeTask('1'), makeTask('2')], '1');
    expect(result.map((t) => t.id)).toEqual(['2']);
  });
});

describe('toggleAll (US-6)', () => {
  it('completes all tasks when any is active (AC2)', () => {
    const tasks = [makeTask('1'), makeTask('2', { completedAt: 1 })];
    const result = toggleAll(tasks, at(9));
    expect(result.every((t) => t.completed)).toBe(true);
    // An already completed task keeps its original completion time.
    expect(result[1]).toBe(tasks[1]);
    expect(result[0].completedAt).toBe(at(9).toISOString());
  });

  it('makes all tasks active when every task is completed (AC3)', () => {
    const tasks = [makeTask('1', { completedAt: 1 }), makeTask('2', { completedAt: 2 })];
    const result = toggleAll(tasks);
    expect(result.every((t) => !t.completed && t.completedAt === null)).toBe(true);
  });
});

describe('clearCompleted (US-7)', () => {
  it('removes completed tasks and keeps active ones (AC2, AC3)', () => {
    const tasks = [makeTask('1'), makeTask('2', { completedAt: 1 }), makeTask('3')];
    expect(clearCompleted(tasks).map((t) => t.id)).toEqual(['1', '3']);
  });
});

describe('sortTasks', () => {
  it('puts active tasks first (newest first), then completed (recently completed first)', () => {
    const tasks = [
      makeTask('old-active', { created: 1 }),
      makeTask('done-early', { created: 5, completedAt: 10 }),
      makeTask('new-active', { created: 3 }),
      makeTask('done-late', { created: 2, completedAt: 20 }),
    ];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual([
      'new-active',
      'old-active',
      'done-late',
      'done-early',
    ]);
  });

  it('returns an un-completed task to its creation-time position (US-4 AC2)', () => {
    let tasks = [
      makeTask('a', { created: 1 }),
      makeTask('b', { created: 2 }),
      makeTask('c', { created: 3 }),
    ];
    tasks = toggleTask(tasks, 'b', at(10));
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['c', 'a', 'b']);
    tasks = toggleTask(tasks, 'b');
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('filterTasks / countActive (US-5)', () => {
  const tasks = [makeTask('1'), makeTask('2', { completedAt: 1 }), makeTask('3')];

  it('filters by status', () => {
    expect(filterTasks(tasks, 'all')).toHaveLength(3);
    expect(filterTasks(tasks, 'active').map((t) => t.id)).toEqual(['1', '3']);
    expect(filterTasks(tasks, 'completed').map((t) => t.id)).toEqual(['2']);
  });

  it('counts active tasks', () => {
    expect(countActive(tasks)).toBe(2);
  });
});

describe('isTask', () => {
  it('accepts a valid task and rejects malformed values', () => {
    expect(isTask(makeTask('1'))).toBe(true);
    expect(isTask(null)).toBe(false);
    expect(isTask({ id: 1, title: 'x', completed: false, createdAt: '', completedAt: null })).toBe(
      false,
    );
    expect(isTask({ ...makeTask('1'), completed: 'yes' })).toBe(false);
  });
});
