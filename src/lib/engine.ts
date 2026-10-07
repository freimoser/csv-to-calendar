// Rechenkern des Werkzeugs. Läuft in einem Web Worker, damit auch 10-MB-Dateien die Seite nicht blockieren.
// Der Worker wird als blob:-URL erzeugt und erbt damit die Content-Security-Policy der Seite:
// connect-src erlaubt nur die öffentliche robots.txt, keine anderen Adressen.

import { zipSync } from 'fflate';
import type { IcsCalendar, IcsEvent } from './ics';
import { decodeText, readIcsInput, readIcsInputs } from './input';
import { calendarStats, suggest, type CalendarStats, type Suggestion } from './analyze';
import {
  ALL, NO_CLEAN, NO_SPLIT, PART_LIMIT, assign, buildGroups, buildPart, cleanedSizes, partFileName, planCalendars, ruleMatches, select,
  type CleanOptions, type Group, type Selection, type SplitConfig, type OutCalendar
} from './plan';
import { buildCsv, csvSizes, packCsv, templateCsv, type CsvPart } from './google-csv';
import { fromRows, parseCsvText, tableToCalendar, type Column, type ConvertOptions, type RowIssue, type Table } from './table';
import { wallParts } from './datetime';
import { applyPatch, type Patch } from './edit';
import { eventFromLines, timezoneId } from './ics';
import { vtimezone, EXPORT_TIMEZONES } from './tz';
import type { Rule } from './plan';
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

export interface EventRow {
  id: number; cal: number; start: number | null; end: number | null; allDay: boolean; summary: string; location: string;
  series: boolean; exception: boolean; line: number; row: number | null; targets: string[]; edited: boolean; deleted: boolean;
}

export interface EventDetail {
  id: number; cal: number; calName: string; summary: string; description: string; location: string;
  start: number | null; end: number | null; allDay: boolean; tz: string; rrule: string | null; recurrenceId: string | null;
  status: string; uid: string; lines: string[]; edited: boolean; attendees: number; alarms: number;
}

export type Focus = { kind: 'cal'; cal: number } | { kind: 'rule'; rule: Rule; label: string } | { kind: 'target'; key: string; label: string } | null;

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
  /** Bearbeitungen je Termin-Schlüssel (e<ID> bei ICS, r<Zeile> bei Tabellen) */
  edits: Map<string, Patch>;
  originals: Map<number, IcsEvent>;
}

const S: State = {
  kind: null, fileName: '', totalBytes: 0, files: [], skipped: [], cals: [], events: [], groups: [], table: null,
  sizeKey: '', icsSizes: null, csvSizes: null, rowOf: [], edits: new Map(), originals: new Map()
};

function setCalendars(cals: IcsCalendar[], keepEdits = false) {
  S.cals = cals;
  S.events = cals.flatMap((c) => c.events);
  S.originals = new Map();
  if (!keepEdits) S.edits = new Map();
  else for (const e of [...S.events]) { const p = S.edits.get(editKey(e)); if (p) replaceEvent(e, p); }
  S.groups = buildGroups(S.events);
  S.sizeKey = '';
}

function editKey(e: IcsEvent): string {
  return S.kind === 'table' ? 'r' + (S.rowOf[e.id] ?? 'x' + e.id) : 'e' + e.id;
}

/** Ersetzt einen Termin durch seine bearbeitete Fassung (Original bleibt für „Zurücksetzen“ erhalten). */
function replaceEvent(current: IcsEvent, p: Patch | null) {
  const cal = S.cals.find((c) => c.index === current.cal)!;
  const original = S.originals.get(current.id) ?? current;
  let next = original;
  if (p) {
    let useTzid = cal.timezones.some((b) => timezoneId(b) === cal.timezone);
    if (!useTzid && (p.start?.includes('T')) && EXPORT_TIMEZONES.includes(cal.timezone)) { cal.timezones.push(vtimezone(cal.timezone)); useTzid = true; }
    next = eventFromLines(applyPatch(original, p, cal.timezone, useTzid), original.id, original.cal, cal.timezone, original.sourceLine);
    S.originals.set(current.id, original);
  } else S.originals.delete(current.id);
  const i = S.events.findIndex((e) => e.id === current.id);
  if (i >= 0) S.events[i] = next;
  const j = cal.events.findIndex((e) => e.id === current.id);
  if (j >= 0) cal.events[j] = next;
}

export function editEvent(id: number, p: Patch | null): EventDetail | null {
  const ev = S.events.find((e) => e.id === id);
  if (!ev) return null;
  const key = editKey(ev);
  if (p) S.edits.set(key, { ...(S.edits.get(key) ?? {}), ...p }); else S.edits.delete(key);
  replaceEvent(ev, p ? S.edits.get(key)! : null);
  S.groups = buildGroups(S.events);
  S.sizeKey = '';
  return getEvent(id);
}

export function getEvent(id: number): EventDetail | null {
  const e = S.events.find((x) => x.id === id);
  if (!e) return null;
  const cal = S.cals.find((c) => c.index === e.cal);
  return {
    id: e.id, cal: e.cal, calName: cal?.name ?? '', summary: e.summary, description: e.description, location: e.location,
    start: e.start?.wall ?? null, end: e.end?.wall ?? (e.start && e.minutes !== null ? e.start.wall + e.minutes * 60000 : null),
    allDay: !!e.start?.allDay, tz: cal?.timezone ?? '', rrule: e.rrule, recurrenceId: e.recurrenceId, status: e.status, uid: e.uid,
    lines: e.lines.slice(0, 300), edited: S.edits.has(editKey(e)), attendees: e.attendees, alarms: e.alarms
  };
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

/** Mehrere ICS-/ZIP-Dateien auf einmal – jede Datei wird ein eigener Kalender. */
export function loadIcsMany(list: { name: string; bytes: Uint8Array }[]): Loaded {
  const input = readIcsInputs(list);
  S.kind = 'ics';
  S.fileName = list.map((f) => f.name).slice(0, 3).join(', ') + (list.length > 3 ? ' …' : '');
  S.totalBytes = input.totalBytes;
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
  setCalendars([r.calendar], true);
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

/** Termine für den Editor: Suche, Fokus auf Kalender/Regel/Ziel, mit Ziel-Kalendern je Termin. */
export function listEvents(req: PlanRequest, query: string, focus: Focus, offset = 0, limit = 100): { rows: EventRow[]; total: number } {
  const deleted = new Set(req.selection.deleted);
  const sel = select(S.groups, { ...req.selection, deleted: [] });
  const { buckets } = assign(sel.groups, req.split, S.cals);
  const targetsOf = new Map<string, string[]>();
  if (req.split.mode !== 'none') for (const b of buckets) for (const g of b.groups) {
    const list = targetsOf.get(g.key) ?? [];
    list.push(b.name);
    targetsOf.set(g.key, list);
  }
  const inFocus = (g: Group): boolean => {
    if (!focus) return true;
    if (focus.kind === 'cal') return g.cal === focus.cal;
    if (focus.kind === 'rule') return ruleMatches(g.master, focus.rule);
    const b = buckets.find((x) => x.key === focus.key);
    return !!b && b.groups.includes(g);
  };
  const q = query.trim().toLowerCase();
  const rows: EventRow[] = [];
  let total = 0;
  for (const g of sel.groups) {
    if (!inFocus(g)) continue;
    for (const e of g.events) {
      if (q && !e.summary.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q) && !e.location.toLowerCase().includes(q)) continue;
      total++;
      if (total > offset && rows.length < limit) rows.push({
        id: e.id, cal: e.cal, start: e.start?.wall ?? null, end: e.end?.wall ?? null, allDay: !!e.start?.allDay,
        summary: e.summary.slice(0, 160), location: e.location.slice(0, 60), series: !!e.rrule, exception: !!e.recurrenceId,
        line: e.sourceLine, row: S.kind === 'table' ? S.rowOf[e.id] ?? null : null, targets: targetsOf.get(g.key) ?? [],
        edited: S.edits.has(editKey(e)), deleted: deleted.has(e.id)
      });
    }
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
  | { type: 'loadIcsMany'; files: { name: string; bytes: Uint8Array }[] }
  | { type: 'loadCsv'; name: string; bytes: Uint8Array }
  | { type: 'loadRows'; name: string; rows: string[][]; totalBytes: number }
  | { type: 'convert'; roles: Record<number, Column['role']>; options: ConvertOptions }
  | { type: 'plan'; req: PlanRequest }
  | { type: 'build'; req: PlanRequest; which: { cal: string; part: number } | 'zip'; salt: string }
  | { type: 'list'; req: PlanRequest; query: string; focus: Focus; offset: number; limit: number }
  | { type: 'get'; id: number }
  | { type: 'edit'; id: number; patch: Patch | null }
  | { type: 'template' }
  | { type: 'sample'; which: 'practice' | 'csv' | 'birthdays'; lang: 'de' | 'en' };

export function handle(msg: Request): unknown {
  switch (msg.type) {
    case 'loadIcs': return loadIcs(msg.name, msg.bytes);
    case 'loadIcsMany': return loadIcsMany(msg.files);
    case 'loadCsv': return loadCsv(msg.name, msg.bytes);
    case 'loadRows': return loadRows(msg.name, msg.rows, msg.totalBytes);
    case 'convert': return convertTable(msg.roles, msg.options);
    case 'plan': return plan(msg.req);
    case 'build': return build(msg.req, msg.which, msg.salt);
    case 'list': return listEvents(msg.req, msg.query, msg.focus, msg.offset, msg.limit);
    case 'get': return getEvent(msg.id);
    case 'edit': return editEvent(msg.id, msg.patch);
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
