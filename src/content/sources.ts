// Belegte Quellen. Stand jeweils 7.10.2026 – nur diese Fakten werden auf der Website behauptet.
export const STAND = { de: '7. Oktober 2026', en: '7 October 2026', iso: '2026-10-07' };

export const SRC = {
  import: { url: 'https://support.google.com/calendar/answer/37118', de: 'Google Kalender-Hilfe: Termine in Google Kalender importieren', en: 'Google Calendar Help: Import events to Google Calendar' },
  problems: { url: 'https://support.google.com/calendar/answer/45654', de: 'Google Kalender-Hilfe: Probleme beim Importieren beheben', en: 'Google Calendar Help: Fix problems importing' },
  limits: { url: 'https://knowledge.workspace.google.com/admin/calendar/avoid-calendar-use-limits', de: 'Google Workspace-Hilfe: Nutzungslimits von Google Kalender vermeiden', en: 'Google Workspace Help: Avoid Calendar use limits' },
  create: { url: 'https://support.google.com/calendar/answer/37095', de: 'Google Kalender-Hilfe: Neuen Kalender erstellen', en: 'Google Calendar Help: Create a new calendar' },
  delete: { url: 'https://support.google.com/calendar/answer/37188', de: 'Google Kalender-Hilfe: Kalender löschen oder abbestellen', en: 'Google Calendar Help: Delete or unsubscribe from a calendar' },
  rfc5545: { url: 'https://www.rfc-editor.org/rfc/rfc5545', de: 'RFC 5545: iCalendar-Format', en: 'RFC 5545: Internet Calendaring and Scheduling (iCalendar)' }
} as const;

export type SourceKey = keyof typeof SRC;
