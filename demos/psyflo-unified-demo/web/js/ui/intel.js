// Oprox parity components (R7): the small parts Authorizations, Denial Intelligence and the extension panel share.
//
//   stepsHTML(steps, done, {label})            a checklist: ✓ done · ● running · ○ waiting
//   runSteps(host, steps, {interval, label})   paints the checklist step by step into `host`; -> { done: Promise<boolean>, cancel() }
//                                              (instant when the person prefers reduced motion or interval is 0)
//   trendChart({ labels, series, min, max })   an inline SVG line chart with a legend and a text table for screen readers
//   sevTag(sev) · statusPill(kind, text)       CRITICAL / STRONG tags; Documented / Needs strengthening / Approved / Denied pills
//   kpiTile · barRow · moneyChip · dueChip · needsInputBadge · decisionSupport · sampleChip
//   insightsDrawer({ s, scope, returnFocus, onClose })   the facility insights in a side drawer
//
// Numbers that come from the sample (seed intel_sample, rec_outcomes) are always shown with the Simulated chip and the basis sentence.
import { esc, icon } from './util.js';
import { chip, maturity } from './chip.js';
import { drawer } from './overlay.js';
import { insights, INTEL_BASIS, DECISION_SUPPORT } from '../shared/intel.js';

// ------------------------------------------------------------------------------------------------ steps
export function stepsHTML(steps, done = 0, o = {}) {
  return `<ol class="in-steps"${o.label ? ` aria-label="${esc(o.label)}"` : ''} aria-live="polite">${steps.map((t, i) => {
    const st = i < done ? 'done' : i === done ? 'run' : 'wait';
    const mark = st === 'done' ? icon('check', 16) : `<span class="in-dot${st === 'wait' ? ' in-dot--wait' : ''}" aria-hidden="true"></span>`;
    return `<li data-state="${st}">${mark}<span>${esc(t)}</span></li>`;
  }).join('')}</ol>`;
}
export function runSteps(host, steps, o = {}) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = o.interval != null ? o.interval : 650; let i = 0; let timer = null; let cancelled = false;
  const paint = () => { host.innerHTML = stepsHTML(steps, i, o); host.setAttribute('data-done', String(i)); host.setAttribute('data-total', String(steps.length)); };
  const done = new Promise(resolve => {
    paint();
    if (reduce || interval <= 0) { i = steps.length; paint(); resolve(true); return; }
    timer = setInterval(() => {
      if (cancelled || !host.isConnected) { clearInterval(timer); resolve(false); return; }
      i += 1; paint();
      if (i >= steps.length) { clearInterval(timer); resolve(true); }
    }, interval);
  });
  return { done, cancel() { cancelled = true; if (timer) clearInterval(timer); } };
}

// ------------------------------------------------------------------------------------------------ chart
const TONE_CLASS = { teal: 0, amber: 1, navy: 2, red: 3 };
// trendChart({ labels:[x], series:[{ name, tone, points:[n|null] }], min, max, width, height, title, unit })
export function trendChart({ labels = [], series = [], min = 0, max = 4, width = 520, height = 210, title = 'Trend', unit = '' } = {}) {
  const L = 38, R = 14, T = 12, B = 30; const w = width - L - R; const h = height - T - B; const n = Math.max(1, labels.length);
  const x = i => L + (n === 1 ? w / 2 : (w * i) / (n - 1)); const y = v => T + h - ((v - min) / (max - min || 1)) * h;
  const ticks = []; const step = (max - min) / 4; for (let k = 0; k <= 4; k++) ticks.push(Math.round((min + step * k) * 10) / 10);
  const grid = ticks.map(t => `<line class="in-chart__grid" x1="${L}" x2="${width - R}" y1="${y(t)}" y2="${y(t)}"/><text class="in-chart__ax" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
  const xs = labels.map((lb, i) => `<text class="in-chart__ax" x="${x(i)}" y="${height - 8}" text-anchor="middle">${esc(lb)}</text>`).join('');
  const lines = series.map((s, si) => {
    const c = TONE_CLASS[s.tone] != null ? TONE_CLASS[s.tone] : si % 4; const segs = []; let cur = [];
    (s.points || []).forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(v)]); }); if (cur.length) segs.push(cur);
    const dots = (s.points || []).map((v, i) => v == null ? '' : `<circle class="in-chart__pt in-chart__s${c}" cx="${x(i)}" cy="${y(v)}" r="3.5"/>`).join('');
    return `${segs.map(sg => `<polyline class="in-chart__ln in-chart__s${c}" fill="none" points="${sg.map(p => p.join(',')).join(' ')}"/>`).join('')}${dots}`;
  }).join('');
  const legend = `<ul class="in-chart__legend">${series.map((s, si) => { const c = TONE_CLASS[s.tone] != null ? TONE_CLASS[s.tone] : si % 4; const last = [...(s.points || [])].reverse().find(v => v != null); return `<li><i class="in-chart__sw in-chart__s${c}"></i>${esc(s.name)}${last != null ? ` <b>${esc(String(last))}${esc(unit)}</b>` : ''}</li>`; }).join('')}</ul>`;
  const table = `<table class="ui-sr"><caption>${esc(title)}</caption><thead><tr><th>Point</th>${series.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>${labels.map((lb, i) => `<tr><th>${esc(lb)}</th>${series.map(s => `<td>${(s.points || [])[i] == null ? '—' : esc(String(s.points[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<figure class="in-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}" preserveAspectRatio="xMidYMid meet">${grid}${xs}${lines}</svg>${legend}${table}</figure>`;
}

// ------------------------------------------------------------------------------------------------ small parts
export const sevTag = sev => chip(String(sev || '').toUpperCase(), { tone: sev === 'critical' ? 'danger' : sev === 'strong' ? 'warning' : 'neutral', size: 'sm', className: 'in-sev' });
const PILL = { documented: ['success', 'check'], needs: ['warning', 'alert'], approved: ['success', 'check'], denied: ['danger', 'alert'], info: ['info', null] };
export const statusPill = (kind, text) => { const [tone, ic] = PILL[kind] || PILL.info; return chip(text, { tone, icon: ic || undefined, size: 'sm', className: 'in-pill', attrs: { 'data-pill': kind } }); };
export const kpiTile = ({ label, value, caption = '', tone = '' }) => `<div class="in-kpi${tone ? ' in-kpi--' + tone : ''}"><span class="in-kpi__l">${esc(label)}</span><b class="in-kpi__v">${esc(String(value))}</b>${caption ? `<span class="in-kpi__c">${esc(caption)}</span>` : ''}</div>`;
export const barRow = ({ label, pct, value, tone = '' }) => `<li class="in-bar"><span class="in-bar__l">${esc(label)}</span><span class="in-bar__t" aria-hidden="true"><i${tone ? ` class="in-bar__${tone}"` : ''} style="width:${Math.max(0, Math.min(100, pct))}%"></i></span><b class="in-bar__v">${esc(value != null ? String(value) : pct + '%')}</b></li>`;
export const moneyChip = risk => (risk ? `<span class="in-money" title="${esc(risk.basis + '. ' + (risk.why || ''))}" data-at-risk="${esc(String(risk.dollars))}">${chip(risk.label, { tone: 'danger', size: 'sm', icon: 'alert' })}</span>` : '');
export const dueChip = u => (u && u.label ? chip(u.label, { tone: u.sev === 'overdue' ? 'danger' : u.sev === 'soon' ? 'warning' : 'neutral', size: 'sm', icon: 'clock', className: 'in-due' }) : '');
export const needsInputBadge = n => (n ? chip(n > 1 ? `Needs input · ${n}` : 'Needs input', { tone: 'warning', size: 'sm', icon: 'pencil', className: 'in-needs' }) : '');
export const decisionSupport = () => `<p class="in-ds" role="note">${icon('info', 16)}<span>${esc(DECISION_SUPPORT)}</span></p>`;
export const sampleChip = () => maturity('intel.sample');
export const basisLine = (text = INTEL_BASIS) => `<p class="in-basis">${sampleChip()} <span>${esc(text)}</span></p>`;

// ------------------------------------------------------------------------------------------------ insights drawer
function section(key, d) {
  if (key === 'approval') return `<section class="in-sec" data-sec="approval"><h3>Approval rate by payer</h3><ul class="in-bars">${d.approvalByPayer.map(a => barRow({ label: a.name, pct: a.pct })).join('')}</ul></section>`;
  if (key === 'reasons') return `<section class="in-sec" data-sec="reasons"><h3>Common denial reasons by payer</h3><table class="in-tbl"><thead><tr><th>Denial reason</th><th>Payer</th><th class="is-r">Count</th><th class="is-r">% of denials</th></tr></thead><tbody>${d.denialReasons.map(x => `<tr><td>${esc(x.reason.replace(/^"|"$/g, ''))}</td><td>${esc(x.name)}</td><td class="is-r">${x.count}</td><td class="is-r">${x.pct}%</td></tr>`).join('')}</tbody></table></section>`;
  if (key === 'actions') return `<section class="in-sec" data-sec="actions"><h3>Most impactful suggestions</h3><ol class="in-acts">${d.actions.map(a => `<li><span class="in-acts__t">${esc(a.label)}</span><span class="in-acts__a">Applied ${a.applied} times</span>${chip(a.success + '% success', { tone: 'success', size: 'sm' })}</li>`).join('')}</ol></section>`;
  return `<section class="in-sec" data-sec="overrides"><h3>Override patterns and success rates</h3><ul class="in-ovr">${d.overrides.rows.map(r => `<li><span>${esc(r.label)}</span><b>${r.count}</b><span class="in-ovr__s">${r.success != null ? r.success + '% success' : ''}</span>${r.live ? `<span class="in-ovr__l">${r.live} logged here</span>` : ''}</li>`).join('')}</ul></section>`;
}
export function insightsHTML(s, scope = 'auth') {
  const d = insights(s, scope);
  return `<div class="in-ins" data-scope="${esc(scope)}">${basisLine(d.basis)}<div class="in-kpis">${d.kpis.map(kpiTile).join('')}</div>${d.sections.map(k => section(k, d)).join('')}</div>`;
}
export function insightsDrawer({ s, scope = 'auth', returnFocus, onClose } = {}) {
  return drawer({ title: scope === 'denial' ? 'Denial insights' : 'Facility insights', body: insightsHTML(typeof s === 'function' ? s() : s, scope), returnFocus, onClose });
}
