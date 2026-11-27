// Muss mit oer-dashboard/src/lib/sanitize.js übereinstimmen.
import DOMPurify from 'dompurify';
import { safeHttps } from './safeHttps.js';

// Bereinigt formatierten Text (Textseiten aus content/pages/*.json), bevor er
// angezeigt wird. Allowlist laut Konzept (§5.3 „Formatierter Text"):
// nur einfache Struktur, Tabellen, aufklappbare Abschnitte und Links.
// Greift auch dann, wenn jemand eine Datei direkt in GitHub bearbeitet.
const ALLOWED_TAGS = ['p', 'h2', 'h3', 'h4', 'strong', 'em', 'ul', 'ol', 'li', 'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'br'];
const ALLOWED_ATTR = ['href'];

// Erlaubte Linkziele: https (über safeHttps), mailto:, oder relativ ohne
// Schema (z.B. "impressum.html", "#katalog"). Alles andere fliegt raus.
function checkHref(href) {
  const h = String(href || '').trim();
  if (safeHttps(h)) return { href: safeHttps(h), external: true };
  if (/^mailto:/i.test(h)) return { href: h, external: false };
  if (h && !/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith('//')) return { href: h, external: false };
  return null;
}

let hooked = false;
function ensureHook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName !== 'A') return;
    // target/rel nie aus dem Quelltext übernehmen — nur selbst setzen.
    node.removeAttribute('target');
    node.removeAttribute('rel');
    const ok = checkHref(node.getAttribute('href'));
    if (!ok) {
      node.removeAttribute('href');
      return;
    }
    node.setAttribute('href', ok.href);
    if (ok.external) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizeHtml(html) {
  ensureHook();
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // target/rel setzt der Hook selbst; sie dürfen den Filter passieren
    ADD_ATTR: ['target', 'rel'],
    KEEP_CONTENT: true,
  });
}
