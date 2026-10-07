import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '../../i18n/routes';
import type { Focus, Loaded, PlanResult, TableInfo, Format } from '../../lib/engine';
import type { CleanOptions, Selection, SplitConfig } from '../../lib/plan';
import type { Column, ConvertOptions, Role } from '../../lib/table';
import { ALL, NO_CLEAN, NO_SPLIT } from '../../lib/plan';
import { todayWall } from '../../lib/datetime';
import { call, download, latest, warmUp } from './client';
import { H, HELP, Icon, LangCtx, Status, useT } from './ui';
import { type Tab } from './Editor';
import { Studio } from './Studio';
import { Export } from './Export';

type Screen = 'start' | 'loading' | 'date' | 'studio' | 'export';

function detect(name: string, b: Uint8Array): 'ics' | 'zip' | 'csv' | 'xlsx' {
  const l = name.toLowerCase();
  if (b[0] === 0x50 && b[1] === 0x4b) return /\.(xlsx|xlsm|ods)$/.test(l) ? 'xlsx' : 'zip';
  if (/\.(xlsx|xlsm|xls|ods)$/.test(l) || (b[0] === 0xd0 && b[1] === 0xcf)) return 'xlsx';
  if (/\.(ics|ical|ifb)$/.test(l)) return 'ics';
  const head = new TextDecoder('latin1').decode(b.subarray(0, 64)).replace(/^﻿|^ï»¿/, '').trimStart().toUpperCase();
  return head.startsWith('BEGIN:VCALENDAR') ? 'ics' : 'csv';
}

export function defaultConvert(lang: Lang): ConvertOptions {
  return {
    tz: 'Europe/Berlin', defaultMinutes: 30, orders: {}, pii: {}, fixes: {}, birthdays: false, birthdayYearInTitle: true,
    birthdayPrefix: lang === 'de' ? 'Geburtstag: ' : 'Birthday: ', birthdayYearLabel: lang === 'de' ? 'geb. ' : 'born ',
    defaultSubject: lang === 'de' ? 'Termin' : 'Event', thisYear: new Date().getFullYear()
  };
}

const DATE_ROLES: Role[] = ['startDate', 'endDate', 'start', 'end', 'birthday'];

export default function Tool({ lang }: { lang: Lang }) {
  return (
    <LangCtx.Provider value={lang}>
      <App />
    </LangCtx.Provider>
  );
}

function App() {
  const { t, lang, n, b } = useT();
  const today = useMemo(() => todayWall(), []);
  const [screen, setScreen] = useState<Screen>('start');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [roles, setRoles] = useState<Record<number, Role>>({});
  const [conv, setConv] = useState<ConvertOptions>(() => defaultConvert(lang));
  const [askCols, setAskCols] = useState<number[]>([]);
  const [sel, setSel] = useState<Selection>({ ...ALL, today });
  const [clean, setClean] = useState<CleanOptions>({ ...NO_CLEAN });
  const [split, setSplit] = useState<SplitConfig>({ ...NO_SPLIT, restName: t('s.restDefault') });
  const [format, setFormat] = useState<Format>('ics');
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [focus, setFocus] = useState<Focus>(null);
  const [editsVersion, setEditsVersion] = useState(0);
  const [simple, setSimple] = useState(true);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const planLatest = useMemo(() => latest<PlanResult>(), []);
  const convLatest = useMemo(() => latest<Loaded>(), []);
  const lastConvert = useRef('');

  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback;
    if (idle) idle(() => warmUp()); else setTimeout(warmUp, 1500);
  }, []);

  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [screen]);
  useEffect(() => {
    document.documentElement.classList.toggle('studio-mode', screen === 'studio' || screen === 'export');
  }, [screen]);

  // Live-Berechnung bei jeder Änderung
  useEffect(() => {
    if (!loaded || !loaded.calendars.length) return;
    const h = setTimeout(async () => {
      const r = await planLatest({ type: 'plan', req: { selection: sel, clean, split, format } });
      if (r) setPlan(r);
    }, 120);
    return () => clearTimeout(h);
  }, [loaded, sel, clean, split, format, editsVersion]);

  // Tabelle neu umwandeln, wenn Spalten oder Optionen sich ändern
  useEffect(() => {
    if (!table || screen === 'start' || screen === 'loading' || screen === 'date') return;
    const key = JSON.stringify([roles, conv]);
    if (key === lastConvert.current) return;
    const h = setTimeout(async () => {
      lastConvert.current = key;
      const r = await convLatest({ type: 'convert', roles, options: conv });
      if (r) setLoaded(r);
    }, 200);
    return () => clearTimeout(h);
  }, [roles, conv]);

  function resetEdits(kind: 'ics' | 'table', birthdays = false) {
    setSel({ ...ALL, today });
    setClean({ ...NO_CLEAN });
    setSplit({ ...NO_SPLIT, restName: t('s.restDefault') });
    setFormat(kind === 'ics' || birthdays ? 'ics' : 'csv');
    setPlan(null);
    setTab('list');
    setFocus(null);
    setSimple(true);
  }

  async function afterTable(info: TableInfo) {
    setTable(info);
    const r: Record<number, Role> = {};
    for (const c of info.columns) r[c.index] = c.role;
    setRoles(r);
    const birthdays = info.columns.some((c) => c.role === 'birthday');
    const opts = { ...defaultConvert(lang), birthdays };
    setConv(opts);
    const ask = info.columns.filter((c) => c.ambiguous && DATE_ROLES.includes(c.role)).map((c) => c.index);
    setAskCols(ask);
    resetEdits('table', birthdays);
    if (ask.length) { setScreen('date'); return; }
    await convertAndShow(r, opts);
  }

  async function convertAndShow(r: Record<number, Role>, opts: ConvertOptions) {
    lastConvert.current = JSON.stringify([r, opts]);
    const info = await call<Loaded>({ type: 'convert', roles: r, options: opts });
    setLoaded(info);
    if (!info.calendars[0]?.events) { setError(t('start.empty')); setScreen('start'); return; }
    setScreen('studio');
  }

  async function openBytes(name: string, bytes: Uint8Array) {
    setError('');
    setScreen('loading');
    try {
      const kind = detect(name, bytes);
      if (kind === 'ics' || kind === 'zip') {
        const info = await call<Loaded>({ type: 'loadIcs', name, bytes }, [bytes.buffer]);
        setTable(null);
        if (!info.calendars.some((c) => c.events > 0)) { setError(t('start.empty')); setScreen('start'); return; }
        setLoaded(info);
        resetEdits('ics');
        if (info.calendars.length > 1) setSplit((s) => ({ ...s, mode: 'source' }));
        setScreen('studio');
      } else if (kind === 'csv') {
        await afterTable(await call<TableInfo>({ type: 'loadCsv', name, bytes }, [bytes.buffer]));
      } else {
        const { readXlsxRows } = await import('../../lib/xlsx');
        const rows = await readXlsxRows(bytes);
        await afterTable(await call<TableInfo>({ type: 'loadRows', name, rows, totalBytes: bytes.length }));
      }
    } catch (e) {
      setError(t('start.error', { msg: e instanceof Error ? e.message : String(e) }));
      setScreen('start');
    }
  }

  async function openFiles(list: FileList | File[] | null | undefined) {
    const files = list ? [...list] : [];
    if (!files.length) return;
    if (files.length === 1) { await openBytes(files[0].name, new Uint8Array(await files[0].arrayBuffer())); return; }
    setError('');
    setScreen('loading');
    try {
      const read = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
      if (!read.every((f) => ['ics', 'zip'].includes(detect(f.name, f.bytes)))) { setError(t('start.multiMixed')); setScreen('start'); return; }
      const info = await call<Loaded>({ type: 'loadIcsMany', files: read }, read.map((f) => f.bytes.buffer));
      setTable(null);
      if (!info.calendars.some((c) => c.events > 0)) { setError(t('start.empty')); setScreen('start'); return; }
      setLoaded(info);
      resetEdits('ics');
      if (info.calendars.length > 1) setSplit((s) => ({ ...s, mode: 'source' }));
      setScreen('studio');
    } catch (e) {
      setError(t('start.error', { msg: e instanceof Error ? e.message : String(e) }));
      setScreen('start');
    }
  }

  async function sample(which: 'practice' | 'csv' | 'birthdays') {
    setError('');
    setScreen('loading');
    try {
      const r = await call<{ kind: 'ics' | 'table'; info: Loaded | TableInfo }>({ type: 'sample', which, lang });
      if (r.kind === 'ics') {
        setTable(null);
        setLoaded(r.info as Loaded);
        resetEdits('ics');
        setScreen('studio');
      } else await afterTable(r.info as TableInfo);
    } catch (e) {
      setError(t('start.error', { msg: e instanceof Error ? e.message : String(e) }));
      setScreen('start');
    }
  }

  async function templateCsv() {
    const f = await call<{ name: string; data: Uint8Array; type: string }>({ type: 'template' });
    download(lang === 'de' ? f.name : 'google-calendar-template.csv', f.data, f.type);
  }
  async function templateBirthdays() {
    const [{ writeXlsx }, { sampleBirthdayRows }] = await Promise.all([import('../../lib/xlsx'), import('../../lib/sample')]);
    const rows = lang === 'de' ? sampleBirthdayRows() : sampleBirthdayRows().map((r, i) => (i === 0 ? ['Name', 'Birthday', 'Phone'] : r));
    const data = await writeXlsx(rows, lang === 'de' ? 'Geburtstage' : 'Birthdays');
    download(lang === 'de' ? 'geburtstagsliste-vorlage.xlsx' : 'birthday-list-template.xlsx', data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  function answerDate(order: 'dmy' | 'mdy') {
    const [col, ...rest] = askCols;
    const opts = { ...conv, orders: { ...conv.orders, [col]: order } };
    setConv(opts);
    setAskCols(rest);
    if (!rest.length) void convertAndShow(roles, opts);
  }

  const stepIdx = screen === 'date' ? 1 : screen === 'studio' ? 2 : screen === 'export' ? 3 : 0;
  const isTable = !!table;

  return (
    <div class="tool" ref={topRef}>
      {stepIdx > 0 && (
        <ol class="stepper" aria-label={t('steps.label')}>
          {(['steps.file', 'steps.check', 'steps.download'] as const).map((k, i) => (
            <li class={i + 1 === stepIdx ? 'active' : i + 1 < stepIdx ? 'done' : ''} aria-current={i + 1 === stepIdx ? 'step' : undefined}>
              <span class="step-num">{i + 1 < stepIdx ? <Icon name="check" size={18} /> : i + 1}</span>
              {t(k)}
            </li>
          ))}
        </ol>
      )}

      {(screen === 'start' || screen === 'loading') && (
        <div class="start-grid">
          <div class="start-main">
            <div
              class={'dropzone' + (drag ? ' drag' : '')}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void openFiles(e.dataTransfer?.files); }}
            >
              {screen === 'loading' ? (
                <div class="loading" role="status" aria-live="polite"><span class="spinner" aria-hidden="true" />{t('start.loading')}</div>
              ) : (
                <>
                  <Icon name="file" size={56} class="accent" />
                  <div class="drop-title">{t('start.drop')}</div>
                  <div class="muted">{t('start.or')}</div>
                  <button type="button" class="btn btn-primary btn-xl" onClick={() => fileRef.current?.click()}>{t('start.choose')}</button>
                  <input ref={fileRef} type="file" multiple class="sr-only" tabIndex={-1} aria-hidden="true"
                    accept=".ics,.ical,.ifb,.zip,.csv,.txt,.tsv,.xlsx,.xlsm,.xls,.ods,text/calendar,text/csv"
                    onChange={async (e) => { const input = e.target as HTMLInputElement; await openFiles(input.files); input.value = ''; }} />
                  <div class="muted small">{t('start.types')}</div>
                </>
              )}
            </div>
            {error && <div class="status status-bad" role="alert"><Icon name="bad" size={28} /><div>{error}</div></div>}
            <div class="privacy-badge">
              <Icon name="lock" size={34} class="accent" />
              <div>
                <div class="privacy-title">{t('start.privTitle')}</div>
                <div>{t('start.privText')}</div>
                <div class="muted small">{t('start.privTry')}</div>
              </div>
            </div>
            <div class="samples">
              <span class="muted">{t('start.samples')}</span>
              <button type="button" class="btn btn-secondary" onClick={() => sample('practice')}>{t('start.samplePractice')}</button>
              <button type="button" class="btn btn-secondary" onClick={() => sample('csv')}>{t('start.sampleCsv')}</button>
              <button type="button" class="btn btn-secondary" onClick={() => sample('birthdays')}>{t('start.sampleBirthdays')}</button>
            </div>
          </div>
          <aside class="start-side">
            <div class="card">
              <h2 class="h3">{t('start.steps')}</h2>
              <ol class="steps-list">
                <H as="li" k="start.step1" />
                <H as="li" k="start.step2" />
                <H as="li" k="start.step3" />
              </ol>
            </div>
            <div class="card">
              <h2 class="h3">{t('start.templates')}</h2>
              <ul class="plain">
                <li><button type="button" class="link" onClick={templateCsv}><Icon name="download" size={20} />{t('start.tplCsv')}</button></li>
                <li><button type="button" class="link" onClick={templateBirthdays}><Icon name="download" size={20} />{t('start.tplBirthdays')}</button></li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {screen === 'date' && table && askCols.length > 0 && <DateQuestion table={table} col={askCols[0]} onAnswer={answerDate} />}

      {screen === 'studio' && loaded && (
        <Studio
          loaded={loaded} table={table} plan={plan} tab={tab} setTab={setTab}
          sel={sel} setSel={setSel} clean={clean} setClean={setClean} split={split} setSplit={setSplit}
          roles={roles} setRoles={setRoles} conv={conv} setConv={setConv}
          onBack={() => setScreen('start')} onNext={() => setScreen('export')}
          focus={focus} setFocus={setFocus} editsVersion={editsVersion} bumpEdits={() => setEditsVersion((v) => v + 1)}
          sourceText={sourceTextOf(loaded, table, t, n, b)}
          onExport={() => { setSimple(false); setScreen('export'); }}
          onOther={() => { setScreen('start'); setLoaded(null); setTable(null); }}
          overview={
            <Analysis
              loaded={loaded} table={table} plan={plan} birthdays={conv.birthdays} inStudio
              onOther={() => { setScreen('start'); setLoaded(null); setTable(null); }}
              onSimple={() => { setSimple(true); setScreen('export'); }}
              onEdit={(tb) => {
                setTab(tb);
                if (tb === 'split' && split.mode === 'none' && loaded.calendars.length > 1) setSplit({ ...split, mode: 'source' });
              }}
            />
          }
        />
      )}

      {screen === 'export' && loaded && (
        <Export
          loaded={loaded} plan={plan} format={format} setFormat={setFormat} isTable={isTable}
          req={{ selection: sel, clean, split, format }} simple={simple}
          onBack={() => { setSimple(false); setScreen('studio'); }}
        />
      )}
    </div>
  );
}

function DateQuestion({ table, col, onAnswer }: { table: TableInfo; col: number; onAnswer: (o: 'dmy' | 'mdy') => void }) {
  const { t, lang } = useT();
  const c = table.columns.find((x) => x.index === col)!;
  const ex = c.samples[0] ?? '03/04/2025';
  const m = /^(\d{1,2})\D(\d{1,2})\D(\d{2,4})/.exec(ex);
  const fmt = (d: number, mo: number, y: number) =>
    new Date(Date.UTC(y < 100 ? 2000 + y : y, mo - 1, d)).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const a = m ? fmt(+m[1], +m[2], +m[3]) : '';
  const b = m ? fmt(+m[2], +m[1], +m[3]) : '';
  const subjectCol = table.columns.find((x) => x.role === 'subject');
  return (
    <section class="card card-lg narrow" aria-labelledby="date-q">
      <div class="row-icon">
        <Icon name="info" size={32} class="accent" />
        <h2 id="date-q" class="h2">{t('date.title')}</h2>
      </div>
      <H as="p" k="date.text" v={{ col: c.header, ex, a, b }} />
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>{t('date.row')}</th><th>{t('date.value')}</th><th>{t('date.entry')}</th></tr></thead>
          <tbody>
            {table.preview.slice(0, 3).map((r, i) => (
              <tr><td>{i + 2}</td><td><strong>{r[col]}</strong></td><td>{subjectCol ? r[subjectCol.index] : ''}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="choice-list">
        <button type="button" class="choice primary-outline" onClick={() => onAnswer('dmy')}>
          <span class="choice-title">{t('date.dmy', { ex, a })}</span>
          <span class="muted">{t('date.dmyHint')}</span>
        </button>
        <button type="button" class="choice" onClick={() => onAnswer('mdy')}>
          <span class="choice-title">{t('date.mdy', { ex, b })}</span>
          <span class="muted">{t('date.mdyHint')}</span>
        </button>
      </div>
      <p class="muted small">{t('date.tip')}</p>
    </section>
  );
}

function sourceTextOf(loaded: Loaded, table: TableInfo | null, t: ReturnType<typeof useT>['t'], n: (x: number) => string, b: (x: number) => string): string {
  const src = loaded.kind === 'table' && table
    ? t('an.source.table', { enc: table.encoding === 'windows-1252' ? 'Windows/Excel' : table.encoding === 'utf-8' ? 'UTF-8' : table.encoding, delim: t(('an.delim.' + table.delimiter) as 'an.delim.;'), rows: n(table.rowCount) })
    : /\.zip$/i.test(loaded.fileName) ? t('an.source.zip', { n: loaded.files.length }) : loaded.files.length > 1 ? t('an.source.many', { n: loaded.files.length }) : t('an.source.ics');
  return `${src} · ${b(loaded.totalBytes)} · ${loaded.calendars.length === 1 ? t('an.calCount1') : t('an.calCount', { n: loaded.calendars.length })}`;
}

function Bars({ data }: { data: { year: number; count: number }[] }) {
  const { n } = useT();
  const shown = data.length > 24 ? data.filter((d) => d.count > 2) : data;
  const max = Math.max(1, ...shown.map((d) => d.count));
  return (
    <div class="bars" role="img" aria-label={shown.map((d) => `${d.year}: ${n(d.count)}`).join(', ')}>
      {shown.map((d) => (
        <div class="bar" title={`${d.year}: ${n(d.count)}`}>
          <div class="bar-fill" style={{ height: Math.max(3, Math.round((d.count / max) * 100)) + '%' }} />
          <div class="bar-label">{String(d.year).slice(2)}</div>
        </div>
      ))}
    </div>
  );
}

function Analysis({ loaded, table, plan, birthdays, onOther, onSimple, onEdit, inStudio = false }: {
  loaded: Loaded; table: TableInfo | null; plan: PlanResult | null; birthdays: boolean; inStudio?: boolean;
  onOther: () => void; onSimple: () => void; onEdit: (t: Tab) => void;
}) {
  const { t, n, b, d, y } = useT();
  const cals = loaded.calendars;
  const total = cals.reduce((a, c) => a + c.events, 0);
  const sug = loaded.suggestions;
  const find = (k: string) => sug.find((s) => s.kind === k);
  const list = (vals: { value: string }[], max = 6) => vals.slice(0, max).map((v) => v.value).join(', ') + (vals.length > max ? ' …' : '');
  const ini = find('initials'), pre = find('prefix'), cat = find('categories'), org = find('organizer'), st = find('status');
  const phones = cals.reduce((a, c) => a + Math.max(c.phoneInTitle, c.phoneInDescription), 0);
  const admin = cals.reduce((a, c) => a + c.adminBytes, 0);
  const allBytes = cals.reduce((a, c) => a + c.bytes, 0);
  const parallel = Math.max(...cals.map((c) => c.maxParallel));
  const parts = plan ? (plan.format === 'csv' ? plan.csv.parts : plan.ics.parts) : cals.reduce((a, c) => a + c.partsNeeded, 0);
  const single = cals.length === 1;
  const fmtLabel = plan?.format === 'csv' ? t('an.asCsv') : t('an.asIcs');
  const sourceText = loaded.kind === 'table' && table
    ? t('an.source.table', { enc: table.encoding === 'windows-1252' ? 'Windows/Excel' : table.encoding === 'utf-8' ? 'UTF-8' : table.encoding, delim: t(('an.delim.' + table.delimiter) as 'an.delim.;'), rows: n(table.rowCount) })
    : /\.zip$/i.test(loaded.fileName) ? t('an.source.zip', { n: loaded.files.length }) : loaded.files.length > 1 ? t('an.source.many', { n: loaded.files.length }) : t('an.source.ics');

  return (
    <section class="stack" aria-labelledby="an-title">
      <div class={'head-row' + (inStudio ? ' sr-only' : '')}>
        <div>
          <h2 id="an-title" class="h2 break">{loaded.fileName}</h2>
          <p class="muted">{sourceText} · {b(loaded.totalBytes)} · {cals.length === 1 ? t('an.calCount1') : t('an.calCount', { n: cals.length })}</p>
        </div>
        <button type="button" class="link" onClick={onOther}>{t('an.other')}</button>
      </div>

      {parts > 1
        ? <div class="status status-bad" role="status"><Icon name="bad" size={30} /><H k="an.i.big" v={{ n: parts }} /></div>
        : <Status tone="ok" title={t('an.i.fits')} />}

      {cals.map((c) => (
        <article class="card cal-card" aria-label={c.name}>
          {(cals.length > 1 || c.name) && <h3 class="h3 break"><Icon name="calendar" size={22} class="accent" /> {c.name || c.fileName}</h3>}
          <div class="kpis">
            <div class="kpi"><div class="kpi-label">{t('an.events')}</div><div class="kpi-value">{n(c.events)}</div></div>
            <div class="kpi"><div class="kpi-label">{t('an.range')}</div><div class="kpi-value small-value">{y(c.mainFrom)}–{y(c.mainTo)}</div><div class="kpi-sub">{d(c.first)} – {d(c.last)}</div></div>
            <div class="kpi"><div class="kpi-label">{t('an.size')}</div><div class="kpi-value">{b(single && plan ? (plan.format === 'csv' ? plan.csv.bytes : plan.ics.bytes) : c.bytes)}</div><div class="kpi-sub">{fmtLabel}</div></div>
            <div class="kpi"><div class="kpi-label">{t('an.parts')}</div><div class="kpi-value small-value">{(single ? parts : c.partsNeeded) > 1 ? t('an.partsN', { n: single ? parts : c.partsNeeded }) : t('an.partsOk')}</div><div class="kpi-sub">{fmtLabel}</div></div>
            <div class="kpi"><div class="kpi-label">{t('an.series')}</div><div class="kpi-value">{n(c.seriesMasters)}</div><div class="kpi-sub">{n(c.allDay)} {t('an.allDay')}</div></div>
            <div class="kpi"><div class="kpi-label">{t('an.desc')}</div><div class="kpi-value">{c.events ? Math.round((c.withDescription / c.events) * 100) : 0} %</div><div class="kpi-sub">{t('an.tz')}: {c.timezone}</div></div>
          </div>
          {c.perYear.length > 1 && (
            <div class="bars-wrap">
              <div class="kpi-label">{t('an.perYear')}</div>
              <Bars data={c.perYear.filter((x) => c.mainFrom === null || (x.year >= new Date(c.mainFrom).getUTCFullYear() && x.year <= new Date(c.mainTo!).getUTCFullYear()))} />
            </div>
          )}
          <details class="more">
            <summary>{t('an.more')}</summary>
            <dl class="kv">
              <dt>{t('an.k.exceptions')}</dt><dd>{n(c.exceptions)}</dd>
              <dt>{t('an.k.cancelled')}</dt><dd>{n(c.cancelled)}</dd>
              <dt>{t('an.k.tentative')}</dt><dd>{n(c.tentative)}</dd>
              <dt>{t('an.k.private')}</dt><dd>{n(c.privateCount)}</dd>
              <dt>{t('an.k.duplicates')}</dt><dd>{n(c.duplicates)}</dd>
              <dt>{t('an.k.attendees')}</dt><dd>{n(c.withAttendees)}</dd>
              <dt>{t('an.k.attach')}</dt><dd>{n(c.withAttachment)}</dd>
              <dt>{t('an.k.alarm')}</dt><dd>{n(c.withAlarm)}</dd>
              <dt>{t('an.k.conference')}</dt><dd>{n(c.withConference)}</dd>
              <dt>{t('an.k.admin')}</dt><dd>{b(c.adminBytes)}</dd>
              <dt>{t('an.k.phone')}</dt><dd>{n(c.phoneInTitle)} / {n(c.phoneInDescription)}</dd>
              <dt>{t('an.k.email')}</dt><dd>{n(c.emailInTitle)} / {n(c.emailInDescription)}</dd>
              <dt>{t('an.k.parallel')}</dt><dd>{n(c.maxParallel)}</dd>
              <dt>{t('an.k.weekdays')}</dt><dd>{c.perWeekday.map(n).join(' · ')}</dd>
              {Object.keys(c.otherComponents).length > 0 && <><dt>{t('an.k.other')}</dt><dd>{Object.entries(c.otherComponents).map(([k, v]) => `${k}: ${n(v)}`).join(', ')}</dd></>}
            </dl>
          </details>
        </article>
      ))}

      <section class="card" aria-labelledby="found">
        <h3 id="found" class="h3">{t('an.found')}</h3>
        <ul class="insights">
          {birthdays && <H as="li" k="an.i.birthday" />}
          {cals.length > 1 && <H as="li" k="an.i.calendars" v={{ n: cals.length }} />}
          {ini && <H as="li" k="an.i.initials" v={{ n: ini.values.length, list: list(ini.values, 8), p: Math.round(ini.coverage * 100) }} />}
          {pre && <H as="li" k="an.i.prefix" v={{ n: pre.values.length, list: list(pre.values) }} />}
          {cat && <H as="li" k="an.i.categories" v={{ n: cat.values.length, list: list(cat.values) }} />}
          {org && <H as="li" k="an.i.organizer" v={{ n: org.values.length }} />}
          {st && <H as="li" k="an.i.status" v={{ n: n(st.values.reduce((a, v) => a + v.count, 0)), list: list(st.values) }} />}
          {parallel >= 3 && <H as="li" k="an.i.parallel" v={{ n: parallel }} />}
          {phones > 0 && <H as="li" k="an.i.pii" v={{ n: n(phones) }} />}
          {admin > allBytes * 0.05 && <H as="li" k="an.i.admin" v={{ size: b(admin) }} />}
          {cals.some((c) => c.first !== null && c.mainFrom !== null && new Date(c.mainFrom).getUTCFullYear() - new Date(c.first).getUTCFullYear() > 5) &&
            <H as="li" k="an.i.old" v={{ y: y(Math.min(...cals.map((c) => c.first ?? Infinity))), a: y(Math.min(...cals.map((c) => c.mainFrom ?? Infinity))), b: y(Math.max(...cals.map((c) => c.mainTo ?? -Infinity))) }} />}
        </ul>
      </section>

      <h3 class="h3">{t('an.what')}</h3>
      <div class="actions">
        <button type="button" class="action action-primary" onClick={onSimple}>
          <span class="action-title">{t('an.a.simple')}</span>
          <span class="action-hint">{t('an.a.simpleHint')}</span>
        </button>
        <button type="button" class="action" onClick={() => onEdit('split')}>
          <Icon name="split" size={28} class="accent" />
          <span class="action-title">{t('an.a.split')}</span>
          <span class="action-hint">{t('an.a.splitHint')}</span>
        </button>
        <button type="button" class="action" onClick={() => onEdit(total > 2000 ? 'range' : 'clean')}>
          <Icon name="broom" size={28} class="accent" />
          <span class="action-title">{t('an.a.clean')}</span>
          <span class="action-hint">{t('an.a.cleanHint')}</span>
        </button>
        <button type="button" class="action" onClick={() => onEdit('privacy')}>
          <Icon name="user" size={28} class="accent" />
          <span class="action-title">{t('an.a.privacy')}</span>
          <span class="action-hint">{t('an.a.privacyHint')}</span>
        </button>
      </div>
      <p class="source">{t('src.label')} <a href={HELP.problems} rel="noopener">{t('src.help')}</a></p>
    </section>
  );
}

export type { Column };
