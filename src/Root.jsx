import { useEffect, useState } from 'react';
import { getCurrentUser, login, logout, register } from './api/authApi.js';
import AuthScreen from './components/AuthScreen.jsx';
import App from './App.jsx';

// Decides what to show: the Log in / Sign up screen, or the Tasks app.
// The Session lives in an httpOnly cookie the page can't read, so on start we
// ask the server (/me) who is logged in.
export default function Root() {
  // undefined = still checking, null = logged out, object = logged-in User
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((result) => {
      if (!cancelled) setUser(result.ok ? result.user : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(credentials) {
    const result = await login(credentials);
    if (result.ok) setUser(result.user);
    return result;
  }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (user === undefined) {
    return <p className="py-12 text-center text-slate-500">Loading…</p>;
  }

  if (user === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-purple-700">
          Tasks
        </h1>
        <AuthScreen onLogin={handleLogin} onRegister={register} />
      </main>
    );
  }

  return <App user={user} onLogout={handleLogout} />;
}
