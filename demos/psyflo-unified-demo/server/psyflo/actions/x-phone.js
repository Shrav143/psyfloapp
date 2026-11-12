// The phone (E7). Two actions that belong to the phone app and its dictation:
//   dictation.micConsent / phone.dictation  a recorded microphone answer per person per demo-clock day, and a dictation that is saved only for a
//                                           student confirmed by Harvest # (no initials fallback)
// (Track Time, the timer and time entries were removed on Nov 11 on the direct-support feedback: Psyflo no longer records or counts time. Units used and left
// are read from Lauris. The session time a staffer says stays inside the note they dictate.)
import { refuse, byId } from '../gates.js';
import { today as clockToday } from '../../../web/js/shared/clock.js';
import { ruleValue } from '../../../web/js/shared/rules.js';
import { sameStudent, micConsentOf } from '../../../web/js/shared/identity.js';

const need = (x, what) => { if (!x) refuse(`${what} was not found.`, { status: 404, audit: false, code: 'not_found' }); return x; };
const trim = v => String(v ?? '').trim();
// the phone is for TDT students; an outpatient or SEBS record is off (the same rule the panel applies to its open page)
const tdtOnly = c => { if (c.service_line && c.service_line !== 'tdt') refuse(`Psyflo is off for ${c.initials}: ${String(c.service_line).toUpperCase()} records are not part of the TDT note tools.`, { record: c.id, status: 403, code: 'not_tdt', audit: false }); return c; };

export const authz = {
  'dictation.micConsent': { any: ['notes.own'] },
  'phone.dictation': { any: ['notes.own'], scope: (s, a) => ({ clientId: a.client }) }
};

// who sees which stored rows: a direct support worker only their own; clinicians all; nobody else
const own = (s, actor, v) => (v || []).filter(x => x.staff === actor.id);
export const projection = {
  mic_consents: { clinician: true, direct_support: own, default: false },
  phone_examples: { clinician: true, direct_support: true, default: false }   // the scripted sentence for "Use the example" (synthetic)
};

export default {
  // The microphone answer is recorded (who, when, how); the browser's own permission prompt is separate. Typing needs no answer.
  'dictation.micConsent'(s, { granted = true }) {
    const staff = this.who(); s.mic_consents = s.mic_consents || [];
    const row = { id: 'mc-' + (s.mic_consents.length + 1), staff, granted: !!granted, at: this.now(), date: clockToday(s), how: 'tapped on the phone', engine: 'Browser speech recognition; the browser vendor may process the audio. Psyflo keeps the text, not the audio.' };
    s.mic_consents.push(row);
    this.event(granted ? 'Microphone allowed for dictation today (recorded)' : 'Microphone turned off for dictation (recorded)', staff, 'dictation');
    return { id: row.id, granted: row.granted };
  },
  // Save "what happened" for a student CONFIRMED by Harvest # (the identity card), as a waiting dictation. "Processed" is never set here.
  'phone.dictation'(s, { client, harvest_no, input = 'typed', spoken, rewritten, chips, checks, narrative, objective, interventions, mood, progress, fixed, edited, replace }) {
    const staff = this.who(); const c = tdtOnly(need(byId(s.clients, client), 'The student'));
    const m = sameStudent(s, c.id, harvest_no); if (!m.ok) refuse(`Not saved: ${m.reason} Pick the student again and check the card.`, { code: 'wrong_patient', record: c.id });
    if (!trim(spoken)) refuse('Say or type what happened first.', { status: 422, audit: false });
    if (input === 'voice' && ruleValue(s, 'recording.require_consent_record', true) && !micConsentOf(s, staff, clockToday(s)).granted) refuse('Use the microphone only after it was allowed today (a recorded answer). Type it instead, or allow the microphone first.', { code: 'no_consent', record: c.id });
    if (replace) { const old = byId(s.dictations, replace); if (old && old.staff === staff && old.status === 'waiting') s.dictations = s.dictations.filter(d => d.id !== replace); else if (old && old.status === 'used') refuse('A dictation that was used in a processed note cannot be replaced.', { record: c.id, code: 'write_once' }); }
    const r = this.actions['dictation.save'].call(this, s, { client: c.id, spoken: trim(spoken), rewritten, chips, checks, source: 'phone', input: input === 'voice' ? 'voice' : 'typed', harvest_no: c.harvest_no, confirmed_at: this.now() });
    const d = byId(s.dictations, r.id);
    for (const [k, v] of Object.entries({ narrative, objective, interventions, mood, progress, fixed, edited })) if (v !== undefined) d[k] = v;
    return { id: r.id };
  }
};
