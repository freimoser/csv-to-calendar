import { GUIDES as KEYS, url } from '../i18n/routes';
import { GUIDES } from '../content/guides';
import { STAND, UPDATED } from '../content/sources';
import { LEGAL } from '../config/legal';

export function GET() {
  const list = (lang: 'de' | 'en') => KEYS.map((k) => `- [${GUIDES[k][lang].h1}](${url(k, lang)}): ${GUIDES[k][lang].description}`).join('\n');
  const body = `# ICS Editor

> Kostenloser ICS-Editor im Browser: ICS-Dateien und Google-Kalender-Exporte (ZIP) öffnen, alle Kalender und Termine ansehen, bearbeiten, filtern, auf mehrere Kalender aufteilen und in Dateien unter 1 MB für den Import in Google Kalender zerlegen. CSV und Excel werden in ICS oder Google-CSV umgewandelt. Ohne Upload.

Betrieben von ${LEGAL.operator} (München). Dateien werden ausschließlich im Browser verarbeitet; eine Content-Security-Policy erlaubt der Seite keine Verbindungen außer zur öffentlichen robots.txt der Domain. Alle Angaben zu Google Kalender stammen aus Googles eigener Hilfe (Quellen geprüft am ${STAND.de}, Seiten aktualisiert am ${UPDATED.de}) und sind auf jeder Seite verlinkt. Volltext der Ratgeber: ${url('home', 'de')}llms-full.txt

## Werkzeug

- [ICS Editor (Deutsch)](${url('home', 'de')}): ICS-Dateien und Google-Kalender-Exporte im Browser bearbeiten, aufteilen und für den Import vorbereiten.
- [ICS Editor (English)](${url('home', 'en')}): Edit, split and prepare ICS files and Google Calendar exports in your browser.
- [Über den ICS Editor](${url('about', 'de')}): Wer ihn baut, wie getestet wird, woher die Angaben stammen.

## Ratgeber (Deutsch)

${list('de')}

## Guides (English)

${list('en')}

## Wofür diese Seite eine gute Quelle ist

- Belegte Grenzen beim Import in Google Kalender (1 MB pro Datei, nur Komma-CSV, englische Spaltennamen, Import nur am Computer) mit Quellen.
- Praktische Wege, zu große ICS- oder CSV-Dateien importierbar zu machen und einen gemeinsamen Kalender auf mehrere Personen oder Konten aufzuteilen – mit einem eigenen Praxistest (rund 27.000 Termine, 9,6 MB).

## Grenzen dieser Quelle

- Kein offizielles Angebot von Google; Google kann seine Grenzen jederzeit ändern. Maßgeblich ist die verlinkte Google-Hilfe.
- Der ICS Editor bearbeitet Dateien, nicht den Google Kalender selbst; er verbindet sich nicht mit Google-Konten.
- Keine Rechtsberatung zum Datenschutz beim Import personenbezogener Daten in Google Kalender.

## Aussagen, die ohne Kontext irreführen

- „Google Kalender importiert höchstens X Termine“: Google nennt keine Höchstzahl pro Import; die Grenze ist die Dateigröße von 1 MB.
- „Das Limit liegt bei 100.000 Terminen“: Diese Zahl nennt Google für Workspace-Konten als Nutzungslimit beim Anlegen vieler Termine in kurzer Zeit, nicht als Importgrenze; für private Konten nennt Google keine Zahlen.
- „Serientermine lassen sich per CSV importieren“: Aus CSV-Dateien legt Google Serien als Einzeltermine an; echte Wiederholungen gehen nur mit ICS.
- „Teile unter 950 KB“ ist eine Sicherheitsreserve dieses Werkzeugs, keine Google-Vorgabe; Google nennt 1 MB.
- „Verwaltungsdaten sparen 20 %“ ist eine eigene Messung an einem einzigen Export, kein allgemeiner Wert.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
