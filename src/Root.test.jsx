import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Root from './Root.jsx';

const USER = { id: '1', username: 'manvitha', name: 'Manvitha', email: 'm@example.com' };

// Fake server: maps "METHOD /path" to a { status, body } reply (or a function
// returning one). Every call is recorded so tests can check what was sent.
let routes;
let calls;

function reply(status, body) {
  return { status, body };
}

beforeEach(() => {
  calls = [];
  routes = { 'GET /me': reply(401, { error: 'not-logged-in' }) };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path, options = {}) => {
      const key = `${options.method ?? 'GET'} ${path}`;
      const body = options.body ? JSON.parse(options.body) : undefined;
      calls.push({ key, body, credentials: options.credentials });
      const route = routes[key];
      if (route === 'network-error') throw new TypeError('Failed to fetch');
      const { status, body: replyBody } =
        typeof route === 'function' ? route(body) : (route ?? reply(404, {}));
      return new Response(status === 204 ? null : JSON.stringify(replyBody), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderLoggedOut() {
  const user = userEvent.setup();
  render(<Root />);
  await screen.findByRole('heading', { name: 'Log in' });
  return user;
}

async function openSignUp(user) {
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
}

async function fillSignUp(user, overrides = {}) {
  const values = {
    Name: 'Manvitha',
    Email: 'm@example.com',
    Username: 'manvitha',
    Password: 'secret123',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

describe('US-10 Sign up', () => {
  it('creates an account, then asks the user to log in with the username filled in', async () => {
    routes['POST /register'] = reply(201, { user: USER });
    const user = await renderLoggedOut();
    await openSignUp(user);
    await fillSignUp(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Account created. Please log in.');
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('manvitha');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(calls.find((c) => c.key === 'POST /register').body).toEqual({
      username: 'manvitha',
      password: 'secret123',
      name: 'Manvitha',
      email: 'm@example.com',
    });
  });

  it('shows field errors in the browser and does not call the server', async () => {
    const user = await renderLoggedOut();
    await openSignUp(user);
    await fillSignUp(user, { Email: 'not-an-email', Password: 'short' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Passwords need at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(calls.some((c) => c.key === 'POST /register')).toBe(false);
  });

  it('shows "already taken" errors from the server next to the right fields', async () => {
    routes['POST /register'] = reply(409, {
      error: 'taken',
      fields: { username: 'taken', email: 'taken' },
    });
    const user = await renderLoggedOut();
    await openSignUp(user);
    await fillSignUp(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument();
    expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
  });

  it('never shows the password in plain text', async () => {
    const user = await renderLoggedOut();
    await openSignUp(user);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});

describe('US-11 Log in', () => {
  it('shows the log in screen when nobody is logged in', async () => {
    await renderLoggedOut();
    expect(screen.queryByRole('textbox', { name: 'New task' })).not.toBeInTheDocument();
  });

  it('logs in and shows the Tasks app with the user name', async () => {
    routes['POST /login'] = reply(200, { user: USER });
    const user = await renderLoggedOut();
    await user.type(screen.getByLabelText('Username'), 'manvitha');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('textbox', { name: 'New task' })).toBeInTheDocument();
    expect(screen.getByText('Manvitha')).toBeInTheDocument();
    const loginCall = calls.find((c) => c.key === 'POST /login');
    expect(loginCall.body).toEqual({ username: 'manvitha', password: 'secret123' });
    expect(loginCall.credentials).toBe('include');
  });

  it('shows one message for wrong username or password', async () => {
    routes['POST /login'] = reply(401, { error: 'invalid-credentials' });
    const user = await renderLoggedOut();
    await user.type(screen.getByLabelText('Username'), 'manvitha');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.');
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('requires both fields before calling the server', async () => {
    const user = await renderLoggedOut();
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Please enter a username.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a password.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /login')).toBe(false);
  });

  it('explains when the server cannot be reached or is rate-limiting', async () => {
    routes['POST /login'] = 'network-error';
    const user = await renderLoggedOut();
    await user.type(screen.getByLabelText('Username'), 'manvitha');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server");

    routes['POST /login'] = reply(429, { error: 'too-many-requests' });
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText(/Too many attempts/)).toBeInTheDocument();
  });
});

describe('US-12 Stay logged in and log out', () => {
  it('skips the log in screen when the session cookie is still valid', async () => {
    routes['GET /me'] = reply(200, { user: USER });
    render(<Root />);
    expect(await screen.findByRole('textbox', { name: 'New task' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('Log out returns to the log in screen', async () => {
    routes['GET /me'] = reply(200, { user: USER });
    routes['POST /logout'] = reply(204);
    const user = userEvent.setup();
    render(<Root />);
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /logout')).toBe(true);
  });
});
