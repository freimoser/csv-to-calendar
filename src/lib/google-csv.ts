// Export im CSV-Format von Google Kalender.
// Quelle: https://support.google.com/calendar/answer/37118 (Stand 7.10.2026)
// - Spaltennamen auf Englisch, nur "Subject" und "Start Date" sind Pflicht
// - Komma als Trennzeichen (Semikolon oder Doppelpunkt funktionieren nicht: answer/45654)
// - Beispiele aus der Hilfe: Start Date "05/30/2020", Start Time "10:00 AM", All Day Event "True"/"False"
// - Werte mit Komma in Anführungszeichen

import type { IcsEvent } from './ics';
import { DAY, wallParts } from './datetime';
import { CRLF, utf8Len } from './text';
import { maskEmails, maskPhones, PART_LIMIT, type CleanOptions, type Group } from './plan';

export const GOOGLE_CSV_HEADER = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description', 'Location', 'Private'];
const HEADER_LINE = GOOGLE_CSV_HEADER.join(',') + CRLF;

export function csvField(v: string): string {
  if (v === '') return '';
  if (/[",\r\n]/.test(v) || /^\s|\s$/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

const p2 = (n: number) => (n < 10 ? '0' : '') + n;

/** 05/30/2020 */
export function usDate(wall: number): string {
  const p = wallParts(wall);
  return `${p2(p.mo)}/${p2(p.d)}/${p.y}`;
}

/** 10:00 AM */
export function usTime(wall: number): string {
  const p = wallParts(wall);
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${h12}:${p2(p.mi)} ${p.h < 12 ? 'AM' : 'PM'}`;
}

function textFor(s: string, o: CleanOptions): string {
  let v = s;
  if (o.replaceFind) v = v.split(o.replaceFind).join(o.replaceWith);
  if (o.maskEmails) v = maskEmails(v);
  if (o.maskPhones) v = maskPhones(v);
  return v;
}

/** Kann der Termin als Google-CSV-Zeile dargestellt werden? Serien nicht (Google macht daraus Einzeltermine). */
export function csvCompatible(e: IcsEvent): boolean {
  return !!e.start && !e.rrule && !e.recurrenceId;
}

export function csvRow(e: IcsEvent, o: CleanOptions): string {
  const s = e.start!;
  const allDay = s.allDay;
  let endWall = e.end?.wall ?? (e.minutes !== null ? s.wall + e.minutes * 60000 : allDay ? s.wall + DAY : s.wall);
  let endDate: string, endTime: string;
  if (allDay) {
    // ICS-Ende ist exklusiv, Google-CSV "End Date" ist der letzte Tag
    const last = Math.max(s.wall, endWall - DAY);
    endDate = usDate(last);
    endTime = '';
  } else {
    if (endWall < s.wall) endWall = s.wall;
    endDate = usDate(endWall);
    endTime = usTime(endWall);
  }
  const cells = [
    textFor(e.summary, o) || ' ',
    usDate(s.wall),
    allDay ? '' : usTime(s.wall),
    endDate,
    endTime,
    allDay ? 'True' : 'False',
    o.dropDescription ? '' : textFor(e.description, o),
    o.dropLocation ? '' : textFor(e.location, o),
    e.cls === 'PRIVATE' || e.cls === 'CONFIDENTIAL' ? 'True' : 'False'
  ];
  return cells.map(csvField).join(',') + CRLF;
}

export interface CsvPart { index: number; events: IcsEvent[]; bytes: number; from: number; to: number }

export function csvSizes(events: IcsEvent[], o: CleanOptions): Int32Array {
  const sizes = new Int32Array(events.length ? events[events.length - 1].id + 1 : 0);
  for (const e of events) if (csvCompatible(e)) sizes[e.id] = utf8Len(csvRow(e, o));
  return sizes;
}

export const CSV_HEADER_BYTES = utf8Len(HEADER_LINE);

/** Teilt die Termine chronologisch in CSV-Teile unter der Größengrenze. */
export function packCsv(groups: Group[], sizes: Int32Array, limit = PART_LIMIT): { parts: CsvPart[]; skippedSeries: number } {
  const parts: CsvPart[] = [];
  let cur: CsvPart | null = null;
  let skippedSeries = 0;
  const evs: IcsEvent[] = [];
  for (const g of groups) for (const e of g.events) { if (csvCompatible(e)) evs.push(e); else skippedSeries++; }
  evs.sort((a, b) => a.start!.wall - b.start!.wall);
  for (const e of evs) {
    const b = sizes[e.id];
    if (!cur || cur.bytes + b > limit) {
      cur = { index: parts.length, events: [], bytes: CSV_HEADER_BYTES, from: e.start!.wall, to: e.start!.wall };
      parts.push(cur);
    }
    cur.events.push(e);
    cur.bytes += b;
    cur.to = e.start!.wall;
  }
  return { parts, skippedSeries };
}

export function buildCsv(events: IcsEvent[], o: CleanOptions): string {
  let s = HEADER_LINE;
  for (const e of events) s += csvRow(e, o);
  return s;
}

/** Leere Vorlage mit Beispielzeile (wie in der Google-Hilfe). */
export function templateCsv(): string {
  return HEADER_LINE + ['Final exam', '05/30/2020', '10:00 AM', '05/30/2020', '1:00 PM', 'False',
    '50 multiple choice questions and two essay questions', 'Columbia, Schermerhorn 614', 'True'].map(csvField).join(',') + CRLF;
}
