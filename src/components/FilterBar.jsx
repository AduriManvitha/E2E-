import { FILTERS } from '../domain/tasks.js';

const LABELS = { all: 'All', active: 'Active', completed: 'Completed' };

export default function FilterBar({
  filter,
  onFilterChange,
  activeCount,
  completedCount,
  onClearCompleted,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span aria-live="polite">
        {activeCount} {activeCount === 1 ? 'task' : 'tasks'} left
      </span>

      <div role="group" aria-label="Filter tasks" className="flex gap-1">
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onFilterChange(name)}
            aria-pressed={filter === name}
            className={`rounded-md px-2 py-1 ${
              filter === name ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {LABELS[name]}
          </button>
        ))}
      </div>

      {completedCount > 0 ? (
        <button
          type="button"
          onClick={onClearCompleted}
          className="text-slate-600 hover:text-red-600 hover:underline"
        >
          Clear completed
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
