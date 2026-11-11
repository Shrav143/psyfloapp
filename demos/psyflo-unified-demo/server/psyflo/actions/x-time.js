// Track Time and the phone (E7). One model of time for the panel and the phone (web/js/shared/time.js):
//   time.start / pause / resume / stop      the live timer (state.timers[staff]); a stopped timer becomes a DRAFT entry at once, so recorded time is never lost
//   time.save / discard / link / correct / add   state.time_entries (see shared/time.js for the shape)
//   dictation.micConsent / phone.dictation  the phone: a recorded microphone answer per person per demo-clock day, and a dictation that is saved only for a
//                                           student confirmed by Harvest # (no initials fallback)
// The timer follows store.clock, never the machine clock. Recorded, direct, documented and potentially billable units are separate figures; a running timer
// is none of them. Units come from the rules table only (unitsFor). Processed records are write-once: an entry that a processed daily note lists cannot change.
import { refuse, byId, Refusal } from '../gates.js';
import { today as clockToday } from '../../../web/js/shared/clock.js';
import { fmtDate, mins, clock12 } from '../../../web/js/shared/dates.js';
import { ruleValue } from '../../../web/js/shared/rules.js';
import { timerOf, entriesOf, secondsBetween, hhmm, isHHMM, checkTimes, minutesOf, excludedKinds, dpnKey, sameStudent, micConsentOf, entriesInNoteText, blocksFor, range12, fmtMin } from '../../../web/js/shared/time.js';

const need = (x, what) => { if (!x) refuse(`${what} was not found.`, { status: 404, audit: false, code: 'not_found' }); return x; };
const label = (s, id) => (byId(s.clients, id) || {}).initials || id;
const nextId = s => 'te-' + (1 + Math.max(0, ...(s.time_entries || []).map(e => +String(e.id).split('-')[1] || 0)));
const trim = v => String(v ?? '').trim();
// Track Time and the phone are for TDT students; an outpatient or SEBS record is off (the same rule the panel applies to its open page)
const tdtOnly = c => { if (c.service_line && c.service_line !== 'tdt') refuse(`Psyflo is off for ${c.initials}: ${String(c.service_line).toUpperCase()} records are not part of the TDT time and note tools.`, { record: c.id, status: 403, code: 'not_tdt', audit: false }); return c; };
const kindOk = (s, k) => k === 'direct' || excludedKinds(s).includes(k);
const docd = e => !!(e.dpn && e.dpn.note);

// keep the older readers of state.timers[staff].blocks (the daily-note contact-time rows) in step with the saved entries of the demo-clock day.
// Only the student of the live (or last) timer: those readers pick a timer by student, so another student's blocks must never ride along.
// New readers ask the model directly (blocksFor / timeSummary in web/js/shared/time.js), per student.
function syncBlocks(s, staffId) {
  s.timers = s.timers || {};
  const t = s.timers[staffId]; if (!t) return;
  t.blocks = t.client ? blocksFor(s, t.client, clockToday(s), staffId) : [];
}

// the stopped timer becomes a draft entry. `end` (HH:MM) is required only for a timer that was left running from an earlier day: its end is never guessed.
function stopInto(store, s, staffId, end) {
  const t = s.timers && s.timers[staffId]; if (!t || !t.started) refuse('No timer is running.', { audit: false, code: 'no_timer' });
  const at = store.now(); const info = timerOf(s, staffId, at);
  let endIso;
  if (info.stale) {
    if (!isHHMM(end)) refuse(`This timer was left running since ${fmtDate(info.date, { dow: true })} ${clock12(info.start)}. Say when it really ended (a time on that day) so nothing is guessed.`, { audit: false, code: 'stale_timer', status: 422 });
    endIso = `${info.date}T${end}:00`;
    if (secondsBetween(t.started, endIso) <= 0) refuse('The end must be after the start.', { audit: false, status: 422 });
  } else endIso = end && isHHMM(end) && `${info.date}T${end}:00` <= at && secondsBetween(t.started, `${info.date}T${end}:00`) > 0 ? `${info.date}T${end}:00` : at;
  let pausedSec = t.paused_sec || 0;
  if (t.paused_at) pausedSec += Math.max(0, Math.min(secondsBetween(t.paused_at, endIso), secondsBetween(t.started, endIso)));
  pausedSec = Math.min(pausedSec, Math.max(0, secondsBetween(t.started, endIso)));
  const netSec = Math.max(0, secondsBetween(t.started, endIso) - pausedSec);
  const pausedMin = Math.round(pausedSec / 60);
  const minutes = Math.max(1, Math.floor(netSec / 60));
  const start = t.started.slice(11, 16);
  const endHM = hhmm(Math.min(23 * 60 + 59, mins(start) + minutes + pausedMin));
  const e = { id: nextId(s), staff: staffId, client: t.client, date: info.date, start, end: endHM, minutes, paused_min: pausedMin, what: t.what || '', goal: null, kind: 'direct', confirmed: false, status: 'draft',
    dpn: null, source: 'timer', created_at: at, by: staffId };
  (s.time_entries = s.time_entries || []).push(e);
  t.started = null; t.paused_at = null; t.paused_sec = 0; t.what = '';   // t.client stays: the student of the last timer (older readers)
  syncBlocks(s, staffId);
  store.event(`Timer stopped · ${label(s, e.client)} ${range12(e.start, e.end)} · ${fmtMin(minutes)} recorded (not counted until a person describes and saves it)`, staffId, e.client);
  return e;
}

const entryScope = (s, a) => { const e = byId(s.time_entries, a.id); return { clientId: e && e.client, ownerId: e && e.staff }; };
// every entry named must belong to the person (direct support); a clinician may act on any entry of a student
const ownEntries = (s, a, actor) => { for (const id of a.ids || [a.id]) { const e = byId(s.time_entries, id); if (e && actor.role === 'direct_support' && e.staff !== actor.id) throw new Refusal('A time entry belongs to the person who recorded it.', { status: 403, audit: false }); } };

export const authz = {
  'time.start': { any: ['trackTime'], scope: (s, a) => ({ clientId: a.client }) },
  'time.activity': { any: ['trackTime'] },
  'time.pause': { any: ['trackTime'] },
  'time.resume': { any: ['trackTime'] },
  'time.stop': { any: ['trackTime'] },
  'time.save': { any: ['trackTime'], scope: entryScope },
  'time.discard': { any: ['trackTime'], scope: entryScope },
  'time.correct': { any: ['trackTime'], scope: entryScope },
  'time.link': { any: ['trackTime'], scope: (s, a) => entryScope(s, { id: (a.ids || [])[0] }), check: ownEntries },
  'time.add': { any: ['trackTime'], scope: (s, a) => ({ clientId: a.client }) },
  'dictation.micConsent': { any: ['notes.own'] },
  'phone.dictation': { any: ['notes.own'], scope: (s, a) => ({ clientId: a.client }) }
};

// who sees which stored rows: a direct support worker only their own; clinicians all; nobody else (entries hold activity text)
const own = (s, actor, v) => (v || []).filter(x => x.staff === actor.id);
export const projection = {
  time_entries: { clinician: true, direct_support: own, default: false },
  mic_consents: { clinician: true, direct_support: own, default: false },
  phone_examples: { clinician: true, direct_support: true, default: false }   // the scripted sentence for "Use the example" (synthetic)
};

export const hooks = {
  // a person pressed Process Form on the daily note (observed on the open Lauris page): the entries its Contact time box lists are now documented
  observed(store, s, ev, out) {
    if (!ev || ev.type !== 'lauris' || ev.event !== 'processed' || ev.form !== 'dpn' || !ev.client) return;
    const note = (s.notes || []).find(n => n.id === ((out && out.note) || ev.note));
    const date = note ? note.date : clockToday(s);
    const list = entriesOf(s, { client: ev.client.id, date }).filter(e => e.status === 'saved' && e.confirmed && (e.kind || 'direct') === 'direct');
    const matched = entriesInNoteText(list, ev.values && ev.values['Contact time']);
    for (const e of matched) e.dpn = { key: (e.dpn && e.dpn.key) || dpnKey(e.client, e.date), linked_at: (e.dpn && e.dpn.linked_at) || store.now(), linked_by: (e.dpn && e.dpn.linked_by) || 'bridge', note: note ? note.id : null, session: ev.session || null, documented_at: store.now() };
    store.event(`Daily note processed in Lauris · ${matched.length} of ${list.length} saved time entr${list.length === 1 ? 'y is' : 'ies are'} listed in its Contact time box`, 'bridge', ev.client.id, { actor_kind: 'bridge' });
  },
  advance({ state }) { for (const id of Object.keys(state.timers || {})) syncBlocks(state, id); }
};

export default {
  // ---------------------------------------------------------------- the timer
  'time.start'(s, { client, switch: sw = false, harvest_no, what }) {
    const staff = this.who(); const c = tdtOnly(need(byId(s.clients, client), 'The student'));
    // the page or card the person is looking at must be this student: matched by Harvest #, never by initials
    if (harvest_no != null && harvest_no !== '') { const m = sameStudent(s, c.id, harvest_no); if (!m.ok) refuse(`Nothing was started: ${m.reason} Check the student before you start.`, { code: 'wrong_patient', record: c.id }); }
    const cur = timerOf(s, staff, this.now());
    if (cur) {
      if (cur.stale) refuse(`A timer was left running since ${fmtDate(cur.date, { dow: true })} ${clock12(cur.start)}. Stop it and say when it ended first.`, { audit: false, code: 'stale_timer' });
      if (cur.client === c.id) return { already: true };
      if (!sw) refuse(`The timer is running with ${label(s, cur.client)}. Stop it first, or switch to ${c.initials} instead`, { audit: false, code: 'timer_running' });
      stopInto(this, s, staff, null);
    }
    s.timers = s.timers || {};
    const t = s.timers[staff] || (s.timers[staff] = { blocks: [] });
    Object.assign(t, { client: c.id, started: this.now(), paused_at: null, paused_sec: 0, what: trim(what).slice(0, 140) });
    syncBlocks(s, staff);
    this.event(`Timer started with ${c.initials} (recorded time only; not billable)`, staff, c.id);
    return { started: t.started };
  },
  // the activity the person says they are doing (optional, their own words); it becomes the starting text of the stopped entry, which still has to be saved
  'time.activity'(s, { what }) {
    const staff = this.who(); const t = s.timers && s.timers[staff];
    if (!t || !t.started) refuse('No timer is running.', { audit: false, code: 'no_timer' });
    t.what = trim(what).slice(0, 140);
    return { what: t.what };
  },
  'time.pause'(s) {
    const staff = this.who(); const t = s.timers && s.timers[staff];
    if (!t || !t.started) refuse('No timer is running.', { audit: false, code: 'no_timer' });
    if (t.paused_at) return { already: true };
    if (timerOf(s, staff, this.now()).stale) refuse('This timer was left running from an earlier day. Stop it and say when it ended.', { audit: false, code: 'stale_timer' });
    t.paused_at = this.now();
    this.event(`Timer paused · ${label(s, t.client)}`, staff, t.client);
    return { paused: true };
  },
  'time.resume'(s) {
    const staff = this.who(); const t = s.timers && s.timers[staff];
    if (!t || !t.started) refuse('No timer is running.', { audit: false, code: 'no_timer' });
    if (!t.paused_at) return { already: true };
    t.paused_sec = (t.paused_sec || 0) + Math.max(0, secondsBetween(t.paused_at, this.now())); t.paused_at = null;
    this.event(`Timer resumed · ${label(s, t.client)}`, staff, t.client);
    return { resumed: true };
  },
  'time.stop'(s, { end } = {}) {
    const e = stopInto(this, s, this.who(), trim(end) || null);
    return { id: e.id, minutes: e.minutes, start: e.start, end: e.end, date: e.date };
  },

  // ---------------------------------------------------------------- entries
  // A person describes the stopped interval (what they did, in their own words) and saves it; saving also confirms it as time with the student.
  'time.save'(s, { id, what, goal, kind, confirm = true }) {
    const e = need(byId(s.time_entries, id), 'The time entry'); const by = this.who();
    if (!(e.status === 'draft' || e.status === 'saved') || e.superseded_by) refuse('This entry was already replaced or discarded.', { record: e.client, code: 'write_once' });
    if (docd(e)) refuse('A processed daily note lists this time. It is final; it cannot be saved again here.', { record: e.client, code: 'write_once' });
    const w = what != null ? trim(what) : e.what;
    // a saved entry is only CONFIRMED here; changing what it says, its kind or its objective is a correction (a reason, and the earlier version stays)
    if (e.status === 'saved' && ((what != null && w !== e.what) || (kind != null && kind !== '' && kind !== e.kind) || (goal != null && goal !== '' && +goal !== e.goal))) refuse('This entry is saved. To change what it says, use Correct and give a reason; the earlier version stays in the record.', { record: e.client, status: 422, audit: false, code: 'use_correct' });
    if (w.length < 3) refuse('Say what you did (a few words, in your own words).', { record: e.client, status: 422, audit: false });
    const k = kind != null && kind !== '' ? kind : e.kind || 'direct';
    if (!kindOk(s, k)) refuse('Pick Direct service or one of the reasons the time is not direct.', { record: e.client, status: 422, audit: false });
    const g = goal != null && goal !== '' ? +goal : e.goal;
    if (g != null && !Number.isInteger(g)) refuse('The ISP objective must be a number.', { status: 422, audit: false });
    Object.assign(e, { what: w, goal: g || null, kind: k, status: 'saved', confirmed: !!confirm, saved_at: this.now(), saved_by: by });
    syncBlocks(s, e.staff);
    this.event(`Time saved · ${label(s, e.client)} ${range12(e.start, e.end)} · ${fmtMin(e.minutes)} · ${k === 'direct' ? 'direct service' : 'not direct (' + k + ')'}${confirm ? '' : ' · to confirm'}`, by, e.client);
    return { id: e.id };
  },
  // A draft is removed; a saved entry is kept but voided with a reason (nothing recorded is erased); one a processed note lists is final.
  'time.discard'(s, { id, reason }) {
    const e = need(byId(s.time_entries, id), 'The time entry'); const by = this.who();
    if (docd(e)) refuse('A processed daily note lists this time. It is final and cannot be discarded.', { record: e.client, code: 'write_once' });
    if (e.status === 'voided' || e.superseded_by) refuse('This entry was already replaced or discarded.', { record: e.client, code: 'write_once' });
    if (e.status === 'draft') {
      s.time_entries = s.time_entries.filter(x => x.id !== e.id);
      this.event(`Stopped timer discarded · ${label(s, e.client)} ${range12(e.start, e.end)} (${fmtMin(e.minutes)}; it had not been saved)`, by, e.client);
    } else {
      if (trim(reason).length < 4) refuse('Say why this saved time is being discarded (it is kept in the record).', { record: e.client, status: 422, audit: false });
      Object.assign(e, { status: 'voided', void_reason: trim(reason), voided_by: by, voided_at: this.now() });
      this.event(`Saved time voided · ${label(s, e.client)} ${range12(e.start, e.end)} · ${trim(reason).slice(0, 80)} (kept in the record)`, by, e.client);
    }
    syncBlocks(s, e.staff);
    return { ok: true };
  },
  // Link saved, confirmed direct entries to the day's daily note (documentation). "Documented" turns on only when the note is seen processed in Lauris.
  'time.link'(s, { ids = [], unlink = false }) {
    const by = this.who(); let n = 0;
    if (!ids.length) refuse('Pick the entries to link.', { status: 422, audit: false });
    for (const id of ids) {
      const e = need(byId(s.time_entries, id), 'The time entry');
      if (docd(e)) { if (unlink) refuse('A processed daily note lists this time. The link is final.', { record: e.client, code: 'write_once' }); continue; }
      if (unlink) { if (e.dpn) { e.dpn = null; n++; } continue; }
      if (e.status !== 'saved') refuse('Save the entry first (say what you did), then link it.', { record: e.client, status: 422, audit: false });
      if (!e.confirmed) refuse('Confirm the entry first; unconfirmed time is not linked to a note.', { record: e.client, status: 422, audit: false });
      const note = (s.notes || []).find(x => x.client === e.client && x.type === 'daily' && x.date === e.date);
      if (note) refuse(`The daily note for ${label(s, e.client)} on ${fmtDate(e.date)} is already processed in Lauris, so it cannot take more time.`, { record: e.client, code: 'write_once' });
      if (!e.dpn) { e.dpn = { key: dpnKey(e.client, e.date), linked_at: this.now(), linked_by: by, note: null }; n++; }
    }
    if (n) this.event(`${n} time entr${n === 1 ? 'y' : 'ies'} ${unlink ? 'unlinked from' : 'linked to'} the daily note (documented only after the note is processed in Lauris)`, by, byId(s.time_entries, ids[0]).client);
    return { n };
  },
  // Manual correction: a NEW version with a reason; the earlier one stays and is marked replaced (corrected_from).
  'time.correct'(s, { id, start, end, what, goal, kind, paused_min, reason }) {
    const old = need(byId(s.time_entries, id), 'The time entry'); const by = this.who();
    if (docd(old)) refuse('A processed daily note lists this time. It is final; it cannot be corrected here.', { record: old.client, code: 'write_once' });
    if (old.status === 'voided' || old.superseded_by) refuse('This entry was already replaced or discarded; correct the latest version.', { record: old.client, code: 'write_once' });
    if (trim(reason).length < 4) refuse('Say why the time is being corrected (it is kept in the record).', { record: old.client, status: 422, audit: false });
    const n = { ...old, id: nextId(s), start: start != null && start !== '' ? trim(start) : old.start, end: end != null && end !== '' ? trim(end) : old.end, paused_min: paused_min != null && paused_min !== '' ? Math.max(0, Math.floor(+paused_min) || 0) : old.paused_min || 0 };
    if (what != null) n.what = trim(what); if (goal !== undefined) n.goal = goal === '' || goal == null ? null : +goal; if (kind != null && kind !== '') n.kind = kind;
    if (!kindOk(s, n.kind || 'direct')) refuse('Pick Direct service or one of the reasons the time is not direct.', { status: 422, audit: false });
    const bad = checkTimes(s, { date: old.date, start: n.start, end: n.end }, this.now()); if (bad) refuse(bad, { record: old.client, status: 422, audit: false });
    if (n.status === 'saved' && trim(n.what).length < 3) refuse('Say what you did (a few words).', { status: 422, audit: false });
    if (n.start === old.start && n.end === old.end && n.paused_min === (old.paused_min || 0) && n.what === old.what && n.goal === old.goal && n.kind === old.kind) refuse('Nothing was changed.', { record: old.client, status: 422, audit: false });
    n.minutes = minutesOf(n.start, n.end, n.paused_min);
    Object.assign(n, { corrected_from: old.id, reason: trim(reason), corrected_by: by, corrected_at: this.now(), dpn: old.dpn && !old.dpn.note ? old.dpn : null });
    delete n.superseded_by;
    old.superseded_by = n.id;
    s.time_entries.push(n);
    syncBlocks(s, old.staff);
    this.event(`Time corrected · ${label(s, old.client)} ${range12(old.start, old.end)} (${fmtMin(old.minutes)}) → ${range12(n.start, n.end)} (${fmtMin(n.minutes)}) · ${trim(reason).slice(0, 80)} (earlier version kept)`, by, old.client);
    return { id: n.id, corrected_from: old.id };
  },
  // Time the person forgot to start: added by hand, with the reason, and marked as added by hand everywhere it appears.
  'time.add'(s, { client, date, start, end, what, goal, kind, reason, harvest_no }) {
    const by = this.who(); const c = tdtOnly(need(byId(s.clients, client), 'The student'));
    if (harvest_no != null && harvest_no !== '') { const m = sameStudent(s, c.id, harvest_no); if (!m.ok) refuse(`Nothing was added: ${m.reason}`, { code: 'wrong_patient', record: c.id }); }
    const d = date || clockToday(s); const k = kind || 'direct';
    if (!kindOk(s, k)) refuse('Pick Direct service or one of the reasons the time is not direct.', { status: 422, audit: false });
    if (trim(what).length < 3) refuse('Say what you did (a few words).', { status: 422, audit: false });
    if (trim(reason).length < 4) refuse('Say why this time was not timed (it is shown as added by hand).', { status: 422, audit: false });
    const bad = checkTimes(s, { date: d, start, end }, this.now()); if (bad) refuse(bad, { record: c.id, status: 422, audit: false });
    const e = { id: nextId(s), staff: by, client: c.id, date: d, start, end, minutes: minutesOf(start, end), paused_min: 0, what: trim(what), goal: goal != null && goal !== '' ? +goal : null, kind: k, confirmed: true, status: 'saved',
      dpn: null, source: 'manual', reason: trim(reason), created_at: this.now(), saved_at: this.now(), saved_by: by, by };
    (s.time_entries = s.time_entries || []).push(e);
    if (s.timers && s.timers[by]) syncBlocks(s, by);
    this.event(`Time added by hand · ${c.initials} ${range12(start, end)} · ${fmtMin(e.minutes)} · ${trim(reason).slice(0, 80)}`, by, c.id);
    return { id: e.id };
  },

  // ---------------------------------------------------------------- the phone
  // The microphone answer is recorded (who, when, how); the browser's own permission prompt is separate. Typing needs no answer.
  'dictation.micConsent'(s, { granted = true }) {
    const staff = this.who(); s.mic_consents = s.mic_consents || [];
    const row = { id: 'mc-' + (s.mic_consents.length + 1), staff, granted: !!granted, at: this.now(), date: clockToday(s), how: 'tapped on the phone', engine: 'Browser speech recognition; the browser vendor may process the audio. Psyflo keeps the text, not the audio.' };
    s.mic_consents.push(row);
    this.event(granted ? 'Microphone allowed for dictation today (recorded)' : 'Microphone turned off for dictation (recorded)', staff, 'dictation');
    return { id: row.id, granted: row.granted };
  },
  // Save "what happened" for a student CONFIRMED by Harvest # (the identity card), as a waiting dictation. "Processed" is never set here.
  'phone.dictation'(s, { client, harvest_no, input = 'typed', spoken, rewritten, chips, checks, narrative, objective, interventions, mood, progress, fixed, edited, replace }) {
    const staff = this.who(); const c = tdtOnly(need(byId(s.clients, client), 'The student'));
    const m = sameStudent(s, c.id, harvest_no); if (!m.ok) refuse(`Not saved: ${m.reason} Pick the student again and check the card.`, { code: 'wrong_patient', record: c.id });
    if (!trim(spoken)) refuse('Say or type what happened first.', { status: 422, audit: false });
    if (input === 'voice' && ruleValue(s, 'recording.require_consent_record', true) && !micConsentOf(s, staff, clockToday(s)).granted) refuse('Use the microphone only after it was allowed today (a recorded answer). Type it instead, or allow the microphone first.', { code: 'no_consent', record: c.id });
    if (replace) { const old = byId(s.dictations, replace); if (old && old.staff === staff && old.status === 'waiting') s.dictations = s.dictations.filter(d => d.id !== replace); else if (old && old.status === 'used') refuse('A dictation that was used in a processed note cannot be replaced.', { record: c.id, code: 'write_once' }); }
    const r = this.actions['dictation.save'].call(this, s, { client: c.id, spoken: trim(spoken), rewritten, chips, checks, source: 'phone', input: input === 'voice' ? 'voice' : 'typed', harvest_no: c.harvest_no, confirmed_at: this.now() });
    const d = byId(s.dictations, r.id);
    for (const [k, v] of Object.entries({ narrative, objective, interventions, mood, progress, fixed, edited })) if (v !== undefined) d[k] = v;
    return { id: r.id };
  }
};
