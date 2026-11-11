// Maturity registry: one place that says how real each route and main feature is, so a feature's level is registered
// ONCE (docs/BUILD-BRIEF.md rule 8). Source: review/02-product-strategy.md section c and review/02b-roadmap-evidence-register.md.
//
// The label states the claim PsyFlo makes to Harvest, and pilot scope overrides demo fidelity. Applied in order:
//   1. not in the proposed pilot scope ............................................ future   (even if it clicks)
//   2. blocked by a rule, consent, decision or contradictory Harvest evidence ..... no tier of its own: `verification`
//      names the source chip to show (official | payer | harvest | unverified); the tier shown is the demo's honest state
//   3. in pilot scope and the demo plays an external system, a model or an unverified rule ... simulated
//   4. in pilot scope and it runs end to end with nothing external faked ......... working
//   5. in pilot scope but only a static preview or not built ..................... pilot   (chip: "Pilot (preview)")
// Tier and rule provenance are separate axes: this file never draws a verification chip, and ui.sourceChip() never draws a tier.
//
// Shape: { featureId: { level, note, title?, routes?, verification? } }
//   level  'working' | 'simulated' | 'pilot' | 'future'
//   routes route ids the feature appears on (the presenter notes drawer lists them for the open screen)
// Client-facing screens show a chip only for simulated, pilot and future; Working is unmarked and appears only when the
// presenter's Maturity overlay is on (ui.maturity() emits it hidden by CSS; the dock toggles html[data-maturity="all"]).
// The mock Lauris is declared simulated ONCE (feature `lauris.mock`), not on every extension feature.

export const LEVELS = {
  working: { label: 'Working', tip: 'Runs end to end in this demo on demo data; in pilot scope' },
  simulated: { label: 'Simulated', tip: 'The demo plays Sfax, SMS, DMAS, a payer, speech or a language model, or a rule not yet verified' },
  pilot: { label: 'Pilot (preview)', tip: 'Proposed for the pilot; not working yet' },
  future: { label: 'Future', tip: 'Vision; not part of the pilot, even where it works' }
};
export const LEVEL_ORDER = ['working', 'simulated', 'pilot', 'future'];

const f = (level, title, note, routes = [], more = {}) => ({ level, title, note, routes, ...more });

export const MATURITY = {
  // ---------- routes (every route id in registry.js) ----------
  'route.Login': f('working', 'Sign in', 'Demo-grade sign-in with a session; there is no real identity provider.', ['Login']),
  'route.WhereThingsLive': f('working', 'How it fits', 'Architecture reference for the presenter.', ['WhereThingsLive']),
  'route.MyWork': f('working', 'My Work', 'One list of what is due, by role. Built from stored records; nothing is invented.', ['MyWork', 'DoNext']),
  'route.Referrals': f('working', 'Referrals', 'Queue and case shell over stored referrals.', ['Referrals', 'Referral']),
  'route.Eligibility': f('simulated', 'Eligibility check', 'A person records the DMAS result; the lookup itself is a simulated page.', ['Eligibility', 'Referral'], { verification: 'unverified' }),
  'route.SchoolPortal': f('working', 'School portal', 'Referral and status only. No teacher portal and no clinical content.', ['SchoolPortal', 'ReferralForm', 'ReferralSent']),
  'route.FamilyLink': f('simulated', 'Family link', 'SMS is a stub; the link opens the guardian pages.', ['FamilyLink']),
  'route.ParentSign': f('simulated', 'Parent signs', 'Signature mode per document is configurable; the policy is not validated with Harvest.', ['ParentSign'], { verification: 'unverified' }),
  'route.ParentPortal': f('simulated', 'Parent portal', 'Checklist home; signing is the pilot slice, the rest is Future.', ['ParentPortal']),
  'route.ParentEnroll': f('simulated', 'Enrollment packet', 'Remote signature policy is unresolved (in person versus remote).', ['ParentEnroll'], { verification: 'unverified' }),
  'route.ParentProgress': f('future', 'Progress, family view', 'Proposed after the pilot; no Harvest request.', ['ParentProgress']),
  'route.ParentQuarterly': f('future', 'Quarterly report, guardian signs', 'Proposed after the pilot.', ['ParentQuarterly']),
  'route.ParentLetters': f('future', 'Insurance letters, explained', 'Proposed after the pilot.', ['ParentLetters']),
  'route.ParentSchedule': f('future', 'Book a call', 'Proposed after the pilot.', ['ParentSchedule']),
  'route.ParentSurvey': f('future', 'Parent survey', 'Proposed after the pilot.', ['ParentSurvey']),
  'route.AppealLetter': f('simulated', 'Appeal letter', 'Guardian-led by default; whether a provider may appeal is not verified.', ['AppealLetter'], { verification: 'unverified' }),
  'route.ExtHome': f('working', 'Extension home', 'Page bridge to the open Lauris page. The mock Lauris is simulated, declared once.', ['ExtHome']),
  'route.ExtScreening': f('pilot', 'Screening call', 'Pilot: consent-gated. Recording consent and the BAA are open.', ['ExtScreening'], { verification: 'unverified' }),
  'route.ExtCNA': f('pilot', 'Intake / CNA', 'Pilot: consent-gated.', ['ExtCNA'], { verification: 'unverified' }),
  'route.ExtISP': f('simulated', 'Treatment plan', 'Rule-based drafting; no language model.', ['ExtISP']),
  'route.ExtSRA': f('simulated', 'Initial SRA', 'Every sentence traces to a stored record; drafting is rule-based.', ['ExtSRA']),
  'route.ExtSignOff': f('simulated', 'Sign-off', 'A person presses Get Signature in Lauris; Psyflo never signs.', ['ExtSignOff']),
  'route.Submission': f('simulated', 'Send', 'A person presses Send. Sfax and the payer portals are simulated.', ['Submission', 'Authorization']),
  'route.MobileApp': f('simulated', 'Mobile app', 'No Harvest staff asked for a phone app; no locked-screen recording is promised.', ['MobileApp']),
  'route.MobileDictate': f('simulated', 'Say what happened', 'Speech uses the browser; the example text is the fallback.', ['MobileDictate']),
  'route.MobileAssess': f('simulated', 'Assessments', 'Answers wait in Psyflo until the student is open in Lauris.', ['MobileAssess']),
  'route.ExtDPN': f('simulated', 'Daily note', 'Rule-based drafting with 14 explicit checks; no language model.', ['ExtDPN']),
  'route.ExtWeekly': f('simulated', 'Weekly guardian call', 'Rule-based drafting.', ['ExtWeekly']),
  'route.ExtMonthly': f('simulated', 'Monthly collateral', 'Rule-based drafting.', ['ExtMonthly']),
  'route.ExtIncident': f('future', 'Incident report', 'Working preview outside the pilot.', ['ExtIncident']),
  'route.ReviewQueue': f('working', 'Review queue', 'Supervisor review of trainee notes.', ['ReviewQueue', 'MyWork']),
  'route.StaffDashboard': f('working', 'Staff', 'Completion and due-next from stored notes.', ['StaffDashboard', 'MyWork']),
  'route.Authorizations': f('working', 'Authorizations', 'Queue over request.stage with clocks, owners and next actions.', ['Authorizations', 'Authorization']),
  'route.Authorization': f('working', 'Authorization case', 'Timeline, documents, evidence, submission, units.', ['Authorization']),
  'route.ExtQuarterly': f('future', 'Quarterly report', 'Working preview outside the pilot.', ['ExtQuarterly']),
  'route.ExtCase': f('simulated', 'Continued stay', 'Counts are computed from stored notes; missing evidence is named.', ['ExtCase']),
  'route.InfoRequest': f('simulated', 'Information request', 'Reply drafted from the request and stored notes; Sfax is simulated.', ['InfoRequest', 'DenialCase']),
  'route.Partials': f('working', 'Partial decisions', 'Four options, each with its deadline and source.', ['Partials', 'DenialCase']),
  'route.EarlyDischarge': f('simulated', 'Early discharge', 'Whether the 30-day rule is DMAS policy or practice is unverified.', ['EarlyDischarge', 'Authorization'], { verification: 'unverified' }),
  'route.ExtDischarge': f('future', 'Discharge summary', 'Working preview outside the pilot.', ['ExtDischarge']),
  'route.PeerBrief': f('working', 'Peer-to-peer brief', 'Assembled from the request; call date and outcome logged by a person.', ['PeerBrief', 'DenialCase']),
  'route.PayerPlaybook': f('future', 'Payer playbook', 'Deprioritised; lives as payer guidance in Analytics.', ['PayerPlaybook', 'Analytics']),
  'route.DenialIntelligence': f('working', 'Denial Intelligence', 'Queue of cases that need a payer-decision response.', ['DenialIntelligence']),
  'route.DenialCase': f('working', 'Denial case', 'Decision, evidence, options, action and history.', ['DenialCase']),
  'route.Analytics': f('future', 'Analytics', 'Pilot scorecard is Working; outcomes, payer and population views are Future.', ['Analytics']),
  'route.Users': f('working', 'Users and roles', 'Demo-grade permissions enforced by the server.', ['Users', 'Settings']),
  'route.Settings': f('working', 'Settings', 'People, roles, units, rules, audit, family link, presenter.', ['Settings']),
  'route.UiKit': f('working', 'UI kit', 'Presenter-only gallery of every component and state.', ['UiKit']),

  // ---------- main features ----------
  'lauris.mock': f('simulated', 'Mock Lauris', 'The demo plays Lauris; Psyflo reads and types only on the open page, through a page bridge.', ['ExtHome']),
  'notes.capture': f('simulated', 'Daily, weekly, monthly notes', 'Rule-based drafting with source chips; staff judgment is never removed.', ['ExtDPN', 'ExtWeekly', 'ExtMonthly', 'MobileDictate']),
  'scribe.screening': f('pilot', 'Screening and intake recording', 'Pilot: consent-gated. Peer-to-peer recording is off and configurable.', ['ExtScreening', 'ExtCNA'], { verification: 'unverified' }),
  'enhance.modeA': f('simulated', 'Scan & Enhance, review draft', 'Current drafts only; fills the open form; no bulk accept.', ['ExtDPN', 'ExtSRA']),
  'enhance.modeB': f('pilot', 'Scan & Enhance, evidence review', 'Read-only; reads Psyflo\'s own captured copies, never a Lauris scrape.', ['ExtCase']),
  'enhance.addendum': f('future', 'Enhance a processed note', 'Not offered. Processed records are write-once; correction policy is unknown.', []),
  'time.track': f('working', 'Track Time', 'Recorded, direct, documented and potentially billable time are separate figures.', ['ExtHome', 'MobileApp']),
  'time.unitRule': f('working', 'Unit rule', 'Configurable; defaults to the official 120/180/300 minute bands with its source chip.', ['Settings'], { verification: 'official' }),
  'sra.draft': f('simulated', 'SRA drafting', 'Every sentence traces to a stored record or prints "Evidence missing".', ['ExtSRA', 'ExtCase']),
  'sra.approval': f('working', 'Clinical approval before signing', 'Pending clinical approval sits between review and signature; approver and sender are separate permissions.', ['Authorization']),
  'send.packet': f('simulated', 'Packet and Send', 'A person presses Send; Sfax returns a simulated receipt.', ['Submission', 'Authorization']),
  'send.agent': f('future', 'Agents submit with stored credentials', 'Ruled out: a person presses Send, no stored credentials.', []),
  'fax.inbound': f('future', 'Inbound fax reading', 'The pilot logs replies by hand; the demo uses a presenter control.', []),
  'receipt.call': f('working', 'Receipt-call reminder', 'Reminder and script only; dialling is Future.', ['Authorization']),
  'auth.tracker': f('working', 'Authorization tracker', 'Stage, clocks, owner and next action for every request.', ['Authorizations', 'Authorization']),
  'auth.clocks': f('simulated', 'Decision and reply clocks', 'Each number carries a source chip; 7 and 14 days are never stated as a Harvest rule.', ['Authorizations', 'Authorization'], { verification: 'unverified' }),
  'auth.renewalEmail': f('simulated', 'Renewal reminder email', 'Email is a stub; the lead time is configurable.', ['Authorizations']),
  'auth.units': f('working', 'Units countdown', 'Drawn down when a note is processed; must match Lauris.', ['Authorization', 'Authorizations']),
  'denial.info': f('simulated', 'Information reply', 'Payer-specific window; configurable.', ['InfoRequest', 'DenialCase']),
  'denial.partial': f('working', 'Partial-decision options', 'Accept, add information, peer-to-peer, early discharge.', ['Partials', 'DenialCase']),
  'denial.p2p': f('working', 'Peer-to-peer brief', 'Recording consent is an open question.', ['PeerBrief', 'DenialCase']),
  'denial.p2pAutomation': f('future', 'Peer-to-peer scheduling automation', 'Peer-to-peer must be done by clinical staff.', []),
  'denial.appeal': f('simulated', 'Appeal preparation', 'Guardian-led; the provider path shows Not verified.', ['DenialCase', 'AppealLetter'], { verification: 'unverified' }),
  'denial.overdueNotice': f('simulated', 'Overdue-decision notice', 'Window is configurable with a source label.', ['Authorization'], { verification: 'unverified' }),
  'payer.guidance': f('future', 'Payer guidance', 'What each MCO tends to ask; seeded.', ['Analytics', 'DenialCase']),
  'analytics.scorecard': f('working', 'Pilot scorecard', 'Six precisely defined pilot measures, computed from stored records.', ['Analytics']),
  'analytics.outcomes': f('future', 'Patient outcomes', 'One dataset per view; case-backed or illustrative, never summed.', ['Analytics']),
  'analytics.payer': f('future', 'Payer performance', 'Sample data, illustrative; minimum group size 5.', ['Analytics']),
  'analytics.population': f('future', 'Patient population', 'Illustrative cohort (COH ids); no patient-level drill-down.', ['Analytics']),
  'analytics.ask': f('simulated', 'Question box', 'Rule-based answers from the figures on the screen; no language model.', ['Analytics']),
  'analytics.export': f('future', 'Export a report', 'The period, filters and dataset are written into the file.', ['Analytics']),
  'family.link': f('simulated', 'Family link', 'SMS is a stub.', ['FamilyLink']),
  'family.signature': f('simulated', 'Guardian signature', 'Mode per document type; policy not validated.', ['ParentSign', 'ParentEnroll'], { verification: 'unverified' }),
  'family.portalBeyondSigning': f('future', 'Family portal beyond signing', 'Progress, quarterly, letters, scheduling, surveys.', ['ParentProgress', 'ParentQuarterly', 'ParentLetters', 'ParentSchedule', 'ParentSurvey']),
  'school.portal': f('working', 'School referral', 'Submit a referral and see status of own referrals.', ['SchoolPortal', 'ReferralForm', 'ReferralSent']),
  'settings.roles': f('working', 'Roles and permissions', 'Least privilege enforced server-side; demo-grade, no identity provider.', ['Settings', 'Users']),
  'settings.library': f('pilot', 'Intervention-rationale library', 'Needs Harvest\'s documentation trainer to author it.', ['Settings']),
  'agents.voice': f('future', 'Voice agent calls a payer', 'Autonomous action; off by default and not ported.', []),
  'agents.flo': f('future', 'Data agent', 'Would sign in to Lauris; conflicts with the page-bridge rule.', []),
  'compliance.incident': f('future', 'Incident reporting and compliance', 'Single voice; can wait.', ['ExtIncident']),
  'dock.presenter': f('working', 'Presenter dock', 'Presenter-only tools; never part of the product viewport.', [])
};

export const maturityOf = id => MATURITY[id] || null;
export const levelOf = id => (MATURITY[id] || {}).level || null;
export const featuresFor = routeId => Object.entries(MATURITY).filter(([, v]) => (v.routes || []).includes(routeId)).map(([id, v]) => ({ id, ...v }));
// the "main" entry for a route: route.<Id>, else the first feature listing it
export const routeLevel = routeId => (MATURITY['route.' + routeId] || featuresFor(routeId)[0] || {}).level || 'working';
