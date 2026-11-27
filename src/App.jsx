import { useEffect, useState } from 'react';
import Login from './screens/Login.jsx';
import { createClient } from './github/client.js';
import { loadToken, saveToken, clearToken } from './auth/token.js';

// phase: 'checking' | 'login' | 'sites' — später kommt der Ort zusätzlich in den URL-Hash.
export default function App() {
  const [stored] = useState(loadToken);
  const [phase, setPhase] = useState(stored ? 'checking' : 'login');
  const [session, setSession] = useState(null); // { token, user, client }

  useEffect(() => {
    if (!stored) return undefined;
    let cancelled = false;
    const client = createClient(stored);
    client.getUser().then(
      (user) => {
        if (cancelled) return;
        setSession({ token: stored, user, client });
        setPhase('sites');
      },
      () => {
        if (cancelled) return;
        clearToken();
        setPhase('login');
      },
    );
    return () => { cancelled = true; };
  }, [stored]);

  function handleLogin({ token, user, remember }) {
    saveToken(token, remember);
    setSession({ token, user, client: createClient(token) });
    setPhase('sites');
  }

  function handleLogout() {
    clearToken();
    setSession(null);
    setPhase('login');
  }

  if (phase === 'checking') {
    return <main className="login"><p role="status">Anmeldung wird geprüft …</p></main>;
  }
  if (phase === 'login') {
    return <Login onLogin={handleLogin} />;
  }
  const { user } = session;
  return (
    <>
      <header className="app-header">
        <span>Angemeldet als {user.name || user.login}</span>
        <button type="button" onClick={handleLogout}>Abmelden</button>
      </header>
      <main>
        <p>Seiten werden in einem späteren Schritt geladen.</p>
      </main>
    </>
  );
}
