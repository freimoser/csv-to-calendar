// Excel lesen und schreiben mit SheetJS Community Edition (Apache-2.0), nur bei Bedarf geladen.
// Datumszellen werden über ihr Zahlenformat erkannt und als eindeutiges ISO-Datum weitergegeben.

import { excelSerialToDate, fromRows, type Table } from './table';

const p2 = (n: number) => String(n).padStart(2, '0');

export async function readXlsx(bytes: Uint8Array, fileName: string): Promise<Table> {
  return fromRows(await readXlsxRows(bytes), fileName, 'Excel', '');
}

/** Liest das erste Tabellenblatt als Text-Zeilen. */
export async function readXlsxRows(bytes: Uint8Array): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(bytes, { type: 'array', cellNF: true, cellDates: false, cellText: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const date1904 = !!(wb.Workbook as { WBProps?: { date1904?: boolean } } | undefined)?.WBProps?.date1904;
  const ref = ws['!ref'];
  const rows: string[][] = [];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })] as { t: string; v: unknown; z?: string; w?: string } | undefined;
        if (!cell || cell.v === undefined || cell.v === null) { row.push(''); continue; }
        if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
          const n = cell.v as number;
          if (n < 1) {
            const mins = Math.round(n * 1440);
            row.push(`${p2(Math.floor(mins / 60) % 24)}:${p2(mins % 60)}`);
          } else {
            const d = excelSerialToDate(n, date1904);
            row.push(d ? `${d.y}-${p2(d.mo)}-${p2(d.d)}${d.h !== null ? ` ${p2(d.h)}:${p2(d.mi!)}` : ''}` : String(n));
          }
        } else if (cell.t === 'b') row.push(cell.v ? 'TRUE' : 'FALSE');
        else row.push(String(cell.v));
      }
      rows.push(row);
    }
  }
  return rows;
}

/** Erzeugt eine .xlsx-Datei aus Zeilen. Zellen der Form TT.MM.JJJJ werden echte Excel-Datumswerte. */
export async function writeXlsx(rows: (string | number)[][], sheetName: string): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const dates: [number, number][] = [];
  const data = rows.map((r, ri) => r.map((v, ci) => {
    const m = typeof v === 'string' ? /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v) : null;
    if (!m) return v;
    dates.push([ri, ci]);
    return Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(1899, 11, 30)) / 86_400_000);
  }));
  const ws = XLSX.utils.aoa_to_sheet(data);
  for (const [r, c] of dates) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })] as { z?: string };
    cell.z = 'dd.mm.yyyy';
  }
  ws['!cols'] = rows[0].map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}
