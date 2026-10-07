import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Einzige erlaubte Verbindung: die öffentliche robots.txt der Domain (Suchmaschinen-Prüfungen wie Lighthouse
// lesen sie aus dem Seitenkontext). Für lokale Messungen kann LOCAL_ROBOTS=http://localhost:4321/robots.txt gesetzt werden.
const ROBOTS = ['https://freimoser.github.io/robots.txt', process.env.LOCAL_ROBOTS].filter(Boolean).join(' ');

// GitHub Pages: https://freimoser.github.io/ics-editor/
export default defineConfig({
  site: 'https://freimoser.github.io',
  base: '/ics-editor/',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [preact()],
  vite: { worker: { format: 'es' } },
  security: {
    // Astro ergänzt script-src und style-src mit Hashes. connect-src erlaubt nur die robots.txt – die Seite
    // (und der Worker aus der blob:-Adresse) kann keine Daten an andere Adressen verschicken.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        `connect-src ${ROBOTS}`,
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'"
      ]
    }
  }
});
