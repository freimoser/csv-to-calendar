// Rechtstexte. Alle Angaben zur Person kommen aus src/config/legal.ts.
import { ADDRESS_MISSING, LEGAL } from '../config/legal';
import type { Lang } from '../i18n/routes';

const PLACEHOLDER = '<span class="placeholder">[ANSCHRIFT FEHLT – vor Livegang eintragen]</span>';

function address(lang: Lang): string {
  const country = lang === 'de' ? LEGAL.country : LEGAL.countryEn;
  if (ADDRESS_MISSING) return `${PLACEHOLDER}<br>${LEGAL.city}, ${country}`;
  return `${LEGAL.street}<br>${LEGAL.zip} ${LEGAL.city}<br>${country}`;
}

export interface LegalDoc { title: string; description: string; h1: string; html: string }

const OSS = [
  ['Preact', 'MIT', 'https://github.com/preactjs/preact'],
  ['Astro', 'MIT', 'https://github.com/withastro/astro'],
  ['fflate', 'MIT', 'https://github.com/101arrowz/fflate'],
  ['Papa Parse', 'MIT', 'https://github.com/mholt/PapaParse'],
  ['SheetJS Community Edition', 'Apache-2.0', 'https://git.sheetjs.com/sheetjs/sheetjs'],
  ['Atkinson Hyperlegible (Schrift / font)', 'SIL Open Font License 1.1', 'https://github.com/fontsource/font-files']
];
const ossList = () => '<ul>' + OSS.map(([n, l, u]) => `<li><a href="${u}" rel="noopener">${n}</a> – ${l}</li>`).join('') + '</ul>';

export const LEGAL_PAGES: Record<'imprint' | 'privacy' | 'terms', Record<Lang, LegalDoc>> = {
  imprint: {
    de: {
      title: 'Impressum – CSV to Calendar',
      description: 'Impressum von CSV to Calendar nach § 5 DDG.',
      h1: 'Impressum',
      html: `
<h2>Angaben gemäß § 5 DDG</h2>
<p><strong>${LEGAL.operator}</strong><br>${address('de')}</p>
<h2>Kontakt</h2>
<p>E-Mail: ${LEGAL.emailDisplay}<br>LinkedIn: <a href="${LEGAL.linkedin}" rel="noopener">linkedin.com/in/freimoser</a></p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>${LEGAL.responsible}<br>(Anschrift wie oben)</p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung und Urheberrecht</h2>
<p>Hinweise zur Haftung für Inhalte und Links sowie zum Urheberrecht stehen in den <a href="../nutzungsbedingungen/">Nutzungsbedingungen</a>.</p>`
    },
    en: {
      title: 'Legal notice – CSV to Calendar',
      description: 'Legal notice (Impressum) of CSV to Calendar according to § 5 DDG.',
      h1: 'Legal notice',
      html: `
<p class="muted">This page is a translation of the German Impressum required by § 5 DDG (German Digital Services Act).</p>
<h2>Provider</h2>
<p><strong>${LEGAL.operator}</strong><br>${address('en')}</p>
<h2>Contact</h2>
<p>Email: ${LEGAL.emailDisplay}<br>LinkedIn: <a href="${LEGAL.linkedin}" rel="noopener">linkedin.com/in/freimoser</a></p>
<h2>Responsible for content (§ 18(2) MStV)</h2>
<p>${LEGAL.responsible}<br>(address as above)</p>
<h2>Consumer dispute resolution</h2>
<p>I am neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
<h2>Liability and copyright</h2>
<p>Notes on liability for content and links and on copyright are in the <a href="../terms/">terms of use</a>.</p>`
    }
  },
  privacy: {
    de: {
      title: 'Datenschutz – CSV to Calendar',
      description: 'Datenschutzerklärung: Deine Dateien verlassen dein Gerät nicht. Keine Cookies, kein Tracking. Nur GitHub verarbeitet als Hoster Zugriffsdaten.',
      h1: 'Datenschutzerklärung',
      html: `
<div class="cta"><div class="cta-text"><div class="cta-title">Das Wichtigste in drei Sätzen</div>
<p class="m0">Deine Dateien verlassen dein Gerät nicht – das Werkzeug arbeitet ausschließlich in deinem Browser. Diese Website setzt keine Cookies, misst nichts und lädt nichts von Dritten nach. Nur GitHub verarbeitet als Hoster beim Aufruf technische Zugriffsdaten wie deine IP-Adresse.</p></div></div>
<h2>1. Verantwortlicher</h2>
<p>${LEGAL.operator}<br>${address('de')}<br>E-Mail: ${LEGAL.emailDisplay}</p>
<h2>2. Hosting bei GitHub Pages</h2>
<p>Diese Website wird über GitHub Pages ausgeliefert, einen Dienst der GitHub, Inc. (USA). Laut GitHub wird beim Aufruf einer GitHub-Pages-Seite die IP-Adresse der Besucherin oder des Besuchers aus Sicherheitsgründen protokolliert und gespeichert – unabhängig davon, ob man bei GitHub angemeldet ist (<a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" rel="noopener">GitHub-Dokumentation</a>). Zusätzlich fallen technisch notwendige Angaben wie aufgerufene Adresse, Zeitpunkt und Browserkennung an.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO: Ich habe ein berechtigtes Interesse daran, die Website sicher und zuverlässig auszuliefern. Dabei können Daten in die USA übermittelt werden. Wie GitHub mit diesen Daten umgeht und auf welcher Grundlage die Übermittlung erfolgt, beschreibt die <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">Datenschutzerklärung von GitHub</a>. Auf diese Protokolle habe ich keinen Zugriff.</p>
<h2>3. Das Werkzeug: Verarbeitung nur auf deinem Gerät</h2>
<p>Dateien, die du im Werkzeug öffnest (CSV, Excel, ICS, ZIP), werden ausschließlich im Arbeitsspeicher deines Browsers verarbeitet. Sie werden nicht hochgeladen, nicht an mich oder Dritte übermittelt und nicht dauerhaft gespeichert. Schließt du die Seite, sind sie weg.</p>
<p>Das ist technisch abgesichert: Die Seite gibt sich eine Sicherheitsrichtlinie (Content-Security-Policy), deren Regel <code>connect-src</code> nur eine einzige Adresse erlaubt – die öffentliche Datei <code>robots.txt</code> dieser Domain, die Suchmaschinen-Prüfprogramme abrufen. Jede andere Verbindung blockiert der Browser. Das Werkzeug selbst ruft auch diese Adresse nie auf; ein automatischer Test prüft bei jeder Änderung, dass beim Verarbeiten einer Datei keine einzige Netzwerkanfrage entsteht. Die Rechenarbeit läuft in einem Web Worker, für den dieselbe Richtlinie gilt.</p>
<p>Enthalten deine Dateien personenbezogene Daten Dritter – etwa Patienten- oder Kundendaten, auch Gesundheitsdaten im Sinne von Art. 9 DSGVO –, erhalte ich davon nichts. Für den späteren Import in Google Kalender bist du selbst verantwortlich; das Werkzeug hilft, solche Angaben vorher wegzulassen oder zu kürzen.</p>
<h2>4. Keine Cookies, keine Messung, keine Dritten</h2>
<p>Diese Website setzt keine Cookies, verwendet keine Analyse- oder Werbedienste und bindet keine Inhalte Dritter ein. Schriften und alle Programmteile werden von derselben Adresse geladen.</p>
<p>Damit das Werkzeug nach dem ersten Besuch auch ohne Internet läuft, legt dein Browser die Dateien dieser Website (Seiten, Programmcode, Schrift) in einem Zwischenspeicher ab (Service Worker). Darin stehen <strong>keine Angaben über dich</strong> und keine Kennung. Du kannst den Zwischenspeicher jederzeit in den Browser-Einstellungen löschen.</p>
<h2>5. Google Search Console</h2>
<p>Diese Website ist in der Google Search Console angemeldet. <strong>Dabei wird nichts in deinem Browser geladen und nichts über dich an mich übermittelt.</strong> Der Inhabernachweis besteht aus einer Zeile im Quelltext der Seite, die dein Browser nicht ausführt; es gibt kein Skript, kein Cookie und keinen Zählpixel. Die Daten in der Search Console entstehen bei Google im Rahmen der Suche – unabhängig davon, ob du diese Website je aufrufst – und ich sehe sie nur zusammengefasst. Für eine Auskunft zu deinen Suchdaten ist Google der richtige Ansprechpartner.</p>
<h2>6. Kontakt per E-Mail</h2>
<p>Schreibst du mir eine E-Mail, verarbeite ich deine Angaben, um die Anfrage zu beantworten (Art. 6 Abs. 1 lit. f DSGVO). Die Nachricht lösche ich, wenn sie erledigt ist und keine Aufbewahrungspflicht besteht.</p>
<h2>7. Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim <a href="https://www.lda.bayern.de" rel="noopener">Bayerischen Landesamt für Datenschutzaufsicht</a>.</p>
<h2>8. Keine automatisierte Entscheidungsfindung</h2>
<p>Es findet keine automatisierte Entscheidungsfindung und kein Profiling statt.</p>
<p class="muted">Stand: 7. Oktober 2026</p>`
    },
    en: {
      title: 'Privacy – CSV to Calendar',
      description: 'Privacy policy: your files never leave your device. No cookies, no tracking. Only GitHub, as host, processes access data.',
      h1: 'Privacy policy',
      html: `
<div class="cta"><div class="cta-text"><div class="cta-title">The essentials in three sentences</div>
<p class="m0">Your files never leave your device – the tool works exclusively in your browser. This website sets no cookies, measures nothing and loads nothing from third parties. Only GitHub, as the host, processes technical access data such as your IP address when you visit.</p></div></div>
<h2>1. Controller</h2>
<p>${LEGAL.operator}<br>${address('en')}<br>Email: ${LEGAL.emailDisplay}</p>
<h2>2. Hosting on GitHub Pages</h2>
<p>This website is served via GitHub Pages, a service of GitHub, Inc. (USA). According to GitHub, when a GitHub Pages site is visited, the visitor’s IP address is logged and stored for security purposes, regardless of whether the visitor is signed in to GitHub (<a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" rel="noopener">GitHub documentation</a>). Technically necessary details such as the requested address, time and browser identifier are also processed.</p>
<p>The legal basis is Art. 6(1)(f) GDPR: I have a legitimate interest in delivering the website securely and reliably. Data may be transferred to the USA. How GitHub handles this data and on what basis transfers take place is described in <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub’s privacy statement</a>. I have no access to these logs.</p>
<h2>3. The tool: processing on your device only</h2>
<p>Files you open in the tool (CSV, Excel, ICS, ZIP) are processed exclusively in your browser’s memory. They are not uploaded, not sent to me or third parties and not stored permanently. When you close the page, they are gone.</p>
<p>This is enforced technically: the page sets a Content Security Policy whose <code>connect-src</code> rule allows exactly one address – this domain’s public <code>robots.txt</code>, which search-engine audit tools fetch. The browser blocks every other connection. The tool itself never requests even that address; an automated test checks with every change that processing a file causes no network request at all. The computation runs in a web worker subject to the same policy.</p>
<p>If your files contain personal data of third parties – such as patient or customer data, including health data within the meaning of Art. 9 GDPR – I receive none of it. You are responsible for any later import into Google Calendar; the tool helps you leave out or shorten such details beforehand.</p>
<h2>4. No cookies, no measurement, no third parties</h2>
<p>This website sets no cookies, uses no analytics or advertising services and embeds no third-party content. Fonts and all program code are loaded from the same address.</p>
<p>So that the tool also works offline after your first visit, your browser keeps this website’s files (pages, program code, font) in a cache (service worker). It contains <strong>no information about you</strong> and no identifier. You can clear it at any time in your browser settings.</p>
<h2>5. Google Search Console</h2>
<p>This website is registered in Google Search Console. <strong>Nothing is loaded in your browser and nothing about you is sent to me.</strong> Ownership is verified by a line in the page source that your browser doesn’t execute; there is no script, no cookie and no tracking pixel. Search Console data is generated by Google as part of search – regardless of whether you ever visit this website – and I only see it in aggregate. For information about your search data, Google is the right contact.</p>
<h2>6. Contact by email</h2>
<p>If you email me, I process your details to answer your request (Art. 6(1)(f) GDPR). I delete the message once it has been dealt with and no retention obligation applies.</p>
<h2>7. Your rights</h2>
<p>You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and objection (Art. 21). You can also lodge a complaint with a data protection supervisory authority, for example the <a href="https://www.lda.bayern.de" rel="noopener">Bavarian Data Protection Authority (BayLDA)</a>.</p>
<h2>8. No automated decision-making</h2>
<p>There is no automated decision-making and no profiling.</p>
<p class="muted">As of 7 October 2026</p>`
    }
  },
  terms: {
    de: {
      title: 'Nutzungsbedingungen – CSV to Calendar',
      description: 'Nutzungsbedingungen und Haftungshinweise für das kostenlose Werkzeug CSV to Calendar.',
      h1: 'Nutzungsbedingungen und Haftung',
      html: `
<h2>1. Kostenlos und ohne Anmeldung</h2>
<p>CSV to Calendar ist ein kostenloses Werkzeug. Es gibt keine Anmeldung, keinen Kauf und kein Abonnement. Weil dabei kein Vertrag mit Leistungspflichten entsteht, gibt es keine Allgemeinen Geschäftsbedingungen – diese Seite fasst zusammen, was du wissen solltest.</p>
<h2>2. Ergebnisse prüfen</h2>
<p>Das Werkzeug wurde sorgfältig entwickelt und automatisch getestet. Trotzdem kann ich nicht garantieren, dass jede Datei fehlerfrei umgewandelt wird. Prüfe das Ergebnis bitte, bevor du dich darauf verlässt. Importiere am besten zuerst in einen neuen, leeren Kalender – den kannst du bei Bedarf komplett löschen.</p>
<h2>3. Deine Verantwortung für die Daten</h2>
<p>Deine Dateien bleiben auf deinem Gerät. Was du anschließend in Google Kalender oder ein anderes Programm importierst, liegt in deiner Verantwortung – insbesondere, wenn die Termine personenbezogene Daten Dritter enthalten, zum Beispiel Patienten- oder Kundendaten.</p>
<h2>4. Haftung</h2>
<p>Ich hafte unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Im Übrigen ist die Haftung für das unentgeltliche Werkzeug ausgeschlossen, soweit gesetzlich zulässig.</p>
<h2>5. Haftung für Inhalte und Links</h2>
<p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt; die Angaben zu Google Kalender stammen aus der Hilfe von Google (Stand siehe jeweilige Seite). Für Richtigkeit, Vollständigkeit und Aktualität kann ich keine Gewähr übernehmen. Als Diensteanbieter bin ich nach § 7 Abs. 1 DDG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Für Inhalte verlinkter fremder Websites ist stets deren Anbieter verantwortlich.</p>
<h2>6. Marken</h2>
<p>Google und Google Kalender sind Marken der Google LLC. Diese Website ist ein unabhängiges Angebot und steht in keiner Verbindung zu Google.</p>
<h2>7. Urheberrecht und Open-Source-Software</h2>
<p>Die Inhalte dieser Website unterliegen dem deutschen Urheberrecht. Das Werkzeug verwendet folgende Open-Source-Software unter ihren jeweiligen Lizenzen:</p>
${ossList()}`
    },
    en: {
      title: 'Terms of use – CSV to Calendar',
      description: 'Terms of use and liability notes for the free tool CSV to Calendar.',
      h1: 'Terms of use and liability',
      html: `
<h2>1. Free and without sign-up</h2>
<p>CSV to Calendar is a free tool. There is no sign-up, no purchase and no subscription. Since no contract with performance obligations is formed, there are no general terms and conditions – this page summarises what you should know.</p>
<h2>2. Check the results</h2>
<p>The tool has been developed carefully and is tested automatically. Still, I can’t guarantee that every file will be converted without errors. Please check the result before relying on it. Ideally, import into a new, empty calendar first – you can delete it completely if needed.</p>
<h2>3. Your responsibility for the data</h2>
<p>Your files stay on your device. What you then import into Google Calendar or another app is your responsibility – especially if the events contain personal data of third parties, such as patient or customer data.</p>
<h2>4. Liability</h2>
<p>I am liable without limitation for intent and gross negligence and for damage resulting from injury to life, body or health. Otherwise, liability for this free tool is excluded to the extent permitted by law.</p>
<h2>5. Liability for content and links</h2>
<p>The content of this website has been created with great care; information about Google Calendar comes from Google’s help pages (see the date on each page). I can’t guarantee accuracy, completeness or timeliness. As a service provider I am responsible for my own content under § 7(1) DDG in accordance with general law. The respective provider is always responsible for the content of linked third-party websites.</p>
<h2>6. Trademarks</h2>
<p>Google and Google Calendar are trademarks of Google LLC. This website is an independent offering and is not affiliated with Google.</p>
<h2>7. Copyright and open-source software</h2>
<p>The content of this website is protected by German copyright law. The tool uses the following open-source software under its respective licences:</p>
${ossList()}`
    }
  }
};
