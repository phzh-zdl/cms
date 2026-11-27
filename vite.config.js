import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import anleitungPage from './scripts/anleitungPage.js';

// Content-Security-Policy als <meta>, nur im Build: im Dev-Modus fügt Vite
// eigene Inline-Skripte ein, die diese CSP blockieren würde.
// Einzige externe Verbindung: die GitHub-API. blob: für Bildvorschauen.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.github.com; " +
  "base-uri 'self'; form-action 'self'; object-src 'none'";

const cspMeta = () => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
});

// Node 25 bringt ein eigenes globales localStorage mit, das jsdoms Storage in den
// Tests überdeckt. Das Flag existiert erst ab Node 22.4 (ältere Versionen, z. B. die
// 20 in der CI, lehnen es als "bad option" ab) und wird deshalb nur dort gesetzt.
const [major, minor] = process.versions.node.split('.').map(Number);
const hasWebstorageFlag = major > 22 || (major === 22 && minor >= 4);

export default defineConfig({
  plugins: [react(), cspMeta(), anleitungPage()],
  // Relative Pfade: läuft in jedem Unterordner (GitHub Pages).
  base: './',
  server: { port: 5174 },
  test: { environment: 'jsdom', execArgv: hasWebstorageFlag ? ['--no-experimental-webstorage'] : [] },
});
