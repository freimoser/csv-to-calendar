// Kennzahlen pro Kalender und Vorschläge, wie man ihn aufteilen könnte.
// Alles läuft lokal; die Werte werden nur im Browser angezeigt.

import type { IcsCalendar, IcsEvent } from './ics';
import { buildGroups, hasEmail, hasPhone, PART_LIMIT, type Group } from './plan';
import { wallParts } from './datetime';

export interface CalendarStats {
  index: number;
  name: string;
  fileName: string;
  timezone: string;
  events: number;
  groups: number;
  singles: number;
  seriesMasters: number;
  exceptions: number;
  allDay: number;
  timed: number;
  first: number | null;
  last: number | null;
  /** Großteil der Termine (1.–99. Perzentil), damit alte Geburtstagsserien den Zeitraum nicht verzerren */
  mainFrom: number | null;
  mainTo: number | null;
  bytes: number;
  avgBytes: number;
  partsNeeded: number;
  withDescription: number;
  descriptionBytes: number;
  withLocation: number;
  withAttendees: number;
  withAlarm: number;
  withAttachment: number;
  withConference: number;
  adminBytes: number;
  cancelled: number;
  tentative: number;
  privateCount: number;
  duplicates: number;
  phoneInTitle: number;
  phoneInDescription: number;
  emailInTitle: number;
  emailInDescription: number;
  perYear: { year: number; count: number }[];
  perWeekday: number[];
  maxParallel: number;
  parallelShare: number;
  timezonesUsed: string[];
  floating: number;
  otherComponents: Record<string, number>;
  problems: { noStart: number; endBeforeStart: number; noUid: number; noSummary: number };
}

export interface SuggestionValue { value: string; count: number; from: number; to: number; years: number }

export interface Suggestion {
  kind: 'calendars' | 'initials' | 'prefix' | 'categories' | 'organizer' | 'status' | 'years' | 'type';
  /** Anteil der Termine, die einer Gruppe zugeordnet werden können (0..1) */
  coverage: number;
  values: SuggestionValue[];
  score: number;
}

const STATUS_WORDS = ['abgesagt', 'storniert', 'verschoben', 'nicht erschienen', 'absage', 'ausgefallen', 'fällt aus', 'cancelled', 'canceled', 'postponed', 'no show', 'no-show'];

const ADMIN_RE = /^(CREATED|LAST-MODIFIED|SEQUENCE|X-(?!GOOGLE-CONFERENCE)[A-Z0-9-]+)[;:]/i;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];
}

export function calendarStats(cal: IcsCalendar, groups?: Group[]): CalendarStats {
  const evs = cal.events;
  const gs = groups ?? buildGroups(evs);
  const st: CalendarStats = {
    index: cal.index, name: cal.name, fileName: cal.fileName, timezone: cal.timezone, events: evs.length, groups: gs.length,
    singles: 0, seriesMasters: 0, exceptions: 0, allDay: 0, timed: 0, first: null, last: null, mainFrom: null, mainTo: null,
    bytes: 0, avgBytes: 0, partsNeeded: 0, withDescription: 0, descriptionBytes: 0, withLocation: 0, withAttendees: 0,
    withAlarm: 0, withAttachment: 0, withConference: 0, adminBytes: 0, cancelled: 0, tentative: 0, privateCount: 0,
    duplicates: 0, phoneInTitle: 0, phoneInDescription: 0, emailInTitle: 0, emailInDescription: 0, perYear: [],
    perWeekday: [0, 0, 0, 0, 0, 0, 0], maxParallel: 0, parallelShare: 0, timezonesUsed: [], floating: 0,
    otherComponents: cal.otherComponents, problems: { noStart: 0, endBeforeStart: 0, noUid: 0, noSummary: 0 }
  };
  const years = new Map<number, number>();
  const starts: number[] = [];
  const tz = new Set<string>();
  const dup = new Set<string>();
  const intervals: [number, number][] = [];
  let bytes = 0;
  for (const e of evs) {
    bytes += e.bytes;
    if (e.recurrenceId) st.exceptions++;
    else if (e.rrule) st.seriesMasters++;
    else st.singles++;
    if (!e.start) { st.problems.noStart++; continue; }
    const s = e.start.wall;
    starts.push(s);
    if (e.start.allDay) st.allDay++; else st.timed++;
    if (e.start.tzid) tz.add(e.start.tzid);
    if (!e.start.allDay && !e.start.utc && !e.start.tzid) st.floating++;
    if (e.end && e.end.wall < s) st.problems.endBeforeStart++;
    if (!e.uid) st.problems.noUid++;
    if (!e.summary.trim()) st.problems.noSummary++;
    const y = wallParts(s).y;
    years.set(y, (years.get(y) || 0) + 1);
    st.perWeekday[(new Date(s).getUTCDay() + 6) % 7]++;
    if (e.description) { st.withDescription++; st.descriptionBytes += e.description.length; }
    if (e.location) st.withLocation++;
    if (e.attendees) st.withAttendees++;
    if (e.alarms) st.withAlarm++;
    if (e.attachments) st.withAttachment++;
    if (e.conference) st.withConference++;
    if (e.status === 'CANCELLED') st.cancelled++;
    if (e.status === 'TENTATIVE') st.tentative++;
    if (e.cls === 'PRIVATE' || e.cls === 'CONFIDENTIAL') st.privateCount++;
    if (hasPhone(e.summary)) st.phoneInTitle++;
    if (e.description && hasPhone(e.description)) st.phoneInDescription++;
    if (hasEmail(e.summary)) st.emailInTitle++;
    if (e.description && hasEmail(e.description)) st.emailInDescription++;
    for (const l of e.lines) if (ADMIN_RE.test(l)) st.adminBytes += l.length + 2;
    if (!e.rrule && !e.recurrenceId) {
      const k = e.summary + '|' + e.start.raw + '|' + (e.end?.raw ?? '');
      if (dup.has(k)) st.duplicates++; else dup.add(k);
    }
    if (!e.start.allDay && e.end && e.end.wall > s && !e.rrule) intervals.push([s, e.end.wall]);
  }
  st.bytes = bytes + 200;
  st.avgBytes = evs.length ? Math.round(bytes / evs.length) : 0;
  st.partsNeeded = Math.max(1, Math.ceil(st.bytes / (PART_LIMIT - 2000)));
  starts.sort((a, b) => a - b);
  if (starts.length) {
    st.first = starts[0];
    st.last = starts[starts.length - 1];
    st.mainFrom = percentile(starts, 0.01);
    st.mainTo = percentile(starts, 0.99);
  }
  st.perYear = [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
  st.timezonesUsed = [...tz];
  // Gleichzeitig laufende Termine – ein Hinweis darauf, dass mehrere Personen in diesem Kalender planen
  intervals.sort((a, b) => a[0] - b[0]);
  const ends: number[] = [];
  let overl = 0;
  for (const [a, b] of intervals) {
    // einfacher Min-Heap
    while (ends.length && ends[0] <= a) heapPop(ends);
    if (ends.length) overl++;
    heapPush(ends, b);
    if (ends.length > st.maxParallel) st.maxParallel = ends.length;
  }
  st.parallelShare = intervals.length ? overl / intervals.length : 0;
  return st;
}

function heapPush(h: number[], v: number) {
  h.push(v);
  let i = h.length - 1;
  while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function heapPop(h: number[]) {
  const last = h.pop()!;
  if (!h.length) return;
  h[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1, r = l + 1;
    let m = i;
    if (l < h.length && h[l] < h[m]) m = l;
    if (r < h.length && h[r] < h[m]) m = r;
    if (m === i) break;
    [h[m], h[i]] = [h[i], h[m]];
    i = m;
  }
}

// ---------------------------------------------------------------- Vorschläge

function collect(evs: IcsEvent[], keyFn: (e: IcsEvent) => string[] | string | null) {
  const m = new Map<string, { count: number; from: number; to: number; years: Set<number> }>();
  let covered = 0;
  for (const e of evs) {
    const k = keyFn(e);
    const keys = k === null ? [] : Array.isArray(k) ? k : [k];
    if (keys.length) covered++;
    const s = e.start?.wall ?? 0;
    for (const key of keys) {
      let v = m.get(key);
      if (!v) { v = { count: 0, from: s, to: s, years: new Set() }; m.set(key, v); }
      v.count++;
      v.from = Math.min(v.from, s);
      v.to = Math.max(v.to, s);
      v.years.add(wallParts(s).y);
    }
  }
  const values = [...m.entries()].map(([value, v]) => ({ value, count: v.count, from: v.from, to: v.to, years: v.years.size }))
    .sort((a, b) => b.count - a.count);
  return { values, covered };
}

const TOKEN_SPLIT = /[\s,/+()[\]:;|]+/;
// Häufige Großbuchstaben-Abkürzungen, die eher Fachbegriffe als Personen sind.
const NOT_INITIALS = new Set(['OP', 'TA', 'TÄ', 'KW', 'MRT', 'CT', 'EKG', 'USA', 'PC', 'TV', 'DE', 'EN', 'ZOOM', 'TEL', 'NEU', 'FR', 'MO', 'DI', 'MI', 'DO', 'SA', 'SO', 'UND', 'MIT', 'AM', 'PM', 'GMBH', 'AG', 'BWA', 'ID']);

/** Vorschläge, wie sich die ausgewählten Termine aufteilen lassen. */
export function suggest(cals: IcsCalendar[], evs: IcsEvent[]): Suggestion[] {
  const out: Suggestion[] = [];
  const n = evs.length || 1;
  const masters = evs.filter((e) => !e.recurrenceId);
  const nm = masters.length || 1;

  if (cals.length > 1) {
    const values = cals.map((c) => {
      const s = c.events.map((e) => e.start?.wall ?? 0).filter(Boolean);
      return { value: c.name || c.fileName, count: c.events.length, from: Math.min(...s), to: Math.max(...s), years: 0 };
    });
    out.push({ kind: 'calendars', coverage: 1, values, score: 100 });
  }

  // Kürzel (z. B. Mitarbeiter-Initialen) in den ersten Wörtern des Titels
  const minCount = Math.max(15, Math.round(nm * 0.003));
  const ini = collect(masters, (e) => {
    const toks = e.summary.split(TOKEN_SPLIT).slice(0, 4);
    const hits = new Set<string>();
    for (const t of toks) if (/^[A-ZÄÖÜ]{2,3}$/.test(t) && !NOT_INITIALS.has(t)) hits.add(t);
    return hits.size ? [...hits] : null;
  });
  const iniVals = ini.values.filter((v) => v.count >= minCount);
  if (iniVals.length >= 2 && iniVals.length <= 60) {
    const set = new Set(iniVals.map((v) => v.value));
    const covered = masters.filter((e) => e.summary.split(TOKEN_SPLIT).slice(0, 4).some((t) => set.has(t))).length;
    const coverage = covered / nm;
    if (coverage >= 0.08) out.push({ kind: 'initials', coverage, values: iniVals, score: 60 + coverage * 40 });
  }

  // Titel-Anfang (Terminarten wie "OP", "Impfung", "Online")
  const pre = collect(masters, (e) => {
    const w = e.summary.trim().split(/\s+/)[0];
    return w && w.length <= 20 ? w : null;
  });
  const preVals = pre.values.filter((v) => v.count / nm >= 0.02).slice(0, 12);
  const preCov = preVals.reduce((a, v) => a + v.count, 0) / nm;
  if (preVals.length >= 2 && preCov >= 0.4) out.push({ kind: 'prefix', coverage: preCov, values: preVals, score: 40 + preCov * 30 });

  // Kategorien
  const cat = collect(masters, (e) => (e.categories.length ? e.categories : null));
  const catVals = cat.values.filter((v) => v.count >= Math.max(5, nm * 0.005));
  if (catVals.length >= 1 && cat.covered / nm >= 0.02) out.push({ kind: 'categories', coverage: cat.covered / nm, values: catVals.slice(0, 30), score: 50 + (cat.covered / nm) * 40 });

  // Organisator (bei Termine mit Gästen)
  const org = collect(masters, (e) => (e.organizer ? e.organizer.toLowerCase() : null));
  const orgVals = org.values.filter((v) => v.count >= Math.max(5, nm * 0.005));
  if (orgVals.length >= 2 && org.covered / nm >= 0.1) out.push({ kind: 'organizer', coverage: org.covered / nm, values: orgVals.slice(0, 30), score: 55 + (org.covered / nm) * 40 });

  // Status-Wörter (abgesagt, verschoben …) → aussortieren
  const status = collect(evs, (e) => {
    const t = e.summary.toLowerCase();
    const hit = STATUS_WORDS.filter((w) => t.includes(w));
    if (e.status === 'CANCELLED') hit.push('STATUS:CANCELLED');
    return hit.length ? hit : null;
  });
  if (status.values.length) out.push({ kind: 'status', coverage: status.covered / n, values: status.values, score: 30 });

  // Art: Serien, ganztägig
  const type = collect(evs, (e) => (e.rrule && !e.recurrenceId ? 'series' : e.start?.allDay ? 'allday' : null));
  if (type.values.length) out.push({ kind: 'type', coverage: type.covered / n, values: type.values, score: 20 });

  // Jahre – geht immer
  const yr = collect(evs, (e) => (e.start ? String(wallParts(e.start.wall).y) : null));
  out.push({ kind: 'years', coverage: 1, values: yr.values.sort((a, b) => a.value.localeCompare(b.value)), score: 10 });

  return out.sort((a, b) => b.score - a.score);
}
