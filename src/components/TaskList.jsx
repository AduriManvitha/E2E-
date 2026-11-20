import TaskItem from './TaskItem.jsx';

const EMPTY_MESSAGES = {
  all: 'No tasks yet. Add one above!',
  active: 'No active tasks. Nice work!',
  completed: 'No completed tasks yet.',
};

export default function TaskList({ tasks, filter, onToggle, onRename, onDelete }) {
  if (tasks.length === 0) {
    return <p className="px-4 py-8 text-center text-slate-500">{EMPTY_MESSAGES[filter]}</p>;
  }

  return (
    <ul aria-label="Tasks" className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
