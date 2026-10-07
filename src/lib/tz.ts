// VTIMEZONE-Blöcke für die Zeitzonen, die das Werkzeug beim Erzeugen anbietet.
// Regeln wie im Google-Kalender-Export (EU-Sommerzeit: letzter Sonntag im März bzw. Oktober).

const CET = ['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Luxembourg',
  'Europe/Paris', 'Europe/Rome', 'Europe/Madrid', 'Europe/Copenhagen', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Warsaw', 'Europe/Prague'];

export const EXPORT_TIMEZONES = [...CET, 'Europe/London', 'UTC'];

export function vtimezone(tz: string): string[] {
  if (tz === 'UTC') return ['BEGIN:VTIMEZONE', 'TZID:UTC', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0000', 'TZOFFSETTO:+0000', 'TZNAME:UTC', 'DTSTART:19700101T000000', 'END:STANDARD', 'END:VTIMEZONE'];
  const london = tz === 'Europe/London';
  const [std, dst, sName, dName, dHour, sHour] = london
    ? ['+0000', '+0100', 'GMT', 'BST', '010000', '020000']
    : ['+0100', '+0200', 'CET', 'CEST', '020000', '030000'];
  return [
    'BEGIN:VTIMEZONE', `TZID:${tz}`, `X-LIC-LOCATION:${tz}`,
    'BEGIN:DAYLIGHT', `TZOFFSETFROM:${std}`, `TZOFFSETTO:${dst}`, `TZNAME:${dName}`, `DTSTART:19700329T${dHour}`, 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', `TZOFFSETFROM:${dst}`, `TZOFFSETTO:${std}`, `TZNAME:${sName}`, `DTSTART:19701025T${sHour}`, 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'
  ];
}
