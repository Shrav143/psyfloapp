// Denial Intelligence selectors (pure; imported by the server action file and by the browser).
//
// One lifecycle: `request.stage`. A dispute (state.disputes) is the working layer on a request that needs a payer-decision response:
// owner, chosen path, drafts, call details. Its `status` is DERIVED from the request and the dispute here (deriveStatus), and
// reconciled after every action by server/psyflo/actions/x-disputes.js, so the queue, the Authorizations queue, the nav count and
// Analytics never disagree. Nothing here invents a deadline, a rate or a clinical statement: deadlines carry the rule that
// produced them, drafts are built only from stored evidence, and what is missing is printed "Evidence missing — verify …".
import { addDays, addBusinessDays, daysBetween, hoursBetween, fmtDate, fmtDateTime, fmtTime } from '../dates.js';
import { today as clockToday, now as clockNow } from '../clock.js';
import { rule, ruleValue } from '../rules.js';
import { can } from '../permissions.js';
import { byId, client as clientOf, payer as payerOf, staff as staffOf, appealDeadline, requestHistory, CHANNEL_LABEL, STAGE_LABEL } from '../model.js';

// ---------------------------------------------------------------------------------------------------------------- vocabulary
export const ADVERSE = ['partial_decide', 'info_requested', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent'];
export const P2P_STAGES = ['peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting'];
// statuses the nav count treats as closed (web/js/shared/nav.js OPEN_DISPUTE)
export const CLOSED_STATUS = ['accepted', 'overturned', 'partover', 'upheld', 'resolved', 'closed'];
export const ISSUE_LABEL = { partial: 'Partial approval', info: 'Information request', denial: 'Denial' };
export const PATH_LABEL = { accept: 'Accept the decision', info: 'Provide the requested information', p2p: 'Peer-to-peer', recon: 'Reconsideration', appeal: 'Appeal', discharge: 'Care transition' };
export const VIA_LABEL = { phone: 'Phone call', availity: 'Availity', fax: 'Fax', letter: 'Letter', portal: 'Payer portal' };
export const DOC_TITLE = { info: 'Reply to the information request', p2p: 'Peer-to-peer talking points', appeal: 'Appeal letter for the guardian', recon: 'Reconsideration request' };
export const SENSITIVE = 'sensitive';
// Queue filter groups for the Status select (value '' means Open)
export const STATUS_FILTERS = [['', 'Open'], ['decide', 'Decision needed'], ['info', 'Information'], ['p2p', 'Peer-to-peer'], ['recon', 'Reconsideration'], ['appeal', 'Appeal'], ['closed', 'Closed'], ['all', 'All']];
const STATUS_GROUP = { decide: 'decide', 'info-req': 'info', drafted: 'info', 'p2p-prep': 'p2p', p2p: 'p2p', 'recon-prep': 'recon', recon: 'recon', 'appeal-prep': 'appeal', appeal: 'appeal' };
export const NEXT_GROUPS = [['decide', 'Decide'], ['prepare', 'Prepare'], ['review', 'Review'], ['send', 'Send'], ['call', 'Call'], ['record', 'Record outcome'], ['wait', 'Waiting']];

const firstWord = s => String(s || '').split(/[\s·]/)[0];
export const payerFirst = (s, id) => id === 'ffs' ? 'Medicaid FFS' : firstWord(payerOf(s, id).name);
export const payerName = (s, id) => payerOf(s, id).name || id;
const NUM_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const nw = n => NUM_WORD[n] != null && n <= 10 ? NUM_WORD[n] : String(n);
const cap = t => String(t || '').replace(/^./, c => c.toUpperCase());
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${MON_LONG[m - 1]} ${d}, ${y}`; };
export const missing = what => `[Evidence missing — verify ${what}]`;
export const MISSING_RE = /\[Evidence missing — verify [^\]]*\]/g;

// ---------------------------------------------------------------------------------------------------------------- who may do what
export const canWork = me => !!me && can(me, 'payer.reply');                         // reply, prepare, choose (clinician)
export const canRecord = me => !!me && can(me, 'payer.decision');                    // record a payer decision (with its document)
export const canSend = me => !!me && can(me, 'send.packet');
export const canReadClinical = me => !!me && can(me, 'drafts.clinical');             // evidence text, drafts, call notes (clinician only; the server projection matches)

// ---------------------------------------------------------------------------------------------------------------- lookups
export const isOpen = d => !!d && d.closed == null;
export const disputesOf = s => (s && Array.isArray(s.disputes)) ? s.disputes : [];
// the open dispute of a request, else the latest closed one
export function byRequest(s, id) {
  const all = disputesOf(s).filter(d => d.request === id);
  return all.find(isOpen) || all.slice().sort((a, b) => String(a.closed || '') < String(b.closed || '') ? 1 : -1)[0] || null;
}
export const byDisputeId = (s, id) => disputesOf(s).find(d => d.id === id) || null;
export const issueOfRequest = r => r.stage === 'info_requested' || r.stage === 'portal_open' ? 'info' : r.stage === 'denied' || r.stage === 'appeal_sent' ? 'denial' : 'partial';
export const ownerName = (s, id) => id ? (staffOf(s, id).name || id) : '';
export const ownerShort = (s, id) => id ? (staffOf(s, id).name || id).replace(/^(\w)\w+ /, '$1. ') : '—';

// ---------------------------------------------------------------------------------------------------------------- status and path (derived)
export function derivePath(d, r) {
  if (!r) return d.path || null;
  switch (r.stage) {
    case 'info_requested': case 'portal_open': return 'info';
    case 'peer_to_peer_requested': case 'peer_to_peer_booked': case 'p2p_awaiting': return 'p2p';
    case 'appeal_sent': return 'appeal';
    case 'partial_decide': case 'denied': return d.path && d.path !== 'info' && d.path !== 'p2p' ? d.path : null;
    default: return d.path || null;
  }
}
export function deriveStatus(s, d, r) {
  if (!r) return d.status;
  const dc = k => ((d.docs || {})[k] || {});
  switch (r.stage) {
    case 'info_requested': return dc('info').reviewed ? 'drafted' : 'info-req';
    case 'portal_open': return r.info_reply_pending ? 'drafted' : d.status;
    case 'peer_to_peer_requested': return 'p2p-prep';
    case 'peer_to_peer_booked': return r.p2p_at ? 'p2p' : 'p2p-prep';
    case 'p2p_awaiting': return 'p2p';
    case 'appeal_sent': return 'appeal';
    case 'partial_decide': case 'denied': {
      if (d.path === 'recon') return dc('recon').sent ? 'recon' : 'recon-prep';
      if (d.path === 'appeal' && r.stage === 'denied') return 'appeal-prep';
      return 'decide';
    }
    default: return d.status;
  }
}
export const statusGroup = status => STATUS_GROUP[status] || (CLOSED_STATUS.includes(status) ? 'closed' : 'decide');

// ---------------------------------------------------------------------------------------------------------------- units
export function rateFor(s, r) { return /after-school/i.test(r.service || '') ? 1 : ruleValue(s, 'units.rate_per_school_day', 3); }
// what the offered/awarded units mean at the run-out rate (an assumption, always shown with its rule chip)
export function unitsView(s, d, r) {
  const c = clientOf(s, r.client); const a = c.authorization || {};
  const requested = r.units_requested || (d.units && d.units.requested) || 0;
  const awarded = r.units_awarded != null ? r.units_awarded : null;
  const offered = r.units_offered != null ? r.units_offered : (awarded == null && d.units && d.units.offered != null ? d.units.offered : null);
  const current = offered != null ? offered : awarded != null ? awarded : (a.payer === r.payer ? a.units : null);
  const rate = rateFor(s, r);
  const today = clockToday(s);
  const start = a.payer === r.payer && a.start && a.start > today ? a.start : today;
  const days = current != null && rate > 0 ? Math.ceil(current / rate) : null;
  const runOut = a.exhausted || (days != null ? addBusinessDays(start, Math.max(0, days - 1)) : null);
  const [, end] = String(r.dates || '').split(' to ');
  const reqDays = rate > 0 ? Math.ceil(requested / rate) : null;
  return { requested, offered, awarded, current, rate, days, weeks: days != null ? Math.round(days / 5 * 10) / 10 : null, runOut, windowEnd: end || a.end || null, reqDays, reqWeeks: reqDays != null ? Math.round(reqDays / 5 * 10) / 10 : null, assumption: rule(s, 'units.rate_per_school_day') };
}

// ---------------------------------------------------------------------------------------------------------------- deadlines (each with its source)
const sevOfDate = (s, date, hourly) => {
  if (!date) return 'none';
  if (hourly && String(date).includes('T')) { const h = hoursBetween(clockNow(s), date); return h < 0 ? 'overdue' : h <= 12 ? 'soon' : 'ok'; }
  const n = daysBetween(clockToday(s), String(date).slice(0, 10));
  return n < 0 ? 'overdue' : n <= 1 ? 'soon' : 'ok';
};
export function deadlinesOf(s, d, r) {
  if (!d || !r || !isOpen(d)) return [];
  const out = []; const pf = payerFirst(s, r.payer);
  const add = o => out.push({ ...o, sev: o.sev || sevOfDate(s, o.date, o.hourly), days: o.date ? daysBetween(clockToday(s), String(o.date).slice(0, 10)) : null });
  const verify = (key, o = {}) => { const ru = rule(s, key); return { category: ru.category, source: o.source || ru.source, verified_on: ru.verified_on, note: o.note || ru.note }; };
  switch (r.stage) {
    case 'info_requested': case 'portal_open':
      add({ kind: 'reply', label: 'Reply due', date: r.reply_due || null, hourly: true, ...verify('info_request.hours', { note: 'The payer message states its own deadline and that wins; the rule is only the fallback.' }) });
      break;
    case 'partial_decide':
      add({ kind: 'reply', label: 'Reply by', date: r.reply_by || null, category: 'PAYER-SPECIFIC', source: `Stated by ${pf}${r.offer_call ? ' on the ' + fmtDate(r.offer_call) + ' call (call log)' : ''}`, verified_on: null, note: '' });
      break;
    case 'peer_to_peer_booked': case 'peer_to_peer_requested':
      if (r.p2p_at) add({ kind: 'p2p', label: 'Peer-to-peer call', date: r.p2p_at, hourly: false, category: 'PAYER-SPECIFIC', source: `Agreed with ${pf} by phone (recorded by staff)`, verified_on: null, note: '' });
      else add({ kind: 'p2p', label: 'Call date not set', date: null, ...verify('p2p.attempts', { note: `${pf} calls to agree a time; enter it when set.` }) });
      break;
    case 'p2p_awaiting':
      add({ kind: 'decision', label: 'Waiting for the decision', date: null, ...verify('decision.overdue_after_days', { note: 'No payer deadline is on file for this step.' }) });
      break;
    case 'denied': {
      const ad = appealDeadline(s, r); const ru = rule(s, 'appeal.window_days');
      add({ kind: 'appeal', label: 'Appeal window closes', date: ad, category: ru.category, source: `${ru.value} days from the notice dated ${fmtDate(r.notice_date || r.denied_on || '', { year: true }) || 'not recorded'}; confirm on the letter`, verified_on: ru.verified_on, note: ru.source });
      break;
    }
    case 'appeal_sent':
      add({ kind: 'appeal', label: 'Payer appeal clock', date: null, category: 'UNVERIFIED-DEMO-ASSUMPTION', source: 'No payer appeal timeline is on file for this payer.', verified_on: null, note: '' });
      break;
    default: break;
  }
  if (d.path === 'recon' && ['partial_decide', 'denied'].includes(r.stage)) add({ kind: 'recon', label: 'Reconsideration window', date: null, ...verify('appeal.reconsideration_days', { note: 'Payer rule not verified.' }) });
  return out;
}
export const primaryDeadline = list => (list || []).filter(x => x.date).sort((a, b) => String(a.date) < String(b.date) ? -1 : 1)[0] || (list || [])[0] || null;

// ---------------------------------------------------------------------------------------------------------------- next action (derived, so it always agrees with the stage)
export function nextAction(s, d, r) {
  if (!isOpen(d)) return { label: 'Closed', group: 'done' };
  const dc = k => ((d.docs || {})[k] || {}); const has = k => !!(dc(k).sections || dc(k).gen); const channel = r.channel;
  const docStep = (k, nouns, sendLabel) => !has(k) ? { label: `Draft the ${nouns}`, group: 'prepare' } : !dc(k).reviewed ? { label: `Review the ${nouns}`, group: 'review' } : { label: sendLabel, group: 'send' };
  switch (deriveStatus(s, d, r)) {
    case 'info-req': return docStep('info', 'reply', channel === 'fax' ? 'Send the reply by fax' : `Send the reply in ${CHANNEL_LABEL[channel] || 'the portal'}`);
    case 'drafted': return r.stage === 'portal_open' ? { label: 'Waiting for the portal confirmation', group: 'wait' } : { label: channel === 'fax' ? 'Send the reply by fax' : `Send the reply in ${CHANNEL_LABEL[channel] || 'the portal'}`, group: 'send' };
    case 'p2p-prep': return !has('p2p') ? { label: 'Prepare the talking points', group: 'prepare' } : !dc('p2p').reviewed ? { label: 'Review the talking points', group: 'review' } : { label: 'Enter the call date when the payer calls', group: 'call' };
    case 'p2p': {
      if (r.stage === 'p2p_awaiting') return { label: 'Record the payer decision', group: 'record' };
      if (!has('p2p')) return { label: 'Prepare the talking points', group: 'prepare' };
      if (!dc('p2p').reviewed) return { label: 'Review the talking points', group: 'review' };
      return r.p2p_at && r.p2p_at.slice(0, 10) < clockToday(s) ? { label: 'Log the call outcome', group: 'record' } : { label: `Hold the call (${fmtDate(r.p2p_at)}) and record the outcome`, group: 'call' };
    }
    case 'recon-prep': return docStep('recon', 'request', channel === 'fax' ? 'Send the request by fax' : 'Send the request in the payer portal');
    case 'recon': return { label: 'Record the payer answer', group: 'record' };
    case 'appeal-prep': {
      const a = dc('appeal');
      if (!(a.sections || a.gen)) return { label: 'Draft the appeal letter', group: 'prepare' };
      if (!a.reviewed) return { label: 'Review the letter', group: 'review' };
      if (r.appeal && r.appeal.signed_at) return r.appeal.status === 'ready_to_upload' ? { label: `Upload the signed letter in ${CHANNEL_LABEL[channel] || 'the portal'} · waiting for its confirmation`, group: 'wait' } : { label: channel === 'fax' ? 'Review the signed letter and send it' : 'Review the signed letter and mark it ready to upload', group: 'send' };
      return { label: 'Waiting for the guardian to sign', group: 'wait' };
    }
    case 'appeal': return { label: 'Record the payer answer', group: 'record' };
    default: return d.issue === 'denial' ? { label: 'Choose how to respond', group: 'decide' } : { label: 'Decide on the offer', group: 'decide' };
  }
}

// ---------------------------------------------------------------------------------------------------------------- evidence
const SENS = e => e.sensitivity === SENSITIVE;
const behaviorWord = b => ({ 'physical aggression': 'physical aggression', elopement: 'elopement from class' }[b] || b || 'incident');
const dateList = rows => {
  const sorted = rows.slice().sort((a, b) => a.date < b.date ? -1 : 1); const out = []; let lastMon = '';
  for (const e of sorted) { const [, m, dd] = e.date.split('-'); const mon = fmtDate(e.date).split(' ')[0]; out.push(mon === lastMon ? String(+dd) : fmtDate(e.date)); lastMon = mon; }
  return out.length > 1 ? out.slice(0, -1).join(', ') + ' and ' + out.at(-1) : out[0] || '';
};
const minutesText = rows => { const m = rows.map(e => e.minutes); if (m.some(x => x == null)) return null; const lo = Math.min(...m), hi = Math.max(...m); return lo === hi ? `about ${lo} minutes` : `${lo} to ${hi} minutes`; };
const intensityText = rows => { const v = [...new Set(rows.map(e => e.intensity))]; return v.some(x => !x) ? null : v.join(' to '); };

// The evidence index of a case: every stored dated record about the client that a draft may cite, numbered in date order.
// `read` false = the viewer may not read clinical text: counts only. Sensitive records are listed but not used unless included.
export function evidenceIndex(s, d, r, { read = true } = {}) {
  const c = clientOf(s, r.client); const today = clockToday(s);
  const window = ruleValue(s, 'evidence.current_window_days', 30); const since = addDays(today, -window);
  const excluded = new Set((d && d.excluded) || []); const included = new Set((d && d.included) || []);
  const rows = [];
  for (const e of (s.dispute_evidence || []).filter(e => e.client === r.client)) rows.push({ ...e });
  for (const i of (s.incidents || []).filter(i => i.client === r.client)) rows.push({ id: `EV-INC-${String(i.date).slice(0, 10)}`, client: r.client, kind: 'incident_report', date: String(i.date).slice(0, 10), label: `Level ${i.level} incident report`, quote: i.what, source: 'Incident report (state portal clock)', sensitivity: SENSITIVE, provenance: 'record' });
  for (const n of (s.notes || []).filter(n => n.client === r.client && (n.narrative || n.text || (n.fields && n.fields.narrative)))) rows.push({ id: `EV-NOTE-${n.id}`, client: r.client, kind: 'daily_note', date: String(n.date || '').slice(0, 10), label: 'Daily progress note', quote: String(n.narrative || n.text || n.fields.narrative).slice(0, 300), source: `Daily note · ${fmtDate(n.date)}`, provenance: 'record' });
  if (c.safety_plan_date && !rows.some(e => e.kind === 'safety_plan')) rows.push({ id: `EV-SP-${r.client}`, client: r.client, kind: 'safety_plan', date: c.safety_plan_date, label: 'Safety plan reviewed', quote: `Safety plan reviewed on ${fmtDate(c.safety_plan_date)}.`, source: 'Clinical record · safety plan', provenance: 'record' });
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1);
  const items = rows.map((e, i) => {
    const state = excluded.has(e.id) ? 'excluded' : SENS(e) && !included.has(e.id) ? 'sensitive' : 'sourced';
    const current = !!e.date && e.date >= since;
    return { ...e, n: i + 1, state, current, usable: state === 'sourced', reason: state === 'sensitive' ? 'Sensitive: kept out of drafts unless a clinician includes it' : state === 'excluded' ? 'Excluded by a clinician' : '' };
  });
  const usable = items.filter(e => e.usable);
  const needs = [];
  const need = (key, label, ok) => { if (!ok) needs.push({ key, label }); };
  const cur = k => usable.filter(e => e.kind === k && e.current);
  need('incidents', 'dated incidents in the last ' + window + ' days', cur('incident').length > 0);
  const priors = usable.filter(e => e.kind === 'prior_service');
  const reqFields = ruleValue(s, 'evidence.prior_service_required_fields', ['provider', 'dates', 'outcome']);
  const priorOk = p => (!reqFields.includes('provider') || p.provider) && (!reqFields.includes('dates') || p.from) && (!reqFields.includes('outcome') || p.outcome);
  need('prior', 'previous treatment outcome', priors.some(priorOk));
  const svcs = usable.filter(e => e.kind === 'current_service');
  const askedServices = ((d && d.concerns) || []).some(x => /other services|connected|already/i.test(x.text));
  if (svcs.length || askedServices) need('services', 'current services and why each is insufficient alone', svcs.length > 0 && svcs.every(x => x.outcome || x.insufficient));
  if (r.stage !== 'info_requested' && issueOfRequest(r) !== 'denial') need('risk', 'the risk of a more restrictive setting', usable.some(e => e.kind === 'placement_risk'));
  if (r.type !== 'initial') need('isp', 'ISP objective progress counts for the period', (c.goals && c.goals.length) || usable.some(e => e.kind === 'isp_goal'));
  const notice = (d && d.notice) || {};
  const ledger = (r.decision_log || []).filter(x => x.kind === 'initial' && !x.superseded_by).at(-1);
  need('notice', 'the document reference for the payer decision', !!(ledger && ledger.doc_ref) || !!notice.doc_ref);
  return { items, usable, needs, window, since, counts: { documented: items.length, usable: usable.length, missing: needs.length, held: items.filter(e => !e.usable).length }, read };
}
export const evidenceById = (idx, id) => idx.items.find(e => e.id === id) || null;
// options for ui.evidenceChip from an index row
export function chipOpts(e) {
  if (!e) return { state: 'missing', label: 'this statement' };
  return { n: e.n, label: e.label, date: fmtDate(e.date), quote: e.quote, source: e.source + (e.provenance === 'seed' ? ' · Illustrative sample' : ''), state: e.state, reason: e.reason };
}

// ---------------------------------------------------------------------------------------------------------------- drafts (built only from stored evidence; rule-based, labelled Simulated)
const periodEnd = (idx) => addDays(idx.since, idx.window);
const incidentsFor = (idx) => idx.usable.filter(e => e.kind === 'incident' && e.current);
const sentenceIncidents = (idx, name) => {
  const rows = incidentsFor(idx);
  if (!rows.length) return { text: missing('dated incidents in the last ' + idx.window + ' days'), ids: [], miss: ['dated incidents in the last ' + idx.window + ' days'] };
  const by = {}; rows.forEach(e => { (by[e.behavior || 'incident'] = by[e.behavior || 'incident'] || []).push(e); });
  const parts = Object.entries(by).map(([b, list]) => `${nw(list.length)} incident${list.length === 1 ? '' : 's'} of ${behaviorWord(b)} (${dateList(list)})`);
  const mins = minutesText(rows); const inten = intensityText(rows); const miss = [];
  let tail = '';
  if (mins) tail += `, each lasting ${mins}`; else { tail += ` ${missing('the duration of each incident')}`; miss.push('the duration of each incident'); }
  if (inten) tail += ` at ${inten} intensity`; else { tail += ` ${missing('the intensity of each incident')}`; miss.push('the intensity of each incident'); }
  const unstructured = rows.filter(e => e.setting === 'unstructured');
  const where = rows.every(e => e.setting) && unstructured.length ? ` ${cap(nw(unstructured.length))} of the ${nw(rows.length)} happened in unstructured periods (${[...new Set(unstructured.map(e => e.where))].join(', ')}).` : '';
  return { text: `Between ${fmtDate(idx.since)} and ${fmtDate(periodEnd(idx))}, the school reported ${parts.join(' and ')}${tail}.${where}`, ids: rows.map(e => e.id), miss };
};
const monthName = ym => MON_LONG[+String(ym).slice(5, 7) - 1];
// "2026-01" to "2026-04" -> "January to April 2026"; open end -> "since September 2025"
const spanText = (from, to) => {
  if (!from) return '';
  const ym = x => String(x).length === 7;
  if (!to) return `since ${ym(from) ? monthName(from) + ' ' + from.slice(0, 4) : fmtDate(from, { year: true })}`;
  if (ym(from) && ym(to)) return from.slice(0, 4) === to.slice(0, 4) ? `${monthName(from)} to ${monthName(to)} ${to.slice(0, 4)}` : `${monthName(from)} ${from.slice(0, 4)} to ${monthName(to)} ${to.slice(0, 4)}`;
  return `${fmtDate(from, { year: true })} to ${fmtDate(to, { year: true })}`;
};
const sentencePrior = (idx) => {
  const priors = idx.usable.filter(e => e.kind === 'prior_service');
  if (!priors.length) return { text: missing('previous treatment outcome'), ids: [], miss: ['previous treatment outcome'] };
  const miss = [];
  const text = priors.map(p => {
    let t = `${p.label}${p.from ? ', ' + spanText(p.from, p.to) : ''}${p.sessions ? ', ' + nw(p.sessions) + ' sessions' : ''}`;
    if (!p.from) { t += ` ${missing('the dates of ' + (p.provider || 'this service'))}`; miss.push('dates of ' + (p.provider || 'prior service')); }
    if (p.outcome) t += `. Outcome: ${p.outcome}`; else { t += `. ${missing('the outcome of ' + (p.provider || 'this service'))}`; miss.push('outcome of ' + (p.provider || 'prior service')); }
    return t;
  }).join(' ');
  return { text, ids: priors.map(p => p.id), miss };
};
const sentenceCurrent = (idx) => {
  const svcs = idx.usable.filter(e => e.kind === 'current_service');
  if (!svcs.length) return null;
  const miss = [];
  const text = 'Care coordination (not a prior failed service): ' + svcs.map(x => {
    let t = `${x.label}${x.from ? ' ' + spanText(x.from, x.to) : ''}`;
    if (x.outcome) t += `. ${x.outcome}`; else { t += `. ${missing('why ' + x.label.toLowerCase() + ' is not enough on its own')}`; miss.push('why ' + x.label.toLowerCase() + ' is insufficient alone'); }
    return t;
  }).join(' ');
  return { text, ids: svcs.map(x => x.id), miss };
};
const sentenceIep = (idx, rows) => {
  const iep = idx.usable.filter(e => e.kind === 'iep');
  if (!iep.length) return { text: missing('the current IEP supports'), ids: [], miss: ['current IEP supports'] };
  const e = iep.at(-1); const sup = (e.supports || []).join(', ');
  const incs = incidentsFor(idx); const unstructured = incs.filter(x => x.setting === 'unstructured');
  let t = `The IEP (${e.label.replace(/^IEP /i, '')}) lists ${sup || missing('the supports it lists')}.`;
  const miss = [];
  if (incs.length && incs.every(x => x.setting)) t += ` ${cap(nw(unstructured.length))} of the ${nw(incs.length)} incidents in the last ${idx.window} days happened in unstructured periods (${[...new Set(unstructured.map(x => x.where))].join(', ')}).`;
  t += ` ${missing('why these supports are not enough on their own (the clinician states this)')}`; miss.push('why the IEP supports are not enough');
  return { text: t, ids: [e.id, ...incs.map(x => x.id)], miss };
};
const sentenceRisk = (idx) => {
  const e = idx.usable.find(x => x.kind === 'placement_risk');
  return e ? { text: `${e.quote}`, ids: [e.id], miss: [] } : { text: missing('the risk of a more restrictive setting'), ids: [], miss: ['risk of a more restrictive setting'] };
};
const sentenceOffice = (idx) => {
  const rows = idx.usable.filter(e => e.kind === 'office_referral' && e.current);
  return rows.length ? { text: `${cap(nw(rows.length))} office referral${rows.length === 1 ? '' : 's'} in the last ${idx.window} days (${dateList(rows)}).`, ids: rows.map(e => e.id), miss: [] } : null;
};
const clinicianOf = (s, d) => staffOf(s, d.owner || 'jperez');
const kidWord = c => c.sex === 'F' ? 'girl' : c.sex === 'M' ? 'boy' : 'student';
const schoolLevel = (s, c) => { const sc = byId(s.schools, c.school) || {}; return { level: sc.level, locality: sc.locality }; };

// An info-request ask matched to the stored records that answer it
function answerAsk(s, d, r, idx, ask) {
  if (/incident|aggress|behavio|frequen|durat/i.test(ask)) { const a = sentenceIncidents(idx); const off = sentenceOffice(idx); const scr = idx.usable.find(e => e.kind === 'screening'); return { text: [a.text, off && off.text, scr && `At the screening call on ${fmtDate(scr.date)} the guardian reported ${scr.quote.replace(/^Guardian reported /, '')}`].filter(Boolean).join(' '), ids: [...a.ids, ...(off ? off.ids : []), ...(scr ? [scr.id] : [])], miss: a.miss }; }
  if (/outpatient|prior|treatment|service/i.test(ask)) { const p = sentencePrior(idx); const cur = sentenceCurrent(idx); return { text: [p.text, cur && cur.text].filter(Boolean).join(' '), ids: [...p.ids, ...(cur ? cur.ids : [])], miss: [...p.miss, ...(cur ? cur.miss : [])] }; }
  if (/iep/i.test(ask)) return sentenceIep(idx);
  if (/goal|isp|baseline/i.test(ask)) {
    const c = clientOf(s, r.client);
    if (c.goals && c.goals.length) return { text: c.goals.map(g => `Goal ${g.n} (${g.name}): ${g.objective}`).join(' '), ids: [], miss: [] };
    return { text: missing('the ISP goals and baselines'), ids: [], miss: ['ISP goals and baselines'] };
  }
  return { text: missing('the answer to this item'), ids: [], miss: ['answer to this item'], unmatched: true };
}

// buildDoc(s, d, r, kind) -> { kind, gen, sections:[{key,title,text,evidence:[ids],missing:[labels],basis}], reviewed:null, sent:null, versions:[] }
export function buildDoc(s, d, r, kind, by = 'Psyflo') {
  const idx = evidenceIndex(s, d, r); const c = clientOf(s, r.client); const pf = payerFirst(s, r.payer); const u = unitsView(s, d, r);
  const sec = (key, title, o, basis) => ({ key, title, text: o.text, evidence: o.ids || [], missing: o.miss || [], ...(basis ? { basis } : {}) });
  const sections = [];
  if (kind === 'info') {
    const asked = (d.concerns || []).filter(x => /request for information/i.test(x.source || '')).map(x => x.text);
    const asks = asked.length ? asked : (r.info_items || []);
    asks.forEach((ask, i) => sections.push(sec('ask' + (i + 1), ask.replace(/\.$/, ''), answerAsk(s, d, r, idx, ask), `Item ${i + 1} of ${asks.length}`)));
    if (!asks.length) sections.push({ key: 'ask1', title: 'The payer\'s questions', text: missing('the items the payer asked for (read them from the payer message)'), evidence: [], missing: ['items the payer asked for'] });
  } else if (kind === 'p2p') {
    const clin = clinicianOf(s, d); const { level, locality } = schoolLevel(s, c);
    const an = w => /^(8|11|18|[aeiou])/i.test(String(w)) ? 'an' : 'a';
    const open = `This is ${clin.name}${clin.credential ? ', ' + clin.credential : ''}, calling about ${c.age ? an(c.age) + ' ' + c.age + '-year-old ' : 'a '}${kidWord(c)}${level ? ' at ' + (level === 'elementary' ? 'an elementary' : 'a ' + level) + ' school' : ''}${locality ? ' in ' + locality : ''}. ${pf} ${u.offered != null ? 'offered' : 'approved'} ${u.current != null ? u.current : '?'} of the ${u.requested} units requested.`;
    sections.push(sec('open', 'Open with', { text: open, ids: [], miss: [] }, `Request ${r.id}`));
    const inc = sentenceIncidents(idx); sections.push(sec('incidents', 'Dated evidence', inc));
    const pr = sentencePrior(idx); const cur = sentenceCurrent(idx);
    sections.push(sec('services', 'Services already tried', { text: [pr.text, cur && cur.text].filter(Boolean).join(' '), ids: [...pr.ids, ...(cur ? cur.ids : [])], miss: [...pr.miss, ...(cur ? cur.miss : [])] }));
    sections.push(sec('risk', 'Level of care', sentenceRisk(idx)));
    const when = u.runOut ? `about ${fmtDate(u.runOut)}` : 'a date that cannot be computed';
    const unitsText = `At ${u.rate} units a school day (${rule(s, 'units.rate_per_school_day').verification.toLowerCase()}), ${u.current} units cover ${u.days} school days, to ${when}. The request asked for ${u.requested} units${u.reqDays ? ' (' + u.reqDays + ' school days at the same rate)' : ''}${u.windowEnd ? ' through ' + fmtDate(u.windowEnd) : ''}.`;
    sections.push(sec('units', 'What the units mean', { text: unitsText, ids: [], miss: [] }, 'Rule: run-out rate'));
    sections.push(sec('ask', 'What we ask', { text: `Approve the remaining ${Math.max(0, u.requested - (u.current || 0))} units of the ${u.requested} requested${u.windowEnd ? ', through ' + fmtDate(u.windowEnd) : ''}.`, ids: [], miss: [] }, `Request ${r.id}`));
  } else if (kind === 'appeal' || kind === 'recon') {
    const child = c.first_name || c.initials; const reason = ((d.concerns || [])[0] || {}).text;
    const notice = (d.notice && d.notice.date) || r.notice_date || r.denied_on;
    const guardian = kind === 'appeal';
    const who = String(c.initials).replace(/\.$/, '');
    sections.push(sec('opening', 'Opening', { text: guardian ? `I am ${child}'s guardian. I am appealing ${pf}'s decision of ${notice ? longDate(notice) : missing('the notice date')}.` : `I am requesting additional review (reconsideration) of ${pf}'s decision of ${notice ? longDate(notice) : missing('the notice date')} for ${who}.`, ids: [], miss: notice ? [] : ['notice date'] }, notice ? `Notice ${fmtDate(notice, { year: true })}` : 'Notice date'));
    const stated = reason && !/not recorded/i.test(reason);
    const reasonText = d.issue === 'denial'
      ? (stated ? `${pf} said the request was denied: ${reason}.` : missing("the payer's stated reason"))
      : (stated ? `${pf} offered ${u.offered != null ? u.offered : u.current} of the ${u.requested} units requested and said: ${reason}` : `${pf} offered ${u.offered != null ? u.offered : u.current} of the ${u.requested} units requested. ${missing("the payer's stated reason")}`);
    sections.push(sec('reason', d.issue === 'denial' ? "The payer's reason" : "The payer's decision", { text: reasonText, ids: [], miss: stated ? [] : ["payer's stated reason"] }, (d.notice && d.notice.doc_ref) || (d.notice && d.notice.source) || 'Decision notice'));
    const off = sentenceOffice(idx); const inc = incidentsFor(idx).length ? sentenceIncidents(idx) : null; const cur = sentenceCurrent(idx); const pr = sentencePrior(idx);
    const parts = [inc, off, cur, pr].filter(Boolean);
    sections.push(sec('record', 'What the record shows', { text: parts.map(p => p.text).join(' '), ids: parts.flatMap(p => p.ids), miss: parts.flatMap(p => p.miss) }));
    sections.push(sec('ask', 'What is asked', { text: `Please review the attached records and approve the ${u.requested} units requested.`, ids: [], miss: [] }, `Request ${r.id}`));
  } else throw new Error('Unknown document: ' + kind);
  const usedIds = [...new Set(sections.flatMap(x => x.evidence))];
  return { kind, gen: { at: clockNow(s), by, sim: true, rules: 'Psyflo drafting rules 1 to 14', sources: usedIds.length }, sections, reviewed: null, sent: null, versions: [], attached: kind === 'appeal' || kind === 'recon' ? attachedList(idx, usedIds, d) : undefined };
}
function attachedList(idx, ids, d) {
  const src = [...new Set(ids.map(id => (evidenceById(idx, id) || {}).source).filter(Boolean))];
  return [d.notice && d.notice.doc_ref ? 'Decision notice' : null, 'The request', ...src].filter(Boolean).join(' · ');
}
// plain text of a document as it would be sent
export function docText(doc, kind) {
  if (!doc || !doc.sections) return '';
  if (kind === 'info') return doc.sections.map((x, i) => `${i + 1}. ${x.title}.\n${x.text}`).join('\n\n');
  return doc.sections.map(x => x.text).join('\n\n');
}
export const docMissing = doc => (doc && doc.sections ? doc.sections.flatMap(x => (x.text.match(MISSING_RE) || [])) : []);
export const docSent = doc => !!(doc && doc.sent);

// Questions to put to the reviewer (neutral, about the decision itself, never a clinical claim) and what to check before the call
export function clarifyQuestions(s, d, r, idx) {
  const q = []; const pf = payerFirst(s, r.payer); const notice = d.notice || {};
  const reasons = (d.concerns || []).filter(x => !/not recorded/i.test(x.text));
  if (!reasons.length) q.push(`Which criteria did ${pf} find unmet? No written reason is on file.`);
  else q.push(`Does "${reasons[0].text.replace(/^"|"$/g, '')}" describe the whole basis for the decision, or are there other criteria?`);
  q.push('Which records did the reviewer read, and what are their dates?');
  q.push('What additional records, with dates, would change the decision?');
  if (!notice.doc_ref) q.push('Can the decision be sent in writing with a reference number, and when will it arrive?');
  const n = r.units_offered != null ? r.units_offered : r.units_awarded;
  q.push(`Is the ${n != null ? n + '-unit ' : ''}decision final, or open to review, and by when?`);
  return q;
}

// ---------------------------------------------------------------------------------------------------------------- the workspace (R3): said vs shown, weak points, steps, call hours
// What the payer said, set beside the stored records that answer it. A reason that no stored record can be matched to says "not compared yet":
// nothing is invented. `need` is what stays marked Evidence missing for that reason. Same matching the drafts use (answerAsk).
const tidy = t => String(t || '').replace(MISSING_RE, '').replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').replace(/(?:,\s*)+\./g, '.').trim();
export function compareReasons(s, d, r, idx) {
  const items = (d.concerns || []).filter(x => x && x.text && !/not recorded/i.test(x.text));
  return items.map((x, i) => {
    const said = String(x.text).replace(/^["“]|["”]$/g, '');
    const a = answerAsk(s, d, r, idx, said); const matched = !a.unmatched;
    return { key: 'r' + (i + 1), said, source: x.source || '', matched, shows: matched ? tidy(a.text) : '', ids: matched ? a.ids : [], need: matched ? a.miss : [] };
  });
}
// Everything not documented for this case: the evidence index's needs plus what each stated reason still lacks (deduplicated by label).
// One list for the menu count, the Evidence page, the weak points, the documentation request and the gaps panel.
export function missingItems(s, d, r, idx) {
  const out = idx.needs.map(n => ({ key: n.key, label: n.label })); const seen = new Set(out.map(x => x.label.toLowerCase()));
  for (const x of compareReasons(s, d, r, idx)) for (const m of x.need) { const k = String(m).toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push({ key: 'q-' + k.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40), label: m }); }
  return out;
}
// Where the denial is weak: Strong = a stored record answers a stated reason · Gap = not documented yet · Clarify = the payer's criterion is not on file
// or no stored record is matched to a reason · Risk = a documentation weakness. Derived from the same evidence index the drafts use; no likelihood is given.
export const WEAK_KINDS = { strong: ['success', 'Strong'], gap: ['danger', 'Gap'], clarify: ['info', 'Clarify'], risk: ['warning', 'Risk'] };
export function weakPoints(s, d, r, idx) {
  const pf = payerFirst(s, r.payer); const out = []; const reasons = compareReasons(s, d, r, idx);
  reasons.filter(x => x.matched && !x.need.length && x.ids.length).forEach(x => out.push({ k: x.key, kind: 'strong', title: `The record answers “${x.said}”`, text: x.shows, ids: x.ids, fix: 'Cite these records in the response', go: 'evidence' }));
  missingItems(s, d, r, idx).forEach(n => out.push({ k: 'g-' + n.key, kind: 'gap', title: `Not documented: ${n.label}`, ids: [], fix: 'Collect it in the chart, or write the sentence yourself. Drafts print it as Evidence missing', go: 'evidence', lauris: true }));
  if (!reasons.length) out.push({ k: 'c-none', kind: 'clarify', title: `${pf} did not state a reason that is on file`, ids: [], fix: 'Read the payer letter, then ask which criterion was unmet (see the call questions)', go: 'said' });
  reasons.filter(x => !x.matched).forEach(x => out.push({ k: x.key + '-c', kind: 'clarify', title: `No stored record is matched to “${x.said}” yet`, ids: [], fix: `Ask ${pf} which criterion applied, and which records the reviewer read`, go: 'said' }));
  if (idx.counts.held) out.push({ k: 'x-held', kind: 'risk', title: `${idx.counts.held} record${idx.counts.held === 1 ? ' is' : 's are'} held back from drafts (sensitive or excluded)`, ids: idx.items.filter(e => !e.usable).map(e => e.id), fix: 'A clinician decides whether to include each sensitive record', go: 'evidence' });
  if (idx.items.some(e => e.provenance === 'seed')) out.push({ k: 'x-seed', kind: 'risk', title: 'Some records are illustrative samples, not captured from a chart', ids: idx.items.filter(e => e.provenance === 'seed').map(e => e.id), fix: 'Replace them with the chart records before anything goes to the payer', go: 'evidence' });
  const ru = rule(s, d.issue === 'denial' ? 'appeal.window_days' : 'appeal.reconsideration_days');
  if (/not verified|unverified|assumption/i.test(ru.verification || '') || ru.category === 'UNVERIFIED-DEMO-ASSUMPTION') out.push({ k: 'x-rule', kind: 'risk', title: d.issue === 'denial' ? 'The appeal window comes from a rule that is not verified for this payer' : 'The reconsideration step is not verified for this payer', ids: [], rule: ru, fix: 'Confirm the date on the payer letter or by phone', go: 'said' });
  return out;
}

// The seven recommended steps and what each has produced so far (all read from what a person recorded; none is a prediction)
export const STEP_LIST = [['analyze', 'Analyze Denial'], ['gaps', 'Identify Missing Evidence'], ['docreq', 'Request Additional Documentation'], ['appeal', 'Generate Appeal Draft'], ['p2p', 'Generate Peer-to-Peer Script'], ['recon', 'Prepare Reconsideration'], ['review', 'Mark for Clinical Review']];
export const NEEDS_CLINICAL = ['analyze', 'gaps', 'docreq', 'appeal', 'p2p', 'recon'];
export const DOCREQ_TO = { clinician: 'Treating clinician', guardian: 'Guardian', school: 'School counselor' };
export function stepResults(s, d, r, idx) {
  const out = {}; const docs = d.docs || {};
  if (d.analysis) out.analyze = `Analyzed ${fmtDate(String(d.analysis.at).slice(0, 10))}`;
  if (d.gaps) { const n = missingItems(s, d, r, idx).length; out.gaps = n ? `${n} missing` : 'None missing'; }
  if (d.docreq) { const open = (d.docreq.items || []).filter(x => !x.got).length; out.docreq = open ? `${open} requested · ${DOCREQ_TO[d.docreq.to] || d.docreq.to}` : 'All received'; }
  for (const k of ['appeal', 'p2p', 'recon']) { const doc = docs[k]; if (!doc || !doc.sections) continue;
    out[k] = doc.sent ? `Sent${doc.sent.ref ? ' · ' + doc.sent.ref : ''}` : doc.ready ? 'Ready to upload' : doc.reviewed ? 'Reviewed' : doc.sections.some(x => x.edited) ? 'Edited · Simulated draft' : 'Simulated draft'; }
  if (d.review) out.review = `Clinical review · ${staffOf(s, d.review.to).name || d.review.to}`;
  return out;
}
// the process line under the case header
export const TIMELINE = ['Decision received', 'Clinical review', 'Response prepared', 'Submitted', 'Payer response', 'Resolved'];
export function timelineOf(s, d, r, status) {
  const docs = d.docs || {}; const dc = k => docs[k] || {};
  const worked = !!(d.analysis || d.gaps || d.docreq || d.review || Object.values(docs).some(x => x && x.sections));
  let step;
  if (!isOpen(d)) step = 5;
  else switch (status) {
    case 'info-req': step = 1; break;
    case 'drafted': step = 2; break;
    case 'p2p-prep': step = dc('p2p').reviewed ? 2 : 1; break;
    case 'p2p': step = r.stage === 'p2p_awaiting' ? 4 : 3; break;
    case 'recon-prep': step = dc('recon').reviewed ? 2 : 1; break;
    case 'recon': step = 4; break;
    case 'appeal-prep': step = dc('appeal').reviewed ? 2 : 1; break;
    case 'appeal': step = 4; break;
    default: step = worked ? 1 : 0;
  }
  const first = [d.analysis, d.gaps, d.docreq, d.review, ...Object.values(docs).map(x => x && x.gen)].filter(Boolean).map(x => String(x.at || '')).filter(Boolean).sort()[0];
  const pathDoc = dc(d.path === 'appeal' ? 'appeal' : d.path === 'recon' ? 'recon' : r.stage === 'info_requested' ? 'info' : 'p2p');
  const day = at => at ? fmtDate(String(at).slice(0, 10)) : '';
  const dates = [day((d.notice || {}).date || d.opened), day(first), day(pathDoc.reviewed && pathDoc.reviewed.at), day((pathDoc.sent || pathDoc.ready || {}).at || r.p2p_at), '', day(d.closed)];
  return { step, labels: TIMELINE, dates };
}

// Payer provider-services hours (seed/extra/payer-hours.json, an UNVERIFIED-DEMO-ASSUMPTION). Pure; the server uses the same function to refuse a call to a closed line.
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; const DOW_L = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const mins = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const clock12 = t => { const [h, m] = String(t).split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
const dowOf = date => DOW[new Date(String(date).slice(0, 10) + 'T00:00:00Z').getUTCDay()];
export function hoursSummary(days) {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']; const groups = [];
  for (const k of order) { const v = days && days[k]; if (!v) continue; const key = v.join('-'); const last = groups[groups.length - 1]; if (last && last.key === key && last.to === order[order.indexOf(k) - 1]) last.to = k; else groups.push({ key, from: k, to: k, v }); }
  return groups.map(g => `${DOW_L[g.from]}${g.to !== g.from ? '–' + DOW_L[g.to] : ''} ${clock12(g.v[0])}–${clock12(g.v[1])}`).join(', ') || 'No hours on file';
}
export function lineStatus(s, payerId, at) {
  const now = at || clockNow(s); const h = (s.payer_hours || []).find(x => x.payer === payerId);
  const base = { payer: payerId, at: now, category: h ? h.category : 'UNVERIFIED-DEMO-ASSUMPTION', source: h ? h.source : 'No hours are on file for this payer.', verified_on: h ? h.verified_on : null };
  if (!h) return { ...base, known: false, open: false, summary: 'No hours on file', today: null, nextOpen: null, line: 'Provider services' };
  const date = now.slice(0, 10), time = now.slice(11, 16); const dow = dowOf(date); const today = h.days[dow] || null;
  const open = !!today && mins(time) >= mins(today[0]) && mins(time) < mins(today[1]);
  let nextOpen = null;
  for (let i = 0; i < 8 && !nextOpen; i++) {
    const dt = addDays(date, i); const k = dowOf(dt); const hr = h.days[k]; if (!hr) continue;
    if (i === 0 && mins(time) >= mins(hr[0])) continue;                                     // already past today's opening
    nextOpen = { date: dt, dow: k, label: `${i === 0 ? 'today' : i === 1 ? 'tomorrow' : DOW_L[k]} ${clock12(hr[0])}` };
  }
  return { ...base, known: true, open, line: h.line || 'Provider services', summary: hoursSummary(h.days), today: today ? `${clock12(today[0])}–${clock12(today[1])}` : 'Closed today', nextOpen };
}
// The simulated call: a script the voice agent would read, built only from stored case facts. The payer's side is a labelled placeholder: Psyflo never writes what a payer says.
export const CALL_PURPOSES = [['status', 'Ask where the decision stands'], ['p2p', 'Ask for a peer-to-peer time'], ['docs', 'Confirm which documents the payer needs']];
export function callScript(s, d, r, purpose) {
  const pf = payerFirst(s, r.payer); const c = clientOf(s, r.client); const org = (s.org && s.org.name) || 'the clinic'; const notice = (d.notice || {}).date;
  const what = purpose === 'p2p' ? `We would like to ask for a peer-to-peer review of the decision${notice ? ' dated ' + longDate(notice) : ''}. Could you give us the reviewer's available times and a reference number for the request?`
    : purpose === 'docs' ? `Could you confirm which documents you still need for request ${r.id}, how they should be sent, and the date they are due?`
      : `Could you tell me where the ${d.issue === 'info' ? 'information request' : 'decision'} stands, and whether any document is still outstanding?`;
  return [
    { who: 'agent', text: `Hello, this is Psyflo's calling assistant for ${org}. I am calling ${pf} provider services about request ${r.id} for a consumer with the initials ${String(c.initials).replace(/\.$/, '')}.` },
    { who: 'agent', text: what },
    { who: 'payer', text: `Scripted placeholder: on a real call ${pf} answers here. Psyflo does not write what a payer says; the person who records this call types what was said.` },
    { who: 'agent', text: 'Thank you. Could you give me a reference number for this call? I will pass it to the clinician.' }
  ];
}

// ---------------------------------------------------------------------------------------------------------------- options (valid ones only; an unavailable or unverified path says so)
export function optionsFor(s, d, r, me) {
  const u = unitsView(s, d, r); const pf = payerFirst(s, r.payer); const stage = r.stage; const out = [];
  const dls = deadlinesOf(s, d, r);
  const dl = kind => dls.find(x => x.kind === kind) || null;
  const rc = rule(s, 'appeal.reconsideration_days'); const ap = rule(s, 'appeal.window_days'); const p2p = rule(s, 'p2p.attempts');
  const tried = new Set(d.tried || []);
  const asked = !!(r.info_asked || (r.info_items && r.info_items.length) || (d.concerns || []).some(x => /Availity request for information|information/i.test(x.source || '')));
  const opt = o => out.push({ available: true, ...o });
  if (stage === 'partial_decide') {
    opt({ key: 'accept', label: 'Accept decision', sub: `Accept ${u.offered} of ${u.requested} units. Logged on the request; nothing is sent to ${pf}.`, action: 'options', deadline: dl('reply') });
    opt({ key: 'info', label: 'Provide requested information', available: asked, why: `${pf} has not asked for information on this decision.`, sub: 'Reply with dated counts from stored records.', action: 'info', deadline: dl('reply') });
    opt({ key: 'p2p', label: 'Prepare peer-to-peer', sub: `Talking points from stored evidence; ${pf} calls to agree a time.`, action: 'p2p', category: p2p, note: `${p2p.value} attempt, set by ${pf}`, deadline: dl('p2p') });
    opt({ key: 'recon', label: 'Request reconsideration', available: !tried.has('recon'), why: 'Already requested; the payer answer is recorded.', sub: 'Ask for additional review.', action: 'reconsider', category: rc, unverified: 'Payer rule not verified', deadline: dl('recon') });
    opt({ key: 'appeal', label: 'Prepare appeal', available: false, why: 'An appeal follows a final denial. Whether a partial offer can be appealed is not verified for this payer.', category: ap, unverified: 'Not verified', action: 'appeal' });
    opt({ key: 'discharge', label: 'Review discharge or care transition', sub: 'Use the units, then plan the discharge and a new initial request.', link: 'transition', category: rule(s, 'early_discharge.min_gap_days'), unverified: 'Earliest new initial: set by the clinician' });
  } else if (stage === 'info_requested' || stage === 'portal_open') {
    opt({ key: 'info', label: 'Provide requested information', sub: 'Answer the items asked and stop.', action: 'info', deadline: dl('reply') });
  } else if (P2P_STAGES.includes(stage)) {
    opt({ key: 'p2p', label: stage === 'p2p_awaiting' ? 'Peer-to-peer held' : 'Prepare peer-to-peer', sub: stage === 'p2p_awaiting' ? 'Call held; record the decision when the payer sends it.' : 'Talking points, call date and outcome.', action: 'p2p', category: p2p, deadline: dl('p2p') || dl('decision') });
    opt({ key: 'outcome', label: 'Record payer outcome', available: stage !== 'peer_to_peer_requested' || !!r.p2p_at, why: 'Enter the call date first, or when the call is held.', sub: 'Needs the document that states the decision.', action: 'p2p' });
    opt({ key: 'discharge', label: 'Review discharge or care transition', sub: 'Plan for the units running out before the decision.', link: 'transition' });
  } else if (stage === 'denied') {
    const guardian = ruleValue(s, 'appeal.initiators', ['guardian']);
    opt({ key: 'appeal', label: 'Prepare appeal', sub: 'Guardian-led: Psyflo prepares, the guardian reviews and signs on the family portal, staff press Send.', action: 'appeal', category: ap, deadline: dl('appeal'), note: guardian.includes('guardian') ? 'Guardian-led' : '', providerNote: 'Provider-led appeal: not verified' });
    opt({ key: 'recon', label: 'Request reconsideration', available: !tried.has('recon'), why: 'Already requested; the payer answer is recorded.', sub: 'Ask for additional review.', action: 'reconsider', category: rc, unverified: 'Payer rule not verified' });
    opt({ key: 'p2p', label: 'Prepare peer-to-peer', available: false, why: `Whether ${pf} accepts a peer-to-peer after a final denial is not verified; it is requested while a decision is still open.`, category: p2p, unverified: 'Not verified', action: 'p2p' });
    opt({ key: 'accept', label: 'Accept decision', sub: 'Close the request in Psyflo. No appeal or reconsideration follows. Logged with your name and the time.', action: 'options' });
    opt({ key: 'discharge', label: 'Review discharge or care transition', sub: 'Plan the transition while the decision stands.', link: 'transition' });
  } else if (stage === 'appeal_sent') {
    opt({ key: 'outcome', label: 'Record payer outcome', sub: 'Enter the payer answer with the document that states it.', action: 'appeal', category: rule(s, 'appeal.window_days') });
    opt({ key: 'discharge', label: 'Review discharge or care transition', sub: 'Plan the transition while the appeal is open.', link: 'transition' });
  }
  const needsClinician = !canWork(me);
  return out.map(o => ({ ...o, needsClinician, active: d.path === o.key || (o.key === 'info' && d.path === 'info') || (o.key === 'p2p' && P2P_STAGES.includes(stage)), tried: tried.has(o.key) }));
}

// ---------------------------------------------------------------------------------------------------------------- the case view and history
export function decisionView(s, d, r) {
  const pf = payerFirst(s, r.payer); const u = unitsView(s, d, r); const n = d.notice || {};
  const ledger = (r.decision_log || []).slice();
  const initial = ledger.filter(x => x.kind === 'initial' && !x.superseded_by).at(-1);
  const docRef = (initial && initial.doc_ref) || n.doc_ref || null;
  const summary = d.issue === 'info' ? `${pf} asked for more information` : d.issue === 'denial' ? `Denied · 0 of ${u.requested} units` : `${u.offered != null ? u.offered : u.current} of ${u.requested} units ${u.offered != null ? 'offered' : 'approved'}`;
  const via = n.via ? VIA_LABEL[n.via] || n.via : null;
  return { issueLabel: ISSUE_LABEL[d.issue] || d.issue, summary, date: n.date || null, via, docRef, docRefMissing: !docRef, docRefNote: !docRef ? (n.via === 'phone' ? 'The decision came by phone; no letter or fax reference is on file.' : 'No document reference is recorded.') : '', source: n.source || null, reasons: d.concerns || [], ledger };
}
const ACTOR = { person: 'staff', system: 'psyflo', bridge: 'lauris', integration: 'system', portal: 'family', demo: 'payer' };
export function historyEvents(s, d, r) {
  const rows = requestHistory(s, r).filter(e => !e.upcoming && e.at && !e.clock);   // clock markers (follow-up day, window end) are not correspondence
  const evs = (s.events || []).filter(e => e.record === r.id);
  const ev = [];
  for (const e of rows) {
    const raw = evs.find(x => x.at === e.at && x.what === e.what);
    const actor = raw ? (ACTOR[raw.actor_kind] || 'staff') : /Psyflo/.test(e.who || '') ? 'psyflo' : e.derived ? 'system' : 'staff';
    const x = { id: `${r.id}-${e.at}-${ev.length}`, at: e.at.length === 10 ? e.at + 'T00:00' : e.at, what: e.what, who: staffOf(s, e.who).name !== e.who ? staffOf(s, e.who).name : (e.who || 'Not recorded'), actor, sim: !!(raw && raw.sim) || /\(simulated\)|Simulated|Demo:/.test(e.what) };
    if (/delivery receipt|Sfax accepted/i.test(e.what) && r.delivery_receipt) x.document = { name: 'Sfax delivery receipt (simulated)', href: r.delivery_receipt };
    if (/signed PDF|Signed in Lauris/i.test(e.what) && r.signed_pdf && String(r.signed_pdf).startsWith('/files/')) x.document = { name: r.signed_name || 'Signed request (PDF)', href: r.signed_pdf };
    if (/appeal/i.test(e.what) && r.appeal && r.appeal.file) x.document = { name: 'Signed appeal letter (PDF)', href: r.appeal.file };
    if (raw && raw.via) x.source = raw.via;
    ev.push(x);
  }
  for (const l of (r.decision_log || [])) ev.push({ id: `${r.id}-${l.id}`, at: l.at, what: `Payer decision recorded · ${l.kind} · ${l.outcome}${l.units != null ? ' · ' + l.units + ' units' : ''}${l.supersedes ? ' (correction: ' + (l.reason || '') + ')' : ''}`, who: staffOf(s, l.by).name !== l.by ? staffOf(s, l.by).name : l.by, actor: 'payer', sim: !!l.sim, source: `Document ${l.doc_ref}` });
  return ev.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function caseView(s, requestId, me) {
  const r = byId(s.requests, requestId); if (!r) return null;
  const d = byRequest(s, requestId); if (!d) return { r, d: null, c: clientOf(s, r.client) };
  const c = clientOf(s, r.client); const status = isOpen(d) ? deriveStatus(s, d, r) : d.status;
  const deadlines = deadlinesOf(s, d, r);
  return { r, d, c, payer: { id: r.payer, name: payerName(s, r.payer), first: payerFirst(s, r.payer) }, channel: { key: r.channel, label: CHANNEL_LABEL[r.channel] || r.channel },
    consumer: c.age ? `${c.initials}, ${c.age}` : c.initials, issue: d.issue, issueLabel: ISSUE_LABEL[d.issue] || d.issue, status, path: derivePath(d, r), open: isOpen(d),
    next: nextAction(s, d, r), deadlines, deadline: primaryDeadline(deadlines), units: unitsView(s, d, r), decision: decisionView(s, d, r), options: optionsFor(s, d, r, me),
    owner: { id: d.owner, name: ownerName(s, d.owner), short: ownerShort(s, d.owner) }, backup: d.backup ? { id: d.backup, name: ownerName(s, d.backup) } : null, line: lineStatus(s, r.payer) };
}

// ---------------------------------------------------------------------------------------------------------------- the queue
const typeOf = d => d.issue === 'denial' ? 'denied' : d.issue;
export function queueRows(s, f = {}) {
  const rows = [];
  for (const d of disputesOf(s)) {
    const r = byId(s.requests, d.request); if (!r) continue;
    const c = clientOf(s, r.client); const open = isOpen(d);
    const status = open ? deriveStatus(s, d, r) : d.status;
    const u = unitsView(s, d, r); const dls = open ? deadlinesOf(s, d, r) : []; const next = nextAction(s, d, r);
    const pf = payerFirst(s, r.payer);
    const dec = d.issue === 'info' ? { main: 'Not decided yet', sub: `Info requested · ${fmtDate((d.notice || {}).date)}` }
      : d.issue === 'denial' ? { main: `0 of ${u.requested} approved`, sub: `Denied · ${fmtDate((d.notice || {}).date || r.denied_on)}` }
        : { main: `${u.offered != null ? u.offered : (u.awarded != null ? u.awarded : u.current)} of ${u.requested} ${u.offered != null ? 'offered' : 'approved'}`, sub: `Partial · ${fmtDate((d.notice || {}).date)}` };
    rows.push({ id: d.id, request: r.id, client: r.client, consumer: c.age ? `${c.initials}, ${c.age}` : c.initials, initials: c.initials, payer: r.payer, payerName: pf, service: (r.service || 'TDT').split(' · ')[0].replace('TDT school day', 'TDT'), serviceLine: r.service,
      issue: d.issue, type: typeOf(d), decisionDate: String((d.notice || {}).date || r.denied_on || '').slice(0, 10) || null, decision: dec, status, group: open ? statusGroup(status) : 'closed', open, next, deadline: primaryDeadline(dls), deadlines: dls, owner: d.owner, ownerName: ownerName(s, d.owner), ownerShort: ownerShort(s, d.owner), backupName: d.backup ? ownerName(s, d.backup) : '', opened: d.opened, closed: d.closed, outcome: d.outcome || null,
      search: `${d.id} ${r.id} ${c.initials} ${pf} ${payerName(s, r.payer)} ${ownerName(s, d.owner)}`.toLowerCase() });
  }
  return rows.filter(row => {
    if (f.q && !row.search.includes(String(f.q).toLowerCase().trim())) return false;
    if (f.decision && row.type !== f.decision && !(f.decision === 'p2p' && row.group === 'p2p')) return false;
    if (f.payer && row.payer !== f.payer) return false;
    if (f.service && row.service !== f.service) return false;
    if (f.owner && row.owner !== f.owner) return false;
    if (f.from && !(row.decisionDate && row.decisionDate >= f.from)) return false;
    if (f.to && !(row.decisionDate && row.decisionDate <= f.to)) return false;
    if (f.next && row.next.group !== f.next) return false;
    const st = f.status || '';
    if (st === '') { if (!row.open) return false; } else if (st === 'closed') { if (row.open) return false; } else if (st !== 'all' && row.group !== st) return false;
    if (f.deadline) {
      const x = row.deadline; const days = x && x.date ? daysBetween(clockToday(s), String(x.date).slice(0, 10)) : null;
      if (f.deadline === 'overdue' && !(row.open && x && x.sev === 'overdue')) return false;
      if (f.deadline === '7' && !(row.open && days != null && days <= 7)) return false;
      if (f.deadline === 'none' && !(row.open && (!x || !x.date))) return false;
    }
    return true;
  });
}
export const queueGetters = {
  deadline: r => r.open && r.deadline && r.deadline.date ? String(r.deadline.date) : r.open ? '9999-12' : '9999-99',
  case: r => r.request, consumer: r => r.initials, payer: r => r.payerName, service: r => r.service,
  decision: r => r.decision.main, status: r => (r.open ? '0' : '1') + r.status, next: r => r.next.label, owner: r => r.ownerShort
};
// Monday to Sunday of the week that holds `day` (for the decision-date quick buttons)
export function weekBounds(day) { const dow = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7; const mon = addDays(day, -dow); return { from: mon, to: addDays(mon, 6) }; }
export const OPEN_COUNT = s => disputesOf(s).filter(isOpen).length;

// ---------------------------------------------------------------------------------------------------------------- resolution (used by the reconcile step on the server)
// What happened when a request left the adverse stages: the closing status of its dispute and a one-line outcome
export function resolutionOf(s, d, r) {
  const last = (r.decision_log || []).filter(x => !x.superseded_by).at(-1);
  const req = r.units_requested || (d.units && d.units.requested) || 0; const prior = d.units ? d.units.offered : null;
  const base = { at: clockNow(s), doc_ref: last ? last.doc_ref : undefined };
  if (!r) return { status: 'closed', text: 'Request not found', ...base };
  if (r.stage === 'submitted' || r.stage === 'portal_open' || r.stage === 'overdue') return { status: 'resolved', text: d.issue === 'info' ? 'Reply sent · waiting for the payer decision' : 'Back with the payer', ...base };
  if (r.stage === 'closed') return { status: /appeal/i.test(r.closed_why || '') && /upheld/i.test(r.closed_why || '') ? 'upheld' : 'accepted', text: r.closed_why || 'Closed', ...base };
  if (r.stage === 'early_discharge') return { status: 'accepted', text: `Accepted ${r.units_awarded} units with an early-discharge plan`, units: r.units_awarded, ...base };
  if (r.stage === 'active') {
    const u = r.units_awarded;
    const viaDispute = last && ['p2p', 'recon', 'appeal'].includes(last.kind) && last.at >= (d.opened || '');
    if (!viaDispute) return { status: 'accepted', text: `Accepted ${u} of ${req} units`, units: u, ...base };
    if (u >= req) return { status: 'overturned', text: `${cap(PATH_LABEL[last.kind] || last.kind)}: ${u} of ${req} units approved`, units: u, ...base };
    if (prior == null || u > prior) return { status: 'partover', text: `${cap(PATH_LABEL[last.kind] || last.kind)}: ${u} of ${req} units approved (${prior != null ? prior + ' offered' : 'partial'})`, units: u, ...base };
    return { status: 'upheld', text: `${cap(PATH_LABEL[last.kind] || last.kind)}: decision upheld at ${u} units`, units: u, ...base };
  }
  return { status: 'closed', text: STAGE_LABEL[r.stage] || r.stage, ...base };
}
export { fmtDate, fmtDateTime, fmtTime, STAGE_LABEL };
