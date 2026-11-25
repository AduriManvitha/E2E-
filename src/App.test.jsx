import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { STORAGE_KEY } from './storage/taskStorage.js';

// Only fake Date (not timers) so user-event still works. Each tick() moves the
// clock forward so tasks get distinct timestamps and a predictable order.
let clock;
function tick() {
  clock += 1000;
  vi.setSystemTime(clock);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  clock = Date.UTC(2026, 0, 1);
  vi.setSystemTime(clock);
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const user = userEvent.setup();
  const utils = render(<App />);
  const input = screen.getByRole('textbox', { name: 'New task' });

  async function add(title) {
    tick();
    await user.clear(input);
    await user.type(input, `${title}{Enter}`);
  }

  function titles() {
    const list = screen.queryByRole('list', { name: 'Tasks' });
    if (!list) return [];
    return within(list)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('span.flex-1').textContent);
  }

  async function toggle(title) {
    tick();
    await user.click(screen.getByRole('checkbox', { name: new RegExp(`"${title}"`) }));
  }

  return { user, input, add, titles, toggle, ...utils };
}

function saved() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

describe('US-1 Add a task', () => {
  it('adds a task with Enter, newest at the top, and clears + keeps focus on the input', async () => {
    const { input, add, titles } = setup();
    await add('First');
    await add('Second');
    expect(titles()).toEqual(['Second', 'First']);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('adds a task with the Add button', async () => {
    const { user, input, titles } = setup();
    await user.type(input, 'Clicked');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(titles()).toEqual(['Clicked']);
  });

  it('rejects empty and whitespace-only input with a message', async () => {
    const { add, titles } = setup();
    await add('   ');
    expect(titles()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('Please type a task first.');
  });

  it('trims the title and saves it to storage', async () => {
    const { add, titles } = setup();
    await add('  Buy milk  ');
    expect(titles()).toEqual(['Buy milk']);
    expect(saved()[0].title).toBe('Buy milk');
  });

  it('rejects titles over 200 characters', async () => {
    const { user, input, titles } = setup();
    await user.click(input);
    await user.paste('a'.repeat(201));
    await user.keyboard('{Enter}');
    expect(titles()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('at most 200 characters');
  });

  it('allows duplicate titles', async () => {
    const { add, titles } = setup();
    await add('Call mom');
    await add('Call mom');
    expect(titles()).toEqual(['Call mom', 'Call mom']);
  });

  it('loads saved tasks on start (survives reload)', async () => {
    const first = setup();
    await first.add('Persisted');
    first.unmount();
    const second = setup();
    expect(second.titles()).toEqual(['Persisted']);
  });
});

describe('US-2 Edit a task', () => {
  it('double-click to edit, Enter saves', async () => {
    const { user, add, titles } = setup();
    await add('Old');
    await user.dblClick(screen.getByText('Old'));
    const edit = screen.getByRole('textbox', { name: 'Edit task "Old"' });
    expect(edit).toHaveValue('Old');
    await user.clear(edit);
    await user.type(edit, '  New  {Enter}');
    expect(titles()).toEqual(['New']);
    expect(saved()[0].title).toBe('New');
  });

  it('Edit button opens the editor and blur saves', async () => {
    const { user, add, titles } = setup();
    await add('Old');
    await user.click(screen.getByRole('button', { name: 'Edit "Old"' }));
    const edit = screen.getByRole('textbox', { name: 'Edit task "Old"' });
    await user.clear(edit);
    await user.type(edit, 'Blurred');
    await user.click(document.body);
    expect(titles()).toEqual(['Blurred']);
  });

  it('Escape cancels and keeps the old title', async () => {
    const { user, add, titles } = setup();
    await add('Keep me');
    await user.dblClick(screen.getByText('Keep me'));
    const edit = screen.getByRole('textbox', { name: 'Edit task "Keep me"' });
    await user.clear(edit);
    await user.type(edit, 'Changed{Escape}');
    expect(titles()).toEqual(['Keep me']);
    expect(saved()[0].title).toBe('Keep me');
  });

  it('rejects an empty title on Enter and does not delete the task', async () => {
    const { user, add, titles } = setup();
    await add('Keep me');
    await user.dblClick(screen.getByText('Keep me'));
    const edit = screen.getByRole('textbox', { name: 'Edit task "Keep me"' });
    await user.clear(edit);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Please type a task first.');
    await user.keyboard('{Escape}');
    expect(titles()).toEqual(['Keep me']);
  });

  it('an empty title on blur keeps the old title', async () => {
    const { user, add, titles } = setup();
    await add('Keep me');
    await user.dblClick(screen.getByText('Keep me'));
    await user.clear(screen.getByRole('textbox', { name: 'Edit task "Keep me"' }));
    await user.click(document.body);
    expect(titles()).toEqual(['Keep me']);
  });

  it('editing keeps completed state and position', async () => {
    const { user, add, titles, toggle } = setup();
    await add('A');
    await add('B');
    await toggle('B');
    await user.dblClick(screen.getByText('B'));
    await user.type(screen.getByRole('textbox', { name: 'Edit task "B"' }), '2{Enter}');
    expect(titles()).toEqual(['A', 'B2']);
    expect(screen.getByRole('checkbox', { name: /"B2"/ })).toBeChecked();
  });
});

describe('US-3 Delete a task', () => {
  it('deletes immediately and persists', async () => {
    const { user, add, titles } = setup();
    await add('A');
    await add('B');
    await user.click(screen.getByRole('button', { name: 'Delete "A"' }));
    expect(titles()).toEqual(['B']);
    expect(saved().map((t) => t.title)).toEqual(['B']);
  });
});

describe('US-4 Mark completed / active', () => {
  it('completed tasks sink below active ones, most recently completed first', async () => {
    const { add, titles, toggle } = setup();
    await add('A');
    await add('B');
    await add('C');
    await toggle('A');
    await toggle('C');
    expect(titles()).toEqual(['B', 'C', 'A']);
    expect(screen.getByRole('checkbox', { name: /"C"/ })).toBeChecked();
    expect(screen.getByText('C')).toHaveClass('line-through');
  });

  it('unchecking returns the task to its creation-time position and persists', async () => {
    const { add, titles, toggle } = setup();
    await add('A');
    await add('B');
    await add('C');
    await toggle('B');
    expect(titles()).toEqual(['C', 'A', 'B']);
    await toggle('B');
    expect(titles()).toEqual(['C', 'B', 'A']);
    expect(saved().find((t) => t.title === 'B').completedAt).toBeNull();
  });
});

describe('US-5 Filter', () => {
  it('filters by status, highlights the selection and shows the counter', async () => {
    const { user, add, titles, toggle } = setup();
    await add('A');
    await add('B');
    await toggle('A');

    expect(screen.getByText('1 task left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(titles()).toEqual(['B']);
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['A']);

    await toggle('A');
    expect(screen.getByText('No completed tasks yet.')).toBeInTheDocument();
    expect(screen.getByText('2 tasks left')).toBeInTheDocument();
  });

  it('shows an empty state when there are no tasks', () => {
    setup();
    expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
    expect(screen.getByText('0 tasks left')).toBeInTheDocument();
  });

  it('resets to All on reload', async () => {
    const first = setup();
    await first.add('A');
    await first.user.click(screen.getByRole('button', { name: 'Completed' }));
    first.unmount();
    setup();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('US-6 Mark all complete', () => {
  it('is hidden when there are no tasks', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Mark all/ })).not.toBeInTheDocument();
  });

  it('completes all, then toggles all back to active', async () => {
    const { user, add, toggle } = setup();
    await add('A');
    await add('B');
    await toggle('A');
    tick();
    await user.click(screen.getByRole('button', { name: 'Mark all complete' }));
    expect(screen.getAllByRole('checkbox').every((box) => box.checked)).toBe(true);
    expect(saved().every((t) => t.completed)).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Mark all active' }));
    expect(screen.getAllByRole('checkbox').every((box) => !box.checked)).toBe(true);
  });
});

describe('US-7 Clear completed', () => {
  it('is hidden when nothing is completed, and removes only completed tasks', async () => {
    const { user, add, titles, toggle } = setup();
    await add('A');
    await add('B');
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
    await toggle('A');
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(titles()).toEqual(['B']);
    expect(saved().map((t) => t.title)).toEqual(['B']);
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
  });
});

describe('US-8 Storage failure', () => {
  it('starts empty with a warning when saved data is corrupted, and keeps it until a change', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { add, titles } = setup();
    expect(titles()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent("couldn't be read");
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not json');

    await add('Fresh');
    expect(saved().map((t) => t.title)).toEqual(['Fresh']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps working in memory with a warning when storage is unavailable', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    try {
      const { add, titles } = setup();
      expect(screen.getByRole('alert')).toHaveTextContent("isn't letting the app save");
      await add('In memory');
      expect(titles()).toEqual(['In memory']);
      expect(screen.getByRole('alert')).toHaveTextContent("isn't letting the app save");
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

describe('US-9 Time spent', () => {
  it('shows 0 time for a new task and adds manual minutes to the total', async () => {
    const { user, add } = setup();
    await add('Write report');
    const li = screen.getByRole('listitem');
    expect(li).toHaveTextContent('Time spent: <1m');
    const minutes = screen.getByRole('spinbutton', { name: /Minutes to add/ });
    await user.type(minutes, '30');
    await user.click(screen.getByRole('button', { name: /Add time to/ }));
    expect(li).toHaveTextContent('Time spent: 30m');
    await user.type(minutes, '45');
    await user.click(screen.getByRole('button', { name: /Add time to/ }));
    expect(li).toHaveTextContent('Time spent: 1h 15m');
    expect(minutes).toHaveValue(null);
    expect(saved()[0].timeSpentSeconds).toBe(75 * 60);
  });

  it('rejects zero, empty and too-large minutes', async () => {
    const { user, add } = setup();
    await add('Write report');
    const minutes = screen.getByRole('spinbutton', { name: /Minutes to add/ });
    await user.click(screen.getByRole('button', { name: /Add time to/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('whole minutes');
    await user.type(minutes, '0');
    await user.click(screen.getByRole('button', { name: /Add time to/ }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.clear(minutes);
    await user.type(minutes, '1441');
    await user.click(screen.getByRole('button', { name: /Add time to/ }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Time spent: <1m');
  });

  it('timer adds the elapsed time when stopped and persists it', async () => {
    const { user, add } = setup();
    await add('Write report');
    await user.click(screen.getByRole('button', { name: /Start timer/ }));
    expect(saved()[0].timerStartedAt).not.toBeNull();
    vi.setSystemTime(clock + 5 * 60 * 1000);
    await user.click(screen.getByRole('button', { name: /Stop timer/ }));
    expect(screen.getByRole('listitem')).toHaveTextContent('Time spent: 5m');
    expect(saved()[0]).toMatchObject({ timeSpentSeconds: 300, timerStartedAt: null });
  });

  it('completing a task stops its timer', async () => {
    const { user, add } = setup();
    await add('Write report');
    await user.click(screen.getByRole('button', { name: /Start timer/ }));
    vi.setSystemTime(clock + 2 * 60 * 1000);
    await user.click(screen.getByRole('checkbox'));
    expect(saved()[0]).toMatchObject({
      completed: true,
      timeSpentSeconds: 120,
      timerStartedAt: null,
    });
  });

  it('tasks saved before time tracking still load', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'o',
          title: 'Old',
          completed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
        },
      ]),
    );
    setup();
    expect(screen.getByRole('listitem')).toHaveTextContent('Old');
    expect(screen.getByRole('listitem')).toHaveTextContent('Time spent: <1m');
  });
});
