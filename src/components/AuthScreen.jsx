import { useState } from 'react';
import { validateLogin, validateRegistration } from '../domain/accounts.js';
import { fieldMessage, formMessage } from './authErrors.js';

const EMPTY = { username: '', password: '', name: '', email: '' };

const FIELDS = {
  login: [
    { name: 'username', label: 'Username', type: 'text', autoComplete: 'username' },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
  ],
  register: [
    { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { name: 'username', label: 'Username', type: 'text', autoComplete: 'username' },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  ],
};

// Log in / Sign up screen. Presentational: the actual calls are passed in.
// onLogin(credentials) and onRegister(details) return { ok, error, fields }.
export default function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  function switchMode(nextMode) {
    setMode(nextMode);
    setValues((current) => ({ ...EMPTY, username: current.username }));
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    // Check in the browser first for quick feedback; the server checks again.
    const check = isLogin ? validateLogin(values) : validateRegistration(values);
    setFieldErrors(check.errors);
    if (!check.ok) return;

    setSubmitting(true);
    const result = isLogin ? await onLogin(check.value) : await onRegister(check.value);
    // A successful login replaces this screen, so stop touching state.
    if (result.ok && isLogin) return;
    setSubmitting(false);

    if (result.ok) {
      setMode('login');
      setValues({ ...EMPTY, username: check.value.username });
      setNotice('Account created. Please log in.');
      return;
    }
    const serverFields = result.fields ?? {};
    setFieldErrors(serverFields);
    if (Object.keys(serverFields).length === 0) setFormError(formMessage(result.error));
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">
        {isLogin ? 'Log in' : 'Create an account'}
      </h2>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {notice}
        </p>
      )}
      {formError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {FIELDS[mode].map((field) => {
          const id = `auth-${field.name}`;
          const error = fieldErrors[field.name];
          return (
            <div key={field.name} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {field.label}
              </label>
              <input
                id={id}
                type={field.type}
                autoComplete={field.autoComplete}
                value={values[field.name]}
                onChange={(event) => {
                  const value = event.target.value;
                  setValues((current) => ({ ...current, [field.name]: value }));
                  setFieldErrors((current) => ({ ...current, [field.name]: undefined }));
                }}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${id}-error` : undefined}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              />
              {error && (
                <p id={`${id}-error`} className="text-sm text-red-600">
                  {fieldMessage(field.name, error)}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-300 focus:outline-none disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => switchMode(isLogin ? 'register' : 'login')}
          className="font-medium text-purple-700 underline hover:text-purple-900"
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </section>
  );
}
