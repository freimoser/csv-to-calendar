import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { EventDetail, EventRow, Focus, Loaded, PlanResult } from '../../lib/engine';
import type { Rule, Target, TextField } from '../../lib/plan';
import type { Patch } from '../../lib/edit';
import { DAY, isoDay, wallParts } from '../../lib/datetime';
import { call } from './client';
import { Icon, useT } from './ui';
import { CheckTab, CleanTab, ColumnsTab, PrivacyTab, RangeTab, SplitTab, type EditorProps, type Tab } from './Editor';
import type { UiKey } from '../../i18n/ui';

export interface StudioProps extends EditorProps {
  focus: Focus;
  setFocus: (f: Focus) => void;
  editsVersion: number;
  bumpEdits: () => void;
  overview: ComponentChildren;
  sourceText: string;
  onExport: () => void;
  onOther: () => void;
}

let tid = 0;
const newId = () => 'm' + Date.now().toString(36) + (++tid);
/** Schmale Bildschirme: Seitenleiste, Liste und Bearbeitungsfeld stehen untereinander. */
const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 999px)').matches;
const scrollTo = (sel: string) => { if (narrow()) requestAnimationFrame(() => document.querySelector(sel)?.scrollIntoView({ block: 'start', behavior: 'smooth' })); };

const hm = (w: number | null) => { if (w === null) return ''; const p = wallParts(w); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; };

export function Studio(p: StudioProps) {
  const { t, n, b } = useT();
  const plan = p.plan;
  const parts = plan ? (plan.format === 'csv' ? plan.csv.parts : plan.ics.parts) : 0;
  const size = plan ? (plan.format === 'csv' ? plan.csv.bytes : plan.ics.bytes) : 0;
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
    { id: 'check', label: t('tab.check') + (openIssues ? ` (${n(openIssues)})` : '') }
  ];
  return (
    <section class="studio" aria-labelledby="studio-title">
      <div class="studio-bar">
        <div class="studio-file">
          <h2 id="studio-title" class="h3 break">{p.loaded.fileName}</h2>
          <div class="muted small">{p.sourceText}</div>
        </div>
        <div class="studio-summary" aria-live="polite">
          {plan && (
            <>
              <Icon name={plan.events === 0 ? 'bad' : parts <= 1 ? 'ok' : 'parts'} size={24} class={plan.events === 0 ? 'bad' : parts <= 1 ? 'ok' : 'warn'} />
              <span><strong>{n(plan.events)}</strong> {t('live.events')} · {plan.format.toUpperCase()} {b(size)} · {parts > 1 ? t('live.nParts', { n: parts }) : t('live.oneFile')}</span>
            </>
          )}
        </div>
        <div class="studio-actions">
          <button type="button" class="link" onClick={p.onOther}>{t('an.other')}</button>
          <button type="button" class="btn btn-primary" disabled={!plan || plan.events === 0} onClick={p.onExport}><Icon name="download" size={20} /> {t('st.export')}</button>
        </div>
      </div>
      <div class="studio-grid">
        <Sidebar {...p} />
        <div class="studio-main">
          <div role="tablist" aria-label={t('ed.tabs')} class="tabs">
            {tabs.map((x) => (
              <button type="button" role="tab" id={'tab-' + x.id} aria-controls={'panel-' + x.id} aria-selected={p.tab === x.id}
                class={'tab' + (p.tab === x.id ? ' active' : '')} onClick={() => p.setTab(x.id)}>{x.label}</button>
            ))}
          </div>
          <div role="tabpanel" id={'panel-' + p.tab} aria-labelledby={'tab-' + p.tab} class="panel">
            {p.tab === 'list' && <EventBrowser {...p} />}
            {p.tab === 'overview' && p.overview}
            {p.tab === 'range' && <RangeTab {...p} />}
            {p.tab === 'split' && <SplitTab {...p} />}
            {p.tab === 'clean' && <CleanTab {...p} />}
            {p.tab === 'privacy' && <PrivacyTab {...p} />}
            {p.tab === 'columns' && isTable && <ColumnsTab {...p} />}
            {p.tab === 'check' && <CheckTab {...p} />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Seitenleiste

function Sidebar(p: StudioProps) {
  const { t, n, y } = useT();
  const { loaded, plan, split, focus } = p;
  const go = (f: Focus) => { p.setFocus(f); p.setTab('list'); scrollTo('.studio-main'); };
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
    <aside class="studio-side" aria-label={t('st.calendars')}>
      <div class="side-block">
        <h3 class="side-title">{t('st.calendars')} <span class="count">{loaded.calendars.length}</span></h3>
        <ul class="plain side-list">
          <li><button type="button" class={'side-item' + (focus === null ? ' active' : '')} onClick={() => go(null)}>
            <span class="grow"><strong>{t('st.showAll')}</strong></span><span class="muted small">{n(loaded.calendars.reduce((a, c) => a + c.events, 0))}</span>
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
          <h3 class="side-title">{t('st.detected')}</h3>
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
          <h3 class="side-title">{t('st.targets')} <span class="count">{plan.calendars.length}</span></h3>
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
    </aside>
  );
}

// ---------------------------------------------------------------- Terminliste

const PAGE = 100;

function EventBrowser(p: StudioProps) {
  const { t, n, d } = useT();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [res, setRes] = useState<{ rows: EventRow[]; total: number } | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const req = useMemo(() => ({ selection: { ...p.sel, deleted: [] }, clean: p.clean, split: p.split, format: 'ics' as const }), [p.sel, p.clean, p.split]);
  useEffect(() => { setLimit(PAGE); setChecked(new Set()); }, [q, p.focus]);
  useEffect(() => {
    const h = setTimeout(async () => setRes(await call({ type: 'list', req, query: q, focus: p.focus, offset: 0, limit })), 120);
    return () => clearTimeout(h);
  }, [q, p.focus, req, limit, p.editsVersion, p.loaded]);

  const rows = res?.rows ?? [];
  const deleted = new Set(p.sel.deleted);
  const tableDeleted = (r: EventRow) => r.row !== null && p.conv.fixes[r.row] === 'drop';
  const isDeleted = (r: EventRow) => deleted.has(r.id) || tableDeleted(r);
  const toggle = (id: number) => { const s = new Set(checked); if (s.has(id)) s.delete(id); else s.add(id); setChecked(s); };
  const chosen = rows.filter((r) => checked.has(r.id));

  const setDeleted = (list: EventRow[], on: boolean) => {
    if (p.table) {
      const fx = { ...p.conv.fixes };
      for (const r of list) if (r.row !== null) { if (on) fx[r.row] = 'drop'; else delete fx[r.row]; }
      p.setConv({ ...p.conv, fixes: fx });
    } else {
      const s = new Set(p.sel.deleted);
      for (const r of list) { if (on) s.add(r.id); else s.delete(r.id); }
      p.setSel({ ...p.sel, deleted: [...s] });
    }
  };
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
  const focusLabel = p.focus ? (p.focus.kind === 'cal' ? p.loaded.calendars.find((c) => c.index === (p.focus as { cal: number }).cal)?.name ?? '' : p.focus.label) : '';

  return (
    <div class="browser">
      <div class="browser-list">
        <div class="browser-tools">
          <label class="field grow"><span class="sr-only">{t('ev.search')}</span>
            <input type="search" placeholder={t('ev.search')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          </label>
          {p.focus && (
            <span class="chip">{t('st.focus')} <strong class="break">{focusLabel}</strong>
              <button type="button" class="chip-x" aria-label={t('st.clearFocus')} onClick={() => p.setFocus(null)}>×</button>
            </span>
          )}
        </div>
        {res && <div class="muted small">{t('ev.showing', { n: n(rows.length), total: n(res.total) })}</div>}
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
                <tr data-row={r.id} class={(active === r.id ? 'active ' : '') + (isDeleted(r) ? 'dim' : '')} aria-selected={active === r.id}>
                  <td><input type="checkbox" aria-label={t('ev.select')} checked={checked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td class="nowrap">{d(r.start)}</td>
                  <td class="nowrap muted">{r.allDay ? '' : hm(r.start)}</td>
                  <td class="break">
                    <button type="button" class="row-open" aria-label={t('ev.open', { t: r.summary.slice(0, 60) })} onClick={() => { setActive(r.id); scrollTo('.browser-inspector'); }}>{r.summary || '–'}</button>
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
      </div>
      <div class="browser-inspector">
        {active === null
          ? <p class="muted card pick-hint">{t('in.pick')}</p>
          : <Inspector id={active} onClose={() => { const id = active; setActive(null); if (narrow()) requestAnimationFrame(() => document.querySelector(`[data-row="${id}"]`)?.scrollIntoView({ block: 'center' })); }} onChanged={p.bumpEdits} deleted={rows.find((r) => r.id === active) ? isDeleted(rows.find((r) => r.id === active)!) : false}
              onDelete={(on) => { const r = rows.find((x) => x.id === active); if (r) setDeleted([r], on); }} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Termin bearbeiten

function Inspector({ id, onClose, onChanged, deleted, onDelete }: { id: number; onClose: () => void; onChanged: () => void; deleted: boolean; onDelete: (on: boolean) => void }) {
  const { t } = useT();
  const [dt, setDt] = useState<EventDetail | null>(null);
  const [f, setF] = useState({ summary: '', location: '', description: '', allDay: false, sDate: '', sTime: '', eDate: '', eTime: '' });
  const [saved, setSaved] = useState(false);
  const fill = (x: EventDetail) => {
    const endIncl = x.end !== null ? (x.allDay ? x.end - DAY : x.end) : x.start;
    setF({
      summary: x.summary, location: x.location, description: x.description, allDay: x.allDay,
      sDate: x.start !== null ? isoDay(x.start) : '', sTime: x.allDay ? '' : hm(x.start),
      eDate: endIncl !== null ? isoDay(Math.max(endIncl, x.start ?? endIncl)) : '', eTime: x.allDay ? '' : hm(x.end ?? x.start)
    });
  };
  useEffect(() => { setSaved(false); call<EventDetail | null>({ type: 'get', id }).then((x) => { setDt(x); if (x) fill(x); }); }, [id]);
  if (!dt) return <div class="card"><span class="spinner" aria-hidden="true" /></div>;
  const upd = (k: keyof typeof f) => (e: Event) => { const el = e.target as HTMLInputElement; setF({ ...f, [k]: el.type === 'checkbox' ? el.checked : el.value }); setSaved(false); };
  async function save() {
    const patch: Patch = { summary: f.summary, location: f.location, description: f.description };
    if (f.sDate) {
      patch.start = f.allDay ? f.sDate : `${f.sDate}T${f.sTime || '00:00'}`;
      patch.end = f.allDay ? (f.eDate || f.sDate) : `${f.eDate || f.sDate}T${f.eTime || f.sTime || '00:00'}`;
    }
    const x = await call<EventDetail | null>({ type: 'edit', id, patch });
    if (x) { setDt(x); fill(x); setSaved(true); onChanged(); }
  }
  async function reset() {
    const x = await call<EventDetail | null>({ type: 'edit', id, patch: null });
    if (x) { setDt(x); fill(x); setSaved(false); onChanged(); }
  }
  return (
    <div class="card inspector" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div class="head-row">
        <h3 class="h3">{t('in.title')}</h3>
        <button type="button" class="icon-btn" aria-label={t('in.close')} onClick={onClose}>×</button>
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
        <button type="button" class="btn" onClick={() => onDelete(!deleted)}><Icon name="trash" size={18} /> {deleted ? t('in.restore') : t('in.delete')}</button>
      </div>
      {saved && <p role="status" class="ok-text m0">{t('in.saved')}</p>}
      <details class="more">
        <summary>{t('in.raw')}</summary>
        <pre class="raw">{dt.lines.join('\n')}</pre>
      </details>
    </div>
  );
}
