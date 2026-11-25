// Authorizations (E2): case owners, the day-N follow-up call log, a payer decision recorded by a person (with its document
// reference), and the reconcile hooks that keep the client's authorization, its window and the "Enter units in Lauris" task in step
// with request.stage (the single source of truth).
//
//   auth.assign {id, owner, backup}              authorizations   owner and backup owner of a case (auth_meta)
//   auth.logCall {id, outcome, note}             send.packet      the follow-up / receipt call, append-only
//   auth.recordDecision {id, outcome, units, doc_ref, received, ...}   payer.decision   approved | partial | denied, write-once
//
// Psyflo never writes units into Lauris. An approved decision opens the human task (applyAward in core.js); only a bridge
// observation of the units on the open Lauris page closes it (closeUnitTasks in lead-extension.js).
// Hooks: this file fires store.hooks 'decision' ({ id, outcome, state }) after a decision is recorded so the denial layer can react.
import { addDays, fmtDate } from '../../../web/js/shared/dates.js';
import { ruleValue, rule, decisionDay } from '../../../web/js/shared/rules.js';
import { refuse, needUnits, needDocRef } from '../gates.js';
import { recordDecision, applyAward } from './core.js';
import { store as theStore } from '../store.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const isoDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const staffName = (s, id) => (byId(s.staff, id) || {}).name || id;
// a seeded request may carry its sent date only in request_details[id].fill (the tracker fields the seed row lacks)
const sentOf = (s, r) => r.sent || (((s.request_details || {})[r.id] || {}).fill || {}).sent || null;

export const CALL_OUTCOMES = {
  receipt_confirmed: 'Receipt confirmed',
  in_review: 'In clinical review',
  decision_given: 'Decision given by phone',
  no_answer: 'No answer · call again',
  not_found: 'Payer cannot find it'
};

// per-request additions that the request row cannot carry for every role (the role projection of requests is a fixed list of fields)
export function metaOf(s, id) { s.auth_meta = s.auth_meta || {}; return (s.auth_meta[id] = s.auth_meta[id] || {}); }

export const authz = {
  'auth.assign': { any: ['authorizations'] },
  'auth.logCall': { any: ['send.packet'] },
  'auth.recordDecision': { any: ['payer.decision'] },
  'auth.reconcile': { internal: true }
};

// auth_meta carries owners and the call log: supervisors, clinicians and admin (status-level) read it; direct support does not
export const projection = { auth_meta: { clinician: true, supervisor: true, admin: true, default: false } };

// ---- reconcile: request.stage is the truth; the client's authorization, its window and the Lauris task follow ----
// An active (or early-discharge) request with awarded units must have an authorization in Psyflo's tracker, and a person must have a
// task to enter those units in Lauris until the open Lauris page shows them. Never writes to Lauris.
export function reconcileAuth(store, s) {
  const fixes = [];
  for (const r of s.requests || []) {
    if (!['active', 'early_discharge'].includes(r.stage)) continue;
    const u = r.units_awarded; if (!(u > 0)) continue;
    const c = byId(s.clients, r.client); if (!c) continue;
    const a = c.authorization;
    if (!a || !(a.units > 0)) { applyAward(store, s, r, u, 'reconciled with the request'); fixes.push({ request: r.id, fix: 'award' }); continue; }
    if (a.in_lauris === false && a.award === r.id && !(s.lauris_tasks || []).some(t => t.client === c.id && t.status === 'open')) {
      s.lauris_tasks = s.lauris_tasks || [];
      s.lauris_tasks.push({ id: 'lt-' + (s.lauris_tasks.length + 1), kind: 'enter_units_in_lauris', client: c.id, consumer: c.lauris_no || c.harvest_no || null, request: r.id, units: a.units, start: a.start, end: a.end, status: 'open', opened_at: store.now(), opened_by: 'Psyflo', text: `Enter ${a.units} units (${fmtDate(a.start)} to ${fmtDate(a.end)}) on the Lauris Authorizations page for ${c.initials}` });
      fixes.push({ request: r.id, fix: 'task' });
    }
  }
  return fixes;
}

export const hooks = {
  reset({ state }) { reconcileAuth(theStore, state); },
  advance({ state }) { reconcileAuth(theStore, state); },
  scenario({ state }) { reconcileAuth(theStore, state); },
  observed(store, s) { reconcileAuth(store, s); }
};

export default {
  // Owner and backup owner of a case. Assignment is workflow, not clinical data: anyone who can open the queue may set it.
  'auth.assign'(s, { id, owner, backup }) {
    need(byId(s.requests, id), 'Request');
    const ok = x => { const st = byId(s.staff, x); return !!st && ['clinician', 'supervisor'].includes(st.role); };
    if (!ok(owner)) refuse('The owner must be a clinician or a site supervisor.', { status: 422, audit: false });
    if (backup && !ok(backup)) refuse('The backup must be a clinician or a site supervisor.', { status: 422, audit: false });
    if (backup && backup === owner) refuse('The backup must be a different person from the owner.', { status: 422, audit: false });
    const m = metaOf(s, id);
    m.owner = owner; m.backup = backup || null; m.assigned_at = this.now(); m.assigned_by = this.who();
    this.event(`Owner set to ${staffName(s, owner)}${backup ? ', backup ' + staffName(s, backup) : ''}`, this.who(), id);
    return { owner, backup: backup || null };
  },

  // The follow-up (receipt) call, day N after sending. Append-only; a confirmed receipt is also kept on the request (write-once).
  'auth.logCall'(s, { id, outcome, note = '' }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (!CALL_OUTCOMES[outcome]) refuse('Pick what the payer said on the call.', { status: 422, audit: false });
    if (!['submitted', 'overdue'].includes(r.stage)) refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; a follow-up call is logged on a sent request that has no decision yet.`, { record: id, code: 'bad_stage' });
    const dd = decisionDay(s, sentOf(s, r), s.today, r.payer);
    const m = metaOf(s, id); m.calls = m.calls || [];
    const call = { id: 'call-' + (m.calls.length + 1), at: this.now(), by, day: dd ? dd.day : null, outcome, note: String(note || '').trim().slice(0, 400) };
    m.calls.push(call);
    if (outcome === 'receipt_confirmed' && !r.receipt_confirmed) { r.receipt_confirmed = call.at; r.receipt_by = by; }
    this.event(`Follow-up call${dd ? ' on day ' + dd.day : ''} · ${CALL_OUTCOMES[outcome]}${call.note ? ' · "' + call.note.slice(0, 80) + (call.note.length > 80 ? '…' : '') + '"' : ''}`, by, id);
    return { call };
  },

  // A person records what the payer's document says. Needs the document reference; write-once (a correction needs a reason).
  // approved -> Active + the award in Psyflo's tracker + the human task "Enter units in Lauris"; partial -> the denial workspace;
  // denied -> the guardian-led appeal window (rule appeal.window_days, unverified).
  'auth.recordDecision'(s, { id, outcome, units, doc_ref, received, reason_text, notes, reason, reply_by }) {
    const r = need(byId(s.requests, id), 'Request'); const by = this.who();
    if (!['submitted', 'overdue'].includes(r.stage)) refuse(`${id} is ${r.stage.replace(/_/g, ' ')}; a payer decision is recorded here only for a sent request that has no decision yet. Replies to a partial, a denial or an information request are worked in Denial Intelligence.`, { record: id, code: 'bad_stage' });
    if (!['approved', 'partial', 'denied'].includes(outcome)) refuse('Pick approved, partial or denied.', { status: 422, audit: false });
    const ref = needDocRef(doc_ref, 'the payer decision');
    const day = received ? String(received).slice(0, 10) : s.today;
    if (!isoDate(day)) refuse('Enter the date on the payer\'s document.', { status: 422, audit: false });
    if (day > s.today) refuse('The date on the payer\'s document cannot be in the future.', { status: 422, audit: false });
    if (sentOf(s, r) && day < sentOf(s, r).slice(0, 10)) refuse('The payer\'s document cannot be dated before the request was sent.', { status: 422, audit: false });
    const tail = notes ? ` · "${String(notes).slice(0, 80)}"` : '';
    if (outcome === 'approved') {
      const u = needUnits(units ?? r.units_requested, { min: 1, max: r.units_requested, what: 'Approved units' });
      if (u < r.units_requested) refuse(`${u} is fewer than the ${r.units_requested} requested: that is a partial award. Choose Partial.`, { status: 422, audit: false });
      recordDecision(this, s, r, { kind: 'initial', outcome: 'approved', units: u, doc_ref: ref, notes, reason });
      r.stage = 'active'; r.units_awarded = u; r.decision_received = day;
      this.event(`Payer decision recorded · approved · ${u} units · document ${ref} · dated ${fmtDate(day)}${tail}`, by, id);
      applyAward(this, s, r, u, 'payer decision recorded');
    } else if (outcome === 'partial') {
      const u = needUnits(units, { min: 1, max: r.units_requested - 1, what: 'Offered units' });
      recordDecision(this, s, r, { kind: 'initial', outcome: 'partial', units: u, doc_ref: ref, notes, reason });
      r.stage = 'partial_decide'; r.units_offered = u; r.offer_call = day; r.decision_received = day;
      if (isoDate(reply_by) && reply_by >= s.today) r.reply_by = reply_by;
      this.event(`Payer decision recorded · partial · ${u} of ${r.units_requested} units · document ${ref} · dated ${fmtDate(day)} · decide in Denial Intelligence${tail}`, by, id);
    } else {
      recordDecision(this, s, r, { kind: 'initial', outcome: 'denied', units: 0, doc_ref: ref, notes, reason });
      const w = rule(s, 'appeal.window_days');
      r.stage = 'denied'; r.denied_on = day; r.notice_date = day; r.decision_received = day;
      r.denial_reason = String(reason_text || '').trim().slice(0, 300) || 'not given on the notice';
      r.appeal_deadline = addDays(day, ruleValue(s, 'appeal.window_days', 60));
      this.event(`Payer decision recorded · denied · document ${ref} · dated ${fmtDate(day)} · guardian-led appeal window ${w.value} days from the notice (${w.verification.toLowerCase()})${tail}`, by, id);
    }
    this.hooks.run('decision', { id, outcome, state: s });
    return { stage: r.stage };
  },

  // internal: the reconcile pass, callable from another action (a denial-layer resolve) as this.actions['auth.reconcile'].call(this, s)
  'auth.reconcile'(s) { return { fixes: reconcileAuth(this, s) }; }
};
