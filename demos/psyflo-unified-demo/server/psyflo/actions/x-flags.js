// Flags, the notification read state and free-form history entries on an authorization (R3 · AUTH).
//
//   request.flag {id, flag=true, reason, note}   authorizations   mark an authorization for attention (who, when, a reason from a short list, an optional note) or clear it
//   notify.read  {ids[] | all}             myWork           the signed-in person has read these notifications (their own list only)
//   history.add  {id, kind, text}          authorizations   a person's own entry in the authorization history (a call, a note, a document)
//
// A flag is workflow, not clinical data: the reason comes from a short list; the optional note is shown only to clinicians and its author (projection).
// One open flag per request; anyone who may open Authorizations may clear it. Every flag, clear and
// history entry is an audit event with who and when (store.event). Reading notifications is personal view state: it is kept per person in
// state.notify_read and is not an audit event. The notifications themselves are computed (web/js/shared/sel/notify.js); nothing here sends
// anything to anybody.
import { refuse } from '../gates.js';
import { notificationsFor } from '../../../web/js/shared/sel/notify.js';
import { fmtDate } from '../../../web/js/shared/dates.js';
import { FLAG_REASONS, flagReasonLabel } from '../../../web/js/shared/sel/auth.js';

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const staffName = (s, id) => (byId(s.staff, id) || {}).name || id;
const clean = (t, n) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, n);
const KINDS = { call: 'Call logged', note: 'Note', document: 'Document received', payer: 'Payer contact' };

export const authz = {
  'request.flag': { any: ['authorizations'] },
  'notify.read': { any: ['myWork'] },
  'history.add': { any: ['authorizations'] }
};

// flags are read by the roles that open Authorizations; the free note only by clinicians and the person who wrote it; each person sees only their own read list
export const projection = {
  flags: { default: (s, actor, val) => (!actor || !['clinician', 'supervisor', 'admin'].includes(actor.role) ? [] : (val || []).map(f => (actor.role === 'clinician' || f.by === actor.id || !f.note ? f : { ...f, note: '', note_hidden: true }))) },
  notify_read: { default: (s, actor, val) => (actor && val && Array.isArray(val[actor.id]) ? { [actor.id]: val[actor.id] } : {}) }
};

export const openFlag = (s, id) => (s.flags || []).find(f => f.request === id && f.status === 'open') || null;

export default {
  'request.flag'(s, { id, flag = true, reason = '', note = '' }) {
    const r = byId(s.requests, id); if (!r) refuse(`${id} is not in the tracker.`, { status: 404, audit: false });
    const by = this.who(); s.flags = s.flags || [];
    const open = openFlag(s, id);
    if (flag) {
      if (open) refuse(`${id} is already flagged by ${staffName(s, open.by)} (${fmtDate(String(open.at).slice(0, 10))}). Clear that flag first.`, { status: 409, record: id, audit: false, code: 'already_flagged' });
      if (!FLAG_REASONS.some(x => x[0] === reason)) refuse('Pick a reason for the flag.', { status: 422, record: id, audit: false, code: 'flag_reason' });
      const why = clean(note, 140);
      if (reason === 'other' && why.length < 3) refuse('Say what the flag is about in the note.', { status: 422, record: id, audit: false, code: 'flag_note' });
      const f = { id: 'fl-' + (s.flags.length + 1) + '-' + Math.random().toString(36).slice(2, 6), request: id, by, at: this.now(), reason, note: why, status: 'open' };
      s.flags.push(f);
      this.event(`Flagged for attention · ${flagReasonLabel(reason)}`, by, id, { kind: 'flag' });   // the note itself stays in the flag record, not in the audit text
      return { flag: f };
    }
    if (!open) refuse(`${id} has no open flag.`, { status: 409, record: id, audit: false, code: 'not_flagged' });
    open.status = 'cleared'; open.cleared_by = by; open.cleared_at = this.now();
    this.event(`Flag cleared${open.by !== by ? ` (raised by ${staffName(s, open.by)})` : ''}`, by, id, { kind: 'flag' });
    return { flag: open };
  },

  // read state: per person; `all` marks everything this person has now; `ids` marks specific ones. Unknown ids are ignored.
  'notify.read'(s, { ids, all }) {
    const me = this.actor; if (!me || !me.id) refuse('Sign in to read notifications.', { status: 401, audit: false });
    s.notify_read = s.notify_read || {}; const have = new Set(s.notify_read[me.id] || []);
    const known = new Set(notificationsFor(s, me).map(n => n.id));
    const add = all ? [...known] : (Array.isArray(ids) ? ids.map(String) : []).filter(x => known.has(x));
    for (const x of add) have.add(x);
    s.notify_read[me.id] = [...have].slice(-300);
    return { read: add.length };
  },

  // a person's own entry in the history (what they did or learned, in their words). It is an audit event: who, when, what.
  'history.add'(s, { id, kind = 'note', text }) {
    const r = byId(s.requests, id); if (!r) refuse(`${id} is not in the tracker.`, { status: 404, audit: false });
    if (!KINDS[kind]) refuse('Pick call, note, document or payer contact.', { status: 422, audit: false });
    const t = clean(text, 400); if (t.length < 3) refuse('Write what happened.', { status: 422, audit: false });
    this.event(`${KINDS[kind]} · ${t}`, this.who(), id, { kind: 'history', entry: kind });
    return { ok: true };
  }
};
