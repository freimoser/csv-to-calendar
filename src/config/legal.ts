// Einzige Quelle für alle Rechtsangaben (Impressum, Datenschutz, Footer, Schema).
// Angaben nach § 5 DDG, freigegeben von Thomas Freimoser am 8.10.2026.
// Solange street/zip leer sind, blockiert scripts/check-launch.mjs das Deployment.

export const LEGAL = {
  operator: 'Thomas Freimoser',
  street: 'Schinkelstraße 15',
  zip: '80805',
  city: 'München',
  country: 'Deutschland',
  countryEn: 'Germany',
  /** gegen einfache Spam-Sammler nicht als Link */
  emailDisplay: '91Serdar [at] gmail.com',
  linkedin: 'https://linkedin.com/in/freimoser',
  responsible: 'Thomas Freimoser',
  website: 'https://freimoser.github.io/freimoser.de/',
  repo: 'https://github.com/freimoser/ics-editor'
} as const;

export const ADDRESS_MISSING = !LEGAL.street || !LEGAL.zip;
