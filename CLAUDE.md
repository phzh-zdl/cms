# CLAUDE.md

## Zweck

Browserbasiertes CMS (Vite + React 18, statisch, später GitHub Pages) zum Bearbeiten der
Inhalte des PHZH-OER-Katalogs (`oer-dashboard`) über die GitHub-API. Spec und Plan: `docs/superpowers/`.

## Global Constraints

- Keine Installation beim Team, kein eigener Server; einzige externe Verbindung des CMS: `https://api.github.com` (CSP `connect-src`).
- Alle Abhängigkeiten gebündelt, kein CDN; Schrift MarkWeb lokal (aus `oer-dashboard/src/assets/fonts/` kopiert, Nutzung freigegeben).
- Token: fine-grained PAT, nur „Contents: Read and write" + „Metadata: Read", Organisation `phzh-zdl`. Standard `sessionStorage`, optional „auf diesem Gerät merken" (`localStorage`). Abmelden löscht ihn. **Claude gibt nie selbst einen echten Token ein** — Browser-Tests mit Token macht der User.
- Kein Git-Vokabular in der Oberfläche (kein „Commit", „Merge", „SHA", „Branch", „Pull"). Oberfläche Deutsch.
- Speichern direkt auf `main`, nie Force-Push, nie Branches löschen.
- Bilder: Eingabe nur PNG/JPEG/WebP/GIF (Magic Bytes), max. 5 MB; Ausgabe WebP, Breite max. 800 px, Qualität 0.8, Format 5:3; Warnung unter 640 px Breite; „Ganzes Bild zeigen" = mittig auf Fläche in Fachbereichsfarbe; kein Original speichern; nie SVG.
- Inhaltsdateien schreiben im Format von Teil 1: JSON, 2 Leerzeichen, abschliessender Zeilenumbruch, Feldreihenfolge wie bisher.
- Rich-Text = bereinigtes HTML, Allowlist `p h2 h3 h4 strong em ul ol li a table thead tbody tr th td details summary br`, nur `href` an `a`; Links nur https (safeHttps), `mailto:`, relativ.
- Löschregeln: Fachbereich in Gebrauch → nur mit Umhängen; Format/Zielstufe → aus Ressourcen entfernen (mit Hinweis „wird aus N Ressourcen entfernt"); Lizenz → `license_id: null` (mit Hinweis).
- Barrierefreiheit WCAG 2.1 AA wie `oer-dashboard/docs/BARRIEREFREIHEIT.md` (Labels, Tastatur, Fokus, Kontraste, `--ink-4` nie für Text).
- Entwicklung gegen das Test-Repo `phzh-zdl/cms-test` (Kopie von oer-dashboard, privat), nie gegen echte Inhalte, bis Task 14 abgenommen ist.
- Commits nur nach Go; **nie pushen ohne ausdrückliche Bestätigung des Users** (Push macht der User per `! git push`).

## Running it

```bash
npm install
npm run dev     # localhost:5174
npm test
npm run build   # erzeugt dist/
```
