// Selectors over the Psyflo store, shared by the app, the portals, the phone and the panel.
import { fmtDate, fmtDateTime, fmtTime, daysBetween, businessDaysBetween, hoursBetween, addBusinessDays, addDays, parse } from './dates.js';
import { STATUS, REQ_TYPE } from './labels.js';

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

export const STAGE_LABEL = STATUS;
export const TYPE_LABEL = REQ_TYPE;
export const CHANNEL_LABEL = { fax: 'Sfax', availity: 'Availity', portal: 'UHC portal' };
export const REF_STAGE = { needs_screening: 'Needs screening', waiting_on_school: 'Waiting on school', screening_booked: 'Screening booked', in_intake: 'In intake', in_service: 'In service', grant_program: 'Grant program', draft: 'Draft (school)' };

export function now(s) { const d = new Date(); return `${s.today}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

export const clocksOf = s => ({ call_day: 10, decision_days: 14, public_standard_days: 7, isp_due_hours: 24, paperwork_due_days: 7, initial_sra_days: 30, restart_days: 30, ...(s.clocks || {}) });
export const payerTag = (s, id) => ({ humana: 'Humana', anthem: 'Anthem', sentara: 'Sentara', aetna: 'Aetna', uhc: 'UHC', ffs: 'Medicaid FFS' }[id] || payer(s, id).name);
export const days_since = (s, d) => d ? daysBetween(d, s.today) : null;

// One short status per request for lists: { text, sev, label, clock }. text is what the status chip says.
export function statusChip(s, r) {
  const label = STATUS[r.stage] || r.stage; const c = requestClock(s, r); const t = s.today;
  const short = (() => {
    switch (r.stage) {
      case 'draft_ready': case 'needs_approval': case 'awaiting_signature': case 'signed': return c.text.replace(/ left of the 30-day limit/, ' days left').replace(/ school days of units/, ' days').replace(/^(\d+) days left days left/, '$1 days left');
      case 'info_requested': return c.text.replace(' left of 24', ' left');
      case 'partial_decide': return r.reply_by ? fmtDate(r.reply_by) : '';
      case 'peer_to_peer_booked': return r.p2p_at ? 'call ' + fmtDate(r.p2p_at) : '';
      case 'p2p_awaiting': return '';
      case 'denied': return c.text.replace('appeal window · ', '').replace(' left', '');
      case 'active': return r.units_awarded ? r.units_awarded + ' units' : '';
      default: return '';
    }
  })();
  if (r.stage === 'submitted') return { text: c.text.includes('follow-up') || c.text.includes('overdue') ? c.text : `Submitted · ${c.text}`, sev: c.sev, label, clock: c.text };
  if (r.stage === 'overdue') return { text: 'Overdue · ' + c.text.replace(' overdue', ''), sev: 'r', label, clock: c.text };
  if (r.stage === 'peer_to_peer_booked') return { text: short ? 'P2P · ' + short : label, sev: c.sev, label, clock: c.text };
  return { text: short ? `${label} · ${short}` : label, sev: c.sev, label, clock: c.text };
}

// clock text and severity for a request at the store's "today"
export function requestClock(s, r) {
  const t = s.today, n = now(s);
  switch (r.stage) {
    case 'draft_ready': case 'needs_approval': case 'awaiting_signature': case 'signed': {
      if (r.type === 'initial' && r.limit_30) { const d = daysBetween(t, r.limit_30); return { text: `${d} days left of the 30-day limit`, sev: d <= 7 ? 'r' : 'y' }; }
      const c = client(s, r.client); const a = c.authorization;
      if (a && a.units) { const left = a.units - (a.used || 0); const days = Math.floor(left / 3); return { text: `${days} school days of units`, sev: days <= 10 ? 'r' : 'y' }; }
      return { text: r.renew_by ? 'renew by ' + fmtDate(r.renew_by) : '—', sev: 'n' };
    }
    case 'sending': return { text: 'faxing now', sev: 'n' };
    case 'portal_open': return { text: 'waiting for the portal confirmation', sev: 'y' };
    case 'submitted': {
      const k = clocksOf(s); const n = r.sent ? daysBetween(r.sent, t) : null;
      if (n == null) return { text: 'sent', sev: 'n' };
      if (n >= k.decision_days) return { text: `${n - k.decision_days} day${n - k.decision_days === 1 ? '' : 's'} overdue`, sev: 'r' };
      if (n >= k.call_day) return { text: `Day ${n} · follow-up`, sev: 'y' };
      return { text: `Day ${n}`, sev: 'n' };
    }
    case 'overdue': { const k = clocksOf(s); const d = r.sent ? Math.max(0, daysBetween(r.sent, t) - k.decision_days) : 0; return { text: `${d} day${d === 1 ? '' : 's'} overdue`, sev: 'r' }; }
    case 'info_requested': { if (!r.reply_due) return { text: '24 h clock', sev: 'r' }; const ref = r.info_requested_at && r.info_requested_at.slice(0, 10) < s.today ? s.today + 'T08:40' : n; const h = Math.max(0, Math.round(hoursBetween(ref < r.info_requested_at ? r.info_requested_at : ref, r.reply_due))); return { text: `${h} h left of 24`, sev: h <= 12 ? 'r' : 'y' }; }
    case 'partial_decide': return { text: r.reply_by ? 'reply by ' + fmtDate(r.reply_by) : 'decide', sev: 'y' };
    case 'peer_to_peer_requested': return { text: 'enter the call date when the insurer calls', sev: 'y' };
    case 'peer_to_peer_booked': { if (!r.p2p_at) return { text: 'call date not set', sev: 'y' }; const d = daysBetween(t, r.p2p_at); return { text: d < 0 ? `call was ${fmtDate(r.p2p_at)} · log the outcome` : d === 0 ? 'call today' : `${fmtDate(r.p2p_at)} · ${d} days out`, sev: 'r' }; }
    case 'p2p_awaiting': { const at = r.p2p_outcome?.at || r.p2p_at; return { text: at ? `call held ${fmtDate(at)} · waiting ${Math.max(0, daysBetween(at, t))} days` : 'waiting for the decision', sev: 'y' }; }
    case 'denied': { const left = r.appeal_days_left != null ? r.appeal_days_left - daysBetween('2026-10-29', t) : (r.appeal_deadline ? daysBetween(t, r.appeal_deadline) : 60); return { text: `appeal window · ${left} days left`, sev: 'n' }; }
    case 'appeal_sent': return { text: 'payer appeal clock', sev: 'n' };
    case 'active': return { text: r.units_awarded ? `${r.units_awarded} units awarded` : 'active', sev: 'n' };
    case 'early_discharge': return { text: r.early_discharge ? 'discharge ' + fmtDate(r.early_discharge.discharge) : 'plan set', sev: 'n' };
    default: return { text: '—', sev: 'n' };
  }
}

// Where a request row opens
export function requestHref(r) {
  switch (r.stage) {
    case 'draft_ready': return r.type === 'continued_stay' ? 'ExtCase.dc.html?client=' + r.client : 'ExtSRA.dc.html?client=' + r.client;
    case 'needs_approval': return 'Authorizations.dc.html?open=' + r.id;
    case 'awaiting_signature': return 'ExtSignOff.dc.html?request=' + r.id;
    case 'info_requested': return 'InfoRequest.dc.html?id=' + r.id;
    case 'partial_decide': case 'denied': case 'early_discharge': return 'Partials.dc.html?id=' + r.id;
    case 'peer_to_peer_requested': case 'peer_to_peer_booked': case 'p2p_awaiting': return 'PeerBrief.dc.html?id=' + r.id;
    case 'active': return 'ExtCase.dc.html?client=' + r.client;
    default: return 'Authorizations.dc.html?open=' + r.id;
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
  if ((r.type === 'continued_stay' && r.stage === 'draft_ready') || (r.stage === 'active' && c?.authorization?.units && (c.authorization.units - (c.authorization.used || 0)) / 3 < 25)) tags.add('renew');
  if (['active', 'closed', 'appeal_sent'].includes(r.stage)) tags.delete('all');
  if (r.stage === 'active') tags.add('all_active');
  return tags;
}

// Worklist: one list of what needs action, built from referrals, requests, clocks and eligibility re-verification.
// Row grammar: chip (clock or state) · who · what · one button. `primary` is true when the action is due within 24 hours.
export function worklist(s, me = 'jperez') {
  const items = []; const t = s.today; const k = clocksOf(s);
  const add = (pri, o) => items.push({ pri, ...o, title: `${o.who ? o.who + ' · ' : ''}${o.what}` });
  const schoolShort = id => { const n = schoolOf(s, id); return n.replace(/^\w+ (City|County)\s*·\s*/, '').replace(/^Lynchburg City\s*/, 'Lynchburg ').trim() || n; };
  // calls today
  for (const sc of s.screenings.filter(x => x.status === 'booked' && x.when && x.when.slice(0, 10) === t)) add(0 + (sc.when.slice(11, 16) > '12' ? 0.1 : 0), { group: 'calls', chip: fmtTime(sc.when), sev: 'n', who: clientLabel(s, sc.client), what: `${schoolOf(s, sc.client) ? schoolOf(s, sc.client) + ' · ' : ''}Screening call`, href: 'ExtScreening.dc.html?referral=' + sc.referral, btn: 'Open in Lauris', primary: true });
  for (const r of s.requests) {
    const c = clientLabel(s, r.client); const p = payerTag(s, r.payer); const clock = requestClock(s, r);
    const n = r.sent ? daysBetween(r.sent, t) : null;
    if (r.stage === 'info_requested') add(1, { group: 'pended', chip: clock.text.replace(' left of 24', ' left'), sev: clock.sev, who: c, what: `${p} · additional info`, href: 'InfoRequest.dc.html?id=' + r.id, btn: 'Respond', primary: true });
    if ((r.stage === 'submitted' || r.stage === 'overdue') && n != null && n >= k.call_day) add(2, { group: 'followup', chip: n >= k.decision_days ? 'Overdue' : 'Day ' + n, sev: n >= k.decision_days ? 'r' : 'y', who: c, what: `${p} · payer follow-up`, href: 'Authorizations.dc.html?open=' + r.id, btn: 'Open', primary: true });
    if (r.stage === 'partial_decide') add(3, { group: 'offers', chip: fmtDate(r.reply_by), sev: 'y', who: c, what: `${p} · partial approval ${r.units_offered} of ${r.units_requested}`, href: 'Partials.dc.html?id=' + r.id, btn: 'Review offer', primary: !r.reply_by || daysBetween(t, r.reply_by) <= 1 });
    if (r.stage === 'peer_to_peer_requested') add(3.5, { group: 'calls', chip: 'Date', sev: 'y', who: c, what: `${p} · P2P · enter call date`, href: 'PeerBrief.dc.html?id=' + r.id, btn: 'Enter date', primary: false });
    if (r.stage === 'peer_to_peer_booked' && r.p2p_at && daysBetween(t, r.p2p_at) < 0) add(3.5, { group: 'calls', chip: 'Log', sev: 'y', who: c, what: `${p} · P2P held · log outcome`, href: 'PeerBrief.dc.html?id=' + r.id, btn: 'Log outcome', primary: true });
    if (r.stage === 'needs_approval') add(4, { group: 'approval', chip: 'Approve', sev: 'y', who: c, what: `${REQ_TYPE[r.type]} · pending clinical approval`, href: 'Authorizations.dc.html?open=' + r.id, btn: 'Approve', primary: false });
    if (r.stage === 'draft_ready') add(5, { group: 'drafts', chip: 'Ready', sev: 'n', who: c, what: REQ_TYPE[r.type], href: requestHref(r), btn: 'Review in Lauris', primary: false });
    if (r.stage === 'awaiting_signature') add(5, { group: 'drafts', chip: 'Sign', sev: 'n', who: c, what: `${REQ_TYPE[r.type]} · pending signature`, href: 'ExtSignOff.dc.html?request=' + r.id, btn: 'Sign in Lauris', primary: true });
    if (r.stage === 'signed') add(5, { group: 'drafts', chip: 'Ready', sev: 'n', who: c, what: `${REQ_TYPE[r.type]} · ready to submit`, href: 'Authorizations.dc.html?open=' + r.id, btn: 'Send', primary: true });
  }
  for (const r of s.referrals) {
    if (r.stage !== 'needs_screening') continue;
    const el = s.eligibility.find(e => e.referral === r.id);
    if (el && el.status === 'details_received') add(6, { group: 'referrals', chip: 'Verify', sev: 'y', who: clientLabel(s, r.client), what: 'Eligibility verification', href: 'Eligibility.dc.html?referral=' + r.id, btn: 'Verify', primary: true });
    else add(6.5, { group: 'referrals', chip: 'New', sev: 'n', who: clientLabel(s, r.client), what: 'Referral', href: 'Referral.dc.html?id=' + r.id, btn: 'Review', primary: false });
  }
  const due = eligibilityDue(s);
  if (due.length) add(7, { group: 'eligibility', chip: due.length + ' due', sev: 'y', who: '', what: 'Eligibility re-verification', href: 'Eligibility.dc.html', btn: 'Start', primary: true });
  items.sort((a, b) => a.pri - b.pri);
  const awaiting = awaitingResponse(s);
  return { items, awaiting };
}
export const doNext = (s, me) => worklist(s, me).items;

// Weekly eligibility re-verification: rows due today or earlier
export function eligibilityDue(s) { return (s.eligibility || []).filter(e => e.kind === 'reverify' && e.next_check && e.next_check.slice(0, 10) <= s.today); }
// Items that wait on a payer, a school or a guardian (shown as one line on the Worklist)
export function awaitingResponse(s) {
  const k = clocksOf(s); const out = [];
  for (const r of s.requests) {
    const n = r.sent ? daysBetween(r.sent, s.today) : null;
    if (['sending', 'portal_open', 'appeal_sent', 'p2p_awaiting'].includes(r.stage) || (r.stage === 'submitted' && (n == null || n < k.call_day)) || (r.stage === 'peer_to_peer_booked' && !(r.p2p_at && daysBetween(s.today, r.p2p_at) < 0))) out.push({ kind: 'request', id: r.id, client: r.client });
  }
  for (const r of s.referrals) if (['waiting_on_school', 'screening_booked'].includes(r.stage) || (r.stage === 'needs_screening' && r.family_link && r.family_link.sent && !r.family_link.submitted)) out.push({ kind: 'referral', id: r.id, client: r.client });
  return { count: out.length, items: out };
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
  add(r.signed_at, 'Signed in Lauris · signed PDF saved', /sign/i);
  add(r.sent, `Sent to ${pf} · ${ch}${r.fax_ref ? ' · ref ' + r.fax_ref : r.portal_ref ? ' · ' + r.portal_ref : ''} · ${r.units_requested} units requested`, /sent|send|upload|fax/i);
  if (r.sent && r.decision_due) add(r.decision_due, `Decision due from ${pf} (7-calendar-day standard)`, /due|overdue/i, '', { clock: true });
  add(r.receipt_confirmed, 'Receipt confirmed by phone', /receipt/i, r.receipt_by || '');
  add(r.overdue_notice_sent, 'Overdue notice sent through Sfax', /overdue notice sent/i);
  add(r.info_requested_at, `${pf} asked for more information · 24-hour clock started`, /information/i);
  add(r.info_reply?.sent_at, 'Reply to the information request sent', /reply/i);
  add(r.offer_call, `${pf} offered ${r.units_offered || '?'} of ${r.units_requested} units`, new RegExp('offer|partial|\\d+ of \\d+' + (r.units_offered ? '|\\b' + r.units_offered + '\\b' : ''), 'i'));
  if (r.stage === 'partial_decide' && r.reply_by) add(r.reply_by, `Reply to ${pf}'s offer by this date`, /reply by/i, '', { clock: true });
  if (r.decision?.at) add(r.decision.at, DECISION_TEXT(r), /accept|chose|peer|stretch|use them up|decision/i);
  if (r.p2p_at && (!r.p2p_outcome || day(r.p2p_at) <= s.today)) add(r.p2p_at, `Peer-to-peer call with ${pf}'s reviewer`, /peer-to-peer (call )?(held|outcome)|call held/i, '', { clock: true });
  if (r.p2p_outcome?.at) add(r.p2p_outcome.at, `Peer-to-peer outcome · ${P2P_OUTCOME[r.p2p_outcome.outcome] || r.p2p_outcome.outcome}${r.p2p_outcome.units ? ' · ' + r.p2p_outcome.units + ' units' : ''}`, /outcome|awaiting/i);
  if (r.denied_on) add(r.denied_on, `Denied by ${pf}${r.denial_reason ? ': "' + r.denial_reason + '"' : ''}`, /denied/i);
  if (r.stage === 'denied') { const dl = r.appeal_deadline || (r.appeal_days_left != null ? addDays('2026-10-29', r.appeal_days_left) : null); if (dl) add(dl, 'Guardian appeal window closes', /appeal/i, '', { clock: true }); }
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
