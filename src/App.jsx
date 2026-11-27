import { useEffect, useRef, useState } from 'react';
import Login from './screens/Login.jsx';
import { createClient, AuthError } from './github/client.js';
import SiteList from './screens/SiteList.jsx';
import SiteEditor from './screens/SiteEditor.jsx';
import AppBar from './screens/AppBar.jsx';
import { loadSite } from './content/site.js';
import { parseSiteHash } from './content/siteHash.js';
import { clearPreviewCache } from './preview/cache.js';
import { loadToken, saveToken, clearToken } from './auth/token.js';
import { clearAllDrafts, hasAnyDraft, setDraftsLocked } from './save/drafts.js';
import ConfirmDialog from './editor/ConfirmDialog.jsx';

const LOGOUT_TEXT = 'Ungespeicherte Änderungen gehen beim Abmelden verloren. Trotzdem abmelden?';

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
  const editorUnsaved = useRef(false); // meldet der Editor (ungespeichert oder Speichern laeuft)
  const [confirmLogout, setConfirmLogout] = useState(false);
  const logoutTrigger = useRef(null); // Fokus nach "Abbrechen" zurueck

  useEffect(() => {
    if (!stored) return undefined;
    let cancelled = false;
    setPhase('checking');
    setCheckError(null);
    const client = createClient(stored);
    client.getUser().then(
      (user) => {
        if (cancelled) return;
        setDraftsLocked(false);
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
    setDraftsLocked(false);
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

  // Abmelden loescht alle Entwuerfe auf diesem Geraet (siehe docs/SICHERHEIT.md). Gibt es
  // ungespeicherte Aenderungen, wird vorher nachgefragt.
  function requestLogout() {
    if (editorUnsaved.current || hasAnyDraft()) {
      logoutTrigger.current = document.activeElement;
      setConfirmLogout(true);
      return;
    }
    logout();
  }

  function cancelLogout() {
    setConfirmLogout(false);
    const trigger = logoutTrigger.current;
    queueMicrotask(() => trigger?.focus?.());
  }

  async function logout() {
    setConfirmLogout(false);
    setDraftsLocked(true); // der Editor, der gleich geschlossen wird, schreibt keinen Entwurf mehr
    clearAllDrafts();
    editorUnsaved.current = false;
    clearToken();
    await clearPreviewCache(); // Vorschau-Inhalte nicht auf dem Geraet zuruecklassen; ueberholt laufende Laeufe
    clearAllDrafts(); // falls waehrenddessen noch einer geschrieben wurde
    requestSeq.current++;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setView({ status: 'list' });
    setSession(null);
    setPhase('login');
  }

  const logoutDialog = confirmLogout && (
    <ConfirmDialog title="Abmelden" text={LOGOUT_TEXT} confirmLabel="Abmelden" onConfirm={logout} onCancel={cancelLogout} />
  );

  if (phase === 'checking') {
    return <main className="login"><div className="login-panel"><p role="status">Anmeldung wird geprüft …</p></div></main>;
  }
  if (phase === 'retry') {
    return (
      <main className="login">
        <div className="login-panel">
          <p role="alert" className="error">{checkError}</p>
          <button type="button" className="btn-primary btn-block" onClick={() => setAttempt((n) => n + 1)}>Erneut versuchen</button>
          <button type="button" className="btn-block" onClick={requestLogout}>Abmelden</button>
        </div>
        {logoutDialog}
      </main>
    );
  }
  if (phase === 'login') {
    return <Login onLogin={handleLogin} />;
  }
  const { user } = session;
  return (
    <div className="app">
      <AppBar user={user} siteName={view.status === 'editor' ? view.site.config.name : null} onLogout={requestLogout} />
      <main className="app-main">
        {view.status === 'list' && <SiteList client={session.client} onSelect={openSite} />}
        {view.status === 'loading' && <p role="status" className="app-message">Seite wird geladen …</p>}
        {view.status === 'error' && (
          <div className="app-message">
            <p role="alert" className="error">{view.message}</p>
            <button type="button" onClick={closeSite}>Zurück</button>
          </div>
        )}
        {view.status === 'editor' && (
          <SiteEditor site={view.site} client={session.client} onBack={closeSite}
            onUnsavedChange={(u) => { editorUnsaved.current = u; }} />
        )}
      </main>
      {logoutDialog}
    </div>
  );
}
