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
const STAFF = { khale: 'K. Hale', slane: 'S. Lane', rowens: 'R. Owens', jreyes: 'J. Reyes', jperez: 'J. Perez, LPC', cdiaz: 'C. Diaz', dowens: 'D. Owens' };

function build(preset) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'seed', 'seed.json'), 'utf8'));
  // students added in seed/extra are in Harvest's Lauris too
  const extraDir = path.join(ROOT, 'seed', 'extra');
  if (fs.existsSync(extraDir)) for (const f of fs.readdirSync(extraDir).filter(f => f.endsWith('.json')).sort()) {
    const x = JSON.parse(fs.readFileSync(path.join(extraDir, f), 'utf8'));
    if (Array.isArray(x.clients)) seed.clients = seed.clients.concat(x.clients.filter(c => !seed.clients.some(y => y.id === c.id)));
  }
  const schools = Object.fromEntries(seed.schools.map(s => [s.id, s]));
  const db = { preset, today: seed.today, todayUS: US(seed.today), nextSession: 1000, consumers: [], sessions: [], users: seed.staff.map(s => ({ id: s.id, name: STAFF[s.id] || s.name, role: s.role })) };
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

class LaurisDB {
  constructor() {
    if (fs.existsSync(FILE)) { try { this.db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { this.db = build('live'); } }
    else this.db = build('live');
  }
  reset(preset) { this.db = build(preset); this.save(); }
  save() { fs.writeFileSync(FILE, JSON.stringify(this.db)); }
  consumer(no) { return this.db.consumers.find(c => String(c.no) === String(no)); }
  session(id) { return this.db.sessions.find(s => String(s.id) === String(id)); }
  user(id) { return this.db.users.find(u => u.id === id); }
  stamp() { const d = new Date(); return `${this.db.today}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
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
  saveSession({ id, no, form, values, staff, process }) {
    let s = id ? this.session(id) : null;
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
        if (form === 'dpn' && c.auth && c.auth.available != null) { const u = parseInt(values['Units'], 10) || 0; c.auth.available = Math.max(0, c.auth.available - u); if (c.auth.used != null) c.auth.used += u; }
      }
    }
    this.save();
    return s;
  }
  sign(id, by) { const s = this.session(id); s.status = 'approved'; s.signed_by = by; s.signed_at = this.stamp(); this.save(); return s; }
  reject(id, by, note) { const s = this.session(id); s.status = 'rejected'; s.rejected_by = by; s.reject_note = note; s.rejected_at = this.stamp(); this.save(); return s; }
  saveSurvey(no, instrument, answers, by) {
    const c = this.consumer(no); const score = Object.values(answers).reduce((a, b) => a + (Number(b) || 0), 0);
    c.surveys = c.surveys || []; c.surveys.push({ instrument, answers, score, date: this.db.today, by }); this.save(); return score;
  }
}

export const lauris = new LaurisDB();
export { US };
