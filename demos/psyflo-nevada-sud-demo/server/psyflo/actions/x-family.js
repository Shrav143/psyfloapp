// Client portal actions (screens 46–50 · hidden in the Nevada build; kept so older flows still run). The two signed forms in the enrollment packet, the quarterly and the
// treatment plan use core 'consent.sign'; the rest of the packet is kept here as s.enrollment[client][item].
// Scheduling (Nov 7 product call): a clinician marks a referral as qualifying for a screening call, and later the
// client as qualifying for treatment; the client books the call / the in-person assessment from the
// clinicians' open times, asks for a ride, and confirms the day before.
import { fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const LABEL = { ack: 'read and acknowledged', form: 'filled in', contacts: 'filled in' };
const label = (s, c) => byId(s.clients, c)?.initials || c;

export default {
  'enroll.save'(s, { client, item, kind = 'form', data = {}, by = 'client' }) {
    if (!client || !item) throw new Error('Client and item are required');
    s.enrollment = s.enrollment || {};
    const rec = (s.enrollment[client] = s.enrollment[client] || {});
    rec[item] = { at: this.now(), by, kind, data };
    this.event(`Enrollment packet · ${item} ${LABEL[kind] || 'saved'} by the client`, by, client);
  },

  // Referral review → "Qualifies · family books the call"
  'screening.offer'(s, { referral, by = 'jperez' }) {
    const r = need(byId(s.referrals, referral), 'Referral');
    r.screening_offer = { at: this.now(), by };
    r.next = 'Client asked to book the screening call';
    this.event('Qualifies for a screening call · client asked to book a time (text sent, SMS stub)', by, referral);
  },
  // Client → pick a time. Same booking as the clinician's "Schedule screening call".
  'screening.bookByFamily'(s, { referral, when, who, by = 'client' }) {
    const r = need(byId(s.referrals, referral), 'Referral');
    if (!when || !who) throw new Error('Pick a time');
    s.screenings = s.screenings.filter(x => !(x.referral === referral && x.status === 'booked'));
    s.reminders = s.reminders.filter(x => !(x.record === referral && x.kind === 'screening_call' && !x.done));
    this.actions['referral.scheduleScreening'].call(this, s, { id: referral, who, when });
    r.screening_offer = { ...(r.screening_offer || {}), booked_at: this.now() };
    this.event(`Client booked the screening call · ${fmtDateTime(when, { dow: true })} with ${byId(s.staff, who)?.name || who}`, by, referral);
  },

  // Referral review (after the screening) → "Qualifies for treatment · client books the assessment"
  'intake.offer'(s, { client, referral, by = 'jperez' }) {
    const c = need(byId(s.clients, client), 'Client');
    c.intake_offer = { at: this.now(), by, referral };
    this.event('Qualifies for treatment · client asked to book the ASAM assessment visit (text sent, SMS stub)', by, referral || client);
  },
  'intake.book'(s, { client, when, who, where, ride = false, by = 'client' }) {
    const c = need(byId(s.clients, client), 'Client');
    if (!when || !who) throw new Error('Pick a time');
    s.reminders = s.reminders.filter(x => !(x.record === client && ['intake_visit', 'intake_ride'].includes(x.kind) && !x.done));
    c.intake = { when, who, where, ride, ride_status: ride ? 'requested' : 'none', confirmed: null, booked_at: this.now() };
    c.timeline = { ...(c.timeline || {}), intake: when };
    s.reminders.push({ id: 'rem-' + Date.now(), for: who, kind: 'intake_visit', record: client, due: when, text: 'ASAM assessment visit · ' + label(s, client) + (where ? ' · ' + where : '') });
    this.event(`Client booked the assessment visit · ${fmtDateTime(when, { dow: true })} with ${byId(s.staff, who)?.name || who}`, by, client);
    if (ride) {
      s.reminders.push({ id: 'rem-' + (Date.now() + 1), for: who, kind: 'intake_ride', record: client, due: when.slice(0, 10), text: `Arrange a ride to the assessment · ${label(s, client)} · ${fmtDate(when, { dow: true })}` });
      this.event('Client asked for a ride to the assessment · CCC of SN to arrange it', by, client);
    }
  },
  'intake.ride'(s, { client, ride, by = 'client' }) {
    const c = need(byId(s.clients, client), 'Client'); const i = need(c.intake, 'Intake booking');
    i.ride = !!ride; i.ride_status = ride ? 'requested' : 'none';
    if (ride && !s.reminders.some(x => x.record === client && x.kind === 'intake_ride' && !x.done)) s.reminders.push({ id: 'rem-' + Date.now(), for: i.who, kind: 'intake_ride', record: client, due: i.when.slice(0, 10), text: `Arrange a ride to the assessment · ${label(s, client)} · ${fmtDate(i.when, { dow: true })}` });
    if (!ride) s.reminders = s.reminders.filter(x => !(x.record === client && x.kind === 'intake_ride' && !x.done));
    this.event(ride ? 'Client asked for a ride to the assessment' : 'Client no longer needs a ride to the assessment', by, client);
  },
  // the day before: "Still good for tomorrow?"
  'intake.confirm'(s, { client, answer = 'yes', by = 'client' }) {
    const c = need(byId(s.clients, client), 'Client'); const i = need(c.intake, 'Intake booking');
    i.confirmed = answer === 'yes'; i.confirmed_at = this.now();
    this.event(answer === 'yes' ? 'Client confirmed tomorrow\'s assessment visit' : 'Client needs to change the assessment time · call them', by, client);
  }
};
