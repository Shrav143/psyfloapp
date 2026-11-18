// Authorization intelligence on the Authorizations screens (R7, Oprox parity; Owner A). One module for what the list and the case page share:
//
//   dueHtml(urgency) · riskHtml(risk)      the due-in chip and the dollars-at-risk chip (every role); an overdue date is red whatever the rule says
//   chipper(s, r)                          (ids, limit) -> evidence chips from the request's evidence index
//   headerStrip(s, r, me)                  the case page strip: due, dollars at risk, and for the clinician expected approval, model confidence, comparable cases (sample)
//   trajectoryHtml(s, r, tv) · openTrajectory(screen, id, opener)   the Clinical trajectory drawer (clinician)
//   historicalHtml(s, r, hv) · openHistorical(screen, id, opener)   the Historical outcomes drawer (clinician; sample)
//   openPulseWhy(screen, opener)           the payer insights drawer behind "See why" on the payer line (every role)
//   openInsights(screen, opener)           the facility insights drawer (every role; no client data)
//   pulseHidden() · hidePulse()            the payer line's dismissal, remembered for the tab (sessionStorage, guarded)
//   AIN_CSS                                the screens' css getters join it
//
// Nothing here writes a clinical sentence: the selectors (shared/sel/auth-intel.js) build every line from stored records or say what is missing. The sample figures
// (expected approval, model confidence, comparable cases, modeled likelihoods, payer approval rates) carry the Simulated chip and the basis sentence.
import { esc, ui } from '../app.js';
import { byId } from '../shared/model.js';
import { evidenceIndex, evidenceById, chipOpts } from '../shared/sel/disputes.js';
import { headerOf, trajectoryOf, historicalView } from '../shared/sel/auth-intel.js';
import { payerPattern, payerPulse, INTEL_BASIS } from '../shared/intel.js';
import { fmtDate } from '../shared/dates.js';
import * as asam from '../shared/asam.js';

export const RANKED = 'Psyflo ranked this case first because of the dollars at risk and the clock.';
const PULSE_KEY = 'psyflo.pulse.auth';

// ------------------------------------------------------------------------------------------------ small parts
export const dueFor = u => (u && u.hours != null && u.hours < 0 && u.sev !== 'overdue' ? { ...u, sev: 'overdue' } : u);
export const dueHtml = (u, none = true) => (u && u.label ? ui.dueChip(dueFor(u)) : none ? '<span class="ai-none">No date yet</span>' : '');
export const riskHtml = (k, none = false) => (k ? ui.moneyChip(k) : none ? '<span class="ai-none">Nothing at risk</span>' : '');
export function chipper(s, r) {
  let X = null; const idx = () => (X || (X = evidenceIndex(s, null, r)));
  return (ids, limit = 4) => (ids || []).map(id => evidenceById(idx(), id)).filter(Boolean).slice(0, limit).map(it => ui.evidenceChip(chipOpts(it))).join('');
}
const ev = html => (html ? `<div class="ai-ev">${html}</div>` : '');
const sample = () => ui.sampleChip();
export function pulseHidden() { try { return sessionStorage.getItem(PULSE_KEY) === '1'; } catch { return false; } }
export function hidePulse() { try { sessionStorage.setItem(PULSE_KEY, '1'); } catch { /* the line comes back on the next visit */ } }

// ------------------------------------------------------------------------------------------------ the case page strip (A-10)
export function headerStrip(s, r, me) {
  const h = headerOf(s, r, me);
  const item = (label, v) => `<div class="ai-strip__i"><span class="ai-strip__l">${esc(label)}</span><span class="ai-strip__v">${v}</span></div>`;
  const clin = h.clinical ? [
    item('Expected approval', `<b>${h.expected.base}%</b><span aria-hidden="true">→</span><span class="ui-sr"> to </span><b>${h.expected.expected}%</b>`),
    item('Model confidence', `<b>${h.confidence.value.toFixed(2)}</b><small>${esc(h.confidence.text)}</small>`),
    item('Comparable cases', `<b>${h.comparable.count}</b><small>${esc(h.comparable.payer)}</small>`)
  ].join('') : '';
  const basis = h.clinical ? `<p class="ai-strip__n">${sample()} <span>Expected approval, model confidence and comparable cases: ${esc(INTEL_BASIS)}</span></p>` : '';
  return `<section class="ai-strip" aria-label="Case signals" data-strip>${item('Due', dueHtml(h.urgency))}${item('At risk', riskHtml(h.risk, true))}${clin}${h.rankedFirst ? `<p class="ai-strip__cap" data-ranked>${esc(RANKED)}</p>` : ''}${basis}</section>`;
}

// ------------------------------------------------------------------------------------------------ Clinical trajectory (A-13)
const co = items => `<ul class="ai-co">${items.map(c => `<li><span>${esc(c.l)}</span><b>${esc(String(c.v))}</b>${c.s ? `<small>${esc(c.s)}</small>` : ''}</li>`).join('')}</ul>`;
export function trajectoryHtml(s, r, tv) {
  const ch = chipper(s, r); const t = tv.trend; const sc = tv.screens; const e = tv.engagement;
  const sum = `<dl class="ui-sdl ai-sum" data-tj="summary">${tv.summary.map(x => `<div data-key="${esc(x.key)}"><dt>${esc(x.label)}</dt><dd>${esc(x.value)}${x.note ? `<span class="ai-note">${esc(x.note)}</span>` : ''}${x.ids.length ? ev(ch(x.ids, 1)) : ''}</dd></div>`).join('')}</dl>`;
  const asamChart = !tv.hasAssessment ? '<p class="ai-empty">No ASAM assessment is on file, so there is no trend to draw.</p>'
    : t.hasTrend ? ui.trendChart({ labels: t.labels, series: t.series, min: t.min, max: t.max, title: t.title, height: 170 })
      : `<p class="ai-empty">One assessment is on file (${esc(t.labels[0])}). A trend needs two; the current ratings are below.</p>`;
  const asamNow = t.callouts.length ? co(t.callouts.map(c => ({ l: `Current ${c.name}`, v: c.value, s: c.label }))) : '';
  const scores = !sc.items.length ? '<p class="ai-empty">No PHQ-9, GAD-7, DAST-10 or AUDIT-C score is stored for this client. Add one to the record to see it here.</p>'
    : `${sc.hasTrend ? ui.trendChart({ labels: sc.labels, series: sc.series, min: 0, max: Math.ceil(sc.max / 4) * 4, title: sc.title, height: 170 }) : ''}${co(sc.callouts.map(c => ({ l: `Current ${c.name}`, v: c.current, s: `${fmtDate(c.date)}${c.previous != null ? `, was ${c.previous}` : ''}` })))}`;
  const drivers = tv.drivers.length ? `<ul class="ai-list" data-tj="drivers">${tv.drivers.map(d => `<li data-dim="${d.n}"><div class="ai-list__h"><b>${esc(d.short)} · ${esc(d.label)}</b>${ui.chip(`Rated ${d.rating} · ${d.ratingLabel}`, { tone: d.rating >= 3 ? 'warning' : 'neutral', size: 'sm' })}</div><p>${esc(d.text)}</p>${d.gap ? `<p class="ai-gap">${ui.icon('alert', 14)}<span>${esc(d.gap)}</span></p>` : ''}${ev(ch(d.ids))}</li>`).join('')}</ul>`
    : `<p class="ai-empty">${tv.hasAssessment ? 'No dimension is rated 2 or more in the latest assessment.' : 'No ASAM assessment is on file.'}</p>`;
  const eng = e.score || e.lines.length || e.dailyNotes ? `<div class="ai-eng" data-tj="engagement">${e.score ? `<div class="ai-big"><b>${e.score.pct}%</b><span>Attended ${e.score.attended} of ${e.score.scheduled} scheduled groups, from the stored record</span></div>` : ''}${e.lines.length ? `<ul class="ai-list ai-list--plain">${e.lines.map(l => `<li><p>${esc(l.text)}</p>${ev(ch(l.ids, 2))}</li>`).join('')}</ul>` : ''}${e.dailyNotes ? `<p class="ai-sub">${e.dailyNotes} daily ${e.dailyNotes === 1 ? 'note' : 'notes'} in the last 30 days.</p>` : ''}</div>`
    : '<p class="ai-empty">No attendance count is on file. Add one to the record to see it here.</p>';
  const risks = tv.risks.length ? `<ul class="ai-risk" data-tj="risks">${tv.risks.map(x => `<li data-tone="${esc(x.tone)}">${ui.icon('alert', 16)}<div><span class="ui-sr">${x.tone === 'danger' ? 'Needs action: ' : 'Watch: '}</span>${esc(x.text)}${ev(ch(x.ids, 2))}</div></li>`).join('')}</ul>` : '<p class="ai-empty">No risk signal is open in the stored record.</p>';
  return `<div class="ai-tj">${ui.decisionSupport()}${sum}<section class="ai-sec"><h3>Symptom and functional trend</h3>${asamChart}${asamNow}<h4>Screening scores</h4>${scores}</section><section class="ai-sec"><h3>Key drivers identified</h3>${drivers}</section><section class="ai-sec"><h3>Engagement signals</h3>${eng}</section><section class="ai-sec"><h3>Risk signals remaining</h3>${risks}</section></div>`;
}
export function openTrajectory(screen, id, opener) {
  const s = screen.s; const r = byId(s.requests || [], id); if (!r) return null; const c = byId(s.clients || [], r.client);
  return ui.drawer({ title: `Clinical trajectory · ${c ? c.initials : id}`, body: trajectoryHtml(s, r, trajectoryOf(s, r)), className: 'ai-dw', returnFocus: opener || null });
}

// ------------------------------------------------------------------------------------------------ Historical outcomes (A-15)
export function historicalHtml(s, r, hv) {
  const ch = chipper(s, r); const short = hv.payer.name;
  const chips = `<ul class="ai-match" data-hi="matching" aria-label="Comparable case matching">${hv.matching.map(m => `<li><span>${esc(m.label)}</span><b>${esc(m.value)}</b></li>`).join('')}</ul>`;
  const driver = hv.driver ? `<section class="ai-card ai-card--red" data-hi="driver"><h3>Primary historical decision driver</h3><p class="ai-card__t">${esc(hv.driver.reason)}</p><div class="ai-obs"><h4>Observed pattern in ${esc(short)} decisions</h4><ul>${hv.driver.observed.map(o => `<li>${esc(o.text)}${o.sample ? ` ${sample()}` : ''}</li>`).join('')}</ul></div></section>`
    : `<section class="ai-card ai-card--red" data-hi="driver"><h3>Primary historical decision driver</h3><p class="ai-empty">The sample holds no denial reason for ${esc(short)}.</p></section>`;
  const sup = `<section class="ai-card ai-card--green" data-hi="supporting"><h3>Supporting signals in approved cases</h3><ul class="ai-ticks">${hv.supporting.map(x => `<li data-ok="${x.ok ? 1 : 0}">${x.ok ? ui.icon('check', 16) : ui.icon('alert', 16)}<span>${esc(x.label)}<span class="ui-sr">${x.ok ? ': yes' : ': not on file yet'}</span>${x.ok ? '' : '<small>Not on file yet</small>'}</span></li>`).join('')}</ul></section>`;
  const outs = `<div class="ai-outs" data-hi="outcomes">${hv.outcomes.map(o => `<article class="ai-out ai-out--${esc(o.kind)}">${ui.statusPill(o.kind === 'approved' ? 'approved' : 'denied', o.kind === 'approved' ? 'Approved' : 'Denied')}<h4>${esc(o.label)}</h4><ul>${o.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="ai-out__l">Modeled approval likelihood <b>${o.likelihood}%</b> ${sample()}</p></article>`).join('')}</div>`;
  const it = hv.interpretation;
  return `<div class="ai-hist">${ui.decisionSupport()}${ui.basisLine(hv.basis)}<p class="ai-lede">Payer: <b>${esc(hv.payer.name)}</b>${hv.level ? ` · ${esc(asam.levelTag(hv.level))}` : ''}</p><div class="ai-matchw"><span class="ai-matchw__l">Comparable case matching</span>${chips}</div><div class="ai-two">${driver}${sup}</div><section class="ai-sec"><h3>Comparable historical outcomes (${esc(short)} cohort)</h3>${outs}</section><section class="ai-sec"><h3>Historical outcome interpretation</h3><p>${esc(it.text)}</p><p class="ai-align" data-tone="${esc(it.tone)}" data-hi="interpretation">${ui.icon(it.tone === 'success' ? 'check' : 'alert', 16)}<span><b>Current historical alignment:</b> ${esc(it.label)}</span></p></section></div>`;
}
export function openHistorical(screen, id, opener) {
  const s = screen.s; const r = byId(s.requests || [], id); if (!r) return null; const c = byId(s.clients || [], r.client);
  return ui.drawer({ title: `Historical outcomes · ${c ? c.initials : id}`, body: historicalHtml(s, r, historicalView(s, r)), className: 'ai-dw', returnFocus: opener || null });
}

// ------------------------------------------------------------------------------------------------ the payer line and the insights (A-04, A-05)
export function openPulseWhy(screen, opener) {
  const s = screen.s; const p = payerPulse(s); if (!p) return null; const pat = payerPattern(s, p.payer);
  const rows = [
    ['This week', `${p.text}. ${p.detail}.`], ['Partial approvals, payer record', pat.partialRate != null ? `${pat.partialRate}% of requests` : 'Not recorded'],
    ['Approval rate in the sample', pat.approvalPct != null ? `${pat.approvalPct}% ${sample()}` : 'Not in the sample'], ['What it tends to do', pat.tends || 'Nothing is recorded yet.'], ['What has worked', pat.works || 'Nothing is recorded yet.']
  ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${k === 'Approval rate in the sample' ? v : esc(v)}</dd></div>`).join('');
  return ui.drawer({ title: `Payer insights · ${pat.name}`, body: `<div class="ai-pp"><dl class="ui-sdl">${rows}</dl>${ui.insightsHTML(s, 'auth')}</div>`, className: 'ai-dw', returnFocus: opener || null });
}
export function openInsights(screen, opener, { log = false } = {}) {
  if (log) screen.do('intel.event', { kind: 'insights', scope: 'auth' }).catch(() => null);
  return ui.insightsDrawer({ s: () => screen.s, scope: 'auth', returnFocus: opener || null });
}

// ------------------------------------------------------------------------------------------------ CSS (the screens' css getters join it)
export const AIN_CSS = `
.ui-dialog--drawer.ai-dw{width:min(680px,100vw)}
.ai-none{color:var(--muted-700);font-size:var(--fs-13)}
.ai-strip{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px 28px;padding:12px var(--sp-4);border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--surface-0)}
.ai-strip__i{display:flex;flex-direction:column;gap:3px;min-width:0}
.ai-strip__l{font:600 var(--fs-12)/1.2 var(--font);letter-spacing:.05em;text-transform:uppercase;color:var(--muted-700)}
.ai-strip__v{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;font:var(--fs-14)/1.3 var(--font)}
.ai-strip__v b{font-size:var(--fs-18)}.ai-strip__v small{color:var(--muted-700);font-size:var(--fs-12)}
.ai-strip__cap,.ai-strip__n{flex:1 1 100%;margin:0;font-size:var(--fs-13);line-height:1.4;color:var(--muted-700)}
.ai-strip__cap{color:var(--ink-900);font-weight:600}
.ai-strip__n{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:var(--fs-12)}
.ai-intel{display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-3)}
.ai-intel .ui-btn{min-height:40px}
.ai-tj,.ai-hist,.ai-pp{display:flex;flex-direction:column;gap:var(--sp-3)}
.ai-sec h3{margin:0 0 8px;font:600 var(--fs-16)/1.3 var(--font)}
.ai-sec h4{margin:var(--sp-4) 0 6px;font:600 var(--fs-13)/1.3 var(--font);color:var(--muted-700)}
.ai-sum .ai-note{display:block;color:var(--muted-700);font-size:var(--fs-12);margin-top:2px}
.ai-ev{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.ai-empty,.ai-sub{margin:0;color:var(--muted-700);font-size:var(--fs-13);line-height:1.4}
.ai-co{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ai-co li{display:flex;flex-direction:column;gap:2px;min-width:104px;padding:8px 12px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--paper-50)}
.ai-co span{font:600 var(--fs-12)/1.2 var(--font);color:var(--muted-700)}.ai-co b{font-size:var(--fs-18);line-height:1.1}.ai-co small{font-size:var(--fs-12);color:var(--muted-700)}
.ai-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.ai-list>li{padding:10px 0;border-top:1px solid var(--line-200)}.ai-list>li:first-child{border-top:0}
.ai-list__h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.ai-list p{margin:4px 0 0;font-size:var(--fs-13);line-height:1.45;overflow-wrap:anywhere}
.ai-list--plain>li{padding:6px 0}
.ai-gap{display:flex;gap:6px;align-items:flex-start;color:var(--warning-fg)}.ai-gap svg{flex:0 0 auto;margin-top:2px}
.ai-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.ai-big b{font-size:var(--fs-28);line-height:1}.ai-big span{font-size:var(--fs-13);color:var(--muted-700)}
.ai-risk{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ai-risk li{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;border:1px solid #EBD08B;border-radius:var(--r-2);background:var(--warning-bg);color:var(--warning-fg);font-size:var(--fs-13);line-height:1.4}
.ai-risk li[data-tone=danger]{border-color:#E8B7AB;background:var(--danger-bg);color:var(--danger-fg)}
.ai-risk svg{flex:0 0 auto;margin-top:2px}
.ai-lede{margin:0;font-size:var(--fs-14)}
.ai-matchw{display:flex;flex-direction:column;gap:6px}.ai-matchw__l{font:600 var(--fs-12)/1.2 var(--font);letter-spacing:.05em;text-transform:uppercase;color:var(--muted-700)}
.ai-match{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.ai-match li{display:inline-flex;flex-direction:column;gap:1px;padding:6px 10px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--paper-50);font-size:var(--fs-13);min-width:0}
.ai-match span{font-size:var(--fs-12);color:var(--muted-700)}.ai-match b{font-weight:600;overflow-wrap:anywhere}
.ai-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:var(--sp-3)}
.ai-card{padding:12px 14px;border:1px solid var(--line-200);border-left-width:4px;border-radius:var(--r-2);background:var(--surface-0);min-width:0}
.ai-card h3{margin:0 0 6px;font:600 var(--fs-14)/1.3 var(--font)}
.ai-card--red{border-color:#E8B7AB}.ai-card--green{border-color:#B7D5CA}
.ai-card__t{margin:0 0 8px;font-weight:600;overflow-wrap:anywhere}
.ai-obs{padding:8px 10px;border-radius:var(--r-2);background:var(--danger-bg);font-size:var(--fs-13)}.ai-obs h4{margin:0 0 4px;font:600 var(--fs-12)/1.3 var(--font);letter-spacing:.04em;text-transform:uppercase;color:var(--danger-fg)}
.ai-obs ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.ai-ticks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:var(--fs-13)}
.ai-ticks li{display:flex;gap:8px;align-items:flex-start}.ai-ticks svg{flex:0 0 auto;margin-top:2px;color:var(--success-fg)}
.ai-ticks li[data-ok="0"] svg{color:var(--warning-fg)}.ai-ticks small{display:block;color:var(--warning-fg)}
.ai-outs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-3)}
.ai-out{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid var(--line-200);border-radius:var(--r-2);min-width:0}
.ai-out--approved{background:var(--success-bg);border-color:#B7D5CA}.ai-out--denied{background:var(--danger-bg);border-color:#E8B7AB}
.ai-out h4{margin:0;font:600 var(--fs-14)/1.3 var(--font)}.ai-out ul{margin:0;padding-left:18px;font-size:var(--fs-13);display:flex;flex-direction:column;gap:3px}
.ai-out__l{margin:0;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:var(--fs-13)}
.ai-align{display:flex;gap:8px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:var(--r-2);border:1px solid #EBD08B;background:var(--warning-bg);color:var(--warning-fg);font-size:var(--fs-14)}
.ai-align[data-tone=success]{border-color:#B7D5CA;background:var(--success-bg);color:var(--success-fg)}.ai-align[data-tone=danger]{border-color:#E8B7AB;background:var(--danger-bg);color:var(--danger-fg)}
.ai-align svg{flex:0 0 auto;margin-top:2px}
@media (max-width:767px){.a-page .in-pulse .ui-btn,.a-page .ui-phead__t .ui-btn{min-height:44px;min-width:44px}}
@media (max-width:560px){.ai-strip{gap:10px 18px}.ai-intel .ui-btn{min-height:44px;flex:1 1 calc(50% - 8px)}.ai-co li{min-width:calc(50% - 8px)}}
`;
