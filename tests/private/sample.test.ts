// NUR LOKAL. Liest eine echte Datei aus PRIVATE_SAMPLE im Speicher und gibt ausschließlich Kennzahlen aus –
// keine Titel, Namen oder Beschreibungen. Läuft nie in der CI (die Datei liegt nicht im Repo).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readIcsInput } from '../../src/lib/input';
import { calendarStats, suggest } from '../../src/lib/analyze';
import { assign, buildGroups, buildPart, cleanedSizes, NO_CLEAN, NO_SPLIT, PART_LIMIT, planCalendars, select, ALL } from '../../src/lib/plan';
import { parseIcs } from '../../src/lib/ics';
import { utf8Len } from '../../src/lib/text';

const path = process.env.PRIVATE_SAMPLE;

describe.skipIf(!path)('echte Beispieldatei (lokal)', () => {
  it('wird gelesen, analysiert und verlustfrei aufgeteilt', () => {
    const bytes = new Uint8Array(readFileSync(path!));
    const t0 = performance.now();
    const input = readIcsInput('sample.zip', bytes);
    const t1 = performance.now();
    console.log(`Gelesen in ${Math.round(t1 - t0)} ms: ${input.calendars.length} Kalender aus ${input.files.length} Datei(en)`);
    const all = input.calendars.flatMap((c) => c.events);
    for (const c of input.calendars) {
      const s = calendarStats(c);
      const y = (w: number | null) => (w === null ? '-' : new Date(w).getUTCFullYear());
      console.log(`Kalender ${c.index + 1}: ${s.events} Termine, ${y(s.first)}–${y(s.last)} (Großteil ${y(s.mainFrom)}–${y(s.mainTo)}), ` +
        `${s.bytes} Byte, Ø ${s.avgBytes} B, Teile ≈ ${s.partsNeeded}, Serien ${s.seriesMasters}, Ausnahmen ${s.exceptions}, ganztägig ${s.allDay}, ` +
        `Beschreibung ${s.withDescription}, Verwaltungsdaten ${s.adminBytes} B, Tel. Titel/Beschr. ${s.phoneInTitle}/${s.phoneInDescription}, ` +
        `E-Mail ${s.emailInTitle}/${s.emailInDescription}, Duplikate ${s.duplicates}, max. parallel ${s.maxParallel}, Probleme ${JSON.stringify(s.problems)}`);
    }
    const sugg = suggest(input.calendars, all);
    for (const s of sugg) console.log(`Vorschlag ${s.kind}: Abdeckung ${Math.round(s.coverage * 100)} %, ${s.values.length} Werte, Top-Anzahlen ${s.values.slice(0, 8).map((v) => v.count).join('/')}`);
    const t2 = performance.now();
    console.log(`Analyse in ${Math.round(t2 - t1)} ms`);

    // Alles behalten, nur aufteilen: Größen müssen exakt stimmen, jeder Teil unter der Grenze
    const groups = buildGroups(all);
    const sel = select(groups, ALL);
    const { buckets } = assign(sel.groups, NO_SPLIT, input.calendars);
    const sizes = cleanedSizes(all, NO_CLEAN);
    const out = planCalendars(buckets, input.calendars, sizes);
    let reparsed = 0;
    const uids = new Set<string>();
    for (const cal of out) for (const p of cal.parts) {
      const text = buildPart(p, cal, NO_CLEAN, 's');
      expect(utf8Len(text)).toBe(p.bytes);
      expect(p.bytes).toBeLessThanOrEqual(PART_LIMIT);
      const back = parseIcs(text);
      reparsed += back[0].events.length;
      for (const e of back[0].events) uids.add(e.uid);
    }
    const t3 = performance.now();
    console.log(`Aufgeteilt in ${out[0].parts.length} Teile (${out[0].parts.map((p) => Math.round(p.bytes / 1000) + ' KB').join(', ')}) in ${Math.round(t3 - t2)} ms`);
    expect(reparsed).toBe(all.length);
    expect(uids.size).toBe(new Set(all.map((e) => e.uid)).size);
  });
});
