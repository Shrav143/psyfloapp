// 29 · Authorizations — the prior-authorization tracker for Level 1 and Level 2.1 (IOP), live over state.requests.
// Also exports small helpers shared by the other request screens (Sent, Info request, Partials,
// Step-down, Peer-to-peer, Reconsideration letter) so they read requests the same way.
import { register, Screen, M, raw, esc, modal, toast, session, api } from '../app.js';
import { addDays, dow } from '../shared/dates.js';

// ---------- shared request helpers ----------
export const details = (s, id) => (s.request_details && s.request_details[id]) || {};
// the live row wins; seeded tracker fields fill what the seed row lacks
export const view = (s, r) => r ? { ...(details(s, r.id).fill || {}), ...r } : null;
export const findReq = (s, id) => view(s, M.byId(s.requests, id));
// the request a screen shows: ?id if it exists, else the first fallback id that exists, else the first matching pred
export function pickReq(s, id, fallbacks = [], pred = () => false) {
  if (id) { const r = findReq(s, id); if (r) return r; }
  for (const f of fallbacks) { const r = findReq(s, f); if (r) return r; }
  const r = s.requests.find(pred);
  return r ? view(s, r) : null;
}
export const clientOf = (s, r) => M.byId(s.clients, r.client);
export const schoolName = (s, r) => { const c = clientOf(s, r); const sc = c?.school || details(s, r.id).school; return sc ? M.school(s, sc).name : ''; };
export const programName = schoolName;

// ASAM level of the request: Level 2.1 IOP (H0015, 1 unit = 1 hour, 3 units per IOP day) or Level 1 outpatient (weekly sessions)
export function levelOf(s, r) {
  const sv = r.service || '';
  if (r.type === 'early_discharge_new_initial') return '1';
  if (/2\.1|H0015|IOP|intensive/i.test(sv)) return '2.1';
  if (/level 1|H0004|H0005|9083\d|outpatient/i.test(sv)) return '1';
  const v = String(r.level || (s && clientOf(s, r)?.level) || '');
  return v.startsWith('2') ? '2.1' : '1';
}
export const LEVEL_LABEL = { '2.1': 'Level 2.1 · IOP', '1': 'Level 1 · outpatient' };
// units per IOP day (Level 2.1: 3 hours a day = 3 units of H0015); 0 for Level 1, which counts weekly sessions
export const rateFor = (r, s) => levelOf(s, r) === '2.1' ? 3 : 0;

// IOP days: 3 hours a day, 3 days a week (Mon · Wed · Fri in the demo schedule)
export const IOP_DOW = ['Mon', 'Wed', 'Fri'];
export const isIopDay = d => IOP_DOW.includes(dow(d));
export const iopDayFrom = d => { let x = String(d).slice(0, 10); while (!isIopDay(x)) x = addDays(x, 1); return x; };
export function addIopDays(d, n) { let x = String(d).slice(0, 10); let left = Math.abs(n); const st = n < 0 ? -1 : 1; while (left > 0) { x = addDays(x, st); if (isIopDay(x)) left--; } return x; }
// IOP days strictly after a, up to and including b
export function iopDaysBetween(a, b) { let n = 0, x = String(a).slice(0, 10); const end = String(b).slice(0, 10); while (x < end) { x = addDays(x, 1); if (isIopDay(x)) n++; } return n; }
// last IOP day the units cover, at `rate` units per IOP day from `start` (start counts if it is an IOP day)
export const iopRunOut = (start, units, rate = 3) => addIopDays(iopDayFrom(start), Math.max(0, Math.ceil(units / rate) - 1));
// the nth IOP day from start (n = 1 is the first)
export const nthIopDay = (start, n) => addIopDays(iopDayFrom(start), Math.max(0, n - 1));

// payer rules the tracker shows (demo assumptions from the discovery call)
export const FIVE_AT_A_TIME = new Set(['sentara']);            // Molina: 5 sessions per authorization
export const UDS_AT_ASSESSMENT = new Set(['humana']);           // SilverSummit: UDS result from the assessment, learned from denials
export const NO_24_RULE = new Set(['uhc']);                     // HPN: no longer follows the 24-session Level 1 rule
export const sessionsOffered = r => r.sessions_offered || (r.units_offered ? (r.units_offered <= 5 ? r.units_offered : Math.round(r.units_offered / 3)) : 0);

const CH = { fax: 'Fax', availity: 'Availity', portal: 'Provider portal' };
export function channelLabel(s, r) {
  const p = typeof r === 'string' ? r : r.payer; const ch = typeof r === 'string' ? M.payer(s, p).channel : r.channel;
  if (ch === 'portal') return p === 'uhc' ? 'HPN provider portal' : p === 'ffs' ? 'Nevada Medicaid provider portal' : 'Provider portal';
  return CH[ch] || M.CHANNEL_LABEL[ch] || ch || '';
}
export const typeLabel = t => ({ initial: 'Initial authorization', continued_stay: 'Continued stay · reauthorization', additional_info: 'Additional information', peer_to_peer: 'Peer-to-peer', early_discharge_new_initial: 'Step-down · new Level 1 initial', appeal: 'Reconsideration / appeal' }[t] || M.TYPE_LABEL[t] || t);
export const stageLabel = st => ({ early_discharge: 'Step-down planned', appeal_sent: 'Reconsideration sent' }[st] || M.STAGE_LABEL[st] || st);
export const payerFirst = (s, id) => id === 'ffs' ? 'NV Medicaid FFS' : M.payerShort(s, id).split(' ')[0];
const SEX = { TW: 'M', MR: 'F', KT: 'M', DW: 'M', JO: 'F', TN: 'F', EC: 'M', SB: 'M', LV: 'M', PG: 'F' };
export const pron = c => { const x = c?.sex || SEX[c?.id]; return x === 'F' ? ['she', 'her'] : x === 'M' ? ['he', 'him'] : ['they', 'them']; };

const WHO = { Psyflo: 'Psyflo', Sfax: 'e-fax', demo: 'Demo', 'payer (demo)': 'plan' };
export function whoLabel(s, who) { if (!who) return ''; if (WHO[who]) return WHO[who]; const st = M.byId(s.staff, who); return st ? M.staffShort(s, who) : who; }
export function stamp(s, at) {
  if (!at) return '';
  const d = at.slice(0, 10) === s.today ? 'Today' : M.fmtDate(at);
  const t = M.fmtTime(at);
  return t ? `${d} · ${t}` : d;
}
// "what happened, in order" rows from the audit trail
export function evHtml(s, e) {
  const who = whoLabel(s, e.who);
  return raw(`${esc(e.what)}${who && !e.what.includes(who) ? ` <span style="color:#525B66">· ${esc(who)}</span>` : ''}${e.demo ? ' <span class="chip y">demo</span>' : ''}`);
}
export function timeline(s, id) {
  return M.eventsFor(s, id).map(e => ({ dt: stamp(s, e.at), html: evHtml(s, e) }));
}
// full communication history: audit trail + entries derived from the request's own dates (model.requestHistory)
export function historyRows(s, r) {
  return M.requestHistory(s, r).map((e, i) => ({
    dt: e.at ? stamp(s, e.at) : 'Before Psyflo',
    html: raw(`${e.upcoming ? '<span class="chip n" style="margin-right:6px">upcoming</span>' : ''}${evHtml(s, e).html}`),
    st: i === 0 ? 'border-top:0' : ''
  }));
}
// open a page on the mock portals (Availity / HPN) in a new tab; the tab is opened inside the click
// so the browser does not block it, then pointed at the URL the action returns
export async function openPortal(screen, action, args) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  let res;
  try { res = await screen.do(action, args); } catch (e) { if (w) w.close(); return null; }
  if (res && res.open) {
    const url = `${api.config.extURL}${res.open}`;
    if (w) w.location.href = url; else window.open(url, '_blank');
  } else if (w) w.close();
  return res;
}
export async function openFile(screen, action, args, pick = r => r?.file?.url || r?.url) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  try { const res = await screen.do(action, args); const url = pick(res); if (url) { if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close(); return res; }
  catch { if (w) w.close(); return null; }
}
export function stageCls(stage) {
  return { draft_ready: 'chip b', awaiting_signature: 'chip b', signed: 'chip b', info_requested: 'chip y', partial_decide: 'chip y', peer_to_peer_requested: 'chip y', p2p_awaiting: 'chip y', overdue: 'chip r', denied: 'chip r', active: 'chip g', early_discharge: 'chip g' }[stage] || 'chip n';
}
export function unitsLeft(s, r) {
  const c = clientOf(s, r); const a = c?.authorization;
  if (!a || !a.units) return null;
  return { units: a.units, used: a.used || 0, left: a.units - (a.used || 0) };
}
// Molina-style 5-at-a-time: the session the next request is drafted at, and its date
export function nextAtSession3(s, r) {
  const a = clientOf(s, r)?.authorization;
  const start = (a && a.payer === r.payer && a.start) || (r.dates || '').split(' to ')[0] || s.today;
  const used = a && a.payer === r.payer ? Math.floor((a.used || 0) / 3) : 0;
  const block = Math.floor(used / 5) * 5; // sessions used before the current block of 5
  return { session: 3, date: nthIopDay(start, block + 3), lastDay: nthIopDay(start, block + 5), start };
}
// renew-by for a Level 2.1 authorization: two weeks of IOP (6 IOP days) before the last covered day
export function renewBy(s, r) {
  const u = unitsLeft(s, r); if (!u) return null;
  const st = clientOf(s, r)?.authorization?.start || '';
  const from = s.today < st ? st : addDays(s.today, 1);
  const last = iopRunOut(from, u.left, 3);
  return { days: Math.ceil(u.left / 3), last, by: u.left <= 18 ? s.today : addIopDays(last, -6) };
}

// next action, in words, for a row
function nextAction(s, r) {
  const c = M.clientLabel(s, r.client, false);
  const lvl = levelOf(s, r);
  const receipt = r.receipt_confirmed ? `Receipt confirmed ${M.fmtDate(r.receipt_confirmed)} (${whoLabel(s, r.receipt_by)} called). ` : (r.receipt_check ? `Receipt check call due ${M.fmtDate(r.receipt_check)}. ` : '');
  switch (r.stage) {
    case 'draft_ready': {
      const ds = r.draft_sources || {};
      if (r.type === 'continued_stay') return `Drafted from ${ds.iop_days || ds.attended || ds.daily_notes || 'the attended'} IOP days, the group notes and the UDS log, organised by ASAM dimension. Open ${c} in Client Record to review it in the form.`;
      return `Drafted from the ASAM assessment and the treatment plan. Open ${c} in Client Record to review it in the form.`;
    }
    case 'awaiting_signature': return 'Processed in Client Record. Press Get Signature in Forms to Approve; Send unlocks after that.';
    case 'signed': return `Signed PDF saved and packet assembled${UDS_AT_ASSESSMENT.has(r.payer) && lvl === '2.1' ? ' (UDS result attached)' : ''}. A person presses Send.`;
    case 'sending': return 'Faxing now · reference and delivery receipt arrive in a few seconds.';
    case 'portal_open': return `Upload in your own ${channelLabel(s, r)} session; the extension reads the confirmation.`;
    case 'submitted': {
      if (r.type === 'early_discharge_new_initial') return receipt + `Step-down request: the last IOP day and the first Level 1 session are set. If the plan asks why ${c} stepped down now, the ASAM review is attached.`;
      if (!r.decision_due) return receipt || 'Waiting for the decision.';
      const dd = M.daysBetween(s.today, r.decision_due);
      return receipt + (dd === 0 ? 'If nothing arrives by 5 pm an overdue notice is ready for you to send.' : dd < 0 ? "Overdue notice citing the plan's decision timeframe is ready for you to send." : `Decision due ${M.fmtDate(r.decision_due)}.`);
    }
    case 'overdue': return receipt + (r.overdue_notice_sent ? `Overdue notice sent ${M.fmtDate(r.overdue_notice_sent)}.` : "Overdue notice citing the plan's decision timeframe is ready for you to send.");
    case 'info_requested': return r.info_reply?.sent_at ? 'Reply sent; waiting for the upload confirmation.' : 'Reply drafted from the chart; a clinician checks it and sends it.';
    case 'partial_decide': return FIVE_AT_A_TIME.has(r.payer)
      ? 'Accept 5 and auto-draft the next at session 3 · ask for reconsideration · peer-to-peer · step down'
      : 'Accept · ask for reconsideration · peer-to-peer · step down';
    case 'peer_to_peer_requested': return `Peer-to-peer asked for. When ${payerFirst(s, r.payer)} calls to agree a time with the medical director, enter the date and time.`;
    case 'peer_to_peer_booked': { if (r.p2p_at && r.p2p_at.slice(0, 10) < s.today) return 'Call date has passed. Log the outcome (awaiting decision is fine).'; return 'Call notes by ASAM dimension are ready (D5 relapse risk, D4, D6, attendance and negative UDS dates).'; }
    case 'p2p_awaiting': return `Call held. Waiting for ${payerFirst(s, r.payer)}'s decision; log it when it arrives.`;
    case 'denied': return /provider|type|specialty|eligible/i.test(r.denial_reason || '')
      ? `Reason: "${r.denial_reason}." The reviewer read the SUD agency provider type as SUD-only. Reconsideration letter drafted; a person signs and sends it.`
      : `Reason: "${r.denial_reason || 'not given'}." Reconsideration letter drafted from the chart; a person signs and sends it.`;
    case 'appeal_sent': return 'Reconsideration signed by a clinician and sent. Waiting for the plan.';
    case 'early_discharge': return r.step_down ? `Last IOP day ${M.fmtDate(r.step_down.last_iop)} · first Level 1 session ${M.fmtDate(r.step_down.first_l1)} · new Level 1 initial ${M.fmtDate(r.step_down.send)}`
      : r.early_discharge ? `Last IOP day ${M.fmtDate(r.early_discharge.discharge)} · Level 1 from ${M.fmtDate(r.early_discharge.intake)}` : 'Step-down chosen · set the dates.';
    case 'active': {
      const u = unitsLeft(s, r);
      if (lvl === '2.1' && FIVE_AT_A_TIME.has(r.payer)) { const n = nextAtSession3(s, r); return n.date >= s.today ? `5 sessions at a time: next request auto-drafted after session 3 (${M.fmtDate(n.date, { dow: true })}) so it is approved before session 5.` : 'Next 5-session request is due now: session 3 has passed.'; }
      if (lvl === '2.1' && u) { const rb = renewBy(s, r); return rb.by <= s.today ? 'Start the continued-stay request now: under two weeks of IOP left.' : `Renew by ${M.fmtDate(rb.by)} · 2 weeks of IOP before the last covered day (${M.fmtDate(rb.last)}).`; }
      if (lvl === '1' && NO_24_RULE.has(r.payer)) return 'HPN no longer follows the 24-session rule here: keep a PA on file from session 1.';
      const end = clientOf(s, r)?.authorization?.end; if (end) return `Renew by ${M.fmtDate(addDays(end, -14))} (2 weeks before ${M.fmtDate(end)}).`;
      return r.p2p_outcome ? 'Peer-to-peer outcome logged.' : r.decision ? 'Units awarded and logged.' : '—';
    }
    case 'closed': return 'Closed.';
    default: return '—';
  }
}
const BTN = { draft_ready: ['Review draft', 'btn p s'], awaiting_signature: ['Sign request', 'btn p s'], signed: ['Send', 'btn p s'], info_requested: ['Open reply', 'btn o s'], partial_decide: ['Decide', 'btn o s'], peer_to_peer_requested: ['Enter call date', 'btn o s'], peer_to_peer_booked: ['Call notes', 'btn o s'], p2p_awaiting: ['Log decision', 'btn o s'], overdue: ['Send notice', 'btn o s'], early_discharge: ['Step-down plan', 'btn o s'], denied: ['Letter', 'btn o s'] };

export function row(s, r0) {
  const r = view(s, r0); const c = M.byId(s.clients, r.client); const d = details(s, r.id);
  const lvl = levelOf(s, r);
  const clk = M.requestClock(s, r);
  let clock = clk.text, clockSev = clk.sev;
  const u = unitsLeft(s, r);
  let units = r.units_awarded ? `${r.units_requested} → ${r.units_awarded} awarded` : r.units_offered ? `${r.units_requested} → ${FIVE_AT_A_TIME.has(r.payer) ? sessionsOffered(r) + ' sessions' : r.units_offered} offered` : `${r.units_requested} requested`;
  if (lvl === '1') units = units.replace(/(\d+) (requested|awarded|offered)/, '$1 sessions $2');
  let unitsSub = '', hasBar = false, barStyle = '';
  let badge = '', note = '';
  if (r.stage === 'active' && u) {
    hasBar = true; const pct = Math.round(u.used / u.units * 100);
    if (lvl === '2.1') {
      const rb = renewBy(s, r);
      barStyle = `width:${pct}%` + (rb.days < 6 ? ';background:#B9541F' : '');
      unitsSub = `${u.left} of ${u.units} left · 3 per IOP day`;
      clock = `${rb.days} IOP days left · renew by ${M.fmtDate(rb.by)}`; clockSev = rb.days < 6 ? 'r' : rb.days < 12 ? 'y' : 'n';
    } else {
      barStyle = `width:${pct}%`;
      unitsSub = `${u.left} of ${u.units} sessions left · weekly`;
      clock = `${u.left} weeks of sessions`; clockSev = u.left < 3 ? 'r' : 'n';
    }
  } else if (r.type === 'continued_stay' && ['draft_ready', 'awaiting_signature', 'signed'].includes(r.stage) && u) {
    hasBar = true; const pct = Math.round(u.used / u.units * 100);
    const days = Math.ceil(u.left / 3);
    barStyle = `width:${pct}%` + (days <= 6 ? ';background:#B9541F' : '');
    unitsSub = `${u.left} of ${u.units} left on current auth · ${days} IOP days`;
    const last = iopRunOut(addDays(s.today, 1), u.left, 3);
    clock = `${days} IOP days of units · last ${M.fmtDate(last)}`; clockSev = days <= 6 ? 'r' : 'y';
  } else if (r.stage === 'peer_to_peer_booked' && u) {
    hasBar = true; barStyle = `width:${Math.min(100, Math.round(u.used / u.units * 100))}%;background:#B9541F`;
    unitsSub = `${Math.max(0, u.left)} left`;
  } else if (r.sent && ['submitted', 'overdue', 'sending', 'portal_open'].includes(r.stage)) {
    unitsSub = (r.signed_at || r.signed_pdf ? 'signed and sent ' : 'sent ') + M.fmtDate(r.sent);
  } else if (r.stage === 'denied' && r.denied_on) unitsSub = 'denied ' + M.fmtDate(r.denied_on);
  else if (r.stage === 'partial_decide' && r.offer_call) unitsSub = 'offer received ' + M.fmtDate(r.offer_call);
  if (lvl === '2.1' && !unitsSub && r.units_requested) unitsSub = `H0015 · ${Math.max(1, Math.round(r.units_requested / 9))} weeks at 9 a week`;
  if (lvl === '2.1' && FIVE_AT_A_TIME.has(r.payer) && !['closed'].includes(r.stage)) {
    badge = '5 sessions at a time';
    if (r.stage === 'partial_decide') note = 'If accepted, Psyflo drafts the next request after session 3 so it is approved before session 5.';
    else if (r.stage === 'active') note = `Next request due after session 3 · ${M.fmtDate(nextAtSession3(s, r).date, { dow: true })}`;
  }
  if (lvl === '2.1' && r.type === 'initial' && !['active', 'denied', 'closed'].includes(r.stage)) note = (note ? note + ' · ' : '') + 'No backdating — PA must be approved before the first IOP day.';
  if (lvl === '1' && NO_24_RULE.has(r.payer) && !note) note = 'HPN: PA from session 1, not after 24 · learned from denials';
  const [btn, btnCls] = BTN[r.stage] || ['View', 'btn o s'];
  let type = typeLabel(r.type);
  if (r.stage === 'info_requested' || r.info_reply) type += ' → Additional information';
  const channel = channelLabel(s, r) + (r.fax_ref ? ' · ref ' + r.fax_ref : r.portal_ref ? ' · ' + r.portal_ref : '');
  let href = M.requestHref(r);
  if (r.stage === 'overdue' || r.stage === 'signed') href = 'Submission.dc.html?id=' + r.id;
  if (r.stage === 'denied' || r.stage === 'appeal_sent') href = 'AppealLetter.dc.html?id=' + r.id;
  if (r.stage === 'early_discharge' || r.type === 'early_discharge_new_initial') href = 'EarlyDischarge.dc.html?id=' + r.id;
  return {
    id: r.id, client: M.clientLabel(s, r.client), school: c ? M.school(s, c.school).name : (d.school ? M.school(s, d.school).name : ''),
    payer: M.payerShort(s, r.payer), channel, service: LEVEL_LABEL[lvl] + (lvl === '2.1' ? ' · H0015' : ''), type, level: lvl,
    units, unitsSub, hasBar, barStyle, badge, note, stage: stageLabel(r.stage), stageCls: stageCls(r.stage),
    clock, clockCls: 'chip ' + (clockSev || 'n'), next: nextAction(s, r), btn, btnCls, href, raw: r,
    history: historyRows(s, r)
  };
}

const FILTERS = { All: 'all', Me: 'me', Info: 'info', Partial: 'partial', Denied: 'denied', Active: 'active', Renew: 'renew' };
const EMPTY = { all: 'Nothing open.', me: 'No drafts waiting for you to review, sign and send.', info: 'No information requests open.', partial: 'No partial approvals to decide.', denied: 'No denials.', active: 'No active authorizations.', renew: 'No renewals due.' };
const CHANNELS = [
  ['humana', 'Fax · you press Send after signature', 'Level 2.1 packet carries the UDS result from the assessment (not on their form; learned from denials)'],
  ['anthem', "Availity · uploaded in the clinician's own session", 'decision read when you open Availity'],
  ['sentara', 'Fax', '5 sessions at a time · next request after session 3'],
  ['aetna', 'Fax · CareSource PA form', 'ASAM dimension ratings on page 1'],
  ['uhc', 'HPN provider portal · paste the text in', 'PA from Level 1 session 1'],
  ['ffs', 'Nevada Medicaid provider portal', 'Level 1: no PA for the first 24 sessions · Level 2.1: PA from the assessment']
];


// Case Tracker (the one-table view of every authorization): units approved / used / remaining, when it expires, and a status.
const DX_WORDS = [[/opioid/i, 'OUD'], [/alcohol/i, 'AUD'], [/stimulant|amphet|meth/i, 'StUD'], [/cocaine/i, 'CUD'], [/cannabis/i, 'Cannabis UD'], [/ptsd|trauma/i, 'PTSD'], [/depress/i, 'MDD'], [/anxiety/i, 'GAD']];
function dxShort(d) { return String(d || '').split(' · ').map(p => p.replace(/^F\d+(\.\d+)?\s*/, '')).map(p => (DX_WORDS.find(([re]) => re.test(p)) || [0, p.split(' ')[0]])[1]).filter(Boolean).join(' + ') || '–'; }
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
function trackerRows(s) {
  const out = [];
  for (const c of s.clients || []) {
    const reqs = (s.requests || []).filter(r => r.client === c.id);
    const a = c.authorization; const open = reqs.find(r => ['submitted', 'overdue', 'sending', 'portal_open', 'draft_ready', 'awaiting_signature', 'signed', 'info_requested', 'partial_decide'].includes(r.stage));
    const appeal = reqs.find(r => ['denied', 'appeal_sent', 'appeal'].includes(r.stage));
    let row = null;
    if (appeal && !a) row = { status: 'Appeal in progress', cls: 'po', approved: '–', used: '–', left: '–', exp: '–', days: '', sort: 3 };
    else if (a && a.units) {
      const used = a.used ?? 0; const days = a.end ? daysBetween(s.today, a.end) : null;
      const left = Math.max(0, a.units - used);
      const st = (days != null && days <= 4) || left <= 9 ? ['Recertification due', 'pr', 0] : (days != null && days <= 10) || left <= 15 ? ['Recertification soon', 'py', 1] : ['Current', 'pg', 4];
      row = { status: st[0], cls: st[1], approved: a.units, used, left: Math.max(0, a.units - used), exp: a.end ? M.fmtDate(a.end) : '–', days: days == null ? '' : `· ${Math.max(0, days)} day${days === 1 ? '' : 's'}`, sort: st[2] };
    } else if (open) row = { status: 'Awaiting approval', cls: 'pb', approved: '–', used: '–', left: '–', exp: '–', days: '', sort: 2 };
    if (!row) continue;
    const r = open || appeal || reqs[0];
    out.push({ ...row, client: c.initials, payer: M.payerShort(s, (a && a.payer) || (r && r.payer) || (c.medicaid && c.medicaid.plan)), dx: dxShort(c.diagnosis), href: r ? M.requestHref(r) : 'ExtHome.dc.html' });
  }
  out.sort((x, y) => x.sort - y.sort);
  return out.map((o, i) => ({ ...o, n: i + 1 }));
}

// one row of filter chips: [[value, label]] -> buttons that set screen.state[key]
function chipList(key, items, screen) { return items.map(([v, l]) => ({ l, cls: 'chp' + ((screen.state[key] || '') === v ? ' on' : ''), pick: () => screen.setState({ [key]: v }) })); }

register('Authorizations', class extends Screen {
  init() { this.state = { tab: this.params.tab || 'all', payer: this.params.payer || '', svc: '', type: '', open: this.params.history ? { [this.params.history]: true } : {} }; }
  renderVals() {
    const s = this.s; const me = this.me;
    const tagged = s.requests.map(r => ({ r, tags: M.requestTags(s, r, me?.id) }));
    const sel = ({ r }) => (!this.state.payer || r.payer === this.state.payer) && (!this.state.svc || levelOf(s, r) === this.state.svc) && (!this.state.type || r.type === this.state.type);
    const t = this.state.tab;
    const rows = tagged.filter(x => sel(x) && x.tags.has(t === 'active' ? 'all_active' : t)).map(x => {
      const v = row(s, x.r); const open = !!this.state.open[v.id];
      return { ...v, open, histLabel: (open ? 'Hide history' : 'History') + ` · ${v.history.length}`, toggle: () => this.setState({ open: { ...this.state.open, [v.id]: !open } }) };
    });
    // grant-funded clients (Ryan White, SAPTA, HOPWA) need no prior authorization
    const isGrant = x => /grant|ryan white|sapta|hopwa/i.test([x.funding, x.payer, x.program].filter(Boolean).join(' '));
    const grantNames = [
      ...(s.clients || []).filter(isGrant).map(c => c.initials),
      ...(s.referrals || []).filter(f => f.stage === 'grant_program' || isGrant(f)).map(f => f.client_label || (typeof f.client === 'string' ? f.client : '') || f.initials || f.id)
    ].filter(Boolean);
    const track = trackerRows(s);
    const vals = {
      isQueue: this.state.view !== 'tracker', isTrack: this.state.view === 'tracker',
      vQueue: this.state.view !== 'tracker' ? 'on' : '', vTrack: this.state.view === 'tracker' ? 'on' : '',
      showQueue: () => this.setState({ view: 'queue' }), showTrack: () => this.setState({ view: 'tracker' }),
      track, trackCount: track.length, trackDue: (n => n ? `${n} recertification${n === 1 ? '' : 's'} due` : '')(track.filter(t => t.cls === 'pr').length),
      rows, noRows: !rows.length, emptyText: EMPTY[t] + (this.state.payer || this.state.svc || this.state.type ? ' (with these filters)' : ''),
      asOf: M.fmtDate(s.today, { dow: true }).replace(' ', ', '),
      isAdmin: false, /* demo-only buttons live in the presenter panel (Ctrl+Shift+P) */
      payerChips: chipList('payer', [['', 'All plans'], ['humana', 'SilverSummit'], ['anthem', 'Anthem'], ['sentara', 'Molina'], ['aetna', 'CareSource'], ['uhc', 'Health Plan of Nevada'], ['ffs', 'Medicaid FFS · DHCFP']], this),
      svcChips: chipList('svc', [['', 'Level 1 + 2.1'], ['2.1', 'Level 2.1 · IOP (H0015)'], ['1', 'Level 1 · outpatient']], this),
      typeChips: chipList('type', [['', 'All requests'], ['initial', 'Initial'], ['continued_stay', 'Continued stay'], ['additional_info', 'Additional information'], ['peer_to_peer', 'Peer-to-peer'], ['early_discharge_new_initial', 'Step-down · new Level 1'], ['appeal', 'Reconsideration / appeal']], this),
      channels: CHANNELS.map(([id, ch, note]) => ({ name: M.payer(s, id).name, ch, note })),
      grantText: `Ryan White Part A/C, SAPTA block grant and HOPWA clients need no prior authorization, so they are not tracked here.${grantNames.length ? ' Grant-funded now: ' + [...new Set(grantNames)].join(', ') + '.' : ''} Everyone on Nevada Medicaid FFS or an MCO is.`
    };
    for (const [k, tag] of Object.entries(FILTERS)) {
      const key = tag === 'active' ? 'all_active' : tag;
      vals['n' + k] = tagged.filter(x => sel(x) && x.tags.has(key)).length;
      vals['t' + k] = 'tab' + (t === tag ? ' on' : '');
      vals['pick' + k] = () => this.setState({ tab: tag });
    }
    return vals;
  }
  // the canvas's "chip r" also matches the row class .r; keep red chips looking like chips
  get css() { return '.chip.r{display:inline-block;padding:2px 9px;border-top:0;font-size:12px}.chip.r:hover{background:#FBE9E4}'; }
  after(root) {
    const set = (id, v) => { const el = root.querySelector('#' + id); if (el) el.value = v; };
    set('payer', this.state.payer); set('svc', this.state.svc); set('rt', this.state.type);
  }
  get anchors() {
    return {
      demoReply: () => this.demoReply(),
      advanceDay: async () => {
        if (session.user?.role !== 'admin') return;
        await this.do('demo.advanceDay');
        toast('Demo: clock advanced to ' + M.fmtDate(this.s.today, { dow: true }));
      }
    };
  }
  demoReply() {
    if (session.user?.role !== 'admin') return;
    const s = this.s;
    const waiting = s.requests.filter(r => ['submitted', 'overdue', 'portal_open', 'appeal_sent'].includes(r.stage));
    if (!waiting.length) { modal(`<h2>Demo: receive a reply</h2><p>No request is waiting for a plan's reply right now. Send one first (Sent screen), then come back.</p><button class="mbtn p" data-close>OK</button>`); return; }
    const def = waiting.find(r => r.id === 'R-0416') || waiting[0];
    const opts = waiting.map(r => `<option value="${esc(r.id)}"${r.id === def.id ? ' selected' : ''}>${esc(r.id)} · ${esc(M.clientLabel(s, r.client))} · ${esc(M.payerShort(s, r.payer))} · ${esc(stageLabel(r.stage))}</option>`).join('');
    modal(`<h2>Demo: receive a reply</h2>
      <p style="margin:0 0 10px;color:#525B66">Plan replies cannot arrive during a demo, so this stands in for the fax or portal letter. Admins only; logged as a demo event on the request.</p>
      <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="drq">Request</label>
      <select id="drq" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">${opts}</select>
      <label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="dun">Units (approved or offered · leave blank for the default)</label>
      <input id="dun" type="number" min="1" max="300" style="width:140px;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 10px">
        <button class="mbtn" data-k="approved">Approved</button><button class="mbtn p" data-k="partial">Partial</button><button class="mbtn" data-k="info">Information request</button><button class="mbtn" data-k="denied">Denied</button>
      </div><button class="mbtn" data-close>Cancel</button>`,
      (box, close) => box.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
        const id = box.querySelector('#drq').value; const units = +box.querySelector('#dun').value || undefined;
        close();
        await this.do('request.demoReply', { id, kind: b.dataset.k, units });
        const r = M.byId(this.s.requests, id);
        toast(`Demo: ${b.textContent.toLowerCase()} received for ${id} · now ${stageLabel(r?.stage) || ''}`);
      }));
  }
});
