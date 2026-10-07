// Erfundene Beispieldaten – für die Demo im Werkzeug und für die automatischen Tests.
// Aufbau orientiert sich an echten Praxis-Exporten (Präfix + Mitarbeiter-Kürzel im Titel,
// Beschreibungen mit Telefonnummern, Serien mit Ausnahmen, Verwaltungsfelder wie bei Google).
// Alle Namen und Nummern sind frei erfunden.

import { escapeText, CRLF, foldLine } from './text';
import { icsStamp, wallToUtc, DAY } from './datetime';
import { vtimezone } from './tz';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANIMALS = ['Bello', 'Luna', 'Mia', 'Rocky', 'Kira', 'Balu', 'Emma', 'Simba', 'Lilly', 'Max', 'Nala', 'Leo', 'Paula', 'Felix', 'Frieda', 'Oskar', 'Lotte', 'Charly', 'Bruno', 'Momo', 'Pepper', 'Socke', 'Tiger', 'Krümel', 'Hummel'];
const OWNERS = ['Schäfer', 'Müller', 'Weiß', 'Köhler', 'Brandl', 'Huber', 'Vogt', 'Ortner', 'Lehmann', 'Krüger', 'Böhm', 'Seidl', 'Franke', 'Jäger', 'Kuhn', 'Pohl', 'Haas', 'Graf', 'Roth', 'Sommer', 'Winkler', 'Lorenz', 'Peters', 'Busch', 'Engel'];
const FIRST = ['Anna', 'Hans', 'Erika', 'Josef', 'Lena', 'Karl', 'Maria', 'Peter', 'Sabine', 'Thomas', 'Ute', 'Werner', 'Petra', 'Jürgen', 'Monika', 'Klaus'];
const TREAT = ['Impfung', 'Kontrolle', 'Zahnsteinentfernung', 'Kastration', 'Blutabnahme', 'Röntgen', 'Ultraschall', 'Wurmkur', 'Krallen schneiden', 'Nachkontrolle', 'Beratung', 'Chippen', 'Wundversorgung', 'Allergietest'];
export const SAMPLE_STAFF = ['AK', 'BM', 'CS', 'DW', 'EH', 'FL'];

function pick<T>(r: () => number, a: T[]): T { return a[Math.floor(r() * a.length)]; }
function phone(r: () => number): string {
  return '01' + pick(r, ['51', '52', '57', '60', '70', '71', '76']) + ' ' + String(Math.floor(r() * 9_000_000) + 1_000_000);
}

export interface PracticeOptions { seed?: number; perYear?: number; fromYear?: number; toYear?: number; name?: string }

/** Erzeugt einen Google-Kalender-ähnlichen Export einer erfundenen Tierarztpraxis. */
export function samplePracticeIcs(o: PracticeOptions = {}): string {
  const r = rng(o.seed ?? 42);
  const perYear = o.perYear ?? 1600;
  const from = o.fromYear ?? 2010, to = o.toYear ?? 2026;
  const tz = 'Europe/Berlin';
  const L: string[] = [
    'BEGIN:VCALENDAR', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${o.name ?? 'Tierarztpraxis Beispiel'}`, `X-WR-TIMEZONE:${tz}`, ...vtimezone(tz)
  ];
  const utc = (w: number) => icsStamp(wallToUtc(w, tz), true) + 'Z';
  let n = 0;
  const ev = (lines: string[]) => {
    L.push('BEGIN:VEVENT', ...lines, 'END:VEVENT');
    n++;
  };
  const meta = (w: number) => {
    const c = utc(w - Math.floor(r() * 60) * DAY);
    return [`DTSTAMP:20261007T080000Z`, `CREATED:${c}`, `LAST-MODIFIED:${c}`, `SEQUENCE:${Math.floor(r() * 3)}`];
  };
  // Geburtstagsserien (alter Beginn – darf beim Jahresfilter nicht verschwinden)
  for (let i = 0; i < 40; i++) {
    const y = 1958 + Math.floor(r() * 40), mo = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
    const s = Date.UTC(y, mo - 1, d);
    ev([`DTSTART;VALUE=DATE:${icsStamp(s, false)}`, `DTEND;VALUE=DATE:${icsStamp(s + DAY, false)}`, 'RRULE:FREQ=YEARLY',
      `UID:bd${i}x${o.seed ?? 42}@google.com`, ...meta(Date.UTC(2012, 0, 1)), 'STATUS:CONFIRMED',
      `SUMMARY:${escapeText('Geburtstag ' + pick(r, FIRST) + ' ' + pick(r, OWNERS))}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:This is an event reminder', 'TRIGGER:-P0DT9H0M0S', 'END:VALARM']);
  }
  // Wöchentliche Teambesprechung mit Ausnahmen
  const teamStart = Date.UTC(from, 0, 6, 8, 0);
  const teamUid = `team${o.seed ?? 42}@google.com`;
  ev([`DTSTART;TZID=${tz}:${icsStamp(teamStart, true)}`, `DTEND;TZID=${tz}:${icsStamp(teamStart + 3_600_000, true)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=${to}1231T230000Z`, `UID:${teamUid}`, ...meta(teamStart), 'STATUS:CONFIRMED', 'SUMMARY:Teambesprechung', 'TRANSP:OPAQUE']);
  for (let i = 0; i < 12; i++) {
    const w = teamStart + Math.floor(r() * (to - from) * 52) * 7 * DAY;
    ev([`DTSTART;TZID=${tz}:${icsStamp(w + 3_600_000, true)}`, `DTEND;TZID=${tz}:${icsStamp(w + 7_200_000, true)}`,
      `UID:${teamUid}`, `RECURRENCE-ID;TZID=${tz}:${icsStamp(w, true)}`, ...meta(w), 'STATUS:CONFIRMED', 'SUMMARY:Teambesprechung (verlegt)', 'TRANSP:OPAQUE']);
  }
  // Einzeltermine
  for (let y = from; y <= to; y++) {
    const count = Math.round(perYear * (0.8 + r() * 0.4));
    for (let i = 0; i < count; i++) {
      const day = Date.UTC(y, 0, 2) + Math.floor(r() * 360) * DAY;
      const wd = new Date(day).getUTCDay();
      if (wd === 0 || (wd === 6 && r() < 0.8)) continue;
      const h = 8 + Math.floor(r() * 10), mi = pick(r, [0, 15, 30, 45]);
      const s = day + (h * 60 + mi) * 60000;
      const dur = pick(r, [60, 60, 60, 30, 30, 90, 120, 15]);
      const pre = r() < 0.75 ? 'T.' : r() < 0.5 ? 'onT.' : 'OP';
      const staff = r() < 0.6 ? ' ' + pick(r, SAMPLE_STAFF) : '';
      const cancelled = r() < 0.02 ? 'abgesagt ' : '';
      const title = `${cancelled}${pre}${staff} ${pick(r, ANIMALS)} ${pick(r, OWNERS)} / ${pick(r, TREAT)}`;
      const lines = [`DTSTART:${utc(s)}`, `DTEND:${utc(s + dur * 60000)}`, ...meta(s).slice(0, 1),
        `UID:${Math.floor(r() * 1e12).toString(36)}${n}@google.com`, ...meta(s).slice(1), 'STATUS:CONFIRMED', `SUMMARY:${escapeText(title)}`, 'TRANSP:OPAQUE'];
      if (r() < 0.55) lines.splice(5, 0, `DESCRIPTION:${escapeText(`Tel. ${phone(r)}\n${pick(r, TREAT)} besprochen. ${r() < 0.3 ? 'Bitte Impfpass mitbringen.' : ''}`.trim())}`);
      ev(lines);
    }
    // Urlaub (ganztägig)
    for (const k of SAMPLE_STAFF.slice(0, 3)) {
      const s = Date.UTC(y, 6, 1 + Math.floor(r() * 20));
      ev([`DTSTART;VALUE=DATE:${icsStamp(s, false)}`, `DTEND;VALUE=DATE:${icsStamp(s + 14 * DAY, false)}`, ...meta(s).slice(0, 1),
        `UID:u${y}${k}${o.seed ?? 42}@google.com`, ...meta(s).slice(1), 'STATUS:CONFIRMED', `SUMMARY:Urlaub ${k}`, 'TRANSP:TRANSPARENT']);
    }
  }
  L.push('END:VCALENDAR');
  return L.map(foldLine).join(CRLF) + CRLF;
}

export interface CsvSampleOptions { seed?: number; rows?: number; fromYear?: number; toYear?: number; slashDates?: boolean; brokenRows?: boolean }

/** Deutsche Praxis-Terminliste mit Semikolon, wie aus Praxissoftware exportiert. */
export function samplePracticeCsv(o: CsvSampleOptions = {}): string {
  const r = rng(o.seed ?? 7);
  const rows = o.rows ?? 2000;
  const from = o.fromYear ?? 2010, to = o.toYear ?? 2026;
  const out = ['Datum;Beginn;Ende;Behandlung;Behandler;Raum;Patient;Telefon;Geburtsdatum;Notiz'];
  const span = (to - from + 1) * 365;
  const list: [number, string][] = [];
  for (let i = 0; i < rows; i++) {
    const day = Date.UTC(from, 0, 2) + Math.floor(r() * span) * DAY;
    const p = new Date(day);
    const dd = String(p.getUTCDate()).padStart(2, '0'), mm = String(p.getUTCMonth() + 1).padStart(2, '0'), yy = p.getUTCFullYear();
    const h = 8 + Math.floor(r() * 10), mi = pick(r, ['00', '15', '30', '45']);
    const dur = pick(r, [15, 30, 30, 45, 60]);
    const endMin = h * 60 + +mi + dur;
    const date = o.slashDates ? `${dd}/${mm}/${yy}` : `${dd}.${mm}.${yy}`;
    const bd = `${String(1 + Math.floor(r() * 28)).padStart(2, '0')}.${String(1 + Math.floor(r() * 12)).padStart(2, '0')}.${1940 + Math.floor(r() * 60)}`;
    const vet = pick(r, ['Dr. Müller', 'Dr. Yilmaz', 'Dr. Weber', 'Dr. Krüger']);
    list.push([day + h * 3600000, [date, `${h}:${mi}`, `${Math.floor(endMin / 60)}:${String(endMin % 60).padStart(2, '0')}`, pick(r, TREAT), vet,
      'Raum ' + (1 + Math.floor(r() * 3)), `${pick(r, FIRST)} ${pick(r, OWNERS)}`, phone(r), bd, r() < 0.3 ? 'Röntgenbild mitbringen' : ''].join(';')]);
  }
  list.sort((a, b) => a[0] - b[0]);
  for (const [, l] of list) out.push(l);
  if (o.brokenRows) {
    out.splice(14, 0, '03.05.2024;14:30;13:30;Kontrolle;Dr. Müller;Raum 1;Anna Schäfer;0171 2345678;12.03.1961;Ende vor Beginn');
    out.splice(20, 0, '31.02.2019;10:00;10:30;Impfung;Dr. Weber;Raum 2;Hans Vogt;0160 7654321;29.02.1952;');
    out.splice(25, 0, '12.06.2023;25:10;;;Dr. Yilmaz;Raum 3;Lena Brandl;0152 1112223;07.11.1990;');
  }
  return out.join('\r\n') + '\r\n';
}

/** Kodiert Text in Windows-1252 (für Testdateien „wie aus Excel“). Nur Zeichen aus Latin-1 + €. */
export function encodeWindows1252(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c === 0x20ac ? 0x80 : c < 256 ? c : 0x3f;
  }
  return out;
}

export function sampleBirthdayRows(): (string | number)[][] {
  return [
    ['Name', 'Geburtstag', 'Telefon'],
    ['Erika Huber', '12.03.1948', '0171 2345678'],
    ['Hans Vogt', '29.02.1952', '0160 7654321'],
    ['Lena Brandl', '07.11.1990', ''],
    ['Josef Ortner', '21.06.1941', '0152 1112223'],
    ['Monika Seidl', '02.01.1956', ''],
    ['Klaus Franke', '30.09.1949', '']
  ];
}
