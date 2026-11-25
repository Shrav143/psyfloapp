# PRD 03 — Prior Authorization Lifecycle (Request → Decision → Ledger → Renewal)

**Owner:** Product (Shravan) · **Design:** Rohit · **Status:** v1 for Monday demo review · **Reads with:** `_brief.md`, PRD 02 (Eligibility), PRD 04 (Denials), PRD 05 (Appeals), PRD 06 (Payer Intelligence), PRD 07 (Agents), PRD 08 (Analytics), PRD 09 (Integrations)

---

## 1. Summary and problem statement

Psyflo's prior authorization (PA) lifecycle product is the spine of the platform. It models an authorization as what it actually is for a behavioral health day program: **a chain of immutable versions, each granting a number of units inside a date window, drawn down by attendance**. Around that object it runs the whole workflow: requirement determination, packet assembly with gap detection, clinician sign-off, submission through the payer's channel, status polling, decision capture (approved / partial / denied), the unit-and-date ledger, and renewal timing derived from whichever clock binds first.

The problem, in the design partner's words:

> "You've got a couple of systems that are good at tracking, but not one system that tracks all of them." — Tracy, 11 Sep (`tracy-call-transcripts.md`)

> "It's approved for only a certain number of units and for only a certain time period. And so you have to monitor not just this is effective from January 1st to January 31st — but if they got 15 units and they came 14 days in the first two weeks, you've gotta know that is coming up before that expiration." — Tracy, 11 Sep

> "A lot of the tools you have will overwrite the old one. So you kind of lose your historical information… recently we've started getting what I call partial approvals. We'll ask for 60 units, but they'll only give us 30, and they don't give us a reason why." — Tracy, 1 Sep

> "There's a lot of tools that are out there that will submit them for you, and that part of the process, quite honestly, is easy for us… The biggest part of the problem is knowing where each one is at in the process." — Tracy, 1 Sep

> "I hadn't actually run the unit usage report in like three weeks, and he came every day… he ended up being 40 units over." — Tracy, 11 Sep

> "Oftentimes we have patients that only got approved for 20 units, but there are 40 units in. They're still coming into the clinic. That's all lost revenue." — Sullivan-County persona, HealOS demo (`competitor-landscape.md`)

Today this lifecycle is run across Sunwave (which stores one authorization number and overwrites it on renewal), Availity and one MCO portal (submission and status), a clearinghouse button (eligibility), a five-tab spreadsheet (approvals, renewals, appeals, history), a Claude-based engine (documents, cover sheet, grading) and daily phone calls. Two full-time staff and two to three hours a day of the COO's time keep it from collapsing, and it still leaks $10–15K a month at one clinic and $80K+ a month at a larger day program.

## 2. Goals, non-goals, success metrics

### Goals

1. One board that shows every request, in every state, at both sites, across every payer, sorted so the stuck ones surface.
2. A per-patient view that shows both clocks, the projected exhaustion date, the window end, the derived file-by date and the whole history.
3. A renewal radar that turns the derived dates into a staffed weekly plan.
4. A request workflow where the agent assembles and files, and the clinician signs.
5. A ledger that never overwrites, so PRD 06 (scorecard) and PRD 08 (leakage) can be computed.

### Non-goals (v1)

- Approval prediction or scoring (see `_brief.md` principle 5 and PRD 06 §calibration).
- Writing clinical content. The Packet agent assembles what clinicians wrote; it does not author assessments.
- Claims submission, remittance posting, patient billing.
- Auto-submission of unsigned artifacts, ever.
- Replacing the EHR's forms. We pre-fill and export; the record of truth for clinical documents stays in Sunwave.

### Success metrics

| Metric | Baseline (Harbor, stated) | Pilot target (90 days) |
| --- | --- | --- |
| Visits delivered without an active authorization (units exhausted + window expired) | ~31 + 22 per 90 days (draft PRD model) | −70% |
| Renewals filed before the binding clock | unknown, "usually four or five slip a month" | ≥95% |
| Time to answer "where is request X" | minutes to hours across 3–7 systems | <10 seconds, one screen |
| Operator hours per day on PA tracking | 2–3 h | <30 min |
| Clinician hours per renewal packet | 3–4 h pre-engine; less now (ask) | measured, then −25% |
| Requests past the 7-day decision rule without a follow-up call | unknown | 0 |
| History retained across renewals | 0% (Sunwave overwrites) | 100% |

Leading indicators: sign-off queue age (hours), packet gaps caught before submission, polling coverage (open requests polled in last 24 h).

## 3. Users and jobs-to-be-done

| Persona | Jobs in this product line |
| --- | --- |
| Operator / compliance lead (Tracy) | See the whole board; know what will run out this week; know which payer is cutting units; decide policy (lead times, when to keep patients attending); answer the board; sign nothing she has not read |
| PA coordinator (Jordan) | Start requests at intake; assemble packets; get signatures; file; chase status; start renewals on time; keep the ledger true |
| Clinician (Heather) | Write assessments and treatment plans; review the packet the engine assembled; sign; do peer-to-peers; be told exactly which six documents to update for a renewal |
| Intake coordinator | Trigger the initial request the day of intake; flag guardians, dual-eligibles, plan changes |
| Offshore biller | Work a clear queue: "file this signed packet via Availity", "call this payer, day 9" |
| Owner / board | See requests, approvals, partials, leakage and clinician hours monthly |
| Payer UM reviewer (external) | Receive a packet with the criteria evidence on page one and the split the plan requires |

## 4. End-to-end workflow

### 4.1 As-is (Harbor, September 2026)

1. Referral arrives from a primary care home; CRM collects releases, signatures, records.
2. Eligibility checked via clearinghouse button (PRD 02).
3. Clinician screens for SMI fit; intake appointment; assessments recorded on Sunwave forms; clinician dictates a summary (Whisper Flow).
4. Engine (Claude) ingests forms + voice note + MCO criteria + prior denials/approvals; pre-fills Sunwave forms; writes a cover sheet; grades likelihood and flags gaps.
5. Clinician reviews and approves.
6. Biller logs into Availity (4 MCOs) or the MCO portal, re-keys member/provider/service data, exports the Sunwave form package, uploads (split into assessments vs external records vs cover sheet), gets a reference number. 24–48 h after intake.
7. Patient starts attending immediately (policy); 1–2 days written off.
8. Decision in ~5 days (KY) — approved (60 or 40 units, ~90 days, backdated to request), partial (30), or denied.
9. Tracy refreshes Availity daily to catch decisions; records them in the spreadsheet; Sunwave gets the auth number (overwriting the previous).
10. Attendance accrues in Sunwave; nobody reconciles it against units except through a manual unit-usage report and a Claude merge of two exports.
11. Renewal: when Tracy notices (end date approaching, or units low), she tells the clinician exactly which six documents to update; the packet is resubmitted in full.
12. Denials go to peer-to-peer, then written appeal (PRDs 04–05).

### 4.2 To-be (with Psyflo)

```mermaid
sequenceDiagram
  participant I as Intake coordinator
  participant P as Packet agent
  participant C as Clinician
  participant N as Navigator agent
  participant Y as Payer
  participant L as Ledger
  I->>L: Intake completed (event)
  L->>P: Trigger: initial request needed (payer × TRP rule tuple)
  P->>P: Pull assessments, plan, records from Sunwave; check recency rules; build cover sheet
  P->>C: Packet ready for review (gaps listed)
  C->>L: Signs (event: signed)
  L->>N: File signed packet
  N->>Y: Submit via Availity / portal in the payer's split; capture reference
  N->>L: Submitted (reference, screenshot, 7-day clock)
  loop daily until decided
    N->>Y: Poll status
    N->>L: Status event (pending / info requested / decided)
  end
  Y-->>N: Decision letter
  N->>L: Version decided: units granted, window, reason, criteria
  L->>L: Two clocks computed; file-by date derived; radar updated
  L->>C: Renewal packet drafted N days before binding date
```

Every step appends an event; nothing is edited in place. The clinician's signature is the only step that cannot be automated, by design.

## 5. Functional requirements

Priority: **P0** = required for the Harbor pilot; **P1** = v1 general availability; **P2** = later.

### 5.1 Authorization ledger

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-01 | Model an authorization as `Authorization → AuthorizationVersion[] → Event[]`; versions and events are append-only | P0 | Renewing creates version n+1; version n remains readable with its own units, window, decision, reason, documents; attempting to mutate a decided version is rejected and logged |
| FR-02 | Each version records units asked, units granted, window start/end, submitted at, decided at, decision (pending/approved/partial/denied), reason text and category, criteria cited, channel, reference number, signer, packet manifest | P0 | All fields visible on the patient detail; partial is a distinct decision value |
| FR-03 | Attendance (visit days) is imported daily and attributed to the version whose window contains the date; units used = attributed visits capped at units granted | P0 | Units used on the detail screen equals count of attributed visits; visits beyond granted are classified `units_exhausted` |
| FR-04 | Two clocks computed per active version: units remaining, days remaining, projected exhaustion date at the observed attendance rate (trailing 4 weeks), binding clock, binding date | P0 | For a patient at 3/week with 11 units left, exhaustion = today + ceil(11 / (3/7)) days; binding = earlier of exhaustion and window end |
| FR-05 | File-by date = binding date − lead time, where lead time = payer's observed median turnaround + configurable buffer (default 5 days); lead time is per payer, editable by the operator | P0 | Changing the buffer recomputes every file-by date; payer medians are computed from the ledger, not typed |
| FR-06 | Stranded-units signal: projected units unused at window end at current attendance; utilisation % | P1 | Shown when ≥3 units would strand; renewal wizard suggests asking for fewer or reviewing attendance |
| FR-07 | Coverage classification for any date: covered / intake lag / awaiting decision / units exhausted / window expired / denied in appeal / no auth / eligibility lapsed | P0 | Today screen and leakage report use one function; each visit has exactly one reason |
| FR-08 | Ledger import from the clinic's existing tracker (spreadsheet tabs) and Sunwave exports at onboarding, with a reconciliation report | P0 | Every imported version keeps its source row id; mismatches listed |

### 5.2 Request creation and requirement determination

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-10 | Intake completion (from EHR/CRM event or coordinator action) creates a draft initial request within the same day and starts the intake-to-submission lag clock | P0 | Draft appears on the board within 1 h of intake; lag is measured per request |
| FR-11 | Rule tuple lookup: payer × program/service × plan returns PA required?, channel, forms, required documents with recency rules, unit cap, window length, decision SLA, packet split, appeal rules (PRD 06) | P0 | Wizard step 2 shows the tuple; unknown tuple shows "unconfirmed" and a task to confirm, never a guess |
| FR-12 | Units to request default to the payer cap; wizard shows observed asked→granted for that payer over the last two quarters | P0 | Hint text cites the ledger rows |
| FR-13 | Renewal request pre-populates from the prior version and shows the clinician only the documents that must be refreshed (recency rules) | P0 | "3 of 9 documents need updating" list matches rule dates |
| FR-14 | Dual-eligible patients: request flow notes Medicare-first billing dependency and tracks the Medicare rejection cycle | P1 | Flag on detail; cycle days measured |
| FR-15 | Program/plan change (MCO switch) voids the tuple and prompts a new initial request | P1 | Eligibility event (PRD 02) creates a task |

### 5.3 Packet assembly and gap detection

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-20 | Packet agent pulls assessments, treatment plan, external records and attendance summary from the EHR (export or API) into a manifest with document date and status (attached / stale / missing) | P0 | Manifest matches the tuple's required list; stale = older than the rule's recency window |
| FR-21 | Criteria crosswalk cover sheet generated: criterion → evidence → source document, one page, first in the packet | P0 | Every row cites a document and date; no row without evidence |
| FR-22 | Gaps produce tasks to the clinician ("psychiatric evaluation older than 12 months") with a due date before the file-by date | P0 | Task appears in the sign-off queue; resolving it updates the manifest |
| FR-23 | Packet split per payer rule (single / three-part: assessments, external records, cover sheet) | P0 | Export produces N files named per payer convention |
| FR-24 | "Approval readiness" shows observed payer facts (first-pass approval, partial rate, median days) and the gap count; it never shows a probability | P0 | Copy reads "Observed, not predicted" |
| FR-25 | Clinic strategy rules (PRD 06) surface as suggestions with rationale, never applied silently | P1 | Suggestion shows rule id and requires clinician acceptance |

### 5.4 Sign-off gate

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-30 | No request, renewal or appeal can be submitted without a clinician signature event with signer identity, timestamp and packet hash | P0 | Submission API rejects unsigned packets; audit shows signer |
| FR-31 | Sign-off queue lists everything waiting for signature with age, payer, file-by date and documents to review | P0 | Queue reachable from every screen (top bar badge); sorted by file-by |
| FR-32 | Clinician can send back to coordinator with a note; the packet stays a draft | P0 | Event `sent_back` recorded |
| FR-33 | Signature changes after signing require re-signature (packet hash mismatch) | P1 | Editing a document after signature returns the request to awaiting sign-off |

### 5.5 Submission and status

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-40 | Navigator agent files signed packets via Availity or the payer portal, keys member/provider/service fields from the ledger, uploads in the required split, captures reference number and screenshot | P0 (pilot: coordinator files with the agent's checklist; agent files in phase 2) | Reference and screenshot on the version; failure creates a manual task |
| FR-41 | Status polling daily for every open request; decision letters captured; info requests create tasks | P0 | Every open request has a poll event in the last 24 h |
| FR-42 | Decision clocks: 7-day standard (CMS-0057-F), 72-hour expedited, Kentucky 5-day; requests past the rule are flagged red with a "call the payer" task | P0 | Board aging dot: grey within payer median, amber past median, red past rule |
| FR-43 | Decision capture: approved / partial / denied with units granted, window, reason, criteria; partial and denied route to PRD 04 | P0 | Partial creates a "accept or appeal shortfall" task |
| FR-44 | Backdating recorded: decision effective date vs request date; visits between intake and effective date classified intake lag | P0 | Leakage report reflects it |
| FR-45 | Write-back to EHR: reference number, units, window (append, never overwrite our ledger; EHR field may be overwritten by the EHR's design) | P1 | Sunwave shows the current reference; our ledger keeps all |

### 5.6 Board, detail, radar (screens in §6)

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| FR-50 | Board with lifecycle counts and dollar values, list view, filters (payer, site, status, owner), saved view "Needs me today", default sort days-in-state desc | P0 | Counts sum to the total; partial is its own bucket |
| FR-51 | Patient detail with two clocks, projection sentence, attendance-vs-allocation chart, full history, side panel (payer/plan/service/dual/guardian/documents), actions (start renewal, request P2P, open appeal, ask) | P0 | Sentence states which clock binds and the file-by date |
| FR-52 | Renewal radar with lanes overdue / this week / next 30 days, clinician-hours estimate, gap-day counter, per-payer lead times, week plan by signer | P0 | Lane membership recomputes when the buffer changes |
| FR-53 | Every screen reachable in one click from every other; a request opens from any reference to it | P0 | Nav test |

## 6. Screens and UX

Demo reference: `/demo/authorizations`, `/demo/authorizations/[id]`, `/demo/authorizations/new`, `/demo/renewals`, and the coverage hero on `/demo/today`.

### 6.1 Authorization board (`/demo/authorizations`)

- **Purpose:** replace the five-tab spreadsheet. Every request, every status, both sites, all payers.
- **Layout:** lifecycle strip of clickable status tiles with count and dollars asked (Draft, Awaiting sign-off, Submitted, Decision pending, Info requested, Partial, Peer-to-peer, Written appeal, Active, Renewal due, Units exhausted); filter row (Needs me today, payer chips, site toggle in the top bar); dense table.
- **Columns:** MRN (+ initials, site, dual flag) · payer · service · status · days in state with aging dot · units asked → granted (granted in amber when short) · units used bar · window · next action (with file-by) · owner.
- **Interactions:** tile click filters; row click opens detail; "New request" opens the wizard; the top-bar sign-off badge deep-links to the "Needs me" view.
- **Borrowed:** HealOS/Arrow status buckets with counts and dollars; CombineHealth "Action Required" plain-language next-action column.
- **States:** empty filter state; a red dot with "past 7-day rule" label; a "Queued" pill for renewals started from elsewhere in the session.

### 6.2 Patient authorization detail (`/demo/authorizations/[id]`)

- **Purpose:** the two clocks, drawn; the history that survives renewal.
- **Layout:** header (MRN, initials, status, payer, dual flag; actions: Ask, Request P2P / Open appeal, Start renewal); left column: Two clocks panel (two gauges, projection sentence, stranded-units note), Attendance-against-allocation chart (approved ceiling as reference line, attended line, projected dotted line, planned line, today marker), History panel (version strip with colour by decision, then reverse-chronological events with actor pills); right column: Payer and service (KV incl. channel, appeal rules, unit cap, criteria set with "unconfirmed — ask", packet split, dual, guardian, primary care home; policy-change warning), Current version documents with export, "What Sunwave shows" contrast box.
- **The emotional beat:** on the four-renewals patient a rose banner reads "Sunwave shows only the rightmost box… this payer has cut the request every single time."
- **Borrowed:** the version strip from the draft PRD; CombineHealth's timeline cards; nothing from vendors for the two clocks (no competitor draws both).

### 6.3 New / renewal request wizard (`/demo/authorizations/new`)

Five steps with a sticky summary: Patient & service → Payer requirements (rule tuple, document checklist with stale/missing, policy-change banner, units with observed hint) → Packet & cover sheet (crosswalk table, "Observed, not predicted" readiness, gaps) → Clinician sign-off (checkbox + signer + Sign; send-back) → Submit & track (agent run: verify signature, open portal via vault, select form, fill fields, upload split, capture reference, schedule polling; result card with reference, 7-day clock, polling, write-back). The Sign button is the only path to step 5.

### 6.4 Renewal radar (`/demo/renewals`)

Three lanes (Overdue / This week / Next 30 days), cards with binding statement, file-by, units and days bars, clinician time, gap-day dollars for overdue; lead-time table per payer with a buffer control; "Open question for Tracy" (backdating) toggle; week plan grouped by signer.

### 6.5 Today coverage hero (`/demo/today`)

"45 of 60 patients today are covered by an active authorization" with clickable cause chips (count, dollars) and the owner of each cause (payer clock / our timing / payer behaviour / process gap), the 30-day unbillable sparkline, the "Needs me today" queue and the agent feed. Detailed in PRD 08.

## 7. Agent behaviours and guardrails (this product line)

| Agent | Does | Never |
| --- | --- | --- |
| Packet | Pulls documents, checks recency rules, builds the crosswalk, lists gaps, drafts the renewal manifest | Writes clinical content; hides a gap; submits |
| Navigator | Files signed packets, captures references and screenshots, polls status daily, records decisions, writes references back | Files unsigned packets; edits a decided version; retries a rejected submission without a task |
| Sentinel (PRD 06) | Updates rule tuples when a policy changes and re-checks open packets | Changes a rule without acknowledgment |
| Analyst (PRD 08) | Answers "which renewals are due" from the ledger | Predicts approval |

Guardrails: signature gate (FR-30), packet hash (FR-33), evidence screenshot on every submission, manual fallback queue when a portal changes, PHI minimisation (MRN/initials on shared screens), full audit trail with actor.

## 8. Data model and integration touchpoints

Entities (canonical model in PRD 09): `Patient`, `Payer`, `PlanProgramRule` (PRD 06), `Authorization`, `AuthorizationVersion`, `Event`, `PacketDocument`, `Visit`, `Task`, `AgentRun`. Derived, never stored as truth: `Clocks` (unitsUsed, unitsRemaining, daysElapsed, daysRemaining, exhaustionDate, binding, bindingDate, fileBy, strandedUnits, utilization).

Integration touchpoints: EHR (Sunwave form export and attendance/charges reports; API where available; agentic write-back of reference numbers), Availity (portal automation; APIs where licensed), MCO portals (agentic), eligibility (PRD 02), fax/phone (PRDs 05, 07). See PRD 09 for tiers and field mappings.

## 9. Payer and regulatory rules encoded

- CMS-0057-F: 7-calendar-day standard and 72-hour expedited decision windows for Medicaid managed care from January 2026; specific denial reasons; payer PA metrics published annually; FHIR PA API by 2027 (future channel).
- Kentucky: PA required for community behavioral health services since July 2025; 5-day decision requirement as described by Tracy; decisions backdated to request date; MCO-specific forms in Availity (4 of 5) and one MCO portal.
- Unit caps and windows are payer-specific (40 or 60; ~90 days) and change without notice; encoded as versioned rule tuples (PRD 06).
- Dual-eligibles: Medicare must adjudicate (deny) before Medicaid pays; timely filing clocks run.
- MHPAEA: PA on MH services cannot be applied more stringently than on medical/surgical; a lever for provider-relations conversations when observed rates diverge from published ones.

## 10. Edge cases and failure modes

| Case | Handling |
| --- | --- |
| Patient attends before the request is filed | Visits classified intake lag; lag measured; intake trigger enforces same-day drafts |
| Decision arrives with fewer units than asked (partial) | Own state; task to accept or appeal shortfall; ledger keeps asked vs granted; scorecard counts it |
| Denial then P2P win with different units | P2P outcome is a new version; window and units from the outcome letter |
| Appeal win backdated | New version with effective date; prior visits reclassified from denied-in-appeal to covered; leakage report recomputes |
| Attendance data late or corrected | Clocks recompute; corrections append events; a projection uses trailing 4-week rate, not plan |
| Two sites, one patient moves | Site on the visit, not the authorization |
| MRN typo corrected | Correction event; original value retained in history |
| Payer portal changes layout | Navigator fails safe, screenshots, creates a manual task; no partial submissions |
| Plan changes mid-window (MCO switch) | Version closed with reason; new initial request drafted; eligibility event links both |
| Renewal filed late, window already closed | Visits classified window expired; recoverability follows the payer's backdating rule (unknown → flagged) |
| Unit cap lowered by policy change mid-window | Existing version unaffected; next renewal uses the new cap; Sentinel flags affected renewals |

## 11. KPIs and analytics emitted

Requests by state and age; first-pass approval, partial rate, asked→granted, turnaround (median, p90, by weekday) per payer per quarter; sign-off queue age; packet gaps caught pre-submission; intake-to-submission lag; renewals filed before binding date; visits by coverage cause; stranded units; clinician hours per packet (entered and modelled); polling coverage; submission failure rate. All feed PRD 08.

## 12. Rollout and phasing

- **Phase 0 (demo, Monday):** seeded dataset, all screens clickable, agent runs simulated.
- **Phase 1 (Harbor pilot, weeks 1–5):** import the five-tab tracker and Sunwave exports; ledger, board, detail, radar, sign-off queue live on real data; coordinator files in Availity using the agent's checklist; polling by agent (read-only); daily attendance import.
- **Phase 2 (weeks 6–10):** Navigator files signed packets; write-back; renewal wizard; policy watch (PRD 06); appeals workspace (PRD 05).
- **Phase 3:** second design partner (group practice with Valant); rule tuples for PSR/CORE, ACT, HCBS, CFTSS; FHIR PA API when payers expose it.

## 13. Open questions and research asks

1. Are renewals backdated like initial requests? (Changes gap-day recoverability and the radar's value.)
2. Her five spreadsheet tabs and columns — the seed of our data model.
3. What do the two PA FTEs do hour by hour? (Where the agent should start.)
4. Contracted per-diem rates by MCO (we model $244.29).
5. Which MCOs allow portal submission of the full packet vs fax; which require the three-part split.
6. Attendance recording: is a visit day in Sunwave reliable enough to draw down units daily?
7. Does her engine's approval grade predict outcomes? Ask for predicted vs actual for 90 days.
8. Is 45 of 60 typical? What is her cause split?

## 14. Evidence appendix

- `../research/tracy-call-transcripts.md` — Sep 1 and Sep 11 calls (all Tracy quotes above).
- `../research/competitor-landscape.md` — HealOS unit flag at booking, LunaBill's unanswered unit-tracking ask, Flexbone/QuickIntell/VGPM ledgers, CombineHealth flows.
- `../research/00-research-synthesis.md` — process map and leakage causes.
- Draft demo PRD (Claude Docs artifact "PsyFlo Auth Cockpit — Demo PRD (Harbor / Tracy)") — two clocks, screens 1–4, seeded stories.
- CMS-0057-F (Interoperability and Prior Authorization Final Rule), Kentucky Medicaid MCO provider manuals (to be attached by PRD 06).
