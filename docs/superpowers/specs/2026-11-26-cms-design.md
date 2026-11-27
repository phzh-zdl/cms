# Konzept: Statischer OER-Katalog + Git-basiertes CMS

Stand: 2026-11-26 · Status: zur Freigabe (Fragen des Prüfers beantwortet)

## 1. Worum es geht und warum

Die PH Zürich erlaubt, eine **statische Webseite** auf ihren Servern zu veröffentlichen —
kein PHP, keine Datenbank. Der OER-Katalog (heute Vite/React + PHP-API + MariaDB) muss
darum statisch werden, und die Admin-Funktionen fallen weg.

Gleichzeitig soll das Team die Inhalte **ohne KI und ohne Programmierkenntnisse** pflegen
können. Daraus entsteht ein zweites Projekt: ein **CMS** (Bearbeitungswerkzeug). Eine
Kollegin hat eine ähnliche statische Seite gebaut, die ebenfalls ein CMS braucht — das CMS
soll darum **mehrere Seiten** bedienen können und modular erweiterbar sein. Wir beginnen
mit dem OER-Katalog und bauen nach und nach aus.

Leitlinien vom Auftraggeber:
- **IT so weit wie möglich vermeiden** — keine Installation, nichts, was die PHZH-IT
  freigeben muss.
- **Versionierung über GitHub** — pro Webseite ein Repo; jede gespeicherte Änderung ist
  nachvollziehbar und rückgängig zu machen.
- **Export als ZIP** — das ZIP geht ans Webcenter oder wird selbst auf den PH-Server geladen.
- Team arbeitet auf **Windows und Mac**.
- Meist **eine Person pro Seite**, gleichzeitiges Bearbeiten ist selten — aber wenn es
  passiert, braucht es eine verständliche Konfliktlösung.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**
1. OER-Katalog läuft als reine statische Seite (HTML/JS/CSS + JSON + Bilder), auf jedem
   Webserver, auch in einem Unterordner.
2. CMS als Webseite auf GitHub Pages: Seite auswählen → Inhalte bearbeiten → speichern
   (= Commit auf GitHub) → ZIP exportieren.
3. CMS ist über eine Beschreibungsdatei pro Seite (`cms.json`) konfigurierbar, sodass
   weitere Seiten ohne Umbau des CMS dazukommen.
4. Drei Dokumente: Sicherheitsdokument (Sicherheitsausschuss), Entwicklerdokumentation
   (PH-Entwickler:innen), Bedienungsanleitung inkl. Einrichtung (Team).

**Nicht-Ziele (vorerst)**
- Offline-Bearbeitung.
- Sperren / Echtzeit-Zusammenarbeit mehrerer Personen.
- Rollen, Freigabe-Workflows („Vier-Augen-Prinzip"), Pull Requests.
- Freier Seiten-Baukasten (WYSIWYG, Layouts verschieben). Das CMS bearbeitet Inhalte,
  nicht das Design.
- Automatisches Hochladen auf den PH-Server.
- Live-Vorschau der Seite im CMS (spätere Ausbaustufe, siehe §9).
- Die Seite der Kollegin („Impuls") in der ersten Version — sie wird aber beim Entwurf der
  Feld-Typen schon berücksichtigt (siehe §5.6), damit sie ohne Umbau dazukommen kann.

**Anti-Ziele** (wäre ein Misserfolg, auch wenn es technisch funktioniert)
- Das Team muss etwas installieren oder die IT um Freigaben bitten.
- Das Team sieht Git-Begriffe oder Befehle (Commit, Merge, SHA …).
- Eine Änderung geht still verloren (z.B. bei Konflikt überschrieben).
- Die öffentliche Seite lädt irgendetwas von externen Servern.

## 3. Constraints

- **Kein CDN** — gilt weiterhin für die öffentliche Seite: alles (inkl. MarkWeb-Fonts) ist
  im ZIP enthalten. Auch das CMS bündelt alle Abhängigkeiten selbst; seine einzige externe
  Verbindung ist die GitHub-API (`api.github.com`).
- **Kein Node, kein PHP beim Team** — das Team hat nur einen Browser.
- **`safeHttps()` auf jede eingegebene URL** — im CMS beim Speichern und in der Seite beim
  Anzeigen (bestehende Regel bleibt).
- **Bilder werden neu kodiert, SVG verboten** — die bisherige GD-Neukodierung im Backend
  wandert ins CMS: Bild im Browser über Canvas neu kodieren, Metadaten fallen dabei weg.
  Nur PNG/JPEG/WebP/GIF als Eingabe, Magic-Byte-Prüfung, max. 5 MB Eingabe.
  **Ausgabe: WebP, max. 800 px breit, Qualität 80** — identisch zur heutigen
  `api/routes/upload.php` (bereits so umgesetzt, 2026-11-26).
- **Ein Bildformat für alles: 5:3.** Katalog-Karten und Karussell nutzen dasselbe Format
  (`.rcard-img`, bereits umgesetzt). Bilder werden per `<img loading="lazy">` erst beim
  Scrollen geladen (`src/components/CardImage.jsx`, bereits umgesetzt) — bleibt in der
  statischen Version so.
- **Beschreibung max. 500 Zeichen** — steht künftig in `cms.json` (Feldregel) und wird in
  der Seite nicht mehr separat geprüft.
- **UI-Sprache Deutsch.**
- **Unbekannter Ziel-Server** — Webcenter/PH-Server: Typ und Pfad unbekannt. Die Seite darf
  nicht auf Server-Regeln (`.htaccess`, SPA-Fallback) angewiesen sein und muss in einem
  Unterordner funktionieren.

## 4. Gewählter Ansatz und verworfene Alternativen

Erwogen wurden drei Wege für das CMS:

| | Ansatz | Abwägung |
|---|---|---|
| A | Desktop-App (Electron) + lokal installiertes Git | Vertrautes Programm, offline, Vorschau leicht. Aber: Installation von App **und** Git, „Unbekannter Herausgeber"-Warnung, auf verwalteten Rechnern potenziell IT-Freigabe nötig. |
| B | Kleines lokales Programm (.exe) + Browser-Oberfläche | Kleiner als A, aber dieselben Installations-/Freigabe-Probleme. |
| **C** | **Webseite auf GitHub Pages, speichert direkt über die GitHub-API** | **Gewählt.** Keine Installation, keine IT, läuft auf Windows und Mac gleich, Updates automatisch. Kosten: kein Offline-Betrieb; jede Person erstellt einmalig einen GitHub-Zugangsschlüssel. |

**Entscheid des Auftraggebers: C mit GitHub Pages**, weil die IT vermieden werden soll.
Die öffentliche Erreichbarkeit der CMS-Adresse wurde besprochen und akzeptiert: dort liegt
nur das leere Werkzeug, Zugriff auf Inhalte regelt ausschliesslich GitHub.

## 5. Architektur

```
 Team-Mitglied (Browser, Windows/Mac)
        │
        │  öffnet  https://phzh-zdl.github.io/cms
        ▼
 ┌──────────────────────────┐        GitHub-API (HTTPS, persönlicher Schlüssel)
 │  CMS (statische Web-App) │ ─────────────────────────────────────────────┐
 │  läuft komplett im Browser│                                              ▼
 └──────────────────────────┘                          ┌───────────────────────────────┐
        │                                              │ Repo pro Webseite, z.B.        │
        │  „Exportieren"                               │ phzh-zdl/oer-dashboard          │
        ▼                                              │  ├─ cms.json   (Beschreibung)   │
   oer-katalog-2026-11-26.zip  ──► Webcenter /         │  ├─ content/*.json (Inhalte)    │
                                    PH-Server          │  ├─ content/images/ (Bilder)    │
                                                       │  └─ Quellcode der Seite         │
                                                       └───────────────────────────────┘
```

Es gibt **keinen eigenen Server**. Das CMS ist eine statische Web-App (Vite + React, wie der
Katalog), die direkt mit der GitHub-API spricht.

### 5.1 Repos

- **`phzh-zdl/cms`** (neu, öffentlich, GitHub Pages) — Quellcode des CMS. Enthält keine
  Inhalte und keine Geheimnisse. Wird per GitHub Action gebaut und auf Pages veröffentlicht.
  Muss öffentlich sein, weil GitHub Pages aus privaten Repos einen bezahlten Plan braucht.
- **Ein Repo pro Webseite, privat** (Entscheid Auftraggeber). Für den Katalog wird das
  bestehende `phzh-zdl/oer-dashboard` umgebaut (Teil 1) und auf privat gestellt. Vorteil
  neben der Vertraulichkeit: Die Bearbeitungshistorie mit den Namen der Team-Mitglieder
  ist nicht öffentlich einsehbar.
- **Organisation:** Der Auftraggeber ist Owner von `phzh-zdl` und richtet Repo, Pages,
  Team und Organisationseinstellungen selbst ein — mit Schritt-für-Schritt-Anleitung.
- **Ausgangsstand:** Teil 1 baut auf dem Stand von Branch `workshop-feedback` auf (Formate,
  Zielstufen, Lizenzen, openILIAS-Inhalte). Dieser wird vorher committet und nach `main`
  übernommen — erst auf Go des Auftraggebers.

### 5.2 Teil 1 — OER-Katalog statisch machen

- **Entfernen** (es läuft keine Live-Instanz der PHP-Version, nichts muss weiterbetrieben
  werden; alles bleibt in der Git-Historie): `api/`, `db/`, `docker/`, `docker-compose.yml`, `scripts/create-admin.php`,
  `uploads/`-Mechanik, alle `src/pages/admin/*`, Admin-Komponenten (`AdminResourceCard`),
  `src/lib/storage.js`, Auth-Flow. `.env`-Kram für die DB.
- **Inhalte als Dateien** unter `content/`:
  - `categories.json`, `formats.json`, `levels.json`, `licenses.json` — je ein Array mit
    denselben Feldern wie heute die Tabellen (`id`, `label`, `short`, `sort_order`, plus
    `color` / `note` / `url` wo vorhanden). Ohne `created_at`/`updated_at` — die Historie
    liefert Git.
  - `resources.json` — Array; jede Ressource mit `id` (UUID), `title`, `description`,
    `category_id`, `license_id`, `format_ids[]`, `level_ids[]`, `url`, `image`
    (Pfad relativ zu `content/images/` oder leer), `featured`. Die n:m-Tabellen werden
    zu ID-Listen in der Ressource.
  - `content/images/` — Bilder.
  - `content/pages/*.json` — **Textseiten**, die das Team pflegt: Impressum, Datenschutz,
    Einleitungstext (Hero) und Kontakt. Formatierter Text als **bereinigtes HTML**
    (Entscheid Auftraggeber, siehe „Formatierter Text" in §5.3). Impressum/Datenschutz
    laden ihren Text dadurch ebenfalls zur Laufzeit.
  - Die Daten-Regeln aus `db/schema.sql` (ID-Format `^[a-z0-9_-]{1,32}$`, Farbe `#rrggbb`,
    URL `https://`, Beschreibung ≤ 500, Pflicht-Fachbereich) wandern in `cms.json` und
    werden vom CMS durchgesetzt.
- **Laden zur Laufzeit:** Die Hooks (`useCategories`, `useResources`, `useTaxonomies`,
  `useCollection`) lesen statt `/api/*` die JSON-Dateien per `fetch` mit **relativen Pfaden**.
  Dadurch muss die Seite bei Inhaltsänderungen **nicht neu gebaut** werden — das ist die
  Voraussetzung dafür, dass das Team ohne Node exportieren kann.
- **Unabhängig vom Server:** Vite `base: './'`; Routing für `/datenschutz` und `/impressum`
  per Hash-Routing (`#/impressum`) oder als eigene HTML-Dateien — Wahl beim Builder, aber es
  darf kein SPA-Fallback nötig sein. Security-Header: die bestehende `.htaccess` bleibt im
  Build als Angebot für Apache-Server, die CSP zusätzlich als `<meta>`-Tag, weil unklar ist,
  ob der PH-Server `.htaccess` liest.
- **Einmalige Datenübernahme:** Skript, das die bestehenden Daten (DB bzw. `seed.sql`) und
  Bilder in `content/` überführt.
- **Bauen der Seiten-Hülle:** Eine GitHub Action baut bei Änderungen am **Quellcode** die
  Seite (`npm run build`) und legt das Ergebnis dort ab, wo das CMS es für den Export holt
  (z.B. Branch `build` oder Ordner — Wahl beim Builder). Inhaltsänderungen lösen keinen
  Build aus und brauchen keinen. Dependabot + `audit.yml` bleiben bestehen.

### 5.3 Teil 2 — das CMS

**Anmelden.** Beim ersten Öffnen fügt die Person ihren **fine-grained Personal Access Token**
ein (Rechte: nur „Contents: Read and write" + „Metadata: Read", nur für die Repos der
Organisation `phzh-zdl`). Der Schlüssel wird standardmässig nur für die Browser-Sitzung
gehalten (`sessionStorage`); optional „auf diesem Gerät merken" (`localStorage`) mit
klarem Hinweis. Abmelden löscht ihn. Läuft er ab oder wird abgelehnt, erklärt das CMS
verständlich, was zu tun ist (Link zur Anleitung).

**Seitenauswahl.** Das CMS listet alle Repos, auf die der Schlüssel Zugriff hat und die eine
`cms.json` im Wurzelordner haben. Anzeige mit dem Namen aus `cms.json`.

**Bearbeiten.** Beim Öffnen einer Seite lädt das CMS den aktuellen Stand von `main`
(`cms.json` + alle darin genannten Inhaltsdateien) — das ist der „pull". Aus `cms.json`
erzeugt es die Masken:

```jsonc
// cms.json (Beispiel, Skizze — genaues Format legt der Builder fest)
{
  "name": "OER-Katalog",
  "export": { "shell": "build", "zipName": "oer-katalog" },
  "collections": [
    {
      "id": "categories", "label": "Fachbereiche", "file": "content/categories.json",
      "fields": [
        { "name": "id", "type": "slug", "label": "Kennung", "immutable": true },
        { "name": "label", "type": "text", "label": "Name", "required": true },
        { "name": "short", "type": "text", "label": "Kurzname", "required": true },
        { "name": "color", "type": "color", "label": "Farbe" }
      ],
      "sortBy": "sort_order",
      "onDelete": { "referencedBy": "resources.category_id", "mode": "reassign" }
    },
    {
      "id": "resources", "label": "Ressourcen", "file": "content/resources.json",
      "fields": [
        { "name": "title", "type": "text", "required": true },
        { "name": "description", "type": "textarea", "maxLength": 500 },
        { "name": "category_id", "type": "reference", "to": "categories", "required": true },
        { "name": "format_ids", "type": "reference-multi", "to": "formats" },
        { "name": "url", "type": "url-https", "required": true },
        { "name": "image", "type": "image", "dir": "content/images" },
        { "name": "featured", "type": "boolean", "label": "Im Karussell anpinnen" }
      ]
    }
  ]
}
```

Baustein-Typen der ersten Version (genau das, was der Katalog braucht): `text`, `textarea`
(mit `maxLength`), `slug`, `color`, `url-https`, `boolean`, `number`/Reihenfolge,
`reference`, `reference-multi`, `image`, `richtext`. Neue Typen kommen hinzu, wenn eine
neue Seite sie braucht — das CMS registriert Feld-Typen modular (ein Modul pro Typ).
Die für Impuls absehbaren Typen stehen in §5.6.

Neben Sammlungen (Listen von Einträgen) kennt `cms.json` **Einzelseiten** (`pages`): je eine
Datei, ein Feld vom Typ `richtext`. Konflikte bei Einzelseiten: die ganze Seite ist ein
Eintrag („meine Version / die andere").

**Formatierter Text (`richtext`) — gespeichert als bereinigtes HTML** (Entscheid
Auftraggeber). Begründung: Impuls braucht Tabellen, Zwischentitel auf drei Ebenen,
aufklappbare Abschnitte und interne Links; die Impuls-Inhalte liegen bereits als HTML vor
und lassen sich ohne verlustbehaftete Umwandlung übernehmen.
- **Editor:** visueller Editor (z.B. TipTap/ProseMirror, gebündelt) — das Team sieht nie
  HTML. Werkzeugleiste je nach `cms.json`-Feldkonfiguration: für die OER-Textseiten nur
  Absatz, Zwischentitel, fett, kursiv, Liste, Link; für Impuls zusätzlich Tabellen,
  Zwischentitel H2–H4, aufklappbare Abschnitte (`<details>`) und Links auf andere Seiten
  (Seitenauswahl statt URL-Eingabe).
- **Allowlist, zweifach durchgesetzt:** Erlaubte Elemente (`p h2 h3 h4 strong em ul ol li
  a table thead tbody tr th td details summary br`) und Attribute (nur `href` bei `a`).
  Der Editor erzeugt nur diese; zusätzlich bereinigt **die Seite selbst beim Anzeigen**
  mit einem gebündelten Sanitizer (z.B. DOMPurify) gegen dieselbe Liste — falls jemand
  die Datei direkt in GitHub bearbeitet. Keine Skripte, Event-Attribute, `style`,
  `iframe`, Bilder im Fliesstext (vorerst) oder fremden Einbettungen.
- **Links:** externe nur über `safeHttps()`, dazu `mailto:` und interne `#/…`-Links.
  Externe Links bekommen `rel="noopener noreferrer"`.
- **Vorschau im CMS** nutzt denselben Sanitizer wie die Seite.

**Löschregeln** (bisher DB-Fremdschlüssel, jetzt im CMS):
- Fachbereich, der noch verwendet wird → Löschen nur mit Umhängen auf einen anderen
  Fachbereich (wie heute `reassign_to`).
- Format / Zielstufe → wird aus allen Ressourcen entfernt (wie heute CASCADE), mit
  Hinweis „wird aus N Ressourcen entfernt".
- Lizenz → Ressourcen verlieren die Lizenz (wie heute SET NULL), mit Hinweis.

**Bild-Feld mit Zuschneide-Editor.** Beim Hochladen öffnet sich ein kleiner Editor mit
festem 5:3-Rahmen (vorbelegt mittig, verschieben + zoomen; Bibliothek z.B.
`react-easy-crop`, gebündelt). Option **„Ganzes Bild zeigen"** für Icons/Logos: Bild wird
nicht beschnitten, sondern mittig auf eine Fläche in der Fachbereichsfarbe gesetzt.
Warnung unter ca. 640 px Breite („wirkt unscharf"). Gespeichert wird **nur das fertige
Ergebnis** — kein Original. Neu zuschneiden = Bild neu hochladen (Entscheid Auftraggeber).
Keine weitere Bildbearbeitung (Filter, Text o.ä.).

**Karussell einstellen** = Ressourcen anpinnen (`featured`). Die tägliche Rotation in
`pickDailyFeatured()` bleibt unverändert. Weitere Karussell-Einstellungen nur, wenn das Team
sie konkret braucht.

**Speichern.** Ein Klick auf „Speichern" schreibt **alle geänderten Dateien (Inhalte +
neue Bilder) als einen Commit** auf `main` (Git-Data-API: Blobs → Tree → Commit → Ref-Update
ohne Force). Commit-Nachricht automatisch und lesbar („Ressource ‚X' geändert, 1 Bild
hinzugefügt"). Autor = GitHub-Konto der Person. Ungespeicherte Änderungen werden im Browser
zwischengespeichert, damit ein versehentlich geschlossener Tab nichts kostet, und das CMS
warnt beim Verlassen.

**Konflikte.** Das Ref-Update schlägt fehl, wenn jemand inzwischen gespeichert hat. Dann:
1. CMS lädt den neuen Stand.
2. Zusammenführen **pro Eintrag** (über die `id`): Einträge, die nur eine Seite geändert hat,
   werden automatisch übernommen.
3. Nur Einträge, die **beide** geändert haben, werden nebeneinander gezeigt; die Person
   wählt je „meine Version" / „die andere Version".
4. Danach erneut speichern.
Kein Git-Vokabular in der Oberfläche. Zusätzlich beim Öffnen und vor dem Speichern ein
Hinweis „Diese Seite wurde seit dem Öffnen von <Name> geändert", falls zutreffend.

**Export.** „Exportieren" erzeugt im Browser ein ZIP aus der fertig gebauten Seiten-Hülle
(von GitHub, siehe §5.2) + dem **aktuell gespeicherten** `content/` inkl. Bildern. Vor dem
Export müssen alle Änderungen gespeichert sein (sonst Hinweis). Dateiname mit Datum. Das
ZIP ist sofort auf einem Webserver lauffähig.

**Verlauf (klein, erste Version):** Liste der letzten Änderungen (wer, wann, Nachricht).
Zurücksetzen auf einen älteren Stand ist in der ersten Version über GitHub selbst möglich
(durch den Admin), nicht im CMS.

### 5.4 Sicherheit (Grundlage für das Sicherheitsdokument)

- **Kein eigener Server, keine eigene Datenbank, keine gespeicherten Passwörter.** Das CMS
  ist reiner Code im Browser.
- **Zugriff regelt GitHub:** nur Personen, die der Admin in der Organisation einem Team
  zuweist, haben Schreibrechte. Entzug = Person aus dem Team entfernen.
- **Organisationseinstellungen** (Admin): Zwei-Faktor-Pflicht für alle Mitglieder;
  fine-grained Tokens erlauben, mit maximaler Laufzeit (Vorschlag 90 Tage) und ggf.
  Freigabepflicht durch den Org-Owner.
- **Kein Branch-Schutz** (Entscheid Auftraggeber): Für private Repos gäbe es ihn erst ab
  GitHub Team (bezahlt). Restrisiko: Mit einem gestohlenen oder ausserhalb des CMS
  benutzten Schlüssel liesse sich die Historie überschreiben oder `main` löschen. Das CMS
  selbst macht nie Force-Push und löscht keine Branches. Gegenmassnahme: **nächtliche
  Sicherungskopie** per GitHub Action — jedes Inhalts-Repo wird in ein separates, privates
  Backup-Repo gespiegelt, auf das das Team keinen Zugriff hat (max. ein Tag Verlust).
  Das Sicherheitsdokument benennt dieses Restrisiko offen.
- **Schlüssel minimal berechtigt** (nur Inhalte der freigegebenen Repos), kurzlebig,
  standardmässig nur für die Sitzung gespeichert.
- **XSS-Schutz im CMS** ist zentral, weil ein Angreifer mit Script-Zugriff den Schlüssel
  lesen könnte: strikte CSP als `<meta>` (GitHub Pages kann keine Header setzen) — nur
  eigene Skripte, `connect-src` nur `api.github.com`; Inhalte nie als HTML rendern; alle
  Abhängigkeiten gebündelt; Dependabot + `npm audit` wie im Katalog.
- **Öffentliche Seite:** unverändert ohne externe Requests, `safeHttps()`, CSP.
- **Nachvollziehbarkeit:** jede Änderung ist ein Commit mit Person und Zeit; alles ist
  wiederherstellbar.
- **Datenschutz:** GitHub (Microsoft, USA) speichert die Inhalte (öffentliche OER-Daten) und
  die Konto-Namen der Bearbeitenden in der Historie. Commit-E-Mail kann die GitHub-
  „noreply"-Adresse sein. Das Sicherheitsdokument benennt das offen; die rechtliche
  Beurteilung (DSG) liegt bei der PH.

### 5.5 Dokumente (Lieferumfang)

Alle als Markdown im `cms`-Repo, damit sie mit dem Code aktuell bleiben:
1. **`docs/SICHERHEIT.md`** — für den Sicherheitsausschuss, ohne Fachjargon: Datenfluss-
   Diagramm, wer worauf Zugriff hat, was wo gespeichert ist, Risiken und Gegenmassnahmen,
   Datenschutz, Notfall („Schlüssel verloren", „Person verlässt das Team"). Zusätzlich als
   PDF exportierbar.
2. **`docs/ARCHITEKTUR.md`** + `README.md` — für PH-Entwickler:innen: Aufbau, Ordner,
   Datenfluss, `cms.json`-Referenz, wie man einen Feld-Typ oder eine neue Seite ergänzt,
   lokal starten, Deployment.
3. **`docs/ANLEITUNG.md`** — für das Team, bebildert: GitHub-Konto anlegen, 2FA einrichten,
   Schlüssel erstellen, CMS bedienen, Konflikt lösen, exportieren.
Die Katalog-Doku (`CLAUDE.md`, README im Katalog-Repo) wird auf die statische Architektur
aktualisiert.

### 5.6 Zweite Seite „Impuls" — was sie vom CMS verlangt

Grundlage: Prototyp `Impuls_Website-Prototyp.html` (Version 4, Stand 17.11.2026, noch nicht
definitiv). Eine einzelne HTML-Datei, lädt nichts Externes; alle Inhalte stecken bereits
getrennt vom Layout in einem Datenobjekt `D` (~735 KB):

| Sammlung | Umfang | Inhalt |
|---|---|---|
| `areas` | 8 | Bereiche mit Name, Farbe, Beschreibung, Unterbereichen, Notizen |
| `pages` | 94 | Wissensseiten: Titel, Leitfrage, Bereich/Unterbereich, Zielgruppen, Quellen, Lizenz, langer formatierter Text (HTML, zusammen ~530 KB), Inhaltsverzeichnis, Kurztext, Redaktionsstatus, Entwurfs-Hinweise |
| `paths` | 13 | Lernpfade: geordnete Liste von Seiten |
| `carousel` | 18 | geordnete Liste von Seiten |
| `track` | 67 | Redaktions-Tracking: Originalseiten aus den Wikis und wohin sie aufgeteilt wurden |
| `moddesc` | 31 | Beschreibungen der Unterbereiche |

Daraus folgt fürs CMS (beim Entwurf der Feld-Typen berücksichtigen, umsetzen erst mit Impuls):
- **`richtext` im vollen Umfang** — Tabellen, H2–H4, `<details>`, interne Links (siehe §5.3).
- **Neue Feld-Typen:** `select` (z.B. Redaktionsstatus), `tags` (Mehrfachauswahl aus fester
  Liste, z.B. Zielgruppen), `reference-ordered` (geordnete Verweisliste mit Umsortieren,
  z.B. Lernpfade, Karussell), `repeater` (wiederholbare Unterblöcke, z.B. Quellenangaben).
- **Eine Datei pro Eintrag** als Speicheroption pro Sammlung (`"storage": "per-entry"`),
  z.B. `content/pages/<id>.json` — bei 94 langen Seiten weniger Konflikte und schnelleres
  Laden. Der OER-Katalog bleibt bei einer Datei pro Sammlung.
- **Abgeleitete Felder** wie Inhaltsverzeichnis, Wortzahl und Kurztext sollte die Seite aus
  dem Text selbst berechnen statt sie zu speichern — dann können sie nicht veralten.
- **Browser-Speicher:** Impuls speichert den Lesefortschritt im Browser (`localStorage`,
  nur lokal, keine Übertragung). Kein Cookie, aber im Sicherheitsdokument offen zu nennen;
  die Aussage „speichert nichts im Browser" gilt nur für den OER-Katalog.
- Impuls ist kein React-Projekt (Vanilla-JS). Das ist für das CMS egal: Es bearbeitet nur
  Dateien; die Seite muss lediglich wie in Teil 1 ihre Inhalte aus Dateien laden.

## 6. Reihenfolge

1. Teil 1: Katalog statisch (inkl. Datenübernahme, Build-Action).
2. Teil 2: CMS-Grundgerüst (Anmeldung, Seitenauswahl, Lesen).
3. Bearbeiten + Speichern + Bilder.
4. Konflikte + Export.
5. Dokumente (Sicherheitsdokument kann früh als Entwurf entstehen, falls der Ausschuss
   vorab fragt).
6. Impuls: zusätzliche Feld-Typen, Umstellung des Prototyps auf Inhaltsdateien.

## 7. Entscheidungen des Auftraggebers

- Statische Seite, Admin-Funktionen entfallen.
- CMS für mehrere Seiten, modular, schrittweise Ausbau; Start mit OER-Katalog.
- Versionierung über GitHub, ein Repo pro Webseite; Holen beim Öffnen, Speichern als Commit.
- Export als ZIP.
- Weg C: CMS als Webseite auf GitHub Pages, keine Installation, IT vermeiden.
- Öffentliche CMS-Adresse ist akzeptiert.
- Windows und Mac.
- Konflikte selten; braucht verständliche Lösung.
- Lieferumfang inkl. Sicherheitsdokument und Entwicklerdokumentation.
- Bilder: Zuschneide-Editor im CMS, ein Format (5:3) für Karten und Karussell, keine
  Originale aufbewahren — neu zuschneiden heisst neu hochladen.
- Bilder werden erst beim Scrollen geladen und als WebP gespeichert.
- Keine Live-Instanz der PHP-Version — PHP/DB/Docker werden beim Umbau entfernt.
- Inhalts-Repos sind privat; das CMS-Repo ist öffentlich (nur Code).
- Kein Branch-Schutz (kein bezahlter GitHub-Plan); Restrisiko akzeptiert.
- Das Team pflegt zusätzlich Textseiten: Impressum, Datenschutz, Einleitung, Kontakt.
- Auftraggeber ist Owner der Organisation `phzh-zdl` und richtet sie selbst ein.
- Inhalte: Die 23 Kacheln von openILIAS (Titel, Beschreibung, Link, Bild) ersetzen die
  früheren Platzhalter-Ressourcen; sie stehen in `db/seed.sql`, Bilder in `uploads/`.
  Formate und Zielstufen aus dem Kontext zugeordnet, neues Format „Online-Lerneinheit",
  neue Zielstufe „Ausserschulisch". **Lizenzen sind erfundene Platzhalter** — vor der
  ersten Veröffentlichung müssen sie von jemandem geprüft werden, der die Angebote kennt
  (Punkt für die Abnahme von Teil 1).
- Karten (Katalog und Karussell) einheitlich: Titel max. 2, Beschreibung max. 5 Zeilen
  mit „…", alle gleich hoch (bereits umgesetzt).
- Formatierter Text wird als **bereinigtes HTML** gespeichert (nicht Markdown).
- Impuls wird beim Entwurf des CMS berücksichtigt (§5.6), umgesetzt nach dem OER-Katalog.

## 8. Calls von Claude (korrigierbar)

- Speichern lädt sofort hoch (statt erst beim Export) — damit nichts nur lokal liegt.
- Inhalte als **eine JSON-Datei pro Sammlung**, Konflikte pro Eintrag über `id` gelöst.
- Seite lädt Inhalte zur Laufzeit → kein Build beim Export.
- Bilder im Browser neu kodieren (ersetzt GD).
- Schlüssel standardmässig nur für die Sitzung.
- CMS-Technik: Vite + React wie der Katalog; ZIP-Erzeugung mit einer gebündelten Bibliothek.
- Direkt auf `main` speichern, keine Pull Requests.
- Dokumente als Markdown im `cms`-Repo.
- Nächtliche Sicherungskopie der Inhalts-Repos in ein separates Backup-Repo, als Ersatz
  für den fehlenden Branch-Schutz.
- Richtext-Editor TipTap/ProseMirror + Sanitizer DOMPurify (beide gebündelt), Allowlist
  wie in §5.3; Werkzeugleiste pro Feld konfigurierbar.
- Für Impuls: Speicherung eine Datei pro Seite; abgeleitete Felder (Inhaltsverzeichnis,
  Wortzahl, Kurztext) berechnet die Seite selbst.
- Das Sicherheitsdokument baut auf der bestehenden lokalen Audit-Notiz (`AUDIT.md`) auf.

## 9. Dem Builder überlassen

- Genaues `cms.json`-Format und Validierung.
- Wo die gebaute Seiten-Hülle liegt (Branch `build`, Release, Ordner) und wie das CMS sie
  lädt — Bedingung: über die GitHub-API aus dem Browser abrufbar (CORS) und unabhängig von
  Inhaltsänderungen.
- Hash-Routing vs. eigene HTML-Dateien für Impressum/Datenschutz.
- Bild-Zielformat und Maximalgrösse.
- Gestaltung der CMS-Oberfläche (im PHZH-Stil, MarkWeb-Schrift).
- Spätere Ausbaustufe: Live-Vorschau, Zurücksetzen im CMS.
