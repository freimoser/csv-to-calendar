import { describe, expect, it } from 'vitest';
import { eventFromLines } from '../../src/lib/ics';
import { occurrences } from '../../src/lib/recur';

const ev = (lines: string[]) => eventFromLines(['BEGIN:VEVENT', 'UID:x', ...lines, 'END:VEVENT'], 0, 0, 'Europe/Berlin');
const days = (ws: number[]) => ws.map((w) => new Date(w).toISOString().slice(0, 10));

describe('Serien für die Monatsansicht', () => {
  it('jährlich, auch 29.2. → 28.2. über BYMONTHDAY=-1', () => {
    const e = ev(['DTSTART;VALUE=DATE:19520229', 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1']);
    expect(days(occurrences(e, Date.UTC(2027, 1, 1), Date.UTC(2027, 2, 1) - 1))).toEqual(['2027-02-28']);
    expect(days(occurrences(e, Date.UTC(2028, 1, 1), Date.UTC(2028, 2, 1) - 1))).toEqual(['2028-02-29']);
  });
  it('wöchentlich mittwochs bis UNTIL, mit EXDATE', () => {
    const e = ev(['DTSTART;TZID=Europe/Berlin:20260107T080000', 'RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20260131T230000Z', 'EXDATE;TZID=Europe/Berlin:20260121T080000']);
    expect(days(occurrences(e, Date.UTC(2026, 0, 1), Date.UTC(2026, 2, 1)))).toEqual(['2026-01-07', '2026-01-14', '2026-01-28']);
  });
  it('monatlich am 2. Montag, COUNT', () => {
    const e = ev(['DTSTART:20260112T090000', 'RRULE:FREQ=MONTHLY;BYDAY=2MO;COUNT=3']);
    expect(days(occurrences(e, Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31)))).toEqual(['2026-01-12', '2026-02-09', '2026-03-09']);
  });
  it('täglich mit INTERVAL', () => {
    const e = ev(['DTSTART:20260301T100000', 'RRULE:FREQ=DAILY;INTERVAL=10;COUNT=4']);
    expect(days(occurrences(e, Date.UTC(2026, 2, 1), Date.UTC(2026, 3, 30)))).toEqual(['2026-03-01', '2026-03-11', '2026-03-21', '2026-03-31']);
  });
});
