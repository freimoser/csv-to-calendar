// NUR LOKAL: Kennzahlen für das Praxisbeispiel in den Ratgebern (keine Namen, keine Titel).
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { loadIcs, plan, DEFAULT_CLEAN, DEFAULT_SELECTION, DEFAULT_SPLIT } from '../../src/lib/engine';

const path = process.env.PRIVATE_SAMPLE;
it.skipIf(!path)('Kennzahlen echter Export', () => {
  const info = loadIcs('x.zip', new Uint8Array(readFileSync(path!)));
  const base = { selection: { ...DEFAULT_SELECTION }, clean: { ...DEFAULT_CLEAN }, split: { ...DEFAULT_SPLIT }, format: 'ics' as const };
  const show = (label: string, r: ReturnType<typeof plan>) => {
    const files = r.calendars.reduce((a, c) => a + c.parts.length, 0);
    const max = Math.max(...r.calendars.flatMap((c) => c.parts.map((p) => p.bytes)));
    console.log(`${label}: ${r.events} Termine · ${(r.ics.bytes / 1e6).toFixed(1)} MB · ${r.calendars.length} Kalender · ${files} Dateien · größte ${Math.round(max / 1000)} KB · mehrfach ${r.multiMatched}`);
  };
  const c = info.calendars[0];
  console.log(`Datei: ${info.calendars.length} Kalender, ${c.events} Termine, ${new Date(c.first!).getUTCFullYear()}–${new Date(c.last!).getUTCFullYear()}, Verwaltungsdaten ${(c.adminBytes / 1e6).toFixed(1)} MB, Serien ${c.seriesMasters}`);
  show('Alles', plan(base));
  show('Ohne Verwaltungsdaten', plan({ ...base, clean: { ...DEFAULT_CLEAN, dropAdmin: true } }));
  show('Nur 2024–2026', plan({ ...base, selection: { ...DEFAULT_SELECTION, years: [2024, 2025, 2026] } }));
  show('2024–2026 ohne Verwaltungsdaten', plan({ ...base, selection: { ...DEFAULT_SELECTION, years: [2024, 2025, 2026] }, clean: { ...DEFAULT_CLEAN, dropAdmin: true } }));
  const ini = info.suggestions.find((s) => s.kind === 'initials')!;
  const split = { ...DEFAULT_SPLIT, mode: 'rules' as const, targets: ini.values.map((v, i) => ({ id: 't' + i, name: 'K' + i, rules: [{ field: 'summary' as const, op: 'word' as const, value: v.value }] })) };
  console.log(`Kürzel: ${ini.values.length}, Abdeckung ${Math.round(ini.coverage * 100)} %`);
  show('Nach Kürzeln aufgeteilt', plan({ ...base, split }));
});
