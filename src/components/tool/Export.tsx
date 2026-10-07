import { useState } from 'preact/hooks';
import type { Format, Loaded, PlanRequest, PlanResult } from '../../lib/engine';
import { call, download } from './client';
import { H, HELP, Icon, useT } from './ui';

interface Props {
  loaded: Loaded; plan: PlanResult | null; format: Format; setFormat: (f: Format) => void; isTable: boolean;
  req: PlanRequest; simple: boolean; onBack: () => void;
}

export function Export({ plan, format, setFormat, req, simple, onBack }: Props) {
  const { t, n, b, d } = useT();
  const [busy, setBusy] = useState('');
  const salt = useState(() => Math.random().toString(36).slice(2))[0];
  const totalParts = plan ? plan.calendars.reduce((a, c) => a + c.parts.length, 0) : 0;
  const multiCal = (plan?.calendars.length ?? 0) > 1;

  async function get(which: { cal: string; part: number } | 'zip', key: string) {
    setBusy(key);
    try {
      const f = await call<{ name: string; data: Uint8Array; type: string }>({ type: 'build', req: { ...req, format }, which, salt });
      download(f.name, f.data, f.type);
    } finally { setBusy(''); }
  }

  return (
    <section class="stack" aria-labelledby="ex-title">
      <div class="head-row">
        <h2 id="ex-title" class="h2">{totalParts > 1 ? t('ex.titleParts', { n: totalParts }) : t('ex.title')}</h2>
        {simple && <button type="button" class="link" onClick={onBack}>{t('ex.backSimple')}</button>}
      </div>

      <div class="callout warn-box">
        <span class="callout-num" aria-hidden="true">1</span>
        <div>
          <div class="callout-title">{t('ex.first')}</div>
          <H as="div" k="ex.firstText" />
          {multiCal && <div class="muted">{t('ex.firstMulti')}</div>}
          <p class="source">{t('src.label')} <a href={HELP.create} rel="noopener">{t('src.create')}</a>, <a href={HELP.delete} rel="noopener">{t('src.delete')}</a></p>
        </div>
      </div>

      <fieldset class="plain-fieldset">
        <legend class="legend">{t('ex.format')}</legend>
        <div class="choice-grid two">
          {(['ics', 'csv'] as Format[]).map((f) => (
            <label class={'choice' + (format === f ? ' selected' : '')}>
              <input type="radio" name="fmt" checked={format === f} onChange={() => setFormat(f)} />
              <span>
                <span class="choice-title">{f === 'ics' ? t('ex.ics') : t('ex.csv')}</span>
                <span class="muted">{f === 'ics' ? t('ex.icsHint') : t('ex.csvHint')}</span>
                {plan && <strong>{b(f === 'ics' ? plan.ics.bytes : plan.csv.bytes)} · {(f === 'ics' ? plan.ics.parts : plan.csv.parts) > 1 ? t('live.nParts', { n: f === 'ics' ? plan.ics.parts : plan.csv.parts }) : t('live.oneFile')}</strong>}
              </span>
            </label>
          ))}
        </div>
        {format === 'csv' && plan && plan.csv.skippedSeries > 0 && <p class="note warn-text"><Icon name="warn" size={22} /> {t('ex.csvSeries', { n: n(plan.csv.skippedSeries) })}</p>}
      </fieldset>

      <div>
        <div class="stack">
          {!plan && <div class="card"><span class="spinner" aria-hidden="true" /></div>}
          {plan && plan.calendars.map((c) => (
            <div class="card">
              <div class="head-row">
                <h3 class="h3 break">{c.name || t('ex.all')} <span class="muted small">· {t('ex.events', { n: n(c.events) })} · {b(c.bytes)}</span></h3>
              </div>
              <ul class="plain parts">
                {c.parts.map((p) => {
                  const key = c.key + '-' + p.index;
                  return (
                    <li class="part">
                      <div class="grow">
                        <div><strong>{c.parts.length > 1 ? t('ex.part', { n: p.index + 1, m: c.parts.length }) : t('ex.one')}</strong> · {d(p.from)} – {d(p.to)}</div>
                        <div class="muted small break">{p.file} · {t('ex.events', { n: n(p.events) })} · {b(p.bytes)}</div>
                      </div>
                      <button type="button" class="btn btn-primary" disabled={!!busy} onClick={() => get({ cal: c.key, part: p.index }, key)}>
                        <Icon name="download" size={20} /> {busy === key ? t('ex.building') : c.parts.length > 1 ? t('ex.downloadPart', { n: p.index + 1 }) : t('ex.download')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {totalParts > 1 && (
            <div class="card">
              <button type="button" class="btn btn-secondary" disabled={!!busy} onClick={() => get('zip', 'zip')}><Icon name="download" size={20} /> {busy === 'zip' ? t('ex.building') : t('ex.zip')}</button>
              <p class="muted small">{t('ex.zipNote')}</p>
            </div>
          )}
          <div class="card">
            <h3 class="h3">{t('ex.how')}</h3>
            <ol class="steps-list">
              <H as="li" k="ex.how1" />
              <H as="li" k="ex.how2" />
              <H as="li" k="ex.how3" />
              <H as="li" k="ex.how4" />
              <H as="li" k="ex.how5" />
            </ol>
            <details class="more">
              <summary>{t('ex.errors')}</summary>
              <ul>
                <H as="li" k="ex.err1" />
                <H as="li" k="ex.err2" />
                <H as="li" k="ex.err3" />
                <H as="li" k="ex.err4" />
              </ul>
              <p class="source">{t('src.label')} <a href={HELP.problems} rel="noopener">{t('src.help')}</a></p>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
