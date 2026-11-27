import { useState } from 'react';
import { createClient, AuthError } from '../github/client.js';

export default function Login({ onLogin, createClientImpl = createClient }) {
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null); // { message, help? }
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError({ message: 'Bitte einen Zugangsschlüssel eingeben.' });
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const user = await createClientImpl(trimmed).getUser();
      onLogin({ token: trimmed, user, remember });
    } catch (e) {
      if (e instanceof AuthError) {
        setError({ message: 'Dieser Zugangsschlüssel ist ungültig oder abgelaufen.', help: true });
      } else {
        setError({ message: e?.message || 'Anmeldung fehlgeschlagen.' });
      }
      setChecking(false);
    }
  }

  return (
    <main className="login">
      <h1>OER-Inhalte bearbeiten</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="token">Zugangsschlüssel</label>
        <input
          id="token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
        />
        <div className="remember">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            aria-describedby="remember-hint"
          />
          <label htmlFor="remember">Auf diesem Gerät merken</label>
          <p id="remember-hint" className="hint">Nur auf persönlichen Geräten</p>
        </div>
        {error && (
          <p role="alert" className="error">
            {error.message}
            {error.help && (
              <>
                {' '}
                <a href="./anleitung.html#zugangsschluessel">Anleitung: Zugangsschlüssel erstellen</a>
              </>
            )}
          </p>
        )}
        <button type="submit" disabled={checking}>{checking ? 'Prüfe …' : 'Anmelden'}</button>
      </form>
    </main>
  );
}
