// The design canvas screens (0–45, keeping canvas numbers; 10, 30, 44 and 45 were dropped after the Nov 7 product call, 41 after Nov 8), in canvas order, then the family-portal screens built after it (46–50), with the surface each lives on and the
// lowest role that can open it. Levels are cumulative: direct support < supervisor < clinician < admin.
export const LEVEL = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };

// surface: app (Psyflo app, dark sidebar) · ext (Lauris + panel) · phone · parent · school · canvas
// min: lowest role level; 0 = no staff login needed (portals, sign-in, the audience reference)
export const SCREENS = [
  { n: 0, id: 'Login', surface: 'app', min: 0, title: 'Sign in' },
  { n: 1, id: 'WhereThingsLive', surface: 'canvas', min: 0, title: 'How it fits · where things live' },
  { n: 2, id: 'DoNext', surface: 'app', min: 2, title: 'Worklist' },
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
  { n: 51, id: 'Roadmap', surface: 'app', min: 1, title: 'Roadmap' },
  { n: 52, id: 'PayerScorecard', surface: 'app', min: 3, title: 'Payer scorecard' }
];

// v2: names come from labels.js; phase 'later' screens are reachable only from the presenter menu → Roadmap.
import { PAGE_TITLE } from './shared/labels.js';
export const LATER = new Set(['ExtIncident', 'ExtQuarterly', 'ParentQuarterly', 'ExtDischarge', 'ParentSurvey', 'ParentProgress', 'ParentLetters', 'ParentSchedule', 'PayerScorecard']);
for (const s of SCREENS) { s.phase = LATER.has(s.id) ? 'later' : 'now'; if (PAGE_TITLE[s.id]) s.title = PAGE_TITLE[s.id]; }
SCREENS.find(s => s.id === 'PayerScorecard').title = 'Payer scorecard';
export const BY_ID = Object.fromEntries(SCREENS.map(s => [s.id, s]));

// Where each role lands after sign-in
export function homeFor(role, narrow) {
  if (role === 'direct_support') return narrow ? 'MobileApp' : 'ExtHome';
  if (role === 'supervisor') return 'DoNext';
  if (role === 'clinician') return 'DoNext';
  return 'Authorizations';
}
