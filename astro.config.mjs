import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// GitHub Pages: https://freimoser.github.io/csv-to-calendar/
export default defineConfig({
  site: 'https://freimoser.github.io',
  base: '/csv-to-calendar/',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [preact()],
  vite: { worker: { format: 'es' } }
});
