// Selectors for the Authorizations queue and the authorization case shell (E2). PURE: no DOM, no app imports, so the server, the
// screens and the tests read requests the same way. Display strings come back as data; the screens turn them into UI-kit fragments.
//
//   authQueue(s, filters, me)  -> { rows, counts, total, shown, filters, sort }        the queue (filters overlap; counts follow the other filters)
//   authCase(s, id, me)        -> the whole case: header, flow, deadline, units, documents, evidence, submission, timeline, payer, tasks, transition
//   deadline(s, r)             -> { text, sub, date, sev, rule, category, source, verification }   every deadline with its source
//   unitRule(s, service)       -> { bands, maxPerDay, rate, rules, text }               the unit rule with its rows (chips come from the rows)
//   normalizeParams(params)    -> the canonical queue filters; reads the v3 names show= st= exp= range= ends= and ours
//
// Stage -> chip mapping follows review/04-architecture.md C2. request.stage stays the only lifecycle; nothing here writes.
import * as M from '../model.js';
import { addDays, addBusinessDays, businessDaysBetween, daysBetween, dow, fmtDate, fmtDateTime, isSchoolDay } from '../dates.js';
import { rule, ruleValue, decisionDay, unitBands, maxUnitsPerDay } from '../rules.js';
import { can } from '../permissions.js';
import { evidenceIndex } from '../enhance.js';

// ---------------------------------------------------------------------------------------------------------------- vocabulary
export const GROUP = {
  draft_ready: 'draft', needs_approval: 'awaiting', awaiting_signature: 'awaiting', signed: 'awaiting',
  sending: 'submitted', portal_open: 'submitted', submitted: 'submitted',
  overdue: 'needs', info_requested: 'needs', partial_decide: 'needs',
  peer_to_peer_requested: 'denial', peer_to_peer_booked: 'denial', p2p_awaiting: 'denial', denied: 'denial', appeal_sent: 'denial',
  active: 'active', early_discharge: 'active', closed: 'closed'
};
export const DI_STAGES = ['info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent'];
export const PRE_SEND = ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed'];
export const SENT = ['sending', 'portal_open', 'submitted', 'overdue'];
export const CHIPS = [
  { value: 'needs', label: 'Needs action' }, { value: 'draft', label: 'Draft' }, { value: 'awaiting', label: 'Awaiting signature' },
  { value: 'submitted', label: 'Submitted' }, { value: 'active', label: 'Active' }, { value: 'renewal', label: 'Renewal due' }
];
export const CHIP_VALUES = CHIPS.map(c => c.value);
export const STAGE_LIST = ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'overdue', 'info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent', 'active', 'early_discharge', 'closed'];

// ---------------------------------------------------------------------------------------------------------------- params
// v3 deep links: show=<bucket> st=<status> exp=<days> ends=<days> range=<month> payer=<id>; ours: status q payer type owner stage site ends from to sort dir
const SHOW = { all: '', renewals: 'renewal', renewal: 'renewal', partials: 'needs', partial: 'needs', waiting: 'submitted', review: 'awaiting', reviews: 'awaiting', 'info-requested': 'needs', need: 'needs', needs: 'needs', drafts: 'draft', decision: 'needs', decisions: 'needs' };
const ST = { draft: 'draft', prep: 'draft', review: 'awaiting', ready: 'awaiting', submitted: 'submitted', pending: 'submitted', info: 'needs', recon: 'needs', appeal: 'needs', partial: 'needs', denied: 'needs', approved: 'active', active: 'active', renewal: 'renewal' };
const TAB = { all: '', me: 'draft', info: 'needs', partial: 'needs', active: 'active', renew: 'renewal' };
const MON3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const okIso = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const pad2 = n => String(n).padStart(2, '0');
function monthRange(key, today) {
  const i = MON3.indexOf(String(key || '').toLowerCase().slice(0, 3)); if (i < 0 || !today) return null;
  const ty = +today.slice(0, 4), tm = +today.slice(5, 7) - 1;
  const y0 = tm >= 6 ? ty : ty - 1;          // the school year Jul to Jun
  const y = i >= 6 ? y0 : y0 + 1; const last = new Date(Date.UTC(y, i + 1, 0)).getUTCDate();
  return [`${y}-${pad2(i + 1)}-01`, `${y}-${pad2(i + 1)}-${pad2(last)}`];
}
export function normalizeParams(p = {}, today = '') {
  const g = k => (p[k] == null ? '' : String(p[k]));
  let status = g('status');
  if (!CHIP_VALUES.includes(status)) status = '';
  if (!status && g('show') && Object.prototype.hasOwnProperty.call(SHOW, g('show'))) status = SHOW[g('show')];
  if (!status && g('st') && ST[g('st')]) status = ST[g('st')];
  let stage = STAGE_LIST.includes(g('stage')) ? g('stage') : '';
  if (g('tab') && !status && !stage) { const tb = g('tab'); if (tb === 'denied') stage = 'denied'; else if (TAB[tb] != null) status = TAB[tb]; }   // the old Authorizations tabs
  let ends = g('ends') || g('exp'); ends = ['7', '30', '60'].includes(ends) ? ends : '';
  let from = okIso(g('from')), to = okIso(g('to'));
  if (!from && !to && g('range')) { const r = monthRange(g('range'), today); if (r) [from, to] = r; }
  return { q: g('q'), status, payer: g('payer'), type: g('type'), owner: g('owner'), stage, site: g('site'), ends, from, to, sort: g('sort'), dir: g('dir') === 'desc' ? 'desc' : 'asc' };
}
// the query keys a legacy link may carry that the canonical state replaces (the screen clears them from the URL)
export const LEGACY_KEYS = ['show', 'st', 'exp', 'range', 'tab'];

// ---------------------------------------------------------------------------------------------------------------- small helpers
export const reqView = (s, r) => (r ? { ...(((s.request_details || {})[r.id] || {}).fill || {}), ...r } : null);
const clientOf = (s, r) => M.byId(s.clients, r.client);
export const detailsOf = (s, id) => (s.request_details && s.request_details[id]) || {};
const schoolOf = (s, r) => { const c = clientOf(s, r); const id = (c && c.school) || detailsOf(s, r.id).school; return id ? M.school(s, id) : null; };
const payerName = (s, id) => (id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id));
export const serviceShort = r => String(r.service || '').split(' · ')[0] || '—';
const staffShort = (s, id) => { const st = M.byId(s.staff, id); return st ? M.staffShort(s, id) : id; };
export const whoName = (s, who) => (!who ? '' : who === 'Psyflo' ? 'Psyflo' : who === 'bridge' ? 'Page bridge' : who === 'Sfax' ? 'Sfax (simulated)' : /payer/i.test(who) ? 'Payer' : M.byId(s.staff, who) ? M.staffShort(s, who) : who);
const upper1 = x => String(x || '').replace(/^./, c => c.toUpperCase());
const isDate = d => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''));

// units a school day for a request: the rules row (unverified), after-school assumed 1, outpatient unknown
export function rateOf(s, r) {
  const row = rule(s, 'units.rate_per_school_day');
  if (/outpatient/i.test(r.service || '') || r.service_line === 'outpatient') return null;
  if (/after-school/i.test(r.service || '')) return { value: 1, basis: 'after-school, 1 unit a day (assumption)', rule: row };
  return { value: ruleValue(s, 'units.rate_per_school_day', 3), basis: `${ruleValue(s, 'units.rate_per_school_day', 3)} units a school day`, rule: row };
}

export function unitRule(s, service) {
  const bands = unitBands(s, service).map(([minutes, units]) => ({ minutes, units }));
  const maxPerDay = maxUnitsPerDay(s);
  const rows = { bands: rule(s, 'units.tdt.day_tiers'), max: rule(s, 'units.tdt.max_per_day'), rate: rule(s, 'units.rate_per_school_day'), alt: rule(s, 'units.tdt.alt_tiers') };
  const hm = m => (m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);
  return { bands, maxPerDay, rate: ruleValue(s, 'units.rate_per_school_day', 3), rules: rows, text: bands.map(b => `${hm(b.minutes)} = ${b.units} unit${b.units === 1 ? '' : 's'}`).join(' · ') + ` · up to ${maxPerDay} a day` };
}

// ---------------------------------------------------------------------------------------------------------------- units
export function unitsView(s, r) {
  const c = clientOf(s, r); const a = c && c.authorization && c.authorization.units ? c.authorization : null;
  const rate = rateOf(s, r);
  const v = { requested: r.units_requested ?? null, offered: r.units_offered ?? null, awarded: r.units_awarded ?? null, authorization: a, total: null, used: null, left: null, pct: null, start: null, end: null, rate, daysLeft: null, status: null, inLauris: null, exhausted: null, showBar: false };
  if (a) {
    v.total = a.units; v.used = a.used || 0; v.left = Math.max(0, a.units - v.used); v.pct = Math.round((v.used / a.units) * 100);
    v.start = a.start || null; v.end = a.end || null; v.status = a.status || null; v.inLauris = a.in_lauris == null ? null : a.in_lauris; v.exhausted = a.exhausted || null;
    if (rate && rate.value) v.daysLeft = Math.floor(v.left / rate.value);
  }
  v.text = v.awarded != null ? `${v.requested} → ${v.awarded} awarded` : v.offered != null ? `${v.requested} → ${v.offered} offered` : `${v.requested ?? '—'} requested`;
  v.showBar = !!a && (['active', 'early_discharge', 'peer_to_peer_booked', 'peer_to_peer_requested', 'p2p_awaiting', 'partial_decide'].includes(r.stage) || (r.type === 'continued_stay' && PRE_SEND.includes(r.stage)));
  v.sub = a ? `${v.left} of ${v.total} left` : '';
  return v;
}

// renewal: an authorization window or a units balance that is running out. Lead time from the rules table (unverified).
export function renewal(s, r) {
  const live = ['active', 'early_discharge'].includes(r.stage) || (r.type === 'continued_stay' && PRE_SEND.includes(r.stage));
  if (!live) return null;
  const u = unitsView(s, r); const lead = ruleValue(s, 'continued_stay.lead_business_days', 14); const today = s.today;
  const end = u.end || r.renew_by || null;
  const dueBy = end ? addBusinessDays(end, -lead) : null;
  const byDate = !!dueBy && dueBy <= today;
  const byUnits = u.daysLeft != null && u.daysLeft <= lead;
  return { due: byDate || byUnits, end, dueBy, lead, daysLeft: u.daysLeft, byDate, byUnits, rule: rule(s, 'continued_stay.lead_business_days') };
}

// the date a continued stay should be started by: the end of the current authorization minus the lead time (rules table, unverified).
// One definition: the queue, the case, the timeline and My Work all read it, so the end date is never shown as the due date.
export function reauthDue(s, r) {
  const rn = renewal(s, r); if (!rn || !rn.end || !rn.dueBy) return null;
  return { date: rn.dueBy, end: rn.end, lead: rn.lead, rule: rn.rule, past: rn.dueBy < s.today, text: `Reauth due ${fmtDate(rn.dueBy)}`, sub: `${rn.lead} business days before the current one ends ${fmtDate(rn.end)}` };
}
function reauthDeadline(s, rn) {
  if (!rn.dueBy) return { kind: 'renewal', text: 'Reauth due', sub: '', date: null, sev: 'soon', rule: rn.rule };
  const t = s.today; const d = daysBetween(t, rn.end); const dd = daysBetween(t, rn.dueBy);
  const text = dd < 0 ? `Reauth was due ${fmtDate(rn.dueBy)}` : dd === 0 ? 'Reauth due today' : `Reauth due ${fmtDate(rn.dueBy)}`;
  const sub = `${rn.lead} business days before the current one ends ${fmtDate(rn.end)}${d < 0 ? ' · ended' : ' · ' + d + ' days left'}`;
  return { kind: 'renewal', text, sub, date: rn.dueBy, sev: d < 0 ? 'overdue' : rn.due || dd <= 7 ? 'soon' : 'ok', rule: rn.rule };
}

// ---------------------------------------------------------------------------------------------------------------- deadline
const CAT = { official: 'OFFICIAL-VERIFIED', payer: 'PAYER-SPECIFIC', harvest: 'HARVEST-REPORTED', unverified: 'UNVERIFIED-DEMO-ASSUMPTION' };
const ad = (cat, source) => ({ category: CAT[cat], source, verification: { official: 'Officially verified', payer: 'Payer-specific', harvest: 'Harvest-reported', unverified: 'Unverified demo assumption' }[cat], verified_on: null, note: '' });
const sevByDays = d => (d == null ? 'ok' : d < 0 ? 'overdue' : d <= 7 ? 'soon' : 'ok');
// deadline(s, r) -> { text, sub, date, sev:'ok'|'soon'|'overdue'|'none', rule (the rules row or an ad-hoc source row), kind }
export function deadline(s, r) {
  const t = s.today; const none = { kind: 'none', text: '—', sub: '', date: null, sev: 'none', rule: null };
  const c = clientOf(s, r);
  switch (r.stage) {
    case 'draft_ready': case 'needs_approval': case 'awaiting_signature': case 'signed': {
      if (r.type === 'initial' && r.limit_30) {
        const d = daysBetween(t, r.limit_30); const n = r.limit_30_basis?.days || ruleValue(s, 'initial_sra.send_within_days', 30);
        return { kind: 'send_limit', text: d < 0 ? `${-d} days past the send limit` : `Send by ${fmtDate(r.limit_30)}`, sub: d < 0 ? fmtDate(r.limit_30) : `${d} days left of ${n}`, date: r.limit_30, sev: sevByDays(d), rule: rule(s, 'initial_sra.send_within_days') };
      }
      const rn = renewal(s, r);
      if (rn && rn.end) return reauthDeadline(s, rn);
      return none;
    }
    case 'sending': return { kind: 'sending', text: 'Faxing now', sub: 'Simulated Sfax', date: null, sev: 'ok', rule: null };
    case 'portal_open': return { kind: 'portal', text: 'Finish the upload', sub: 'Decision day 0 starts on confirmation', date: null, sev: 'soon', rule: null };
    case 'submitted': case 'overdue': {
      const dd = decisionDay(s, r.sent, t, r.payer);
      if (!dd) return { kind: 'decision', text: 'Sent · date not recorded', sub: '', date: null, sev: 'none', rule: null };
      if (dd.overdue) return { kind: 'overdue', text: `Day ${dd.day} · past day ${dd.overdue_after}`, sub: `window ended ${fmtDate(dd.due_date)}`, date: dd.due_date, sev: 'overdue', rule: rule(s, 'decision.overdue_after_days', r.payer) };
      if (dd.followup_due) return { kind: 'followup', text: `Day ${dd.day} · call due`, sub: `window ends ${fmtDate(dd.due_date)}`, date: dd.followup_date, sev: 'soon', rule: rule(s, 'decision.followup_day', r.payer) };
      return { kind: 'followup', text: `Day ${dd.day} · call on day ${dd.followup_day}`, sub: fmtDate(dd.followup_date), date: dd.followup_date, sev: 'ok', rule: rule(s, 'decision.followup_day', r.payer) };
    }
    case 'info_requested': {
      if (!r.reply_due) return { kind: 'reply', text: `Reply within ${ruleValue(s, 'info_request.hours', 24)} h`, sub: '', date: null, sev: 'soon', rule: rule(s, 'info_request.hours') };
      const left = (Date.parse(r.reply_due + ':00Z') - Date.parse(M.now(s) + ':00Z')) / 3600000;
      return { kind: 'reply', text: left < 0 ? 'Reply missed' : `${Math.round(left)} h left to reply`, sub: `due ${fmtDateTime(r.reply_due, { dow: true })}`, date: r.reply_due, sev: left < 0 ? 'overdue' : left <= 12 ? 'soon' : 'ok', rule: rule(s, 'info_request.hours') };
    }
    case 'partial_decide': return r.reply_by ? { kind: 'reply_by', text: `Reply by ${fmtDate(r.reply_by)}`, sub: 'stated by the payer', date: r.reply_by, sev: sevByDays(daysBetween(t, r.reply_by)), rule: ad('payer', 'Payer\'s offer') } : { kind: 'reply_by', text: 'Decide', sub: 'reply date not recorded', date: null, sev: 'soon', rule: null };
    case 'peer_to_peer_requested': return { kind: 'p2p', text: 'Call date to be set', sub: 'when the payer calls', date: null, sev: 'soon', rule: null };
    case 'peer_to_peer_booked': { if (!r.p2p_at) return { kind: 'p2p', text: 'Call date not set', sub: '', date: null, sev: 'soon', rule: null }; const d = daysBetween(t, r.p2p_at); return { kind: 'p2p', text: d < 0 ? `Call was ${fmtDate(r.p2p_at)}` : d === 0 ? 'Call today' : `Call ${fmtDate(r.p2p_at)}`, sub: d < 0 ? 'log the outcome' : `${d} days out`, date: r.p2p_at.slice(0, 10), sev: d < 0 ? 'overdue' : d <= 7 ? 'soon' : 'ok', rule: ad('payer', 'Agreed with the payer') }; }
    case 'p2p_awaiting': return { kind: 'p2p', text: 'Awaiting decision', sub: r.p2p_outcome?.at ? `call held ${fmtDate(r.p2p_outcome.at)}` : '', date: null, sev: 'ok', rule: null };
    case 'denied': {
      const dl = M.appealDeadline(s, r);
      if (!dl) return { kind: 'appeal', text: 'Appeal window', sub: 'enter the notice date', date: null, sev: 'soon', rule: rule(s, 'appeal.window_days') };
      const d = daysBetween(t, dl);
      return { kind: 'appeal', text: d < 0 ? 'Appeal window closed' : `Appeal by ${fmtDate(dl)}`, sub: d < 0 ? fmtDate(dl) : `${d} days left · confirm on the letter`, date: dl, sev: d < 0 ? 'overdue' : d <= 14 ? 'soon' : 'ok', rule: rule(s, 'appeal.window_days') };
    }
    case 'appeal_sent': return { kind: 'appeal', text: 'Payer appeal clock', sub: 'not recorded', date: null, sev: 'ok', rule: null };
    case 'active': {
      const u = unitsView(s, r); const rn = renewal(s, r);
      if (u.left === 0 && u.total) return { kind: 'units', text: 'Units used up', sub: u.exhausted ? fmtDate(u.exhausted) : '', date: u.exhausted, sev: 'overdue', rule: u.rate && u.rate.rule };
      if (rn && rn.due) return rn.byDate || !rn.byUnits || !u.rate ? reauthDeadline(s, rn) : { kind: 'renewal', text: 'Reauth due: units running out', sub: `about ${u.daysLeft} school days left${rn.end ? ' · current ends ' + fmtDate(rn.end) : ''}`, date: rn.dueBy || rn.end, sev: 'soon', rule: u.rate.rule };
      if (u.end) return { kind: 'auth_end', text: `Ends ${fmtDate(u.end)}`, sub: `${daysBetween(t, u.end)} days left`, date: u.end, sev: 'ok', rule: ad('payer', 'Payer authorization window') };
      if (u.daysLeft != null) return { kind: 'units', text: `About ${u.daysLeft} school days`, sub: 'end date not recorded', date: null, sev: u.daysLeft <= 10 ? 'soon' : 'ok', rule: u.rate && u.rate.rule };
      return none;
    }
    case 'early_discharge': return r.early_discharge ? { kind: 'transition', text: `Discharge ${fmtDate(r.early_discharge.discharge)}`, sub: `new initial from ${fmtDate(r.early_discharge.new_initial)}`, date: r.early_discharge.discharge, sev: sevByDays(daysBetween(t, r.early_discharge.discharge)), rule: ad('harvest', 'Plan set by a clinician') } : { kind: 'transition', text: 'Set the plan', sub: '', date: null, sev: 'soon', rule: null };
    default: return none;
  }
}

// ---------------------------------------------------------------------------------------------------------------- owner
export function ownerOf(s, r) {
  const m = (s.auth_meta || {})[r.id] || {};
  const dflt = (s.staff || []).find(x => x.role === 'clinician');
  const id = m.owner || (dflt && dflt.id) || null;
  const nm = x => (x ? { id: x, name: (M.byId(s.staff, x) || {}).name || x, short: staffShort(s, x) } : null);
  return { ...(nm(id) || { id: null, name: 'Unassigned', short: 'Unassigned' }), backup: nm(m.backup), assigned: !!m.owner };
}

// ---------------------------------------------------------------------------------------------------------------- next action
const NEXT = {
  draft_ready: { label: 'Review packet', text: 'Review the draft in Lauris, then a person presses Process Form.', cap: 'drafts.clinical', why: 'Needs clinician' },
  needs_approval: { label: 'Approve', text: 'Processed in Lauris. A designated approver records the approval.', cap: 'approve.sra', why: 'Needs designated approver' },
  awaiting_signature: { label: 'Sign in Lauris', text: 'Waiting for Get Signature in Lauris Forms to Approve.', cap: null, why: '' },
  signed: { label: 'Send', text: 'Signed and approved. A person presses Send.', cap: 'send.packet', why: 'Needs sender' },
  sending: { label: 'View', text: 'Sfax (simulated) is sending; the reference arrives in a few seconds.', cap: null, why: '' },
  portal_open: { label: 'Finish upload', text: 'Upload in the portal session; the open page shows the confirmation.', cap: 'send.packet', why: 'Needs sender' },
  submitted: { label: 'View', text: 'Waiting for the payer.', cap: null, why: '' },
  overdue: { label: 'Send notice', text: 'No decision in the window. An overdue notice is ready to send.', cap: 'send.packet', why: 'Needs sender' },
  info_requested: { label: 'Reply', text: 'The payer asked for more information.', cap: 'payer.reply', why: 'Needs clinician', di: true },
  partial_decide: { label: 'Decide', text: 'Partial award: accept, add information, peer-to-peer or plan a transition.', cap: 'payer.reply', why: 'Needs clinician', di: true },
  peer_to_peer_requested: { label: 'Set call', text: 'Enter the call date when the payer calls.', cap: 'payer.reply', why: 'Needs clinician', di: true },
  peer_to_peer_booked: { label: 'Prepare call', text: 'Call notes are in Denial Intelligence.', cap: 'payer.reply', why: 'Needs clinician', di: true },
  p2p_awaiting: { label: 'Log decision', text: 'Call held. Record the decision with its document.', cap: 'payer.decision', why: 'Needs clinician', di: true },
  denied: { label: 'Plan appeal', text: 'Guardian-led appeal; the guardian reviews and signs.', cap: 'payer.reply', why: 'Needs clinician', di: true },
  appeal_sent: { label: 'Track appeal', text: 'Appeal sent. Waiting for the payer.', cap: null, why: '', di: true },
  active: { label: 'View', text: 'Units are in the tracker.', cap: null, why: '' },
  early_discharge: { label: 'Plan transition', text: 'Set the discharge and new-initial dates.', cap: 'payer.reply', why: 'Needs clinician' },
  closed: { label: 'View', text: 'Closed.', cap: null, why: '' }
};
export function openUnitTask(s, r) {
  const c = clientOf(s, r); if (!c) return null;
  return (s.lauris_tasks || []).find(t => t.client === c.id && t.status === 'open' && (!t.request || t.request === r.id)) || null;
}
export function nextAction(s, r, me) {
  let n = NEXT[r.stage] || { label: 'View', text: '', cap: null, why: '' };
  let key = r.stage;
  if (r.stage === 'submitted') { const dd = decisionDay(s, r.sent, s.today, r.payer); if (dd && dd.followup_due) { n = { label: 'Call payer', text: `Day ${dd.day}: log the follow-up call.`, cap: 'send.packet', why: 'Needs sender' }; key = 'followup'; } }
  if (r.stage === 'active') {
    const task = openUnitTask(s, r); const rn = renewal(s, r);
    if (task) { n = { label: 'Enter units', text: `Enter ${task.units} units in Lauris (a person does it).`, cap: null, why: '' }; key = 'units_task'; }
    else if (rn && rn.due) { n = { label: 'Start renewal', text: 'Units or the window are running out.', cap: 'drafts.clinical', why: 'Needs clinician' }; key = 'renewal'; }
  }
  const allowed = !n.cap || can(me, n.cap);
  return { key, label: n.label, text: n.text, cap: n.cap, allowed: !!allowed, why: allowed ? '' : n.why, di: !!n.di };
}

// ---------------------------------------------------------------------------------------------------------------- the queue
function chipsOf(s, r) {
  const g = GROUP[r.stage] || 'closed'; const set = new Set(['all']);
  const dd = r.stage === 'submitted' ? decisionDay(s, r.sent, s.today, r.payer) : null;
  if (g === 'needs' || (dd && (dd.followup_due || dd.overdue))) set.add('needs');
  if (g === 'draft') set.add('draft');
  if (g === 'awaiting') set.add('awaiting');
  if (g === 'submitted' || r.stage === 'overdue') set.add('submitted');
  if (g === 'active') set.add('active');
  const rn = renewal(s, r); if (rn && rn.due) set.add('renewal');
  return set;
}
function periodOf(s, r) {
  const u = unitsView(s, r);
  const [d0, d1] = String(r.dates || '').split(' to ');
  const start = (isDate(d0) && d0) || u.start || null; const end = (isDate(d1) && d1) || u.end || r.renew_by || null;
  return { start, end };
}
export function rowOf(s, r0, me) {
  const r = reqView(s, r0); const c = clientOf(s, r); const sc = schoolOf(s, r); const own = ownerOf(s, r);
  const u = unitsView(s, r); const dl = deadline(s, r); const na = nextAction(s, r, me);
  const tags = chipsOf(s, r); const per = periodOf(s, r);
  const payer = M.payer(s, r.payer);
  const label = M.clientLabel(s, r.client);
  let type = M.TYPE_LABEL[r.type] || r.type; if (r.stage === 'info_requested' || r.info_reply) type += ' · info';
  return {
    id: r.id, clientId: r.client, label, initials: c ? c.initials : String(r.client).split(',')[0], school: sc ? sc.name : '', locality: sc ? sc.locality || String(sc.name).split(' · ')[0] : '',
    payerId: r.payer, payer: payerName(s, r.payer), payerFull: payer.name, channel: M.CHANNEL_LABEL[r.channel] || r.channel, service: serviceShort(r), type: r.type, typeLabel: type,
    stage: r.stage, group: GROUP[r.stage] || 'closed', tags: [...tags], inDI: DI_STAGES.includes(r.stage),
    units: u, deadline: dl, owner: own, next: na, period: per, req: r,
    ref: r.fax_ref || r.portal_ref || ''
  };
}
// the sort value of each column
const GROUP_ORDER = ['needs', 'awaiting', 'draft', 'submitted', 'denial', 'active', 'closed'];
const SEV_ORDER = { overdue: 0, soon: 1, ok: 2, none: 3 };
export const SORTERS = {
  case: r => r.label, payer: r => r.payer, type: r => r.typeLabel,
  status: r => GROUP_ORDER.indexOf(r.group) * 100 + STAGE_LIST.indexOf(r.stage),
  units: r => (r.units.left != null ? r.units.left : r.units.requested), deadline: r => r.deadline.date || '9999', owner: r => r.owner.name, next: r => r.next.label,
  priority: r => SEV_ORDER[r.deadline.sev] * 10000 + GROUP_ORDER.indexOf(r.group) * 100 + STAGE_LIST.indexOf(r.stage)
};
function sortRows(rows, key, dir) {
  const g = SORTERS[key] || SORTERS.priority; const d = dir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => { const x = g(a), y = g(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return (c || a.id.localeCompare(b.id)) * d; });
}
function matches(s, row, f) {
  if (f.q) { const q = f.q.toLowerCase(); const hay = [row.id, row.label, row.initials, row.school, row.payer, row.payerFull, row.typeLabel, row.service, row.owner.name, row.ref, M.STAGE_LABEL[row.stage]].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
  if (f.payer && row.payerId !== f.payer) return false;
  if (f.type && row.type !== f.type) return false;
  if (f.owner && row.owner.id !== f.owner) return false;
  if (f.stage && row.stage !== f.stage) return false;
  if (f.site && row.locality !== f.site) return false;
  if (f.from || f.to) { const { start, end } = row.period; if (!start && !end) return false; if (f.to && start && start > f.to) return false; if (f.from && end && end < f.from) return false; }
  if (f.ends) { const e = row.units.end || row.period.end; if (!e) return false; if (e < s.today || e > addDays(s.today, +f.ends)) return false; }
  return true;
}
// authQueue(s, filters, me): filters are the canonical ones (normalizeParams). counts ignore the status chip so each chip shows what it would give.
export function authQueue(s, filters = {}, me) {
  const f = { q: '', status: '', payer: '', type: '', owner: '', stage: '', site: '', ends: '', from: '', to: '', sort: '', dir: 'asc', ...filters };
  const all = (s.requests || []).map(r => rowOf(s, r, me));
  const base = all.filter(row => matches(s, row, f));
  const counts = { all: base.length }; for (const c of CHIP_VALUES) counts[c] = base.filter(row => row.tags.includes(c)).length;
  const shown = f.status ? base.filter(row => row.tags.includes(f.status)) : base;
  const key = f.sort && SORTERS[f.sort] ? f.sort : 'priority';
  return { rows: sortRows(shown, key, f.sort ? f.dir : 'asc'), counts, total: all.length, shown: shown.length, filters: f, sort: { key, dir: f.sort ? f.dir : 'asc' }, all };
}
// the select options the queue offers, from the rows that exist
export function queueOptions(s) {
  const reqs = s.requests || []; const rows = reqs.map(r => rowOf(s, r, null));
  const uniq = (arr, key) => [...new Map(arr.map(x => [key(x), x])).values()];
  return {
    payers: uniq(rows, x => x.payerId).map(x => [x.payerId, x.payer]).sort((a, b) => a[1].localeCompare(b[1])),
    types: uniq(rows, x => x.type).map(x => [x.type, M.TYPE_LABEL[x.type] || x.type]),
    owners: uniq(rows.filter(x => x.owner.id), x => x.owner.id).map(x => [x.owner.id, x.owner.name]),
    sites: [...new Set(rows.map(x => x.locality).filter(Boolean))].sort().map(x => [x, x]),
    stages: STAGE_LIST.filter(st => reqs.some(r => r.stage === st)).map(st => [st, M.STAGE_LABEL[st] || st])
  };
}

// ---------------------------------------------------------------------------------------------------------------- the case
// The four steps of getting a request to a payer, each done by a person with the capability; the state each produces.
export function flowOf(s, r, me) {
  const idx = { draft_ready: 0, needs_approval: 1, awaiting_signature: 2, signed: 3 }[r.stage];
  const cur = idx != null ? idx : 4;
  const approver = r.approved_by ? whoName(s, r.approved_by) : '';
  const rec = (when, who) => [who, when && fmtDateTime(when)].filter(Boolean).join(' · ');
  const steps = [
    { key: 'review', label: 'Review packet', who: 'Clinician', produces: 'Processed in Lauris', cap: 'drafts.clinical', done: cur > 0, current: cur === 0,
      detail: r.processed_at ? rec(r.processed_at, whoName(s, r.processed_by) || '') : cur > 0 ? 'Not recorded' : 'Process Form is pressed in Lauris' },
    { key: 'approve', label: 'Approve', who: 'Designated approver', produces: 'Pending clinical approval', cap: 'approve.sra', done: cur > 1, current: cur === 1,
      detail: r.approval ? rec(r.approval.at || r.approved_at, r.approval.by_name || approver) : cur > 1 ? 'Not recorded' : cur === 1 ? 'Waiting for an approver' : 'After Process Form' },
    { key: 'sign', label: 'Sign in Lauris', who: 'LMHP-type signer', produces: 'Awaiting signature', cap: null, done: cur > 2, current: cur === 2,
      detail: r.signed_at ? rec(r.signed_at, r.signed_by || '') : cur > 2 ? 'Not recorded' : cur === 2 ? 'Get Signature is pressed in Lauris' : 'After approval' },
    { key: 'send', label: 'Send', who: 'Clinician or site supervisor', produces: r.stage === 'signed' ? 'Signed · ready to send' : 'Submitted', cap: 'send.packet', done: cur > 3, current: cur === 3,
      detail: r.sent ? rec(r.sent, whoName(s, r.sent_by) || '') : r.send_pressed_at ? rec(r.send_pressed_at, whoName(s, r.sent_by)) : cur > 3 ? 'Not recorded' : cur === 3 ? 'A person presses Send' : 'After signature' }
  ];
  for (const st of steps) st.allowed = !st.cap || can(me, st.cap);
  return { steps, current: cur, labels: steps.map(x => x.label) };
}

function laurisNo(s, r) { const c = clientOf(s, r); return c ? c.lauris_no || c.harvest_no || null : null; }
export function documents(s, r) {
  const out = []; const c = clientOf(s, r); const no = laurisNo(s, r);
  const formKey = r.type === 'initial' || r.type === 'early_discharge_new_initial' ? 'sra-initial' : 'sra-continued';
  out.push({ key: 'form', kind: 'Lauris form', name: r.type === 'initial' ? 'Initial SRA' : r.type === 'early_discharge_new_initial' ? 'Initial SRA (new)' : r.type === 'continued_stay' ? 'Continued stay SRA' : M.TYPE_LABEL[r.type] || 'Request',
    status: r.stage === 'draft_ready' ? 'Draft ready' : r.processed_at ? 'Processed in Lauris' : PRE_SEND.includes(r.stage) ? 'In Lauris' : 'Sent', when: r.processed_at || r.drafted_at || null, lauris: no ? { no, form: formKey } : null });
  if (r.signed_pdf) out.push({ key: 'signed', kind: 'Signed copy', name: 'Signed PDF', status: String(r.signed_pdf).startsWith('/files/') ? 'Stored in Psyflo' : 'In Lauris', when: r.signed_at || null, href: String(r.signed_pdf).startsWith('/files/') ? r.signed_pdf : null, note: String(r.signed_pdf).startsWith('/files/') ? `${r.pages || ''}${r.pages ? ' pages · ' : ''}signed by ${r.signed_by || 'not recorded'}` : 'Signed before this tracker: the copy is in Lauris (Forms to Approve, Active File).' });
  if (r.payer === 'uhc') for (const a of ruleValue(s, 'packet.uhc.attachments', [])) out.push({ key: 'att-' + a, kind: 'Packet', name: a, status: 'Attached for UnitedHealthcare', when: null, note: 'Attachment list is Harvest-reported.' });
  if (r.delivery_receipt) out.push({ key: 'receipt', kind: 'Receipt', name: 'Sfax delivery receipt', status: 'Simulated', when: r.sent || null, href: r.delivery_receipt, sim: true, note: `Reference ${r.fax_ref || ''}`.trim() });
  if (r.portal_ref) out.push({ key: 'portal', kind: 'Receipt', name: 'Portal confirmation', status: 'Read from the open portal page', when: r.sent || null, note: `Confirmation ${r.portal_ref}` });
  if (r.appeal && r.appeal.file) out.push({ key: 'appeal', kind: 'Appeal', name: 'Appeal letter', status: r.appeal.sent_at ? 'Sent' : 'Signed by the guardian', when: r.appeal.signed_at || null, href: String(r.appeal.file).startsWith('/files/') ? r.appeal.file : null });
  return out;
}

// the stored records a statement can rest on; text only for roles that may read clinical text
export function evidenceOf(s, r, me) {
  const c = clientOf(s, r); const clinical = can(me, 'notes.view') && me && me.role === 'clinician'; const out = { clinical, sources: [], missing: [], future: [], gaps: [], counts: null, window: ruleValue(s, 'evidence.current_window_days', 30), windowRule: rule(s, 'evidence.current_window_days') };
  if (!c) { out.missing.push({ label: 'student record', why: 'no stored student record for this request' }); return out; }
  const from = addDays(s.today, -out.window);
  const notes = (s.notes || []).filter(n => n.client === c.id);
  const inWin = notes.filter(n => n.date && n.date >= from);
  const by = t => notes.filter(n => n.type === t).length; const byW = t => inWin.filter(n => n.type === t).length;
  out.counts = { daily: by('daily'), weekly: by('weekly_guardian'), monthly: by('monthly_collateral'), dailyWindow: byW('daily'), weeklyWindow: byW('weekly_guardian'), monthlyWindow: byW('monthly_collateral') };
  const add = (label, date, source, extra = {}) => out.sources.push({ label, date: date ? fmtDate(String(date).slice(0, 10)) : '', source, ...extra });
  const tl = c.timeline || {};
  if (r.type !== 'initial' && r.type !== 'early_discharge_new_initial') {
    if (out.counts.daily) add(`${out.counts.daily} daily note${out.counts.daily === 1 ? '' : 's'} stored`, null, `Processed notes in Psyflo (${out.counts.dailyWindow} in the last ${out.window} days)`, { count: out.counts.daily });
    if (out.counts.weekly) add(`${out.counts.weekly} weekly guardian call${out.counts.weekly === 1 ? '' : 's'}`, null, 'Processed notes in Psyflo', { count: out.counts.weekly });
    if (out.counts.monthly) add(`${out.counts.monthly} monthly collateral`, null, 'Processed notes in Psyflo', { count: out.counts.monthly });
    // what is missing is the evidence index's list, the same one the Scan & Enhance panel prints for this student and period.
    // A role that holds no note text sees the structural gaps only (days, weeks, months, units): text-based ones would read as "missing" when they are withheld.
    const idx = evidenceIndex(s, c.id);
    const structural = new Set(['days', 'weeks', 'months', 'units']);
    const all = idx.gaps.filter(g => clinical || structural.has(g.id));
    out.gaps = all.map(g => ({ id: g.id, text: g.text, label: g.kind === 'missing' ? String(g.text).replace(/^Evidence missing — verify /, '').replace(/\.$/, '') : g.text, why: '', missing: g.kind === 'missing', dates: g.dates || [] }));
    out.missing = out.gaps.filter(g => g.missing);
    out.future = out.gaps.filter(g => !g.missing);
    out.period = idx.period; out.panelGaps = idx.gaps.length;
  } else {
    const ref = (s.referrals || []).find(x => x.id === c.referral);
    if (ref) add('School referral form', ref.received, `Referral ${ref.id}`); else out.missing.push({ label: 'school referral form', why: 'no referral record is linked' });
    const sc = (s.screenings || []).find(x => x.client === c.id && (x.status === 'done' || x.processed_at));
    if (sc) add('Screening call', sc.when || tl.screening, 'Screening processed in Lauris'); else if (tl.screening) add('Screening call', tl.screening, 'Screening processed in Lauris'); else out.missing.push({ label: 'screening call', why: 'not processed' });
    if (tl.intake) add('Intake / CNA', tl.intake, 'CNA processed in Lauris'); else out.missing.push({ label: 'intake / CNA', why: 'not processed' });
    if (tl.isp) add('Treatment plan (ISP)', tl.isp, 'ISP processed in Lauris'); else out.missing.push({ label: 'treatment plan (ISP)', why: 'not processed' });
    if (c.medicaid && c.medicaid.checked_on) add('Eligibility check', c.medicaid.checked_on, 'DMAS result recorded by a person (simulated lookup)'); else out.missing.push({ label: 'eligibility check', why: 'no dated result recorded' });
  }
  return out;
}

// events for ui.timeline: the audit trail plus the dates the request itself implies (nothing invented)
const ACTOR = { person: 'staff', bridge: 'lauris', system: 'psyflo', integration: 'system', portal: 'family', demo: 'system' };
export function timelineOf(s, r, me) {
  const ev = M.eventsFor(s, r.id);
  const hist = M.requestHistory(s, r);
  const na = nextAction(s, r, me);
  const out = [];
  const doc = e => {
    if (/signed PDF saved|Get Signature pressed/i.test(e.what) && r.signed_pdf && String(r.signed_pdf).startsWith('/files/')) return { name: 'Signed PDF', href: r.signed_pdf };
    if (/delivery receipt/i.test(e.what) && r.delivery_receipt) return { name: 'Sfax receipt (simulated)', href: r.delivery_receipt };
    return null;
  };
  const src = e => e.via || (e.actor_kind === 'bridge' ? 'Open Lauris page (page bridge)' : e.actor_kind === 'system' ? 'Psyflo, rule-based' : e.actor_kind === 'integration' ? 'Simulated integration' : e.actor_kind === 'demo' ? 'Presenter control' : e.actor_kind === 'portal' ? 'Portal' : 'Recorded by a person in Psyflo');
  ev.forEach((e, i) => out.push({ id: `${r.id}:e${i}`, at: e.at, what: e.what.replace(/^Refused · /, 'Refused · '), who: whoName(s, e.who), actor: /payer/i.test(e.who || '') ? 'payer' : ACTOR[e.actor_kind] || 'staff', sim: !!e.sim, document: doc(e), source: src(e), tone: e.refused ? 'danger' : undefined }));
  const rd = reauthDue(s, r);
  hist.filter(h => h.derived && h.at).forEach((h, i) => {
    // the model's derived "Renewal due" sits on the end date; the lead time puts it earlier (rules table)
    const re = rd && /^Renewal due$/.test(h.what) ? { at: rd.date, what: `Reauth due · ${rd.sub}`, upcoming: rd.date > s.today } : null;
    const x = re ? { ...h, ...re } : h;
    out.push({ id: `${r.id}:d${i}`, at: x.at, what: (x.upcoming ? 'Upcoming · ' : '') + x.what, who: '', actor: 'system', sim: false, source: re ? 'Lead time from the rules table (unverified demo assumption)' : 'Derived from the request record and the rules table', tone: x.upcoming ? 'warning' : undefined });
  });
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const latest = out.find(x => !String(x.what).startsWith('Upcoming')); if (latest && na.text) latest.next = { label: na.text };
  return out;
}

// the payer side: calls, decisions, sends and replies, newest first
export function payerLog(s, r) {
  const rows = [];
  const m = (s.auth_meta || {})[r.id] || {};
  for (const d of r.decision_log || []) rows.push({ at: d.at, what: `Decision recorded · ${d.outcome}${d.units ? ' · ' + d.units + ' units' : ''}`, who: whoName(s, d.by), doc: d.doc_ref, sim: !!d.sim, kind: 'decision' });
  for (const c of m.calls || []) rows.push({ at: c.at, what: `Call${c.day != null ? ' on day ' + c.day : ''} · ${c.outcome.replace(/_/g, ' ')}${c.note ? ' · ' + c.note : ''}`, who: whoName(s, c.by), kind: 'call' });
  if (r.receipt_confirmed && !(m.calls || []).some(c => c.outcome === 'receipt_confirmed')) rows.push({ at: r.receipt_confirmed, what: 'Receipt confirmed by phone', who: whoName(s, r.receipt_by), kind: 'call' });
  for (const x of r.resends || []) rows.push({ at: x.at, what: `Sent again · ${x.reason}${x.ref ? ' · ref ' + x.ref : ''}`, who: whoName(s, x.by), sim: true, kind: 'send' });
  if (r.overdue_notice_sent) rows.push({ at: r.overdue_notice_sent, what: `Overdue notice sent${r.overdue_notice_ref ? ' · ref ' + r.overdue_notice_ref : ''}`, who: whoName(s, r.overdue_notice_by), sim: true, kind: 'send' });
  if (r.info_requested_at) rows.push({ at: r.info_requested_at, what: 'Payer asked for more information', who: 'Payer', kind: 'payer' });
  if (r.info_reply && r.info_reply.sent_at) rows.push({ at: r.info_reply.sent_at, what: `Reply to the information request sent${r.info_reply.ref ? ' · ref ' + r.info_reply.ref : ''}`, who: whoName(s, r.info_reply.by), sim: true, kind: 'send' });
  if (r.offer_call) rows.push({ at: r.offer_call, what: `Payer offered ${r.units_offered || '?'} of ${r.units_requested} units`, who: 'Payer', kind: 'payer' });
  if (r.denied_on) rows.push({ at: r.denied_on, what: `Denied${r.denial_reason ? ': "' + r.denial_reason + '"' : ''}`, who: 'Payer', kind: 'payer' });
  return rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// submission record: what was sent, how, the reference (only from the stub or the open portal page), receipts
export function submissionOf(s, r) {
  const m = (s.auth_meta || {})[r.id] || {};
  const sent = !!r.sent || ['sending', 'portal_open'].includes(r.stage) || !!r.send_pressed_at;
  const rows = [];
  const ch = r.channel === 'fax' ? 'Sfax (simulated)' : `${M.CHANNEL_LABEL[r.channel] || r.channel} · the clinician's own login`;
  rows.push({ k: 'Channel', v: ch, sim: r.channel === 'fax' });
  rows.push({ k: 'Reference', v: r.fax_ref || r.portal_ref || (r.stage === 'sending' ? 'Waiting for Sfax' : r.stage === 'portal_open' ? 'Waiting for the portal confirmation' : sent ? 'Not recorded' : 'After Send'), sim: !!r.fax_ref });
  rows.push({ k: 'Sent', v: r.sent ? `${fmtDateTime(r.sent)}${r.sent_by ? ' · ' + whoName(s, r.sent_by) : ''}` : sent ? 'In progress' : 'Not sent yet' });
  if (r.pages) rows.push({ k: 'Pages', v: String(r.pages) });
  rows.push({ k: 'Delivery', v: r.delivery_receipt ? 'Receipt stored' : r.portal_ref ? 'Confirmation read from the open portal page' : r.stage === 'sending' ? 'Waiting for the receipt' : sent ? 'Not recorded' : '—', href: r.delivery_receipt || null, sim: !!r.delivery_receipt });
  const calls = m.calls || [];
  rows.push({ k: 'Receipt call', v: r.receipt_confirmed ? `Confirmed ${fmtDateTime(r.receipt_confirmed)}${r.receipt_by ? ' · ' + whoName(s, r.receipt_by) : ''}` : r.receipt_check ? `Due ${fmtDate(r.receipt_check)}` : sent ? 'Not logged' : '—' });
  if (calls.length) rows.push({ k: 'Calls logged', v: String(calls.length) });
  if ((r.resends || []).length) rows.push({ k: 'Sent again', v: `${r.resends.length} time${r.resends.length === 1 ? '' : 's'}` });
  if (r.overdue_notice_sent) rows.push({ k: 'Overdue notice', v: `Sent ${fmtDateTime(r.overdue_notice_sent)}`, sim: true });
  return { sent, rows, canResend: ['submitted', 'overdue'].includes(r.stage), canNotice: ['submitted', 'overdue'].includes(r.stage) && !r.overdue_notice_sent, canCall: ['submitted', 'overdue'].includes(r.stage), canDecide: ['submitted', 'overdue'].includes(r.stage) };
}

// tasks: the people-steps the case is waiting on (nothing here is automatic)
export function tasksOf(s, r, me) {
  const out = []; const c = clientOf(s, r); const own = ownerOf(s, r);
  const add = t => out.push({ owner: own.short, ...t });
  if (r.stage === 'draft_ready') add({ key: 'review', text: 'Review the packet in Lauris', state: 'open', cap: 'drafts.clinical', who: 'Clinician' });
  if (r.stage === 'needs_approval') add({ key: 'approve', text: 'Approve for signature', state: 'open', cap: 'approve.sra', who: 'Designated approver' });
  if (r.stage === 'awaiting_signature') add({ key: 'sign', text: 'Get Signature in Lauris', state: 'open', cap: null, who: 'LMHP-type signer' });
  if (r.stage === 'signed') add({ key: 'send', text: 'Press Send', state: 'open', cap: 'send.packet', who: 'Clinician or site supervisor' });
  if (r.stage === 'portal_open') add({ key: 'upload', text: `Upload in ${M.CHANNEL_LABEL[r.channel]}`, state: 'open', cap: 'send.packet', who: 'Sender' });
  if (r.stage === 'submitted') { const dd = decisionDay(s, r.sent, s.today, r.payer); if (dd) add({ key: 'followup', text: `Follow-up call on day ${dd.followup_day}`, due: dd.followup_date, state: ((s.auth_meta || {})[r.id] || {}).calls?.length || r.receipt_confirmed ? 'done' : 'open', cap: 'send.packet', who: 'Sender', rule: rule(s, 'decision.followup_day', r.payer) }); }
  if (r.stage === 'overdue') add({ key: 'notice', text: 'Send the overdue notice', state: r.overdue_notice_sent ? 'done' : 'open', cap: 'send.packet', who: 'Sender' });
  if (DI_STAGES.includes(r.stage)) add({ key: 'di', text: 'Work this in Denial Intelligence', state: 'open', cap: 'payer.reply', who: 'Clinician' });
  for (const t of (s.lauris_tasks || []).filter(x => c && x.client === c.id && (!x.request || x.request === r.id)))
    out.push({ key: 'lauris-' + t.id, text: t.status === 'open' ? 'Enter units in Lauris' : t.status === 'done' ? 'Units entered in Lauris' : 'Enter units in Lauris (replaced)', detail: t.text, state: t.status, owner: own.short, who: 'A person on the Lauris Authorizations page', task: t, closedBy: t.closed_by, closedAt: t.closed_at, observed: t.observed_available, units: t.units, bridge: true });
  for (const rm of (s.reminders || []).filter(x => x.record === r.id)) out.push({ key: 'rem-' + rm.id, text: rm.text, due: rm.due, state: rm.done ? 'done' : 'open', owner: staffShort(s, rm.for), who: 'Reminder' });
  return out;
}

// transition (early discharge): computed from the units and the rules; a clinician sets the plan. Every assumption is stated.
export const schoolDayFrom = d => { let x = String(d).slice(0, 10); while (!isSchoolDay(x)) x = addDays(x, 1); return x; };
export const runOutDate = (start, units, rate = 3) => addBusinessDays(schoolDayFrom(start), Math.max(0, Math.ceil(units / rate) - 1));
export function transitionOf(s, r) {
  const c = clientOf(s, r); const a = c && c.authorization;
  const relevant = ['early_discharge', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'active'].includes(r.stage);
  const units = r.units_awarded || r.units_offered || (a && a.units) || 0;
  if (!relevant || !units) return { relevant: false, plan: null };
  const rate = rateOf(s, r); const perDay = (rate && rate.value) || ruleValue(s, 'units.rate_per_school_day', 3);
  const saved = (s.plans || []).find(p => p.request === r.id) || null;
  const gapRule = rule(s, 'early_discharge.min_gap_days'); const gap = ruleValue(s, 'early_discharge.min_gap_days', 30);
  const accepted = String((r.decision && r.decision.at) || (saved && saved.at) || s.today).slice(0, 10);
  const start = a && a.payer === r.payer && a.start ? a.start : accepted;
  const runout = (a && a.exhausted) || runOutDate(start, units, perDay);
  const earliest = (saved && saved.new_initial) || addDays(accepted, gap);
  let discharge = saved ? saved.discharge : runout;
  if (!saved) { while (dow(discharge) !== 'Fri') discharge = addDays(discharge, -1); if (discharge < s.today) discharge = runout; }
  let intake = saved ? saved.intake : addBusinessDays(discharge, 1);
  if (!saved && intake < earliest) intake = schoolDayFrom(earliest);
  const send = intake; const dd = ruleValue(s, 'decision.overdue_after_days', 14); const decision = addDays(send, dd);
  const reminder = addBusinessDays(discharge, -9);
  const gapDays = Math.max(0, businessDaysBetween(discharge, intake) - 1);
  const lapse = ruleValue(s, 'discharge.lapse_days', 31);
  return {
    relevant: true,
    plan: { units, accepted, start, runout, earliest, discharge, intake, send, decision, reminder, gapDays, saved, exhausted: !!(a && a.exhausted), perDay, decisionDays: dd },
    assumptions: [
      { text: `${perDay} units per school day (demo rate)`, rule: rule(s, 'units.rate_per_school_day') },
      { text: `${gap} days between accepting and the new initial (Harvest practice)`, rule: gapRule },
      { text: `More than ${lapse} days without service means discharge`, rule: rule(s, 'discharge.lapse_days') },
      { text: `Decision window ${dd} days after sending (Harvest-reported)`, rule: rule(s, 'decision.overdue_after_days', r.payer) }
    ]
  };
}

// who may do what here (for the screen: a disabled control says why)
export function capsFor(me) {
  const c = k => !!can(me, k);
  return { approve: c('approve.sra'), send: c('send.packet'), decide: c('payer.decision'), reply: c('payer.reply'), clinical: c('drafts.clinical'), viewText: !!(me && me.role === 'clinician' && c('notes.view')), assign: c('authorizations'), pdf: c('authorizations') };
}

export function authCase(s, id, me) {
  const r0 = (s.requests || []).find(x => x.id === id); if (!r0) return null;
  const r = reqView(s, r0); const c = clientOf(s, r); const sc = schoolOf(s, r); const own = ownerOf(s, r);
  const flow = flowOf(s, r, me); const u = unitsView(s, r); const dl = deadline(s, r); const na = nextAction(s, r, me); const rn = renewal(s, r);
  const task = openUnitTask(s, r);
  return {
    id: r.id, req: r, client: c || null, clientId: r.client, label: M.clientLabel(s, r.client), initials: c ? c.initials : String(r.client).split(',')[0], harvestNo: c ? c.harvest_no || null : null, laurisNo: laurisNo(s, r),
    school: sc ? sc.name : '', payer: payerName(s, r.payer), payerId: r.payer, payerFull: M.payer(s, r.payer).name, channel: r.channel, channelLabel: M.CHANNEL_LABEL[r.channel] || r.channel, service: serviceShort(r), serviceFull: r.service || '',
    type: r.type, typeLabel: M.TYPE_LABEL[r.type] || r.type, stage: r.stage, group: GROUP[r.stage] || 'closed', inDI: DI_STAGES.includes(r.stage), owner: own,
    flow, next: na, deadline: dl, units: u, renewal: rn, unitTask: task, unitRule: unitRule(s, r.service), caps: capsFor(me),
    docs: documents(s, r), evidence: evidenceOf(s, r, me), submission: submissionOf(s, r), timeline: timelineOf(s, r, me), payerLog: payerLog(s, r), tasks: tasksOf(s, r, me), transition: transitionOf(s, r),
    signatureFlag: r.signature_flag || null, calls: ((s.auth_meta || {})[r.id] || {}).calls || []
  };
}

// ---------------------------------------------------------------------------------------------------------------- referrals and eligibility
// The five states of an eligibility check (review/00 resolution 11): details received -> check required -> checked by an authorized user ->
// result with date and source -> follow-up scheduled. Derived from the records; the DMAS lookup itself is a simulated page.
export function eligibilityPanel(s, refId, me) {
  const r = M.byId(s.referrals, refId) || null; const el = (s.eligibility || []).find(e => e.referral === refId) || null; const fl = (s.family_links || []).find(f => f.referral === refId) || null;
  const c = M.byId(s.clients, (r && r.client) || (el && el.client));
  const detailsAt = (el && el.details_at) || (fl && fl.submitted_at) || null;
  const recorded = !!el && el.status === 'recorded';
  const due = recorded && !!el.next_check && el.next_check <= s.today;
  const every = rule(s, 'eligibility.recheck_days');
  const rem = (s.reminders || []).find(x => x.kind === 'eligibility_recheck' && x.record === refId && !x.done) || null;
  const lookup = (el && el.lookup) || (fl && fl.submitted_at ? { medicaid_id: fl.answers && fl.answers.medicaid_id, dob: fl.answers && fl.answers.dob, plan_kind: fl.answers && fl.answers.plan_kind } : null);
  const who = el && el.checked_by ? staffShort(s, el.checked_by) : '';
  const steps = [
    { key: 'details', label: 'Details received', done: !!detailsAt, detail: detailsAt ? fmtDateTime(detailsAt) : fl && fl.sent_at ? 'Waiting for the guardian' : 'Family link not sent' },
    { key: 'required', label: 'Check required', done: recorded && !due, detail: !detailsAt ? 'After the details arrive' : recorded ? (due ? `Re-check due ${fmtDate(el.next_check)}` : 'Done') : 'A person runs the DMAS lookup' },
    { key: 'checked', label: 'Checked by an authorized user', done: recorded, detail: recorded ? `${who} · ${fmtDateTime(el.checked_at)}` : 'Needs eligibility access' },
    { key: 'result', label: 'Result', done: recorded, detail: recorded ? `${el.result === 'active' ? 'Active' : 'Not active'}${el.plan ? ' · ' + (M.byId(s.payers, el.plan) ? payerName(s, el.plan) : el.plan) : ''}` : 'Date and source are kept with it' },
    { key: 'followup', label: 'Follow-up scheduled', done: !!(recorded && el.next_check), detail: recorded && el.next_check ? `${fmtDate(el.next_check)}${rem ? ' · reminder set' : ''}` : recorded ? 'No re-check configured' : 'After the result' }
  ];
  const cur = steps.findIndex(x => !x.done);
  steps.forEach((x, i) => { x.current = i === (cur < 0 ? -1 : cur); });
  const history = recorded ? [...(el.history || []), el].map((h, i, a) => ({ i, at: h.checked_at, by: h.checked_by ? staffShort(s, h.checked_by) : '', result: h.result, plan: M.byId(s.payers, h.plan) ? payerName(s, h.plan) : '', effective: h.effective || '', shot: h.screenshot || '', file: h.file || null, current: i === a.length - 1, record: h })) : [];
  return { found: !!r, ref: r, client: c || null, el, fl, status: recorded ? 'recorded' : detailsAt ? 'details' : 'waiting', recorded, due, lookup, steps, current: cur, history, every, reminder: rem, canRun: !!can(me, 'eligibility.run'), active: !!el && el.result === 'active', nextCheck: recorded ? el.next_check : null };
}
// the clock for the initial request, from the ONE configured start event (rule initial_sra.start_event); never a story date
export function clock30(s, clientId) {
  const c = M.byId(s.clients, clientId); const tl = (c && c.timeline) || {};
  const want = ruleValue(s, 'initial_sra.start_event', 'intake_processed');
  const by = { consent_signed: tl.consent_signed, screening_processed: tl.screening || (c && c.clock30_start), intake_processed: tl.intake };
  let event = want, date = by[want] || null, fallback = false;
  if (!date) { const alt = ['intake_processed', 'screening_processed', 'consent_signed'].find(k => by[k]); if (alt) { event = alt; date = by[alt]; fallback = true; } }
  const n = ruleValue(s, 'initial_sra.send_within_days', 30);
  const start = date ? String(date).slice(0, 10) : null; const sendBy = start ? addDays(start, n) : null;
  return { want, event, start, fallback, days: n, sendBy, daysLeft: sendBy ? daysBetween(s.today, sendBy) : null, rule: rule(s, 'initial_sra.send_within_days'), startRule: rule(s, 'initial_sra.start_event') };
}
export function consentOf(s, clientId) {
  const list = (s.consents || []).filter(x => x.client === clientId && x.form === 'Consent for services'); const last = list.at(-1) || null;
  const mode = ruleValue(s, 'signature.mode.consent', 'pending_validation');
  return { signed: !!last && last.status === 'signed', record: last, versions: list.length, mode, rule: rule(s, 'signature.mode.consent') };
}
