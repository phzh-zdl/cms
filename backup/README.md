# phzh-zdl/backup

Nächtliche Sicherung aller Inhalts-Repos des PHZH-OER-Katalogs (zuerst `oer-dashboard`).
Dieses Repo enthält keinen eigenen Inhalt, sondern nur Kopien.

## Wozu

Die Inhalte (Seiten, Ressourcen, Bilder) liegen in eigenen GitHub-Repos und werden
über das CMS bearbeitet. Geht dort etwas verloren (versehentlich gelöscht, Historie
überschrieben), liegt hier noch der Stand der letzten Nacht.

Der Workflow `.github/workflows/mirror.yml` läuft täglich um 01:00 UTC (02:00 Zürich im
Winter, 03:00 im Sommer) und kann unter Actions → mirror → "Run workflow" von Hand
gestartet werden. Pro Inhalts-Repo entstehen hier:

- Branches `<repo>/<branch>`, z. B. `oer-dashboard/main`
- Tags `<repo>/<tag>`

Es wird nie mit Force gepusht. Wurde in einem Inhalts-Repo die Historie umgeschrieben,
wird der Push abgelehnt, der Lauf wird rot und GitHub schickt den Admins eine Mail.
Die Sicherung bleibt dann unverändert auf dem letzten guten Stand.

## Einrichten

1. Privates Repo `phzh-zdl/backup` anlegen.
2. Die beiden Dateien aus dem CMS-Repo (Ordner `backup/`) hierher kopieren:
   `README.md` und `.github/workflows/mirror.yml`. Committen und pushen.
3. Fine-grained Token anlegen und als Secret `MIRROR_TOKEN` hinterlegen
   (Schritt-für-Schritt in `docs/ARCHITEKTUR.md` im CMS-Repo, Abschnitt "Deployment und Sicherung").
4. Neue Inhalts-Repos in `mirror.yml` unter `matrix.repo` ergänzen und dem Token Zugriff geben.

## Hinweis zu den gespiegelten Workflows

Die Inhalts-Repos enthalten eigene Workflow-Dateien (`.github/workflows/*`), die hier
mitgespiegelt werden. Sie laufen im Backup-Repo nicht: Ihre Trigger beziehen sich auf
`main`, die gespiegelten Branches heissen aber `<repo>/main`. Nur `mirror.yml` auf dem
echten `main` dieses Repos läuft.

## Wiederherstellen (Aufgabe für Admins)

Beispiel: `oer-dashboard` ist kaputt, der Stand von `oer-dashboard/main` soll zurück.
Zuerst in einen **neuen Branch** wiederherstellen, nicht direkt auf `main`:

```bash
git clone https://github.com/phzh-zdl/backup.git
cd backup
git push https://github.com/phzh-zdl/oer-dashboard.git refs/remotes/origin/oer-dashboard/main:refs/heads/wiederherstellung
```

In einem frischen Clone liegen die gespiegelten Branches als
`refs/remotes/origin/<repo>/<branch>`, deshalb der volle Ref-Name. Danach im Inhalts-Repo
den Branch `wiederherstellung` prüfen und per Pull Request nach `main` bringen.

Warum nicht direkt auf `main`: Ein Push auf `main` wird abgelehnt, sobald `main` weiter
gelaufen ist, und ein Überschreiben (Force) würde die neueren Änderungen vernichten. Das
ist eine bewusste Admin-Entscheidung und gehört nicht in den Normalbetrieb. Der Pull
Request zeigt, was sich ändert, bevor etwas verloren geht.

Tags: `refs/tags/<repo>/<tag>:refs/tags/<tag>`.
