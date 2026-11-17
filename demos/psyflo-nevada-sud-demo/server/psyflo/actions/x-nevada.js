// Claims & denials + Credentialing (Nevada SUD build). A person presses every button; Psyflo records
// what they did on the claim / credentialing cell and in the audit trail. Demo-only actions say so.
import { fmtDate, addDays } from '../../../web/js/shared/dates.js';

const PLAN = { ffs: 'Nevada Medicaid', anthem: 'Anthem', aetna: 'CareSource', uhc: 'HPN', sentara: 'Molina', humana: 'SilverSummit' };
const CHANNEL = { humana: 'fax', anthem: 'availity', sentara: 'fax', aetna: 'fax', uhc: 'portal', ffs: 'portal' };
const OPEN = ['denied', 'at_risk'];

function claim(s, id) {
  const c = (s.claims || []).find(x => x.id === id);
  if (!c) throw new Error('Claim not found: ' + id);
  return c;
}
function log(c, at, what) { (c.history || (c.history = [])).push({ at, what }); }
function cell(s, staff, plan) {
  const row = (s.credentialing || []).find(r => r.staff === staff);
  if (!row) throw new Error('No credentialing row for ' + staff);
  const p = row.plans && row.plans[plan];
  if (!p) throw new Error('No plan ' + plan + ' for ' + staff);
  return { row, p };
}
function retotal(row) {
  const ps = Object.values(row.plans || {});
  row.held_sessions = ps.reduce((n, p) => n + (p.held_sessions || 0), 0);
  row.held_amount = ps.reduce((n, p) => n + (p.held_amount || 0), 0);
}
const FALLBACK = { dowens: 'Dana Owens' };
const nameOf = (s, id) => ((s.staff || []).find(x => x.id === id) || {}).name || FALLBACK[id] || id;
const DEFAULT_BLOCKING = {
  packet_sent: p => `In ${PLAN[p]}'s queue. Nothing asked yet.`,
  submitted: () => 'Nevada Medicaid enrollment in review. Every MCO packet needs its approval letter.',
  info_requested: p => `${PLAN[p]} asked for more information.`,
  waiting_medicaid: () => 'Needs the Nevada Medicaid approval letter for the packet.',
  packet_ready: () => 'Packet assembled. A person sends it.',
  not_started: () => 'Not started.'
};

export default {
  // corrected / replacement claim sent (the person sent it from the clearinghouse or portal)
  'claim.resubmit'(s, { id, by = 'dowens', note }) {
    const c = claim(s, id);
    if (!OPEN.includes(c.status)) throw new Error(id + ' is not open');
    c.status = 'resubmitted'; c.resubmitted_at = s.today; c.resubmitted_by = by;
    const what = 'Corrected claim resubmitted' + (note ? ' · ' + note : '');
    log(c, s.today, what + ' · ' + nameOf(s, by));
    this.event(what + ' · ' + id, by, id);
    return { ok: true, status: c.status };
  },
  // reconsideration with proof of timely filing (fax payers: through Sfax; portal payers: uploaded in the person's session)
  'claim.reconsider'(s, { id, by = 'dowens' }) {
    const c = claim(s, id);
    if (!OPEN.includes(c.status)) throw new Error(id + ' is not open');
    c.status = 'reconsideration'; c.reconsideration_at = s.today; c.reconsideration_by = by;
    const ch = CHANNEL[c.payer];
    let what;
    if (ch === 'fax') {
      const ref = 'F-' + (2300 + (s.events || []).length % 600);
      c.reconsideration_ref = ref;
      what = `Reconsideration faxed to ${PLAN[c.payer]} through Sfax · ref ${ref}` + (c.proof ? ' · proof attached: ' + c.proof : '');
    } else {
      what = `Reconsideration uploaded in ${ch === 'availity' ? 'Availity' : PLAN[c.payer] + ' portal'} (your session)` + (c.proof ? ' · proof attached: ' + c.proof : '');
    }
    log(c, s.today, what + ' · ' + nameOf(s, by));
    this.event(what, by, id);
    return { ok: true, status: c.status, ref: c.reconsideration_ref };
  },
  'claim.writeoff'(s, { id, by = 'dowens', reason = '' }) {
    const c = claim(s, id);
    if (['recovered', 'written_off'].includes(c.status)) throw new Error(id + ' is already closed');
    c.status = 'written_off'; c.written_off_at = s.today; c.written_off_by = by; c.writeoff_reason = reason;
    const what = `Written off · $${c.amount}` + (reason ? ' · ' + reason : '');
    log(c, s.today, what + ' · ' + nameOf(s, by));
    this.event(what, by, id);
    return { ok: true, status: c.status };
  },
  // Demo: the payer pays a resubmitted / reconsidered claim (admin only in the UI)
  'claim.recovered'(s, { id, amount }) {
    const c = claim(s, id);
    if (!['reconsideration', 'resubmitted'].includes(c.status)) throw new Error(id + ' has nothing waiting on the payer');
    c.status = 'recovered'; c.paid_at = s.today; c.paid_amount = amount != null ? +amount : c.amount;
    const what = `835 remit: paid $${c.paid_amount} (demo)`;
    log(c, s.today, what);
    this.event(what, 'payer (demo)', id, { demo: true });
    return { ok: true, status: c.status };
  },

  // set the status / date on one clinician × plan cell
  'cred.update'(s, { staff, plan, status, date, blocking, next_followup, by = 'dowens' }) {
    const { row, p } = cell(s, staff, plan);
    const allowed = ['credentialed', 'packet_sent', 'submitted', 'info_requested', 'waiting_medicaid', 'packet_ready', 'not_started'];
    if (status && !allowed.includes(status)) throw new Error('Unknown status ' + status);
    const prev = p.status;
    if (status) p.status = status;
    if (status && status !== 'info_requested') p.date = date || s.today;
    if (status === 'info_requested') p.info_at = date || s.today;
    if (blocking != null && (blocking !== p.blocking || !status || status === prev)) p.blocking = blocking;
    else if (status && status !== prev && DEFAULT_BLOCKING[status]) p.blocking = DEFAULT_BLOCKING[status](plan);
    if (next_followup) p.next_followup = next_followup;
    else if (['packet_sent', 'submitted'].includes(status)) p.next_followup = addDays(s.today, 14);
    if (status === 'credentialed') { p.blocking = ''; p.next_followup = null; }
    const label = { credentialed: 'credentialed', packet_sent: 'packet sent', submitted: 'enrollment submitted', info_requested: 'information requested', waiting_medicaid: 'waiting on the Medicaid letter', packet_ready: 'packet ready to send', not_started: 'not started' }[p.status];
    this.event(`${nameOf(s, staff)} · ${PLAN[plan]}: ${label}`, by, 'cred:' + staff);
    retotal(row);
    return { ok: true, status: p.status };
  },
  'cred.followup'(s, { staff, plan, note = 'Follow-up call', next, by = 'dowens' }) {
    const { p } = cell(s, staff, plan);
    (p.followups || (p.followups = [])).push({ at: s.today, by, note });
    p.next_followup = next || addDays(s.today, 7);
    this.event(`${nameOf(s, staff)} · ${PLAN[plan]} follow-up: ${note} · next ${fmtDate(p.next_followup)}`, by, 'cred:' + staff);
    return { ok: true, next_followup: p.next_followup };
  },
  // Demo: the plan approves. Nevada Medicaid's approval moves the MCO cells waiting on its letter to "packet ready".
  'cred.approve'(s, { staff, plan }) {
    const { row, p } = cell(s, staff, plan);
    const released = p.held_sessions || 0;
    p.status = 'credentialed'; p.date = s.today; p.blocking = ''; p.next_followup = null;
    p.released = released; p.held_sessions = 0; p.held_amount = 0;
    this.event(`${PLAN[plan]} approved ${nameOf(s, staff)} (demo)` + (released ? ` · ${released} held session${released === 1 ? '' : 's'} can be billed (confirm effective date)` : ''), 'payer (demo)', 'cred:' + staff, { demo: true });
    if (plan === 'ffs') {
      const waiting = Object.entries(row.plans).filter(([, q]) => q.status === 'waiting_medicaid');
      for (const [, q] of waiting) { q.status = 'packet_ready'; q.blocking = 'Medicaid approval letter added to the packet. A person sends it.'; }
      if (waiting.length) this.event(`Medicaid approval letter added to ${waiting.length} MCO packet${waiting.length === 1 ? '' : 's'} for ${nameOf(s, staff)}`, 'Psyflo', 'cred:' + staff);
      if (row.checklist) for (const c of row.checklist) if (/Medicaid enrollment/.test(c.step)) { c.done = s.today; delete c.status; } else if (/MCO packets/.test(c.step)) c.status = 'ready to send';
    }
    retotal(row);
    return { ok: true, released };
  }
};
