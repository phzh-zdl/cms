// App-Leiste über die ganze Breite: Produktname, gewählte Seite (falls offen),
// Anleitung, angemeldete Person und Abmelden.
// Die Anleitung öffnet in einem neuen Fenster, damit ungespeicherte Arbeit im Editor bleibt.
export default function AppBar({ user, siteName, onLogout }) {
  return (
    <header className="app-bar">
      <div className="app-bar-brand">
        <span className="app-product">ZDL CMS</span>
        {siteName && <span className="app-site">{siteName}</span>}
      </div>
      <div className="app-bar-user">
        <a className="app-help" href="./anleitung.html" target="_blank" rel="noopener noreferrer">Anleitung (neues Fenster)</a>
        <span className="app-user">Angemeldet als {user.name || user.login}</span>
        <button type="button" onClick={onLogout}>Abmelden</button>
      </div>
    </header>
  );
}
