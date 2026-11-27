import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize.js';

// Hilfsfunktion: bereinigtes HTML als DOM, um gezielt zu prüfen.
const dom = (html) => {
  const d = document.createElement('div');
  d.innerHTML = sanitizeHtml(html);
  return d;
};

describe('sanitizeHtml', () => {
  it('removes scripts, iframes, images, styles and event/style/class attributes but keeps text', () => {
    const d = dom('<p class="x" style="color:red" onclick="alert(1)">Hallo</p><script>alert(1)</script><iframe src="https://x.ch"></iframe><img src="x.png" onerror="alert(1)"><style>p{}</style>');
    expect(d.querySelector('script, iframe, img, style')).toBeNull();
    const p = d.querySelector('p');
    expect(p.textContent).toBe('Hallo');
    expect(p.getAttribute('onclick')).toBeNull();
    expect(p.getAttribute('style')).toBeNull();
    expect(p.getAttribute('class')).toBeNull();
  });

  it('drops javascript: and data: links but keeps the link text', () => {
    const d = dom('<p><a href="javascript:alert(1)">eins</a> <a href="data:text/html,x">zwei</a></p>');
    for (const a of d.querySelectorAll('a')) expect(a.hasAttribute('href')).toBe(false);
    expect(d.textContent).toContain('eins');
    expect(d.textContent).toContain('zwei');
  });

  it('keeps allowed structure: headings, tables, details, strong, lists', () => {
    const d = dom('<h2>T</h2><table><thead><tr><th>K</th></tr></thead><tbody><tr><td>W</td></tr></tbody></table><details><summary>Mehr</summary><p>X</p></details><p><strong>f</strong></p><ul><li>a</li></ul>');
    for (const sel of ['h2', 'table thead tr th', 'tbody tr td', 'details summary', 'strong', 'ul li']) {
      expect(d.querySelector(sel)).not.toBeNull();
    }
  });

  it('opens external https links in a new tab with rel noopener', () => {
    const a = dom('<a href="https://phzh.ch">PHZH</a>').querySelector('a');
    expect(a.getAttribute('href')).toBe('https://phzh.ch');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps mailto and relative links without target', () => {
    const d = dom('<a href="mailto:a@b.ch">Mail</a><a href="impressum.html">Impressum</a>');
    const [mail, rel] = d.querySelectorAll('a');
    expect(mail.getAttribute('href')).toBe('mailto:a@b.ch');
    expect(rel.getAttribute('href')).toBe('impressum.html');
    expect(mail.hasAttribute('target')).toBe(false);
    expect(rel.hasAttribute('target')).toBe(false);
  });

  it('strips author-supplied target and rel from internal and removed links', () => {
    const d = dom('<a href="impressum.html" target="_top" rel="opener">I</a><a href="javascript:x" target="_blank">J</a>');
    for (const a of d.querySelectorAll('a')) {
      expect(a.hasAttribute('target')).toBe(false);
      expect(a.hasAttribute('rel')).toBe(false);
    }
  });

  it('removes h1 but keeps its text', () => {
    const d = dom('<h1>Gross</h1>');
    expect(d.querySelector('h1')).toBeNull();
    expect(d.textContent).toContain('Gross');
  });
});
