// Password hashing and Session tokens. No Express, no database.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const DEFAULT_BCRYPT_COST = 12;
export const SESSION_DURATION = '8h';
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function hashPassword(password, cost = DEFAULT_BCRYPT_COST) {
  return bcrypt.hash(password, cost);
}

// A hash of a throwaway password, made once per cost. Used when the username
// doesn't exist, so a wrong username takes as long as a wrong password and
// nobody can find out which usernames exist by timing the response.
const dummyHashes = new Map();
function dummyHash(cost) {
  if (!dummyHashes.has(cost)) dummyHashes.set(cost, bcrypt.hash('not-a-real-password', cost));
  return dummyHashes.get(cost);
}

export async function verifyPassword(password, passwordHash, cost = DEFAULT_BCRYPT_COST) {
  if (!passwordHash) {
    await bcrypt.compare(password, await dummyHash(cost));
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

// What the browser is allowed to see about a User. Never the password hash.
export function publicUser(record) {
  return {
    id: String(record.id),
    username: record.username,
    name: record.name,
    email: record.email,
  };
}

export function signSession(user, secret) {
  return jwt.sign({ username: user.username, name: user.name, email: user.email }, secret, {
    subject: String(user.id),
    expiresIn: SESSION_DURATION,
    algorithm: 'HS256',
  });
}

// Returns the public user, or null if the token is missing, expired or forged.
export function verifySession(token, secret) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
