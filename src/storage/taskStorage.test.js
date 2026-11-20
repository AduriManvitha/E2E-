import { describe, it, expect } from 'vitest';
import { loadTasks, saveTasks, STORAGE_KEY } from './taskStorage.js';
import { createTask } from '../domain/tasks.js';

const brokenStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

describe('taskStorage', () => {
  it('returns an empty list when nothing is saved yet', () => {
    expect(loadTasks()).toEqual({ tasks: [], error: null });
  });

  it('round-trips tasks through localStorage', () => {
    const tasks = [createTask('Buy milk')];
    expect(saveTasks(tasks)).toEqual({ ok: true, error: null });
    expect(loadTasks()).toEqual({ tasks, error: null });
  });

  it('uses the versioned key', () => {
    saveTasks([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('reports unparseable JSON as corrupted (US-8 AC1)', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadTasks()).toEqual({ tasks: [], error: 'corrupted' });
  });

  it('reports the wrong shape as corrupted (US-8 AC1)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: [] }));
    expect(loadTasks().error).toBe('corrupted');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ title: 'no id' }]));
    expect(loadTasks().error).toBe('corrupted');
  });

  it('does not overwrite corrupted data when loading (US-8 AC3)', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    loadTasks();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not json');
  });

  it('never throws when storage is unavailable (US-8 AC2, AC4)', () => {
    expect(loadTasks(brokenStorage)).toEqual({ tasks: [], error: 'unavailable' });
    expect(saveTasks([], brokenStorage)).toEqual({ ok: false, error: 'unavailable' });
  });
});
