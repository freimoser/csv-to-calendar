// NUR LOKAL. Lädt die echte Datei in die Oberfläche und gibt ausschließlich Zahlen aus.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const path = process.env.PRIVATE_SAMPLE;
test.skip(!path, 'PRIVATE_SAMPLE nicht gesetzt');

test('echte Datei: Kalender erkennen, Kennzahlen, Aufteilen nach Kürzeln', async ({ page }) => {
  await page.goto('');
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
  await page.locator('input[type=file]').setInputFiles({ name: 'export.zip', mimeType: 'application/zip', buffer: readFileSync(path!) });
  await expect(page.getByText(/1 Kalender in der Datei/)).toBeVisible({ timeout: 60_000 });
  const kpis = await page.locator('.kpi').evaluateAll((els) => els.map((e) => [e.querySelector('.kpi-label')?.textContent, e.querySelector('.kpi-value')?.textContent]));
  const insights = await page.locator('.insights li').count();
  console.log('Kennzahlen:', JSON.stringify(kpis.filter(([l]) => /Termine|Größe|Google|Serien|Zeitraum/.test(l || ''))));
  console.log('Hinweise:', insights);
  await page.getByRole('button', { name: /Auf mehrere Kalender aufteilen/ }).click();
  await page.getByText('Nach Personen oder Stichwörtern').click();
  const chip = page.getByRole('button', { name: /Kürzel übernehmen/ });
  console.log('Vorschlag:', (await chip.textContent())?.replace(/[A-ZÄÖÜ]{2,3}/g, '…'));
  await chip.click();
  await expect(page.getByText(/Ziel-Kalender/).last()).toBeVisible();
  await page.waitForTimeout(2000);
  const label = await page.locator('.live .kpi-label', { hasText: 'Ziel-Kalender' }).textContent();
  const counts = await page.locator('.target-list li span.muted').allTextContents();
  console.log(label, '· Termine je Ziel:', counts.join(' / '));
  await page.getByRole('tab', { name: 'Aufräumen' }).click();
  await page.getByRole('checkbox', { name: /Verwaltungsdaten/ }).check();
  await page.waitForTimeout(1500);
  console.log('Nach Weglassen der Verwaltungsdaten – ICS:', await page.locator('.mini').first().textContent());
  await page.getByRole('button', { name: 'Weiter zum Herunterladen' }).click();
  const parts = await page.locator('.parts .part').count();
  const sizes = await page.locator('.parts .part .muted').allTextContents();
  const kb = sizes.map((s) => +(/(\d+) KB/.exec(s)?.[1] ?? 0));
  console.log('Dateien:', parts, '· größte:', Math.max(...kb), 'KB');
  expect(Math.max(...kb)).toBeLessThanOrEqual(950);
});
