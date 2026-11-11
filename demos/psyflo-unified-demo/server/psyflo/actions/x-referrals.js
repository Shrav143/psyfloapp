// Referrals group actions (screens 7 Referral review, 9 Eligibility). Thin wrappers over the core
// actions that add what the canvas promises around them: the SMS/email stubs logged to events,
// rescheduling without duplicate calls, and the dated eligibility proof stored in Psyflo.
import { fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf } from '../../pdf.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const staffName = (s, id) => byId(s.staff, id)?.name || id;

export default {
  // Referral review → "Save and text the guardian". Replaces an earlier booking for the same referral.
  'referral.scheduleAndText'(s, { id, who = this.who(), when, text_guardian = true, ask_counselor = false }) {
    const by = this.who();
    const r = need(byId(s.referrals, id), 'Referral');
    if (!when) throw new Error('Pick a date and time for the call');
    const had = s.screenings.some(x => x.referral === id && x.status === 'booked');
    s.screenings = s.screenings.filter(x => !(x.referral === id && x.status === 'booked'));
    s.reminders = s.reminders.filter(x => !(x.record === id && x.kind === 'screening_call' && !x.done));
    this.actions['referral.scheduleScreening'].call(this, s, { id, who, when });
    if (had) this.event('Earlier screening booking replaced', by || who, id);
    if (text_guardian) this.event('Guardian texted a confirmation, with a reminder the morning of ' + fmtDate(when, { dow: true }) + ' (SMS stub · not sent)', 'Psyflo', id, { actor_kind: 'system', sim: true });
    if (ask_counselor) this.event('Counselor asked for schedule and grades before the call (email stub · not sent)', 'Psyflo', id, { actor_kind: 'system', sim: true });
    return { id, when };
  },

  // Referral review → "Route and notify". Emails are stubs that log to the events list.
  'referral.routeAndNotify'(s, { id, why = 'No Medicaid' }) {
    const by = this.who();
    const r = need(byId(s.referrals, id), 'Referral');
    this.actions['referral.routeGrant'].call(this, s, { id, program: 'Grant program', why });
    r.grant = { why, at: this.now(), by };
    this.event('Email to the grant program lead with a secure link to ' + id + ' (email stub · not sent)', 'Psyflo', id, { actor_kind: 'system', sim: true });
    this.event('Email and text to the site supervisor (stub · not sent)', 'Psyflo', id, { actor_kind: 'system', sim: true });
    this.event('School counselor told the referral moved to the grant program (email stub · not sent)', 'Psyflo', id, { actor_kind: 'system', sim: true });
  },

  // Eligibility → "If it comes back inactive" → hold the referral and tell the family
  'referral.hold'(s, { id, why = 'Medicaid not active' }) {
    const by = this.who();
    const r = need(byId(s.referrals, id), 'Referral');
    r.hold = { why, at: this.now(), by };
    r.next = 'On hold · ' + why + ' · family told ' + fmtDate(s.today);
    this.event('Referral held · ' + why + ' · family told by text (SMS stub · not sent)', by, id, { sim: true });
  },
  'referral.unhold'(s, { id }) {
    const by = this.who();
    const r = need(byId(s.referrals, id), 'Referral');
    delete r.hold; r.next = r.eligibility ? 'Schedule the screening call' : 'Send the family link';
    this.event('Hold lifted', by, id);
  },

  // Eligibility → a person ran the DMAS lookup in their own login and records what it showed.
  // Stores the dated proof in Psyflo (not in Lauris), closes the open re-check reminder, keeps history.
  'eligibility.recordProof'(s, { referral, result, plan, effective }) {
    const by = this.who();
    const el = need(s.eligibility.find(e => e.referral === referral), 'Eligibility');
    if (el.status === 'waiting_link' || !(el.lookup || el.status === 'recorded')) throw new Error('Eligibility is checked only after the guardian submits the family link');
    if (!['active', 'inactive'].includes(result)) throw new Error('Pick active or inactive');
    if (result === 'active' && !plan) throw new Error('Pick the plan DMAS shows');
    const c = byId(s.clients, el.client);
    const label = c ? c.initials.replace(/\./g, '') : String(el.client).replace(/[^\w]/g, '');
    const shot = `DMAS_${label}_${s.today}.png`;
    const payer = byId(s.payers, plan);
    const at = this.now();
    const file = this.writeFile(shot.replace(/\.png$/, '.pdf'), makePdf([
      { text: 'Virginia Medicaid (DMAS) · eligibility lookup', size: 14, bold: true },
      { text: 'Proof saved in Psyflo · demo stand-in for the screenshot the person took', size: 9 },
      { text: 'Member: ' + (el.lookup?.name || label) + ' · Medicaid ID ending ' + String(el.lookup?.medicaid_id || '').replace(/\D/g, '').slice(-4), gap: 10 },
      { text: 'Date of birth: ' + (el.lookup?.dob || '—') },
      { text: 'Result: ' + result + (payer ? ' · ' + payer.name : '') + (effective ? ' · effective ' + fmtDate(effective, { year: true }) : '') },
      { text: 'Looked up by ' + staffName(s, by) + ' in their own DMAS login · ' + fmtDateTime(at, { year: true }), gap: 10, bold: true }
    ], { title: shot }));
    s.files.push({ ...file, kind: 'eligibility_proof', record: referral, at });
    for (const rm of s.reminders.filter(x => x.kind === 'eligibility_recheck' && x.record === referral && !x.done)) rm.done = at;
    const prev = el.status === 'recorded' ? { checked_at: el.checked_at, checked_by: el.checked_by, result: el.result, plan: el.plan, effective: el.effective, screenshot: el.screenshot, file: el.file } : null;
    this.actions['eligibility.record'].call(this, s, { referral, result, plan: result === 'active' ? plan : (plan || null), effective, by, screenshot: shot });
    el.file = file.url;
    el.history = (el.history || []).concat(prev ? [prev] : []);
    return { file, screenshot: shot };
  }
};
