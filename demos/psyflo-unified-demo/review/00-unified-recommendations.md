# 00 · Unified recommendations (lead synthesis)

Nov 11, 2026. Reconciles the six reviews (`01` clinical workflow, `02` strategy, `03` UX, `04` architecture, `05` safety, `06` demo and QA) and the three evidence digests (`evidence/`). Every conflict is listed with both sides, the resolution taken, why, and whether Harvest still has to validate it. Nothing below was settled by picking whichever answer was easier to build; where the build does choose, the choice is a configurable setting with a visible source or verification label.

**Evidence quality, read this first.**
- **Plaud:** the connector returned no recordings in this session. The Plaud digest is built from the project's own synthesis documents (`docs/product-direction.md`, the Oct 29 workflow map) and every item is secondary. We did not review any original Plaud audio or transcript.
- **Granola:** read directly. Harvest speaks for itself in one meeting only (Nov 2). Everything else about Harvest is PsyFlo's own retelling (G digest, finding 1).
- **Claude team workspace** (projects, conversation history): not reachable. Drive, Slack, Gmail, Tally and Attio were read instead (`evidence/team-workspace.md`).
- **Official sources:** the DMAS Chapter IV text, 12VAC30-80-30 and the SRA forms (Drive copies) were read; Appendix C/H, 12VAC30-60-61 and MCO manuals were not available. Seventeen claims in the Nov 8 docs have no official support (`evidence/team-workspace.md` U-1 to U-17).

## 1. Findings supported by direct customer evidence

| # | Finding | Evidence |
|---|---|---|
| 1 | The pilot's first success measure is notes completed in compliance and time spent on notes, not approval rate. | G-049 and the Nov 8 NEXT-STEPS pilot KPIs |
| 2 | Documentation takes too long and staff lose rapport when typing during screening. | P-029, P-087, P-092 (secondary), T-034 |
| 3 | Continued-stay evidence review is where Harvest reacted most strongly. | P-113, P-114 (secondary) |
| 4 | Site supervisors (QMHPs) do most screenings, send packets, watch the fax inbox and track units; clinicians approve and sign. | T-005, T-039/P-039, T-044, P-059 |
| 5 | Only licensed clinical staff would use the platform; direct support lives in Lauris and the extension. | G-030 |
| 6 | The chain behind an SRA has roles the Nov 8 demo skips: an LPC writes it, one person approves every outgoing SRA, an LMHP-type attests, a site supervisor sends. | `01` §1, §2 |
| 7 | Harvest asked for analytics and licensure views on Nov 2; PsyFlo later marked analytics "not a priority" on its own. | G-087, G-088 |
| 8 | Scan & Enhance of already-processed notes was removed on Nov 7 over Medicaid audit risk; it had been added on Nov 1. | G-093, G-031 |

## 2. Findings derived from project documentation

- **Seed lineage:** all 11 v3 cases exist in the master with the same request ids; join keys differ (`04` §C1). Master ids are canonical.
- **Hard-coded rules shown as fact:** 60-minute unit floor (official bands start at 120 minutes), 7-day and 24-hour clocks, a day-5 receipt call for one payer (Harvest says about day 10), remote guardian signing with no in-person caveat, "only a guardian can appeal" (`05` §7, `05c`).
- **Mislabelled data:** seeded analytics and staff figures are tagged "Harvest's Lauris export" (`Analytics.js:58-64`); Harvest never computed them.
- **Invented drafting:** keyword templates invent times, events and outcomes; continued-stay, discharge and quarterly drafts are canned with hard-coded "61 notes" counts the store does not hold; M.R. has zero processed daily notes (`05` §1, `04` headline 6).

## 3. Resolutions of conflicting requirements

"Decided" = settled for the build. "Validate" = the demo ships a configurable setting and a visible label, and Harvest still owes an answer (tracked in the unresolved decision register, §6).

| # | Conflict | Side A | Side B | Resolution | Status |
|---|---|---|---|---|---|
| 1 | Scan & Enhance | Prompt: primary extension action; v3 has addenda on processed notes | G-093: removed over audit risk; G-031: wanted for licensed staff | Keep the third button, named **Scan & Enhance** as in the prompt. **Mode A "Review draft"**: current drafts only, can fill the open form, version history. **Mode B "Evidence review"**: read-only, reads Psyflo's own captured copies (never a Lauris scrape), no fill command exists. **No addendum / late-entry feature**; the server refuses any write to a processed note (guard in the action, not only the UI). | Decided; addendum policy → Validate |
| 2 | Analytics priority | Prompt Part 12: three sections; Harvest asked Nov 2 | Nov 7 PsyFlo: "not a priority"; Nov 8: can wait | Build all three sections (prompt is explicit) and add a **Pilot scorecard** band first in Analytics with the six pilot measures precisely defined (`02` §g). Maturity chip: Pilot scorecard = Working, the rest = Future. | Decided |
| 3 | Navigation | Prompt: three tabs only, My Work for the rest | UX: Referrals must be one click for Scenario 2; D: "More" menu | Rail: **Authorizations · Denial Intelligence · Analytics** as the only large items; My Work is the logo target; below a divider two small links, **Referrals** and **Settings**, shown by role. Nav is data-driven (`NAV` config). | Decided |
| 4 | Direct support and the platform | Prompt: four personas, DS has My Work | G-030: platform is for licensed staff | DS gets **My Work** only (optional; reached from the phone and panel). No Authorizations, Denial Intelligence or Analytics for DS. | Decided |
| 5 | Visual system | Prompt: unify the master (paper, dark sidebar, DM Sans) and v3 (warm neutrals, green) | UX: dark rail and presenter bar read as one object | Keep the **brand**: DM Sans, paper `#F8F6F2`, teal `#217A78` primary, navy `#151B24` only for tool chrome (presenter ribbon, extension header, toasts), marigold as marker. Rail becomes **light sand**. Adopt the UX contrast fixes (muted text, 3:1 input borders, status colours). | Decided |
| 6 | Unit rule | Master: 60 min = 1 unit; v3: DMAS tier from 120 min | Official DMAS bands: 1 unit 2–2.99 h, 2 units 3–4.99 h, 3 units 5 h+ (12VAC30-80-30); Harvest staff say 1 h/day, DMAS Chapter IV says 2 h/day | **Configurable unit rule** (`unit_rules`) defaulting to the official 120/180/300 bands, source and verification chip shown. Track Time separates recorded, direct, documented and "potentially billable" time; an active timer is never called billable. The seeded M.R. note uses the confirmed 220 minutes = 2 units, not the unconfirmed 5 h 10. Daily minimum (1 h vs 2 h) is not shown as a rule. | Decided; minimum → Validate |
| 7 | Plan deadline | Harvest practice: ISP in 24 h | DMAS Chapter IV: ISP within 30 calendar days | Show both: "Harvest practice 24 h · DMAS 30 days", each with its source chip; the clock is configurable. | Validate |
| 8 | Payer decision clock | Harvest believes 14 days and calls about day 10 | Federal standard since Jan 1 2026: 7 days (72 h expedited); payers can extend; applicability to Virginia MCOs not confirmed | Neutral **"Day N"** with the day-10 follow-up and **Overdue** only after the configured limit; each number has a source chip. Never state 7 or 14 as a Harvest rule. | Validate |
| 9 | Approval before signing | Master: clinician presses Send | `01`: one person approves every outgoing SRA; supervisor sends | Add stage **Pending clinical approval** between "Ready for review" and "Pending signature"; approver and sender are separate permissions (D = designated by admin and logged); backup owner on each case. | Decided |
| 10 | Guardian signatures | Master: remote e-sign in the family portal | Evidence: wet-ink at intake; the DMAS SRA forms accept electronic signatures; Harvest policy unknown | Signature mode per document type in Settings: Remote allowed · In person required · Pending · Completed · Ready to review. Default for the demo flows is Remote allowed with chip **Policy not validated**; switching to In person changes the family screens. Never imply a digital signature replaces an in-person one. | Validate |
| 11 | Eligibility | Early notes: automatic from the referral | Nov 8: not verified from an incomplete referral | Five states (received → check required → checked by an authorized user → result with date and source → follow-up scheduled). The DMAS lookup carries a **Simulated** chip. | Decided |
| 12 | Role model | Master: cumulative levels, admin inherits all | Prompt Part 16: least privilege; E: matrix | Adopt the `05` §5 matrix. **Admin has no clinical-record access by default**; sees authorization status, units and aggregates; sees clinical text only with a logged grant. Site supervisors can approve (designated), send and track units. | Decided |
| 13 | Where authority lives | Master/v3: roles hidden in the browser | E: gates bypassable by API; D: anonymous POST succeeded | **Server-side sessions**, actor from the session, per-action capability table, state machine for request/note/consent, write-once processed records, role-projected `/api/state`. Labelled demo-grade (no real identity provider). | Decided |
| 14 | Canned clinical content | Seeded drafts read as real | Part 17: no fabricated evidence | Seeded continued-stay/discharge/quarterly drafts are rebuilt from stored notes (M.R. corpus seeded: daily, weekly, monthly notes tied to ISP goals; counts computed) or relabelled **Illustrative sample**. Missing evidence prints "Evidence missing — verify …", never a sentence. | Decided |
| 15 | Agents and automation | Early concepts: agents log in to payer portals, voice agents call payers | Nov 8 contract and Part 4.2: human initiates every key step | Roadmap labels only (**Future**). Nothing in the build stores credentials, signs in to a payer, or sends unattended. "Synced" and "Processed in Lauris" are set only by an observed bridge event. FLO/voice agents are not ported. | Decided |
| 16 | Analytics data | Seeded baseline, case-backed data and v3's 120-patient cohort all exist | Part 12.6: do not mix | Three provenance tags: `case_backed`, `harvest_export` (relabelled "Sample data, illustrative"), `illustrative`. One dataset per view with a banner; no sums across; cohort ids `COH-…`, initials hidden, generated client-side; minimum group size 5; patient-level drill-down only for case-backed data and the clinical-records permission. | Decided |
| 17 | Screening and intake recording | Nov 8 must-have | Nov 7: spring, consent-gated; BAA and recording consent open | Kept (Scenario 2) behind an explicit **recording-consent step**; chip "Pilot: consent-gated". Peer-to-peer recording off and configurable. | Validate |
| 18 | Appeals | Prompt: guardian-led or authorized provider | Only guardians appeal (single source); legal path unverified | Guardian-led is the default; the provider path shows **Not verified**. The system never exercises appeal rights for a guardian; it prepares, the guardian reviews and signs. | Validate |
| 19 | Maturity labels | Prompt: four levels | B: they mix demo fidelity and pilot scope | Use B's rule: the label states the claim made to Harvest and pilot scope overrides demo fidelity. Chips: **Working** (unmarked), **Simulated**, **Pilot (preview)**, **Future**; "unresolved" items show a verification source chip instead. Tier and rule provenance are separate axes. The mock Lauris is declared simulated once. | Decided |
| 20 | Lauris language | PsyFlo tells outsiders "integration" | Internally: a page bridge (G-022 vs G-085) | The UI and docs say **page bridge to the open Lauris page**; never "Lauris API". | Decided |
| 21 | Third extension button when not permitted | Prompt: "if authorized" | Role model | Visible to clinicians and designated supervisors only; others see a one-line reason. | Decided |
| 22 | Signer shown on documents | Psyflo PDF prints a hard-coded "Jordan Perez, LPC" | Real signer is whoever signs in Lauris | The signer is read from the Lauris signature event; the PDF prints it; no default name. | Decided |
| 23 | Wrong patient | Initials fallback auto-typed a dictation into another child's note | Part 10 | Match on Harvest # and identity card; hard stop with "Change student". | Decided |

## 4. Design recommendations (what the build implements)

1. **Three-tab platform + My Work.** Information architecture and the screen mapping follow `03` §e (which accepts the prompt's Part 6 table with three changes: ExtISP/ExtSRA/ExtSignOff merge into one "Prepare authorization" path; ExtCase (continued stay) lives there because it is Scenario 4's hero; ExtIncident surfaces a banner on the extension home while a state-portal clock runs). Historic routes remain as aliases; no route is deleted; `Eligibility` and `Referrals` are never redirected away.
2. **Queue first.** Authorizations opens on the work queue with the Part 7.1 chips and columns (Case, Payer, Request type, Status, Units, Deadline with source, Owner, Next action). The case shell has one primary panel and expandable sections including an interactive timeline whose events open What/When/Who/Document/Source/Next.
3. **Denial Intelligence** keeps the Part 8 queue and a five-section workspace (Decision, Evidence, Options, Action, History) with only the valid options per case; partial decisions, information requests, peer-to-peer and appeal live inside it. A `disputes` layer reconciles into the single `request.stage`.
4. **Extension** is narrow: current student, three actions (Scribe, Track Time, Scan & Enhance), one next task, collapsed recent activity; Scribe is a note-type selector; draft review shows staff input, PsyFlo wording and source side by side with accept/reject/edit/restore.
5. **Presentation and Explore modes** with a presenter dock that is visually unlike the product (navy ribbon, dashed marigold edge, monospace PRESENTER label). Scenario selector, role switcher, reset/preset, simulation controls (including the clock for both Psyflo and Lauris), notes drawer with maturity chips.
6. **Accessibility** is a build requirement, not polish: skip link, focus trap and return, `aria-pressed` on chips, real links, 3:1 input borders, 44 px touch targets in portals, headings and landmarks on phone screens, 12 px type floor.
7. **Pilot scorecard** and six precisely defined pilot measures (`02` §g) in Analytics.

## 5. Technical risks that shape the build order

Top risks from `04` §H and `05`: role gating cosmetic and gates bypassable by API (fixed in the foundation); status vocabularies diverging (single `request.stage`, one mapping table in code with a test); clock drift (a clock service replaces `state.today` and the hard-coded Oct 29; Lauris reads it); id collisions between demos (`#4471`, `REF-121`, `L.V.`, `T.N.`; master ids only, cohort in a separate namespace); template engine cannot express v3 UIs (build `ui/*` fragment helpers); whole-screen repaint losing typed edits (controller-held drafts); bridge contract regressions (lead-only files and `bridge-contract.mjs`); silent dataset blending (provenance in the selector return type and a test); test fragility (flowC needs flowA; a single runner with resets).

## 6. Remaining uncertainties (feed the unresolved decision register)

Owners of the answers are in `01` §8. Highest-impact open questions for Harvest: (1) in-person versus remote guardian signatures per document; (2) the daily minimum, one hour or two; (3) who verifies eligibility; (4) who approves outgoing SRAs and who may attest; (5) whether the extension may fill Lauris without a person pressing Fill each time; (6) the real decision timing and the day-10 call practice by payer; (7) screening-recording consent and the BAA; (8) peer-to-peer recording; (9) whether early discharge is a DMAS rule or practice (`EarlyDischarge.js:46` says rule); (10) who may appeal.

## 7. Scope and order of the build

- **Tier 1 (must ship):** foundation (sessions, permissions, clock, rules, tokens, components, nav, redirects, presenter and modes, test runner), Authorizations queue and case shell, Denial Intelligence queue and workspace with the existing decision screens folded in, Analytics three sections with the dataset toggle and export, extension home, Scribe selector, Track Time, Scan & Enhance A and B, the M.R. corpus, tests.
- **Tier 2 (build in the same pass if time allows):** My Work sections, mobile flow, portal polish, settings matrix and unit rules UI, History component.
- **Tier 3 (roadmap labels only):** FLO and voice agents, claims disputes, money exposure, DMAS form simulator, weekly analytics email.

Order: foundation (server track and client track in parallel) → six engineers in parallel on disjoint files → integration, QA runner, safety tests, visual and accessibility passes → documents (feature preservation matrix, before/after, walkthrough, decision register, pilot-versus-vision summary) → hosted build.
