import { useState } from 'react';
import { validateTitle } from '../domain/tasks.js';
import { TITLE_ERRORS } from './titleErrors.js';

export default function TaskInput({ onAdd }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const result = validateTitle(value);
    if (!result.ok) {
      setError(TITLE_ERRORS[result.error]);
      return;
    }
    onAdd(result.title);
    setValue('');
    setError(null);
    // The input keeps focus because the form submit doesn't move it (US-1 AC6).
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1" noValidate>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="What needs to be done?"
          aria-label="New task"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'new-task-error' : undefined}
          autoFocus
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
        >
          Add
        </button>
      </div>
      {error && (
        <p id="new-task-error" role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
