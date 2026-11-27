# Sicherheit und Datenschutz des CMS

Dieses Dokument richtet sich an den Sicherheitsausschuss. Es beschreibt in einfacher Sprache,
wie das CMS (Werkzeug zum Bearbeiten von Webseiten-Inhalten) funktioniert, wer worauf
zugreifen kann, wo was gespeichert wird und was bei Problemen geschieht. Unvermeidliche
Fachbegriffe werden beim ersten Auftreten in einem Satz erklärt.

## 1. Kurzfassung

- Das CMS ist **nur Programmcode, der im Browser der bearbeitenden Person läuft**. Es gibt
  keinen eigenen Server, keine eigene Datenbank und keine eigenen Benutzerkonten oder Passwörter.
- Die Inhalte liegen in **privaten Repositories** (Ordner mit Änderungsverlauf) der
  Organisation `phzh-zdl` bei GitHub. Wer ändern darf, bestimmt GitHub (Team-Mitgliedschaft,
  Zwei-Faktor-Pflicht, Voraussetzung, siehe Abschnitt 9).
- Das CMS verbindet sich **ausschliesslich mit `api.github.com`**. Alles andere blockiert der
  Browser.
- Jede Änderung ist mit Person und Zeit nachvollziehbar und lässt sich zurücknehmen.
  Zusätzlich wird jede Nacht eine Sicherungskopie angelegt.
- Das öffentliche Ergebnis (die Webseite) wird als ZIP exportiert und vom Webcenter auf
  einem PH-Server eingespielt. Das CMS veröffentlicht nie selbst.

## 2. Datenfluss

```
 Team-Mitglied (Browser)
   |
   |  1. lädt den Programmcode des CMS (nur Code, keine Inhalte)
   v
 GitHub Pages  (phzh-zdl.github.io/cms, öffentlich, enthält keine Geheimnisse)


 Team-Mitglied (Browser, CMS läuft hier)
   |
   |  2. liest und schreibt Inhalte, verschlüsselt (HTTPS),
   |     mit dem persönlichen Zugangsschlüssel
   v
 api.github.com  <------>  private Inhalts-Repos  (z. B. phzh-zdl/oer-dashboard)
                                   |
                                   |  3. nachts: Spiegelkopie
                                   v
                           privates Backup-Repo (nur Admins)

 Team-Mitglied (Browser)
   |
   |  4. "Exportieren": ZIP wird im Browser erstellt und heruntergeladen
   v
 Webcenter  ----->  PH-Server  ----->  öffentliche Webseite
```

Schritt 1 und 2 sind die einzigen Verbindungen des CMS. Die öffentliche Webseite hat
keine Verbindung zu GitHub und zum CMS: Sie besteht aus den Dateien, die das Webcenter
auf dem PH-Server eingespielt hat.

## 3. Wer hat worauf Zugriff

| Wer | Was darf die Person | Wer bestimmt das |
|---|---|---|
| **Owner der Organisation** (Admin, wenige Personen) | Alles in der Organisation: Repos anlegen, Team verwalten, Einstellungen, Sicherung | GitHub-Organisation |
| **Team-Mitglied** | Inhalte der freigegebenen Repos lesen und ändern (über das CMS oder direkt bei GitHub) | Mitgliedschaft im GitHub-Team, durch den Owner gesteuert |
| **Der persönliche Zugangsschlüssel** | Nur das, was die Person selbst darf, und davon nur Inhalte der ausgewählten Repos (siehe Abschnitt 5) | Person bei der Erstellung, Owner bei Freigabe |
| **Alle anderen** (auch mit Link zum CMS) | Sehen nur die Anmeldeseite. Ohne Schlüssel und Team-Mitgliedschaft passiert nichts | GitHub |
| **Webcenter** | Erhält nur das exportierte ZIP, hat keinen Zugriff auf GitHub | PH |

Das CMS kennt keine eigenen Rechte. Es prüft nichts selbst, sondern leitet jede Aktion an
GitHub weiter. GitHub entscheidet mit dem Schlüssel, ob sie erlaubt ist.

**Voraussetzung (Einstellung durch den Owner der Organisation, siehe Abschnitt 9):** Zwei-Faktor-Pflicht
für alle Mitglieder (zum Passwort kommt ein zweiter Nachweis, zum Beispiel ein Code aus einer App).

## 4. Was wird wo gespeichert

| Was | Wo | Wie lange | Wer sieht es |
|---|---|---|---|
| Inhalte (Texte, Ressourcen, Bilder) | Private Repos bei GitHub (USA, siehe Abschnitt 7) | Dauerhaft, mit Änderungsverlauf | Team-Mitglieder, Owner |
| Sicherungskopie | Privates Backup-Repo bei GitHub | Spiegel, fortlaufend aktualisiert | Nur Admins |
| Zugangsschlüssel | Im Browser der Person: standardmässig `sessionStorage` (verschwindet beim Schliessen des Fensters), nur wenn die Person „Auf diesem Gerät merken" ankreuzt in `localStorage` (bleibt bis zum Abmelden) | Siehe links | Nur der Browser auf diesem Gerät |
| Entwürfe (ungespeicherte Änderungen) | `localStorage` im Browser auf dem Gerät der Person, damit ein geschlossenes Fenster nichts kostet | Bis zum Speichern oder Verwerfen | Nur dieses Gerät |
| Programmcode des CMS | GitHub Pages (öffentlich) | Dauerhaft | Alle, enthält nichts Vertrauliches |
| Exportierte ZIP-Datei | Download-Ordner der Person, danach beim Webcenter | Bis zum Löschen | Person, Webcenter |

Erklärung: `sessionStorage` und `localStorage` sind kleine Speicherbereiche, die der Browser
pro Webseite führt. Sie sind **keine Cookies** und werden nicht an einen Server geschickt.

Nicht vorhanden: eigener Server, eigene Datenbank, Cookies des CMS, Werbe- oder
Statistik-Dienste, Schriften oder Skripte von fremden Servern.

**Die öffentliche Webseite (zum Beispiel der OER-Katalog) speichert nichts im Browser.**
Das gilt für den Katalog. Eine künftig angebundene Webseite kann abweichen (zum Beispiel
speichert eine Lese-Seite den Lesefortschritt lokal im Browser); das wird dann im
Sicherheitsdokument jener Seite genannt.

## 5. Der Zugangsschlüssel

Der Schlüssel (bei GitHub: „fine-grained personal access token") ist ein langer Zeichencode.
Wer ihn kennt, kann damit das tun, wofür er ausgestellt wurde, ohne Passwort und ohne
zweiten Nachweis. Er wird deshalb eng begrenzt:

- **Rechte:** nur *Contents: Read and write* (Inhalte lesen und schreiben) und
  *Metadata: Read* (Grunddaten lesen). Kein Zugriff auf Einstellungen, Mitglieder,
  Automatisierungen oder andere Bereiche.
- **Wo gilt er:** nur für die ausgewählten Repos der Organisation, nicht für alle.
- **Laufzeit:** empfohlen **90 Tage**. Danach funktioniert er nicht mehr, die Person erstellt
  einen neuen. Voraussetzung (Einstellung des Owners, siehe Abschnitt 9): Höchstlaufzeit
  erzwingen und neue Schlüssel vorab freigeben lassen.
- **Widerrufen:** jederzeit durch die Person selbst (github.com → Settings → Developer
  settings → Fine-grained tokens → Delete) oder durch den Owner der Organisation (unter
  Organisation → Settings → Personal access tokens). Wirkt sofort.
- **Abmelden im CMS** löscht den Schlüssel aus dem Browser.
- Der Schlüssel wird nie in den Inhalten, im Code oder in Protokollen abgelegt.

Wie die Person ihn erstellt, steht in der Anleitung für das Team (`docs/ANLEITUNG.md`).

**Sicherungsschlüssel:** Die nächtliche Sicherung nutzt einen eigenen Schlüssel, der nur als
geschütztes Geheimnis im Backup-Repo liegt (nie im Code). Er braucht weitergehende Rechte
(auch auf Automatisierungsdateien der Inhalts-Repos) und wird deshalb nur von Admins
verwaltet, mit Ablaufdatum und Kalendererinnerung zur Erneuerung.

## 6. Risiken und Gegenmassnahmen

| Risiko | Was könnte passieren | Gegenmassnahme | Restrisiko |
|---|---|---|---|
| **Schlüssel gestohlen** (Malware, fremder Zugriff aufs Gerät, weitergegeben) | Fremde ändern oder löschen Inhalte der freigegebenen Repos | Schlüssel eng begrenzt (nur Inhalte, nur ausgewählte Repos), läuft nach 90 Tagen ab, sofort widerrufbar; Zwei-Faktor (sobald als Pflicht eingestellt, Abschnitt 9) schützt das Konto selbst; Standard ist „nur diese Sitzung" statt dauerhaft | Bis zum Widerruf kann der Schlüssel genutzt werden |
| **Schadcode im CMS** (Cross-Site-Scripting: fremder Code wird in die Seite eingeschleust und könnte den Schlüssel lesen) | Schlüssel wird abgegriffen | Strenge Inhaltsregel des Browsers (CSP): nur eigener Code darf laufen, Verbindungen nur zu `api.github.com`, damit kann nichts an einen fremden Server gesendet werden; Inhalte werden nie als HTML angezeigt, ausser bereinigtem formatiertem Text (Bereinigungsfilter lässt nur eine feste Liste harmloser Elemente zu, keine Skripte); alle Bausteine im Code gebündelt, nichts wird von fremden Servern nachgeladen; automatische Prüfung der Bausteine auf bekannte Sicherheitslücken: Dependabot öffnet wöchentlich (npm) bzw. monatlich (GitHub Actions) Änderungsvorschläge, und bei jedem Push prüft `npm audit` auf schwere Lücken (nur npm-Bausteine) | Eine unbekannte Lücke in einem Baustein bleibt möglich; die Massnahmen verkleinern den Schaden |
| **Gleichzeitiges Bearbeiten** | Zwei Personen überschreiben sich | CMS speichert nie über fremde Änderungen hinweg: Es lädt den neuen Stand, führt Einträge zusammen, die nur eine Person geändert hat, und zeigt bei denselben Einträgen beide Fassungen zur Wahl | Eine falsche Wahl im Dialog; dann hilft der Verlauf |
| **Versehentliches Löschen** | Eintrag oder Bild fehlt | Jede Änderung ist im Verlauf festgehalten und lässt sich wiederherstellen; nächtliche Sicherungskopie; Löschen mit Rückfrage und Hinweis auf betroffene Einträge | Bis zu ein Tag Änderungen, falls Verlauf und Original zugleich beschädigt würden |
| **Verlauf umgeschrieben oder Hauptzweig gelöscht** (nur mit gestohlenem Schlüssel oder ausserhalb des CMS) | Frühere Stände gehen im Inhalts-Repo verloren | Das CMS selbst überschreibt nie Verlauf und löscht nie Zweige. Die nächtliche Sicherung weigert sich, einen umgeschriebenen Stand zu übernehmen, wird dann rot und alarmiert die Admins per Mail; die Kopie bleibt auf dem letzten guten Stand | **Es gibt keinen Schutz des Hauptzweigs** (diese Funktion ist bei privaten Repos im gewählten GitHub-Tarif nicht enthalten). Ein Angreifer mit gültigem Schlüssel könnte den Verlauf im Inhalts-Repo umschreiben. Der Schaden ist auf höchstens einen Tag begrenzt, weil die Sicherung davor liegt |
| **Ungeeignete Bilder oder Dateien** | Schadcode oder Riesendateien über Bilder | Nur PNG, JPEG, WebP, GIF bis 5 MB, Prüfung am Dateiinhalt (nicht nur am Namen); Bild wird im Browser neu erzeugt (WebP, verkleinert), SVG nicht erlaubt | gering |
| **Gefährliche Links in Texten** | Link führt auf schädliche Adresse oder führt Code aus | Nur `https://`, `mailto:` und interne Links erlaubt; sonst wird der Link abgelehnt | Ein Link auf eine https-Seite mit schädlichem Inhalt bleibt möglich |
| **Veröffentlichung fehlerhafter Inhalte** | Falscher Inhalt auf der öffentlichen Seite | Das CMS veröffentlicht nichts selbst; der Weg geht über Export und Webcenter, dort kann geprüft werden | Prüfung liegt beim Webcenter |

## 7. Datenschutz

- **Speicherort:** GitHub gehört zu Microsoft, die Daten liegen auf Servern in den USA.
  Gespeichert sind die Inhalte der Webseiten (bei dem OER-Katalog öffentliche
  Informationen über Lehr- und Lernmaterial) und der Änderungsverlauf.
- **Personenbezogene Daten:** Im Verlauf steht pro Änderung der **GitHub-Name** der Person
  (und je nach Einstellung die E-Mail-Adresse) sowie Datum und Uhrzeit. Die Inhalts-Repos
  sind privat, der Verlauf ist also nur für Team und Owner sichtbar.
- **Empfehlung:** Teammitglieder nutzen bei GitHub die **noreply-Adresse**
  (Settings → Emails → „Keep my email addresses private"), damit ihre echte E-Mail-Adresse
  nicht im Verlauf steht. Die Anleitung weist darauf hin.
- **Das CMS selbst** erhebt und speichert keine Daten über Personen: keine Statistik, keine
  Cookies, keine Weitergabe an Dritte ausser an GitHub, wo sich die Person ohnehin anmeldet.
- **Rechtliche Beurteilung** (Datenschutzgesetz des Bundes bzw. des Kantons, Bearbeitung
  im Ausland, Verträge mit dem Anbieter) liegt bei der PH. Dieses Dokument beschreibt nur
  die technischen Tatsachen.

## 8. Notfälle

**Ein Zugangsschlüssel ist verloren gegangen oder wurde weitergegeben (Leak)**
1. Die Person **widerruft ihn sofort** (github.com → Settings → Developer settings →
   Fine-grained tokens → Delete). Ist das nicht möglich, widerruft der Owner ihn unter
   Organisation → Settings → Personal access tokens.
2. Die Person informiert den Admin und erstellt einen neuen Schlüssel.
3. Der Admin sieht im Verlauf der Repos nach, ob unbekannte Änderungen erfolgt sind, und stellt
   sie bei Bedarf wieder her (siehe unten).

**Eine Person verlässt das Team**
1. Der Owner entfernt sie aus dem GitHub-Team (damit verliert ihr Schlüssel den Zugriff auf
   die Repos).
2. Der Owner prüft unter Organisation → Settings → Personal access tokens, ob Schlüssel
   dieser Person aktiv sind, und widerruft sie.
3. Die Person löscht Schlüssel und Entwürfe auf ihren Geräten (CMS → Abmelden).

**Etwas wurde versehentlich gelöscht oder falsch geändert**
1. Zuerst im **Verlauf** (im CMS unter „Verlauf" oder bei GitHub unter „Commits")
   nachsehen. Ein früherer Stand lässt sich dort durch einen Admin wiederherstellen.
2. Ist der Verlauf selbst beschädigt, stellt ein Admin den Stand der letzten Nacht aus der
   **Sicherungskopie** wieder her. Die Anleitung dazu steht in `backup/README.md`.

**Die nächtliche Sicherung meldet einen Fehler (rote Mail an die Admins)**
Der häufigste Grund ist ein abgelaufener Sicherungsschlüssel. Ein weiterer Grund ist,
dass in einem Inhalts-Repo der Verlauf umgeschrieben wurde. Dann weigert sich die Sicherung
bewusst, den Stand zu überschreiben. Die Admins prüfen das Repo und stellen bei Bedarf aus der Kopie
wieder her (`backup/README.md`).

## 9. Vor dem Produktivbetrieb einzurichten

Mehrere Schutzmassnahmen dieses Dokuments hängen an Einstellungen der GitHub-Organisation, die der
Owner vornimmt. Stand: **noch nicht eingerichtet**; vor dem Produktivbetrieb abzuhaken:

- [ ] Zwei-Faktor-Pflicht für alle Mitglieder der Organisation
- [ ] Fine-grained Zugangsschlüssel erlauben, mit Höchstlaufzeit (empfohlen 90 Tage) und Freigabe durch den Owner
- [ ] Team mit Zugriff nur auf die Inhalts-Repos (Schreibrecht), keine weiteren Repos
- [ ] GitHub Pages des CMS-Repos auf die Quelle „GitHub Actions" stellen
- [ ] Backup-Repo (privat, nur Admins) mit Secret `MIRROR_TOKEN`, ein erster Lauf grün (Schritte in `docs/ARCHITEKTUR.md`)

Als PDF: im Browser öffnen → Drucken → Als PDF speichern.
