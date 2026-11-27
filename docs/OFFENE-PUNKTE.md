# Offene Punkte und getroffene Entscheide

Stand 2026-11-27, nach Abschluss von Plan 2 (CMS), Abnahme-Nachträgen und Schlussprüfung. Diese Liste ersetzt das interne Arbeitsprotokoll.

## Entscheide (Ruling) — was sie kosten, falls falsch

- Setup: Ruling: git init -b main im Setup statt in Task 1 Step 1 (sdd-workspace braucht ein Repo); Arbeit auf main eines NEUEN Repos — User hat Plan + Commits freigegeben, kein Push — Kosten: keine
- Setup: Ruling: Browser-Schritte mit echtem Token (T5,T8,T9,T10,T11,T12 je "Browser (User…)") werden nicht von Implementern ausgefuehrt, sondern gesammelt und dem User nach Task 12 als Abnahme-Checkliste gegeben; Test-Repo cms-test legt der User dann an — Kosten falls falsch: Integrationsfehler mit echter API zeigen sich erst spaeter (Unit-Tests mit Fake-Client decken Logik ab)
- Pre-flight: Ruling: T14 Step 5 (Name des CMS) — Platzhalter bleibt, Frage an User im Abschlussbericht statt Stopp — Kosten: ein Such/Ersetz-Durchgang später
- Setup: Ruling: erster Commit (Konzept + Plan) vor Task 1, damit BASE existiert; Spec nach docs/superpowers/specs kopiert (Task 1 Step 4 vorgezogen) — Kosten: keine
- Task 2: review Approved (0 Critical/Important); Ruling: Minor "getFileText >1 MB liefert stillschweigend leeren Text / Ordner wirft TypeError" auf Important hochgestuft — fuehrt zu Datenverlust beim naechsten Speichern (z.B. grosse resources.json, Impuls) — Kosten: eine Fix-Runde
- Task 3: Ruling: Minor #3 (jeder Verifikationsfehler loescht gemerkten Token) auf Important hochgestuft — fine-grained Token wird nur einmal angezeigt, kurzer Offline-Moment zwingt zu neuem Token — Kosten: Teil derselben Fix-Runde
- Task 4: Ruling: file-Pfade in cms.json relativ zu contentRoot, dir "images" — cms.json unabhaengig vom Speicherort der Inhalte — Kosten: gering
- Task 4: Ruling: Test liest ../oer-dashboard/cms.json, uebersprungen wenn nicht vorhanden (CI) — echte Config wird lokal geprueft — Kosten: CI prueft echte Config nicht
- Task 5: Ruling: loadSite liest alle Dateien am headSha (konsistenter Stand); fehlerhafte cms.json wird mit Fehler gelistet statt Liste zu blockieren
- Task 5: Ruling: Hash beim Abmelden leeren in Runde 2 aufgenommen (Out-of-scope-Beobachtung, gehoert aber zur Absicht von Finding 2) — Kosten: keine
- Task 6: Ruling: Formular-Aenderungen wirken live auf Arbeitskopie; ungueltige Werte erlaubt, Speichern (T8) blockiert bei Fehlern via collectionErrors — Kosten: T8 muss collectionErrors nutzen
- Task 6: Ruling: "immutable nach erstem Speichern" = ID existiert in den ORIGINAL geladenen Daten (isNew) — Kosten: keine
- Task 7: Ruling: bei mehreren onDelete-Regeln gilt die strengste mit Betroffenen (reassign>remove>nullify)
- Task 8: Ruling: Re-Review-Hinweis "rebased draft behaelt removedFiles -> 422" nicht blockierend — saveChanges filtert Loeschungen gegen den Basis-Tree (Decision 3), bereits geloeschte Pfade fallen weg; erneuter Bild-Upload harmlos — Kosten: ein doppelter Blob
- Task 9: Ruling: 3-Wege-Basis = Inhalt am baseSha der Arbeitskopie (bei Entwurf draft.baseSha, ggf. nachladen); vor dem Speichern getRef-Vergleich -> Zusammenfuehren statt vergeblichem Schreibversuch; max. 3 automatische Versuche — Kosten: zusaetzliche API-Aufrufe
- Task 10: Ruling: Bildoperationen via ctx.images; Vorschau bestehender Bilder via neue client.getFileBytes am Baseline-headSha
- Task 10: Ruling: fehlender separater RED-Lauf fuer detect/encode akzeptiert (Tests existieren und pruefen Verhalten; Nachholen waere Ritual) — Kosten: Tests nie rot gesehen
- Task 10: Ruling: Minor "Uebernehmen vor onCropComplete -> verzerrtes Bild" auf Important hochgestuft — sichtbar beschaedigtes Bild — Kosten: Teil der Fix-Runde
- Task 12: Ruling: Export nimmt Inhalte vom AKTUELLEN main-Stand (nicht Editor-Baseline), BUILD_INFO.txt bleibt im ZIP
- Task 13: Ruling: mirror-Workflow liegt vorerst unter backup/ im CMS-Repo (Backup-Repo existiert noch nicht), User kopiert; Simulation als scripts/simulate-mirror.sh
- Task 13: Ruling: Minor "configure-pages mit contents:read koennte scheitern" auf Important hochgestuft (erstes Deployment koennte scheitern, Schritt unnoetig) — Kosten: keine
- Task 14: Ruling: Steps 5 (Name) und 6 (Abnahme) durch Controller mit User; anleitung.html per Vite-Plugin aus ANLEITUNG.md (marked als devDependency)
- Task 14: Ruling: zwei Punkte hochgestuft — SICHERHEIT.md stellt nicht eingerichtete Org-Einstellungen (2FA) als Tatsache dar (Ausschuss wuerde getaeuscht); anleitung.html ohne CSP auf CMS-Origin mit unsanitiertem marked-Output — Kosten: eine Fix-Runde
- Task 15 (Vorschau): User-Entscheid inkl. ungespeicherter Aenderungen; Brief task-15-brief.md; Ruling: Service Worker + Cache Storage unter ./vorschau/, CSP-Header ohne api.github.com auf allen Vorschau-Antworten, noopener, Cache-Loeschung beim Abmelden — Kosten wenn falsch: Vorschau-Code auf CMS-Origin koennte localStorage lesen (aber nicht abschicken). Dispatch nach Design-Review.
- Task 15: Ruling: Warten auf registration-worker 'activated' statt navigator.serviceWorker.ready (ready bezieht sich auf den Seiten-Scope und loest nie auf) — korrekt — Kosten: keine
- Task 15: Ruling: Link "Vorschau oeffnen" immer sichtbar, da window.open mit noopener stets null liefert — Kosten: ein Klick mehr falls Auto-Open blockiert
- Task 16 (Katalog carousel.json): User: Reihenfolge nein, Angepinnte priorisieren; Ruling: Angepinnte immer alle zuerst (auch > count), fill fuellt bis count, leer -> Abschnitt aus; Datei optional (404 -> Standard) — Kosten: bei vielen Angepinnten mehr Karten als eingestellt. Dispatched (sonnet) in oer-dashboard Branch cms-json, BASE d0d0a55 (parallel zu Task-15-Review, anderes Repo)
- Task 15: Ruling: Abweichung "Vorschau ohne nicht konfigurierte Dateien/unreferenzierte Bilder" auf Important hochgestuft — Vorschau soll zeigen, was der Export veroeffentlicht — Kosten: etwas mehr Download
- Task 15: Ruling: Restrisiko Token-Abfluss per Navigation aus manipuliertem Build-Branch akzeptiert und dokumentiert; Haertung frame-src/child-src/worker-src none + CMS verweigert Einbettung — Kosten wenn falsch: gemerkter Token koennte abfliessen, Quelle nur Team mit Schreibrecht
- Task 17: Ruling: Minor "Verwendet von 1 Ressourcen" auf Important hochgestuft (sichtbar auf jeder Referenzseite) -> beugungsfreier Wortlaut; dazu Fehlername der View, FixedField dl/dd — fix round 1 dispatched (resume)
- Final: Ruling: I3 — beim Abmelden alle Entwuerfe loeschen (wie SICHERHEIT.md sagt), vorher Rueckfrage wenn ungespeichert, kein Autosave beim Abmelde-Unmount — Kosten: wer bewusst abmeldet verliert Ungespeichertes nach Bestaetigung
- Final: Ruling: T3 (Abmelden auf Retry-Screen) in Fix-Welle mitnehmen (klein, Bedienbarkeit) — Kosten: keine

## Zurückgestellte kleinere Punkte (minor, deferred)

Keiner davon blockiert den Einsatz (Triage der Schlussprüfung). Vor dem Anschluss von Impuls zu erledigen: hartkodiertes r.id, OER-spezifische Dialogtexte, Zählbasis Verwendet-von vs. Löschregeln, Kollision von settings-Dateien.

- Task 2: minor (deferred): Link-next-URL nicht auf api.github.com beschraenkt (Bearer an GitHub-gelieferte URL)
- Task 2: minor (deferred): sekundaere Rate-Limits (403/429 mit retry-after) nicht speziell behandelt
- Task 2: minor (deferred): jeder andere 403 -> "Fehlende Berechtigung" (kann irrefuehren)
- Task 2: minor (deferred): Tests fehlen fuer non-JSON-Fehlerkoerper, 409, generischen 404, getTree recursive=false, listCommits ohne path, updateRef-Erfolg
- Task 2: minor (deferred): repo-Parameter unvalidiert/unencodiert interpoliert
- Task 3: minor (deferred): Login setChecking(false) nur im catch (ok solange Login nach Erfolg unmountet)
- Task 3: minor (deferred): neue CSS-Klassen (.remember, .hint, .error, .app-header) ungestylt — Kontrast/Fokus-Pass in T14
- Task 3: minor (deferred): App-Test "checking" leicht timing-abhaengig
- Task 3: minor (deferred): Retry-Bildschirm ohne Abmelden/Schluessel-wechseln
- Task 4: minor (deferred): onDelete.mode/Array/Form nicht validiert — wird in T7-Dispatch adressiert (planDelete wirft bei unbekanntem mode)
- Task 4: minor (deferred): titleField/sortBy/key/idField.type/toolbar/doppelte Feldnamen/Page-IDs unvalidiert; nicht-Array onDelete/pages -> TypeError
- Task 4: minor (deferred): keine positiven Tests fuer reference/onDelete/pages; process.cwd()-Annahme im Real-Config-Test
- Task 4: minor (deferred): cms.json strenger als validateContent (short required, note maxLength 500)
- Task 5: minor (deferred): listSites ohne try/catch je Repo — ein Fehler laesst ganze Liste scheitern
- Task 5: minor (deferred): loadSite prueft Form (Array/html) nicht
- Task 5: minor (deferred): kein Fokus-Management beim Wechsel Liste/Laden/Editor/Fehler
- Task 5: minor (deferred): kein hashchange-Listener (Zurueck-Taste wechselt Seite nicht)
- Task 5: minor (deferred): parseSiteHash case-sensitiv (PHZH-ZDL abgelehnt)
- Task 5: minor (deferred): closeSite setzt hash='' (History-Eintrag, nacktes #)
- Task 6: minor (deferred): Sortierung inkonsistent wenn nur manche Zeilen sort_order haben (neue Eintraege null)
- Task 6: minor (deferred): key={index} in Liste; r.id statt collection.key in rules/options hartkodiert
- Task 6: minor (deferred): Testluecken (Titel/Sortierfeld editieren + zurueck; collectionErrors direkt; slug read-only in CollectionView)
- Task 6: minor (deferred): aria-invalid auf fieldset; kein Fokus-Management nach Zurueck/Neu
- Task 7: minor (deferred): Dialogtexte OER-spezifisch (Fachbereich/Ressourcen/Lizenz) statt aus Sammlungs-Label
- Task 7: minor (deferred): mehrere onDelete-Regeln — Dialog nennt nur strengste, applyDelete wendet alle an
- Task 7: minor (deferred): neuer Eintrag mit leerer ID '' — Loeschen entfernt alle Eintraege mit ''; planDelete koennte '' matchen
- Task 7: minor (deferred): remove auf Nicht-Array wirft / nullify auf Array; Esc/Tab-Falle nur am Dialog-Knoten; Fokus nach Loeschen auf body; kein aria-describedby
- Task 8: minor (deferred): Doppelklick nur durch disabled geschuetzt (kein ref-guard)
- Task 8: minor (deferred): Entwurf mit altem baseSha nach Absturz zwischen updateRef und clearDraft -> Dauerkonflikt bis T9
- Task 8: minor (deferred): fehlende Tests beforeunload/Debounce/removedFiles via UI; truncated-Flag von getTree ignoriert; "Gespeichert." bleibt nach weiteren Aenderungen; mehrere Tabs teilen Entwurf
- Task 8: minor (deferred): settleDraftAfterSave trimmt removedFiles/newImages nicht; Entwurf hat bis ~1 s alten baseSha nach Speichern mit Folgeaenderungen
- Task 9: minor (deferred): Entwurf mit altem baseSha nach Unmount waehrend gemergtem Speichern (Rueckfrage evtl. erneut); Bild-Pfad-Kollision in newImages; Hinweis "seit dem Oeffnen geaendert" bleibt stehen; "Gespeichert." auch wenn nichts geschrieben; Tests fuer Unmount bei offenem Dialog und Key-Aenderung fehlen; cms.json-Aenderungen anderer nicht gemergt
- Task 9: minor (deferred): Retry-Schleife ersetzt Ancestor je Versuch (nicht ueber mehrere Retries geprobt); Ancestor-Reihenfolge -> theirs-Reihenfolge gewinnt
- Task 10: minor (deferred): geteilter Dateiname — markRemoved loescht Datei, die ein anderer Eintrag noch nutzt
- Task 10: minor (deferred): doppeltes Dekodieren grosser Bilder (~190 MB Spitze); defekte Datei erst bei Uebernehmen gemeldet; targetSize nur Breite; Fehlermeldung nicht per aria-describedby verknuepft
- Task 10: minor (deferred): Test Fokus-Rueckgabe an Ausloeser (ImageField) fehlt; kein Dialog-Test, dass MSG_NO_WEBP angezeigt wird
- Task 11: minor (deferred): Link ohne Auswahl fuegt URL als Text ein; Bundle 716 kB (Editor lazy laden); PageLinkForm zeigt Seiten-IDs statt Labels; richtext validate no-op
- Task 12: minor (deferred): getTree truncated-Flag ignoriert (unvollstaendiges ZIP bei >100k Eintraegen); Testluecken (Praefix content-old, Nicht-404-Fehler, Erfolgsweg/Download im Panel); Download feuert nach Panelwechsel
- Task 13: minor (deferred): verschobene Tags lassen Job dauerhaft rot (README-Satz); leeres Inhalts-Repo -> gruen; Strukturcheck nur Substrings
- Task 13: minor (deferred): Org-Menuepfad fuer fine-grained Tokens unverifiziert; Pages-Quelle "GitHub Actions" nur dokumentiert
- Task 14: minor (deferred): dev-middleware /bilder/ ohne Content-Type
- Design: minor (deferred): details-Toggle 24px; sidebar h2 vor h1; dev-middleware startsWith ohne Separator; <figure> in <p> bei Inline-Bild
- Task 15: minor (deferred): insertBanner matcht erstes <body auch in Kommentar; SW bleibt nach Abmelden registriert (leer)
- Task 16: minor (deferred): Dev-SPA-Fallback liefert index.html statt 404 fuer fehlende carousel.json (nur npm run dev)
- Task 15: minor (deferred): Vorschau laedt jeden Lauf ganzen contentRoot; Entwurf auf altem main kann geloeschtes Bild referenzieren
- Task 17: minor (deferred): usagesOf zaehlt alle Referenzfelder, planDelete nur onDelete-Felder; min/max/default in cmsConfig nicht geprueft; settings-Datei-Kollision nicht geprueft; falscher Typ in bestehender Datei still auf Standard; Zurueckaendern bleibt dirty
- Final: re-review clean (alle 5 addressed); Final: minor (deferred): neues unreferenziertes Bild wird hochgeladen; Hinweis 'geaendert' zusaetzlich zur Sperrleiste; neuer Eintrag mit leerem Schluessel bei Rows-Austausch
