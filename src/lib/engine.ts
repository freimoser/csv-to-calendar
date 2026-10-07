// Rechenkern des Werkzeugs. Läuft in einem Web Worker, damit auch 10-MB-Dateien die Seite nicht blockieren.
// Der Worker wird als blob:-URL erzeugt und erbt damit die Content-Security-Policy der Seite:
// connect-src erlaubt nur die öffentliche robots.txt, keine anderen Adressen.

import { zipSync } from 'fflate';
import type { IcsCalendar, IcsEvent } from './ics';
import { decodeText, readIcsInput } from './input';
import { calendarStats, suggest, type CalendarStats, type Suggestion } from './analyze';
import {
  ALL, NO_CLEAN, NO_SPLIT, PART_LIMIT, assign, buildGroups, buildPart, cleanedSizes, partFileName, planCalendars, select,
  type CleanOptions, type Group, type Selection, type SplitConfig, type OutCalendar
} from './plan';
import { buildCsv, csvSizes, packCsv, templateCsv, type CsvPart } from './google-csv';
import { fromRows, parseCsvText, tableToCalendar, type Column, type ConvertOptions, type RowIssue, type Table } from './table';
import { wallParts } from './datetime';
import { encodeWindows1252, sampleBirthdayRows, samplePracticeCsv, samplePracticeIcs } from './sample';

export type Format = 'ics' | 'csv';

export interface PlanRequest { selection: Selection; clean: CleanOptions; split: SplitConfig; format: Format }

export interface PartInfo { index: number; events: number; bytes: number; from: number; to: number; file: string }
export interface CalInfo { key: string; name: string; events: number; bytes: number; rest?: boolean; parts: PartInfo[] }

export interface PlanResult {
  format: Format;
  calendars: CalInfo[];
  events: number;
  removed: Record<string, number>;
  multiMatched: number;
  ics: { bytes: number; parts: number };
  csv: { bytes: number; parts: number; skippedSeries: number };
  perTarget: { key: string; name: string; events: number }[];
}

export interface TableInfo {
  fileName: string;
  encoding: string;
  delimiter: string;
  headers: string[];
  columns: Column[];
  rowCount: number;
  preview: string[][];
}

export interface Loaded {
  kind: 'ics' | 'table';
  fileName: string;
  totalBytes: number;
  files: { name: string; bytes: number }[];
  skipped: string[];
  calendars: CalendarStats[];
  suggestions: Suggestion[];
  table?: TableInfo;
  issues?: RowIssue[];
  issueCount?: number;
  dropped?: number;
}

export interface EventRow { id: number; cal: number; start: number | null; allDay: boolean; summary: string; series: boolean; line: number; row: number | null }

interface State {
  kind: 'ics' | 'table' | null;
  fileName: string;
  totalBytes: number;
  files: { name: string; bytes: number }[];
  skipped: string[];
  cals: IcsCalendar[];
  events: IcsEvent[];
  groups: Group[];
  table: Table | null;
  sizeKey: string;
  icsSizes: Int32Array | null;
  csvSizes: Int32Array | null;
  rowOf: number[];
}

const S: State = {
  kind: null, fileName: '', totalBytes: 0, files: [], skipped: [], cals: [], events: [], groups: [], table: null,
  sizeKey: '', icsSizes: null, csvSizes: null, rowOf: []
};

function setCalendars(cals: IcsCalendar[]) {
  S.cals = cals;
  S.events = cals.flatMap((c) => c.events);
  S.groups = buildGroups(S.events);
  S.sizeKey = '';
}

function loadedInfo(): Loaded {
  const calendars = S.cals.map((c) => calendarStats(c, S.groups.filter((g) => g.cal === c.index)));
  return {
    kind: S.kind!, fileName: S.fileName, totalBytes: S.totalBytes, files: S.files, skipped: S.skipped,
    calendars, suggestions: suggest(S.cals, S.events)
  };
}

export function loadIcs(name: string, bytes: Uint8Array): Loaded {
  const input = readIcsInput(name, bytes);
  S.kind = 'ics';
  S.fileName = name;
  S.totalBytes = bytes.length;
  S.files = input.files;
  S.skipped = input.skipped;
  S.table = null;
  setCalendars(input.calendars);
  return loadedInfo();
}

function tableInfo(t: Table): TableInfo {
  return { fileName: t.fileName, encoding: t.encoding, delimiter: t.delimiter, headers: t.headers, columns: t.columns, rowCount: t.rows.length, preview: t.rows.slice(0, 8) };
}

export function loadCsv(name: string, bytes: Uint8Array): TableInfo {
  const dec = decodeText(bytes);
  const t = parseCsvText(dec.text, name, dec.encoding);
  S.kind = 'table'; S.table = t; S.fileName = name; S.totalBytes = bytes.length; S.files = [{ name, bytes: bytes.length }]; S.skipped = [];
  return tableInfo(t);
}

export function loadRows(name: string, rows: string[][], totalBytes: number): TableInfo {
  const t = fromRows(rows, name, 'Excel', '');
  S.kind = 'table'; S.table = t; S.fileName = name; S.totalBytes = totalBytes; S.files = [{ name, bytes: totalBytes }]; S.skipped = [];
  return tableInfo(t);
}

/** Wendet Spaltenrollen und Optionen an und erzeugt die Termine. */
export function convertTable(roles: Record<number, Column['role']>, o: ConvertOptions): Loaded {
  const t = S.table!;
  for (const c of t.columns) if (roles[c.index]) c.role = roles[c.index];
  const r = tableToCalendar(t, o);
  S.rowOf = r.rowOf;
  setCalendars([r.calendar]);
  const info = loadedInfo();
  info.table = tableInfo(t);
  info.issues = r.issues.slice(0, 300);
  info.issueCount = r.issues.length;
  info.dropped = r.dropped;
  return info;
}

function sizes(clean: CleanOptions) {
  const key = JSON.stringify(clean);
  if (key !== S.sizeKey || !S.icsSizes) {
    S.icsSizes = cleanedSizes(S.events, clean);
    S.csvSizes = csvSizes(S.events, clean);
    S.sizeKey = key;
  }
  return { ics: S.icsSizes!, csv: S.csvSizes! };
}

interface Planned { buckets: ReturnType<typeof assign>['buckets']; out: OutCalendar[]; csvOut: { name: string; key: string; parts: CsvPart[]; skipped: number }[]; removed: Record<string, number>; multiMatched: number }

function computePlan(req: PlanRequest): Planned {
  const sel = select(S.groups, req.selection);
  const { buckets, multiMatched } = assign(sel.groups, req.split, S.cals);
  const sz = sizes(req.clean);
  const out = planCalendars(buckets, S.cals, sz.ics);
  const csvOut = buckets.map((b) => { const p = packCsv(b.groups, sz.csv); return { name: b.name, key: b.key, parts: p.parts, skipped: p.skippedSeries }; });
  return { buckets, out, csvOut, removed: sel.removed, multiMatched };
}

const ym = (w: number) => { const p = wallParts(w); return p.y + '-' + String(p.mo).padStart(2, '0'); };

function csvFileName(name: string, slug: string, part: CsvPart, n: number, multi: boolean): string {
  const base = multi || name ? slug : 'kalender';
  return `${base}${n > 1 ? `_teil-${part.index + 1}-von-${n}` : ''}_${ym(part.from)}-bis-${ym(part.to)}.csv`;
}

export function plan(req: PlanRequest): PlanResult {
  const p = computePlan(req);
  const multi = p.out.length > 1;
  const icsBytes = p.out.reduce((a, c) => a + c.bytes, 0);
  const icsParts = p.out.reduce((a, c) => a + c.parts.length, 0);
  const csvBytes = p.csvOut.reduce((a, c) => a + c.parts.reduce((x, y) => x + y.bytes, 0), 0);
  const csvParts = p.csvOut.reduce((a, c) => a + c.parts.length, 0);
  const skippedSeries = p.csvOut.reduce((a, c) => a + c.skipped, 0);
  const calendars: CalInfo[] = req.format === 'ics'
    ? p.out.map((c) => ({
        key: c.key, name: c.name, events: c.events, bytes: c.bytes, rest: c.rest,
        parts: c.parts.map((x) => ({ index: x.index, events: x.events, bytes: x.bytes, from: x.from, to: x.to, file: partFileName(c, x, multi) }))
      }))
    : p.csvOut.map((c, i) => ({
        key: c.key, name: c.name, events: c.parts.reduce((a, x) => a + x.events.length, 0), bytes: c.parts.reduce((a, x) => a + x.bytes, 0),
        rest: p.out[i]?.rest,
        parts: c.parts.map((x) => ({ index: x.index, events: x.events.length, bytes: x.bytes, from: x.from, to: x.to, file: csvFileName(c.name, p.out[i].slug, x, c.parts.length, multi) }))
      }));
  return {
    format: req.format, calendars, events: p.out.reduce((a, c) => a + c.events, 0), removed: p.removed, multiMatched: p.multiMatched,
    ics: { bytes: icsBytes, parts: icsParts }, csv: { bytes: csvBytes, parts: csvParts, skippedSeries },
    perTarget: p.out.map((c) => ({ key: c.key, name: c.name, events: c.events }))
  };
}

export interface BuiltFile { name: string; data: Uint8Array; type: string }

const enc = new TextEncoder();

/** Baut eine Teil-Datei oder alle Dateien als ZIP. */
export function build(req: PlanRequest, which: { cal: string; part: number } | 'zip', uidSalt: string): BuiltFile {
  const p = computePlan(req);
  const multi = p.out.length > 1;
  const files: Record<string, Uint8Array> = {};
  const want = (key: string, idx: number) => which === 'zip' || (which.cal === key && which.part === idx);
  if (req.format === 'ics') {
    for (const c of p.out) for (const part of c.parts) {
      if (!want(c.key, part.index)) continue;
      const name = partFileName(c, part, multi);
      const data = enc.encode(buildPart(part, c, req.clean, uidSalt));
      if (which !== 'zip') return { name, data, type: 'text/calendar;charset=utf-8' };
      files[(multi ? c.slug + '/' : '') + name] = data;
    }
  } else {
    p.csvOut.forEach((c, i) => {
      for (const part of c.parts) {
        if (!want(c.key, part.index)) continue;
        const name = csvFileName(c.name, p.out[i].slug, part, c.parts.length, multi);
        files[(multi ? p.out[i].slug + '/' : '') + name] = enc.encode(buildCsv(part.events, req.clean));
      }
    });
    if (which !== 'zip') {
      const [name, data] = Object.entries(files)[0];
      return { name: name.split('/').pop()!, data, type: 'text/csv;charset=utf-8' };
    }
  }
  const zip = zipSync(files, { level: 6 });
  const base = S.fileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 40) || 'kalender';
  return { name: `${base}_fuer-google.zip`, data: zip, type: 'application/zip' };
}

/** Termine für die Liste „Einzelne Termine löschen“. */
export function listEvents(selection: Selection, query: string, limit = 100): { rows: EventRow[]; total: number } {
  const sel = select(S.groups, { ...selection, deleted: [] });
  const q = query.trim().toLowerCase();
  const rows: EventRow[] = [];
  let total = 0;
  for (const g of sel.groups) for (const e of g.events) {
    if (q && !e.summary.toLowerCase().includes(q)) continue;
    total++;
    if (rows.length < limit) rows.push({ id: e.id, cal: e.cal, start: e.start?.wall ?? null, allDay: !!e.start?.allDay, summary: e.summary.slice(0, 140), series: !!e.rrule, line: e.sourceLine, row: S.kind === 'table' ? S.rowOf[e.id] ?? null : null });
  }
  return { rows, total };
}

export function template(): BuiltFile {
  return { name: 'google-kalender-vorlage.csv', data: enc.encode(templateCsv()), type: 'text/csv;charset=utf-8' };
}

export { ALL, NO_CLEAN, NO_SPLIT, PART_LIMIT };

// ---------------------------------------------------------------- Nachrichten

export type Request =
  | { type: 'loadIcs'; name: string; bytes: Uint8Array }
  | { type: 'loadCsv'; name: string; bytes: Uint8Array }
  | { type: 'loadRows'; name: string; rows: string[][]; totalBytes: number }
  | { type: 'convert'; roles: Record<number, Column['role']>; options: ConvertOptions }
  | { type: 'plan'; req: PlanRequest }
  | { type: 'build'; req: PlanRequest; which: { cal: string; part: number } | 'zip'; salt: string }
  | { type: 'list'; selection: Selection; query: string }
  | { type: 'template' }
  | { type: 'sample'; which: 'practice' | 'csv' | 'birthdays'; lang: 'de' | 'en' };

export function handle(msg: Request): unknown {
  switch (msg.type) {
    case 'loadIcs': return loadIcs(msg.name, msg.bytes);
    case 'loadCsv': return loadCsv(msg.name, msg.bytes);
    case 'loadRows': return loadRows(msg.name, msg.rows, msg.totalBytes);
    case 'convert': return convertTable(msg.roles, msg.options);
    case 'plan': return plan(msg.req);
    case 'build': return build(msg.req, msg.which, msg.salt);
    case 'list': return listEvents(msg.selection, msg.query);
    case 'template': return template();
    case 'sample': {
      if (msg.which === 'practice') {
        const name = msg.lang === 'de' ? 'beispiel-praxiskalender.ics' : 'example-practice-calendar.ics';
        return { kind: 'ics', info: loadIcs(name, enc.encode(samplePracticeIcs({ perYear: 1100, name: msg.lang === 'de' ? 'Tierarztpraxis Beispiel' : 'Example Vet Practice' }))) };
      }
      if (msg.which === 'csv') return { kind: 'table', info: loadCsv(msg.lang === 'de' ? 'beispiel-terminliste.csv' : 'example-event-list.csv', encodeWindows1252(samplePracticeCsv({ rows: 3000, brokenRows: true }))) };
      const rows = sampleBirthdayRows().map((r) => r.map(String));
      return { kind: 'table', info: loadRows(msg.lang === 'de' ? 'geburtstage.xlsx' : 'birthdays.xlsx', rows, 8000) };
    }
  }
}

export const DEFAULT_SELECTION: Selection = { ...ALL };
export const DEFAULT_SPLIT: SplitConfig = { ...NO_SPLIT };
export const DEFAULT_CLEAN: CleanOptions = { ...NO_CLEAN };
export { PART_LIMIT as LIMIT };
