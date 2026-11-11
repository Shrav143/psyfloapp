// Guardian side of the appeal letter and the family-portal copy (E6).
// 1. Server-side enforcement of the signature-mode setting: request.appealSign and consent.sign are core actions (lead-only). consent.sign already
//    refuses an in-person-required document; the capability entries declared here (they replace the ones in authz.js; this file loads after it) add what
//    core does not check: an appeal is refused unless the mode is Remote allowed, and a form is refused when Harvest has not asked for it or its mode is Pending.
//    "Letter ready" (Draft versus Ready to review) is a screen state: the guardian types or edits the text they sign.
// 2. Projections: the guardian sees the prepared appeal letter of their own child (status ready, signed or sent; a draft shows only that it is a draft)
//    and the portal copy. Withheld data is empty, so the guardian screens render honest empty states.
// The staff side (Denial Intelligence) writes the letter to state.appeal_drafts[requestId] = { en, es, attached, attached_es, status: 'draft' | 'ready',
// prepared_by, prepared_at, sample? }; request.appealSign sets request.appeal.signed_at; request.appealSend (staff) sets request.appeal.sent_at.
import { Refusal, linkExpired } from '../gates.js';
import { signatureMode } from '../../../web/js/shared/rules.js';
import { docTypeOf, signRequested, signedRecord } from '../../../web/js/shared/sel/portal.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);

export const authz = {
  'request.appealSign': {
    any: ['appeal.sign'],
    check: (s, a, actor) => {
      const r = byId(s.requests, a.id);
      if (!r || !actor || actor.kind !== 'guardian' || actor.client !== r.client) throw new Refusal('This appeal letter is not for your child.', { status: 403 });
      const mode = signatureMode(s, 'appeal');
      if (mode === 'in_person_required') throw new Refusal('Harvest requires an in-person signature for the appeal letter (rule signature.mode.appeal). Please sign at a visit.', { record: r.id, status: 422, code: 'in_person_required' });
      if (mode !== 'remote_allowed') throw new Refusal('Harvest is still confirming how the appeal letter is signed (rule signature.mode.appeal). Please call Harvest.', { record: r.id, status: 422, code: 'signature_pending' });
    }
  },
  'consent.sign': {
    any: ['guardian.sign'],
    scope: (s, a) => ({ clientId: a.client }),
    check: (s, a, actor) => {
      if (!actor || actor.kind !== 'guardian' || actor.client !== a.client) throw new Refusal('This page is for a different child. Open the link Harvest texted you.', { status: 403 });
      const fl = (s.family_links || []).find(f => f.token === actor.linkToken);
      if (fl && linkExpired(s, fl)) throw new Refusal('This link has expired. Ask Harvest for a new one.', { status: 401 });
      const form = a.form || 'Consent for services';
      if (!signRequested(s, a.client, form) && !signedRecord(s, a.client, form)) throw new Refusal('Harvest has not asked you to sign this form yet.', { record: a.client, status: 422, code: 'not_requested' });
      if (signatureMode(s, docTypeOf(form)) === 'pending_validation') throw new Refusal('Harvest is still confirming how this form is signed (rule signature.mode.' + docTypeOf(form) + '). Please call Harvest.', { record: a.client, status: 422, code: 'signature_pending' });
    }
  }
};

export const projection = {
  appeal_drafts: {
    clinician: true,
    guardian: (s, actor, v) => {
      const out = {};
      for (const [rid, d] of Object.entries(v || {})) {
        const r = byId(s.requests, rid);
        if (!r || r.client !== actor.client) continue;
        out[rid] = d && d.status === 'draft' ? { status: 'draft' } : { en: d.en, es: d.es, attached: d.attached, attached_es: d.attached_es, status: d.status || 'ready', sample: !!d.sample, prepared_at: d.prepared_at };
      }
      return out;
    },
    default: false
  },
  portal_copy: { clinician: true, guardian: true, default: false }
};

export default {};
