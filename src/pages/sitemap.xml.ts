import { GUIDES, LASTMOD, SITE, asset, url, type Lang, type PageKey } from '../i18n/routes';
import { GUIDES as CONTENT } from '../content/guides';
import { HOME } from '../content/home';
import IMG from '../content/images.json';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function images(p: PageKey, l: Lang): { name: string; caption: string }[] {
  const list = p === 'home' ? HOME[l].how.map(([name, caption]) => ({ name, caption })) : CONTENT[p] ? CONTENT[p].figures.map((f) => ({ name: f.name, caption: f[l] })) : [];
  return list.filter((i) => (IMG as Record<string, unknown>)[`${i.name}-${l}`]);
}

// Nur indexierbare Seiten. Jede URL mit Schrägstrich am Ende und mit ihren Sprachversionen.
export function GET() {
  const pages: PageKey[] = ['home', ...GUIDES, 'about'];
  const langs: Lang[] = ['de', 'en'];
  const rows = pages.flatMap((p) => langs.map((l) => `  <url>
    <loc>${url(p, l)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <xhtml:link rel="alternate" hreflang="de" href="${url(p, 'de')}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${url(p, 'en')}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(p, 'en')}"/>
${images(p, l).map((i) => `    <image:image>\n      <image:loc>${SITE + asset(`img/${i.name}-${l}.webp`)}</image:loc>\n    </image:image>`).join('\n')}
  </url>`.replace(/\n\n/g, '\n')));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
