# QA2 findings · scenarios, parity and safety

Nov 11, 2026. Commit 1bd258b (working tree of that day), node v22.22.0, Playwright Chromium, demo time 15:30, `node test/run-all.mjs --ports 4930` on one worker (ports 4930-4932, data in the scratchpad `data-qa2`). No product code was edited. New files: `test/s1.mjs` (E7's S1 extended: its three phone and Lauris checks are steps 2, 4 and 6), `test/s2.mjs` to `test/s6.mjs`, `test/safety.mjs`, `test/parity.mjs`, `test/lib/scenario.mjs`, `test/lib/parity.mjs`, `test/lib/safety-report.mjs` (the id-to-test map and the report writer); eight suites registered in `test/run-all.mjs` (appended `Object.assign(META, …)` line). Outputs: this file, `review/qa/parity-results.csv`, `review/qa/safety-results.md`, run logs in `review/test-results/{s1..s6,safety,parity}.{md,log}`.

## 1. Results per suite

Run of 41 suites: 33 pass, 8 fail. The failures that are mine report real defects (every failing test of the scenario, safety and parity suites is a product finding, none was loosened); the others are other owners' suites.

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| unit | PASS | 9 | 0 | 0 | 0.4 |
| a11y | FAIL | 214 | 14 | 0 | 162.0 |
| analytics | PASS | 22 | 0 | 0 | 20.3 |
| authorizations | PASS | 20 | 0 | 0 | 49.5 |
| bridge-contract | PASS | 7 | 0 | 0 | 0.8 |
| clock | PASS | 10 | 0 | 0 | 2.2 |
| decisions | PASS | 8 | 0 | 0 | 5.6 |
| denials-ui | PASS | 7 | 0 | 0 | 32.2 |
| denials | PASS | 18 | 0 | 0 | 3.7 |
| enhance | PASS | 14 | 0 | 0 | 13.3 |
| family | PASS | 35 | 0 | 0 | 45.1 |
| fixtures | PASS | 7 | 0 | 0 | 4.6 |
| flowA | PASS | 7 | 0 | 0 | 24.8 |
| flowB | PASS | 4 | 0 | 0 | 5.4 |
| flowC | PASS | 6 | 0 | 0 | 20.1 |
| flowD | PASS | 5 | 0 | 0 | 13.1 |
| gates | PASS | 29 | 0 | 0 | 5.4 |
| lauris | PASS | 8 | 0 | 0 | 0.7 |
| mobile | PASS | 11 | 0 | 0 | 79.6 |
| mywork | PASS | 15 | 0 | 0 | 27.0 |
| panels | PASS | 16 | 0 | 0 | 32.3 |
| referrals | PASS | 8 | 0 | 0 | 24.4 |
| roles | PASS | 20 | 0 | 0 | 1.3 |
| routes | PASS | 56 | 0 | 0 | 91.4 |
| rules | PASS | 8 | 0 | 0 | 0.6 |
| s1 | FAIL | 37 | 1 | 0 | 37.4 |
| s2 | PASS | 34 | 0 | 0 | 116.5 |
| s3 | FAIL | 34 | 2 | 0 | 76.9 |
| s4 | FAIL | 31 | 1 | 0 | 41.8 |
| s5 | FAIL | 43 | 2 | 0 | 72.7 |
| s6 | FAIL | 34 | 1 | 0 | 47.7 |
| safety | FAIL | 37 | 12 | 1 | 59.1 |
| school | PASS | 11 | 0 | 0 | 16.9 |
| scribe | PASS | 13 | 0 | 0 | 19.7 |
| settings | PASS | 17 | 0 | 0 | 65.3 |
| smoke | PASS | 85 | 0 | 0 | 45.9 |
| time-panel | PASS | 8 | 0 | 0 | 29.7 |
| time | PASS | 20 | 0 | 0 | 1.0 |
| ui-kit | PASS | 33 | 0 | 0 | 54.3 |
| visual | FAIL | 198 | 8 | 0 | 163.0 |
| parity | PASS | 4 | 0 | 0 | 147.6 |

Notes on the table.
- `a11y` (14 failing: rail foot hidden at 1024 px and below so "Demo data · nothing is real", Help and Sign out disappear; 400 px horizontal scroll on My Work; 41 px and 25 px touch targets on ParentSign, SchoolPortal and the panel home) and `visual` (8 failing: sticky table header, no error state when `/api/state` fails, Help drawer at 400 px) are the lead's suites, run from the same build; `audit`, `hosted` and `presenter` were not run (audit alone has a 5400 s budget).
- `enhance` failed once in the full run (`S4 in the panel … locator.click: Timeout 30000ms`) and passed on the re-run: a timing flake of E5's test under load. My `s4` drives the same panel and passed in all three start modes.
- `referrals`, `clock` and `time-panel`, red in the lead's earlier run, are green in this run.
- `s1`, `s3`, `s4`, `s5`, `s6` and `safety` are red only on the defect checks listed in §3 (each is a separate, named test; the steps that drive the scenario all pass).

## 2. The six scenarios (S1 to S6)

Each suite drives the UI (phone, Lauris mock + panel in page mode, platform, guardian and school pages) and, after every step, reads the Psyflo store (`/api/state`, role-projected), the mock Lauris (`GET /__test/lauris`), the queues, My Work, the pilot scorecard on the Analytics screen (DOM tile = selector), Denial Intelligence and the audit events. Each runs three times in one suite: from `demo.scenario sN`, from the fixture (`mr-daily`, `tw-referral`, `tw-isp-ready`, `mr-corpus`, `payer-decision`, `analytics-case`) and from a fresh `demo.reset`; a last test compares the first and the last state across the three starts.

| Suite | Steps asserted | Result |
|---|---|---|
| S1 M.R. daily note | pick M.R. (identity card, no store change); dictation waits (Harvest # 3310, nothing in Lauris); panel drops it in (yellow, not saved); wording and questions; Process Form: note, 220 min = 2 units, tracker 83 to 85, Lauris session processed, Active File +1, units 27 to 25, 5 listed blocks; phone and Track Time follow only the observed event; My Work 5 of 6 and the supervisor queue by review mode; R-0411 units 85 of 110; pilot "Notes on time" +1 over +1 live; Denial Intelligence untouched | passes in 3 starts; parity holds; one defect check (D7) |
| S2 T.W. REF-118 | school portal status only and a new referral reaches the clinic queue; criteria and missing items; Simulated SMS and the guardian's five steps; eligibility recorded with a dated proof PDF; Lauris new consumer (boxes typed, not saved), consent before recording, scripted call, Process Form (screening done, in intake, send-by Nov 28, Active File +1), CNA copied from screening | passes in 3 starts; parity holds |
| S3 R-0416 | ISP and CNA (fresh start), 7 sourced statements, criterion 3 and trauma-informed care blank, edit criterion 1, Process Form, approval by a designated approver (a supervisor is refused), Get Signature in Lauris (signer read from the Lauris event, PDF), Send by a different person with the Sfax stub (F-nnnn, Day 0, events simulated), queue row at every stage, pilot "Sends with receipts" +1 | passes in 3 starts; red on D4 (scenario start differs from fixture and UI path) |
| S4 M.R. continued stay | case evidence counts, Mode B read-only (no fill or press control), period kept, counts equal stored rows and open dated rows, Exclude needs a reason and keeps who and when, gap list prints "Evidence missing — verify", household off by default, draft typed yellow and not processed, processed notes byte-identical, Lauris unchanged | passes in 3 starts; red on D6 |
| S5 payer decision | D.W. partial to peer-to-peer to outcome 130: Active, dispute closed, "Enter units in Lauris" task, Lauris unchanged until a person types the units, task closes from the observed event, queue and Analytics move; K.T. through the mock Availity page; T.N. approved at 150 (65 of 65 kept as history); E.C. appeal signed by the guardian | passes in 3 starts; red on D3 and the seeded pre-decision units |
| S6 leadership | scorecard (six tiles = selectors), three sections, banners, live update of the tiles, payer row opens Denial Intelligence, cohort never blended, no drill-down for admin, export CSV equals the screen cell for cell, PDF, no clinical text for admin | passes in 3 starts; red on D5 |

Fixture-versus-UI parity found one disagreement: S3 (D4). S1, S2, S4, S5 and S6 agree on the first and the last state in all three starts.

## 3. Parity (review/06c-parity-map.csv, 291 ids)

`test/parity.mjs` checks every id by a probe (route renders for a permitted role, action registered with a capability entry, Lauris or portal page answers, state key, code, panel on the right form) and by the named suites passing; `review/qa/parity-results.csv` has id, feature, destination, status, evidence, notes. Counts: PRESERVED 48, MOVED 209, REPLACED-BY 5, DROPPED-WITH-REASON 29, NOT-VERIFIED 0. The suite passes: no kept feature failed its probe (no silent removal), no id lacks a probe or a passing suite. The 29 drops all carry a reason (duplicate of a master screen, agents and voice, claims disputes, the addendum, v3 build artefacts, orphan actions). Four drops are documented in 04b and 06c but are not itemised in `00-unified-recommendations.md` §3: `request.set`, `request.p2pOutcome`, the v3 `/payers` routes and "Help" (D11). The "Time Tracker" and "Authorizations" pages of the v3 Lauris (V-069, V-070) exist in the mock (`/time`, `/authorizations`).

## 4. Safety (review/05b-safety-test-plan.md)

PASS 87 · FAIL 11 · NOT-RUNNABLE 2 of 100 case ids; the table with the proving test per id is `review/qa/safety-results.md`. 49 ids are proved only by `gates`, `roles`, `clock`, `analytics`, `bridge-contract`, `enhance`, the unit tests and the scenario suites; 51 are proved (alone or with another suite) by `test/safety.mjs`. Release-blocking set of review/06 §d3: URA-05, URA-06 and URA-10 fail (D1); all other release-blocking ids pass.

## Defects, ranked

Severity: **Critical** blocks the demo (review/06 §d3 release-blocking set), **High** fix before Harvest sees it, **Medium** fix in this pass if time allows, **Low** polish. Owner by the BUILD-BRIEF table (lead = shared shell/server files). Every item names the test that fails; none of the tests was loosened.

### D1 · Critical · any session becomes a presenter or an administrator without a credential (lead: `web/js/api.js`, `server/psyflo/authz.js`)
- **What.** `web/js/api.js` (init, lines 66-67, and `_legacyChanged`, line 80) signs the browser in as whichever roster id is in `localStorage.psyflo_user`, with `presenter: true`, on every page load and whenever the key changes. No PIN is set by default (`GET /api/config` shows `"pin": false`). A presenter session holds `demo.controls`, and `user.update` is `any: ['admin.users','demo.controls']`, so a presenter alone may change a role.
- **Reproduce (UI).** Sign in as `khale` (direct support), open the console, run `localStorage.setItem('psyflo_user','dowens')`: two seconds later `window.psyflo.session.actor` is `{id:'dowens', role:'admin', presenter:true}`. Or, with `khale`'s own session, reload the page: `actor.presenter` becomes `true`; the dock (Reset, Simulate, Advance day) appears.
- **Reproduce (API, with the token the reloaded page holds).** `demo.advanceDay` answers 200, `request.demoReply {id:'R-0408', kind:'approved'}` answers 200 (records a payer approval), `demo.reset` answers 200, and `user.update {id:'khale', patch:{role:'admin'}}` answers 200 and `khale` is an administrator afterwards.
- **Tests.** `safety › URA-05`, `URA-06`, `URA-10 / SVR-09`, `SVR-09`. 05b marks URA-05, URA-06 and URA-10 release-blocking.
- **Why it matters.** The server-side sessions of the foundation are meant to make roles real; this path makes the role a client choice again. `roles.mjs` does not see it because it mints sessions through the API with `presenter:false`.
- **Fix.** The client must never send `presenter:true` on its own: presenter only through the dock or `?present=1` plus a PIN (set `PRESENTER_PIN` by default for the demo machine, shown on the presenter's screen); `user.update` role changes need `admin.users` AND presenter; `_legacyChanged` should not mint a session for an id the current session does not own. Until then, run the demo with `DEMO_PRESENTER=0` (and use the checkpoint fixtures through the test harness) or set `PRESENTER_PIN`.

### D2 · High · the initial-request draft invents numbers when the school's counts and the screening facts are missing (lead: `web/js/shared/draft.js`, `draftInitialSRA`)
- **Reproduce.** `draftInitialSRA({client:{initials:'X.Y.'}, screening:{facts:{},when:'2026-10-20'}, referral:{id:'REF-9'}, school:null, today:'2026-10-29', request:{id:'R-1',units_requested:150}})`: criterion 1 reads "In the last 30 days X.Y. was physically aggressive toward peers on repeated occasions, , lasting ?, moderate intensity; 2 office referrals and 1 day of in-school suspension followed." Nobody supplied "moderate", "2 office referrals" or "1 day of in-school suspension"; the sentence also carries empty slots (", , lasting ?").
- **Test.** `safety › ICE-04` (05b ICE-04; Part 17 "nothing invented"). Expected: "Evidence missing — verify …" until the school's numbers exist.
- **Fix.** Build the sentence from `screening.facts` and `school` only, and print "Evidence missing — verify" when either is absent (the other six boxes already do).

### D3 · High · an Availity appeal is shown as sent before any portal confirmation (E3: `DenialCase.js` `sendFlow`, `dispute.send`)
- **Reproduce.** Canvas preset, `jperez`: `#/DenialCase?id=R-0384&section=action&action=appeal` → Draft again from records, edit the missing items, Mark reviewed; guardian signs (`#/AppealLetter?id=R-0384` as E.C.'s guardian); staff press **Mark ready for upload** → **Mark ready**. State: `stage: appeal_sent`, `appeal.status: sent`, `appeal.ref: "portal-upload"`; the case reads "Sent Oct 29, 3:30 pm · portal-upload"; the guardian page says "Submitted by staff". The event text is accurate ("ready for the clinician to upload in Availity (simulated)") but nobody uploaded anything and the mock Availity page never confirmed.
- **Test.** `s5 › 11b` (soft step, reported once). K.T.'s information reply does it right: the case closes only when the portal page confirms.
- **Fix.** Keep the stage `denied` (appeal status `ready_to_upload`) until `portal.observed` for this request; show "Sent" only then (rule 1 of BUILD-BRIEF).

### D4 · High · the demo clock and the s3 scenario disagree with the fixture and with the UI path (lead: `x-foundation.js` tweak `s3-draft`; E5 for the drafted dates)
- **Reproduce.** `demo.scenario {id:'s3'}` (canvas + tweak) versus `{id:'tw-isp-ready'}`: T.W.'s client stage is `in_service` (fixture and UI path: `intake`), and the drafted request dates in the SRA panel are "10/27/2026 – 01/23/2027", two days BEFORE today (Oct 29). The fixture and the fresh path draft "10/30/2026 – 01/26/2027".
- **Tests.** `s3[scenario] › 4b` and `S3 parity` (first and last state: `twStage`). The presenter dock starts the run sheet's S3 from this scenario, so the audience would see a request that starts in the past.
- **Fix.** Make `s3-draft` clear the canvas dates and set T.W.'s stage to `intake`, or start S3 from `tw-isp-ready` (live preset).

### D5 · Medium · small groups reach the administrator outside the tables (E4: `Analytics` payer strip)
- **Reproduce.** `dowens` → `#/Analytics?section=payer`: the strip prints "Partial 3" and "Denied 1". The tables print "Fewer than 5" for the same cells; the minimum group size is 5 in every role (Part 12.6).
- **Test.** `s6 › 4c` (soft step). **Fix.** Pass the strip counts through the same suppression as the panel cells.

### D6 · Medium · the case's Evidence section says nothing is missing while the panel lists gaps (E2: `Authorization.js` Evidence section)
- **Reproduce.** `jperez` → `#/Authorization?id=R-0411&section=evidence`: "3 sources · 0 missing … Nothing missing in the stored record". The Scan & Enhance panel on the same request lists 8 gaps in the default period (7 school days with no daily note, a missing weekly call, a note whose text Psyflo does not hold).
- **Test.** `s4 › 8b` (soft). **Fix.** Read the gaps from `evidenceIndex` in the case.

### D7 · Medium · the processed daily note carries the unconfirmed block (E5/E7: the Contact time box)
- **Reproduce.** S1 from the phone dictation to Process Form. The typed and processed Contact time ends with "1:40 pm–3:10 pm · Afternoon classes, transitions (unconfirmed)", while Direct time (3 h 40 min) and units (2) rightly exclude it. A processed note now lists a block nobody confirmed (write-once).
- **Test.** `s1 › 5b` (soft). **Fix.** Type only the confirmed rows; list the unconfirmed block in the panel, not in the note.

### D8 · Medium · a guardian page opens for any child with no link (E6 + lead: `web/js/api.js` lines 57-60)
- **Reproduce.** A fresh browser with no session: `#/ParentProgress?c=MR` shows "How M.R. is doing … Met on 41 of 61 school days this quarter" (the removed "61" constant is still in the family portal copy). The client signs in as that child's guardian presenter. 05b URA-11 expects a valid token and no fallback child.
- **Test.** `safety › URA-11`. **Fix.** Same as D1 (no presenter without the PIN); the family page should say "open your link" without `?c=` plus a presenter session.

### D9 · Medium · the mock Lauris accepts a daily note with no units available (E7: `server/lauris/store.js`)
- **Reproduce.** `POST /consumers/3402/session/dpn` as `jperez` (T.N., 0 of 65 available): processed, no warning (05b IIU-11). **Test.** `safety › IIU-11`.

### D10 · Medium · the renewal due date is the end date, not the rule (E1/E2: My Work, `sel/mywork.js`)
- **Reproduce.** `jperez` → My Work → Show all: "Continued stay · M.R. … Renew by Nov 13"; `continued_stay.lead_business_days` is 14, which gives Oct 26. **Test.** `safety › EXA-02`.

### D11 · Low · more places where the demo does not say what it knows
- **WPS-06** (E5): `khale` opening D.W.'s daily note in Lauris sees D.W.'s identity and the note types, "Open a student in Lauris to start", but never "not on your caseload". The server refuses the dictation (WPS-05 passes).
- **SVR-05** (E7): the microphone prompt says where the audio goes ("the browser maker's speech service hears the audio") but the phone screens carry no "Demo data · nothing is real" line and the prompt has no synthetic-data warning.
- **UAR-05** (lead): five source chips carry no date: "Request record", "Assessments on the record", "School portal · counts from the counselor", "ISP 2.0 (in Lauris)", "Intake / CNA".
- **IIU-07** (lead, seed): T.N. has used 65 of 65 units but `authorization.exhausted` is 2026-11-24.
- **S5 first state** (E3, seed): D.W. already holds 110 units in Psyflo's tracker and in the mock Lauris while R-0402 is "Partial: decide"; the offer is not an award (06 §b S5 gap 15).
- **S4** (E5): Exclude with an empty reason posts to the server and shows the 422 as a console error; validate before the call.
- **Docs** (lead): the orphan removals `request.set` and `request.p2pOutcome`, the v3 `/payers` routes and "Help" are dropped with a reason in 04b/06c but are not itemised in 00-unified-recommendations §3.

### Not defects, but worth knowing
- `EXA-06` is NOT-RUNNABLE: the 31-day lapse rule is displayed text (transition section) and no queue or banner flags a lapse. `SVR-10` is v3-only.
- The pilot measure "Time to document" shows "—, No capture events yet" in every start mode; it cannot move until the extension reports capture events.


## 5. What I could not test

- The MV3 side panel in real Chrome, the live microphone and Web Speech, Safari and Firefox, a venue network and fonts: the manual checklist stays PENDING; the panel was driven in its in-page mode only.
- `audit`, `hosted` and `presenter` (other owners' long suites) were not run; `a11y` and `visual` were run and are reported above, not triaged.
- EXA-06 (31-day lapse flag) and SVR-10 (v3 entry point) are NOT-RUNNABLE: the first because no screen flags a lapse, the second because it only exists in the v3 demo.
- S2 step 1: REF-118 already exists in the seed (received Oct 13), so the school step asserts the status view and a new referral through the form (REF-122) instead of creating REF-118 itself.
- "Time to document" cannot move until the extension reports capture events; the pilot scorecard shows "—" in every start mode.
- The parity probes prove that each ported or replaced feature is present and reachable; they do not re-prove its internal behaviour for the ids whose "suite" column names a plan that has no suite yet (3 ids rest on suites alone, marked in the notes column).
- Panel-dependent steps (S1 to S4, safety WPS, URA, DSL) ran against the panel files as of 17:17; no file under `web/panel/` or `web/js/screens/Ext*.js` changed afterwards.
