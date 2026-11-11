// Scribe actions (E5): recording consent, the drafts a person reviews before anything is typed into Lauris, and the version history
// kept in `doc_versions` (review/04-architecture.md E3). The panel types into the open Lauris form with the bridge `fill` command;
// Psyflo only records what was drafted, what the person decided and, from the observed page event, what Lauris saved or processed.
//
// Invariants held here (docs/BUILD-BRIEF.md, review/05 section 1, 2 and 11):
//   · nothing is invented: a box whose sources do not resolve to a stored record is "Evidence missing" and cannot be accepted as it stands
//   · a processed record is write-once: no action here changes a draft after Lauris reported it processed (no addendum, no late entry)
//   · recording starts only after a recorded consent (rule recording.require_consent_record); refusal means typing
//   · stages beyond `filled` (saved, processed) are set only from the observed page event (hooks.observed), never by a caller
//   · the actor is the session; args.by / staff are ignored
import { refuse } from '../gates.js';
import { ruleValue } from '../../../web/js/shared/rules.js';
import { today as clockToday } from '../../../web/js/shared/clock.js';
import { MISSING } from '../../../web/js/shared/enhance.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
export const CLINICAL_FORMS = ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'];
export const FORM_LABEL = { screening: 'Admission screening', cna: 'Intake (CNA)', isp: 'Treatment plan', dpn: 'Daily progress note', weekly: 'Weekly guardian contact', collateral: 'Monthly collateral', incident: 'Incident report', quarterly: 'Quarterly report', 'sra-initial': 'Initial request', 'sra-continued': 'Continued stay request', discharge: 'Discharge summary', other: 'Other supported documentation' };
const FORMS = Object.keys(FORM_LABEL);
const STATES = ['pending', 'accepted', 'rejected', 'edited'];

export const projection = {
  doc_versions: { clinician: true, direct_support: (s, actor, v) => (v || []).filter(d => d.by === actor.id), default: false },
  recording_consents: { clinician: true, direct_support: (s, actor, v) => (v || []).filter(d => d.by === actor.id), default: false },
  evidence_marks: { clinician: true, default: false },
  evidence_periods: { clinician: true, default: false }
};

// ---- shared helpers (x-enhance.js imports these) ----
export function today(s) { return clockToday(s); }
export function openVersion(s, { client, form, by, mode = 'current' }) {
  return (s.doc_versions || []).filter(d => d.client === client && d.form === form && d.by === by && d.mode === mode && d.date === today(s) && d.lauris_status !== 'processed').at(-1) || null;
}
export function needVersion(s, key, actor) {
  const d = (s.doc_versions || []).find(x => x.key === key);
  if (!d) refuse('This draft was not found.', { status: 404, audit: false });
  if (d.by !== (actor && actor.id)) refuse('A draft belongs to the person who prepared it.', { record: d.client, status: 403, code: 'not_yours' });
  return d;
}
// the write-once and read-only guard: every action that would change a draft runs it first
export function guardWrite(d) {
  if (d.mode === 'historical') refuse('Evidence review is read-only. Nothing can be typed or changed from it, and Psyflo has no addendum or late-entry feature.', { record: d.client, code: 'read_only' });
  if (d.lauris_status === 'processed') refuse('This was processed in Lauris. A processed record is not changed from Psyflo: there is no addendum or late-entry feature.', { record: d.client, code: 'write_once' });
}
export function guardProcessedSession(s, client, session) {
  if (session && (s.notes || []).some(n => n.client === client && String(n.session) === String(session)))
    refuse('That Lauris session is already processed. A processed note is not changed: open Evidence review to read it.', { record: client, code: 'write_once' });
}
export function stagePush(d, stage, by, src, at, extra = {}) { const st = { stage, at, by, src, ...extra }; d.stages.push(st); return st; }
export function needClient(s, id) { const c = byId(s.clients, id); if (!c) refuse('Student not found.', { status: 404, audit: false }); return c; }

// a source resolves when it points at something stored. kind 'input' is the person's own words in this draft.
function resolves(s, src, d) {
  switch (src.kind) {
    case 'input': case 'self': return true;
    case 'client': return !!byId(s.clients, d.client);
    case 'list': return (s.interventions || []).length > 0;
    case 'note': return (s.notes || []).some(n => n.id === src.ref && n.client === d.client);
    case 'notes': return Array.isArray(src.refs) && src.refs.length > 0 && src.refs.every(r => (s.notes || []).some(n => n.id === r && n.client === d.client));
    case 'plan': { const c = byId(s.clients, d.client); return (s.plans || []).some(p => p.client === d.client) || !!(c && (c.goals || []).length); }
    case 'timer': return Object.values(s.timers || {}).some(t => t && (t.client === d.client)) || !!(src.ref && (s.timers || {})[src.ref]);
    case 'referral': return !!byId(s.referrals, src.ref);
    case 'family': return (s.family_links || []).some(f => f.client === d.client && f.submitted_at);
    case 'request': return !!byId(s.requests, src.ref);
    case 'school': return !!(s.school_numbers || {})[d.client] || (s.shares || []).some(x => x.client === d.client && (!src.ref || x.id === src.ref));
    case 'call': case 'screening': return (s.screenings || []).some(x => x.client === d.client);
    default: return false;
  }
}

export default {
  // The person says whether the call may be recorded. A recorded consent is required before any recording starts; "declined" means the person types.
  'scribe.consent'(s, { client, form, kind, present = [], mode }) {
    const c = needClient(s, client);
    if (!FORMS.includes(form)) refuse('Unknown document type.', { status: 422, audit: false });
    if (!['given', 'declined'].includes(kind)) refuse('Consent is given or declined.', { status: 422, audit: false });
    const who = (Array.isArray(present) ? present : [present]).map(x => String(x || '').trim()).filter(Boolean);
    if (kind === 'given' && !who.length) refuse('Say who agreed (for example the guardian and the student).', { status: 422, audit: false });
    s.recording_consents = s.recording_consents || [];
    const rec = { id: 'rc-' + (s.recording_consents.length + 1), client, form, kind, present: who, mode: kind === 'given' ? 'recording' : 'typing', by: this.who(), at: this.now(), date: today(s) };
    s.recording_consents.push(rec);
    this.event(`Recording consent ${kind === 'given' ? 'given' : 'declined'} · ${FORM_LABEL[form]} · ${c.initials}${who.length ? ' · ' + who.join(', ') : ''}`, this.who(), client, { actor_kind: 'person' });
    return { id: rec.id, mode: rec.mode };
  },

  // A draft for the person to review. items: [{ id, label, staff, psyflo, sources:[{ n, kind, ref, label, date, quote }], missing }]
  'scribe.draft'(s, { client, form, input = {}, items = [], session = null }) {
    const c = needClient(s, client); const by = this.who(); const actor = this.actor;
    if (!FORMS.includes(form)) refuse('Unknown document type.', { status: 422, audit: false });
    if (CLINICAL_FORMS.includes(form) && !(actor && actor.role === 'clinician')) refuse(`${FORM_LABEL[form]} drafts are for clinicians.`, { record: client, status: 403 });
    if (!Array.isArray(items) || !items.length || items.length > 40) refuse('A draft needs between 1 and 40 boxes.', { status: 422, audit: false });
    guardProcessedSession(s, client, session);
    const kind = ['typed', 'dictation', 'transcript', 'form'].includes(input.kind) ? input.kind : 'typed';
    if (kind === 'transcript' && ruleValue(s, 'recording.require_consent_record', true) && !(s.recording_consents || []).some(x => x.client === client && x.form === form && x.kind === 'given' && x.date === today(s) && x.by === by))
      refuse('Recording needs a recorded consent first. Record who agreed, or type the note instead.', { record: client, code: 'consent_required' });
    s.doc_versions = s.doc_versions || [];
    let d = openVersion(s, { client, form, by });
    if (d && ['approved', 'filled'].includes(d.stages.at(-1)?.stage) && d.lauris_status === 'processed') d = null;
    const at = this.now();
    if (!d) { d = { key: 'dv-' + String(s.doc_versions.length + 1).padStart(4, '0'), client, form, mode: 'current', by, date: today(s), session: session || null, input: {}, items: [], findings: [], stages: [], lauris_status: 'none', created_at: at }; s.doc_versions.push(d); }
    guardWrite(d);
    d.input = { kind, text: String(input.text || '').slice(0, 6000) }; d.session = session || d.session;
    const prev = new Map(d.items.map(i => [i.id, i]));
    d.items = items.slice(0, 40).map(i => {
      const sources = (i.sources || []).filter(src => resolves(s, src, d)).map(src => ({ n: src.n, kind: src.kind, ref: src.ref || null, refs: src.refs || null, label: String(src.label || '').slice(0, 120), date: src.date || null, quote: String(src.quote || '').slice(0, 400) }));
      const missing = !!i.missing || !sources.length || /^Evidence missing/.test(String(i.psyflo || ''));
      const psyflo = missing && !/^Evidence missing/.test(String(i.psyflo || '')) && !sources.length ? MISSING(String(i.label || 'this box').toLowerCase()) : String(i.psyflo || '');
      const old = prev.get(String(i.id));
      const item = { id: String(i.id), label: String(i.label || i.id), staff: String(i.staff || ''), psyflo, text: psyflo, state: 'pending', sources, missing, history: [{ kind: 'draft', text: psyflo, at, by: 'Psyflo' }] };
      // a redraft keeps nothing the person decided: a new draft is a new review
      return old && old.psyflo === item.psyflo && old.state !== 'pending' ? { ...item, state: old.state, text: old.text, history: old.history } : item;
    });
    stagePush(d, 'original', by, 'person', at, { text: d.input.text });
    stagePush(d, 'draft', 'Psyflo', 'psyflo', at); d.updated_at = at;
    this.event(`Draft prepared · ${FORM_LABEL[form]} · ${c.initials} · ${d.items.length} box${d.items.length === 1 ? '' : 'es'} to review`, by, client, { actor_kind: 'system' });
    return { key: d.key, items: d.items.length, missing: d.items.filter(i => i.missing).length };
  },

  // accept / reject / edit the wording / restore the previous wording of one box
  'scribe.decide'(s, { key, item, state, text, restore }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    const it = (d.items || []).find(x => x.id === item); if (!it) refuse('That box is not in this draft.', { status: 404, audit: false });
    const at = this.now(); const by = this.who();
    if (restore) {
      const prev = [...it.history].reverse().find(h => h.text !== it.text);
      if (!prev) refuse('There is no earlier wording to restore.', { status: 422, audit: false });
      it.text = prev.text; it.state = 'pending'; it.history.push({ kind: 'restore', text: it.text, at, by });
      return { restored: true };
    }
    if (!STATES.includes(state)) refuse('Decision must be accepted, rejected, edited or pending.', { status: 422, audit: false });
    if (state === 'edited') {
      const t = String(text == null ? '' : text); if (!t.trim()) refuse('Edited wording cannot be empty. Reject the box instead.', { status: 422, audit: false });
      it.text = t.slice(0, 6000); it.history.push({ kind: 'edit', text: it.text, at, by }); stagePush(d, 'edited', by, 'person', at);
    } else if (state === 'accepted') {
      if (it.missing) refuse('This box has no stored evidence behind it. Edit it with your own words, or reject it.', { record: d.client, code: 'no_evidence', status: 422 });
      it.history.push({ kind: 'accept', text: it.text, at, by });
    } else if (state === 'rejected') it.history.push({ kind: 'reject', text: it.text, at, by });
    it.state = state; d.updated_at = at;
    return { state: it.state };
  },

  // the person is satisfied with every box: the typing step may begin. Every box needs a decision (there is no bulk approve).
  'scribe.approve'(s, { key }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    const open = d.items.filter(i => i.state === 'pending');
    if (open.length) refuse(`${open.length} box${open.length === 1 ? ' still needs' : 'es still need'} a decision. Each box is accepted, edited or rejected by a person.`, { record: d.client, status: 422 });
    const at = this.now(); stagePush(d, 'approved', this.who(), 'person', at); d.updated_at = at;
    this.event(`Draft approved by the author · ${FORM_LABEL[d.form]} · ${byId(s.clients, d.client)?.initials || d.client} · ${d.items.filter(i => i.state !== 'rejected').length} box(es) to type`, this.who(), d.client, { actor_kind: 'person' });
    return { key: d.key, boxes: d.items.filter(i => i.state !== 'rejected').map(i => ({ label: i.label, value: i.text })) };
  },

  // the panel typed the boxes into the OPEN form (yellow). A person still has to press Process Form.
  'scribe.filled'(s, { key, labels = [] }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    if (d.stages.at(-1)?.stage !== 'approved' && !d.stages.some(x => x.stage === 'approved')) refuse('Approve the draft before it is typed into the form.', { record: d.client, status: 422 });
    const at = this.now(); stagePush(d, 'filled', this.who(), 'person', at, { labels: (labels || []).slice(0, 60) });
    d.lauris_status = 'filled'; d.updated_at = at;
    return { key: d.key };
  }
};

// Saved and Processed come from the page bridge only. The observed event is matched to the author's draft for this student and form;
// a processed draft is closed for good (guardWrite).
export const hooks = {
  observed(store, s, ev) {
    if (!ev || !ev.client || !ev.form || !['saved', 'processed'].includes(ev.event)) return;
    if (!['savedVersion', 'lauris'].includes(ev.type)) return;
    const who = ev.staff && ev.staff.id;
    const d = (s.doc_versions || []).filter(x => x.client === ev.client.id && x.form === ev.form && x.mode === 'current' && x.by === who && x.date === clockToday(s) && x.lauris_status !== 'processed').at(-1);
    if (!d) return;
    const dup = d.stages.some(x => x.stage === ev.event && x.session === (ev.session || null));
    if (dup) return;
    const at = store.now();
    stagePush(d, ev.event, who, 'bridge', at, { session: ev.session || null });
    d.session = ev.session || d.session; d.lauris_status = ev.event === 'processed' ? 'processed' : 'saved'; d.updated_at = at;
  }
};

export const authz = {
  'scribe.consent': { any: ['notes.own', 'drafts.clinical'], scope: (s, a) => ({ clientId: a.client }) },
  'scribe.draft': { any: ['notes.own', 'drafts.clinical'], scope: (s, a) => ({ clientId: a.client }) },
  'scribe.decide': { any: ['notes.own', 'drafts.clinical'] },
  'scribe.approve': { any: ['notes.own', 'drafts.clinical'] },
  'scribe.filled': { any: ['notes.own', 'drafts.clinical'] }
};
