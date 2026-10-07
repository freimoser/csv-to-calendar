// Auswahl, Bereinigung, Aufteilen in Ziel-Kalender und in Teile unter der Größengrenze.

import type { IcsCalendar, IcsEvent } from './ics';
import { FOOTER_BYTES, eventBytes, headerLines, linesBytes, splitProp, timezoneId, writeIcs } from './ics';
import { DAY, wallParts } from './datetime';
import { escapeText, slugify } from './text';

/** Google nimmt Dateien bis 1 MB. Wir bleiben mit 950.000 Byte sicher darunter – egal ob 1 MB als 1.000.000 oder 1.048.576 Byte gemeint ist. */
export const PART_LIMIT = 950_000;

// ---------------------------------------------------------------- Bereinigen

export interface CleanOptions {
  dropDescription: boolean;
  dropLocation: boolean;
  dropAttendees: boolean;
  dropAlarms: boolean;
  dropAttachments: boolean;
  dropConference: boolean;
  dropAdmin: boolean;
  maskPhones: boolean;
  maskEmails: boolean;
  newUids: boolean;
  replaceFind: string;
  replaceWith: string;
}

export const NO_CLEAN: CleanOptions = {
  dropDescription: false, dropLocation: false, dropAttendees: false, dropAlarms: false, dropAttachments: false,
  dropConference: false, dropAdmin: false, maskPhones: false, maskEmails: false, newUids: false, replaceFind: '', replaceWith: ''
};

const PHONE_RE = /(?:\+\d{2}|\b0)[\d \/()\-]{5,}\d/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function maskPhones(s: string, label = '[Tel.]'): string {
  return s.replace(PHONE_RE, (m) => ((m.match(/\d/g) || []).length >= 6 ? label : m));
}
export function maskEmails(s: string, label = '[E-Mail]'): string {
  return s.replace(EMAIL_RE, label);
}
export function hasPhone(s: string): boolean {
  PHONE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PHONE_RE.exec(s))) if ((m[0].match(/\d/g) || []).length >= 6) { PHONE_RE.lastIndex = 0; return true; }
  return false;
}
export function hasEmail(s: string): boolean {
  EMAIL_RE.lastIndex = 0;
  const r = EMAIL_RE.test(s);
  EMAIL_RE.lastIndex = 0;
  return r;
}

function cleanActive(o: CleanOptions): boolean {
  return o.dropDescription || o.dropLocation || o.dropAttendees || o.dropAlarms || o.dropAttachments || o.dropConference ||
    o.dropAdmin || o.maskPhones || o.maskEmails || o.newUids || !!o.replaceFind;
}

function hash(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return (h1 >>> 0).toString(36).padStart(7, '0') + (h2 >>> 0).toString(36).padStart(7, '0');
}

const ADMIN_PROPS = new Set(['CREATED', 'LAST-MODIFIED', 'SEQUENCE']);
const TEXT_PROPS = new Set(['SUMMARY', 'DESCRIPTION', 'LOCATION']);

/** Wendet die Bereinigung auf einen Termin an und liefert neue logische Zeilen. */
export function cleanEvent(ev: IcsEvent, o: CleanOptions, uidSalt = ''): string[] {
  if (!cleanActive(o)) return ev.lines;
  const out: string[] = [];
  let skipDepth = 0;
  let depth = 0;
  for (let i = 0; i < ev.lines.length; i++) {
    const l = ev.lines[i];
    if (i > 0 && i < ev.lines.length - 1) {
      if (/^BEGIN:/i.test(l)) {
        depth++;
        if (skipDepth === 0 && o.dropAlarms && /^BEGIN:VALARM/i.test(l)) skipDepth = depth;
        if (skipDepth) continue;
      } else if (/^END:/i.test(l)) {
        const wasSkip = skipDepth && depth === skipDepth;
        const inSkip = skipDepth > 0;
        depth--;
        if (wasSkip) { skipDepth = 0; continue; }
        if (inSkip) continue;
      } else if (skipDepth) continue;
      else if (depth === 0) {
        const p = splitProp(l);
        const n = p.name;
        if (o.dropDescription && n === 'DESCRIPTION') continue;
        if (o.dropLocation && n === 'LOCATION') continue;
        if (o.dropAttendees && (n === 'ATTENDEE' || n === 'ORGANIZER')) continue;
        if (o.dropAttachments && n === 'ATTACH') continue;
        if (o.dropConference && (n === 'X-GOOGLE-CONFERENCE' || n === 'CONFERENCE')) continue;
        if (o.dropAdmin && (ADMIN_PROPS.has(n) || (n.startsWith('X-') && n !== 'X-GOOGLE-CONFERENCE'))) continue;
        if (o.newUids && n === 'UID') { out.push('UID:ctc-' + hash(uidSalt + p.value) + '@freimoser.github.io'); continue; }
        if (TEXT_PROPS.has(n) && (o.maskPhones || o.maskEmails || o.replaceFind)) {
          let v = p.value;
          if (o.replaceFind) v = v.split(escapeText(o.replaceFind)).join(escapeText(o.replaceWith));
          if (o.maskEmails) v = maskEmails(v);
          if (o.maskPhones) v = maskPhones(v);
          if (v !== p.value) { out.push(l.slice(0, l.length - p.value.length) + v); continue; }
        }
      }
    }
    out.push(l);
  }
  return out;
}

/** Größe jedes Termins nach der Bereinigung – schnell, ohne die Zeilen aufzuheben. */
export function cleanedSizes(events: IcsEvent[], o: CleanOptions): Int32Array {
  const sizes = new Int32Array(events.length ? events[events.length - 1].id + 1 : 0);
  const active = cleanActive(o);
  for (const ev of events) sizes[ev.id] = active ? eventBytes(cleanEvent(ev, o, 'x')) : ev.bytes;
  return sizes;
}

// ---------------------------------------------------------------- Gruppen (Serie + Ausnahmen)

export interface Group {
  key: string;
  cal: number;
  master: IcsEvent;
  events: IcsEvent[];
  series: boolean;
  /** frühester Beginn (Wandzeit) */
  first: number;
  /** letzter möglicher Termin; Infinity bei endlosen Serien */
  last: number;
}

function seriesEnd(ev: IcsEvent): number {
  const start = ev.start?.wall ?? 0;
  const r = ev.rrule || '';
  const until = /UNTIL=(\d{8})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(r);
  if (until) {
    const u = until[1];
    return Date.UTC(+u.slice(0, 4), +u.slice(4, 6) - 1, +u.slice(6, 8), until[2] ? +until[2] : 23, until[3] ? +until[3] : 59);
  }
  const count = /COUNT=(\d+)/.exec(r);
  if (count) {
    const interval = +(/INTERVAL=(\d+)/.exec(r)?.[1] || 1);
    const freq = /FREQ=(\w+)/.exec(r)?.[1] || 'DAILY';
    const days: Record<string, number> = { SECONDLY: 1 / 86400, MINUTELY: 1 / 1440, HOURLY: 1 / 24, DAILY: 1, WEEKLY: 7, MONTHLY: 31, YEARLY: 366 };
    return start + (+count[1]) * interval * (days[freq] ?? 1) * DAY;
  }
  return Infinity;
}

export function buildGroups(events: IcsEvent[]): Group[] {
  const map = new Map<string, Group>();
  const out: Group[] = [];
  for (const ev of events) {
    const key = ev.uid ? ev.cal + '|' + ev.uid : 'id|' + ev.id;
    let g = map.get(key);
    const start = ev.start?.wall ?? 0;
    if (!g) {
      g = { key, cal: ev.cal, master: ev, events: [], series: false, first: start, last: start };
      map.set(key, g);
      out.push(g);
    }
    g.events.push(ev);
    if (ev.rrule && !ev.recurrenceId) {
      g.master = ev;
      g.series = true;
      g.first = Math.min(g.first, start);
      g.last = Math.max(g.last, seriesEnd(ev));
    } else {
      if (!g.series && g.master !== ev && g.master.recurrenceId && !ev.recurrenceId) g.master = ev;
      g.first = Math.min(g.first, start);
      g.last = Math.max(g.last, start);
    }
  }
  out.sort((a, b) => a.first - b.first);
  return out;
}

// ---------------------------------------------------------------- Auswahl

export type TextField = 'summary' | 'description' | 'location' | 'categories' | 'organizer';

export interface Selection {
  cals: number[] | null;
  from: number | null;
  to: number | null;
  years: number[] | null;
  hidePast: boolean;
  today: number;
  dropWords: string[];
  dropCancelled: boolean;
  dropTentative: boolean;
  onlyField: TextField;
  onlyText: string;
  dedupe: boolean;
  deleted: number[];
}

export const ALL: Selection = {
  cals: null, from: null, to: null, years: null, hidePast: false, today: 0, dropWords: [], dropCancelled: false,
  dropTentative: false, onlyField: 'summary', onlyText: '', dedupe: false, deleted: []
};

export function fieldText(ev: IcsEvent, f: TextField): string {
  switch (f) {
    case 'summary': return ev.summary;
    case 'description': return ev.description;
    case 'location': return ev.location;
    case 'categories': return ev.categories.join(', ');
    case 'organizer': return ev.organizer;
  }
}

export interface SelectionResult {
  groups: Group[];
  removed: { range: number; words: number; cancelled: number; tentative: number; text: number; duplicates: number; deleted: number; calendars: number };
}

export function select(all: Group[], s: Selection): SelectionResult {
  const removed = { range: 0, words: 0, cancelled: 0, tentative: 0, text: 0, duplicates: 0, deleted: 0, calendars: 0 };
  const from = s.hidePast ? Math.max(s.from ?? -Infinity, s.today) : (s.from ?? -Infinity);
  const to = s.to === null ? Infinity : s.to + DAY - 1;
  const years = s.years;
  const words = s.dropWords.map((w) => w.toLowerCase()).filter(Boolean);
  const only = s.onlyText.trim().toLowerCase();
  const deleted = s.deleted.length ? new Set(s.deleted) : null;
  const cals = s.cals ? new Set(s.cals) : null;
  const seen = s.dedupe ? new Set<string>() : null;
  const out: Group[] = [];
  const count = (g: Group) => g.events.length;

  for (const g of all) {
    if (cals && !cals.has(g.cal)) { removed.calendars += count(g); continue; }
    // Zeitraum: Serien bleiben, wenn sie im Zeitraum Termine haben können
    const lo = g.first;
    const hi = g.last;
    if (hi < from || lo > to) { removed.range += count(g); continue; }
    if (years) {
      const a = Math.max(lo, from), b = Math.min(hi, to);
      const y0 = new Date(a).getUTCFullYear();
      const y1 = b === Infinity ? 9999 : new Date(b).getUTCFullYear();
      if (!s.years!.some((y) => y >= y0 && y <= y1)) { removed.range += count(g); continue; }
    }
    const m = g.master;
    if (s.dropCancelled && m.status === 'CANCELLED') { removed.cancelled += count(g); continue; }
    if (s.dropTentative && m.status === 'TENTATIVE') { removed.tentative += count(g); continue; }
    if (words.length) {
      const t = m.summary.toLowerCase();
      if (words.some((w) => t.includes(w))) { removed.words += count(g); continue; }
    }
    if (only && !fieldText(m, s.onlyField).toLowerCase().includes(only)) { removed.text += count(g); continue; }
    if (deleted && g.events.some((e) => deleted.has(e.id))) {
      const rest = g.events.filter((e) => !deleted.has(e.id));
      removed.deleted += g.events.length - rest.length;
      if (!rest.length) continue;
      if (rest.length !== g.events.length) { out.push({ ...g, events: rest, master: rest.includes(g.master) ? g.master : rest[0] }); continue; }
    }
    if (seen && !g.series && g.events.length === 1) {
      const k = m.cal + '|' + m.summary + '|' + (m.start?.raw ?? '') + '|' + (m.end?.raw ?? '');
      if (seen.has(k)) { removed.duplicates++; continue; }
      seen.add(k);
    }
    out.push(g);
  }
  return { groups: out, removed };
}

// ---------------------------------------------------------------- Aufteilen in Ziel-Kalender

export type SplitMode = 'none' | 'source' | 'rules' | 'years';

export interface Rule { field: TextField; op: 'word' | 'contains' | 'starts'; value: string }
export interface Target { id: string; name: string; rules: Rule[] }

export interface SplitConfig {
  mode: SplitMode;
  targets: Target[];
  /** Termin passt zu mehreren Zielen: in alle kopieren oder nur ins erste */
  multi: 'all' | 'first';
  includeRest: boolean;
  restName: string;
  /** Von Hand verschobene Termine: Termin-ID → Ziel-ID (oder 'rest'); hat Vorrang vor den Regeln */
  manual?: Record<number, string>;
}

export const NO_SPLIT: SplitConfig = { mode: 'none', targets: [], multi: 'all', includeRest: true, restName: 'Sonstige' };

const reCache = new Map<string, RegExp>();
function wordRe(v: string): RegExp {
  let r = reCache.get(v);
  if (!r) {
    const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    r = new RegExp('(^|[^\\p{L}\\p{N}])' + esc + '(?=$|[^\\p{L}\\p{N}])', 'iu');
    reCache.set(v, r);
  }
  return r;
}

export function ruleMatches(ev: IcsEvent, r: Rule): boolean {
  const v = r.value.trim();
  if (!v) return false;
  const text = fieldText(ev, r.field);
  if (r.op === 'word') return wordRe(v).test(text);
  if (r.op === 'starts') return text.trimStart().toLowerCase().startsWith(v.toLowerCase());
  return text.toLowerCase().includes(v.toLowerCase());
}

export interface Bucket { key: string; name: string; groups: Group[]; rest?: boolean }

export function assign(groups: Group[], cfg: SplitConfig, cals: IcsCalendar[], lang: 'de' | 'en' = 'de'): { buckets: Bucket[]; multiMatched: number } {
  let multiMatched = 0;
  if (cfg.mode === 'none') return { buckets: [{ key: 'all', name: '', groups }], multiMatched };
  if (cfg.mode === 'source') {
    const byCal = new Map<number, Bucket>();
    for (const g of groups) {
      let b = byCal.get(g.cal);
      if (!b) {
        const c = cals.find((x) => x.index === g.cal);
        b = { key: 'cal' + g.cal, name: c?.name || c?.fileName || 'Kalender ' + (g.cal + 1), groups: [] };
        byCal.set(g.cal, b);
      }
      b.groups.push(g);
    }
    return { buckets: [...byCal.values()], multiMatched };
  }
  if (cfg.mode === 'years') {
    const byYear = new Map<string, Bucket>();
    const seriesName = lang === 'de' ? 'Serientermine' : 'Recurring events';
    for (const g of groups) {
      const k = g.series ? 'serien' : String(wallParts(g.first).y);
      let b = byYear.get(k);
      if (!b) { b = { key: 'y' + k, name: g.series ? seriesName : k, groups: [] }; byYear.set(k, b); }
      b.groups.push(g);
    }
    return { buckets: [...byYear.values()].sort((a, b) => a.name.localeCompare(b.name)), multiMatched };
  }
  const buckets: Bucket[] = cfg.targets.map((t) => ({ key: t.id, name: t.name, groups: [] }));
  const rest: Bucket = { key: 'rest', name: cfg.restName, groups: [], rest: true };
  const manual = cfg.manual && Object.keys(cfg.manual).length ? cfg.manual : null;
  const idx = new Map(cfg.targets.map((t, i) => [t.id, i]));
  for (const g of groups) {
    if (manual) {
      const hit = g.events.find((e) => manual[e.id] !== undefined);
      if (hit) {
        const to = manual[hit.id];
        if (to === 'rest' || !idx.has(to)) rest.groups.push(g); else buckets[idx.get(to)!].groups.push(g);
        continue;
      }
    }
    let hits = 0;
    for (let i = 0; i < cfg.targets.length; i++) {
      const t = cfg.targets[i];
      if (t.rules.some((r) => ruleMatches(g.master, r))) {
        hits++;
        if (hits === 1 || cfg.multi === 'all') buckets[i].groups.push(g);
        if (cfg.multi === 'first') break;
      }
    }
    if (hits > 1) multiMatched++;
    if (hits === 0) rest.groups.push(g);
  }
  if (cfg.includeRest && rest.groups.length) buckets.push(rest);
  return { buckets, multiMatched };
}

// ---------------------------------------------------------------- Teile und Dateien

export interface OutPart {
  index: number;
  groups: Group[];
  events: number;
  bytes: number;
  from: number;
  to: number;
}

export interface OutCalendar {
  key: string;
  name: string;
  slug: string;
  events: number;
  bytes: number;
  parts: OutPart[];
  rest?: boolean;
  /** Kopf und Zeitzonen sind für alle Teile eines Kalenders gleich – so stimmt die Größenvorhersage aufs Byte. */
  head: string[];
  tz: string[][];
}

function tzBlocksFor(cals: IcsCalendar[], groups: Group[]): string[][] {
  const calIdx = new Set(groups.map((g) => g.cal));
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const c of cals) {
    if (!calIdx.has(c.index)) continue;
    for (const tz of c.timezones) {
      const id = timezoneId(tz);
      if (!seen.has(id)) { seen.add(id); out.push(tz); }
    }
  }
  return out;
}

function headerFor(cals: IcsCalendar[], groups: Group[], name: string) {
  const first = cals.find((c) => c.index === (groups[0]?.cal ?? cals[0]?.index)) ?? cals[0];
  return headerLines(first ?? { header: [], timezone: 'Europe/Berlin' }, name || first?.name || null);
}

/** Packt Gruppen chronologisch in Teile, deren Dateigröße unter limit bleibt. Gruppen werden nie zerteilt. */
export function packParts(groups: Group[], sizes: Int32Array, overhead: number, limit = PART_LIMIT): OutPart[] {
  const parts: OutPart[] = [];
  let cur: OutPart | null = null;
  let singles = 0;
  for (const g of groups) {
    let b = 0;
    for (const e of g.events) b += sizes[e.id];
    if (!cur || (cur.bytes + b > limit && cur.groups.length > 0)) {
      cur = { index: parts.length, groups: [], events: 0, bytes: overhead, from: g.first, to: g.first };
      parts.push(cur);
      singles = 0;
    }
    cur.groups.push(g);
    cur.events += g.events.length;
    cur.bytes += b;
    // Zeitraum eines Teils: nach Einzelterminen; alte Serien (z. B. Geburtstage ab 1960) verzerren ihn sonst
    if (!g.series) {
      cur.from = singles === 0 ? g.first : Math.min(cur.from, g.first);
      cur.to = singles === 0 ? g.last : Math.max(cur.to, g.last);
      singles++;
    } else if (singles === 0) {
      cur.from = Math.min(cur.from, g.first);
      cur.to = Math.max(cur.to, g.first);
    }
  }
  return parts;
}

export function planCalendars(buckets: Bucket[], cals: IcsCalendar[], sizes: Int32Array, limit = PART_LIMIT): OutCalendar[] {
  const used = new Set<string>();
  return buckets.map((b) => {
    const head = headerFor(cals, b.groups, b.name);
    const tz = tzBlocksFor(cals, b.groups);
    const overhead = linesBytes(head) + tz.reduce((a, x) => a + linesBytes(x), 0) + FOOTER_BYTES;
    const parts = packParts(b.groups, sizes, overhead, limit);
    let slug = slugify(b.name || 'kalender');
    while (used.has(slug)) slug += '-2';
    used.add(slug);
    const events = parts.reduce((a, p) => a + p.events, 0);
    const bytes = parts.reduce((a, p) => a + p.bytes, 0);
    return { key: b.key, name: b.name, slug, events, bytes, parts, rest: b.rest, head, tz };
  });
}

/** Erzeugt den Dateiinhalt eines Teils. */
export function buildPart(part: OutPart, cal: OutCalendar, clean: CleanOptions, uidSalt: string): string {
  const evLines: string[][] = [];
  for (const g of part.groups) for (const e of g.events) evLines.push(cleanEvent(e, clean, uidSalt));
  return writeIcs(cal.head, cal.tz, evLines);
}

export function partFileName(cal: OutCalendar, part: OutPart, multiCal: boolean, ext = 'ics'): string {
  const y = (w: number) => { const p = wallParts(w); return p.y + '-' + String(p.mo).padStart(2, '0'); };
  const base = multiCal || cal.name ? cal.slug : 'kalender';
  const n = cal.parts.length;
  return `${base}${n > 1 ? `_teil-${part.index + 1}-von-${n}` : ''}_${y(part.from)}-bis-${y(part.to)}.${ext}`;
}
