# CSV to Calendar

CSV & Excel in Google Kalender – auch über 1 MB. Läuft komplett im Browser.
**Live (nach dem Merge):** https://freimoser.github.io/csv-to-calendar/

Ein kostenloses Werkzeug, das ICS-Dateien (auch den ZIP-Export von Google), CSV- und Excel-Dateien so vorbereitet,
dass Google Kalender sie annimmt:

- **Analysieren:** Kalender in der Datei, Termine, Zeitraum, Größe, Serien, Auffälligkeiten
- **Aufteilen:** nach Kalendern, Personen-Kürzeln, Stichwörtern oder Jahren – z. B. beim Umzug auf Google Workspace
- **Unter 1 MB bringen:** Teile unter 950 KB, Serien bleiben mit ihren Ausnahmen zusammen, Größe byte-genau
- **Tabellen:** Semikolon, Windows-Zeichensatz, deutsche Spalten, Datumsformate (fragt bei 03/04 nach), Excel-Datumswerte
- **Datenschutz:** erkennt Telefonnummern, E-Mails, Namen, Geburtsdaten und bietet Weglassen/Kürzen an
- **Geburtstage:** jährliche ganztägige Termine per ICS (29.2. → 28.2.)

Nichts wird hochgeladen. Die Seite setzt eine Content-Security-Policy, deren `connect-src` nur die öffentliche
`robots.txt` der Domain erlaubt; die Rechenarbeit läuft in einem Web Worker aus einer `blob:`-Adresse, für den dieselbe
Richtlinie gilt. Ein Browser-Test prüft, dass beim Verarbeiten keine Netzwerkanfrage entsteht.

## Entwicklung

```bash
npm ci
npm run dev          # http://localhost:4322/csv-to-calendar/
npm test             # Einheitentests (Vitest)
npm run build        # Build + Prüfung (SEO, Links, CSP, Sitemap, hreflang)
npm run test:e2e     # Browser-Tests (Playwright)
npm run check:launch # Livegang-Sperre (Impressum vollständig?)
npm run assets       # Favicons und Vorschaubilder neu erzeugen
```

Lighthouse lokal: `npm run build:lh`, dann `npm run preview` und in einem zweiten Terminal `npm run lighthouse`.

## Echte Daten – nur lokal

Echte Kalender- und Terminlisten gehören **nie** ins Repository. `.gitignore` und ein Pre-Commit-Hook
(`.githooks/pre-commit`) sperren `.ics`, `.zip`, `.csv`, `.xlsx` usw. Die Tests erzeugen ihre Daten selbst.

Mit einer echten Datei lässt sich lokal prüfen (Ausgabe nur Kennzahlen):

```bash
PRIVATE_SAMPLE=/pfad/zur/datei.zip npm run test:private
PRIVATE_SAMPLE=/pfad/zur/datei.zip npx playwright test -c playwright.private.config.ts
```

## Deployment

Push auf `main` → GitHub Actions baut, testet und deployt auf GitHub Pages.
Das Deployment bricht ab, solange im Impressum die ladungsfähige Anschrift fehlt (`src/config/legal.ts`).

## Quellen

Alle Aussagen über Google Kalender stammen aus der Google-Hilfe (Stand 7.10.2026), siehe `src/content/sources.ts`.
