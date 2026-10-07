// Datums- und Zeitzonen-Hilfen. Intern rechnen wir mit "Wandzeit-Millisekunden":
// die Uhrzeit in der Anzeige-Zeitzone, so behandelt, als wäre sie UTC. Das macht Jahre,
// Wochentage und Sortierung einfach und unabhängig von der Zeitzone des Browsers.

export const DEFAULT_TZ = 'Europe/Berlin';

// Häufige Windows-Zeitzonennamen (Outlook-Exporte) → IANA.
const WINDOWS_TZ: Record<string, string> = {
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Romance Standard Time': 'Europe/Paris',
  'Central European Standard Time': 'Europe/Warsaw',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'E. Europe Standard Time': 'Europe/Chisinau',
  'FLE Standard Time': 'Europe/Kiev',
  'GTB Standard Time': 'Europe/Bucharest',
  'Russian Standard Time': 'Europe/Moscow',
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
  'UTC': 'UTC',
  'Coordinated Universal Time': 'UTC'
};

const validTz = new Map<string, string | null>();

/** Liefert einen gültigen IANA-Namen oder null. */
export function normalizeTz(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const clean = tz.replace(/^"|"$/g, '').replace(/^\/[^/]+\/[^/]+\//, ''); // "/mozilla.org/20050126_1/Europe/Berlin"
  if (validTz.has(clean)) return validTz.get(clean)!;
  let res: string | null = WINDOWS_TZ[clean] ?? clean;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: res });
  } catch {
    res = null;
  }
  validTz.set(clean, res);
  return res;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
    dtfCache.set(tz, f);
  }
  return f;
}

const offsetCache = new Map<string, number>();
/** Abstand der Zeitzone zu UTC (ms) zum Zeitpunkt utcMs. Zwischengespeichert pro Stunde. */
export function tzOffset(utcMs: number, tz: string): number {
  if (tz === 'UTC') return 0;
  const key = tz + '|' + Math.floor(utcMs / 3_600_000);
  const hit = offsetCache.get(key);
  if (hit !== undefined) return hit;
  const p: Record<string, number> = {};
  for (const part of dtf(tz).formatToParts(new Date(utcMs))) if (part.type !== 'literal') p[part.type] = +part.value;
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  const off = Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000) * 60000;
  if (offsetCache.size > 50000) offsetCache.clear();
  offsetCache.set(key, off);
  return off;
}

/** UTC-Zeitpunkt → Wandzeit in tz. */
export function utcToWall(utcMs: number, tz: string): number {
  return utcMs + tzOffset(utcMs, tz);
}

/** Wandzeit in tz → UTC-Zeitpunkt. */
export function wallToUtc(wallMs: number, tz: string): number {
  const guess = wallMs - tzOffset(wallMs, tz);
  return wallMs - tzOffset(guess, tz);
}

export interface WallParts { y: number; mo: number; d: number; h: number; mi: number; s: number }

export function wallParts(wall: number): WallParts {
  const dt = new Date(wall);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), s: dt.getUTCSeconds() };
}

const p2 = (n: number) => (n < 10 ? '0' : '') + n;

export function fmtDate(wall: number, lang: 'de' | 'en' = 'de'): string {
  const p = wallParts(wall);
  return lang === 'de' ? `${p2(p.d)}.${p2(p.mo)}.${p.y}` : `${p.y}-${p2(p.mo)}-${p2(p.d)}`;
}

export function isoDay(wall: number): string {
  const p = wallParts(wall);
  return `${p.y}-${p2(p.mo)}-${p2(p.d)}`;
}

/** "2024-03-01" → Wandzeit-ms (Mitternacht). */
export function parseIsoDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
}

/** ICS-Formate: 20240301 / 20240301T093000 / 20240301T093000Z */
export function icsStamp(wall: number, withTime: boolean): string {
  const p = wallParts(wall);
  const d = `${p.y}${p2(p.mo)}${p2(p.d)}`;
  return withTime ? `${d}T${p2(p.h)}${p2(p.mi)}${p2(p.s)}` : d;
}

export function todayWall(tz: string = DEFAULT_TZ): number {
  const w = utcToWall(Date.now(), tz);
  return Math.floor(w / 86_400_000) * 86_400_000;
}

export const DAY = 86_400_000;
