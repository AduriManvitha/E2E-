// @vitest-environment node
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword, signSession, verifySession, publicUser } from './auth.js';

const SECRET = 'test-secret-that-is-at-least-32-characters';
const COST = 4; // low bcrypt cost keeps tests fast

describe('password hashing', () => {
  it('hashes with bcrypt and never stores the plain password', async () => {
    const hash = await hashPassword('secret123', COST);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).not.toContain('secret123');
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('secret123', COST);
    expect(await verifyPassword('secret123', hash, COST)).toBe(true);
    expect(await verifyPassword('wrong-password', hash, COST)).toBe(false);
  });

  it('returns false (after doing the same work) when there is no hash', async () => {
    expect(await verifyPassword('secret123', undefined, COST)).toBe(false);
  });
});

describe('sessions', () => {
  const user = { id: '7', username: 'manvitha', name: 'Manvitha', email: 'm@example.com' };

  it('round-trips a user through a signed token', () => {
    expect(verifySession(signSession(user, SECRET), SECRET)).toEqual(user);
  });

  it('rejects missing, forged and expired tokens', () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession(signSession(user, 'another-secret-another-secret-xx'), SECRET)).toBeNull();
    const expired = jwt.sign({ username: 'x' }, SECRET, { subject: '1', expiresIn: -10 });
    expect(verifySession(expired, SECRET)).toBeNull();
  });

  it('only accepts HS256 (no "none" algorithm tricks)', () => {
    const unsigned = jwt.sign({ username: 'x' }, null, { subject: '1', algorithm: 'none' });
    expect(verifySession(unsigned, SECRET)).toBeNull();
  });
});

describe('publicUser', () => {
  it('drops the password hash and turns the id into a string', () => {
    expect(
      publicUser({ id: 3, username: 'a', passwordHash: 'h', name: 'A', email: 'a@b.co' }),
    ).toEqual({ id: '3', username: 'a', name: 'A', email: 'a@b.co' });
  });
});
