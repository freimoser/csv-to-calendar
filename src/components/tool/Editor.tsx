import { useEffect, useMemo, useState } from 'preact/hooks';
import type { EventRow, Loaded, PlanResult, TableInfo } from '../../lib/engine';
import type { CleanOptions, Rule, Selection, SplitConfig, Target, TextField } from '../../lib/plan';
import type { ConvertOptions, PiiKind, Role, ShortenMode } from '../../lib/table';
import { isoDay, parseIsoDay } from '../../lib/datetime';
import { EXPORT_TIMEZONES } from '../../lib/tz';
import { call } from './client';
import { H, Icon, Status, useT } from './ui';
import type { UiKey } from '../../i18n/ui';

export type Tab = 'range' | 'split' | 'clean' | 'privacy' | 'columns' | 'check' | 'events';

interface Props {
  loaded: Loaded; table: TableInfo | null; plan: PlanResult | null; tab: Tab; setTab: (t: Tab) => void;
  sel: Selection; setSel: (s: Selection) => void; clean: CleanOptions; setClean: (c: CleanOptions) => void;
  split: SplitConfig; setSplit: (s: SplitConfig) => void;
  roles: Record<number, Role>; setRoles: (r: Record<number, Role>) => void; conv: ConvertOptions; setConv: (c: ConvertOptions) => void;
  onBack: () => void; onNext: () => void;
}

export function Editor(p: Props) {
  const { t, n } = useT();
  const isTable = !!p.table;
  const issues = p.loaded.issueCount ?? 0;
  const openIssues = isTable ? (p.loaded.issues ?? []).filter((i) => !p.conv.fixes[i.row]).length + Math.max(0, issues - (p.loaded.issues?.length ?? 0)) : 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'range', label: t('tab.range') },
    { id: 'split', label: t('tab.split') },
    { id: 'clean', label: t('tab.clean') },
    { id: 'privacy', label: t('tab.privacy') },
    ...(isTable ? [{ id: 'columns' as Tab, label: t('tab.columns') }] : []),
    { id: 'check', label: t('tab.check') + (openIssues ? ` (${n(openIssues)})` : '') },
    { id: 'events', label: t('tab.events') }
  ];
  return (
    <section aria-labelledby="ed-title">
      <div class="head-row">
        <h2 id="ed-title" class="h2">{t('ed.title')}</h2>
        <button type="button" class="link" onClick={p.onBack}>{t('ed.back')}</button>
      </div>
      <div class="editor-grid">
        <div class="editor-main">
          <div role="tablist" aria-label={t('ed.tabs')} class="tabs">
            {tabs.map((x) => (
              <button type="button" role="tab" id={'tab-' + x.id} aria-controls={'panel-' + x.id} aria-selected={p.tab === x.id}
                class={'tab' + (p.tab === x.id ? ' active' : '')} onClick={() => p.setTab(x.id)}>{x.label}</button>
            ))}
          </div>
          <div role="tabpanel" id={'panel-' + p.tab} aria-labelledby={'tab-' + p.tab} class="panel">
            {p.tab === 'range' && <RangeTab {...p} />}
            {p.tab === 'split' && <SplitTab {...p} />}
            {p.tab === 'clean' && <CleanTab {...p} />}
            {p.tab === 'privacy' && <PrivacyTab {...p} />}
            {p.tab === 'columns' && isTable && <ColumnsTab {...p} />}
            {p.tab === 'check' && <CheckTab {...p} />}
            {p.tab === 'events' && <EventsTab {...p} />}
          </div>
        </div>
        <LivePanel plan={p.plan} split={p.split} onNext={p.onNext} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Live-Ergebnis

export function LivePanel({ plan, split, onNext }: { plan: PlanResult | null; split: SplitConfig; onNext?: () => void }) {
  const { t, n, b } = useT();
  if (!plan) return <aside class="live card" aria-busy="true"><span class="spinner" aria-hidden="true" /></aside>;
  const parts = plan.format === 'csv' ? plan.csv.parts : plan.ics.parts;
  const removed = Object.values(plan.removed).reduce((a, x) => a + x, 0);
  const pt = (x: number) => (x === 0 ? t('live.noFile') : x === 1 ? t('live.oneFile') : t('live.nParts', { n: x }));
  return (
    <aside class="live card" aria-label={t('live.title')}>
      <div class="live-head"><h3 class="h3">{t('live.title')}</h3><span class="pill">{t('live.badge')}</span></div>
      <div aria-live="polite">
        <div class="kpi-label">{t('live.events')}</div>
        <div class="kpi-value big">{n(plan.events)}</div>
        {removed > 0 && <div class="muted small">{t('live.removed', { n: n(removed) })}</div>}
      </div>
      <div class="live-grid">
        <div class={'mini' + (plan.format === 'ics' ? ' current' : '')}><div class="muted small">{t('live.ics')}</div><strong>{b(plan.ics.bytes)}</strong><div class="small">{pt(plan.ics.parts)}</div></div>
        <div class={'mini' + (plan.format === 'csv' ? ' current' : '')}><div class="muted small">{t('live.csv')}</div><strong>{b(plan.csv.bytes)}</strong><div class="small">{pt(plan.csv.parts)}</div></div>
      </div>
      {plan.csv.skippedSeries > 0 && <div class="muted small">{t('live.csvSeries', { n: n(plan.csv.skippedSeries) })}</div>}
      {plan.events === 0
        ? <Status tone="bad" title={t('live.empty')} text={t('live.emptyText')} />
        : parts <= 1 ? <Status tone="ok" title={t('live.ok')} text={t('live.okText')} />
          : <Status tone="warn" title={t('live.split', { n: parts })} text={t('live.splitText')} />}
      {split.mode !== 'none' && plan.calendars.length > 0 && (
        <div>
          <div class="kpi-label">{t('live.calendars', { n: plan.calendars.length })}</div>
          <ul class="plain target-list">
            {plan.calendars.slice(0, 12).map((c) => <li><span class="break">{c.name}</span><span class="muted">{n(c.events)}</span></li>)}
            {plan.calendars.length > 12 && <li class="muted">…</li>}
          </ul>
        </div>
      )}
      {onNext && <button type="button" class="btn btn-primary btn-block" disabled={plan.events === 0} onClick={onNext}>{t('live.next')}</button>}
      <p class="muted small">{t('live.exact')}</p>
    </aside>
  );
}

// ---------------------------------------------------------------- Zeitraum & Filter

function RangeTab({ loaded, sel, setSel }: Props) {
  const { t, n, d } = useT();
  const yearCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of loaded.calendars) for (const y of c.perYear) m.set(y.year, (m.get(y.year) || 0) + y.count);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [loaded]);
  const allYears = yearCounts.map(([y]) => y);
  const cur = new Set(sel.years ?? allYears);
  const toggle = (y: number) => {
    const s = new Set(cur);
    if (s.has(y)) s.delete(y); else s.add(y);
    setSel({ ...sel, years: s.size === allYears.length ? null : [...s].sort() });
  };
  const thisYear = new Date().getFullYear();
  const lastThree = [thisYear - 2, thisYear - 1, thisYear];
  const fields: TextField[] = ['summary', 'description', 'location', 'categories'];
  return (
    <div class="stack">
      {loaded.calendars.length > 1 && (
        <fieldset class="card">
          <legend class="legend">{t('r.calendars')}</legend>
          <div class="check-grid">
            {loaded.calendars.map((c) => {
              const on = !sel.cals || sel.cals.includes(c.index);
              return (
                <label class={'check-tile' + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} onChange={() => {
                    const all = loaded.calendars.map((x) => x.index);
                    const s = new Set(sel.cals ?? all);
                    if (on) s.delete(c.index); else s.add(c.index);
                    setSel({ ...sel, cals: s.size === all.length ? null : [...s] });
                  }} />
                  <span><strong class="break">{c.name}</strong><span class="muted small">{n(c.events)} {t('an.events')}</span></span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset class="card">
        <legend class="legend">{t('r.period')}</legend>
        <div class="field-row">
          <label class="field">{t('r.from')}
            <input type="date" value={sel.from !== null ? isoDay(sel.from) : ''} onChange={(e) => setSel({ ...sel, from: parseIsoDay((e.target as HTMLInputElement).value) })} />
          </label>
          <label class="field">{t('r.to')}
            <input type="date" value={sel.to !== null ? isoDay(sel.to) : ''} onChange={(e) => setSel({ ...sel, to: parseIsoDay((e.target as HTMLInputElement).value) })} />
          </label>
        </div>
        <div class="btn-row">
          <span class="muted">{t('r.years')}</span>
          <button type="button" class="btn btn-small" onClick={() => setSel({ ...sel, years: lastThree.filter((y) => allYears.includes(y)), from: null, to: null })}>{t('r.lastYears', { a: lastThree[0], b: lastThree[2] })}</button>
          <button type="button" class="btn btn-small" onClick={() => setSel({ ...sel, years: null, from: null, to: null })}>{t('r.all')}</button>
          <button type="button" class="btn btn-small" onClick={() => setSel({ ...sel, years: [] })}>{t('r.none')}</button>
        </div>
        <div class="year-grid">
          {yearCounts.map(([y, c]) => (
            <label class={'check-tile' + (cur.has(y) ? ' on' : '')}>
              <input type="checkbox" checked={cur.has(y)} onChange={() => toggle(y)} />
              <span><strong>{y}</strong><span class="muted small">{n(c)}</span></span>
            </label>
          ))}
        </div>
        <label class="check-line">
          <input type="checkbox" checked={sel.hidePast} onChange={() => setSel({ ...sel, hidePast: !sel.hidePast })} />
          {t('r.past', { d: d(sel.today) })}
        </label>
        <p class="muted small">{t('r.seriesNote')}</p>
      </fieldset>
      <fieldset class="card">
        <legend class="legend">{t('r.text')}</legend>
        <div class="field-row">
          <label class="field">{t('r.in')}
            <select value={sel.onlyField} onChange={(e) => setSel({ ...sel, onlyField: (e.target as HTMLSelectElement).value as TextField })}>
              {fields.map((f) => <option value={f}>{t(('f.' + f) as UiKey)}</option>)}
            </select>
          </label>
          <label class="field grow">{t('r.contains')}
            <input type="search" value={sel.onlyText} placeholder={t('r.placeholder')} onInput={(e) => setSel({ ...sel, onlyText: (e.target as HTMLInputElement).value })} />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------- Aufteilen

let tid = 0;
const newId = () => 't' + Date.now().toString(36) + (++tid);

function SplitTab({ loaded, split, setSplit, plan }: Props) {
  const { t, n } = useT();
  const multiCal = loaded.calendars.length > 1;
  const sug = loaded.suggestions;
  const counts = new Map((plan?.calendars ?? []).map((c) => [c.key, c.events]));
  const modes: { id: SplitConfig['mode']; title: string; hint: string }[] = [
    { id: 'none', title: t('s.none'), hint: t('s.noneHint') },
    ...(multiCal ? [{ id: 'source' as const, title: t('s.source'), hint: t('s.sourceHint') }] : []),
    { id: 'rules', title: t('s.rules'), hint: t('s.rulesHint') },
    { id: 'years', title: t('s.years'), hint: t('s.yearsHint') }
  ];
  const useSuggestion = (kind: string) => {
    const s = sug.find((x) => x.kind === kind);
    if (!s) return;
    const field: TextField = kind === 'categories' ? 'categories' : kind === 'organizer' ? 'organizer' : 'summary';
    const op: Rule['op'] = kind === 'prefix' ? 'starts' : kind === 'organizer' ? 'contains' : 'word';
    const targets: Target[] = s.values.slice(0, 40).map((v) => ({ id: newId(), name: v.value, rules: [{ field, op, value: v.value }] }));
    setSplit({ ...split, mode: 'rules', targets });
  };
  const updTarget = (id: string, f: (x: Target) => Target) => setSplit({ ...split, targets: split.targets.map((x) => (x.id === id ? f(x) : x)) });
  const chips = (['initials', 'prefix', 'categories', 'organizer'] as const).filter((k) => sug.some((s) => s.kind === k));
  const chipLabel: Record<string, UiKey> = { initials: 's.useInitials', prefix: 's.usePrefix', categories: 's.useCategories', organizer: 's.useOrganizer' };
  return (
    <div class="stack">
      <fieldset class="card">
        <legend class="legend">{t('s.mode')}</legend>
        <div class="choice-grid">
          {modes.map((m) => (
            <label class={'choice' + (split.mode === m.id ? ' selected' : '')}>
              <input type="radio" name="split-mode" checked={split.mode === m.id} onChange={() => setSplit({ ...split, mode: m.id })} />
              <span><span class="choice-title">{m.title}</span><span class="muted">{m.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {split.mode === 'rules' && (
        <>
          {chips.length > 0 && (
            <div class="card">
              <h3 class="h3">{t('s.suggest')}</h3>
              <div class="btn-row">
                {chips.map((k) => (
                  <button type="button" class="btn btn-secondary" onClick={() => useSuggestion(k)}>
                    {t(chipLabel[k], { n: sug.find((s) => s.kind === k)!.values.length })}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div class="card">
            <h3 class="h3">{t('s.targets')}</h3>
            <ul class="plain targets">
              {split.targets.map((x) => {
                const r0 = x.rules[0] ?? { field: 'summary' as TextField, op: 'word' as const, value: '' };
                const values = x.rules.map((r) => r.value).join(', ');
                const setRules = (field: TextField, op: Rule['op'], vals: string) =>
                  updTarget(x.id, (y) => ({ ...y, rules: vals.split(',').map((v) => v.trim()).filter(Boolean).map((value) => ({ field, op, value })) }));
                return (
                  <li class="target">
                    <div class="field-row">
                      <label class="field grow">{t('s.name')}
                        <input type="text" value={x.name} onInput={(e) => updTarget(x.id, (y) => ({ ...y, name: (e.target as HTMLInputElement).value }))} />
                      </label>
                      <span class="count-badge">{t('s.count', { n: n(counts.get(x.id) ?? 0) })}</span>
                      <button type="button" class="icon-btn" aria-label={t('s.remove', { name: x.name })}
                        onClick={() => setSplit({ ...split, targets: split.targets.filter((y) => y.id !== x.id) })}><Icon name="trash" size={20} /></button>
                    </div>
                    <div class="field-row">
                      <label class="field">{t('s.field')}
                        <select value={r0.field} onChange={(e) => setRules((e.target as HTMLSelectElement).value as TextField, r0.op, values)}>
                          {(['summary', 'description', 'location', 'categories', 'organizer'] as TextField[]).map((f) => <option value={f}>{t(('f.' + f) as UiKey)}</option>)}
                        </select>
                      </label>
                      <label class="field">{t('s.op')}
                        <select value={r0.op} onChange={(e) => setRules(r0.field, (e.target as HTMLSelectElement).value as Rule['op'], values)}>
                          <option value="word">{t('s.op.word')}</option><option value="contains">{t('s.op.contains')}</option><option value="starts">{t('s.op.starts')}</option>
                        </select>
                      </label>
                      <label class="field grow">{t('s.values')}
                        <input type="text" value={values} onChange={(e) => setRules(r0.field, r0.op, (e.target as HTMLInputElement).value)} />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" class="btn btn-secondary" onClick={() => setSplit({ ...split, targets: [...split.targets, { id: newId(), name: t('s.newTarget') + ' ' + (split.targets.length + 1), rules: [] }] })}>
              <Icon name="plus" size={20} /> {t('s.add')}
            </button>
          </div>
          <div class="card stack-sm">
            <div>{t('s.multi')}</div>
            <label class="check-line"><input type="radio" name="multi" checked={split.multi === 'all'} onChange={() => setSplit({ ...split, multi: 'all' })} />{t('s.multiAll')}</label>
            <label class="check-line"><input type="radio" name="multi" checked={split.multi === 'first'} onChange={() => setSplit({ ...split, multi: 'first' })} />{t('s.multiFirst')}</label>
            {plan && plan.multiMatched > 0 && <div class="muted small">{t('s.multiCount', { n: n(plan.multiMatched) })}</div>}
            <label class="check-line"><input type="checkbox" checked={split.includeRest} onChange={() => setSplit({ ...split, includeRest: !split.includeRest })} />{t('s.rest')}</label>
            {split.includeRest && (
              <label class="field">{t('s.restName')}
                <input type="text" value={split.restName} onInput={(e) => setSplit({ ...split, restName: (e.target as HTMLInputElement).value })} />
              </label>
            )}
          </div>
        </>
      )}
      {split.mode !== 'none' && <p class="note"><Icon name="info" size={22} class="accent" /> {t('s.workspace')}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Aufräumen

function CleanTab({ loaded, clean, setClean, sel, setSel }: Props) {
  const { t, n, b } = useT();
  const cals = loaded.calendars;
  const sum = (f: (c: Loaded['calendars'][number]) => number) => cals.reduce((a, c) => a + f(c), 0);
  const status = loaded.suggestions.find((s) => s.kind === 'status');
  const words = (status?.values ?? []).filter((v) => v.value !== 'STATUS:CANCELLED');
  const opt = (key: keyof CleanOptions, label: string, extra?: string) => (
    <label class="check-line">
      <input type="checkbox" checked={!!clean[key]} onChange={() => setClean({ ...clean, [key]: !clean[key] })} />
      <span>{label}{extra && <span class="muted small"> · {extra}</span>}</span>
    </label>
  );
  return (
    <div class="stack">
      <fieldset class="card stack-sm">
        <legend class="legend">{t('c.title')}</legend>
        {opt('dropAdmin', t('c.admin'), sum((c) => c.adminBytes) ? t('c.saves', { size: b(sum((c) => c.adminBytes)) }) : undefined)}
        {opt('dropDescription', t('c.description'), sum((c) => c.withDescription) ? `${n(sum((c) => c.withDescription))} · ${t('c.saves', { size: b(sum((c) => c.descriptionBytes) + sum((c) => c.withDescription) * 14) })}` : undefined)}
        {sum((c) => c.withLocation) > 0 && opt('dropLocation', t('c.location'), n(sum((c) => c.withLocation)))}
        {sum((c) => c.withAttendees) > 0 && opt('dropAttendees', t('c.attendees'), n(sum((c) => c.withAttendees)))}
        {sum((c) => c.withAlarm) > 0 && opt('dropAlarms', t('c.alarms'), n(sum((c) => c.withAlarm)))}
        {sum((c) => c.withAttachment) > 0 && opt('dropAttachments', t('c.attachments'), n(sum((c) => c.withAttachment)))}
        {sum((c) => c.withConference) > 0 && opt('dropConference', t('c.conference'), n(sum((c) => c.withConference)))}
      </fieldset>
      <fieldset class="card stack-sm">
        <legend class="legend">{t('c.remove')}</legend>
        {words.map((w) => {
          const on = sel.dropWords.includes(w.value);
          return (
            <label class="check-line">
              <input type="checkbox" checked={on} onChange={() => setSel({ ...sel, dropWords: on ? sel.dropWords.filter((x) => x !== w.value) : [...sel.dropWords, w.value] })} />
              <span>{t('c.word', { w: w.value })} <span class="muted small">· {n(w.count)}</span></span>
            </label>
          );
        })}
        {sum((c) => c.cancelled) > 0 && (
          <label class="check-line"><input type="checkbox" checked={sel.dropCancelled} onChange={() => setSel({ ...sel, dropCancelled: !sel.dropCancelled })} /><span>{t('c.cancelled')} <span class="muted small">· {n(sum((c) => c.cancelled))}</span></span></label>
        )}
        {sum((c) => c.tentative) > 0 && (
          <label class="check-line"><input type="checkbox" checked={sel.dropTentative} onChange={() => setSel({ ...sel, dropTentative: !sel.dropTentative })} /><span>{t('c.tentative')} <span class="muted small">· {n(sum((c) => c.tentative))}</span></span></label>
        )}
        <label class="check-line"><input type="checkbox" checked={sel.dedupe} onChange={() => setSel({ ...sel, dedupe: !sel.dedupe })} /><span>{t('c.dedupe')} <span class="muted small">· {n(sum((c) => c.duplicates))}</span></span></label>
      </fieldset>
      <fieldset class="card">
        <legend class="legend">{t('c.replace')}</legend>
        <div class="field-row">
          <label class="field grow">{t('c.find')}<input type="text" value={clean.replaceFind} onChange={(e) => setClean({ ...clean, replaceFind: (e.target as HTMLInputElement).value })} /></label>
          <label class="field grow">{t('c.with')}<input type="text" value={clean.replaceWith} onChange={(e) => setClean({ ...clean, replaceWith: (e.target as HTMLInputElement).value })} /></label>
        </div>
      </fieldset>
      <div class="card stack-sm">
        {opt('newUids', t('c.uids'))}
        <p class="muted small">{t('c.uidsHint')}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Persönliche Daten

function PrivacyTab({ loaded, table, clean, setClean, conv, setConv }: Props) {
  const { t, n } = useT();
  const cals = loaded.calendars;
  const phones = cals.reduce((a, c) => a + c.phoneInTitle + c.phoneInDescription, 0);
  const emails = cals.reduce((a, c) => a + c.emailInTitle + c.emailInDescription, 0);
  const piiCols = (table?.columns ?? []).filter((c) => !!c.pii && !(conv.birthdays && c.role === 'birthday'));
  return (
    <div class="stack">
      <H as="p" k="p.intro" />
      {piiCols.length > 0 && piiCols.map((c) => {
        const mode: ShortenMode = conv.pii[c.index] ?? 'keep';
        const kind = c.pii as PiiKind;
        const sample = c.samples[0] ?? '';
        const opts: { v: ShortenMode; label: string }[] = [
          { v: 'remove', label: t('p.remove') },
          { v: 'short', label: t(('p.short.' + kind) as UiKey) },
          { v: 'keep', label: t('p.keep') }
        ];
        return (
          <div class="card">
            <div class="head-row"><h3 class="h3 break">{t('p.column', { col: c.header })}</h3><span class="muted">{t(('p.kind.' + kind) as UiKey)}</span></div>
            <div role="radiogroup" aria-label={t('p.column', { col: c.header })} class="seg">
              {opts.map((o) => (
                <button type="button" role="radio" aria-checked={mode === o.v} class={'seg-btn' + (mode === o.v ? ' on' : '')}
                  onClick={() => setConv({ ...conv, pii: { ...conv.pii, [c.index]: o.v } })}>{o.label}</button>
              ))}
            </div>
            <div class="result-box">{t('p.result')} <strong>{mode === 'remove' ? t('p.nothing') : mode === 'short' ? shortPreview(kind, sample) : sample}</strong></div>
          </div>
        );
      })}
      {table && piiCols.length === 0 && <p class="muted">{t('p.none')}</p>}
      <fieldset class="card stack-sm">
        <label class="check-line"><input type="checkbox" checked={clean.maskPhones} onChange={() => setClean({ ...clean, maskPhones: !clean.maskPhones })} /><span>{t('p.phones')}{!table && <span class="muted small"> · {t('p.found', { n: n(phones) })}</span>}</span></label>
        <label class="check-line"><input type="checkbox" checked={clean.maskEmails} onChange={() => setClean({ ...clean, maskEmails: !clean.maskEmails })} /><span>{t('p.emails')}{!table && <span class="muted small"> · {t('p.found', { n: n(emails) })}</span>}</span></label>
        <label class="check-line"><input type="checkbox" checked={clean.dropDescription} onChange={() => setClean({ ...clean, dropDescription: !clean.dropDescription })} /><span>{t('p.dropDesc')}</span></label>
      </fieldset>
    </div>
  );
}

function shortPreview(kind: PiiKind, v: string): string {
  const s = v.trim();
  if (kind === 'name') return s.split(/[\s,]+/).filter(Boolean).map((p) => p[0].toUpperCase() + '.').join(' ');
  if (kind === 'phone') { const d = s.replace(/\D/g, ''); return d.length > 4 ? s.slice(0, 4) + ' … ' + d.slice(-2) : '…'; }
  if (kind === 'email') { const at = s.indexOf('@'); return at > 0 ? s[0] + '…' + s.slice(at) : '…'; }
  if (kind === 'birthdate') return (/(\d{4})/.exec(s) || ['', '…'])[1];
  const m = /\b\d{5}\b\s*(\S+)?/.exec(s);
  return m ? m[0] : '…';
}

// ---------------------------------------------------------------- Spalten (nur Tabellen)

const ROLES: Role[] = ['subject', 'startDate', 'startTime', 'endDate', 'endTime', 'start', 'end', 'duration', 'allDay', 'description', 'location', 'private', 'name', 'birthday', 'extra', 'skip'];

function ColumnsTab({ table, roles, setRoles, conv, setConv }: Props) {
  const { t } = useT();
  if (!table) return null;
  const hasBirthday = Object.values(roles).includes('birthday');
  return (
    <div class="stack">
      <div class="card">
        <p class="muted">{t('col.intro')}</p>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>{t('col.yours')}</th><th>{t('col.example')}</th><th>{t('col.target')}</th></tr></thead>
            <tbody>
              {table.columns.map((c) => (
                <tr class={roles[c.index] === 'skip' ? 'dim' : ''}>
                  <td><strong class="break">{c.header}</strong></td>
                  <td class="muted break">{c.samples[0] ?? ''}</td>
                  <td>
                    <select aria-label={t('col.target') + ': ' + c.header} value={roles[c.index]} onChange={(e) => setRoles({ ...roles, [c.index]: (e.target as HTMLSelectElement).value as Role })}>
                      {ROLES.map((r) => <option value={r}>{t(('role.' + r) as UiKey)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card stack-sm">
        <div class="field-row">
          <label class="field">{t('col.duration')}
            <select value={String(conv.defaultMinutes)} onChange={(e) => setConv({ ...conv, defaultMinutes: +(e.target as HTMLSelectElement).value })}>
              {[15, 30, 45, 60, 90, 120].map((m) => <option value={String(m)}>{t('col.minutes', { n: m })}</option>)}
            </select>
          </label>
          <label class="field">{t('col.tz')}
            <select value={conv.tz} onChange={(e) => setConv({ ...conv, tz: (e.target as HTMLSelectElement).value })}>
              {EXPORT_TIMEZONES.map((z) => <option value={z}>{z}</option>)}
            </select>
          </label>
        </div>
        {hasBirthday && (
          <>
            <label class="check-line"><input type="checkbox" checked={conv.birthdays} onChange={() => setConv({ ...conv, birthdays: !conv.birthdays })} />{t('col.birthdays')}</label>
            {conv.birthdays && <label class="check-line"><input type="checkbox" checked={conv.birthdayYearInTitle} onChange={() => setConv({ ...conv, birthdayYearInTitle: !conv.birthdayYearInTitle })} />{t('col.birthYear')}</label>}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Prüfen

function CheckTab({ loaded, table, conv, setConv }: Props) {
  const { t, n } = useT();
  if (!table) {
    const sum = (f: (c: Loaded['calendars'][number]) => number) => loaded.calendars.reduce((a, c) => a + f(c), 0);
    const other = loaded.calendars.reduce((a, c) => a + Object.values(c.otherComponents).reduce((x, y) => x + y, 0), 0);
    const items: [number, UiKey][] = [
      [sum((c) => c.problems.noStart), 'chk.ics.noStart'], [sum((c) => c.problems.endBeforeStart), 'chk.ics.endBeforeStart'],
      [sum((c) => c.problems.noSummary), 'chk.ics.noSummary'], [sum((c) => c.floating), 'chk.ics.floating'], [other, 'chk.ics.other']
    ];
    const shown = items.filter(([x]) => x > 0);
    return shown.length
      ? <ul class="plain stack-sm">{shown.map(([x, k]) => <li class="card row-icon"><Icon name="warn" size={26} class="warn" />{t(k, { n: n(x) })}</li>)}</ul>
      : <Status tone="ok" title={t('chk.ok')} />;
  }
  const issues = loaded.issues ?? [];
  const total = loaded.issueCount ?? 0;
  const open = issues.filter((i) => !conv.fixes[i.row]).length;
  const setFix = (row: number, v: 'fix' | 'drop') => setConv({ ...conv, fixes: { ...conv.fixes, [row]: v } });
  if (!total) return <Status tone="ok" title={t('chk.ok')} />;
  return (
    <div class="stack-sm">
      <div class="head-row">
        <p>{open ? t('chk.intro', { n: n(open + Math.max(0, total - issues.length)) }) : t('chk.ok')}</p>
        {open > 0 && <button type="button" class="btn btn-secondary" onClick={() => {
          const fx = { ...conv.fixes };
          for (const i of issues) if (!fx[i.row]) fx[i.row] = i.fix === 'drop' ? 'drop' : 'fix';
          setConv({ ...conv, fixes: fx });
        }}>{t('chk.fixAll')}</button>}
      </div>
      <ul class="plain stack-sm">
        {issues.map((i) => {
          const f = conv.fixes[i.row];
          return (
            <li class="card issue">
              <Icon name={f ? 'check' : 'warn'} size={26} class={f ? 'ok' : 'warn'} />
              <div class="grow">
                <div><strong>{t('chk.line', { n: n(i.line) })}:</strong> {t(('issue.' + i.code) as UiKey, { v: i.value })}</div>
                {!f ? (
                  <>
                    <div class="muted">{t('chk.suggest')} {t(('fix.' + i.fix) as UiKey, { v: i.fixValue ?? '' })}</div>
                    <div class="btn-row">
                      <button type="button" class="btn btn-primary btn-small" onClick={() => setFix(i.row, i.fix === 'drop' ? 'drop' : 'fix')}>{t('chk.apply')}</button>
                      {i.fix !== 'drop' && <button type="button" class="btn btn-small" onClick={() => setFix(i.row, 'drop')}>{t('chk.drop')}</button>}
                    </div>
                  </>
                ) : <div class="ok-text">{f === 'drop' ? t('chk.dropped') : t('chk.done')}</div>}
              </div>
            </li>
          );
        })}
      </ul>
      {total > issues.length && <p class="muted">{t('chk.more', { n: n(total - issues.length) })}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Einzelne Termine

function EventsTab({ sel, setSel, conv, setConv, table, loaded }: Props) {
  const { t, n, d } = useT();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ rows: EventRow[]; total: number } | null>(null);
  useEffect(() => {
    const h = setTimeout(async () => setRes(await call({ type: 'list', selection: sel, query: q })), 150);
    return () => clearTimeout(h);
  }, [q, sel, loaded]);
  const deleted = table ? Object.values(conv.fixes).filter((x) => x === 'drop').length : sel.deleted.length;
  const del = (r: EventRow) => {
    if (table && r.row !== null) setConv({ ...conv, fixes: { ...conv.fixes, [r.row]: 'drop' } });
    else setSel({ ...sel, deleted: [...sel.deleted, r.id] });
  };
  const hidden = new Set(sel.deleted);
  return (
    <div class="stack-sm">
      <label class="field">{t('ev.search')}<input type="search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} /></label>
      {res && <div class="muted small">{t('ev.showing', { n: n(res.rows.length), total: n(res.total) })}{deleted > 0 && <> · {t('ev.deleted', { n: deleted })} <button type="button" class="link" onClick={() => table ? setConv({ ...conv, fixes: Object.fromEntries(Object.entries(conv.fixes).filter(([, v]) => v !== 'drop')) }) : setSel({ ...sel, deleted: [] })}>{t('ev.undo')}</button></>}</div>}
      <div class="table-wrap">
        <table class="data">
          <tbody>
            {(res?.rows ?? []).filter((r) => !hidden.has(r.id)).map((r) => (
              <tr>
                <td class="nowrap">{d(r.start)}</td>
                <td class="nowrap muted">{r.allDay || r.start === null ? '' : new Date(r.start).toISOString().slice(11, 16)}</td>
                <td class="break"><strong>{r.summary}</strong>{r.series && <span class="pill">{t('ev.series')}</span>}</td>
                <td class="right"><button type="button" class="icon-btn" aria-label={t('ev.delete', { t: r.summary.slice(0, 40) })} onClick={() => del(r)}><Icon name="trash" size={20} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
