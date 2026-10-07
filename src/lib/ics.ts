// ICS lesen und schreiben (RFC 5545). Jeder Termin behält seine Original-Zeilen, damit beim
// Aufteilen nichts verloren geht (UID, Erinnerungen, Zeitzonen, Ausnahmen von Serien).

import { CRLF, foldLine, foldedLen, unescapeText, utf8Len } from './text';
import { DEFAULT_TZ, normalizeTz, utcToWall } from './datetime';

export interface IcsDate {
  raw: string;
  allDay: boolean;
  utc: boolean;
  tzid: string | null;
  /** Wandzeit in der Kalender-Zeitzone (ms, als UTC behandelt). */
  wall: number;
}

export interface IcsEvent {
  /** fortlaufende Nummer über alle Kalender */
  id: number;
  /** Index des Quell-Kalenders */
  cal: number;
  /** logische (entfaltete) Zeilen von BEGIN:VEVENT bis END:VEVENT */
  lines: string[];
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: IcsDate | null;
  end: IcsDate | null;
  /** Dauer in Minuten (aus DTEND oder DURATION), falls bestimmbar */
  minutes: number | null;
  rrule: string | null;
  recurrenceId: string | null;
  status: string;
  transp: string;
  cls: string;
  categories: string[];
  organizer: string;
  attendees: number;
  alarms: number;
  attachments: number;
  conference: boolean;
  /** Größe des Termins in der Ausgabedatei (gefaltet, mit CRLF) */
  bytes: number;
  /** Zeile in der Quelldatei (1-basiert), für Fehlermeldungen */
  sourceLine: number;
}

export interface IcsCalendar {
  index: number;
  name: string;
  fileName: string;
  timezone: string;
  /** Kopfzeilen des VCALENDAR (ohne BEGIN/END, ohne Komponenten) */
  header: string[];
  /** VTIMEZONE-Blöcke als logische Zeilen */
  timezones: string[][];
  events: IcsEvent[];
  /** Anzahl anderer Komponenten (VTODO, VJOURNAL …), die Google nicht als Termine importiert */
  otherComponents: Record<string, number>;
  /** Byte-Größe der Quelldatei, soweit bekannt */
  sourceBytes: number;
  warnings: string[];
}

/** Zerlegt "NAME;PARAM=x:VALUE" (Doppelpunkte in Anführungszeichen beachten). */
export function splitProp(line: string): { name: string; params: string; value: string } {
  let i = 0;
  let inQ = false;
  let nameEnd = -1;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && c === ';' && nameEnd < 0) nameEnd = i;
    else if (!inQ && c === ':') break;
  }
  const head = line.slice(0, i);
  const name = (nameEnd < 0 ? head : head.slice(0, nameEnd)).toUpperCase();
  const params = nameEnd < 0 ? '' : head.slice(nameEnd + 1);
  return { name, params, value: line.slice(i + 1) };
}

export function getParam(params: string, key: string): string | null {
  const re = new RegExp('(?:^|;)' + key + '=("[^"]*"|[^;]*)', 'i');
  const m = re.exec(params);
  return m ? m[1].replace(/^"|"$/g, '') : null;
}

export function parseIcsDate(params: string, value: string, calTz: string): IcsDate | null {
  const v = value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const valueDate = /VALUE=DATE(?!-)/i.test(params);
  if (!m[4] || valueDate) {
    return { raw: v, allDay: true, utc: false, tzid: null, wall: Date.UTC(y, mo - 1, d) };
  }
  const h = +m[4], mi = +m[5], s = m[6] ? +m[6] : 0;
  if (h > 24 || mi > 59 || s > 60) return null;
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  if (m[7]) return { raw: v, allDay: false, utc: true, tzid: null, wall: utcToWall(naive, calTz) };
  const tzRaw = getParam(params, 'TZID');
  // Wandzeit in fremder Zone → in Kalender-Zone umrechnen (selten; meist identisch)
  let wall = naive;
  const tz = normalizeTz(tzRaw);
  if (tz && tz !== calTz) {
    // naive ist Wandzeit in tz → UTC → Wandzeit in calTz
    const off1 = utcToWall(naive, tz) - naive;
    const utc = naive - off1;
    wall = utcToWall(utc, calTz);
  }
  return { raw: v, allDay: false, utc: false, tzid: tzRaw, wall };
}

/** ISO-8601-Dauer (P1DT2H30M) → Minuten */
export function parseDuration(v: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const mins = (+(m[2] || 0)) * 10080 + (+(m[3] || 0)) * 1440 + (+(m[4] || 0)) * 60 + (+(m[5] || 0)) + Math.round(+(m[6] || 0) / 60);
  return m[1] === '-' ? -mins : mins;
}

export function eventBytes(lines: string[]): number {
  let n = 0;
  for (const l of lines) n += foldedLen(l);
  return n;
}

/** Baut ein IcsEvent aus logischen Zeilen. */
export function eventFromLines(lines: string[], id: number, cal: number, calTz: string, sourceLine = 0): IcsEvent {
  const ev: IcsEvent = {
    id, cal, lines, uid: '', summary: '', description: '', location: '', start: null, end: null, minutes: null,
    rrule: null, recurrenceId: null, status: '', transp: '', cls: '', categories: [], organizer: '',
    attendees: 0, alarms: 0, attachments: 0, conference: false, bytes: 0, sourceLine
  };
  let depth = 0;
  let durMin: number | null = null;
  for (let i = 1; i < lines.length - 1; i++) {
    const l = lines[i];
    if (l.startsWith('BEGIN:')) { depth++; if (/^BEGIN:VALARM/i.test(l)) ev.alarms++; continue; }
    if (l.startsWith('END:')) { depth--; continue; }
    if (depth > 0) continue;
    const { name, params, value } = splitProp(l);
    switch (name) {
      case 'UID': ev.uid = value; break;
      case 'SUMMARY': ev.summary = unescapeText(value); break;
      case 'DESCRIPTION': ev.description = unescapeText(value); break;
      case 'LOCATION': ev.location = unescapeText(value); break;
      case 'DTSTART': ev.start = parseIcsDate(params, value, calTz); break;
      case 'DTEND': ev.end = parseIcsDate(params, value, calTz); break;
      case 'DURATION': durMin = parseDuration(value); break;
      case 'RRULE': ev.rrule = value; break;
      case 'RECURRENCE-ID': ev.recurrenceId = value; break;
      case 'STATUS': ev.status = value.toUpperCase(); break;
      case 'TRANSP': ev.transp = value.toUpperCase(); break;
      case 'CLASS': ev.cls = value.toUpperCase(); break;
      case 'CATEGORIES': ev.categories.push(...value.split(/(?<!\\),/).map((c) => unescapeText(c).trim()).filter(Boolean)); break;
      case 'ORGANIZER': ev.organizer = value.replace(/^mailto:/i, ''); break;
      case 'ATTENDEE': ev.attendees++; break;
      case 'ATTACH': ev.attachments++; break;
      default:
        if (name === 'X-GOOGLE-CONFERENCE' || name === 'CONFERENCE') ev.conference = true;
    }
  }
  if (ev.start && ev.end) ev.minutes = Math.round((ev.end.wall - ev.start.wall) / 60000);
  else if (durMin !== null) ev.minutes = durMin;
  ev.bytes = eventBytes(lines);
  return ev;
}

/** Entfaltet und zerlegt eine ICS-Datei. Mehrere VCALENDAR-Blöcke ergeben mehrere Kalender. */
export function parseIcs(text: string, fileName = 'kalender.ics', firstIndex = 0, firstEventId = 0): IcsCalendar[] {
  const sourceBytes = utf8Len(text);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Entfalten: CRLF/LF gefolgt von Leerzeichen oder Tab
  const physical = text.split(/\r\n|\n|\r/);
  const logical: string[] = [];
  const lineNo: number[] = [];
  for (let i = 0; i < physical.length; i++) {
    const l = physical[i];
    if ((l.startsWith(' ') || l.startsWith('\t')) && logical.length) logical[logical.length - 1] += l.slice(1);
    else if (l.length) { logical.push(l); lineNo.push(i + 1); }
  }

  const cals: IcsCalendar[] = [];
  let cal: IcsCalendar | null = null;
  let eventId = firstEventId;
  let i = 0;
  while (i < logical.length) {
    const l = logical[i];
    const upper = l.length < 20 ? l.toUpperCase() : l.slice(0, 20).toUpperCase();
    if (upper.startsWith('BEGIN:VCALENDAR')) {
      cal = {
        index: firstIndex + cals.length, name: '', fileName, timezone: DEFAULT_TZ, header: [], timezones: [], events: [],
        otherComponents: {}, sourceBytes: 0, warnings: []
      };
      cals.push(cal);
      i++;
      continue;
    }
    if (upper.startsWith('END:VCALENDAR')) { cal = null; i++; continue; }
    if (!cal) { i++; continue; }
    if (upper.startsWith('BEGIN:')) {
      const comp = l.slice(6).trim().toUpperCase();
      const block: string[] = ['BEGIN:' + comp];
      const startLine = lineNo[i];
      let depth = 1;
      i++;
      while (i < logical.length && depth > 0) {
        const x = logical[i];
        const xu = x.slice(0, 12).toUpperCase();
        if (xu.startsWith('BEGIN:')) depth++;
        else if (xu.startsWith('END:')) depth--;
        block.push(depth === 0 ? 'END:' + comp : x);
        i++;
      }
      if (depth > 0) { cal.warnings.push('unclosed:' + comp); block.push('END:' + comp); }
      if (comp === 'VEVENT') cal.events.push(eventFromLines(block, eventId++, cal.index, cal.timezone, startLine));
      else if (comp === 'VTIMEZONE') cal.timezones.push(block);
      else cal.otherComponents[comp] = (cal.otherComponents[comp] || 0) + 1;
      continue;
    }
    // Kopfzeile
    const { name, value } = splitProp(l);
    if (name === 'X-WR-CALNAME') cal.name = unescapeText(value);
    if (name === 'X-WR-TIMEZONE') {
      const tz = normalizeTz(value);
      if (tz && cal.events.length === 0) cal.timezone = tz;
    }
    cal.header.push(l);
    i++;
  }
  for (const c of cals) c.sourceBytes = cals.length === 1 ? sourceBytes : 0;
  return cals;
}

/** Kopf einer Ausgabedatei. Der Kalendername wird gesetzt bzw. ersetzt. */
export function headerLines(cal: Pick<IcsCalendar, 'header' | 'timezone'>, name: string | null): string[] {
  const out: string[] = ['BEGIN:VCALENDAR'];
  const has = (n: string) => cal.header.some((l) => splitProp(l).name === n);
  if (!has('VERSION')) out.push('VERSION:2.0');
  if (!has('PRODID')) out.push('PRODID:-//ICS Editor//freimoser.github.io//DE');
  for (const l of cal.header) {
    const n = splitProp(l).name;
    if (n === 'X-WR-CALNAME' && name !== null) continue;
    out.push(l);
  }
  if (name !== null) out.push('X-WR-CALNAME:' + name.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, ' '));
  if (!has('X-WR-TIMEZONE') && cal.timezone) out.push('X-WR-TIMEZONE:' + cal.timezone);
  return out;
}

export function linesBytes(lines: string[]): number {
  let n = 0;
  for (const l of lines) n += foldedLen(l);
  return n;
}

/** Schreibt eine vollständige ICS-Datei. */
export function writeIcs(head: string[], timezones: string[][], events: string[][]): string {
  const parts: string[] = [];
  for (const l of head) parts.push(foldLine(l));
  for (const tz of timezones) for (const l of tz) parts.push(foldLine(l));
  for (const ev of events) for (const l of ev) parts.push(foldLine(l));
  parts.push('END:VCALENDAR');
  return parts.join(CRLF) + CRLF;
}

export const FOOTER_BYTES = 'END:VCALENDAR'.length + 2;

/** Liefert die TZIDs, die in den Terminen verwendet werden. */
export function usedTzids(events: string[][]): Set<string> {
  const s = new Set<string>();
  for (const ev of events) for (const l of ev) {
    const idx = l.indexOf('TZID=');
    if (idx > 0 && idx < l.indexOf(':')) {
      const m = /TZID=("[^"]*"|[^;:]*)/.exec(l);
      if (m) s.add(m[1].replace(/^"|"$/g, ''));
    }
  }
  return s;
}

export function timezoneId(block: string[]): string {
  for (const l of block) { const p = splitProp(l); if (p.name === 'TZID') return p.value; }
  return '';
}
