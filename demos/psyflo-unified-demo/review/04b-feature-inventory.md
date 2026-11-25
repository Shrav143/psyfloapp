# 04b · Feature inventory (raw material for the Feature Preservation Matrix)

Agent D. Companion to `04-architecture.md`. One row per functioning feature of each demo.

**How status was verified.** Master: ran the app on ports 4720-4722 (smoke test renders all 46 routes, 0 console errors; `baseline-tests.txt` flows A-D and panels pass); exercised 15 otherwise untested actions through `/api/do`; read the handler for every screen. v3: loaded the built HTML in headless Chromium, navigated all 41 registered routes (0 errors, control counts recorded in the notes), read the module for each feature. Labels on screens were not trusted.

**Status vocabulary.** WORKING = reads/writes real state or produces a real output (PDF, CSV, DOM typing). SIMULATED = stands in for an integration or for intelligence (SMS, Sfax, Availity, DMAS, payer replies, scheduled calendar, agents, canned drafts, scripted transcripts). STATIC = display of seeded content, no state change. BROKEN = erroring or misleading. Qualifiers in the text column. **No feature was found erroring** in either demo; defects are noted as "defect:".

**Surface.** platform · extension (Lauris panel) · mobile · family · school · Lauris mock · portals mock · server. **Role** = who can open it (master: registry `min`, cumulative; v3: `PSY.can` flag). **Destination** follows spec Part 6 and the three-tab structure; "Roadmap" = keep only as a labelled vision item; "Drop" = superseded.

Counts: master 191 rows = 46 screens (1.1), 25 panel and bridge rows (1.2), 13 Lauris-mock rows and 4 portal rows (1.3), 15 server rows (1.4), 5 seed rows (1.5) and all 85 actions in 83 rows (1.6; two pairs share a row). v3: 100 rows = all 41 registered routes, the extension, Lauris simulation, design assets, 13 presenter scenarios and the modules with no visible feature.

---

## Part 1 · Master (M-)

### 1.1 Screens in `web/js/registry.js` (46)

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-001 | Sign in (n0) | `Login.js`, `Login.dc.html` | Role cards fill a seed email; sign-in stores `psyflo_user` in localStorage, password ignored; shortcuts to Family portal (REF-118 token) and School counselor; Google SSO and forgot-password open stub modals | SIMULATED (no auth) | platform | none | Login (kept); role switching moves to presenter toolbar |
| M-002 | Where things live (n1) | `WhereThingsLive.js` | Static audience reference; no data, no links | STATIC | platform | none | Presenter drawer |
| M-003 | Do next (n2) | `DoNext.js` | `doNextBoard` builds today/week/waiting groups from screenings, family links, eligibility, requests, reminders; filters to "mine" unless admin; every line links to its screen; no writes | WORKING (read) | platform | clinician+ | My Work › To do |
| M-004 | School portal home (n3) | `SchoolPortal.js` | Counselor sees the school's referrals and stages, starts a referral, shares a short update on a TDT student (`school.share`); school user from localStorage | WORKING | school | none | School Portal |
| M-005 | Referral form (n4) | `ReferralForm.js` | Full form; guardian-consent attestation; Submit → `referral.create` (REF-nnn) → Sent; "Save and finish later" keeps a draft (`create draft:true`, `update`) | WORKING | school | none | School Portal |
| M-006 | Referral sent (n5) | `ReferralSent.js` | Confirmation; "attach now" → `referral.attach` (moves waiting_on_school to needs_screening) | WORKING | school | none | School Portal |
| M-007 | Referrals list (n6) | `Referrals.js` | List over `referral.stage` with filters (`?f=`) and per-school counts; read only | WORKING (read) | platform | clinician+ | Referrals workspace (never redirected) |
| M-008 | Referral review (n7) | `Referral.js` | Criteria panel (fixed logic over the form); schedule call and text guardian (`referral.scheduleAndText`); send family link; route to grant (`routeAndNotify`); "qualifies" offers (`screening.offer`, `intake.offer`); texts/emails are logged stubs | WORKING; SMS/email SIMULATED | platform | clinician+ | Referrals workspace |
| M-009 | Family link (n8) | `FamilyLink.js` | Five tokenized steps (`/f/<token>`): open, step answers, submit → eligibility "details received"; questions skippable via `settings.family_link`; Spanish toggle | WORKING; SMS delivery SIMULATED | family | none | Family Portal |
| M-010 | Eligibility check (n9) | `Eligibility.js` | Waiting → details received → a person records result (`eligibility.recordProof`: dated proof PDF, +7-day reminder, history); hold/unhold; link to mock DMAS lookup | WORKING; DMAS SIMULATED (never automated) | platform | clinician+ | Referral panel (contextual) |
| M-011 | Parent signs (n11) | `ParentSign.js` | Plain summary, full form, finger signature → `consent.sign` → real signed PDF with signature image | WORKING | family | none | Family Portal (signature mode configurable) |
| M-012 | Parent portal (n12) | `ParentPortal.js` | Consent/task state, week in plain words from notes, check-in due; EN/ES; helpers shared by all parent screens | WORKING (partly seeded) | family | none | Family Portal checklist home |
| M-013 | Extension home (n13) | `ExtHome.js` via `ext-composite.js` | Hosts mock Lauris `/consumers` with the in-page 400-px panel in an iframe; link to open in own tab | WORKING (container) | extension | direct support+ | Extension › home |
| M-014 | Screening call (n14) | `ExtScreening` composite | Container for panel screening view (see M-051) | WORKING (container) | extension | clinician+ | Extension › Scribe |
| M-015 | Intake / CNA (n15) | `ExtCNA` composite | Container for CNA view (M-052) | WORKING (container) | extension | clinician+ | Extension › Scribe |
| M-016 | Treatment plan (n16) | `ExtISP` composite | Container for ISP view (M-053) | WORKING (container) | extension | clinician+ | Extension › Clinical review |
| M-017 | Initial SRA (n17) | `ExtSRA` composite | Container for SRA view (M-058) | WORKING (container) | extension | clinician+ | Extension › Authorization preparation |
| M-018 | Sign-off (n18) | `ExtSignOff` composite | Container for Forms-to-Approve view (M-061) | WORKING (container) | extension | clinician+ | Extension › Authorization preparation |
| M-019 | Sent (n19) | `Submission.js` | Send → `request.send` (fax: Sfax stub, receipt PDF after 3 s; portal: opens mock Availity/UHC); overdue notice, receipt-check call log, signed-PDF link (`request.pdfCopy` for seeded rows), history from events | WORKING; Sfax/Availity SIMULATED | platform | clinician+ | Authorization case › Submission |
| M-020 | Mobile app (n20) | `MobileApp.js` | Student chips (clients where staff = user), start/stop timer (`timer.*`), day-so-far from timer blocks, dictations, notes today | WORKING | mobile | direct support+ | Mobile › My students, Current activity |
| M-021 | Say what happened (n21) | `MobileDictate.js` | Web Speech mic, typing or example → `enhanceDictation` (rule-based, 3 source chips) → `dictation.save` + `dictation.annotate`; waits for the open student | WORKING; STT real in Chrome, drafting deterministic | mobile | direct support+ | Mobile › Say what happened, Review |
| M-022 | Assessments (n22) | `MobileAssess.js` | Due list seeded; "Ask now" SUDS or DSM child → `assessment.save`; held until student open in Lauris | WORKING (seeded list) | mobile | direct support+ | Mobile › assessments |
| M-023 | Daily note (n23) | `ExtDPN` composite | Container for DPN view (M-054) | WORKING (container) | extension | direct support+ | Extension › Scribe |
| M-024 | Weekly guardian call (n24) | `ExtWeekly` composite | Container (M-055) | WORKING (container) | extension | direct support+ | Extension › Scribe |
| M-025 | Monthly collateral (n25) | `ExtMonthly` composite | Container (M-056) | WORKING (container) | extension | direct support+ | Extension › Scribe |
| M-026 | Incident report (n26) | `ExtIncident` composite | Container (M-057) | WORKING (container) | extension | direct support+ | Extension › Additional actions |
| M-027 | Supervisor review queue (n27) | `ReviewQueue.js` | Pending notes by trainee, wrote-vs-enhanced diff, Approve / Return with note / "That didn't happen" → `note.review`; "who needs approval" → `staff.reviewMode` | WORKING | platform | supervisor+ | My Work › Review |
| M-028 | Staff dashboard (n28) | `StaffDashboard.js` | On-time notes counted from `notes` (Flow B moves 4 of 6 → 5 of 6); my/supervisor views; time-in-Lauris, rejected forms, goal watch seeded | WORKING (partly seeded) | platform | direct support+ | My Work › Team |
| M-029 | Authorizations (n29) | `Authorizations.js` | Tabs All/Mine/Info/Partial/Denied/Active/Renew via `requestTags`; payer/service/type filters; per-row history; next action in words; admin-only Demo "receive a reply" and "advance a day" (browser role check) | WORKING | platform | clinician+ | Authorizations (queue) |
| M-030 | Parent survey (n31) | `ParentSurvey.js` | Three questions + free text → `checkin.save` (guardian) | WORKING | family | none | Family Portal |
| M-031 | Quarterly report (n32) | `ExtQuarterly` composite | Container (M-059) | WORKING (container) | extension | clinician+ | Extension › Clinical documents |
| M-032 | Continued stay (n33) | `ExtCase` composite | Container (M-060) | WORKING (container) | extension | clinician+ | Authorizations › evidence; Extension › Scan & Enhance |
| M-033 | Information request (n34) | `InfoRequest.js` | Reply drafted from asked items and notes, editable (`infoReply`), send by fax by default or portal (`infoSend`), 24-h clock from `requestClock` | WORKING; sending SIMULATED | platform | clinician+ | Denial Intelligence › action |
| M-034 | Partials and denials (n35) | `Partials.js` | Stretch / use up / peer-to-peer via `partialChoice` (logged, "not sent to insurer"); last-time comparison from `payer_history`; reasons table from `denial_reasons`; denial handed to guardian | WORKING (internal log) | platform | clinician+ | Denial Intelligence › options |
| M-035 | Early discharge (n36) | `EarlyDischarge.js` | Computes run-out, discharge, intake, earliest new initial (30 d); `plan.set` writes reminders and `early_discharge` stage; defect: Dec 18 vs canvas Dec 9 | WORKING | platform | clinician+ | Authorization case › transition |
| M-036 | Discharge summary (n37) | `ExtDischarge` composite | Container (M-062) | WORKING (container) | extension | clinician+ | Extension › Clinical documents |
| M-037 | Peer-to-peer call notes (n38) | `PeerBrief.js` | Notes assembled from the request; Print; schedule (`p2pSchedule`); optional recording with consent gate (`p2pRecording`, STT or typed); log outcome incl. "awaiting" (`p2pLog`) | WORKING | platform | clinician+ | Denial Intelligence › action |
| M-038 | Appeal letter (n39) | `AppealLetter.js` | Guardian reads, edits, signs by finger → `appealSign` → appeal PDF, stage `appeal_sent`; EN/ES; Psyflo never signs | WORKING | family | none | Denial Intelligence + Family Portal |
| M-039 | Payer playbook (n40) | `PayerPlaybook.js` | Table from `payers` (counts not percentages) and the 14 drafting rules | STATIC | platform | clinician+ | Payer guidance (Analytics › Payer) |
| M-040 | Analytics (n42) | `Analytics.js` | Seeded baseline KPIs/monthly chart/by-payer/one child (M.R.); locality toggle filters seed; PDF via `file.pdf`; CSV Blob; division-report and grant-pull modals (cited sentences) | WORKING over seeded export | platform | clinician+ | Analytics (three sections, provenance-tagged) |
| M-041 | Users and roles (n43) | `Users.js` | Table; add user; change role (nav changes at once); review mode shown | WORKING | platform | admin | Settings › Users |
| M-042 | Enrollment packet (n46) | `ParentEnroll.js` | Seven papers; acknowledge and short forms → `enroll.save`; two signed forms route to Parent signs | WORKING | family | none | Family Portal |
| M-043 | Progress, family view (n47) | `ParentProgress.js` | Plain-words progress from goals, ratings, referrals, check-ins; no scores or diagnoses | WORKING (partly seeded) | family | none | Family Portal |
| M-044 | Quarterly, guardian signs (n48) | `ParentQuarterly.js` | Quarter in plain words; finger signature → `consent.sign` (form "Quarterly report"); closes portal task | WORKING | family | none | Family Portal |
| M-045 | Insurance letters explained (n49) | `ParentLetters.js` | One card per payer action derived from `requests`; denial links to appeal; glossary | WORKING (derived) | family | none | Family Portal |
| M-046 | Book a time (n50) | `ParentSchedule.js` | Books screening call or intake from `openSlots` (stand-in for clinician calendars), ride request, day-before confirm | WORKING; calendar SIMULATED | family | none | Family Portal |

### 1.2 Extension panel and bridge (`web/panel/panel.js`, `bridge.js`)

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-047 | Panel home / consumers list | `panel.js` `homeView` | Reads consumer list from the open page; role toggle (demo), task tiles with form and student pickers, timer start/stop, new-referral offers; school home variant | WORKING | extension | direct support+ | Extension home (Current student, Scribe, Track Time, Scan & Enhance, Next task) |
| M-048 | New consumer from referral | `newConsumerView`, `fillNew` | Types referral facts into New Consumer; after a person saves, `referral.inLauris` links Harvest # | WORKING | extension | clinician+ | Referrals workspace + Extension |
| M-049 | Consumer record view | `recordView` | Record tile, "record the screening call", drops waiting assessments into the Lauris survey page (`dropSurvey`) | WORKING | extension | direct support+ | Extension › Scribe |
| M-050 | Non-TDT guard | `offView` | Panel off and reads nothing for SEBS/outpatient records | WORKING | extension | all | Extension (keep) |
| M-051 | Screening call (Flow A) | `screeningView` | Auto-types six pre-call boxes (yellow); record (Web Speech or scripted); "Before you hang up" prompts tick; `draftScreening` → 11 boxes with sources and 14 checks; Fill or one at a time; `screening.drafted`, `panel.filled` | WORKING; STT real, drafting deterministic | extension | clinician | Extension › Scribe |
| M-052 | Intake / CNA | `cnaView` | Prior services and presenting issue copied from screening ("copied from screening"); still-to-ask list; fill | WORKING | extension | clinician | Extension › Scribe |
| M-053 | Treatment plan (ISP) | `seededView('isp')` | Canvas aside with three goals for T.W. only; typing real, draft text canned; guardian signature task | SIMULATED (canned, T.W.) | extension | clinician | Extension › Clinical review |
| M-054 | Daily note (Flow B) | `dpnView` | Waiting dictation drops in with contact-time rows from timer blocks, mood, progress; confirm units (rule 60/180/300); say-it in panel (`panel.dictation`); school-update cards credited to counselor; "Good recommendation / Needs improvement" (`panel.feedback`) | WORKING | extension | direct support+ | Extension › Scribe |
| M-055 | Weekly guardian call | `seededView('weekly')` | Record/Stop, fill 4 boxes, "also noted for continued stay"; M.R. only, others "No draft … in this demo" | SIMULATED (canned, M.R.) | extension | direct support+ | Extension › Scribe |
| M-056 | Monthly collateral | `seededView('collateral')` | As weekly plus school update filled into collateral (`school.shareUsed`) | SIMULATED (canned, M.R.); school path WORKING | extension | direct support+ | Extension › Scribe |
| M-057 | Incident report | `seededView('incident')`, `incidentSayView` | D.W. worked example; other students: say what happened, Psyflo fills only what it knows; state-portal button opens mock portal and logs time (`incident.filePortal`) | SIMULATED (canned D.W.); say-it WORKING | extension | direct support+ | Extension › Additional actions |
| M-058 | Initial SRA (Flow C) | `sraView` | `draftInitialSRA` from screening, referral, school numbers, ISP; criterion 1 editable; criterion 3 left blank when 1-2 met; trauma-informed care never drafted; Fill all 7; `request.ensure` | WORKING | extension | clinician | Extension › Authorization preparation |
| M-059 | Quarterly report | `seededView('quarterly')` | Per-goal bars, fill 6, guardian signature task (`portalTask.create`), staff-only internal quarterly (`quarterly.internalSave`, never sent anywhere) | SIMULATED (canned, M.R.); internal quarterly WORKING | extension | clinician | Extension › Clinical documents |
| M-060 | Continued stay | `seededView('sra-continued')` | Date-range toggle switches between constants (21 vs 61 notes, `draft.js:345`), include/exclude household disclosure, fill 6, numbered source chips | SIMULATED (constants; no note rows behind it) | extension | clinician | Authorizations › evidence |
| M-061 | Sign-off (Forms to Approve) | `signoffView` | Reads approvals list and preview from Lauris, checks against rules; a person presses Get Signature in Lauris | WORKING | extension | clinician | Extension › Authorization preparation |
| M-062 | Discharge summary | `seededView('discharge')` | D.W. canned; fill 6; "then new intake Dec 8" | SIMULATED (canned) | extension | clinician | Extension › Clinical documents |
| M-063 | Portal confirmation view | `portalView` | Shows the confirmation number read from the mock portal page and the request it closed | WORKING | extension | clinician | Extension (keep) |
| M-064 | Saved / rejected lists view | `listView` | Reads Lauris saved and rejected lists | WORKING | extension | direct support+ | Extension home |
| M-065 | Saved version tracking | `savedHTML` | Shows what a person actually saved in Lauris and how many typed boxes changed (`lauris.savedVersion`) | WORKING | extension | direct support+ | Scan & Enhance › version history |
| M-066 | Bridge: read page | `bridge.js` `readPage` | Reads consumer header, form fields (label, value, green/yellow), lists, approvals, preview, counts via fixed DOM ids | WORKING | extension | n/a | Keep unchanged |
| M-067 | Bridge: fill by label | `fill`, `typeInto` | Types into boxes found by label text, animated, marks yellow; never presses Process/Signature/Send | WORKING | extension | n/a | Keep unchanged |
| M-068 | Bridge: focus and mark | `focusField`, `mark` | Scrolls/outlines a box; marks existing text as typed | WORKING | extension | n/a | Keep |
| M-069 | Bridge: observe events | `observe` | After PRG redirect reads `#lauris-flash` (created/saved/processed/signed/rejected) and reports `lauris.observed`, `lauris.savedVersion` | WORKING | extension | n/a | Keep unchanged |
| M-070 | Bridge: portal reader | `observe` portal branch | Reads `#portal-confirmation` once per ref → `portal.observed` | WORKING | extension | n/a | Keep |
| M-071 | Bridge transports | `bridge.js:177-202`, `extension/*` | MV3 content script + side panel relay; in-page iframe `postMessage` with origin checks; portal mode | WORKING (side panel untested headless) | extension | n/a | Keep |

### 1.3 Mock Lauris (`server/lauris`, port 4001) and portals (`server/external`, port 4002)

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-072 | Lauris login | `site.js:184-197` | Cookie login by seed staff id; `?as=` shortcut | SIMULATED | Lauris mock | n/a | Keep |
| M-073 | Consumers list | `site.js:200-221` | Filters, Active/Discharged, units column, sidebar counts, `#consumer-list` | WORKING | Lauris mock | n/a | Keep |
| M-074 | New consumer | `site.js:222-236` | Form; creates consumer (next number from 4492) → `created` flash | WORKING | Lauris mock | n/a | Keep |
| M-075 | Consumer record | `site.js:237-251` | Header, six tabs, units | WORKING | Lauris mock | n/a | Keep |
| M-076 | Add session / form picker | `site.js:252-260` | Chooses one of 11 forms | WORKING | Lauris mock | n/a | Keep |
| M-077 | Session forms (11) | `forms.js`, `site.js:261-286` | screening, cna, isp, dpn, weekly, collateral, quarterly, incident, sra-initial, sra-continued, discharge; green prefill; Save Form Data / Process Form; Process copies to Active File, adds approvals, updates goals/units | WORKING | Lauris mock | n/a | Keep (+ field aliases) |
| M-078 | Saved sessions | `site.js:306` | Lists saved, unprocessed | WORKING | Lauris mock | n/a | Keep |
| M-079 | Forms to Approve | `site.js:311-325` | PREVIEW ONLY render, Get Signature (stamps reviewer/time), Reject with note | WORKING | Lauris mock | n/a | Keep |
| M-080 | Rejected forms | `site.js:329` | Reviewer note per form | WORKING | Lauris mock | n/a | Keep |
| M-081 | Surveys | `site.js:287-305` | PHQ-A, GAD-7, SUDS, DSM; Lauris scores on save | WORKING | Lauris mock | n/a | Keep |
| M-082 | Consumers without authorizations | `site.js:333` | List where no auth | WORKING | Lauris mock | n/a | Keep |
| M-083 | Reports, User, Time Tracker pages | `site.js:337` | Placeholder "Not part of the mock" | STATIC | Lauris mock | n/a | PORT v3 Time Tracker and Authorizations layouts here |
| M-084 | Non-TDT records | `store.js:47-49` | H.B. (SEBS), W.S. (discharged) so the guard is demonstrable | WORKING | Lauris mock | n/a | Keep |
| M-085 | Mock Availity / UHC upload | `external/site.js` | Upload page (request or reply) → confirmation with ref `AV-`/`UHC-` | SIMULATED | portals mock | n/a | Keep |
| M-086 | Mock state incident portal | `external/site.js` | Form → `VA-INC-` reference | SIMULATED | portals mock | n/a | Keep |
| M-087 | Mock DMAS lookup | `external/site.js` | Static "Active · plan" page a person reads | SIMULATED | portals mock | n/a | Keep (visibly simulated) |
| M-088 | Portal bridge | `external/site.js` page script | Loads `bridge.js` in portal mode | WORKING | portals mock | n/a | Keep |

### 1.4 Server and shared infrastructure

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-089 | Single global store + persistence | `store.js` | JSON state in `DATA_DIR`, sync write per action, `rev` | WORKING | server | n/a | Keep + hooks |
| M-090 | SSE sync | `index.js:30-39`, `api.js` | `{rev}` push, full-state refetch, 15 s fallback | WORKING | server | n/a | Keep |
| M-091 | Presets live / canvas | `store.js:39-105` | Rebuilds state and Lauris from seed | WORKING | server | any (no check) | Presenter |
| M-092 | Seed merge | `store.js:16-34` | `seed/extra/*.json` arrays append, objects merge, new keys pass through | WORKING | server | n/a | Keep |
| M-093 | Audit events | `store.event` | Append-only `{at,what,who,record}`; read by Sent, Info, Authorizations history | WORKING | server | n/a | Extend (actor kind) |
| M-094 | PDF writer | `pdf.js` | Text + JPEG signature PDF; no charts | WORKING | server | n/a | Extend raw-bytes path |
| M-095 | File store | `store.writeFile`, `/files/*` | Writes and serves PDFs | WORKING | server | n/a | Keep |
| M-096 | Sfax stub | `core.js:185-204` | 3-s timer then reference and receipt PDF | SIMULATED | server | n/a | Keep (labelled) |
| M-097 | SMS and email stubs | `core.js:65-82`, `x-referrals.js` | Logged as events with text; nothing sent | SIMULATED | server | n/a | Keep |
| M-098 | Drafting engine + 14 checks | `shared/draft.js` | Deterministic extractors; every box carries numbered sources; CHECKS pass/fail; imported by server and panel | WORKING (no LLM) | server/extension | n/a | Keep; add finding schema |
| M-099 | Notes drawer | `app.js:129-139,182-186` | Parses `seed/notes.md` into "How the data gets in" per screen | WORKING | platform | all | Presenter drawer |
| M-100 | Demo bar | `index.html`, `app.js:157-181` | Screen picker (role-filtered), prev/next, How it fits, notes, Lauris link, switch user, reset | WORKING | platform | all | Presenter toolbar |
| M-101 | Generated sidebar | `app.js:107-127` | Role-filtered nav with live counts | WORKING | platform | all | Three-tab nav |
| M-102 | Template engine | `runtime.js` | `{{}}`, `sc-for`, `sc-if`, on* handlers over `.dc.html` | WORKING | platform | n/a | Keep |
| M-103 | Tokenized links | `app.js:39-48` | `/f/<token>`, `/parent/<token>/<Screen>` | WORKING | family | none | Keep |

### 1.5 Seeded reference data (no UI of their own)

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-104 | `analytics_baseline` | seed | 12-month export: 146 decided, 57% partial, monthly, by locality, payer awarded | STATIC | platform | n/a | Analytics `harvest_export` dataset |
| M-105 | `payer_history`, `denial_reasons` | seed/extra | Last-time comparison; 7 denial reasons with checks | STATIC | platform | n/a | Denial Intelligence › evidence |
| M-106 | `compliance`, `migration`, `library`, `incidents` | seed | Data of screens dropped Nov 7-8. `compliance`/`migration` now feed only the Analytics grant-pull lines; `incidents` feeds the panel incident view and an unused sidebar count; `library` is read by nothing | STATIC (orphaned) | platform | n/a | Settings / roadmap |
| M-107 | `settings.family_link` | seed/extra/referrals.json | Question toggles read by FamilyLink; defect: no screen edits them | STATIC (orphaned) | family | n/a | Settings › Family link |
| M-108 | `request_details`, `staff_dashboard`, `parent_progress`, `school_goals`, `assessments_due/history` | seed | Per-request tracker fill; dashboard seeded figures; parent week; goals | STATIC | platform | n/a | Keep |

### 1.6 Actions (85; args abridged; effects in one line; `*` = no caller)

| ID | Action | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| M-109 | `demo.reset` | `core.js:12` + `index.js:43` | Rebuilds Psyflo and (via HTTP hook) Lauris for a preset | WORKING | server | none checked | Presenter |
| M-110 | `demo.advanceDay` | `core.js:13` | `today`+1; overdue sweep; defect: Lauris clock unchanged | WORKING (defect) | server | admin (browser) | Presenter |
| M-111 | `referral.create` | `core.js:22` | New REF-nnn (draft or needs_screening) | WORKING | school | none | School Portal |
| M-112 | `referral.update` | `core.js:32` | Merge form; submit moves draft to needs_screening | WORKING | school | none | School Portal |
| M-113 | `referral.attach` | `core.js:39` | Marks attachment; waiting_on_school → needs_screening | WORKING | school | none | School Portal |
| M-114 | `referral.scheduleScreening` | `core.js:46` | Books call, reminder, event (called by M-179 and M-168) | WORKING | platform | clinician | Referrals |
| M-115 | `referral.routeGrant` | `core.js:54` | Stage grant_program (called by M-180) | WORKING | platform | clinician | Referrals |
| M-116 | `referral.stage`* | `core.js:59` | Sets stage and next | WORKING (orphan) | platform | any | Remove or document |
| M-117 | `familyLink.send` | `core.js:65` | Token, SMS stub event, eligibility row `waiting_link` | WORKING; SMS SIMULATED | platform | clinician | Referrals |
| M-118 | `familyLink.open` | `core.js:83` | Stamps opened | WORKING | family | none | Family Portal |
| M-119 | `familyLink.step` | `core.js:87` | Saves step answers | WORKING | family | none | Family Portal |
| M-120 | `familyLink.submit` | `core.js:91` | Updates guardian, sets eligibility `details_received` with lookup details | WORKING | family | none | Family Portal |
| M-121 | `eligibility.record` | `core.js:105` | Refuses before family-link submit; sets result, plan, next check, client.medicaid, reminder | WORKING | platform | clinician | Referrals |
| M-122 | `consent.sign` | `core.js:118` | Signed PDF with signature image; closes portal tasks | WORKING | family | none | Family Portal |
| M-123 | `checkin.save` | `core.js:140` | Appends check-in | WORKING | family/school | none | Family Portal |
| M-124 | `portalTask.create` | `core.js:144` | Signing task for parent portal | WORKING | platform | clinician | Family Portal |
| M-125 | `request.ensure` | `core.js:150` | Creates the draft request (initial or continued) once; called by the panel and M-162 | WORKING | server | clinician | Authorizations |
| M-126 | `request.processed`* | `core.js:164` | draft_ready → awaiting_signature (superseded by `lauris.observed`) | WORKING (orphan) | server | any | Remove |
| M-127 | `request.signed` | `core.js:170` | Saves signed PDF from preview, packet event; stage signed (called by M-162) | WORKING | server | clinician | Authorizations |
| M-128 | `request.send` | `core.js:185` | Guard: only after signed; fax (3-s Sfax stub) or opens portal | WORKING; SIMULATED channel | platform | clinician | Authorizations |
| M-129 | `request.portalConfirmed` | `core.js:211` | submitted with ref, decision due +7 d (called by M-163) | WORKING | server | clinician | Authorizations |
| M-130 | `request.overdueNotice` | `core.js:218` | Records notice sent | WORKING | platform | clinician | Authorizations |
| M-131 | `request.receiptCheck` | `core.js:223` | Records day-5/10 receipt call | WORKING | platform | supervisor/clinician | Authorizations |
| M-132 | `request.demoReply` | `core.js:229` | approved / partial / info / denied; anonymous callable (verified) | SIMULATED | platform | admin (browser only) | Presenter |
| M-133 | `request.partialDecide`* | `core.js:237` | Four doors; superseded by `partialChoice` | WORKING (orphan) | server | any | Remove |
| M-134 | `request.infoReply` | `core.js:253` | Saves edited reply | WORKING | platform | clinician | Denial Intelligence |
| M-135 | `request.infoSend` | `core.js:258` | Fax: submitted, clock restarts; portal: opens upload | WORKING; SIMULATED channel | platform | clinician | Denial Intelligence |
| M-136 | `request.appealSign` | `core.js:267` | Guardian-signed appeal PDF; stage appeal_sent | WORKING | family | none | Denial Intelligence + Family Portal |
| M-137 | `request.close`* | `core.js:277` | Stage closed | WORKING (orphan) | server | any | Remove or use in disputes |
| M-138 | `request.set`* | `core.js:278` | Arbitrary patch | WORKING (orphan, unsafe) | server | any | Remove |
| M-139 | `plan.set` | `core.js:281` | Early-discharge plan, reminders, stage | WORKING | platform | clinician | Authorizations |
| M-140 | `timer.start` | `core.js:291` | One running timer per staff | WORKING | mobile/extension | direct support+ | Track Time |
| M-141 | `timer.stop` | `core.js:295` | Appends [start,end,client] block | WORKING | mobile/extension | direct support+ | Track Time |
| M-142 | `dictation.save` | `core.js:301` | Stores spoken/rewritten/chips/checks as waiting | WORKING | mobile | direct support+ | Mobile |
| M-143 | `dictation.used`* | `core.js:307` | Marks used (done inside `lauris.observed`) | WORKING (orphan) | server | any | Remove |
| M-144 | `dictation.discard` | `core.js:308` | Deletes | WORKING | mobile/extension | direct support+ | Mobile |
| M-145 | `assessment.save` | `core.js:309` | Holds answers until student open in Lauris | WORKING | mobile | direct support+ | Mobile |
| M-146 | `assessment.used` | `core.js:313` | Marks used (no caller outside `lauris.observed`) | WORKING | server | any | Keep |
| M-147 | `note.processed` | `core.js:315` | Creates note; pending when `every_note` (called by M-162) | WORKING | server | n/a | My Work › Review |
| M-148 | `note.review` | `core.js:323` | approved / returned / flagged with comment | WORKING | platform | supervisor+ | My Work › Review |
| M-149 | `screening.done`* | `core.js:330` | Superseded by `lauris.observed` | WORKING (orphan) | server | any | Remove |
| M-150 | `draft.save`* | `core.js:337` | Stores draft blob | WORKING (orphan) | server | any | Remove |
| M-151 | `client.update`* | `core.js:341` | Arbitrary patch | WORKING (orphan, unsafe) | server | any | Remove |
| M-152 | `lauris.event`* | `core.js:345` | Writes an audit line | WORKING (orphan) | server | any | Remove |
| M-153 | `incident.filePortal` | `core.js:348` | Logs time the state portal was filed | WORKING | extension | supervisor+ | Extension › Additional actions |
| M-154 | `incident.save`* | `core.js:353` | Unshift incident | WORKING (orphan) | server | any | Remove |
| M-155 | `user.add` | `core.js:356` | New staff (id derived) | WORKING | platform | admin | Settings › Users |
| M-156 | `user.update` | `core.js:363` | Patch role/title | WORKING | platform | admin | Settings › Users |
| M-157 | `settings.set`* | `core.js:365` | Key/value | WORKING (orphan) | server | any | Settings |
| M-158 | `library.add`* | `core.js:366` | Library doc | WORKING (orphan) | server | any | Roadmap |
| M-159 | `migration.rerun`* | `core.js:367` | Re-read export stub | WORKING (orphan) | server | any | Roadmap |
| M-160 | `reminder.done`* | `core.js:368` | Marks reminder done; no UI, so reminders never clear | WORKING (orphan; defect) | server | any | My Work |
| M-161 | `file.pdf` | `core.js:369` | Stores a generated PDF and returns its URL | WORKING | server | clinician+ | Analytics export |
| M-162 | `lauris.observed` | `lead-extension.js:19` | Bridge report: created, saved, processed, signed, rejected → screenings, requests (stage moves), notes, units, incidents, discharge follow-up | WORKING | extension | n/a | Keep (lead-only) |
| M-163 | `portal.observed` | `lead-extension.js:115` | Confirmation → request submitted | WORKING | extension | n/a | Keep |
| M-164 | `panel.filled` | `lead-extension.js:124` | Audit of boxes typed and sources | WORKING | extension | n/a | Scan & Enhance versions |
| M-165 | `screening.drafted` | `lead-extension.js:131` | Computes and keeps the screening draft | WORKING | extension | clinician | Scribe |
| M-166 | `enroll.save` | `x-family.js:14` | Packet item acknowledged/filled | WORKING | family | none | Family Portal |
| M-167 | `screening.offer` | `x-family.js:23` | Family asked to book the call (SMS stub) | WORKING; SMS SIMULATED | platform | clinician | Referrals |
| M-168 | `screening.bookByFamily` | `x-family.js:30` | Replaces booking | WORKING | family | none | Family Portal |
| M-169 | `intake.offer` | `x-family.js:41` | Family asked to book intake | WORKING | platform | clinician | Referrals |
| M-170 | `intake.book` | `x-family.js:46` | Books intake, optional ride reminder | WORKING | family | none | Family Portal |
| M-171 | `intake.ride` | `x-family.js:59` | Toggle ride request | WORKING | family | none | Family Portal |
| M-172 | `intake.confirm` | `x-family.js:67` | Day-before confirm | WORKING | family | none | Family Portal |
| M-173 | `lauris.savedVersion` | `x-panel.js:17` | Keeps final saved values and diff against what the panel typed; links to note | WORKING | extension | n/a | Scan & Enhance versions |
| M-174 | `panel.feedback` | `x-panel.js:57` | Good / needs improvement (reason required) | WORKING | extension | direct support+ | Scan & Enhance |
| M-175 | `panel.dictation` | `x-panel.js:71` | Dictation made inside panel | WORKING | extension | direct support+ | Scribe |
| M-176 | `referral.inLauris` | `x-panel.js:81` | Links Harvest # after person creates consumer | WORKING | extension | clinician | Referrals |
| M-177 | `dictation.annotate` | `x-portals.js:8` | Adds daily-note paragraph and boxes | WORKING | mobile | direct support+ | Mobile |
| M-178 | `quarterly.internalSave` | `x-quarterly.js:8` | Staff-only internal quarterly, versioned, never exported | WORKING | extension | clinician | Extension › Clinical documents |
| M-179 | `referral.scheduleAndText` | `x-referrals.js:13` | Replaces booking, texts guardian, emails counselor (stubs) | WORKING; stubs SIMULATED | platform | clinician | Referrals |
| M-180 | `referral.routeAndNotify` | `x-referrals.js:27` | Grant route + 3 stub notices | WORKING; stubs SIMULATED | platform | clinician | Referrals |
| M-181 | `referral.hold` / `referral.unhold` | `x-referrals.js:37,43` | Hold with reason, family told (stub) | WORKING | platform | clinician | Referrals |
| M-182 | `eligibility.recordProof` | `x-referrals.js:51` | Dated proof PDF, closes reminder, history | WORKING | platform | clinician | Referrals |
| M-183 | `request.partialChoice` | `x-requests-history.js:14` | stretch / use_up / p2p (with or without date); logged, nothing sent | WORKING | platform | clinician | Denial Intelligence |
| M-184 | `request.p2pSchedule` | `x-requests-history.js:45` | Records agreed call date | WORKING | platform | clinician | Denial Intelligence |
| M-185 | `request.p2pLog` | `x-requests-history.js:58` | awaiting / approved / partial / denied → stage and units | WORKING | platform | clinician | Denial Intelligence |
| M-186 | `request.p2pOutcome`* | `core.js:245` | Superseded by `p2pLog` | WORKING (orphan) | server | any | Remove |
| M-187 | `request.p2pRecording` | `x-p2p-recording.js:7` | Consent gate (unless typed); stores transcript | WORKING | platform | clinician | Denial Intelligence |
| M-188 | `request.pdfCopy` | `x-requests.js:11` | Creates a labelled demo copy for seeded signed PDFs | WORKING | platform | clinician | Authorizations |
| M-189 | `school.share` / `school.shareUsed` | `x-school.js:8,19` | Counselor update; logged use in daily note or collateral | WORKING | school | none / staff | School Portal + Extension |
| M-190 | `staff.reviewMode` | `x-staff-review.js:6` | Every-note vs spot-check per direct-support staff | WORKING | platform | supervisor+ | My Work › Review |
| M-191 | `compliance.qiCheck`* | `x-staff.js:6` | Monthly QI check; screen dropped | WORKING (orphan) | server | any | Roadmap |

(M-109 to M-191 cover all 85 actions; paired actions share a row.)

---

## Part 2 · v3 (V-)

Routes are `PSY.screens` ids (41). Control counts (`data-go` / `data-act`) were measured by navigating each route.

### 2.1 Platform routes

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| V-001 | Referral form (public) | `captured.js` `ref-form` | Static form; Submit sets `referral['REF-118']` and toasts; Save later toasts; attach toasts "Attached: 2 files" | STATIC (toast level) | school | none | Drop (master M-005) |
| V-002 | Family link (public) | `captured.js` `family-phone` | Step counter only (`family-next`); no data capture | STATIC | family | none | Drop (master M-009) |
| V-003 | Family-link settings | `84-family-settings.js` | Question list with ask/required switches saved to `prefs.fam`; Save audits | WORKING | platform | settings | PORT → Settings › Family link (fills M-107 orphan) |
| V-004 | Referral review and home | `PSY.REDIRECT` | `home`, `referrals`, `ref-review` redirect to Authorizations; payers, connect-lauris likewise | WORKING | platform | all | **Do not port** (removes Referrals) |
| V-005 | All Authorizations list | `80-auth-list.js` | 10 filters (search, status, payer, service, request type, clinician, location, school, units remaining, next step due) + date-range box with "ends in 7/30/60" presets, sortable table (consumer, service, payer, clinician, period, requested, approved, remaining, status, next action); 18 `data-go`, 23 `data-act` | WORKING (derived from cases) | platform | auth (LCS, admin) | PORT → Authorizations queue |
| V-006 | Authorization detail | `80-auth-list.js` `auth-detail` | Stepper, requested vs approved units, documents (names only for admin), deadlines with sources, renewal, submission record, History; voice button | WORKING | platform | auth | PORT → Authorization case shell |
| V-007 | Draft mirrors | `89-drafts.js` `draft-initial`, `draft-continued` | Read-only mirror of the Lauris draft with provenance labels, missing items, timeline; 7 and 36 acts | WORKING (static content) | platform | auth | PORT → case › Documentation |
| V-008 | Delivery trail | `88-requests.js` `sent` | Submission trail page; overdue notice modal, receipt toasts ("Psyflo is dialing…") | SIMULATED | platform | auth | REPLACE with master Submission |
| V-009 | Denial Intelligence queue | `50-denials.js` | One table: denial, consumer, payer, service, decision, status, next step, deadline, owner; 8 filters + decision-date range; sortable; "Clear filters"; claims rows | WORKING | platform | denials | PORT → Denial Intelligence queue |
| V-010 | Denial case workspace | `51-denial-detail.js` `di-case` (alias `denial-detail`; `partials`, `info-request`, `p2p-notes` open it) | Header with status chip and deadline; stepper (Decision Received → Resolved); menu sections (Overview with 7 steps, What payer said, Clinical evidence, Where the denial is weak, Reply, Appeal draft, Peer-to-peer script, Reconsideration, Documentation request); right-side step panels; History; 61 acts | WORKING | platform | denials | PORT → DenialCase |
| V-011 | Options per issue | `50-denials-util.js` `BY_ISSUE`, `optDefs` | Valid options per issue type (accept, recon, p2p, evidence, appeal, alt, reply), each with deadline + source or "Payer requirement verification needed" | WORKING | platform | denials | PORT (spec 8.2 "show only valid options") |
| V-012 | Dispute documents | `51-denial-detail.js`, `05-sync.js` | Generate → edit → review → prepare → "simulate submission" per document (info, p2p, appeal, recon); versions through `PSY.sync` | WORKING; submission SIMULATED | platform | denials | PORT; replace submit with person-initiated record |
| V-013 | Evidence and weak points | `51-denial-detail.js` | Payer-said vs chart, weak-point cards (strength, finding, citation, fix), "Add to the evidence" | WORKING (hand-written content for 5 cases) | platform | clinicalRecords | PORT → Evidence section (grounded only) |
| V-014 | Peer-to-peer script | `87-p2p.js` | Discussion guide (presentation, functional impairment, level of care, rationale, prior interventions, response, necessity, questions), call details, outcome, PDF/copy | WORKING | platform | denials | PORT → merge into PeerBrief |
| V-015 | Partial doors | `86-partials.js` | Four doors per case (accept, add info, p2p, discharge + new initial) | WORKING | platform | denials | REPLACE with master `partialChoice` + early discharge |
| V-016 | Resolution status | `05-sync.js` `PSY.diStatus` | 10 resolution states; setting one propagates to the authorization (overturned → approved with units) | WORKING | platform | denials | PORT → `disputes.status` + reconcile |
| V-017 | Claims disputes | `02-core-data.js`, `50-denials-util.js` | CL-217, CL-221 illustrative claim denials: corrected claim, reconsideration, appeal docs | SIMULATED (illustrative) | platform | denials | Roadmap (not in master domain) |
| V-018 | Info-request (K.T.) | `88-requests.js`, `info-request` | Opens the DI workspace on the reply; send (simulated) → Awaiting Payer | SIMULATED send | platform | denials | REPLACE with master M-033 |
| V-019 | Analytics shell | `41-analytics.js` | Three section tabs, shared filter bar (date range with previous-period comparison, program, location, payer, clinician, diagnosis, population), Reset Filters; 136 acts | WORKING | platform | analytics | PORT → Analytics |
| V-020 | Patient Outcomes | `41c-an-outcomes.js` | Six KPIs with definitions and change vs prior; outcomes over time (one metric at a time); Treatment Feedback & Engagement; progress timeline; patients requiring review; data completeness | WORKING over simulated cohort | platform | analytics (rows need clinicalRecords) | PORT |
| V-021 | Payer Performance | `41d-an-payer.js` | Comparison, payer detail, trends, top denial reasons, documentation deficiencies, denial by payer/service, appeal outcomes, revenue (needs configured rates), insights; "Investigate in Denial Intelligence" | WORKING over simulated cohort | platform | analytics | PORT (case-backed adapter) |
| V-022 | Patient Population | `41e-an-population.js` | Summary, age, geography, insurance, referral sources, enrollment, locations, diagnoses, diagnosis by program/trend, service utilization, interventions (with clinician review of uncertain classifications), goals, admissions vs discharges | WORKING over simulated cohort | platform | analytics | PORT |
| V-023 | Ask FLO (suggested questions) | `41f-an-ask-export.js` | 6 suggested questions computed from the cohort with chart, interpretation, source, calculation, CSV; typed free text is not answered (says so) | WORKING over simulated cohort | platform | analytics | PORT as "Ask" (rename; unsupported → limitation message) |
| V-024 | Export Report | `41f-an-ask-export.js`, `06-pdf-report.js` | Outcomes / Payer / Population / custom as PDF (vector charts) or CSV with period, filters, definitions, completeness; groups under 5 suppressed | WORKING | platform | analytics | PORT |
| V-025 | Simulated cohort | `85c-cohort.js` | 120 generated patients, 293 authorizations, 2,961 interventions, fixed seed; labelled "Simulated cohort" | WORKING (illustrative data) | platform | analytics | PORT as `illustrative` dataset |
| V-026 | Case-derived metrics | `85-analytics-data.js` `PSY.an5` | Metrics derived live from the 11 cases, `diStatus`, audit; weekly email schedule `PSY.anr.weekly` | WORKING | platform | analytics | PORT → `case_backed` dataset |
| V-027 | Settings | `83-settings.js` | Tabs General (notifications, low-units days), Roles (3 roles × 16 flags, reset), Units and rates, Audit (filters, CSV), Privacy | WORKING | platform | settings (admin) | PORT → Settings |
| V-028 | Help | `83-settings.js` `help` | FAQ | STATIC | platform | platform | Drop or Settings › Help |
| V-029 | Roles permission editor | `83-settings.js`, `shell.js` | Toggle flags per role; nav and extension buttons change at once | WORKING | platform | admin | PORT (permission matrix) |
| V-030 | Unit rules editor | `time.js`, `83-settings.js` | Per-service tiers or length rule with source; recorded vs billable | WORKING | platform | admin | PORT |
| V-031 | Reimbursement rates / money exposure | `01-core.js` `MO` | Exposure = disputed units × configured rate; "unavailable" when no rate | WORKING | platform | admin | Defer (Tier 3) |
| V-032 | Audit trail | `01-core.js` `AU`, `83-settings.js` | Action, time, user/system, document, status; CSV copy | WORKING | platform | admin | PORT (map to master `events`) |
| V-033 | Payer requirement registry | `02-core-data.js`, `01-core.js` `RU` | 27 rules tagged policy / documented / observed / unverified with source; staff can verify; "Payer requirement verification needed" | WORKING | platform | clinical | PORT → rules (spec 4.6) |
| V-034 | Eligibility vs benefits | `01-core.js` `EL`, `r5-elig` | Coverage-change alert for T.W. (Anthem → Humana), confirm responsible payer, benefits panel (simulated) | SIMULATED | platform | clinical | PORT (Eligibility enhancement) |
| V-035 | Alerts | `01-core.js` `AL` | Derived action cards (sign, ready, info, partial, denied, low units) | WORKING | platform/extension | clinical | REPLACE with My Work |
| V-036 | History dropdown | `08-history.js` | Authorization/denial events with actor tags (voice, agent, psyflo, staff, lauris, payer), filters, pop-ups | WORKING (seeded + live) | platform | auth | REFACTOR (drop voice/agent actors) |
| V-037 | Voice agent | `09-voice.js` | Simulated call to payer provider line: dialing, menu, hold, representative, summary, reference number | SIMULATED | platform | clinical | Roadmap only |
| V-038 | FLO data agent | `42-flow.js` | Chat drawer; six simulated steps "signs in to Lauris, downloads charts"; answer with table, charts, PDF, CSV | SIMULATED | platform | flow | Roadmap only (conflicts with 9.6) |
| V-039 | In-browser demo backend | `07-api.js` | Request/response layer inside the page, API log modal | SIMULATED | platform | presenter | Drop |
| V-040 | Presenter menu | `01-core.js:407-460` | View as (3 roles), 13 scenarios, Reset, API log | WORKING | platform | presenter | PORT idea → presenter toolbar |
| V-041 | Locality filter and bell | `40-dash-util.js`, `shell.js` | Campbell/Lynchburg/both filter on Authorizations/Analytics | WORKING | platform | auth | PORT (filter) |
| V-042 | Sync version flow | `05-sync.js` | Original → AI Draft → Clinician Edited → Approved → Synchronized; states; `failNext` | WORKING; "Synced" SIMULATED | platform/extension | clinical | REFACTOR (`doc_versions`; Synced only from observed event) |
| V-043 | Downloads, CSV, PDF helpers | `05-sync.js`, `06-pdf-report.js` | `PSY.download` (viewer capability or Save link), CSV builder, ASCII PDF | WORKING | platform | all | PORT (report builder only) |

### 2.2 Extension features

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| V-044 | Panel shell and modes | `shell.js`, `63-ext-*` | Docked panel beside simulated Lauris: collapsed / sidebar / focus; button shows counts | WORKING (simulation) | extension | per flag | Drop (master panel) |
| V-045 | Overview roster | `63b-ext-overview.js` | "My patients" by role, stage chip, one next step, "Action required", expandable stepper Referral → Admission Screening → CNA → ISP → Initial SRA → Sessions → Concurrent SRA, one-tap Open in Lauris / Scribe / Scan & Enhance / Denial Intelligence | WORKING | extension | all | PORT (stretch) → Extension home next task |
| V-046 | Scribe: type selector | `scribe.js` | Dropdown filtered by permission: admission, intake, DPN, collateral, monthly | WORKING | extension | scribe:* | PORT → Extension › Scribe |
| V-047 | Scribe: recording and transcript | `scribe.js` | Pause/resume/stop; simulated transcript streams; nothing drafted until asked | SIMULATED | extension | scribe:* | Drop (master has real STT + scripted) |
| V-048 | Scribe: draft and "Not stated" | `scribe.js`, `68-dpn.js` | Fields with nothing said stay empty and flagged "Not stated"; edit draft; review transcript | WORKING | extension | scribe:* | PORT concept (missing info becomes a question) |
| V-049 | Scribe: Save & Push | `scribe.js`, `05-sync.js` | Approve then writer pushes into the simulated Lauris form; "Save & Copy" fallback | WORKING; Synced SIMULATED | extension | scribe:* | REFACTOR (fill open form via bridge; Synced from observed event) |
| V-050 | Admission screening scribe | `66-screening.js`, `65-forms-util.js` | Scripted call → captured values by section → form boxes | SIMULATED (scripted) | extension | scribe:admission | Drop (master M-051) |
| V-051 | Intake scribe | `69-intake-*` | Scripted intake conversation → CNA boxes; Scan on other patients (`76b`) | SIMULATED | extension | scribe:intake | Drop (master M-052) |
| V-052 | DPN scribe | `68-dpn.js` | Seven DPN fields, goal and time links | WORKING | extension | scribe:dpn | PORT concepts only |
| V-053 | Collateral / monthly scribe | `68-dpn.js` | Note-type sessions | WORKING | extension | scribe:collateral/monthly | PORT concepts only |
| V-054 | Addendum on processed notes | `68-dpn.js:209-218,268-274` | A processed or past note keeps its text; changes become a dated addendum below | WORKING | extension | enhance | **Do not port by default** (Mode B; spec 4.1) |
| V-055 | Track Time control | `time.js`, `63-ext-time.js` | One-tap start for patient on screen; pause/resume; stop opens entry (duration, description, ISP goal); save/discard; footer readout | WORKING | extension | time | PORT → Extension › Track Time |
| V-056 | Today list and entries | `63-ext-time.js` | Per-patient intervals, edit, link to DPN, manual add, end-of-day recording entries | WORKING | extension | time | PORT |
| V-057 | Recorded vs billable | `time.js` `units()` | Units from per-service rule (tiers 120/180/300 min), "Configurable", source shown; not equated to timer | WORKING | extension | time | PORT (resolve 60 vs 120) |
| V-058 | Send to Lauris time tracker | `63-ext-time.js`, `lauris-time` | Entries appear on the simulated Lauris Time Tracker page | SIMULATED | extension | time | REFACTOR: DPN contact-time rows via bridge |
| V-059 | Scan & Enhance: pick and scan | `76-enhance.js` | Patient + document (CNA, DPN, collateral, monthly, admission, SRA) → 1.3-s simulated scan; auto-scan when a document opens | SIMULATED scan | extension | enhance | REFACTOR (Mode A) |
| V-060 | Recommendation cards | `76-enhance.js` | Issue category, why, evidence citations or "Not documented · collect it", policy reference, editable suggestion, Accept/Edit/Reject | WORKING (rule/recommendation data hand-written) | extension | enhance | PORT → findings schema |
| V-061 | Original vs enhanced and approve | `76-enhance.js` | Side-by-side, undo, accept all, approve → push | WORKING | extension | enhance | PORT |
| V-062 | CNA scan | `76b-cna-scan.js` | Section-by-section: documented / needs clinician / not in record | WORKING | extension | enhance | PORT |
| V-063 | SRA required fields to submission | `76-enhance.js` `enh-sub-*` | Validation, final review, PDF capture, package, simulated payer submission, confirmation number, status tracking | SIMULATED | extension | enhance | Replace submit with master human Send; keep validation |
| V-064 | Recommended actions per case | `reco.js`, `30-reco-data.js` | Per-case actions naming the payer requirement (no probabilities); typed into DMAS boxes | WORKING (static data, 11 cases) | extension | enhance | REFACTOR → missing-evidence list |
| V-065 | Extension view switching | `01-core.js:367-400` | "Case status | Today" views, one view = no dropdown | WORKING | extension | clinical | Drop (superseded by Overview) |

### 2.3 Simulated Lauris pages (v3 builds its own EHR)

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| V-066 | Consumers list | `60-lauris-consumers.js` | Active/Discharged, filters, sort; DSS see "No access" outside caseload | WORKING | Lauris sim | caseload | Drop (master M-073) |
| V-067 | Consumer file (6 tabs) | `61-lauris-consumer.js` | General, Authorization, Documents, Active File, Medications, Allergies; restricted view for admin | WORKING | Lauris sim | caseload | Drop |
| V-068 | Add session, Saved, Rejected, Reports, User, No-auth | `62-lauris-admin-pages.js` | Lauris pages behind the menu | WORKING | Lauris sim | caseload | Drop |
| V-069 | Time Tracker page | `62`, `63-ext-time.js` | Day sheet, unit calculator, weekly sheet | WORKING | Lauris sim | time | PORT layout → master `/time` |
| V-070 | Authorizations (Lauris; `lauris-auths`, alias `lauris-auth`) | `73-lauris-auths.js` | Authorization requests and per-consumer history | WORKING | Lauris sim | caseload | PORT layout → master `/authorizations` |
| V-071 | Forms to Approve | `74-lauris-forms.js` | Approval dialog with required attestation checkbox | WORKING | Lauris sim | clinician | Drop (master M-079) |
| V-072 | Form kit | `lf-kit.js`, `65-forms-util.js` | Builds Lauris forms from schemas and fills them | WORKING | Lauris sim | n/a | Drop |
| V-073 | Daily note (`lauris-dpn`), admission screening, CNA, ISP, collateral, monthly forms | `66`, `67`, `69-intake-form`, `68-dpn` | Printed-layout forms with extension panel | WORKING | Lauris sim | clinical | Drop |
| V-074 | DMAS initial and continued-stay forms (`lauris-dmas`, alias `lauris-case`) | `70-l2-*`, `71-dmas-form.js`, `72`, `75` | Form sections, processed/draft state, extension recommendation panel, copy-all text | WORKING | Lauris sim | clinical | Drop; PORT field list to master `forms.js` |

### 2.4 Other v3 content and design assets

| ID | Feature | Where | What it really does | Status | Surface | Role | Destination |
|---|---|---|---|---|---|---|---|
| V-075 | Case hub content | `20-case-data.js` | Per-case picture, criteria (met/partial/open), risks, history; hand-written | STATIC | platform | clinical | Evidence/Documentation seed |
| V-076 | Case record excerpts | `78-flow-continued.js`, `77-flow-initial.js` | Excerpts behind citations (T.W., M.R., S.B.) | STATIC | platform | clinical | Evidence seed |
| V-077 | Citation viewer | `01-core.js` `EV.open` | Modal with source type, date, excerpt, "Open in Lauris" | WORKING | platform/extension | clinical | PORT → source chips |
| V-078 | Evidence labels | `01-core.js` `EV.KINDS` | Verified EHR, AI draft, Clinician input required, Payer requirement, Published policy, Illustrative… | WORKING | platform | all | PORT (maturity and provenance chips) |
| V-079 | Filter bar and date range | `04-filterbar.js`, `04b-daterange.js` | Dropdown filters in `state.fb`, deep-link params, chips, native date pickers | WORKING | platform | all | PORT → `ui/filterbar.js` |
| V-080 | Dash helpers | `40-dash-util.js`, `80-p1-util.js` | Owner, days in state, units, deadlines with source | WORKING | platform | auth | REFACTOR → selectors |
| V-081 | Theme remap | `shell.js:97-105` | Runtime hex substitution to the v01_2 look | WORKING | platform | n/a | PORT (cheap re-skin of 46 templates) |
| V-082 | Platform CSS patterns | `platform.css` | p1-, st5, ev5 chips, cards, tables | WORKING | platform | n/a | PORT → `components.css` |
| V-083 | Build script | `build.py` | Concatenates into one HTML | WORKING | n/a | n/a | Drop |

### 2.5 v3 presenter scenarios (13; `01-core.js:407-428`)

| ID | Scenario | Role | Starts at | Status | Destination |
|---|---|---|---|---|---|
| V-084 | S1 DSS creates a progress note | dss | DPN | WORKING | Spec Scenario 1 (master flow B) |
| V-085 | S2 DSS tracks interventions | dss | DPN + time | WORKING | Track Time demo |
| V-086 | S3 Clinician enhances a progress note | lcs | DPN | WORKING | Enhance Mode A |
| V-087 | S4 Clinician enhances an SRA | lcs | DMAS form | WORKING | Spec Scenario 3 |
| V-088 | S5 Admin tracks authorizations | admin | auth-list | WORKING | Authorizations demo |
| V-089 | S6 Clinician manages a denial | lcs | di-case R-0384 | WORKING | Spec Scenario 5 |
| V-090 | S7 Clinician prepares peer-to-peer | lcs | di-case R-0388 | WORKING | Spec Scenario 5 |
| V-091 | S8 Admin reviews denial patterns | admin | analytics | WORKING | Spec Scenario 6 |
| V-092 | S9 Admin reviews population trends | admin | analytics | WORKING | Spec Scenario 6 |
| V-093 | S10 FLO custom data pull | admin | analytics | SIMULATED | Roadmap |
| V-094 | S11 Voice agent follow-up | lcs | di-case R-0384 | SIMULATED | Roadmap |
| V-095 | S12 Roster check in the extension | lcs | Overview | WORKING | Extension home |
| V-096 | S13 Outcomes and timelines | lcs | analytics | WORKING | Spec Scenario 6 |

### 2.6 v3 modules without a separate user-visible feature (accounted for)

| ID | Module | Role in v3 | Destination |
|---|---|---|---|
| V-097 | `data.js`, `lauris-data.js`, `02-core-data.js` | Case, payer, consumer, rule data | Crosswalk and `rules.json` only |
| V-098 | `10-referrals.js`, `81-connect-lauris.js`, `82-payers.js`, `20-case.js`, `40-home.js`, `79-flow-decision.js`, `03-ext-status.js`, `00-starter.js` | Retired or redirect stubs | Drop |
| V-099 | `captured/*.html` (19 canvas copies) | Canvas screens identical in lineage to master `.dc.html` | Drop |
| V-100 | `07-api.js` routes `/payers`, `/cases/:case`, `/roster` | Demo backend | Drop |
