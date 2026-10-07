import { describe, expect, it } from 'vitest';
import ICAL from 'ical.js';
import { strToU8 } from 'fflate';
import { loadIcs, editEvent, getEvent, listEvents, build, plan, DEFAULT_CLEAN, DEFAULT_SELECTION, DEFAULT_SPLIT } from '../../src/lib/engine';
import { samplePracticeIcs } from '../../src/lib/sample';

describe('Termine bearbeiten und von Hand verschieben', () => {
  const loaded = loadIcs('praxis.ics', strToU8(samplePracticeIcs({ perYear: 60, seed: 11 })));
  const req = () => ({ selection: { ...DEFAULT_SELECTION }, clean: { ...DEFAULT_CLEAN }, split: { ...DEFAULT_SPLIT }, format: 'ics' as const });

  it('ändert Titel, Ort und Zeit; die Datei bleibt gültig und die Änderung landet im Export', () => {
    expect(loaded.calendars[0].events).toBeGreaterThan(500);
    const first = listEvents(req(), 'Kontrolle', null, 0, 5).rows.find((r) => !r.series && !r.allDay)!;
    const d = editEvent(first.id, { summary: 'Neuer Titel, mit Komma', location: 'Raum 3', start: '2026-03-01T09:30', end: '2026-03-01T10:15' })!;
    expect(d.summary).toBe('Neuer Titel, mit Komma');
    expect(d.edited).toBe(true);
    expect(d.lines.some((l) => l.startsWith('DTSTART;TZID=Europe/Berlin:20260301T093000'))).toBe(true);
    expect(getEvent(first.id)!.location).toBe('Raum 3');
    const f = build(req(), 'zip', 's');
    expect(f.data.length).toBeGreaterThan(100);
    const p = plan(req());
    const one = build(req(), { cal: p.calendars[0].key, part: 0 }, 's');
    const text = new TextDecoder().decode(one.data);
    expect(text).toContain('SUMMARY:Neuer Titel\\, mit Komma');
    new ICAL.Component(ICAL.parse(text));
    // zurücksetzen
    const back = editEvent(first.id, null)!;
    expect(back.edited).toBe(false);
    expect(back.summary).not.toBe('Neuer Titel, mit Komma');
  });

  it('verschiebt einzelne Termine in einen anderen Ziel-Kalender', () => {
    const r = req();
    r.split = { ...DEFAULT_SPLIT, mode: 'rules', includeRest: true, restName: 'Rest', targets: [{ id: 'a', name: 'Kalender A', rules: [{ field: 'summary', op: 'word', value: 'AK' }] }, { id: 'b', name: 'Kalender B', rules: [] }] };
    const before = plan(r);
    const inA = listEvents(r, '', { kind: 'target', key: 'a', label: 'A' }, 0, 3).rows;
    expect(inA.length).toBe(3);
    r.split.manual = Object.fromEntries(inA.map((x) => [x.id, 'b']));
    const after = plan(r);
    const count = (p: typeof after, k: string) => p.calendars.find((c) => c.key === k)?.events ?? 0;
    expect(count(after, 'a')).toBe(count(before, 'a') - 3);
    expect(count(after, 'b')).toBe(3);
    expect(listEvents(r, '', { kind: 'target', key: 'b', label: 'B' }, 0, 10).rows.every((x) => x.targets.includes('Kalender B'))).toBe(true);
  });
});
