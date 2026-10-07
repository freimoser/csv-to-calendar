// Einzelne Termine bearbeiten: Titel, Beschreibung, Ort, Beginn und Ende.
// Die übrigen Zeilen des Termins (UID, Erinnerungen, Serienregel …) bleiben unverändert.

import type { IcsEvent } from './ics';
import { splitProp } from './ics';
import { escapeText } from './text';
import { DAY, icsStamp, wallToUtc } from './datetime';

export interface Patch {
  summary?: string;
  description?: string;
  location?: string;
  /** "2026-03-01" (ganztägig) oder "2026-03-01T09:30" (Wandzeit in der Kalender-Zeitzone) */
  start?: string;
  /** wie start; bei ganztägig ist das Datum der letzte Tag (inklusive) */
  end?: string;
}

function parseLocal(s: string): { wall: number; allDay: boolean } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s.trim());
  if (!m) return null;
  return { wall: Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0), allDay: !m[4] };
}

function dateLine(name: 'DTSTART' | 'DTEND', wall: number, allDay: boolean, tz: string, useTzid: boolean): string {
  if (allDay) return `${name};VALUE=DATE:${icsStamp(wall, false)}`;
  if (useTzid) return `${name};TZID=${tz}:${icsStamp(wall, true)}`;
  return `${name}:${icsStamp(wallToUtc(wall, tz), true)}Z`;
}

/**
 * Wendet Änderungen auf die Zeilen eines Termins an.
 * useTzid: Uhrzeiten mit TZID der Kalender-Zeitzone schreiben (nur wenn ein passender VTIMEZONE-Block vorhanden ist), sonst in UTC.
 */
export function applyPatch(ev: IcsEvent, p: Patch, tz: string, useTzid: boolean): string[] {
  const text: Record<string, string | undefined> = { SUMMARY: p.summary, DESCRIPTION: p.description, LOCATION: p.location };
  const start = p.start !== undefined ? parseLocal(p.start) : null;
  let end = p.end !== undefined ? parseLocal(p.end) : null;
  if (start && end && start.allDay) end = { wall: end.wall + DAY, allDay: true }; // ICS-Ende ist exklusiv
  if (start && !end && start.allDay) end = { wall: start.wall + DAY, allDay: true };
  if (start && end && end.wall <= start.wall) end = { wall: start.allDay ? start.wall + DAY : start.wall + 30 * 60000, allDay: start.allDay };
  const out: string[] = [];
  const seen = new Set<string>();
  let depth = 0;
  // RFC 5545: Eigenschaften stehen vor eingebetteten Komponenten (VALARM) – fehlende Felder dort einfügen
  let insertAt = -1;
  for (let i = 0; i < ev.lines.length; i++) {
    const l = ev.lines[i];
    const last = i === ev.lines.length - 1;
    if (i > 0 && !last) {
      if (/^BEGIN:/i.test(l)) { if (depth === 0 && insertAt < 0) insertAt = out.length; depth++; }
      else if (/^END:/i.test(l)) depth--;
      else if (depth === 0) {
        const name = splitProp(l).name;
        if (name in text && text[name] !== undefined) {
          seen.add(name);
          if (text[name] !== '' || name === 'SUMMARY') out.push(`${name}:${escapeText(text[name]!)}`);
          continue;
        }
        if (start && name === 'DTSTART') { seen.add(name); out.push(dateLine('DTSTART', start.wall, start.allDay, tz, useTzid)); continue; }
        if (start && end && name === 'DTEND') { seen.add(name); out.push(dateLine('DTEND', end.wall, end.allDay, tz, useTzid)); continue; }
        if (start && end && name === 'DURATION') continue;
      }
    }
    if (last && insertAt < 0) insertAt = out.length;
    out.push(l);
  }
  const add: string[] = [];
  for (const [name, v] of Object.entries(text)) if (v !== undefined && v !== '' && !seen.has(name)) add.push(`${name}:${escapeText(v)}`);
  if (start && !seen.has('DTSTART')) add.push(dateLine('DTSTART', start.wall, start.allDay, tz, useTzid));
  if (start && end && !seen.has('DTEND')) add.push(dateLine('DTEND', end.wall, end.allDay, tz, useTzid));
  out.splice(insertAt, 0, ...add);
  return out;
}
