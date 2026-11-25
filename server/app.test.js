// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp, SESSION_COOKIE } from './app.js';

const SECRET = 'test-secret-that-is-at-least-32-characters';

// In-memory stand-in for server/db.js (same methods, no Azure SQL needed).
function createMemoryStore() {
  const users = [];
  return {
    users,
    async findByUsername(username) {
      return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
    async findConflicts(username, email) {
      return {
        usernameTaken: users.some((u) => u.username.toLowerCase() === username.toLowerCase()),
        emailTaken: users.some((u) => u.email === email),
      };
    },
    async create(user) {
      const record = { id: users.length + 1, ...user };
      users.push(record);
      return record;
    },
  };
}

let store;
let app;

function makeApp(options = {}) {
  return createApp({
    userStore: store,
    jwtSecret: SECRET,
    bcryptCost: 4,
    secureCookies: true,
    ...options,
  });
}

beforeEach(() => {
  store = createMemoryStore();
  app = makeApp();
});

const details = {
  username: 'manvitha',
  password: 'secret123',
  name: 'Manvitha',
  email: 'M@Example.com',
};

function sessionCookie(response) {
  return (response.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

describe('US-10 POST /register', () => {
  it('creates the account with a bcrypt hash and returns the user without the hash', async () => {
    const res = await request(app).post('/register').send(details);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: { id: '1', username: 'manvitha', name: 'Manvitha', email: 'm@example.com' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|secret123/i);

    const saved = store.users[0];
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved.passwordHash).not.toContain('secret123');
    expect(saved.email).toBe('m@example.com');
  });

  it('does not log the user in (no cookie)', async () => {
    const res = await request(app).post('/register').send(details);
    expect(sessionCookie(res)).toBeUndefined();
  });

  it('rejects invalid details with field error codes', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'a', password: 'short', name: '', email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'invalid',
      fields: { username: 'too-short', password: 'too-short', name: 'required', email: 'invalid' },
    });
    expect(store.users).toHaveLength(0);
  });

  it('rejects a username or email that is already used', async () => {
    await request(app).post('/register').send(details);
    const res = await request(app)
      .post('/register')
      .send({ ...details, username: 'MANVITHA', email: 'm@example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'taken', fields: { username: 'taken', email: 'taken' } });
    expect(store.users).toHaveLength(1);
  });

  it('turns a database duplicate-key race into 409', async () => {
    store.create = async () => {
      const err = new Error('dup');
      err.code = 'DUPLICATE';
      throw err;
    };
    const res = await request(app).post('/register').send(details);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('taken');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/register')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'bad-request' });
  });
});

describe('US-11 POST /login', () => {
  beforeEach(async () => {
    await request(app).post('/register').send(details);
  });

  it('logs in and sets an httpOnly, Secure, SameSite=Lax session cookie', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: ' manvitha ', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: '1',
      username: 'manvitha',
      name: 'Manvitha',
      email: 'm@example.com',
    });
    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Max-Age=28800/);
  });

  it('gives the same 401 for a wrong password and an unknown user', async () => {
    const wrong = await request(app)
      .post('/login')
      .send({ username: 'manvitha', password: 'wrong-pass' });
    const unknown = await request(app)
      .post('/login')
      .send({ username: 'nobody', password: 'secret123' });
    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'invalid-credentials' });
      expect(sessionCookie(res)).toBeUndefined();
    }
  });

  it('requires both fields', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ username: 'required', password: 'required' });
  });

  it('rate-limits repeated attempts', async () => {
    app = makeApp({ authRateLimit: 2 });
    const attempt = () => request(app).post('/login').send({ username: 'x', password: 'y' });
    await attempt();
    await attempt();
    const res = await attempt();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'too-many-requests' });
  });

  it('can use plain-http cookies for local development', async () => {
    app = makeApp({ secureCookies: false });
    const res = await request(app)
      .post('/login')
      .send({ username: 'manvitha', password: 'secret123' });
    expect(sessionCookie(res)).not.toMatch(/Secure/);
  });
});

describe('US-12 GET /me and POST /logout', () => {
  it('returns the logged-in user from the cookie, and 401 without one', async () => {
    // Secure cookies are only replayed over https, so the agent uses a plain-http app.
    app = makeApp({ secureCookies: false });
    const agent = request.agent(app);
    await agent.post('/register').send(details);
    await agent.post('/login').send({ username: 'manvitha', password: 'secret123' });

    const me = await agent.get('/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('manvitha');
    expect(me.headers['cache-control']).toBe('no-store');

    const anonymous = await request(app).get('/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toEqual({ error: 'not-logged-in' });
  });

  it('rejects a forged cookie', async () => {
    const res = await request(app).get('/me').set('Cookie', `${SESSION_COOKIE}=not-a-real-token`);
    expect(res.status).toBe(401);
  });

  it('logout clears the cookie, after which /me is 401', async () => {
    app = makeApp({ secureCookies: false });
    const agent = request.agent(app);
    await agent.post('/register').send(details);
    await agent.post('/login').send({ username: 'manvitha', password: 'secret123' });

    const out = await agent.post('/logout');
    expect(out.status).toBe(204);
    expect(sessionCookie(out)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect((await agent.get('/me')).status).toBe(401);
  });
});

describe('errors and security headers', () => {
  it('hides unexpected errors behind a generic 500 and does not log the body', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.findByUsername = async () => {
      throw new Error('database down');
    };
    const res = await request(app)
      .post('/login')
      .send({ username: 'manvitha', password: 'secret123' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'server' });
    expect(spy).toHaveBeenCalledWith('Unexpected server error:', 'database down');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret123');
    spy.mockRestore();
  });

  it('sends helmet security headers', async () => {
    const res = await request(app).get('/me');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
