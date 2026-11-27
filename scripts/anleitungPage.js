// Erzeugt public/anleitung.html aus docs/ANLEITUNG.md (Vite-Plugin, nur Entwicklungswerkzeug:
// `marked` ist eine devDependency und gelangt nicht ins ausgelieferte CMS).
// Das Login verlinkt auf ./anleitung.html#zugangsschluessel.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'docs/ANLEITUNG.md');
const IMAGES = resolve(root, 'docs/bilder');

// Kleine, in sich geschlossene Seite; Farben wie in src/styles.css. Kein externes Laden.
const STYLE = `
:root { --bg:#fbfbfc; --ink:#1b1b1f; --ink-2:#4a4d55; --accent:#b2156d; --line-ui:#8f8d76; --surface-2:#f3f4f7; }
@media (prefers-color-scheme: dark) { :root { --bg:#16181d; --ink:#f3f4f7; --ink-2:#b8bcc6; --accent:#ff6bb5; --surface-2:#22252c; } }
body { margin:0; background:var(--bg); color:var(--ink); font:500 1rem/1.6 'Helvetica Neue', Helvetica, Arial, sans-serif; }
main { max-width:44rem; margin:0 auto; padding:1rem 16px 4rem; }
h1, h2, h3 { font-weight:800; line-height:1.25; }
a { color:var(--accent); }
a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
img { max-width:100%; height:auto; border:1px solid var(--line-ui); }
code { background:var(--surface-2); padding:0 0.25em; border-radius:4px; }
blockquote { margin:1rem 0; padding:0.25rem 1rem; border-left:4px solid var(--line-ui); color:var(--ink-2); }
`;

export function renderAnleitung(markdown) {
  const body = marked.parse(markdown, { async: false });
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anleitung</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

const page = () => renderAnleitung(readFileSync(SOURCE, 'utf8'));

export default function anleitungPage() {
  return {
    name: 'anleitung-page',
    // Dev: /anleitung.html direkt aus dem Markdown, damit der Link im Login lokal funktioniert.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path.endsWith('/anleitung.html')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(page());
          return;
        }
        if (path.includes('/bilder/') && existsSync(IMAGES)) {
          const file = resolve(IMAGES, path.split('/bilder/')[1] ?? '');
          if (file.startsWith(IMAGES) && existsSync(file)) {
            res.end(readFileSync(file));
            return;
          }
        }
        next();
      });
    },
    // Build: dist/anleitung.html und die Screenshots aus docs/bilder (ohne .gitkeep).
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'anleitung.html', source: page() });
      if (!existsSync(IMAGES)) return;
      for (const name of readdirSync(IMAGES).filter((n) => !n.startsWith('.'))) {
        this.emitFile({ type: 'asset', fileName: `bilder/${name}`, source: readFileSync(resolve(IMAGES, name)) });
      }
    },
  };
}
