# Oprox parity (R7): every feature in the Oprox screenshots, in Authorizations and Denial Intelligence only

Source of truth for the feature list: `docs/OPROX-DIGEST.md` (all 43 screenshots, frame by frame). Read it. This file maps each Oprox feature to where it
lives in Psyflo, what data powers it, and who builds it.

The user's words: "I need to add all those features in the authorizations and denials tabs only." Earlier: "Don't copy the UI as it is ... change it and add your own
twist ... the UI is a lot simpler than what Psyflo has ... add pop-ups and side navigations wherever you can ... don't add any new tabs ... make sure the same
information is translated to the browser extension." R6 already built the recommendation mechanic (`docs/RECS-SPEC.md`). This round adds everything else.

## Hard rules (every owner)

1. **Authorizations and Denial Intelligence only** (plus the extension panel for Owner C). No new tabs, routes or nav items. Do not touch the Dashboard, Analytics,
   Referrals, Settings, Login. Detail goes in `ui.drawer` (side) or `ui.modal`; inside a drawer you may use tabs or sections. Never a new page.
2. **Simple first.** The page itself shows only the few things a person needs on first sight; every other view is one button away. Do not add stacked cards to a
   page. If you add something, remove or move something so the page is not longer.
3. **Psyflo never writes clinical text.** Every sentence about a client is built from stored records through the existing sentence builders
   (`sentenceDim`, `sentenceLevel`, `sentencePrior`, `sentenceCurrent`, `sentenceRisk`, `evidenceIndex`, `weakPoints`) or typed by the clinician. A claim with no record
   says what is missing ("No dated record on file for D4. Add one before replying.") and asks for the clinician's words. No invented scores, medications, diagnoses.
4. **Sample numbers are labelled.** Anything from `state.intel_sample` or `state.rec_outcomes` (payer rates, comparable cases, appeal analogues, modeled
   likelihoods, model confidence, expected approval, "applied N times", success %) shows `ui.sampleChip()` (Simulated) and the basis sentence (`INTEL_BASIS`) on the
   screen that shows it. Dollars at risk show their basis on hover (`atRisk().basis`). A computed fact (days left, a rating, a count of records) is computed.
4b. **Decision support, not clinical guidance.** Clinical views carry `ui.decisionSupport()` ("Decision support for authorization documentation and workflow only. Not clinical guidance.").
5. **Roles.** Clinicians see everything. Supervisors and administrators see the non-clinical parts only: urgency, due-in chips, dollars at risk, the payer pulse, facility
   insights. They never receive or see clinical text (trajectory, findings, historical-outcome narrative, parsed rationale, suggestions). The projected state already hides
   `rec_decisions` from them; do not add clinical data to anything they can read. Show one quiet line where a clinical block would be ("Clinical views are for the treating clinician").
6. **Final wording.** New text must not contain: school, student, TDT, therapeutic day treatment, H2016, guardian, behaviour, classroom, teacher. Use client, consumer
   (in Lauris), IOP (H0015), ASAM, substance use, family member, treatment program. Sentence case, no em dashes in new copy, plain words, short. (Old screens hold legacy
   words; a wording pass rewrites them after the build. Do not rely on it for anything you write.)
7. **Accessible and responsive.** Labels on every control, focus returns to the opener when a drawer closes, no horizontal scroll at 390 px, touch targets >= 44 px at phone
   widths, no colour-only meaning, charts have a text table (`ui.trendChart` does), streaming steps are an `aria-live` list and show instantly when the person prefers reduced motion.
8. **Hosted build.** Everything runs in the browser through the virtual network: no Node-only APIs in shared code, no new network calls, no `eval`. Actions are
   `server/psyflo/actions/x-*.js` (auto-discovered, also bundled for hosted). New state keys come from `seed/extra/*.json`.
9. **Tests.** Own the Playwright suite named below; fix the pins your changes break in existing suites (`test/authorizations.mjs`, `denials-ui.mjs`, `fmt.mjs`, `panels.mjs`,
   `hosted.mjs`, `a11y.mjs`, `s*.mjs`, ... run `node test/run-all.mjs --list`). Run with your OWN ports AND data root, one worker:
   `node test/run-all.mjs --only <names> --ports <base> --workers 1 --out <scratch dir> --data-root <scratch dir>` (a shared data root collides with the other owners).
10. **Files.** Edit only the files you own. Shared files (`web/js/shared/intel.js`, `web/js/ui/intel.js`, `web/js/ui/recs.js`, `web/js/shared/recs.js`, `x-recs.js`,
    `x-intel.js`, `components.css`, `permissions.js`, `maturity.js`) only with small additive `Edit`s after re-reading, each listed in your report. Screen CSS goes in the
    controller's `get css()`.
11. **Commit** on your worktree branch with `tag: Short summary` and the co-author trailer you are given. Do not push; the lead merges. **First step in a worktree:** it
    may start from an old commit with no `demos/`: run `git merge --ff-only claude/psyflo-prior-auth-demo-kntgsa` (nothing is lost).

## Foundation already built (use it, do not rebuild it)

| What | Where |
|---|---|
| `rateUsd`, `usd`, `atRisk(s, r)` -> `{units, dollars, label, kind, basis, why}` | `web/js/shared/intel.js` |
| `urgency(s, r)` -> `{hours, label, sev, date}`; `bands(items)` -> `{byId, groups}` ("Highest financial risk · act now", "Due within 24 hours", "Due this week", "Later") | same |
| `packetLine(recs)`, `liftLine(recs)`, `expectedAll(s, recs)`, `modelConfidence(recs)`, `comparableCount(s, r)` | same |
| `payerPulse(s)`, `payerPattern(s, payerId)`, `historicalCards(s)`, `insights(s, scope)`, `overridePatterns(s)` | same |
| `INTEL_BASIS`, `DECISION_SUPPORT`, `BAND_LABEL` | same |
| Sample data: `state.intel_sample` (rate, pulse, KPI, approval by payer, comparable counts, denial reasons by payer, historical cards, appeal analogues, override baseline) | `seed/extra/intel.json` |
| `ui.stepsHTML`, `ui.runSteps(host, steps, {interval}) -> {done, cancel}` (the streaming checklist), `ui.trendChart({labels, series, min, max})`, `ui.sevTag('critical'|'strong')`, `ui.statusPill('documented'|'needs'|'approved'|'denied', text)`, `ui.kpiTile`, `ui.barRow`, `ui.moneyChip(risk)`, `ui.dueChip(urgency)`, `ui.needsInputBadge(n)`, `ui.decisionSupport()`, `ui.sampleChip()`, `ui.basisLine()`, `ui.insightsDrawer({s, scope})` | `web/js/ui/intel.js` (CSS `.in-*`) |
| Footer actions on the suggestions drawer: `ui.recDrawer({..., footer:{submit:{label,disabled,reason}, refine:true, context:true, dismissAll:true}, onSubmit})` adds **Submit to payer**, **Refine suggestions**, **Add clinical context**, **Dismiss suggestions**, a live "Apply selected (n)" count; each logs through `intel.event` | `web/js/ui/recs.js` |
| `intel.event {kind, scope, ref}` audit entry (refine, context, dismissAll, submit, analyze, intake, insights); clinician only | `server/psyflo/actions/x-intel.js` |
| The suggestion engine, cards, drawer, decisions | `web/js/shared/recs.js`, `web/js/ui/recs.js`, `x-recs.js` |

## Feature map

IDs are for the reports and the tests. "All roles" means the non-clinical form; everything else is clinician only.

### Authorizations (Owner A) — list

| ID | Oprox feature (digest section) | In Psyflo |
|---|---|---|
| A-01 | Queue grouped by urgency: "Highest Financial Risk - Immediate Action Required", "Due Within 24 Hours" with counts (2.1) | The queue groups rows under `bands()` headings with counts (band rows inside the table, `role=rowgroup` or `th scope=colgroup`). A "Group by urgency" switch (default on; off = the flat list as today; URL key `grp=0`). Works with the filters and the pager (the pager counts rows, not headings). All roles. |
| A-02 | Case card signals: due-in chip, "$ at risk" chip, "Needs Input" badge, narrative status line, "Historically improves approval by +N%" (2.1) | In the Next-action cell: `ui.dueChip(urgency)` and `ui.moneyChip(atRisk)` (all roles). Under the Suggestions chip (clinician): `packetLine` text with `ui.needsInputBadge`, and `liftLine` (sample). Keep the row compact: no new columns. |
| A-03 | Filters: All Payers / All Statuses / All Urgency (1.2); "2 recertifications due" header (2.11); status vocabulary (4) | Add an **Urgency** select to the Filters drawer (All, Overdue, Due within 24 hours, Due this week; URL key `urg`). A quiet red line above the table: "2 recertifications due" (count of requests where `renewal(s, r).due`), clickable to filter. All roles. |
| A-04 | "PAYER INTELLIGENCE UPDATE" banner with a NEW tag, lift 67% -> 83%, exposure (2.1) | One dismissible line above the table from `payerPulse(s)`: "New · Sentara partial approvals for IOP rose 31% this week · 4 cases flagged at unit 48 · Suggestion lift 67% -> 83% · about $28,000 at risk" + Simulated chip + **See why** (opens the Payer insights drawer: `payerPattern` + `ui.insightsHTML`). Dismiss remembered in `sessionStorage` (try/catch). All roles. |
| A-05 | Insights page: KPIs, approval by payer, denial reasons by payer, most impactful actions, override patterns (2.14) | **Insights** button in the page header opens `ui.insightsDrawer({scope:'auth'})`. All roles (no client data). Log `intel.event insights` for clinicians. |
| A-06 | Live Cases: intake form, HIPAA-safe note, authorization status panel, de-identified preview, streaming analysis, results tabs (2.6 to 2.10) | **Analyze a case** button in the header (clinician) opens a drawer wizard: case reference (no names; hint), source = a stored consumer (select; default) or pasted notes (+ file name only, nothing leaves the browser), payer, plan type, member ID and group number (note: "removed before analysis"; never stored or echoed), level of care, payer context. **Authorization status** panel (units approved, used, remaining, expiry, action required) computed from the stored authorization when a consumer is chosen, or read from pasted text by simple patterns (units, used, days) with "Psyflo read: ..." for the person to confirm. **De-identified preview** (initials only). **Run analysis** streams `ui.runSteps` (identify payer and plan; look up the payer's published criteria; compare the record with the level-of-care criteria; find documentation gaps; build the request from stored records; build the denial-prevention list). Results in the same drawer with three tabs: Clinical trajectory, Payer criteria, Denial-prevention actions (the same views as the case page; the actions tab is the suggestions list plus an "Urgent: units run out in N days" card computed from the units and clock). Pasted notes are only scanned for numbers; no clinical claim is drawn from free text. Log `intel.event analyze`. Chip: `intel.analysis`. |

### Authorizations (Owner A) — case page

| ID | Oprox feature | In Psyflo |
|---|---|---|
| A-10 | Header metrics "EXPECTED APPROVAL W/ OPROX NARRATIVE 66% -> 95%", "MODEL CONFIDENCE 0.91 Validated on similar cases", caption "auto-prioritized based on revenue risk and expiration timing", "COMPARABLE CASES 720" (2.2) | One compact strip in the page header: Expected approval `62% -> 87%` (`expectedAll`), Model confidence `0.91 · Validated on similar cases`, Comparable cases `142`, plus `$ at risk` and due-in (all roles see the last two). Sample chip + basis. Caption when the case is the highest-risk band: "Psyflo ranked this case first because of the dollars at risk and the clock." |
| A-11 | Disclaimer strip (2.2) | `ui.decisionSupport()` at the top of the clinical block (clinician). |
| A-12 | Four tabs: System-Identified Actions, Clinical Trajectory, Payer Criteria, Risk Analysis (1.2, 2.2 to 2.5) | In the existing Suggested-by-Psyflo card, four buttons: **Suggested actions** (the drawer), **Clinical trajectory**, **Payer criteria**, **Historical outcomes**. Each opens a drawer/modal (no tabs on the page). |
| A-13 | Clinical Trajectory: summary key-values, Symptom & Functional Trend chart with current callouts, Key Drivers, Engagement & Behavioral Signals (engagement score), Risk Signals Remaining (2.3) | Drawer. **Summary**: Diagnosis (client record), Payer, Level of care, Status, Trajectory, Auth readiness; each a computed phrase ("Ratings fit ASAM Level 2.1", "D5 3 -> 2 since Oct 9", "Continued stay supported · 1 input needed"). **Trend**: `ui.trendChart` of the stored ASAM ratings by assessment date (the dimensions rated 2 or more, plus the highest rating) and any stored screening scores (PHQ-9, GAD-7, DAST-10, AUDIT-C where `assessment_history` or notes hold them), x = assessment dates, "Current" callouts. **Key drivers identified**: dimensions rated 2 or more with their stored note and date. **Engagement signals**: attendance counts and engagement % from stored evidence/notes when they exist. **Risk signals remaining**: dimensions rated 3 or more, an incident after the last assessment, reassessment due or overdue, units low, no lower level of care tried. Every line carries evidence chips. Selectors: `trajectoryOf(s, r)` in `web/js/shared/sel/auth-intel.js`. |
| A-14 | Payer Criteria: source chips, "N item needs strengthening", tiles (chart-to-criteria match 3/4, historical approval rate, submission method), requirement rows with status pill + evidence note, "To maximize approval probability" with "why this matters for {payer}" and "what to include" (2.4) | Extend the existing criteria modal (`criteriaOf` in `AuthRecs.js`, move the pure part into `sel/auth-intel.js` as `criteriaView(s, r)`): source chips (Published medical policies, Adjudication history, Denial signal patterns, Virginia-specific rules), status line, tiles (**Chart-to-criteria match** 7/8 · 88% aligned before any action; **Historical approval rate** for this payer and level (sample); **Level-of-care tool** ASAM Criteria), rows (kept), then **To maximize approval probability**: "Why this matters for {payer}" (the payer's stored `tends_to_ask` and its top stored denial reasons) and "What to include in your submission" (the open/included suggestion titles with "See suggestion"). Skip the "without/with Oprox" sales panels. |
| A-15 | Risk Analysis / Historical Outcomes: comparable case matching chips, Primary Historical Decision Driver (red) with observed pattern, Supporting Clinical Signals in Approved Cases (green), Comparable Historical Outcomes (3 cards, modeled likelihood), interpretation + current alignment (2.5) | Drawer. **Matching chips** from the record (Diagnosis category, ASAM level, Dimensions rated, Co-occurring condition, Documentation signals). **Primary historical decision driver** (red): the payer's top stored denial reason, with an observed-pattern sentence marked sample. **Supporting signals in approved cases** (green check rows): the record's strengths computed true/false (every dimension rated and dated, assessment current, lower level of care documented, reason for the level stated). **Comparable outcomes**: `historicalCards(s)` (approved, approved, denied) with modeled likelihood. **Interpretation + current alignment** computed from the criteria status (all documented -> "Approval-favorable"; gaps -> "Approval-favorable with documentation completion"; many gaps -> "Documentation gaps to close first"). Sample chip + basis. Selectors: `historicalView(s, r)`. |
| A-16 | Footer action bar: counter, Apply Selected (n), Submit to Payer, Refine Recommendations, Add Clinical Context, Dismiss Recommendations, helper "All decisions are logged"; Needs Input badge and "Submit modification" on a card (2.2) | The suggestions drawer passes `footer={submit, refine:true, context:true, dismissAll:true}` and `onSubmit` (opens the Submission drawer / send step; disabled with a reason until the packet is ready: `submit.disabled`, `submit.reason`). Already built in the shared component; wire it, and label a needs-input card's save button "Save my words". |
| A-17 | "$ at risk", revenue (2.1, 2.12) | `ui.moneyChip` on the page header and rows (A-02, A-10). |

### Denial Intelligence (Owner B)

| ID | Oprox feature | In Psyflo |
|---|---|---|
| D-01 | Queue signals and grouping (2.1, 2.11) | Same as A-01 to A-03 on the queue: urgency groups with a "Group by urgency" switch, `ui.dueChip`, `ui.moneyChip`, `ui.needsInputBadge`, an Urgency filter in the Filters drawer (URL key `urg`). All roles for money and due; needs-input and lift clinician only. |
| D-02 | Payer intelligence banner (2.1) | The same dismissible pulse line above the queue (`payerPulse`), **See why** opens a drawer with `payerPattern` for the payer on the line and the denial insights. Same look as A-04: Owner A and Owner B each render it from the same `ui.*` parts and the same copy; keep the markup identical so the two screens match. |
| D-03 | Insights: common denial reasons by payer, most impactful actions, override patterns (2.14) | **Insights** button in the header opens `ui.insightsDrawer({scope:'denial'})` (reasons first). All roles. |
| D-04 | Denial Analysis intake: step 1 upload denial letter and/or clinical documentation ("either file is enough"), step 2 additional context, "Sanitized clinical record", "Reading and digesting the record" log, "Cross-referencing historical appeals data" log with analogous cases and reversal rate (2.12) | **Analyze a denial** button in the header (clinician) opens a drawer wizard. Step 1: two tiles, "Denial letter" and "Clinical documentation": choose a stored document of that kind (from `state.documents`) or a local file (only the file name is kept; nothing leaves the browser); either is enough; **Continue** disabled until one is chosen; "Which consumer is this for?" (open denial cases). Step 2: "Add any additional context (optional)". Then **Sanitized clinical record** (initials only, member ID removed, with the parsed fields D-06) and two streams with `ui.runSteps`: *Reading and digesting the record* (parse the record structure; read the denial reason and the treatment timeline; scan group and individual notes; flag differences between reported use and the clinician's rating; cross-reference the ASAM dimensions; scan the medication record if one is stored; validate diagnoses against ICD-10; map the ratings against the payer's level criteria) and *Cross-referencing historical appeals* (lines from `payerPattern`: "Found 312 analogous cases · 78% reversed on first-level appeal (sample)"; "Strongest leverage: ..."). Then it opens the analysis (D-05) for that case. Log `intel.event intake`. Chip `intel.analysis`. |
| D-05 | Appeal analysis document: Denial rationale, Core clinical synthesis, "Why this denial is contestable" findings with CRITICAL/STRONG tags, "All six ASAM dimensions support continued stay", "What Oprox would do" numbered actions (2.13) | The existing **Analyze Denial** drawer becomes this document. **Denial rationale** (the payer's stated reason, quoted from the stored notice). **Core clinical synthesis**: sentences from `sentenceLevel`/`sentenceRatings`/`sentencePrior`/`sentenceCurrent`. **Why this denial is contestable**: one finding per weak point from `weakPoints`, each with `ui.sevTag` (critical = the stored record contradicts the payer's reason on two or more dimensions, or a reassessment or incident gap; strong = one dimension or one missing record), a title and one paragraph of stored facts with evidence chips. **All six ASAM dimensions**: six rows, `sentenceDim` per dimension with its rating, or "No dated record on file for D4. Add one before replying." **What Psyflo would do**: the numbered denial suggestions (`denialRecsFor`), each with "Review". Selectors: `appealAnalysis(s, d, r)` in `web/js/shared/sel/denial-intel.js`. Decision-support strip on top. |
| D-06 | Parsed denial fields: FROM, RE, SERVICE, REQUESTED, APPROVED, REVENUE AT RISK, DECISION, RATIONALE (2.12) | A compact **Decision details** strip at the top of the Overview and in the Sanitized record panel: Payer, Service (IOP · H0015), Requested, Approved or offered, Revenue at risk (`atRisk`), Decision (the payer's decision, from the stored stage), Rationale (stored reason, clinician only). Selector `denialFields(s, d, r)`. |
| D-07 | Historical appeals data: analogous cases, reversal %, P2P overturn %, strategies with success rates (2.12 log lines) | **Payer pattern** section in the analysis (and the See-why drawer): what the payer tends to do and what has worked (stored `tends_to_ask`, `what_works`, `partial_rate`), then the sample: analogous cases, % reversed on first-level appeal, peer-to-peer overturn %, and the strategies ranked with `ui.barRow` success bars. Sample chip + basis. |
| D-08 | Footer actions (2.10, 2.2) | The denial suggestions drawer passes the same `footer` (Submit = "Open the send step", disabled with a reason until a draft is ready; Refine; Add clinical context; Dismiss suggestions) and `onSubmit`. |
| D-09 | Revenue at risk (2.12, 2.1) | `ui.moneyChip` on the case header, the Overview and the queue rows. |

### Extension panel (Owner C) — after A and B have committed their selectors

The panel is 400 px wide: compact versions, same selectors, same wording. No new views; add to the authorization path view and the Denial packet view.

| ID | In the panel |
|---|---|
| X-01 | Authorization path: a header strip (expected approval, model confidence, $ at risk, due-in, Simulated chip, decision-support line); a **Payer criteria** accordion (status line, rows with pills and evidence, "What to include" with the suggestion titles); a **Clinical trajectory** accordion (summary lines, a small trend chart, key drivers, risk signals); a compact **historical outcomes** line (alignment + the three modeled likelihoods, sample). Footer parity on the suggestions block: Apply selected (n) types into Lauris, Refine, Add clinical context, Dismiss suggestions (each logged with `intel.event`). |
| X-02 | Denial packet: the parsed fields strip (payer, service, requested vs approved, revenue at risk, decision), findings with CRITICAL/STRONG tags, the six dimension lines (collapsed), the payer pattern (strongest leverage with success %), then the numbered suggestions with footer parity. |
| X-03 | Panel home: the case tile shows due-in and $ at risk. |

## Tests

| Owner | Suite file | Ports |
|---|---|---|
| Lead (done) | `test/intel.mjs` | 6100 |
| A | `test/intel-auth-ui.mjs` (+ `test/intel-auth.mjs` for the selectors) | 6300 |
| B | `test/intel-denial-ui.mjs` (+ `test/intel-denial.mjs` for the selectors) | 6400 |
| C | `test/intel-panel.mjs` | 6500 |

Every suite proves, for its features: the feature renders from stored data (no invented text), the sample numbers carry the Simulated chip and basis, the role gating (a
supervisor and an administrator see money, due and insights but none of the clinical views), keyboard and focus return, 390 px with no horizontal scroll, zero page errors.
Selectors are pure and get their own tests with exact values for the seeded cases (R-0402, R-0384, R-0408, R-0388, R-0391, R-0411, R-0395).

## Integration (lead)

Merge the branches, run the whole suite, rebuild the hosted file, run the wording passes, walk every role, republish the artifact, push.
