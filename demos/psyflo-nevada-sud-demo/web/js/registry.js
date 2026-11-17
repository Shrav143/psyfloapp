// The design canvas screens (0–45, keeping canvas numbers; 10, 30, 44 and 45 were dropped after the Nov 7 product call, 41 after Nov 8), in canvas order, then the family-portal screens built after it (46–50), with the surface each lives on and the
// lowest role that can open it. Levels are cumulative: direct support < clinician < admin (the old supervisor level 2 is kept only so older records still read).
export const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };

// surface: app (Psyflo app, dark sidebar) · ext (Client Record + panel) · phone · parent · school · canvas
// min: lowest role level; 0 = no staff login needed (portals, sign-in, the audience reference)
export const SCREENS = [
  { n: 0, id: 'Login', surface: 'app', min: 0, title: 'Sign in' },
  { n: 1, id: 'WhereThingsLive', surface: 'canvas', min: 0, title: 'How it fits · where things live' },
  { n: 2, id: 'DoNext', surface: 'app', min: 3, title: 'Dashboard' },
  { n: 3, id: 'SchoolPortal', surface: 'school', min: 0, title: 'Care manager portal', hidden: true },
  { n: 4, id: 'ReferralForm', surface: 'school', min: 0, title: 'Referral form (school)', hidden: true },
  { n: 5, id: 'ReferralSent', surface: 'school', min: 0, title: 'Referral sent (school)', hidden: true },
  { n: 6, id: 'Referrals', surface: 'app', min: 3, title: 'Referrals' },
  { n: 7, id: 'Referral', surface: 'app', min: 3, title: 'Referral review' },
  { n: 8, id: 'FamilyLink', surface: 'parent', min: 0, title: 'Family link (phone)', hidden: true },
  { n: 9, id: 'Eligibility', surface: 'app', min: 3, title: 'Eligibility · Nevada Medicaid' },
  { n: 11, id: 'ParentSign', surface: 'parent', min: 0, title: 'Parent signs (phone)', hidden: true },
  { n: 12, id: 'ParentPortal', surface: 'parent', min: 0, title: 'Parent portal (phone)', hidden: true },
  { n: 13, id: 'ExtHome', surface: 'ext', min: 1, title: 'Clients' },
  { n: 14, id: 'ExtScreening', surface: 'ext', min: 3, title: 'Extension · intake screening' },
  { n: 15, id: 'ExtCNA', surface: 'ext', min: 3, title: 'Extension · ASAM assessment' },
  { n: 16, id: 'ExtISP', surface: 'ext', min: 3, title: 'Extension · treatment plan' },
  { n: 17, id: 'ExtSRA', surface: 'ext', min: 3, title: 'Extension · prior authorization request' },
  { n: 18, id: 'ExtSignOff', surface: 'ext', min: 3, title: 'Extension · sign-off (Forms to Approve)' },
  { n: 19, id: 'Submission', surface: 'app', min: 3, title: 'Sent · a person presses Send' },
  { n: 20, id: 'MobileApp', surface: 'phone', min: 1, title: 'Mobile app (phone)', hidden: true },
  { n: 21, id: 'MobileDictate', surface: 'phone', min: 1, title: 'Say what happened (phone)', hidden: true },
  { n: 22, id: 'MobileAssess', surface: 'phone', min: 1, title: 'Assessments (phone)', hidden: true },
  { n: 23, id: 'ExtDPN', surface: 'ext', min: 1, title: 'Group note' },
  { n: 51, id: 'SameActivity', surface: 'canvas', min: 0, title: 'Same activity, two individuals, two notes', hidden: true },
  { n: 52, id: 'CloseCard', surface: 'canvas', min: 0, title: 'Close · what stays the same' },
  { n: 24, id: 'ExtWeekly', surface: 'ext', min: 1, title: 'Weekly individual session', hidden: true },
  { n: 25, id: 'ExtMonthly', surface: 'ext', min: 1, title: 'Collateral contact', hidden: true },
  { n: 26, id: 'ExtIncident', surface: 'ext', min: 1, title: 'Incident report', hidden: true },
  { n: 27, id: 'ReviewQueue', surface: 'app', min: 2, title: 'Supervisor review queue', hidden: true },
  { n: 28, id: 'StaffDashboard', surface: 'app', min: 1, title: 'Dashboard' },
  { n: 29, id: 'Authorizations', surface: 'app', min: 3, title: 'Authorizations' },
  { n: 31, id: 'ParentSurvey', surface: 'parent', min: 0, title: 'Parent survey (phone)', hidden: true },
  { n: 32, id: 'ExtQuarterly', surface: 'ext', min: 3, title: 'Extension · quarterly report', hidden: true },
  { n: 33, id: 'ExtCase', surface: 'ext', min: 3, title: 'Extension · continued stay' },
  { n: 34, id: 'InfoRequest', surface: 'app', min: 3, title: 'Information request' },
  { n: 35, id: 'Partials', surface: 'app', min: 3, title: 'Partial approvals & denials' },
  { n: 36, id: 'EarlyDischarge', surface: 'app', min: 3, title: 'Step-down · 2.1 to Level 1' },
  { n: 37, id: 'ExtDischarge', surface: 'ext', min: 3, title: 'Extension · discharge / transfer summary' },
  { n: 38, id: 'PeerBrief', surface: 'app', min: 3, title: 'Peer-to-peer call notes' },
  { n: 39, id: 'AppealLetter', surface: 'app', min: 3, title: 'Reconsideration / appeal letter' },
  { n: 40, id: 'PayerPlaybook', surface: 'app', min: 3, title: 'Payer Rules' },
  { n: 53, id: 'Claims', surface: 'app', min: 3, title: 'Claims & Denials' },
  { n: 42, id: 'Analytics', surface: 'app', min: 3, title: 'Analytics' },
  { n: 43, id: 'Users', surface: 'app', min: 4, title: 'Users & Permissions' },
  { n: 46, id: 'ParentEnroll', surface: 'parent', min: 0, title: 'Enrollment packet (phone)', hidden: true },
  { n: 47, id: 'ParentProgress', surface: 'parent', min: 0, title: 'Progress · family view (phone)', hidden: true },
  { n: 48, id: 'ParentQuarterly', surface: 'parent', min: 0, title: 'Quarterly report · guardian signs (phone)', hidden: true },
  { n: 49, id: 'ParentLetters', surface: 'parent', min: 0, title: 'Insurance letters, explained (phone)', hidden: true },
  { n: 50, id: 'ParentSchedule', surface: 'parent', min: 0, title: 'Book the first call or the intake (phone)', hidden: true }
];
// Nevada SUD build: school, family, phone and note screens stay routable but are hidden from the picker and nav.
export const VISIBLE = SCREENS.filter(s => !s.hidden);
export const BY_ID = Object.fromEntries(SCREENS.map(s => [s.id, s]));

// Where each role lands after sign-in
export function homeFor(role, narrow) {
  if (role === 'direct_support') return 'StaffDashboard';
  if (role === 'clinician') return 'DoNext';
  return 'Authorizations';
}
