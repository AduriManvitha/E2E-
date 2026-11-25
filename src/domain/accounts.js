// Pure validation for Accounts (sign up and log in). No React, no network.
// Shared by the browser (AuthScreen) and the server (server/app.js), so both
// apply exactly the same rules. The server is still the one that decides.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 50;
export const PASSWORD_MIN = 8;
// bcrypt only uses the first 72 *bytes* of a password, so longer ones are rejected
// instead of being silently cut.
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
// Deliberately simple: something@something.something with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asText(value) {
  return typeof value === 'string' ? value : '';
}

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

export function validateUsername(raw) {
  const value = asText(raw).trim();
  if (value === '') return { value, error: 'required' };
  if (value.length < USERNAME_MIN) return { value, error: 'too-short' };
  if (value.length > USERNAME_MAX) return { value, error: 'too-long' };
  if (!USERNAME_PATTERN.test(value)) return { value, error: 'invalid' };
  return { value, error: null };
}

// Passwords are never trimmed: spaces are allowed and count.
export function validatePassword(raw) {
  const value = asText(raw);
  if (value === '') return { value, error: 'required' };
  if (value.length < PASSWORD_MIN) return { value, error: 'too-short' };
  if (byteLength(value) > PASSWORD_MAX_BYTES) return { value, error: 'too-long' };
  return { value, error: null };
}

export function validateName(raw) {
  const value = asText(raw).trim();
  if (value === '') return { value, error: 'required' };
  if (value.length > NAME_MAX) return { value, error: 'too-long' };
  return { value, error: null };
}

// Emails are stored lower-case so the same address can't sign up twice.
export function validateEmail(raw) {
  const value = asText(raw).trim().toLowerCase();
  if (value === '') return { value, error: 'required' };
  if (value.length > EMAIL_MAX) return { value, error: 'too-long' };
  if (!EMAIL_PATTERN.test(value)) return { value, error: 'invalid' };
  return { value, error: null };
}

function collect(checks) {
  const value = {};
  const errors = {};
  for (const [field, result] of Object.entries(checks)) {
    value[field] = result.value;
    if (result.error) errors[field] = result.error;
  }
  return { ok: Object.keys(errors).length === 0, value, errors };
}

// Returns { ok, value: { username, password, name, email }, errors: { field: code } }.
export function validateRegistration(input = {}) {
  return collect({
    username: validateUsername(input.username),
    password: validatePassword(input.password),
    name: validateName(input.name),
    email: validateEmail(input.email),
  });
}

// Login only checks that both fields are filled in. Length rules are not
// repeated here so we never hint at what a valid username looks like.
export function validateLogin(input = {}) {
  const username = asText(input.username).trim();
  const password = asText(input.password);
  return collect({
    username: { value: username, error: username === '' ? 'required' : null },
    password: { value: password, error: password === '' ? 'required' : null },
  });
}
