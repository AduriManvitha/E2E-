// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loadConfig } from './config.js';

const SECRET = 'x'.repeat(32);

describe('loadConfig', () => {
  it('reads settings from the environment', () => {
    expect(
      loadConfig({ DB_CONNECTION_STRING: 'Server=tcp:db;', JWT_SECRET: SECRET, PORT: '8080' }),
    ).toEqual({ dbConnectionString: 'Server=tcp:db;', jwtSecret: SECRET, port: 8080 });
  });

  it('defaults the port to 3001', () => {
    expect(loadConfig({ DB_CONNECTION_STRING: 'cs', JWT_SECRET: SECRET }).port).toBe(3001);
  });

  it('fails clearly, naming (not printing) missing settings', () => {
    expect(() => loadConfig({})).toThrow(
      'Missing required environment variable(s): DB_CONNECTION_STRING, JWT_SECRET',
    );
  });

  it('rejects a short JWT secret', () => {
    expect(() => loadConfig({ DB_CONNECTION_STRING: 'cs', JWT_SECRET: 'short' })).toThrow(
      /at least 32/,
    );
  });
});
