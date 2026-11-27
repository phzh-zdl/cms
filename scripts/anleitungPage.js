// Erzeugt dist/anleitung.html (im Dev-Modus per Middleware unter /anleitung.html) aus docs/ANLEITUNG.md
// (Vite-Plugin, nur Entwicklungswerkzeug:
// `marked` ist eine devDependency und gelangt nicht ins ausgelieferte CMS).
// Das Login verlinkt auf ./anleitung.html#zugangsschluessel.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { CSP } from './csp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'docs/ANLEITUNG.md');
const IMAGES = resolve(root, 'docs/bilder');

// Kleine, in sich geschlossene Seite; Farben wie in src/styles.css. Kein externes Laden.
const STYLE = `
:root { --bg:#fbfbfc; --ink:#1b1b1f; --ink-2:#4a4d55; --ink-3:#6a6d75; --accent:#b2156d; --line-ui:#8f8d76; --line-soft:#dddcd1; --surface-2:#f3f4f7; }
@media (prefers-color-scheme: dark) { :root { --bg:#16181d; --ink:#f3f4f7; --ink-2:#b8bcc6; --ink-3:#9a9ea8; --accent:#ff6bb5; --line-soft:#3a3d45; --surface-2:#22252c; } }
body { margin:0; background:var(--bg); color:var(--ink); font:500 1rem/1.6 'Helvetica Neue', Helvetica, Arial, sans-serif; }
main { max-width:44rem; margin:0 auto; padding:1rem 16px 4rem; }
h1, h2, h3 { font-weight:800; line-height:1.25; }
a { color:var(--accent); }
a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
img { max-width:100%; height:auto; border:1px solid var(--line-ui); }
code { background:var(--surface-2); padding:0 0.25em; border-radius:4px; }
/* Platzhalter für noch fehlende Screenshots */
.bild-folgt { display:flex; align-items:center; justify-content:center; box-sizing:border-box; width:100%; max-width:640px; aspect-ratio:16 / 9; margin:1rem 0; padding:1rem; border:2px dashed var(--line-soft); border-radius:10px; color:var(--ink-3); text-align:center; }
blockquote { margin:1rem 0; padding:0.25rem 1rem; border-left:4px solid var(--line-ui); color:var(--ink-2); }
`;

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Rohes HTML im Markdown wird als Text ausgegeben; einzige Ausnahme: Sprungmarken <a id="name"></a>.
// (Block oder Inline: marked liefert <a id="x"> und </a> teils einzeln.)
const ANCHOR = /^\s*(<a id="[a-z0-9-]+">|<\/a>|<a id="[a-z0-9-]+"><\/a>)\s*$/;
// Links: nur https:, mailto: und relative Ziele (ohne Schema); alles andere wird zu Text.
const SAFE_HREF = /^(https:|mailto:|(?!\/\/)[^:]*$)/i;
const renderer = {
  html: ({ text }) => (ANCHOR.test(text) ? text : escapeHtml(text)),
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    if (!SAFE_HREF.test(String(href ?? '').trim())) return text;
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href)}"${t}>${text}</a>`;
  },
};
// Bilder: nur Dateien direkt in docs/bilder. Fehlt die Datei (Screenshots folgen noch),
// erscheint ein ruhiger Platzhalter statt eines kaputten Bildes.
const IMAGE_SRC = /^bilder\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif))$/;
const fileInImages = (name) => existsSync(resolve(IMAGES, name));
const imageRenderer = (imageExists) => ({
  image({ href, text }) {
    const alt = escapeHtml(String(text ?? ''));
    const name = IMAGE_SRC.exec(String(href ?? '').trim())?.[1];
    if (name && imageExists(name)) return `<img src="bilder/${name}" alt="${alt}" loading="lazy">`;
    return `<figure class="bild-folgt"><span>Bild folgt: ${alt}</span></figure>`;
  },
});

// options.imageExists(name): ob docs/bilder/<name> existiert (Standard: Dateisystem; für Tests ersetzbar).
export function renderAnleitung(markdown, { imageExists = fileInImages } = {}) {
  const marked = new Marked({ renderer: { ...renderer, ...imageRenderer(imageExists) } });
  // Ein Platzhalter allein im Absatz: <figure> darf nicht in <p> stehen.
  const body = marked.parse(markdown, { async: false })
    .replace(/<p>(<figure class="bild-folgt">.*?<\/figure>)<\/p>/g, '$1');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(CSP)}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anleitung – ZDL CMS</title>
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
