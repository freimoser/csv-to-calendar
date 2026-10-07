import { defineConfig, devices } from '@playwright/test';
// NUR LOKAL: PRIVATE_SAMPLE=/pfad/datei.zip npx playwright test -c playwright.private.config.ts
export default defineConfig({
  testDir: 'tests/private',
  testMatch: /.*\.spec\.ts/,
  timeout: 180_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4321/ics-editor/' },
  webServer: { command: 'npx astro preview --port 4321', port: 4321, reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
