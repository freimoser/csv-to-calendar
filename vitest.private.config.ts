import { defineConfig } from 'vitest/config';
// Nur lokal: PRIVATE_SAMPLE=/pfad/zur/datei npm run test:private – gibt ausschließlich Kennzahlen aus.
export default defineConfig({ test: { include: ['tests/private/**/*.test.ts'], testTimeout: 120000 } });
