// HTML builders for the Denial case workspace (E3, rebuilt in the artifact's layout for R3): a header card with the process line, a left menu
// (Review · Respond), the Overview (seven recommended steps, what the payer said against what the chart shows, where the denial is weak),
// the evidence, the replies (information, decide, peer-to-peer, appeal, reconsideration), the documentation request and a collapsed History.
// Pure functions of a context { s, me, cv, ui, M, hrefFor, st } that return trusted HTML strings; the controller (DenialCase.js) wires the data-x buttons.
// Few words: states are chips, detail opens on demand. Nothing here predicts an outcome or writes clinical text: every sentence has a stored source.
import * as D from '../shared/sel/disputes.js';
import { rule, ruleValue } from '../shared/rules.js';
import { fmtDate, fmtDateTime, fmtTime, daysBetween, hoursBetween } from '../shared/dates.js';

export const SECTIONS = [['overview', 'Overview'], ['said', 'What the payer said'], ['evidence', 'Clinical evidence'], ['weak', 'Where the denial is weak'], ['action', 'Respond'], ['docreq', 'Documentation request'], ['history', 'History']];
export const ACTIONS = ['info', 'options', 'p2p', 'appeal', 'reconsider'];
// Old links keep working: section=decision is "What the payer said", section=options is the Overview with "All paths" open, section=action&action=… is the reply
export function entry(p = {}) {
  const a = ACTIONS.includes(p.action) ? p.action : null;
  if (p.section === 'options') return a ? { section: 'action', action: a } : { section: 'overview', action: null, paths: true };   // the old Options page is the "All paths" card, opened
  const section = p.section === 'decision' ? 'said' : SECTIONS.some(([k]) => k === p.section) ? p.section : (a ? 'action' : 'overview');
  return { section, action: section === 'action' ? a : null };
}
const e = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = at => !at ? '' : String(at).includes('T') ? fmtDateTime(at) : fmtDate(at);
const nl = t => e(t).replace(/\n/g, '<br>');
const marked = t => nl(t).replace(/\[Evidence missing — verify ([^\]]*)\]/g, '<mark class="d-miss">Evidence missing — verify $1</mark>');
const btn = (label, x, o = {}) => `<button type="button" class="ui-btn ui-btn--${o.tone || 'secondary'}${o.sm ? ' ui-btn--sm' : ''}" data-x="${x}"${Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${e(v)}"`).join('')}${o.disabled ? ' disabled' : ''}${o.title ? ` title="${e(o.title)}"` : ''}${o.id ? ` id="${e(o.id)}"` : ''}>${e(label)}</button>`;
const link = (label, href, o = {}) => `<a class="ui-btn ui-btn--${o.tone || 'secondary'}${o.sm ? ' ui-btn--sm' : ''}" href="${e(href)}"${o.blank ? ' target="_blank" rel="noopener"' : ''}>${e(label)}${o.blank ? c_icon('external', 14) + '<span class="ui-sr"> (opens in a new tab)</span>' : ''}</a>`;
let c_icon = () => '';                                   // set from the context (ui.icon) on first use
const needs = (c, why = 'Needs clinician') => c.me && D.canWork(c.me) ? '' : `<span class="d-need">${e(why)}</span>`;
const STEP_PATH = { appeal: 'appeal', p2p: 'p2p', recon: 'recon' };

// where each kind of "next action" lives
export function nextTarget(cv) {
  const g = cv.next.group; const st = cv.status;
  if (g === 'decide') return { section: 'action', action: 'options', label: 'Choose' };
  if (g === 'wait' || g === 'done') return null;
  const action = st === 'info-req' || st === 'drafted' ? 'info' : st === 'p2p' || st === 'p2p-prep' ? 'p2p' : st === 'recon-prep' || st === 'recon' ? 'reconsider' : st === 'appeal-prep' || st === 'appeal' ? 'appeal' : 'options';
  return { section: 'action', action, label: { prepare: 'Draft', review: 'Review', send: 'Send', call: 'Open call', record: 'Record outcome' }[g] || 'Open' };
}
export function defaultAction(cv) {
  const st = cv.status; const r = cv.r;
  if (st === 'info-req' || st === 'drafted') return 'info';
  if (st === 'p2p' || st === 'p2p-prep') return 'p2p';
  if (st === 'recon-prep' || st === 'recon') return 'reconsider';
  if (st === 'appeal-prep' || st === 'appeal') return 'appeal';
  return r.stage === 'partial_decide' || r.stage === 'denied' ? 'options' : 'info';
}
// which replies make sense at this stage (the others stay in the menu and explain themselves)
const validAction = (c, a) => {
  const r = c.cv.r; const d = c.cv.d; const st = r.stage;
  return { options: ['partial_decide', 'denied'].includes(st), info: ['info_requested', 'portal_open'].includes(st) || !!(d.docs || {}).info, p2p: ['partial_decide', ...D.P2P_STAGES].includes(st), reconsider: ['partial_decide', 'denied'].includes(st) || d.path === 'recon', appeal: ['denied', 'appeal_sent'].includes(st) }[a];
};
const M_now = c => c.M.now(c.s);

// ------------------------------------------------------------------------------------------------------------------ header card
function deadlineChip(c) {
  const { cv, ui } = c; const dl = cv.deadline; if (!cv.open || !dl) return '';
  const hourly = dl.date && String(dl.date).includes('T'); let rel = '';
  if (dl.date) { const h = hourly ? Math.round(hoursBetween(M_now(c), dl.date)) : null; rel = hourly && Math.abs(h) < 72 ? (h < 0 ? `${-h} h late` : `${h} h left`) : dl.days < 0 ? `${-dl.days} d late` : dl.days === 0 ? 'Today' : `${dl.days} d`; }
  const tone = dl.sev === 'overdue' ? 'danger' : dl.sev === 'soon' ? 'warning' : 'neutral';
  return `<span class="d-dlchip">${ui.chip(`${dl.label}${dl.date ? ' · ' + when(dl.date) : ''}`, { tone, icon: dl.sev === 'overdue' ? 'alert' : 'clock', detail: rel })}${ui.sourceChip(dl)}</span>`;
}
// Update status: status is derived from the request, so this menu offers the recorded steps that move it (each one opens its own dialog or section).
function statusItems(c) {
  const { cv } = c; const r = cv.r; const d = cv.d; const work = D.canWork(c.me); const out = [];
  if (!cv.open) return out;
  const goto = (label, section, action) => out.push({ label, x: 'goto', data: { section, action: action || '' } });
  if (work) {
    if (r.stage === 'partial_decide') { out.push({ label: 'Accept the offer…', x: 'accept', data: { mode: 'plain' } }); out.push({ label: 'Ask for a peer-to-peer…', x: 'p2preq' }); if (!(d.tried || []).includes('recon')) out.push({ label: 'Request reconsideration', x: 'choose', data: { path: 'recon' } }); }
    if (r.stage === 'denied') { out.push({ label: 'Prepare an appeal', x: 'choose', data: { path: 'appeal' } }); if (!(d.tried || []).includes('recon')) out.push({ label: 'Request reconsideration', x: 'choose', data: { path: 'recon' } }); out.push({ label: 'Accept the denial…', x: 'accept', data: { mode: 'denial' } }); }
    if (['info_requested', 'portal_open'].includes(r.stage)) goto('Draft or review the reply', 'action', 'info');
    if (D.P2P_STAGES.includes(r.stage)) { out.push({ label: r.p2p_at ? 'Change the call…' : 'Set the call…', x: 'schedule' }); out.push({ label: r.stage === 'p2p_awaiting' ? 'Record the decision…' : 'Log the outcome…', x: 'outcome' }); }
    if (r.stage === 'appeal_sent' || (d.docs.recon && d.docs.recon.sent)) out.push({ label: 'Record the payer answer…', x: 'outcome' });
  }
  out.push({ label: d.review ? 'Update the clinical review…' : 'Mark for clinical review…', x: 'step', data: { k: 'review' } });
  out.push({ label: 'Change the owner…', x: 'assign' });
  return out;
}
export function header(c) {
  const { cv, ui, hrefFor } = c; c_icon = ui.icon; const d = cv.d; const r = cv.r; const work = D.canWork(c.me);
  const tone = d.issue === 'denial' ? 'danger' : d.issue === 'info' ? 'info' : 'warning';
  const items = statusItems(c);
  const upd = items.length ? `<div class="d-upd" id="d-upd"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm d-upd__b" id="d-upd-b" data-x="upd" aria-haspopup="menu" aria-expanded="false" aria-controls="d-upd-p">Update status</button><ul class="d-upd__p" id="d-upd-p" role="menu" aria-labelledby="d-upd-b" hidden>${items.map(it => `<li role="none"><button type="button" role="menuitem" data-x="${it.x}"${Object.entries(it.data || {}).map(([k, v]) => ` data-${k}="${e(v)}"`).join('')}>${e(it.label)}</button></li>`).join('')}</ul></div>` : '';
  const voice = cv.open ? (work ? `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="call" id="d-call">${ui.icon('phone', 14)} Call payer · voice agent</button>` : `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" disabled title="Needs clinician: a clinician starts and records every payer call">${ui.icon('phone', 14)} Call payer · voice agent</button>`) : '';
  const lauris = c.laurisUrl && c.canLauris ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${e(c.laurisUrl)}" target="_blank" rel="noopener">Open in Lauris${ui.icon('external', 14)}<span class="ui-sr"> (opens Lauris in a new tab)</span></a>` : '';
  const chips = [ui.statusChip(cv.status, { kind: 'dispute' }), deadlineChip(c), !cv.open ? ui.chip(`Closed ${fmtDate(d.closed)}`, { tone: 'neutral', icon: 'lock' }) : '',
    `<span class="d-auth"><span class="ui-muted">Authorization</span> ${ui.statusChip(r.stage)}</span>`, btn(`Owner: ${cv.owner.short}`, 'assign', { sm: true, tone: 'ghost', title: 'Change the owner and the backup' })].join('');
  const u = cv.units; const svc = (r.service || '').split(' · ')[0];
  const line = [cv.payer.name, svc, `Request ${r.id}`, `${u.requested} units requested`, `Sent by ${cv.channel.label}`, d.id].map(e).join(' · ');
  const tl = D.timelineOf(c.s, d, r, cv.status);
  const steps = `<ol class="d-steps" aria-label="Where this decision is">${tl.labels.map((l, i) => `<li class="${i < tl.step ? 'is-done' : i === tl.step ? 'is-now' : ''}"${i === tl.step ? ' aria-current="step"' : ''}><span class="d-steps__dot" aria-hidden="true">${i < tl.step ? ui.icon('check', 12) : i + 1}</span><b>${e(l)}</b><span class="d-steps__d">${i <= tl.step ? e(tl.dates[i]) : ''}</span></li>`).join('')}</ol>`;
  return `<nav class="d-crumb" aria-label="Breadcrumb"><a href="#/DenialIntelligence">Denial Intelligence</a><span aria-hidden="true">/</span><span aria-current="page">${e(cv.c.initials)}</span></nav>
  <header class="d-hd"><div class="d-hd__t"><div class="d-hd__l"><h1>${e(cv.consumer)}</h1>${ui.chip(cv.issueLabel, { tone })}</div><div class="d-hd__a">${upd}${voice}${link('Open in Authorizations', hrefFor('Authorizations.dc.html?id=' + r.id), { sm: true })}${lauris}</div></div>
  <div class="d-hd__c">${chips}</div><p class="d-hd__s">${line}</p>${steps}</header>`;
}

// ------------------------------------------------------------------------------------------------------------------ left menu
export function menu(c) {
  const { cv, st } = c; const r = cv.r; const d = cv.d; const idx = c.idx(); const res = D.stepResults(c.s, d, r, idx); const done = D.STEP_LIST.filter(([k]) => res[k]).length;
  const act = st.action || defaultAction(cv);
  const href = (section, action) => `#/DenialCase?id=${e(r.id)}&section=${section}${action ? '&action=' + action : ''}`;
  const item = (label, section, action, sub) => { const on = st.section === section && (section !== 'action' || act === action); return `<li><a href="${href(section, action)}" data-x="tab" data-section="${section}"${action ? ` data-action="${action}"` : ''}${on ? ' aria-current="page"' : ''}><b>${e(label)}</b>${sub ? `<span>${e(sub)}</span>` : ''}</a></li>`; };
  const pf = cv.payer.first; const nW = c.clinical ? D.weakPoints(c.s, d, r, idx).length : null;
  const nMiss = c.missing().length; const ev = !c.clinical ? 'Restricted' : nMiss ? `${nMiss} not documented` : 'All documented';
  const doc = k => (d.docs || {})[k]; const docSub = k => res[k] === undefined ? (validAction(c, k === 'recon' ? 'reconsider' : k) ? '' : 'Not available now') : res[k];
  const respond = [
    ['partial_decide', 'denied'].includes(r.stage) ? item(r.stage === 'denied' ? 'Accept the denial' : 'Decide on the offer', 'action', 'options', '') : '',
    validAction(c, 'info') ? item(`Reply to ${pf}`, 'action', 'info', doc('info') ? (doc('info').sent ? 'Sent' : doc('info').reviewed ? 'Reviewed' : 'Simulated draft') : '') : '',
    item('Appeal draft', 'action', 'appeal', docSub('appeal')), item('Peer-to-peer script', 'action', 'p2p', docSub('p2p')), item('Reconsideration', 'action', 'reconsider', docSub('recon')),
    item('Documentation request', 'docreq', '', res.docreq || (c.clinical && nMiss ? `${nMiss} to request` : ''))].join('');
  return `<nav class="d-menu" aria-label="Case sections"><p class="d-menu__g">Review</p><ul>${item('Overview', 'overview', '', `${done} of ${D.STEP_LIST.length} steps done`)}${item(d.issue === 'info' ? `What ${pf} asked` : `What ${pf} said`, 'said', '', '')}${item('Clinical evidence', 'evidence', '', ev)}${item('Where the denial is weak', 'weak', '', c.clinical ? (res.analyze ? `${nW} point${nW === 1 ? '' : 's'}` : 'Not analyzed') : 'Restricted')}</ul><p class="d-menu__g">Respond</p><ul>${respond}</ul></nav>`;
}

// ------------------------------------------------------------------------------------------------------------------ Overview: the seven recommended steps
function stepsCard(c) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const idx = c.idx(); const res = D.stepResults(s, d, r, idx); const done = D.STEP_LIST.filter(([k]) => res[k]).length;
  const nt = cv.open ? nextTarget(cv) : null;
  const next = cv.open ? `<div class="d-next" role="status"><span class="d-next__l">Next</span><b>${e(cv.next.label)}</b><span class="d-sm ui-muted">${e(cv.owner.name)}</span>${nt && D.canWork(c.me) ? btn(nt.label, 'goto', { tone: 'primary', sm: true, data: { section: nt.section, action: nt.action || '' } }) : nt ? needs(c) : ''}</div>`
    : `<div class="d-next d-next--done" role="status"><span class="d-next__l">Outcome</span><b>${e(d.outcome ? d.outcome.text : 'Closed')}</b>${link('Open authorization', c.hrefFor('Authorizations.dc.html?id=' + r.id), { tone: 'primary', sm: true })}</div>`;
  const rows = D.STEP_LIST.map(([k, label], i) => {
    const locked = (D.NEEDS_CLINICAL.includes(k) && !c.clinical) || !cv.open; const lockWhy = !cv.open ? 'This case is closed' : 'Clinical record access required'; const res1 = res[k];
    const dl = STEP_PATH[k] && d.issue !== 'info' ? cv.deadlines.find(x => x.kind === k) : null; const cur = cv.path === STEP_PATH[k] && STEP_PATH[k];
    const bits = [locked && cv.open ? `<span class="ui-muted">${ui.icon('lock', 14)} Clinical record access required</span>` : res1 ? `<span class="d-act__ok">${e(res1)}</span>` : '', dl ? `<span class="d-sm ui-muted">Deadline ${e(dl.label)}${dl.date ? ' · ' + e(when(dl.date)) : ''}</span>${ui.sourceChip(dl)}` : '', cur ? ui.chip('Current pathway', { tone: 'info', icon: 'dot', size: 'sm' }) : ''].filter(Boolean).join('');
    return `<li class="d-act${res1 ? ' is-done' : ''}${cur ? ' is-cur' : ''}"><button type="button" class="d-act__b" data-x="step" data-k="${k}"${locked ? ` disabled title="${lockWhy}"` : ''} aria-label="${e(label)}${res1 ? ', ' + e(res1) : ''}"><span class="d-act__n" aria-hidden="true">${res1 ? ui.icon('check', 14) : i + 1}</span><span class="d-act__t"><b>${e(label)}</b>${bits ? `<span class="d-act__r">${bits}</span>` : ''}</span><span class="d-act__go" aria-hidden="true">${locked ? '' : 'Open ›'}</span></button></li>`;
  }).join('');
  return `<section class="d-sect" aria-labelledby="d-h-steps"><div class="d-sect__h"><h2 id="d-h-steps">Recommended next steps</h2><span class="d-sm ui-muted d-sect__r">${done} of ${D.STEP_LIST.length} done</span></div>${next}<ol class="d-acts">${rows}</ol></section>`;
}
// What the payer said, beside what the chart shows (stored records, each with its source; "Not documented" where none)
const evChips = (c, ids) => { const idx = c.idx(); const chips = (ids || []).map(id => D.evidenceById(idx, id)).filter(Boolean).map(it => c.ui.evidenceChip(D.chipOpts(it))); return chips.slice(0, 3).join('') + (chips.length > 3 ? `<details class="d-more"><summary>+${chips.length - 3} more sources</summary><div class="d-sec__ev">${chips.slice(3).join('')}</div></details>` : ''); };
function saidCard(c, o = {}) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const pf = cv.payer.first; const dec = cv.decision;
  const title = d.issue === 'info' ? `What ${pf} asked` : `What ${pf} said`;
  let rows;
  if (c.clinical) {
    const pairs = D.compareReasons(s, d, r, c.idx());
    rows = pairs.map(x => `<div class="d-vs"><blockquote class="d-said">“${e(x.said)}”</blockquote><div class="d-shows"><span class="d-cap">What the chart shows</span>${x.matched ? `<p>${x.shows ? e(x.shows) : ''} ${evChips(c, x.ids)}</p>` : '<p class="ui-muted">Not compared yet: no stored record is matched to this reason.</p>'}${x.need.map(n => `<p class="d-needrow">${ui.evidenceChip({ state: 'missing', label: n })}</p>`).join('')}</div></div>`).join('')
      || `<p>${ui.evidenceChip({ state: 'missing', label: "the payer's stated reason" })}</p>`;
  } else {
    rows = d.issue === 'info' ? `<p>${needs(c, 'Needs clinician')} <span class="d-sm ui-muted">The items the payer asked for are clinical text.</span></p>`
      : (dec.reasons || []).map(x => `<div class="d-vs"><blockquote class="d-said">“${e(String(x.text).replace(/^["“]|["”]$/g, ''))}”</blockquote><div class="d-shows"><span class="d-cap">What the chart shows</span><p>${needs(c, 'Needs clinician')}</p></div></div>`).join('') || `<p class="ui-muted">No reason is recorded.</p>`;
  }
  const corr = [dec.via ? ui.chip(`${dec.via}${dec.date ? ' · ' + when(dec.date) : ''}`, { tone: 'outline', icon: 'send' }) : '', dec.source ? `<span class="d-sm ui-muted">${e(dec.source)}</span>` : ''].join('');
  return `<section class="d-sect" aria-labelledby="d-h-said${o.id || ''}"><div class="d-sect__h"><h2 id="d-h-said${o.id || ''}">${e(title)}</h2><span class="d-sect__r">${o.compact ? btn('Decision details', 'tab', { sm: true, tone: 'ghost', data: { section: 'said' } }) : ''}${btn(`${pf} guidance`, 'guidance', { sm: true, tone: 'ghost' })}</span></div>${rows}${corr ? `<div class="d-corr"><span class="d-cap">Payer correspondence</span>${corr}</div>` : ''}</section>`;
}
// Where the denial is weak: points derived from stored records (see sel/disputes.js weakPoints). "Analyze" is a person's button; nothing is scored.
function weakRow(c, w, compact) {
  const { ui, s } = c; const idx = c.idx(); const [tone, lab] = D.WEAK_KINDS[w.kind];
  const refs = [evChips(c, w.ids), w.rule ? ui.sourceChip(w.rule) : ''].join('');
  const go = w.lauris && c.laurisUrl && c.canLauris ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${e(c.laurisUrl)}" target="_blank" rel="noopener">Collect in Lauris${ui.icon('external', 14)}<span class="ui-sr"> (opens Lauris in a new tab)</span></a>` : w.go ? btn(w.go === 'evidence' ? 'Open the evidence' : 'Decision details', 'tab', { sm: true, data: { section: w.go } }) : '';
  return `<div class="d-wp" data-kind="${w.kind}">${ui.chip(lab, { tone, size: 'sm' })}<div class="d-wp__b"><b>${e(w.title)}</b>${w.text && !compact ? `<p>${e(w.text)}</p>` : ''}<div class="d-wp__f">${refs}<span class="d-wp__fix">Fix: ${e(w.fix)}</span>${go}</div></div></div>`;
}
function weakCard(c, limit) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const sec = limit ? '' : ' id="d-h-weak"';
  const head = extra => `<div class="d-sect__h"><h2${sec || ' id="d-h-weakc"'}>Where the denial is weak</h2>${extra || ''}</div>`;
  if (!c.clinical) return `<section class="d-sect" aria-labelledby="${limit ? 'd-h-weakc' : 'd-h-weak'}">${head()}${ui.emptyState({ tone: 'denied', title: 'Needs clinician', body: 'Weak points quote clinical records, so they are shown to clinicians only. Administrators see the status, units and deadlines of the case.' })}</section>`;
  if (!d.analysis) return `<section class="d-sect" aria-labelledby="${limit ? 'd-h-weakc' : 'd-h-weak'}">${head()}<div class="d-empty"><span class="ui-muted">Not analyzed yet</span>${cv.open && D.canWork(c.me) ? btn('Analyze Denial', 'step', { tone: 'primary', sm: true, data: { k: 'analyze' } }) : ''}</div></section>`;
  const all = D.weakPoints(s, d, r, c.idx()); const list = limit ? all.slice(0, limit) : all;
  const extra = limit ? (all.length > limit ? btn(`See all ${all.length}`, 'tab', { sm: true, data: { section: 'weak' } }) : '') : `${ui.maturity('denial.analysis')}<span class="d-sm ui-muted">Analyzed ${e(when(d.analysis.at))} · ${e(c.M.staff(s, d.analysis.by).name)}</span>`;
  return `<section class="d-sect" aria-labelledby="${limit ? 'd-h-weakc' : 'd-h-weak'}">${head(extra)}<div class="d-wk">${list.map(w => weakRow(c, w, !!limit)).join('') || '<p class="ui-muted">No weak points found in the stored records.</p>'}</div>${!limit && cv.open && D.canWork(c.me) ? `<div class="ui-btnrow">${btn('Analyze again', 'step', { sm: true, data: { k: 'analyze' } })}</div>` : ''}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ All paths (the former Options page): every route this decision can take, each with its rule and source
function pathsCard(c) {
  const { cv, ui, hrefFor } = c; const r = cv.r;
  const card = o => {
    const dl = o.deadline;
    const chips = [o.category ? ui.sourceChip(o.category, { note: o.note }) : '', o.unverified ? ui.chip(o.unverified, { tone: 'warning', icon: 'alert' }) : '', o.providerNote ? ui.chip(o.providerNote, { tone: 'warning', icon: 'alert' }) : '', o.note && !o.category ? ui.chip(o.note, { tone: 'outline' }) : '', o.tried ? ui.chip('Tried', { tone: 'neutral' }) : '', o.active ? ui.chip('In progress', { tone: 'info', icon: 'dot' }) : ''].join('');
    const dlLine = dl ? `<span class="d-sm">${e(dl.label)}${dl.date ? ' · ' + e(when(dl.date)) : ''}</span> ${ui.sourceChip(dl)}` : '';
    const act = !o.available ? '' : o.link ? link(o.key === 'discharge' ? 'Open transition' : 'Open', hrefFor('EarlyDischarge.dc.html?id=' + r.id), { sm: true }) : o.needsClinician ? needs(c) : btn(o.key === 'outcome' ? 'Record' : 'Open', 'goto', { sm: true, tone: o.active ? 'primary' : 'secondary', data: { section: 'action', action: o.action || 'options' } });
    return `<li class="d-opt${o.available ? '' : ' d-opt--off'}"><div class="d-opt__b"><h3>${e(o.label)}</h3><p>${e(o.available ? o.sub || '' : o.why || '')}</p><div class="d-opt__m">${chips}${dlLine}</div></div><div class="d-opt__a">${act}</div></li>`;
  };
  const on = cv.options.filter(o => o.available), off = cv.options.filter(o => !o.available);
  return `<section class="d-sect"><details class="d-paths" id="d-paths"${c.st.paths ? ' open' : ''}><summary><h2>All paths</h2><span class="d-sm ui-muted">${on.length} available · each with its rule and source</span></summary>${cv.open ? '' : `<p class="ui-muted">This case is closed: ${e(cv.d.outcome ? cv.d.outcome.text : '')}</p>`}
  <ul class="d-opts">${on.map(card).join('')}</ul>
  ${off.length ? `<details class="d-det"><summary>Not available here (${off.length})</summary><ul class="d-opts">${off.map(card).join('')}</ul></details>` : ''}</details></section>`;
}
export function overviewSection(c) { return stepsCard(c) + saidCard(c, { compact: true, id: '-o' }) + weakCard(c, 3) + pathsCard(c); }
export function saidSection(c) { return saidCard(c, { id: '' }) + decisionSection(c); }
export const weakSection = c => weakCard(c, 0);

// ------------------------------------------------------------------------------------------------------------------ Decision details
export function decisionSection(c) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const dec = cv.decision; const u = cv.units;
  const row = (k, v) => `<div class="ui-dl__r"><dt>${e(k)}</dt><dd>${v}</dd></div>`;
  const doc = dec.docRef ? `${e(dec.docRef)}` : `<span class="d-docref">${c.ui.evidenceChip({ state: 'missing', label: 'the document reference for the payer decision' })}<span class="ui-muted d-sm">${e(dec.docRefNote)}</span> ${D.canRecord(c.me) && ['partial', 'denial'].includes(d.issue) && cv.open ? btn('Record document', 'recorddoc', { sm: true }) : needs(c, 'Needs a person with the decision capability')}</span>`;
  const dls = cv.deadlines.length ? `<ul class="d-dls">${cv.deadlines.map(x => `<li><span><b>${e(x.label)}</b>${x.date ? ' · ' + e(when(x.date)) : ''}${x.days != null ? ` <span class="d-sm ui-muted">(${x.days < 0 ? -x.days + ' d late' : x.days === 0 ? 'today' : 'in ' + x.days + ' d'})</span>` : ''}</span>${ui.sourceChip(x)}<span class="d-sm ui-muted">${e(x.source)}</span></li>`).join('')}</ul>` : '<p class="ui-muted">No open deadline.</p>';
  const unitsLine = u.current != null ? `${u.requested} requested → ${u.current} ${d.issue === 'denial' ? 'approved' : u.offered != null ? 'offered' : 'approved'}. At ${u.rate} units a school day, ${u.current} units cover ${u.days} school days${u.runOut ? ', to about ' + fmtDate(u.runOut) : ''}. ${ui.sourceChip(u.assumption)}` : `${u.requested} requested.`;
  const ledger = dec.ledger.length ? `<details class="d-det"><summary>Decision record (${dec.ledger.length}) · write-once</summary><table class="d-table"><thead><tr><th>When</th><th>Kind</th><th>Outcome</th><th>Units</th><th>Document</th><th>Recorded by</th></tr></thead><tbody>${dec.ledger.slice().reverse().map(x => `<tr${x.superseded_by ? ' class="d-sup"' : ''}><td>${e(when(x.at))}</td><td>${e(x.kind)}</td><td>${e(x.outcome)}${x.sim ? ' ' + ui.chip('Simulated', { tone: 'outline', size: 'sm', className: 'ui-chip--sim' }) : ''}</td><td>${x.units ?? ''}</td><td>${e(x.doc_ref)}</td><td>${e(c.M.staff(s, x.by).name)}${x.reason ? ' · correction: ' + e(x.reason) : ''}</td></tr>`).join('')}</tbody></table></details>` : '<p class="d-sm ui-muted">No decision record yet: a decision is stored once, with the document that states it.</p>';
  const calls = c.clinical && (d.calls || []).length ? `<h3>Payer calls <span class="d-n">${d.calls.length}</span></h3><ul class="d-calls">${d.calls.slice().reverse().map(x => `<li><b>${e(when(x.at))}</b> · ${e(x.purpose_label)} · ${e(c.M.staff(s, x.by).name)}${x.ref ? ' · ref ' + e(x.ref) : ''} ${ui.chip('Simulated', { tone: 'outline', size: 'sm', className: 'ui-chip--sim' })}<br><span class="d-sm">${e(x.outcome)}</span></li>`).join('')}</ul>` : '';
  return `<section class="d-sect" aria-labelledby="d-h-dec"><h2 id="d-h-dec">Decision details</h2>
  <dl class="ui-dl d-dl">${row('What', e(dec.summary))}${row('When', e(when(dec.date) || 'Not recorded') + (dec.via ? ' · ' + e(dec.via) : ''))}${row('Document', doc)}${dec.source ? row('Source', e(dec.source)) : ''}${!cv.open && d.outcome ? row('Outcome', `<b>${e(d.outcome.text)}</b>${d.outcome.doc_ref ? ' · document ' + e(d.outcome.doc_ref) : ''} · ${e(when(d.closed))}`) : ''}</dl>
  <h3>Units</h3><p>${unitsLine}</p>
  <h3>Deadlines</h3>${dls}
  ${calls}
  ${ledger}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Evidence
export function evidenceSection(c) {
  const { cv, ui } = c;
  if (!c.clinical) return `<section class="d-sect" aria-labelledby="d-h-ev"><h2 id="d-h-ev">Clinical evidence</h2>${ui.emptyState({ tone: 'denied', title: 'Needs clinician', body: 'Clinical evidence is shown to clinicians only. Administrators see the status, units and deadlines of the case.' })}</section>`;
  const idx = c.idx(); const d = cv.d;
  const row = it => `<li class="d-ev${it.usable ? '' : ' d-ev--held'}"><span class="d-ev__d">${e(fmtDate(it.date, { year: !it.current }))}</span><span class="d-ev__b"><b>${e(it.label)}</b>${it.quote ? `<span class="d-sm ui-muted">${e(it.quote)}</span>` : ''}</span><span class="d-ev__c">${ui.evidenceChip(D.chipOpts(it))}</span><span class="d-ev__a">${D.canWork(c.me) && cv.open ? (it.usable ? btn('Exclude', 'incl', { sm: true, tone: 'ghost', data: { ref: it.id, include: '0' }, title: 'Keep this record out of drafts' }) : btn(it.state === 'sensitive' ? 'Include' : 'Include again', 'incl', { sm: true, tone: 'ghost', data: { ref: it.id, include: '1' }, title: it.state === 'sensitive' ? 'Sensitive: include only when appropriate and authorized' : 'Use this record in drafts again' })) : ''}</span></li>`;
  const cur = idx.items.filter(x => x.current); const old = idx.items.filter(x => !x.current);
  const seeded = idx.items.some(x => x.provenance === 'seed');
  const need = c.missing();
  const miss = need.length ? `<ul class="d-miss-l">${need.map(n => `<li>${ui.evidenceChip({ state: 'missing', label: n.label })}</li>`).join('')}</ul>` : `<p class="ui-muted">Nothing is marked missing for this case.</p>`;
  return `<section class="d-sect" aria-labelledby="d-h-ev"><div class="d-sect__h"><h2 id="d-h-ev">Clinical evidence</h2>${ui.sourceChip(rule(c.s, 'evidence.current_window_days'))}${seeded ? ui.chip('Illustrative sample', { tone: 'outline', icon: 'info', title: 'These records are seeded demo data, not captured from a real chart.' }) : ''}</div>
  <h3>Missing <span class="d-n">${need.length}</span></h3>${miss}${need.length && D.canWork(c.me) && cv.open ? `<div class="ui-btnrow">${btn('Request additional documentation', 'tab', { sm: true, data: { section: 'docreq' } })}</div>` : ''}
  <h3>Last ${idx.window} days <span class="d-n">${cur.length}</span></h3>${cur.length ? `<ul class="d-evl">${cur.map(row).join('')}</ul>` : `<p>${ui.evidenceChip({ state: 'missing', label: `dated records from the last ${idx.window} days` })}</p>`}
  ${old.length ? `<h3>Earlier history <span class="d-n">${old.length}</span></h3><ul class="d-evl">${old.map(row).join('')}</ul>` : ''}
  ${idx.counts.held ? `<p class="d-sm ui-muted">${idx.counts.held} record${idx.counts.held === 1 ? ' is' : 's are'} held back from drafts (sensitive or excluded).</p>` : ''}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Documentation request
export function docreqSection(c) {
  const { cv, ui, s, st } = c; const d = cv.d; const r = cv.r; const work = D.canWork(c.me) && cv.open;
  if (!c.clinical) return `<section class="d-sect" aria-labelledby="d-h-dr"><h2 id="d-h-dr">Documentation request</h2>${ui.emptyState({ tone: 'denied', title: 'Needs clinician', body: 'What is missing is read from clinical records, so the request is prepared by clinicians.' })}</section>`;
  const idx = c.idx(); const q = d.docreq;
  const received = q ? (q.items || []).filter(x => x.got).length : 0;
  const state = q ? `<h3>Requested from ${e(D.DOCREQ_TO[q.to] || q.to)}</h3><p class="d-sm ui-muted">Recorded ${e(when(q.at))} by ${e(c.M.staff(s, q.by).name)}. Psyflo sends no message: a person asks them.</p>
    <ul class="d-dr">${q.items.map(x => `<li><span>${x.got ? ui.chip('Received', { tone: 'success', icon: 'check', size: 'sm' }) : ui.chip('Requested', { tone: 'warning', icon: 'clock', size: 'sm' })} ${e(x.label)}${x.got ? ` <span class="d-sm ui-muted">· ${e(when(x.got.at))} · ${e(c.M.staff(s, x.got.by).name)}</span>` : ''}</span>${!x.got && work ? btn('Mark received', 'docrecv', { sm: true, tone: 'ghost', data: { key: x.key } }) : ''}</li>`).join('')}</ul>` : '';
  const need = c.missing();
  const form = !need.length ? `<p class="ui-muted">Nothing is marked Evidence missing for this case, so there is nothing to request.</p>`
    : `<fieldset class="d-radios"><legend>What is missing</legend>${need.map(n => `<label class="d-check"><input type="checkbox" name="d-dr-k" value="${e(n.key)}" checked> ${e(n.label)}</label>`).join('')}</fieldset>
      <fieldset class="d-radios"><legend>Request it from</legend>${Object.entries(D.DOCREQ_TO).map(([k, l], i) => `<label><input type="radio" name="d-dr-to" value="${k}"${(st.drTo || (q && q.to) || 'clinician') === k ? ' checked' : ''}> ${e(l)}</label>`).join('')}</fieldset>
      <div class="ui-btnrow">${work ? btn(q ? 'Record a new request' : 'Record the request', 'docreq', { tone: 'primary' }) : needs(c)}</div><p class="d-sm ui-muted">This records who was asked and when. It does not send anything; the person asks them directly, then marks each item received here.</p>`;
  return `<section class="d-sect" aria-labelledby="d-h-dr"><div class="d-sect__h"><h2 id="d-h-dr">Documentation request</h2>${ui.maturity('denial.docreq')}${q ? `<span class="d-sm ui-muted">${received} of ${q.items.length} received</span>` : ''}</div>${state}<h3>${q ? 'Still missing' : 'Missing evidence'}</h3>${form}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ History (a collapsed card at the foot of the page)
export function historyCard(c) {
  const { cv, ui, st } = c; const evs = c.history();
  return `<details class="d-hist" id="d-hist"${st.hist || st.section === 'history' ? ' open' : ''}><summary><h2>History</h2><span class="d-sm ui-muted">${evs.length} event${evs.length === 1 ? '' : 's'}</span></summary>${ui.timeline(evs, { id: 'dc-tl', label: 'Correspondence and decisions, newest first' })}</details>`;
}

// ------------------------------------------------------------------------------------------------------------------ documents (draft, review, edit)
function docBlock(c, kind, o = {}) {
  const { cv, ui, st } = c; const d = cv.d; const doc = (d.docs || {})[kind]; const idx = c.idx(); const sent = !!(doc && doc.sent); const work = D.canWork(c.me) && cv.open && c.clinical;
  if (!doc || !doc.sections) return `<div class="d-doc d-doc--empty"><h3>${e(D.DOC_TITLE[kind])}</h3><p class="ui-muted">${e(o.emptyNote || 'No draft yet. Psyflo builds it only from stored records and prints Evidence missing — verify … for anything it cannot support.')}</p>${work ? btn('Draft from records', 'gen', { tone: 'primary', data: { doc: kind } }) : needs(c)}</div>`;
  const gaps = D.docMissing(doc); const outward = kind !== 'p2p';
  const rev = doc.reviewed ? `${ui.chip(`Reviewed · ${c.M.staff(c.s, doc.reviewed.by).name} · ${when(doc.reviewed.at)}`, { tone: 'success', icon: 'check' })}` : ui.chip(outward ? 'Not reviewed' : 'Not reviewed yet', { tone: 'warning', icon: 'eye' });
  const tools = [ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim', title: 'Rule-based drafting from stored evidence; no language model is called.' }), doc.seeded ? ui.chip('Illustrative sample', { tone: 'outline', icon: 'info' }) : '', sent ? ui.chip(`Sent ${when(doc.sent.at)}${doc.sent.ref ? ' · ' + doc.sent.ref : ''}`, { tone: 'info', icon: 'send' }) : rev, doc.stale ? ui.chip('Evidence changed · regenerate', { tone: 'warning', icon: 'alert' }) : '', gaps.length ? ui.chip(`${gaps.length} to fill`, { tone: 'warning', icon: 'alert', title: 'Items marked Evidence missing' }) : ''].join('');
  const reviewBtn = !work || sent ? '' : doc.reviewed ? '' : btn('Mark reviewed', 'review', { tone: o.reviewPrimary === false ? 'secondary' : 'primary', sm: true, data: { doc: kind }, disabled: (outward && gaps.length > 0) || (doc.seeded && !doc.sections.some(x => x.edited)), title: outward && gaps.length ? 'Fill or remove the items marked Evidence missing first' : doc.seeded && !doc.sections.some(x => x.edited) ? 'A seeded sample: draft it again from records, or edit it, first' : '' });
  const secs = doc.sections.map(sec => {
    const key = `${kind}:${sec.key}`; const editing = st.editing === key;
    const chipList = (sec.evidence || []).map(id => D.evidenceById(idx, id)).filter(Boolean).map(it => ui.evidenceChip(D.chipOpts(it)));
    const evs = chipList.slice(0, 3).join('') + (chipList.length > 3 ? `<details class="d-more"><summary>+${chipList.length - 3} more sources</summary><div class="d-sec__ev">${chipList.slice(3).join('')}</div></details>` : '');
    const body = editing ? `<div class="d-edit">${ui.draftField({ key: `dc:${d.id}:${key}`, label: `Edit: ${sec.title}`, value: sec.text, rows: Math.max(4, Math.ceil(sec.text.length / 90)), hint: 'Evidence links stay. Editing withdraws the review.' })}<div class="ui-btnrow">${btn('Save section', 'savesec', { tone: 'primary', sm: true, data: { doc: kind, sec: sec.key } })}${btn('Cancel', 'cancel', { sm: true })}</div></div>`
      : `<p class="d-sec__t">${marked(sec.text)}</p>`;
    return `<article class="d-secdoc"><header><h4>${e(sec.title)}</h4>${sec.basis ? ui.chip(sec.basis, { tone: 'outline', size: 'sm' }) : ''}${sec.edited ? ui.chip('Edited', { tone: 'info', size: 'sm' }) : ''}${work && !sent && !editing ? btn('Edit', 'edit', { sm: true, tone: 'ghost', data: { doc: kind, sec: sec.key } }) : ''}</header>${body}${evs ? `<div class="d-sec__ev">${evs}</div>` : ''}</article>`;
  }).join('');
  const vers = (doc.versions || []).length ? `<details class="d-det"><summary>Versions (${doc.versions.length})</summary><ul class="d-vers">${doc.versions.slice().reverse().map(v => `<li><b>${e(when(v.at))}</b> · ${e(c.M.staff(c.s, v.by).name !== v.by ? c.M.staff(c.s, v.by).name : v.by)} · ${e(v.what)}${v.previous ? `<br><span class="d-sm ui-muted">Before: ${e(v.previous)}…</span>` : ''}</li>`).join('')}</ul></details>` : '';
  const attached = doc.attached ? `<p class="d-sm"><b>Attached:</b> ${e(doc.attached)}</p>` : '';
  return `<div class="d-doc"><div class="d-doc__h"><h3>${e(D.DOC_TITLE[kind])}</h3><div class="d-doc__c">${tools}</div><div class="d-doc__a">${reviewBtn}${work && !sent ? btn(doc.seeded ? 'Draft again from records' : 'Regenerate', 'gen', { sm: true, data: { doc: kind } }) : ''}</div></div>${secs}${attached}${vers}</div>`;
}

const sentLine = (c, kind) => {
  const doc = (c.cv.d.docs || {})[kind]; if (!doc || !doc.sent) return '';
  const sd = doc.sent;
  return `<p class="d-sentline">${c.ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' })} ${sd.via === 'fax' ? `Sent through simulated Sfax${sd.ref ? ' · ref <b>' + e(sd.ref) + '</b>' : ''}` : sd.pending ? 'Opened in the payer portal · waiting for the confirmation the portal shows' : `Sent in the payer portal${sd.ref ? ' · confirmation <b>' + e(sd.ref) + '</b>' + (sd.manual ? ' (entered by ' + e(c.M.staff(c.s, sd.by).name) + ')' : ' (read from the open page)') : ''}`} · ${e(when(sd.at))}</p>`;
};

// ------------------------------------------------------------------------------------------------------------------ Action: information request
function infoAction(c) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const doc = (d.docs || {}).info;
  if (!['info_requested', 'portal_open'].includes(r.stage) && !(doc && doc.sent)) return `<section class="d-sect"><h2>Information request</h2><p class="ui-muted">${r.stage === 'partial_decide' ? `${e(cv.payer.first)} has not asked for information on this decision.` : 'There is no open information request on this case.'}</p></section>`;
  const clk = c.M.requestClock(s, r); const ru = rule(s, 'info_request.hours');
  const asked = !c.clinical ? `<li>${needs(c, 'Needs clinician')}</li>` : (d.concerns || []).map((x, i) => `<li><span class="d-n">${i + 1}</span><span>${e(x.text)}<span class="d-sm ui-muted"> · ${e(x.source)}</span></span></li>`).join('');
  const ready = doc && doc.sections && doc.reviewed && !doc.sent;
  const portal = r.channel !== 'fax';
  const send = doc && doc.sent ? sentLine(c, 'info') + `<p class="d-sm ui-muted">Answer and stop: the sent reply is write-once. The decision clock keeps its first send date (restart not assumed: ${e(rule(s, 'decision.restart_on_info_reply').verification.toLowerCase())}).</p>${r.stage === 'portal_open' ? `<p><a class="ui-btn ui-btn--secondary" href="${e(c.extUrl)}/${e(r.channel)}/upload?request=${e(r.id)}&kind=reply" target="_blank" rel="noopener">Open ${e(c.M.CHANNEL_LABEL[r.channel])} again</a></p>` : ''}`
    : `<div class="d-send">${ready && D.canWork(c.me) ? btn(portal ? `Open ${c.M.CHANNEL_LABEL[r.channel]} and send` : 'Send by fax', 'send', { tone: 'primary', data: { doc: 'info' } }) : `<span class="ui-muted d-sm">${doc && doc.sections ? 'Review the reply to unlock Send.' : 'Draft and review the reply to unlock Send.'}</span>`}<span class="d-sm ui-muted">${portal ? `A person sends it in their own ${e(c.M.CHANNEL_LABEL[r.channel])} login; the confirmation number is read from that page.` : "A person presses Send; the Sfax stub (simulated) returns the reference."}</span></div>`;
  return `<section class="d-sect" aria-labelledby="d-h-info"><div class="d-sect__h"><h2 id="d-h-info">Information request</h2>${ui.maturity('denial.info')}</div>
  <p class="d-clock">${ui.chip(clk.text, { tone: clk.sev === 'r' ? 'danger' : 'warning', icon: 'clock' })}${ui.sourceChip(ru)}</p>
  <h3>What was asked</h3><ol class="d-asked">${asked || '<li><span class="ui-muted">The items were not recorded.</span></li>'}</ol>
  ${docBlock(c, 'info', { emptyNote: 'One answer for each item asked, from dated stored records. Answer the question and stop: nothing is added.' })}
  <h3>Send</h3>${send}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Action: decide (accept, stretch, use them up, peer-to-peer)
export function stretchPlan(c) {
  const u = c.cv.units; const r = c.cv.r; const cl = c.cv.c;
  const until = (r.dates || '').split(' to ')[1] || (cl.authorization && cl.authorization.end) || null;
  if (!until || u.offered == null) return null;
  const start = c.s.today; let days = 0; let x = start;
  while (x < until) { x = c.M.addDays(x, 1); const w = c.M.parse(x).getUTCDay(); if (w !== 0 && w !== 6) days++; }
  days = Math.max(1, days + 1);
  return { until, days, perDay: Math.round(u.offered / days * 10) / 10, perWeek: Math.round(u.offered / days * 5 * 10) / 10, usualWeek: u.rate * 5 };
}
function optionsAction(c) {
  const { cv, ui, st } = c; const r = cv.r; const u = cv.units; const pf = cv.payer.first; const work = D.canWork(c.me);
  if (r.stage === 'denied') {
    return `<section class="d-sect" aria-labelledby="d-h-acc"><div class="d-sect__h"><h2 id="d-h-acc">Accept the denial</h2></div>
    <p>${e(pf)} denied the request. Accepting closes the request in Psyflo: no appeal, no reconsideration. It is logged with your name and the time; nothing is sent to ${e(pf)}.</p>
    <p class="d-sm ui-muted">The guardian may still have appeal rights. Whether anyone else may appeal is not verified.</p>
    ${work ? `<div class="ui-btnrow">${btn('Log: accept the denial', 'accept', { tone: 'danger', data: { mode: 'denial' } })}${btn('Prepare an appeal instead', 'goto', { data: { section: 'action', action: 'appeal' } })}</div>` : needs(c)}</section>`;
  }
  if (r.stage !== 'partial_decide') return `<section class="d-sect"><h2>Decision</h2><p class="ui-muted">The decision on ${e(r.id)} is recorded (${e(c.M.STAGE_LABEL[r.stage] || r.stage)}). Open History for what was logged.</p></section>`;
  const sp = stretchPlan(c); const mode = st.door || 'plain';
  const doors = [
    ['plain', 'Accept as offered', `Record ${u.offered} of ${u.requested} units as awarded. A task asks a person to enter them in Lauris; Psyflo does not.`],
    ['stretch', 'Accept and stretch', sp ? `Spread the ${u.offered} units to last until ${fmtDate(sp.until)}: about ${sp.perWeek} units a week (${sp.perDay} a school day) instead of ${sp.usualWeek}.` : 'No end date is recorded to spread the units to.'],
    ['use_up', 'Accept and use them up', `Keep the same care (${u.rate} a school day). Units run out about ${fmtDate(u.runOut)}; then discharge and start a new initial. Next: the transition dates.`]
  ];
  const card = ([k, t, p]) => `<label class="d-door${mode === k ? ' is-on' : ''}"><input type="radio" name="d-door" value="${k}" data-x="door"${mode === k ? ' checked' : ''}${k === 'stretch' && !sp ? ' disabled' : ''}><span><b>${e(t)}</b><span class="d-sm">${e(p)}</span></span></label>`;
  return `<section class="d-sect" aria-labelledby="d-h-acc"><div class="d-sect__h"><h2 id="d-h-acc">Decide on the offer</h2>${ui.sourceChip(u.assumption)}</div>
  <p class="d-sm ui-muted">Logged on the request with your name and the time. Nothing is sent to ${e(pf)}.</p>
  <fieldset class="d-doors"><legend class="ui-sr">How to accept</legend>${doors.map(card).join('')}</fieldset>
  ${work ? `<div class="ui-btnrow">${btn('Log the decision', 'accept', { tone: 'primary', data: { mode } })}${btn('Ask for a peer-to-peer instead', 'goto', { data: { section: 'action', action: 'p2p' } })}</div>` : needs(c)}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Action: peer-to-peer
function p2pAction(c) {
  const { cv, ui, s, st } = c; const d = cv.d; const r = cv.r; const pf = cv.payer.first; const work = D.canWork(c.me); const doc = (d.docs || {}).p2p; const idx = c.idx();
  if (!['partial_decide', ...D.P2P_STAGES].includes(r.stage)) return `<section class="d-sect"><h2>Peer-to-peer</h2><p class="ui-muted">${r.stage === 'denied' ? `Whether ${e(pf)} takes a peer-to-peer after a final denial is not verified.` : 'There is no open decision to discuss on a call.'}</p></section>`;
  const requested = r.stage === 'partial_decide';
  const ru = rule(s, 'p2p.attempts'); const rec = rule(s, 'p2p.recording_enabled');
  const call = requested ? `<p>No call requested yet.</p><div class="ui-btnrow">${work ? btn(`Ask ${pf} for a peer-to-peer`, 'p2preq', { tone: 'primary' }) : needs(c)}</div><p class="d-sm ui-muted">Logged on the request; ${e(pf)} calls to agree a time, which happens outside Psyflo.</p>`
    : `<dl class="ui-dl"><div class="ui-dl__r"><dt>Call</dt><dd>${r.p2p_at ? `<b>${e(fmtDateTime(r.p2p_at, { dow: true }))}</b>` : '<span class="ui-muted">Date not set</span>'} ${ui.sourceChip(cv.deadlines.find(x => x.kind === 'p2p') || ru)}</dd></div><div class="ui-dl__r"><dt>Reviewer</dt><dd>${e((d.p2p || {}).reviewer || 'Not recorded')}</dd></div><div class="ui-dl__r"><dt>Payer reference</dt><dd>${e((d.p2p || {}).ref || 'Not recorded')}</dd></div><div class="ui-dl__r"><dt>One shot</dt><dd>${e(ru.value)} attempt${ru.value === 1 ? '' : 's'} ${ui.sourceChip(ru)}</dd></div></dl>
      <div class="ui-btnrow">${work ? btn(r.p2p_at ? 'Change the call' : 'Set the call', 'schedule', { sm: true }) + btn(r.stage === 'p2p_awaiting' ? 'Record the decision' : 'Log the outcome', 'outcome', { tone: 'primary', sm: true, disabled: r.stage === 'peer_to_peer_requested' && !r.p2p_at, title: r.stage === 'peer_to_peer_requested' && !r.p2p_at ? 'Set the call first' : '' }) : needs(c)}</div>`;
  const saved = r.p2p_recording;
  const notes = saved ? `<p class="d-sm">Saved ${e(when(saved.at))}${saved.typed ? ' · typed during the call' : ' · recorded with consent'}.</p><blockquote class="ui-quote">${nl(saved.notes || saved.transcript || '')}</blockquote>`
    : `<p class="d-sm ui-muted">Recording is ${rec.value ? 'on' : 'off'} ${ui.sourceChip(rec)}${rec.value ? '' : ' · type notes during the call'}.</p>${ui.draftField({ key: `dc:${d.id}:p2pnotes`, label: rec.value ? 'Transcript, or notes typed during the call' : 'Notes typed during the call', value: '', rows: 4 })}${rec.value ? `<label class="d-check"><input type="checkbox" data-x="consent"${st.consent ? ' checked' : ''}> Everyone on the call agreed to be recorded</label>${btn(st.rec ? 'Stop recording' : 'Record (microphone)', 'rec', { sm: true })}` : ''}<div class="ui-btnrow">${work ? btn('Save notes', 'savenotes', { sm: true }) : ''}</div>`;
  const concerns = d.concerns && d.concerns.length ? `<ul class="d-reasons">${d.concerns.map(x => `<li><blockquote class="ui-quote">${e(x.text)}</blockquote><span class="d-sm ui-muted">${e(x.source)}</span></li>`).join('')}</ul>` : `<p>${ui.evidenceChip({ state: 'missing', label: "the payer's stated concerns" })}</p>`;
  const hist = c.history().slice(0, 4).map(x => `<li><b>${e(fmtDate(x.at))}</b> ${e(x.what)}</li>`).join('');
  const questions = D.clarifyQuestions(s, d, r, idx).map(q => `<li>${e(q)}</li>`).join('');
  const before = c.missing().length ? `<ul class="d-miss-l">${c.missing().map(n => `<li>${ui.evidenceChip({ state: 'missing', label: n.label })}</li>`).join('')}</ul>` : '<p class="ui-muted">Nothing is marked missing.</p>';
  const sample = (s.denial_reasons || []).slice(0, 3);
  const sampleQ = sample.length ? `<details class="d-det"><summary>Questions reviewers often ask ${ui.chip('Sample data, illustrative', { tone: 'outline', size: 'sm' })}</summary><ul>${sample.map(x => `<li>${e(x.reason)}</li>`).join('')}</ul><p class="d-sm ui-muted">Common payer reasons from the seeded sample; the answer must come from this case's records.</p></details>` : '';
  const seededBrief = ((s.request_details || {})[r.id] || {}).brief;
  return `<section class="d-sect" aria-labelledby="d-h-p2p"><div class="d-sect__h"><h2 id="d-h-p2p">Peer-to-peer</h2>${ui.maturity('denial.p2p')}${ui.chip('Clinician only', { tone: 'outline', icon: 'user', title: 'Peer-to-peer is done by licensed clinical staff (rule p2p.requires_licensed)' })}</div>
  <div class="d-grid2"><div class="d-card"><h3>Call</h3>${call}</div><div class="d-card"><h3>Payer concerns</h3>${concerns}${hist ? `<h3>Relevant history</h3><ul class="d-hist4">${hist}</ul>` : ''}</div></div>
  ${docBlock(c, 'p2p', { reviewPrimary: true, emptyNote: 'Talking points from dated stored evidence, each linked to its source. Edit them before the call; nothing is sent.' })}
  <div class="d-grid2"><div class="d-card"><h3>Before the call</h3>${before}<h3>Questions to clarify</h3><ol class="d-q">${questions}</ol>${sampleQ}</div><div class="d-card"><h3>Call notes</h3>${notes}${work ? `<div class="ui-btnrow">${btn('Print call notes', 'print', { sm: true, tone: 'ghost' })}</div>` : ''}${seededBrief ? `<details class="d-det"><summary>Seeded sample brief ${ui.chip('Illustrative sample', { tone: 'outline', size: 'sm' })}</summary><p class="d-sm">${e(seededBrief.open_with)}</p></details>` : ''}</div></div></section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Action: appeal (staff side; the guardian signs on the family portal)
function appealAction(c) {
  const { cv, ui, s, hrefFor } = c; const d = cv.d; const r = cv.r; const doc = (d.docs || {}).appeal; const work = D.canWork(c.me);
  if (!['denied', 'appeal_sent'].includes(r.stage)) return `<section class="d-sect"><h2>Appeal</h2><p class="ui-muted">${r.stage === 'partial_decide' ? 'An appeal follows a final denial. Whether a partial offer can be appealed is not verified for this payer.' : 'There is no denial to appeal on this case.'}</p></section>`;
  const ap = rule(s, 'appeal.window_days'); const dl = cv.deadlines.find(x => x.kind === 'appeal');
  const signed = r.appeal && r.appeal.signed_at; const sentAt = r.appeal && r.appeal.sent_at;
  const step = !doc ? 0 : !doc.reviewed ? 1 : !signed ? 2 : !sentAt ? 3 : 4;
  const stepper = ui.stepper([{ label: 'Draft' }, { label: 'Clinician reviews' }, { label: 'Guardian signs' }, { label: 'Staff send' }, { label: 'Payer answers' }], { current: step, label: 'Appeal steps' });
  const guard = signed ? `<p>${ui.chip('Signed', { tone: 'success', icon: 'check' })} Signed by <b>${e(r.appeal.signer || 'the guardian')}</b> on the family portal · ${e(when(r.appeal.signed_at))}${r.appeal.file ? ` · <a href="${e(r.appeal.file)}" target="_blank" rel="noopener">Open the signed letter (PDF)</a>` : ''}</p>` : doc && doc.reviewed ? `<p>${ui.chip('Ready to review', { tone: 'info', icon: 'eye' })} The guardian can read, change and sign it on the family portal. ${link('Preview the family portal', hrefFor('AppealLetter.dc.html?id=' + r.id), { sm: true, tone: 'ghost' })}</p>` : doc && doc.seeded ? `<p class="ui-muted">The family portal shows the seeded sample letter (Illustrative sample) until you draft your own and a clinician reviews it.</p>` : `<p class="ui-muted">The guardian sees only that a letter is being prepared until a clinician reviews it.</p>`;
  // "Sent" appears only from a stub reference (fax) or a confirmation read off the payer page. "Ready to upload" is a person's note, not a send.
  const readyAt = !sentAt && r.appeal && r.appeal.status === 'ready_to_upload' ? r.appeal.ready_at : null;
  const portalLbl = r.channel === 'fax' ? '' : c.M.CHANNEL_LABEL[r.channel];
  const openLink = `<p>${link('Open ' + portalLbl + ' (opens a new tab)', c.extUrl + '/' + r.channel + '/upload?request=' + encodeURIComponent(r.id) + '&kind=appeal', { sm: true, blank: true })}</p>`;
  const send = sentAt ? `<p>${ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' })} ${r.channel === 'fax' ? 'Sent through simulated Sfax' : 'Sent in ' + e(portalLbl) + ' · confirmation <b>' + e(r.appeal.ref) + '</b> (read from the open page)'}${r.channel === 'fax' && r.appeal.ref ? ' · ref <b>' + e(r.appeal.ref) + '</b>' : ''} · ${e(when(sentAt))} by ${e(c.M.staff(s, r.appeal.sent_by).name)}</p>${work && D.canRecord(c.me) ? `<div class="ui-btnrow">${btn('Record the payer answer', 'outcome', { tone: 'primary' })}</div>` : ''}`
    : readyAt ? `<p>${ui.chip('Ready to upload', { tone: 'warning', icon: 'clock' })} ${ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' })} Marked ready by <b>${e(c.M.staff(s, r.appeal.ready_by).name)}</b> · ${e(when(readyAt))}</p><p><b>Not sent yet.</b> A person uploads the signed letter in ${e(portalLbl)}, in their own login. Psyflo records the send only when the ${e(portalLbl)} page shows a confirmation number.</p>${openLink}`
    : signed ? `<div class="ui-btnrow">${D.canSend(c.me) ? btn(r.channel === 'fax' ? 'Send the signed letter' : 'Mark ready for upload', 'send', { tone: 'primary', data: { doc: 'appeal' } }) : needs(c, 'Needs the send capability')}</div><p class="d-sm ui-muted">${r.channel === 'fax' ? 'A person at Harvest reviews the signed letter and presses Send. Signing is not sending.' : 'A person at Harvest reviews the signed letter, marks it ready and uploads it in ' + e(portalLbl) + '. Signing is not sending, and neither is marking it ready.'}</p>` : '';
  return `<section class="d-sect" aria-labelledby="d-h-app"><div class="d-sect__h"><h2 id="d-h-app">Appeal</h2>${ui.maturity('denial.appeal')}${ui.chip('Guardian-led', { tone: 'info', icon: 'user' })}${ui.chip('Provider path: Not verified', { tone: 'warning', icon: 'alert', title: `${ruleValue(s, 'appeal.initiators', ['guardian']).join(', ')} may appeal in this demo; whether a provider may appeal with consent is not verified.` })}</div>
  ${stepper}
  <p class="d-clock">${dl ? ui.chip(dl.date ? `${dl.label} · ${when(dl.date)}` : dl.label, { tone: dl.sev === 'overdue' ? 'danger' : 'neutral', icon: 'clock', detail: dl.days != null ? (dl.days < 0 ? `${-dl.days} d late` : `${dl.days} d`) : '' }) : ''}${ui.sourceChip(ap)}<span class="d-sm ui-muted">${e(dl ? dl.source : '')}</span></p>
  <p class="d-sm ui-muted">A parent or guardian can appeal. Ask Harvest who else can. Psyflo prepares the letter; it never exercises appeal rights for a guardian.</p>
  ${docBlock(c, 'appeal', { emptyNote: 'A plain-language letter for the guardian from stored records. The guardian reads, changes and signs it; staff review the signed letter and press Send.' })}
  <h3>Guardian</h3>${guard}
  <h3>Send</h3>${send || '<p class="ui-muted d-sm">After the guardian signs, staff review the signed letter and press Send.</p>'}</section>`;
}

// ------------------------------------------------------------------------------------------------------------------ Action: reconsideration
function reconAction(c) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const doc = (d.docs || {}).recon; const work = D.canWork(c.me); const rc = rule(s, 'appeal.reconsideration_days');
  if (d.path !== 'recon') return `<section class="d-sect" aria-labelledby="d-h-rec"><div class="d-sect__h"><h2 id="d-h-rec">Reconsideration</h2>${ui.chip('Payer rule not verified', { tone: 'warning', icon: 'alert' })}</div><p>Ask ${e(cv.payer.first)} for additional review of this decision. Whether this payer has a reconsideration step, and its deadline, are not verified.</p>${['partial_decide', 'denied'].includes(r.stage) && work && !(d.tried || []).includes('recon') ? `<div class="ui-btnrow">${btn('Prepare a request', 'choose', { tone: 'primary', data: { path: 'recon' } })}</div>` : `<p class="ui-muted">${(d.tried || []).includes('recon') ? 'Already requested for this decision.' : 'Not available now.'}</p>`}</section>`;
  const sent = doc && doc.sent;
  const send = sent ? sentLine(c, 'recon') + (D.canRecord(c.me) ? `<div class="ui-btnrow">${btn('Record the payer answer', 'outcome', { tone: 'primary' })}</div>` : '')
    : doc && doc.reviewed && work ? `<div class="ui-btnrow">${btn(r.channel === 'fax' ? 'Send by fax' : `Open ${c.M.CHANNEL_LABEL[r.channel]} and send`, 'send', { tone: 'primary', data: { doc: 'recon' } })}</div><p class="d-sm ui-muted">${r.channel === 'fax' ? 'A person presses Send; the Sfax stub (simulated) returns the reference.' : 'A person sends it in their own login and types the confirmation number they see.'}</p>` : '<p class="ui-muted d-sm">Draft and review the request to unlock Send.</p>';
  return `<section class="d-sect" aria-labelledby="d-h-rec"><div class="d-sect__h"><h2 id="d-h-rec">Reconsideration</h2>${ui.chip('Payer rule not verified', { tone: 'warning', icon: 'alert' })}${ui.sourceChip(rc)}</div>
  <p class="d-sm ui-muted">Not sent yet. No deadline is on file for this step.</p>
  ${docBlock(c, 'recon', { emptyNote: 'A request for additional review, from stored records. It is signed and sent by a person.' })}
  <h3>Send</h3>${send}
  ${work && !sent ? `<div class="ui-btnrow">${btn('Do not pursue', 'choose', { sm: true, tone: 'ghost', data: { path: 'none' } })}</div>` : ''}</section>`;
}

export function actionSection(c) {
  if (!c.cv.open && !c.st.action) {
    const d = c.cv.d;
    return `<section class="d-sect" aria-labelledby="d-h-done"><h2 id="d-h-done">Closed</h2><p><b>${e(d.outcome ? d.outcome.text : 'This case is closed.')}</b>${d.outcome && d.outcome.doc_ref ? ' · document ' + e(d.outcome.doc_ref) : ''} · ${e(when(d.closed))}</p><p class="ui-muted">A closed case is write-once. A new payer decision on this request opens a new case.</p><div class="ui-btnrow">${btn('Open History', 'tab', { data: { section: 'history' } })}${link('Open authorization', c.hrefFor('Authorizations.dc.html?id=' + c.cv.r.id), { tone: 'primary' })}</div></section>`;
  }
  const k = c.st.action || defaultAction(c.cv);
  const body = { info: infoAction, options: optionsAction, p2p: p2pAction, appeal: appealAction, reconsider: reconAction }[k] || optionsAction;
  return body(c);
}

// ------------------------------------------------------------------------------------------------------------------ slide-over panels (Analyze · Missing evidence · Clinical review)
export function panelBody(c, k) {
  const { cv, ui, s } = c; const d = cv.d; const r = cv.r; const idx = c.idx();
  if (k === 'analyze') {
    const all = D.weakPoints(s, d, r, idx);
    return `<p class="d-sm ui-muted">Read from the stored records of this case, rule-based. ${ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim', title: 'No language model is called and no likelihood is given.' })} Analyzed ${e(when(d.analysis && d.analysis.at))}.</p><div class="d-wk">${all.slice(0, 5).map(w => weakRow(c, w, true)).join('') || '<p class="ui-muted">No weak points found in the stored records.</p>'}</div>${all.length > 5 ? `<p class="d-sm ui-muted">${all.length - 5} more in the full analysis.</p>` : ''}<div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-px="tab" data-section="weak">Open the full analysis</button></div>`;
  }
  if (k === 'gaps') {
    const need = c.missing();
    return `<p class="d-sm ui-muted">Each item below is marked Evidence missing in the drafts until it is documented.</p>${need.length ? `<ul class="d-miss-l d-miss-l--col">${need.map(n => `<li>${ui.evidenceChip({ state: 'missing', label: n.label })}${c.laurisUrl && c.canLauris ? `<a class="ui-btn ui-btn--ghost ui-btn--sm" href="${e(c.laurisUrl)}" target="_blank" rel="noopener">Collect in Lauris${ui.icon('external', 14)}<span class="ui-sr"> (opens Lauris in a new tab)</span></a>` : ''}</li>`).join('')}</ul>` : '<p class="ui-muted">Nothing is marked missing for this case.</p>'}${need.length ? `<div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-px="tab" data-section="docreq">Request additional documentation</button></div>` : ''}`;
  }
  if (k === 'review') {
    const clin = (s.staff || []).filter(x => x.role === 'clinician'); const cur = d.review;
    const res = D.stepResults(s, d, r, idx);
    const found = D.STEP_LIST.filter(([kk]) => res[kk] && kk !== 'review').map(([kk, l]) => `<li>${e(l)} <span class="d-sm ui-muted">· ${e(res[kk])}</span></li>`).join('');
    return `<div class="d-f"><label for="d-rv">Reviewer</label><select class="ui-select" id="d-rv">${clin.map(x => `<option value="${e(x.id)}"${(cur ? cur.to : d.owner) === x.id ? ' selected' : ''}>${e(x.name)}${x.credential ? ', ' + e(x.credential) : ''} · ${e(x.title || x.role)}</option>`).join('')}</select><span class="d-modal-note">A licensed clinician reviews the case. This records who was asked and when; it sends nothing.</span></div>
    <div class="d-f"><label for="d-rvn">Note for the reviewer (optional)</label><textarea class="ui-textarea" id="d-rvn" rows="3" maxlength="400" style="width:100%;padding:8px 12px">${e(cur && cur.note || '')}</textarea></div>
    <h3 class="d-sm">What the reviewer will find</h3>${found ? `<ul class="d-q">${found}</ul>` : '<p class="d-sm ui-muted">No step has a result yet. The reviewer starts from the stored records.</p>'}`;
  }
  return '';
}
