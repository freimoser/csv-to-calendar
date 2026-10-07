// Einzige Quelle für alle Rechtsangaben (Impressum, Datenschutz, Footer, Schema).
// Angaben übernommen aus https://freimoser.github.io/freimoser.de/impressum/ (Stand 7.10.2026).
// Die Quelle nennt keine vollständige Anschrift. § 5 DDG verlangt eine ladungsfähige Anschrift –
// solange street/zip leer sind, blockiert scripts/check-launch.mjs das Deployment.

export const LEGAL = {
  operator: 'S. Thomas Freimoser',
  street: '',
  zip: '',
  city: 'München',
  country: 'Deutschland',
  countryEn: 'Germany',
  /** Darstellung wie in der Quelle, gegen einfache Spam-Sammler */
  emailDisplay: 'kontakt [at] freimoser.de',
  linkedin: 'https://linkedin.com/in/freimoser',
  responsible: 'S. Thomas Freimoser',
  website: 'https://freimoser.github.io/freimoser.de/',
  repo: 'https://github.com/freimoser/csv-to-calendar'
} as const;

export const ADDRESS_MISSING = !LEGAL.street || !LEGAL.zip;
