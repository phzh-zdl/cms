import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  plugins: [react(), cspMeta()],
  // Relative Pfade: läuft in jedem Unterordner (GitHub Pages).
  base: './',
  server: { port: 5174 },
  test: { environment: 'jsdom' },
});
