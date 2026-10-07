import type { Faq } from './guides';

export const HOME = {
  de: {
    title: 'CSV in Google Kalender importieren – auch über 1 MB',
    description: 'CSV, Excel und ICS für Google Kalender vorbereiten: große Dateien aufteilen, filtern, Kalender trennen. Läuft im Browser – ohne Upload.',
    h1: 'CSV & Excel in Google Kalender importieren – auch über 1 MB',
    lead: 'Große oder deutsche Terminlisten so vorbereiten, dass Google Kalender sie annimmt: anschauen, filtern, auf mehrere Kalender aufteilen, fertig. Für CSV, Excel und ICS – auch den ZIP-Export von Google.',
    featuresTitle: 'Was das Werkzeug kann',
    features: [
      ['Kalender verstehen', 'Zeigt für jeden Kalender in der Datei Termine, Zeitraum, Größe, Serien und Auffälligkeiten – auch bei 10 MB und 30.000 Terminen.'],
      ['Aufteilen', 'Nach Personen (z. B. Mitarbeiter-Kürzel), Stichwörtern, Kalendern oder Jahren – ideal beim Umzug auf Google Workspace.'],
      ['Unter 1 MB bringen', 'Teilt automatisch in Teile unter 950 KB. Serien bleiben mit ihren Ausnahmen zusammen.'],
      ['Deutsche Tabellen', 'Semikolon, Windows-Zeichensatz, TT.MM.JJJJ, Excel-Datumswerte – alles wird erkannt. Bei 03/04 fragt es nach.'],
      ['Datenschutz', 'Erkennt Telefonnummern, E-Mail-Adressen, Namen und Geburtsdaten und bietet an, sie wegzulassen oder zu kürzen.'],
      ['Geburtstage', 'Macht aus Name + Datum jährliche, ganztägige Termine – über ICS, weil Google aus CSV keine Serien macht.']
    ],
    faqTitle: 'Häufige Fragen',
    guidesTitle: 'Ratgeber',
    faq: [
      { q: 'Kann ich die Termine auch am Handy importieren?', a: 'Nein. Google Kalender erlaubt den Import nur am Computer, nicht am Handy oder Tablet. Vorbereiten kannst du die Datei mit diesem Werkzeug aber auch am Handy.' },
      { q: 'Wie kann ich viele Termine auf einmal in Google Kalender eintragen?', a: 'Über den Import einer CSV- oder ICS-Datei in Google Kalender am Computer. Jede Datei darf höchstens 1 MB groß sein. Das Werkzeug wandelt deine Liste ins richtige Format um und teilt große Dateien in Teile unter 1 MB.' },
      { q: 'Wird meine Datei hochgeladen?', a: 'Nein. Alles passiert in deinem Browser. Eine Sicherheitsregel verbietet der Seite Verbindungen zu fremden Servern, es gibt keinen Server, der Dateien annimmt, kein Tracking und keine Cookies. Nach dem ersten Laden funktioniert das Werkzeug auch offline.' },
      { q: 'Was ist besser: CSV oder ICS?', a: 'ICS behält Serientermine, Zeitzonen und Erinnerungen und eignet sich für Kalender-Exporte und Geburtstage. Google-CSV ist einfacher, wenn du die Liste in Excel weiterbearbeiten willst – Serien werden daraus aber Einzeltermine.' },
      { q: 'Kann das Werkzeug einen Kalender auf mehrere Personen aufteilen?', a: 'Ja. Es erkennt zum Beispiel Mitarbeiter-Kürzel im Titel und legt auf Wunsch pro Person einen eigenen Kalender an. Jede Person importiert dann ihre Datei in ihr eigenes Google-Konto.' }
    ] as Faq[]
  },
  en: {
    title: 'CSV to Calendar: Split & Import Files Over 1 MB',
    description: 'Get CSV, Excel and ICS files ready for Google Calendar: split files over 1 MB, filter, separate calendars. Runs in your browser – no upload.',
    h1: 'CSV to Calendar: split, filter & import files over 1 MB',
    lead: 'Prepare large or non-English event lists so Google Calendar accepts them: review, filter, split into several calendars, done. For CSV, Excel and ICS – including Google’s ZIP export.',
    featuresTitle: 'What the tool does',
    features: [
      ['Understand your calendar', 'Shows events, date range, size, recurring events and anything unusual for every calendar in the file – even at 10 MB and 30,000 events.'],
      ['Split', 'By person (e.g. staff initials), keyword, calendar or year – ideal when moving to Google Workspace.'],
      ['Get under 1 MB', 'Automatically splits into parts under 950 KB. Recurring events stay together with their exceptions.'],
      ['Any spreadsheet', 'Semicolons, Windows character sets, DD.MM.YYYY, Excel date values – all detected. If 03/04 is ambiguous, it asks.'],
      ['Privacy', 'Detects phone numbers, email addresses, names and birth dates and offers to leave them out or shorten them.'],
      ['Birthdays', 'Turns name + date into yearly all-day events – via ICS, because Google doesn’t create series from CSV.']
    ],
    faqTitle: 'Frequently asked questions',
    guidesTitle: 'Guides',
    faq: [
      { q: 'Can I import the events on my phone?', a: 'No. Google Calendar only lets you import on a computer, not on a phone or tablet. You can still prepare the file with this tool on your phone.' },
      { q: 'How can I bulk upload events to Google Calendar?', a: 'By importing a CSV or ICS file into Google Calendar on a computer. Each file can be at most 1 MB. The tool converts your list into the right format and splits large files into parts under 1 MB.' },
      { q: 'Is my file uploaded?', a: 'No. Everything happens in your browser. A security policy forbids the page to connect to other servers; there is no server that accepts files, no tracking and no cookies. After the first visit, the tool also works offline.' },
      { q: 'Which is better: CSV or ICS?', a: 'ICS keeps recurring events, time zones and reminders and suits calendar exports and birthdays. Google CSV is simpler if you want to keep editing the list in Excel – but recurring events become single events.' },
      { q: 'Can the tool split a calendar across several people?', a: 'Yes. It detects, for example, staff initials in event titles and can create one calendar per person. Each person then imports their file into their own Google account.' }
    ] as Faq[]
  }
};
