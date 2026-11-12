import { REDIRECTS_LIVE, ROUTES_LIVE } from './shared/redirects-live.js';
// The design canvas screens (0–45, keeping canvas numbers; 10, 30, 44 and 45 were dropped after the Nov 7 product call, 41 after Nov 8), in canvas order, then the family-portal screens built after it (46–50), with the surface each lives on and the
// lowest role that can open it. Levels are cumulative: direct support < supervisor < clinician < admin.
export const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };

// surface: app (Psyflo app, dark sidebar) · ext (Lauris + panel) · phone · parent · school · canvas
// min: lowest role level; 0 = no staff login needed (portals, sign-in, the audience reference)
export const SCREENS = [
  { n: 0, id: 'Login', surface: 'app', min: 0, title: 'Sign in' },
  { n: 1, id: 'WhereThingsLive', surface: 'canvas', min: 0, title: 'How it fits · where things live' },
  { n: 2, id: 'DoNext', surface: 'app', min: 3, title: 'Do next · clinician home' },
  { n: 3, id: 'SchoolPortal', surface: 'school', min: 0, title: 'School portal' },
  { n: 4, id: 'ReferralForm', surface: 'school', min: 0, title: 'Referral form (school)' },
  { n: 5, id: 'ReferralSent', surface: 'school', min: 0, title: 'Referral sent (school)' },
  { n: 6, id: 'Referrals', surface: 'app', min: 3, title: 'Referrals' },
  { n: 7, id: 'Referral', surface: 'app', min: 3, title: 'Referral review' },
  { n: 8, id: 'FamilyLink', surface: 'parent', min: 0, title: 'Family link (phone)' },
  { n: 9, id: 'Eligibility', surface: 'app', min: 3, title: 'Eligibility check' },
  { n: 11, id: 'ParentSign', surface: 'parent', min: 0, title: 'Parent signs (phone)' },
  { n: 12, id: 'ParentPortal', surface: 'parent', min: 0, title: 'Parent portal (phone)' },
  { n: 13, id: 'ExtHome', surface: 'ext', min: 1, title: 'Extension · home' },
  { n: 14, id: 'ExtScreening', surface: 'ext', min: 3, title: 'Extension · screening call' },
  { n: 15, id: 'ExtCNA', surface: 'ext', min: 3, title: 'Extension · intake / CNA' },
  { n: 16, id: 'ExtISP', surface: 'ext', min: 3, title: 'Extension · treatment plan' },
  { n: 17, id: 'ExtSRA', surface: 'ext', min: 3, title: 'Extension · initial SRA' },
  { n: 18, id: 'ExtSignOff', surface: 'ext', min: 3, title: 'Extension · sign-off (Forms to Approve)' },
  { n: 19, id: 'Submission', surface: 'app', min: 3, title: 'Sent · a person presses Send' },
  { n: 20, id: 'MobileApp', surface: 'phone', min: 1, title: 'Mobile app (phone)' },
  { n: 21, id: 'MobileDictate', surface: 'phone', min: 1, title: 'Say what happened (phone)' },
  { n: 22, id: 'MobileAssess', surface: 'phone', min: 1, title: 'Assessments (phone)' },
  { n: 23, id: 'ExtDPN', surface: 'ext', min: 1, title: 'Extension · daily note' },
  { n: 24, id: 'ExtWeekly', surface: 'ext', min: 1, title: 'Extension · weekly guardian call' },
  { n: 25, id: 'ExtMonthly', surface: 'ext', min: 1, title: 'Extension · monthly collateral' },
  { n: 26, id: 'ExtIncident', surface: 'ext', min: 1, title: 'Extension · incident report' },
  { n: 27, id: 'ReviewQueue', surface: 'app', min: 2, title: 'Supervisor review queue' },
  { n: 28, id: 'StaffDashboard', surface: 'app', min: 1, title: 'Staff dashboard' },
  { n: 29, id: 'Authorizations', surface: 'app', min: 3, title: 'Authorizations' },
  { n: 31, id: 'ParentSurvey', surface: 'parent', min: 0, title: 'Parent survey (phone)' },
  { n: 32, id: 'ExtQuarterly', surface: 'ext', min: 3, title: 'Extension · quarterly report' },
  { n: 33, id: 'ExtCase', surface: 'ext', min: 3, title: 'Extension · continued stay' },
  { n: 34, id: 'InfoRequest', surface: 'app', min: 3, title: 'Information request' },
  { n: 35, id: 'Partials', surface: 'app', min: 3, title: 'Partials & denials' },
  { n: 36, id: 'EarlyDischarge', surface: 'app', min: 3, title: 'Early discharge' },
  { n: 37, id: 'ExtDischarge', surface: 'ext', min: 3, title: 'Extension · discharge summary' },
  { n: 38, id: 'PeerBrief', surface: 'app', min: 3, title: 'Peer-to-peer call notes' },
  { n: 39, id: 'AppealLetter', surface: 'parent', min: 0, title: 'Appeal letter (guardian phone)' },
  { n: 40, id: 'PayerPlaybook', surface: 'app', min: 3, title: 'Payer playbook' },
  { n: 42, id: 'Analytics', surface: 'app', min: 3, title: 'Analytics' },
  { n: 43, id: 'Users', surface: 'app', min: 4, title: 'Users & roles' },
  { n: 46, id: 'ParentEnroll', surface: 'parent', min: 0, title: 'Enrollment packet (phone)' },
  { n: 47, id: 'ParentProgress', surface: 'parent', min: 0, title: 'Progress · family view (phone)' },
  { n: 48, id: 'ParentQuarterly', surface: 'parent', min: 0, title: 'Quarterly report · guardian signs (phone)' },
  { n: 49, id: 'ParentLetters', surface: 'parent', min: 0, title: 'Insurance letters, explained (phone)' },
  { n: 50, id: 'ParentSchedule', surface: 'parent', min: 0, title: 'Book the first call or the intake (phone)' },
  // ---- routes of the unified platform (pre-registered with stub screens; see ROUTES_LIVE in shared/redirects-live.js) ----
  { n: 51, id: 'MyWork', surface: 'app', min: 1, title: 'My Work', isNew: true },
  { n: 52, id: 'Authorization', surface: 'app', min: 2, title: 'Authorization case', isNew: true },
  { n: 53, id: 'DenialIntelligence', surface: 'app', min: 3, title: 'Denial Intelligence', isNew: true },
  { n: 54, id: 'DenialCase', surface: 'app', min: 3, title: 'Denial case', isNew: true },
  { n: 55, id: 'Settings', surface: 'app', min: 4, title: 'Settings', isNew: true },
  { n: 56, id: 'UiKit', surface: 'app', min: 1, title: 'UI kit (presenter)', isNew: true, presenter: true },
  // ---- patient-first screens (feedback round Nov 11): the roster every role starts from, the documentation queue, the patient chart ----
  { n: 57, id: 'Dashboard', surface: 'app', min: 1, title: 'Dashboard', isNew: true },
  { n: 58, id: 'Documentation', surface: 'app', min: 2, title: 'Documentation', isNew: true },
  { n: 59, id: 'Patient', surface: 'app', min: 1, title: 'Patient chart', isNew: true }
];
export const BY_ID = Object.fromEntries(SCREENS.map(s => [s.id, s]));

// ---------- live flags ----------
// A route is live when its screen is built. Old routes are always live; a pre-registered new route is live only when
// ROUTES_LIVE says so (shared/redirects-live.js, flipped by the engineer who builds it).
export const isLive = id => !(id in ROUTES_LIVE) || ROUTES_LIVE[id] === true;

// ---------- redirect table ----------
// Applied by route() and hrefFor() BEFORE the BY_ID check, so every historic id and deep link keeps working:
//   { from, to, flag, when?(params, ctx), params:{fixed}, carry:['id',…], rename:{old:'new'}, map?(params, ctx) -> params, presenter? }
// A redirect fires only when REDIRECTS_LIVE[flag] === true (shared/redirects-live.js). With the flag off the old screen keeps
// working. `legacy=1` in the query always bypasses a redirect ("open the old screen"). review/04-architecture.md E1, 03-ux-audit.md e.
// Never redirect Referrals, Referral or Eligibility away from the referral workspace; AppealLetter stays a guardian route.
const pick = (p, keys = []) => Object.fromEntries(keys.filter(k => p && p[k] != null && p[k] !== '').map(k => [k, p[k]]));
const rename = (p, m = {}) => Object.fromEntries(Object.entries(m).filter(([o]) => p && p[o] != null && p[o] !== '').map(([o, n]) => [n, p[o]]));
// the filters the Documentation tab read; they travel with the redirect to Dashboard?view=documents
const DOC_PARAMS = ['status', 'type', 'group', 'staff', 'q', 'site', 'due', 'from', 'to', 'sort', 'dir', 'id', 'page', 'size'];
export const REDIRECTS = [
  // My Work became the patient roster (Dashboard) and the documentation queue; in R4 the Documentation tab became the Dashboard's Documents view
  // (?view=documents; By staff is ?view=staff), so Documentation, ReviewQueue and My Work's review and team sections all land on the Dashboard
  { from: 'DoNext', to: 'Dashboard', flag: 'DoNext' },
  { from: 'Documentation', to: 'Dashboard', flag: 'Documentation', map: p => ({ ...pick(p, DOC_PARAMS), view: p.view === 'staff' ? 'staff' : 'documents' }) },
  { from: 'ReviewQueue', to: 'Dashboard', flag: 'ReviewQueue', params: { view: 'documents', status: 'pending_review' } },
  { from: 'StaffDashboard', to: 'Dashboard', flag: 'StaffDashboard', map: p => pick(p, ['staff']) },
  { from: 'MyWork', to: 'Referrals', flag: 'MyWork', when: p => p.section === 'referrals' },
  { from: 'MyWork', to: 'Dashboard', flag: 'MyWork', when: p => p.section === 'review' || p.section === 'team', map: p => ({ ...pick(p, ['id', 'staff']), ...(p.section === 'team' ? { view: 'staff' } : { view: 'documents', status: 'pending_review' }) }) },
  { from: 'MyWork', to: 'Dashboard', flag: 'MyWork', map: p => pick(p, ['staff']) },
  { from: 'Users', to: 'Settings', flag: 'Users', params: { tab: 'people' } },
  { from: 'Authorizations', to: 'Authorization', flag: 'Authorizations', when: p => !!p.id, carry: ['id'] },
  { from: 'Submission', to: 'Authorization', flag: 'Submission', when: p => !!p.id, carry: ['id'], params: { section: 'submission' } },
  { from: 'EarlyDischarge', to: 'Authorization', flag: 'EarlyDischarge', when: p => !!p.id, carry: ['id'], params: { section: 'transition' } },
  { from: 'InfoRequest', to: 'DenialCase', flag: 'InfoRequest', when: p => !!p.id, carry: ['id'], params: { section: 'action', action: 'info' } },
  { from: 'Partials', to: 'DenialCase', flag: 'Partials', when: p => !!p.id, carry: ['id'], params: { section: 'action', action: 'options' } },
  { from: 'Partials', to: 'DenialIntelligence', flag: 'Partials', when: p => !p.id, params: { decision: 'partial' } },
  { from: 'PeerBrief', to: 'DenialCase', flag: 'PeerBrief', when: p => !!p.id, carry: ['id'], params: { section: 'action', action: 'p2p' } },
  { from: 'PayerPlaybook', to: 'Analytics', flag: 'PayerPlaybook', params: { section: 'payer', panel: 'guidance' } },
  { from: 'Eligibility', to: 'Referral', flag: 'Eligibility', map: p => ({ ...rename(p, { referral: 'id', id: 'id' }), panel: 'eligibility' }) },
  { from: 'WhereThingsLive', to: '@presenter', flag: 'WhereThingsLive', when: p => p.full !== '1', params: { present: 'architecture' }, presenter: 'architecture' }
];
// resolveRoute({ id, params }, { role }) -> { id, params, redirectedFrom? , presenter? }
export function resolveRoute(r, ctx = {}) {
  if (!r || (r.params && r.params.legacy === '1')) return r;
  for (const red of REDIRECTS) {
    if (red.from !== r.id || REDIRECTS_LIVE[red.flag] !== true) continue;
    if (red.when && !red.when(r.params || {}, ctx)) continue;
    const params = red.map ? red.map(r.params || {}, ctx) : { ...pick(r.params, red.carry), ...(red.params || {}) };
    return { id: red.to, params, redirectedFrom: r.id, ...(red.presenter ? { presenter: red.presenter } : {}) };
  }
  return r;
}

// While a new route is not live, the old screen that does its job: legacyFor({ id:'Authorization', params:{ id, section:'submission' } }) -> Submission?id.
// Used by the presenter dock (scenarios may start on a new route) so a scenario never lands on a stub. Live routes pass through.
const LEGACY_DEFAULT = { Dashboard: 'MyWork', Documentation: 'MyWork', Patient: 'MyWork', MyWork: 'DoNext', Authorization: 'Authorizations', DenialIntelligence: 'Partials', DenialCase: 'Partials', Settings: 'Users' };
export function legacyFor(r) {
  if (!r || isLive(r.id)) return r;
  const p = r.params || {};
  const hits = REDIRECTS.filter(x => x.to === r.id && !x.map && x.params && Object.entries(x.params).every(([k, v]) => p[k] === v) && Object.keys(x.params).length)
    .sort((a, b) => Object.keys(b.params).length - Object.keys(a.params).length);
  const from = hits[0] ? hits[0].from : LEGACY_DEFAULT[r.id];
  if (!from) return r;
  const keep = ['id', 'staff', 'v'].filter(k => p[k]);
  return { id: from, params: Object.fromEntries(keep.map(k => [k, p[k]])) };
}

// Where each role lands after sign-in. Returns the route id (homeTarget also returns params).
export function homeTarget(role, narrow) {
  if (role === 'direct_support') return { id: narrow ? 'MobileApp' : 'ExtHome', params: {} };
  if ((role === 'supervisor' || role === 'clinician' || role === 'admin') && isLive('Dashboard')) return { id: 'Dashboard', params: {} };
  if (role === 'supervisor') return isLive('MyWork') ? { id: 'MyWork', params: { section: 'review' } } : { id: 'ReviewQueue', params: {} };
  if (role === 'clinician') return isLive('MyWork') ? { id: 'MyWork', params: { section: 'todo' } } : { id: 'DoNext', params: {} };
  return { id: 'Authorizations', params: {} };
}
export const homeFor = (role, narrow) => homeTarget(role, narrow).id;
