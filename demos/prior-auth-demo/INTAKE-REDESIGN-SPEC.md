# Referral → Intake → Clinical Assessment → Care Planning → Authorization: spec v2

Written from three seats: product manager, community behavioral health (BH) clinician-operator, and payer utilization manager (UM). It restates the redesign prompt, records the decisions that resolve its conflicts with earlier rounds, and lists the gaps the prompt leaves and how this build closes each one.

## 1. Decisions that resolve conflicts

| Conflict | Decision |
| --- | --- |
| Round 9 put Intake under Authorizations and Referral inside New Case. This prompt makes Referrals & Intake its own section and removes intake from New Case. | The prompt wins. Referrals & Intake is a top-level group. New Case is renamed **New Authorization** and has four stages (Patient & Service, Coverage & Requirements, Clinical Documentation, Review & Submit). It reads the shared patient record and never asks for intake again. Referral is no longer a New Case step. |
| The prompt says the demo runs in a "fictional post-transition environment" in which the redesigned Virginia services are active. The demo clock is October 20, 2026. | The workspace's policy date defaults to **post-transition (July 1, 2027)**, shown as a persistent chip, and can be switched to Today. The demo clock does not move. Redesigned-service rules stay labeled draft or unresolved with their sources. |
| Legacy referrals (RF-) and intake records (IN-) are two systems. | One record: the intake record. The 16 legacy referrals become intake records with their documents, fields, checks and coverage carried over. A referral is the first status of an intake, so "clicking a referral opens its patient-centered workspace". |
| The prompt asks for "official configured CANS items" but Psyflo has no licensed or official content. | The CANS Assessment Items tab renders whatever template is configured. With none, it says "awaiting official item mapping". An administrator can load a clearly labeled **demo placeholder structure (not CANS content)** to show the item, evidence and rating workflow. Nothing is ever final or official. |
| Programs listed in the prompt are not all covered by every state Medicaid program. | Program availability is configuration. Each program carries a state availability row (available, starts on a date, retired on a date, unverified). Unverified programs can be selected for intake but never imply coverage. |

## 2. Gaps found in the prompt, and how the build closes them

**Compliance and consent**
1. **42 CFR Part 2.** Records of a substance use program need patient consent before they are disclosed. The intake keeps a consent and disclosure ledger (treatment, payment, operations; recipient; purpose; expiry; revocation), and an SUD authorization packet carries a redisclosure notice and is blocked until a payment consent is on file. Labeled an organization protocol, not legal advice.
2. **Minor consent and guardian rules.** Population drives who consents and who is contacted. The rule rows are configuration, marked unverified until a reviewer confirms them.
3. **Recording consent** for the scribe and voice assistant (already in round 9) is required before any session starts.

**Clinical safety**
4. **Crisis triage at the referral.** Urgency, same-day escalation and crisis resources appear in the Referral Queue, not only inside an assessment. AI never decides that a person is safe.
5. **Medical stability gate** for withdrawal management and residential SUD: a clinician must document medical clearance. The AI only organizes the evidence.
6. **Co-occurring care.** SUD programs offer psychiatric modules and mental health programs offer SUD screens as optional modules, so a co-occurring person is not forced onto the wrong form.

**Utilization management (payer seat)**
7. **Criteria set per payer.** ASAM edition, LOCUS or CALOCUS-CASII, and commercial criteria are configuration (name, edition, verification status). Psyflo never reproduces or applies licensed criteria.
8. **EPSDT for under 21.** Medicaid medical necessity for children and adolescents is broader. The plan carries a population flag so adult criteria are not applied rigidly. Configured, unverified.
9. **Review type and clocks.** Standard or expedited review, admission notification windows and concurrent review dates come from policy rows. Where no row exists the screen says "Payer requirement not yet verified".
10. **Peer-to-peer readiness.** The clinical summary is written in the structure a payer reviewer reads (findings by dimension, what supports the requested level, what is missing).
11. **PRTF and facility admissions** carry a placeholder field for the certification-of-need documentation the federal rule requires for under-21 psychiatric facility admission. Not verified.

**Operations**
12. **Duplicate patient detection** at referral and at New Clinical Intake.
13. **Existing episode required** for continued stay, change in level of care, reassessment and discharge. The wizard asks for the patient and treatment episode first and carries the previous assessment forward as a new version.
14. **Roles.** The intake coordinator accepts referrals, a qualified clinician signs and selects services, and an authorized override (clinician or administrator, with a reason) is the only way to remove a required module.
15. **Capacity and waitlist** for residential and facility programs (bed status, waitlist) at acceptance.
16. **Closed loop to the referrer.** Accept, redirect and decline each draft a notice to the referring organization for a person to approve.
17. **Draft save and resume** with an autosave indicator. State persists in the browser where the browser allows it and falls back to memory.

**Prompt inconsistencies**
18. Part 11 lists Treatment Planning and Authorization Readiness as intake forms; the workspace treats them as stages after the assessment, not modules.
19. The program list includes both "Psychiatric Residential Treatment" and PRTF; they stay separate entries with different population defaults and availability.
20. The legacy services (IIH, TDT, MHSS, PSR) retire June 30, 2027. In the post-transition environment they show "not available in this policy period", not a form.

## 3. The model

- **Patient** (shared) → **Referral/Intake episode** (`IN-`) → **Assessment instances** (versioned) → **Care plan** → **Treatment episode** → **Authorization** → **Clinical review**. A patient can have many of each; updating an assessment adds a version.
- **Assessment configuration** = rules matched by state, payer, program, population, setting, purpose and effective date. Each rule row has a source (State Policy, Payer Policy, Organization Protocol, Clinician Selected, Demo Configuration), version, status (verified, draft, unverified, demo), reviewer and last-updated date. `buildAssessmentPlan()` merges the rows into the module list the workspace renders.
- **Modules** are one of: section (documentation form), framework (ASAM, CANS), instrument (score entry for licensed scales), review (level-of-care review). Licensed instruments are integration-ready placeholders: the clinician enters the administered result; Psyflo does not reproduce items or compute official scores.
- **Status** is derived from progress (assessment, clinical review, care planning, ready for authorization) except for terminal decisions a person makes (accepted, redirected, declined, closed).

## 4. Out of scope, on purpose

No official CANS Lifetime items or scoring, no Level of Need algorithm, no ASAM criteria or placement algorithm, no licensed instrument text, no real payer policy, no real PHI, no live voice, speech, EMR or payer integration. Each is a labeled placeholder or simulation.
