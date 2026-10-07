// Eingabedateien erkennen und lesen: ICS, Google-Export-ZIP, CSV/TXT, Excel.
// Alles passiert im Speicher des Browsers.

import { unzipSync } from 'fflate';
import { parseIcs, type IcsCalendar } from './ics';

export type InputKind = 'ics' | 'zip' | 'csv' | 'xlsx' | 'unknown';

export interface DecodedText { text: string; encoding: 'utf-8' | 'windows-1252'; bom: boolean }

export function decodeText(bytes: Uint8Array): DecodedText {
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bom ? bytes.subarray(3) : bytes);
    return { text, encoding: 'utf-8', bom };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252', bom: false };
  }
}

export function detectKind(name: string, bytes: Uint8Array): InputKind {
  const lower = name.toLowerCase();
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return lower.endsWith('.xlsx') || lower.endsWith('.xlsm') ? 'xlsx' : 'zip';
  if (/\.(xlsx|xlsm|xls|ods)$/.test(lower)) return 'xlsx';
  if (/\.(ics|ical|ifb|icalendar)$/.test(lower)) return 'ics';
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200)).trimStart().toUpperCase();
  if (head.startsWith('BEGIN:VCALENDAR') || head.startsWith('﻿BEGIN:VCALENDAR')) return 'ics';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return 'xlsx'; // altes .xls
  if (/\.(csv|txt|tsv)$/.test(lower)) return 'csv';
  return 'csv';
}

export interface IcsInput {
  kind: 'ics';
  calendars: IcsCalendar[];
  files: { name: string; bytes: number }[];
  skipped: string[];
  totalBytes: number;
}

/** Liest eine ICS-Datei oder eine ZIP-Datei mit ICS-Dateien (z. B. den Google-Kalender-Export). */
export function readIcsInput(name: string, bytes: Uint8Array): IcsInput {
  const files: { name: string; bytes: Uint8Array }[] = [];
  const skipped: string[] = [];
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const entries = unzipSync(bytes);
    for (const [path, data] of Object.entries(entries)) {
      if (path.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(path)) continue;
      if (/\.(ics|ical|ifb)$/i.test(path)) files.push({ name: path.split('/').pop() || path, bytes: data });
      else skipped.push(path.split('/').pop() || path);
    }
  } else files.push({ name, bytes });

  const calendars: IcsCalendar[] = [];
  let eventId = 0;
  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const { text } = decodeText(f.bytes);
    const cals = parseIcs(text, f.name, calendars.length, eventId);
    for (const c of cals) {
      if (!c.name) c.name = f.name.replace(/\.(ics|ical|ifb)$/i, '').replace(/_/g, ' ');
      if (cals.length === 1) c.sourceBytes = f.bytes.length;
      eventId += c.events.length;
      calendars.push(c);
    }
  }
  return {
    kind: 'ics', calendars, skipped,
    files: files.map((f) => ({ name: f.name, bytes: f.bytes.length })),
    totalBytes: bytes.length
  };
}
