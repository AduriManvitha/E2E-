import { describe, it, expect } from 'vitest';
import {
  validateRegistration,
  validateLogin,
  validatePassword,
  validateUsername,
  validateEmail,
  validateName,
  USERNAME_MAX,
  NAME_MAX,
} from './accounts.js';

const valid = {
  username: 'manvitha',
  password: 'secret123',
  name: 'Manvitha',
  email: 'm@example.com',
};

describe('validateRegistration', () => {
  it('accepts valid details and trims / lower-cases where it should', () => {
    const result = validateRegistration({
      username: '  manvitha ',
      password: ' secret123 ',
      name: '  Manvitha A ',
      email: ' M@Example.COM ',
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.value).toEqual({
      username: 'manvitha',
      password: ' secret123 ', // passwords are never trimmed
      name: 'Manvitha A',
      email: 'm@example.com',
    });
  });

  it('reports every missing field as required', () => {
    const result = validateRegistration({});
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      username: 'required',
      password: 'required',
      name: 'required',
      email: 'required',
    });
  });

  it('treats non-string input as empty', () => {
    expect(validateRegistration({ ...valid, username: 42 }).errors).toEqual({
      username: 'required',
    });
  });
});

describe('field rules', () => {
  it('username: 3–50 chars of letters, numbers, . _ -', () => {
    expect(validateUsername('ab').error).toBe('too-short');
    expect(validateUsername('a'.repeat(USERNAME_MAX + 1)).error).toBe('too-long');
    expect(validateUsername('has space').error).toBe('invalid');
    expect(validateUsername('name@x').error).toBe('invalid');
    expect(validateUsername('ok.name_1-2').error).toBeNull();
  });

  it('password: at least 8 chars and at most 72 bytes (bcrypt limit)', () => {
    expect(validatePassword('short').error).toBe('too-short');
    expect(validatePassword('a'.repeat(72)).error).toBeNull();
    expect(validatePassword('a'.repeat(73)).error).toBe('too-long');
    // 25 × "é" is 25 characters but 50 bytes; 40 × "é" is 80 bytes.
    expect(validatePassword('é'.repeat(25)).error).toBeNull();
    expect(validatePassword('é'.repeat(40)).error).toBe('too-long');
  });

  it('name: required, at most 100 chars', () => {
    expect(validateName('   ').error).toBe('required');
    expect(validateName('a'.repeat(NAME_MAX + 1)).error).toBe('too-long');
  });

  it('email: must look like an address', () => {
    expect(validateEmail('not-an-email').error).toBe('invalid');
    expect(validateEmail('a@b').error).toBe('invalid');
    expect(validateEmail('a b@c.com').error).toBe('invalid');
    expect(validateEmail('a@b.co').error).toBeNull();
  });
});

describe('validateLogin', () => {
  it('only requires both fields, trimming the username', () => {
    expect(validateLogin({ username: ' x ', password: 'p' })).toEqual({
      ok: true,
      value: { username: 'x', password: 'p' },
      errors: {},
    });
    expect(validateLogin({}).errors).toEqual({ username: 'required', password: 'required' });
  });
});
