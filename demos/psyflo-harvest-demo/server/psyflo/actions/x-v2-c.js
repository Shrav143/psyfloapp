// Owner C actions (phone app, school and guardian pages), v2. Unique names only.
//  · timer.stopAt: stop the phone timer with the end time the phone showed (start + elapsed). The seeded 13:52 start can sit "in the
//    future" against the wall clock; core timer.stop would then store a negative block. A normal start (wall clock) gives the same
//    block as core timer.stop.
//  · referral.submitDraft: submit a school's saved draft. A referral cannot be sent on "No" (or without an answer) for
//    "Guardian agrees to the referral"; referral.create already rejects it in x-v2.js, this closes the draft path.
import core from './core.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const yes = v => v === true || v === 'yes' || v === 'Yes';

export default {
  'timer.stopAt'(s, { staff, end }) {
    const t = s.timers?.[staff]; if (!t || !t.started) return;
    const e = /^\d{1,2}:\d{2}$/.test(String(end || '')) ? String(end).padStart(5, '0') : this.now().slice(11, 16);
    t.blocks = (t.blocks || []).concat([[t.started.slice(11, 16), e, t.client]]);
    t.started = null;
    this.event('Timer stopped', staff, t.client);
  },
  'referral.submitDraft'(s, { id, form }) {
    const r = byId(s.referrals, id);
    if (!r) throw new Error('Referral not found');
    if (!yes((form || {}).guardian_agrees)) throw new Error('Guardian agreement is needed to refer');
    core['referral.update'].call(this, s, { id, form, submit: true });
    r.guardian_agrees = true;
    return { id };
  }
};
