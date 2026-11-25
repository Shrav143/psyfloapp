// Denial Intelligence, Oprox parity (R7): the pieces the queue and the case page share.
//   INTEL_CSS                        the styles of every part below (tokens only; the controllers add it to their css)
//   fieldsStrip(fields, {clinical})  D-06 Decision details: payer, service, requested, offered or approved, revenue at risk, decision, rationale (clinician only)
//   patternHTML(p, {clinical})       D-07 the payer pattern: what the payer tends to do and what has worked (stored), then the labelled sample (analogous cases,
//                                    reversed on first-level appeal, peer-to-peer overturn, strategies as bars)
//   analysisHTML({ s, me, d, r })    D-05 the appeal analysis document (Denial rationale, Core clinical synthesis, Why this denial is contestable, the six ASAM
//                                    dimensions, the payer pattern, What Psyflo would do). Built from sel/denial-intel.js appealAnalysis: every sentence is a stored record.
//   openAnalysis({ ref, me, el })    the document in a side drawer; "Review" on a numbered action opens that card in the suggestions drawer
//   openPulse({ s, me, el })         D-02 "See why" on the payer line: the pulse, the payer pattern for that payer and the denial insights
// Clinical views are for the treating clinician: an administrator gets the strip without the rationale, and never the analysis, the pattern's advice or any suggestion.
import { ui, api, M } from '../app.js';
import * as D from '../shared/sel/disputes.js';
import * as I from '../shared/sel/denial-intel.js';
import { payerPulse, INTEL_BASIS } from '../shared/intel.js';
import { idxFor, openDenialRecs } from './DenialRecs.js';

const e = t => ui.esc(t);

export const INTEL_CSS = `
.d-hact{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto}
.d-hact .ui-btn{align-self:center}
.d-wide.ui-dialog--drawer{width:min(640px,100vw)}
.d-dd{display:flex;flex-direction:column;gap:var(--sp-2)}
.d-dd__g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px;margin:0}
.d-dd__g>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.d-dd__g dt{font-size:var(--fs-12);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-700)}
.d-dd__g dd{margin:0;overflow-wrap:anywhere;font-size:var(--fs-14);line-height:1.4}
.d-dd__g>[data-field=decision]{grid-column:span 2}
@media (max-width:480px){.d-dd__g>[data-field=decision]{grid-column:auto}}
.d-dd__r{margin:0;font-size:var(--fs-13);line-height:1.5}
.d-dd__r b{font-size:var(--fs-12);letter-spacing:.06em;text-transform:uppercase;color:var(--muted-700);margin-right:6px}
.d-an{display:flex;flex-direction:column;gap:var(--sp-4)}
.d-an>section{display:flex;flex-direction:column;gap:8px;min-width:0}
.d-an h3{margin:0;font-size:var(--fs-16);line-height:var(--lh-16);font-weight:600}
.d-an p{margin:0;line-height:1.5}
.d-an__top{display:flex;flex-direction:column;gap:8px}
.d-an__sub{color:var(--muted-700);font-size:var(--fs-13)}
.d-an__q{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.d-an__q li{border-left:3px solid var(--line-200);padding:2px 10px;font-size:var(--fs-14);line-height:1.45}
.d-an__q small{display:block;color:var(--muted-700);font-size:var(--fs-12)}
.d-ev{display:flex;flex-wrap:wrap;gap:4px 6px}
.d-ev .ui-evidence{max-width:100%}
.d-fd{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.d-fd>li{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--surface-0);min-width:0}
.d-fd>li[data-sev=critical]{border-left:4px solid #B3402A}
.d-fd>li[data-sev=strong]{border-left:4px solid #B77A12}
.d-fd__h{display:flex;align-items:flex-start;gap:8px}
.d-fd__h b{font-weight:600;line-height:1.35;overflow-wrap:anywhere}
.d-fd__fix{font-size:var(--fs-13);color:var(--muted-700)}
.d-dm{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.d-dm>li{display:flex;flex-direction:column;gap:4px;padding:8px 0 8px 12px;border-left:4px solid var(--line-200)}
.d-dm>li[data-r="2"]{border-left-color:#B77A12}.d-dm>li[data-r="3"],.d-dm>li[data-r="4"]{border-left-color:#B3402A}.d-dm>li[data-r="0"],.d-dm>li[data-r="1"]{border-left-color:var(--teal-600)}
.d-dm__h{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:var(--fs-14)}
.d-dm__h b{font-weight:600}
.d-dm__t{font-size:var(--fs-14);line-height:1.5}
.d-act{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:dact}
.d-act>li{counter-increment:dact;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 12px;border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--surface-0)}
.d-act>li::before{content:counter(dact);flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--sand-100);font:600 var(--fs-13)/1 var(--font)}
.d-act>li[data-state=included]::before{background:var(--teal-600);color:var(--surface-0)}
.d-act__t{flex:1 1 220px;min-width:0;font-size:var(--fs-14);line-height:1.4;overflow-wrap:anywhere}
.d-pt{display:flex;flex-direction:column;gap:10px}
.d-pt__s{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.d-pt__s .in-kpi{padding:10px 12px}
.d-pt dl{margin:0;display:flex;flex-direction:column;gap:6px;font-size:var(--fs-14)}
.d-pt dt{font-size:var(--fs-12);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-700)}
.d-pt dd{margin:0;line-height:1.45}
.d-pt .in-bars{margin:0}
.d-pv{display:flex;flex-direction:column;gap:var(--sp-3)}
.d-pv h3{margin:0;font-size:var(--fs-16)}
.d-an__quiet{margin:0}
@media (max-width:760px){.d-hact .ui-btn,.d-an .ui-btn,.d-act .ui-btn,.d-dd .ui-btn,.in-pulse .ui-btn{min-height:44px}.in-pulse [data-pulse-x]{min-width:44px}.d-an .ui-evidence{min-height:44px}.d-dm__h{font-size:var(--fs-13)}}
`;

// ------------------------------------------------------------------------------------------------ small builders
const evChips = (items, limit = 3) => {
  const list = (items || []).map(x => ui.evidenceChip(x)); if (!list.length) return '';
  return `<div class="d-ev">${list.slice(0, limit).join('')}${list.length > limit ? `<details class="d-more"><summary>+${list.length - limit} more sources</summary><div class="d-ev">${list.slice(limit).join('')}</div></details>` : ''}</div>`;
};
const nth = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const lockNote = text => `<p class="ui-lockline d-an__quiet">${ui.hint('lock', text, { tone: 'n', cls: 'ui-lockhint' })}<span class="ui-muted">Clinical views are for the treating clinician</span></p>`;

// D-06
export function fieldsStrip(f, { clinical = true, ui: U = ui } = {}) {
  const show = f.rows.filter(x => ['from', 'service', 'requested', 'approved', 'risk', 'decision'].includes(x.key));
  const cell = x => x.key === 'risk' ? (f.risk ? U.moneyChip(f.risk) : '<span class="ui-muted">None</span>') : e(x.value);
  const label = x => x.key === 'from' ? 'Payer' : x.label;
  const grid = `<dl class="d-dd__g">${show.map(x => `<div data-field="${e(x.key)}"><dt>${e(label(x))}</dt><dd>${cell(x)}</dd></div>`).join('')}</dl>`;
  const why = clinical && f.rationale ? `<p class="d-dd__r" data-field="rationale"><b>Rationale</b>${e(f.rationale.text)}</p>` : '';
  return grid + why;
}

// D-07
export function patternHTML(p, { clinical = true } = {}) {
  const stored = clinical && (p.tends || p.works) ? `<dl>${p.tends ? `<div><dt>What ${e(p.first)} tends to ask</dt><dd>${e(p.tends)}</dd></div>` : ''}${p.works ? `<div><dt>What has worked</dt><dd>${e(p.works)}</dd></div>` : ''}${p.partialRate != null ? `<div><dt>Partial approvals</dt><dd>About ${p.partialRate}% of ${e(p.first)} decisions on file are partial approvals.</dd></div>` : ''}</dl>` : '';
  const sample = `<p class="in-basis">${ui.sampleChip()} <span>${e(p.basis)}</span></p>
    <div class="d-pt__s">${ui.kpiTile({ label: 'Analogous cases', value: p.analogous })}${ui.kpiTile({ label: 'Reversed on first-level appeal', value: p.reversedPct + '%' })}${ui.kpiTile({ label: 'Peer-to-peer overturned', value: p.p2pOverturnPct + '%' })}</div>
    ${p.note ? `<p class="d-an__sub">${e(p.note)}</p>` : ''}
    <h4 class="d-an__sub">Strategies, ranked by success</h4><ul class="in-bars">${p.strategies.map(x => ui.barRow({ label: x.label, pct: x.success })).join('')}</ul>`;
  return `<div class="d-pt" data-pattern>${stored}${sample}</div>`;
}

// D-05
export function analysisHTML({ s, me, d, r }) {
  const clinical = D.canReadClinical(me);
  const f = I.denialFields(s, d, r, { clinical });
  if (!clinical) return `<div class="d-an"><section><h3>Decision details</h3>${fieldsStrip(f, { clinical: false })}</section>${lockNote('Clinical views are for the treating clinician: the analysis quotes clinical records.')}</div>`;
  const a = I.appealAnalysis(s, d, r, { idx: idxFor(s, r.id) });
  const quotes = a.rationale.quotes.length ? `<ul class="d-an__q">${a.rationale.quotes.map(x => `<li>${d.issue === 'info' ? e(x.text) : '“' + e(x.text) + '”'}${x.source ? `<small>${e(x.source)}</small>` : ''}</li>`).join('')}</ul>` : '';
  const synth = a.synthesis.sentences.map(x => x.text).join(' ');
  const synthEv = [...new Map(a.synthesis.sentences.flatMap(x => x.evidence).map(x => [x.id, x])).values()];
  const crit = a.findings.filter(x => x.sev === 'critical').length;
  const finds = a.findings.length ? `<ol class="d-fd">${a.findings.map(x => `<li data-finding="${e(x.key)}" data-sev="${x.sev}"><div class="d-fd__h">${ui.sevTag(x.sev)}<b>${e(x.title)}</b></div><p>${e(x.text)}</p>${evChips(x.evidence)}${x.fix ? `<p class="d-fd__fix">Next: ${e(x.fix)}</p>` : ''}</li>`).join('')}</ol>` : '<p class="ui-muted">No finding to report from the stored records.</p>';
  const cave = a.caveats.length ? `<details class="d-det"><summary>${nth(a.caveats.length, 'note', 'notes')} before you rely on this</summary><ul class="d-an__q">${a.caveats.map(x => `<li>${e(x.title)}${x.fix ? `<small>${e(x.fix)}</small>` : ''}</li>`).join('')}</ul></details>` : '';
  const dims = `<ul class="d-dm">${a.dimensions.rows.map(x => `<li data-dim="${x.n}" data-r="${x.rating == null ? '' : x.rating}"><div class="d-dm__h">${ui.chip(x.short, { tone: 'outline', size: 'sm', title: x.name })}<b>${e(x.label)}</b><span>${x.rating == null ? 'Not rated' : `Rated ${x.rating} · ${e(x.ratingLabel)}`}</span>${x.driver ? ui.chip('Drives the level', { tone: 'info', size: 'sm' }) : ''}${x.needsRecord ? ui.chip('No dated record', { tone: 'warning', size: 'sm', icon: 'alert' }) : ''}</div><p class="d-dm__t">${e(x.text)}</p>${evChips(x.evidence, 2)}</li>`).join('')}</ul>`;
  const acts = a.actions.length ? `<ol class="d-act">${a.actions.map(x => { const need = !!x.needsInput && !String(x.rec.context || '').trim(); return `<li data-state="${e(x.state)}" data-action="${e(x.key)}"><span class="d-act__t">${e(x.title)}</span>${ui.chip(x.impact === 'high' ? 'High impact' : x.impact === 'medium' ? 'Medium impact' : 'Lower impact', { tone: x.impact === 'high' ? 'danger' : x.impact === 'medium' ? 'warning' : 'neutral', size: 'sm' })}${x.state === 'included' ? ui.chip('Included', { tone: 'success', size: 'sm', icon: 'check' }) : ''}${need ? ui.chip('Needs your words', { tone: 'warning', size: 'sm', icon: 'pencil' }) : ''}<button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" id="d-an-rec-${e(String(x.key).replace(/[^a-z0-9_-]/gi, '-'))}" data-an-rec="${e(x.key)}" aria-label="${need ? 'Add your words' : 'Review'}: ${e(x.title)}">${need ? 'Add words' : 'Review'}</button></li>`; }).join('')}</ol><div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--primary" id="d-an-recs" data-an-recs>Open all suggestions</button></div>` : '<p class="ui-muted">Nothing to suggest right now. The record answers what a reviewer usually asks.</p>';
  return `<div class="d-an" data-analysis>
    <div class="d-an__top">${ui.decisionSupport()}<p class="in-basis">${ui.maturity('intel.analysis')}<span>Rule-based, from the stored records of this case. No language model is called and no likelihood is given.</span></p></div>
    <section aria-labelledby="d-an-h0"><h3 id="d-an-h0">Decision details</h3>${fieldsStrip(f, { clinical: false })}</section>
    <section aria-labelledby="d-an-h1"><h3 id="d-an-h1">Denial rationale</h3><p>${e(a.rationale.text)}</p>${quotes}</section>
    <section aria-labelledby="d-an-h2"><h3 id="d-an-h2">Core clinical synthesis</h3><p>${e(synth)}</p>${synthEv.length ? `<details class="d-det"><summary>Sources (${synthEv.length})</summary>${evChips(synthEv, 99)}</details>` : ''}</section>
    <section aria-labelledby="d-an-h3"><h3 id="d-an-h3">Why this denial is contestable</h3><p class="d-an__sub">${nth(a.findings.length, 'finding', 'findings')}${crit ? ` · ${crit} critical` : ''}. Each one is read from the stored records; nothing is scored.</p>${finds}${cave}</section>
    <section aria-labelledby="d-an-h4"><h3 id="d-an-h4">${e(a.dimensions.heading)}</h3><p class="d-an__sub">${e(a.dimensions.summary)}</p>${dims}</section>
    <section aria-labelledby="d-an-h5"><h3 id="d-an-h5">Payer pattern · ${e(a.pattern.first)}</h3>${patternHTML(a.pattern)}</section>
    <section aria-labelledby="d-an-h6"><h3 id="d-an-h6">What Psyflo would do</h3><p class="d-an__sub">Numbered as in the suggestions list. Include what you want there; nothing is sent.</p>${acts}</section>
  </div>`;
}

// the document in a side drawer; a numbered action's Review opens that card in the suggestions drawer on top of it
export function openAnalysis({ ref, me, el, onClose }) {
  const s0 = api.state; const r0 = M.byId(s0.requests, ref); const d0 = r0 && D.byRequest(s0, ref); if (!d0) return null;
  const build = () => { const s = api.state; const r = M.byId(s.requests, ref); const d = D.byRequest(s, ref); return analysisHTML({ s, me, d, r }); };
  return ui.drawer({ title: 'Analyze Denial', body: build(), className: 'd-wide', returnFocus: el, onClose, actions: [{ label: 'Close', tone: 'secondary' }],
    onMount: (dlg, handle) => {
      dlg.addEventListener('click', ev => {
        const one = ev.target.closest('[data-an-rec]'); const all = ev.target.closest('[data-an-recs]');
        if (!one && !all) return;
        openDenialRecs({ ref, me, el: one || all, key: one ? one.dataset.anRec : null, onChange: () => { handle.update({ body: build() }); } });
      });
    } });
}

// D-02: See why on the payer line. The pulse and the insights are non-clinical (every role); the payer's pattern is advice for the treating clinician.
export function openPulse({ s, me, el }) {
  const p = payerPulse(s); if (!p) return null;
  const clinical = D.canReadClinical(me);
  const head = `<p><b>${e(p.text)}</b></p><p>${e(p.detail)}. Suggestion lift ${p.lift_from}% to ${p.lift_to}%. About ${e(p.exposure)} at risk.</p><p class="in-basis">${ui.sampleChip()} <span>${e(p.basis || INTEL_BASIS)}</span></p>`;
  const pat = clinical ? `<section><h3>What ${e(D.payerFirst(s, p.payer))} tends to do</h3>${patternHTML(I.patternView(s, p.payer))}</section>` : lockNote('Clinical views are for the treating clinician: the payer pattern and its strategies.');
  return ui.drawer({ title: 'Payer intelligence update', className: 'd-wide', returnFocus: el, actions: [{ label: 'Close', tone: 'secondary' }],
    body: `<div class="d-pv" data-pulse-drawer>${head}${pat}<section><h3>Denial insights</h3>${ui.insightsHTML(s, 'denial')}</section></div>` });
}
