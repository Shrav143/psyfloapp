// The six pilot measures (docs: review/02-product-strategy.md section g, prompt 12.5), each defined ONCE here: its numerator, denominator,
// source, who reads it and the definition string the screen shows behind "?". The functions compute them from stored records only; nothing
// is estimated and nothing is a constant. They run on the state the caller holds (the projected state in the browser for 1, 5 and 6; the
// full state on the server, inside casebacked.digest, for 2, 3 and 4 because those read drafts and timestamps a role may not see).
//
// ctx = { inScope(clientId)->bool, today, now, min }       P = { from, to } (inclusive ISO dates)
import { ruleValue } from '../rules.js';
import { addDays, addHours, daysBetween } from '../dates.js';
import { day, inRange, weekStart, monthKey, monthEnd, addMonths, schoolDays, median, quantile, hoursBetween, distinct, r1 } from './common.js';

export const NOTE_FORM = { daily: 'dpn', weekly_guardian: 'weekly', monthly_collateral: 'collateral' };
export const NOTE_TYPE_LABEL = { daily: 'Daily notes', weekly_guardian: 'Weekly guardian contacts', monthly_collateral: 'Monthly collateral contacts' };

export const MEASURES = [
  { id: 'notes', no: 1, label: 'Notes on time', where: 'client',
    numerator: 'Required notes (daily, weekly guardian contact, monthly collateral) processed by their due time.',
    denominator: 'Required notes whose due time has passed, plus any already processed. A required note is one for each school day, week or month from the first note Psyflo holds for that student.',
    source: 'Process Form events seen by the page bridge, stored as processed notes.', reads: 'Supervisors, clinical advisor, administrators; staff see their own.',
    limits: 'Absences are not recorded in Psyflo, so a day without a note counts as missed. Notes processed before Psyflo held any note for a student are not counted either way.', rules: ['notes.daily_due_hours', 'notes.weekly_guardian_due', 'notes.monthly_collateral_due'] },
  { id: 'prep', no: 2, label: 'Time to document', where: 'server',
    numerator: 'Elapsed minutes from the first Psyflo capture or draft for a form (a saved dictation or the first typing into the open form) to Process Form: median and 75th percentile.',
    denominator: 'Notes processed in the period that have a capture or draft event.',
    source: 'Psyflo capture events and the Process Form time from the page bridge.', reads: 'Harvest leadership; staff see their own.',
    limits: 'The bridge cannot see when a form was opened, so this is a proxy. Weekly paperwork hours come from the staff survey, which is not in Psyflo.', rules: [] },
  { id: 'intake', no: 3, label: 'Intake to SRA', where: 'server',
    numerator: 'Elapsed days from Process Form on the CNA to Process Form on the initial SRA (Pending clinical approval): median, with intake to plan and plan to SRA shown separately.',
    denominator: 'Initial SRAs that reached Pending clinical approval in the period.',
    source: 'Process Form events on the CNA, the plan and the SRA.', reads: 'Clinical lead, administrators.',
    limits: 'Time spent waiting on a guardian or a signature is not part of this interval. Each case is listed for a clinician; a statistic needs 5 or more cases.', rules: ['initial_sra.send_within_days'] },
  { id: 'missing', no: 4, label: 'Items caught early', where: 'server',
    numerator: 'Items Psyflo flagged before Process Form: failed drafting checks and "Evidence missing" boxes on drafts that were then processed.',
    denominator: 'Forms processed in the period that had a draft (shown beside the count, as items per 100 forms).',
    source: 'Drafting checks and the boxes Psyflo typed, stored with the draft.', reads: 'Supervisors, clinical advisor.',
    limits: 'A flag counts as caught when Psyflo showed it before Process Form. Adding a check raises the count, so compare like with like.', rules: [] },
  { id: 'receipts', no: 5, label: 'Sends with receipts', where: 'client',
    numerator: 'Requests a person sent in the period that have a stored receipt: a fax delivery receipt, a portal confirmation or a logged receipt call.',
    denominator: 'All requests a person sent in the period.',
    source: 'Send events and receipts stored on each request.', reads: 'Clinical lead, program director.',
    limits: 'Anything sent outside Psyflo is not counted. A receipt shows delivery, not a decision.', rules: ['submission.receipt_check_day'] },
  { id: 'unresolved', no: 6, label: 'Unresolved requests', where: 'client',
    numerator: 'Open requests awaiting a Harvest action or an outcome record: information requested, partial not yet decided, peer-to-peer requested or awaiting an outcome, denied with no appeal sent, or no reply past the decision window.',
    denominator: 'Requests in an active state (shown beside the count).',
    source: 'The request stage and its dates in Psyflo.', reads: 'Clinical lead (owner), program director.',
    limits: 'A snapshot as of today. It has no target; compare it with the count on pilot day 0.', rules: ['decision.overdue_after_days', 'info_request.hours'] }
];
export const MEASURE = Object.fromEntries(MEASURES.map(m => [m.id, m]));
export const definitionText = id => { const m = MEASURE[id]; return m ? `Numerator: ${m.numerator} Denominator: ${m.denominator} Source: ${m.source} Limits: ${m.limits}` : ''; };

const procAt = n => String(n.processed_at || (n.date ? n.date + 'T23:59' : '')).slice(0, 16);

// ---------- 1 · notes completed in the agreed window ----------
export function notesOnTime(s, ctx, P) {
  const hours = ruleValue(s, 'notes.daily_due_hours', 24);
  const nowT = String(ctx.now || ctx.today + 'T23:59').slice(0, 16);
  const mine = (s.notes || []).filter(n => ctx.inScope(n.client) && NOTE_FORM[n.type]);
  const by = {}; for (const n of mine) { const t = (by[n.client] = by[n.client] || {}); (t[n.type] = t[n.type] || []).push(n); }
  const out = { num: 0, den: 0, late: 0, missed: 0, pending: 0, students: 0, byType: {}, byStudent: {}, observedSince: '' };
  for (const t of Object.keys(NOTE_TYPE_LABEL)) out.byType[t] = { num: 0, den: 0, late: 0, missed: 0 };
  const firsts = [];
  const last = P.to < ctx.today ? P.to : ctx.today;
  for (const [cid, types] of Object.entries(by)) {
    const row = out.byStudent[cid] = { num: 0, den: 0 };
    for (const [type, list] of Object.entries(types)) {
      const first = list.map(n => day(n.date)).sort()[0]; firsts.push(first);
      const slots = [];     // { due, match(note) }
      if (type === 'daily') {
        for (const d of schoolDays(first > P.from ? first : P.from, last)) slots.push({ due: addHours(d + 'T23:59', hours), match: n => day(n.date) === d });
      } else if (type === 'weekly_guardian') {
        for (let w = weekStart(first); w <= last; w = addDays(w, 7)) { const fri = addDays(w, 4); if (fri < P.from) continue; slots.push({ due: fri + 'T23:59', match: n => weekStart(n.date) === w }); }
      } else {
        for (let m = monthKey(first); m <= monthKey(last); m = addMonths(m, 1)) { const end = monthEnd(m); if (end < P.from) continue; slots.push({ due: end + 'T23:59', match: n => monthKey(n.date) === m }); }
      }
      const bt = out.byType[type];
      for (const sl of slots) {
        const note = list.filter(sl.match).sort((a, b) => (procAt(a) < procAt(b) ? -1 : 1))[0];
        if (note) { out.den++; bt.den++; row.den++; if (procAt(note) <= sl.due) { out.num++; bt.num++; row.num++; } else { out.late++; bt.late++; } }
        else if (sl.due <= nowT) { out.den++; bt.den++; row.den++; out.missed++; bt.missed++; }
        else out.pending++;
      }
    }
  }
  out.students = Object.keys(by).length;
  out.observedSince = firsts.sort()[0] || '';
  out.windowHours = hours;
  return out;
}

// ---------- 2 · time spent preparing documentation (needs drafts: full state) ----------
export function prepTime(s, ctx, P) {
  const all = (s.notes || []).filter(n => ctx.inScope(n.client) && NOTE_FORM[n.type] && n.processed_at);
  const inP = all.filter(n => inRange(n.processed_at, P.from, P.to));
  const mins = [];
  for (const n of inP) {
    const form = NOTE_FORM[n.type];
    const prev = all.filter(x => x.client === n.client && x.type === n.type && x.processed_at < n.processed_at).map(x => x.processed_at).sort().pop() || '';
    const starts = [];
    if (n.dictation) { const d = (s.dictations || []).find(d => d.client === n.client && d.spoken === n.dictation && d.at); if (d && d.at <= n.processed_at) starts.push(d.at); }
    for (const f of s.fills || []) if (f.client === n.client && f.form === form && f.at <= n.processed_at && f.at > prev) starts.push(f.at);
    if (!starts.length) continue;
    mins.push(Math.max(0, hoursBetween(starts.sort()[0], n.processed_at) * 60));
  }
  return { of: inP.length, n: mins.length, median: r1(median(mins)), p75: r1(quantile(mins, 0.75)) };
}

// ---------- 3 · completed intake to review-ready SRA (needs the client timeline: full state) ----------
export function intakeToSra(s, ctx, P) {
  const cases = [];
  for (const r of s.requests || []) {
    if (r.type !== 'initial' || !ctx.inScope(r.client)) continue;
    const c = (s.clients || []).find(x => x.id === r.client); const tl = (c && c.timeline) || {};
    const end = r.processed_at || tl.sra_processed; const start = tl.intake;
    if (!end || !start || !inRange(end, P.from, P.to)) continue;
    const dateOnly = String(end).length <= 10 || String(start).length <= 10;
    const hrs = dateOnly ? daysBetween(day(start), day(end)) * 24 : hoursBetween(start, end);
    const isp = tl.isp;
    cases.push({ client: r.client, request: r.id, start, end, days: r1(Math.max(0, hrs) / 24), approx: dateOnly,
      toPlan: isp ? Math.max(0, daysBetween(day(start), day(isp))) : null, planToSra: isp ? Math.max(0, daysBetween(day(isp), day(end))) : null });
  }
  return { n: cases.length, median: r1(median(cases.map(c => c.days))), medianToPlan: r1(median(cases.map(c => c.toPlan).filter(x => x != null))), medianPlanToSra: r1(median(cases.map(c => c.planToSra).filter(x => x != null))), cases };
}

// ---------- 4 · missing documentation items caught before processing (needs drafts: full state) ----------
export function missingCaught(s, ctx, P) {
  const formsOf = [];   // processed forms in the period that had a draft
  const notes = (s.notes || []).filter(n => ctx.inScope(n.client) && NOTE_FORM[n.type] && n.processed_at && inRange(n.processed_at, P.from, P.to));
  for (const n of notes) {
    const d = n.dictation && (s.dictations || []).find(d => d.client === n.client && d.spoken === n.dictation);
    const fs = (s.fills || []).filter(f => f.client === n.client && f.form === NOTE_FORM[n.type] && f.at <= n.processed_at && String(f.at).slice(0, 10) === day(n.processed_at));
    if (!d && !fs.length) continue;
    const failed = d ? (d.checks || []).filter(c => c && c.pass === false).length : 0;
    const latest = fs.sort((a, b) => (a.at < b.at ? -1 : 1)).pop();
    const evMissing = latest ? (latest.boxes || []).filter(b => /^Evidence missing/i.test(String(b.value || ''))).length : 0;
    formsOf.push({ client: n.client, form: NOTE_FORM[n.type], items: failed + evMissing });
  }
  for (const r of s.requests || []) {
    if (!r.processed_at || !ctx.inScope(r.client) || !inRange(r.processed_at, P.from, P.to)) continue;
    const fs = (s.fills || []).filter(f => f.client === r.client && /^sra-/.test(f.form) && f.at <= r.processed_at).sort((a, b) => (a.at < b.at ? -1 : 1));
    if (!fs.length) continue;
    formsOf.push({ client: r.client, form: fs.at(-1).form, items: (fs.at(-1).boxes || []).filter(b => /^Evidence missing/i.test(String(b.value || ''))).length });
  }
  const items = formsOf.reduce((a, f) => a + f.items, 0);
  return { forms: formsOf.length, items, per100: formsOf.length ? Math.round((100 * items) / formsOf.length) : null, flaggedForms: formsOf.filter(f => f.items > 0).length };
}

// ---------- 5 · authorization submissions with receipts recorded ----------
export const hasReceipt = (r, events) => !!(r.delivery_receipt || r.portal_ref || r.receipt_confirmed || (events || []).some(e => e.record === r.id && /receipt/i.test(e.what) && !/^Refused|no receipt|missing receipt/i.test(e.what)));
export function submissionsWithReceipts(s, ctx, P) {
  const sent = (s.requests || []).filter(r => ctx.inScope(r.client) && (r.sent || r.send_pressed_at) && inRange(r.sent || r.send_pressed_at, P.from, P.to));
  const rows = sent.map(r => ({ id: r.id, client: r.client, payer: r.payer, channel: r.channel, sent: r.sent || r.send_pressed_at, receipt: hasReceipt(r, s.events), stage: r.stage }));
  return { num: rows.filter(r => r.receipt).length, den: rows.length, rows, byChannel: Object.fromEntries(distinct(rows.map(r => r.channel)).map(c => [c, { num: rows.filter(r => r.channel === c && r.receipt).length, den: rows.filter(r => r.channel === c).length }])) };
}

// ---------- 6 · unresolved payer requests (a snapshot as of today) ----------
export const UNRESOLVED_KIND = { info_requested: 'Information requested', partial_decide: 'Partial: decide', peer_to_peer_requested: 'Peer-to-peer requested', peer_to_peer_booked: 'Peer-to-peer booked', p2p_awaiting: 'Awaiting decision', denied: 'Denied: no appeal sent', overdue: 'No reply past the window' };
export function unresolvedRequests(s, ctx) {
  const t = ctx.today, nowT = String(ctx.now || t + 'T23:59').slice(0, 16);
  const active = (s.requests || []).filter(r => ctx.inScope(r.client) && r.stage !== 'closed');
  const rows = [];
  for (const r of active) {
    if (!UNRESOLVED_KIND[r.stage]) continue;
    const from = day(r.info_requested_at || r.denied_on || (r.p2p_outcome && r.p2p_outcome.at) || r.offer_call || r.p2p_at || r.sent || r.drafted_at || '');
    const past = r.stage === 'overdue' || (r.stage === 'info_requested' && r.reply_due && String(r.reply_due).slice(0, 16) < nowT) || (r.stage === 'partial_decide' && r.reply_by && day(r.reply_by) < t)
      || (r.stage === 'peer_to_peer_booked' && r.p2p_at && day(r.p2p_at) < t) || (r.stage === 'denied' && r.appeal_deadline && day(r.appeal_deadline) < t);
    rows.push({ id: r.id, client: r.client, payer: r.payer, stage: r.stage, kind: UNRESOLVED_KIND[r.stage], ageDays: from ? Math.max(0, daysBetween(from, t)) : null, past });
  }
  const byKind = {}; for (const r of rows) byKind[r.stage] = (byKind[r.stage] || 0) + 1;
  return { count: rows.length, past: rows.filter(r => r.past).length, open: active.length, rows: rows.sort((a, b) => (b.past - a.past) || ((b.ageDays || 0) - (a.ageDays || 0))), byKind };
}
