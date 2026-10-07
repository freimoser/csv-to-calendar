// Ratgeber-Inhalte, Deutsch und Englisch gleichwertig.
// Jede Seite: direkte Antwort im ersten Satz → Schritt für Schritt → FAQ → Werkzeug → Quellen.
// Verweise: {seite|Ankertext} wird zu einem internen Link, {tool|Ankertext} zum Werkzeug.
// Fakten nur aus src/content/sources.ts (Stand 7.10.2026).

import type { SourceKey } from './sources';

export interface Faq { q: string; a: string }
export interface Step { name: string; text: string }
export interface Section { h2: string; html: string }
export interface Guide {
  title: string;
  description: string;
  h1: string;
  crumb: string;
  teaser: string;
  answer: string;
  stepsTitle: string;
  steps: Step[];
  sections: Section[];
  faq: Faq[];
  cta: string;
}
export interface GuideDef {
  type: 'howto' | 'article';
  sources: SourceKey[];
  related: string[];
  de: Guide;
  en: Guide;
}

const PHONE_FAQ_DE: Faq = { q: 'Kann ich die Datei am Handy importieren?', a: 'Nein. Google Kalender erlaubt den Import nur am Computer, nicht am Handy oder Tablet. Vorbereiten kannst du die Datei mit dem Werkzeug aber auch am Handy.' };
const PHONE_FAQ_EN: Faq = { q: 'Can I import the file on my phone?', a: 'No. Google Calendar only lets you import on a computer, not on a phone or tablet. You can still prepare the file with the tool on your phone.' };

export const GUIDES: Record<string, GuideDef> = {
  // ------------------------------------------------------------------ Datei zu groß
  tooLarge: {
    type: 'howto',
    sources: ['problems', 'import'],
    related: ['limits', 'split', 'importFails', 'undo'],
    de: {
      title: 'Google Kalender Datei zu groß? So klappt der Import',
      description: 'Google Kalender importiert nur Dateien bis 1 MB. So verkleinerst oder teilst du deine CSV- oder ICS-Datei – kostenlos und ohne Upload.',
      h1: 'Google Kalender: Datei zu groß? So klappt der Import trotzdem',
      crumb: 'Datei zu groß',
      teaser: '„Google Calendar is temporarily unavailable“ – was hilft',
      answer: '<strong>Google Kalender importiert nur Dateien bis 1 MB.</strong> Ist deine CSV- oder ICS-Datei größer, erscheint meist die Meldung „Google Calendar is temporarily unavailable“. Die Lösung: die CSV-Datei verkleinern – nur den nötigen Zeitraum behalten – oder die CSV-Datei teilen, sodass jeder Teil unter 1 MB bleibt.',
      stepsTitle: 'Schritt für Schritt: CSV-Datei verkleinern oder teilen',
      steps: [
        { name: 'Datei im Werkzeug öffnen', text: 'Ziehe deine CSV-, Excel- oder ICS-Datei (auch den ZIP-Export von Google) in das Werkzeug. Du siehst sofort, wie groß sie ist, wie viele Termine sie enthält und ob sie über 1 MB liegt.' },
        { name: 'Verkleinern', text: 'Hake nur die Jahre an, die du wirklich brauchst – zum Beispiel 2024 bis 2026. Abgesagte Termine, Beschreibungen und reine Verwaltungsdaten kannst du weglassen.' },
        { name: 'Auf die Ampel schauen', text: 'Sie zeigt bei jeder Änderung byte-genau, ob alles in eine Datei passt oder in wie viele Teile aufgeteilt wird.' },
        { name: 'Teile herunterladen', text: 'Jeder Teil ist kleiner als 950 KB und für sich vollständig importierbar. Serientermine bleiben dabei mit ihren Ausnahmen zusammen.' },
        { name: 'Am Computer importieren', text: 'In Google Kalender zuerst einen neuen Kalender anlegen, dann jeden Teil einzeln importieren: Einstellungen → Importieren & Exportieren.' }
      ],
      sections: [
        { h2: 'Was die Meldung „Google Calendar is temporarily unavailable“ bedeutet', html: '<p>Laut Google tritt diese Meldung beim Import meist auf, wenn die Datei zu groß ist. Google Kalender verarbeitet Dateien bis 1 MB. Als Lösung nennt Google, einen kürzeren Zeitraum aus dem ursprünglichen Programm zu exportieren oder die Datei in kleinere Dateien aufzuteilen – wobei Google dafür das Bearbeiten des CSV- oder ICS-Codes von Hand voraussetzt.</p><p>Genau diesen Teil übernimmt das {tool|Werkzeug zum Aufteilen}: Es filtert, teilt und prüft, ohne dass du eine Zeile Code anfassen musst. Welche weiteren Grenzen es gibt, steht in der Übersicht {limits|Google Kalender Limits}.</p>' },
        { h2: 'CSV-Datei verkleinern: Was wirklich Platz spart', html: '<table><thead><tr><th>Maßnahme</th><th>Wirkung</th></tr></thead><tbody><tr><td>Zeitraum begrenzen (z. B. nur die letzten drei Jahre)</td><td>meist die größte Ersparnis, weil alte Termine wegfallen</td></tr><tr><td>Beschreibungen weglassen</td><td>stark, wenn viele Termine Notizen haben</td></tr><tr><td>Verwaltungsdaten weglassen (Erstellt-/Geändert-Stempel in ICS)</td><td>spart bei Google-Exporten oft ein Fünftel</td></tr><tr><td>Abgesagte und doppelte Termine entfernen</td><td>klein, aber sauberer Kalender</td></tr></tbody></table><p>Reicht das nicht, wird aufgeteilt. Das Werkzeug teilt chronologisch, sodass jeder Teil einen klaren Zeitraum hat.</p>' },
        { h2: 'Warum Teile unter 950 KB und nicht genau 1 MB?', html: '<p>„1 MB“ kann 1.000.000 oder 1.048.576 Byte bedeuten. Mit 950.000 Byte bleibt jeder Teil in beiden Fällen sicher darunter. Die angezeigte Größe ist byte-genau die Größe der Datei, die du herunterlädst.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Gilt die 1-MB-Grenze auch für ICS-Dateien?', a: 'Ja. Google nennt die Grenze von 1 MB für CSV- und ICS-Dateien gleichermaßen.' },
        { q: 'Wie viele Termine darf eine Datei haben?', a: 'Google nennt für den Import keine Höchstzahl an Terminen – entscheidend ist die Dateigröße. Für Workspace-Konten schreibt Google allerdings, dass man nach mehr als 100.000 neu angelegten Terminen in kurzer Zeit für einige Stunden keine Termine mehr anlegen oder bearbeiten kann.' },
        { q: 'Kann ich alle Teile als ZIP-Datei importieren?', a: 'Nein. Eine ZIP-Datei musst du zuerst entpacken und dann jede Datei einzeln importieren.' },
        { q: 'Wird meine Datei beim Aufteilen hochgeladen?', a: 'Nein. Das Werkzeug läuft vollständig in deinem Browser. Eine Sicherheitsregel verbietet der Seite Verbindungen zu fremden Servern; es gibt keinen Server, der Dateien annimmt.' }
      ],
      cta: 'Datei direkt hier verkleinern oder aufteilen'
    },
    en: {
      title: 'Google Calendar Import File Too Large? Here’s the Fix',
      description: 'Google Calendar only imports files up to 1 MB. Here’s how to shrink or split your CSV or ICS file – free and without uploading anything.',
      h1: 'Google Calendar import file too large? Here’s how to import it anyway',
      crumb: 'File too large',
      teaser: '“Google Calendar is temporarily unavailable” – what helps',
      answer: '<strong>Google Calendar only imports files up to 1 MB.</strong> If your CSV or ICS file is larger, you usually see the message “Google Calendar is temporarily unavailable”. The fix: shrink the file by keeping only the date range you need, or split the CSV file so that every part stays under 1 MB.',
      stepsTitle: 'Step by step: shrink or split a CSV file',
      steps: [
        { name: 'Open the file in the tool', text: 'Drop your CSV, Excel or ICS file (or Google’s ZIP export) into the tool. You instantly see its size, how many events it contains and whether it is over 1 MB.' },
        { name: 'Shrink it', text: 'Tick only the years you really need – for example 2024 to 2026. You can leave out cancelled events, descriptions and pure housekeeping data.' },
        { name: 'Check the traffic light', text: 'With every change it shows, to the byte, whether everything fits in one file or how many parts are needed.' },
        { name: 'Download the parts', text: 'Each part is smaller than 950 KB and can be imported on its own. Recurring events stay together with their exceptions.' },
        { name: 'Import on a computer', text: 'In Google Calendar, create a new calendar first, then import each part separately: Settings → Import & export.' }
      ],
      sections: [
        { h2: 'What “Google Calendar is temporarily unavailable” means', html: '<p>According to Google, this message usually appears when the import file is too large. Google Calendar works with files of 1 MB or smaller. Google suggests exporting a shorter date range from the original application or splitting the file into smaller files – which, in Google’s words, requires manually editing the CSV or ICS code.</p><p>That is exactly the part the {tool|calendar splitting tool} does for you: it filters, splits and checks without you touching any code. For all other limits, see {limits|Google Calendar limits}.</p>' },
        { h2: 'How to shrink a CSV file: what really saves space', html: '<table><thead><tr><th>Measure</th><th>Effect</th></tr></thead><tbody><tr><td>Limit the date range (e.g. only the last three years)</td><td>usually the biggest saving, because old events disappear</td></tr><tr><td>Leave out descriptions</td><td>large if many events have notes</td></tr><tr><td>Drop housekeeping data (created/modified stamps in ICS)</td><td>often saves about a fifth on Google exports</td></tr><tr><td>Remove cancelled and duplicate events</td><td>small, but a cleaner calendar</td></tr></tbody></table><p>If that isn’t enough, the file is split. The tool splits chronologically, so every part covers a clear date range.</p>' },
        { h2: 'Why parts under 950 KB and not exactly 1 MB?', html: '<p>“1 MB” can mean 1,000,000 or 1,048,576 bytes. At 950,000 bytes every part stays safely below either. The size shown is exactly the size of the file you download.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Does the 1 MB limit apply to ICS files too?', a: 'Yes. Google states the 1 MB limit for both CSV and ICS files.' },
        { q: 'How many events can a file contain?', a: 'Google doesn’t state a maximum number of events per import – what matters is the file size. For Workspace accounts, Google does say that creating more than 100,000 events in a short period can stop you from creating or editing events for a few hours.' },
        { q: 'Can I import all parts as one ZIP file?', a: 'No. You need to unzip it first and import each file separately.' },
        { q: 'Is my file uploaded when I split it?', a: 'No. The tool runs entirely in your browser. A security policy forbids the page to connect to other servers, and there is no server that accepts files.' }
      ],
      cta: 'Shrink or split your file right here'
    }
  },

  // ------------------------------------------------------------------ Grenzen
  limits: {
    type: 'article',
    sources: ['problems', 'import', 'limits', 'delete'],
    related: ['tooLarge', 'importFails', 'split', 'undo'],
    de: {
      title: 'Google Kalender Limits: alle Grenzen beim Import',
      description: 'Alle belegten Google-Kalender-Limits auf einen Blick: 1 MB pro Datei, nur Komma-CSV, nur am Computer, Nutzungslimit bei 100.000 Terminen.',
      h1: 'Google Kalender Limits: Import-Grenzen und Nutzungslimits',
      crumb: 'Limits',
      teaser: 'Alle belegten Grenzen in einer Tabelle',
      answer: '<strong>Die wichtigste Grenze von Google Kalender beim Import ist die Dateigröße: höchstens 1 MB pro Datei</strong>, für CSV und ICS. Dazu kommen Formatregeln (nur Komma als Trennzeichen, englische Spaltennamen), der Import nur am Computer und – für Workspace-Konten – ein Nutzungslimit, wenn in kurzer Zeit mehr als 100.000 Termine angelegt werden.',
      stepsTitle: 'So bleibst du unter allen Grenzen',
      steps: [
        { name: 'Größe prüfen', text: 'Öffne die Datei im Werkzeug: Es zeigt die Größe und ob sie über 1 MB liegt.' },
        { name: 'Format prüfen', text: 'Das Werkzeug wandelt Semikolon-Dateien und deutsche Spaltennamen ins Google-Format um.' },
        { name: 'Aufteilen', text: 'Zu große Dateien werden in Teile unter 950 KB zerlegt, jede für sich importierbar.' },
        { name: 'Am Computer importieren', text: 'Den Import gibt es nur in Google Kalender am Computer.' }
      ],
      sections: [
        { h2: 'Alle Grenzen auf einen Blick', html: '<div class="table-wrap"><table><thead><tr><th>Grenze</th><th>Was passiert</th><th>Was hilft</th></tr></thead><tbody>' +
          '<tr><td>Höchstens 1 MB pro Import-Datei (CSV und ICS)</td><td>Meldung „Google Calendar is temporarily unavailable“</td><td>Zeitraum verkleinern oder die Datei aufteilen – siehe {tooLarge|Datei zu groß}</td></tr>' +
          '<tr><td>CSV nur mit Komma als Trennzeichen – Semikolon oder Doppelpunkt funktionieren nicht</td><td>Import scheitert oder liest Felder falsch</td><td>Datei ins Google-Format umwandeln – siehe {importFails|CSV-Import scheitert}</td></tr>' +
          '<tr><td>Spaltennamen müssen englisch sein, Pflicht sind nur „Subject“ und „Start Date“</td><td>Termine werden nicht erkannt</td><td>Spalten zuordnen lassen</td></tr>' +
          '<tr><td>Import nur am Computer, nicht am Handy oder Tablet</td><td>Am Handy fehlt die Funktion</td><td>Datei vorbereiten, am Computer importieren</td></tr>' +
          '<tr><td>Serientermine aus einer CSV werden zu Einzelterminen</td><td>Keine echte Wiederholung</td><td>ICS statt CSV verwenden – siehe {convert|CSV in ICS umwandeln}</td></tr>' +
          '<tr><td>Gäste und Konferenzdaten werden nicht importiert</td><td>Teilnehmer und Videolinks fehlen</td><td>Bei Bedarf vorher in die Beschreibung übernehmen</td></tr>' +
          '<tr><td>ZIP-Dateien müssen entpackt werden, jede ICS-Datei einzeln</td><td>ZIP lässt sich nicht direkt importieren</td><td>Entpacken oder das ZIP ins Werkzeug ziehen</td></tr>' +
          '<tr><td>Workspace: mehr als 100.000 neue Termine in kurzer Zeit</td><td>Für Stunden keine oder weniger neue Termine, kein Bearbeiten</td><td>Nur importieren, was gebraucht wird; Import über Tage verteilen</td></tr>' +
          '<tr><td>Workspace: mehr als 60 neue Kalender in kurzer Zeit</td><td>Für einige Stunden eingeschränkt</td><td>Beim Aufteilen nicht zu viele Ziel-Kalender auf einmal anlegen</td></tr>' +
          '</tbody></table></div>' },
        { h2: 'Gibt es eine Höchstzahl an Terminen pro Import?', html: '<p>Google nennt keine Höchstzahl an Terminen pro Import-Datei. Maßgeblich ist die Dateigröße von 1 MB. Wie viele Termine in 1 MB passen, hängt davon ab, wie lang Titel und Beschreibungen sind – das Werkzeug rechnet es für deine Datei byte-genau aus.</p>' },
        { h2: 'Nutzungslimit Google Kalender: was bei Workspace gilt', html: '<p>In der Hilfe für Workspace-Administratoren beschreibt Google Nutzungslimits, die Missbrauch verhindern sollen. Wer in kurzer Zeit <strong>mehr als 100.000 Termine</strong> anlegt, kann danach nur noch eingeschränkt Termine anlegen und für einige Stunden keine Termine bearbeiten. Für bestimmte Kontoarten – etwa Testkonten oder kostenlose Bildungs- und Gemeinnützigen-Pakete – nennt Google ausdrücklich keine genauen Grenzen. Für private Google-Konten nennt Google in dieser Hilfe keine Zahlen.</p><p>Wer einen großen Kalender {split|auf mehrere Konten aufteilt}, importiert die Teile am besten nicht alle auf einmal.</p>' },
        { h2: 'Und wenn der Import schiefgeht?', html: '<p>Einen „Rückgängig“-Knopf für Importe gibt es nicht. Einen eigens angelegten Kalender kannst du aber komplett löschen; im Hauptkalender ginge das nur, indem du alle Termine löschst. Details: {undo|Import rückgängig machen}.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Was bedeutet „google calendar usage limits exceeded“?', a: 'Gemeint sind die Nutzungslimits, die Google gegen Missbrauch setzt. Für Workspace-Konten nennt Google zum Beispiel mehr als 100.000 neu angelegte Termine in kurzer Zeit; danach kann man für einige Stunden keine Termine bearbeiten.' },
        { q: 'Wie groß darf eine ICS-Datei für Google Kalender sein?', a: 'Höchstens 1 MB – dieselbe Grenze wie für CSV-Dateien.' },
        { q: 'Warum lehnt Google meine CSV mit Semikolon ab?', a: 'Google Kalender arbeitet nur mit Komma als Trennzeichen. Dateien mit Semikolon oder Doppelpunkt funktionieren nicht.' }
      ],
      cta: 'Datei prüfen: Passt sie in Googles Grenzen?'
    },
    en: {
      title: 'Google Calendar Limits: Import & Usage Limits Explained',
      description: 'Every documented Google Calendar limit at a glance: 1 MB per file, comma-only CSV, computer-only import, and the 100,000-event usage limit.',
      h1: 'Google Calendar limits: import limits and usage limits',
      crumb: 'Limits',
      teaser: 'Every documented limit in one table',
      answer: '<strong>The most important Google Calendar import limit is the file size: at most 1 MB per file</strong>, for both CSV and ICS. On top of that come format rules (comma as the only separator, English column names), import on a computer only, and – for Workspace accounts – a usage limit if more than 100,000 events are created in a short period.',
      stepsTitle: 'How to stay within every limit',
      steps: [
        { name: 'Check the size', text: 'Open the file in the tool: it shows the size and whether it is over 1 MB.' },
        { name: 'Check the format', text: 'The tool converts semicolon files and non-English column names into Google’s format.' },
        { name: 'Split', text: 'Files that are too large are split into parts under 950 KB, each importable on its own.' },
        { name: 'Import on a computer', text: 'Import is only available in Google Calendar on a computer.' }
      ],
      sections: [
        { h2: 'All limits at a glance', html: '<div class="table-wrap"><table><thead><tr><th>Limit</th><th>What happens</th><th>What helps</th></tr></thead><tbody>' +
          '<tr><td>At most 1 MB per import file (CSV and ICS)</td><td>“Google Calendar is temporarily unavailable”</td><td>Shorten the date range or split the file – see {tooLarge|file too large}</td></tr>' +
          '<tr><td>CSV must use commas – semicolons or colons don’t work</td><td>Import fails or reads fields wrongly</td><td>Convert the file to Google’s format – see {importFails|can’t import CSV}</td></tr>' +
          '<tr><td>Column names must be in English; only “Subject” and “Start Date” are required</td><td>Events aren’t recognised</td><td>Let the tool map the columns</td></tr>' +
          '<tr><td>Import only on a computer, not on a phone or tablet</td><td>The option is missing on mobile</td><td>Prepare the file, import on a computer</td></tr>' +
          '<tr><td>Recurring events from a CSV become single events</td><td>No real recurrence</td><td>Use ICS instead – see {convert|CSV to ICS converter}</td></tr>' +
          '<tr><td>Guests and conference data are not imported</td><td>Attendees and video links are missing</td><td>If needed, copy them into the description first</td></tr>' +
          '<tr><td>ZIP files must be unzipped; import each ICS file separately</td><td>A ZIP can’t be imported directly</td><td>Unzip it, or drop the ZIP into the tool</td></tr>' +
          '<tr><td>Workspace: more than 100,000 new events in a short period</td><td>Fewer or no new events and no editing for hours</td><td>Import only what you need; spread imports over several days</td></tr>' +
          '<tr><td>Workspace: more than 60 new calendars in a short period</td><td>Restricted for a few hours</td><td>Don’t create too many target calendars at once when splitting</td></tr>' +
          '</tbody></table></div>' },
        { h2: 'Is there a maximum number of events per import?', html: '<p>Google doesn’t state a maximum number of events per import file. What counts is the 1 MB file size. How many events fit into 1 MB depends on how long your titles and descriptions are – the tool calculates it for your file, to the byte.</p>' },
        { h2: 'Google Calendar usage limits exceeded: what applies to Workspace', html: '<p>In its help for Workspace administrators, Google describes usage limits designed to prevent abuse. Anyone who creates <strong>more than 100,000 events</strong> in a short period may have their ability to create events reduced and may not be able to edit events for a few hours. For certain account types – such as trial accounts or free education and nonprofit editions – Google explicitly doesn’t publish exact limits. For personal Google accounts, that help page gives no numbers.</p><p>If you {split|split a large calendar across several accounts}, don’t import all the parts at once.</p>' },
        { h2: 'And if the import goes wrong?', html: '<p>There is no undo button for imports. You can, however, delete a calendar you created specifically for the import; in your main calendar you could only delete all events. Details: {undo|undo a Google Calendar import}.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'What does “Google Calendar usage limits exceeded” mean?', a: 'It refers to the limits Google sets against abuse. For Workspace accounts, Google mentions for example more than 100,000 events created in a short period; after that, you may not be able to edit events for a few hours.' },
        { q: 'How large can an ICS file for Google Calendar be?', a: 'At most 1 MB – the same limit as for CSV files.' },
        { q: 'Why does Google reject my semicolon CSV?', a: 'Google Calendar only works with commas as separators. Files that use semicolons or colons don’t work.' }
      ],
      cta: 'Check your file: does it fit Google’s limits?'
    }
  },

  // ------------------------------------------------------------------ Import scheitert
  importFails: {
    type: 'howto',
    sources: ['import', 'problems'],
    related: ['tooLarge', 'limits', 'convert', 'excel'],
    de: {
      title: 'CSV-Datei kann nicht in Google Kalender importiert werden',
      description: 'Semikolon, deutsche Spaltennamen, falsches Datum oder Fehlermeldung? So findest du heraus, warum der CSV-Import scheitert – und behebst es.',
      h1: 'CSV-Datei kann nicht in Google Kalender importiert werden – die Lösungen',
      crumb: 'Import scheitert',
      teaser: 'Semikolon, Spaltennamen, Datumsformat, Fehlermeldungen',
      answer: '<strong>Meist scheitert der Import an einem von vier Punkten:</strong> Die Datei nutzt Semikolon statt Komma, die Spaltennamen sind nicht englisch, das Datum steht im falschen Format oder die Datei ist größer als 1 MB. Google Kalender verlangt Komma als Trennzeichen und englische Spaltennamen; Pflicht sind nur „Subject“ und „Start Date“.',
      stepsTitle: 'Schritt für Schritt zur importierbaren CSV-Datei',
      steps: [
        { name: 'Datei ins Werkzeug ziehen', text: 'Das Werkzeug erkennt Trennzeichen (auch Semikolon), Zeichensatz (auch Windows/Excel), deutsche und englische Spaltennamen und gängige Datumsformate selbst.' },
        { name: 'Datumsformat bestätigen', text: 'Ist ein Datum wie 03/04/2025 mehrdeutig, fragt das Werkzeug einmal pro Spalte nach, statt zu raten.' },
        { name: 'Fehler prüfen', text: 'Unter „Prüfen“ stehen alle Problemzeilen in einfacher Sprache, zum Beispiel „Zeile 14: Das Ende liegt vor dem Beginn“, jeweils mit einem Vorschlag.' },
        { name: 'Als Google-CSV herunterladen', text: 'Die Datei hat dann englische Spaltennamen, Komma als Trennzeichen und das Datumsformat aus Googles Beispiel (05/30/2020, 10:00 AM).' },
        { name: 'Am Computer importieren', text: 'Google Kalender → Einstellungen → Importieren & Exportieren → Datei auswählen → Importieren.' }
      ],
      sections: [
        { h2: 'Die häufigsten Ursachen', html: '<div class="table-wrap"><table><thead><tr><th>Ursache</th><th>Woran du es erkennst</th><th>Lösung</th></tr></thead><tbody>' +
          '<tr><td>Semikolon statt Komma</td><td>Deutsche Excel-Exporte trennen Spalten oft mit Semikolon</td><td>In Komma-CSV umwandeln</td></tr>' +
          '<tr><td>Deutsche Spaltennamen</td><td>„Datum“, „Betreff“, „Beginn“ statt „Start Date“, „Subject“, „Start Time“</td><td>Spalten zuordnen</td></tr>' +
          '<tr><td>Datumsformat</td><td>TT.MM.JJJJ statt dem Format aus Googles Beispiel (MM/TT/JJJJ)</td><td>Umwandeln, bei Mehrdeutigkeit nachfragen</td></tr>' +
          '<tr><td>Datei größer als 1 MB</td><td>„Google Calendar is temporarily unavailable“</td><td>{tooLarge|Datei verkleinern oder teilen}</td></tr>' +
          '<tr><td>Umlaute kaputt</td><td>„MÃ¼ller“ statt „Müller“</td><td>Zeichensatz richtig erkennen und als UTF-8 speichern</td></tr>' +
          '</tbody></table></div>' },
        { h2: 'Die Fehlermeldungen von Google – und was sie bedeuten', html: '<ul><li><strong>„Processed zero events“:</strong> Laut Google oft, weil zweimal auf „Importieren“ geklickt wurde. Der erste Klick hat funktioniert – schau in den Kalender.</li><li><strong>„Processed x of y events“:</strong> Google konnte einige Termine nicht lesen. Google empfiehlt, die Datei erneut zu exportieren und das Format zu prüfen.</li><li><strong>„The connection to the server was reset“:</strong> meist ein Formatfehler in der Datei.</li><li><strong>„Google Calendar is temporarily unavailable“:</strong> meist ist die Datei größer als 1 MB.</li></ul>' },
        { h2: 'So muss eine Google-CSV aussehen', html: '<p>Die erste Zeile enthält die Spaltennamen auf Englisch. Pflicht sind nur <code>Subject</code> und <code>Start Date</code>; optional sind <code>Start Time</code>, <code>End Date</code>, <code>End Time</code>, <code>All Day Event</code>, <code>Description</code>, <code>Location</code> und <code>Private</code>. Enthält ein Wert ein Komma, steht er in Anführungszeichen. Eine leere Vorlage gibt es im {tool|Werkzeug} zum Herunterladen.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Warum kann ich keinen Kalender in Google Kalender importieren?', a: 'Die häufigsten Gründe: Die Datei ist größer als 1 MB, die CSV nutzt Semikolon statt Komma, die Spaltennamen sind nicht englisch, oder du versuchst es am Handy – der Import geht nur am Computer. Eine ZIP-Datei musst du erst entpacken.' },
        { q: 'Muss die CSV-Datei englische Spaltennamen haben?', a: 'Ja. Google verlangt englische Spaltennamen. Pflicht sind nur „Subject“ und „Start Date“.' },
        { q: 'Warum werden meine Serientermine zu Einzelterminen?', a: 'Aus einer CSV-Datei legt Google Serien als einzelne Termine an. Echte Wiederholungen gehen nur mit einer ICS-Datei.' }
      ],
      cta: 'CSV jetzt ins Google-Format umwandeln'
    },
    en: {
      title: 'Can’t Import CSV to Google Calendar? Fix It Step by Step',
      description: 'Semicolons, non-English headers, wrong date format or an error message? Find out why your CSV import fails and fix it in minutes.',
      h1: 'Can’t import CSV to Google Calendar? Here are the fixes',
      crumb: 'Import fails',
      teaser: 'Separators, column names, date formats, error messages',
      answer: '<strong>An import usually fails for one of four reasons:</strong> the file uses semicolons instead of commas, the column names aren’t in English, the date format is wrong, or the file is larger than 1 MB. Google Calendar requires commas as separators and English column names; only “Subject” and “Start Date” are mandatory.',
      stepsTitle: 'Step by step to an importable CSV file',
      steps: [
        { name: 'Drop the file into the tool', text: 'The tool detects the separator (including semicolons), the character set (including Windows/Excel), German and English column names and common date formats by itself.' },
        { name: 'Confirm the date format', text: 'If a date like 03/04/2025 is ambiguous, the tool asks once per column instead of guessing.' },
        { name: 'Check for errors', text: 'Under “Check” you see every problem row in plain language, e.g. “Row 14: The end is before the start”, each with a suggested fix.' },
        { name: 'Download as Google CSV', text: 'The file then has English column names, commas as separators and the date format from Google’s example (05/30/2020, 10:00 AM).' },
        { name: 'Import on a computer', text: 'Google Calendar → Settings → Import & export → Select file from your computer → Import.' }
      ],
      sections: [
        { h2: 'The most common causes', html: '<div class="table-wrap"><table><thead><tr><th>Cause</th><th>How to spot it</th><th>Fix</th></tr></thead><tbody>' +
          '<tr><td>Semicolons instead of commas</td><td>European Excel exports often separate columns with semicolons</td><td>Convert to a comma CSV</td></tr>' +
          '<tr><td>Non-English column names</td><td>“Datum”, “Betreff” instead of “Start Date”, “Subject”</td><td>Map the columns</td></tr>' +
          '<tr><td>Date format</td><td>DD.MM.YYYY instead of the format in Google’s example (MM/DD/YYYY)</td><td>Convert; ask when ambiguous</td></tr>' +
          '<tr><td>File larger than 1 MB</td><td>“Google Calendar is temporarily unavailable”</td><td>{tooLarge|Shrink or split the file}</td></tr>' +
          '<tr><td>Broken special characters</td><td>“MÃ¼ller” instead of “Müller”</td><td>Detect the character set and save as UTF-8</td></tr>' +
          '</tbody></table></div>' },
        { h2: 'Google’s error messages – and what they mean', html: '<ul><li><strong>“Processed zero events”:</strong> according to Google often because Import was clicked twice. The first click worked – check your calendar.</li><li><strong>“Processed x of y events”:</strong> Google couldn’t read some events. Google recommends exporting the file again and checking its format.</li><li><strong>“The connection to the server was reset”:</strong> usually a formatting error in the file.</li><li><strong>“Google Calendar is temporarily unavailable”:</strong> usually the file is larger than 1 MB.</li></ul>' },
        { h2: 'What a Google CSV must look like', html: '<p>The first row contains the column names in English. Only <code>Subject</code> and <code>Start Date</code> are required; <code>Start Time</code>, <code>End Date</code>, <code>End Time</code>, <code>All Day Event</code>, <code>Description</code>, <code>Location</code> and <code>Private</code> are optional. If a value contains a comma, it is wrapped in quotation marks. You can download a blank template in the {tool|tool}.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Why can’t I import a calendar into Google Calendar?', a: 'The most common reasons: the file is larger than 1 MB, the CSV uses semicolons instead of commas, the column names aren’t in English, or you’re trying on a phone – import only works on a computer. A ZIP file has to be unzipped first.' },
        { q: 'Does the CSV need English column names?', a: 'Yes. Google requires English column names. Only “Subject” and “Start Date” are mandatory.' },
        { q: 'Why do my recurring events become single events?', a: 'From a CSV file, Google creates recurring events as a series of one-time events. Real recurrence only works with an ICS file.' }
      ],
      cta: 'Convert your CSV to Google’s format now'
    }
  },

  // ------------------------------------------------------------------ Aufteilen (Workspace)
  split: {
    type: 'howto',
    sources: ['import', 'create', 'limits', 'problems'],
    related: ['tooLarge', 'ics', 'limits', 'undo'],
    de: {
      title: 'Google Kalender aufteilen: ein Kalender pro Person',
      description: 'Einen großen Google Kalender auf mehrere Kalender oder Konten aufteilen – z. B. beim Umzug auf Workspace. Nach Kürzel, Stichwort oder Jahr.',
      h1: 'Google Kalender aufteilen – z. B. einen Kalender pro Mitarbeiter',
      crumb: 'Kalender aufteilen',
      teaser: 'Gemeinsamen Kalender auf Personen oder Konten verteilen',
      answer: '<strong>Einen Google Kalender teilst du auf, indem du ihn als ICS exportierst, die Termine nach Personen, Stichwörtern oder Zeiträumen auf mehrere Dateien verteilst und jede Datei in den passenden Kalender oder das passende Konto importierst.</strong> Das Werkzeug erkennt dabei selbst, wonach sich aufteilen lässt – etwa Mitarbeiter-Kürzel im Titel – und hält jede Datei unter Googles Grenze von 1 MB.',
      stepsTitle: 'Schritt für Schritt: gemeinsamen Kalender auf Personen verteilen',
      steps: [
        { name: 'Kalender exportieren', text: 'In Google Kalender am Computer: Einstellungen → Importieren & Exportieren → Exportieren. Du erhältst eine ZIP-Datei mit einer ICS-Datei pro Kalender.' },
        { name: 'ZIP ins Werkzeug ziehen', text: 'Das Werkzeug zeigt, wie viele Kalender in der Datei sind, und für jeden Termine, Zeitraum, Größe und Auffälligkeiten.' },
        { name: 'Aufteilung wählen', text: 'Unter „Aufteilen“ schlägt das Werkzeug vor, was es gefunden hat – zum Beispiel 12 Kürzel im Titel. Ein Klick legt pro Kürzel einen Ziel-Kalender an; Namen und Suchbegriffe kannst du anpassen.' },
        { name: 'Prüfen', text: 'Das Live-Ergebnis zeigt pro Ziel-Kalender die Zahl der Termine. Termine mit zwei Kürzeln landen auf Wunsch in beiden Kalendern; Termine ohne Treffer in einem Rest-Kalender.' },
        { name: 'Herunterladen und verteilen', text: 'Jede Person bekommt ihre Datei(en). Sie meldet sich am Computer mit ihrem eigenen Konto an, legt einen neuen Kalender an und importiert ihre Datei.' }
      ],
      sections: [
        { h2: 'Typischer Fall: vom gemeinsamen Kalender zu eigenen Workspace-Konten', html: '<p>Viele Praxen, Vereine und kleine Firmen haben jahrelang in <em>einem</em> Google Kalender geplant – wer zuständig ist, steht als Kürzel oder Name im Titel. Mit Google Workspace bekommt jede Person ein eigenes Konto. Dann muss der alte Kalender auf die Personen verteilt werden.</p><p>Das Werkzeug sucht in deinem Export automatisch nach Merkmalen, die sich zum Aufteilen eignen: Kürzel aus Großbuchstaben am Titelanfang, wiederkehrende Terminarten, Kategorien und Organisatoren. Es zeigt auch, wie viele Termine gleichzeitig stattfinden – viele parallele Termine sprechen dafür, dass mehrere Personen im selben Kalender planen.</p>' },
        { h2: 'Wonach du aufteilen kannst', html: '<div class="table-wrap"><table><thead><tr><th>Merkmal</th><th>Beispiel</th><th>Gut für</th></tr></thead><tbody><tr><td>Kalender in der Datei</td><td>ZIP-Export mit mehreren ICS-Dateien</td><td>Unterkalender einzeln weitergeben</td></tr><tr><td>Kürzel oder Name im Titel</td><td>„T. AK Kontrolle“, „Dr. Müller – Impfung“</td><td>ein Kalender pro Mitarbeiter</td></tr><tr><td>Titelanfang</td><td>„Online …“, „OP …“</td><td>Terminarten trennen</td></tr><tr><td>Kategorie oder Organisator</td><td>Kategorie „Schulung“</td><td>Exporte aus Outlook und anderen Programmen</td></tr><tr><td>Jahr</td><td>2024, 2025, 2026</td><td>Archiv und aktuellen Kalender trennen</td></tr></tbody></table></div>' },
        { h2: 'Worauf du achten solltest', html: '<ul><li><strong>Gäste und Konferenzdaten</strong> übernimmt Google beim Import nicht – Einladungen müssen gegebenenfalls neu verschickt werden.</li><li><strong>Nicht zu viele Kalender auf einmal:</strong> Für Workspace-Konten nennt Google eine Einschränkung, wenn in kurzer Zeit mehr als 60 Kalender angelegt werden.</li><li><strong>Erst in einen neuen Kalender importieren:</strong> So lässt sich ein missglückter Import mit einem Klick löschen – siehe {undo|Import rückgängig machen}.</li><li><strong>Datenschutz:</strong> Stehen Patienten- oder Kundendaten in den Terminen, kannst du Telefonnummern und E-Mail-Adressen vorher ausblenden.</li></ul>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Kann ich einen Google Kalender auf ein anderes Konto übertragen?', a: 'Ja: als ICS exportieren und im anderen Konto am Computer importieren. Gäste und Konferenzdaten übernimmt Google dabei nicht. Ist die Datei größer als 1 MB, teilt das Werkzeug sie auf.' },
        { q: 'Was passiert mit Terminen, bei denen zwei Personen eingetragen sind?', a: 'Du entscheidest: Entweder landen sie in jedem passenden Kalender oder nur im ersten. Das Werkzeug zeigt, wie viele Termine betroffen sind.' },
        { q: 'Bleiben Serientermine beim Aufteilen erhalten?', a: 'Ja. Eine Serie bleibt mit ihren geänderten Einzelterminen in derselben Datei und wird als echte Serie importiert.' }
      ],
      cta: 'Kalender jetzt analysieren und aufteilen'
    },
    en: {
      title: 'Split Google Calendar: One Calendar per Person',
      description: 'Split a large Google Calendar into several calendars or accounts – e.g. when moving to Workspace. By initials, keyword or year, without uploads.',
      h1: 'Split a Google Calendar – e.g. one calendar per employee',
      crumb: 'Split a calendar',
      teaser: 'Distribute a shared calendar across people or accounts',
      answer: '<strong>You split a Google Calendar by exporting it as ICS, distributing the events across several files by person, keyword or date range, and importing each file into the right calendar or account.</strong> The tool detects what the calendar can be split by – such as staff initials in event titles – and keeps every file under Google’s 1 MB limit.',
      stepsTitle: 'Step by step: distribute a shared calendar across people',
      steps: [
        { name: 'Export the calendar', text: 'In Google Calendar on a computer: Settings → Import & export → Export. You get a ZIP file with one ICS file per calendar.' },
        { name: 'Drop the ZIP into the tool', text: 'The tool shows how many calendars are in the file and, for each, the events, date range, size and anything unusual.' },
        { name: 'Choose how to split', text: 'Under “Split”, the tool suggests what it found – for example 12 sets of initials in titles. One click creates a target calendar per set of initials; you can edit names and keywords.' },
        { name: 'Review', text: 'The live result shows the number of events per target calendar. Events with two sets of initials can go into both calendars; events without a match go into a “rest” calendar.' },
        { name: 'Download and hand out', text: 'Each person gets their file(s). They sign in with their own account on a computer, create a new calendar and import their file.' }
      ],
      sections: [
        { h2: 'Typical case: from a shared calendar to individual Workspace accounts', html: '<p>Many practices, clubs and small businesses have planned in <em>one</em> Google Calendar for years – who is responsible is written as initials or a name in the title. With Google Workspace, everyone gets their own account. The old calendar then has to be distributed across those people.</p><p>The tool automatically searches your export for features suitable for splitting: initials in capital letters at the start of titles, recurring event types, categories and organizers. It also shows how many events take place at the same time – many parallel events suggest that several people plan in the same calendar.</p>' },
        { h2: 'What you can split by', html: '<div class="table-wrap"><table><thead><tr><th>Feature</th><th>Example</th><th>Good for</th></tr></thead><tbody><tr><td>Calendars in the file</td><td>ZIP export with several ICS files</td><td>handing out sub-calendars</td></tr><tr><td>Initials or name in the title</td><td>“T. AK check-up”, “Dr. Miller – vaccination”</td><td>one calendar per employee</td></tr><tr><td>Start of the title</td><td>“Online …”, “Surgery …”</td><td>separating event types</td></tr><tr><td>Category or organizer</td><td>category “Training”</td><td>exports from Outlook and other apps</td></tr><tr><td>Year</td><td>2024, 2025, 2026</td><td>separating archive and current calendar</td></tr></tbody></table></div>' },
        { h2: 'What to watch out for', html: '<ul><li><strong>Guests and conference data</strong> aren’t imported by Google – invitations may need to be sent again.</li><li><strong>Not too many calendars at once:</strong> for Workspace accounts, Google mentions a restriction if more than 60 calendars are created in a short period.</li><li><strong>Import into a new calendar first:</strong> that way a failed import can be deleted in one go – see {undo|undo an import}.</li><li><strong>Privacy:</strong> if events contain patient or customer data, you can hide phone numbers and email addresses beforehand.</li></ul>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'How do I migrate a Google Calendar to Google Workspace?', a: 'Export it as ICS and import it on a computer in the other account. Google doesn’t transfer guests and conference data. If the file is larger than 1 MB, the tool splits it.' },
        { q: 'What happens to events that list two people?', a: 'You decide: they either go into every matching calendar or only into the first. The tool shows how many events are affected.' },
        { q: 'Do recurring events survive the split?', a: 'Yes. A series stays in the same file together with its changed occurrences and is imported as a real series.' }
      ],
      cta: 'Analyse and split your calendar now'
    }
  },

  // ------------------------------------------------------------------ Excel / Geburtstage
  excel: {
    type: 'howto',
    sources: ['import', 'problems'],
    related: ['convert', 'importFails', 'ics', 'undo'],
    de: {
      title: 'Excel-Geburtstagsliste in Google Kalender importieren',
      description: 'Geburtstage aus Excel als jährliche Termine in Google Kalender: Liste hochladen? Nicht nötig – das Werkzeug wandelt sie im Browser in eine ICS-Datei.',
      h1: 'Excel-Geburtstagsliste in Google Kalender importieren',
      crumb: 'Excel & Geburtstage',
      teaser: 'Geburtstage jedes Jahr automatisch im Kalender',
      answer: '<strong>Eine Geburtstagsliste aus Excel bringst du in Google Kalender, indem du sie in eine ICS-Datei mit jährlicher Wiederholung umwandelst und diese am Computer importierst.</strong> Als CSV geht das nicht gut: Aus einer CSV-Datei legt Google Serien als lauter Einzeltermine an. Das Werkzeug erkennt Name und Geburtstag selbst und erzeugt ganztägige Termine, die sich jedes Jahr wiederholen.',
      stepsTitle: 'Schritt für Schritt: Geburtstage aus Excel',
      steps: [
        { name: 'Liste vorbereiten', text: 'Eine Spalte mit dem Namen, eine mit dem Geburtsdatum genügt. Eine fertige Vorlage gibt es im Werkzeug.' },
        { name: 'Excel-Datei ins Werkzeug ziehen', text: 'Das Werkzeug erkennt Excel-Datumswerte, TT.MM.JJJJ und andere Formate. Bei mehrdeutigen Daten fragt es nach.' },
        { name: 'Geburtstagsmodus prüfen', text: 'Erkannte Geburtstagslisten werden automatisch als jährliche, ganztägige Termine angelegt – wahlweise mit Geburtsjahr im Titel.' },
        { name: 'ICS herunterladen', text: 'Eine Liste mit Geburtstagen bleibt fast immer weit unter 1 MB und passt in eine Datei.' },
        { name: 'Am Computer importieren', text: 'Neuen Kalender „Geburtstage“ anlegen, dann Einstellungen → Importieren & Exportieren → Datei auswählen → Importieren.' }
      ],
      sections: [
        { h2: 'Warum ICS und nicht CSV?', html: '<p>Laut Google werden Serientermine aus einer CSV-Datei zu einer Reihe einzelner Termine. Eine ICS-Datei dagegen kann eine echte Regel enthalten: „jedes Jahr am 12. März“. Deshalb erzeugt das Werkzeug für Geburtstage immer eine ICS-Datei. Mehr dazu: {convert|CSV in ICS umwandeln}.</p>' },
        { h2: 'Und wer am 29. Februar Geburtstag hat?', html: '<p>Für den 29. Februar legt das Werkzeug eine Regel an, die in Jahren ohne 29. Februar auf den 28. Februar fällt. So fehlt der Geburtstag in keinem Jahr.</p>' },
        { h2: 'Andere Excel-Listen', html: '<p>Vereinstermine, Dienstpläne oder Schulungen aus Excel funktionieren genauso: Das Werkzeug ordnet die Spalten zu (Titel, Datum, Uhrzeit, Ort) und erzeugt wahlweise eine Google-CSV oder eine ICS-Datei. Telefonnummern oder Adressen in der Liste erkennt es und bietet an, sie wegzulassen.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Muss ich meine Excel-Datei vorher als CSV speichern?', a: 'Nein. Das Werkzeug liest XLSX-Dateien direkt – im Browser, ohne Upload.' },
        { q: 'Kann ich das Alter im Termin anzeigen?', a: 'Ein mitlaufendes Alter kann eine jährliche Wiederholung nicht abbilden. Das Werkzeug schreibt stattdessen das Geburtsjahr in den Titel, z. B. „Geburtstag: Erika Huber (geb. 1948)“.' },
        { q: 'Werden die Geburtstage als ganztägige Termine angelegt?', a: 'Ja, ganztägig und als „frei“ markiert, damit sie deinen Kalender nicht blockieren.' }
      ],
      cta: 'Geburtstagsliste jetzt umwandeln'
    },
    en: {
      title: 'Excel to Google Calendar: Import Lists & Birthdays',
      description: 'Turn Excel lists – including birthdays – into Google Calendar events. Yearly birthdays via ICS, event lists via CSV. Runs in your browser, no upload.',
      h1: 'Excel to Google Calendar: import event lists and birthdays',
      crumb: 'Excel & birthdays',
      teaser: 'Birthdays every year, automatically',
      answer: '<strong>To get an Excel list into Google Calendar, convert it into a Google CSV or – for birthdays – into an ICS file with yearly recurrence, then import it on a computer.</strong> Birthdays don’t work well as CSV: from a CSV file, Google creates recurring events as a series of single events. The tool detects name and birthday columns and creates all-day events that repeat every year.',
      stepsTitle: 'Step by step: from Excel to Google Calendar',
      steps: [
        { name: 'Prepare the list', text: 'For birthdays, one column with the name and one with the date of birth is enough. A ready-made template is available in the tool.' },
        { name: 'Drop the Excel file into the tool', text: 'The tool understands Excel date values, DD.MM.YYYY and other formats. If dates are ambiguous, it asks.' },
        { name: 'Check the birthday mode', text: 'Detected birthday lists are created as yearly all-day events – optionally with the birth year in the title.' },
        { name: 'Download', text: 'A birthday list almost always stays far below 1 MB and fits into one file.' },
        { name: 'Import on a computer', text: 'Create a new calendar “Birthdays”, then Settings → Import & export → Select file from your computer → Import.' }
      ],
      sections: [
        { h2: 'Why ICS and not CSV for birthdays?', html: '<p>According to Google, recurring events from a CSV file turn into a series of one-time events. An ICS file, by contrast, can contain a real rule: “every year on 12 March”. That’s why the tool always creates an ICS file for birthdays. More: {convert|CSV to ICS converter}.</p>' },
        { h2: 'What about birthdays on 29 February?', html: '<p>For 29 February the tool creates a rule that falls on 28 February in years without a 29 February, so the birthday is never missing.</p>' },
        { h2: 'Other Excel lists', html: '<p>Club events, rosters or training schedules from Excel work the same way: the tool maps the columns (title, date, time, location) and creates either a Google CSV or an ICS file. It detects phone numbers or addresses in the list and offers to leave them out.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Do I need to save my Excel file as CSV first?', a: 'No. The tool reads XLSX files directly – in your browser, without uploading.' },
        { q: 'Can the event show the person’s age?', a: 'A yearly recurring event can’t carry a changing age. Instead, the tool puts the birth year in the title, e.g. “Birthday: Erika Huber (born 1948)”.' },
        { q: 'Are birthdays created as all-day events?', a: 'Yes – all-day and marked as “free”, so they don’t block your calendar.' }
      ],
      cta: 'Convert your Excel list now'
    }
  },

  // ------------------------------------------------------------------ ICS
  ics: {
    type: 'howto',
    sources: ['import', 'problems'],
    related: ['tooLarge', 'split', 'convert', 'undo'],
    de: {
      title: 'ICS-Datei in Google Kalender importieren – so geht’s',
      description: 'ICS-Datei in Google Kalender importieren: am Computer über Einstellungen → Importieren. Was bei Fehlern, ZIP-Dateien und Dateien über 1 MB hilft.',
      h1: 'ICS-Datei in Google Kalender importieren',
      crumb: 'ICS importieren',
      teaser: 'Schritt für Schritt, mit Lösungen für Fehler',
      answer: '<strong>Eine ICS-Datei importierst du in Google Kalender am Computer über Einstellungen → Importieren & Exportieren → Datei auswählen → Importieren.</strong> Die Datei darf höchstens 1 MB groß sein; eine ZIP-Datei musst du vorher entpacken und jede ICS-Datei einzeln importieren.',
      stepsTitle: 'Schritt für Schritt: ICS-Datei importieren',
      steps: [
        { name: 'Neuen Kalender anlegen', text: 'Lege für den Import einen eigenen Kalender an. Gefällt dir das Ergebnis nicht, löschst du einfach diesen Kalender.' },
        { name: 'Einstellungen öffnen', text: 'Google Kalender am Computer öffnen, oben rechts auf das Zahnrad und dann auf „Einstellungen“ klicken.' },
        { name: 'Importieren & Exportieren', text: 'Links „Importieren & Exportieren“ wählen und „Datei auswählen“ klicken.' },
        { name: 'Ziel-Kalender wählen', text: 'Die ICS-Datei auswählen und als Ziel den neuen Kalender einstellen.' },
        { name: 'Einmal auf „Importieren“ klicken', text: 'Ein zweiter Klick führt zur Meldung „Processed zero events“ – die Termine sind dann meist schon da.' }
      ],
      sections: [
        { h2: 'Wenn der Import nicht klappt', html: '<div class="table-wrap"><table><thead><tr><th>Problem</th><th>Lösung</th></tr></thead><tbody><tr><td>Datei größer als 1 MB</td><td>{tooLarge|Datei verkleinern oder teilen}</td></tr><tr><td>ZIP-Datei aus dem Google-Export</td><td>entpacken und jede ICS-Datei einzeln importieren – oder das ZIP ins {tool|Werkzeug} ziehen</td></tr><tr><td>„Processed x of y events“</td><td>Einige Termine sind nicht lesbar; die Datei neu exportieren oder im Werkzeug prüfen</td></tr><tr><td>Termine zur falschen Uhrzeit</td><td>Zeitzone in Google Kalender und im Quellprogramm prüfen</td></tr><tr><td>Gäste fehlen</td><td>Gäste und Konferenzdaten übernimmt Google beim Import nicht</td></tr></tbody></table></div>' },
        { h2: 'Wie eine gültige ICS-Datei aufgebaut ist', html: '<p>Laut Google beginnt eine ICS-Datei mit <code>BEGIN:VCALENDAR</code>, gefolgt von <code>VERSION:2.0</code> und <code>PRODID</code>, und endet mit <code>END:VCALENDAR</code>. Jeder Termin steht zwischen <code>BEGIN:VEVENT</code> und <code>END:VEVENT</code>. Das Werkzeug prüft und schreibt Dateien nach dem iCalendar-Standard RFC 5545.</p>' },
        { h2: 'ICS-Datei vorher ansehen', html: '<p>Bevor du importierst, kannst du die Datei im Werkzeug öffnen: Es zeigt Zahl der Termine, Zeitraum, Serien, Zeitzonen und ob Telefonnummern oder E-Mail-Adressen darin stehen. Enthält die Datei mehrere Personen oder Themen, kannst du sie {split|auf mehrere Kalender aufteilen}.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Warum kann ich keine ICS-Datei in den Google Kalender importieren?', a: 'Häufige Gründe: Die Datei ist größer als 1 MB, sie ist noch in einer ZIP-Datei verpackt, sie hat Formatfehler – oder du versuchst es am Handy. Der Import geht nur am Computer.' },
        { q: 'Werden Serientermine aus einer ICS-Datei übernommen?', a: 'Ja, aus ICS-Dateien schon. Nur aus CSV-Dateien legt Google Serien als Einzeltermine an.' },
        { q: 'Kann ich eine ICS-Datei öffnen, ohne sie zu importieren?', a: 'Ja – im Werkzeug. Es zeigt alle Kennzahlen und läuft komplett im Browser, ohne Upload.' }
      ],
      cta: 'ICS-Datei prüfen, bevor du sie importierst'
    },
    en: {
      title: 'Import ICS File to Google Calendar: Step-by-Step',
      description: 'Import an ICS file into Google Calendar on a computer via Settings → Import. What helps with errors, ZIP files and files over 1 MB.',
      h1: 'Import an ICS file to Google Calendar',
      crumb: 'Import ICS',
      teaser: 'Step by step, with fixes for errors',
      answer: '<strong>To import an ICS file into Google Calendar, open it on a computer and go to Settings → Import & export → Select file from your computer → Import.</strong> The file can be at most 1 MB; a ZIP file must be unzipped first, and each ICS file imported separately.',
      stepsTitle: 'Step by step: import an ICS file',
      steps: [
        { name: 'Create a new calendar', text: 'Create a separate calendar for the import. If you don’t like the result, simply delete that calendar.' },
        { name: 'Open Settings', text: 'Open Google Calendar on a computer, click the gear icon at the top right, then “Settings”.' },
        { name: 'Import & export', text: 'Choose “Import & export” on the left and click “Select file from your computer”.' },
        { name: 'Choose the destination calendar', text: 'Select the ICS file and set the new calendar as the destination.' },
        { name: 'Click “Import” once', text: 'A second click leads to “Processed zero events” – the events are usually already there.' }
      ],
      sections: [
        { h2: 'If the import doesn’t work', html: '<div class="table-wrap"><table><thead><tr><th>Problem</th><th>Fix</th></tr></thead><tbody><tr><td>File larger than 1 MB</td><td>{tooLarge|Shrink or split the file}</td></tr><tr><td>ZIP file from Google’s export</td><td>Unzip it and import each ICS file separately – or drop the ZIP into the {tool|tool}</td></tr><tr><td>“Processed x of y events”</td><td>Some events can’t be read; export again or check the file in the tool</td></tr><tr><td>Events at the wrong time</td><td>Check the time zone in Google Calendar and in the source app</td></tr><tr><td>Guests are missing</td><td>Google doesn’t import guests and conference data</td></tr></tbody></table></div>' },
        { h2: 'What a valid ICS file looks like', html: '<p>According to Google, an ICS file starts with <code>BEGIN:VCALENDAR</code>, followed by <code>VERSION:2.0</code> and <code>PRODID</code>, and ends with <code>END:VCALENDAR</code>. Each event sits between <code>BEGIN:VEVENT</code> and <code>END:VEVENT</code>. The tool checks and writes files according to the iCalendar standard RFC 5545.</p>' },
        { h2: 'Look inside an ICS file first', html: '<p>Before importing, you can open the file in the tool: it shows the number of events, date range, recurring events, time zones and whether it contains phone numbers or email addresses. If it covers several people or topics, you can {split|split it into several calendars}.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Why can’t I import an ICS file into Google Calendar?', a: 'Common reasons: the file is larger than 1 MB, it’s still packed in a ZIP file, it has formatting errors – or you’re trying on a phone. Import only works on a computer.' },
        { q: 'Are recurring events from an ICS file kept?', a: 'Yes, from ICS files they are. Only from CSV files does Google create recurring events as single events.' },
        { q: 'Can I open an ICS file without importing it?', a: 'Yes – in the tool. It shows all key figures and runs entirely in your browser, without uploading.' }
      ],
      cta: 'Check your ICS file before importing'
    }
  },

  // ------------------------------------------------------------------ CSV → ICS
  convert: {
    type: 'howto',
    sources: ['import', 'rfc5545'],
    related: ['excel', 'ics', 'importFails', 'tooLarge'],
    de: {
      title: 'CSV in ICS umwandeln – kostenlos und ohne Upload',
      description: 'CSV oder Excel in eine ICS-Kalenderdatei umwandeln – mit Zeitzone, Serien und Geburtstagen. Läuft im Browser, deine Daten bleiben auf deinem Gerät.',
      h1: 'CSV in ICS umwandeln',
      crumb: 'CSV in ICS',
      teaser: 'Mit Zeitzone, Serien und Geburtstagen',
      answer: '<strong>Eine CSV-Datei wandelst du in eine ICS-Datei um, indem du jede Zeile in einen Termin nach dem iCalendar-Standard (RFC 5545) überträgst – mit Beginn, Ende, Titel und Zeitzone.</strong> Das Werkzeug erledigt das im Browser: Datei hineinziehen, Spalten prüfen, „ICS“ wählen, herunterladen.',
      stepsTitle: 'Schritt für Schritt: CSV in ICS umwandeln',
      steps: [
        { name: 'CSV oder Excel öffnen', text: 'Das Werkzeug erkennt Trennzeichen, Zeichensatz, Spaltennamen und Datumsformate selbst.' },
        { name: 'Spalten prüfen', text: 'Unter „Spalten“ siehst du, was als Titel, Beginn, Ende, Ort und Beschreibung übernommen wird.' },
        { name: 'Zeitzone wählen', text: 'Uhrzeiten werden mit Zeitzone (Standard: Europe/Berlin) gespeichert, damit sie überall richtig angezeigt werden.' },
        { name: '„ICS“ wählen und herunterladen', text: 'Zu große Ergebnisse werden in Teile unter 1 MB aufgeteilt.' }
      ],
      sections: [
        { h2: 'Wann ICS besser ist als CSV', html: '<div class="table-wrap"><table><thead><tr><th></th><th>Google-CSV</th><th>ICS</th></tr></thead><tbody><tr><td>Serientermine</td><td>werden zu Einzelterminen</td><td>echte Wiederholung</td></tr><tr><td>Zeitzone</td><td>keine Angabe in der Datei</td><td>wird mitgespeichert</td></tr><tr><td>Andere Programme</td><td>vor allem Google</td><td>Google, Outlook, Apple und viele mehr</td></tr><tr><td>Bearbeiten in Excel</td><td>einfach</td><td>nicht vorgesehen</td></tr></tbody></table></div><p>Für Geburtstage und andere jährliche Termine ist ICS deshalb die richtige Wahl – siehe {excel|Excel-Geburtstagsliste importieren}.</p>' },
        { h2: 'Ohne Upload umwandeln', html: '<p>Viele Online-Konverter laden deine Datei auf einen Server. Bei Terminlisten mit Namen, Telefonnummern oder Patientendaten ist das heikel. Das Werkzeug arbeitet ausschließlich in deinem Browser; eine Sicherheitsregel verbietet der Seite Verbindungen zu fremden Servern. Erkannte persönliche Daten kannst du vor dem Export weglassen oder kürzen.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Kann ChatGPT eine ICS-Datei erstellen?', a: 'Ja, KI-Chatbots können den Text einer ICS-Datei erzeugen. Prüfe das Ergebnis aber: Der Rahmen muss stimmen (BEGIN:VCALENDAR, VERSION, PRODID, END:VCALENDAR), Google nimmt höchstens 1 MB – und wenn du eine Terminliste mit persönlichen Daten in einen Chat kopierst, verlässt sie dein Gerät. Mit dem Werkzeug wandelst du ohne Upload um.' },
        { q: 'Werden Umlaute richtig übernommen?', a: 'Ja. Das Werkzeug erkennt auch den Windows-Zeichensatz von Excel und speichert die ICS-Datei in UTF-8.' },
        { q: 'Kann ich ICS auch zurück in CSV umwandeln?', a: 'Ja, als Google-CSV – mit der Einschränkung, dass Serientermine dabei nicht als Serie dargestellt werden können.' }
      ],
      cta: 'CSV jetzt in ICS umwandeln'
    },
    en: {
      title: 'CSV to ICS Converter – Free, No Upload',
      description: 'Convert CSV or Excel into an ICS calendar file – with time zone, recurring events and birthdays. Runs in your browser; your data stays on your device.',
      h1: 'CSV to ICS converter',
      crumb: 'CSV to ICS',
      teaser: 'With time zone, recurring events and birthdays',
      answer: '<strong>To convert a CSV file to ICS, every row is turned into an event according to the iCalendar standard (RFC 5545) – with start, end, title and time zone.</strong> The tool does this in your browser: drop the file in, check the columns, choose “ICS”, download.',
      stepsTitle: 'Step by step: convert CSV to ICS',
      steps: [
        { name: 'Open your CSV or Excel file', text: 'The tool detects separators, character set, column names and date formats by itself.' },
        { name: 'Check the columns', text: 'Under “Columns” you see what becomes the title, start, end, location and description.' },
        { name: 'Choose a time zone', text: 'Times are stored with a time zone (default: Europe/Berlin) so they display correctly everywhere.' },
        { name: 'Choose “ICS” and download', text: 'Results that are too large are split into parts under 1 MB.' }
      ],
      sections: [
        { h2: 'When ICS beats CSV', html: '<div class="table-wrap"><table><thead><tr><th></th><th>Google CSV</th><th>ICS</th></tr></thead><tbody><tr><td>Recurring events</td><td>become single events</td><td>real recurrence</td></tr><tr><td>Time zone</td><td>not stored in the file</td><td>stored</td></tr><tr><td>Other apps</td><td>mainly Google</td><td>Google, Outlook, Apple and many more</td></tr><tr><td>Editing in Excel</td><td>easy</td><td>not intended</td></tr></tbody></table></div><p>For birthdays and other yearly events, ICS is the right choice – see {excel|Excel to Google Calendar}.</p>' },
        { h2: 'Convert without uploading', html: '<p>Many online converters upload your file to a server. With event lists containing names, phone numbers or patient data, that’s risky. The tool works exclusively in your browser; a security policy forbids the page to connect to other servers. You can leave out or shorten detected personal data before exporting.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Can ChatGPT make an ICS file?', a: 'Yes, AI chatbots can generate the text of an ICS file. Check the result, though: the frame must be right (BEGIN:VCALENDAR, VERSION, PRODID, END:VCALENDAR), Google accepts at most 1 MB – and if you paste an event list with personal data into a chat, it leaves your device. With the tool you convert without uploading.' },
        { q: 'Are special characters kept?', a: 'Yes. The tool also detects Excel’s Windows character set and saves the ICS file as UTF-8.' },
        { q: 'Can I convert ICS back to CSV?', a: 'Yes, as a Google CSV – with the limitation that recurring events can’t be represented as a series.' }
      ],
      cta: 'Convert CSV to ICS now'
    }
  },

  // ------------------------------------------------------------------ Rückgängig
  undo: {
    type: 'howto',
    sources: ['delete', 'create', 'problems'],
    related: ['ics', 'tooLarge', 'split', 'limits'],
    de: {
      title: 'Google Kalender Import rückgängig machen & Termine löschen',
      description: 'Einen Import rückgängig machen kann Google Kalender nicht. So löschst du importierte Termine trotzdem – und so planst du den nächsten Import richtig.',
      h1: 'Google Kalender Import rückgängig machen: importierte Termine löschen',
      crumb: 'Import rückgängig',
      teaser: 'Importierte Termine wieder loswerden',
      answer: '<strong>Einen „Rückgängig“-Knopf für Importe hat Google Kalender nicht.</strong> Hast du in einen eigens angelegten Kalender importiert, löschst du einfach diesen Kalender – samt allen importierten Terminen. Im Hauptkalender geht das nicht: Den kannst du nicht löschen, nur alle seine Termine auf einmal.',
      stepsTitle: 'Schritt für Schritt: importierten Kalender löschen',
      steps: [
        { name: 'Einstellungen öffnen', text: 'Google Kalender am Computer öffnen, oben rechts auf das Zahnrad und „Einstellungen“ klicken.' },
        { name: 'Kalender auswählen', text: 'Links den Kalender suchen, in den du importiert hast, und auf seinen Namen klicken.' },
        { name: 'Kalender entfernen', text: '„Kalender entfernen“ wählen, dann „Löschen“ und „Endgültig löschen“.' }
      ],
      sections: [
        { h2: 'Wenn die Termine im Hauptkalender gelandet sind', html: '<p>Den Hauptkalender kannst du nicht löschen. Google bietet nur an, <strong>alle</strong> Termine des Hauptkalenders auf einmal zu löschen – also auch die, die nicht aus dem Import stammen. Einzelne importierte Termine musst du sonst von Hand löschen.</p><p>Genau deshalb empfiehlt das {tool|Werkzeug} vor jedem Download, zuerst einen neuen, leeren Kalender anzulegen.</p>' },
        { h2: 'So planst du den nächsten Import', html: '<ol><li>In Google Kalender einen neuen Kalender anlegen, z. B. „Import 2026“.</li><li>Die Datei im Werkzeug prüfen und, wenn nötig, {tooLarge|in Teile unter 1 MB aufteilen}.</li><li>Jeden Teil in den neuen Kalender importieren – <strong>einmal</strong> auf „Importieren“ klicken.</li><li>Ergebnis prüfen. Passt etwas nicht, den Kalender löschen und neu beginnen.</li></ol><p>Willst du dieselben Termine ein zweites Mal importieren, kannst du im Werkzeug unter „Aufräumen“ neue Termin-Kennungen vergeben.</p>' }
      ],
      faq: [
        PHONE_FAQ_DE,
        { q: 'Kann ich nur die importierten Termine im Hauptkalender löschen?', a: 'Nicht auf einmal. Google bietet für den Hauptkalender nur „alle Termine löschen“ an. Deshalb lieber in einen eigenen, neuen Kalender importieren.' },
        { q: 'Gehen beim Löschen eines Kalenders auch geteilte Termine verloren?', a: 'Ja. Wenn du einen Kalender löschst, den du mit anderen teilst, wird er laut Google für alle entfernt.' },
        { q: 'Warum zeigt Google nach dem Import „Processed zero events“?', a: 'Laut Google oft, weil zweimal auf „Importieren“ geklickt wurde. Die Termine sind dann meist schon vom ersten Klick da.' }
      ],
      cta: 'Nächsten Import sicher vorbereiten'
    },
    en: {
      title: 'Undo Google Calendar Import: Delete Imported Events',
      description: 'Google Calendar has no undo for imports. Here’s how to delete imported events anyway – and how to set up your next import safely.',
      h1: 'Undo a Google Calendar import: delete imported events',
      crumb: 'Undo import',
      teaser: 'Get rid of imported events again',
      answer: '<strong>Google Calendar has no undo button for imports.</strong> If you imported into a calendar you created for that purpose, simply delete that calendar – along with all imported events. That doesn’t work with your primary calendar: it can’t be deleted, you can only delete all of its events at once.',
      stepsTitle: 'Step by step: delete the imported calendar',
      steps: [
        { name: 'Open Settings', text: 'Open Google Calendar on a computer, click the gear icon at the top right, then “Settings”.' },
        { name: 'Select the calendar', text: 'Find the calendar you imported into on the left and click its name.' },
        { name: 'Remove the calendar', text: 'Choose “Remove calendar”, then “Delete” and “Delete permanently”.' }
      ],
      sections: [
        { h2: 'If the events ended up in your primary calendar', html: '<p>You can’t delete your primary calendar. Google only offers to delete <strong>all</strong> events of the primary calendar at once – including those that didn’t come from the import. Otherwise you have to delete imported events by hand.</p><p>That’s exactly why the {tool|tool} recommends creating a new, empty calendar before every download.</p>' },
        { h2: 'How to set up your next import', html: '<ol><li>Create a new calendar in Google Calendar, e.g. “Import 2026”.</li><li>Check the file in the tool and, if necessary, {tooLarge|split it into parts under 1 MB}.</li><li>Import every part into the new calendar – click “Import” <strong>once</strong>.</li><li>Check the result. If something is wrong, delete the calendar and start again.</li></ol><p>If you want to import the same events a second time, you can assign new event IDs in the tool under “Clean up”.</p>' }
      ],
      faq: [
        PHONE_FAQ_EN,
        { q: 'Can I delete only the imported events in my primary calendar?', a: 'Not in one go. For the primary calendar, Google only offers “delete all events”. That’s why it’s better to import into a separate, new calendar.' },
        { q: 'Are shared events lost when I delete a calendar?', a: 'Yes. According to Google, if you delete a calendar you share with others, it is removed for everyone.' },
        { q: 'Why does Google show “Processed zero events” after importing?', a: 'According to Google, often because Import was clicked twice. The events are then usually already there from the first click.' }
      ],
      cta: 'Prepare your next import safely'
    }
  }
};
