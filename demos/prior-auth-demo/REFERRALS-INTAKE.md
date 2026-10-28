# Referrals & Intake: the redesign

Round 10 turns the round 9 Intake workspace into a top-level **Referrals & Intake** area and makes the assessment **configuration-driven**: a program, an intake purpose, a population and a setting select rules, the rules select modules, and the modules draw the workspace. One patient record runs from the first referral to the authorization. The authorization, denial, analytics and payer workflows are unchanged. The spec and the gap analysis it was built from are in `INTAKE-REDESIGN-SPEC.md`.

Everything is a front-end demo with synthetic records. Nothing is sent anywhere, no audio is recorded, no eligibility system is called, and no file you drop is read. The demo runs in a fictional post-transition Virginia environment: policy rules are evaluated as of July 1, 2027 by default (the top bar's **Environment** chip switches to today's policy; the demo clock stays Tue Oct 20, 2026, 10:42 am either way).

## How to demo it

Open **Demo › Intake scenarios**, or go to **Referrals & Intake › Referral Queue**.

| Scenario | Record | Starts at | Shows |
| --- | --- | --- | --- |
| A. Adult CPST | IN-3102 | Assessment in progress | Referral, clinical interview, functional needs and community living, the CANS module with no template loaded (an administrator loads a labeled demo placeholder), Level of Need (pending validated policy), a prior psychiatric assessment found for reuse, care planning, authorization readiness |
| B. Youth CPST, school | IN-3101 | Needs information | A school referral: caregiver information, school functioning, a CANS from another provider (7 months old) found for reuse, guardian consent and school release missing, a coverage conflict, then CALOCUS-CASII and care planning |
| C. SUD IOP | IN-3112 | Assessment in progress | ASAM documentation drafted from documents with evidence waiting, the IOP level-of-care review (confirmed only by a clinician), treatment history, Part 2 and payment consents missing, coverage ended |
| D. SUD residential | IN-3110 | Ready for authorization | ASAM, withdrawal and medical review and residential admission signed, the overall sign-off signed, a care plan with the service selected, Care Planning › Prepare Authorization opens New Authorization with the record attached |
| E. Mental health PHP | IN-3115 | Care planning | Psychiatric assessment and functional impairment signed, signed off as a whole, PHP medical necessity documentation, a draft care plan with three options and none selected, a PHQ-9 result typed by the clinician and awaiting review |
| F, G, H | IN-3103, IN-3104, IN-3117 | | CSC with an open safety alert, a voice-assisted intake, ABA |

Sign as **Dr. Rivera** (Demo › Viewing as) at Site A. At Site B anyone else can play the clinician through a labeled role-play that the audit trail records. Care planning follows the overall sign-off: until a clinician signs off the whole assessment the status stays Clinical review (IN-2042 waits there, everything else signed). IN-2052 is a Closed example, IN-3124 a redirected one. Also open the 16 converted legacy referrals (IN-2038 to IN-2053) and **Create Referral** (upload a sample, import from an EMR sample, manual, voice, paste): every extracted value shows a state tag and a source, and accepting a referral opens the configuration wizard.

## Where things are

- **Navigation.** Dashboard; Referrals & Intake (Referral Queue, Active Intakes, Assessments, Care Coordination); Authorizations (All Authorizations, Pending Reviews, Renewals & Extensions); Additional workspaces (Eligibility & Benefits, Denial Intelligence, Analytics); Connections (EMR Connect, Payers); System (Settings, Help). **+ New**: New Referral, New Clinical Intake, New Authorization, New Eligibility Check. New Case is now **New Authorization** (four stages that read the shared record). Routes: `/intake`, `/intake/active`, `/intake/assessments`, `/intake/coordination`, `/intake/new`, `/intake/start`, `/intake/:id/configure`, `/intake/:id`.
- **Workspace** (`/intake/:id?section=`): `overview | referral | patient[:profile|:coverage] | clinical | m:<moduleId> | signoff | care | documents | activity` (the round 9 names still work). Three columns at 1280 px and up (navigation, work, one contextual AI Assistant that collapses); a drawer below.
- **Status.** Eleven statuses: New, Needs information, Ready for screening, Assessment in progress, Clinical review, Care planning, Ready for authorization (these four follow the work), then Accepted, Redirected, Declined, Closed (set by a person). Screens show `effectiveStatus(record)`.
- **Saved in the browser.** Changed intake records, referral drafts and New Authorization drafts are saved in localStorage (`psyflo-demo-v10`, guarded: storage can be blocked, as in a sandboxed iframe). Settings › Saved data and Demo › Reset demo data clear it.

## The configuration engine (`src/data/assess/`)

`programs.ts` (31 programs in categories, with availability by policy date), `purposes.ts` (8), `modules.ts` (54 modules: 7 core, SUD, mental health, 9 screening or criteria instruments, community, CSC, ABA), `rules.ts` (about 40 rows), `plan.ts` (`buildAssessmentPlan`), `schemas/*` (the forms, as data), `status.ts`, `readiness.ts`, `carePlan.ts`.

- A **rule** matches by state, program, payer, population, setting, purpose and effective dates, and carries its **source** (State policy, Payer policy, Organization protocol, Clinician selected, Demo configuration), **version**, **status** (Verified, Draft, Not verified, Demo), reviewer and last update. A module's level is the strongest any source gives it (required, recommended, optional); its status is the weakest. Rules that take effect after the policy date show as **preparation** and never hold up status or readiness.
- A **required module** cannot be removed without an authorized override (a qualified clinician or the clinic owner, with a reason); optional ones toggle; a person can add any catalog module (source: Clinician selected). Changing program, purpose, population or setting reconciles the choices: finished work is kept and archived, never deleted. Every change goes into the configuration history and the audit trail.
- A missing payer rule reads **"Payer requirement not yet verified."** A demonstration payer row is never presented as payer policy.
- **Forms are data.** One renderer draws every schema with provenance on every value, evidence suggestions that need a person's decision, score entry that records a result the clinician typed, a level-of-care review that a clinician confirms, versions and amendments.
- **New Authorization from an intake reads the record and nothing else.** The Service field is filled only when a clinician selected one service; a range (ARTS residential, ASAM 3.1 to 3.7) or no selection leaves the choice to the person, with the reason. Documents are the record's own, or requested (a task on the intake, nothing is sent), marked not available with a reason, or added by name and type (files are not read; there is no sample file). The medical-necessity summary is an AI suggested draft (simulated) arranged from the signed modules, the approved care plan and the referral, each section linking to its source in the workspace and saying "Not documented in the intake" where the record is silent. The agents show a documentation checklist, never a criteria match, a level of care or an approval estimate. A mental health IOP or PHP lists no ASAM assessment. Sending marks the intake's handoff Sent (Overview: Authorization Submitted, an audit event), and the sent request is saved in the browser.
- **Care planning.** The clinician selects the service; the service the referral asked for stays visible; options carry evidence and what is missing, never a recommendation. Prepare Authorization creates a linked draft (a concurrent review, reauthorization, modification or retroactive request reuses the existing episode). Readiness has two separate tracks, clinical and administrative.

## Simulated, and real in the demo

| Simulated (labeled in the UI) | Real in the demo |
| --- | --- |
| Document, fax, email, EMR and file imports (samples; dropped files are not read) | State changes, the audit trail, approvals and sign-offs |
| Extraction, the evidence reader, eligibility responses, pathway options | The configuration rules, their dates, sources and versions |
| AI Scribe audio and transcripts, voice calls (scripted) | Completeness, status and the two readiness tracks |
| Referral notices and replies (a person approves a draft; delivery is simulated) | The handoff into a New Authorization draft |
| Payer submission | Site and viewer access rules; saving in the browser |

## What is not verified, and what Psyflo will not do

- **No licensed content.** ASAM criteria and placement algorithms, CANS Lifetime items and scoring, Level of Need thresholds, LOCUS and CALOCUS-CASII items, and the item text and scoring of C-SSRS, PHQ-9, GAD-7, AUDIT, DAST-10, COWS and CIWA-Ar are **not reproduced**. For an instrument the clinician records the result they obtained (a number or label, a date, who administered it); Psyflo computes no official score or severity. The CANS module has an administrator-loaded **demo placeholder template** (generic domain headings, blank prompts, no scale) and says so. The Level of Need says "pending validated policy configuration." ASAM dimension titles are used only as documentation headings, and the level-of-care review says the licensed criteria are not loaded.
- **People decide.** AI never decides that a person is safe, diagnoses, finalizes risk or a rating, certifies medical necessity, signs, selects a service or level of care, or submits. Signing, confirming a level of care, selecting a service, approving a care plan and sending a notice need a qualified person.
- **Unverified policy** (from `UNRESOLVED` in `data/va/policy.ts`, shown in the Policy drawer): official CANS Lifetime items, scoring, frequency and assessor qualifications; the Level of Need algorithm; authorization and registration requirements for CPST, CSC and Clubhouse under each MCO and fee-for-service; whether Clubhouse requires the CANS; the updated Mental Health Case Management policy; how each retiring service's clients move to new services (no one-to-one mapping); each MCO's readiness. CPST, CPST school and CSC service descriptions are drafts and labeled Draft. No assessment rule is labeled Verified.
- Retiring services stay available until June 30, 2027; from July 1, 2027 they read "Not available in this policy period."
- **42 CFR Part 2** and consent notes are labeled "Organization protocol, not legal advice." This demo claims no HIPAA certification or production compliance. Before real PHI: a BAA with every vendor (speech, voice, fax, hosting), a security review, role-based and minimum-necessary access, encryption, retention rules for recordings and transcripts, and consent capture.
- Older sample data from earlier rounds (the R-1042 case detail and the documentation frameworks) still uses the earlier wording of ASAM's dimension names; the intake uses the Fourth Edition headings. Plan-level figures elsewhere in the demo are illustrative.

## Coverage of the client's prompt

| Part | Where | Status |
| --- | --- | --- |
| 1-2 Role, product principles | `INTAKE-REDESIGN-SPEC.md` | Done |
| 3 Navigation, + New, New Authorization | Sidebar, `NewMenu`, `pages/newcase` | Done; no intake inside New Authorization |
| 4 Referrals & Intake landing page, worklist, filters, statuses | `/intake` | Done |
| 5 Create Referral, extraction, review | `/intake/new`, `pages/intake/create`, `referral/` | Done (imports simulated) |
| 6 Configuration wizard | `/intake/:id/configure` | Done |
| 7 Configuration engine | `data/assess/` | Done; rules are configuration, labeled by source and status |
| 8 Patient-centered workspace | `/intake/:id` | Done |
| 9 CANS, Level of Need, existing assessment found | `pages/intake/cans`, `PriorAssessments` | Placeholder template; reuse works |
| 10 ASAM Fourth Edition configuration | `schemas/sud.ts`, `LocReview` | Six dimension documentation categories; no criteria |
| 11 Program-specific forms | `schemas/*` | SUD IOP and residential, MH IOP and PHP, CPST adult and youth, ABA, CSC |
| 12 Record Intake scribe | `pages/intake/scribe` | Adapts to the program (simulated audio) |
| 13 Care planning | `pages/intake/care` | Clinician selects; requested service preserved |
| 14 Authorization integration | `store/intakeCarePlan.ts`, `store/cases.ts` | Prepare Authorization; existing episodes reused |
| 15 Dual readiness | `data/assess/readiness.ts` | Two tracks |
| 16 Contextual AI Assistant | `pages/intake/assistant` | One panel, follows the section and module |
| 17 Linked data model, versions | `data/intake/types.ts`, `data/assess/versions.ts` | Instrument versions, config history, audit |
| 18 Five scenarios | `data/intake/ext/scn`, `data/assess/scenarios.ts` | A to E, plus F, G, H |
| 19 Every control works; save and resume | `store/persist.ts` | Done |
| 20 Fictional post-transition environment | Environment chip | Done |
| 22 Workflow, including ending without an authorization and ongoing care | Care Planning gate, Overview | Done |
| 23 Acceptance | `accept.mjs` (40 checks) | All pass |

## Tests

The scratchpad suites (run from the build folder with `D=<dist>`):

- Engine and data unit tests (`bun run t-*.ts`): plan (3,757 checks over every program, purpose and population), E1 to E9 logic, schemas (35,941 checks including a deny-list scan for licensed content).
- Browser suites per area (queue and worklists, referral creation, wizard, workspace, instruments, CANS, care planning, assistant and persistence, scenarios) at 1440 and 1024 px, each with no console errors and no horizontal scroll.
- `accept.mjs`: one check per acceptance bullet, driving the real screens.
- The older regression for the rest of the product (`runall8.sh`, 36 suites) stays green, with the suites that touched the old sidebar and New Case updated.
