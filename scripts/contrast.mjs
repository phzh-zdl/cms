// Rechnet WCAG-2.1-Kontraste fuer die Farbpaare des CMS (src/styles.css).
// Aufruf: node scripts/contrast.mjs   (Exit-Code 1, wenn ein Paar durchfaellt)
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [Verwendung, Vordergrund, Hintergrund, Mindestwert]  (4.5 Text, 3 Bedienelemente/Fokus)
const pairs = [
  ['Fliesstext (--ink)', '#1b1b1f', '#fbfbfc', 4.5],
  ['Fliesstext auf weiss', '#1b1b1f', '#ffffff', 4.5],
  ['Labels, Zaehler (--ink-2)', '#4a4d55', '#fbfbfc', 4.5],
  ['Hinweise (--ink-3)', '#6a6d75', '#fbfbfc', 4.5],
  ['Hinweise (--ink-3) auf weiss', '#6a6d75', '#ffffff', 4.5],
  ['Links (--accent) auf Hintergrund', '#b2156d', '#fbfbfc', 4.5],
  ['Links (--accent) auf weiss', '#b2156d', '#ffffff', 4.5],
  ['Fehlertext (--danger) auf Hintergrund', '#a32c22', '#fbfbfc', 4.5],
  ['Fehlertext (--danger) auf weiss', '#a32c22', '#ffffff', 4.5],
  ['Fehlertext (--danger) auf --danger-bg', '#a32c22', '#fdeeec', 4.5],
  ['Erfolg (--ok) auf Hintergrund', '#1f6b3a', '#fbfbfc', 4.5],
  ['Warnung (--warn) auf Hintergrund', '#8a4a12', '#fbfbfc', 4.5],
  ['Aktiver Umschalter: weiss auf --ink', '#ffffff', '#1b1b1f', 4.5],
  ['Dialog-Text #111 auf weiss', '#111111', '#ffffff', 4.5],
  ['Geaenderte Zeile #111 auf #fff4cc', '#111111', '#fff4cc', 4.5],
  ['Geaenderte Zeile #1b1b1f auf #fff4cc', '#1b1b1f', '#fff4cc', 4.5],
  ['Rahmen Bedienelemente (--line-ui) auf weiss', '#8f8d76', '#ffffff', 3],
  ['Rahmen Bedienelemente (--line-ui) auf Hintergrund', '#8f8d76', '#fbfbfc', 3],
  ['Fehlerrahmen (--danger) auf weiss', '#a32c22', '#ffffff', 3],
  ['Fokusrahmen (--accent) auf Hintergrund', '#b2156d', '#fbfbfc', 3],
  ['Fokusrahmen (--accent) auf weiss', '#b2156d', '#ffffff', 3],
  ['Markierung "geaendert" (Rand #8a6d00) auf #fff4cc', '#8a6d00', '#fff4cc', 3],
  ['Dekoration: --ink-4 (nie fuer Text)', '#8a8d95', '#ffffff', 0],
  ['Dekoration: --line (nie fuer Bedienelemente)', '#bebca6', '#ffffff', 0],
];

if (process.argv[1]?.endsWith('contrast.mjs')) {
  let failed = 0;
  for (const [what, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.toFixed(1).padStart(5)}:1 (min ${min || '-'})  ${what}  ${fg} auf ${bg}`);
  }
  process.exit(failed ? 1 : 0);
}
