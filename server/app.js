// Builds the Express app. Everything it needs is passed in (the user store,
// the secret, ...), so tests can use an in-memory store instead of Azure SQL.
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { validateRegistration, validateLogin } from '../src/domain/accounts.js';
import {
  DEFAULT_BCRYPT_COST,
  SESSION_MAX_AGE_MS,
  hashPassword,
  verifyPassword,
  publicUser,
  signSession,
  verifySession,
} from './auth.js';

export const SESSION_COOKIE = 'session';
export const DEFAULT_AUTH_RATE_LIMIT = 20; // attempts per IP per 15 minutes, per route

export function createApp({
  userStore,
  jwtSecret,
  secureCookies = true, // false only for local http development
  trustProxy = false, // true on Azure, so rate limiting sees the real client IP
  staticDir = null, // folder with the built React app (dist/), served in production
  bcryptCost = DEFAULT_BCRYPT_COST,
  authRateLimit = DEFAULT_AUTH_RATE_LIMIT,
}) {
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  const cookieOptions = {
    httpOnly: true, // JavaScript in the page can't read it
    secure: secureCookies, // only sent over HTTPS
    sameSite: 'lax', // not sent on cross-site POSTs
    path: '/',
  };

  function limiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: authRateLimit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res) => res.status(429).json({ error: 'too-many-requests' }),
    });
  }

  app.post('/register', limiter(), async (req, res) => {
    const check = validateRegistration(req.body ?? {});
    if (!check.ok) return res.status(400).json({ error: 'invalid', fields: check.errors });
    const { username, password, name, email } = check.value;

    const conflicts = await userStore.findConflicts(username, email);
    if (conflicts.usernameTaken || conflicts.emailTaken) {
      const fields = {};
      if (conflicts.usernameTaken) fields.username = 'taken';
      if (conflicts.emailTaken) fields.email = 'taken';
      return res.status(409).json({ error: 'taken', fields });
    }

    const passwordHash = await hashPassword(password, bcryptCost);
    try {
      const record = await userStore.create({ username, passwordHash, name, email });
      return res.status(201).json({ user: publicUser(record) });
    } catch (err) {
      if (err.code === 'DUPLICATE') return res.status(409).json({ error: 'taken', fields: {} });
      throw err;
    }
  });

  app.post('/login', limiter(), async (req, res) => {
    const check = validateLogin(req.body ?? {});
    if (!check.ok) return res.status(400).json({ error: 'invalid', fields: check.errors });
    const { username, password } = check.value;

    const record = await userStore.findByUsername(username);
    const passwordMatches = await verifyPassword(password, record?.passwordHash, bcryptCost);
    // Same answer for "no such user" and "wrong password", on purpose.
    if (!record || !passwordMatches) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }

    const user = publicUser(record);
    res.cookie(SESSION_COOKIE, signSession(user, jwtSecret), {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE_MS,
    });
    return res.json({ user });
  });

  app.post('/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  app.get('/me', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const user = verifySession(req.cookies?.[SESSION_COOKIE], jwtSecret);
    if (!user) return res.status(401).json({ error: 'not-logged-in' });
    return res.json({ user });
  });

  if (staticDir) app.use(express.static(staticDir));

  // Last stop for errors. Express 5 also sends rejected async handlers here.
  // eslint-disable-next-line no-unused-vars -- Express needs all 4 arguments
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'bad-request' });
    }
    // Log the message only: never the request body (it may hold a password).
    console.error('Unexpected server error:', err.message);
    return res.status(500).json({ error: 'server' });
  });

  return app;
}
