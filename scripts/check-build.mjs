// Prüft den fertigen Build (dist/), nicht den Quelltext. Bricht bei Fehlern mit Exit 1 ab.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://freimoser.github.io';
const BASE = '/csv-to-calendar/';
const VERIFY = '<meta name="google-site-verification" content="6pYvtFCnU7UFcQFajtMSkQ7tYMy3Z_Bt7teKiT5yKNg">';
const errors = [];
const warn = [];
const fail = (route, msg) => errors.push(`${route}: ${msg}`);

const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(dist);

const routeOf = (file) => BASE + relative(dist, file).split('\\').join('/').replace(/index\.html$/, '').replace(/\.html$/, '');
const html = new Map(pages.map((p) => [routeOf(p), readFileSync(p, 'utf8')]));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const get = (h, re) => { const m = re.exec(h); return m ? decode(m[1]) : null; };
const exists = (route) => {
  const r = route.split('#')[0];
  if (!r.startsWith(BASE)) return false;
  const rel = r.slice(BASE.length);
  if (rel === '' || rel.endsWith('/')) return existsSync(join(dist, rel, 'index.html'));
  return existsSync(join(dist, rel));
};
const idsOf = (h) => new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

const titles = new Map();
const faqSeen = new Map();
const incoming = new Map();
const indexable = new Set();

for (const [route, h] of html) {
  const is404 = route.endsWith('404');
  const title = get(h, /<title>([^<]*)<\/title>/);
  const desc = get(h, /<meta name="description" content="([^"]*)"/);
  const canonical = get(h, /<link rel="canonical" href="([^"]*)"/);
  const noindex = /<meta name="robots" content="noindex/.test(h);
  if (!title) fail(route, 'Title fehlt');
  else {
    if (title.length > 60) fail(route, `Title zu lang (${title.length} > 60): ${title}`);
    if (!is404 && titles.has(title)) fail(route, `Title doppelt (auch ${titles.get(title)})`);
    titles.set(title, route);
  }
  if (!desc) fail(route, 'Meta-Description fehlt');
  else if (desc.length > 155) fail(route, `Description zu lang (${desc.length} > 155)`);
  if (!h.includes(VERIFY)) fail(route, 'google-site-verification fehlt oder weicht ab');
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) fail(route, 'nicht genau eine H1');
  if (!/<html lang="(de|en)"/.test(h)) fail(route, 'lang-Attribut fehlt');
  const csp = get(h, /http-equiv="content-security-policy" content="([^"]*)"/) || '';
  const connect = (/connect-src ([^;]*)/.exec(csp) || [])[1]?.trim() || '';
  if (!connect.split(/\s+/).every((s) => /^https:\/\/freimoser\.github\.io\/robots\.txt$|^http:\/\/localhost:\d+\/robots\.txt$/.test(s))) fail(route, `CSP connect-src erlaubt mehr als die robots.txt: ${connect}`);
  if (/\sstyle="/.test(h)) fail(route, 'Inline-style-Attribut (wird von der CSP blockiert)');
  if (/<(script|link)[^>]+(src|href)="https?:\/\/(?!freimoser\.github\.io)[^"]*"[^>]*>/.test(h.replace(/<link rel="(canonical|alternate)"[^>]*>/g, '')) && /<script[^>]+src="https?:/.test(h)) fail(route, 'externes Skript');
  if (/fonts\.googleapis|fonts\.gstatic|googletagmanager|google-analytics/.test(h)) fail(route, 'Ressource von Google eingebunden');
  if (!is404) {
    if (!canonical) fail(route, 'Canonical fehlt');
    else if (canonical !== SITE + route) fail(route, `Canonical ${canonical} ≠ ${SITE + route}`);
    if (canonical && /localhost|127\.0\.0\.1|pages\.dev/.test(canonical)) fail(route, 'Canonical zeigt auf Testadresse');
  }
  const ogImg = get(h, /<meta property="og:image" content="([^"]*)"/);
  if (!ogImg) fail(route, 'og:image fehlt');
  else if (!exists(ogImg.replace(SITE, ''))) fail(route, `og:image fehlt im Build: ${ogImg}`);
  for (const p of is404 ? ['og:title', 'og:description'] : ['og:title', 'og:description', 'og:url']) if (!h.includes(`property="${p}"`)) fail(route, `${p} fehlt`);
  if (is404 && /rel="canonical"/.test(h)) fail(route, '404-Seite darf kein Canonical haben');
  // FAQPage: dieselbe Frage darf nur auf einer Seite ausgezeichnet sein (Google-Richtlinie für FAQ-Markup)
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data; try { data = JSON.parse(m[1]); } catch { fail(route, 'ungültiges JSON-LD'); continue; }
    if (data['@type'] === 'FAQPage') for (const q of data.mainEntity) {
      if (faqSeen.has(q.name)) fail(route, `FAQ-Frage auch auf ${faqSeen.get(q.name)} ausgezeichnet: ${q.name}`);
      else faqSeen.set(q.name, route);
    }
  }
  if (!noindex && !is404) {
    indexable.add(route);
    const hl = { de: get(h, /hreflang="de" href="([^"]*)"/), en: get(h, /hreflang="en" href="([^"]*)"/), x: get(h, /hreflang="x-default" href="([^"]*)"/) };
    for (const [k, v] of Object.entries(hl)) {
      if (!v) fail(route, `hreflang ${k} fehlt`);
      else if (!v.startsWith(SITE + BASE) || !v.endsWith('/') || !exists(v.replace(SITE, ''))) fail(route, `hreflang ${k} ungültig: ${v}`);
    }
    if (hl.x && hl.en && hl.x !== hl.en) fail(route, 'x-default zeigt nicht auf die englische Version');
    if (!h.includes('application/ld+json')) fail(route, 'strukturierte Daten fehlen');
  }
  // interne Links
  const main = (/<main[\s\S]*<\/main>/.exec(h) || [''])[0];
  for (const m of h.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    const href = decode(m[1]);
    if (href.startsWith('#')) { if (href.length > 1 && !idsOf(h).has(href.slice(1))) fail(route, `Sprungmarke fehlt: ${href}`); continue; }
    if (/^(https?:|mailto:)/.test(href)) { if (href.startsWith(SITE + BASE)) fail(route, `interner Link absolut: ${href}`); continue; }
    let target = href.startsWith('/') ? href : new URL(href, SITE + route).pathname;
    if (!target.split('#')[0].endsWith('/') && !/\.[a-z0-9]+$/i.test(target.split('#')[0])) fail(route, `Link ohne Schrägstrich am Ende: ${href}`);
    if (!exists(target)) { fail(route, `Link ins Leere: ${href}`); continue; }
    const [path, hash] = target.split('#');
    if (hash && !idsOf(html.get(path) ?? '').has(hash)) fail(route, `Sprungmarke fehlt im Ziel: ${href}`);
    if (main.includes(m[0]) && path !== route) incoming.set(path, (incoming.get(path) || 0) + 1);
  }
}

// Sitemap
const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const locs = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
for (const l of locs) {
  if (!html.has(l)) fail('sitemap', `URL ohne Seite: ${l}`);
  else if (!indexable.has(l)) fail('sitemap', `noindex-Seite in der Sitemap: ${l}`);
  if (!l.endsWith('/')) fail('sitemap', `ohne Schrägstrich: ${l}`);
}
for (const r of indexable) if (!locs.has(r)) fail('sitemap', `indexierbare Seite fehlt: ${r}`);
if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sm)) fail('sitemap', 'lastmod fehlt');

// interne Verlinkung: jede Ratgeberseite mindestens drei eingehende Links aus Inhalten
for (const r of indexable) {
  const n = incoming.get(r) || 0;
  if (n < 3) fail(r, `nur ${n} eingehende Links aus Inhalten (mind. 3)`);
}

// llms.txt
const llms = readFileSync(join(dist, 'llms.txt'), 'utf8');
for (const m of llms.matchAll(/\]\((https:[^)]+)\)/g)) if (!exists(m[1].replace(SITE, ''))) fail('llms.txt', `Link ins Leere: ${m[1]}`);
for (const f of ['favicon.svg', 'favicon-48.png', 'favicon-96.png', 'apple-touch-icon.png', 'manifest.webmanifest', 'sw.js']) if (!existsSync(join(dist, f))) fail('build', `${f} fehlt`);
if (existsSync(join(dist, 'robots.txt'))) warn.push('robots.txt im Projekt wirkt auf GitHub Pages nicht (liegt nicht im Wurzelverzeichnis).');

for (const w of warn) console.log('Hinweis:', w);
if (errors.length) {
  console.error(`✗ Build-Prüfung: ${errors.length} Fehler\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ Build-Prüfung: ${html.size} Seiten, ${indexable.size} indexierbar, ${locs.size} in der Sitemap – alles in Ordnung.`);
