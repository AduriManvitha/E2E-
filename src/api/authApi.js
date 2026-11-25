// The ONLY browser code that calls the server's account endpoints.
// Functions never throw: they return { ok: true, user } or
// { ok: false, error, fields } where error is a code from the server
// ('invalid', 'taken', 'invalid-credentials', 'too-many-requests', 'server')
// or 'network' when the server can't be reached.

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'include', // send and receive the login cookie
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, error: 'network', fields: {} };
  }

  if (response.status === 204) return { ok: true, user: null };

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Not JSON (e.g. the dev proxy can't reach the API): treat as a server problem.
  }
  if (response.ok) return { ok: true, user: data.user ?? null };
  return { ok: false, error: data.error ?? 'server', fields: data.fields ?? {} };
}

export function register({ username, password, name, email }) {
  return request('POST', '/register', { username, password, name, email });
}

export function login({ username, password }) {
  return request('POST', '/login', { username, password });
}

export function logout() {
  return request('POST', '/logout');
}

// Who is logged in right now (from the cookie)? { ok: false } means nobody.
export function getCurrentUser() {
  return request('GET', '/me');
}
