import { useState } from 'react';
import {
  addTask,
  renameTask,
  toggleTask,
  deleteTask,
  toggleAll,
  clearCompleted,
  sortTasks,
  filterTasks,
  countActive,
  addTimeSpent,
  startTimer,
  stopTimer,
} from './domain/tasks.js';
import { loadTasks, saveTasks } from './storage/taskStorage.js';
import TaskInput from './components/TaskInput.jsx';
import TaskList from './components/TaskList.jsx';
import ToggleAll from './components/ToggleAll.jsx';
import FilterBar from './components/FilterBar.jsx';

const STORAGE_WARNINGS = {
  corrupted:
    "Your saved tasks couldn't be read, so the list started empty. They will be replaced when you make a change.",
  unavailable:
    "This browser isn't letting the app save. Your tasks will be lost when you close or reload the page.",
};

// `user` and `onLogout` come from Root.jsx. They are optional so the Tasks app
// can still be rendered (and tested) on its own.
export default function App({ user = null, onLogout } = {}) {
  // Load once on first render. We deliberately do NOT save on load, so corrupted
  // data is only overwritten after the user makes a change (US-8 AC3).
  const [initial] = useState(() => loadTasks());
  const [tasks, setTasks] = useState(initial.tasks);
  const [storageError, setStorageError] = useState(initial.error);
  const [filter, setFilter] = useState('all'); // view state only, never saved (US-5 AC5)

  // Every change goes through here: update state, then persist.
  function commit(nextTasks) {
    setTasks(nextTasks);
    const result = saveTasks(nextTasks);
    setStorageError(result.ok ? null : result.error);
  }

  const sorted = sortTasks(tasks);
  const visible = filterTasks(sorted, filter);
  const activeCount = countActive(tasks);
  const completedCount = tasks.length - activeCount;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      {user && (
        <div className="mb-4 flex items-center justify-end gap-3 text-sm text-slate-600">
          <span>
            Logged in as <span className="font-medium text-slate-900">{user.name}</span>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100 focus:ring-2 focus:ring-purple-300 focus:outline-none"
          >
            Log out
          </button>
        </div>
      )}
      <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-purple-700">Tasks</h1>

      {storageError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {STORAGE_WARNINGS[storageError]}
        </div>
      )}

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 p-4">
          <TaskInput onAdd={(title) => commit(addTask(tasks, title))} />
          <div className="flex justify-end">
            <ToggleAll
              taskCount={tasks.length}
              allCompleted={tasks.length > 0 && activeCount === 0}
              onToggleAll={() => commit(toggleAll(tasks))}
            />
          </div>
        </div>

        <div className="border-t border-slate-200">
          <TaskList
            tasks={visible}
            filter={filter}
            onToggle={(id) => commit(toggleTask(tasks, id))}
            onRename={(id, title) => commit(renameTask(tasks, id, title))}
            onDelete={(id) => commit(deleteTask(tasks, id))}
            onAddTime={(id, minutes) => commit(addTimeSpent(tasks, id, minutes))}
            onStartTimer={(id) => commit(startTimer(tasks, id))}
            onStopTimer={(id) => commit(stopTimer(tasks, id))}
          />
        </div>

        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          activeCount={activeCount}
          completedCount={completedCount}
          onClearCompleted={() => commit(clearCompleted(tasks))}
        />
      </section>

      <p className="mt-4 text-center text-xs text-slate-400">Double-click a task to edit it.</p>
    </main>
  );
}
