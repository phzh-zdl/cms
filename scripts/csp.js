// Content-Security-Policy des CMS: eine Quelle fuer index.html (vite.config.js) und anleitung.html.
// Einzige externe Verbindung: die GitHub-API. blob: fuer Bildvorschauen.
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.github.com; " +
  "base-uri 'self'; form-action 'self'; object-src 'none'";
