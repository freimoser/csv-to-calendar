// Serientermine für die Monatsansicht ausrollen (RFC 5545, RRULE) – bewusst schlank:
// FREQ=DAILY/WEEKLY/MONTHLY/YEARLY mit INTERVAL, COUNT, UNTIL, BYDAY, BYMONTH, BYMONTHDAY und EXDATE.
// Für die Anzeige gedacht; der Export lässt Serien unverändert.

import type { IcsEvent } from './ics';
import { splitProp } from './ics';
import { DAY } from './datetime';

const WD: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

interface Rule { freq: string; interval: number; count: number | null; until: number | null; byday: { n: number; wd: number }[]; bymonth: number[]; bymonthday: number[] }

function parseRule(r: string): Rule {
  const p: Record<string, string> = {};
  for (const part of r.split(';')) { const [k, v] = part.split('='); if (k && v) p[k.toUpperCase()] = v; }
  let until: number | null = null;
  if (p.UNTIL) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(p.UNTIL);
    if (m) until = Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 23, m[5] ? +m[5] : 59, m[6] ? +m[6] : 59);
  }
  return {
    freq: (p.FREQ || 'DAILY').toUpperCase(),
    interval: Math.max(1, +(p.INTERVAL || 1)),
    count: p.COUNT ? +p.COUNT : null,
    until,
    byday: (p.BYDAY || '').split(',').filter(Boolean).map((x) => { const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(x.trim().toUpperCase()); return m ? { n: m[1] ? +m[1] : 0, wd: WD[m[2]] } : null; }).filter((x): x is { n: number; wd: number } => !!x && x.wd !== undefined),
    bymonth: (p.BYMONTH || '').split(',').filter(Boolean).map(Number),
    bymonthday: (p.BYMONTHDAY || '').split(',').filter(Boolean).map(Number)
  };
}

const dayKey = (w: number) => Math.floor(w / DAY);
const ymd = (w: number) => { const d = new Date(w); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] as const; };
const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

function exdates(ev: IcsEvent): Set<number> {
  const s = new Set<number>();
  for (const l of ev.lines) {
    if (!/^EXDATE/i.test(l)) continue;
    for (const v of splitProp(l).value.split(',')) {
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
      if (m) s.add(dayKey(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    }
  }
  return s;
}

/** Tage eines Monats, an denen eine Regel greift (nur Datumsteil). */
function daysInMonth(rule: Rule, y: number, m: number, start: number): number[] {
  const [, sm, sd] = ymd(start);
  const startWd = new Date(start).getUTCDay();
  const n = dim(y, m);
  const out: number[] = [];
  if (rule.bymonth.length && !rule.bymonth.includes(m + 1)) return out;
  if (rule.freq === 'YEARLY' && !rule.bymonth.length && m !== sm) return out;
  if (rule.bymonthday.length) {
    for (const d of rule.bymonthday) { const day = d < 0 ? n + 1 + d : d; if (day >= 1 && day <= n) out.push(day); }
    return out.sort((a, b) => a - b);
  }
  if (rule.byday.length && rule.freq !== 'WEEKLY') {
    for (const { n: nth, wd } of rule.byday) {
      const all: number[] = [];
      for (let d = 1; d <= n; d++) if (new Date(Date.UTC(y, m, d)).getUTCDay() === wd) all.push(d);
      if (nth === 0) out.push(...all);
      else { const pick = nth > 0 ? all[nth - 1] : all[all.length + nth]; if (pick) out.push(pick); }
    }
    return out.sort((a, b) => a - b);
  }
  if (rule.freq === 'WEEKLY' || rule.freq === 'DAILY') {
    const wds = rule.freq === 'WEEKLY' ? (rule.byday.length ? rule.byday.map((x) => x.wd) : [startWd]) : null;
    for (let d = 1; d <= n; d++) if (!wds || wds.includes(new Date(Date.UTC(y, m, d)).getUTCDay())) out.push(d);
    return out;
  }
  if (sd <= n) out.push(sd);
  return out;
}

/** Alle Termine einer Serie zwischen from und to (Wandzeit, ms). */
export function occurrences(ev: IcsEvent, from: number, to: number, limit = 400): number[] {
  if (!ev.start || !ev.rrule) return [];
  const rule = parseRule(ev.rrule);
  const start = ev.start.wall;
  const timeOfDay = start - Math.floor(start / DAY) * DAY;
  const ex = exdates(ev);
  const out: number[] = [];
  const [sy, sm] = ymd(start);
  // Für COUNT müssen wir ab dem Beginn zählen; sonst direkt beim Zeitraum einsteigen.
  const fromMonth = rule.count === null ? Math.max(sy * 12 + sm, ymd(from)[0] * 12 + ymd(from)[1]) : sy * 12 + sm;
  const toMonth = ymd(to)[0] * 12 + ymd(to)[1];
  let counted = 0;
  const startWeek = Math.floor((dayKey(start) + 3) / 7); // Wochen ab Montag
  for (let mm = fromMonth; mm <= toMonth; mm++) {
    const y = Math.floor(mm / 12), m = mm % 12;
    const monthsSince = mm - (sy * 12 + sm);
    if (rule.freq === 'MONTHLY' && monthsSince % rule.interval !== 0) continue;
    if (rule.freq === 'YEARLY' && (y - sy) % rule.interval !== 0) continue;
    for (const d of daysInMonth(rule, y, m, start)) {
      const day = Date.UTC(y, m, d);
      const w = day + timeOfDay;
      if (w < start) continue;
      if (rule.freq === 'DAILY' && (dayKey(day) - dayKey(start)) % rule.interval !== 0) continue;
      if (rule.freq === 'WEEKLY' && (Math.floor((dayKey(day) + 3) / 7) - startWeek) % rule.interval !== 0) continue;
      if (rule.until !== null && w > rule.until) return out;
      counted++;
      if (rule.count !== null && counted > rule.count) return out;
      if (w > to) return out;
      if (w >= from && !ex.has(dayKey(day))) { out.push(w); if (out.length >= limit) return out; }
    }
  }
  return out;
}
