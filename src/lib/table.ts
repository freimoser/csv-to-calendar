// Tabellen (CSV, TXT, Excel) lesen, Spalten erkennen, Datums- und Zeitformate erkennen
// und Zeilen in Termine umwandeln. Mehrdeutige Daten (03/04) werden nicht geraten.

import Papa from 'papaparse';
import { escapeText } from './text';
import { eventFromLines, type IcsCalendar, type IcsEvent } from './ics';
import { DAY, DEFAULT_TZ, icsStamp, wallParts } from './datetime';
import { vtimezone } from './tz';

export type Role =
  | 'subject' | 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'start' | 'end' | 'duration'
  | 'allDay' | 'description' | 'location' | 'private' | 'name' | 'birthday' | 'extra' | 'skip';

export type DateOrder = 'dmy' | 'mdy' | 'ymd';

export interface Column {
  index: number;
  header: string;
  role: Role;
  /** erkanntes Datumsformat (für Datums-Spalten) */
  order: DateOrder | null;
  /** Format ist mehrdeutig, Nutzer muss entscheiden */
  ambiguous: boolean;
  samples: string[];
  pii: PiiKind | null;
}

export type PiiKind = 'name' | 'phone' | 'email' | 'address' | 'birthdate';

export interface Table {
  fileName: string;
  encoding: string;
  delimiter: string;
  headers: string[];
  rows: string[][];
  /** Zeilennummer in der Datei (1-basiert) je Datenzeile */
  lineNumbers: number[];
  columns: Column[];
  date1904?: boolean;
  /** aus Excel: Zellen, die Datumszahlen sind */
  numericDates?: boolean;
}

// ---------------------------------------------------------------- Einlesen

export function parseCsvText(text: string, fileName: string, encoding: string): Table {
  const res = Papa.parse<string[]>(text, { delimiter: '', skipEmptyLines: 'greedy' });
  const data = res.data.map((r) => r.map((c) => (c ?? '').toString()));
  const delimiter = res.meta.delimiter || ',';
  return fromRows(data, fileName, encoding, delimiter);
}

export function fromRows(data: (string | number | boolean | null)[][], fileName: string, encoding: string, delimiter: string, opts: { date1904?: boolean; numericDates?: boolean } = {}): Table {
  const rows = data.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))));
  // Kopfzeile: erste Zeile mit mindestens 2 nicht-leeren Zellen, die nicht wie Daten aussehen
  let h = 0;
  while (h < rows.length - 1 && rows[h].filter((c) => c.trim()).length < 2) h++;
  const headers = (rows[h] ?? []).map((c, i) => c.trim() || `Spalte ${i + 1}`);
  const body: string[][] = [];
  const lineNumbers: number[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    if (rows[i].every((c) => !c.trim())) continue;
    body.push(rows[i]);
    lineNumbers.push(i + 1);
  }
  const t: Table = { fileName, encoding, delimiter, headers, rows: body, lineNumbers, columns: [], ...opts };
  t.columns = detectColumns(t);
  return t;
}

// ---------------------------------------------------------------- Spalten erkennen

const norm = (s: string) => s.toLowerCase().replace(/[_\-.:]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

const SYN: [Role, string[]][] = [
  ['subject', ['subject', 'titel', 'title', 'betreff', 'termin', 'bezeichnung', 'ereignis', 'event', 'anlass', 'summary', 'terminart', 'behandlung', 'art', 'veranstaltung', 'thema', 'was']],
  ['startDate', ['start date', 'startdatum', 'datum', 'date', 'beginn datum', 'von datum', 'tag', 'datum von', 'start datum', 'termindatum']],
  ['startTime', ['start time', 'startzeit', 'uhrzeit', 'zeit', 'beginn', 'von', 'time', 'anfang', 'uhrzeit von', 'start uhrzeit', 'beginnzeit']],
  ['endDate', ['end date', 'enddatum', 'bis datum', 'ende datum', 'datum bis', 'end datum']],
  ['endTime', ['end time', 'endzeit', 'ende', 'bis', 'uhrzeit bis', 'end uhrzeit', 'endet']],
  ['start', ['start', 'startzeitpunkt', 'beginnt', 'dtstart', 'start datetime']],
  ['end', ['end', 'endzeitpunkt', 'dtend', 'end datetime']],
  ['duration', ['dauer', 'duration', 'minuten', 'laenge', 'dauer min', 'dauer minuten']],
  ['allDay', ['all day event', 'ganztaegig', 'all day', 'ganztags', 'ganzer tag']],
  ['description', ['description', 'beschreibung', 'notiz', 'notizen', 'bemerkung', 'bemerkungen', 'info', 'kommentar', 'details', 'hinweis', 'text', 'note', 'notes']],
  ['location', ['location', 'ort', 'raum', 'place', 'standort', 'veranstaltungsort', 'treffpunkt']],
  ['private', ['private', 'privat']],
  ['birthday', ['geburtstag', 'geburtsdatum', 'geb', 'birthday', 'date of birth', 'dob', 'geboren', 'geb datum']],
  ['name', ['name', 'vorname', 'nachname', 'person', 'mitglied', 'kunde', 'patient', 'besitzer', 'halter', 'full name', 'first name', 'last name', 'patientenname', 'kundenname']]
];

const PII_HEAD: [PiiKind, RegExp][] = [
  ['phone', /(telefon|tel\b|handy|mobil|phone|fon\b|rufnummer)/],
  ['email', /(e ?mail|mail\b)/],
  ['address', /(strasse|str\b|adresse|address|plz|postleitzahl|wohnort|hausnummer)/],
  ['birthdate', /(geburt|geb\b|birth|dob\b)/],
  ['name', /(name|patient|kunde|besitzer|halter|mitglied|person|vorname|nachname|client|owner)/]
];

function headerRole(h: string): Role | null {
  const n = norm(h);
  for (const [role, list] of SYN) if (list.includes(n)) return role;
  for (const [role, list] of SYN) if (list.some((x) => x.length > 3 && n.includes(x))) return role;
  return null;
}

const PHONE_VAL = /^(?:\+\d{2}|0)[\d \/()\-]{5,}\d$/;
const EMAIL_VAL = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/;
const STREET_VAL = /(str\.|straße|strasse|weg|platz|allee|gasse)\s*\d/i;

function detectPii(header: string, samples: string[]): PiiKind | null {
  const n = norm(header);
  const vals = samples.filter(Boolean);
  if (vals.length) {
    const share = (re: RegExp) => vals.filter((v) => re.test(v.trim())).length / vals.length;
    if (share(EMAIL_VAL) > 0.6) return 'email';
    if (share(PHONE_VAL) > 0.6 && !/datum|date|zeit|time/.test(n)) return 'phone';
    if (share(STREET_VAL) > 0.4) return 'address';
  }
  for (const [kind, re] of PII_HEAD) if (re.test(n)) return kind;
  return null;
}

export function detectColumns(t: Table): Column[] {
  const used = new Set<Role>();
  const cols: Column[] = t.headers.map((header, index) => {
    const values = t.rows.map((r) => (r[index] ?? '').trim()).filter(Boolean);
    const samples = values.slice(0, 50);
    let role = headerRole(header);
    // Werte prüfen, wenn der Name nichts sagt
    const dateInfo = analyzeDates(values.slice(0, 500), !!t.numericDates);
    const timeShare = values.length ? values.slice(0, 200).filter((v) => parseTime(v) !== null).length / Math.min(values.length, 200) : 0;
    if (!role && dateInfo.share > 0.8) role = dateInfo.hasTime ? 'start' : 'startDate';
    if (!role && timeShare > 0.8) role = 'startTime';
    return {
      index, header, role: role ?? 'extra', order: dateInfo.order, ambiguous: dateInfo.ambiguous,
      samples: samples.slice(0, 5), pii: detectPii(header, samples)
    };
  });
  // Doppelte Rollen auflösen: zweite Datums-Spalte = Ende, zweite Zeit-Spalte = Endzeit usw.
  for (const c of cols) {
    if (c.role === 'extra' || c.role === 'skip') continue;
    if (used.has(c.role)) {
      if (c.role === 'startDate') c.role = used.has('endDate') ? 'extra' : 'endDate';
      else if (c.role === 'startTime') c.role = used.has('endTime') ? 'extra' : 'endTime';
      else if (c.role === 'start') c.role = used.has('end') ? 'extra' : 'end';
      else if (c.role === 'subject' || c.role === 'name') c.role = 'extra';
      else c.role = 'extra';
    }
    used.add(c.role);
  }
  // Kein Titel, aber ein Name → Name als Titel
  if (!used.has('subject')) {
    const nameCol = cols.find((c) => c.role === 'name');
    if (nameCol && !used.has('birthday')) nameCol.role = 'subject';
  }
  // Nur ein Geburtstag und kein Start-Datum → Geburtstagsliste
  if (!used.has('startDate') && !used.has('start') && !used.has('birthday')) {
    const bd = cols.find((c) => c.pii === 'birthdate' && c.order);
    if (bd) bd.role = 'birthday';
  }
  return cols;
}

// ---------------------------------------------------------------- Datum und Zeit

export interface ParsedDate { y: number; mo: number; d: number; h: number | null; mi: number | null }

const DATE_RE = /^(\d{1,4})([./\-])(\d{1,2})\2(\d{1,4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?(?:\s*Uhr)?)?$/;

export function excelSerialToDate(n: number, date1904 = false): ParsedDate | null {
  if (!isFinite(n) || n <= 0 || n > 2958465) return null;
  let days = Math.floor(n);
  const frac = n - days;
  // Excel zählt den 29.02.1900, den es nie gab – ab Seriennummer 61 einen Tag abziehen.
  if (!date1904 && days >= 61) days -= 1;
  else if (!date1904 && days === 60) days = 59; // 29.02.1900 → 28.02.1900
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
  const dt = new Date(base + days * DAY);
  const mins = Math.round(frac * 1440);
  return {
    y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(),
    h: frac > 0 ? Math.floor(mins / 60) % 24 : null, mi: frac > 0 ? mins % 60 : null
  };
}

function validYmd(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1) return false;
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= dim && y >= 1800 && y <= 2200;
}

function fixYear(y: number, raw: string): number {
  if (raw.length <= 2) return y >= 50 ? 1900 + y : 2000 + y;
  return y;
}

/** Datum mit bekannter Reihenfolge lesen. Liefert null, wenn ungültig (z. B. 31.02.). */
export function parseDate(v: string, order: DateOrder | null, numeric = false, date1904 = false): ParsedDate | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s) && (numeric || (+s > 20000 && +s < 80000 && !s.includes('.')))) return excelSerialToDate(+s, date1904);
  const m = DATE_RE.exec(s);
  if (!m) {
    // 2024-03-01T09:30:00(Z)
    const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s);
    if (iso) return { y: +iso[1], mo: +iso[2], d: +iso[3], h: +iso[4], mi: +iso[5] };
    return null;
  }
  const [a, sep, b, c] = [m[1], m[2], m[3], m[4]];
  let y: number, mo: number, d: number;
  if (a.length === 4) { y = +a; mo = +b; d = +c; }
  else if (sep === '.' || order === 'dmy') { d = +a; mo = +b; y = fixYear(+c, c); }
  else if (order === 'mdy') { mo = +a; d = +b; y = fixYear(+c, c); }
  else return null;
  if (!validYmd(y, mo, d)) return null;
  let h: number | null = null, mi: number | null = null;
  if (m[5] !== undefined) {
    h = +m[5]; mi = +m[6];
    const ap = m[8]?.toLowerCase().replace(/\./g, '');
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h > 23 || mi > 59) return null;
  }
  return { y, mo, d, h, mi };
}

export interface DateAnalysis { share: number; order: DateOrder | null; ambiguous: boolean; hasTime: boolean }

/** Erkennt das Datumsformat einer Spalte. Mehrdeutig, wenn alle Werte beide Lesarten zulassen. */
export function analyzeDates(values: string[], numeric = false): DateAnalysis {
  const vals = values.filter(Boolean);
  if (!vals.length) return { share: 0, order: null, ambiguous: false, hasTime: false };
  let ok = 0, slashLike = 0, dmyOnly = 0, mdyOnly = 0, ymd = 0, dot = 0, time = 0, serial = 0;
  for (const v of vals) {
    const s = v.trim();
    if (/^\d+(\.\d+)?$/.test(s) && (numeric || (+s > 20000 && +s < 80000 && !s.includes('.')))) { ok++; serial++; if (s.includes('.')) time++; continue; }
    const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.test(s);
    if (iso) { ok++; ymd++; time++; continue; }
    const m = DATE_RE.exec(s);
    if (!m) continue;
    if (m[5] !== undefined) time++;
    if (m[1].length === 4) { if (validYmd(+m[1], +m[3], +m[4])) { ok++; ymd++; } continue; }
    if (m[2] === '.') { ok++; dot++; continue; }
    const a = +m[1], b = +m[3];
    const y = fixYear(+m[4], m[4]);
    const dmyValid = validYmd(y, b, a), mdyValid = validYmd(y, a, b);
    if (dmyValid || mdyValid) { ok++; slashLike++; }
    if (dmyValid && !mdyValid) dmyOnly++;
    if (mdyValid && !dmyValid) mdyOnly++;
  }
  const share = ok / vals.length;
  let order: DateOrder | null = null;
  let ambiguous = false;
  if (dot >= slashLike && dot >= ymd && dot > 0) order = 'dmy';
  else if (ymd > slashLike) order = 'ymd';
  else if (slashLike > 0) {
    if (dmyOnly > 0 && mdyOnly === 0) order = 'dmy';
    else if (mdyOnly > 0 && dmyOnly === 0) order = 'mdy';
    else if (dmyOnly === 0 && mdyOnly === 0) ambiguous = true;
    else order = dmyOnly >= mdyOnly ? 'dmy' : 'mdy';
  } else if (serial > 0) order = 'ymd';
  return { share, order, ambiguous, hasTime: time / vals.length > 0.5 };
}

/** "9:30", "09:30:00", "9.30", "9:30 PM", "14 Uhr", Excel-Bruchteil 0.395833 */
export function parseTime(v: string): { h: number; mi: number } | null {
  const s = v.trim();
  if (!s) return null;
  if (/^0?\.\d+$/.test(s) || /^0,\d+$/.test(s)) {
    const mins = Math.round(parseFloat(s.replace(',', '.')) * 1440);
    return { h: Math.floor(mins / 60) % 24, mi: mins % 60 };
  }
  const m = /^(\d{1,2})(?:[:.](\d{2}))?(?::(\d{2}))?\s*(?:([AaPp])\.?\s?[Mm]\.?)?\s*(?:Uhr|h)?$/.exec(s);
  if (!m) return null;
  if (m[2] === undefined && !m[4] && !/uhr|h$/i.test(s)) return null;
  let h = +m[1];
  const mi = m[2] ? +m[2] : 0;
  const ap = m[4]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 24 || mi > 59) return null;
  if (h === 24) h = 0;
  return { h, mi };
}

function parseBool(v: string): boolean | null {
  const s = norm(v);
  if (['true', 'ja', 'yes', 'wahr', 'x', '1', 'j', 'y'].includes(s)) return true;
  if (['false', 'nein', 'no', 'falsch', '0', 'n', ''].includes(s)) return false;
  return null;
}

// ---------------------------------------------------------------- Zeilen → Termine

export type IssueCode = 'noDate' | 'badDate' | 'badTime' | 'endBeforeStart' | 'noSubject' | 'badEndDate';

export interface RowIssue {
  row: number;
  line: number;
  code: IssueCode;
  value: string;
  /** Was ein Klick auf "Übernehmen" tut */
  fix: 'drop' | 'defaultDuration' | 'allDay' | 'subject' | 'lastDayOfMonth' | 'noEnd';
  fixValue?: string;
}

export type ShortenMode = 'keep' | 'short' | 'remove';

export interface ConvertOptions {
  tz: string;
  defaultMinutes: number;
  /** Datumsformat je Spalte, falls vom Nutzer gewählt */
  orders: Record<number, DateOrder>;
  /** Umgang mit erkannten persönlichen Daten je Spalte */
  pii: Record<number, ShortenMode>;
  /** angewendete Korrekturen je Datenzeile */
  fixes: Record<number, 'fix' | 'drop'>;
  birthdays: boolean;
  birthdayYearInTitle: boolean;
  birthdayPrefix: string;
  /** z. B. "geb. " oder "born " */
  birthdayYearLabel: string;
  defaultSubject: string;
  thisYear: number;
}

export function shorten(kind: PiiKind | null, v: string): string {
  const s = v.trim();
  if (!s) return s;
  switch (kind) {
    case 'name': return s.split(/[\s,]+/).filter(Boolean).map((p) => p[0].toUpperCase() + '.').join(' ');
    case 'phone': { const d = s.replace(/\D/g, ''); return d.length > 4 ? s.slice(0, 4) + ' … ' + d.slice(-2) : '…'; }
    case 'email': { const at = s.indexOf('@'); return at > 0 ? s[0] + '…' + s.slice(at) : '…'; }
    case 'address': { const m = /\b\d{5}\b\s*(\S+)?/.exec(s); return m ? m[0] : '…'; }
    case 'birthdate': { const m = /(\d{4})/.exec(s); return m ? m[1] : '…'; }
    default: return s;
  }
}

function cellValue(t: Table, col: Column, row: string[], o: ConvertOptions): string {
  const v = (row[col.index] ?? '').trim();
  const mode = col.pii ? o.pii[col.index] ?? 'keep' : 'keep';
  if (mode === 'remove') return '';
  if (mode === 'short') return shorten(col.pii, v);
  return v;
}

export interface ConvertResult {
  calendar: IcsCalendar;
  issues: RowIssue[];
  /** Datenzeile je Termin-ID */
  rowOf: number[];
  dropped: number;
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function hashName(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Wandelt eine Tabelle in einen Kalender mit Terminen um. */
export function tableToCalendar(t: Table, o: ConvertOptions): ConvertResult {
  const by = (r: Role) => t.columns.find((c) => c.role === r) ?? null;
  const cSubject = by('subject'), cName = by('name'), cSD = by('startDate'), cST = by('startTime'), cED = by('endDate'),
    cET = by('endTime'), cS = by('start'), cE = by('end'), cDur = by('duration'), cAll = by('allDay'),
    cDesc = by('description'), cLoc = by('location'), cPriv = by('private'), cBd = by('birthday');
  const extras = t.columns.filter((c) => c.role === 'extra' || (c.role === 'name' && cSubject));
  const issues: RowIssue[] = [];
  const events: IcsEvent[] = [];
  const rowOf: number[] = [];
  const dtstamp = stamp();
  const fileKey = hashName(t.fileName);
  const tz = o.tz || DEFAULT_TZ;
  let dropped = 0;
  const orderOf = (c: Column | null) => (c ? o.orders[c.index] ?? c.order : null);
  const numeric = !!t.numericDates;

  t.rows.forEach((row, ri) => {
    const line = t.lineNumbers[ri];
    const fix = o.fixes[ri];
    if (fix === 'drop') { dropped++; return; }
    const get = (c: Column | null) => (c ? cellValue(t, c, row, o) : '');
    const raw = (c: Column | null) => (c ? (row[c.index] ?? '').trim() : '');

    let summary = get(cSubject) || (cSubject ? '' : get(cName));
    let allDay = false;
    let startDate: ParsedDate | null = null;
    let endDate: ParsedDate | null = null;
    let st: { h: number; mi: number } | null = null;
    let et: { h: number; mi: number } | null = null;
    const lines: string[] = ['BEGIN:VEVENT'];

    if (o.birthdays && cBd) {
      const b = parseDate(raw(cBd), orderOf(cBd), numeric, t.date1904);
      if (!b) { issues.push({ row: ri, line, code: raw(cBd) ? 'badDate' : 'noDate', value: raw(cBd), fix: 'drop' }); return; }
      const nm = get(cName) || get(cSubject) || o.defaultSubject;
      const febLast = b.mo === 2 && b.d === 29;
      const year = o.thisYear;
      const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
      const d = febLast && !leap ? 28 : b.d;
      const s = Date.UTC(year, b.mo - 1, d);
      const title = `${o.birthdayPrefix}${nm}${o.birthdayYearInTitle && b.y > 1800 ? ` (${o.birthdayYearLabel}${b.y})` : ''}`;
      lines.push(`UID:bd-${fileKey}-${ri}@freimoser.github.io`, `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${icsStamp(s, false)}`, `DTEND;VALUE=DATE:${icsStamp(s + DAY, false)}`,
        febLast ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
        `SUMMARY:${escapeText(title)}`, 'TRANSP:TRANSPARENT');
      const desc = extrasText(extras, row, t, o);
      if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
      lines.push('END:VEVENT');
      const ev = eventFromLines(lines, events.length, 0, tz, line);
      events.push(ev);
      rowOf.push(ri);
      return;
    }

    // Beginn
    if (cS) {
      const p = parseDate(raw(cS), orderOf(cS), numeric, t.date1904);
      if (!p) { issues.push({ row: ri, line, code: raw(cS) ? 'badDate' : 'noDate', value: raw(cS), fix: 'drop' }); return; }
      startDate = p;
      if (p.h !== null) st = { h: p.h, mi: p.mi! };
    } else if (cSD) {
      const v = raw(cSD);
      const p = parseDate(v, orderOf(cSD), numeric, t.date1904);
      if (!p) {
        const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(v);
        if (fix === 'fix' && m) {
          const y = fixYear(+m[3], m[3]);
          const last = new Date(Date.UTC(y, +m[2], 0)).getUTCDate();
          startDate = { y, mo: +m[2], d: Math.min(+m[1], last), h: null, mi: null };
        } else {
          issues.push({ row: ri, line, code: v ? 'badDate' : 'noDate', value: v, fix: m ? 'lastDayOfMonth' : 'drop' });
          if (!(fix === 'fix' && m)) return;
        }
      } else startDate = p;
      if (startDate && startDate.h !== null) st = { h: startDate.h, mi: startDate.mi! };
    } else {
      issues.push({ row: ri, line, code: 'noDate', value: '', fix: 'drop' });
      return;
    }
    if (cST && raw(cST)) {
      const tt = parseTime(raw(cST));
      if (!tt) {
        issues.push({ row: ri, line, code: 'badTime', value: raw(cST), fix: 'allDay' });
        if (fix !== 'fix') { /* ganztägig übernehmen, bis der Nutzer entscheidet */ }
      } else st = tt;
    }
    if (cAll) {
      const b = parseBool(raw(cAll));
      if (b) allDay = true;
    }
    if (!st) allDay = true;

    // Ende
    if (cE && raw(cE)) {
      const p = parseDate(raw(cE), orderOf(cE), numeric, t.date1904);
      if (p) { endDate = p; if (p.h !== null) et = { h: p.h, mi: p.mi! }; }
    }
    if (cED && raw(cED)) {
      const p = parseDate(raw(cED), orderOf(cED), numeric, t.date1904);
      if (p) endDate = p;
      else issues.push({ row: ri, line, code: 'badEndDate', value: raw(cED), fix: 'noEnd' });
    }
    if (cET && raw(cET)) {
      const tt = parseTime(raw(cET));
      if (tt) et = tt; else issues.push({ row: ri, line, code: 'badTime', value: raw(cET), fix: 'noEnd' });
    }

    const sd = startDate!;
    let startWall = Date.UTC(sd.y, sd.mo - 1, sd.d, allDay ? 0 : st!.h, allDay ? 0 : st!.mi);
    let endWall: number;
    if (allDay) {
      const ed = endDate ?? sd;
      endWall = Date.UTC(ed.y, ed.mo - 1, ed.d) + DAY; // exklusives Ende
      if (endWall <= startWall) endWall = startWall + DAY;
    } else {
      const dur = cDur ? parseFloat(raw(cDur).replace(',', '.')) : NaN;
      if (et) {
        const ed = endDate ?? sd;
        endWall = Date.UTC(ed.y, ed.mo - 1, ed.d, et.h, et.mi);
      } else if (isFinite(dur) && dur > 0) endWall = startWall + Math.round(dur) * 60000;
      else endWall = startWall + o.defaultMinutes * 60000;
      if (endWall < startWall) {
        issues.push({ row: ri, line, code: 'endBeforeStart', value: `${fmtHM(startWall)}–${fmtHM(endWall)}`, fix: 'defaultDuration', fixValue: String(o.defaultMinutes) });
        endWall = startWall + o.defaultMinutes * 60000; // nur ein Vorschlag; Termin bleibt importierbar
      }
    }

    if (!summary.trim()) {
      issues.push({ row: ri, line, code: 'noSubject', value: '', fix: 'subject', fixValue: o.defaultSubject });
      summary = o.defaultSubject;
    }

    lines.push(`UID:row-${fileKey}-${ri}@freimoser.github.io`, `DTSTAMP:${dtstamp}`);
    if (allDay) lines.push(`DTSTART;VALUE=DATE:${icsStamp(startWall, false)}`, `DTEND;VALUE=DATE:${icsStamp(endWall, false)}`);
    else lines.push(`DTSTART;TZID=${tz}:${icsStamp(startWall, true)}`, `DTEND;TZID=${tz}:${icsStamp(endWall, true)}`);
    lines.push(`SUMMARY:${escapeText(summary)}`);
    const desc = [get(cDesc), extrasText(extras, row, t, o)].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
    const loc = get(cLoc);
    if (loc) lines.push(`LOCATION:${escapeText(loc)}`);
    if (cPriv && parseBool(raw(cPriv))) lines.push('CLASS:PRIVATE');
    lines.push('END:VEVENT');
    events.push(eventFromLines(lines, events.length, 0, tz, line));
    rowOf.push(ri);
  });

  const calendar: IcsCalendar = {
    index: 0, name: t.fileName.replace(/\.[^.]+$/, ''), fileName: t.fileName, timezone: tz,
    header: ['VERSION:2.0', 'PRODID:-//CSV to Calendar//freimoser.github.io//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'],
    timezones: events.some((e) => e.start && !e.start.allDay) ? [vtimezone(tz)] : [],
    events, otherComponents: {}, sourceBytes: 0, warnings: []
  };
  return { calendar, issues, rowOf, dropped };
}

function fmtHM(w: number): string {
  const p = wallParts(w);
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
}

function extrasText(extras: Column[], row: string[], t: Table, o: ConvertOptions): string {
  const out: string[] = [];
  for (const c of extras) {
    const v = cellValue(t, c, row, o);
    if (v) out.push(`${c.header}: ${v}`);
  }
  return out.join('\n');
}
