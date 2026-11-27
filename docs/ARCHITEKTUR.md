# Architektur

Dieses Dokument richtet sich an PH-Entwickler:innen. Für die Bedienung siehe
[`ANLEITUNG.md`](ANLEITUNG.md), für die Sicherheitsbetrachtung [`SICHERHEIT.md`](SICHERHEIT.md),
für Barrierefreiheit [`BARRIEREFREIHEIT.md`](BARRIEREFREIHEIT.md).

## 1. Überblick

Das CMS ist eine statische Single-Page-App (Vite + React 18). Es läuft komplett im Browser
und spricht über `https://api.github.com` mit den Inhalts-Repos. Es gibt keinen eigenen
Server und keine Datenbank. Zur Laufzeit gibt es keine weitere externe Verbindung
(CSP `connect-src 'self' https://api.github.com`, siehe `vite.config.js`).

```
 Browser ── lädt ──► GitHub Pages (dist/ des Repos phzh-zdl/cms)
    │
    │ Zugangsschlüssel (fine-grained PAT, Contents rw + Metadata r)
    ▼
 api.github.com ──► Inhalts-Repo (privat, z. B. phzh-zdl/oer-dashboard)
                      ├─ cms.json                 Beschreibung der Inhalte und Masken
                      ├─ <contentRoot>/*.json     Inhalte (Sammlungen, Textseiten)
                      ├─ <contentRoot>/images/    Bilder
                      └─ Zweig `build`            fertige Seiten-Hülle (für den Export)
```

Eine Seite wird verbunden, indem im Wurzelordner ihres Repos eine `cms.json` liegt
(siehe Abschnitt 5 und 7). Das CMS listet alle Repos der Organisation `phzh-zdl`, auf die
der Schlüssel Zugriff hat und die eine `cms.json` enthalten (ist sie fehlerhaft, erscheint
das Repo mit der Fehlermeldung).

## 2. Ordner

| Pfad | Inhalt |
|---|---|
| `src/main.jsx`, `src/App.jsx` | Einstieg; Phasen Prüfen/Anmelden/Seitenwahl, gewählte Seite im URL-Hash `#/<owner>/<repo>` |
| `src/auth/` | Zugangsschlüssel in `sessionStorage` (Standard) oder `localStorage` („merken") |
| `src/github/client.js` | Schlanker GitHub-API-Client (`fetch`), Fehlerklassen `GitHubError`, `AuthError`, `ConflictError` |
| `src/config/cmsConfig.js` | Liest und prüft `cms.json`, deutsche Fehlermeldungen |
| `src/content/` | `site.js` (Seiten finden, laden), `siteHash.js` (Hash-Routing), `deleteRules.js` (Löschregeln `planDelete`/`applyDelete`) |
| `src/fields/` | Feld-Typen: je Typ ein Modul (`Editor`, `validate`, `empty`), `registry.js` (Register, `validateEntry`, `newEntry`), `rules.js` (reine Prüfregeln) |
| `src/editor/` | Sammlungsliste (`CollectionView`), Formular (`EntryForm`), Textseite (`PageEditor`), `SaveBar`, Dialoge `DeleteDialog`, `ConflictDialog` |
| `src/save/` | Speichern und Zusammenführen: `saveChanges.js` (Git Data API), `merge.js` (Drei-Wege), `ancestor.js` (Vergleichsbasis), `drafts.js` + `useDraftAutosave.js` (Entwürfe), `serialize.js` (Dateiformat), `commitMessage.js`, Hooks `useSiteWorkingCopy`, `useConflictSave` |
| `src/images/` | Bild-Pipeline: `detect.js` (Magic Bytes), `CropDialog.jsx` (5:3-Zuschnitt, „Ganzes Bild zeigen"), `encode.js` (WebP, max. 800 px, Qualität 0.8) |
| `src/richtext/` | Rich-Text: `sanitize.js` (DOMPurify, Allowlist), `safeHttps.js`, `linkTarget.js`, Werkzeugleiste und Link-Formulare |
| `src/export/` | `buildZip.js` (ZIP im Browser mit `fflate`), `shell.js` (Hülle laden, gemeinsam mit der Vorschau), `download.js` |
| `src/preview/`, `public/vorschau/` | Vorschau: `files.js` (Dateien aus dem Arbeitsstand), `cache.js` (Cache Storage); `sw.js` + `handler.js` (Service Worker, reines JS ohne Build) |
| `src/history/` | `history.js`, letzte Änderungen als Liste |
| `src/screens/` | `Login`, `SiteList`, `SiteEditor`, `ExportPanel`, `HistoryPanel`, `PreviewPanel` |
| `src/styles.css`, `src/assets/fonts/` | Styles mit Tokens, Hausschrift MarkWeb (lokal, kein CDN) |
| `scripts/` | `check-workflows.mjs` (Workflow-Struktur), `simulate-mirror.sh`, `contrast.mjs` (WCAG-Kontraste), `anleitungPage.js` (Vite-Plugin) |
| `backup/` | Dateien für das separate Backup-Repo (siehe „Deployment und Sicherung") |
| `docs/` | Diese Dokumentation; `docs/superpowers/` enthält Entwurf und Umsetzungsplan |
| `.github/` | `workflows/audit.yml` (Tests, `npm audit`, Build), `workflows/pages.yml` (Veröffentlichung), `dependabot.yml` |

`docs/ANLEITUNG.md` wird beim Bauen (`npm run build`) vom Vite-Plugin `scripts/anleitungPage.js`
in `dist/anleitung.html` umgewandelt (die Anmeldeseite verlinkt `./anleitung.html#zugangsschluessel`).
`marked` ist dafür nur devDependency; im ausgelieferten CMS steckt kein Markdown-Code.
Screenshots liegen in `docs/bilder/` und werden nach `dist/bilder/` kopiert.

## 3. Datenfluss

### Laden

1. `loadSite` (`src/content/site.js`) liest den Stand von `main`: `getRef` liefert den Kopf, daraus
   wird `cms.json` gelesen und mit `parseCmsConfig` geprüft.
2. Alle in `cms.json` genannten Dateien (Sammlungen, Textseiten) werden unter
   `<contentRoot>/` gelesen und als `original` (Rohtext), `data` (Sammlungen) und `pages`
   (Textseiten) gehalten. `headSha` ist der Stand, auf dem die Arbeit aufbaut.
3. Ist ein Entwurf (`cms.draft.<repo>` in `localStorage`) vorhanden, fragt das CMS, ob er
   wiederhergestellt werden soll. Ist `baseSha` des Entwurfs älter als der Kopf, folgt der
   Hinweis „Diese Seite wurde seit dem Öffnen von … geändert.".

### Speichern

`saveChanges` (`src/save/saveChanges.js`) schreibt alle Änderungen (Inhalte, neue Bilder,
gelöschte Dateien) in **einem** Commit auf `main`. Reihenfolge (Git Data API):

1. `getCommit(baseSha)` liefert den Tree-SHA, `getTree` (rekursiv) die vorhandenen Pfade.
2. Pro geänderter Datei `createBlob`; gelöschte Dateien werden als `sha: null` eingetragen
   (nur wenn es sie im Basis-Tree gibt).
3. `createTree(base_tree, Einträge)`, dann `createCommit(message, tree, parent = baseSha)`.
4. `updateRef('main', commit)` mit `force: false`.

Das Ref-Update schlägt als `ConflictError` (kein Fast-Forward) fehl, wenn inzwischen jemand
gespeichert hat. Das CMS pusht nie mit Force und löscht nie Zweige. Die Commit-Nachricht kommt
aus `commitMessage.js`. Das Dateiformat ist JSON mit 2 Leerzeichen, abschliessendem
Zeilenumbruch und unveränderter Feldreihenfolge (`serialize.js`), damit Diffs minimal bleiben.

### Konflikte

`useConflictSave` fängt `ConflictError` ab und führt zusammen (`merge.js`, `ancestor.js`):

1. Neuen Stand von `main` laden (`loadContentAt`); das ist `theirs`.
2. **Drei-Wege-Zusammenführung** mit `base` (Stand beim Öffnen), `mine` (Arbeitsstand) und `theirs`.
   Je Datei zuerst als Ganzes: hat nur eine Seite sie geändert, gilt deren Fassung
   („Abkürzung pro Datei", auch bei Reihenfolge und Einträgen ohne Kennung).
3. Haben beide die Datei geändert, wird **pro Eintrag** über die Kennung (`key`, Standard `id`)
   zusammengeführt: Einträge, die nur eine Seite geändert hat, werden übernommen, nur
   Einträge, die beide geändert haben, sind Konflikte. Fehlen eindeutige Kennungen, wirft
   `mergeSite` einen `UnmergeableError` und es wird nichts still überschrieben. Textseiten sind je ein
   Eintrag.
4. `ConflictDialog` zeigt je Konflikt beide Fassungen; die Auswahl wird mit `applyChoices` eingesetzt
   und das Speichern wiederholt (mit dem neuen Kopf als Basis).
5. **Vergleichsbasis pro Eintrag (`rebaseState`):** Wird während des Speicherns weiter
   bearbeitet, bleibt für genau diese Einträge die Fassung vom Klick die Basis des nächsten
   Speicherns („ancestor"). So wird nichts still überschrieben.
6. Wird der Dialog abgebrochen, bleibt der Arbeitsstand erhalten. Ändert sich `main` laufend,
   bricht das Speichern nach `MAX_ATTEMPTS` (3) Versuchen mit einer Meldung ab (`MSG_BUSY`).

### Export

`buildExportZip` (`src/export/buildZip.js`) erzeugt im Browser ein ZIP:

- **Hülle:** Dateien des Zweigs `export.shell` (Standard `build`, gebaut von der Action der
  Seite), ausser `content/`.
- **Inhalte:** alle Dateien unter `contentRoot/` aus `main`, im ZIP unter `content/`.
- Der Export ist nur freigegeben, wenn nichts ungespeichert ist. Dateiname:
  `<zipName>-<YYYY-MM-DD>.zip`. Fehlt der Zweig, erscheint „Die Seite wurde noch nicht gebaut.".

### Vorschau

Der Knopf „Vorschau (neues Fenster)" zeigt die fertige Seite mit dem **aktuellen Arbeitsstand,
auch ungespeichert**. Kein Server, nichts wird veröffentlicht.

1. `PreviewPanel` (`src/screens/`) registriert den Service Worker `public/vorschau/sw.js`
   (Scope `./vorschau/`; das Skript liegt im Scope, weil GitHub Pages keinen
   `Service-Worker-Allowed`-Header setzen kann) und wartet, bis er aktiv ist (`skipWaiting` und
   `clients.claim()`, damit die erste Vorschau ohne Neuladen klappt). `serviceWorker.ready` taugt
   hier nicht: es bezieht sich auf den Scope der Seite, nicht auf `./vorschau/`.
2. `buildPreviewFiles` (`src/preview/files.js`) stellt die Dateien zusammen: Hülle des Zweigs
   `export.shell` (gemeinsamer Code mit dem Export in `src/export/shell.js`, 6er-Pool, im
   Speicher pro Build-Stand zwischengespeichert). Als Basis dienen **alle Dateien unter `contentRoot/`
   im aktuellen `main`** (wie beim Export, also auch nicht konfigurierte Dateien und nicht
   referenzierte Bilder; das deckt auch den Entwurf mit abweichendem `headSha` ab). Darüber liegt der
   Arbeitsstand: konfigurierte Sammlungen und Textseiten mit `serializeJson` (dieselbe Funktion wie
   beim Speichern), neu hochgeladene Bilder aus `newImages`; in `removedFiles` Genanntes fällt weg.
   In jede HTML-Datei kommt ein Hinweisband.
3. `fillPreviewCache` (`src/preview/cache.js`) leert den Cache `zdl-vorschau` und legt die Dateien
   unter `<Basis>/vorschau/<repo-name>/<Pfad>` ab. Das Fenster öffnet `…/index.html`.
4. Der Service Worker (Logik in `public/vorschau/handler.js`, Tests in `src/preview/`) liefert nur aus
   dem Cache (sonst 404 „Diese Datei ist in der Vorschau nicht enthalten.") und setzt auf jede
   Antwort eine CSP ohne `api.github.com` (mit `frame-src 'none'; child-src 'none'; worker-src 'none'`) sowie
   `Cache-Control: no-store`; Schreib-Anfragen im Scope beantwortet er mit 405.
5. Beim Abmelden löscht `App.jsx` den Cache (`clearPreviewCache`, wird abgewartet). Eine Laufnummer in
   `src/preview/cache.js` sorgt dafür, dass nur der neueste Lauf den Cache beschreibt: ein veralteter
   Lauf oder ein Lauf, der beim Abmelden noch unterwegs ist, legt nichts mehr ab. Während ein Lauf
   arbeitet, ist der Knopf „Vorschau" gesperrt (`aria-disabled`).
6. `src/boot.js`: das CMS startet nicht, wenn es in einem fremden Rahmen (iframe) läuft
   („Das ZDL CMS kann nicht eingebettet werden.").

## 4. Sicherheitsrelevante Bausteine

- **CSP** als `<meta>` nur im Build (GitHub Pages setzt keine Header): `script-src 'self'`,
  `connect-src 'self' https://api.github.com`, `object-src 'none'`.
- **Sanitizer** (`src/richtext/sanitize.js`, DOMPurify): erlaubt `p h2 h3 h4 strong em ul ol li a table thead tbody tr th td details summary br`, am `a` nur `href`. Wird auf die Ausgabe des Editors
  und in der Vorschau angewandt; die Vorschau ist die einzige Stelle mit `dangerouslySetInnerHTML`.
- **Links:** nur `https://` (über `safeHttps`), `mailto:` und relative/interne Links.
- **Bilder:** Magic-Byte-Prüfung, max. 5 MB, immer neu kodiert zu WebP; SVG nie.
- **Abhängigkeiten:** alle gebündelt; Dependabot wöchentlich, `npm audit --audit-level=high` in der CI.

## 5. `cms.json`-Referenz

Eine `cms.json` im Wurzelordner des Inhalts-Repos beschreibt Inhalte und Masken. Sie wird beim
Öffnen mit `parseCmsConfig` geprüft (deutsche Fehlermeldung bei Verstoss).

```jsonc
{
  "name": "OER-Katalog",                 // Anzeigename in der Seitenauswahl (Pflicht)
  "export": { "shell": "build", "zipName": "oer-katalog" },  // Pflicht: Zweig mit fertiger Seite, ZIP-Präfix
  "contentRoot": "public/content",       // Pflicht: Ordner der Inhaltsdateien im Repo
  "collections": [ /* Listen von Einträgen, mindestens eine */ ],
  "pages": [ /* Textseiten, optional */ ]
}
```

### Sammlung (`collections[]`)

| Schlüssel | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | Eindeutige Kennung der Sammlung |
| `label` | nein | Anzeigename (Standard: `id`) |
| `file` | ja | Datei relativ zu `contentRoot`, enthält ein JSON-Array |
| `key` | nein | Feld, das einen Eintrag eindeutig kennzeichnet (Standard `id`) |
| `idField` | nein | `{ "type": "uuid" }`: neue Einträge erhalten sofort eine UUID; `{ "type": "slug" }`: die Kennung entsteht aus dem Titel |
| `titleField` | ja | Feld, das in Listen und Dialogen als Titel dient |
| `sortBy` | nein | Feld für die Reihenfolge der Liste (danach nach Titel) |
| `fields` | ja | Liste der Felder (siehe unten) |
| `onDelete` | nein | Löschregeln (siehe unten) |

### Feld (`fields[]`)

Gemeinsame Schlüssel: `name` (Pflicht, Name in der JSON-Datei), `type` (Pflicht), `label`
(Standard: `name`), `required` (Pflichtfeld). Typen:

| Typ | Wert in der Datei | Zusätzliche Optionen und Regeln |
|---|---|---|
| `text` | Text | `maxLength` |
| `textarea` | Text, mehrzeilig | `maxLength` (mit Zeichenzähler) |
| `slug` | Text `^[a-z0-9_-]{1,32}$` | Kennung, in der Sammlung eindeutig; nur bei neuen Einträgen änderbar |
| `uuid` | UUID-Text | schreibgeschützt, wird beim Anlegen erzeugt (`idField.type: "uuid"`) |
| `color` | `#rrggbb` | Farbwähler plus Textfeld |
| `url-https` | Text, muss mit `https://` beginnen | |
| `boolean` | `true` / `false` | |
| `number` | Zahl oder `null` | |
| `reference` | Kennung | **`to`** (Pflicht): Ziel-Sammlung; Auswahl, Prüfung auf Existenz |
| `reference-multi` | Array von Kennungen | **`to`** (Pflicht); Mehrfachauswahl |
| `image` | Dateiname | **`dir`**: Ordner unter `contentRoot`; **`colorFrom`**: Name eines `reference`-Feldes, dessen Ziel eine `color` hat (Hintergrundfarbe für „Ganzes Bild zeigen") |
| `richtext` | bereinigtes HTML (Text) | **`toolbar`**: `basic` oder `full` (siehe unten) |

### Textseite (`pages[]`)

Eine Datei, ein Eintrag mit den Feldern `title` und `html`. Schlüssel: `id` (Pflicht), `file`
(Pflicht, relativ zu `contentRoot`), `label` (Standard `id`), `toolbar` (`basic` als
Standard, oder `full`). Konflikte bei Textseiten: die ganze Seite ist ein Eintrag.

### Löschregeln (`onDelete[]`)

Liegt an der Sammlung, **auf die verwiesen wird**: `{ "referencedBy": "<sammlung>.<feld>", "mode": "…" }`.

| `mode` | Wirkung beim Löschen | Hinweis in der Oberfläche |
|---|---|---|
| `reassign` | Verweisende Einträge müssen auf einen anderen Eintrag umgehängt werden, sonst kein Löschen | „… wird von N … verwendet. Wählen Sie, wohin sie verschoben werden" |
| `remove` | Die Kennung wird aus dem Array (`reference-multi`) entfernt | „Wird aus N … entfernt." |
| `nullify` | Das Feld wird auf `null` gesetzt | „N … verlieren diese …" |

Haben mehrere Regeln Betroffene, gewinnt die strengste (`reassign` vor `remove` vor `nullify`).
`parseCmsConfig` prüft, dass `referencedBy` auf eine bekannte Sammlung und ein bekanntes Feld zeigt.

### Werkzeugleiste (`toolbar`)

`basic`: Absatz, Zwischentitel H2 und H3, fett, kursiv, Aufzählung, nummerierte Liste, Link.
`full` zusätzlich: Zwischentitel H4, Tabelle, aufklappbarer Abschnitt (`<details>`) und
„Link auf andere Seite" (Auswahl unter den Textseiten).

## 6. Neuen Feld-Typ ergänzen

1. **Modul** `src/fields/<typ>.jsx` mit Default-Export `{ Editor, validate, empty }`:
   - `Editor({ field, value, onChange, ctx, error })` rendert das Feld; Label, Fehlertext und
     `aria-invalid` / `aria-describedby` kommen über `FieldFrame` und `aria()` aus `FieldFrame.jsx`.
   - `validate(value, field, ctx)` liefert eine deutsche Meldung oder `null`. Gemeinsame Regeln
     liegen in `rules.js` (`requiredCheck`, `maxLengthError`).
   - `empty`: Leerwert (`''`, `null`, `[]`, `false`). Arrays werden bei neuen Einträgen kopiert.
2. **Registrieren** in `src/fields/registry.js` (Import und Eintrag in `fieldTypes`) und den
   Namen in `FIELD_TYPES` von `src/config/cmsConfig.js` ergänzen. Braucht der Typ Pflicht-Optionen
   (wie `to`), die Prüfung in `parseField` ergänzen.
3. **Test:** Prüfregel in `registry.test.js` oder einer eigenen Testdatei; den Editor wie in
   `ImageField.test.jsx` mit `react-dom` und `act` rendern (Label, Fehlerzuordnung, Tastatur). Die
   Checkliste in [`BARRIEREFREIHEIT.md`](BARRIEREFREIHEIT.md) gilt für jedes neue Feld.
4. **Konflikt-Anzeige:** `ConflictDialog` stellt Werte als Text dar; bei neuen Wertformen
   (Objekte) dort eine lesbare Darstellung ergänzen.

## 7. Neue Seite anbinden

1. Im Repo der Seite die Inhalte als JSON-Dateien unter einem `contentRoot` ablegen. Die Seite
   lädt sie zur Laufzeit per `fetch` mit **relativen Pfaden**, damit Inhaltsänderungen keinen
   neuen Build brauchen und der Export als ZIP in jedem Unterordner läuft.
2. `cms.json` im Wurzelordner anlegen (Abschnitt 5). Das Dateiformat beibehalten: JSON,
   2 Leerzeichen, abschliessender Zeilenumbruch.
3. Eine GitHub-Action baut den Quellcode bei Änderungen am Code und legt das Ergebnis auf den
   Zweig aus `export.shell` (Standard `build`). Inhaltsänderungen lösen keinen Build aus.
4. Das Repo muss in der Organisation `phzh-zdl` liegen (nur diese werden gelistet); die
   Schlüssel der Teammitglieder müssen es freigeben.
5. Neues Repo in `backup/.github/workflows/mirror.yml` unter `matrix.repo` eintragen und dem
   Sicherungsschlüssel Zugriff geben.

**Hinweise zur zweiten Seite „Impuls"** (Prototyp, Daten von rund 735 KB in einer Datei,
noch nicht angebunden). Dafür muss das CMS erweitert werden; vorgesehen ist:

- **`richtext` im vollen Umfang** (`toolbar: full`): Tabellen, H2 bis H4, `<details>`, interne
  Links. Bereits umgesetzt.
- **Neue Feld-Typen** (nach Abschnitt 6): `select` (zum Beispiel Redaktionsstatus), `tags`
  (Mehrfachauswahl aus fester Liste, zum Beispiel Zielgruppen), `reference-ordered`
  (geordnete Verweisliste mit Umsortieren, für Lernpfade und Karussell), `repeater`
  (wiederholbare Unterblöcke, zum Beispiel Quellen). **Noch nicht umgesetzt.**
- **Eine Datei pro Eintrag** (`"storage": "per-entry"`, zum Beispiel `pages/<id>.json`): bei
  rund 94 langen Seiten weniger Konflikte und schnelleres Laden. **Noch nicht umgesetzt**; der
  Katalog bleibt bei einer Datei pro Sammlung.
- **Abgeleitete Felder** wie Inhaltsverzeichnis, Wortzahl und Kurztext sollte die Seite aus dem
  Text berechnen statt sie zu speichern, damit sie nicht veralten.
- **Browser-Speicher:** Impuls speichert den Lesefortschritt in `localStorage`. Das ist im
  Sicherheitsdokument für diese Seite zu nennen; die Aussage „speichert nichts im Browser"
  gilt nur für den OER-Katalog.
- Impuls ist kein React-Projekt (Vanilla-JS). Das ist für das CMS egal: Es bearbeitet nur Dateien,
  die Seite muss lediglich ihre Inhalte wie in Teil 1 aus Dateien laden.
- Der Name des CMS ist „ZDL CMS" (Anmeldeseite, Titel der Seite und Dokumente); er ist nicht an den OER-Katalog gebunden.

## 8. Lokal starten und testen

```bash
npm install
npm run dev        # http://localhost:5174; /anleitung.html wird live aus docs/ANLEITUNG.md erzeugt
npm test           # Vitest (jsdom)
npm run build      # erzeugt dist/ inkl. dist/anleitung.html
npm audit --audit-level=high
node scripts/contrast.mjs        # WCAG-Kontraste der Farbpaare
node scripts/check-workflows.mjs
```

Mit einem echten Schlüssel nur gegen das Test-Repo `phzh-zdl/cms-test` arbeiten, nicht gegen
Echtinhalte. Node 20 oder neuer. Die Tests laufen ohne Schlüssel und ohne Netzwerk (gemockte Aufrufe).

## Deployment und Sicherung

Das CMS wird bei jedem Push auf `main` automatisch auf GitHub Pages veröffentlicht
(`.github/workflows/pages.yml`). Die Inhalts-Repos werden nachts in ein privates
Backup-Repo gespiegelt (`backup/.github/workflows/mirror.yml`). Einmalig einzurichten:

### 1. CMS-Repo anlegen und pushen

Auf github.com → New repository → Owner `phzh-zdl`, Name `cms`, **Public**, ohne README.
Dann lokal `git remote add origin https://github.com/phzh-zdl/cms.git` und `git push -u origin main`.

*Wozu:* GitHub Pages ist für Organisations-Repos nur bei öffentlichen Repos kostenlos. Der Code
enthält keine Geheimnisse.
*Du müsstest jetzt* den Code unter https://github.com/phzh-zdl/cms sehen und im Tab Actions
einen Lauf "audit + build" (und einen fehlschlagenden "pages", solange Schritt 2 fehlt).

### 2. Pages auf "GitHub Actions" stellen

Repo `cms` → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
Danach Actions → "pages" → "Run workflow" (oder einen neuen Push auf `main`).

*Wozu:* Ohne diese Einstellung dürfen die Actions nicht veröffentlichen; Pages würde sonst
einen Branch ausliefern statt unseres Builds.
*Du müsstest jetzt* im Tab Actions einen grünen Lauf "pages" sehen (Jobs build und deploy) und
das CMS unter https://phzh-zdl.github.io/cms/ öffnen können.

### 3. Backup-Repo anlegen

Neues **privates** Repo `phzh-zdl/backup` (ohne README). Aus dem CMS-Repo die Dateien
`backup/README.md` und `backup/.github/workflows/mirror.yml` ins Wurzelverzeichnis des
Backup-Repos kopieren (Pfade dort: `README.md`, `.github/workflows/mirror.yml`), committen, pushen.

*Wozu:* Die Sicherung liegt bewusst in einem eigenen Repo, auf das nur Admins Zugriff haben.
*Du müsstest jetzt* im Backup-Repo unter Actions den Workflow "mirror" sehen.

### 4. Token für die Sicherung erstellen

github.com → Profilbild → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token.

- Resource owner: `phzh-zdl`
- Repository access: Only select repositories → alle Inhalts-Repos (zuerst `oer-dashboard`) und `backup`
- Permissions → Repository permissions → Contents: **Read and write**
- Permissions → Repository permissions → Workflows: **Read and write**
- Expiration: höchstens 1 Jahr. Trag dir im Kalender eine Erinnerung ein, das Token rechtzeitig zu erneuern.

*Wozu:* Der Workflow braucht Lesezugriff auf die Inhalts-Repos und Schreibzugriff auf `backup`.
*Einschränkung:* Ein fine-grained Token hat für alle ausgewählten Repos dieselben Rechte, also
bekommen auch die Inhalts-Repos Schreibrecht, obwohl nur Lesen nötig wäre. Der Workflow
schreibt dort nie; trotzdem ist ein dedizierter Admin-/Bot-Account für dieses Token besser
als das persönliche Konto, falls vorhanden.
*Workflows-Recht:* GitHub lehnt Pushes, die Dateien unter `.github/workflows/` anlegen oder ändern,
ohne dieses Recht ab. Die gespiegelte Historie von `oer-dashboard` enthält solche Dateien. Das
Recht erweitert das Token: Es kann damit die Automatisierung (Actions-Workflows) in allen
gewählten Repos ändern. Deshalb das Token besonders sorgfältig behandeln.
*Organisation:* Verlangt `phzh-zdl` eine Freigabe für fine-grained Tokens, muss ein Org-Owner sie
unter Organisation → Settings → Personal access tokens erlauben bzw. das Token dort freigeben.
*Du müsstest jetzt* das Token (Beginn `github_pat_`) einmalig angezeigt bekommen. Kopiere es,
es wird nicht wieder gezeigt. Gib es nie in Chats, Tickets oder Code ein.

### 5. Secret `MIRROR_TOKEN` hinterlegen

Repo `backup` → Settings → Secrets and variables → Actions → New repository secret.
Name: `MIRROR_TOKEN`, Value: das Token aus Schritt 4.

*Wozu:* So steht das Token dem Workflow zur Verfügung, ohne im Code oder in Logs zu erscheinen.
*Du müsstest jetzt* in der Liste der Repository secrets `MIRROR_TOKEN` sehen (der Wert bleibt verborgen).

### 6. Sicherung einmal von Hand starten

Repo `backup` → Actions → "mirror" → Run workflow.

*Wozu:* Prüft Token und Rechte, ohne bis 02:00 zu warten.
*Du müsstest jetzt* einen grünen Lauf sehen und im Repo `backup` die Branches
`oer-dashboard/main` usw. (Branch-Auswahl oben links). Ist der Lauf rot, steht im Log
meist `Repository not found` (Token hat keinen Zugriff auf das Repo),
`refusing to allow a Personal Access Token to create or update workflow ...` (dem Token fehlt
das Recht "Workflows: Read and write", siehe Schritt 4) oder
`rejected ... non-fast-forward` (in einem Inhalts-Repo wurde die Historie umgeschrieben;
Wiederherstellung siehe `backup/README.md`).
