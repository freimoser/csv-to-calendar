import { path, type Lang, type PageKey, ROUTES } from '../i18n/routes';

/** Ersetzt {seite|Text} durch interne Links und {tool|Text} durch einen Link zum Werkzeug. */
export function linkify(html: string, lang: Lang): string {
  return html.replace(/\{(\w+)\|([^}]+)\}/g, (_, key: string, text: string) => {
    if (key === 'tool') return `<a href="${path('home', lang)}#werkzeug">${text}</a>`;
    if (!(key in ROUTES)) throw new Error('Unbekannter Link: ' + key);
    return `<a href="${path(key as PageKey, lang)}">${text}</a>`;
  });
}

export const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\{(\w+)\|([^}]+)\}/g, '$2');
