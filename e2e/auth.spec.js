import { test, expect } from '@playwright/test';

// The API is stubbed in the browser with page.route, so these tests need no
// database. A tiny in-memory "server" keeps accounts and the logged-in state.
function toPublicUser(account) {
  return { id: account.id, username: account.username, name: account.name, email: account.email };
}

async function stubAuthApi(page) {
  const accounts = new Map();
  let loggedIn = null;

  await page.route('**/me', (route) =>
    loggedIn
      ? route.fulfill({ json: { user: loggedIn } })
      : route.fulfill({ status: 401, json: { error: 'not-logged-in' } }),
  );
  await page.route('**/register', (route) => {
    const body = route.request().postDataJSON();
    if (accounts.has(body.username)) {
      return route.fulfill({
        status: 409,
        json: { error: 'taken', fields: { username: 'taken' } },
      });
    }
    const account = { id: String(accounts.size + 1), ...body };
    accounts.set(body.username, account);
    return route.fulfill({ status: 201, json: { user: toPublicUser(account) } });
  });
  await page.route('**/login', (route) => {
    const { username, password } = route.request().postDataJSON();
    const account = accounts.get(username);
    if (!account || account.password !== password) {
      return route.fulfill({ status: 401, json: { error: 'invalid-credentials' } });
    }
    loggedIn = toPublicUser(account);
    return route.fulfill({ json: { user: loggedIn } });
  });
  await page.route('**/logout', (route) => {
    loggedIn = null;
    return route.fulfill({ status: 204 });
  });
}

test.beforeEach(async ({ page }) => {
  await stubAuthApi(page);
  await page.goto('/');
});

test('sign up → log in → see Tasks → log out', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Manvitha');
  await page.getByLabel('Email').fill('m@example.com');
  await page.getByLabel('Username').fill('manvitha');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('status')).toHaveText('Account created. Please log in.');
  await expect(page.getByLabel('Username')).toHaveValue('manvitha');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('textbox', { name: 'New task' })).toBeVisible();
  await expect(page.getByText('Logged in as Manvitha')).toBeVisible();

  // Still logged in after reload (the session is checked with /me).
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'New task' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

test('wrong password shows an error and stays on the log in screen', async ({ page }) => {
  await page.getByLabel('Username').fill('nobody');
  await page.getByLabel('Password').fill('wrong-pass');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong username or password.');
  await expect(page.getByRole('textbox', { name: 'New task' })).toHaveCount(0);
});
