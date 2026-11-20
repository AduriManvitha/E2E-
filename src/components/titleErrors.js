import { MAX_TITLE_LENGTH } from '../domain/tasks.js';

// UI messages for the error codes returned by validateTitle().
export const TITLE_ERRORS = {
  empty: 'Please type a task first.',
  'too-long': `Tasks can be at most ${MAX_TITLE_LENGTH} characters.`,
};
