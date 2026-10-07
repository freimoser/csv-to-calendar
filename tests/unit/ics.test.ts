import { describe, expect, it } from 'vitest';
import ICAL from 'ical.js';
import { foldLine, foldedLen, utf8Len, escapeText, unescapeText, CRLF } from '../../src/lib/text';
import { parseIcs } from '../../src/lib/ics';
import { samplePracticeIcs, SAMPLE_STAFF } from '../../src/lib/sample';
import { ALL, NO_CLEAN, NO_SPLIT, PART_LIMIT, assign, buildGroups, buildPart, cleanedSizes, planCalendars, select, type CleanOptions, type SplitConfig } from '../../src/lib/plan';
import { calendarStats, suggest } from '../../src/lib/analyze';
import { readIcsInput } from '../../src/lib/input';
import { zipSync, strToU8 } from 'fflate';

function validIcs(text: string) {
  // ical.js muss die Datei fehlerfrei lesen; Rahmen wie in answer/37118 beschrieben
  expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
  expect(text).toMatch(/\r\nVERSION:2\.0\r\n/);
  expect(text).toMatch(/\r\nPRODID:/);
  for (const line of text.split('\r\n')) expect(utf8Len(line)).toBeLessThanOrEqual(75);
  const comp = new ICAL.Component(ICAL.parse(text));
  return comp;
}

describe('Zeilen falten (RFC 5545 3.1)', () => {
  it('faltet bei 75 Oktetten und zerteilt keine Umlaute oder Emojis', () => {
    const samples = ['SUMMARY:' + 'ä'.repeat(100), 'DESCRIPTION:' + 'x'.repeat(300), 'SUMMARY:Grüße 🎂 '.repeat(20), 'UID:kurz'];
    for (const s of samples) {
      const f = foldLine(s);
      for (const part of f.split(CRLF)) expect(utf8Len(part)).toBeLessThanOrEqual(75);
      expect(f.split(CRLF + ' ').join('')).toBe(s);
      expect(foldedLen(s)).toBe(utf8Len(f + CRLF));
    }
  });
  it('maskiert Texte umkehrbar', () => {
    const s = 'Termin; mit, Komma\nund \\ Rückstrich';
    expect(unescapeText(escapeText(s))).toBe(s);
  });
});

describe('ICS lesen, analysieren, aufteilen', () => {
  const text = samplePracticeIcs({ perYear: 1600 });
  const cals = parseIcs(text, 'praxis.ics');
  const events = cals[0].events;

  it('liest den Export vollständig', () => {
    expect(cals).toHaveLength(1);
    expect(cals[0].name).toBe('Tierarztpraxis Beispiel');
    expect(cals[0].timezone).toBe('Europe/Berlin');
    expect(events.length).toBeGreaterThan(20000);
    expect(utf8Len(text)).toBeGreaterThan(3_000_000);
  });

  it('berechnet Kennzahlen und erkennt Mitarbeiter-Kürzel und Terminarten', () => {
    const st = calendarStats(cals[0]);
    expect(st.events).toBe(events.length);
    expect(st.seriesMasters).toBe(41);
    expect(st.exceptions).toBe(12);
    expect(st.partsNeeded).toBeGreaterThan(3);
    expect(st.phoneInDescription).toBeGreaterThan(1000);
    expect(new Date(st.mainFrom!).getUTCFullYear()).toBeGreaterThanOrEqual(2010);
    const sug = suggest(cals, events);
    const ini = sug.find((s) => s.kind === 'initials');
    expect(ini).toBeTruthy();
    expect(ini!.values.map((v) => v.value).sort()).toEqual(expect.arrayContaining(SAMPLE_STAFF));
    expect(sug.find((s) => s.kind === 'prefix')).toBeTruthy();
    expect(sug.find((s) => s.kind === 'status')!.values[0].value).toBe('abgesagt');
  });

  it('teilt verlustfrei in gültige Teile unter 950 KB, Größe aufs Byte genau', () => {
    const groups = buildGroups(events);
    const { buckets } = assign(select(groups, ALL).groups, NO_SPLIT, cals);
    const sizes = cleanedSizes(events, NO_CLEAN);
    const [out] = planCalendars(buckets, cals, sizes);
    expect(out.parts.length).toBeGreaterThan(3);
    let n = 0;
    const uidPart = new Map<string, number>();
    for (const p of out.parts) {
      const t = buildPart(p, out, NO_CLEAN, 's');
      expect(utf8Len(t)).toBe(p.bytes);
      expect(p.bytes).toBeLessThanOrEqual(PART_LIMIT);
      const comp = validIcs(t);
      expect(comp.getAllSubcomponents('vtimezone').length).toBe(1);
      for (const v of comp.getAllSubcomponents('vevent')) {
        n++;
        const uid = String(v.getFirstPropertyValue('uid'));
        // Serie und Ausnahmen bleiben im selben Teil
        if (uidPart.has(uid)) expect(uidPart.get(uid)).toBe(p.index);
        uidPart.set(uid, p.index);
      }
    }
    expect(n).toBe(events.length);
  });

  it('behält Serien beim Jahresfilter, wenn sie im Zeitraum Termine haben', () => {
    const groups = buildGroups(events);
    const sel = select(groups, { ...ALL, years: [2024, 2025, 2026] });
    const birthdays = sel.groups.filter((g) => g.series && g.master.summary.startsWith('Geburtstag'));
    expect(birthdays.length).toBe(40);
    const singles = sel.groups.filter((g) => !g.series);
    expect(singles.every((g) => new Date(g.first).getUTCFullYear() >= 2024)).toBe(true);
    const all = select(groups, ALL).groups.length;
    expect(sel.groups.length).toBeLessThan(all / 4);
  });

  it('verkleinert durch Bereinigung, Größe bleibt exakt; neue UIDs bleiben pro Serie gleich', () => {
    const clean: CleanOptions = { ...NO_CLEAN, dropAdmin: true, dropDescription: true, dropAlarms: true, newUids: true, maskPhones: true };
    const groups = buildGroups(events);
    const { buckets } = assign(select(groups, ALL).groups, NO_SPLIT, cals);
    const before = planCalendars(buckets, cals, cleanedSizes(events, NO_CLEAN))[0].bytes;
    const [out] = planCalendars(buckets, cals, cleanedSizes(events, clean));
    expect(out.bytes).toBeLessThan(before * 0.75);
    for (const p of out.parts) {
      const t = buildPart(p, out, clean, 'salz');
      expect(utf8Len(t)).toBe(p.bytes);
      expect(t).not.toMatch(/\r\nDESCRIPTION:Tel/);
      expect(t).not.toMatch(/\r\nCREATED:/);
      expect(t).not.toMatch(/BEGIN:VALARM/);
      validIcs(t);
    }
    const team = out.parts.flatMap((p) => buildPart(p, out, clean, 'salz').split('BEGIN:VEVENT').filter((b) => b.includes('Teambesprechung')));
    const uids = new Set(team.map((b) => /UID:([^\r]+)/.exec(b.replace(/\r\n /g, ''))![1]));
    expect(uids.size).toBe(1);
  });

  it('teilt nach Regeln auf Ziel-Kalender auf (z. B. ein Kalender pro Mitarbeiter)', () => {
    const groups = buildGroups(events);
    const cfg: SplitConfig = {
      ...NO_SPLIT, mode: 'rules', includeRest: true, restName: 'Sonstige', multi: 'all',
      targets: SAMPLE_STAFF.map((k) => ({ id: k, name: 'Kalender ' + k, rules: [{ field: 'summary', op: 'word', value: k }] }))
    };
    const { buckets } = assign(select(groups, ALL).groups, cfg, cals);
    expect(buckets.map((b) => b.name)).toEqual([...SAMPLE_STAFF.map((k) => 'Kalender ' + k), 'Sonstige']);
    const total = buckets.reduce((a, b) => a + b.groups.length, 0);
    expect(total).toBe(groups.length); // Kürzel stehen nur einmal im Titel → keine Doppelten
    const out = planCalendars(buckets, cals, cleanedSizes(events, NO_CLEAN));
    for (const c of out) for (const p of c.parts) {
      const t = buildPart(p, c, NO_CLEAN, 's');
      expect(t).toContain('X-WR-CALNAME:' + c.name);
      expect(utf8Len(t)).toBe(p.bytes);
    }
  });

  it('liest den Google-Export als ZIP mit mehreren Kalendern', () => {
    const a = samplePracticeIcs({ perYear: 50, name: 'Praxis', seed: 1 });
    const b = samplePracticeIcs({ perYear: 30, name: 'Privat', seed: 2 });
    const zip = zipSync({ 'praxis@example.com.ical/Praxis_abc.ics': strToU8(a), 'praxis@example.com.ical/Privat_def.ics': strToU8(b) });
    const input = readIcsInput('export.zip', zip);
    expect(input.calendars.map((c) => c.name).sort()).toEqual(['Praxis', 'Privat']);
    const all = input.calendars.flatMap((c) => c.events);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    const sug = suggest(input.calendars, all);
    expect(sug[0].kind).toBe('calendars');
    const { buckets } = assign(buildGroups(all), { ...NO_SPLIT, mode: 'source' }, input.calendars);
    expect(buckets).toHaveLength(2);
  });
});
