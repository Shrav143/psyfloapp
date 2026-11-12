// Extension panel actions added after the product review (Nov 2026):
//  - lauris.savedVersion: the bridge saw a person press Save Form Data or Process Form; Psyflo keeps the
//    final box values as the saved version and compares them with what the panel typed.
//  - panel.feedback: "Good recommendation" / "Needs improvement" (with how to improve) on a drafted note.
//  - referral.inLauris: a person created the consumer in Lauris from a new referral the panel offered.
// Psyflo still never reads Lauris: everything here is what the page the user had open showed.
import { identity, validateBridgeEvent } from './lead-extension.js';
import { refuse } from '../gates.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const FORM_NAME = { screening: 'Admission Screening', cna: 'CNA', isp: 'ISP 2.0', dpn: 'Daily Progress Note', weekly: 'Weekly guardian contact', collateral: 'Monthly collateral', quarterly: 'Quarterly report', incident: 'Incident report', 'sra-initial': 'TDT Initial SRA', 'sra-continued': 'CMHRS Continued Stay', discharge: 'Discharge summary', 'new-consumer': 'New consumer' };
const norm = v => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
// same text, ignoring spacing and case; a drop-down may show "Level 2 · hospitalization" for a typed "Level 2"
const same = (a, b, select) => { a = norm(a); b = norm(b); return a === b || (select && !!a && !!b && a.startsWith(b)); };

export default {
  'lauris.savedVersion'(s, { event, form, session, consumer, values, typed, user }) {
    if (!values || typeof values !== 'object') return { none: true };
    s.lauris_versions = s.lauris_versions || [];
    // same checks as lauris.observed: the Lauris user must be a Psyflo user, the Harvest # and session must be shown by the open page
    const staff = validateBridgeEvent(this, s, { event, form, session, consumer, user });
    const idn = identity(s, consumer);
    if (idn.status === 'mismatch') refuse(idn.reason, { code: 'wrong_patient', record: idn.client.id });
    const c = idn.client;
    if (!c) return { ignored: idn.reason };
    const client = c.id;
    const last = s.lauris_versions.filter(v => v.session === session && v.form === form).at(-1);
    if (last && last.event === event && JSON.stringify(last.values) === JSON.stringify(values)) return { duplicate: true, id: last.id };
    // what the panel typed into this form for this student today (latest value per box)
    const today = this.now().slice(0, 10);
    const filled = {};
    for (const f of (s.fills || []).filter(f => client && f.client === client && f.form === form && String(f.at).slice(0, 10) === today))
      for (const b of f.boxes || []) if (b.value != null) filled[b.label] = b.value;
    const changed = [], kept = [], cleared = [];
    for (const [label, was] of Object.entries(filled)) {
      const now = values[label];
      if (now == null || now === '') cleared.push(label);
      else if (same(now, was, String(now).length < 60 && String(was).length < 60 && !/\n/.test(now))) kept.push(label);
      else changed.push({ label, filled: was, saved: now });
    }
    const others = Object.keys(values).filter(l => !(l in filled) && values[l] !== '').length;
    const id = 'lv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const v = { id, client, consumer: consumer?.no || null, form, session: session || null, event, at: this.now(), by: staff.id, values, typed: typed || [], filled, changed, kept, cleared, others };
    // a processed note: the saved version is the note's final text
    if (c && event === 'processed') {
      const note = [...s.notes].reverse().find(n => n.client === c.id && (n.session === session || (!n.session && n.date === s.today)));
      if (note) {
        v.note = note.id; note.saved_version = id; note.changed_after_fill = changed.length;
        const fb = (s.panel_feedback || []).filter(x => x.client === c.id && x.form === form && !x.note);
        if (fb.length) { fb.forEach(x => { x.note = note.id; }); note.feedback = fb.map(x => ({ kind: x.kind, text: x.text, at: x.at, by: x.by })); }
      }
    }
    s.lauris_versions.push(v);
    const n = Object.keys(filled).length;
    const what = n
      ? `${FORM_NAME[form] || form} ${event === 'processed' ? 'processed' : 'saved'} in Lauris · Psyflo kept the saved version · ${changed.length + cleared.length} of ${n} box${n === 1 ? '' : 'es'} Psyflo typed changed after fill`
      : `${FORM_NAME[form] || form} ${event === 'processed' ? 'processed' : 'saved'} in Lauris · Psyflo kept the saved version (${Object.keys(values).length} boxes)`;
    this.event(what, v.by || 'Psyflo', client || 'lauris', { actor_kind: 'bridge' });
    this.hooks.run('observed', this, s, { type: 'savedVersion', event, form, session, consumer, user, values, staff, client: c, version: v }, {});
    return { id, changed: changed.length, cleared: cleared.length, kept: kept.length, filled: n, others };
  },

  'panel.feedback'(s, { client, form = 'dpn', kind, text = '', dictation, narrative }) {
    const by = this.who();
    if (!['good', 'needs_improvement'].includes(kind)) throw new Error('Feedback must be good or needs_improvement');
    if (kind === 'needs_improvement' && !String(text).trim()) throw new Error('Say briefly how to improve it');
    s.panel_feedback = s.panel_feedback || [];
    const f = { id: 'fb-' + Date.now().toString(36), client, form, kind, text: String(text).trim(), dictation: dictation || null, narrative: narrative || '', by: by || null, at: this.now() };
    s.panel_feedback.push(f);
    const d = dictation && byId(s.dictations, dictation);
    if (d) d.feedback = (d.feedback || []).concat([{ kind: f.kind, text: f.text, at: f.at, by: f.by }]);
    this.event(kind === 'good' ? `Drafted ${FORM_NAME[form] || form} marked "Good recommendation"` : `Drafted ${FORM_NAME[form] || form} marked "Needs improvement": ${f.text}`, by || 'Psyflo', client);
    return { id: f.id };
  },

  // the staffer said (or typed) what happened in the panel with the daily note open; kept like a phone dictation
  // (status waiting until the note is processed, then lauris.observed marks it used and keeps it on the note)
  'panel.dictation'(s, { client, spoken, rewritten, chips, checks }) {
    const staff = this.who();
    if (!String(spoken || '').trim()) throw new Error('Nothing to draft from');
    const c = byId(s.clients, client); if (!c) throw new Error('Student not found');
    s.dictations = s.dictations.filter(d => !(d.client === client && d.status === 'waiting' && d.source === 'panel'));
    const id = 'dict-' + Date.now();
    s.dictations.push({ id, client, staff, at: this.now(), spoken: String(spoken).trim(), rewritten, chips, checks, status: 'waiting', source: 'panel' });
    this.event(`Daily note said in the extension panel · drafted for the open form`, staff, client);
    return { id };
  },

  'referral.inLauris'(s, { id, no }) {
    const r = byId(s.referrals, id); if (!r) throw new Error('Referral not found');
    if (r.lauris_no) return { already: true };
    r.lauris_no = Number(no);
    const c = byId(s.clients, r.client); if (c && !c.lauris_no) c.lauris_no = Number(no);
    r.next = `In Lauris · Harvest # ${no} · screening call next`;
    this.event(`Consumer created in Lauris by a person from the referral · Harvest # ${no} (seen by the extension)`, this.who(), r.id);
    return { ok: true };
  }
};
