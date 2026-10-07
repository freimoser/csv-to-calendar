import { describe, expect, it } from 'vitest';
import ICAL from 'ical.js';
import { decodeText } from '../../src/lib/input';
import { analyzeDates, parseCsvText, parseTime, tableToCalendar, excelSerialToDate, type ConvertOptions } from '../../src/lib/table';
import { encodeWindows1252, samplePracticeCsv, sampleBirthdayRows } from '../../src/lib/sample';
import { ALL, NO_CLEAN, NO_SPLIT, PART_LIMIT, assign, buildGroups, buildPart, cleanedSizes, planCalendars, select } from '../../src/lib/plan';
import { GOOGLE_CSV_HEADER, buildCsv, csvSizes, packCsv } from '../../src/lib/google-csv';
import { utf8Len } from '../../src/lib/text';
import { readXlsx, writeXlsx } from '../../src/lib/xlsx';

const OPTS: ConvertOptions = {
  tz: 'Europe/Berlin', defaultMinutes: 30, orders: {}, pii: {}, fixes: {}, birthdays: false, birthdayYearInTitle: true,
  birthdayPrefix: 'Geburtstag: ', birthdayYearLabel: 'geb. ', defaultSubject: 'Termin', thisYear: 2026
};

function checkGoogleCsv(text: string) {
  const lines = text.split('\r\n').filter(Boolean);
  expect(lines[0]).toBe(GOOGLE_CSV_HEADER.join(','));
  for (const l of lines.slice(1)) {
    // Subject, Start Date (MM/DD/YYYY), Start Time (h:mm AM|PM oder leer) …
    expect(l).toMatch(/^("([^"]|"")*"|[^",]*),\d{2}\/\d{2}\/\d{4},(\d{1,2}:\d{2} (AM|PM))?,\d{2}\/\d{2}\/\d{4},(\d{1,2}:\d{2} (AM|PM))?,(True|False),/);
    expect(l).not.toContain(';');
  }
}

describe('Deutsche Semikolon-CSV im Windows-Zeichensatz', () => {
  const bytes = encodeWindows1252(samplePracticeCsv({ rows: 300 }));
  const dec = decodeText(bytes);
  const t = parseCsvText(dec.text, 'praxis.csv', dec.encoding);

  it('erkennt Zeichensatz, Trennzeichen, Umlaute und Spalten', () => {
    expect(dec.encoding).toBe('windows-1252');
    expect(t.delimiter).toBe(';');
    expect(t.rows.length).toBe(300);
    expect(dec.text).toMatch(/Müller|Schäfer|Röntgen|Krüger/);
    const role = (h: string) => t.columns.find((c) => c.header === h)!.role;
    expect(role('Datum')).toBe('startDate');
    expect(role('Beginn')).toBe('startTime');
    expect(role('Ende')).toBe('endTime');
    expect(role('Behandlung')).toBe('subject');
    expect(role('Raum')).toBe('location');
    expect(t.columns.find((c) => c.header === 'Datum')!.order).toBe('dmy');
    // Geburtsdatum der Patienten ist hier keine Geburtstagsliste
    expect(t.columns.some((c) => c.role === 'birthday')).toBe(false);
    expect(role('Geburtsdatum')).toBe('extra');
  });

  it('erkennt persönliche Daten (Patientennamen, Telefonnummern, Geburtsdaten)', () => {
    const pii = (h: string) => t.columns.find((c) => c.header === h)!.pii;
    expect(pii('Patient')).toBe('name');
    expect(pii('Telefon')).toBe('phone');
    expect(pii('Geburtsdatum')).toBe('birthdate');
    expect(pii('Behandlung')).toBe(null);
  });

  it('wandelt in gültige Termine um und kürzt Namen auf Initialen', () => {
    const patient = t.columns.find((c) => c.header === 'Patient')!.index;
    const tel = t.columns.find((c) => c.header === 'Telefon')!.index;
    const r = tableToCalendar(t, { ...OPTS, pii: { [patient]: 'short', [tel]: 'remove' } });
    expect(r.calendar.events.length).toBe(300);
    const d = r.calendar.events[0].description;
    expect(d).toMatch(/Patient: [A-ZÄÖÜ]\. [A-ZÄÖÜ]\./);
    expect(d).not.toMatch(/Telefon/);
    const ev = r.calendar.events[0];
    expect(ev.start!.allDay).toBe(false);
    expect(ev.minutes).toBeGreaterThan(0);
  });
});

describe('3-MB-Terminliste 2010 bis 2026', () => {
  const text = samplePracticeCsv({ rows: 32000, seed: 3 });
  const t = parseCsvText(text, 'gross.csv', 'utf-8');
  const conv = tableToCalendar(t, OPTS);
  const cals = [conv.calendar];
  const events = conv.calendar.events;
  const groups = buildGroups(events);

  it('ist größer als 3 MB', () => {
    expect(utf8Len(text)).toBeGreaterThan(3_000_000);
    expect(events.length).toBe(32000);
  });

  it('Filter 2024–2026 verkleinert die berechnete Größe korrekt (ICS und Google-CSV)', () => {
    const sizes = cleanedSizes(events, NO_CLEAN);
    const full = planCalendars(assign(select(groups, ALL).groups, NO_SPLIT, cals).buckets, cals, sizes)[0];
    const sel = select(groups, { ...ALL, years: [2024, 2025, 2026] });
    const part = planCalendars(assign(sel.groups, NO_SPLIT, cals).buckets, cals, sizes)[0];
    expect(part.events).toBeLessThan(full.events * 0.25);
    expect(part.bytes).toBeLessThan(full.bytes * 0.25);
    // exakt: Summe der gebauten Teile = berechnete Größe
    let real = 0;
    for (const p of part.parts) real += utf8Len(buildPart(p, part, NO_CLEAN, 's'));
    expect(real).toBe(part.bytes);

    const csz = csvSizes(events, NO_CLEAN);
    const csvAll = packCsv(select(groups, ALL).groups, csz);
    const csvSel = packCsv(sel.groups, csz);
    const sum = (ps: { bytes: number }[]) => ps.reduce((a, p) => a + p.bytes, 0);
    expect(sum(csvSel.parts)).toBeLessThan(sum(csvAll.parts) * 0.25);
  });

  it('teilt in Teile unter 950 KB, jeder vollständig importierbar', () => {
    const sizes = cleanedSizes(events, NO_CLEAN);
    const [out] = planCalendars(assign(select(groups, ALL).groups, NO_SPLIT, cals).buckets, cals, sizes);
    expect(out.parts.length).toBeGreaterThan(5);
    let n = 0;
    for (const p of out.parts) {
      const ics = buildPart(p, out, NO_CLEAN, 's');
      expect(utf8Len(ics)).toBe(p.bytes);
      expect(p.bytes).toBeLessThanOrEqual(PART_LIMIT);
      const comp = new ICAL.Component(ICAL.parse(ics));
      n += comp.getAllSubcomponents('vevent').length;
    }
    expect(n).toBe(32000);
    const csz = csvSizes(events, NO_CLEAN);
    const { parts } = packCsv(select(groups, ALL).groups, csz);
    let rows = 0;
    for (const p of parts) {
      const csv = buildCsv(p.events, NO_CLEAN);
      expect(utf8Len(csv)).toBe(p.bytes);
      expect(p.bytes).toBeLessThanOrEqual(PART_LIMIT);
      checkGoogleCsv(csv);
      rows += csv.split('\r\n').filter(Boolean).length - 1;
    }
    expect(rows).toBe(32000);
  });
});

describe('Fehlerhafte Zeilen', () => {
  const t = parseCsvText(samplePracticeCsv({ rows: 40, brokenRows: true }), 'fehler.csv', 'utf-8');
  const r = tableToCalendar(t, OPTS);
  it('meldet Fehler zeilengenau mit Vorschlag', () => {
    const codes = r.issues.map((i) => `${i.line}:${i.code}:${i.fix}`);
    expect(codes).toContain('15:endBeforeStart:defaultDuration');
    expect(codes).toContain('21:badDate:lastDayOfMonth');
    expect(codes).toContain('26:badTime:allDay');
    expect(codes).toContain('26:noSubject:subject');
  });
  it('wendet Korrekturen an', () => {
    const bad = r.issues.find((i) => i.code === 'badDate')!;
    const fixed = tableToCalendar(t, { ...OPTS, fixes: { [bad.row]: 'fix' } });
    const ev = fixed.calendar.events.find((e) => e.sourceLine === bad.line)!;
    expect(ev.start!.raw).toBe('20190228T100000');
    const dropped = tableToCalendar(t, { ...OPTS, fixes: { [bad.row]: 'drop' } });
    expect(dropped.dropped).toBe(1);
  });
});

describe('Datumsformate', () => {
  it('fragt bei mehrdeutigen Werten nach, statt zu raten', () => {
    expect(analyzeDates(['03/04/2025', '05/06/2025', '11/12/2025']).ambiguous).toBe(true);
    expect(analyzeDates(['03/04/2025', '25/06/2025']).order).toBe('dmy');
    expect(analyzeDates(['03/04/2025', '06/25/2025']).order).toBe('mdy');
    expect(analyzeDates(['01.02.2025', '3.4.25']).order).toBe('dmy');
    expect(analyzeDates(['2025-02-01', '2025-12-31']).order).toBe('ymd');
    const t = parseCsvText(samplePracticeCsv({ rows: 5, slashDates: true, seed: 99 }).replace(/(\d{2})\/(\d{2})\//g, (_, a, b) => `${String(Math.min(+a, 12)).padStart(2, '0')}/${b}/`), 'x.csv', 'utf-8');
    expect(t.columns.find((c) => c.header === 'Datum')!.ambiguous).toBe(true);
  });
  it('liest Uhrzeiten und Excel-Seriennummern (inkl. Schaltjahr-Fehler 1900)', () => {
    expect(parseTime('9:30')).toEqual({ h: 9, mi: 30 });
    expect(parseTime('1:00 PM')).toEqual({ h: 13, mi: 0 });
    expect(parseTime('14 Uhr')).toEqual({ h: 14, mi: 0 });
    expect(parseTime('0.5')).toEqual({ h: 12, mi: 0 });
    expect(excelSerialToDate(45658)).toMatchObject({ y: 2025, mo: 1, d: 1 });
    expect(excelSerialToDate(60)).toMatchObject({ y: 1900, mo: 2, d: 28 });
    expect(excelSerialToDate(61)).toMatchObject({ y: 1900, mo: 3, d: 1 });
    expect(excelSerialToDate(45658.375)).toMatchObject({ y: 2025, mo: 1, d: 1, h: 9, mi: 0 });
  });
});

describe('Excel mit Datumswerten und Geburtstagsmodus', () => {
  it('liest XLSX mit echten Excel-Datumswerten', async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['Termin', 'Datum', 'Uhrzeit', 'Ort'],
      ['Vereinssitzung', 45658, 0.791666667, 'Vereinsheim'],
      ['Grillfest', 45850.5, '', 'Sportplatz']
    ]);
    ws['B2'].z = 'dd.mm.yyyy'; ws['B3'].z = 'dd.mm.yyyy hh:mm'; ws['C2'].z = 'hh:mm';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Termine');
    const buf = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
    const t = await readXlsx(buf, 'verein.xlsx');
    expect(t.rows[0][1]).toBe('2025-01-01');
    expect(t.rows[0][2]).toBe('19:00');
    expect(t.rows[1][1]).toBe('2025-07-12 12:00');
    const r = tableToCalendar(t, OPTS);
    expect(r.calendar.events[0].start!.raw).toBe('20250101T190000');
    expect(r.calendar.events[1].start!.raw).toBe('20250712T120000');
  });

  it('macht aus einer Geburtstagsliste jährliche ganztägige Termine, 29.2. → 28.2.', async () => {
    const buf = await writeXlsx(sampleBirthdayRows(), 'Geburtstage');
    const t = await readXlsx(buf, 'geburtstage.xlsx');
    expect(t.columns.find((c) => c.header === 'Geburtstag')!.role).toBe('birthday');
    const r = tableToCalendar(t, { ...OPTS, birthdays: true });
    expect(r.calendar.events.length).toBe(6);
    const sizes = cleanedSizes(r.calendar.events, NO_CLEAN);
    const [out] = planCalendars(assign(buildGroups(r.calendar.events), NO_SPLIT, [r.calendar]).buckets, [r.calendar], sizes);
    const ics = buildPart(out.parts[0], out, NO_CLEAN, 's');
    expect(ics).toContain('SUMMARY:Geburtstag: Erika Huber (geb. 1948)');
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1');
    const comp = new ICAL.Component(ICAL.parse(ics));
    const hans = comp.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v)).find((e) => e.summary.includes('Hans Vogt'))!;
    const it2 = hans.iterator();
    const dates: string[] = [];
    for (let i = 0; i < 3; i++) dates.push(it2.next()!.toString());
    expect(dates).toEqual(['2026-02-28', '2027-02-28', '2028-02-29']);
  });
});
