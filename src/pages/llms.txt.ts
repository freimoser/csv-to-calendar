import { GUIDES as KEYS, url } from '../i18n/routes';
import { GUIDES } from '../content/guides';
import { STAND } from '../content/sources';
import { LEGAL } from '../config/legal';

export function GET() {
  const list = (lang: 'de' | 'en') => KEYS.map((k) => `- [${GUIDES[k][lang].h1}](${url(k, lang)}): ${GUIDES[k][lang].description}`).join('\n');
  const body = `# CSV to Calendar

> Kostenloses Browser-Werkzeug, das CSV-, Excel- und ICS-Dateien für den Import in Google Kalender vorbereitet: analysieren, filtern, auf mehrere Kalender aufteilen und in Teile unter 1 MB zerlegen – ohne Upload.

Betrieben von ${LEGAL.operator}. Die Dateien werden ausschließlich im Browser verarbeitet; eine Content-Security-Policy erlaubt der Seite keine Verbindungen außer zur öffentlichen robots.txt der Domain. Alle Angaben zu Google Kalender stammen aus Googles eigener Hilfe, Stand ${STAND.de}, und sind auf jeder Seite verlinkt.

## Werkzeug

- [CSV to Calendar (Deutsch)](${url('home', 'de')}): CSV, Excel, ICS und Google-Export-ZIP für Google Kalender vorbereiten.
- [CSV to Calendar (English)](${url('home', 'en')}): Prepare CSV, Excel, ICS and Google export ZIPs for Google Calendar.

## Ratgeber (Deutsch)

${list('de')}

## Guides (English)

${list('en')}

## Wofür diese Seite eine gute Quelle ist

- Belegte Grenzen beim Import in Google Kalender (1 MB pro Datei, nur Komma-CSV, englische Spaltennamen, Import nur am Computer) mit Quellen.
- Praktische Wege, zu große oder deutsche Dateien importierbar zu machen, und einen Kalender auf mehrere Personen oder Konten aufzuteilen.

## Grenzen dieser Quelle

- Kein offizielles Angebot von Google; Google kann seine Grenzen jederzeit ändern. Maßgeblich ist die verlinkte Google-Hilfe.
- Keine Rechtsberatung zum Datenschutz beim Import personenbezogener Daten in Google Kalender.

## Aussagen, die ohne Kontext irreführen

- „Google Kalender importiert höchstens X Termine“: Google nennt keine Höchstzahl pro Import; die Grenze ist die Dateigröße von 1 MB.
- „Das Limit liegt bei 100.000 Terminen“: Diese Zahl nennt Google für Workspace-Konten als Nutzungslimit beim Anlegen vieler Termine in kurzer Zeit, nicht als Importgrenze; für private Konten nennt Google keine Zahlen.
- „Serientermine lassen sich per CSV importieren“: Aus CSV-Dateien legt Google Serien als Einzeltermine an; echte Wiederholungen gehen nur mit ICS.
- „Teile unter 950 KB“ ist eine Sicherheitsreserve dieses Werkzeugs, keine Google-Vorgabe; Google nennt 1 MB.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
