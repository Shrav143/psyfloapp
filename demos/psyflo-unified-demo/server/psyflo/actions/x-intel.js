// Oprox parity (R7): the audit trail for the footer actions on Authorizations and Denial Intelligence ("All decisions are logged").
//
//   intel.event {kind, scope, ref, note?}   one audit entry. kinds: refine · context · dismissAll · submit · analyze · intake · insights
//
// The suggestions and every number on these screens are computed from stored records (web/js/shared/recs.js, intel.js); the only thing stored here is
// the fact that a person pressed a button. Nothing here sends anything. Free text a clinician types is never copied into the audit line.
// Clinical: the footer buttons act on clinical suggestions, so only clinicians can press them (the other roles never see them).
import { store, loadSeed } from '../store.js';
import { refuse } from '../gates.js';
import { byId } from '../../../web/js/shared/model.js';

// an older data folder has no sample yet: take it from the seed (a demo reset does the same for every key)
try { if (store.state && !store.state.intel_sample) store.state.intel_sample = JSON.parse(JSON.stringify(loadSeed().intel_sample || {})); if (store.state && !store.state.intel_live) store.state.intel_live = { none: 0, partial: 0, full: 0 }; } catch (e) { console.error('intel seed failed:', e); }

export const authz = { 'intel.event': { any: ['drafts.clinical'] } };

// The sample (payer approval rates, comparable counts, appeal analogues, the pulse, the override baseline) and the outcome numbers behind "applied N times" hold
// no client data. A supervisor or an administrator reads them on the payer line and in Insights (money, due, the pulse and insights are not clinical); without
// this an undeclared key is clinician-only and those two parts would be empty for them.
const aggregate = { clinician: true, admin: true, supervisor: true, default: false };
export const projection = { intel_sample: aggregate, intel_live: aggregate, rec_outcomes: aggregate, rec_baseline: aggregate };

const LABEL = {
  refine: 'Suggestions refined against the record',
  context: 'Clinical context added',
  dismissAll: 'All suggestions dismissed',
  submit: 'Opened the send step',
  analyze: 'Case analysis run',
  intake: 'Denial analysis run',
  insights: 'Facility insights opened'
};
const SCOPES = ['auth', 'denial'];

export default {
  'intel.event'(s, { kind, scope, ref, note }) {
    if (!LABEL[kind]) refuse('Unknown action.', { status: 422, audit: false, code: 'kind' });
    if (!SCOPES.includes(scope)) refuse('Unknown scope.', { status: 422, audit: false, code: 'scope' });
    if (ref && !byId(s.requests, ref)) refuse(`${ref} is not in the tracker.`, { status: 404, audit: false });
    this.event(`${LABEL[kind]}${ref ? ' · ' + ref : ''}`, this.who(), ref || '', { kind: 'intel' });
    return { logged: kind, scope, ref: ref || null, noted: !!String(note || '').trim() };
  }
};
