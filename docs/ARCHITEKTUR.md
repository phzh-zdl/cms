# Architektur

(Task 14 ergänzt die übrigen Abschnitte dieses Dokuments.)

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
