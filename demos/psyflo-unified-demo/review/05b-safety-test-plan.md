# 05b · Safety test plan (Part 19.4 categories)

Companion to `05-safety-and-data-integrity.md`. Each case is automatable against the master as it stands and must also pass against the unified build. "Now" is the result on the Nov 8 master, where I ran it (*run*) or determined it from the cited code (*code*). Where the feature does not exist the result is NOT-RUNNABLE.

## Harness

- Start: `APP_PORT=4750 LAURIS_PORT=4751 EXT_PORT=4752 DATA_DIR=<tmp> node server/index.js`. Base `APP=http://localhost:4750`, `LAURIS=http://localhost:4751`.
- API helper: `act(action,args)` = `POST ${APP}/api/do {action,args}` returning `{ok,result|error}`; `state()` = `GET ${APP}/api/state`. Reset: `act('demo.reset',{preset:'live'|'canvas'})`.
- Lauris mock over HTTP: header `Cookie: lauris_user=<staffId>`; forms are `application/x-www-form-urlencoded` (`session_id`, `action=save|process`, `f<index>` fields).
- Browser: Playwright (`/opt/node22/lib/node_modules/playwright`); sign in by `localStorage.psyflo_user=<staffId>`; Lauris pages load the in-page panel (`#psyflo-frame`). Role test ids: `khale` direct support, `cdiaz` supervisor, `jperez` clinician, `dowens` admin.
- Seed ids: clients `TW MR DW KT TN EC JT PG`; requests `R-0416` (T.W., Humana, fax) `R-0411` (M.R. continued stay, Anthem, draft_ready) `R-0408` (K.T. information request) `R-0402` (D.W. partial, Sentara, fax) `R-0399` (overdue, Humana) `R-0388` (T.N. peer-to-peer) `R-0384` (E.C. denied, Anthem) `R-0377` (P.G. outpatient); Lauris `#3310` M.R., `#4102` D.W., `#3402` T.N., `#4300` P.G. (outpatient), `#5120` H.B. (SEBS), `#3315` J.T.; referral `REF-118` (T.W.).
- In the unified build the same cases should be expressed against the new endpoints; the **Expected** column is the acceptance standard.

## 1. Wrong-patient selection

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| WPS-01 | live; dictation waiting for `MR` | `dictation.save {client:'MR',staff:'khale',spoken:'…'}`; as `khale` POST `/consumers/new` initials `M.R.` `no=9001`; open `/consumers/9001/session/dpn` | Panel refuses (Harvest # 9001 is not M.R.'s 3310); nothing typed; identity card shown | FAIL-NOW (*run*): narrative typed into #9001 |
| WPS-02 | live | Open a Lauris consumer whose number is unknown and initials equal an existing client | "Not a Psyflo student"; no draft | FAIL-NOW (*run*, same root cause) |
| WPS-03 | any | Sign in as `jperez`, open `#/MobileApp` | Blocked, or acts as `jperez`; never as `khale` | FAIL-NOW (*run*): shows K. Hale's timer |
| WPS-04 | `khale` signed in | `#/MobileDictate?client=DW` (S. Lane's student) | Denied: not on caseload | FAIL-NOW (*run*) |
| WPS-05 | live | `act('timer.start',{staff:'khale',client:'DW'})` | Rejected: not on caseload | FAIL-NOW (*run*): accepted |
| WPS-06 | `khale` in Lauris | Open `/consumers/4102/session/dpn` | Panel shows "not on your caseload"; no draft | PASS-NOW (*run*) for the panel; the Lauris mock itself opens the form |
| WPS-07 | any fill | Before any fill, a confirmation card shows initials, Harvest #, school and birth year | Card present; fill disabled until confirmed | NOT-RUNNABLE (absent) |
| WPS-08 | live, `R-0411` signed and sent by portal | `act('portal.observed',{ref:'X'})` with no request id | Rejected (no matching request) | FAIL-NOW (*run*): attached to R-0411 |
| WPS-09 | live | Panel on outpatient `#4300` and SEBS `#5120` as `jperez` | "Psyflo is off for this record"; nothing read or typed | PASS-NOW (*run*) |

## 2. Incomplete clinical evidence

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| ICE-01 | none | `draftScreening` on a non-scripted transcript (anxiety, school refusal) | Missing boxes listed as questions; "Nothing invented" not shown as PASS with 0 boxes | FAIL-NOW (*run*): 0 boxes, vacuous PASS |
| ICE-02 | none | Scripted transcript with prior provider but no outcome (`test/draft.test.mjs` case 3) | Draft blocked with the question | PASS-NOW (*run*) |
| ICE-03 | canvas; `MR` has 1 stored note | Open M.R. continued stay (`/consumers/3310/session/sra-continued`) | Counts equal stored notes; otherwise "Evidence missing" | FAIL-NOW (*run*): "21 daily notes"/"61" |
| ICE-04 | none | `draftInitialSRA` with `school:null` | Criterion 1 blocked until the school's numbers exist | FAIL-NOW (*run*): drafted with "repeated occasions" |
| ICE-05 | canvas | `draft('discharge',{client:{initials:'T.N.'},today:'2026-10-29'})` | No event dated after today is written as done | FAIL-NOW (*run*): "Guardian notified … Nov 24 and Dec 5" |
| ICE-06 | none | `enhanceDictation {text:'Talked to mom about the bus.'}` | Question: which ISP objective, how long, what you did; no objective inserted | FAIL-NOW (*run*): Objective 1 added |
| ICE-07 | none | Initial SRA draft (`test/draft.test.mjs` case 6) | Criterion 3 blank when 1 and 2 met; trauma-informed care never drafted | PASS-NOW (*run*) |
| ICE-08 | none | Quarterly draft for a client with no `quarter` data | Blank with "No data" | FAIL-NOW (*run*): falls back to M.R.'s numbers |

## 3. Unsupported AI recommendations

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| UAR-01 | none | `enhanceDictation {text:'We played basketball at recess and he got upset and mad.'}` | Output contains only stated facts; every added phrase has a resolvable source | FAIL-NOW (*run*): invented times, events, outcomes |
| UAR-02 | none | `{text:'He ran laps and was frustrated with me.'}` | No basketball narrative | FAIL-NOW (*run*) |
| UAR-03 | none | `{text:'I observed her at lunch and she sat alone.'}` | Word flagged, question asked, text unchanged | FAIL-NOW (*run*): "worked with" substituted |
| UAR-04 | none | Search UI and code for predicted success percentages or research citations in drafts | None | PASS-NOW (*code*, grep) |
| UAR-05 | none | For every box in each draft type, resolve each `src` n to a stored record | All resolve; sources carry dates | FAIL-NOW (*run*): fixed labels |
| UAR-06 | none | Clinician-only boxes (trauma-informed care, admission decision, diagnosis) | Never drafted | PASS-NOW (*run*, ICE-07) |
| UAR-07 | canvas | Press "Good recommendation"/"Needs improvement" | Stored and visible to the supervisor | PASS-NOW (*code*, `panel.feedback`) |

## 4. Enhancement of a previously finalized note

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| EFN-01 | live; J.T. `#3315` processed DPN id from `/consumers/3315?tab=active` | POST save to `/consumers/3315/session/dpn` with that `session_id` | 409; text unchanged | FAIL-NOW (*run*): overwritten |
| EFN-02 | same | POST `action=process` twice for the same session with Units 3 | Rejected; units unchanged | FAIL-NOW (*run*): 41 → 35 |
| EFN-03 | same | GET `/consumers/3315/session/dpn?id=<processed>` | Read-only view | FAIL-NOW (*run*): editable form |
| EFN-04 | same | In the Active File tab, open the processed note | "View" read-only | PASS-NOW (*run*) |
| EFN-05 | canvas | `consent.sign` twice for `MR` with different signers | Both signatures kept; second refused or versioned | FAIL-NOW (*run*): first replaced |
| EFN-06 | canvas | `request.infoSend` then `request.infoReply` on `R-0408` | Sent text immutable; `sent_at` kept | FAIL-NOW (*run*): `sent_at` dropped |
| EFN-07 | canvas | `request.set {id:'R-0416',patch:{units_requested:1}}` | Rejected | FAIL-NOW (*run*): applied, no event |
| EFN-08 | none | Historical evidence review (Mode B) of a processed note list | Read-only evidence index, flags stored beside notes | NOT-RUNNABLE (absent; master continued stay is canned) |
| EFN-09 | build with `addendum.enabled=false` | Attempt to save text to a processed id by any route | Refused; UI says "Addendum workflow not enabled" | NOT-RUNNABLE (master has none; v3 offers "Save as addendum", *code*) |
| EFN-10 | none | Signed form re-sign or reject in Lauris mock | Refused | FAIL-NOW (*run*): signer replaced; reject after sign |

## 5. Missing clinician signature

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| MCS-01 | live | `request.ensure` (client `TN`, payer `humana`) → `lauris.observed` processed → `lauris.observed` signed (user "Unknown Person") → `request.send` | Every step after Process Form refused without an authenticated bridge session and an LMHP signer | FAIL-NOW (*run*): fax receipt issued |
| MCS-02 | live | `request.signed {id:'R-0411'}` while `draft_ready` | Rejected (not processed) | FAIL-NOW (*run*) |
| MCS-03 | live | Direct support (`khale`) presses Process Form then Get Signature on M.R.'s continued stay in Lauris | Lauris refuses a non-LMHP signer; Psyflo shows "signature by non-licensed user: hold" | FAIL-NOW (*run*): Lauris signs; Psyflo writes "Jordan Perez, LPC" |
| MCS-04 | live | Compare signer on the PDF and timeline with the Lauris signer | Identical name and credential | FAIL-NOW (*run*) |
| MCS-05 | live | `request.send {id:'R-0411'}` while `draft_ready` | Rejected | PASS-NOW (*run*) |
| MCS-06 | live | `request.set {id:'R-0408',patch:{stage:'signed'}}` | Rejected | FAIL-NOW (*run*) |
| MCS-07 | none | Internal approval step recorded before Process Form (approver ≠ author) | Required for initial and continued SRAs | NOT-RUNNABLE (absent) |
| MCS-08 | live | `consent.sign` for `DW` with `signer:'Anyone At All'` and no token | Rejected | FAIL-NOW (*run*) |
| MCS-09 | live | `request.send {by:'whoever'}` on a signed request | Actor taken from the session; non-sender role refused | FAIL-NOW (*run*) |
| MCS-10 | canvas | `request.appealSign` on `R-0402` (a partial, not a denial) | Rejected (no denial); no "faxed" event without Send | FAIL-NOW (*run*) |

## 6. Unauthorized role access

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| URA-01 | `khale` | Open `#/Authorizations` | Denied | PASS-NOW (*run*, UI only) |
| URA-02 | no session | `act('request.send',…)`, `act('user.update',…)` | 401 | FAIL-NOW (*run*) |
| URA-03 | `dowens` | Open `/consumers/3310/session/sra-continued` | Panel: "not permitted" | FAIL-NOW (*run*): clinical draft shown |
| URA-04 | `dowens` | Open Referrals, Eligibility, Analytics child block | Denied or aggregate only | FAIL-NOW (*run*) |
| URA-05 | `khale` | Set `localStorage.psyflo_user='dowens'` | Server rejects actions for `khale`'s session | FAIL-NOW (*run*): UI grants admin |
| URA-06 | live | `user.update {id:'khale',patch:{role:'admin'}}` | Admin-only, two-person | FAIL-NOW (*run*) |
| URA-07 | cross-origin | `fetch(APP+'/api/do',{method:'POST',headers:{'Content-Type':'text/plain'},body:…})` from another origin | Blocked (CORS allow-list, JSON-only) | FAIL-NOW (*run*) |
| URA-08 | any | `GET /api/state` without a session | 401 or a role projection | FAIL-NOW (*run*) |
| URA-09 | live; pending note `rq-lb-1029` (R. Owens) | `note.review {id,decision:'approved',by:'rowens'}` | Author cannot review own note | FAIL-NOW (*run*) |
| URA-10 | live | `request.demoReply {id:'R-0402',kind:'approved',units:150}` as non-admin | Refused; demo mode only | FAIL-NOW (*run*) |
| URA-11 | no staff session | `#/ParentProgress?c=DW` | Needs a valid token; no fallback child | FAIL-NOW (*run*) |
| URA-12 | `khale` | Phone dictation or timer for a non-caseload student by API | Refused | FAIL-NOW (*run*, WPS-05) |
| URA-13 | `jperez` | Press every route in the registry | Matches matrix in 05 section 5 | PASS-NOW (*run*) for the UI rows of the current model |

## 7. Payer deadline uncertainty

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| PDU-01 | live; `R-0411` signed and sent | Open `#/Submission?id=R-0411` | Clock reads "Day N"; due date labelled with its rule source and status ("7 days, unverified for this payer"); red only after the configured date | FAIL-NOW (*code*): "7-calendar-day decision clock" stated flatly |
| PDU-02 | canvas | Advance the clock 3 days; open `R-0408` (24 h information request) | State "missed" with the payer's stated due time | FAIL-NOW (*run*): "0 h left of 24", stage unchanged |
| PDU-03 | canvas | Advance 1 day; `R-0416` | Overdue notice drafted, flagged as a person's action | PASS-NOW (*run*) |
| PDU-04 | canvas | Open the overdue-notice modal | Notice does not assert a rule as law; rule cited with status | FAIL-NOW (*code*): "Under the 7-calendar-day…" |
| PDU-05 | build | Per-payer override of the decision window changes every dependent date | Dates recompute from the rules table | NOT-RUNNABLE (absent) |
| PDU-06 | live | Humana receipt-check day | One rule (day 10 per Harvest) in code, UI and BRIEF | FAIL-NOW (*code*): day 5 |
| PDU-07 | canvas | Information request received on a Friday 5 pm | Due text states calendar or business hours | FAIL-NOW (*code*): 24 clock hours |

## 8. Invalid or inconsistent units

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| IIU-01 | none | `unitsForDirectMinutes` at 60, 90, 119 | 0 (official band starts at 120) | FAIL-NOW (*run*): 1 |
| IIU-02 | none | At 120, 179, 180, 299, 300 | 1, 1, 2, 2, 3 | PASS-NOW (*run*): 120→1, 179→1, 180→2, 299→2, 300→3 (the master's error is only below 120, IIU-01) |
| IIU-03 | canvas | `request.p2pLog {id:'R-0384',outcome:'approved',units:-5}`, `'abc'`, `10000` | Rejected: 0 ≤ units ≤ requested, integer | FAIL-NOW (*run*) |
| IIU-04 | canvas | `request.partialChoice stretch {until:'2020-01-01',per_week:-3}` | Rejected | FAIL-NOW (*run*) |
| IIU-05 | canvas | `plan.set` with discharge in the past and intake before discharge | Rejected | FAIL-NOW (*run*) |
| IIU-06 | canvas | `eligibility.record {result:'banana',plan:'nonexistent'}` | Rejected | FAIL-NOW (*run*) |
| IIU-07 | canvas | T.N. authorization `used 65 of 65`, `exhausted 2026-11-24` | One consistent exhaustion date | FAIL-NOW (*run*, seed) |
| IIU-08 | canvas | D.W. early discharge dates vs the Lauris discharge panel and drafted discharge date | Same dates; holiday calendar applied | FAIL-NOW (*run*): Dec 18 / Dec 8 / Dec 5 |
| IIU-09 | live | `note.processed {units:99}` by API | Units validated against the day's recorded direct time | FAIL-NOW (*run*) |
| IIU-10 | none | Timer blocks marked non-direct (lunch, transport) | Excluded from direct time | NOT-RUNNABLE (absent) |
| IIU-11 | live | Lauris mock: process a daily note when `available=0` or after the authorization end date | Warning or refusal | FAIL-NOW (*code*, `lauris/store.js:120`) |

## 9. Expired authorizations

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| EXA-01 | canvas | M.R.: 27 units left at 3 a day, end date Nov 13 | Banner: units end about Nov 10, before the end date | FAIL-NOW (*code*): shows "9 school days of units" only |
| EXA-02 | canvas | `R-0411` renewal due vs end − 14 business days (Oct 26) | Rule and seed agree or rule is off | FAIL-NOW (*run*): `renew_by` = Nov 13 |
| EXA-03 | canvas | T.N. (units exhausted) | "Service continues unpaid" shown with date and owner | PASS-NOW (*code*, `PeerBrief.js:35`) |
| EXA-04 | canvas | Advance past `R-0384`'s appeal window | Window closed, not negative days | FAIL-NOW (*code*): count continues |
| EXA-05 | canvas | Eligibility re-check due | Appears in Do next | PASS-NOW (*code*) |
| EXA-06 | none | Services after a lapse of more than 31 days | Discharge review flagged | NOT-RUNNABLE (absent) |

## 10. Data disclosure across service lines

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| DSL-01 | live | Extension on `#4300` (outpatient) and `#5120` (SEBS) | Off | PASS-NOW (*run*) |
| DSL-02 | `dowens` or `jperez` | `#/Authorizations` Active filter | No outpatient rows in a TDT view | FAIL-NOW (*run*): P.G. R-0377 |
| DSL-03 | none | Payer-facing continued-stay draft, defaults | Household sentence absent until a clinician decides | FAIL-NOW (*run*/*code*): Include preselected |
| DSL-04 | canvas | `quarterly.internalSave`, then `GET /api/state` as guardian/school | Internal quarterly absent | FAIL-NOW (*run*) |
| DSL-05 | school user for LC-MS2 | `school.share {client:'MR'}` (another school) | Rejected | FAIL-NOW (*code*): any client accepted |
| DSL-06 | none | SEBS or outpatient referral appears in PsyFlo state | None | PASS-NOW (*run*): H.B. absent |
| DSL-07 | none | Counselor update in a daily note without a signed school release | Release blank, banner shown | PASS-NOW (*code*, `panel.js:614`) |
| DSL-08 | canvas | Analytics child block by role | Aggregate unless clinical role with caseload | FAIL-NOW (*run*) |
| DSL-09 | none | `GET /files/<consent pdf>` unauthenticated | 401 | FAIL-NOW (*code*) |

## 11. Simulated versus real integrations

| ID | Preconditions | Steps | Expected | Now |
|---|---|---|---|---|
| SVR-01 | live | Send a signed fax request | Event and receipt carry a visible "Simulated" marker and a person as actor | FAIL-NOW (*run*): actor "Sfax" |
| SVR-02 | canvas | `request.overdueNotice`, `request.infoSend {via:'fax'}`, `request.appealSign` (fax payer) | No "faxed/sent" event unless the Send stub ran and returned a reference | FAIL-NOW (*run*) |
| SVR-03 | none | `/dmas/lookup` page | Demo banner | PASS-NOW (*code*) |
| SVR-04 | none | Notes drawer text for screens 14, 15, 23, 34 | No claim of AI, OCR or Sfax read-back unless implemented | FAIL-NOW (*code*): "AI rewrite", "OCR" |
| SVR-05 | none | Speech-to-text control | Label states where audio goes; synthetic-data warning | FAIL-NOW (*code*) |
| SVR-06 | none | Analytics baseline | Banner "Illustrative", not "Harvest's Lauris export" | FAIL-NOW (*run*) |
| SVR-07 | none | Search code for stored credentials or unattended sessions | None | PASS-NOW (*code*, grep) |
| SVR-08 | none | Bridge clicks Process Form, Get Signature or Send | Never | PASS-NOW (*code*, `bridge.js`) |
| SVR-09 | `khale` | Open demo controls (reply, advance, reset) | Hidden and refused | PASS-NOW (UI) / FAIL-NOW (API) (*run*) |
| SVR-10 | v3 | Call `PSY.submit5.submit('R-0416')` while unsigned | Refused | FAIL-NOW (*run*, v3): status draft → pending |

## Regression anchors (must keep passing)

`npm test` (6 drafting tests; case 5 must change from "rewritten" to "flagged"), `node test/smoke.mjs`, `flowA`-`flowD`, `panels`. Baseline results are in `review/baseline-tests.txt`.
