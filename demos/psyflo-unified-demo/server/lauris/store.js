// The mock Lauris Online database. Lauris is the record; Psyflo never touches this module.
// Only the Lauris pages (site.js) read and write it, and the extension sees it only through those pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMS } from './forms.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data'), 'lauris.json');

const US = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${m}/${d}/${y}`; };
const PAYER = { humana: 'Humana', anthem: 'Anthem', sentara: 'Sentara', aetna: 'Aetna', uhc: 'UHC', ffs: 'FFS' };
// Lauris-side signing authority: only LMHP-type credentials may press Get Signature (the mock enforces it; the real Lauris
// limits actions by the user's credential, T-019). Psyflo checks the signer again before it records anything.
const LMHP_RE = /^(LMHP|LMHP-R|LMHP-S|LMHP-RP|LPC|LCSW|LMFT|LCP|LSATP)\b/i;
const STAFF = { khale: 'K. Hale', slane: 'S. Lane', rowens: 'R. Owens', jreyes: 'J. Reyes', jperez: 'J. Perez, LPC', cdiaz: 'C. Diaz', dowens: 'D. Owens' };

// M.R.'s corpus (E5 writes seed/extra/notes-corpus.json): the processed daily, weekly and monthly notes Harvest's Lauris holds for consumer #3310.
// Rendered here as processed sessions so the Active File and the session pages show them; Psyflo reads its OWN captured copies, never Lauris.
// The file carries `_lauris_sessions: { consumer, sessions:[{ id, no, form, date, staff, status, processed_at, processed_by, values }] }` (used as is);
// without it the notes ({ notes:[{ client, type, date, session?, fields? ... }] }) are converted. A missing file adds nothing.
const CORPUS_FORM = { daily: 'dpn', weekly_guardian: 'weekly', monthly_collateral: 'collateral', dpn: 'dpn', weekly: 'weekly', collateral: 'collateral' };
const MIN = m => (m == null ? '' : (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`));
function corpusValues(n, form) {
  if (n.fields && typeof n.fields === 'object') return { ...n.fields };
  if (form === 'dpn') return Object.fromEntries(Object.entries({ 'Direct time': n.direct_time_min != null ? MIN(n.direct_time_min) : n.direct_time, 'Units': n.units != null ? String(n.units) : '', 'Contact time': Array.isArray(n.contact_time) ? n.contact_time.map(b => `${b[0]}\u2013${b[1]} \u00b7 ${b[2] || ''}`).join('\n') : n.contact_time, 'Mood check-in': n.mood, 'Progress today': n.progress, 'Narrative': n.enhanced || n.narrative || n.text }).filter(([, v]) => v));
  if (form === 'weekly') return Object.fromEntries(Object.entries({ 'Date': n.date, 'Contact with': n.contact, 'Duration': n.duration_min != null ? `${n.duration_min} min` : '', 'What was discussed': n.discussed || n.narrative || n.text, 'Follow-up': n.follow_up }).filter(([, v]) => v));
  return Object.fromEntries(Object.entries({ 'Date': n.date, 'Collateral': n.collateral, 'Method': n.method, 'Information shared / received': n.shared || n.narrative || n.text, 'Coordination': n.coordination }).filter(([, v]) => v));
}
export function loadCorpus(extraDir) {
  const f = process.env.NOTES_CORPUS_FILE || path.join(extraDir, 'notes-corpus.json');
  if (!fs.existsSync(f)) return [];
  try {
    const x = JSON.parse(fs.readFileSync(f, 'utf8'));
    const ls = x && !Array.isArray(x) && x._lauris_sessions;
    if (ls && Array.isArray(ls.sessions) && ls.sessions.length) return ls.sessions.filter(s => s && Number(s.no || ls.consumer) === 3310 && FORMS[s.form] && s.date).map(s => ({ id: Number.isInteger(s.id) ? s.id : null, no: 3310, form: s.form, date: String(s.date).slice(0, 10), staff: s.staff || 'khale', status: 'processed', values: s.values || {}, processed_at: s.processed_at || `${String(s.date).slice(0, 10)}T15:00`, processed_by: s.processed_by || s.staff || 'khale', corpus: true }));
    const list = Array.isArray(x) ? x : x.notes || x.notes_corpus || x.corpus || [];
    return list.filter(n => n && (n.client === 'MR' || Number(n.consumer) === 3310) && CORPUS_FORM[n.type] && n.date).map(n => { const form = CORPUS_FORM[n.type]; return { id: Number.isInteger(n.session) ? n.session : null, no: 3310, form, date: String(n.date).slice(0, 10), staff: n.staff || 'khale', status: 'processed', values: corpusValues(n, form), processed_at: n.processed_at || `${String(n.date).slice(0, 10)}T15:00`, processed_by: n.staff || 'khale', corpus: true }; });
  } catch { return []; }
}

function build(preset) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'seed', 'seed.json'), 'utf8'));
  // students added in seed/extra are in Harvest's Lauris too
  const extraDir = path.join(ROOT, 'seed', 'extra');
  if (fs.existsSync(extraDir)) for (const f of fs.readdirSync(extraDir).filter(f => f.endsWith('.json')).sort()) {
    const x = JSON.parse(fs.readFileSync(path.join(extraDir, f), 'utf8'));
    if (Array.isArray(x.clients)) seed.clients = seed.clients.concat(x.clients.filter(c => !seed.clients.some(y => y.id === c.id)));
  }
  const schools = Object.fromEntries(seed.schools.map(s => [s.id, s]));
  const db = { preset, today: seed.today, todayUS: US(seed.today), nextSession: 1000, nextTime: 1, nextAuth: 1, time: [], consumers: [], sessions: [], users: seed.staff.map(s => ({ id: s.id, name: STAFF[s.id] || s.name, role: s.role, credential: s.credential || '', can_sign: LMHP_RE.test(s.credential || '') })) };
  for (const c of seed.clients) {
    if (!c.harvest_no) continue;
    if (c.id === 'TW' && preset !== 'canvas') continue;
    const sch = schools[c.school] || {};
    const auth = c.authorization || null;
    const program = c.id === 'PG' ? 'Outpatient' : 'TDT';
    let units = null;
    if (auth) { units = auth.used != null && auth.units ? auth.units - auth.used : auth.units; }
    db.consumers.push({
      no: c.harvest_no, initials: c.initials, locality: sch.locality || '', school: sch.name || '', program,
      group: program === 'TDT' ? `TDT – ${(sch.locality || '').replace(' County', '').replace(' City', '')} ${(sch.name || '').split('·').pop().trim()}` : 'Outpatient – Lynchburg',
      staff: STAFF[c.staff] || (c.id === 'TW' ? 'J. Perez, LPC' : ''), clinician: c.clinician ? STAFF[c.clinician] : 'J. Perez, LPC',
      status: 'active', updated: seed.today,
      guardian: c.guardian?.name ? (c.guardian.name === 'grandmother' ? 'Grandmother' : c.guardian.name) : 'Guardian',
      guardian_phone: c.guardian?.phone || '', language: 'English', iep: c.iep ? 'Yes' : '',
      medicaid_plan: c.medicaid?.plan ? PAYER[c.medicaid.plan] : '', medicaid_id: !!c.medicaid,
      diagnosis: c.diagnosis || (c.id === 'MR' ? 'F43.25' : ''), goals: c.goals || [], strengths: c.strengths || '',
      release: c.id === 'MR' ? '08/18/2026' : '', service_start_us: US(c.service_start),
      auth: auth && auth.units ? { payer: auth.payer, payer_name: PAYER[auth.payer] || '', units: auth.units, used: auth.used ?? 0, available: units, start_us: US(auth.start), end_us: US(auth.end) } : (units ? { available: units } : null),
      active_file: [], documents: []
    });
  }
  // Two records Psyflo must stay off for (TDT clients only)
  db.consumers.push({ no: 5120, initials: 'H.B.', locality: 'Lynchburg City', school: 'Lynchburg City · MS-2', program: 'SEBS', group: 'SEBS – Lynchburg', staff: 'J. Reyes', clinician: 'J. Perez, LPC', status: 'active', updated: '2026-10-27', guardian: 'Guardian', goals: [], auth: { available: 40 }, active_file: [], documents: [] });
  db.consumers.push({ no: 2950, initials: 'W.S.', locality: 'Campbell County', school: 'Campbell County · ES-1', program: 'TDT', group: 'TDT – Campbell ES-1', staff: 'K. Hale', status: 'discharged', updated: '2026-06-12', guardian: 'Guardian', goals: [], auth: null, active_file: [], documents: [] });

  const sess = (no, form, date, staff, status, extra = {}) => db.sessions.push({ id: db.nextSession++, no, form, date, staff, status, values: {}, ...extra });
  // K. Hale's morning list (Saved Session)
  sess(3315, 'dpn', '2026-10-28', 'khale', 'saved', { saved_at: '2026-10-28T15:20' });
  sess(3320, 'weekly', '2026-10-27', 'khale', 'saved', { saved_at: '2026-10-27T15:40' });
  // Today's daily notes already processed (4 of 6)
  for (const no of [3315, 3320, 3322, 3333]) sess(no, 'dpn', seed.today, 'khale', 'processed', { processed_at: seed.today + 'T15:1' + (no % 10) });
  // Forms to Approve (processed, awaiting signature)
  sess(3315, 'quarterly', '2026-10-27', 'jperez', 'processed', { processed_at: '2026-10-27T16:02', approve: true });
  sess(3320, 'isp', '2026-10-26', 'jperez', 'processed', { processed_at: '2026-10-26T11:30', approve: true });
  sess(4210, 'sra-continued', '2026-10-28', 'jperez', 'processed', { processed_at: '2026-10-28T13:15', approve: true });
  sess(4110, 'quarterly', '2026-10-28', 'jperez', 'processed', { processed_at: '2026-10-28T14:40', approve: true });
  sess(3333, 'isp', '2026-10-28', 'jperez', 'processed', { processed_at: '2026-10-28T10:05', approve: true });
  sess(3322, 'quarterly', '2026-10-28', 'jperez', 'processed', { processed_at: '2026-10-28T16:45', approve: true });
  // Rejected Forms
  sess(3340, 'dpn', '2026-10-27', 'rowens', 'rejected', { processed_at: '2026-10-27T15:30', reject_note: 'Name the ISP objective and say what you did, not what you saw. — C. Diaz', rejected_by: 'C. Diaz' });

  // M.R. #3310 corpus (processed notes from E5's seed/extra/notes-corpus.json; an absent file adds nothing). Their session ids stay as E5 wrote them;
  // new sessions are numbered after them so today's work sorts above the history.
  for (const s of loadCorpus(extraDir)) {
    const sid = s.id != null && !db.sessions.some(x => x.id === s.id) ? s.id : db.nextSession++;
    db.sessions.push({ ...s, id: sid });
    if (sid >= db.nextSession) db.nextSession = sid + 1;
  }
  if (preset === 'canvas') {
    const tw = 4492;
    sess(tw, 'screening', '2026-10-16', 'jperez', 'processed', { processed_at: '2026-10-16T14:52' });
    sess(tw, 'cna', '2026-10-20', 'jperez', 'processed', { processed_at: '2026-10-20T13:58' });
    sess(tw, 'isp', '2026-10-21', 'jperez', 'approved', { processed_at: '2026-10-21T11:40', signed_by: 'J. Perez, LPC', signed_at: '2026-10-21T11:52' });
    sess(tw, 'sra-initial', '2026-10-22', 'jperez', 'approved', { processed_at: '2026-10-22T13:58', signed_by: 'J. Perez, LPC', signed_at: '2026-10-22T14:04' });
  }
  for (const s of db.sessions) {
    const c = db.consumers.find(c => c.no === s.no);
    if (c && s.status !== 'saved') c.active_file.push({ session: s.id, form: s.form, date: s.date });
  }
  return db;
}

class LaurisError extends Error { constructor(msg, status = 409) { super(msg); this.status = status; } }

class LaurisDB {
  constructor() {
    this.clockFn = null;
    if (fs.existsSync(FILE)) { try { this.db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { this.db = build('live'); } }
    else this.db = build('live');
    if (!this.db.time) { this.db.time = []; this.db.nextTime = 1; }
    if (!this.db.nextAuth) this.db.nextAuth = 1;
  }
  // The ONE demo clock is Psyflo's store.clock; index.js hands Lauris a function that returns 'YYYY-MM-DDTHH:MM:SS'.
  setClock(fn) { this.clockFn = fn; this.syncToday(); }
  syncToday() {
    if (!this.clockFn) return;
    const d = this.clockFn().slice(0, 10);
    if (this.db.today !== d) { this.db.today = d; this.db.todayUS = US(d); this.save(); }
  }
  reset(preset) { this.db = build(preset); this.syncToday(); this.save(); }
  save() { fs.writeFileSync(FILE, JSON.stringify(this.db)); }
  consumer(no) { return this.db.consumers.find(c => String(c.no) === String(no)); }
  session(id) { return this.db.sessions.find(s => String(s.id) === String(id)); }
  user(id) { return this.db.users.find(u => u.id === id); }
  stamp() { if (this.clockFn) return this.clockFn().slice(0, 16); const d = new Date(); return `${this.db.today}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  addConsumer(f) {
    if (!this.db.nextNo) this.db.nextNo = 4492;
    while (this.consumer(this.db.nextNo)) this.db.nextNo++;
    const no = f.no ? Number(f.no) : this.db.nextNo++;
    const c = { no, initials: f.initials, locality: f.locality || '', school: f.school || '', program: f.program || 'TDT',
      group: f.program === 'TDT' ? `TDT – ${(f.locality || '').replace(' County', '').replace(' City', '')} ${(f.school || '').split('·').pop().trim()}` : f.program,
      staff: f.staff || '', clinician: f.clinician || 'J. Perez, LPC', status: 'active', updated: this.db.today, guardian: f.guardian || '', guardian_phone: f.guardian_phone || '',
      language: f.language || '', iep: f.iep || '', medicaid_plan: f.medicaid_plan || '', medicaid_id: !!f.medicaid_id, diagnosis: '', goals: [], strengths: '', auth: null, active_file: [], documents: [] };
    this.db.consumers.push(c); this.save(); return c;
  }
  // A processed or signed session is final (Lauris behaviour the mock now enforces): nothing writes to it, it is processed once.
  saveSession({ id, no, form, values, staff, process }) {
    let s = id ? this.session(id) : null;
    if (s && s.status !== 'saved' && s.status !== 'rejected') throw new LaurisError(`This ${FORMS[s.form]?.short || 'session'} is ${s.status === 'approved' ? 'signed' : 'processed'} and read-only. It cannot be changed or processed again.`);
    if (!s) { s = { id: this.db.nextSession++, no: Number(no), form, date: this.db.today, staff, status: 'saved', values: {} }; this.db.sessions.push(s); }
    s.values = values; s.saved_at = this.stamp();
    const c = this.consumer(s.no);
    if (c) c.updated = this.db.today;
    if (process) {
      s.status = 'processed'; s.processed_at = this.stamp(); s.processed_by = staff;
      if (FORMS[form]?.approve) s.approve = true;
      if (c) {
        c.active_file.push({ session: s.id, form, date: s.date });
        // what processing a form changes on the record (Lauris behaviour, not Psyflo's)
        if (form === 'isp') {
          c.goals = [1, 2, 3].map(n => ({ n, name: '', objective: values[`Goal ${n} · Objective`] || '', interventions: [values[`Goal ${n} · Intervention 1`], values[`Goal ${n} · Intervention 2`]].filter(Boolean) })).filter(g => g.objective);
          if (values['Diagnosis 1']) c.diagnosis = values['Diagnosis 1'];
          if (values['Strengths']) c.strengths = values['Strengths'];
        }
        if (form === 'screening' && values['Preliminary diagnosis']) c.diagnosis = values['Preliminary diagnosis'];
        if (form === 'dpn' && c.auth && c.auth.available != null) {
          const u = parseInt(values['Units'], 10) || 0;
          if (u > c.auth.available) s.warn = `Warning: ${u} unit${u === 1 ? '' : 's'} entered, ${c.auth.available} available.`;
          c.auth.available = Math.max(0, c.auth.available - u); if (c.auth.used != null) c.auth.used += u;
        }
      }
    }
    this.save();
    return s;
  }
  // Get Signature: only a processed form in Forms to Approve, only by a user with signing authority, only once.
  sign(id, userId) {
    const s = this.session(id); const u = this.user(userId);
    if (!s || s.status !== 'processed' || !s.approve) throw new LaurisError('Only a processed form in Forms to Approve can be signed.');
    if (!u || !u.can_sign) throw new LaurisError(`${u ? u.name : 'This user'} does not have signing authority in Lauris (LMHP-type credential required).`, 403);
    s.status = 'approved'; s.signed_by = u.name; s.signed_at = this.stamp(); this.save(); return s;
  }
  reject(id, by, note) {
    const s = this.session(id);
    if (!s || s.status !== 'processed') throw new LaurisError('Only a processed form can be rejected; a signed form is final.');
    s.status = 'rejected'; s.rejected_by = by; s.reject_note = note; s.rejected_at = this.stamp(); this.save(); return s;
  }
  saveSurvey(no, instrument, answers, by) {
    const c = this.consumer(no); const score = Object.values(answers).reduce((a, b) => a + (Number(b) || 0), 0);
    c.surveys = c.surveys || []; c.surveys.push({ instrument, answers, score, date: this.db.today, by }); this.save(); return score;
  }
  // Demo-grade attestation: does the mock show what the page bridge says it saw? (see server/attest.js)
  verify(ev) {
    const norm = x => String(x || '').split(',')[0].trim().toLowerCase();
    const c = this.consumer(ev.consumer && ev.consumer.no);
    if (!c) return { ok: false, reason: `no consumer ${ev.consumer && ev.consumer.no}` };
    if (ev.event === 'created') return { ok: true };
    if (ev.event === 'authorization') { const m = String(ev.consumer.units || '').match(/(\d+)\s+units? available/i); return c.auth && m && +m[1] === +c.auth.available ? { ok: true } : { ok: false, reason: 'the consumer header does not show those units' }; }
    if (ev.form === 'time') {   // the Time Tracker saves entries, not sessions: the saved entry must exist for this consumer
      const te = (this.db.time || []).find(x => String(x.id) === String(ev.session));
      return ev.event === 'saved' && te && String(te.no) === String(c.no) ? { ok: true } : { ok: false, reason: 'the Time Tracker shows no such saved entry for this consumer' };
    }
    const s = this.session(ev.session);
    if (!s) return { ok: false, reason: `no session ${ev.session}` };
    if (String(s.no) !== String(c.no)) return { ok: false, reason: 'the session belongs to another consumer' };
    if (ev.form && s.form !== ev.form) return { ok: false, reason: 'the session is a different form' };
    const by = x => norm(this.user(x)?.name);
    if (ev.event === 'saved') return ['saved', 'processed', 'approved', 'rejected'].includes(s.status) ? { ok: true, session: s } : { ok: false, reason: 'not saved' };
    if (ev.event === 'processed') {
      if (!['processed', 'approved', 'rejected'].includes(s.status)) return { ok: false, reason: 'the session is not processed' };
      if (norm(ev.user) !== by(s.processed_by)) return { ok: false, reason: 'processed by another user' };
      return { ok: true, session: s };
    }
    if (ev.event === 'signed') {
      if (s.status !== 'approved') return { ok: false, reason: 'the session is not signed' };
      if (norm(ev.user) !== norm(s.signed_by)) return { ok: false, reason: 'signed by another user' };
      return { ok: true, session: s, signed_by: s.signed_by };
    }
    if (ev.event === 'rejected') return s.status === 'rejected' ? { ok: true, session: s } : { ok: false, reason: 'the session is not rejected' };
    return { ok: false, reason: 'unknown event' };
  }
  // A person enters an authorization on the Lauris Authorizations page (site.js calls this). Psyflo never calls it: units are typed by a person.
  // The earlier authorization stays in the consumer's authorization history (Lauris keeps it; nothing is overwritten silently).
  setAuthorization(no, { units, payer, start, end, by }) {
    const c = this.consumer(no); if (!c) throw new LaurisError('No such consumer', 404);
    const n = /^\d+$/.test(String(units ?? '').trim()) ? parseInt(units, 10) : NaN;
    if (!(n > 0)) throw new LaurisError('Enter the number of units (a whole number).');
    if (n > 2000) throw new LaurisError('That many units is not plausible. Check the number.');
    const iso = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));
    if (start && !iso(start)) throw new LaurisError('Enter the start date as a date.');
    if (end && !iso(end)) throw new LaurisError('Enter the end date as a date.');
    const s0 = start || this.db.today;
    if (end && end < s0) throw new LaurisError('The end date is before the start date.');
    // the payer: what the person chose, else the consumer's current authorization, else the plan on the consumer's record (the form requires one; the mock does not refuse a script that omits it)
    const planKey = Object.keys(PAYER).find(k => PAYER[k] === c.medicaid_plan) || '';
    const pn = payer || c.auth?.payer || planKey || '';
    if (pn && !PAYER[pn]) throw new LaurisError('Choose a payer from the list.');
    if (c.auth && c.auth.units) { c.auth_history = c.auth_history || []; c.auth_history.push({ ...c.auth, replaced_on: this.db.today }); }
    c.auth = { payer: pn, payer_name: PAYER[pn] || '', units: n, used: 0, available: n, start_us: US(s0), end_us: US(end || ''), entered_by: by || '', entered_on: this.stamp(), entry: this.db.nextAuth++ };
    c.updated = this.db.today; this.save(); return c;
  }
  // A person saves a Time Tracker entry (the Lauris Time page). Entries are kept as they are typed; Lauris does not turn them into units.
  saveTime({ no, date, start, end, minutes, activity, objective, by }) {
    const c = this.consumer(no); if (!c) throw new LaurisError('No such consumer', 404);
    if (!/^\d{1,2}:\d{2}/.test(String(start || '')) || !/^\d{1,2}:\d{2}/.test(String(end || ''))) throw new LaurisError('Enter the start and end as times, like 13:10.');
    const m = x => { const [h, mi] = String(x).split(':'); return +h * 60 + +mi; };
    const mm = minutes !== undefined && String(minutes).trim() !== '' ? parseInt(minutes, 10) : m(end) - m(start);
    if (!(m(end) > m(start))) throw new LaurisError('The end must be after the start.');
    if (!(mm > 0)) throw new LaurisError('Enter the minutes.');
    if (!String(activity || '').trim()) throw new LaurisError('Say what the activity was.');
    const e = { id: this.db.nextTime++, no: c.no, date: this.db.today, start: String(start).slice(0, 5), end: String(end).slice(0, 5), minutes: mm, activity: String(activity).trim(), objective: objective || '', by, saved_at: this.stamp() };
    this.db.time.push(e); c.updated = this.db.today; this.save(); return e;
  }
  // whole mock database for tests (DEMO_TEST=1 only; the route refuses otherwise)
  snapshot() { return JSON.parse(JSON.stringify(this.db)); }
  // scenario hook: s3 puts T.W.'s initial SRA back to "not yet processed"
  scenario(id) {
    if (id === 's3') {
      this.db.sessions = this.db.sessions.filter(x => !(x.no === 4492 && x.form === 'sra-initial'));
      const c = this.consumer(4492); if (c) c.active_file = c.active_file.filter(f => f.form !== 'sra-initial');
      this.save();
    }
  }
}

export const lauris = new LaurisDB();
export { US, LaurisError, PAYER };
