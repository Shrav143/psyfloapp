# 06 · Demo storytelling and quality assurance (Agent F)

Nov 11, 2026. Companion: `06b-qa-harness-spec.md` (the shared harness) and `06c-parity-map.csv` (one row per inventory id). No code was edited.

## 0. Headline findings

1. **Baseline** (`baseline-tests.txt`): `npm test` 6/6, smoke clean, flowA, B, D pass; **flowC throws alone** (needs flowA's T.W. in Lauris). Re-run on my ports: flowA 24 s then flowC 19 s, no errors.
2. **Scenarios 1, 2, 3 and 5 run today; 4 and 6 do not.** M.R. has no daily notes (Psyflo holds one collateral note; Lauris holds none). Continued-stay counts are canvas constants (21 or 61). Analytics reads only the seeded baseline: after a processed note, a sent R-0416 and logged decisions, no Analytics figure moved.
3. **Clocks break the story.** Lauris stays on 10/29 after `demo.advanceDay`. The phone timer reads 23:41, 38:00 and 5:38:00 at 09:05, 14:30 and 19:30. K.T. shows "9 h left" at any hour, then "0 h left", never "missed". R-0391 never turns overdue.
4. **Decisions do not reconcile.** T.N. approved at 150 leaves the client authorization at 65 of 65; T.W. and E.C. become Active with no authorization in Psyflo (T.W.: Lauris shows "No authorizations available").
5. **Verified safety-relevant defaults:** household disclosure preselected "Include" with the check "Included because you pressed Include"; `request.demoReply` approves a draft, anonymously; `/api/state` serves screening transcripts to anyone.
6. **Interaction audit prototype:** master, 259 distinct controls on 36 route variants and 108 panel controls: 0 page errors, 0 broken links, 0 confirmed dead controls after triage. v3: 1,807 controls, 0 errors, 106 with no observable effect (16 on the denial workspace we port).
7. **Demo design:** a 14-minute route, six beats, checkpoint fixtures so no beat depends on another, a three-step recovery ladder.
8. **Parity:** all 291 inventory ids (191 master, 100 v3) sit in 19 acceptance groups; `06c-parity-map.csv` holds one row per id and `parity.mjs` fails on any lost id.

## 1. Method and evidence status

I read the spec, both demos, `04`, `04b`, the evidence digests and (as they appeared) `00` to `05c`. I ran the master from HEAD b330456 on 4760-4762 (a second instance on 4770-4772 for parallel probes) with Playwright Chromium, and the built v3 HTML from `file://`. Servers were stopped by PID. **Caveat:** every probe ran before 14:21 UTC against the pristine code; foundation edits (sessions, gates, rules, clock, app shell) landed after. Re-run on the integrated build; the harness does it in one command.

**Not verified:** the MV3 side panel in real Chrome; live microphone and Web Speech; Safari or Firefox; third-party storage in the Lauris-embedded panel iframe; a venue network. Plaud digests are secondary-source. My first-pass audit clicked by positional index and produced false "no effect" results (the weekly **Stop** button works); the algorithm below stamps elements instead.

## (a) Harvest leadership demo

### a1. Audience and rules

Audience: leaders who will test the accuracy claim, the clinical approver, the program director (`02` §i). Rules: lead with "a person reviews, signs and sends; Lauris stays the record; every sentence has a source"; show capture-once reuse; every simulated step wears its chip; no number the store cannot recompute.

### a2. Presentation mode versus Explore mode

| | Presentation | Explore |
|---|---|---|
| Enter | `?present=1` (default); Ctrl+Shift+P toggles the dock | `?mode=explore`, remembered |
| Chrome | Product fills the window; ribbon collapsed, out of tab order, unlike product styling | Ribbon open; "All screens" picker by role |
| Dock | Scenarios (6), role switcher, reset/preset, simulation (reply, advance both clocks), notes, maturity overlay, surface launcher | Same plus picker |
| Test (`presenter.mjs`) | `#root` holds no "Reset" or "Demo:" text; dock not tabbable until focused; role switch changes the rail without reload; "Demo data · nothing is real" present | Each route reachable in 3 clicks by a permitted role; mode label shown |

### a3. Primary walkthrough (14 minutes)

Order follows `02` §i: continued stay follows the daily note because it is the same student. Scenario numbers are the prompt's (Part 14.2).

| Clock | Beat · screen | Role signed in | Click path | Audience should conclude | If it fails |
|---|---|---|---|---|---|
| 0:00 | Frame · one slide | none | Four chips; three promises | We answer accuracy first | Slide only |
| 0:45 | **S1** M.R. daily note · phone frame, then Lauris + panel | direct support (`khale`) | M.R. chip → Say what happened → Use the example → Looks right → Lauris: M.R. → Daily note → "1 dictation waiting" → open "What Psyflo added" → Confirm units → **Process Form** → dashboard 5 of 6 | Staff judgment stays; each addition shows its source | Mic: use the example. Panel blank: reload the Lauris tab |
| 3:15 | **S4** M.R. continued stay · Lauris + panel (Evidence review) | clinician (`jperez`) | M.R. → Continued stay → period → counts open dated notes → exclude one item → read "Evidence missing" list → Fill yellow boxes (do not process) → Authorizations R-0411 | The notes you just wrote become evidence; gaps are named, not filled | Reload scenario `continued-stay` (10 s) |
| 5:45 | **S2** T.W. referral to intake · platform, phone frame, Lauris | clinician | REF-118 → Send family link (Simulated) → phone: five steps → Eligibility "details received" → record check → Lauris: new consumer → Admission screening → Play scripted call (fast) → Stop → Process → CNA "copied from screening" | Captured once, reused; missing questions are asked | SMS: use the preview. Call stalls: checkpoint `tw-referral` |
| 7:45 | **S3** R-0416 initial authorization · Lauris + panel, platform | clinician | From checkpoint `tw-isp-ready`: SRA panel → statements with chips → edit criterion 1 → Fill all 7 → Process → Forms to Approve → **Get Signature** → Send (Simulated Sfax) → receipt → Authorizations "Submitted" | Documentation, signature, submission and tracking are one thread | Stub idle over 5 s: reload `initial-auth` |
| 10:00 | **S5** D.W. payer decision · Authorizations → Denial Intelligence → back | clinician | R-0402 "Partial, decide" → Open in Denial Intelligence → evidence and valid options → peer-to-peer brief → schedule → log outcome → Back to authorization | Nothing is lost when a payer pushes back | Reload `payer-decision` |
| 12:15 | **S6** Leadership · Analytics | admin (`dowens`) | Pilot scorecard → Payer performance → payer row opens Denial Intelligence → Population (Illustrative banner) → Export CSV | Operational data without another spreadsheet | Export fails: show on-screen table |
| 13:30 | Close · pilot slide | none | Chips; one site, baseline week | A small, measurable start | Slide only |

**Recovery ladder.** L1: reload the tab (state is server-side). L2: reload the beat's scenario fixture (`demo.scenario`, under 10 s, both stores). L3: the golden screenshots and 60-second recordings that the `golden` suite writes each run; speak over them. Rule: no recovery over 20 seconds; step down a level.

### a4. Optional deeper route (15 to 25 minutes)

| Module | Entry | Show | Records |
|---|---|---|---|
| D1 Mode A review | Daily note draft | Original, proposed, source; accept, restore | M.R. |
| D2 Information request | Denial Intelligence | 24-hour clock, answer-and-stop reply, send path by channel | K.T. R-0408 |
| D3 Peer-to-peer | Denial case | Units run out before the call; consent-gated recording | T.N. R-0388 |
| D4 Appeal | Denial case, family portal | Guardian signs; Psyflo never does | E.C. R-0384 |
| D5 Transition | Authorization case | Run-out dates with stated assumptions, Level 2 incident | D.W. |
| D6 Supervisor | My Work | Review queue, staff dashboard | `cdiaz`, `rowens` |
| D7 Family | Family portal | Checklist, EN/ES, signature mode in Settings | T.W. |
| D8 Rules | Settings | Rule sources, unit rule, roles matrix | all |
| D9 Population | Analytics | Illustrative cohort, minimum group size | COH-ids |

## (b) Scenario specifications and gaps

"Verified" means I ran it. Each table is the unified build's contract; the "today" notes say what the master does.

### S1 · Direct staff daily note (M.R.)

**Records:** client `MR` (Harvest #3310, Campbell ES-1, staff `khale`, Anthem), seeded timer since 13:52 with six blocks (last one `unconfirmed`), request R-0411, Lauris #3310, ISP goals 1 to 3, `seed/scripts/dictation_MR.md`, `khale`'s other five students (4 of 6 notes done).

| Step · surface · role | Psyflo store | Lauris store | Queues, timeline, analytics |
|---|---|---|---|
| 1 Pick M.R. · phone · `khale` | none; caseload guard | none | header shows timer |
| 2 Say what happened · phone | dictation `waiting` with chips | none (nothing is sent) | "1 note waiting" |
| 3 Open daily note · Lauris + panel | `panel.filled` event | boxes typed yellow, unsaved | none |
| 4 Review wording and sources · panel | saved version if saved | none | none |
| 5 **Process Form** (person) | note created; authorization used 83→86; dictation used; 3 events | session processed; Active File +1; units 27→24 | dashboard 4→5 of 6; review queue +1 only in every-note mode; pilot measure 1 numerator +1 |

Verified today: all of step 5 except the queue (`khale` is `spot_check`, so it did not change) and Analytics (unchanged).

| Gap | Evidence | Build work |
|---|---|---|
| Wall clock drives timer, greeting, event order | run: an event stamped 14:05 sorts before seeded 15:30 | clock service, `fixed:HH:MM`; timer from stored start |
| "Confirm 3 units" counts the unconfirmed 13:40-15:10 block (note: 5 h 10 min, 3 units) | run | exclude unconfirmed blocks; units from rule: 220 min is 2 |
| No review-queue change for `khale` | run | scenario sets every-note, or the beat shows "sampled" |
| Wrong-patient fallback (WPS-01); invented narrative on free speech (UAR-01) | `05b` | Harvest # match, identity card; script only the example until the enhancer asks |

### S2 · School referral through intake (T.W., REF-118)

**Records:** REF-118 (LC-MS2, referred by `rbell`), client `TW`, `family_links` token, `eligibility`, `screenings`, `seed/scripts/screening_TW.*`, Lauris #4492 (created during the flow), CNA.

| Step · surface · role | Psyflo store | Lauris store | Queues, timeline, analytics |
|---|---|---|---|
| 1 School submits · school portal · `rbell` | referral stage needs_screening | none | Referrals +1, Do next line |
| 2 Clinic reviews · platform · `jperez` | criteria read form; missing list | none | none |
| 3 Family link · platform then phone | token; SMS stub event; on submit eligibility `details_received` | none | Do next "run the check" |
| 4 Record check · platform | result, plan, date, source; reminder; referral chip | none | reminder visible |
| 5 Screening · Lauris + panel | screening done; stage in_intake; 30-day clock | consumer created; Active File +1 | referral chip; intake-time measure starts |
| 6 Intake opens · Lauris | CNA boxes "copied from screening" | none | none |

Verified today (flowD, flowA): steps 3 to 6. The refusal before link submission is in code (`core.js:105`), not run.

| Gap | Evidence | Build work |
|---|---|---|
| REF-118 already exists; the form creates REF-122 | `core.js:24`, BRIEF | fixture `tw-school` drops REF-118 and lets the form take a demo-fixed id, or narrate from the school's status view |
| 30-day clock starts Oct 29, not at consent (`clock30: 2026-10-29`) | run | one configured start event (05 CK-5) |
| No recording-consent step | `00` §3.17 | consent gate, Pilot chip |
| Other calls draft 0 boxes and show PASS (ICE-01) | `05b` | list missing items as questions |
| SMS and DMAS stubs carry no chip | notes drawer | Simulated chips |

### S3 · Initial authorization (R-0416)

**Records:** R-0416 (live: created when the ISP is processed; canvas: submitted F-2291), Humana, fax, 150 units; Lauris #4492 ISP and SRA sessions; signed PDF and Sfax receipt.

| Step · surface · role | Psyflo store | Lauris store | Queues, timeline, analytics |
|---|---|---|---|
| 1 ISP · panel | goals 3; R-0416 `draft_ready` | goals written | queue "Draft" |
| 2 Statements and sources · panel | 7 boxes with sources; criterion 3 and trauma-informed care blank | none | none |
| 3 Edit criterion 1 · panel | saved version | none | none |
| 4 **Process Form** | `awaiting_signature` | processed; Forms to Approve +1 | queue "Awaiting signature" |
| 5 **Get Signature** (person) | signed PDF; stage `signed`; signer = Lauris user | approved | timeline +2 |
| 6 **Send** · platform | `sending`, then `submitted`; fax ref; receipt PDF; decision due | none | timeline +4; row Submitted; receipts-recorded measure +1 |

Verified today: steps 1 to 6 (flowC after flowA).

| Gap | Evidence | Build work |
|---|---|---|
| Needs flowA first | baseline | checkpoint `tw-isp-ready`; flowC applies it |
| Signer is a default string, not the Lauris user, and the chain runs from API calls alone (MCS-01, 03, 04) | `core.js:166`, 05 | read signer from the bridge event; transitions only by bridge event |
| After `active`, T.W. has no authorization in Psyflo or Lauris ("No authorizations available") | run | "Enter units in Lauris" task closed by a bridge observation; port v3's Authorizations layout into the mock |
| Drafted dates precede send date; decision due Nov 5 live, Oct 29 canvas (CK-2) | 05 | rules table; "Day N" |
| No approval stage between draft and signature | `00` §3.9 | add stage and approver permission |

### S4 · Continued-stay evidence (M.R., R-0411)

**Records:** `MR`, R-0411 (continued stay, `draft_ready`, 150 units), authorization Aug 18 to Nov 13 (83 of 110 used), `notes_sample` (3 rows), `client.quarter`, Lauris #3310.

| Step · surface · role | Psyflo store | Lauris store | Queues, timeline, analytics |
|---|---|---|---|
| 1 Open from case · platform → Lauris · `jperez` | none; R-0411 stays `draft_ready` | none | none |
| 2 Select period · panel (Mode B) | `evidence.period` | none | none |
| 3 Review dated notes and contacts | none; read only | none | none |
| 4 Counts and dates | counts equal rows; each opens rows | none | none |
| 5 Exclude sensitive | `evidence_marks` (who, when) | none | none |
| 6 Missing evidence · 7 Draft | gaps listed; yellow boxes filled | form boxes typed | gap count |

| Gap | Evidence | Build work |
|---|---|---|
| **No notes** behind the story: Psyflo 1 (Oct 8 collateral), Lauris 0 | run | seed `notes-corpus.json` (daily, weekly, monthly tied to ISP goals) plus Lauris sessions for #3310; sum of units is 83 |
| Counts are constants; toggle moves 21→61 and 3→9 but the narrative is identical in both ranges | run | compute every count from rows; draft from the index |
| 61 notes cannot exist: Aug 18 to Oct 29 has 53 weekdays (64 to Nov 13); 12 weekly calls in about 10 weeks | calendar | corpus honors the calendar; reword the "61 days" quarter figure |
| Household disclosure included by default; check says "pressed Include" | run | default Exclude; require a click (DSL-03) |
| Text is canned ("3 of 5 escalations", named events, "he", Nov 16 to Feb 13) | `draft.js:288-306` | build from evidence; unknowns print "Evidence missing — verify …" |
| 4 of 4 checks pass; "Pick dates" only shows a message | run | gap checks; real range |
| Units end about Nov 10 (27 ÷ 3), before the Nov 13 end | EXA-01 | banner |

### S5 · Payer decision (D.W.; K.T., T.N., E.C. in the deeper route)

**Records:** R-0402 (Sentara, fax, 110 of 150 offered Oct 27, reply by Oct 30, Lauris #4102); R-0408 (Anthem, Availity, 24-hour request from Oct 28 5:40 pm); R-0388 (Sentara, 65 awarded, call Dec 9); R-0384 (Anthem, denied Oct 22); `request_details`, `payer_history`, `denial_reasons`.

| Step · surface · role | Psyflo store | Lauris store | Queues, timeline, analytics |
|---|---|---|---|
| 1 Queue row "Partial, decide" · `jperez` | none | none | none |
| 2 Open in Denial Intelligence | dispute opened; owner; deadline with source | none | DI queue row; open count +1 |
| 3 Evidence and options | none; unverified paths labelled | none | none |
| 4 Choose peer-to-peer | `partialChoice p2p`; stage `peer_to_peer_requested`; "not sent to payer" | none | Do next line |
| 5 Schedule and brief | `p2p_at`; reminder; consent gate | none | timeline |
| 6 Log outcome (130 units) | stage `active`; awarded 130; dispute resolved | task "Enter 130 units"; mock shows them only after a person enters them | row Active; DI row closed; units awarded and partial rate update |
| 7 Back to authorization | same case shell | none | updated |

Verified today by running each action per case: state lands on the request, plans, reminders and events; client authorization is untouched.

| Gap | Evidence | Build work |
|---|---|---|
| No Denial Intelligence; four screens, no return link | code | E3 queue, workspace, `disputes` reconciling into `request.stage` |
| Request and authorization drift (T.N., E.C., T.W.) | run | one reconcile action; validate units (IIU-03, 04) |
| `demoReply` approved a `draft_ready` request, anonymously | run | stage guard; demo-only permission (URA-10) |
| K.T. (Availity) reply logged "faxed through Sfax"; no stub ran; stage `submitted` | run | send by channel; reference only from the stub (SVR-02) |
| R-0391 stays Submitted after its due date (due date lives only in `request_details`); K.T. never "missed" | run | compute from stored dates (CK-3) |
| D.W. shows 110 units in Lauris before the offer is accepted; Lauris date ignores `advanceDay` | run | Lauris units follow a person's entry; one clock for both stores |
| "Only a guardian can appeal" shown as fact | grep | rule chip: Not verified |

### S6 · Leadership view

**Records:** `analytics_baseline`, `payers`, `staff_dashboard`, case-backed rows from `requests`, `notes`, `events`; the illustrative cohort (`COH-`).

| Step · surface · role | Data and provenance | Expected change |
|---|---|---|
| 1 Open Analytics · `dowens` | scorecard, case-backed | none |
| 2 Timeliness | notes in window over notes due | S1 raises the numerator |
| 3 Payer outcomes | case-backed; baseline labelled "Sample data, illustrative" | S5 moves partial count and awarded units |
| 4 Population · 5 Goals, interventions | toggle shows Illustrative banner; groups under 5 hidden | corpus counts appear |
| 6 Drill down | payer row opens Denial Intelligence; case timeline; clinical text withheld from admin with a reason | none |
| 7 Export | CSV or PDF with period, filters, definitions, provenance | file matches screen |

| Gap | Evidence | Build work |
|---|---|---|
| Analytics reads only `analytics_baseline`, `payers`, M.R.'s quarter | `Analytics.js:28-60`; run | E4 selectors returning `{rows, provenance}` |
| Baseline labelled "Harvest's Lauris export · Oct 29" | source | relabel |
| No timeliness, population or outcomes sections; grant-pull counts hard-coded (52, 14, 3) | source | compute or label |
| No minimum group size or permission-gated drill-down | — | enforce in selectors |

## (c) Feature parity checklist

The inventory has 291 rows. A checklist that cannot lose a row has two parts. **`06c-parity-map.csv`** holds one row per id (id, feature, status, destination, group, acceptance check, automation, suite, owner), generated from `04b`. **`parity.mjs`** parses `04b`, fails on any unmapped, duplicate or "removed without decision" id (Part 22.3), and reports each id as PASS (an id-named test passed), GROUP-ONLY (only its group suite proves it; the QA owner reviews these) or MISSING. The 19 groups (the CSV holds membership and per-id destination):

| Group | Ids | Acceptance check | A/M | Owner |
|---|---|---|---|---|
| Q01 Sign-in, roles, users, settings | 10 | 4 roles land right; server refuses beyond role; matrix and unit rule apply | A | C/G · E1 |
| Q02 Presenter, presets, scenarios | 21 | Dock hidden in Presentation; 6 fixtures load | A+M | C · E1 |
| Q03 My Work (to do, review, team) | 7 | Counts equal selectors; review actions persist | A | E · E2 |
| Q04 School portal | 7 | Create, draft, attach, share; own school only | A | G · E6 |
| Q05 Referrals, eligibility | 17 | One click, never redirected; check recorded | A | E · E2 |
| Q06 Family portal | 22 | Link, consent PDF, checklist, EN/ES; 390 px clean | A+M | G · E6 |
| Q07 Extension shell, panel home, guards | 20 | Each opens its record with the 400 px panel; off for SEBS | A | D · E5 |
| Q08 Scribe: screening, intake, daily, weekly, monthly, incident | 14 | 11 boxes, 14 checks; dictation waits; units update | A | D · E5 |
| Q09 Plan, SRA, quarterly, continued stay, discharge | 7 | Criterion 3 blank; counts equal rows; exclusion works | A | D · E5 |
| Q10 Authorizations, sign-off, Send, receipts, transition | 18 | 7 filters, 8 columns; Send only after signed; receipt | A | E · E2 |
| Q11 Denial Intelligence, payer rules | 23 | Valid options only; stage reconciles; rule source shown | A | E · E3 |
| Q12 Analytics, export, seed data | 15 | Provenance chip; no blending; export; seeds read or listed | A | F · E4 |
| Q13 Mobile staff app | 7 | Wrong-patient guard; timer; 390 px | A+M | G · E5 |
| Q14 Bridge, mock Lauris, mock portals | 27 | Contract ids; never presses; processed records write-once | A | D · lead |
| Q15 Server core, orphan actions | 27 | Persistence, SSE, PDF; orphans removed or registered | A | B · lead |
| Q16 Time, Scan & Enhance (v3 ports) | 17 | Modes A and B; units from rule | A | D · E5 |
| Q17 Do not port; v3 duplicates | 19 | Addendum refused (EFN-09); master equivalent passes | A | A/C · lead |
| Q18 Evidence content, UI patterns | 9 | Citation opens dated excerpt; tokens only | A+M | B/E · E1-E3 |
| Q19 Crosswalk | 4 | No v3 number enters; #4471 stays E.C. | A | A · lead |

## (d) Test design

### d1. Part 19.2 regression coverage, one by one

| 19.2 item | Suite | Key assertions |
|---|---|---|
| Login, role switching | `roles` | 4 roles reach home; dock switch needs no reload; server refuses forbidden actions (URA-02, 05, 06) |
| Referral creation | `portal-school` | submit makes REF-n; draft saves; Referrals shows it |
| Family link | `flowD` | token, five steps, submit gives `details_received` |
| Eligibility | `referrals` | refused before the link; result, date, source stored; reminder |
| Screening | `flowA` | 11 boxes with sources; 14 checks; incomplete transcript lists questions (ICE-01) |
| Intake | `flowA` | CNA "copied from screening" |
| Treatment plan | `flowC` | 3 goals; green and yellow boxes |
| SRA drafting | `sra-draft` | criterion 3 and trauma-informed care blank; every source id resolves (UAR-05) |
| Human sign-off | `signoff` | non-licensed signer held (MCS-03); signer equals Lauris user (MCS-04); approver differs from author (MCS-07) |
| Submission | `submission` | Send only after signed; fax ref matches `F-\d+`; portal channel opens mock |
| Receipt tracking | `submission` | receipt PDF; receipt-check log; overdue notice is a person's action |
| Daily note | `daily-note` | units equal rule(minutes); unconfirmed block excluded |
| Time tracking | `time` | recorded, direct, documented and billable kept apart; timer never "billable" |
| Continued stay | `continued-stay` | counts equal stored rows; exclusion removes text; gaps printed; Mode B has no fill |
| Partial approval | `denials` | three doors; units validated; stage reconciles |
| Information request | `denials` | 24-hour clock; "missed" state; reply send by channel |
| Peer-to-peer | `denials` | consent gate; schedule; outcome moves stage and units |
| Appeal | `denials`, `portal-family` | guardian signs only; no "faxed" before Send |
| Early discharge | `auth` | dates from rule and calendar; assumptions shown |
| Staff review queue | `mywork` | approve, return, "didn't happen"; author cannot review own note (URA-09) |
| Analytics | `analytics` | provenance tag; no blending; groups under 5 hidden; figures move after S1, S3, S5 |
| Family portal | `portal-family` | checklist; EN/ES; signature mode switch |
| School portal | `portal-school` | own school only (DSL-05); no clinical text in payload |
| Mobile app | `mobile` | wrong-patient refusals (WPS-03 to 05); timer; assessments held |
| Settings and access | `settings`, `roles` | matrix edits apply server-side; role projection hides clinical text from admin |

Additional suites: `smoke` (every route, 4 roles, both presets, 0 console errors, 0 unwired anchors); `routes` (23 deep links; redirects; Referrals and Eligibility never redirected); `clock` (both clocks advance; no literal dates in code; CK-1 to 8); `bridge-contract` (DOM ids of `04` §F; fill never presses Process, Signature or Send); `consistency` (each scenario table's "one action, consistent updates" cells, plus: client authorization equals the latest request units); `fixtures` (UI-built state equals fixture state); `golden` (A, C, S5 by UI; writes screenshots); `copy-scan` (forbidden phrases such as "Lauris API", "sent to Lauris", "OCR", "AI rewrite", unqualified "e-sign"; 0 hits); `crosswalk`; `parity`; `visual`; `a11y`; `interaction-audit`; `safety-*`; and the existing `npm test`, flowA to D, `panels`.

### d2. Part 19.3 interaction audit (algorithm)

1. Reset; for each role, enumerate routes from the registry plus parameter variants (the 23 deep-link patterns).
2. Load the route signed in; wait for `#root` content. Collect console and page errors.
3. Enumerate visible controls: `a[href]`, `button`, `[onclick]`, `[role=button]`, `summary`, `select`, checkbox, radio, `[tabindex=0]`. **Stamp each with `data-qa="n"` immediately**; click by stamp, never by position. De-duplicate by tag, name and href; keep rail items for the first route only.
4. Require an accessible name; record disabled controls and whether a `title` or adjacent text explains them.
5. For each control, reload the route (fresh state), snapshot `{hash, URL, #root text hash, modal, drawer, toast, rev}`, click (select: choose option 2), wait on events not timers, snapshot again.
6. Classify: NAVIGATED, POPUP, DOWNLOAD, STATE (`rev` changed), DETAIL (modal or drawer opened), DOM, TOAST-ONLY (accept only if text states why), NO-EFFECT, DISABLED-EXPLAINED, DISABLED-UNEXPLAINED.
7. Fail the suite on any NO-EFFECT not on the allowlist (active tab, active language, radio or checkbox with DOM-held state, scroll anchor with `scrollY` change), any unexplained disabled control, unnamed control, console error, or navigation to an unregistered route.
8. External `http` links: HEAD-check, never click. Panel variant: the same loop over `#panel` in `#psyflo-frame`, with "typed into form" as an outcome; recording buttons use the fast scripted call.

**Prototype result (master):** 259 distinct controls, 36 route variants: NAVIGATED 110, DOM 60, DETAIL 25, STATE 16, POPUP 3, TOAST-ONLY 6 (validation messages), NO-EFFECT 39. By label and handler, 33 are by design (active filter, tab or language; radio; scroll anchor), 3 were index-drift artefacts, 3 need a manual look (`SchoolPortal` `#share`, `Partials` option A, `InfoRequest` `#send`). Panel: 108 controls on 16 pages: 53 navigated, 13 typed into the form, 13 changed the panel, 8 changed state, 6 opened popups, 12 no-effect (role toggles already active, selects, drift), 1 disabled and labelled.

### d3. Part 19.4 clinical safety tests

Defer to `05b` by id; the `safety-*` suites run its cases. Categories: wrong patient (WPS-01 to 09), incomplete evidence (ICE-01 to 08), unsupported recommendations (UAR-01 to 07), finalized notes (EFN-01 to 10), missing signature (MCS-01 to 10), unauthorized role (URA-01 to 13), deadline uncertainty (PDU-01 to 07), invalid units (IIU-01 to 11), expired authorizations (EXA-01 to 06), service-line disclosure (DSL-01 to 09), simulated versus real (SVR-01 to 10). **Release-blocking set** (the CRITICAL and HIGH findings of `05`): WPS-01, 02, 08; ICE-03, 08; UAR-01 to 03, 05; EFN-01, 02, 09; MCS-01 to 04, 09; URA-02, 05 to 08, 10; DSL-03, 04, 09; SVR-01, 02, 06. Any FAIL there blocks the demo.

### d4. Part 19.5 visual tests

| Surface | Viewports | Checks |
|---|---|---|
| Platform (every non-panel route) | 1440×900, 1280×800, 1024×768 | no horizontal scroll; no text under 12 px; one `h1` and a `main`; targets 24 px or more; rail collapses at 1024 |
| Extension | 400×900 panel beside 1440 Lauris | no horizontal scroll in `#panel`; every view fits; focus visible |
| Mobile staff, family portal, school referral | 390×844, 360×740 | no horizontal scroll; targets 44 px or more; headings and landmarks; language toggle reachable |
| Long tables | Authorizations and Denial queue with 60 generated rows | sticky header, sort works, no clipped cell |
| Empty and error states | empty filters; new store; `/api/do` returning 500; SSE blocked | message plus a next action; error is announced (`role="alert"`); no blank screen |
| Modals and drawers | at 400 and 1024 | focus enters, trapped, Esc closes, focus returns; fits viewport |

Measured on the master (32 non-panel routes): horizontal scroll at 1440 on StaffDashboard and at 1024 on Referrals, StaffDashboard and Authorizations; 13 routes without `h1`, 17 without `main`, 17 with text under 12 px, 29 with targets under 24 px. Screenshots are artifacts for human review; no pixel baselines this release.

### d5. Keyboard and accessibility

`a11y.mjs` per route: at most 3 tab stops before `main`, skip link first; every control reachable by Tab (walk, compare with the enumerated set); Enter and Space activate `role=button`; Esc closes dialogs and returns focus; toasts in `role="status"`, errors in `role="alert"`; `lang` set; names on all fields; sampled text contrast 4.5:1, UI borders 3:1; `prefers-reduced-motion` respected. The 400 px panel is tested separately.

## (e) Scan: broken links, dead controls, misleading claims, inconsistent state

Sev: H blocks the demo, M fix before Harvest sees it, L polish. "run" = reproduced; "code" = read.

| # | Where | Finding | Sev | Fix |
|---|---|---|---|---|
| 1 | `seed/notes.md:215, 217, 381` | Drawer claims fax replies "read by OCR", a Sfax API, Availity read by the extension; none exists (code) | H | Rewrite; Future chip |
| 2 | `Analytics.js:58`, `StaffDashboard.js:236` | Seeded figures labelled "Harvest's Lauris export" (code) | H | "Sample data, illustrative" |
| 3 | Continued-stay panel | Household sentence on by default; "Included because you pressed Include" (run) | H | Default Exclude |
| 4 | `core.js:166-177` | Signed PDF says "Electronically signed in Lauris by" a default clinician whoever signed (code; 05 MCS-03 ran it) | H | Signer from event |
| 5 | `core.js:262, 274`; `InfoRequest.js:92`; `ParentPortal.js:161` | "Faxed through Sfax" with no stub run, for an Availity payer (run) | M | "Ready to send" until a reference |
| 6 | `seed/notes.md:261` | "AI rewrite"; drafting is rule-based (README) | M | Label Simulated |
| 7 | Weekly and monthly panels | "Recording · 14 min … consent on file" and Stop for a call nobody recorded (run) | M | "Illustrative sample" chip |
| 8 | `panel.js:855` | Says the portal time is "logged on Compliance"; that screen was dropped (code) | M | Point to the case timeline |
| 9 | `Submission.js:30, 90`; `ParentEnroll.js:53`; `ParentPortal.js:158`; `Partials.js:58` | "7-calendar-day standard" and "only a guardian can appeal" as fact (code) | M | Rule chips |
| 10 | v3 `05-sync.js:89`, `scribe.js:444` | "Synced to Lauris" set by a simulated writer | M | Observed event only |
| 11 | v3 `docs/SPEC.md` §1 | "Must not look like a demo", no "stubbed" toasts; conflicts with Part 4.5 | M | Ported text carries chips |
| 12 | Authorizations R-0411 | "Draft ready from 61 notes" static; store has 0 (run) | M | Compute |
| 13 | Seed | 61 notes exceed 53 elapsed weekdays; 83 units in 53 days is 1.6 a day, not "3 per school day" | M | Fix corpus and copy |
| 14 | T.N., E.C., T.W. | Request and authorization drift after a decision (run) | H | Reconcile |
| 15 | Lauris mock | Date ignores advance; D.W. 110 shown before accept (run) | M | One clock; entry task |
| 16 | `demo.advanceDay` | R-0391 never overdue; K.T. "9 h left" fixed (run) | M | Compute |
| 17 | Mobile and Do next | Timer, greeting and event order follow the machine clock (run) | M | `fixed:HH:MM` |
| 18 | `request.demoReply` | No stage guard; anonymous (run) | H | Guard; demo permission |
| 19 | `/api/state` | Screening transcripts served to anyone (run) | H | Role projection |
| 20 | Users | One click changes a role, no confirm (run) | M | Confirm; self-protect |
| 21 | Platform routes | Horizontal scroll, missing `h1` and `main`, text under 12 px (run) | M | Per (d4) |
| 22 | Flow B | "Confirm 3 units" includes an unconfirmed block (run) | M | Exclude until confirmed |
| 23 | v3 sweep | 106 of 1,807 controls inert, 16 on the denial case (Analyze Denial, Prepare Reconsideration, Save Draft, Send request); `au-clear` has no handler (run) | L | Port with handlers |
| 24 | Master links | 0 external links; 3 popups open mock portals or PDFs; links to the dropped Compliance screen exist only in replaced sidebars (code) | L | None |
| 25 | Seed | M.R.'s continued stay and T.W.'s CNA share an event (Oct 6, ISS) (code) | L | Ask seed owner |

## (f) Presentation-ready acceptance standard

Every criterion passes only with its test green in a results file from `run-all`; **plus** the release gates below.

| # | Criterion (Part 22) | Measurable test | Pass |
|---|---|---|---|
| 1 | Nov 8 project is master | `npm test`, smoke, flows A to D, panels, 3 origins start | 100% green |
| 2 | All functioning features accounted | `parity` over `06c-parity-map.csv` | 291 of 291 mapped; no group FAIL |
| 3 | No workflow removed | `routes` (46 historic ids render or redirect), S1 to S6 | 0 failures |
| 4 | Three areas | `nav`: three primary items; Analytics three sections; Denial Intelligence own route | exact |
| 5 | Frontline focus | S1 click budget; panel home actions | at most 12 clicks; 3 actions plus 1 next task |
| 6 | Extension works | `panels`, `bridge-contract`; manual MV3 checklist | all pass; checklist signed |
| 7 | Mobile, family, school, supervisory reachable | `mobile`, `portal-*`, `mywork` | pass |
| 8 | Interactions real | `interaction-audit` | 0 NO-EFFECT off allowlist; 0 console errors |
| 9 | State consistent | `consistency` | every scenario matrix cell true |
| 10 | Roles respected | `roles`, URA set, projection | 0 FAIL; admin payload has no clinical text |
| 11 | Nothing fabricated | `sra-draft`, ICE, UAR, evaluation set | 0 unresolved sources; 0 invented tokens |
| 12 | Processed notes not rewritten | EFN-01 to 10 | 0 FAIL |
| 13 | Gates intact | MCS-01 to 10, SVR-08 | no signed or submitted without a bridge event |
| 14 | Simulated marked | `copy-scan`, SVR-01 to 07, chips per maturity registry | 0 forbidden phrases; chip on every simulated feature |
| 15 | Understood without narration | manual: 3 staff watch silently, then state each beat's message | 5 of 6 beats named |
| 16 | Advanced features discoverable | reachability graph | every route within 3 clicks |
| 17 | Tests addressed | `run-all` results | 0 FAIL; no unexplained SKIP; 25 of 25 in d1 |
| 18 | One coherent app | `visual` token audit; design checklist | 95% of computed colours in token set; signed |

**Release gates.** Release-blocking safety set green; preflight (g) green on the demo machine; three rehearsals in the target browser with no recovery; route render under 1.5 s, live update under 1 s; zero console errors across the run sheet.

## (g) Live-demo risks and reset

| Risk | Symptom | Recovery |
|---|---|---|
| Mic permission or Web Speech missing | Silent recording | "Use the example"; pre-grant `localhost` |
| Popup blocker | PDFs, portal tabs do nothing | Pre-allow; open the link from the timeline |
| Venue blocks fonts or SSE | Layout shift; updates lag 15 s | Fallback font tested; reload tab |
| Panel iframe storage blocked | Panel shows no user | Use Chrome; preflight check (unverified) |
| Stale state from rehearsal | R-0416 already sent; T.W. already in Lauris | Scenario fixture, then preflight |
| Sfax stub is a 3 s in-process timer | `sending` forever after a restart (code) | Reload the scenario; never restart mid-beat |
| Machine clock | Timer, greeting wrong | `fixed:HH:MM` clock; preflight prints it |
| Shared single store | A second tab or viewer changes state | One presenter per instance; private host |
| Presenter presses a person's step | Process, Signature or Send clicked for the audience | Say who presses; the gates block API shortcuts |
| Lauris tab lost | Panel and form gone | Scenario fixture reopens the record |
| Screen-share resolution | 400 px panel unreadable | Test at 1080p; zoom 110% |
| "Is this real?" | Pointed question | Maturity overlay; show the chips |

**Data reset procedure.** (1) Dock, Reset, pick the scenario or preset; or `POST /api/do {"action":"demo.reset","args":{"preset":"live"}}`, which resets both stores. (2) State survives restarts (the store reloads `psyflo.json`); `npm run reset` deletes files and needs a restart. (3) Run `node test/preflight.mjs`: servers, preset, today, clock, fixtures, first six screens clean, Lauris login, portals, speech. (4) Open tabs in run-sheet order, sign in, load the first scenario.
