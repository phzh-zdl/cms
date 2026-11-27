import { useEffect, useState } from 'react';
import Login from './screens/Login.jsx';
import { createClient, AuthError } from './github/client.js';
import SiteList from './screens/SiteList.jsx';
import SiteEditor from './screens/SiteEditor.jsx';
import { loadSite } from './content/site.js';
import { loadToken, saveToken, clearToken } from './auth/token.js';

// phase: 'checking' | 'retry' | 'login' | 'sites'
// In 'sites' steht die gewählte Seite im URL-Hash (#/<owner>/<repo>); view: { status: 'list' | 'loading' | 'error' | 'editor', ... }
const repoFromHash = () => {
  const m = window.location.hash.match(/^#\/([^/]+\/[^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

export default function App() {
  const [stored] = useState(loadToken);
  const [phase, setPhase] = useState(stored ? 'checking' : 'login');
  const [attempt, setAttempt] = useState(0);
  const [checkError, setCheckError] = useState(null);
  const [session, setSession] = useState(null); // { token, user, client }
  const [view, setView] = useState({ status: 'list' });

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
        const repo = repoFromHash();
        if (repo) openSite(repo, client);
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
    const client = createClient(token);
    setSession({ token, user, client });
    setPhase('sites');
    const repo = repoFromHash();
    if (repo) openSite(repo, client);
  }

  async function openSite(repo, client = session.client) {
    window.location.hash = `#/${repo}`;
    setView({ status: 'loading', repo });
    try {
      setView({ status: 'editor', site: await loadSite(client, repo) });
    } catch (e) {
      setView({ status: 'error', message: e?.message || 'Die Seite konnte nicht geladen werden.' });
    }
  }

  function closeSite() {
    window.location.hash = '';
    setView({ status: 'list' });
  }

  function handleLogout() {
    clearToken();
    setView({ status: 'list' });
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
        {view.status === 'list' && <SiteList client={session.client} onSelect={openSite} />}
        {view.status === 'loading' && <p role="status">Seite wird geladen …</p>}
        {view.status === 'error' && (
          <>
            <p role="alert" className="error">{view.message}</p>
            <button type="button" onClick={closeSite}>Zurück</button>
          </>
        )}
        {view.status === 'editor' && <SiteEditor site={view.site} onBack={closeSite} />}
      </main>
    </>
  );
}
