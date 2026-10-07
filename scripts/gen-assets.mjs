// Erzeugt Favicons, App-Icons und Vorschaubilder (Open Graph) aus einer Quelle.
// Aufruf: node scripts/gen-assets.mjs  – Ergebnis liegt in public/ und wird eingecheckt.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../src/content/guides.ts';
import { HOME } from '../src/content/home.ts';

const pub = new URL('../public/', import.meta.url);
const svg = readFileSync(new URL('favicon.svg', pub));

for (const [name, size] of [['favicon-32.png', 32], ['favicon-48.png', 48], ['favicon-96.png', 96], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(fileURLToPath(new URL(name, pub)));
}
// Maskierbares Icon: Symbol mit Rand, Hintergrund vollflächig
const inner = await sharp(svg, { density: 600 }).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0e5a47' } }).composite([{ input: inner, left: 76, top: 76 }]).png().toFile(fileURLToPath(new URL('icon-maskable-512.png', pub)));

// favicon.ico mit eingebettetem PNG (48 px)
const png48 = await sharp(svg, { density: 600 }).resize(48, 48).png().toBuffer();
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head.writeUInt8(48, 6); head.writeUInt8(48, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png48.length, 14); head.writeUInt32LE(22, 18);
writeFileSync(new URL('favicon.ico', pub), Buffer.concat([head, png48]));

// Vorschaubilder
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text, max) {
  const words = text.split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
async function og(file, title, claim) {
  const lines = wrap(title, 26).slice(0, 4);
  const size = lines.length > 3 ? 58 : 66;
  const text = lines.map((l, i) => `<text x="80" y="${250 + i * (size + 14)}" font-size="${size}" font-weight="700" fill="#1a1f1c">${esc(l)}</text>`).join('');
  const logo = svg.toString().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">', '<svg x="80" y="64" width="64" height="64" viewBox="0 0 48 48">');
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
<rect width="1200" height="630" fill="#f4f5f0"/><rect y="590" width="1200" height="40" fill="#0e5a47"/>
${logo}<text x="164" y="108" font-size="34" font-weight="700" fill="#0e5a47">CSV to Calendar</text>
${text}<text x="80" y="550" font-size="30" fill="#4d5751">${esc(claim)}</text></svg>`;
  await sharp(Buffer.from(s)).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL('og/' + file, pub)));
}
const claim = { de: 'Kostenlos · läuft im Browser · kein Upload', en: 'Free · runs in your browser · no upload' };
for (const lang of ['de', 'en']) {
  await og(`home-${lang}.png`, HOME[lang].h1, claim[lang]);
  for (const [k, g] of Object.entries(GUIDES)) await og(`${k}-${lang}.png`, g[lang].h1, claim[lang]);
}
const legal = { imprint: ['Impressum', 'Legal notice'], privacy: ['Datenschutz', 'Privacy policy'], terms: ['Nutzungsbedingungen', 'Terms of use'] };
for (const [k, [de, en]] of Object.entries(legal)) { await og(`${k}-de.png`, de, claim.de); await og(`${k}-en.png`, en, claim.en); }
console.log('Assets erzeugt.');
