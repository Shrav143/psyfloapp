// Scan & Enhance actions (E5), the two modes of review/00-unified-recommendations.md section 3.1:
//
//   Mode A "Review draft"   the CURRENT open draft. Findings are questions; an answer is the person's own words; approve; the panel then types the
//                           changed boxes into the open Lauris form with the bridge `fill` command and the person presses Process Form.
//   Mode B "Evidence review" PROCESSED history. Read-only: it reads Psyflo's captured copies (state.notes, lauris_versions, the seeded corpus),
//                           never Lauris. No fill command exists in this mode and no action here can write to a processed record:
//                           the guard is in the action (`mode:'historical'` refuses every write), not only in the panel.
//   There is no addendum and no late-entry feature (G-093, review/05 RE-3). Evidence marks (excluded, sensitive) are Psyflo-side labels on a
//   stored note with who and when; they never change the note.
import { refuse } from '../gates.js';
import { scanFindings, evidenceIndex } from '../../../web/js/shared/enhance.js';
import { guardWrite, guardProcessedSession, needVersion, openVersion, needClient, stagePush, today, FORM_LABEL } from './x-scribe.js';
import { addDays } from '../../../web/js/shared/dates.js';
import { can } from '../../../web/js/shared/permissions.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const byId = (arr, id) => (arr || []).find(x => x.id === id);
const FINDING_STATES = ['open', 'accepted', 'rejected', 'edited'];

export default {
  // Mode A: read the open draft (the fields the bridge read from the open form) and list what to fix, as questions.
  'enhance.scan'(s, { client, form, session = null, fields = [] }) {
    const c = needClient(s, client); const by = this.who();
    if (!FORM_LABEL[form]) refuse('Unknown document type.', { status: 422, audit: false });
    if (!Array.isArray(fields) || fields.length > 80) refuse('Send the boxes of the open form.', { status: 422, audit: false });
    guardProcessedSession(s, client, session);
    const flds = fields.map(f => ({ label: String(f.label || '').slice(0, 160), value: String(f.value == null ? '' : f.value).slice(0, 8000) })).filter(f => f.label);
    const at = this.now();
    s.doc_versions = s.doc_versions || [];
    let d = openVersion(s, { client, form, by, mode: 'current' });
    if (d && d.findings && d.findings.length === 0 && d.items && d.items.length) d = null;       // the Scribe draft of the same form stays its own record
    if (d && d.input && d.input.kind !== 'form') d = null;
    if (!d) { d = { key: 'dv-' + String(s.doc_versions.length + 1).padStart(4, '0'), client, form, mode: 'current', by, date: today(s), session: session || null, input: { kind: 'form' }, items: [], findings: [], stages: [], lauris_status: 'none', created_at: at }; s.doc_versions.push(d); }
    guardWrite(d);
    d.input = { kind: 'form', fields: flds }; d.session = session || d.session;
    const old = new Map((d.findings || []).map(f => [f.id + '|' + f.issue, f]));
    d.findings = scanFindings(s, client, form, flds).map(f => { const o = old.get(f.id + '|' + f.issue); return o ? { ...f, state: o.state, answer: o.answer } : f; });
    stagePush(d, 'original', by, 'person', at, { text: flds.map(f => f.label + ': ' + f.value).join('\n').slice(0, 4000) });
    stagePush(d, 'draft', 'Psyflo', 'psyflo', at); d.updated_at = at;
    this.event(`Scan & Enhance · ${FORM_LABEL[form]} · ${c.initials} · ${d.findings.length} finding${d.findings.length === 1 ? '' : 's'} on the open draft`, by, client, { actor_kind: 'system' });
    return { key: d.key, findings: d.findings.length };
  },

  // the person's decision on one finding. The answer is their own wording: nothing Psyflo wrote is ever applied.
  'enhance.decide'(s, { key, finding, state, answer = '' }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    const f = (d.findings || []).find(x => x.id === finding); if (!f) refuse('That finding is not in this scan.', { status: 404, audit: false });
    if (!FINDING_STATES.includes(state)) refuse('Decision must be open, accepted, rejected or edited.', { status: 422, audit: false });
    const at = this.now(); const by = this.who();
    f.state = state; f.answer = state === 'rejected' || state === 'open' ? '' : String(answer || '').slice(0, 2000);
    f.history = (f.history || []).concat([{ state, answer: f.answer, at, by }]);
    if (state === 'edited' || (state === 'accepted' && f.answer)) stagePush(d, 'edited', by, 'person', at);
    d.updated_at = at; return { state: f.state };
  },

  'enhance.approve'(s, { key }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    const open = (d.findings || []).filter(f => f.state === 'open');
    if (open.length) refuse(`${open.length} finding${open.length === 1 ? ' is' : 's are'} still open. Accept, edit or reject each one: there is no accept-all.`, { record: d.client, status: 422 });
    const at = this.now(); stagePush(d, 'approved', this.who(), 'person', at); d.updated_at = at;
    this.event(`Scan & Enhance approved by the author · ${FORM_LABEL[d.form]} · ${byId(s.clients, d.client)?.initials || d.client}`, this.who(), d.client, { actor_kind: 'person' });
    return { key: d.key };
  },

  // the panel typed the changed boxes into the OPEN form. Refused for an evidence review and for a processed draft.
  'enhance.filled'(s, { key, labels = [] }) {
    const d = needVersion(s, key, this.actor); guardWrite(d);
    if (!d.stages.some(x => x.stage === 'approved')) refuse('Approve the scan before it is typed into the form.', { record: d.client, status: 422 });
    const at = this.now(); stagePush(d, 'filled', this.who(), 'person', at, { labels: (labels || []).slice(0, 60) });
    d.lauris_status = 'filled'; d.updated_at = at; return { key: d.key };
  },

  // Mode B: an evidence review of processed history. It reads Psyflo's own copies and stores the analysis; it writes nothing else.
  'enhance.historical'(s, args) {
    const { client, from, to } = args;
    if (args.fields || args.fill || args.apply || args.write || args.session) refuse('Evidence review is read-only. It never types into Lauris and never changes a processed note.', { record: client, code: 'read_only' });
    const c = needClient(s, client); const by = this.who();
    if (!can(this.actor, 'notes.view', { clientId: client })) refuse('Evidence review shows clinical note text; your role does not read it.', { record: client, status: 403 });
    const f = ISO.test(from || '') ? from : addDays(today(s), -30), t = ISO.test(to || '') ? to : today(s);
    if (f > t) refuse('The period starts after it ends.', { status: 422, audit: false });
    if (t > today(s)) refuse('The period cannot end in the future.', { status: 422, audit: false });
    const idx = evidenceIndex(s, client, { from: f, to: t }); const at = this.now();
    s.doc_versions = s.doc_versions || [];
    let d = s.doc_versions.filter(x => x.mode === 'historical' && x.client === client && x.by === by && x.date === today(s)).at(-1);
    if (!d) { d = { key: 'dv-' + String(s.doc_versions.length + 1).padStart(4, '0'), client, form: 'evidence', mode: 'historical', by, date: today(s), session: null, input: { kind: 'stored notes' }, items: [], findings: [], stages: [], lauris_status: 'read-only', created_at: at }; s.doc_versions.push(d); }
    d.period = { from: f, to: t }; d.counts = idx.counts;
    d.findings = idx.gaps.map((g, i) => ({ id: 'g' + (i + 1), category: g.kind === 'missing' ? 'evidence' : 'wording', issue: g.text, why: '', rule: null, evidence: (g.refs || []).slice(0, 10).map(ref => ({ ref })), state: 'open' }));
    stagePush(d, 'read', by, 'person', at, { period: d.period }); d.updated_at = at;
    this.event(`Evidence review (read-only) · ${c.initials} · ${f} to ${t} · ${idx.counts.daily} daily · ${idx.counts.weekly} weekly · ${idx.counts.monthly} monthly`, by, client, { actor_kind: 'person' });
    return { key: d.key, counts: idx.counts, gaps: idx.gaps.length };
  },

  // an evidence mark: exclude a stored note from the request, or mark it sensitive (counted, never quoted). Who and when are kept; the note is not touched.
  'evidence.mark'(s, { client, ref, excluded, sensitive, reason = '' }) {
    needClient(s, client);
    const n = (s.notes || []).find(x => x.id === ref && x.client === client);
    if (!n) refuse('That evidence row is not a stored note of this student.', { status: 404, audit: false });
    const why = String(reason || '').trim();
    if (excluded === true && why.length < 3) refuse('Say why the row is left out of the request (it is kept with your name and the time).', { status: 422, audit: false });
    s.evidence_marks = s.evidence_marks || [];
    let m = s.evidence_marks.find(x => x.client === client && x.ref === ref);
    const at = this.now(); const by = this.who();
    if (!m) { m = { client, ref, excluded: false, sensitive: false, reason: '', by, at, history: [] }; s.evidence_marks.push(m); }
    const before = { excluded: m.excluded, sensitive: m.sensitive };
    if (excluded != null) m.excluded = !!excluded; if (sensitive != null) m.sensitive = !!sensitive;
    if (before.excluded === m.excluded && before.sensitive === m.sensitive) return { unchanged: true };
    m.reason = why || m.reason; m.by = by; m.at = at;
    m.history.push({ excluded: m.excluded, sensitive: m.sensitive, reason: why, by, at });
    const label = { daily: 'daily note', weekly_guardian: 'weekly guardian call', monthly_collateral: 'monthly collateral' }[n.type] || n.type;
    this.event(`Evidence ${m.excluded ? 'excluded from the request' : m.sensitive ? 'marked sensitive (counted, never quoted)' : 'mark removed'} · ${label} ${String(n.date).slice(0, 10)}${why ? ' · ' + why : ''}`, by, client, { actor_kind: 'person' });
    return { ref, excluded: m.excluded, sensitive: m.sensitive, by, at };
  },

  // the period the person chose for the evidence index (kept per person and student)
  'evidence.period'(s, { client, from, to, preset = '' }) {
    needClient(s, client);
    if (!ISO.test(from || '') || !ISO.test(to || '')) refuse('Choose a start and an end date.', { status: 422, audit: false });
    if (from > to) refuse('The period starts after it ends.', { status: 422, audit: false });
    if (to > today(s)) refuse('The period cannot end in the future.', { status: 422, audit: false });
    s.evidence_periods = s.evidence_periods || [];
    const by = this.who(); const at = this.now();
    let p = s.evidence_periods.find(x => x.client === client && x.by === by);
    if (!p) { p = { client, by }; s.evidence_periods.push(p); }
    Object.assign(p, { from, to, preset: String(preset).slice(0, 20), at });
    this.event(`Evidence period set · ${from} to ${to}`, by, client, { actor_kind: 'person' });
    return { from, to };
  }
};

export const authz = {
  'enhance.scan': { any: ['scanEnhance'], scope: (s, a) => ({ clientId: a.client }) },
  'enhance.decide': { any: ['scanEnhance'] },
  'enhance.approve': { any: ['scanEnhance'] },
  'enhance.filled': { any: ['scanEnhance'] },
  'enhance.historical': { any: ['scanEnhance'], scope: (s, a) => ({ clientId: a.client }) },
  'evidence.mark': { any: ['scanEnhance'], scope: (s, a) => ({ clientId: a.client }) },
  'evidence.period': { any: ['scanEnhance'], scope: (s, a) => ({ clientId: a.client }) }
};
