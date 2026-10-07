/// <reference lib="webworker" />
import { handle, type Request } from './engine';

self.onmessage = (ev: MessageEvent<{ id: number; msg: Request }>) => {
  const { id, msg } = ev.data;
  try {
    const result = handle(msg) as { data?: Uint8Array } | undefined;
    const transfer = result && result.data instanceof Uint8Array ? [result.data.buffer] : [];
    (self as unknown as Worker).postMessage({ id, ok: true, result }, transfer as Transferable[]);
  } catch (e) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
