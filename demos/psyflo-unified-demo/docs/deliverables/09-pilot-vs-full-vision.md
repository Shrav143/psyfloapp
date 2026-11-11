# 09 · Pilot versus full vision

Deliverable 9 (prompt Part 21, item 9) · Nov 11, 2026 · PsyFlo × Harvest unified demo

This summary separates what is implemented, what is simulated, what is proposed for the pilot and what belongs to the longer-term roadmap. Levels are copied from the feature maturity registry, `web/js/shared/maturity.js` (89 entries: 48 routes and 41 features; Working 29, Simulated 32, Pilot (preview) 5, Future 23), and checked against `web/js/registry.js`, `permissions.js`, the server actions and the screens. The wave proposal comes from `review/02-product-strategy.md` section c and `review/02b-roadmap-evidence-register.md`.

**The pilot waves below are PsyFlo's proposal, pending Harvest's choice.** Harvest has not chosen a scope, a site or a length (UD-021), has not yet seen the simplified design (walkthrough planned Nov 12), and has not signed a BAA. Plaud returned no recordings and the Claude team workspace was not reachable, so the evidence behind the proposal is secondary in places (`01-evidence-and-conflicts.md`); I reviewed no originals.

## How to read the levels

| Chip | Registry meaning | Shown to Harvest |
|---|---|---|
| Working | Runs end to end in this demo on demo data; in pilot scope. It does not mean production-ready | Unmarked; visible with the presenter's Maturity overlay |
| Simulated | The demo plays Sfax, SMS, DMAS, a payer, speech or a language model, or a rule not yet verified | Chip shown |
| Pilot (preview) | Proposed for the pilot; not working yet | Chip shown |
| Future | Vision; not part of the pilot, even where it works as a preview | Chip shown |

The registry applies five rules in order: not in the proposed pilot scope is Future even if it clicks; a feature blocked by a rule, consent, a decision or contradictory evidence carries a source chip; in scope with an external system, a model or an unverified rule is Simulated; in scope and end to end is Working; in scope but static or not built is Pilot (preview). **Rule provenance is a separate axis:** a rule-driven number also carries Officially verified, Payer-specific, Harvest-reported or Unverified. The registry records it in the `verification` field; it is shown below as a second term after the level. The mock Lauris is declared Simulated once (`lauris.mock`), not on every extension feature.

Test status at the last run (`review/test-results/summary.md`, commit 4c81d25): 29 suites pass and 3 fail (clock, referrals, time-panel). The Chrome side panel, live microphone, Safari and Firefox are on the manual checklist as pending. Working therefore means working against the mock Lauris in headless runs.

## 1. Capability areas

Levels are the registered entries; an area has no level of its own.

| Area | Registered entries | In the demo | Simulated, and how | Pilot proposal | Longer-term roadmap |
|---|---|---|---|---|---|
| Lauris page bridge | `lauris.mock` Simulated; `ExtHome` Working | Bridge reads labelled boxes on the open page and types into the open form; never presses Process Form, Get Signature or Send | Every Lauris page is the mock (port 4001, own store) | W1 | Other Lauris services (IOP, PHP, SEBS), then non-Lauris EHRs wait-listed (G-095); history by periodic export; no EHR offering planned |
| Daily, weekly, monthly notes | `notes.capture`, `ExtDPN`, `ExtWeekly`, `ExtMonthly`, `MobileDictate` Simulated | Draft against ISP objectives with source chips, 14 checks, school-update option, Fill | Rule-based drafting (no language model); speech from the browser | W1 | Supervision-note dictation; safety-plan check, maintenance-day framing, absence handling (W1 candidates in `02b`, not built) |
| Scan & Enhance | `enhance.modeA` Simulated; `enhance.modeB` Pilot (preview); `enhance.addendum` Future | Mode A reviews the open draft and may fill it; Mode B is read-only on Psyflo copies; no addendum | Rule-based findings; seeded M.R. corpus | A: W1; B: W2 | Addendum only if Harvest and counsel validate it (UD-017) |
| Units (read from Lauris) | `auth.units` Working; `time.unitRule` Working, Officially verified | Units used and left read from Lauris; one bar "N left of M", yellow from 75% used (`units.warn_used_pct`, Unverified); unit bands stay in the rules table for the note checks. Track Time was removed on Nov 11 (UD-003 still open for the 15-minute rule) | None | W1 | 15-minute rule only once the redesign firms up (UD-003) |
| Screening and intake recording | `scribe.screening`, `ExtScreening`, `ExtCNA` Pilot (preview), Unverified | Recorded-consent card, then record or type; draft typed into the open form | Scripted transcript or browser speech | W2, consent-gated | Ambient intake recording last; conditional intake logic; payer-disclosure filter |
| Referrals, eligibility, school portal | `Referrals`, `SchoolPortal`, `school.portal` Working; `Eligibility` Simulated, Unverified | Referral queue and case, criteria, grant-program routing, school referral with status text | DMAS lookup is a mock page; texts and emails are logged stubs | Referrals and school referral W1; eligibility W2 | Grant-program eligibility tracker; teacher feedback and incident uploads |
| Family link and guardian portal | `family.link`, `family.signature`, `FamilyLink`, `ParentSign`, `ParentPortal`, `ParentEnroll` Simulated (signature rows Unverified); five other Parent pages and `family.portalBeyondSigning` Future | Phone flow, enrollment papers, signing by configured mode, plain-language letters | SMS stub; calendar stand-in; signature policy not validated | Link and signing W2, if validated | Progress, quarterly, letters, scheduling, surveys (roadmap: late March) |
| Plan, initial SRA, approval, signing | `ExtISP`, `ExtSRA`, `ExtSignOff`, `sra.draft` Simulated; `sra.approval` Working | Drafts traced to stored records; Pending clinical approval stage; signer read from Lauris | Rule-based drafting; mock Lauris signing | W2 | Published-evidence library (unresolved); prior-service log; exact DMAS form rendering |
| Send and receipts | `send.packet`, `Submission` Simulated; `receipt.call` Working; `send.agent`, `fax.inbound` Future | A person presses Send; packet PDF; receipt on the request; call log | Sfax reference and receipt after about 3 s; mock Availity and UHC pages | W1 | Inbound fax reading; decision read-back; Sfax API (unverified); agents ruled out |
| Authorization tracker and clocks | `Authorizations`, `Authorization`, `auth.tracker` Working; `auth.clocks` Simulated, Unverified; `auth.renewalEmail` Simulated | Queue, case shell, timeline, Day N chips, owner and backup, renewal-due filter | Rule values unverified or Harvest-reported; renewal email not found (section 5) | W1 | Historical import of trackers; audit packet; redesign readiness |
| Continued stay | `ExtCase` Simulated; `enhance.modeB` Pilot (preview) | Evidence packet over a selected period; counts from stored notes; include and exclude marks | Rule-based; reads Psyflo copies, never a Lauris scrape | W2 | Keyword counts across a period and goal-neglect alerts (partly covered by the Mode B gap list) |
| Payer decisions | `DenialIntelligence`, `DenialCase`, `Partials`, `PeerBrief`, `denial.partial`, `denial.p2p` Working; `InfoRequest`, `denial.info`, `AppealLetter`, `denial.appeal`, `denial.overdueNotice` Simulated (appeal and notice Unverified); `denial.p2pAutomation`, `PayerPlaybook`, `payer.guidance` Future | Queue, five-section case, valid options only, brief, reply, guardian-led appeal | Sfax and portals simulated; payer replies entered by a person | W2 for reply, partial options and brief; appeals unresolved | Peer-to-peer scheduling automation; payer playbook; negotiation log |
| Early discharge | `EarlyDischarge` Simulated, Unverified; `ExtDischarge` Future | Transition plan a clinician sets; discharge summary from the plan and notes | The 30-day gap rule is unverified | Unresolved (UD-010) | Semester re-check prompt for discharged students |
| Analytics | `Analytics` Future; `analytics.scorecard` Working; `analytics.outcomes`, `payer`, `population`, `export` Future; `analytics.ask` Simulated | Scorecard of six measures; three views, one dataset at a time; CSV and PDF; question box | Illustrative cohort and sample baseline; rule-based answers | Scorecard W1 | Three views on real Harvest data; grant pulls; ask-a-question over data |
| Supervisor and staff views | `MyWork`, `ReviewQueue`, `StaffDashboard` Working | Role-filtered work list; trainee review; completion from stored notes | None | W1 timeliness slice; W2 review queue | Tiered review; trainee approval routing |
| Mobile staff | `MobileApp`, `MobileDictate`, `MobileAssess` Simulated | Pick student, say what happened, review, waiting for Lauris (no timer) | Browser speech; Lauris scores assessments | W1 (assessments not a pilot job) | Locked-screen capture only after device testing; email or Notes interim |
| Incident, quarterly, compliance | `ExtIncident`, `ExtQuarterly`, `compliance.incident` Future | Working previews, mock state portal | Mock state portal | Not in the pilot | State-portal clock, licensure binder, credential tracking |
| Settings, roles, rules | `Settings`, `Users`, `settings.roles` Working; `settings.library` Pilot (preview) | Sessions, matrix, two-person designations, rules editor with audit, unit bands | Demo-grade identity | Supports all waves; library W1 (`02b` item 9) | Library authored by Harvest's documentation trainer; real identity provider |
| Presenter and demo controls | `dock.presenter`, `UiKit`, `WhereThingsLive`, `Login` Working | Scenarios, roles, reset presets, clock, Maturity overlay | Not a product feature | Not applicable | Not applicable |
| Agents and automation | `agents.voice`, `agents.flo`, `send.agent`, `denial.p2pAutomation`, `fax.inbound` Future | Not built | Not applicable | Not in the pilot | Only if technically and operationally approved; ruled out for the pilot |

## 2. Every route

Roles list who may open the route by a standing grant (DS direct support, Sup site supervisor, Clin clinician, Adm administrator); users designated for a capability (for example eligibility, send) also qualify. A route marked no own entry takes its level from the registry entry whose route list contains it. Aliases redirect to the new screen (case screens only when an id is given), and `legacy=1` opens the old screen.

| Route | Level · provenance chip | Roles | In the demo | Simulated, and how | Pilot |
|---|---|---|---|---|---|
| `Login` | Working | Anyone | Role cards from the public roster; server-side session; family and school entries. | Demo-grade: no password, no identity provider. | All waves; a real sign-in is a pilot dependency. |
| `WhereThingsLive` | Working | Anyone | Architecture reference; opens the presenter drawer, or the full page with full=1. | Static page. | Presenter only. |
| `DoNext` | Working (no own entry) | DS, Sup, Clin, Adm | Alias: redirects to the Dashboard. | None. | As the Dashboard. |
| `SchoolPortal` | Working | School user | Counselor home: Harvest-needs card, own referrals with status text, short update form. No clinical content. | None. | W1. |
| `ReferralForm` | Working (no own entry; level taken from `route.SchoolPortal`) | School user | Four-section referral with guardian-agreement attestation and save-and-finish-later. | Attachment buttons record the file name only; no upload. | W1. |
| `ReferralSent` | Working (no own entry; level taken from `route.SchoolPortal`) | School user | Confirmation and status text for one referral. | Attachments record the file name only. | W1. |
| `Referrals` | Working | Clin | Queue over referral stage with search and status chips. | None. | W1. |
| `Referral` | Working (no own entry; level taken from `route.Referrals`) | Clin | Case shell with form, criteria, family link, eligibility and consent panels; schedule screening, route to the grant program, hold. | Texts and emails are stubs that log to events (not sent). | W1. |
| `FamilyLink` | Simulated | Guardian link | Five phone steps, English and Spanish, question toggles, expiry enforced on unsubmitted links. | SMS is a stub: the link is shown and logged. | W2. |
| `Eligibility` | Simulated · Unverified | Clin | Five-state panel inside the referral; a person records the DMAS result with date, source and a re-check reminder. Redirects to Referral with panel=eligibility. | The DMAS lookup is a mock page on port 4002. | W2. |
| `ParentSign` | Simulated · Unverified | Guardian link | One form per screen; follows the signature mode (remote, in person, pending, completed, ready to review); signed PDF. | Signature policy not validated; finger or typed signature. | W2, if the signature policy is validated (UD-001). |
| `ParentPortal` | Simulated | Guardian link | Checklist home, plain-language letters, call-us sheet, English and Spanish, 44 px targets. | Texts and clinician calendars are stand-ins. | W2 signing slice only. |
| `ExtHome` | Working | DS, Sup, Clin | Mock Lauris with the Psyflo panel at 400 px: current student, Scribe, Scan & Enhance, next task. | The Lauris page is the mock, declared Simulated once. | W1. |
| `ExtScreening` | Pilot (preview) · Unverified | Clin | Screening Scribe: consent card, questions still to ask, draft typed into the open form. | Scripted transcript or browser speech; rule-based drafting; mock Lauris. | W2, consent-gated. |
| `ExtCNA` | Pilot (preview) · Unverified | Clin | Intake and needs-assessment Scribe, same pattern. | As ExtScreening. | W2, consent-gated. |
| `ExtISP` | Simulated | Clin | Treatment plan: three goals drafted from stored records and filled into the open form; guardian and client signature rows via the portal. | Rule-based drafting; no language model. | W2. |
| `ExtSRA` | Simulated | Clin | Initial SRA draft: every sentence traces to a stored record or prints Evidence missing; green from Lauris, yellow typed by Psyflo. | Rule-based drafting; mock Lauris. | W2. |
| `ExtSignOff` | Simulated | Clin | Forms to Approve in Lauris: Psyflo checks the form, a person presses Get Signature, the signer is read from the Lauris event. | Mock Lauris signing; Psyflo never signs. | W2. |
| `Submission` | Simulated | Clin | Alias of the Authorization case, Submission section, when an id is given: packet, a person presses Send, receipt, history. | Sfax returns a reference and receipt in about 3 s; mock Availity and UHC pages. | W1. |
| `MobileApp` | Simulated | DS, Clin | My students, Say what happened, Review, Ready in Lauris; no default student. | Browser speech; saved text waits until the student is open in Lauris. | W1. |
| `MobileDictate` | Simulated | DS, Clin | Say or type a short factual description for one student behind an identity card; states Draft, Waiting for Lauris, Processed in Lauris. | Web Speech in Chrome; scripted fallback. | W1. |
| `MobileAssess` | Simulated | DS, Clin | Due list and history; two-question SUDS or DSM cross-cutting child version stored in Psyflo. | Lauris scores them; answers wait until the student is open. | Not a pilot job (`02` section e); see registry gaps. |
| `ExtDPN` | Simulated | DS, Clin | Daily note Scribe: dictate or type, draft against ISP objectives, 14 drafting checks, school-update option, Fill. | Rule-based drafting; mock Lauris. | W1. |
| `ExtWeekly` | Simulated | DS, Clin | Weekly guardian call Scribe. | As ExtDPN. | W1. |
| `ExtMonthly` | Simulated | DS, Clin | Monthly collateral Scribe. | As ExtDPN. | W1. |
| `ExtIncident` | Future | DS, Clin | Incident report Scribe with a state-portal clock banner. | Mock state portal. | Not in the pilot. |
| `ReviewQueue` | Working | Sup, Clin | Alias: redirects to Documentation (Needs review), where a reviewer approves, returns with a note, or flags that it did not happen. | None. | W2. |
| `StaffDashboard` | Working | DS, Sup, Clin, Adm | Alias: redirects to the Dashboard (`?staff=` filters the roster). | None. | W1 timeliness slice. |
| `Authorizations` | Working | Sup, Clin, Adm | One filtered table over request.stage: patient, payer, request, status, one unit bar, a deadline date with a warning icon, clinician, one next-step button; filters for payer, request type, clinician, location, school, stage, units remaining, next step due and period. Sources sit in the tooltip. | Clocks carry unverified or Harvest-reported sources; payer replies entered by a person. | W1. |
| `ParentSurvey` | Future | Guardian link | Three-question check-in saved for staff. | None. | Not in the pilot. |
| `ExtQuarterly` | Future | Clin | Quarterly report Scribe; asks the guardian to sign through the portal; internal quarterly saved in Psyflo only. | Rule-based drafting. | Not in the pilot. |
| `ExtCase` | Simulated | Clin | Continued-stay evidence packet: period selector, counts from stored notes, include and exclude marks, Evidence missing, household opt-in. | Rule-based drafting; reads Psyflo copies, never a Lauris scrape. | W2 (Mode B). |
| `InfoRequest` | Simulated | Clin | Alias of the Denial case, Provide requested information: reply drafted from the request and stored notes, clinical staff only. | Sfax simulated. | W2. |
| `Partials` | Working | Clin | Alias of the Denial case, Options: accept, add information, peer-to-peer, or use the units and discharge, each with its deadline and source. | None. | W2. |
| `EarlyDischarge` | Simulated · Unverified | Sup, Clin, Adm | Alias of the Authorization case, Transition: plan dates proposed, a clinician sets them; assumptions carry chips. | The 30-day gap rule is unverified. | Unresolved (UD-010). |
| `ExtDischarge` | Future | Clin | Discharge summary built from the early-discharge plan and stored notes; the guardian-notified box is left for a person. | Rule-based drafting. | Not in the pilot. |
| `PeerBrief` | Working | Clin | Alias of the Denial case, peer-to-peer: brief assembled from the request; call date and outcome logged by a person. | Recording is off; typed notes only. | W2. |
| `AppealLetter` | Simulated · Unverified | Guardian link | Guardian reviews, edits and signs a letter staff prepared; four states; signing is not sending. | Fax to the payer is a stub; who may appeal is unverified. | Not scheduled; depends on UD-011. |
| `PayerPlaybook` | Future | Clin, Adm | Alias of Analytics, Payer Performance, guidance: seeded payer guidance. | Seeded text. | Not in the pilot. |
| `Analytics` | Future | Sup, Clin, Adm | Pilot scorecard (six measures from stored records); Outcomes, Payer, Population with one dataset per view; CSV and PDF export; question box. | Illustrative cohort and sample baseline; question box is rule-based. | Scorecard W1; the three views are not in the pilot. |
| `Users` | Working | Adm | Alias of Settings, People. | None. | As Settings. |
| `ParentEnroll` | Simulated · Unverified | Guardian link | Enrollment papers on a phone before intake; family-link answers pre-filled; two signed forms follow the signature mode. | Demo paper wording, not Harvest forms; signature policy unresolved. | W2, if UD-001 allows. |
| `ParentProgress` | Future | Guardian link | Plain-language progress from goals and daily ratings; no scores or diagnoses. | None. | Not in the pilot. |
| `ParentQuarterly` | Future | Guardian link | Quarter in plain words; guardian signs in the configured mode; the internal quarterly never reaches it. | None. | Not in the pilot. |
| `ParentLetters` | Future | Guardian link | One card per insurer action: what it says, what you can do, by when. | None. | Not in the pilot. |
| `ParentSchedule` | Future | Guardian link | Family books the screening call or intake from clinician open times and confirms the day before. | Calendar availability is a stand-in; nothing is texted. | Not in the pilot. |
| `MyWork` | Working (legacy) | DS, Sup, Clin, Adm | Redirects: To do and My day go to the Dashboard, Review and Team to Documentation, Referrals to Referrals; `?legacy=1` opens the old screen. | None. | Superseded by the three screens below. |
| `Dashboard` | Working | DS, Sup, Clin, Adm | The patient roster the person is responsible for: outstanding items under each patient, alert icons, filters; direct support see their own patients, a supervisor the staff and sites they manage, clinician and administrator the clinic (administrator: statuses only). Second-person confirmations show as a strip for clinician and administrator. | None; the intake, CNA, plan and quarterly rows come from sample data (UD-037). | W1 note-timeliness slice. |
| `Documentation` | Working | Sup, Clin, Adm | Notes, intake forms, CNAs, treatment plans, quarterly reports across patients with or without an authorization: on-time figure, filters, review drawer (approve, return, flag), By staff tab (administrator: status only). | Form status is sample data until Lauris is read (UD-037). | W1 note slice; W2 review. |
| `Patient` | Working | DS (own), Sup, Clin, Adm | The patient chart: Documentation first; the Authorization is one section (unit bar, deadline, next step, open case). A patient with no authorization is a normal chart. | None. | W1. |
| `Authorization` | Working | Sup, Clin, Adm | Case shell: next-step panel (Review packet, Approve, Sign in Lauris, Send), timeline, documents, evidence, submission history, units, payer correspondence, tasks, transition. | Sfax and portals simulated. | W1. |
| `DenialIntelligence` | Working | Clin, Adm | Queue: Case, Consumer, Payer, Service, Decision, Status, Next action, Deadline with source, Owner. | None. | W2. |
| `DenialCase` | Working | Clin, Adm | Five sections: Decision, Evidence, Options, Action, History; only valid options; a disputes layer reconciles into request.stage. | Payer replies entered by a person; appeal and reconsideration paths unverified. | W2. |
| `Settings` | Working | Adm | People, Roles matrix, Units, Rules editor (source chips, reason, audit), Audit log, Family link, Presenter. | Demo-grade identity. | Supports all waves. |
| `UiKit` | Working | Presenter | Presenter-only gallery of every component and state. | None. | Presenter only. |

## 3. Every other registered feature

| Feature | Level · provenance chip | In the demo | Simulated, and how | Pilot |
|---|---|---|---|---|
| `lauris.mock` | Simulated | Mock Lauris server on port 4001 with its own store; forms found by label. | The whole Lauris side. | n/a |
| `notes.capture` | Simulated | Daily, weekly, monthly notes with source chips and 14 checks. | Rule-based drafting; speech from the browser. | W1 |
| `scribe.screening` | Pilot (preview) · Unverified | Recorded-consent card, then record or type; screening and intake drafts typed into the open form. | Scripted transcript or browser speech; mock Lauris. | W2, consent-gated |
| `enhance.modeA` | Simulated | Scan the open draft, answer findings in your own words, approve, typed into the open form; no accept-all; version history. | Rule-based findings. | W1 (merged with note capture) |
| `enhance.modeB` | Pilot (preview) | Read-only evidence review of processed history from Psyflo copies; period selector; evidence marks; no fill command. | Rule-based index over a seeded corpus (M.R.). | W2 |
| `enhance.addendum` | Future | Not offered; writes to processed records are refused. | n/a | Unresolved (UD-017) |
| `time.track` | Working | Start, pause, stop; recorded, direct, in-the-note and potentially billable time kept apart; manual correction. | None; the unit result follows the rule. | W1 |
| `time.unitRule` | Working · Officially verified | Bands from the rules table, edited in Settings, Units, with the alternate 60-minute set selectable. | None. | W1 |
| `sra.draft` | Simulated | Initial SRA drafted from stored records or Evidence missing. | Rule-based drafting. | W2 |
| `sra.approval` | Working | Stage Pending clinical approval; approve and send are separate designated permissions; backup owner. | None. | W2 |
| `send.packet` | Simulated | A person presses Send; packet PDF; receipt stored on the request. | Simulated Sfax; mock portal pages. | W1 |
| `send.agent` | Future | Not built. | n/a | Ruled out for the pilot |
| `fax.inbound` | Future | Not built; a presenter-only demo control (`request.demoReply`) records a reply. | Presenter control. | Replies logged by hand |
| `receipt.call` | Working | Reminder and script; a person logs the outcome (receipt confirmed, in review, decision given, no answer, not found). | None; dialling is Future. | W1 |
| `auth.tracker` | Working | Stage, clocks, owner, next action for every request. | None. | W1 |
| `auth.clocks` | Simulated · Unverified | Day N, follow-up, Overdue, send limit, reply clock, each with a source chip. | Rule values are unverified or Harvest-reported. | W1 |
| `auth.renewalEmail` | Simulated | Renewal due filter and derived event only; no email stub found (see registry gaps). | Not found. | W2 |
| `auth.units` | Working | Balance drawn down when a note is processed; task to enter units in Lauris. | Mock Lauris units. | W1 |
| `denial.info` | Simulated | Reply from the request and stored notes; clinical staff only. | Sfax simulated. | W2 |
| `denial.partial` | Working | Four options with deadline and source. | None. | W2 |
| `denial.p2p` | Working | Brief, call date, outcome, typed notes. | Recording off. | W2 |
| `denial.p2pAutomation` | Future | Not built. | n/a | Not in the pilot |
| `denial.appeal` | Simulated · Unverified | Guardian-led letter prepared by staff, signed by the guardian, sent by a person. | Fax stub; provider path Not verified. | Unresolved (UD-011) |
| `denial.overdueNotice` | Simulated · Unverified | Notice a person sends when the configured window passes. | Sfax or portal simulated; window unverified. | Unresolved (UD-004) |
| `payer.guidance` | Future | Seeded guidance of what each MCO tends to ask. | Seeded. | Not in the pilot |
| `analytics.scorecard` | Working | Six measures, definitions behind a question mark, counts first. | None. | W1 |
| `analytics.outcomes` | Future | Outcome panels for one dataset at a time. | Case-backed or illustrative data. | Not in the pilot |
| `analytics.payer` | Future | Payer panels, minimum group size 5. | Sample data, illustrative. | Not in the pilot |
| `analytics.population` | Future | Cohort panels; ids COH-; no patient-level drill-down. | Generated illustrative cohort. | Not in the pilot |
| `analytics.ask` | Simulated | Answers from the figures on screen; states a limit when unsupported. | Rule-based, no language model. | Not in the pilot |
| `analytics.export` | Future | CSV and PDF carrying period, filters and dataset. | None. | Not in the pilot |
| `family.link` | Simulated | Phone flow and expiry. | SMS stub. | W2 |
| `family.signature` | Simulated · Unverified | Mode per document type, enforced on the server. | Policy not validated. | W2, if validated |
| `family.portalBeyondSigning` | Future | Progress, quarterly, letters, scheduling, surveys. | Calendar stand-in. | Not in the pilot |
| `school.portal` | Working | Referral submit and status; short update. | Attachments by name only. | W1 |
| `settings.roles` | Working | Matrix enforced on the server; two-person designations. | Demo-grade identity. | W1 |
| `settings.library` | Pilot (preview) | Seed list and an admin-only add action; no Library tab found (see registry gaps). | n/a | W1 (needs Harvest trainer) |
| `agents.voice` | Future | Not built. | n/a | Not in the pilot |
| `agents.flo` | Future | Not built. | n/a | Not in the pilot |
| `compliance.incident` | Future | Incident Scribe and mock state portal. | Mock state portal. | Not in the pilot |
| `dock.presenter` | Working | Ribbon with scenarios, role switcher, reset and preset, clock, maturity overlay, notes drawer. | None. | Presenter only |

## 4. Pilot waves and the longer-term roadmap

**PsyFlo's proposal, pending Harvest's choice** (`02` section c; the lead confirms).

| Wave | Scope |
|---|---|
| W1 · Feb 1 launch, staff training mid-February | Note capture and Mode A review for daily, weekly guardian and monthly collateral notes; the note-timeliness slice; referrals; the authorization tracker with a human-pressed Send and receipts; the six pilot measures |
| W2 · later in the pilot window | Screening and intake Scribe (consent-gated); initial SRA drafting and sign-off; continued-stay evidence (Mode B); information-request reply; partial-decision options; peer-to-peer brief; family link; supervisor review queue |
| Outside the pilot | Everything else, including analytics views beyond the scorecard, the family and school portals beyond signing and referral, incident and compliance, the payer playbook and anything involving agents |

Dates conflict across PsyFlo's own documents: launch ready Feb 1 with screening and intake recording as a must-have (T-056), against notes Feb 15, packet and tracker Feb 8 (beta from Jan 11), portal late March and screening scribe in spring (T-057). Harvest wants one site and one or two staff, and whatever it adopts becomes a written staff expectation (T-052, G-045), so the scope should stay small. Pilot length is quoted as 8 weeks and as 2 to 3 months for other clinics (G-086, G-106). No site has been chosen.

**Longer-term roadmap (beyond W2).** Analytics outcomes, payer and population views on real Harvest data; the family portal beyond signing; the school portal beyond referral; incident reporting and licensure tracking; the payer playbook and negotiation log; peer-to-peer scheduling automation; inbound fax reading and decision read-back; renewal emails; quarterly, discharge and internal-quarterly drafting; supervision-note dictation; historical import of trackers and an electronic audit packet; grant data pulls; an ask-a-question view over the data; redesign readiness (CANS, 15-minute units, caseload cap) once the rules firm up; other Lauris services, then non-Lauris EHRs. Agents that submit with stored credentials, voice agents that call payers and an EHR for new providers are ruled out or not planned.

## 5. What the demo does not claim

- **No Lauris API.** A page bridge reads and types on the open page only; no background requests, no database access, no scraping.
- **No autonomous submission.** A person presses Process Form, Get Signature and Send; `request.send` needs the `send.packet` capability and no unattended send exists.
- **No stored credentials**, no payer sign-in on anyone's behalf. Sign-in is demo-grade: no password and no identity provider.
- **No signing by Psyflo.** The signer is read from the Lauris signature event; only an LMHP-type credential may press Get Signature in the mock.
- **No real payer or DMAS calls.** Availity, UHC, the state portal and the DMAS lookup are mock pages on local ports; a search of `server/` found no outbound network calls.
- **No real SMS, email or Sfax.** All are stubs logged to the event list; the Sfax receipt is a simulated PDF.
- **Synthetic data only.** The analytics baseline is illustrative and never Harvest's; no figure was computed from a Harvest export.
- **No language model.** Drafting, findings and the question box are deterministic rules; any future model would sit behind the same checks.
- **No edit of a processed note, no addendum.** Processed records are write-once.
- **No predicted approval percentages** and no claim that an intervention caused improvement.
- **No rule stated as law unless officially verified.** The July 2027 redesign dates are information only.
- **No locked-screen recording, no approved signature policy, no BAA, no real client information.**
- **Not yet approved by Harvest,** and not tested in a real Chrome side panel, with a live microphone, or in Safari or Firefox.

## 6. Pilot success measures

Six measures, each computed from stored records in `web/js/shared/analytics/metrics.js` and shown on the Pilot scorecard with the definition behind a question mark. Counts come first and small groups are suppressed (minimum 5). With about 52 active TDT students and a one-site start, denominators will be small. The Owner column is the role that reads the measure, proposed in `02` section g; Harvest has not named owners (UD-035).

| # | Measure | Numerator | Denominator | Data source | Owner (reads it) | Limits |
|---|---|---|---|---|---|---|
| 1 | Notes on time | Required notes (daily, weekly guardian, monthly collateral) processed by their due time | Required notes whose due time has passed, plus any already processed; one required note per school day, week or month from the first note Psyflo holds for the student | Process Form events seen by the page bridge, stored as processed notes | Supervisors, clinical advisor, administrators; staff see their own | Absences are not recorded, so a day without a note counts as missed; the window is a setting (24 h is Harvest-reported, UD-023) |
| 2 | Time to document | Minutes from the first Psyflo capture or draft for a form to Process Form: median and 75th percentile | Notes processed in the period that have a capture or draft event | Psyflo capture events and the Process Form time | Harvest leadership; staff see their own | A proxy: the bridge cannot see when a form was opened; weekly hours need the staff survey, which is outside Psyflo |
| 3 | Intake to SRA | Days from Process Form on the needs assessment to Process Form on the initial SRA (Pending clinical approval); intake to plan and plan to SRA shown separately | Initial SRAs that reached Pending clinical approval in the period | Process Form events on the CNA, plan and SRA | Clinical lead, administrators | Waiting for a guardian or a signature is not in the interval; a statistic needs 5 or more cases |
| 4 | Items caught early | Items flagged before Process Form: failed drafting checks and Evidence missing boxes on drafts later processed | Forms processed in the period that had a draft; shown as items per 100 forms | Drafting checks and boxes stored with the draft | Supervisors, clinical advisor | Adding a check raises the count; compare like with like |
| 5 | Sends with receipts | Requests a person sent in the period that have a stored receipt (fax delivery receipt, portal confirmation or a logged receipt call) | All requests a person sent in the period | Send events and receipts on each request | Clinical lead, program director | Anything sent outside Psyflo is not counted; a receipt shows delivery, not a decision |
| 6 | Unresolved requests | Open requests awaiting a Harvest action or outcome record: information requested, partial undecided, peer-to-peer requested or awaiting outcome, denied with no appeal sent, or no reply past the decision window | Requests in an active state, shown beside the count | The request stage and its dates | Clinical lead (owner), program director | A snapshot as of today; compare with the count at pilot day 0 |

As built, measure 3 is in days and ends at Pending clinical approval; `02` section g sketched hours ending at awaiting signature. The scorecard shows for the case-backed dataset only. Two further gates proposed in PsyFlo's product direction, the draft rejection rate and week-4 continued use, are not in the scorecard.

**Targets and baselines are not yet established.** No numeric target has come from Harvest. Figures such as 97 percent of notes on time and notes 87 percent better were hypothetical (G-104) and must not be shown. Available context only: the staff survey reports about 40 percent of the day on paperwork against 53 with students, and 10 of 26 direct-care staff spend 11 or more hours a week on it (T-043); a clinic lead expects about 50 minutes saved a day (P-129, secondary); measure 6 has a day-0 baseline by definition. Harvest has never calculated its own approval or partial rates (T-045), so approval rate is not a pilot gate. Next steps: a two-week baseline for measure 1, a one-week observed baseline per pilot staff member for measure 2 (P-130), and an owner and target agreed with Harvest for each (UD-035).

## 7. Registry gaps

Checked by comparing `maturity.js` with the 52 routes in `registry.js`, `ROUTE_CAPS`, the nav, the screens and the server actions. Every registry route exists, every route has a controller and a template, and every route listed under a feature exists. Nothing was changed.

**Registered, but not found or not as described**

| Entry | Registered | Found |
|---|---|---|
| `settings.library` | Pilot (preview), route Settings, note about the documentation trainer | No Library tab in Settings (tabs are People, Roles, Units, Rules, Audit, Family link, Presenter). Only a seed list, an admin-only `library.add` action and a role projection exist |
| `auth.renewalEmail` | Simulated, email is a stub | No email or reminder stub for renewals. Found: the Renewal due filter and a derived Renewal due event, with the lead time from `continued_stay.lead_business_days` |

**Level differs from the registry's own rule or from the review set**

| Entry | Registered | Conflict |
|---|---|---|
| `analytics.ask` | Simulated | `review/00` section 3 item 2 puts everything beyond the scorecard at Future, and `02b` item 41 (an ask-a-question agent) is Future; the build's rule-based question box is simpler than that agent |
| `MobileAssess` | Simulated | `02` section e says assessments are not a pilot job, which rule 1 turns into Future |
| `Analytics` (route) | Future | The page also holds the Working scorecard; a whole-page chip would mislabel it. The screen chips panels individually |

**Routes with no entry of their own** (level inherited; add explicit entries): `DoNext` (from `route.MyWork`), `ReferralForm` and `ReferralSent` (from `route.SchoolPortal`), `Referral` (from `route.Referrals`).

**Built, but not mentioned in any registry entry**

- School-counselor update: the portal form, `school.share` and the Scribe choice to add it to the daily note or a collateral contact. The `school.portal` note says referral and status only (UD-018).
- The household opt-in toggle for payer-facing drafts.
- Owner and backup owner per case (`auth.assign`).
- The wrong-patient hard stop and identity card on the panel and phone.
- The English and Spanish switch in the family portal.
- Signed-PDF and fax-receipt PDF generation (`server/pdf.js`).
- The mock Availity, UHC, state-portal and DMAS pages (port 4002), named only inside route notes.
- No entry for the school portal beyond referral, although `family.portalBeyondSigning` exists and `02` section c lists it as Future.

**Proposed in `02b` for W1 or W2 and not built:** safety-plan completeness check (item 60), maintenance-day framing (61), absence and non-billable handling (64), covering-clinician handoff pack (69), a separate internal SRA sign-off queue (74; the approval stage and a My Work approve task exist), exact DMAS form rendering (124) and an email or Notes dictation route (102). Boilerplate detection (63, 108) is built inside Scan & Enhance and is not registered separately.
