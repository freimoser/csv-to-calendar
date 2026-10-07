// Livegang-Sperre: Blocker brechen mit Exit 1 ab. Läuft vor jedem Deployment (siehe .github/workflows/deploy.yml).
// Mit --warn-only (für Pull Requests) werden Blocker nur angezeigt.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const warnOnly = process.argv.includes('--warn-only');
const blocker = [];
const hint = [];
const read = (p) => (existsSync(dist + p) ? readFileSync(dist + p, 'utf8') : '');

for (const p of ['impressum/index.html', 'datenschutz/index.html', 'en/legal-notice/index.html', 'en/privacy/index.html']) if (!read(p)) blocker.push(`Pflichtseite fehlt: ${p}`);
const imprint = read('impressum/index.html');
if (/ANSCHRIFT FEHLT|TODO|class="placeholder"/.test(imprint)) blocker.push('Impressum: ladungsfähige Anschrift fehlt (§ 5 DDG). In src/config/legal.ts street und zip eintragen.');
if (!/\[at\]|@/.test(imprint)) blocker.push('Impressum: Kontaktmöglichkeit fehlt.');
const start = read('index.html');
const canonical = (/<link rel="canonical" href="([^"]+)"/.exec(start) || [])[1] || '';
if (!canonical) blocker.push('Startseite hat kein Canonical.');
else if (/localhost|127\.0\.0\.1|pages\.dev/.test(canonical)) blocker.push(`Canonical zeigt auf ${canonical}.`);
if (!existsSync(dist + 'favicon.ico')) hint.push('favicon.ico liegt im Projektordner; Browser fragen /favicon.ico im Wurzelverzeichnis von freimoser.github.io ab – dort gibt es keine Datei (kein Nutzer-Repository).');
else hint.push('/favicon.ico im Wurzelverzeichnis von freimoser.github.io existiert nicht (kein Nutzer-Repository); die Seite verweist auf ihre eigenen Symbole.');

for (const h of hint) console.log('Hinweis:', h);
if (blocker.length) {
  console.error('✗ Livegang blockiert:\n' + blocker.map((b) => '  - ' + b).join('\n'));
  process.exit(warnOnly ? 0 : 1);
}
console.log('✓ Livegang-Prüfung bestanden.');
