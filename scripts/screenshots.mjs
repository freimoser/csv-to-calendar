// Erzeugt Bildschirmfotos des ICS Editors mit erfundenen Beispieldaten für Startseite und Ratgeber.
// Voraussetzung: npm run build && npm run preview (Port 4321). Aufruf: npm run screenshots
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:4321/ics-editor/';
const out = (f) => fileURLToPath(new URL('../public/img/' + f, import.meta.url));
const meta = {};

async function shot(page, name, lang) {
  await page.waitForTimeout(400);
  const png = await page.locator('.app').screenshot({ animations: 'disabled' });
  const img = sharp(png).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 });
  const { width, height } = await img.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  await img.toFile(out(`${name}-${lang}.webp`));
  meta[`${name}-${lang}`] = { w: width, h: height };
  console.log('✓', `${name}-${lang}.webp`, width + '×' + height);
}

for (const lang of ['de', 'en']) {
  // Eigener Browser je Sprache, damit Datums- und Zeitfelder im passenden Format erscheinen
  const browser = await chromium.launch({ args: [lang === 'de' ? '--lang=de-DE' : '--lang=en-GB'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25, colorScheme: 'light', locale: lang === 'de' ? 'de-DE' : 'en-GB' });
  const start = async (which) => {
    await page.goto(BASE + (lang === 'de' ? '' : 'en/'));
    await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
    await page.locator('.samples button').nth(which).click();
    await page.waitForSelector('.app-loaded .side-item', { timeout: 60_000 });
    await page.waitForTimeout(800);
  };
  await start(0);
  await page.locator('.side-group .side-item').first().click();
  await page.waitForTimeout(900);
  await page.locator('.row-open').nth(2).click();
  await page.waitForSelector('.inspector');
  await shot(page, 'editor', lang);
  await page.locator('.seg-mini button').nth(1).click();
  await page.waitForSelector('.month-ev');
  await page.locator('.month-ev').nth(6).click();
  await shot(page, 'month', lang);
  await page.locator('.inspector .icon-btn').click();
  await page.locator('.side-group .btn-block-sm').first().click();
  await page.locator('#tab-split').click();
  await shot(page, 'split', lang);
  await page.locator('#tab-overview').click();
  await shot(page, 'overview', lang);
  await page.locator('#tab-clean').click();
  await page.locator('#panel-clean input[type=checkbox]').first().check();
  await shot(page, 'clean', lang);
  await page.locator('#tab-export').click();
  await shot(page, 'export', lang);
  await start(1);
  await page.locator('#tab-check').click();
  await shot(page, 'check', lang);
  await page.locator('#tab-privacy').click();
  await shot(page, 'privacy', lang);
  await start(2);
  await page.locator('.row-open').first().click();
  await shot(page, 'birthdays', lang);
  await page.close();
  await browser.close();
}
writeFileSync(fileURLToPath(new URL('../src/content/images.json', import.meta.url)), JSON.stringify(meta, null, 2) + '\n');
console.log('images.json geschrieben');
