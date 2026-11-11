# Roadmap and evidence register (Agent B)

Prepared 11 Nov 2026 for the PsyFlo x Harvest unified demo review. This is the "broader feature inventory kept as a roadmap and evidence register" that the prompt (Part 1.3) asks for. It is **not a build list**. It covers every numbered item (1-130) in `docs/product-direction.md`, plus its constraints, the "said on tape" lines, the nine demo changes it proposes, and v3 capabilities that have no inventory number.

## How to read it

**Evidence ids.** G- = Granola digest (`review/evidence/granola.md`). P- = Plaud digest. T- and U- = team-workspace digest. **Every P- id is secondary**: the Plaud connector returned no recordings, so the Plaud digest is built from PsyFlo's own written syntheses (the workflow map and `product-direction.md`). Read a P- id as "PsyFlo's record of what Harvest said", not as audio. Where a T- id comes from a Drive-hosted transcript the team workspace digest read in full (4 Nov clinical-advisor session, 5 Nov program-director session), it is closer to primary. "PD #n" means the item appears only in `product-direction.md`, with no digest id behind it. Staff are named by role only.

**Who asked.** H = a Harvest voice (V volunteered, L led by a PsyFlo question). PF = PsyFlo proposed it. REG = a regulation, payer or audit rule as reported (almost all unverified; see U- ids).

**Tier = the claim PsyFlo should make to Harvest, not the code state.** The code state is in the Master and v3 columns. Rule (full text in `02-product-strategy.md` section c):

1. Not in the proposed pilot scope: **FUTURE**, even if the demo already runs it (it is a "working preview").
2. Blocked by a rule, consent, a decision, or contradictory Harvest evidence: **UNRESOLVED**.
3. In pilot scope and the demo plays an external system, a language model or an unverified rule: **SIMULATED**.
4. In pilot scope and it runs end to end in the demo with nothing external faked: **WORKING-IN-DEMO**.
5. In pilot scope but not built, or only a static preview: **PILOT**.

W1 = Feb 1 launch scope (Nov 8 must-haves). W2 = later in the pilot window. Both are my recommendation for the lead to confirm.

**Master column** (checked in `demos/psyflo-unified-demo` code, not assumed): L live state and logic; S seeded (renders seed, buttons navigate); S+L seeded with live actions; STUB external system faked; DROP screen removed Nov 7-8 (seed data may remain); NONE not found. The mock Lauris is a simulated environment throughout, so "L" on an extension item means "works against the mock". **v3 column** (checked in `psyflo-tdt-v3-reference/source`): Y built; P partial; N none. v3 is a single-file client-side simulation (state in sessionStorage), so Y never means a real integration.

## A. Capture, inside Lauris (items 1-14)

| # | Item | Evidence | Who | Tier | Master | v3 | Home in the unified product |
|---|---|---|---|---|---|---|---|
| 1 | School referral link with attachments; flags what is missing | G-024 G-059 G-060 T-002 P-001 P-003 | PF (Harvest's Google Form confirmed as today's path) | WORKING-IN-DEMO W1 | L: ReferralForm, ReferralSent, SchoolPortal, Referrals, Referral (criteria shown / not shown / ask; guardian-consent box required) | N: New Cases removed Nov 1; routes redirect to Authorizations | School Portal (submit) + My Work > Referrals. Do not import the v3 redirect (Part 6). |
| 2 | Medicaid eligibility check at referral, dated proof kept | P-006 P-007 P-008 P-009 T-025 T-026 G-062 U-9 | PF; Harvest wants proof for audit defense (P-008, relayed from one payer's auditor) | SIMULATED W2 | L+STUB: Eligibility; a person runs the mock DMAS lookup (port 4002) and records the result; weekly re-check is hard-coded | P: eligibility state in New Cases data; no lookup or record screen | Referral > Eligibility panel. Cadence becomes a configurable rule marked unverified (U-9). Lookup visibly simulated (Part 4.4). |
| 3 | Family link: guardian confirms phone, time, transport, language | P-019 P-020 P-021 G-048 G-061 G-024 T-046 | PF; leadership warm 4 Nov (P-021, secondary); one clinician cautious (P-020) | SIMULATED W2 | L+STUB: FamilyLink (5 steps, EN/ES); SMS is a stub | P: family-settings (question toggles only) | Family Portal entry point; Referral > Send link. PsyFlo itself was unsure it is worth keeping (G-024, G-061). |
| 4 | Remote e-signature of the intake packet | P-016 P-017 P-019 P-021 T-007 T-074 G-013 G-061 U-10 | PF; Harvest says in-person (P-016); rule source unknown | UNRESOLVED | L: ParentSign and ParentEnroll collect a finger signature remotely and generate a PDF, with no in-person caveat and no per-document mode (conflicts with Part 4.3). PD says "not in demo"; the code says otherwise | N | Family Portal > Documents with a configurable signature mode (remote allowed / in person required / pending / completed). T-074: both DMAS SRA forms accept electronic clinician signature; that is a different document. |
| 5 | Screening-call coach: what to ask, what is missing | P-010 P-011 P-013 G-063 T-004 | PF | SIMULATED W2 | L (Flow A): ExtScreening, "Before you hang up" prompts from draft.js; scripted transcript or browser speech | Y: 66-screening (simulated) | Ext > Scribe > Admission screening. |
| 6 | Scribe: record screening and intake with consent, fill the Lauris form | P-029 P-131 G-032 G-063 T-004 T-049 T-056 T-057 T-060 | PF; Harvest ambivalent (typing hurts rapport, P-029; consent needs counsel, P-131) | UNRESOLVED | L: ExtScreening, ExtCNA against mock Lauris; consent is a reminder line ("Read consent first") and a status label, not a gate before Record | Y: 66-screening, 67-cna-isp, 75-dmas-scribe | Ext > Scribe, behind a "consent confirmed" gate. Conflict: Nov 8 must-have vs Nov 7 roadmap (spring) vs BAA and consent still open (T-049, T-050, T-060). |
| 7 | Scribe for daily, collateral and monthly notes (dropdown by form) | P-087 P-088 P-092 P-094 G-009 G-025 G-032 T-034 T-043 T-046 | H V (translation gap); PF (the Scribe form) | SIMULATED W1 | L (Flow B): ExtDPN with source chips and 14 drafting checks; S+L: ExtWeekly, ExtMonthly. Drafting is rule-based, no model | Y: 68-dpn, scribe.js, 64-ext-notes-util | Ext > Scribe; Mobile > Say what happened. Strongest evidence in the register (T-046: 4.6 of 5, top-rated). |
| 8A | Scan & Enhance, Mode A: review a current (unfinalized) draft | P-095 P-128 P-130 G-031 G-033 G-084 T-046 | PF; Harvest conditional (P-128: output must be checkable) | SIMULATED W1 | NONE as a button; only `enhanceDictation` (dictation to draft). "Scan & enhance" survives only as canvas titles | Y: 76-enhance (167 KB: recommendation cards, accept/edit/reject, original vs enhanced, sync states) | Ext > Scan & Enhance. Port v3 review controls; merges with item 7 for the pilot. |
| 8B | Scan & Enhance, Mode B: read-only evidence review of processed notes | P-113 P-114 P-139 G-090 G-092 | H (history requests are read-only: P-113, P-139) | PILOT W2 | NONE | P: 76-enhance reads old notes but offers an addendum path | Ext > Scan & Enhance (Mode B); feeds item 17. Never writes to a processed note. |
| 8C | Enhance or edit an already-processed note | P-081 P-097 P-100 G-035 G-093 G-094 T-072 | PF only (G-035); no Harvest request exists | FUTURE | NONE (by design) | P: addendum path in 76-enhance | Ruled out by the 7 Nov decision (G-093). The audit-risk reasoning is unvalidated (G-094); correction policy unknown (P-100). Any addendum flow must be policy-validated, attributable, dated, audited (Part 4.1). |
| 9 | Intervention-rationale library: why basketball, why movement, which goal | P-093 P-087 T-039 T-051 | H V | PILOT W1 | S: `interventions.rationale` on some items feeds draft chips; the library list is seed-only (screen dropped) | N | Settings > Library (admin) shown as "why" chips in Scribe. Needs Harvest's documentation trainer to author it (T-051 not yet received). |
| 10 | Track time: start/stop per student, increments, timer audit log | P-127 P-066 G-077 T-046 T-048 | PF (the 15-minute button is PsyFlo's); clinic lead said "everybody needs it" | WORKING-IN-DEMO W1 | L: timers on MobileApp and panel; **unit rule hard-coded at 60/180/300 minutes** (`unitsForDirectMinutes`), contradicting the 2-hour band in T-068 | Y: time.js + 63-ext-time (recorded vs billable, configurable tiers 120/180/300, link to a DPN, admin rules tab) | Ext > Track Time; Mobile. Port v3 rule model. Lowest-rated feature in Harvest's demo feedback (T-046: 3.4 of 5), so not the hero. |
| 11 | Treatment-plan goal and objective suggestions | P-037 P-038 P-042 P-043 G-065 | PF | SIMULATED W2 | S: ExtISP (3 goals drafted, Fill, source chips; client and guardian signature rows via portal) | Y: 67-cna-isp | Ext > Clinical review (ISP). |
| 12 | Permission levels: direct support, licensed clinical, admin | G-030 G-031 G-034 (PD #12) | PF; Harvest implied (direct staff must not see clinical content) | WORKING-IN-DEMO W1 | L but **UI-only**: registry.js `min` levels hide screens; `/api/state` returns the full state to every client | Y: PSY.ROLES, PSY.can, admin roles matrix (83-settings) | Settings > Roles; presenter role switcher. Do not claim enforced permissions. |
| 13 | Incident quick-capture from the extension | P-140 P-141 G-087 T-056 | PF ("You could"); Harvest compliance interest is one voice | FUTURE | S+L: ExtIncident (seeded for one student; others typed), state-portal mock | N | Ext > Additional actions. Nov 8 "can wait". |
| 14 | A camera that watches and writes the note | P-142 | H, half-joking | FUTURE | NONE | N | Not planned. Recording students needs consent and counsel. |

## B. Draft, a clinician signs (items 15-26)

| # | Item | Evidence | Who | Tier | Master | v3 | Home |
|---|---|---|---|---|---|---|---|
| 15 | Initial SRA draft, every sentence cited, green from Lauris, yellow to check | P-044 P-045 P-048 P-052 T-010 T-074 G-066 | PF; Harvest liked per-sentence citing (PD) | SIMULATED W2 | L (Flow C): ExtSRA, `draftInitialSRA`, numbered source chips, checks computed | Y: 71-dmas-form, 77-flow-initial, 89-drafts (provenance labels) | Ext > Authorization prep. Port v3 provenance labels (Retrieved from Lauris / AI draft / Clinician-entered / Input required). |
| 16 | Published-evidence library (state and federal reports) | P-049 G-025 G-079 G-084 | H already does it by hand (P-049); PF wants citations | UNRESOLVED | S: library entries seed-only (screen dropped) | P: policy references in recommendation cards | Settings > Library, labeled "published evidence", never mixed with the patient record. Conflicts with the source-traceable rule (G-025, G-079). |
| 17 | Continued-stay SRA from daily, weekly, monthly notes, 30-day recency, cited | P-105 P-106 P-107 P-114 T-023 G-007 G-090 G-092 | PF; Harvest "incredible" (P-114) | SIMULATED W2 | S+L: ExtCase; `draftSeeded` over **3 sample notes**; the 61/12/3 counts are static; range toggle recounts canned numbers | Y: 78-flow-continued, 89-drafts | Ext > Scan & Enhance (Mode B) and Authorization prep. Biggest gap between evidence value and code reality. |
| 18 | Additional-information reply within 24 hours | P-069 P-060 T-014 T-015 G-018 U-7 | H V | SIMULATED W2 | S+L: InfoRequest; reply drafted from request plus notes; Sfax stub; 24 h clock hard-coded | Y: 88-requests | Denial Intelligence > case > Provide requested information; Authorizations "Needs action". Window is payer-specific (T-015): configurable. |
| 19 | Partial-approval decision support: accept, add info, peer-to-peer, early discharge | P-063 P-064 P-070 P-071 T-013 T-014 T-016 G-018 G-072 U-4 | H V | WORKING-IN-DEMO W2 | L: Partials (four doors), EarlyDischarge; arrival of a partial is a labeled demo-only admin control | Y: 86-partials, 79-flow-decision | Denial Intelligence > case > Options. Early-discharge rules (30 days) are Harvest-reported and undocumented (U-4); keep configurable. |
| 20 | Peer-to-peer brief: reason, units, questions, points, evidence | P-070 P-126 T-014 G-043 G-072 | PF; Harvest "genius" (P-126) | WORKING-IN-DEMO W2 | S+L: PeerBrief (assembled from the request; agreed time and outcome logged; optional transcript) | Y: 87-p2p, script in 51-denial-detail | Denial Intelligence > case > Prepare peer-to-peer. Recording consent is an open question (NEXT-STEPS). |
| 21 | Peer-to-peer scheduling automation | P-070 G-004 G-028 G-072 | PF | FUTURE | NONE (date typed by a person) | P: simulated voice agent (09-voice, purpose `p2p`) can call the payer about it | Roadmap card only. Peer-to-peer must be done by clinical staff (P-070, G-028). |
| 22 | Guardian appeal letter with e-sign link and translation | P-073 P-075 P-076 P-077 P-078 T-017 G-019 G-074 G-111 U-12 | PF; Harvest "why not" if simple (P-077) | UNRESOLVED | L: AppealLetter (guardian edits and signs, EN/ES, fax stub); ParentLetters states flatly "only a guardian can appeal" | P: appeal and reconsideration drafts in 51-denial-detail | Denial Intelligence > case + Family Portal. Who may appeal is unresolved (P-075 vs P-076, U-12). |
| 23 | Overdue-decision notice citing the 7-day standard | P-057 P-058 T-012 T-064 T-076 G-071 U-6 | PF; Harvest believes 14 days (P-058) | UNRESOLVED | L: `overdueNotice`; clock text "day N of 7" hard-coded | Y: overdue notice in 88-requests | Authorizations > case, window configurable with a source label. |
| 24 | Quarterly report, discharge summary, internal quarterly drafts | P-101 P-102 P-103 T-022 G-011 | H workflow | FUTURE | S+L: ExtQuarterly (+ ParentQuarterly signature), ExtDischarge, internal quarterly saved in Psyflo only | P: discharge content only; no quarterly | Ext > Clinical documents. Working preview, outside the pilot. |
| 25 | Supervision notes by dictation | P-140 | H V (one voice) | FUTURE | NONE | N | Roadmap card. |
| 26 | Manual note-enhancement service while the product is built | T-062 G-029 | PF internal | UNRESOLVED | n/a | n/a | One voice suggested clients need not know manual work happens behind the product (G-029). Decide whether to offer it, and if so disclose it as a human service. |

## C. Send and track (items 27-38)

| # | Item | Evidence | Who | Tier | Master | v3 | Home |
|---|---|---|---|---|---|---|---|
| 27 | Packet assembly; clinician presses Send by Sfax; portal opened in the clinician's own login | P-055 P-059 T-010 G-016 G-068 G-070 | PF | SIMULATED W1 | L+STUB: Submission; Sfax stub returns reference and receipt in about 3 s; mock Availity and UHC pages; PDF generated | Y: simulated submission (labeled) in 77/78 | Authorizations > case > Send. Sfax API access unverified (G-070). |
| 28 | Agents submit with stored credentials | P-062 P-123 T-054 T-055 G-037 G-069 G-001 | PF; Harvest wants a person reviewing (P-123) | FUTURE | NONE (rule 3: a person presses Send) | N, but FLO (item 41) signs in to Lauris with PsyFlo credentials | Ruled out for the pilot by the Nov 8 contract. Do not demo as working. |
| 29 | Inbound fax reading and matching by member ID and reference | T-010 G-070 P-055 | PF | FUTURE | STUB: no OCR in code; the demo uses an admin-only "Demo: receive a reply" control | N | Pilot logs replies by hand. PD says "yes in demo"; code says no. |
| 30 | Day-10 receipt call dialed by PsyFlo and handed to staff | P-057 T-012 G-016 G-068 | PF | WORKING-IN-DEMO W2 (reminder and script only; dialing is FUTURE) | L: receipt-check reminder; a person calls and types the outcome. **Scheduled for one payer only, at day 5** (`core.js`), while Harvest reports a call at about day 10 (P-057, T-012) | P: simulated voice agent calls the payer (09-voice) | Authorizations > case, day offset configurable per payer. The call confirms receipt; it is not a decision chase (P-057). |
| 31 | Authorizations tracker with stage, clocks, filters | P-059 P-111 P-112 T-018 T-044 G-039 G-072 | PF; Harvest "too many trackers" (P-112) | WORKING-IN-DEMO W1 | L: Authorizations (filters over `stage`, History toggle, demo controls for admins) | Y: 80-auth-list (timeline, shared filter bar, date-range box) | Authorizations tab. Port v3 queue and case shell. |
| 32 | Renewal reminder emails two weeks ahead | P-072 T-044 G-040 U-8 | PF | SIMULATED W2 | L+STUB: reminders in store; email is a stub; "14 business days" hard-coded (U-8) | P: weekly email switch (83-settings) | Authorizations (Renewal due) + My Work. |
| 33 | Units countdown against Lauris "units available" | P-072 P-122 T-018 T-044 G-072 U-16 | PF; Harvest: units must match Lauris | WORKING-IN-DEMO W1 | L: units drawn down when a daily note is processed (`lead-extension.js`), using the hard-coded 60/180/300 rule; "3 units per school day" hard-coded in clocks | Y: units remaining filter and column | Authorizations; Ext home. Units come from Lauris (open question: read or confirm). |
| 34 | Historical import of trackers and Lauris exports | P-139 T-027 | PF; Harvest wants the full past text | FUTURE | DROP: Migration removed Nov 7; seed `migration` only | N | Manual entry of in-flight requests for the pilot. |
| 35 | Payer playbook: what each MCO asks, channel, who answers | P-055 P-060 T-077 G-087 U-13 | PF | FUTURE | S: PayerPlaybook; "tends to ask" text and rates are seeded | P: payer data and denial reasons; no playbook screen | Contextual in Denial Intelligence and Analytics > Payer Performance. Deprioritized Nov 7 (G-087). |
| 36 | Decision read-back from Availity and UHC in session | P-059 P-060 P-061 T-010 T-011 | PF | UNRESOLVED | STUB: extension reads a portal confirmation number only | P: history "read" events | Harvest says it does not look decisions up in portals (T-010, T-011, P-061) yet staff monitor Availity (P-059, P-060). |
| 37 | Audit packet assembled electronically, print-ready | P-079 P-080 T-024 | H V | FUTURE | NONE (Analytics PDF only) | N | Roadmap card. Auditors want paper. |
| 38 | Redesign readiness: CANS per SRA, 15-minute units, caseload cap | P-116 P-117 T-032 T-078 G-047 | H (P-116); PF | UNRESOLVED | S: seed library entry only | N | Rules and dates unverified (T-032, G-047). Keep configurable; roadmap card. |

## D. Prove and report (items 39-48)

| # | Item | Evidence | Who | Tier | Master | v3 | Home |
|---|---|---|---|---|---|---|---|
| 39 | Outcomes baseline by payer; units requested vs awarded; decision days | P-063 P-064 T-045 T-067 G-076 U-14 | PF | PILOT W2 | S: Analytics baseline (146 decisions, 57% partial) **labeled "Harvest's Lauris export"**; Harvest has never computed these rates (T-045, T-067) | Y: 41d-an-payer, 85-analytics-data (derived from demo records) | Analytics > Payer Performance. Real numbers only after Harvest data arrives; demo numbers must be labeled illustrative (Part 12.6). |
| 40 | Grant data pulls: cited sentences, incident counts by semester | G-042 G-053 P-005 | H V (use); PF (feature) | FUTURE | S+L: Analytics "Grant pull" (4 cited sentences, PDF) | P: report builder removed Round 11; FLO | Analytics > Additional reporting. Working preview. |
| 41 | Ask-a-question agent over PsyFlo and tracker data | G-038 G-053 G-087 | PF | FUTURE | NONE | Y: FLO data agent (42-flow), simulated; signs in to Lauris | Roadmap card. v3's login-to-Lauris design conflicts with Part 9.6. |
| 42 | Incident reporting: EHR report, 24-hour state portal, 3-in-3-months flag | P-140 P-141 G-054 G-087 T-056 | H V (one voice) | FUTURE | S+L: ExtIncident, mock state portal, `incident.filePortal`; Compliance screen DROP | N | Ext > Additional actions. Single voice; can wait. |
| 43 | QI evidence tied to plan objectives; licensure binder | P-140 G-054 | H V | FUTURE | DROP: Compliance removed Nov 8; seed `compliance` only | N | Roadmap card. |
| 44 | Staff credential and certification expiry tracking | P-140 | H V | FUTURE | DROP: seed `compliance.credentials` only | N | Roadmap card. |
| 45 | Time-tracker audit report for payer disputes | P-127 P-066 T-046 T-048 | PF; Harvest "everybody needs it" | FUTURE | S: timer events exist; no report | P: audit tab in Settings | Analytics > Additional reporting. |
| 46 | An EHR offering for brand-new providers | P-120 P-121 | H V (executive director, one voice) | FUTURE | NONE | N | Not planned; contradicted by the pilot owner's add-on advice (P-120). |
| 47 | Rollout kit: staff video with QR feedback, training, Slack help | G-056 P-130 T-049 | H asks; PF | PILOT W1 | n/a | n/a | Non-software pilot task. |
| 48 | Pricing: per note or per patient plus implementation | P-133 G-045 G-086 G-106 T-062 | PF | UNRESOLVED | n/a | n/a | Pilot length quoted as 8 weeks and 2-3 months (G-086, G-106); Harvest told no pricing yet (G-045). |

## E. Second pass (items 49-96)

| # | Item | Evidence | Who | Tier | Master | v3 | Home |
|---|---|---|---|---|---|---|---|
| 49 | Payer-disclosure filter: flag sensitive family detail, suggest what to leave out | P-052 T-040 | H V (strongest unprompted statement) | PILOT W2 | S+L: ExtCase include/exclude toggle on seeded text; no detection | P: disclosure toggle in recommendations | Ext > Authorization prep. Build detection; keep chart complete. |
| 50 | Prior-service verification log (provider, last session, frequency, on leave) | P-050 T-006 | H V | PILOT W2 | P: draft rule 7 blocks a draft until prior service has provider, dates, outcome; no log | P: prior-service rule text (02-core-data) | Referral/Case panel. |
| 51 | Screening routed to whoever can do it; clinician capacity view | P-013 T-005 | H V | UNRESOLVED | P: screening has a `who`; Do next lists calls; clinician-only gating | N | T-005: most screenings are done by site supervisors who are QMHPs, not LPCs; P-013 says LPCs. Role gating (screening = clinician) may be wrong. |
| 52 | Conditional intake logic and in-flow guidance | P-028 P-034 | H V | PILOT W2 | P: ExtCNA "Still to ask" list | P: 69-intake-form | Ext > Scribe > Intake. |
| 53 | Intake sequencing: developmental history before trauma | P-031 | H V | FUTURE | NONE | N | Roadmap card. |
| 54 | Guardianship and consent-authority tracker | P-032 | H V | FUTURE | NONE | N | Roadmap card. |
| 55 | Release-of-information and collateral-contact log | P-033 | H V | FUTURE | P: "Release on file" box only | N | Roadmap card. |
| 56 | Referral risk-history screen | none (PD #56) | H V (operations lead) | FUTURE | NONE | N | Roadmap card. |
| 57 | Per-school operations sheet replaced | P-083 P-111 | H V | FUTURE | P: school counts seeded (SchoolPortal) | N | Roadmap card. |
| 58 | Staff day planner coordinated with teachers | none (PD #58) | H L | FUTURE | NONE | N | Roadmap card. |
| 59 | Internal-only "concerns" note type, never sent out | P-102 P-125 | H V | FUTURE | S+L: internal quarterly saved in Psyflo only | N | Ext > Clinical documents. Working preview. |
| 60 | Safety-plan completeness check when a note mentions suicidal ideation | P-098 | H V | PILOT W1 | NONE (seed text only) | N | Ext > Scribe check. |
| 61 | Maintenance-day framing for calm days | P-090 | H V | PILOT W1 | S: "quiet-day rule" strings are hard-coded `pass: true` in seeded drafts; not a computed check | N | Ext > Scribe check; supports the audit-safe note. |
| 62 | Payer-language lint before Process Form ("observed", gaps) | P-081 P-096 | H (example); PF | WORKING-IN-DEMO W1 | L: `noObserved` check computed for daily notes and rewrites the verb; minute-gap and punctuation checks absent | P: "observed" handling in 68-dpn, 76-enhance | Ext > Scribe check. |
| 63 | Copy-forward detection: pasted narratives vs legitimately fixed sections | P-097 G-081 | H V | PILOT W1 | P: rule 13 compares the first 60 characters with recent notes; ReviewQueue flags repeated paragraphs | N | Ext > Scribe check; My Work > Review. Extend to the last 30 notes (item 108). |
| 64 | Absence and non-billable handling | P-119 | H L (executive director) | PILOT W1 | NONE; the on-time rate assumes every caseload student is expected daily | N | Needed for the note-timeliness denominator (`02-product-strategy.md` section g). |
| 65 | Case-formulation summary for direct staff | none (PD #65) | H V | FUTURE | NONE | N | Roadmap card. Exception to item 12. |
| 66 | Daily progress-rating trend with "not progressing" alert | none (PD #66) | H L | FUTURE | P: ParentProgress shows good days by month; no alert; "goal watch" dropped Nov 7 | N | Roadmap card. |
| 67 | Units-request calculator | P-064 P-065 | H L | FUTURE | P: Partials and EarlyDischarge compute run-out dates | N | Roadmap card. Unit bands unresolved (P-065). |
| 68 | Plain-language explanation of payer letters for guardians | P-073 G-097 | H V | FUTURE | L: ParentLetters (cards from request states, glossary, EN/ES) | N | Family Portal. Working preview. |
| 69 | Covering-clinician handoff pack for 24-hour requests and one-shot peer-to-peers | P-074 T-014 | H V | PILOT W2 | NONE | N | Denial Intelligence > case. Reuse PeerBrief and InfoRequest assembly. |
| 70 | Co-occurring-diagnosis focus | none (PD #70) | PF | FUTURE | NONE | N | Roadmap card. |
| 71 | Audit-response drafting, including extrapolated audits | P-080 P-081 T-024 | H V | FUTURE | NONE | N | Roadmap card. |
| 72 | Retro-claim dispute pack | P-009 T-024 | H V | FUTURE | NONE | N | Roadmap card. |
| 73 | Reverse-engineer payer denial logic | none (PD #73) | PF | FUTURE | P: seeded "tends to ask" text | P: denial reasons by payer | Roadmap card. |
| 74 | Internal SRA sign-off queue replacing the email chain | P-046 T-010 T-065 | H L | PILOT W2 | P: Authorizations filter "Drafts to review and send"; no internal-approval stage | N | Authorizations: add a "Needs approval" stage (T-065). |
| 75 | Reviewer approval queue before form data populates downstream | P-046 | H L | UNRESOLVED | P: ReviewQueue marks a note pending after Process Form, so it cannot gate what Lauris already holds; Lauris has its own Forms to Approve | N | Clarify what Lauris already approves before building a parallel queue. |
| 76 | Tiered note-review queue: trainer reads every note, then spot checks | P-091 T-019 | H L | WORKING-IN-DEMO W2 | L: ReviewQueue (`every_note` vs `spot_check`, wrote-vs-enhanced diff, Approve / Return / "That didn't happen") | N | My Work (supervisor). Nov 8 "tier 2, can wait". |
| 77 | Supervisor backlog view: who is behind on dailies | P-088 P-091 T-043 | H V | WORKING-IN-DEMO W1 | L: StaffDashboard supervisor view; on-time rate counted from observed Process Form events; time-in-Lauris and rejects are seeded | N | My Work (supervisor). Pilot KPI source. Conflicts with Nov 8 "can wait". |
| 78 | MCO phone-negotiation log: offered, countered, awarded | P-067 T-013 | H V | FUTURE | NONE (the 150/120/140/110 case is not logged as a negotiation) | P: voice-agent call log | Roadmap card. |
| 79 | Appeal-in-progress exposure: unpaid days and back-pay | P-068 P-076 | H V | FUTURE | P: "unpaid hours" is a seeded Analytics figure | P: units at risk | Roadmap card. |
| 80 | Submit-or-withhold triage for continued stays Harvest expects to lose | P-004 | H V | FUTURE | NONE | N | Roadmap card. Sensitive: a strategy tool, not documentation. |
| 81 | Summer and change-of-service continuation | P-108 T-075 | H V | FUTURE | NONE | P: modifier text only | Roadmap card. |
| 82 | Post-intake clocks: ISP in 24 hours, everything in a week | P-035 P-053 T-008 T-016 G-015 G-067 U-1 U-5 | H V (practice); DMAS text says 30 days (T-070) | UNRESOLVED | S: canvas text and a "30-day limit" request clock | Y: ISP timer in 67-cna-isp | Case shell clock, configurable, labeled Harvest-reported. |
| 83 | Form-mapping audit for the Lauris base sheet | P-045 | H L | PILOT W1 | n/a: extension maps by label; field labels are "best reading" (README) | N | Setup task: verify field labels against real Lauris forms (access pending; templates not received, T-051). |
| 84 | Multi-locality tax-ID split | P-047 | H V | FUTURE | P: locality toggle in Analytics | P: locality filter | Roadmap card. |
| 85 | Program-track configuration: grant-funded vs Medicaid rules | P-001 P-002 P-003 T-003 | H V | WORKING-IN-DEMO W1 | L: Referral "Route to grant program" (stub notices); rule configuration absent | N | My Work > Referrals. |
| 86 | Client-number registry | P-027 G-044 | H V | FUTURE | P: Harvest number from seed; the extension links the number Lauris assigns | N | Roadmap card. |
| 87 | Org chart of schools, directors, supervisors | none (PD #87) | H V | FUTURE | NONE | N | Roadmap card. |
| 88 | School-partner contact and agreement tracker | none (PD #88) | H V | FUTURE | NONE | N | Roadmap card. |
| 89 | Policy and regulation monitor | P-117 T-032 T-078 | H V | FUTURE | NONE | N | Roadmap card. PsyFlo already produces an internal weekly digest (not official, T-078). |
| 90 | Lauris partnership or API | P-118 P-120 P-144 G-022 G-023 G-085 T-027 T-053 | H asked how; PF | FUTURE | NONE (page bridge only) | N | Standing rule: no integration claims (Part 9.6). PsyFlo told one outside clinic it is "integrated" (G-085). |
| 91 | School-division reporting: hours vs incidents by county | none (PD #91) | H V (executive director) | FUTURE | S+L: Analytics "division report" preview | N | Analytics > Additional reporting. |
| 92 | State-portal incident submission, 24-hour clock | P-141 P-140 G-087 | H V; REG (state filing, as reported) | FUTURE | S+L: ExtIncident clock banner, mock state portal | N | Ext > Additional actions. |
| 93 | Monthly Lauris incident and CPS import with tags | P-140 | H L | FUTURE | NONE | N | Roadmap card. |
| 94 | Employee-file and policy audit packet | P-140 | H V | FUTURE | NONE | N | Roadmap card. |
| 95 | Billing and claims dashboard extended with diagnosis and incident data | none (PD #95) | PF | FUTURE | NONE | N | Roadmap card. No billing role was in the rooms (P digest 4.10). |
| 96 | Service-delivery evidence pack for payers who dispute 5+ hour days | P-066 | H V | FUTURE | P: timer blocks feed contact-time rows | P: time.js entries | Roadmap card; builds on item 10. |

## F. Third pass: the 11/04 and 11/05 material (items 97-130)

| # | Item | Evidence | Who | Tier | Master | v3 | Home |
|---|---|---|---|---|---|---|---|
| 97A | Parent portal: enrollment paperwork signed before intake | P-021 P-022 P-024 G-048 G-096 T-036 T-046 T-007 | H V (leadership); LPC cautious (P-020) | UNRESOLVED | L: ParentEnroll (7 items), ParentSign, ParentPortal; no in-person caveat | N | Family Portal. Blocked on the signature rule (item 4). Roadmap puts the portal in late March (T-057). |
| 97B | Parent portal: progress view, cadence surveys, quarterly signed on the phone | P-022 G-097 T-036 | H V | FUTURE | L: ParentProgress, ParentSurvey, ParentQuarterly (EN/ES) | N | Family Portal. Working preview; Nov 8 "can wait". |
| 97C | Virtual intake or reassessment where allowed | P-022 | H V | FUTURE | NONE (ParentSchedule books calls and visits) | N | Roadmap card. Telehealth intake was withdrawn (P-015). |
| 98A | School portal: referral button | P-137 T-037 G-059 | H V | WORKING-IN-DEMO W1 | L: SchoolPortal, ReferralForm, ReferralSent (same as item 1) | N | School Portal. |
| 98B | School portal: daily classroom info, teacher feedback, incident uploads, surveys, progress view | P-137 T-037 G-096 | PF proposed; H "might be cool" | FUTURE | S+L: counselor "Share an update" only; teacher portal and check-ins dropped Nov 7; no treatment-plan view | N | School Portal. School privacy boundaries untested (G digest 3l). |
| 99A | Staff view: own note completion and what is missing | P-099 P-134 P-135 T-038 T-043 | H V | WORKING-IN-DEMO W1 (timeliness slice only) | L: StaffDashboard my view; seeded site averages labeled "Harvest's Lauris export" | N | Ext home ("4 of 6 notes today"); My Work. Nov 8 "can wait" conflicts with the pilot KPI. |
| 99B | Staff view: goal progress, deliberate-practice goals, supervision conversation | P-134 P-135 T-038 | H V | FUTURE | S: seeded goals; goal watch dropped Nov 7 | N | My Work. |
| 100 | Staff performance and training metrics, incentives | P-134 P-135 T-038 | H V | FUTURE | S: seeded | N | Roadmap card. Staff said they want to see their own data, not be told (P-134). |
| 101 | Mobile app for direct staff: pick student, start/stop, dictate | P-094 G-010 G-103 T-019 T-030 T-035 | H V | SIMULATED W1 | L: MobileApp, MobileDictate (390 px web; browser speech); no screen-locked capture | N | Mobile. The ask comes through PD only (the 4 Nov session is not in Granola, so the Granola digest finds no staff request). G-010 relays that staff use laptops for the EHR; phones are for capture. Do not promise locked-screen recording (Part 10). |
| 102 | Interim dictation workaround: email or Notes capture routes into PsyFlo | P-094 T-019 T-035 | PF; Harvest accepted as interim | PILOT W1 | NONE | N | Mobile (interim intake). Lowest-risk way to start. |
| 103 | Voice tagging: say the student's name to start or tag | P-094 | H V | FUTURE | NONE (student chips only) | N | Roadmap card. |
| 104 | Record planned interventions in the room, not only time | none (PD #104) | H V | FUTURE | NONE | N | Roadmap card. |
| 105 | Dictation lands in the Lauris saved session so staff open it and save | P-094 T-019 | PF with H | SIMULATED W1 | L: dictation waits in Psyflo and drops into the open daily note (not a saved session) | N | Ext > Scribe. Differs from the item as worded: write only into an open form (Part 9.6). |
| 106 | Date-range selector and include/exclude boxes over the evidence | P-113 G-090 T-039 | H V | SIMULATED W2 | S+L: ExtCase toggles (last 30 days / whole period) over canned numbers | Y: 04b-daterange, 78-flow-continued | Ext > Scan & Enhance (Mode B). |
| 107 | Keyword counts across the period | P-113 P-106 G-090 | H V | SIMULATED W2 | S+L: ExtCase tallies are static | P: counts in case data | Ext > Scan & Enhance (Mode B). |
| 108 | Boilerplate detection across the last 30 notes | P-097 G-081 T-039 | H V | PILOT W1 | P: see item 63 | N | Ext > Scribe check. |
| 109 | Goal-neglect alert | P-138 T-039 | H V | FUTURE | S: seeded flag text only; goal watch dropped | N | Roadmap card. |
| 110 | Specific intervention suggestions | none (PD #110) | H V | FUTURE | NONE | N | Roadmap card. |
| 111 | Real-time prompts during an intervention or conversation | none (PD #111) | PF; H "would love" | FUTURE | P: screening prompts only | N | Roadmap card. |
| 112 | Internal quarterly generated with sensitive-information strip-out | P-125 P-102 T-022 | H V | FUTURE | S+L: internal quarterly saved in Psyflo only (see item 59) | N | Ext > Clinical documents. |
| 113 | Quarterly assembled from daily ratings plus PHQ, GAD, cross-cutting measures | P-104 G-049 G-100 | H V | FUTURE | S: ExtQuarterly from seeded ratings and assessments | P: PHQ in cohort | Analytics > Patient Outcomes. |
| 114 | Assessment reminders to staff | none (PD #114) | PF; H "would love" | FUTURE | S+L: MobileAssess due list | P: assessments in cohort | Mobile. Working preview. |
| 115 | Discrepancy detection across parent, child, teacher, staff surveys | none (PD #115) | PF; H "helpful" | FUTURE | NONE (notes.md mentions it) | N | Analytics > Patient Outcomes. |
| 116 | Restraint and incident pattern alerts per staff member | none (PD #116) | H V | FUTURE | NONE | P: incident counts in cohort | Roadmap card. |
| 117 | Discharged-client re-check prompt at semester start | P-115 | H V | FUTURE | NONE | N | Roadmap card. |
| 118 | Stakeholder and school-district report | G-050 G-051 G-052 | H V | FUTURE | S+L: division-report preview only | N | Analytics > Additional reporting. |
| 119 | Grant-program eligibility tracker | P-143 T-003 | H V | FUTURE | NONE | N | Roadmap card. Conflicts with TDT-only scoping (item 125). |
| 120 | Signature clocks; block the next form until signed | P-024 | H V | FUTURE | DROP: Migration "missing signatures" removed | N | Roadmap card. |
| 121 | Supervisor note-quality view and approval routing for trainees | P-091 T-019 | H V | WORKING-IN-DEMO W2 | L: ReviewQueue (same as item 76) | N | My Work (supervisor). |
| 122 | Units-low email with auto-drafted renewal | P-072 T-044 U-8 | PF; H "Oh yes" | SIMULATED W2 | L+STUB: renewal draft_ready and reminders; email stub; timing hard-coded | P | Authorizations (Renewal due). |
| 123 | Auto-submit through Medicaid portals and read status back | P-062 T-055 G-069 | PF | FUTURE | NONE (rule 3) | N | Ruled out for the pilot; see item 28. |
| 124 | Exact DMAS form rendering; UHC deprioritized | T-010 T-074 | H V | PILOT W1 | P: mock Lauris SRA labels are a "best reading"; real forms are hard copies | Y: 71-dmas-form | Setup task with item 83. |
| 125 | Extension scoped to TDT clients only; outpatient and SEBs never pulled in | P-124 T-027 T-040 | H V | WORKING-IN-DEMO W1 | L: bridge reads `Program:` and the panel lists TDT consumers only | N | Ext. Strong Harvest requirement. v3's cohort includes IOP and PHP patients, which breaks this. |
| 126 | Knowledge library for drafts | P-043 | H V | FUTURE | DROP: Settings > Library removed; seed only | N | Roadmap card. Related to item 16. |
| 127 | Historical migration from Lauris by periodic export | P-139 T-027 | PF | FUTURE | DROP | N | Roadmap card. |
| 128 | Appeal letters drafted for guardians, e-signed by link | P-077 P-073 G-074 | PF; H "why not" | UNRESOLVED | L: see item 22 | P | See item 22. |
| 129 | Pre- and post-launch staff survey; KPIs (note timeliness, admin time, approvals) | P-136 G-049 G-058 T-041 T-042 | H and PF | PILOT W1 | n/a | n/a | Non-software; baseline in T-042 to T-045. Definitions in `02-product-strategy.md` section g. |
| 130 | Escalation ladder and program tracks; parent consent before referral | P-003 T-002 T-003 P-001 | H V | WORKING-IN-DEMO W1 | L: referral form requires guardian-consent attestation; grant-program route | N | School Portal and My Work > Referrals. |

## G. Constraints and requirements in the inventory

| # | Constraint | Evidence | Master | v3 | Note |
|---|---|---|---|---|---|
| C-1 | No EHR integration; Lauris is the record; units must match Lauris | P-122 P-120 T-053 G-022 | Honored (page bridge, open form only) | Honored in the Lauris mock; FLO breaks it | Keep. |
| C-2 | Output must be checkable and must not invent | P-128 P-093 T-046 | Per-box source chips and 14 checks; some checks hard-coded `pass: true` on seeded drafts | Provenance labels | Port v3 labels; compute every check. |
| C-3 | Nothing adds work; adoption becomes a written staff expectation | G-045 T-052 | Sidebar carries 12 items for admins | 3 tabs | Keep the pilot small (T-052). |
| C-4 | A person signs; only clinical staff reply to payers; only guardians appeal | T-054 P-069 P-070 P-075 | Honored except "only guardians appeal" is stated as fact (item 22) | v3 voice agent and "submit" are simulated | "Only guardians" is unresolved (U-12). |
| C-5 | Recording needs consent and counsel; BAA before any data | P-131 T-049 T-050 T-060 G-107 G-112 | No consent gate in the recording flow; seed library claims "attorney-reviewed Oct 2026", unsupported | v3 has none | Open as of 10 Nov. |
| C-6 | The Virginia redesign may change forms, units, caseload rules | T-032 G-047 T-078 | Hard-coded unit math and clocks | Configurable unit rules | Keep configurable (Part 4.6). |

## H. "Said on tape" lines in the inventory (not product features)

| # | Line | Evidence | Home |
|---|---|---|---|
| X-1 | Recording-consent form and compliance pack (BAA, SOC 2, outside counsel) | P-131 T-049 T-050 | Pilot precondition; not a screen |
| X-2 | Pre-decision "how it physically works" collateral | P-130 | Presenter materials |
| X-3 | One to two weeks on site beside the assistant clinical support supervisor before output reaches her | P-130 G-056 | Pilot task |
| X-4 | Clinician-written prompts with Harvest's trainer | P-093 T-051 | Pilot task (with item 9) |
| X-5 | "Examples of badness" notes as an evaluation set | P-128 T-051 | Pilot task; not yet received |
| X-6 | Grant-funded procurement routes; a competitor conversation; separate LMS; later service lines (ABA, IOP, PHP) | P-133 | Out of scope |

## I. The nine demo changes `product-direction.md` proposes

| # | Change | Status in master | Status in v3 |
|---|---|---|---|
| D-1 | Scan & enhance shows a diff with source tags | NONE as Scan & Enhance; ReviewQueue shows wrote-vs-enhanced; DPN draft shows source chips | Y (76-enhance) |
| D-2 | Intervention-rationale panel in the extension | P: rationale text appears in draft chips | N |
| D-3 | Analytics "pull every cited sentence" and incident export | S+L: Grant pull modal; no incident export | P |
| D-4 | Phase-2 board: incidents, QI, credentials, supervision | DROP (Compliance removed) | N |
| D-5 | Family link grows into a parent-portal board | L: ParentEnroll, ParentProgress, ParentQuarterly, ParentSurvey | N |
| D-6 | School-portal board: referral, classroom input, incident upload, progress | P: referral and counselor update only | N |
| D-7 | Mobile-app board with the email/Notes workaround beside it | L (app); workaround NONE | N |
| D-8 | Staff-dashboard board | L: StaffDashboard | N |
| D-9 | Keep peer-to-peer brief, partial doors, early-discharge path as they are | L | Y |

## J. v3 capabilities with no inventory number

| # | Capability | Evidence | Tier | Master | v3 | Home / note |
|---|---|---|---|---|---|---|
| V-1 | Three-tab management shell with shared filter bar and date-range box | none from Harvest (PsyFlo instruction, Round 9); G-039 shows the earlier two-tab decision | WORKING-IN-DEMO W1 | NONE (sidebar of 7 plus four doors) | Y: 04-filterbar, 04b-daterange, shell nav | Authorizations / Denial Intelligence / Analytics. Harvest has not seen it (walkthrough 12 Nov, G-110). |
| V-2 | Denial Intelligence queue and decision workspace (reconsideration, appeal draft, P2P script, missing evidence, history) | P-063 P-070 G-043 T-014 | WORKING-IN-DEMO W2 | P: Partials, InfoRequest, PeerBrief, AppealLetter exist as separate screens | Y: 50-denials, 51-denial-detail (154 KB) | Denial Intelligence tab. Port the case workspace. |
| V-3 | History with actor tags (agent / PsyFlo / person) | none | WORKING-IN-DEMO W1 | P: `events` audit list with who | Y: 08-history | Authorizations > case > timeline. |
| V-4 | Outbound voice agent calls the payer | none from Harvest; PF (founder request) | FUTURE | NONE | Y: 09-voice, simulated | Roadmap card. No Harvest ask; says "automated assistant on behalf of Harvest". |
| V-5 | FLO data agent (signs in to Lauris, pulls records, builds a report) | G-038; G-042 (Harvest wants cross-student data) | FUTURE | NONE | Y: 42-flow, simulated | Roadmap card. Conflicts with Part 9.6. |
| V-6 | Simulated cohort analytics (three sections, minimum group size 5, separate from demo cases, "Simulated cohort" chip) | G-049 G-050 G-053 | FUTURE | NONE | Y: 41, 41c, 41d, 41e, 85c-cohort | Analytics. Keep labeled; cohort includes IOP and PHP, not TDT-only. |
| V-7 | "Chance of full award" percentages on denied cases | G-075 | FUTURE (do not demo) | NONE | N (removed): `PSY.reco.chance()` returns null and draft text strips likelihood wording; the 2 Nov demo shown to Harvest still carried percentages (G-075) | Prompt warns against ungrounded prediction (Parts 12.1, 17). Harvest has seen percentages once; say they are withdrawn. |
| V-8 | Extension Overview roster and sync states (Original > AI draft > Clinician edited > Approved > Synchronized) | none from Harvest | WORKING-IN-DEMO W1 | NONE | Y: 63b-ext-overview, 05-sync | Ext home; port the sync-state vocabulary. |

## Counts

130 numbered items (items 8, 97, 98 and 99 are split into sub-rows: 8A-C, 97A-C, 98A-B, 99A-B), 6 constraints, 6 "said on tape" lines, 9 demo changes, 8 v3-only capabilities.
