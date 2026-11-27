import { useEffect, useRef, useState } from 'react';
import Login from './screens/Login.jsx';
import { createClient, AuthError } from './github/client.js';
import SiteList from './screens/SiteList.jsx';
import SiteEditor from './screens/SiteEditor.jsx';
import { loadSite } from './content/site.js';
import { parseSiteHash } from './content/siteHash.js';
import { loadToken, saveToken, clearToken } from './auth/token.js';

// phase: 'checking' | 'retry' | 'login' | 'sites'
// In 'sites' steht die gewählte Seite im URL-Hash (#/<owner>/<repo>); view: { status: 'list' | 'loading' | 'error' | 'editor', ... }
const repoFromHash = () => parseSiteHash(window.location.hash);

export default function App() {
  const [stored] = useState(loadToken);
  const [phase, setPhase] = useState(stored ? 'checking' : 'login');
  const [attempt, setAttempt] = useState(0);
  const [checkError, setCheckError] = useState(null);
  const [session, setSession] = useState(null); // { token, user, client }
  const requestSeq = useRef(0); // verwirft Ergebnisse veralteter Ladevorgaenge
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
    const token = ++requestSeq.current;
    window.location.hash = `#/${repo}`;
    setView({ status: 'loading', repo });
    try {
      const site = await loadSite(client, repo);
      if (token === requestSeq.current) setView({ status: 'editor', site });
    } catch (e) {
      if (token === requestSeq.current) setView({ status: 'error', message: e?.message || 'Die Seite konnte nicht geladen werden.' });
    }
  }

  function closeSite() {
    requestSeq.current++;
    window.location.hash = '';
    setView({ status: 'list' });
  }

  function handleLogout() {
    clearToken();
    requestSeq.current++;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
