// ASAM assessments: the role projection of state.asam_assessments (seed/extra/asam.json). Read by web/js/shared/sel/asam-view.js.
//
// The ratings are the clinician's dimensional risk ratings; the note per dimension and the plan are clinical text. So, like every other note:
//   clinician        the whole row (ratings, the note per dimension, the plan)
//   site supervisor  the six ratings, dates, kind and assessor: no note text, no plan
//   administrator    the date, kind and the level the request is at: no ratings and no text (the level tag and the reassessment state only)
//   direct support   the same minimum, for their own caseload only
//   guardian, school nothing
// `request_level` is added to the rows of the roles that hold no requests or only a status view of them, so every staff role reads the same level tag
// (requestLevel() from asam.js over the client's open request). It is derived at read time and never stored.
import { requestLevel } from '../../../web/js/shared/asam.js';
import { store, loadSeed } from '../store.js';

// an older data folder has no assessments yet: take them from the seed (a demo reset does the same for every key)
if (store.state && !('asam_assessments' in store.state)) { try { store.state.asam_assessments = loadSeed().asam_assessments || []; } catch { store.state.asam_assessments = []; } }

const ORDER = ['info_requested', 'overdue', 'partial_decide', 'denied', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'appeal_sent', 'draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'early_discharge', 'active'];
const levelOfClient = (s, client) => {
  const r = (s.requests || []).filter(x => x.client === client && x.stage !== 'closed').sort((x, y) => ORDER.indexOf(x.stage) - ORDER.indexOf(y.stage))[0];
  return r ? requestLevel(r) : null;
};
const minimal = (s, a) => { const o = { id: a.id, client: a.client, date: a.date, kind: a.kind, level_recommended: a.level_recommended, provenance: a.provenance, ratings_hidden: true }; const lv = levelOfClient(s, a.client); if (lv) o.request_level = lv; return o; };
const ratingsOnly = (s, a) => {
  const dims = {}; for (const [n, d] of Object.entries(a.dims || {})) dims[n] = { rating: d.rating };
  const o = { id: a.id, client: a.client, date: a.date, kind: a.kind, assessor: a.assessor, level_recommended: a.level_recommended, dims, source: a.source, provenance: a.provenance, text_hidden: true };
  const lv = levelOfClient(s, a.client); if (lv) o.request_level = lv; return o;
};

export const projection = {
  asam_assessments: {
    clinician: true,
    supervisor: (s, actor, v) => (v || []).map(a => ratingsOnly(s, a)),
    admin: (s, actor, v) => (v || []).map(a => minimal(s, a)),
    direct_support: (s, actor, v) => { const mine = new Set((actor && actor.caseload) || []); return (v || []).filter(a => mine.has(a.client)).map(a => minimal(s, a)); },
    default: false
  }
};

export default {};
