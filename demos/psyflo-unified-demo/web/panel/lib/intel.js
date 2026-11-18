// Oprox parity in the extension panel (R7): the compact versions of what Authorizations and Denial Intelligence show, for the clinic that drafts in the EHR.
//   X-01  authorization path: authStrip (due, dollars at risk, expected approval, model confidence, comparable cases, the historical line, the Simulated chip and basis,
//         the decision-support line) and authDetail (the Payer criteria and Clinical trajectory accordions)
//   X-02  denial packet: denialParts (the parsed fields strip, then Why this denial is contestable, the six ASAM dimensions and the payer pattern as accordions)
//   X-03  home: signalChips (the due-in chip and the dollars-at-risk chip of an open case)
//
// The panel reads the same pure selectors as the platform (shared/sel/auth-intel.js, shared/sel/denial-intel.js, shared/intel.js), so it says the same thing in the
// same words. Psyflo writes no clinical text: every sentence here comes from a stored record through those selectors, or is the clinician's own. A figure from the
// illustrative sample (expected approval, model confidence, comparable cases, modeled likelihoods, payer rates, analogous cases, strategy success) always sits beside
// the Simulated chip and the basis sentence. Only the treating clinician reaches the clinical blocks (the views are gated on drafts.clinical and payer.reply; the
// strip also checks isClinician). Nothing here types, sends or presses anything.
import { esc } from '../../js/runtime.js';
import { fmtDate } from '../../js/shared/dates.js';
import { now as clockNow } from '../../js/shared/clock.js';
import { isClinician, headerOf, trajectoryOf, criteriaView, historicalView } from '../../js/shared/sel/auth-intel.js';
import { appealAnalysis } from '../../js/shared/sel/denial-intel.js';
import { evidenceById, chipOpts } from '../../js/shared/sel/disputes.js';
import { accordion } from '../parts.js';

export const QUIET = 'Clinical views are for the treating clinician';
const nth = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// an overdue date is red whatever the rule says (the platform does the same: screens/AuthIntel.js dueFor)
const dueFor = u => (u && u.hours != null && u.hours < 0 && u.sev !== 'overdue' ? { ...u, sev: 'overdue' } : u);

// the selectors are cheap (a few ms) but a repaint happens on every change: keep each result for one state revision and one minute of the demo clock
// (the clock runs between revisions, and a due-in label is only good for the minute)
const memo = new Map();
function once(kind, id, s, fn) {
  const key = `${kind}|${id}`; const rev = `${s.rev}|${clockNow(s)}`; const m = memo.get(key);
  if (m && m.rev === rev) return m.val;
  const val = fn(); memo.set(key, { rev, val }); if (memo.size > 40) memo.delete(memo.keys().next().value);
  return val;
}
function safe(label, fn) { try { return fn(); } catch (e) { console.error(label, e); return null; } }

// ------------------------------------------------------------------------------------------------ small parts
// the due-in chip and the dollars-at-risk chip (every role may see them: no client data); empty when there is nothing to say
export function signalChips(ctx, u, k) { return `${u && u.label ? ctx.ui.dueChip(dueFor(u)) : ''}${k ? ctx.ui.moneyChip(k) : ''}`; }
// evidence chips from an evidence index (ids) or from ready items (denial analysis rows); "+n more" opens the rest
function chipsFromIds(ctx, X, ids, limit = 3) {
  return chipsFromItems(ctx, (ids || []).map(id => evidenceById(X, id)).filter(Boolean).map(chipOpts), limit);
}
function chipsFromItems(ctx, items, limit = 3) {
  const list = (items || []).map(x => ctx.ui.evidenceChip(x)); if (!list.length) return '';
  return `<div class="prc-ev">${list.slice(0, limit).join('')}${list.length > limit ? `<details class="pxm"><summary>+${list.length - limit} more ${list.length - limit === 1 ? 'source' : 'sources'}</summary><div class="prc-ev">${list.slice(limit).join('')}</div></details>` : ''}</div>`;
}
const seeBtn = (key, label) => `<button type="button" class="btn o sm" data-act="recSee" data-k="${esc(key)}" aria-label="See suggestion: ${esc(label)}">See suggestion</button>`;
const plainSec = (title, html) => `<section class="pxsec"><h3 class="pxh">${esc(title)}</h3>${html}</section>`;

// ------------------------------------------------------------------------------------------------ X-01 the case strip
// Above the suggestions: what is at stake and what the sample says. One basis sentence covers every sample figure in the card.
export function authStrip(ctx, req) {
  const s = ctx.S(); const me = ctx.api.session(); if (!req) return '';
  if (!isClinician(me)) return `<p class="hint" data-px="quiet">${esc(QUIET)}</p>`;
  const h = once('hdr', req.id + '|' + me.id, s, () => headerOf(s, req, me)); const hv = once('hist', req.id + '|' + me.id, s, () => historicalView(s, req)); const U = ctx.ui;
  const it = hv.interpretation; const sigs = signalChips(ctx, h.urgency, h.risk);
  const item = (k, label, v, small = '') => `<div class="pxs-i" data-k="${k}"><span class="pxs-l">${esc(label)}</span><span class="pxs-v">${v}</span>${small ? `<small>${esc(small)}</small>` : ''}</div>`;
  const likelihoods = hv.outcomes.map(o => `<li data-kind="${esc(o.kind)}"><span class="ui-sr">${esc(o.label)}, modeled approval likelihood </span>${U.statusPill(o.kind === 'approved' ? 'approved' : 'denied', o.kind === 'approved' ? 'Approved' : 'Denied')}<b>${o.likelihood}%</b></li>`).join('');
  return `<section class="pxs" aria-label="Case signals" data-px="strip">
    ${U.decisionSupport()}
    ${sigs ? `<div class="pxs-sig" data-px="signals">${sigs}</div>` : ''}
    ${h.rankedFirst ? '<p class="hint" data-ranked>Psyflo ranked this case first because of the dollars at risk and the clock.</p>' : ''}
    <div class="pxs-g" data-px="sample">${item('expected', 'Expected approval', `<b>${h.expected.base}%</b><span aria-hidden="true">→</span><span class="ui-sr"> to </span><b>${h.expected.expected}%</b>`)}${item('confidence', 'Model confidence', `<b>${h.confidence.value.toFixed(2)}</b>`, h.confidence.text)}${item('comparable', 'Comparable cases', `<b>${h.comparable.count}</b>`, h.comparable.payer)}</div>
    <div class="pxs-h" data-px="historical"><span class="pxs-l">Historical outcomes</span>
      <p class="pxs-al" data-tone="${esc(it.tone)}">${U.icon(it.tone === 'success' ? 'check' : 'alert', 16)}<span><b>Current historical alignment:</b> ${esc(it.label)}</span></p>
      <span class="pxs-l">Modeled approval likelihood</span><ul class="pxs-lk" aria-label="Modeled approval likelihood">${likelihoods}</ul></div>
    ${U.basisLine(h.expected.basis)}
  </section>`;
}

// ------------------------------------------------------------------------------------------------ X-01 the accordions
function critBody(ctx, cv) {
  const U = ctx.ui; const m = cv.maximize; const w = m.why;
  const row = x => `<li class="pxc" data-crit="${esc(x.key)}" data-state="${esc(x.state)}"><div class="row w"><b class="pxc-t">${esc(x.label)}</b>${x.state === 'documented' ? U.statusPill('documented', 'Documented') : U.statusPill('needs', 'Needs strengthening')}${x.included ? U.chip('Suggestion included', { tone: 'info', icon: 'check', size: 'sm' }) : ''}</div><p class="pxc-x">${esc(x.text)}</p>${x.rec ? seeBtn(x.rec, x.label) : ''}</li>`;
  const stateChip = x => x.state === 'included' ? U.chip('Included', { tone: 'success', icon: 'check', size: 'sm' }) : x.needsInput ? U.chip('Needs your words', { tone: 'warning', icon: 'pencil', size: 'sm' }) : U.chip('Open', { tone: 'neutral', size: 'sm' });
  const why = `<p class="pxc-x">${esc(w.tends ? `${w.payer} tends to ask: ${String(w.tends).replace(/\.$/, '')}.` : `No payer note is on file for ${w.payer}.`)}</p>${w.reasons.length ? `<ul class="pxc-rs">${w.reasons.map(x => `<li>${esc(x.reason)} <span class="hint">${x.count} denials in the sample, ${x.pct}% of the sample</span></li>`).join('')}</ul>${U.basisLine(w.basis)}` : ''}`;
  const incl = m.include.length ? `<ul class="pxc-inc">${m.include.map(x => `<li data-inc="${esc(x.key)}"><span class="pxc-it">${esc(x.title)}</span>${stateChip(x)}${seeBtn(x.key, x.title)}</li>`).join('')}</ul>` : '<p class="hint">Nothing to add: the record answers what a reviewer usually asks.</p>';
  const srcs = cv.sources && cv.sources.length ? `<p class="pxc-src" data-crit-sources>${cv.sources.map(x => U.chip(x, { tone: 'neutral', size: 'sm' })).join('')}</p>` : '';
  const tiles = cv.tiles && cv.tiles.length ? `<div class="pxc-tiles" data-crit-tiles>${cv.tiles.map(t => `<div class="pxc-tile" data-tile="${esc(t.key)}"><span class="pxc-tl">${esc(t.label)}</span><b>${esc(String(t.value))}</b><small>${esc(t.caption || '')}</small>${t.sample ? U.sampleChip() : ''}</div>`).join('')}</div>` : '';
  return `${srcs}<p class="pxc-st" data-crit-status data-tone="${esc(cv.status.tone)}">${U.icon(cv.status.tone === 'success' ? 'check' : 'alert', 16)}<span>${esc(cv.status.text)}</span></p>
    ${tiles}
    <p class="pxc-sum" data-crit-sum><b>${cv.documented} of ${cv.total}</b> documented</p>
    <ol class="pxc-l">${cv.rows.map(row).join('')}</ol>
    <section class="pxsec" data-crit-max><h3 class="pxh">To maximize approval probability</h3><h4 class="pxh2">Why this matters for ${esc(w.payer)}</h4>${why}<h4 class="pxh2">What to include in your submission</h4>${incl}</section>
    <p class="hint">Read from the stored record: the six ASAM dimensions, the level of care on the request and the reassessment rule. Confirm on the payer's own notice.</p>`;
}
function chartOrNote(ctx, t, has, empty, one) {
  if (!has) return `<p class="hint">${esc(empty)}</p>`;
  if (!t.hasTrend) return `<p class="hint">${esc(one)}</p>`;
  return ctx.ui.trendChart({ labels: t.labels, series: t.series, min: t.min, max: t.max, title: t.title, width: 340, height: 170 });
}
const callouts = items => `<ul class="pxt-co">${items.map(c => `<li><span>${esc(c.l)}</span><b>${esc(String(c.v))}</b>${c.s ? `<small>${esc(c.s)}</small>` : ''}</li>`).join('')}</ul>`;
function trajBody(ctx, X, tv) {
  const U = ctx.ui; const t = tv.trend; const sc = tv.screens; const e = tv.engagement;
  const sum = `<dl class="pxt-sum" data-tj="summary">${tv.summary.map(x => `<div data-key="${esc(x.key)}"><dt>${esc(x.label)}</dt><dd>${esc(x.value)}${x.note ? `<small>${esc(x.note)}</small>` : ''}${x.ids.length ? chipsFromIds(ctx, X, x.ids, 1) : ''}</dd></div>`).join('')}</dl>`;
  const asamChart = chartOrNote(ctx, t, tv.hasAssessment, 'No ASAM assessment is on file, so there is no trend to draw.', `One assessment is on file (${t.labels[0]}). A trend needs two; the current ratings are below.`);
  const asamNow = tv.hasAssessment && t.callouts.length ? callouts(t.callouts.map(c => ({ l: `Current ${c.name}`, v: c.value, s: c.label }))) : '';
  const scores = !sc.items.length ? '<p class="hint">No PHQ-9, GAD-7, DAST-10 or AUDIT-C score is stored for this client. Add one to the record to see it here.</p>'
    : `${sc.hasTrend ? U.trendChart({ labels: sc.labels, series: sc.series, min: 0, max: Math.ceil(sc.max / 4) * 4, title: sc.title, width: 340, height: 170 }) : ''}${callouts(sc.callouts.map(c => ({ l: `Current ${c.name}`, v: c.current, s: `${fmtDate(c.date)}${c.previous != null ? `, was ${c.previous}` : ''}` })))}`;
  const drivers = tv.drivers.length ? `<ul class="pxt-l" data-tj="drivers">${tv.drivers.map(d => `<li data-dim="${d.n}"><div class="row w"><b>${esc(d.short)} · ${esc(d.label)}</b>${U.chip(`Rated ${d.rating} · ${d.ratingLabel}`, { tone: d.rating >= 3 ? 'warning' : 'neutral', size: 'sm' })}</div><p>${esc(d.text)}</p>${d.gap ? `<p class="pxt-gap">${U.icon('alert', 14)}<span>${esc(d.gap)}</span></p>` : ''}${chipsFromIds(ctx, X, d.ids)}</li>`).join('')}</ul>`
    : `<p class="hint">${tv.hasAssessment ? 'No dimension is rated 2 or more in the latest assessment.' : 'No ASAM assessment is on file.'}</p>`;
  const eng = e.score || e.lines.length || e.dailyNotes ? `<div data-tj="engagement">${e.score ? `<p class="pxt-big"><b>${e.score.pct}%</b><span>Attended ${e.score.attended} of ${e.score.scheduled} scheduled groups, from the stored record</span></p>` : ''}${e.lines.length ? `<ul class="pxt-l pxt-l--plain">${e.lines.map(l => `<li><p>${esc(l.text)}</p>${chipsFromIds(ctx, X, l.ids, 2)}</li>`).join('')}</ul>` : ''}${e.dailyNotes ? `<p class="hint">${e.dailyNotes} daily ${e.dailyNotes === 1 ? 'note' : 'notes'} in the last 30 days.</p>` : ''}</div>`
    : '<p class="hint">No attendance count is on file. Add one to the record to see it here.</p>';
  const risks = tv.risks.length ? `<ul class="pxt-risk" data-tj="risks">${tv.risks.map(x => `<li data-tone="${esc(x.tone)}">${U.icon('alert', 16)}<div><span class="ui-sr">${x.tone === 'danger' ? 'Needs action: ' : 'Watch: '}</span>${esc(x.text)}${chipsFromIds(ctx, X, x.ids, 2)}</div></li>`).join('')}</ul>` : '<p class="hint">No risk signal is open in the stored record.</p>';
  return `${sum}${plainSec('Symptom and functional trend', `${asamChart}${asamNow}<h4 class="pxh2">Screening scores</h4>${scores}`)}${plainSec('Key drivers identified', drivers)}${plainSec('Engagement signals', eng)}${plainSec('Risk signals remaining', risks)}`;
}
// the two accordions that sit under the suggestions (collapsed): Payer criteria and Clinical trajectory
export function authDetail(ctx, req, X) {
  const s = ctx.S(); const me = ctx.api.session(); if (!req || !isClinician(me)) return '';
  const cv = once('crit', req.id + '|' + me.id, s, () => criteriaView(s, req)); const tv = once('traj', req.id + '|' + me.id, s, () => trajectoryOf(s, req));
  const danger = tv.risks.some(x => x.tone === 'danger');
  return accordion('Payer criteria', critBody(ctx, cv), { id: 'px-crit', count: cv.needs ? nth(cv.needs, 'item needs strengthening', 'items need strengthening') : 'All documented', tone: cv.needs ? 'y' : 'g' })
    + accordion('Clinical trajectory', trajBody(ctx, X, tv), { id: 'px-traj', count: tv.risks.length ? nth(tv.risks.length, 'risk signal', 'risk signals') : 'No open risk', tone: danger ? 'r' : tv.risks.length ? 'y' : 'g' });
}

// ------------------------------------------------------------------------------------------------ X-02 the denial analysis
// The parsed decision fields (Oprox: FROM, RE, SERVICE, REQUESTED, APPROVED, REVENUE AT RISK, DECISION, RATIONALE), as the platform's Decision details strip
function fieldsStrip(ctx, f) {
  const show = f.rows.filter(x => ['from', 'service', 'requested', 'approved', 'risk', 'decision'].includes(x.key));
  const cell = x => x.key === 'risk' ? (f.risk ? ctx.ui.moneyChip(f.risk) : '<span class="muted">None</span>') : esc(x.value);
  return `<dl class="pxd" data-px="fields">${show.map(x => `<div data-field="${esc(x.key)}"><dt>${esc(x.key === 'from' ? 'Payer' : x.label)}</dt><dd>${cell(x)}</dd></div>`).join('')}</dl>${f.rationale ? `<p class="pxd-r" data-field="rationale"><b>Rationale</b> ${esc(f.rationale.text)}</p>` : ''}`;
}
function findingsBody(ctx, a) {
  const U = ctx.ui; const crit = a.findings.filter(x => x.sev === 'critical').length;
  const list = a.findings.length ? `<ol class="pxf-l">${a.findings.map(x => `<li class="pxf" data-finding="${esc(x.key)}" data-sev="${esc(x.sev)}"><div class="pxf-h">${U.sevTag(x.sev)}<b>${esc(x.title)}</b></div><p>${esc(x.text)}</p>${chipsFromItems(ctx, x.evidence)}</li>`).join('')}</ol>` : '<p class="hint">No finding to report from the stored records.</p>';
  const cave = a.caveats.length ? `<h4 class="pxh2">${nth(a.caveats.length, 'note', 'notes')} before you rely on this</h4><ul class="pxf-c">${a.caveats.map(x => `<li>${esc(x.title)}${x.fix ? `<small>${esc(x.fix)}</small>` : ''}</li>`).join('')}</ul>` : '';
  return `<p class="hint">${nth(a.findings.length, 'finding', 'findings')}${crit ? ` · ${crit} critical` : ''}. Each one is read from the stored records; nothing is scored.</p>${list}${cave}`;
}
function dimsBody(ctx, a) {
  const U = ctx.ui; const d = a.dimensions;
  return `<p class="hint">${esc(d.heading)}. ${esc(d.summary)}</p><ul class="pxdm">${d.rows.map(x => `<li data-dim="${x.n}" data-r="${x.rating == null ? '' : x.rating}"><div class="pxdm-h">${U.chip(x.short, { tone: 'outline', size: 'sm', title: x.name })}<b>${esc(x.label)}</b><span>${x.rating == null ? 'Not rated' : `Rated ${x.rating} · ${esc(x.ratingLabel)}`}</span>${x.driver ? U.chip('Drives the level', { tone: 'info', size: 'sm' }) : ''}${x.needsRecord ? U.chip('No dated record', { tone: 'warning', size: 'sm', icon: 'alert' }) : ''}</div><p>${esc(x.text)}</p>${chipsFromItems(ctx, x.evidence, 2)}</li>`).join('')}</ul>`;
}
function patternBody(ctx, p) {
  const U = ctx.ui;
  const stored = p.tends || p.works || p.partialRate != null ? `<dl class="pxp-d" data-px="pattern-stored">${p.tends ? `<div><dt>What ${esc(p.first)} tends to ask</dt><dd>${esc(p.tends)}</dd></div>` : ''}${p.works ? `<div><dt>What has worked</dt><dd>${esc(p.works)}</dd></div>` : ''}${p.partialRate != null ? `<div><dt>Partial approvals</dt><dd>About ${p.partialRate}% of ${esc(p.first)} decisions on file are partial approvals.</dd></div>` : ''}</dl>` : '';
  return `${stored}${U.basisLine(p.basis)}<div class="pxp-k" data-px="pattern-sample">${U.kpiTile({ label: 'Analogous cases', value: p.analogous })}${U.kpiTile({ label: 'Reversed on first-level appeal', value: p.reversedPct + '%' })}${U.kpiTile({ label: 'Peer-to-peer overturned', value: p.p2pOverturnPct + '%' })}</div>${p.note ? `<p class="hint">${esc(p.note)}</p>` : ''}<h4 class="pxh2">Strategies, ranked by success</h4><ul class="in-bars">${p.strategies.map(x => U.barRow({ label: x.label, pct: x.success })).join('')}</ul>`;
}
// -> { strip, body, analysis } | null. `strip` goes inside the case tile; `body` (three collapsed accordions) goes between the tile and the suggestions.
export function denialParts(ctx, s, d, r, X, recs) {
  return safe('denial analysis', () => {
    const a = once('appeal', r.id + '|' + ((ctx.api.session() || {}).id || ''), s, () => appealAnalysis(s, d, r, { idx: X, recs }));
    const crit = a.findings.filter(x => x.sev === 'critical').length;
    const body = accordion('Why this denial is contestable', findingsBody(ctx, a), { id: 'px-find', count: `${nth(a.findings.length, 'finding', 'findings')}${crit ? ` · ${crit} critical` : ''}`, tone: crit ? 'r' : a.findings.length ? 'y' : 'n' })
      + accordion('Six ASAM dimensions', dimsBody(ctx, a), { id: 'px-dims', count: `${a.dimensions.rated} of 6 rated`, tone: 'n' })
      + accordion(`Payer pattern · ${a.pattern.first}`, patternBody(ctx, a.pattern), { id: 'px-pattern' });
    return { strip: fieldsStrip(ctx, a.fields), body, analysis: a };
  });
}
