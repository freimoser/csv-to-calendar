import { GUIDES, LASTMOD, url, type Lang, type PageKey } from '../i18n/routes';

// Nur indexierbare Seiten. Jede URL mit Schrägstrich am Ende und mit ihren Sprachversionen.
export function GET() {
  const pages: PageKey[] = ['home', ...GUIDES];
  const langs: Lang[] = ['de', 'en'];
  const rows = pages.flatMap((p) => langs.map((l) => `  <url>
    <loc>${url(p, l)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <xhtml:link rel="alternate" hreflang="de" href="${url(p, 'de')}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url(p, 'en')}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(p, 'en')}"/>
  </url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
