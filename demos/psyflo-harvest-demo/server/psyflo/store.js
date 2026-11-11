// Psyflo's own store. It never reads or writes Lauris data: anything Psyflo knows about
// Lauris arrives through the extension panel, which reads the page the user has open.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftScreening } from '../../web/js/shared/draft.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SEED = path.join(ROOT, 'seed');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const FILE = path.join(DATA, 'psyflo.json');
export const FILES_DIR = path.join(DATA, 'files');

const clone = o => JSON.parse(JSON.stringify(o));

function mergeExtra(base, extra) {
  for (const [k, v] of Object.entries(extra)) {
    if (k.startsWith('_')) continue;
    if (Array.isArray(v) && Array.isArray(base[k])) base[k] = base[k].concat(v);
    else if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = { ...base[k], ...v };
    else base[k] = v;
  }
}

export function loadSeed() {
  const seed = JSON.parse(fs.readFileSync(path.join(SEED, 'seed.json'), 'utf8'));
  const extraDir = path.join(SEED, 'extra');
  if (fs.existsSync(extraDir)) {
    for (const f of fs.readdirSync(extraDir).filter(f => f.endsWith('.json')).sort()) {
      mergeExtra(seed, JSON.parse(fs.readFileSync(path.join(extraDir, f), 'utf8')));
    }
  }
  return seed;
}

// Build the store from the seed. preset 'live' rewinds T.W. to the moment the school referred him,
// so Flows D → A → C build his story in front of the audience. preset 'canvas' is the Oct 29 snapshot
// exactly as the design canvas shows it.
export function buildState(preset = 'live') {
  const seed = loadSeed();
  const s = {
    preset, rev: 1, today: seed.today, org: seed.org, schools: seed.schools, roles: seed.roles,
    staff: seed.staff, school_users: seed.school_users, payers: seed.payers, interventions: seed.interventions,
    clients: seed.clients, referrals: seed.referrals, requests: seed.requests,
    notes: seed.notes || [], notes_sample: seed.notes_sample, incidents: seed.incidents,
    checkins: (seed.school_checkins || []).map(c => ({ ...c, role: 'teacher' })).concat(seed.guardian_checkins || []),
    shares: seed.shares || [],
    counselor_counts: seed.counselor_counts, analytics_baseline: seed.analytics_baseline,
    compliance: seed.compliance, migration: seed.migration,
    family_links: seed.family_links || [], eligibility: seed.eligibility || [],
    dictations: seed.dictations || [], assessments: seed.assessments || [], timers: seed.timers || {},
    consents: seed.consents || [], files: seed.files || [], reminders: seed.reminders || [], plans: seed.plans || [],
    portal_tasks: seed.portal_tasks || [], screenings: seed.screenings || [], exports: seed.exports || [],
    settings: seed.settings || {}, library: seed.library || [], review: seed.review || [], school_numbers: seed.school_numbers || {},
    drafts: seed.drafts || [], appeals: seed.appeals || [],
    events: seed.events || []
  };
  // any other top-level keys from seed/extra/*.json pass straight through
  for (const [k, v] of Object.entries(seed)) if (!(k in s) && !k.startsWith('_') && !['school_checkins', 'guardian_checkins'].includes(k)) s[k] = v;
  if (preset === 'canvas') applyCanvas(s); else applyLive(s);
  normalizeV2(s);
  return s;
}

// v2: one shape for clocks. Tracker details filled into requests, decision dates from the configured
// decision window (sent + decision_days), and no request shown as past due before that window has run.
export const DEFAULT_CLOCKS = { call_day: 10, decision_days: 14, public_standard_days: 7, isp_due_hours: 24, paperwork_due_days: 7, initial_sra_days: 30, restart_days: 30, unit_bands: { u1: 120, u2: 180, u3: 300 } };
function normalizeV2(s) {
  s.clocks = { ...DEFAULT_CLOCKS, ...(s.clocks || {}) };
  const day = x => String(x || '').slice(0, 10);
  const add = (d, n) => { const t = new Date(day(d) + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const diff = (a, b) => Math.round((new Date(day(b) + 'T00:00:00Z') - new Date(day(a) + 'T00:00:00Z')) / 86400000);
  for (const r of s.requests) {
    const fill = s.request_details && s.request_details[r.id] && s.request_details[r.id].fill;
    if (fill) for (const [k, v] of Object.entries(fill)) if (r[k] === undefined) r[k] = v;
    if (r.sent) {
      r.decision_due = add(r.sent, s.clocks.decision_days);
      r.call_on = add(r.sent, s.clocks.call_day);
      if (r.stage === 'overdue' && diff(r.sent, s.today) < s.clocks.decision_days) r.stage = 'submitted';
    }
  }
}

function applyCanvas(s) {
  const tw = s.clients.find(c => c.id === 'TW');
  const t = tw.timeline;
  s.family_links.push({ referral: 'REF-118', client: 'TW', token: 'tw-demo', sent_at: '2026-10-13T15:02', opened_at: t.family_link_opened + 'T18:40', submitted_at: t.family_link_submitted,
    steps: { guardian: true, insurance: true, consent: true, best_time: true, transport: true },
    answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English', plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14', consent_record: 'yes', best_time: 'Afternoons after 2 pm', transport: 'Can get to the school' } });
  s.eligibility.push({ referral: 'REF-118', client: 'TW', status: 'recorded', details_at: t.family_link_submitted, checked_at: t.eligibility_checked, checked_by: 'jperez', result: 'active', plan: 'humana', effective: '2026-07-01', screenshot: 'DMAS_TW_2026-10-15.png', next_check: '2026-11-05' });
  s.consents.push({ client: 'TW', form: 'Consent for services', signed_at: '2026-10-19T19:20', signer: 'Denise Rivers', file: null, status: 'signed' });
  const transcript = fs.readFileSync(path.join(SEED, 'scripts', 'screening_TW.txt'), 'utf8');
  const sd = draftScreening({ transcript, today: '2026-10-16', guardianPhone: '(434) 555-0147', referral: s.referrals.find(r => r.id === 'REF-118') });
  s.screenings.push({ referral: 'REF-118', client: 'TW', who: 'jperez', when: t.screening, status: 'done', transcript, facts: sd.facts, boxes: sd.boxes });
  tw.lauris_no = 4492;
  const r = s.referrals.find(r => r.id === 'REF-118');
  r.family_link = { sent: true, opened: true, submitted: true };
  r.eligibility = 'active · Humana';
  r.screening = { who: 'jperez', when: t.screening };
  const ev = (at, what, who, record) => s.events.push({ at, what, who, record });
  ev('2026-10-13T14:18', 'Referral received from R. Bell (school counselor)', 'rbell', 'REF-118');
  ev('2026-10-13T15:02', 'Family link sent by text to the guardian', 'jperez', 'REF-118');
  ev(t.family_link_submitted, 'Family link submitted · insurance details received', 'Denise Rivers', 'REF-118');
  ev(t.eligibility_checked, 'Eligibility recorded · active · Humana (DMAS screenshot stored)', 'jperez', 'REF-118');
  ev(t.screening, 'Screening call · 19 boxes drafted, processed in Lauris', 'jperez', 'REF-118');
  ev('2026-10-19T19:20', 'Consent for services signed on the parent portal', 'Denise Rivers', 'TW');
  ev('2026-10-22T13:58', 'Initial SRA processed in Lauris', 'jperez', 'R-0416');
  ev(t.sra_signed, 'Signed in Lauris Forms to Approve · signed PDF saved', 'jperez', 'R-0416');
  ev(t.sent, 'Send pressed · faxed through Sfax · ref F-2291', 'jperez', 'R-0416');
  ev('2026-10-22T14:09', 'Sfax delivery receipt · 11 pages', 'Sfax', 'R-0416');
  ev('2026-10-27T10:12', 'Receipt confirmed by phone (Humana) · C. Diaz', 'cdiaz', 'R-0416');
}

function applyLive(s) {
  // T.W. as the school referred him on Oct 13: no family link, no eligibility, not yet in Lauris.
  const tw = s.clients.find(c => c.id === 'TW');
  Object.assign(tw, { stage: 'referral', medicaid: null, diagnosis: null, goals: [], service_start: null, timeline: { referral: '2026-10-13' } });
  const r = s.referrals.find(r => r.id === 'REF-118');
  r.stage = 'needs_screening';
  r.next = 'Send the family link';
  r.family_link = { sent: false, opened: false, submitted: false };
  r.eligibility = null;
  s.requests = s.requests.filter(q => q.id !== 'R-0416');
  s.events.push({ at: '2026-10-13T14:18', what: 'Referral received from R. Bell (school counselor)', who: 'rbell', record: 'REF-118' });
}

class Store {
  constructor() {
    this.actions = {};
    this.listeners = new Set();
    fs.mkdirSync(FILES_DIR, { recursive: true });
    fs.mkdirSync(DATA, { recursive: true });
    if (fs.existsSync(FILE)) {
      try { this.state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { this.state = buildState('live'); }
    } else this.state = buildState('live');
  }
  register(mod) { Object.assign(this.actions, mod); }
  save() {
    fs.writeFileSync(FILE, JSON.stringify(this.state));
  }
  changed() {
    this.state.rev = (this.state.rev || 0) + 1;
    this.save();
    for (const l of this.listeners) l(this.state);
  }
  reset(preset) {
    this.state = buildState(preset || 'live');
    for (const f of fs.readdirSync(FILES_DIR)) fs.unlinkSync(path.join(FILES_DIR, f));
    this.changed();
  }
  // wall-clock time on the store's "today", so stamps read like the story (Oct 29, 2:14 pm)
  now() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0'), ss = String(d.getSeconds()).padStart(2, '0');
    return `${this.state.today}T${hh}:${mm}:${ss}`;
  }
  event(what, who, record, extra = {}) {
    this.state.events.push({ at: this.now(), what, who, record, ...extra });
  }
  async run(name, args = {}, ctx = {}) {
    const fn = this.actions[name];
    if (!fn) throw new Error('Unknown action: ' + name);
    const result = await fn.call(this, this.state, args, ctx);
    this.changed();
    return result;
  }
  writeFile(name, buf) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const safe = name.replace(/[^\w.\-]+/g, '_');
    const fname = id + '__' + safe;
    fs.writeFileSync(path.join(FILES_DIR, fname), buf);
    return { id: fname, name: safe, url: '/files/' + fname };
  }
}

export const store = new Store();
export { clone };
