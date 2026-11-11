// Family portal actions (screens 46–50). The two signed forms in the enrollment packet, the quarterly and the
// treatment plan use core 'consent.sign'; the rest of the packet is kept here as s.enrollment[client][item].
// Scheduling (Nov 7 product call): a clinician marks a referral as qualifying for a screening call, and later the
// child as qualifying for TDT; the family books the call / the in-person intake on the parent portal from the
// clinicians' open times (a stand-in for their Google Calendars), asks for a ride, and confirms the day before.
import { fmtDate, fmtDateTime } from '../../../web/js/shared/dates.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const need = (x, what) => { if (!x) throw new Error(what + ' not found'); return x; };
const LABEL = { ack: 'read and acknowledged', form: 'filled in', contacts: 'filled in' };
const label = (s, c) => byId(s.clients, c)?.initials || c;

export default {
  'enroll.save'(s, { client, item, kind = 'form', data = {} }) {
    const by = this.who();
    if (!client || !item) throw new Error('Client and item are required');
    s.enrollment = s.enrollment || {};
    const rec = (s.enrollment[client] = s.enrollment[client] || {});
    rec[item] = { at: this.now(), by, kind, data };
    this.event(`Enrollment packet · ${item} ${LABEL[kind] || 'saved'} on the parent portal`, by, client, { actor_kind: 'portal' });
  },

  // Referral review → "Qualifies · family books the call"
  'screening.offer'(s, { referral }) {
    const by = this.who();
    const r = need(byId(s.referrals, referral), 'Referral');
    r.screening_offer = { at: this.now(), by };
    r.next = 'Family asked to book the screening call';
    this.event('Qualifies for a screening call · family asked to book a time on the parent portal (text not sent · SMS stub)', by, referral, { sim: true });
  },
  // Parent portal → pick a time. Same booking as the clinician's "Schedule screening call".
  'screening.bookByFamily'(s, { referral, when, who }) {
    const by = this.who();
    const r = need(byId(s.referrals, referral), 'Referral');
    if (!when || !who) throw new Error('Pick a time');
    s.screenings = s.screenings.filter(x => !(x.referral === referral && x.status === 'booked'));
    s.reminders = s.reminders.filter(x => !(x.record === referral && x.kind === 'screening_call' && !x.done));
    this.actions['referral.scheduleScreening'].call(this, s, { id: referral, who, when });
    r.screening_offer = { ...(r.screening_offer || {}), booked_at: this.now() };
    this.event(`Guardian booked the screening call on the parent portal · ${fmtDateTime(when, { dow: true })} with ${byId(s.staff, who)?.name || who}`, by, referral);
  },

  // Referral review (after the screening) → "Qualifies for TDT · family books the intake"
  'intake.offer'(s, { client, referral }) {
    const by = this.who();
    const c = need(byId(s.clients, client), 'Client');
    c.intake_offer = { at: this.now(), by, referral };
    this.event('Qualifies for TDT · family asked to book the intake visit on the parent portal (text sent, SMS stub)', by, referral || client);
  },
  'intake.book'(s, { client, when, who, where, ride = false }) {
    const by = this.who();
    const c = need(byId(s.clients, client), 'Client');
    if (!when || !who) throw new Error('Pick a time');
    s.reminders = s.reminders.filter(x => !(x.record === client && ['intake_visit', 'intake_ride'].includes(x.kind) && !x.done));
    c.intake = { when, who, where, ride, ride_status: ride ? 'requested' : 'none', confirmed: null, booked_at: this.now() };
    c.timeline = { ...(c.timeline || {}), intake: when };
    s.reminders.push({ id: 'rem-' + Date.now(), for: who, kind: 'intake_visit', record: client, due: when, text: 'Intake visit · ' + label(s, client) + (where ? ' · ' + where : '') });
    this.event(`Guardian booked the intake visit on the parent portal · ${fmtDateTime(when, { dow: true })} with ${byId(s.staff, who)?.name || who}`, by, client);
    if (ride) {
      s.reminders.push({ id: 'rem-' + (Date.now() + 1), for: who, kind: 'intake_ride', record: client, due: when.slice(0, 10), text: `Arrange a ride to the intake · ${label(s, client)} · ${fmtDate(when, { dow: true })}` });
      this.event('Guardian asked for a ride to the intake · Harvest to arrange it', by, client);
    }
  },
  'intake.ride'(s, { client, ride }) {
    const by = this.who();
    const c = need(byId(s.clients, client), 'Client'); const i = need(c.intake, 'Intake booking');
    i.ride = !!ride; i.ride_status = ride ? 'requested' : 'none';
    if (ride && !s.reminders.some(x => x.record === client && x.kind === 'intake_ride' && !x.done)) s.reminders.push({ id: 'rem-' + Date.now(), for: i.who, kind: 'intake_ride', record: client, due: i.when.slice(0, 10), text: `Arrange a ride to the intake · ${label(s, client)} · ${fmtDate(i.when, { dow: true })}` });
    if (!ride) s.reminders = s.reminders.filter(x => !(x.record === client && x.kind === 'intake_ride' && !x.done));
    this.event(ride ? 'Guardian asked for a ride to the intake' : 'Guardian no longer needs a ride to the intake', by, client);
  },
  // the day before: "Still good for tomorrow?"
  'intake.confirm'(s, { client, answer = 'yes' }) {
    const by = this.who();
    const c = need(byId(s.clients, client), 'Client'); const i = need(c.intake, 'Intake booking');
    i.confirmed = answer === 'yes'; i.confirmed_at = this.now();
    this.event(answer === 'yes' ? 'Guardian confirmed tomorrow\'s intake visit' : 'Guardian needs to change the intake time · call them', by, client);
  }
};
