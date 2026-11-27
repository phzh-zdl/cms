# Anleitung ZDL CMS: Inhalte der ZDL-Webseiten bearbeiten

Diese Anleitung ist für Teammitglieder, die Inhalte (zum Beispiel im OER-Katalog) pflegen.
Du brauchst nichts zu installieren, nur einen Browser (Chrome, Edge, Firefox oder Safari)
und ein Konto bei GitHub. Die Schritte 1 bis 3 machst du einmal, danach geht es direkt
mit Abschnitt 4 los.

> Hinweis zu den Bildern: Die Screenshots werden nach der Abnahme eingefügt.
> Bis dahin zeigen die Platzhalter, wo sie stehen werden.

## Inhalt

1. [GitHub-Konto anlegen](#konto)
2. [Zwei-Faktor-Anmeldung einrichten](#zwei-faktor)
3. [Zugangsschlüssel erstellen](#zugangsschluessel)
4. [Das CMS öffnen und anmelden](#anmelden)
5. [Einträge bearbeiten, neu anlegen, löschen](#eintraege)
6. [Bild hochladen und zuschneiden](#bild)
7. [Textseiten bearbeiten](#textseiten)
8. [Speichern](#speichern)
9. [Entwurf wiederherstellen](#entwurf)
10. [Gleichzeitige Änderung lösen](#konflikt)
11. [Exportieren und ZIP ans Webcenter schicken](#export)
12. [Verlauf ansehen](#verlauf)

<a id="konto"></a>

## 1. GitHub-Konto anlegen

GitHub ist der Dienst, bei dem die Inhalte gespeichert werden. Wer dort ein Konto hat und
vom Admin freigegeben wurde, darf Inhalte ändern.

1. Öffne <https://github.com/signup>.
2. Gib eine E-Mail-Adresse, ein Passwort und einen Benutzernamen ein. Der Benutzername
   erscheint später in der Änderungsliste, wähle also etwas, das dich erkennbar macht.
3. Bestätige die E-Mail-Adresse über den Link, den GitHub dir schickt.
4. Schicke deinen Benutzernamen dem Admin. Er nimmt dich ins Team auf.

**Tipp zum Datenschutz:** Unter github.com → Profilbild → Settings → Emails kannst du
„Keep my email addresses private" einschalten. Dann taucht deine echte E-Mail-Adresse
nicht in der Änderungsliste auf.

*Du müsstest jetzt* eingeloggt auf github.com sein und vom Admin eine Einladung
(Mail oder Hinweis auf der GitHub-Startseite) zur Organisation „phzh-zdl" bekommen.
Nimm sie an.

![Screenshot: GitHub-Konto](bilder/konto.png)

<a id="zwei-faktor"></a>

## 2. Zwei-Faktor-Anmeldung einrichten

Zwei-Faktor heisst: Zum Passwort kommt ein zweiter Nachweis, zum Beispiel ein Code aus einer
App auf deinem Handy. Das schützt dein Konto, auch wenn jemand dein Passwort kennt.
Zwei-Faktor ist für die Arbeit im ZDL CMS vorgesehen; bitte richte es ein.

1. Klicke auf github.com oben rechts auf dein Profilbild → **Settings**.
2. Links: **Password and authentication**.
3. Unter „Two-factor authentication" auf **Enable two-factor authentication** klicken.
4. Wähle „Authenticator app" und scanne den QR-Code mit einer Authenticator-App
   (zum Beispiel Microsoft Authenticator oder Google Authenticator).
5. Gib den 6-stelligen Code aus der App ein.
6. Speichere die **Wiederherstellungscodes** (Recovery codes) an einem sicheren Ort,
   zum Beispiel im Passwortmanager. Sie sind dein Notausgang, falls das Handy weg ist.

*Du müsstest jetzt* unter „Two-factor authentication" den Hinweis „Enabled" sehen.

![Screenshot: Zwei-Faktor](bilder/zwei-faktor.png)

<a id="zugangsschluessel"></a>

## 3. Zugangsschlüssel erstellen

Das CMS braucht einen persönlichen Zugangsschlüssel (bei GitHub heisst er „fine-grained
personal access token"). Er ist wie ein Passwort nur für das CMS: Er erlaubt dem CMS, in
deinem Namen Inhalte zu lesen und zu speichern, und sonst nichts. Du kannst ihn jederzeit
selbst widerrufen.

1. Öffne <https://github.com/settings/personal-access-tokens/new>. Alternativ:
   Profilbild → **Settings** → ganz unten links **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
   (GitHub fragt eventuell nach deinem Passwort oder einem Code aus der App.)
2. **Token name:** zum Beispiel `CMS` (nur zu deiner Orientierung).
3. **Expiration:** wähle **90 days**. Danach läuft der Schlüssel von selbst ab und du
   erstellst einen neuen. Trage dir einen Kalendereintrag ein.
4. **Resource owner:** wähle **phzh-zdl** (nicht dein privates Konto).
   Fehlt „phzh-zdl" in der Liste, hast du die Einladung aus Schritt 1 noch nicht angenommen.
5. **Repository access:** wähle **Only select repositories** und hake nur die Seiten an,
   die du bearbeiten sollst (zum Beispiel `oer-dashboard`). Nicht „All repositories".
6. Klappe **Permissions** auf → **Repository permissions** und stelle ein:
   - **Contents:** **Read and write**
   - **Metadata:** **Read-only** (steht schon da, lässt sich nicht abwählen)

   Alles andere bleibt auf „No access".
7. Klicke unten auf **Generate token** und bestätige die Rückfrage mit **Generate token**.
8. GitHub zeigt jetzt den Schlüssel an, er beginnt mit `github_pat_`. Klicke auf das
   Kopier-Symbol daneben und füge ihn sofort im CMS ein (Abschnitt 4).

**Wichtig:** GitHub zeigt den Schlüssel **nur dieses eine Mal**. Schliesst du die Seite, ist er
weg, und du musst einen neuen erstellen. Gib den Schlüssel nie weiter (nicht per Mail, Chat oder
Ticket). Wer ihn hat, kann in deinem Namen Inhalte ändern.

Muss die Organisation neue Schlüssel erst freigeben, steht bei „Generate token" ein Hinweis
(„Pending approval"). Dann gibt der Admin ihn unter der Organisation frei, bevor er funktioniert.

*Du müsstest jetzt* den Schlüssel in der Zwischenablage haben und ihn in der Liste unter
Settings → Developer settings → Fine-grained tokens mit Namen „CMS" und Ablaufdatum sehen.

**Schlüssel widerrufen** (bei Verlust oder wenn du ihn nicht mehr brauchst): dieselbe Liste →
den Schlüssel anklicken → **Delete** bzw. **Revoke**. Er funktioniert sofort nicht mehr.

![Screenshot: Schlüssel erstellen](bilder/zugangsschluessel.png)

<a id="anmelden"></a>

## 4. Das CMS öffnen und anmelden

1. Öffne <https://phzh-zdl.github.io/cms/>.
2. Füge den Schlüssel in das Feld **Zugangsschlüssel** ein.
3. Hake **Auf diesem Gerät merken** nur an, wenn es dein persönliches Gerät ist. Ohne Haken
   vergisst der Browser den Schlüssel, sobald du das Fenster schliesst, und du fügst ihn
   beim nächsten Mal neu ein.
4. Klicke auf **Anmelden**.
5. Wähle unter **Seite wählen** die Seite, die du bearbeiten willst.

*Du müsstest jetzt* oben „Angemeldet als" mit deinem Namen und links die Bereiche der Seite
sehen (zum Beispiel Fachbereiche, Ressourcen, Textseiten).

Meldet das CMS „Dieser Zugangsschlüssel ist ungültig oder abgelaufen", erstelle einen neuen
(Abschnitt 3). Mit **Abmelden** oben vergisst der Browser den Schlüssel sofort.

![Screenshot: Anmeldung](bilder/anmeldung.png)

<a id="eintraege"></a>

## 5. Einträge bearbeiten, neu anlegen, löschen

Links wählst du einen Bereich (zum Beispiel „Ressourcen"). Rechts erscheint die Liste.

**Bearbeiten**
1. Über **Suchen** findest du einen Eintrag schnell. Klicke ihn in der Liste an.
2. Ändere die Felder. Fehler stehen als Text direkt unter dem Feld.
3. Mit **Zurück zur Liste** kommst du zurück. Die Änderung ist noch nicht gespeichert
   (siehe Abschnitt 8).

**Fachbereich einer Ressource ändern („umhängen")**: Öffne die Ressource und wähle im Feld
für den Fachbereich einen anderen. Danach speichern.

**Neu anlegen**
1. Klicke in der Liste auf **Neu**.
2. Fülle die Felder aus. Die **ID** (Kennung) entsteht aus dem Namen und lässt sich später
   nicht mehr ändern.
3. Speichern.

**Löschen**
1. Öffne den Eintrag und klicke auf **Löschen**.
2. Es öffnet sich ein Fenster, das dir sagt, was mit anderen Einträgen passiert:
   - **Fachbereich, der noch verwendet wird:** Du musst unter **Verschieben nach** einen
     anderen Fachbereich wählen. Die Ressourcen wandern dorthin.
   - **Format oder Zielstufe:** wird aus allen Ressourcen entfernt, die es verwenden
     („Wird aus N Ressourcen entfernt").
   - **Lizenz:** die betroffenen Ressourcen haben danach keine Lizenz mehr.
3. Bestätige mit **Löschen** oder brich mit **Abbrechen** (oder der Esc-Taste) ab.
4. Speichern. Erst dann ist es endgültig. Auch danach lässt sich ein früherer Stand
   über den Admin wiederherstellen (siehe Abschnitt 12).

*Du müsstest jetzt* unten in der Speicherleiste die Meldung „Ungespeicherte Änderungen" sehen.

![Screenshot: Eintrag bearbeiten](bilder/eintrag.png)

<a id="bild"></a>

## 6. Bild hochladen und zuschneiden

1. Im Eintrag beim Feld für das Bild auf **Bild wählen** klicken (bei vorhandenem Bild: **Bild ersetzen**).
2. Wähle eine Datei vom Typ PNG, JPEG, WebP oder GIF, höchstens 5 MB. Andere Dateien
   (zum Beispiel SVG) lehnt das CMS mit einer Erklärung ab.
3. Es öffnet sich **Bild zuschneiden**:
   - **Zuschneiden:** Der Rahmen hat feste Proportionen (5:3). Verschiebe das Bild mit der
     Maus und zoome mit dem Regler **Zoom**.
   - **Ganzes Bild zeigen:** für Logos und Icons. Das Bild wird nicht beschnitten, sondern
     mittig auf eine Fläche in der Farbe des Fachbereichs gesetzt.
4. Erscheint „Bild wird unscharf wirken", ist das Bild zu klein. Nimm wenn möglich ein
   grösseres (mindestens 640 Pixel breit).
5. **Übernehmen** behält den gewählten Ausschnitt, **Abbrechen** verwirft ihn.
   Das CMS verkleinert das Bild selbst und legt nur das fertige Ergebnis ab, das Original
   wird nicht aufbewahrt.
6. Neu zuschneiden geht nur, indem du das Bild nochmals wählst.
7. **Bild entfernen** nimmt das Bild vom Eintrag weg.

*Du müsstest jetzt* eine Vorschau des Bildes im Eintrag sehen. Gespeichert wird es mit dem Rest
(Abschnitt 8).

![Screenshot: Bild zuschneiden](bilder/zuschneiden.png)

<a id="textseiten"></a>

## 7. Textseiten bearbeiten

Unter **Textseiten** (links) liegen Seiten wie Impressum, Datenschutz oder Kontakt.

1. Klicke die Seite an. Oben steht der **Titel**, darunter der Text mit einer Werkzeugleiste.
2. Markiere Text und wähle in der Werkzeugleiste zum Beispiel **Fett**, **Kursiv**,
   **Zwischentitel**, **Aufzählung** oder **Nummerierte Liste**.
3. **Link:** Text markieren, **Link** klicken, die Adresse eingeben. Erlaubt sind Adressen
   mit `https://`, E-Mail-Adressen mit `mailto:` und Links auf andere Seiten
   (**Link auf andere Seite**, wo angeboten). Andere Adressen lehnt das CMS ab.
4. Mit **Vorschau anzeigen** siehst du, wie der Text aussieht; **Bearbeiten** geht zurück.
5. Du gibst nie Code ein. Eingefügter Text aus Word oder dem Web wird automatisch
   bereinigt, Formatierungen, die es nicht gibt, fallen weg.
6. Speichern (Abschnitt 8).

![Screenshot: Textseite](bilder/textseite.png)

<a id="speichern"></a>

## 8. Speichern

Alles, was du geändert hast (Einträge, Bilder, Textseiten), wird mit **einem** Klick auf
**Speichern** (in der Leiste am unteren Rand) gesichert.

1. Klicke auf **Speichern**.
2. Gibt es Fehler, steht oben „Bitte zuerst die markierten Fehler beheben." mit der Liste der
   betroffenen Bereiche. Behebe sie und speichere erneut.
3. Bei Erfolg steht „Gespeichert." und der Hinweis wechselt zu „Alle Änderungen gespeichert.".

Mit **Speichern** ändert sich noch nicht die öffentliche Seite. Sie ändert sich erst, wenn
das Webcenter das exportierte ZIP eingespielt hat (Abschnitt 11).

*Du müsstest jetzt* „Alle Änderungen gespeichert." sehen.

<a id="entwurf"></a>

## 9. Entwurf wiederherstellen

Ungespeicherte Änderungen werden laufend auf deinem Gerät zwischengespeichert. Schliesst du
den Tab oder stürzt der Browser ab, geht nichts verloren.

1. Öffne das CMS und dieselbe Seite wieder, auf dem **gleichen Gerät und im gleichen Browser**.
2. Es erscheint „Es gibt ungespeicherte Änderungen vom …. Wiederherstellen?".
3. **Wiederherstellen** holt deinen Stand zurück, **Verwerfen** löscht ihn.

Der Entwurf liegt nur auf diesem Gerät. Auf einem anderen Rechner oder nach dem Löschen
der Browserdaten ist er nicht da. Speichere deshalb wichtige Änderungen bald.

<a id="konflikt"></a>

## 10. Gleichzeitige Änderung lösen

Hat jemand anderes in der Zwischenzeit etwas gespeichert, merkt das CMS das beim Speichern.

- Änderungen an **verschiedenen** Einträgen übernimmt das CMS selbst, ihr müsst nichts tun.
- Haben beide **denselben** Eintrag geändert, öffnet sich das Fenster **Gleichzeitige Änderung**.
  Es zeigt **Meine Version** und **Die andere Version** nebeneinander; Unterschiede sind mit
  „– geändert" markiert.

1. Lies beide Fassungen.
2. Wähle **Meine Version übernehmen** oder **Die andere Version übernehmen**.
3. Gibt es mehrere Konflikte, kommen sie nacheinander („Konflikt 1 von 3").
4. Danach speichert das CMS den zusammengeführten Stand. Mit **Abbrechen** bleibt alles, wie es
   war, und deine Änderungen bleiben vorhanden.

Möchtest du von beiden etwas behalten, wähle eine Fassung und trage den Rest danach von
Hand nach. Das CMS zeigt dir ausserdem einen Hinweis, wenn die Seite seit deinem letzten
Stand verändert wurde („Diese Seite wurde seit dem Öffnen von … geändert.").

*Du müsstest jetzt* nach dem letzten Konflikt „Gespeichert." sehen.

![Screenshot: Gleichzeitige Änderung](bilder/konflikt.png)

<a id="export"></a>

## 11. Exportieren und ZIP ans Webcenter schicken

Die öffentliche Seite liegt auf einem PH-Server. Damit deine Änderungen dort erscheinen,
erzeugst du ein ZIP und schickst es dem Webcenter.

1. **Speichere zuerst alle Änderungen** (Abschnitt 8). Bei ungespeicherten Änderungen steht
   „Bitte zuerst speichern." und der Knopf ist gesperrt.
2. Klicke links auf **Exportieren**, dann auf **ZIP erstellen**.
3. Das CMS lädt die Dateien (Anzeige „Dateien werden geladen … 12 von 40") und die Datei
   mit Seitenname und Datum im Namen erscheint in deinen Downloads.
4. Schicke das ZIP dem Webcenter und bitte darum, es auf dem Server einzuspielen
   (das ZIP ersetzt den bisherigen Inhalt der Seite).

Das ZIP enthält die fertige Seite und alle gespeicherten Inhalte, es braucht nichts
Zusätzliches.

*Du müsstest jetzt* „ZIP erstellt: …" sehen und die Datei im Download-Ordner finden.

Erscheint „Die Seite wurde noch nicht gebaut", wende dich an die zuständige Entwicklerin
bzw. den Entwickler.

![Screenshot: Exportieren](bilder/export.png)

<a id="verlauf"></a>

## 12. Verlauf ansehen

Links unter **Verlauf** siehst du die letzten Änderungen: wer, wann, was. Das ist praktisch,
um zu klären, wer etwas geändert hat.

Etwas Falsches gespeichert oder versehentlich gelöscht? Melde dich beim Admin mit Datum und
Eintrag. Alle früheren Stände sind erhalten und zusätzlich gibt es jede Nacht eine
Sicherungskopie.

![Screenshot: Verlauf](bilder/verlauf.png)

## Wenn etwas nicht klappt

| Meldung / Problem | Was tun |
|---|---|
| „Dieser Zugangsschlüssel ist ungültig oder abgelaufen." | Neuen Schlüssel erstellen (Abschnitt 3). |
| „Keine Seiten gefunden." | Der Schlüssel hat keinen Zugriff auf die Seite. Neuen Schlüssel erstellen und die Seite unter „Repository access" anhaken. |
| Anmeldung wird geprüft, bleibt hängen | Internetverbindung prüfen, dann **Erneut versuchen**. |
| „Speichern ist gerade nicht möglich …" | Eine Minute warten und erneut versuchen. Deine Änderungen bleiben erhalten. |
| Schlüssel verloren oder unabsichtlich weitergegeben | Sofort widerrufen (Ende von Abschnitt 3), neuen erstellen, Admin informieren. |
