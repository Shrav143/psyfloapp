// School portal invariants (E6), enforced on the server, not only in the form:
//  - a referral is sent only after the counselor attests that the parent or guardian agreed (the UI form asks first; the API must too);
//  - a school user changes only a DRAFT referral of their own school (a sent referral is Harvest's record: only attachments are added);
//  - an update about a student (school.share) is for a student of the school's own in the TDT service line (never outpatient or SEBS);
// The capability entries below replace the ones in authz.js for these actions (this file loads after it).
import { Refusal } from '../gates.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const consentOf = (a, r) => (a.form && 'consent_attested' in a.form) ? a.form.consent_attested === true : !!(r && r.form && r.form.consent_attested === true);
const NEEDS_CONSENT = 'Harvest takes a referral only after the parent or guardian agrees. Confirm that you have spoken with them.';

export const authz = {
  'referral.create': {
    any: ['school.referral'],
    check: (s, a, actor) => {
      if (a.form && a.form.school && actor.school && a.form.school !== actor.school) throw new Refusal('A school user can refer only students from their own school.', { status: 403 });
      if (!a.draft && !consentOf(a, null)) throw new Refusal(NEEDS_CONSENT, { status: 422, code: 'consent_not_attested' });
    }
  },
  'referral.update': {
    any: ['school.referral', 'referrals'],
    check: (s, a, actor) => {
      if (actor.kind !== 'school') return;
      const r = byId(s.referrals, a.id);
      if (!r || r.school !== actor.school) throw new Refusal('That referral is not from your school.', { status: 403 });
      if (r.stage !== 'draft') throw new Refusal('A referral that was sent is Harvest\'s record. You can add attachments; call Harvest to change anything else.', { status: 409, code: 'write_once', record: r.id });
      if (a.submit && !consentOf(a, r)) throw new Refusal(NEEDS_CONSENT, { status: 422, code: 'consent_not_attested', record: r.id });
    }
  },
  'school.share': {
    any: ['school.referral'],
    check: (s, a, actor) => {
      const c = byId(s.clients, a.client);
      if (!c || c.school !== actor.school) throw new Refusal('That student is not at your school.', { status: 403 });
      if (c.service_line && c.service_line !== 'tdt') throw new Refusal('That student is not in the program this portal covers.', { status: 403 });
    }
  }
};

export default {};
