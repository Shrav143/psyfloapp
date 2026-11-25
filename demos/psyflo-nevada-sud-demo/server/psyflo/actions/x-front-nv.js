// Nevada front-door actions (Referral review, Eligibility). Adults refer themselves or come from a referral
// partner (drug court, P&P, hospital ED, HIV clinic), so there is no family link: a person reads the Nevada
// Medicaid EVS lookup in their own login and records what it shows, straight from the referral or intake.
import { addDays, fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';
import { makePdf } from '../../pdf.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const staffName = (s, id) => byId(s.staff, id)?.name || id;
const clientText = (s, id) => { const c = byId(s.clients, id); return c ? `${c.initials}${c.age ? ', ' + c.age : ''}` : String(id || ''); };

export default {
  // Eligibility → "Record the result". A person ran the EVS lookup; Psyflo stores the dated proof and sets a re-check.
  'eligibility.recordEVS'(s, { referral, result, plan, effective, medicaid_id, by = 'dowens' }) {
    const r = need(byId(s.referrals, referral), 'Referral');
    if (!['active', 'inactive'].includes(result)) throw new Error('Pick active or not active');
    if (result === 'active' && !plan) throw new Error('Pick the plan EVS shows (an MCO or FFS)');
    let el = s.eligibility.find(e => e.referral === referral);
    if (!el) { el = { referral, client: r.client }; s.eligibility.push(el); }
    if (medicaid_id) el.lookup = { ...(el.lookup || {}), medicaid_id };
    const prev = el.status === 'recorded' ? { checked_at: el.checked_at, checked_by: el.checked_by, result: el.result, plan: el.plan, effective: el.effective, screenshot: el.screenshot, file: el.file } : null;
    const c = byId(s.clients, el.client);
    const label = c ? c.initials.replace(/\./g, '') : String(el.client || referral).replace(/[^\w]/g, '');
    const shot = `EVS_${label}_${s.today}.png`;
    const payer = byId(s.payers, plan);
    const at = this.now();
    const file = this.writeFile(shot.replace(/\.png$/, '.pdf'), makePdf([
      { text: 'Nevada Medicaid · EVS eligibility lookup', size: 14, bold: true },
      { text: 'Proof saved in Psyflo · demo stand-in for the screenshot the person took', size: 9 },
      { text: 'Member: ' + clientText(s, el.client) + (el.lookup?.medicaid_id ? ' · Medicaid ID ending ' + String(el.lookup.medicaid_id).replace(/\D/g, '').slice(-4) : ''), gap: 10 },
      { text: 'Result: ' + result + (payer ? ' · ' + payer.name : '') + (effective ? ' · effective ' + fmtDate(effective, { year: true }) : '') },
      { text: 'Looked up by ' + staffName(s, by) + ' in their own EVS login · ' + fmtDateTime(at, { year: true }), gap: 10, bold: true }
    ], { title: shot }));
    s.files.push({ ...file, kind: 'eligibility_proof', record: referral, at });
    for (const rm of s.reminders.filter(x => x.kind === 'eligibility_recheck' && x.record === referral && !x.done)) rm.done = at;
    const next = addDays(s.today, 30);
    Object.assign(el, { status: 'recorded', checked_at: at, checked_by: by, result, plan: plan || null, effective: effective || null, screenshot: shot, file: file.url, next_check: next, history: (el.history || []).concat(prev ? [prev] : []) });
    if (c) c.medicaid = { ...(c.medicaid || {}), status: result, plan: plan || null, effective, checked_on: at, checked_by: by, next_check: next };
    r.eligibility = result === 'active' ? 'active · ' + (payer?.short || payer?.name?.split(' ')[0] || plan) : 'not active';
    r.next = result === 'active' ? 'Schedule the intake screening' : 'No Medicaid · route to the Ryan White / SAPTA grant (no PA) or hold';
    s.reminders.push({ id: 'rem-' + Date.now(), for: by, kind: 'eligibility_recheck', record: referral, due: next, text: 'Monthly EVS re-check · ' + clientText(s, el.client) });
    this.event(`Eligibility recorded from EVS · ${result}${payer ? ' · ' + payer.name : ''} (screenshot stored in Psyflo)`, by, referral);
    return { file, screenshot: shot };
  },

  // Referral review → "Route and notify": grant clients (Ryan White Part A/C, SAPTA block grant) need no prior authorization.
  'referral.routeGrantNV'(s, { id, why = 'No Medicaid', program = 'Ryan White / SAPTA grant', by = 'jperez' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.stage = 'grant_program'; r.next = 'Routed ' + fmtDate(s.today) + ' · ' + program + ' · no PA';
    r.grant = { why, program, at: this.now(), by };
    delete r.hold;
    this.event('Routed to ' + program + ' · ' + why + ' · no prior authorization needed', by, id);
    this.event('Email to the grant program coordinator with a secure link to ' + id + ' (email stub)', 'Psyflo', id);
    this.event('Referral partner told the client starts under the grant (email stub)', 'Psyflo', id);
  },

  // Eligibility → "Hold the referral": nothing is texted; the person calls the client.
  'referral.holdNV'(s, { id, why = 'Medicaid not active', by = 'jperez' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    r.hold = { why, at: this.now(), by };
    r.next = 'On hold · ' + why + ' · call the client ' + fmtDate(s.today);
    this.event('Referral held · ' + why, by, id);
  },

  'referral.unholdNV'(s, { id, by = 'jperez' }) {
    const r = need(byId(s.referrals, id), 'Referral');
    delete r.hold; r.next = r.eligibility ? 'Schedule the intake screening' : 'Check Nevada Medicaid in EVS';
    this.event('Hold lifted', by, id);
  },

  // Referral review → "Save": intake screening booked; reminder to the client / ask the partner are logged stubs.
  'referral.scheduleNV'(s, { id, who = 'jperez', when, remind_client = true, ask_partner = false, by }) {
    need(byId(s.referrals, id), 'Referral');
    if (!when) throw new Error('Pick a date and time for the intake screening');
    const had = s.screenings.some(x => x.referral === id && x.status === 'booked');
    s.screenings = s.screenings.filter(x => !(x.referral === id && x.status === 'booked'));
    s.reminders = s.reminders.filter(x => !(x.record === id && x.kind === 'screening_call' && !x.done));
    this.actions['referral.scheduleScreening'].call(this, s, { id, who, when });
    const rm = s.reminders.find(x => x.record === id && x.kind === 'screening_call' && !x.done);
    if (rm) rm.text = 'Intake screening · ' + clientText(s, byId(s.referrals, id).client);
    if (had) this.event('Earlier intake screening booking replaced', by || who, id);
    if (remind_client) this.event('Client texted a confirmation, with a reminder the morning of ' + fmtDate(when, { dow: true }) + ' (SMS stub)', 'Psyflo', id);
    if (ask_partner) this.event('Referral partner asked for the records still missing before the screening (email stub)', 'Psyflo', id);
    return { id, when };
  }
};
