import type { Faq } from './guides';

export const HOME = {
  de: {
    title: 'ICS Editor: ICS-Datei online bearbeiten – ohne Upload',
    description: 'ICS-Dateien und Google-Kalender-Exporte im Browser öffnen, bearbeiten, aufteilen und für den Import vorbereiten. Kostenlos und ohne Upload.',
    h1: 'ICS Editor: ICS-Dateien und Google-Kalender-Exporte im Browser bearbeiten',
    lead: 'Öffne deine ICS-Datei oder den ZIP-Export von Google Kalender, sieh alle Kalender und Termine, bearbeite, filtere und teile sie auf – und lade Dateien unter 1 MB für den Import herunter. Auch CSV und Excel.',
    featuresTitle: 'Was der ICS Editor kann',
    features: [
      ['Alle Kalender sehen', 'Zeigt jeden Kalender der Datei mit Terminen, Zeitraum, Größe und Zeitzone – getestet mit einem echten Google-Export von 9,6 MB und rund 27.000 Terminen.'],
      ['Termine bearbeiten', 'Titel, Zeit, Ort und Beschreibung ändern, Termine löschen oder in einen anderen Kalender verschieben – in der Liste oder im Monat.'],
      ['Unterkalender erkennen', 'Findet Mitarbeiter-Kürzel, Terminarten und Kategorien und legt daraus mit einem Klick eigene Kalender an.'],
      ['Unter 1 MB bringen', 'Teilt automatisch in Teile unter 950 KB. Serien bleiben mit ihren Ausnahmen zusammen.'],
      ['Datenschutz', 'Telefonnummern und E-Mail-Adressen ausblenden, Verwaltungsdaten weglassen – die Datei verlässt dein Gerät nicht.'],
      ['CSV & Excel', 'Wandelt Tabellen – auch mit Semikolon, deutschen Datumsformaten oder als Geburtstagsliste – in ICS oder Google-CSV um.']
    ],
    howTitle: 'So arbeitest du mit dem ICS Editor',
    how: [
      ['editor', 'Datei öffnen: Links stehen die Kalender der Datei und erkannte Unterkalender, in der Mitte die Termine, rechts bearbeitest du den gewählten Termin.'],
      ['month', 'Monatsansicht: Serientermine werden an jedem Tag gezeigt, an dem sie stattfinden. Ein Klick öffnet den Termin.'],
      ['export', 'Exportieren: Das Werkzeug teilt in Dateien unter 1 MB und erinnert daran, zuerst einen neuen Kalender in Google anzulegen.']
    ],
    faqTitle: 'Häufige Fragen',
    guidesTitle: 'Ratgeber',
    faq: [
      { q: 'Kann ich die Termine auch am Handy importieren?', a: 'Nein. Google Kalender erlaubt den Import nur am Computer, nicht am Handy oder Tablet. Bearbeiten und vorbereiten kannst du die Datei mit dem ICS Editor aber auch am Handy.' },
      { q: 'Wie kann ich eine ICS-Datei bearbeiten?', a: 'Öffne die Datei im ICS Editor. Du siehst alle Termine als Liste oder Monat, kannst Titel, Zeit, Ort und Beschreibung ändern, Termine löschen oder verschieben und lädst danach eine neue ICS-Datei herunter. Alles passiert in deinem Browser.' },
      { q: 'Kann ich eine ICS-Datei ohne Outlook öffnen?', a: 'Ja. Der ICS Editor zeigt Kalender, Termine, Serien und Zeitzonen einer ICS-Datei direkt im Browser an – ohne Outlook, ohne Anmeldung und ohne Upload.' },
      { q: 'Wird meine Datei hochgeladen?', a: 'Nein. Alles passiert in deinem Browser. Eine Sicherheitsregel verbietet der Seite Verbindungen zu fremden Servern; es gibt keinen Server, der Dateien annimmt, kein Tracking und keine Cookies. Nach dem ersten Laden funktioniert der Editor auch offline.' },
      { q: 'Wie kann ich viele Termine auf einmal in Google Kalender eintragen?', a: 'Über den Import einer ICS- oder CSV-Datei in Google Kalender am Computer. Jede Datei darf höchstens 1 MB groß sein. Der ICS Editor bringt deine Datei ins richtige Format und teilt große Dateien in Teile unter 1 MB.' },
      { q: 'Kann der ICS Editor einen Kalender auf mehrere Personen aufteilen?', a: 'Ja. Er erkennt zum Beispiel Mitarbeiter-Kürzel im Titel und legt auf Wunsch pro Person einen eigenen Kalender an. Einzelne Termine kannst du zusätzlich von Hand verschieben.' }
    ] as Faq[]
  },
  en: {
    title: 'ICS Editor: Edit ICS Files Online – No Upload',
    description: 'Open, edit, split and convert ICS files and Google Calendar exports in your browser – and get files under 1 MB for import. Free, no upload.',
    h1: 'ICS Editor: edit ICS files and Google Calendar exports in your browser',
    lead: 'Open your ICS file or Google Calendar’s ZIP export, see every calendar and event, edit, filter and split them – and download files under 1 MB for import. CSV and Excel work too.',
    featuresTitle: 'What the ICS Editor does',
    features: [
      ['See every calendar', 'Shows each calendar in the file with its events, date range, size and time zone – tested with a real Google export of 9.6 MB and about 27,000 events.'],
      ['Edit events', 'Change title, time, location and description, delete events or move them to another calendar – in the list or month view.'],
      ['Detect sub-calendars', 'Finds staff initials, event types and categories and turns them into separate calendars in one click.'],
      ['Get under 1 MB', 'Automatically splits into parts under 950 KB. Recurring events stay together with their exceptions.'],
      ['Privacy', 'Hide phone numbers and email addresses, drop housekeeping data – the file never leaves your device.'],
      ['CSV & Excel', 'Converts spreadsheets – including semicolon files, European date formats and birthday lists – to ICS or Google CSV.']
    ],
    howTitle: 'How the ICS Editor works',
    how: [
      ['editor', 'Open a file: the calendars in the file and detected sub-calendars are on the left, events in the middle, and you edit the selected event on the right.'],
      ['month', 'Month view: recurring events appear on every day they occur. One click opens the event.'],
      ['export', 'Export: the tool splits into files under 1 MB and reminds you to create a new calendar in Google first.']
    ],
    faqTitle: 'Frequently asked questions',
    guidesTitle: 'Guides',
    faq: [
      { q: 'Can I import the events on my phone?', a: 'No. Google Calendar only lets you import on a computer, not on a phone or tablet. You can still edit and prepare the file with the ICS Editor on your phone.' },
      { q: 'How do I edit an ICS file?', a: 'Open the file in the ICS Editor. You see all events as a list or month, can change title, time, location and description, delete or move events, and then download a new ICS file. Everything happens in your browser.' },
      { q: 'Can I open an ICS file without Outlook?', a: 'Yes. The ICS Editor shows the calendars, events, recurring events and time zones of an ICS file right in your browser – no Outlook, no sign-in, no upload.' },
      { q: 'Is my file uploaded?', a: 'No. Everything happens in your browser. A security policy forbids the page to connect to other servers; there is no server that accepts files, no tracking and no cookies. After the first visit, the editor also works offline.' },
      { q: 'How can I bulk upload events to Google Calendar?', a: 'By importing an ICS or CSV file into Google Calendar on a computer. Each file can be at most 1 MB. The ICS Editor gets your file into the right format and splits large files into parts under 1 MB.' },
      { q: 'Can the ICS Editor split a calendar across several people?', a: 'Yes. It detects, for example, staff initials in event titles and can create one calendar per person. You can also move single events by hand.' }
    ] as Faq[]
  }
};
