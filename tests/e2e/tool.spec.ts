import { expect, test, type Page, type Request } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';
import { samplePracticeIcs, samplePracticeCsv, encodeWindows1252 } from '../../src/lib/sample';

const PAGES = ['', 'en/', 'google-kalender-datei-zu-gross/', 'en/split-google-calendar/', 'datenschutz/'];

async function noHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, 'seitliches Scrollen').toBeLessThanOrEqual(cw);
}

async function ready(page: Page) {
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

async function upload(page: Page, name: string, data: Uint8Array | string, mime: string) {
  await ready(page);
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: mime, buffer: Buffer.from(data) });
}

test.describe('360 px Breite', () => {
  test.use({ viewport: { width: 360, height: 780 } });
  test('Studio am Handy: Termin antippen zeigt das Bearbeitungsfeld sofort', async ({ page }) => {
    await page.goto('');
    await ready(page);
    await page.getByRole('button', { name: /Praxis-Kalender/ }).click();
    await expect(page.getByRole('heading', { name: /Kalender in der Datei/ })).toBeVisible({ timeout: 30_000 });
    await page.locator('.row-open').nth(5).click();
    await expect(page.getByRole('heading', { name: 'Termin bearbeiten' })).toBeInViewport({ timeout: 5_000 });
    await page.getByRole('textbox', { name: 'Titel' }).press('Escape');
    await expect(page.getByRole('heading', { name: 'Termin bearbeiten' })).toHaveCount(0);
    await noHorizontalScroll(page);
  });
  for (const p of PAGES) {
    test(`kein seitliches Scrollen: /${p}`, async ({ page }) => {
      await page.goto(p);
      await noHorizontalScroll(page);
    });
  }
  test('kein seitliches Scrollen in Analyse, Editor und Export', async ({ page }) => {
    await page.goto('');
    await ready(page);
    await page.getByRole('button', { name: /Praxis-Kalender/ }).click();
    await expect(page.getByText('1 Kalender in der Datei')).toBeVisible({ timeout: 30_000 });
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: /Als eigene Kalender anlegen/ }).first().click();
    await noHorizontalScroll(page);
    await page.getByRole('tab', { name: /Prüfen/ }).click();
    await noHorizontalScroll(page);
    await page.getByRole('tab', { name: 'Übersicht' }).click();
    await noHorizontalScroll(page);
    await page.getByRole('button', { name: 'Für Google exportieren' }).click();
    await expect(page.getByRole('heading', { name: /Fertig!/ })).toBeVisible();
    await noHorizontalScroll(page);
  });
});

test('ICS: Kalender analysieren, nach Kürzeln aufteilen, Teile unter 950 KB herunterladen', async ({ page }) => {
  await page.goto('');
  await upload(page, 'praxis.ics', samplePracticeIcs({ perYear: 1200 }), 'text/calendar');
  await expect(page.getByText('1 Kalender in der Datei')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Kürzel – mögliche Unterkalender/)).toBeVisible();
  await page.getByRole('button', { name: /Als eigene Kalender anlegen/ }).first().click();
  await expect(page.getByRole('heading', { name: /Ziel-Kalender für den Export/ })).toContainText('7');
  await page.getByRole('button', { name: 'Für Google exportieren' }).click();
  const first = page.getByRole('button', { name: /^(Teil 1|Herunterladen)$/ }).first();
  const [dl] = await Promise.all([page.waitForEvent('download'), first.click()]);
  const path = await dl.path();
  const fs = await import('node:fs');
  const text = fs.readFileSync(path!, 'utf8');
  expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(950_000);
  expect(dl.suggestedFilename()).toMatch(/\.ics$/);
});

test('Studio: Kürzel filtern, Termin bearbeiten, verschieben, Bearbeitung landet im Export', async ({ page }) => {
  await page.goto('');
  await upload(page, 'praxis.ics', samplePracticeIcs({ perYear: 200, seed: 21 }), 'text/calendar');
  await expect(page.getByRole('heading', { name: /Kalender in der Datei/ })).toBeVisible({ timeout: 30_000 });
  await page.locator('.side-group .side-item').first().click();
  await expect(page.locator('.chip')).toContainText('Gefiltert');
  await page.locator('.row-open').first().click();
  const title = page.getByRole('textbox', { name: 'Titel' });
  const oldTitle = await title.inputValue();
  await title.fill(oldTitle + ', geändert');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText(/Gespeichert/)).toBeVisible();
  await expect(page.locator('.pill-edit').first()).toBeVisible();
  // zwei Termine in einen neuen Kalender verschieben
  const boxes = page.getByRole('checkbox', { name: 'Termin auswählen' });
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await page.getByRole('combobox', { name: 'Verschieben nach …' }).selectOption('__new');
  await expect(page.getByRole('heading', { name: /Ziel-Kalender für den Export/ })).toBeVisible();
  await expect(page.locator('.side-item', { hasText: 'Neuer Kalender 1' })).toContainText('2');
  await page.getByRole('button', { name: 'Für Google exportieren' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Alle als ZIP/ }).click()]);
  const fs = await import('node:fs');
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(new Uint8Array(fs.readFileSync((await dl.path())!)));
  const all = Object.values(files).map((f) => strFromU8(f)).join('');
  expect(all.replace(/\r\n /g, '')).toContain('SUMMARY:' + oldTitle.replace(/,/g, '\\,') + '\\, geändert');
});

test('Google-Export als ZIP mit zwei Kalendern', async ({ page }) => {
  await page.goto('');
  const zip = zipSync({ 'a/Praxis.ics': strToU8(samplePracticeIcs({ perYear: 60, seed: 1, name: 'Praxis' })), 'a/Privat.ics': strToU8(samplePracticeIcs({ perYear: 40, seed: 2, name: 'Privat' })) });
  await upload(page, 'export.ical.zip', zip, 'application/zip');
  await expect(page.getByText(/· 2 Kalender in der Datei/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.side-item', { hasText: 'Praxis' })).toBeVisible();
  await expect(page.locator('.side-item', { hasText: 'Privat' })).toBeVisible();
});

test('Mehrere ICS-Dateien auf einmal werden getrennte Kalender', async ({ page }) => {
  await page.goto('');
  await ready(page);
  await page.locator('input[type=file]').setInputFiles([
    { name: 'anna.ics', mimeType: 'text/calendar', buffer: Buffer.from(samplePracticeIcs({ perYear: 30, seed: 3, name: 'Anna' })) },
    { name: 'ben.ics', mimeType: 'text/calendar', buffer: Buffer.from(samplePracticeIcs({ perYear: 20, seed: 4, name: 'Ben' })) }
  ]);
  await expect(page.getByText(/2 Kalenderdateien \(ICS\)/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.side-item', { hasText: 'Anna' })).toBeVisible();
  await expect(page.locator('.side-item', { hasText: 'Ben' })).toBeVisible();
});

test('Gemischte Dateien: verständlicher Hinweis', async ({ page }) => {
  await page.goto('');
  await ready(page);
  await page.locator('input[type=file]').setInputFiles([
    { name: 'a.ics', mimeType: 'text/calendar', buffer: Buffer.from(samplePracticeIcs({ perYear: 5 })) },
    { name: 'b.csv', mimeType: 'text/csv', buffer: Buffer.from('Subject,Start Date\nTest,05/30/2026\n') }
  ]);
  await expect(page.getByRole('alert')).toContainText('Mehrere Dateien auf einmal');
});

test('CSV: Semikolon, Windows-Zeichensatz, Datenschutz und zeilengenaue Fehler', async ({ page }) => {
  await page.goto('');
  await upload(page, 'termine.csv', encodeWindows1252(samplePracticeCsv({ rows: 400, brokenRows: true })), 'text/csv');
  await expect(page.getByText(/Semikolon als Trennzeichen/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Persönliche Daten' }).click();
  await expect(page.getByRole('heading', { name: 'Spalte „Patient“' })).toBeVisible();
  const csvSize = page.locator('.studio-summary');
  const before = await csvSize.textContent();
  await page.getByRole('radiogroup', { name: 'Spalte „Patient“' }).getByRole('radio', { name: 'Weglassen' }).click();
  await expect(csvSize).not.toHaveText(before!, { timeout: 10_000 });
  await page.getByRole('tab', { name: /Prüfen/ }).click();
  await expect(page.getByText('Zeile 15:')).toBeVisible();
  await expect(page.getByText(/Das Ende liegt vor dem Beginn/)).toBeVisible();
  await page.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
  await expect(page.getByText('Alles geprüft – Google kann jeden Termin lesen.')).toBeVisible();
});

test('Datei verlässt das Gerät nicht: keine Netzwerkanfragen beim Verarbeiten', async ({ page }) => {
  await page.goto('');
  await page.waitForLoadState('networkidle');
  const meta = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
  expect(meta).toMatch(/connect-src https:\/\/freimoser\.github\.io\/robots\.txt[^;]*;/);
  expect(meta).not.toMatch(/connect-src[^;]*'self'/);
  const requests: Request[] = [];
  page.on('request', (r) => requests.push(r));
  await upload(page, 'praxis.ics', samplePracticeIcs({ perYear: 300 }), 'text/calendar');
  await expect(page.getByText('1 Kalender in der Datei')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Für Google exportieren' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^(Teil 1|Herunterladen)$/ }).first().click()]);
  await dl.path();
  const external = requests.filter((r) => !r.url().startsWith('http://localhost:4321/') && !r.url().startsWith('blob:') && !r.url().startsWith('data:'));
  expect(external.map((r) => r.url())).toEqual([]);
  expect(requests.filter((r) => r.method() !== 'GET').map((r) => r.url())).toEqual([]);
  expect(requests.filter((r) => r.url().startsWith('http')).map((r) => r.url())).toEqual([]);
});

test('Bedienung mit der Tastatur', async ({ page }) => {
  await page.goto('');
  // Sprunglink, Logo, Navigation … bis zum Dateiknopf
  let found = false;
  for (let i = 0; i < 15 && !found; i++) {
    await page.keyboard.press('Tab');
    found = (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Datei auswählen';
  }
  expect(found).toBe(true);
  // Beispiel per Tastatur laden
  await ready(page);
  await page.getByRole('button', { name: /Praxis-Kalender/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 Kalender in der Datei')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Aufräumen' }).focus();
  await page.keyboard.press('Enter');
  const box = page.getByRole('checkbox', { name: /Verwaltungsdaten/ });
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
});

test('Offline nach dem ersten Besuch', async ({ page, context }) => {
  await page.goto('');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
  await page.getByRole('button', { name: /Praxis-Kalender/ }).click();
  await expect(page.getByText('1 Kalender in der Datei')).toBeVisible({ timeout: 30_000 });
  await context.setOffline(false);
});

test('Englische Startseite und Sprachwechsel', async ({ page }) => {
  await page.goto('en/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/CSV to Calendar/);
  await page.getByRole('link', { name: 'Deutsch' }).click();
  await expect(page).toHaveURL(/\/csv-to-calendar\/$/);
});
