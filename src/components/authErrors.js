import {
  USERNAME_MIN,
  USERNAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX_BYTES,
  NAME_MAX,
  EMAIL_MAX,
} from '../domain/accounts.js';

// UI messages for field error codes from validateRegistration / validateLogin
// and from the server ('taken').
export const FIELD_ERRORS = {
  username: {
    required: 'Please enter a username.',
    'too-short': `Usernames need at least ${USERNAME_MIN} characters.`,
    'too-long': `Usernames can be at most ${USERNAME_MAX} characters.`,
    invalid: 'Use only letters, numbers, dots, dashes and underscores.',
    taken: 'That username is already taken.',
  },
  password: {
    required: 'Please enter a password.',
    'too-short': `Passwords need at least ${PASSWORD_MIN} characters.`,
    'too-long': `Passwords can be at most ${PASSWORD_MAX_BYTES} characters.`,
  },
  name: {
    required: 'Please enter your name.',
    'too-long': `Names can be at most ${NAME_MAX} characters.`,
  },
  email: {
    required: 'Please enter your email.',
    'too-long': `Emails can be at most ${EMAIL_MAX} characters.`,
    invalid: 'Please enter a valid email address.',
    taken: 'An account with this email already exists.',
  },
};

// UI messages for whole-form error codes.
export const FORM_ERRORS = {
  'invalid-credentials': 'Wrong username or password.',
  taken: 'That username or email is already in use.',
  'too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  network: "Can't reach the server. Check your connection and try again.",
  server: 'Something went wrong on the server. Please try again.',
};

export function fieldMessage(field, code) {
  return FIELD_ERRORS[field]?.[code] ?? 'Please check this field.';
}

export function formMessage(code) {
  return FORM_ERRORS[code] ?? FORM_ERRORS.server;
}
