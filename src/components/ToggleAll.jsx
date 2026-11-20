export default function ToggleAll({ taskCount, allCompleted, onToggleAll }) {
  if (taskCount === 0) return null; // US-6 AC1

  return (
    <button
      type="button"
      onClick={onToggleAll}
      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
    >
      {allCompleted ? 'Mark all active' : 'Mark all complete'}
    </button>
  );
}
