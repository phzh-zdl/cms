# Barrierefreiheit (e-Accessibility) — CMS

Stand: 2026-11-27 · Massstab: **WCAG 2.1, Stufe AA** (wie beim OER-Katalog, siehe dessen
`docs/BARRIEREFREIHEIT.md`) · Gilt für das CMS-Werkzeug selbst (Anmeldung, Seitenauswahl,
Editor, Dialoge, Export, Verlauf), nicht für die damit gepflegten Webseiten.

## 1. Zusammenfassung

Das CMS ist ein Werkzeug für ein kleines, bekanntes Team. Es folgt trotzdem denselben Regeln
wie der Katalog. Nach unserer Prüfung von Code, Kontrasten und Tastaturweg erfüllt es die
geprüften AA-Kriterien mit den in Abschnitt 5 genannten **bekannten Lücken**. Die Kontraste
wurden mit `node scripts/contrast.mjs` gerechnet; in `src/styles.css` musste kein Farbwert geändert werden.

**Noch nicht durchgeführt** (für eine verbindliche Aussage nötig):

- [ ] Test mit einem echten Screenreader (NVDA unter Windows, VoiceOver auf Mac)
- [ ] Darstellung bei 200 % Zoom und 320 px Breite (Reflow, 1.4.10)
- [ ] Automatischer Scan (axe DevTools oder Lighthouse) der Hauptansichten
- [ ] Prüfung des Zuschneide-Bereichs (`react-easy-crop`) per Tastatur im Browser

## 2. Was umgesetzt ist

| Bereich | Umsetzung | WCAG |
|---|---|---|
| Sprache | `<html lang="de">` | 3.1.1 |
| Struktur | Anmeldung mit `<main>` und H1; eingeloggt ein `<main>` mit Kopfzeile (`header`), Navigation `nav aria-label="Inhalte"` und je Ansicht genau einer H1 (Sammlung, Exportieren, Verlauf, Textseite, Seitenauswahl); Zwischentitel H2 | 1.3.1, 2.4.6 |
| Beschriftungen | Jedes Feld hat ein `<label for>` (Text, Auswahl, Zahl, Suche); Gruppen (Mehrfachauswahl, Darstellung im Zuschnitt) als `fieldset` + `legend`; Farbwähler und Rich-Text-Bereich mit `aria-label` | 1.3.1, 3.3.2, 4.1.2 |
| Fehler am Feld | Fehlertext steht sichtbar unter dem Feld, `aria-invalid="true"` und `aria-describedby` auf den Fehlertext (`FieldFrame.jsx`); Zähler als `aria-describedby` mit `aria-live="polite"` | 3.3.1, 3.3.3, 4.1.3 |
| Fehler beim Speichern | Zusammenfassung „Bitte zuerst die markierten Fehler beheben." mit Liste als `role="alert"`; Ergebnis des Speicherns als `role="alert"` (Fehler) bzw. `role="status"` (Erfolg) | 3.3.1, 4.1.3 |
| Nicht nur Farbe | Fehlerhafte Einträge in der Liste tragen das Wort „Fehler"; Unterschiede im Konflikt-Dialog heissen „– geändert" (zusätzlich zur Hinterlegung und Kante); aktive Navigation per `aria-current="page"` und fetter Schrift; Pflichtfelder mit „*" | 1.4.1 |
| Dialoge | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; Fokus springt beim Öffnen in den Dialog; Tab bleibt im Dialog; **Esc** schliesst; beim Schliessen des Lösch- und des Zuschneide-Dialogs kehrt der Fokus auf den auslösenden Knopf zurück | 2.1.2, 2.4.3, 4.1.2 |
| Tastatur | Alle Bedienelemente sind echte `button`, `input`, `select`, `a` (keine Klickflächen auf `div`); kein eigenes Tab-Management ausser den Dialogen | 2.1.1 |
| Fokus sichtbar | 3 px Rahmen in `--accent` bei Feldern, Rich-Text-Bereich und Anmeldung; übrige Knöpfe und Links nutzen den Standard-Fokus des Browsers | 2.4.7 |
| Rich-Text | Bereich mit `role="textbox"`, `aria-multiline`, `aria-label`; Werkzeugleiste `role="toolbar"` mit beschrifteten Knöpfen, Umschalter melden `aria-pressed`; Link-Formular mit Fehler über `aria-describedby` und `role="alert"` | 4.1.2, 3.3.1 |
| Status | Laden, Export-Fortschritt, „Gespeichert", Hinweise bei Konflikt und Entwurf per `role="status"` oder `aria-live` | 4.1.3 |
| Bilder | Vorschau mit `alt="Vorschau: <Titel>"`; keine dekorativen Bilder | 1.1.1 |
| Kein Zeitlimit, keine Bewegung | Keine Animationen, keine automatischen Aktualisierungen | 2.2.2 |
| Anmeldefeld | `autocomplete="off"`, Typ `password` (Schlüssel wird nicht angezeigt) | 3.3.2 |

## 3. Farben und Kontraste

Berechnet mit `node scripts/contrast.mjs` (WCAG-Formel). Text braucht 4.5:1, Rahmen von
Bedienelementen und Fokus 3:1. Alle Zeilen unten sind bestanden.

| Verwendung | Farbe | Hintergrund | Kontrast | OK |
|---|---|---|---|---|
| Fliesstext (`--ink`) | #1b1b1f | #fbfbfc / weiss | 16.6 / 17.2:1 | ✅ |
| Labels, Zähler (`--ink-2`) | #4a4d55 | #fbfbfc | 8.2:1 | ✅ |
| Hinweise (`--ink-3`) | #6a6d75 | #fbfbfc / weiss | 5.0 / 5.2:1 | ✅ |
| Links (`--accent`) | #b2156d | #fbfbfc / weiss | 6.3 / 6.5:1 | ✅ |
| Fehlertext (`--danger`) | #a32c22 | #fbfbfc / weiss / #fdeeec | 6.9 / 7.1 / 6.3:1 | ✅ |
| Erfolg (`--ok`) | #1f6b3a | #fbfbfc | 6.3:1 | ✅ |
| Warnung (`--warn`) | #8a4a12 | #fbfbfc | 6.6:1 | ✅ |
| Aktiver Umschalter (Werkzeugleiste) | #ffffff | #1b1b1f | 17.2:1 | ✅ |
| Dialogtext | #111111 | weiss | 18.9:1 | ✅ |
| Geänderte Zeile im Konflikt | #111111 | #fff4cc | 17.1:1 | ✅ |
| Rahmen Bedienelemente (`--line-ui`) | #8f8d76 | weiss / #fbfbfc | 3.4 / 3.3:1 | ✅ (min. 3) |
| Fokusrahmen (`--accent`) | #b2156d | #fbfbfc / weiss | 6.3 / 6.5:1 | ✅ (min. 3) |
| Fehlerrahmen (`--danger`) | #a32c22 | weiss | 7.1:1 | ✅ (min. 3) |
| Kante „geändert" | #8a6d00 | #fff4cc | 4.5:1 | ✅ (min. 3) |
| `--ink-4`, `--line` | #8a8d95 / #bebca6 | weiss | 3.3 / 1.9:1 | — nur Dekoration |

**Regeln** (gelten auch für den Katalog): `--ink-4` nie für Text, `--line` nie als einziger
Rahmen eines Bedienelements (dafür `--line-ui`), `--accent-bright` nur für Flächen.

## 4. Durchgang durch die Hauptansichten (Code und Markup gelesen)

Geprüft wurde der Weg Anmeldung → Seite wählen → Eintrag bearbeiten → Speichern → Export
anhand von Code und Tests (kein Screenreader, kein Browser-Scan):

1. **Anmeldung** (`Login.jsx`): Label zum Feld, Checkbox mit Label und Hinweis per `aria-describedby`;
   Enter im Feld sendet das Formular; Fehler als `role="alert"` mit Link zur Anleitung. Reihenfolge
   Feld → Checkbox → Knopf passt zur Lesereihenfolge.
2. **Seitenauswahl** (`SiteList.jsx`): H1, Liste echter Knöpfe, Laden als `role="status"`, Fehler als `role="alert"`.
3. **Editor** (`SiteEditor.jsx`): Navigation mit `aria-current="page"`, Listen und Knöpfe in Lesereihenfolge
   (Navigation vor Inhalt); `SaveBar` oberhalb des Inhalts.
4. **Sammlung** (`CollectionView.jsx`): Suchfeld mit Label, „Neu" und Liste als Knöpfe; ein Eintrag öffnet
   das Formular (`EntryForm.jsx`) mit Fehlerzuordnung je Feld.
5. **Dialoge** (Löschen, Konflikt, Zuschneiden): Fokus hinein, Tab-Falle, Esc.
6. **Speichern**: Knopf in `SaveBar`, Rückmeldung als Status/Alert.
7. **Export** (`ExportPanel.jsx`): H1, Knopf, Hinweis „Bitte zuerst speichern.", Fortschritt per `aria-live`,
   Ergebnis `role="status"` bzw. Fehler `role="alert"`.

## 5. Bekannte Lücken

Diese Punkte sind bei der Prüfung und in den Code-Reviews aufgefallen und noch offen:

| # | Befund | WCAG | Schwere | Idee |
|---|---|---|---|---|
| 1 | **Fokus nach Wechsel Liste ↔ Formular und zwischen Bereichen:** Wird ein Eintrag geöffnet oder ein Bereich in der Navigation gewählt, bleibt der Fokus auf dem alten Knopf bzw. geht verloren, weil sich der Inhalt austauscht | 2.4.3 | mittel | Fokus auf die H1 des neuen Inhalts setzen (`tabIndex="-1"`) |
| 2 | **Wiederholungsbildschirm ohne Abmelden:** Schlägt die Prüfung der Anmeldung nur wegen der Verbindung fehl, gibt es nur „Erneut versuchen", keinen Weg zurück zur Anmeldung | 3.2.x / Bedienbarkeit | gering | Zweiten Knopf „Abmelden" ergänzen |
| 3 | **Unformatierte Elemente:** `.error`, `.note`, `.hint`, Kopfzeile und die meisten Knöpfe haben kein eigenes Aussehen (Browser-Standard). Kontraste stimmen, aber Fehler sind nur am Text und nicht an der Farbe erkennbar; Ziele können klein sein | 1.4.1 ok, 2.5.8 (2.2) offen | gering | Styles für Meldungen, Knöpfe mit Mindestgrösse 24 px |
| 4 | **Fokus-Rückkehr nicht getestet:** Dass der Fokus nach Schliessen des Konflikt-Dialogs wieder an einer sinnvollen Stelle landet, ist nicht per Test abgesichert (Löschen und Zuschneiden sind umgesetzt, aber ebenfalls nur teilweise getestet) | 2.4.3 | gering | Tests für Fokus-Rückkehr aller drei Dialoge |
| 5 | **Name stimmt nicht mit sichtbarem Text überein:** Werkzeugleisten-Knöpfe zeigen „B", „I", „¶", „• Liste", haben aber den Namen „Fett", „Kursiv", „Absatz", „Aufzählung" | 2.5.3 | gering | Sichtbaren Text in den Namen aufnehmen (zum Beispiel „Fett (B)") |
| 6 | **Speicherstand wird nicht angesagt:** Der Hinweis „Ungespeicherte Änderungen / Wird gespeichert …" steht in einem normalen `span`, nicht in einem Live-Bereich (Ergebnisse des Speicherns werden angesagt) | 4.1.3 | gering | `role="status"` auf den Stand |
| 7 | **Fehler beim Anmeldefeld:** Das Feld trägt `aria-invalid`, aber die Fehlermeldung ist nicht per `aria-describedby` verknüpft (sie wird als `role="alert"` angesagt) | 3.3.1 | gering | `aria-describedby` ergänzen |
| 8 | **Zuschneiden per Tastatur** ungeprüft: Die Auswahl „Ganzes Bild zeigen" und der Zoom-Regler sind tastaturbedienbar; das Verschieben des Ausschnitts im Browser noch nicht getestet | 2.1.1 | offen | Test im Browser; sonst Pfeiltasten/Knöpfe zur Verschiebung |
| 9 | **Pflichtfeld-Stern** („*") ohne Erklärung | 3.3.2 | gering | Hinweis „* = Pflichtfeld" über dem Formular |

## 6. Checkliste für Änderungen am CMS

Vor jedem Merge, der die Oberfläche ändert:

- [ ] Alles mit der Tastatur bedienbar (Tab, Shift+Tab, Enter, Leertaste, Esc)? Fokus immer sichtbar?
- [ ] Neue Texte mindestens `--ink-3`? Neue Rahmen an Bedienelementen `--line-ui`? Nach Farbänderungen `node scripts/contrast.mjs` laufen lassen.
- [ ] Neue Knöpfe und Felder haben einen Namen (sichtbarer Text, `<label>` oder `aria-label`), und der Name enthält den sichtbaren Text?
- [ ] Fehler stehen als Text am Feld, mit `aria-invalid` und `aria-describedby`; Zusammenfassungen und Ergebnisse als `role="alert"` oder `role="status"`?
- [ ] Zustände angesagt (`aria-pressed`, `aria-current`, `aria-expanded`)?
- [ ] Neuer Dialog: `role="dialog"`, `aria-modal`, `aria-labelledby`, Fokus hinein, Tab-Falle, Esc, Fokus zurück zum Auslöser?
- [ ] Wechselt ein Bereich den Inhalt, wird der Fokus gezielt gesetzt (auf die neue Überschrift)?
- [ ] Information nicht nur durch Farbe (Text oder Symbol zusätzlich)?
- [ ] Überschriften ohne Sprünge, eine H1 je Ansicht?
- [ ] Neue Feld-Typen: Label, Fehlerzuordnung und Tastaturbedienung getestet (siehe `docs/ARCHITEKTUR.md`)?
- [ ] Rich-Text: Tabellen haben Kopfzellen (`th`), Links sprechenden Text?
