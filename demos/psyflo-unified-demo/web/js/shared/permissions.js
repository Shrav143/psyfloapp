// permissions.js - least-privilege model (pure ESM, imported by the server AND the browser).
// Source: review/05-safety-and-data-integrity.md section 5 matrix. DEMO-GRADE identity: the server resolves the
// actor from a session token (see server/psyflo/session.js); this file only answers "may this actor do X".
//
// Values in MATRIX:  Y = allowed   A = allowed for the actor's own caseload / own site / own records
//                    D = designated by an administrator and logged (user.designations includes the cap)
//                    N = never
// Fail closed: unknown role, unknown capability, missing user or an 'A' with a mismatching scope = false.

export const STAFF_ROLES = ['direct_support', 'supervisor', 'clinician', 'admin'];
export const PORTAL_ACTORS = ['guardian', 'school'];
export const ROLES = {
  direct_support: 'direct_support', supervisor: 'supervisor', clinician: 'clinician', admin: 'admin',
  guardian: 'guardian', school: 'school'
};
export const ROLE_LIST = Object.values(ROLES);
export const ROLE_LABEL = {
  direct_support: 'Direct support', supervisor: 'Site supervisor', clinician: 'Clinician (LMHP-type)',
  admin: 'Administrator', guardian: 'Guardian', school: 'School user'
};

// [capability, direct_support, supervisor, clinician, admin, guardian, school, matrix row (review/05 s5)]
const ROWS = [
  ['notes.own',          'A','N','Y','N','N','N', 'Daily, weekly, monthly notes and timer (own caseload)'],
  ['notes.review',       'N','Y','Y','N','N','N', 'Review trainee notes (not own)'],
  ['notes.view',         'A','A','Y','N','N','N', 'View clinical note text (admin: own grant, off by default)'],
  ['auth.status',        'A','Y','Y','Y','N','N', 'Unit balance and authorization status (no evidence text)'],
  ['drafts.clinical',    'N','N','Y','N','N','N', 'Screening, CNA, ISP, SRA drafts'],
  ['approve.sra',        'N','D','D','N','N','N', 'Internal approval of SRA'],
  ['sign.lauris',        'N','N','Y','N','N','N', 'Sign in Lauris (credential check, LMHP roster)'],
  ['send.packet',        'N','D','Y','D','N','N', 'Press Send, log receipt call'],
  ['payer.reply',        'N','N','Y','N','N','N', 'Info reply, peer-to-peer, accept or decline a partial'],
  ['payer.decision',     'N','D','Y','D','N','N', 'Record payer decision (with document reference)'],
  ['eligibility.run',    'N','D','Y','D','N','N', 'Eligibility lookup and record'],
  ['analytics.aggregate','N','A','Y','Y','N','N', 'Analytics, aggregate'],
  ['analytics.drilldown','N','N','A','N','N','N', 'Analytics drill-down to a child (own caseload)'],
  ['admin.settings',     'N','N','N','Y','N','N', 'Rules, settings'],
  ['admin.users',        'N','N','N','Y','N','N', 'Users and roles (two-person for clinical grants)'],
  ['demo.controls',      'D','D','D','D','N','N', 'Demo controls: presenter mode only (designation = session.presenter)'],
  // screen-level capabilities
  ['referrals',          'N','N','Y','N','N','N', 'Referral review and routing'],
  ['myWork',             'Y','Y','Y','Y','N','N', 'My Work home (sections are gated by the caps above)'],
  ['denials',            'N','N','Y','Y','N','N', 'Denial queue and case (admin sees status without clinical text)'],
  ['authorizations',     'N','Y','Y','Y','N','N', 'Authorization queue, case shell, unit tracker (no evidence text for supervisor/admin)'],
  ['scanEnhance',        'N','D','Y','N','N','N', 'Scan & Enhance, mode A (current draft)'],
  ['trackTime',          'A','N','Y','N','N','N', 'Track time and timer'],
  ['ext.use',            'Y','Y','Y','N','N','N', 'Lauris page panel (extension)'],
  ['notes.billing',      'N','N','Y','Y','N','N', 'Units, time rules view (no clinical text)'],
  // portal actors
  ['portal.guardian',    'N','N','N','N','Y','N', 'Guardian portal (token)'],
  ['guardian.progress',  'N','N','N','N','Y','N', 'Own child progress and letters'],
  ['guardian.sign',      'N','N','N','N','Y','N', 'Sign consent (mode per document)'],
  ['appeal.prepare',     'N','N','Y','N','N','N', 'Prepare an appeal letter'],
  ['appeal.sign',        'N','N','N','N','Y','N', 'Appeal letter review and signature (guardian)'],
  ['portal.school',      'N','N','N','N','N','Y', 'School portal (own school)'],
  ['school.referral',    'N','N','N','N','N','Y', 'Submit a referral, see status of own referrals, short update']
];

export const CAPS = Object.fromEntries(ROWS.map(r => [r[0], r[0]]));
export const CAP_LIST = ROWS.map(r => r[0]);
export const CAP_NOTE = Object.fromEntries(ROWS.map(r => [r[0], r[7]]));
const IDX = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4, guardian: 5, school: 6 };
export const MATRIX = Object.fromEntries(Object.keys(IDX).map(role => [role,
  Object.fromEntries(ROWS.map(r => [r[0], r[IDX[role]]]))]));

// Route id -> capability (null = public: needs no sign-in). Every route in web/js/registry.js plus the new routes.
export const ROUTE_CAPS = {
  Login: null, WhereThingsLive: null, UiKit: 'demo.controls',   // presenter-only gallery (a session needs presenter:true)
  // staff app
  MyWork: 'myWork', DoNext: 'myWork', ReviewQueue: 'notes.review', StaffDashboard: 'myWork',
  Authorizations: 'authorizations', Authorization: 'authorizations', EarlyDischarge: 'authorizations',
  Submission: 'send.packet',
  DenialIntelligence: 'denials', DenialCase: 'denials',
  InfoRequest: 'payer.reply', Partials: 'payer.reply', PeerBrief: 'payer.reply', PayerPlaybook: 'denials',
  Referrals: 'referrals', Referral: 'referrals', Eligibility: 'eligibility.run',
  Analytics: 'analytics.aggregate',
  Users: 'admin.users', Settings: 'admin.settings',
  // phone
  MobileApp: 'notes.own', MobileDictate: 'notes.own', MobileAssess: 'notes.own',
  // Lauris panel (extension) screens
  ExtHome: 'ext.use', ExtDPN: 'notes.own', ExtWeekly: 'notes.own', ExtMonthly: 'notes.own', ExtIncident: 'notes.own',
  ExtScreening: 'drafts.clinical', ExtCNA: 'drafts.clinical', ExtISP: 'drafts.clinical', ExtSRA: 'drafts.clinical',
  ExtSignOff: 'drafts.clinical', ExtQuarterly: 'drafts.clinical', ExtCase: 'drafts.clinical', ExtDischarge: 'drafts.clinical',
  // school portal
  SchoolPortal: 'portal.school', ReferralForm: 'portal.school', ReferralSent: 'portal.school',
  // guardian portal (phone, token)
  FamilyLink: 'portal.guardian', ParentSign: 'portal.guardian', ParentPortal: 'portal.guardian', ParentSurvey: 'portal.guardian',
  AppealLetter: 'portal.guardian', ParentEnroll: 'portal.guardian', ParentProgress: 'portal.guardian',
  ParentQuarterly: 'portal.guardian', ParentLetters: 'portal.guardian', ParentSchedule: 'portal.guardian'
};

const isGrant = v => v === 'Y' || v === 'A' || v === 'D';
const arr = x => Array.isArray(x) ? x : (x == null ? [] : [x]);

// can(user, cap, ctx): user = a staff record {id, role, designations?, presenter?, caseload?, site?} or a portal actor {role:'guardian'|'school', ...}
// ctx = {clientId, ownerId, caseload, site}. A: clientId must be in ctx.caseload / user.caseload; ownerId must be the user's id; site must be one of user.sites ('all' = every site). Fail closed.
export function can(user, cap, ctx) {
  if (!user || typeof user !== 'object' || !cap) return false;
  const role = user.role;
  const row = MATRIX[role];
  if (!row || !(cap in row)) return false;
  const v = row[cap];
  if (v === 'Y') return true;
  if (v === 'N') return false;
  if (v === 'D') {
    if (cap === 'demo.controls') return user.presenter === true;
    return arr(user.designations).includes(cap);
  }
  if (v === 'A') {
    if (!ctx || typeof ctx !== 'object') return true;      // no scope supplied: the capability exists; the caller scopes it
    let scoped = false;
    if (ctx.clientId != null) {
      scoped = true;
      const cl = ctx.caseload != null ? arr(ctx.caseload) : (user.caseload != null ? arr(user.caseload) : null);
      if (!cl || !cl.includes(ctx.clientId)) return false;
    }
    if (ctx.ownerId != null) {
      scoped = true;
      if (ctx.ownerId !== user.id) return false;
    }
    if (ctx.site != null) {
      scoped = true;
      const sites = user.sites === 'all' ? 'all' : arr(user.sites != null ? user.sites : user.site);
      if (sites !== 'all' && !sites.includes(ctx.site)) return false;
    }
    return scoped || true;
  }
  return false;
}

// routeAllowed(role, routeId [, user]): without a user, only Y and A grants open a route (a D grant needs the designation,
// so pass the user to honour it). Public routes (null) are open to everyone, including anonymous.
export function routeAllowed(role, routeId, user) {
  if (!(routeId in ROUTE_CAPS)) return false;
  const cap = ROUTE_CAPS[routeId];
  if (cap === null) return true;
  if (user) return can({ ...user, role: user.role || role }, cap);
  const v = MATRIX[role] && MATRIX[role][cap];
  return v === 'Y' || v === 'A';
}

// Ids the role may navigate to from the main nav (F2 lays these out); order is the suggested nav order.
export const NAV_CANDIDATES = ['MyWork', 'Authorizations', 'DenialIntelligence', 'Referrals', 'Eligibility', 'Analytics',
  'Settings', 'ExtHome', 'MobileApp'];
export function NAV_FOR(role, user) {
  if (!MATRIX[role]) return [];
  return NAV_CANDIDATES.filter(id => routeAllowed(role, id, user));
}

// Capabilities a role holds outright (Y or A); D shown separately.
export function capsFor(role) {
  const row = MATRIX[role] || {};
  return { yes: CAP_LIST.filter(c => row[c] === 'Y'), own: CAP_LIST.filter(c => row[c] === 'A'), designated: CAP_LIST.filter(c => row[c] === 'D') };
}
export const isStaffRole = r => STAFF_ROLES.includes(r);
export const isPortalRole = r => PORTAL_ACTORS.includes(r);
export const homeRouteFor = (role, narrow) => role === 'direct_support' ? (narrow ? 'MobileApp' : 'ExtHome')
  : role === 'supervisor' || role === 'clinician' ? 'MyWork' : role === 'admin' ? 'Authorizations' : role === 'guardian' ? 'ParentPortal' : role === 'school' ? 'SchoolPortal' : 'Login';
export { isGrant };
