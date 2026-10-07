// Bausteine des ICS Editors: Seitenleiste, Mitte (Termine als Liste oder Monat, weitere Reiter), Bearbeitungsfeld, Statusleiste.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { EventDetail, EventRow, Focus, Loaded, MonthResult, PlanResult } from '../../lib/engine';
import type { Rule, Target, TextField } from '../../lib/plan';
import type { Patch } from '../../lib/edit';
import { DAY, isoDay, wallParts } from '../../lib/datetime';
import { call } from './client';
import { Icon, useT } from './ui';
import { CheckTab, CleanTab, ColumnsTab, PrivacyTab, RangeTab, SplitTab, type EditorProps, type Tab } from './Editor';
import type { UiKey } from '../../i18n/ui';

export type View = 'list' | 'month';

export interface StudioProps extends EditorProps {
  focus: Focus;
  setFocus: (f: Focus) => void;
  editsVersion: number;
  bumpEdits: () => void;
  overview: ComponentChildren;
  exportPanel: ComponentChildren;
  view: View;
  setView: (v: View) => void;
  active: number | null;
  setActive: (id: number | null) => void;
}

let tid = 0;
const newId = () => 'm' + Date.now().toString(36) + (++tid);
/** Schmale Bildschirme: Bereiche stehen untereinander. */
export const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 999px)').matches;
export const scrollToSel = (sel: string) => { if (narrow()) requestAnimationFrame(() => document.querySelector(sel)?.scrollIntoView({ block: 'start', behavior: 'smooth' })); };
const hm = (w: number | null) => { if (w === null) return ''; const p = wallParts(w); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };

// ---------------------------------------------------------------- Seitenleiste

export function Sidebar(p: StudioProps) {
  const { t, n, y } = useT();
  const { loaded, plan, split, focus } = p;
  const go = (f: Focus) => { p.setFocus(f); p.setTab('list'); scrollToSel('.app-center'); };
  const isFocus = (f: Focus) => JSON.stringify(f) === JSON.stringify(focus);
  const groups: { kind: string; label: UiKey; field: TextField; op: Rule['op'] }[] = [
    { kind: 'initials', label: 'st.initials', field: 'summary', op: 'word' },
    { kind: 'prefix', label: 'st.prefix', field: 'summary', op: 'starts' },
    { kind: 'categories', label: 'st.categories', field: 'categories', op: 'word' },
    { kind: 'organizer', label: 'st.organizer', field: 'organizer', op: 'contains' }
  ];
  const makeCalendars = (kind: string, field: TextField, op: Rule['op']) => {
    const s = loaded.suggestions.find((x) => x.kind === kind);
    if (!s) return;
    const targets: Target[] = s.values.slice(0, 40).map((v) => ({ id: newId(), name: v.value, rules: [{ field, op, value: v.value }] }));
    p.setSplit({ ...split, mode: 'rules', targets, manual: {} });
  };
  const found = groups.map((g) => ({ ...g, s: loaded.suggestions.find((x) => x.kind === g.kind) })).filter((g) => g.s);
  return (
    <>
      <div class="side-block">
        <h2 class="side-title">{t('st.calendars')} <span class="count">{loaded.calendars.length}</span></h2>
        <ul class="plain side-list">
          <li><button type="button" class={'side-item' + (focus === null ? ' active' : '')} onClick={() => go(null)}>
            <Icon name="calendar" size={18} class="accent" /><span class="grow"><strong>{t('st.showAll')}</strong></span><span class="muted small">{n(loaded.calendars.reduce((a, c) => a + c.events, 0))}</span>
          </button></li>
          {loaded.calendars.map((c, i) => {
            const f: Focus = { kind: 'cal', cal: c.index };
            return (
              <li><button type="button" class={'side-item' + (isFocus(f) ? ' active' : '')} onClick={() => go(f)}>
                <span class={'dot dot-' + (i % 8)} aria-hidden="true" />
                <span class="grow break"><strong>{c.name || c.fileName}</strong><span class="muted small block">{t('st.years', { a: y(c.mainFrom), b: y(c.mainTo) })} · {c.timezone}</span></span>
                <span class="muted small">{n(c.events)}</span>
              </button></li>
            );
          })}
        </ul>
        {loaded.kind === 'ics' && loaded.calendars.length === 1 && <p class="muted small side-note">{t('st.oneCal')}</p>}
      </div>

      {found.length > 0 && (
        <div class="side-block">
          <h2 class="side-title">{t('st.detected')}</h2>
          {found.map((g, gi) => (
            <details class="side-group" open={gi === 0}>
              <summary>{t(g.label)} <span class="count">{g.s!.values.length}</span></summary>
              <ul class="plain side-list">
                {g.s!.values.slice(0, 40).map((v) => {
                  const f: Focus = { kind: 'rule', rule: { field: g.field, op: g.op, value: v.value }, label: v.value };
                  return (
                    <li><button type="button" class={'side-item' + (isFocus(f) ? ' active' : '')} onClick={() => go(f)}>
                      <span class="grow break"><strong>{v.value}</strong><span class="muted small block">{t('st.years', { a: y(v.from), b: y(v.to) })}</span></span>
                      <span class="muted small">{n(v.count)}</span>
                    </button></li>
                  );
                })}
              </ul>
              <button type="button" class="btn btn-secondary btn-small btn-block-sm" onClick={() => makeCalendars(g.kind, g.field, g.op)}>
                <Icon name="split" size={18} /> {t('st.makeCalendars')}
              </button>
            </details>
          ))}
        </div>
      )}

      {split.mode !== 'none' && plan && plan.calendars.length > 0 && (
        <div class="side-block">
          <h2 class="side-title">{t('st.targets')} <span class="count">{plan.calendars.length}</span></h2>
          <ul class="plain side-list">
            {plan.calendars.map((c) => {
              const f: Focus = { kind: 'target', key: c.key, label: c.name };
              return (
                <li><button type="button" class={'side-item' + (isFocus(f) ? ' active' : '')} onClick={() => go(f)}>
                  <Icon name="calendar" size={18} class="accent" /><span class="grow break"><strong>{c.name}</strong></span><span class="muted small">{n(c.events)}</span>
                </button></li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Mitte

export function StudioCenter(p: StudioProps) {
  const { t, n } = useT();
  const isTable = !!p.table;
  const openIssues = isTable ? (p.loaded.issues ?? []).filter((i) => !p.conv.fixes[i.row]).length : 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'list', label: t('tab.list') },
    { id: 'overview', label: t('tab.overview') },
    { id: 'split', label: t('tab.split') },
    { id: 'range', label: t('tab.range') },
    { id: 'clean', label: t('tab.clean') },
    { id: 'privacy', label: t('tab.privacy') },
    ...(isTable ? [{ id: 'columns' as Tab, label: t('tab.columns') }] : []),
    { id: 'check', label: t('tab.check') + (openIssues ? ` (${n(openIssues)})` : '') },
    { id: 'export', label: t('tab.export') }
  ];
  return (
    <>
      <div role="tablist" aria-label={t('ed.tabs')} class="tabs app-tabs">
        {tabs.map((x) => (
          <button type="button" role="tab" id={'tab-' + x.id} aria-controls={'panel-' + x.id} aria-selected={p.tab === x.id}
            class={'tab' + (p.tab === x.id ? ' active' : '') + (x.id === 'export' ? ' tab-export' : '')} onClick={() => p.setTab(x.id)}>
            {x.id === 'export' && <Icon name="download" size={18} />} {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={'panel-' + p.tab} aria-labelledby={'tab-' + p.tab} class="panel app-panel">
        {p.tab === 'list' && <EventsPanel {...p} />}
        {p.tab === 'overview' && p.overview}
        {p.tab === 'range' && <RangeTab {...p} />}
        {p.tab === 'split' && <SplitTab {...p} />}
        {p.tab === 'clean' && <CleanTab {...p} />}
        {p.tab === 'privacy' && <PrivacyTab {...p} />}
        {p.tab === 'columns' && isTable && <ColumnsTab {...p} />}
        {p.tab === 'check' && <CheckTab {...p} />}
        {p.tab === 'export' && p.exportPanel}
      </div>
    </>
  );
}

function EventsPanel(p: StudioProps) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const focusLabel = p.focus ? (p.focus.kind === 'cal' ? p.loaded.calendars.find((c) => c.index === (p.focus as { cal: number }).cal)?.name ?? '' : p.focus.label) : '';
  return (
    <div class="events-panel">
      <div class="browser-tools">
        <div role="group" aria-label={t('view.label')} class="seg-mini">
          <button type="button" aria-pressed={p.view === 'list'} class={p.view === 'list' ? 'on' : ''} onClick={() => p.setView('list')}><Icon name="list" size={18} /> {t('view.list')}</button>
          <button type="button" aria-pressed={p.view === 'month'} class={p.view === 'month' ? 'on' : ''} onClick={() => p.setView('month')}><Icon name="calendar" size={18} /> {t('view.month')}</button>
        </div>
        <label class="field grow search-field"><span class="sr-only">{t('ev.search')}</span>
          <input type="search" placeholder={t('ev.search')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </label>
        {p.focus && (
          <span class="chip">{t('st.focus')} <strong class="break">{focusLabel}</strong>
            <button type="button" class="chip-x" aria-label={t('st.clearFocus')} onClick={() => p.setFocus(null)}>×</button>
          </span>
        )}
      </div>
      {p.view === 'list' ? <EventList {...p} q={q} /> : <MonthView {...p} q={q} />}
    </div>
  );
}

const PAGE = 100;

function EventList(p: StudioProps & { q: string }) {
  const { t, n, d } = useT();
  const [limit, setLimit] = useState(PAGE);
  const [res, setRes] = useState<{ rows: EventRow[]; total: number } | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const req = useMemo(() => ({ selection: { ...p.sel, deleted: [] }, clean: p.clean, split: p.split, format: 'ics' as const }), [p.sel, p.clean, p.split]);
  useEffect(() => { setLimit(PAGE); setChecked(new Set()); }, [p.q, p.focus, order]);
  useEffect(() => {
    const h = setTimeout(async () => setRes(await call({ type: 'list', req, query: p.q, focus: p.focus, offset: 0, limit, order })), 120);
    return () => clearTimeout(h);
  }, [p.q, p.focus, req, limit, order, p.editsVersion, p.loaded]);

  const rows = res?.rows ?? [];
  const isDeleted = (r: EventRow) => p.sel.deleted.includes(r.id) || (r.row !== null && p.conv.fixes[r.row] === 'drop');
  const toggle = (id: number) => { const s = new Set(checked); if (s.has(id)) s.delete(id); else s.add(id); setChecked(s); };
  const chosen = rows.filter((r) => checked.has(r.id));
  const setDeleted = (list: EventRow[], on: boolean) => markDeleted(p, list, on);
  const moveTo = (value: string) => {
    if (!value) return;
    let targets = p.split.mode === 'rules' ? [...p.split.targets] : [];
    let to = value;
    if (value === '__new') {
      to = newId();
      targets = [...targets, { id: to, name: t('ev.newCal') + ' ' + (targets.length + 1), rules: [] }];
    }
    const manual = { ...(p.split.mode === 'rules' ? p.split.manual ?? {} : {}) };
    for (const r of chosen) manual[r.id] = to;
    p.setSplit({ ...p.split, mode: 'rules', targets, manual });
    setChecked(new Set());
  };
  const showTargets = p.split.mode !== 'none';
  return (
    <>
      {res && (
        <div class="list-meta">
          <span class="muted small">{t('ev.showing', { n: n(rows.length), total: n(res.total) })}</span>
          <button type="button" class="link small" onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}>{order === 'desc' ? t('ev.newestFirst') : t('ev.oldestFirst')} ⇅</button>
        </div>
      )}
      {chosen.length > 0 && (
        <div class="bulk" role="region" aria-label={t('ev.selected', { n: chosen.length })}>
          <strong>{t('ev.selected', { n: chosen.length })}</strong>
          <button type="button" class="btn btn-small" onClick={() => setDeleted(chosen, true)}><Icon name="trash" size={18} /> {t('ev.deleteSel')}</button>
          <button type="button" class="btn btn-small" onClick={() => setDeleted(chosen, false)}>{t('ev.restoreSel')}</button>
          <select aria-label={t('ev.moveTo')} value="" onChange={(e) => moveTo((e.target as HTMLSelectElement).value)}>
            <option value="">{t('ev.moveTo')}</option>
            {p.split.mode === 'rules' && p.split.targets.map((x) => <option value={x.id}>{x.name}</option>)}
            {p.split.mode === 'rules' && <option value="rest">{p.split.restName}</option>}
            <option value="__new">{t('ev.newCal')} …</option>
          </select>
        </div>
      )}
      <div class="table-wrap">
        <table class="data events-table">
          <thead>
            <tr>
              <th><input type="checkbox" aria-label={t('ev.selectPage')} checked={rows.length > 0 && chosen.length === rows.length}
                onChange={(e) => setChecked((e.target as HTMLInputElement).checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              <th>{t('ev.date')}</th><th>{t('ev.time')}</th><th>{t('ev.titleCol')}</th>{showTargets && <th>{t('ev.target')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr data-row={r.id} class={(p.active === r.id ? 'active ' : '') + (isDeleted(r) ? 'dim' : '')} aria-selected={p.active === r.id}>
                <td><input type="checkbox" aria-label={t('ev.select')} checked={checked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td class="nowrap">{d(r.start)}</td>
                <td class="nowrap muted">{r.allDay ? '' : hm(r.start)}</td>
                <td class="break">
                  <button type="button" class="row-open" aria-label={t('ev.open', { t: r.summary.slice(0, 60) })} onClick={() => { p.setActive(r.id); scrollToSel('.app-inspector'); }}>{r.summary || '–'}</button>
                  {r.series && <span class="pill">{t('ev.series')}</span>}
                  {r.edited && <span class="pill pill-edit">{t('ev.edited')}</span>}
                  {isDeleted(r) && <span class="pill pill-del">{t('ev.deletedPill')}</span>}
                </td>
                {showTargets && <td class="muted small break">{r.targets.join(', ')}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {res && rows.length === 0 && <p class="muted">{t('ev.empty')}</p>}
      {res && res.total > rows.length && (
        <button type="button" class="btn btn-secondary" onClick={() => setLimit(limit + PAGE)}>{t('ev.more', { n: n(Math.min(PAGE, res.total - rows.length)) })}</button>
      )}
    </>
  );
}

function markDeleted(p: StudioProps, list: { id: number; row: number | null }[], on: boolean) {
  if (p.table) {
    const fx = { ...p.conv.fixes };
    for (const r of list) if (r.row !== null) { if (on) fx[r.row] = 'drop'; else delete fx[r.row]; }
    p.setConv({ ...p.conv, fixes: fx });
  } else {
    const s = new Set(p.sel.deleted);
    for (const r of list) { if (on) s.add(r.id); else s.delete(r.id); }
    p.setSel({ ...p.sel, deleted: [...s] });
  }
}

// ---------------------------------------------------------------- Monatsansicht

function MonthView(p: StudioProps & { q: string }) {
  const { t, lang, n } = useT();
  const initial = useMemo(() => {
    const today = Date.now();
    const cal = p.loaded.calendars[0];
    const inRange = cal && cal.first !== null && cal.last !== null && today >= cal.first && today <= cal.last;
    const w = inRange ? today : (cal?.mainTo ?? today);
    const dt = new Date(w);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() };
  }, [p.loaded]);
  const [ym, setYm] = useState(initial);
  const [res, setRes] = useState<MonthResult | null>(null);
  const req = useMemo(() => ({ selection: p.sel, clean: p.clean, split: p.split, format: 'ics' as const }), [p.sel, p.clean, p.split]);
  useEffect(() => {
    const h = setTimeout(async () => setRes(await call({ type: 'month', req, query: p.q, focus: p.focus, year: ym.y, month: ym.m })), 80);
    return () => clearTimeout(h);
  }, [ym, req, p.q, p.focus, p.editsVersion, p.loaded]);
  const step = (k: number) => setYm(({ y, m }) => { const mm = y * 12 + m + k; return { y: Math.floor(mm / 12), m: mm % 12 }; });
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const title = new Date(Date.UTC(ym.y, ym.m, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const firstWd = (new Date(Date.UTC(ym.y, ym.m, 1)).getUTCDay() + 6) % 7;
  const nDays = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const byDay = new Map((res?.days ?? []).map((d) => [d.day, d]));
  const wdNames = [...Array(7)].map((_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }));
  const cells: (number | null)[] = [...Array(firstWd).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const c of p.loaded.calendars) for (const y of c.perYear) ys.add(y.year);
    ys.add(ym.y);
    return [...ys].sort((a, b) => a - b).filter((y) => y >= 1990 || y === ym.y);
  }, [p.loaded, ym.y]);
  return (
    <div class="month">
      <div class="month-head">
        <button type="button" class="icon-btn" aria-label={t('view.prev')} onClick={() => step(-1)}>‹</button>
        <h3 class="h3 month-title" aria-live="polite">{title}</h3>
        <button type="button" class="icon-btn" aria-label={t('view.next')} onClick={() => step(1)}>›</button>
        <label class="sr-only" for="month-year">{t('view.year')}</label>
        <select id="month-year" value={String(ym.y)} onChange={(e) => setYm({ y: +(e.target as HTMLSelectElement).value, m: ym.m })}>
          {years.map((y) => <option value={String(y)}>{y}</option>)}
        </select>
        {res && <span class="muted small">{t('view.count', { n: n(res.total) })}</span>}
      </div>
      <div class="month-grid" role="grid" aria-label={title}>
        {wdNames.map((w) => <div class="month-wd" role="columnheader">{w}</div>)}
        {cells.map((d) => {
          const day = d ? byDay.get(d) : undefined;
          return (
            <div class={'month-cell' + (d ? '' : ' empty')} role="gridcell">
              {d && <div class="month-day">{d}</div>}
              {day?.items.map((it) => (
                <button type="button" class={'month-ev' + (p.active === it.id ? ' active' : '') + (it.series ? ' series' : '')} onClick={() => { p.setActive(it.id); scrollToSel('.app-inspector'); }}
                  title={it.summary}>
                  {!it.allDay && <span class="month-time">{hm(it.start)}</span>} {it.summary || '–'}
                </button>
              ))}
              {day && day.more > 0 && <div class="month-more">{t('view.more', { n: day.more })}</div>}
            </div>
          );
        })}
      </div>
      <p class="muted small">{t('view.seriesNote')}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Bearbeiten (rechte Spalte)

export function Inspector({ p, id }: { p: StudioProps; id: number }) {
  const { t } = useT();
  const [dt, setDt] = useState<EventDetail | null>(null);
  const [f, setF] = useState({ summary: '', location: '', description: '', allDay: false, sDate: '', sTime: '', eDate: '', eTime: '' });
  const [saved, setSaved] = useState(false);
  const deleted = p.sel.deleted.includes(id);
  const fill = (x: EventDetail) => {
    const endIncl = x.end !== null ? (x.allDay ? x.end - DAY : x.end) : x.start;
    setF({
      summary: x.summary, location: x.location, description: x.description, allDay: x.allDay,
      sDate: x.start !== null ? isoDay(x.start) : '', sTime: x.allDay ? '' : hm(x.start),
      eDate: endIncl !== null ? isoDay(Math.max(endIncl, x.start ?? endIncl)) : '', eTime: x.allDay ? '' : hm(x.end ?? x.start)
    });
  };
  useEffect(() => { setSaved(false); call<EventDetail | null>({ type: 'get', id }).then((x) => { setDt(x); if (x) fill(x); }); }, [id]);
  const close = () => {
    p.setActive(null);
    if (narrow()) requestAnimationFrame(() => document.querySelector(`[data-row="${id}"]`)?.scrollIntoView({ block: 'center' }));
  };
  if (!dt) return <div class="card"><span class="spinner" aria-hidden="true" /></div>;
  const upd = (k: keyof typeof f) => (e: Event) => { const el = e.target as HTMLInputElement; setF({ ...f, [k]: el.type === 'checkbox' ? el.checked : el.value }); setSaved(false); };
  async function save() {
    const patch: Patch = { summary: f.summary, location: f.location, description: f.description };
    if (f.sDate) {
      patch.start = f.allDay ? f.sDate : `${f.sDate}T${f.sTime || '00:00'}`;
      patch.end = f.allDay ? (f.eDate || f.sDate) : `${f.eDate || f.sDate}T${f.eTime || f.sTime || '00:00'}`;
    }
    const x = await call<EventDetail | null>({ type: 'edit', id, patch });
    if (x) { setDt(x); fill(x); setSaved(true); p.bumpEdits(); }
  }
  async function reset() {
    const x = await call<EventDetail | null>({ type: 'edit', id, patch: null });
    if (x) { setDt(x); fill(x); setSaved(false); p.bumpEdits(); }
  }
  const row = { id, row: null as number | null };
  return (
    <div class="inspector" onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
      <div class="head-row">
        <h2 class="h3">{t('in.title')}</h2>
        <button type="button" class="icon-btn" aria-label={t('in.close')} onClick={close}>×</button>
      </div>
      <p class="muted small m0">{t('in.cal', { name: dt.calName })} · {t('in.tz', { tz: dt.tz })}</p>
      {dt.rrule && <p class="note small"><Icon name="info" size={18} class="accent" /> {t('in.series', { rule: dt.rrule.split(';').find((x) => x.startsWith('FREQ='))?.slice(5) ?? '' })}</p>}
      {dt.recurrenceId && <p class="note small"><Icon name="info" size={18} class="accent" /> {t('in.exception')}</p>}
      <label class="field">{t('in.summary')}<input type="text" value={f.summary} onInput={upd('summary')} /></label>
      <label class="check-line"><input type="checkbox" checked={f.allDay} onChange={upd('allDay')} />{t('in.allDay')}</label>
      <div class="field-row">
        <label class="field">{t('in.start')}<input type="date" value={f.sDate} onInput={upd('sDate')} /></label>
        {!f.allDay && <label class="field"><span class="sr-only">{t('in.start')}</span>&nbsp;<input type="time" value={f.sTime} onInput={upd('sTime')} /></label>}
      </div>
      <div class="field-row">
        <label class="field">{t('in.end')}<input type="date" value={f.eDate} onInput={upd('eDate')} /></label>
        {!f.allDay && <label class="field"><span class="sr-only">{t('in.end')}</span>&nbsp;<input type="time" value={f.eTime} onInput={upd('eTime')} /></label>}
      </div>
      <label class="field">{t('in.location')}<input type="text" value={f.location} onInput={upd('location')} /></label>
      <label class="field">{t('in.description')}<textarea rows={5} value={f.description} onInput={upd('description')} /></label>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" onClick={save}>{t('in.save')}</button>
        {dt.edited && <button type="button" class="btn" onClick={reset}>{t('in.reset')}</button>}
        {!p.table && <button type="button" class="btn" onClick={() => markDeleted(p, [row], !deleted)}><Icon name="trash" size={18} /> {deleted ? t('in.restore') : t('in.delete')}</button>}
      </div>
      {saved && <p role="status" class="ok-text m0">{t('in.saved')}</p>}
      <details class="more">
        <summary>{t('in.raw')}</summary>
        <pre class="raw">{dt.lines.join('\n')}</pre>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------- Statusleiste

export function StatusBar({ loaded, plan }: { loaded: Loaded | null; plan: PlanResult | null }) {
  const { t, n, b } = useT();
  const parts = plan ? (plan.format === 'csv' ? plan.csv.parts : plan.ics.parts) : 0;
  const size = plan ? (plan.format === 'csv' ? plan.csv.bytes : plan.ics.bytes) : 0;
  return (
    <div class="app-status" aria-live="polite">
      <span class="status-local"><Icon name="lock" size={16} /> {t('sb.local')}</span>
      {loaded && plan && (
        <>
          <span><strong>{n(plan.events)}</strong> {t('live.events')}</span>
          <span>{plan.format.toUpperCase()} {b(size)}</span>
          <span class={plan.events === 0 ? 'bad' : parts <= 1 ? 'ok' : 'warn'}>
            <Icon name={plan.events === 0 ? 'bad' : parts <= 1 ? 'ok' : 'parts'} size={16} /> {plan.events === 0 ? t('live.empty') : parts <= 1 ? t('live.ok') : t('live.split', { n: parts })}
          </span>
        </>
      )}
      {!loaded && <span class="muted">{t('sb.noFile')}</span>}
    </div>
  );
}
