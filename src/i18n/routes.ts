// Seiten und ihre Adressen je Sprache. Alle Adressen relativ zum Basis-Pfad, immer mit Schrägstrich am Ende.

export type Lang = 'de' | 'en';
export const SITE = 'https://freimoser.github.io';
export const BASE = '/csv-to-calendar/';
export const LASTMOD = '2026-10-07';

export const ROUTES = {
  home: { de: '', en: 'en/' },
  limits: { de: 'google-kalender-limits/', en: 'en/google-calendar-limits/' },
  tooLarge: { de: 'google-kalender-datei-zu-gross/', en: 'en/google-calendar-import-file-too-large/' },
  importFails: { de: 'csv-datei-kann-nicht-importiert-werden/', en: 'en/cant-import-csv-to-google-calendar/' },
  split: { de: 'google-kalender-aufteilen/', en: 'en/split-google-calendar/' },
  excel: { de: 'excel-geburtstagsliste-google-kalender/', en: 'en/excel-to-google-calendar/' },
  ics: { de: 'ics-datei-google-kalender-importieren/', en: 'en/import-ics-file-to-google-calendar/' },
  convert: { de: 'csv-in-ics-umwandeln/', en: 'en/csv-to-ics-converter/' },
  undo: { de: 'google-kalender-import-rueckgaengig/', en: 'en/undo-google-calendar-import/' },
  imprint: { de: 'impressum/', en: 'en/legal-notice/' },
  privacy: { de: 'datenschutz/', en: 'en/privacy/' },
  terms: { de: 'nutzungsbedingungen/', en: 'en/terms/' }
} as const;

export type PageKey = keyof typeof ROUTES;

export const GUIDES: PageKey[] = ['tooLarge', 'importFails', 'split', 'limits', 'ics', 'excel', 'convert', 'undo'];
export const LEGAL: PageKey[] = ['imprint', 'privacy', 'terms'];

/** Pfad mit Basis, z. B. /csv-to-calendar/en/ */
export function path(key: PageKey, lang: Lang): string {
  return BASE + ROUTES[key][lang];
}

/** Absolute Adresse für Canonical, hreflang und Sitemap. */
export function url(key: PageKey, lang: Lang): string {
  return SITE + path(key, lang);
}

export function asset(p: string): string {
  return BASE + p.replace(/^\//, '');
}
