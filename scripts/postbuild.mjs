// Erzeugt dist/sw.js: speichert alle Dateien der Website für den Offline-Betrieb.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = new URL('../dist/', import.meta.url).pathname.replace(/%20/g, ' ');
const BASE = '/ics-editor/';
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(dist, p).split('\\').join('/'));
  }
})(dist);
const precache = files
  .filter((f) => !f.startsWith('og/') && f !== 'sw.js' && !f.endsWith('.xml') && f !== '404.html')
  .map((f) => BASE + f.replace(/index\.html$/, ''));
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
const sw = `// Offline-Zwischenspeicher: nur die Dateien dieser Website, keine Nutzerdaten.
const CACHE = 'ctc-${version}';
const FILES = ${JSON.stringify(precache)};
// Vary-Header des Servers ignorieren, sonst passen Skript-Anfragen (mit Origin-Header) nicht zum Speicher
const OPT = { ignoreVary: true, ignoreSearch: true };
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; }).catch(() => caches.match(r, OPT).then((m) => m || caches.match('${BASE}', OPT))));
    return;
  }
  e.respondWith(caches.match(r, OPT).then((m) => m || fetch(r)));
});
`;
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${precache.length} Dateien, Version ${version}`);
