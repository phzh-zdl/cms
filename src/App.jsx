import { useState } from 'react';

// screen: 'login' | 'sites' | 'site' — später kommt der Ort zusätzlich in den URL-Hash.
export default function App() {
  const [screen] = useState('login');

  if (screen === 'login') {
    return (
      <main className="login">
        <h1>OER-Inhalte bearbeiten</h1>
        <label htmlFor="token">Zugangsschlüssel</label>
        <input id="token" type="password" autoComplete="off" />
      </main>
    );
  }
  return null;
}
