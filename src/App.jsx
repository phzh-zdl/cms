import { useEffect, useState } from 'react';
import Login from './screens/Login.jsx';
import { createClient, AuthError } from './github/client.js';
import { loadToken, saveToken, clearToken } from './auth/token.js';

// phase: 'checking' | 'retry' | 'login' | 'sites' — später kommt der Ort zusätzlich in den URL-Hash.
export default function App() {
  const [stored] = useState(loadToken);
  const [phase, setPhase] = useState(stored ? 'checking' : 'login');
  const [attempt, setAttempt] = useState(0);
  const [checkError, setCheckError] = useState(null);
  const [session, setSession] = useState(null); // { token, user, client }

  useEffect(() => {
    if (!stored) return undefined;
    let cancelled = false;
    setPhase('checking');
    setCheckError(null);
    const client = createClient(stored);
    client.getUser().then(
      (user) => {
        if (cancelled) return;
        setSession({ token: stored, user, client });
        setPhase('sites');
      },
      (e) => {
        if (cancelled) return;
        if (e instanceof AuthError) {
          clearToken();
          setPhase('login');
        } else {
          // Verbindungs-/Serverproblem: Schlüssel behalten, erneut versuchen lassen.
          setCheckError(e?.message || 'Die Anmeldung konnte nicht geprüft werden.');
          setPhase('retry');
        }
      },
    );
    return () => { cancelled = true; };
  }, [stored, attempt]);

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
  if (phase === 'retry') {
    return (
      <main className="login">
        <p role="alert" className="error">{checkError}</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>Erneut versuchen</button>
      </main>
    );
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
