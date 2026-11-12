# Psyflo Prior Authorization Platform — Shared PRD Brief

This file is the shared context for every PRD in this folder. Each PRD assumes the reader has read it.

## What Psyflo is

Psyflo is a prior-authorization platform for behavioral health providers that bill Medicaid managed care (and Medicare / commercial where present). It covers four product lines that together form one workflow:

1. **Eligibility & benefits verification** — knowing, before the session, that the payer will pay.
2. **Prior authorization lifecycle** — requirement determination, packet assembly, clinician sign-off, submission, status tracking, the authorization ledger (units and dates), renewals.
3. **Denials management** — categorising, validating and routing adverse determinations (peer-to-peer, appeal, resubmit, accept).
4. **Appeals** — building, signing, sending, confirming receipt of, and tracking written appeals and external reviews.

Supporting layers: payer intelligence (rules, policies, observed behaviour), AI agents & automation, analytics & leakage reporting, integrations & data model.

Psyflo is **not** an EHR, a clearinghouse, a billing service or a claims scrubber. It sits on top of the EHR (Sunwave, Valant and others), Availity and payer portals.

## Product principles (non-negotiable)

1. **Approval and visibility, not submission.** Submission is the smallest part of the problem. The product exists so the operator knows where every authorization is, what will run out first, and why a payer said no.
2. **Nothing sends itself.** Every outbound artifact (request, renewal, appeal, P2P letter) ends at a clinician sign-off gate. Agents draft, check, poll and call; humans sign.
3. **History is never overwritten.** An authorization is a chain of immutable versions and events. Renewals append. This is the differentiator against EHRs (Sunwave overwrites on renewal) and the source of every analytic.
4. **Two clocks.** An authorization is not a yes/no flag; it is a unit countdown drawn down by attendance and a date window running regardless. Whichever hits first ends it. The renewal date is derived: min(projected unit exhaustion, window end) − payer-specific lead time.
5. **Observed, not predicted.** We show what each payer actually did (first-pass approval, partial rate, turnaround) computed from the clinic's own history. We do not ship an approval-probability score until it is calibrated on real data.
6. **Explain every number.** Every metric traces to source rows. "Ask Psyflo" answers cite ledger rows.
7. **Built for the safety-net segment.** Medicaid patients cannot be billed when coverage lapses or an authorization is missing; a caught failure is a paused patient, not recovered revenue. Pricing and workflow must fit a $3.5M clinic with two PA FTEs, not a hospital.
8. **HIPAA-first.** BAA, minimum necessary, MRN/initials on shared screens, audit trail on every agent action, credentials in a vault.

## The design partner: Harbor Behavioral Health (Tracy Cosker, COO)

- Two Kentucky sites (Lexington, Hopkinsville); therapeutic rehabilitation program (TRP) for adults with serious mental illness; 3.5–4 hours/day programming, 7 days a week; 50–70 clients/day; most live in personal care homes; ~10 referring primary care homes; many have guardians.
- Payers: five Kentucky Medicaid MCOs plus Medicare (dual-eligibles: Medicare must deny before Medicaid pays); ~10 payer endpoints; one CPT/HCPCS code (H2020 in the transcripts; per diem). Kentucky mandated PA for these services in July 2025.
- Every patient needs a PA. Initial request filed 24–48h after intake, payer must decide within 5 days (KY) / 7 days (CMS-0057-F standard); decision backdated to request date. Authorizations are for a unit count (40 or 60, increasingly partial: ask 60 get 30) and a ~90-day window.
- Rates: ~70% first-pass approval, ~30% denied; ~50% of peer-to-peers overturn; ~15% go to written appeal; appeals take up to 60 days, are faxed (60–70 pages), get "lost", must be split into three separate documents for some MCOs; some payers require a member-signed appeal form.
- Systems: Sunwave (EHR+CRM+RCM, behavioral-health specific, overwrites PA on renewal, no unit tracking), Availity (4 of 5 MCOs), one MCO portal, clearinghouse eligibility, a 5-tab Excel tracker, a Claude-based "engine" that drafts packets/cover sheets and grades approval likelihood, Whisper Flow dictation, Claude Code browser automation for write-back.
- Staffing: 2 FTEs 100% on PA; Tracy 2–3 h/day; clinicians (~$90/h) 3–4 h per packet before the engine, 6 documents per renewal; offshore billers at ~$12/h; contractors cut from 3 to 1 thanks to the engine.
- Money: ~$10–15K/month written off (30–35 claims); recovered $86K in back claims in her first month; one patient 40 units over before anyone noticed; free care for up to 60 days during appeals (~$10K per patient); "ghost expirations".
- What she rejected: a browser-agent vendor that automated Availity submission ("not my pain point"); static EHR reports ("export to Excel is not an acceptable solution").
- What she wants: KPIs plus her workflow for the day in one place; per-patient status; a holistic view (74 approved, 2 denied, 3 in appeal…); an AI chat over the data ("what are the next 12 PAs coming due in October?"); sits on top of the EHR without full integration; history that survives renewal; visibility of where an appeal is.

Other evidence in the corpus: Dave Cherry (Ellie Mental Health, Ohio; Valant + Nirvana; wants weekly batch verification with exception reporting; recoupments; COB; Ohio SB 162), Sarah (Family Solutions, Chicago; County Care PA, unit monitoring), Jennifer (Ohio SUD/IOP; Medicaid 30-unit IOP cap from July 2026; blanket denials at peer-to-peer), Ali (California SNF case manager; Medi-Cal plan-by-plan rules; transport PA), Melissa (CT private practice; 1-hour/day MH benefit cap across providers; no pre-checks).

## Regulatory context to reference where relevant

- CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F): Medicaid managed care plans must decide standard PA requests within 7 calendar days (expedited 72 hours) from January 2026; must give specific denial reasons; must publicly report PA metrics annually from 2026; Prior Authorization API (FHIR) by 2027.
- Kentucky: PA mandated for community behavioral health services July 2025; 5-day decision requirement described by Tracy; Availity used by 4 of 5 MCOs.
- Mental Health Parity and Addiction Equity Act (MHPAEA) 2024 final rule: non-quantitative treatment limitations (like PA) on MH/SUD cannot be more restrictive than medical/surgical; leverage for appeals and payer conversations.
- Medicaid appeals: 60-day (some plans 30-day) window from adverse benefit determination; internal appeal then state fair hearing; continuation of benefits rules.
- Ohio SB 162 (effective Oct 7, 2026): shortens recoupment lookback to 1 year, 60-day provider response, bans appeal fees — a template for state-level tailwinds.

## Competitive reference (see ../research/competitor-landscape.md)

Borrow: CombineHealth (rolling 7-day eligibility run with plain-language action per row; appeals timeline Denial received → Validity check → Draft letters → Packet review → Submission → Follow-up; AI reasoning cards; voice agent transcripts; denial heatmap), HealOS/Arrow (claim workups that list sources checked, "questions to human" inline, status buckets), Neon (plan × program rule tuples, accuracy flywheel), Sohar (carve-out/network detection), Flexbone/QuickIntell/VGPM/Ritten (unit ledgers with renewal triggers), Lucida/Oprox/CriteriaIQ (criteria-grounded medical necessity), Infinitus (payer calls for appeal status). Avoid: leading with "we file your paperwork"; predicting approval; point solutions that need five other tools.

## The clickable demo (built in apps/frontend under /demo)

Routes: `/demo/today` (coverage today, causes, work queue, agent feed) · `/demo/eligibility` (rolling verification run, exceptions) · `/demo/authorizations` (board) · `/demo/authorizations/[id]` (two clocks, attendance chart, history) · `/demo/authorizations/new` (request wizard with sign-off gate and agent submission) · `/demo/renewals` (radar lanes) · `/demo/denials` · `/demo/appeals` and `/demo/appeals/[id]` (appeal workspace) · `/demo/payers` (scorecard, trend, policy changes) · `/demo/leakage` (waterfall) · `/demo/agents` (roster, runs, guardrails, integrations). Mock data model: apps/frontend/src/lib/demo/types.ts. PRDs should reference these routes as "Demo reference".

## Personas (use these names consistently)

- **Operator / compliance lead** (Tracy): owns the process, KPIs, payer relationships, write-offs; signs off on policy; wants the whole picture and her day's workflow.
- **PA coordinator** (Jordan): assembles packets, files requests, chases status, tracks renewals; today lives in Excel + Availity.
- **Clinician** (Heather, LCSW): writes assessments and treatment plans, signs every packet, does peer-to-peers; ~$90/h; hates documentation burden but must stay the decision-maker.
- **Intake coordinator / front desk**: collects insurance, runs eligibility, books intake; first to see lapses and plan changes.
- **Offshore biller** (~$12/h): submits forms, faxes appeals, makes status calls; needs clear queues, not judgement calls.
- **Owner / board**: sees leakage, clinician time, care continuity; approves spend.
- **Payer UM reviewer** (external): reads packets page by page; needs criteria evidence on page 1.

## Glossary

PA (prior authorization) · UM (utilization management) · MCO (managed care organization) · LOCUS (Level of Care Utilization System) · SMI (serious mental illness) · TRP (therapeutic rehabilitation program) · P2P (peer-to-peer review) · COB (coordination of benefits) · 270/271 (eligibility inquiry/response) · 278 (authorization request/response) · 835/ERA (remittance) · CARC/RARC (denial codes) · partial approval (units granted < asked) · units (visit days) · window (authorization date range) · file-by date (derived renewal deadline) · backdating (decision effective from request date) · ghost expiration (units exhausted before anyone noticed).

## PRD template (every PRD follows this)

1. Summary and problem statement (with 3–6 evidence quotes cited to source docs)
2. Goals, non-goals, success metrics (leading and lagging)
3. Users and jobs-to-be-done (per persona)
4. End-to-end workflow: as-is (today) and to-be (with Psyflo), step by step, including who acts and what the agent does
5. Functional requirements: numbered FR-xx with priority (P0 pilot / P1 v1 / P2 later) and acceptance criteria
6. Screens and UX: for each screen — purpose, layout, key components, states, interactions, empty/error states, what is borrowed from which competitor; reference the demo route
7. Agent behaviours and guardrails
8. Data model and integration touchpoints (entities, fields, events; EHR/portal/clearinghouse/fax/phone)
9. Payer and regulatory rules the feature must encode
10. Edge cases and failure modes
11. KPIs and analytics this feature emits
12. Rollout and phasing (Harbor pilot → second design partner → general)
13. Open questions and research asks
14. Evidence appendix (source list)

Style: precise, evidence-cited, no marketing language, numbers sourced. Target 4,000–7,000 words per PRD. Markdown with tables; mermaid diagrams allowed for flows and state machines. File naming: `NN-slug.md`.
