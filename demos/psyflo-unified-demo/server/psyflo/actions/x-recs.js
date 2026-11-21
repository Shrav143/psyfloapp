// Recommendations (R6): what Psyflo suggests to make an authorization request or a payer reply stronger, and what a clinician did with each.
//
//   recs.decide     {scope, ref, key, state, context}     include, dismiss or reopen ONE recommendation; `context` is the clinician's own words
//   recs.decideMany {scope, ref, items:[{key,state,context}]}   "Apply selected": one audit event for the batch
//   recs.add        {scope, ref, title, text, box?, dim?}  the clinician's own recommendation (the user can add)
//   recs.remove     {scope, ref, key}                      remove one of the clinician's own recommendations
//
// scope 'auth' (a request in Authorizations; ref = request id) · 'denial' (a payer reply case; ref = request id) · 'note' (Scan & Enhance; ref = "<client>:<form>").
// The suggestions themselves are computed (web/js/shared/recs.js) from stored records and never stored; only the decision is: state.rec_decisions.
// A recommendation that needs input (no stored record answers it) cannot be included without the clinician's own text. Psyflo never writes it.
// Including a denial recommendation updates the "Added from recommendations" section of every unsent draft of that case (x-disputes.js syncRecsSection).
// Nothing here sends anything, signs anything or types into Lauris: the panel types included text into the open form when a person presses the button.
// Clinical text is clinician-only: the other roles receive no rec_decisions (projection).
import { store, loadSeed } from '../store.js';
import { refuse } from '../gates.js';
import { byId } from '../../../web/js/shared/model.js';
import { SCOPES, STATES, CONTEXT_MAX, recId, findRec, textOf } from '../../../web/js/shared/recs.js';
import { byRequest, isOpen } from '../../../web/js/shared/sel/disputes.js';
import { syncRecsSection } from './x-disputes.js';
import { liveOverrides } from '../../../web/js/shared/intel.js';

// an older data folder has no recommendation keys yet: take them from the seed (a demo reset does the same for every key)
try { if (store.state) { const seed = loadSeed(); for (const k of ['rec_decisions', 'rec_outcomes', 'rec_baseline']) if (!(k in store.state)) store.state[k] = JSON.parse(JSON.stringify(seed[k] ?? (k === 'rec_baseline' ? {} : []))); } } catch (e) { console.error('recs seed failed:', e); }

export const authz = {
  'recs.decide': { any: ['drafts.clinical'] },
  'recs.decideMany': { any: ['drafts.clinical'] },
  'recs.add': { any: ['drafts.clinical'] },
  'recs.remove': { any: ['drafts.clinical'] }
};

// clinicians read their decisions (they hold the clinical text); the other roles get none
export const projection = { rec_decisions: { clinician: true, default: false } };

const clean = (t, n) => String(t == null ? '' : t).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
const known = (s, scope, ref) => {
  if (!SCOPES.includes(scope)) refuse('Unknown recommendation scope.', { status: 422, audit: false, code: 'scope' });
  if (scope === 'note') { const [cl] = String(ref || '').split(':'); if (!byId(s.clients, cl)) refuse(`${cl} is not a client in Psyflo.`, { status: 404, audit: false }); return null; }
  const r = byId(s.requests, ref); if (!r) refuse(`${ref} is not in the tracker.`, { status: 404, audit: false });
  if (scope === 'denial') { const d = byRequest(s, ref); if (!d || !isOpen(d)) refuse(`${ref} has no open payer reply case.`, { status: 409, record: ref, audit: false, code: 'no_case' }); }
  return r;
};
const settle = s => { s.intel_live = liveOverrides(s.rec_decisions); };   // the override counts every staff role reads (no client data)
const upsert = (s, row) => {
  s.rec_decisions = s.rec_decisions || [];
  const i = s.rec_decisions.findIndex(x => x.scope === row.scope && String(x.ref) === String(row.ref) && x.key === row.key);
  if (i >= 0) s.rec_decisions[i] = { ...s.rec_decisions[i], ...row }; else s.rec_decisions.push(row);
  return s.rec_decisions.find(x => x.scope === row.scope && String(x.ref) === String(row.ref) && x.key === row.key);
};
// validate one decision against the recomputed recommendation; returns the row to store
function decideOne(st, s, scope, ref, { key, state, context }, extra = {}) {
  if (!STATES.includes(state)) refuse('A recommendation is included, dismissed or open.', { status: 422, audit: false, code: 'state' });
  const prev = (s.rec_decisions || []).find(x => x.scope === scope && String(x.ref) === String(ref) && x.key === key);
  if (prev && prev.custom) return { ...prev, state, context: clean(context != null ? context : prev.context, CONTEXT_MAX), by: st.who(), at: st.now() };
  const rec = findRec(s, scope, ref, key, extra);
  if (!rec) refuse('That recommendation is not on this case any more. Reload to see the current list.', { status: 409, record: String(ref), audit: false, code: 'rec_gone' });
  const ctx = clean(context != null ? context : prev && prev.context, CONTEXT_MAX);
  if (state === 'included' && rec.needsInput && !ctx) refuse('This recommendation needs your own words first: Psyflo has no stored record to write it from. Add your context, then include it.', { status: 422, record: String(ref), audit: false, code: 'needs_input' });
  return { scope, ref: String(ref), key, state, context: ctx, title: rec.title, by: st.who(), at: st.now() };
}
const WHAT = { included: 'included', dismissed: 'dismissed', open: 'reopened' };
const labelOf = scope => scope === 'auth' ? 'Authorization recommendation' : scope === 'denial' ? 'Denial recommendation' : 'Scan & Enhance recommendation';
const recordOf = (scope, ref) => scope === 'note' ? String(ref).split(':')[0] : ref;
function after(st, s, scope, ref) {
  if (scope !== 'denial') return 0;
  const d = byRequest(s, ref); const r = byId(s.requests, ref);
  return d && r ? syncRecsSection(s, d, r, st) : 0;
}

export default {
  'recs.decide'(s, { scope, ref, key, state, context, fields }) {
    known(s, scope, ref);
    const row = decideOne(this, s, scope, ref, { key, state, context }, { fields });
    const saved = upsert(s, row); settle(s);
    const docs = after(this, s, scope, ref);
    this.event(`${labelOf(scope)} ${WHAT[state]} · ${row.title || key}`, this.who(), recordOf(scope, ref), { kind: 'recs' });   // the clinician's context stays in the decision row, not in the audit text
    return { decision: saved, docs };
  },

  'recs.decideMany'(s, { scope, ref, items, fields }) {
    known(s, scope, ref);
    if (!Array.isArray(items) || !items.length) refuse('Select at least one recommendation.', { status: 422, audit: false, code: 'none' });
    const rows = items.map(x => decideOne(this, s, scope, ref, x, { fields }));   // all validated first: a refusal leaves everything as it was
    rows.forEach(r => upsert(s, r)); settle(s);
    const docs = after(this, s, scope, ref);
    const inc = rows.filter(r => r.state === 'included').length, dis = rows.filter(r => r.state === 'dismissed').length;
    this.event(`${labelOf(scope)}s applied · ${inc} included${dis ? `, ${dis} dismissed` : ''}`, this.who(), recordOf(scope, ref), { kind: 'recs' });
    return { count: rows.length, included: inc, dismissed: dis, docs };
  },

  'recs.add'(s, { scope, ref, title, text, box = '', dim = 0 }) {
    known(s, scope, ref);
    const t = clean(title, 120), body = clean(text, CONTEXT_MAX);
    if (t.length < 3) refuse('Give the recommendation a short title.', { status: 422, audit: false, code: 'title' });
    if (body.length < 3) refuse('Write the text that should go into the request or the reply. Psyflo does not write it for you.', { status: 422, audit: false, code: 'text' });
    const n = (s.rec_decisions || []).filter(x => x.custom && x.scope === scope && String(x.ref) === String(ref)).length + 1;
    const key = `custom-${n}-${Math.random().toString(36).slice(2, 6)}`;
    const row = upsert(s, { scope, ref: String(ref), key, custom: true, title: t, text: body, box: clean(box, 120), dim: +dim || 0, state: 'included', context: '', by: this.who(), at: this.now() }); settle(s);
    const docs = after(this, s, scope, ref);
    this.event(`${labelOf(scope)} added by a clinician · ${t}`, this.who(), recordOf(scope, ref), { kind: 'recs' });
    return { decision: row, id: recId(scope, ref, key), docs };
  },

  'recs.remove'(s, { scope, ref, key }) {
    known(s, scope, ref);
    const i = (s.rec_decisions || []).findIndex(x => x.custom && x.scope === scope && String(x.ref) === String(ref) && x.key === key);
    if (i < 0) refuse('Only a recommendation you added can be removed. Dismiss the others.', { status: 409, audit: false, code: 'not_custom' });
    const [gone] = s.rec_decisions.splice(i, 1); settle(s);
    const docs = after(this, s, scope, ref);
    this.event(`${labelOf(scope)} removed · ${gone.title}`, this.who(), recordOf(scope, ref), { kind: 'recs' });
    return { removed: key, docs };
  }
};
export { textOf };
