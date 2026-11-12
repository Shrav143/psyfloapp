// Selectors over the Psyflo store, shared by the app, the portals, the phone and the panel.
import { fmtDate, fmtDateTime, fmtTime, daysBetween, businessDaysBetween, hoursBetween, addBusinessDays, addDays, parse } from './dates.js';
import { now as clockNow, today as clockToday } from './clock.js';
import { rule, ruleValue, decisionDay, deadline } from './rules.js';

export const byId = (arr, id) => (arr || []).find(x => x.id === id);
export const client = (s, id) => byId(s.clients, id) || { id, initials: id };
export const staff = (s, id) => byId(s.staff, id) || { id, name: id, initials: '?' };
export const payer = (s, id) => byId(s.payers, id) || { id, name: id, channel: 'fax' };
export const school = (s, id) => byId(s.schools, id) || { id, name: id };
export const staffShort = (s, id) => { const p = staff(s, id); return p.name.replace(/^(\w)\w+ (\w)/, '$1. $2'); };
export const payerShort = (s, id) => ({ humana: 'Humana', anthem: 'Anthem HealthKeepers', sentara: 'Sentara', aetna: 'Aetna', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS' }[id] || payer(s, id).name);

// "T.W., 12" — clients may be ids or free text on referrals/requests ("A.L., 6")
export function clientLabel(s, id, withAge = true) {
  const c = byId(s.clients, id);
  if (!c) return id;
  return withAge && c.age ? `${c.initials}, ${c.age}` : c.initials;
}
export const schoolOf = (s, id) => { const c = byId(s.clients, id); return c ? school(s, c.school).name : ''; };

export const STAGE_LABEL = {
  draft_ready: 'Draft ready', needs_approval: 'Pending clinical approval', awaiting_signature: 'Awaiting signature', signed: 'Signed · ready to send', sending: 'Sending…', portal_open: 'Portal open · upload in your session',
  submitted: 'Submitted', overdue: 'Overdue', info_requested: 'Info requested', partial_decide: 'Partial — decide', peer_to_peer_requested: 'Peer-to-peer requested · date to be set', peer_to_peer_booked: 'Peer-to-peer booked', p2p_awaiting: 'Peer-to-peer held · awaiting decision',
  denied: 'Denied', appeal_sent: 'Appeal sent', active: 'Active', early_discharge: 'Early discharge planned', closed: 'Closed'
};
export const TYPE_LABEL = { initial: 'Initial SRA', continued_stay: 'Continued stay', additional_info: 'Additional information', peer_to_peer: 'Peer-to-peer', early_discharge_new_initial: 'Early discharge + new initial', appeal: 'Appeal (guardian-led)' };
export const CHANNEL_LABEL = { fax: 'Sfax', availity: 'Availity', portal: 'UHC portal' };
export const REF_STAGE = { needs_screening: 'Needs screening', waiting_on_school: 'Waiting on school', screening_booked: 'Screening booked', in_intake: 'In intake', in_service: 'In service', grant_program: 'Grant program', draft: 'Draft (school)' };

// the demo clock (story date + running time of day); see shared/clock.js. Never the machine's date.
export function now(s) { return clockNow(s); }
export const today = s => clockToday(s);

// clock text and severity for a request at the store's "today"
export function requestClock(s, r) {
  const t = s.today, n = now(s);
  switch (r.stage) {
    case 'draft_ready': case 'needs_approval': case 'awaiting_signature': case 'signed': {
      if (r.type === 'initial' && r.limit_30) { const d = daysBetween(t, r.limit_30); const n = r.limit_30_basis?.days || ruleValue(s, 'initial_sra.send_within_days', 30); return { text: d < 0 ? `${-d} days past the ${n}-day send limit (Harvest practice)` : `${d} days left of the ${n}-day send limit (Harvest practice)`, sev: d <= 7 ? 'r' : 'y' }; }
      const c = client(s, r.client); const a = c.authorization;
      if (a && a.units) { const left = a.units - (a.used || 0); const rate = ruleValue(s, 'units.rate_per_school_day', 3); const days = Math.floor(left / rate); return { text: `${days} school days of units at ${rate} a day (assumption)`, sev: days <= 10 ? 'r' : 'y' }; }
      return { text: r.renew_by ? 'renew by ' + fmtDate(r.renew_by) : '—', sev: 'n' };
    }
    case 'sending': return { text: 'faxing now', sev: 'n' };
    case 'portal_open': return { text: 'waiting for the portal confirmation', sev: 'y' };
    case 'submitted': {
      // neutral "Day N" from the day it was sent; the follow-up call and the overdue limit are configured rules with their source
      const dd = decisionDay(s, r.sent, t, r.payer);
      if (!dd) return { text: 'sent · day unknown', sev: 'n' };
      if (dd.overdue) return { text: `Day ${dd.day} · past the ${dd.overdue_after}-day window (${dd.verification.toLowerCase()})`, sev: 'r' };
      if (dd.followup_due) return { text: `Day ${dd.day} · follow-up call due (day ${dd.followup_day}, Harvest-reported)`, sev: 'y' };
      return { text: `Day ${dd.day} · follow-up call on day ${dd.followup_day}`, sev: 'n' };
    }
    case 'overdue': { const dd = decisionDay(s, r.sent, t, r.payer); const over = dd ? dd.day - dd.overdue_after : (r.decision_due ? daysBetween(r.decision_due, t) : 0); return { text: dd ? `Day ${dd.day} · ${over} day${over === 1 ? '' : 's'} past the ${dd.overdue_after}-day window` : `decision overdue ${over} day${over === 1 ? '' : 's'}`, sev: 'r' }; }
    case 'info_requested': {
      // elapsed versus due, from the demo clock; a missed reply is shown as missed (nothing is pinned to a convenient time of day)
      if (!r.reply_due) return { text: `reply due ${ruleValue(s, 'info_request.hours', 24)} h after the request`, sev: 'r' };
      const left = hoursBetween(n, r.reply_due);
      if (left < 0) return { text: `reply missed · was due ${fmtDateTime(r.reply_due, { dow: true })}`, sev: 'r' };
      const h = Math.round(left); const total = r.info_requested_at ? Math.round(hoursBetween(r.info_requested_at, r.reply_due)) : ruleValue(s, 'info_request.hours', 24);
      return { text: `${h} h left of ${total} · due ${fmtDateTime(r.reply_due, { dow: true })}`, sev: h <= 12 ? 'r' : 'y' };
    }
    case 'partial_decide': return { text: r.reply_by ? 'reply by ' + fmtDate(r.reply_by) : 'decide', sev: 'y' };
    case 'peer_to_peer_requested': return { text: 'enter the call date when the insurer calls', sev: 'y' };
    case 'peer_to_peer_booked': { if (!r.p2p_at) return { text: 'call date not set', sev: 'y' }; const d = daysBetween(t, r.p2p_at); return { text: d < 0 ? `call was ${fmtDate(r.p2p_at)} · log the outcome` : d === 0 ? 'call today' : `${fmtDate(r.p2p_at)} · ${d} days out`, sev: 'r' }; }
    case 'p2p_awaiting': { const at = r.p2p_outcome?.at || r.p2p_at; return { text: at ? `call held ${fmtDate(at)} · waiting ${Math.max(0, daysBetween(at, t))} days` : 'waiting for the decision', sev: 'y' }; }
    case 'denied': {
      const dl = appealDeadline(s, r); const left = dl ? daysBetween(t, dl) : null;
      if (left == null) return { text: 'appeal window: enter the notice date', sev: 'y' };
      return { text: left < 0 ? 'appeal window closed' : `appeal window · ${left} day${left === 1 ? '' : 's'} left (${ruleValue(s, 'appeal.window_days', 60)} days from the notice; confirm on the letter)`, sev: left < 0 ? 'r' : 'n' };
    }
    case 'appeal_sent': return { text: 'payer appeal clock', sev: 'n' };
    case 'active': return { text: r.units_awarded ? `${r.units_awarded} units awarded` : 'active', sev: 'n' };
    case 'early_discharge': return { text: r.early_discharge ? 'discharge ' + fmtDate(r.early_discharge.discharge) : 'plan set', sev: 'n' };
    default: return { text: '—', sev: 'n' };
  }
}

// the guardian appeal window closes N days after the NOTICE date (rule appeal.window_days, unverified: confirm on the letter)
export function appealDeadline(s, r) {
  if (r.appeal_deadline) return r.appeal_deadline;
  const nd = r.notice_date || r.denied_on;
  return nd ? addDays(nd, ruleValue(s, 'appeal.window_days', 60)) : null;
}

// Where a request row opens
export function requestHref(r) {
  switch (r.stage) {
    case 'draft_ready': return r.type === 'continued_stay' ? 'ExtCase.dc.html?client=' + r.client : 'ExtSRA.dc.html?client=' + r.client;
    case 'needs_approval': case 'awaiting_signature': return 'ExtSignOff.dc.html?request=' + r.id;
    case 'info_requested': return 'InfoRequest.dc.html?id=' + r.id;
    case 'partial_decide': case 'denied': case 'early_discharge': return 'Partials.dc.html?id=' + r.id;
    case 'peer_to_peer_requested': case 'peer_to_peer_booked': case 'p2p_awaiting': return 'PeerBrief.dc.html?id=' + r.id;
    case 'active': return 'ExtCase.dc.html?client=' + r.client;
    default: return 'Submission.dc.html?id=' + r.id;
  }
}

// Authorizations filter tags
export function requestTags(s, r, me) {
  const tags = new Set(['all']);
  if (['draft_ready', 'needs_approval', 'awaiting_signature', 'signed'].includes(r.stage)) tags.add('me');
  if (r.stage === 'info_requested') tags.add('info');
  if (['partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'early_discharge'].includes(r.stage) || (r.units_awarded && r.units_awarded < r.units_requested && r.stage !== 'active')) tags.add('partial');
  if (['denied', 'appeal_sent'].includes(r.stage)) tags.add('denied');
  if (r.stage === 'active') tags.add('active');
  const c = byId(s.clients, r.client);
  if ((r.type === 'continued_stay' && r.stage === 'draft_ready') || (r.stage === 'active' && c?.authorization?.units && (c.authorization.units - (c.authorization.used || 0)) / ruleValue(s, 'units.rate_per_school_day', 3) < 25)) tags.add('renew');
  if (['active', 'closed', 'appeal_sent'].includes(r.stage)) tags.delete('all');
  if (r.stage === 'active') tags.add('all_active');
  return tags;
}

export function eligibilityFor(s, referral) { return s.eligibility.find(e => e.referral === referral); }
export function familyLinkFor(s, referral) { return s.family_links.find(f => f.referral === referral); }

// Full communication history for a request: the audit trail (s.events) plus entries derived from the
// request's own dates, so seeded rows that predate the audit trail still read "sent, then this, then this".
// Derived entries are skipped when an event on the same day already says the same thing.
// Returns [{ at, what, who, derived, upcoming }] oldest first; `at` may be a date or date-time.
export function requestHistory(s, r) {
  if (!r) return [];
  const evs = eventsFor(s, r.id).map(e => ({ at: e.at, what: e.what, who: e.who, demo: e.demo }));
  const out = [...evs];
  const pf = payerShort(s, r.payer); const ch = CHANNEL_LABEL[r.channel] || r.channel || '';
  const day = at => String(at || '').slice(0, 10);
  const covered = (at, re) => evs.some(e => day(e.at) === day(at) && re.test(e.what));
  const add = (at, what, re, who = '', extra = {}) => { if (!at) return; if (re && covered(at, re)) return; out.push({ at, what, who, derived: true, ...extra }); };
  add(r.drafted_at, `${TYPE_LABEL[r.type] || 'Request'} drafted from the record`, /draft/i, 'Psyflo');
  add(r.approved_at, 'Approved internally' + (r.approved_by ? ' by ' + staff(s, r.approved_by).name : ''), /approved internally/i, r.approved_by || '');
  add(r.signed_at, 'Signed in Lauris' + (r.signed_by ? ' by ' + r.signed_by : '') + ' · signed PDF saved', /sign/i);
  add(r.sent, `Sent to ${pf} · ${ch}${r.fax_ref ? ' · ref ' + r.fax_ref : r.portal_ref ? ' · ' + r.portal_ref : ''} · ${r.units_requested} units requested`, /sent|send|upload|fax/i);
  if (r.sent) { const dd = decisionDay(s, r.sent, s.today, r.payer); if (dd) add(dd.followup_date, `Follow-up call on the decision (day ${dd.followup_day}, Harvest-reported)`, /follow-up|receipt/i, '', { clock: true }); if (dd) add(dd.due_date, `Decision window ends (${dd.overdue_after} days; ${dd.verification.toLowerCase()})`, /due|overdue|window/i, '', { clock: true }); }
  add(r.receipt_confirmed, 'Receipt confirmed by phone', /receipt/i, r.receipt_by || '');
  add(r.overdue_notice_sent, 'Overdue notice sent' + (r.overdue_notice_ref ? ' · ref ' + r.overdue_notice_ref : '') + ' (simulated)', /overdue notice sent/i);
  add(r.info_requested_at, `${pf} asked for more information${r.reply_due ? ' · reply due ' + fmtDateTime(r.reply_due, { dow: true }) : ''}`, /information/i);
  add(r.info_reply?.sent_at, 'Reply to the information request sent', /reply/i);
  add(r.offer_call, `${pf} offered ${r.units_offered || '?'} of ${r.units_requested} units`, new RegExp('offer|partial|\\d+ of \\d+' + (r.units_offered ? '|\\b' + r.units_offered + '\\b' : ''), 'i'));
  if (r.stage === 'partial_decide' && r.reply_by) add(r.reply_by, `Reply to ${pf}'s offer by this date`, /reply by/i, '', { clock: true });
  if (r.decision?.at) add(r.decision.at, DECISION_TEXT(r), /accept|chose|peer|stretch|use them up|decision/i);
  if (r.p2p_at && (!r.p2p_outcome || day(r.p2p_at) <= s.today)) add(r.p2p_at, `Peer-to-peer call with ${pf}'s reviewer`, /peer-to-peer (call )?(held|outcome)|call held/i, '', { clock: true });
  if (r.p2p_outcome?.at) add(r.p2p_outcome.at, `Peer-to-peer outcome · ${P2P_OUTCOME[r.p2p_outcome.outcome] || r.p2p_outcome.outcome}${r.p2p_outcome.units ? ' · ' + r.p2p_outcome.units + ' units' : ''}`, /outcome|awaiting/i);
  if (r.denied_on) add(r.denied_on, `Denied by ${pf}${r.denial_reason ? ': "' + r.denial_reason + '"' : ''}`, /denied/i);
  if (r.stage === 'denied') { const dl = appealDeadline(s, r); if (dl) add(dl, 'Guardian appeal window closes (confirm on the letter)', /appeal/i, '', { clock: true }); }
  if (r.appeal?.signed_at) add(r.appeal.signed_at, 'Guardian signed the appeal letter', /appeal/i, r.appeal.signer || '');
  if (r.early_discharge) { add(r.early_discharge.discharge, 'Planned discharge (units used up)', /discharge/i, '', { clock: true }); add(r.early_discharge.intake, 'New intake · new initial request drafted', /intake/i, '', { clock: true }); }
  // seeded rows with no dated activity at all (approved before the pilot)
  if (!out.length) {
    const a = client(s, r.client).authorization;
    const start = (r.dates || '').split(' to ')[0] || a?.start;
    if (r.units_awarded) out.push({ at: start || '', what: `Approved by ${pf} · ${r.units_awarded} of ${r.units_requested} units${start ? '' : ' (before the pilot; the letter is in Lauris)'}`, who: '', derived: true });
    else if (r.renew_by) out.push({ at: r.renew_by, what: 'Renewal due', who: '', derived: true, clock: true });
  }
  const t = s.today;
  for (const e of out) e.upcoming = !!e.at && day(e.at) > t;
  return out.sort((a, b) => (a.at || '0') < (b.at || '0') ? -1 : (a.at || '0') > (b.at || '0') ? 1 : 0);
}
export const P2P_OUTCOME = { awaiting: 'awaiting decision', approved: 'approved', partial: 'approved in part', denied: 'denied' };
export function DECISION_TEXT(r) {
  const d = r.decision || {}; const u = r.units_awarded || r.units_offered;
  return { accept: `Accepted ${u} units`, stretch: `Decision logged: accept ${u} units and stretch them to the end date (not sent to the insurer)`, use_up: `Decision logged: accept ${u} units, use them up, then discharge and start a new initial (not sent to the insurer)`, early_discharge: `Accepted ${u} units with an early discharge`, info: 'Chose to add information', p2p: 'Asked for a peer-to-peer call' }[d.door] || 'Decision logged';
}

export function eventsFor(s, record) { return s.events.filter(e => e.record === record).sort((a, b) => a.at < b.at ? -1 : 1); }

export function notesToday(s, staffId) {
  const mine = s.clients.filter(c => c.staff === staffId && c.stage !== 'discharged');
  const done = new Set(s.notes.filter(n => n.staff === staffId && n.type === 'daily' && n.date === s.today).map(n => n.client));
  return { total: mine.length, done: mine.filter(c => done.has(c.id)).length, students: mine, doneSet: done };
}

export function waitingDictations(s, clientId) { return s.dictations.filter(d => d.client === clientId && d.status === 'waiting'); }
export function waitingAssessments(s, clientId) { return s.assessments.filter(a => a.client === clientId && a.status === 'waiting'); }

export const ROLE_LABEL = { direct_support: 'Direct support', supervisor: 'Supervisor', clinician: 'Clinician', admin: 'Admin' };

export { fmtDate, fmtDateTime, fmtTime, daysBetween, businessDaysBetween, addBusinessDays, addDays, parse };
