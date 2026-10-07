// Über-Seite: wer den ICS Editor baut, wie getestet wird, woher die Angaben stammen.
import { LEGAL } from '../config/legal';
import type { Lang } from '../i18n/routes';

export const ABOUT: Record<Lang, { title: string; description: string; h1: string; html: string }> = {
  de: {
    title: 'Über den ICS Editor – wer ihn baut und wie er testet',
    description: 'Wer hinter dem ICS Editor steht, wie das Werkzeug getestet wird, woher die Angaben zu Google Kalender stammen und wie es mit deinen Daten umgeht.',
    h1: 'Über den ICS Editor',
    html: `
<p class="answer">Der ICS Editor ist ein kostenloses Werkzeug von ${LEGAL.operator} aus München. Er entstand, weil große oder deutsche Kalenderdateien immer wieder am Import in Google Kalender scheitern – und weil Praxen, Vereine und kleine Firmen ihre gemeinsamen Kalender beim Umzug auf eigene Konten aufteilen müssen.</p>
<h2>Was das Werkzeug kann – und was nicht</h2>
<p>Der ICS Editor liest ICS-Dateien, den ZIP-Export von Google Kalender sowie CSV- und Excel-Tabellen, zeigt alle Kalender und Termine, lässt sie bearbeiten, filtern und aufteilen und schreibt Dateien, die Google Kalender annimmt. Er bearbeitet <strong>nicht</strong> deinen Google Kalender direkt: Er verbindet sich nicht mit deinem Google-Konto. Importieren musst du die Dateien selbst, am Computer.</p>
<h2>Wie getestet wird</h2>
<ul>
<li>Automatische Tests mit erzeugten Beispieldaten: deutsche Semikolon-CSV im Windows-Zeichensatz, Excel mit Datumswerten, eine 3-MB-Terminliste, fehlerhafte Zeilen, mehrdeutige Daten, Geburtstage am 29. Februar.</li>
<li>Jede erzeugte ICS-Datei wird mit einem unabhängigen iCalendar-Leser (ical.js) geprüft, jede Google-CSV gegen das Format aus Googles Hilfe.</li>
<li>Browser-Tests prüfen die Bedienung am Handy (360 px), mit der Tastatur, offline – und dass beim Verarbeiten einer Datei keine einzige Netzwerkanfrage entsteht.</li>
<li>Zusätzlich lief ein echter Google-Kalender-Export einer Tierarztpraxis mit rund 27.000 Terminen durch das Werkzeug – ausgewertet nur lokal auf dem eigenen Rechner, ohne Namen. Die Kennzahlen stehen in den Ratgebern als Praxisbeispiel.</li>
</ul>
<h2>Woher die Angaben stammen</h2>
<p>Alle Aussagen über Google Kalender – etwa die Grenze von 1 MB pro Datei – stammen aus der offiziellen Hilfe von Google und sind auf jeder Seite mit Datum verlinkt. Eigene Messungen sind als solche gekennzeichnet. Der Quellcode ist öffentlich: <a href="${LEGAL.repo}" rel="noopener">github.com/freimoser/ics-editor</a>.</p>
<h2>Deine Daten</h2>
<p>Deine Dateien verlassen dein Gerät nicht. Es gibt keinen Server, der Dateien annimmt, kein Tracking und keine Cookies. Details stehen in der <a href="../datenschutz/">Datenschutzerklärung</a>.</p>
<h2>Kontakt</h2>
<p>Fehler gefunden oder eine Idee? Schreib an ${LEGAL.emailDisplay} oder über <a href="${LEGAL.linkedin}" rel="noopener">LinkedIn</a>. Weitere Angaben im <a href="../impressum/">Impressum</a>.</p>`
  },
  en: {
    title: 'About the ICS Editor – who builds it and how it’s tested',
    description: 'Who is behind the ICS Editor, how the tool is tested, where the Google Calendar facts come from and how it treats your data.',
    h1: 'About the ICS Editor',
    html: `
<p class="answer">The ICS Editor is a free tool by ${LEGAL.operator} from Munich, Germany. It exists because large or non-English calendar files keep failing to import into Google Calendar – and because practices, clubs and small businesses need to split shared calendars when moving to individual accounts.</p>
<h2>What the tool does – and what it doesn’t</h2>
<p>The ICS Editor reads ICS files, Google Calendar’s ZIP export and CSV or Excel spreadsheets, shows every calendar and event, lets you edit, filter and split them and writes files that Google Calendar accepts. It does <strong>not</strong> edit your Google Calendar directly: it never connects to your Google account. You import the files yourself, on a computer.</p>
<h2>How it’s tested</h2>
<ul>
<li>Automated tests with generated sample data: semicolon CSV in Windows encoding, Excel with date values, a 3 MB event list, broken rows, ambiguous dates, birthdays on 29 February.</li>
<li>Every generated ICS file is checked with an independent iCalendar reader (ical.js), every Google CSV against the format in Google’s help.</li>
<li>Browser tests check use on phones (360 px), by keyboard, offline – and that processing a file causes no network request at all.</li>
<li>In addition, a real Google Calendar export of a veterinary practice with about 27,000 events went through the tool – analysed only locally, without names. Its key figures appear in the guides as a real-world example.</li>
</ul>
<h2>Where the facts come from</h2>
<p>Every statement about Google Calendar – such as the 1 MB limit per file – comes from Google’s official help and is linked with a date on each page. Own measurements are marked as such. The source code is public: <a href="${LEGAL.repo}" rel="noopener">github.com/freimoser/ics-editor</a>.</p>
<h2>Your data</h2>
<p>Your files never leave your device. There is no server that accepts files, no tracking and no cookies. Details are in the <a href="../privacy/">privacy policy</a>.</p>
<h2>Contact</h2>
<p>Found a bug or have an idea? Write to ${LEGAL.emailDisplay} or via <a href="${LEGAL.linkedin}" rel="noopener">LinkedIn</a>. More in the <a href="../legal-notice/">legal notice</a>.</p>`
  }
};
