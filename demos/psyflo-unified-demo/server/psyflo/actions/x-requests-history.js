// Partial-award choices, peer-to-peer scheduling and outcome logging (screens 35, 38).
// Accept-and-stretch and accept-and-use-them-up are internal decisions: nothing is sent to the insurer,
// the platform only logs them on the request. A peer-to-peer is arranged by phone outside the platform;
// staff enter the agreed date and time here, then log the outcome (often "awaiting decision" first).
import { addDays, fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { ruleValue } from '../../../web/js/shared/rules.js';
import { refuse, needUnits, needDocRef } from '../gates.js';
import { recordDecision, applyAward } from './core.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const payerShort = (s, id) => ({ humana: 'Humana', anthem: 'Anthem', sentara: 'Sentara', aetna: 'Aetna', uhc: 'UnitedHealthcare', ffs: 'Medicaid FFS' }[id] || (byId(s.payers, id) || {}).name || id);
const OUTCOMES = ['awaiting', 'approved', 'partial', 'denied'];

export default {
  // choice: 'stretch' | 'use_up' | 'p2p'. plan carries the numbers the screen showed (stretch) or the call date (p2p).
  'request.partialChoice'(s, { id, choice, plan = {} }) {
    const by = this.who();
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage !== 'partial_decide') refuse('Only an open partial award can be decided.', { record: id, code: 'bad_stage' });
    if (plan.per_week != null) needUnits(plan.per_week, { min: 1, max: 15, what: 'Units per week' });
    if (plan.per_day != null) needUnits(plan.per_day, { min: 1, max: 3, what: 'Units per day' });
    if (plan.until && (!/^\d{4}-\d{2}-\d{2}$/.test(plan.until) || plan.until < s.today)) refuse('The stretch end date cannot be in the past.', { status: 422, audit: false });
    const units = r.units_offered || r.units_awarded;
    const pf = payerShort(s, r.payer);
    r.decision = { door: choice, at: this.now(), by, plan };
    if (choice === 'stretch') {
      r.stage = 'active'; r.units_awarded = units; applyAward(this, s, r, units, 'partial accepted · stretch');
      r.stretch = { units, until: plan.until || null, per_week: plan.per_week || null, per_day: plan.per_day || null };
      this.event(`Decision logged: accept ${units} units and stretch them to ${plan.until ? fmtDate(plan.until) : 'the end date'}${plan.per_week ? ' · about ' + plan.per_week + ' units a week' : ''} · not sent to ${pf}`, by, id);
      return { stage: r.stage };
    }
    if (choice === 'use_up') {
      r.stage = 'early_discharge'; r.units_awarded = units; applyAward(this, s, r, units, 'partial accepted · use them up');
      this.event(`Decision logged: accept ${units} units, keep the same care, use them up${plan.runout ? ' (about ' + fmtDate(plan.runout) + ')' : ''}, then discharge and start a new initial · not sent to ${pf}`, by, id);
      return { stage: r.stage };
    }
    if (choice === 'p2p') {
      if (plan.when) {
        r.stage = 'peer_to_peer_booked'; r.p2p_at = plan.when.slice(0, 16);
        this.event(`Asked ${pf} for a peer-to-peer call · call set for ${fmtDateTime(r.p2p_at, { dow: true })}`, by, id);
      } else {
        r.stage = 'peer_to_peer_requested'; delete r.p2p_at;
        this.event(`Asked ${pf} for a peer-to-peer call · date to be set when ${pf} calls back`, by, id);
      }
      return { stage: r.stage };
    }
    throw new Error('Unknown choice: ' + choice);
  },

  // the insurer called and a time was agreed (or moved)
  'request.p2pSchedule'(s, { id, when }) {
    const by = this.who();
    const r = need(byId(s.requests, id), 'Request');
    if (!when) throw new Error('Enter the date and time of the call');
    if (String(when).slice(0, 10) < s.today) refuse('The call cannot be scheduled in the past.', { status: 422, audit: false });
    const at = String(when).slice(0, 16);
    const moved = r.p2p_at && r.p2p_at !== at && r.stage === 'peer_to_peer_booked';
    const prev = r.p2p_at;
    r.p2p_at = at;
    if (['peer_to_peer_requested', 'partial_decide', 'peer_to_peer_booked'].includes(r.stage)) r.stage = 'peer_to_peer_booked';
    this.event(moved ? `Peer-to-peer call moved from ${fmtDateTime(prev, { dow: true })} to ${fmtDateTime(at, { dow: true })} (agreed by phone with ${payerShort(s, r.payer)})` : `Peer-to-peer call set for ${fmtDateTime(at, { dow: true })} (agreed by phone with ${payerShort(s, r.payer)})`, by, id);
    return { stage: r.stage };
  },

  // outcome: awaiting (the call is held, decision comes later) | approved | partial | denied
  'request.p2pLog'(s, { id, outcome, units, notes = '', doc_ref, reason }) {
    const by = this.who();
    const r = need(byId(s.requests, id), 'Request');
    if (!OUTCOMES.includes(outcome)) throw new Error('Unknown outcome: ' + outcome);
    let ref = null, u = null;
    if (outcome !== 'awaiting') {
      // a recorded payer decision is write-once and needs the document that states it
      ref = needDocRef(doc_ref, 'the peer-to-peer outcome');
      u = outcome === 'denied' ? 0 : needUnits(units ?? r.units_awarded ?? r.units_offered ?? r.units_requested, { min: 1, max: r.units_requested, what: 'Units' });
      recordDecision(this, s, r, { kind: 'p2p', outcome, units: u, doc_ref: ref, notes, reason });
      units = u || undefined;
    }
    const pf = payerShort(s, r.payer);
    const prev = r.p2p_outcome;
    r.p2p_outcome = { outcome, units: units || undefined, notes: notes || undefined, doc_ref: ref || undefined, at: this.now(), by, held_at: prev?.held_at || (outcome === 'awaiting' ? this.now() : undefined) };
    const tail = notes ? ` · "${notes.slice(0, 80)}${notes.length > 80 ? '…' : ''}"` : '';
    if (outcome === 'awaiting') {
      r.stage = 'p2p_awaiting';
      this.event(`Peer-to-peer call held · awaiting ${pf}'s decision${tail}`, by, id);
    } else if (outcome === 'approved' || outcome === 'partial') {
      r.stage = 'active'; r.units_awarded = units || (outcome === 'approved' ? r.units_requested : r.units_awarded || r.units_offered);
      applyAward(this, s, r, r.units_awarded, 'peer-to-peer');
      this.event(`Peer-to-peer outcome logged · ${outcome === 'approved' ? 'approved' : 'approved in part'} · ${r.units_awarded} units · document ${ref}${tail}`, by, id);
    } else {
      r.stage = 'denied'; r.denied_on = s.today; r.notice_date = r.notice_date || s.today; r.denial_reason = r.denial_reason || 'upheld after the peer-to-peer';
      const days = ruleValue(s, 'appeal.window_days', 60); r.appeal_deadline = r.appeal_deadline || addDays(r.notice_date, days);
      delete r.appeal_days_left;
      this.event(`Peer-to-peer outcome logged · denied · document ${ref} · guardian-led appeal window (${days} days from the notice; confirm on the letter)${tail}`, by, id);
    }
    return { stage: r.stage };
  }
};
