// Role projection of /api/state (review/05 DS-1, E7): the server sends each actor only what the capability matrix lets them see.
// DEMO-GRADE: identity is a session token, but nothing outside a role's projection reaches the browser's network tab.
//
// Rules of thumb (see permissions.js MATRIX):
//   clinician          everything TDT (clinical text included); non-TDT service lines (outpatient, SEBS) are never in the state
//   supervisor         status, units and the notes of their own reviewees; no screening/CNA/ISP/SRA drafts, no evidence text
//   direct_support     own caseload only: own notes, dictations, timers, balances
//   admin              authorization status, unit balances, aggregates, users, rules, audit; NO clinical text (notes.view = N)
//   guardian           one child, plain fields, own letters        school   own school's referrals and short updates
// Every key of the stored state is present in the projection (empty when withheld) so screens render honest empty states.
// A key nobody declared here is passed through to clinicians only; other roles get it empty. Declare new keys with
// registerProjection(key, { staff: fn(s, actor, value) | true | false, ...}) or `export const projection = {...}` in an action file.
import { can } from '../../web/js/shared/permissions.js';

const EXTRA = {};
export function registerProjection(map) { Object.assign(EXTRA, map); }

const isArr = Array.isArray;
const pick = (o, keys) => { const r = {}; for (const k of keys) if (o && k in o) r[k] = o[k]; return r; };
const omit = (o, keys) => { const r = { ...o }; for (const k of keys) delete r[k]; return r; };
const byId = (arr, id) => (arr || []).find(x => x.id === id);

// phone numbers and quoted text are masked for roles without note access (DS-7)
const maskText = t => String(t || '').replace(/\(?\d{3}\)?[ -]\d{3}-\d{4}/g, '(***) ***-****').replace(/"[^"]{3,}"/g, '"…"');
const nonTdt = c => c && c.service_line && c.service_line !== 'tdt';

export function projectState(s, actor) {
  const out = {};
  const role = actor ? actor.role : null;
  const staffLike = actor && actor.kind === 'staff';
  const clin = staffLike && can(actor, 'notes.view') && role === 'clinician';
  const hiddenClients = new Set((s.clients || []).filter(nonTdt).map(c => c.id));
  const hiddenRecords = new Set([...hiddenClients, ...(s.requests || []).filter(r => nonTdt(r) || hiddenClients.has(r.client)).map(r => r.id)]);
  const myCaseload = new Set(actor && actor.caseload || []);
  const visibleClient = id => !hiddenClients.has(id);
  const rid = r => r && r.client;

  // ---- per-key policies ----
  const P = {
    // reference data every signed-in actor needs
    preset: v => v, rev: v => v, today: v => v, clock: v => v, org: v => v, schools: v => v, roles: v => v, payers: v => staffLike || actor ? (v || []).map(p => actor && actor.role === 'guardian' ? pick(p, ['id', 'name']) : p) : [], interventions: v => staffLike ? v : [],
    school_users: v => (v || []).map(u => actor && actor.role === 'school' ? { id: u.id, name: u.name, role: u.role, school: u.school } : pick(u, ['id', 'name', 'role', 'school'])),
    staff: v => (v || []).map(x => can(actor, 'admin.users') || clin ? omit(x, []) : omit(x, ['designations', 'signs_requests', 'review_reason'])),
    rules: v => !actor ? [] : actor.role === 'guardian' ? (v || []).filter(r => /^(signature\.mode\.|family_link\.)/.test(r.key)) : actor.role === 'school' ? [] : v,
    scenarios: v => actor && can(actor, 'demo.controls') ? v : [],
    crosswalk: v => actor && can(actor, 'demo.controls') ? v : {},

    clients: v => (v || []).filter(c => !nonTdt(c)).map(c => clientView(c)).filter(Boolean),
    requests: v => (v || []).filter(r => !hiddenRecords.has(r.id) && !hiddenClients.has(r.client)).map(r => requestView(r)).filter(Boolean),
    notes: v => (v || []).filter(n => !hiddenClients.has(n.client)).map(n => noteView(n)).filter(Boolean),
    notes_sample: v => clin || (staffLike && role === 'supervisor') ? v : [],
    events: v => (v || []).filter(e => !hiddenRecords.has(e.record)).map(e => eventView(e)).filter(Boolean),

    referrals: v => clin ? v : actor && actor.role === 'school' ? (v || []).filter(r => r.school === actor.school).map(r => omit(r, [])) : actor && actor.role === 'guardian' ? (v || []).filter(r => r.client === actor.client || (byId(s.clients, actor.client) || {}).referral === r.id).map(r => pick(r, ['id', 'client', 'school', 'stage', 'next', 'received', 'family_link', 'screening', 'eligibility', 'screening_offer'])) : [],
    family_links: v => clin ? v : actor && actor.role === 'guardian' ? (v || []).filter(f => f.client === actor.client) : [],
    eligibility: v => clin || (staffLike && can(actor, 'eligibility.run')) ? v : actor && actor.role === 'guardian' ? (v || []).filter(e => e.client === actor.client).map(e => pick(e, ['referral', 'client', 'status'])) : [],
    consents: v => clin ? v : actor && actor.role === 'guardian' ? (v || []).filter(c => c.client === actor.client) : [],
    portal_tasks: v => clin ? v : actor && actor.role === 'guardian' ? (v || []).filter(c => c.client === actor.client) : [],
    enrollment: v => clin ? v : actor && actor.role === 'guardian' ? pick(v || {}, [actor.client]) : {},
    enrollment_packet: v => clin || (actor && actor.role === 'guardian') ? v : [],
    parent_progress: v => clin ? v : actor && actor.role === 'guardian' ? pick(v || {}, [actor.client]) : {},
    appeal_drafts: v => clin ? v : actor && actor.role === 'guardian' ? pick(v || {}, [actor.client]) : {},
    appeals: v => clin ? v : [],
    checkins: v => clin ? v : actor && actor.role === 'guardian' ? (v || []).filter(c => c.client === actor.client) : actor && actor.role === 'school' ? (v || []).filter(c => visibleSchoolClient(c.client)) : [],
    shares: v => clin ? v : actor && actor.role === 'school' ? (v || []).filter(x => visibleSchoolClient(x.client)) : staffLike && role === 'direct_support' ? (v || []).filter(x => myCaseload.has(x.client)) : [],
    counselor_counts: v => clin || (actor && actor.role === 'school') ? v : [],
    school_numbers: v => clin || (actor && actor.role === 'school') ? v : {},
    school_goals: v => clin || (actor && actor.role === 'school') ? v : {},
    teacher_students: v => clin || (actor && actor.role === 'school') ? v : {},
    incidents: v => clin ? v : staffLike && role === 'supervisor' ? (v || []).map(i => pick(i, ['client', 'school', 'level', 'date', 'status', 'state_portal_due', 'state_portal_filed', 'lauris_processed'])) : [],

    // clinical drafting material: drafts.clinical / notes.view only
    screenings: v => clin ? v : [], drafts: v => clin ? v : [], fills: v => clin ? v : [], lauris_versions: v => clin ? v : [], lauris_seen: v => clin ? v : [],
    panel_feedback: v => clin ? v : [], internal_quarterlies: v => clin ? v : [], plans: v => clin || (staffLike && can(actor, 'auth.status') && role !== 'direct_support') ? (role === 'clinician' ? v : (v || []).map(p => pick(p, ['request', 'client', 'discharge', 'intake', 'new_initial', 'at']))) : [],
    request_details: v => clin ? v : {}, payer_history: v => clin || (staffLike && can(actor, 'analytics.aggregate')) ? v : [], denial_reasons: v => clin || (staffLike && can(actor, 'analytics.aggregate')) ? v : [],
    dictations: v => clin ? v : staffLike && role === 'direct_support' ? (v || []).filter(d => d.staff === actor.id) : [],
    assessments: v => clin ? v : staffLike && role === 'direct_support' ? (v || []).filter(a => myCaseload.has(a.client)) : [],
    assessments_due: v => clin ? v : staffLike && role === 'direct_support' ? (v || []).filter(a => myCaseload.has(a.client || a.id)) : [],
    assessment_history: v => clin ? v : [],
    timers: v => clin ? v : staffLike && role === 'direct_support' ? pick(v || {}, [actor.id]) : {},
    reminders: v => staffLike ? (role === 'clinician' ? v : (v || []).filter(r => r.for === actor.id)) : [],
    files: v => (v || []).filter(f => canReadFile(f)),
    review: v => staffLike && (role === 'clinician' || role === 'supervisor') ? v : [],

    // office and aggregates
    settings: v => staffLike ? v : actor && actor.role === 'guardian' ? pick(v || {}, ['family_link']) : {},
    library: v => staffLike && (role === 'admin' || role === 'clinician') ? v : [],
    migration: v => staffLike && (role === 'admin' || role === 'clinician') ? v : {},
    compliance: v => staffLike && role !== 'direct_support' ? v : {},
    exports: v => staffLike && (role === 'admin' || role === 'clinician') ? v : [],
    analytics_baseline: v => staffLike && can(actor, 'analytics.aggregate') ? v : {},
    staff_dashboard: v => staffLike && role !== 'direct_support' ? v : staffLike ? { ...v, staff: pick((v || {}).staff || {}, [actor.id]) } : {}
  };

  function visibleSchoolClient(id) { const c = byId(s.clients, id); return !!c && c.school === actor.school; }
  function canReadFile(f) {
    if (!actor) return false;
    if (f.record && hiddenRecords.has(f.record)) return false;
    if (clin) return true;
    if (actor.role === 'guardian') { const r = byId(s.requests, f.record); return f.record === actor.client || (r && r.client === actor.client && f.kind === 'appeal'); }
    if (staffLike && can(actor, 'send.packet') && ['fax_receipt', 'signed_pdf'].includes(f.kind)) return true;
    if (staffLike && can(actor, 'eligibility.run') && f.kind === 'eligibility_proof') return true;
    return false;
  }
  function clientView(c) {
    if (!actor) return null;
    if (clin) return c;
    const base = pick(c, ['id', 'initials', 'first_name', 'age', 'grade', 'school', 'stage', 'staff', 'harvest_no', 'lauris_no', 'service_start', 'authorization', 'referral', 'service_line']);
    if (staffLike && role === 'direct_support') return myCaseload.has(c.id) ? { ...pick(c, ['id', 'initials', 'first_name', 'age', 'grade', 'school', 'stage', 'staff', 'harvest_no', 'lauris_no', 'service_start', 'authorization', 'referral', 'goals', 'guardian', 'iep', 'clock30_start', 'service_line']) } : null;
    if (staffLike && role === 'supervisor') return myCaseload.has(c.id) ? { ...base, goals: c.goals, guardian: pick(c.guardian || {}, ['name']) } : base;
    if (staffLike && role === 'admin') return base;
    if (actor.role === 'guardian') return c.id === actor.client ? omit(c, ['diagnosis', 'medicaid', 'strengths', 'staff_notes', 'timeline', 'clock30_start']) : null;
    if (actor.role === 'school') return c.school === actor.school ? pick(c, ['id', 'initials', 'first_name', 'age', 'grade', 'school', 'stage', 'service_start']) : null;
    return null;
  }
  const REQ_STATUS = ['id', 'client', 'payer', 'channel', 'service', 'service_line', 'type', 'units_requested', 'units_offered', 'units_awarded', 'stage', 'dates', 'limit_30', 'drafted_at', 'processed_at', 'signed_at', 'signed_name', 'signed_by', 'signed_pdf', 'sent', 'sent_by', 'send_pressed_at', 'decision_due', 'fax_ref', 'portal_ref', 'pages', 'delivery_receipt', 'receipt_check', 'receipt_confirmed', 'receipt_by', 'overdue_notice_sent', 'overdue_notice_ref', 'info_requested_at', 'reply_due', 'reply_by', 'offer_call', 'p2p_at', 'denied_on', 'denial_reason', 'appeal_deadline', 'appeal_days_left', 'notice_date', 'renew_by', 'approval', 'approved_by', 'approved_at', 'decision_log', 'resends', 'early_discharge', 'stretch'];
  function requestView(r) {
    if (!actor) return null;
    if (clin) return r;
    if (staffLike && (role === 'supervisor' || role === 'admin')) { const v = pick(r, REQ_STATUS); if (r.p2p_outcome) v.p2p_outcome = pick(r.p2p_outcome, ['outcome', 'units', 'at']); return v; }
    if (actor.role === 'guardian' && r.client === actor.client) return pick(r, ['id', 'client', 'payer', 'type', 'stage', 'units_requested', 'units_offered', 'units_awarded', 'denied_on', 'denial_reason', 'appeal_deadline', 'appeal_days_left', 'notice_date', 'appeal']);
    return null;
  }
  function noteView(n) {
    if (!actor) return null;
    if (clin) return n;
    const meta = pick(n, ['id', 'client', 'staff', 'type', 'date', 'units', 'direct_time_min', 'review', 'reviewed_by', 'reviewed_at', 'processed_at', 'session']);
    if (staffLike && role === 'direct_support') return n.staff === actor.id ? n : null;
    if (staffLike && role === 'supervisor') return myCaseload.has(n.client) ? n : meta;
    if (staffLike && role === 'admin') return meta;
    return null;
  }
  function eventView(e) {
    if (!actor) return null;
    if (clin) return e;
    const x = omit(e, ['sms']); x.what = maskText(e.what);
    if (staffLike && role === 'direct_support') return (myCaseload.has(e.record) || e.who === actor.id) ? x : null;
    if (staffLike) return x;
    if (actor.role === 'school') { const r = byId(s.referrals, e.record); const c = byId(s.clients, e.record); return (r && r.school === actor.school) || (c && c.school === actor.school) ? x : null; }
    return null;
  }

  for (const key of Object.keys(s)) {
    const v = s[key];
    let fn = P[key];
    if (EXTRA[key]) { const spec = EXTRA[key]; fn = typeof spec === 'function' ? spec : (val => { const h = spec[role] !== undefined ? spec[role] : spec.default; return typeof h === 'function' ? h(s, actor, val) : h ? val : empty(val); }); }
    if (fn) out[key] = actor ? fn(v) : empty(v);
    else out[key] = clin ? v : empty(v);   // undeclared key: clinicians only
  }
  return out;
}
export function empty(v) { return isArr(v) ? [] : v && typeof v === 'object' ? {} : typeof v === 'string' ? '' : typeof v === 'number' ? 0 : null; }

// a state skeleton for the signed-out screens (Login needs the roster, nothing else)
export function publicState(s) {
  const out = {};
  for (const k of Object.keys(s)) out[k] = empty(s[k]);
  Object.assign(out, { preset: s.preset, rev: s.rev, today: s.today, clock: s.clock, org: s.org, schools: s.schools, roles: s.roles, public: true,
    staff: (s.staff || []).map(x => pick(x, ['id', 'name', 'initials', 'credential', 'title', 'role', 'sites'])),
    school_users: (s.school_users || []).map(u => pick(u, ['id', 'name', 'role', 'school'])) });
  return out;
}
