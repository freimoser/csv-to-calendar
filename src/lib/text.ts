// Text-Hilfen: UTF-8-Länge, ICS-Zeilenfaltung (RFC 5545, Abschnitt 3.1), Escaping (Abschnitt 3.3.11).

export const CRLF = '\r\n';

/** Länge eines Strings in UTF-8-Byte – ohne ihn zu kodieren. */
export function utf8Len(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

function isAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0x7f) return false;
  return true;
}

/**
 * Faltet eine logische Zeile auf höchstens 75 Oktette pro physischer Zeile.
 * Folgezeilen beginnen mit einem Leerzeichen, das mitzählt. UTF-8-Zeichen werden nie zerteilt.
 */
export function foldLine(line: string): string {
  if (line.length <= 75 && (isAscii(line) || utf8Len(line) <= 75)) return line;
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = ch.length === 2 ? 4 : utf8Len(ch);
    if (bytes + b > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // das führende Leerzeichen belegt ein Oktett
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join(CRLF + ' ');
}

/** Byte-Länge der gefalteten Zeile inklusive abschließendem CRLF – identisch zu utf8Len(foldLine(l) + CRLF). */
export function foldedLen(line: string): number {
  if (line.length <= 75 && isAscii(line)) return line.length + 2;
  const total = utf8Len(line);
  if (total <= 75) return total + 2;
  let bytes = 0;
  let limit = 75;
  let folds = 0;
  for (const ch of line) {
    const b = ch.length === 2 ? 4 : utf8Len(ch);
    if (bytes + b > limit) { folds++; bytes = 0; limit = 74; }
    bytes += b;
  }
  return total + folds * 3 + 2;
}

/** TEXT-Wert nach RFC 5545 maskieren. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** TEXT-Wert nach RFC 5545 lesbar machen. */
export function unescapeText(s: string): string {
  if (s.indexOf('\\') < 0) return s;
  return s.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

export function slugify(s: string): string {
  const map: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'ae', Ö: 'oe', Ü: 'ue' };
  const out = s
    .replace(/[äöüßÄÖÜ]/g, (c) => map[c])
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out.slice(0, 40) || 'kalender';
}

export function formatBytes(n: number, lang: 'de' | 'en' = 'de'): string {
  const dec = lang === 'de' ? ',' : '.';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', dec) + ' MB';
  if (n >= 1000) return Math.round(n / 1000) + ' KB';
  return n + ' B';
}

export function formatInt(n: number, lang: 'de' | 'en' = 'de'): string {
  return Math.round(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
}
