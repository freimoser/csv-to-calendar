// Volltext aller Ratgeber für Antwortmaschinen (GEO) – Markdown, mit Quellen.
import { GUIDES as KEYS, url, type Lang } from '../i18n/routes';
import { GUIDES } from '../content/guides';
import { SRC, STAND, UPDATED } from '../content/sources';
import { strip } from '../content/links';

const md = (html: string) => strip(html.replace(/<\/(p|li|tr|h\d)>/g, '\n').replace(/<td>/g, ' | ').replace(/<li>/g, '- ')).replace(/\n{3,}/g, '\n\n').trim();

export function GET() {
  const out: string[] = [`# ICS Editor – Ratgeber im Volltext / guides in full\n\nQuellen geprüft am ${STAND.de}, aktualisiert am ${UPDATED.de}.\n`];
  for (const lang of ['de', 'en'] as Lang[]) for (const k of KEYS) {
    const def = GUIDES[k], g = def[lang];
    out.push(`\n---\n\n## ${g.h1}\n\nURL: ${url(k, lang)}\n\n${strip(g.answer)}\n\n### ${g.stepsTitle}\n\n${g.steps.map((s, i) => `${i + 1}. **${s.name}:** ${s.text}`).join('\n')}\n`);
    for (const s of g.sections) out.push(`### ${s.h2}\n\n${md(s.html)}\n`);
    out.push(`### FAQ\n\n${g.faq.map((f) => `**${f.q}**\n${f.a}`).join('\n\n')}\n`);
    out.push(`### ${lang === 'de' ? 'Quellen' : 'Sources'}\n\n${def.sources.map((s) => `- ${SRC[s][lang]}: ${SRC[s].url}`).join('\n')}\n`);
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
