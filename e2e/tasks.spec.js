import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'todo-app.tasks.v1';

test.beforeEach(async ({ page }) => {
  // These tests are about Tasks, so start logged in. The API is stubbed in the
  // browser; e2e/auth.spec.js covers the log in / sign up flow.
  await page.route('**/me', (route) =>
    route.fulfill({
      json: { user: { id: '1', username: 'manvitha', name: 'Manvitha', email: 'm@example.com' } },
    }),
  );
  await page.goto('/');
});

async function addTask(page, title) {
  const input = page.getByRole('textbox', { name: 'New task' });
  await input.fill(title);
  await input.press('Enter');
}

function taskTitles(page) {
  return page.getByRole('list', { name: 'Tasks' }).getByRole('listitem').locator('span.flex-1');
}

test('add → reload → task is still there', async ({ page }) => {
  await addTask(page, 'Buy milk');
  await expect(taskTitles(page)).toHaveText(['Buy milk']);
  await page.reload();
  await expect(taskTitles(page)).toHaveText(['Buy milk']);
});

test('completing a task sinks it below active tasks', async ({ page }) => {
  await addTask(page, 'A');
  await addTask(page, 'B');
  await addTask(page, 'C');
  await page.getByRole('checkbox', { name: 'Mark "C" as completed' }).check();
  await expect(taskTitles(page)).toHaveText(['B', 'A', 'C']);
  await page.reload();
  await expect(taskTitles(page)).toHaveText(['B', 'A', 'C']);
  await expect(page.getByRole('checkbox', { name: 'Mark "C" as active' })).toBeChecked();
});

test('filter by status, and filter resets on reload', async ({ page }) => {
  await addTask(page, 'Active one');
  await addTask(page, 'Done one');
  await page.getByRole('checkbox', { name: 'Mark "Done one" as completed' }).check();

  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(taskTitles(page)).toHaveText(['Active one']);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(taskTitles(page)).toHaveText(['Done one']);
  await expect(page.getByText('1 task left')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(taskTitles(page)).toHaveCount(2);
});

test('clear completed removes only completed tasks', async ({ page }) => {
  await addTask(page, 'Keep');
  await addTask(page, 'Remove');
  await page.getByRole('checkbox', { name: 'Mark "Remove" as completed' }).check();
  await page.getByRole('button', { name: 'Clear completed' }).click();
  await expect(taskTitles(page)).toHaveText(['Keep']);
  await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  await page.reload();
  await expect(taskTitles(page)).toHaveText(['Keep']);
});

test('edit with double-click; Escape cancels', async ({ page }) => {
  await addTask(page, 'Typo');
  await page.getByText('Typo').dblclick();
  const edit = page.getByRole('textbox', { name: 'Edit task "Typo"' });
  await edit.fill('Changed');
  await edit.press('Escape');
  await expect(taskTitles(page)).toHaveText(['Typo']);

  await page.getByText('Typo').dblclick();
  await edit.fill('Fixed');
  await edit.press('Enter');
  await expect(taskTitles(page)).toHaveText(['Fixed']);
  await page.reload();
  await expect(taskTitles(page)).toHaveText(['Fixed']);
});

test('mark all complete toggles every task', async ({ page }) => {
  await addTask(page, 'A');
  await addTask(page, 'B');
  await page.getByRole('button', { name: 'Mark all complete' }).click();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Mark all active' }).click();
  await expect(page.getByRole('checkbox', { checked: false })).toHaveCount(2);
});

test('delete removes a task immediately', async ({ page }) => {
  await addTask(page, 'Gone');
  await page.getByRole('button', { name: 'Delete "Gone"' }).click();
  await expect(page.getByText('No tasks yet. Add one above!')).toBeVisible();
});

test('corrupted storage shows a warning instead of crashing', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, '{not json'), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText("couldn't be read");
  await addTask(page, 'Works anyway');
  await expect(taskTitles(page)).toHaveText(['Works anyway']);
});
