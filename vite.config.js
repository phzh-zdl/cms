import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CSP } from './scripts/csp.js';
import anleitungPage from './scripts/anleitungPage.js';

// Content-Security-Policy als <meta>, nur im Build: im Dev-Modus fügt Vite
// eigene Inline-Skripte ein, die diese CSP blockieren würde.
// Die Policy selbst steht in scripts/csp.js (auch für anleitung.html).

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
