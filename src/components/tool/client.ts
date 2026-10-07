// Verbindung zum Rechenkern im Web Worker.
// "?worker&inline" erzeugt den Worker aus einer blob:-Adresse: Er erbt dadurch die
// Content-Security-Policy der Seite (connect-src nur robots.txt) und kann nichts an fremde Server schicken.
import EngineWorker from '../../lib/engine.worker.ts?worker&inline';
import type { Request } from '../../lib/engine';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function get(): Worker {
  if (!worker) {
    worker = new EngineWorker();
    worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(ev.data.id);
      if (!p) return;
      pending.delete(ev.data.id);
      if (ev.data.ok) p.resolve(ev.data.result);
      else p.reject(new Error(ev.data.error || 'Fehler'));
    };
  }
  return worker;
}

export function call<T>(msg: Request, transfer: Transferable[] = []): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    get().postMessage({ id, msg }, transfer);
  });
}

/** Neueste Anfrage gewinnt – ältere Ergebnisse werden verworfen (für die Live-Berechnung). */
export function latest<T>() {
  let n = 0;
  return async (msg: Request): Promise<T | null> => {
    const mine = ++n;
    const r = await call<T>(msg);
    return mine === n ? r : null;
  };
}

export function warmUp() { get(); }

export function download(name: string, data: Uint8Array, type: string) {
  const blob = new Blob([data as BlobPart], { type });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
