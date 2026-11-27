# CMS für den PHZH-OER-Katalog

Browserbasiertes CMS (Vite + React, statisch, auf GitHub Pages), mit dem die Inhalte
des OER-Katalogs über die GitHub-API bearbeitet werden. Es gibt keinen eigenen Server und keine
Datenbank; die einzige externe Verbindung ist `https://api.github.com`. Die Oberfläche ist deutsch
und verwendet kein Git-Vokabular.

## Dokumentation

| Dokument | Für wen |
|---|---|
| [`docs/ANLEITUNG.md`](docs/ANLEITUNG.md) | Team: Konto, Zugangsschlüssel, Bedienung, Export |
| [`docs/SICHERHEIT.md`](docs/SICHERHEIT.md) | Sicherheitsausschuss: Datenfluss, Zugriffe, Risiken, Datenschutz, Notfälle |
| [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) | Entwickler:innen: Aufbau, `cms.json`-Referenz, Erweiterung, Deployment |
| [`docs/BARRIEREFREIHEIT.md`](docs/BARRIEREFREIHEIT.md) | Prüfung nach WCAG 2.1 AA, bekannte Lücken, Checkliste |
| [`backup/README.md`](backup/README.md) | Nächtliche Sicherung und Wiederherstellung |

Konzept und Umsetzungsplan: [`docs/superpowers/`](docs/superpowers/).

## Lokal starten

```bash
npm install
npm run dev     # localhost:5174
npm test
npm run build   # erzeugt dist/ inklusive dist/anleitung.html
```
