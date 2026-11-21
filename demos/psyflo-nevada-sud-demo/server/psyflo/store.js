// Psyflo's own store. It never reads or writes Client Record data: anything Psyflo knows about
// Client Record arrives through the extension panel, which reads the page the user has open.
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

// Build the store from the seed. preset 'live' rewinds T.W. to the moment the Clark County drug court referred him
// (Oct 13), so the eligibility check, intake screening, ASAM assessment, treatment plan and Level 2.1 prior
// authorization are built in front of the audience. preset 'canvas' is the Oct 29 snapshot exactly as the design canvas shows it.
export function buildState(preset = 'live') {
  const seed = loadSeed();
  const s = {
    preset, rev: 1, today: seed.today, org: seed.org, schools: seed.schools, roles: seed.roles,
    staff: seed.staff, school_users: seed.school_users, payers: seed.payers, interventions: seed.interventions,
    clients: seed.clients, referrals: seed.referrals, requests: seed.requests,
    notes: seed.notes || [], notes_sample: seed.notes_sample || [], incidents: seed.incidents || [],
    checkins: (seed.school_checkins || []).map(c => ({ ...c, role: 'referral_partner' })).concat(seed.guardian_checkins || []),
    shares: seed.shares || [],
    counselor_counts: seed.counselor_counts || [], analytics_baseline: seed.analytics_baseline,
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
  return s;
}

// What the drug court sent with T.W.'s referral: enough for a person to run the Nevada Medicaid (EVS) lookup.
// Synthetic ID; there is no family link in the Nevada build (clients are adults and are called directly).
const TW_LOOKUP = { medicaid_id: '99900449201', dob: '1992-03-14', plan_kind: 'Nevada Medicaid (per the drug court referral)', name: 'Travis T.W.' };

function applyCanvas(s) {
  const tw = s.clients.find(c => c.id === 'TW');
  const t = tw.timeline;
  s.eligibility.push({ referral: 'REF-118', client: 'TW', status: 'recorded', details_at: '2026-10-13T14:18', lookup: TW_LOOKUP, checked_at: t.eligibility_checked, checked_by: 'jperez', result: 'active', plan: 'humana', effective: '2026-07-01', screenshot: 'EVS_TW_2026-10-15.png', next_check: '2026-11-05' });
  s.consents.push({ client: 'TW', form: 'Consent for treatment', signed_at: '2026-10-19T10:20', signer: 'Travis W.', file: null, status: 'signed' });
  s.consents.push({ client: 'TW', form: 'Release of information · drug court (42 CFR Part 2)', signed_at: '2026-10-13T11:05', signer: 'Travis W.', file: null, status: 'signed' });
  const transcript = fs.readFileSync(path.join(SEED, 'scripts', 'screening_TW.txt'), 'utf8');
  const sd = draftScreening({ transcript, today: '2026-10-16', guardianPhone: tw.phone || '', referral: s.referrals.find(r => r.id === 'REF-118') });
  s.screenings.push({ referral: 'REF-118', client: 'TW', who: 'jperez', when: t.screening, status: 'done', transcript, facts: sd.facts, boxes: sd.boxes });
  tw.lauris_no = 4492;
  const r = s.referrals.find(r => r.id === 'REF-118');
  r.family_link = { sent: false, opened: false, submitted: false, not_used: true };
  r.eligibility = 'active · SilverSummit';
  r.screening = { who: 'jperez', when: t.screening };
  const ev = (at, what, who, record) => s.events.push({ at, what, who, record });
  ev('2026-10-13T14:18', 'Referral received from R. Bell (Clark County drug court case manager) · case summary and Part 2 release attached', 'rbell', 'REF-118');
  ev(t.eligibility_checked, 'Eligibility recorded · active · SilverSummit Healthplan (Nevada Medicaid EVS screenshot stored)', 'jperez', 'REF-118');
  ev(t.screening, 'Intake screening call · boxes drafted, saved in Client Record', 'jperez', 'REF-118');
  ev('2026-10-19T10:20', 'Consent for treatment signed at the clinic', 'Travis W.', 'TW');
  ev('2026-10-20T11:52', 'ASAM assessment saved in Client Record · recommended Level 2.1 · UDS collected at the assessment', 'jperez', 'TW');
  ev('2026-10-22T13:58', 'Level 2.1 prior authorization saved in Client Record · SilverSummit packet: assessment-day UDS attached', 'jperez', 'R-0416');
  ev(t.sra_signed, 'Signed in Client Record · signed PDF saved', 'jperez', 'R-0416');
  ev(t.sent, 'Send pressed · faxed through Sfax · ref F-2291', 'jperez', 'R-0416');
  ev('2026-10-22T14:09', 'Sfax delivery receipt · 11 pages', 'Sfax', 'R-0416');
  ev('2026-10-27T10:12', 'Receipt confirmed by phone (SilverSummit) · C. Diaz', 'cdiaz', 'R-0416');
}

function applyLive(s) {
  // T.W. as the drug court referred him on Oct 13: Medicaid ID on the referral, not yet checked, not yet in Client Record.
  const tw = s.clients.find(c => c.id === 'TW');
  Object.assign(tw, { stage: 'referral', medicaid: null, diagnosis: null, goals: [], asam: null, service_start: null, timeline: { referral: '2026-10-13' } });
  const r = s.referrals.find(r => r.id === 'REF-118');
  r.stage = 'needs_screening';
  r.next = 'Run the Nevada Medicaid (EVS) eligibility check';
  r.family_link = { sent: false, opened: false, submitted: false, not_used: true };
  r.eligibility = null;
  s.eligibility.push({ referral: 'REF-118', client: 'TW', status: 'details_received', details_at: '2026-10-13T14:18', lookup: TW_LOOKUP });
  s.requests = s.requests.filter(q => q.id !== 'R-0416');
  s.events.push({ at: '2026-10-13T14:18', what: 'Referral received from R. Bell (Clark County drug court case manager) · case summary and Part 2 release attached', who: 'rbell', record: 'REF-118' });
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
