// v2 workflow actions: internal approval before signature, weekly eligibility re-verification,
// referral consent, and logging the day-10 payer follow-up. Loaded after core.js, so wrapped names override it.
import core from './core.js';
import { addDays } from '../../../web/js/shared/dates.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };

export default {
  // The clinical lead approves a processed request before the clinician signs it in Lauris (replaces the "approved" email).
  // Nothing happens in Lauris: this is Psyflo's own tracker.
  'request.approve'(s, { id, by = 'dowens' }) {
    const r = need(byId(s.requests, id), 'Request');
    if (r.stage !== 'needs_approval') throw new Error('Only a request pending approval can be approved');
    const who = byId(s.staff, by);
    Object.assign(r, { stage: 'awaiting_signature', approved_by: by, approved_at: this.now() });
    this.event(`Approved by ${who ? who.name : by} · ready for the clinician to sign in Lauris`, by, id);
  },
  // Get Signature is pressed in Lauris. If approval was skipped the tracker says so instead of blocking Lauris.
  'request.signed'(s, args, ctx) {
    const r = need(byId(s.requests, args.id), 'Request');
    const skipped = r.stage === 'needs_approval';
    const out = core['request.signed'].call(this, s, args, ctx);
    if (skipped) { r.approval_skipped = true; this.event('Signed before approval · no clinical lead approval on record', 'Psyflo', args.id); }
    return out;
  },
  // Weekly eligibility re-verification for a student already in service. A person runs the DMAS lookup; Psyflo stores the dated
  // screenshot and sets the next check seven days out.
  'eligibility.verify'(s, { client, result = 'active', plan, by = 'jperez', screenshot }) {
    let el = s.eligibility.find(e => e.kind === 'reverify' && e.client === client);
    if (!el) { el = { kind: 'reverify', client, plan: plan || byId(s.clients, client)?.medicaid?.plan || 'ffs', status: 'recorded', history: [] }; s.eligibility.push(el); }
    const at = this.now();
    const shot = screenshot || `DMAS_${client}_${s.today}.png`;
    (el.history = el.history || []).push({ at: el.checked_at, result: el.result, by: el.checked_by, screenshot: el.screenshot });
    Object.assign(el, { result, plan: plan || el.plan, checked_at: at, checked_by: by, screenshot: shot, next_check: addDays(s.today, 7), status: 'recorded' });
    const c = byId(s.clients, client);
    if (c) c.medicaid = { ...(c.medicaid || {}), status: result, plan: el.plan, checked_on: at, checked_by: by, next_check: el.next_check };
    this.event(`Eligibility re-verified · ${result} · screenshot ${shot} stored`, by, client);
    return { next_check: el.next_check };
  },
  // The school may refer only with the guardian's agreement.
  'referral.create'(s, args, ctx) {
    const f = args.form || {};
    const agrees = f.guardian_agrees === true || f.guardian_agrees === 'yes' || f.guardian_agrees === 'Yes';
    if (!args.draft && !agrees) throw new Error('Guardian agreement is needed to refer');
    const out = core['referral.create'].call(this, s, args, ctx);
    const r = byId(s.referrals, out.id); if (r) r.guardian_agrees = agrees;
    return out;
  },
  // The day-10 call: log what the payer said. Receipt confirmed keeps the request in review; "not found" prompts a resend.
  'request.followUp'(s, { id, outcome = 'received', by = 'cdiaz', note = '' }) {
    const r = need(byId(s.requests, id), 'Request');
    const at = this.now();
    r.follow_up = { at, by, outcome, note };
    if (outcome === 'received') { r.receipt_confirmed = at; r.receipt_by = by; }
    const text = { received: 'Payer follow-up call · receipt confirmed, in review', in_review: 'Payer follow-up call · still in review', not_found: 'Payer follow-up call · fax not found, resend needed', decided: 'Payer follow-up call · decision is being faxed' }[outcome] || 'Payer follow-up call';
    this.event(text + (note ? ' · ' + note : ''), by, id);
    if (outcome === 'not_found') r.resend = true;
  }
};
