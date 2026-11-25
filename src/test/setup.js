import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  // Server tests run in the "node" environment, where there is no localStorage.
  globalThis.localStorage?.clear();
});
