import { useRef, useState } from 'react';
import { validateTitle } from '../domain/tasks.js';
import { TITLE_ERRORS } from './titleErrors.js';

export default function TaskItem({ task, onToggle, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [error, setError] = useState(null);
  // Some browsers fire blur when the edit input is removed (after Enter or
  // Escape). This ref lets the blur handler know editing has already finished,
  // so Escape never saves and Enter never saves twice.
  const editingRef = useRef(false);

  function startEditing() {
    setDraft(task.title);
    setError(null);
    editingRef.current = true;
    setIsEditing(true);
  }

  function stopEditing() {
    editingRef.current = false;
    setIsEditing(false);
    setError(null);
  }

  // Enter: an invalid title shows an error and stays in edit mode (US-2 AC3).
  function saveFromEnter() {
    const result = validateTitle(draft);
    if (!result.ok) {
      setError(TITLE_ERRORS[result.error]);
      return;
    }
    if (result.title !== task.title) onRename(task.id, result.title);
    stopEditing();
  }

  // Blur: save if valid, otherwise quietly keep the old title (US-2 AC3).
  function saveFromBlur() {
    if (!editingRef.current) return;
    const result = validateTitle(draft);
    if (result.ok && result.title !== task.title) onRename(task.id, result.title);
    stopEditing();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveFromEnter();
    } else if (event.key === 'Escape') {
      stopEditing(); // cancel: old title stays (US-2 AC2)
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-1 px-4 py-3">
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={saveFromBlur}
          aria-label={`Edit task "${task.title}"`}
          aria-invalid={error ? 'true' : 'false'}
          autoFocus
          className="w-full rounded-md border border-indigo-400 px-2 py-1 text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'active' : 'completed'}`}
        className="h-5 w-5 shrink-0 cursor-pointer accent-indigo-600"
      />
      <span
        onDoubleClick={startEditing}
        className={`flex-1 break-words ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}
      >
        {task.title}
      </span>
      <button
        type="button"
        onClick={startEditing}
        aria-label={`Edit "${task.title}"`}
        className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.title}"`}
        className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
      >
        Delete
      </button>
    </li>
  );
}
