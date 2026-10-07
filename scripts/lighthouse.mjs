// Lighthouse (mobil) gegen den lokalen Build: npm run build:lh && npm run preview  (zweites Terminal) && node scripts/lighthouse.mjs
// Für lokale Messungen muss die CSP die lokale robots.txt erlauben: LOCAL_ROBOTS=http://localhost:4321/robots.txt beim Build setzen.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['', 'google-kalender-datei-zu-gross/', 'en/', 'en/split-google-calendar/'];
const dir = mkdtempSync(join(tmpdir(), 'lh-'));
let ok = true;
for (const p of pages) {
  const out = join(dir, 'r.json');
  execFileSync('npx', ['--yes', 'lighthouse@latest', `http://localhost:4321/csv-to-calendar/${p}`, '--quiet', '--chrome-flags=--headless=new',
    '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${out}`], { stdio: 'ignore' });
  const r = JSON.parse(readFileSync(out, 'utf8'));
  const scores = Object.values(r.categories).map((c) => [c.id, Math.round(c.score * 100)]);
  console.log(`/${p}`, scores.map(([k, v]) => `${k}: ${v}`).join(' · '));
  if (scores.some(([, v]) => v < 95)) ok = false;
}
process.exit(ok ? 0 : 1);
