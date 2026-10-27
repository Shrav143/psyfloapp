# Virginia Medicaid Intake: implementation notes

Round 9 adds an AI-assisted intake and referral workspace for Virginia's Behavioral Health Services Redesign (new services start July 1, 2027; IIH, TDT, MHSS and PSR end June 30, 2027). It lives under **Authorizations › Intake**, between All Authorizations and New Case. The authorization, denial and analytics workflows are unchanged; an approved intake hands off to New Case as a draft and is never submitted from Intake.

Everything in it is a front-end demo with synthetic records. Nothing is sent anywhere, no audio is recorded, and no eligibility system is called.

## How to demo it

Open the Demo menu › "Intake: Virginia redesign scenarios", or go to Authorizations › Intake.

| Scenario | Record | Shows |
| --- | --- | --- |
| A. Youth CPST referral | IN-3101, T.W., 14, Sentara Community Plan | School referral extraction beside the document, guardian and school release, the Sentara / Aetna coverage conflict, CANS "preparation only", evidence review, the CPST School pathway, missing-document follow-up |
| B. Adult transition | IN-3102, R.H., 41, Anthem HealthKeepers Plus | Existing MHSS authorization ending 3/31/2027, transition timeline, renewal no later than June 30, 2027, assessment preparation, clinician service review, transition planning |
| C. First episode psychosis | IN-3103, A.K., 19, Aetna Better Health of Virginia | Hospital fax triage, an open safety alert a clinician must review, CANS evidence, CSC from July 1, 2027 with care now through MH IOP or case management, the referral RO-5101 tracked to a reply |
| D. Voice-assisted intake | IN-3104, M.S., 33, fee-for-service | The Voice Intake Assistant: consent, conversational questions, live transcript, extracted fields, missing-data prompts, caller confirmation, a draft staff review |

The top bar's **Program** switch narrows the demo to one service (all 20 Virginia services are listed). The **Policy as of** switch on the Intake page previews July 1, 2027 without moving the demo clock. "Viewing as" in the Demo menu changes who signs: Dr. Rivera is the qualified clinician at Site A; at Site B a non-clinician can play Heather K., LCSW, and the audit trail records it as role-play.

## Components changed

- New: `src/pages/intake/**` (queue, record page, seven sections, assistant panel, scribe, voice, policy drawer, transition view), `src/data/intake/**` (model, fields, seed scenarios, samples, scripts, destinations, checklist), `src/data/va/**` (services, plans, policy), `src/store/intake*.ts` (six slices).
- Shared, changed only as needed: `App.tsx` and `routes.ts` (two routes), `Sidebar.tsx` (the Intake item and its badge), `Topbar.tsx` (the Program switch, `ProgramSwitcher.tsx`), `store/index.ts` (slice registration), `data/types.ts` (Virginia program ids).
- App-wide, by the client's decisions (real plan names; all services selectable): payer names, Virginia setting, "Illustrative" markers on plan-level figures, program personalization, and New Case accepting every service. See "Virginia across the app" below.

## Data structures

One `IntakeRecord` per person (`src/data/intake/types.ts`), with stable ids for everything inside it: referral, profile and coverage fields (`FieldMap`), documents, `Suggestion`s, `EligibilityCheck`, `ClinicalAssessment`, `CansAssessment`, `LevelOfNeedReview`, `ServiceRecommendation`s, `ReferralOut`s with their timelines, `ScribeSession`, `VoiceSession`, `AgentTask`s, `AuditEvent`s, `SafetyAlert`, `HandoffPacket`. Three things are always kept apart: what a source says (documents, transcripts), what an agent suggests (`Suggestion`), and what a person approved (a `FieldValue` with `reviewedBy`). Every field records its source type, source reference, time, confidence, verification state, reviewer and review time.

The policy engine (`src/data/va/policy.ts`) is data: rules matched by state, service, age group, payer, coverage type, setting, effective dates and policy version, each with a status (final, draft, unresolved) and a source. `requirementsFor`, `periodOf`, `cansFor` and `lonFor` read the rules; no screen hard-codes a requirement. Administrators can add an organization rule in the policy drawer, labeled unverified.

## Simulated versus live

| Simulated (labeled in the UI) | Real in the demo |
| --- | --- |
| Document, fax, email, EMR and web-form imports (samples; dropped files are not read) | All state changes, audit trail, approvals and sign-offs |
| Agent extraction, eligibility responses, pathway options, evidence gathering | The policy rules and their dates and sources |
| AI Scribe audio, transcript and speaker labels (scripted) | Completeness checklist and authorization readiness |
| Voice Intake Assistant calls (scripted, with typed or picked caller replies) | The handoff into a New Case draft |
| Outbound referral delivery and the destination's replies (demo controls) | Site and viewer access rules |

## Unverified policy dependencies

Taken from `UNRESOLVED` in `policy.ts`, shown in the policy drawer:

- The official CANS Lifetime domains, items, scoring options, age applicability, frequency and assessor qualifications (not loaded; no items are configured and nothing is rated).
- The Level of Need Model's algorithm and thresholds (the screen always says "Level of Need determination pending validated policy configuration.").
- Authorization and registration requirements for CPST, CSC and Clubhouse under each Cardinal Care MCO and fee-for-service.
- Whether Mental Health Clubhouse requires the CANS Lifetime.
- The updated Mental Health Case Management policy.
- How each retiring service's clients move to new services (no one-to-one mapping; each person needs a clinical review).
- Each MCO's operational readiness (the transition view's per-plan checklist starts at "Not confirmed").

Service descriptions for CPST, CPST Youth School Setting and CSC are drafts (posted for comment in 2025 and 2026) and are labeled Draft wherever they appear. Dates: the 2026 Appropriation Act moved the start from July 1, 2026 to July 1, 2027.

## Required integrations (before production)

Eligibility (271 or the MCO and DMAS MES portals), each MCO's prior authorization channel and Acentra Health's Atrezzo Next Generation for fee-for-service, the EMR (referrals, documents, write-back), fax and secure email intake, an e-signature service for consent, a speech-to-text vendor for the scribe, a telephony and voice vendor for the assistant, closed-loop referral exchange with destinations, and the official DMAS CANS Lifetime template.

## Remaining clinical and compliance validation

- A licensed clinician reviews every safety prompt, escalation path and the assistant's scripts. Psyflo never decides that a person is safe, never diagnoses, never finalizes risk, never certifies medical necessity, never signs, never selects a placement and never sends a referral or record without a person's approval.
- DMAS confirms CANS Lifetime applicability, items and assessor qualifications, and the Level of Need Model, before either is configured.
- Each MCO and Acentra confirm their requirements for the redesigned services.
- Before any real PHI: a signed BAA with every vendor (speech, voice, fax, hosting), a security review, role-based access and minimum-necessary access, encryption in transit and at rest, retention rules for recordings and transcripts, and consent capture. This prototype claims no HIPAA certification or production compliance.
- Plan-level figures elsewhere in the demo (approval rates, denial patterns, turnaround) are illustrative, not data about the named plans.

## Tests

- `$S/r9/e2e/acceptance.mjs <dist>`: the client's 22 acceptance tests, one step each.
- `$S/r9/run-intake.sh <dist>`: the five engineers' suites (queue and referral, profile and eligibility, assessment and scribe and voice at 1440 and 1024, CANS and pathways, review and assistant).
- `$S/runall8.sh` (with `D=<dist>`): the existing 36-suite regression for the rest of the app.
