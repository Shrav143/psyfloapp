# Safety results · review/05b-safety-test-plan.md

Generated from the run logs in `../../../../../tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/results-qa2` by `test/lib/safety-report.mjs`. 100 case ids. PASS 87 · FAIL 11 · NOT-RUNNABLE 2.

The "proof" column names the suite and the test title that proves the id; `safety` is test/safety.mjs (QA2), `gates` and `roles` are the existing suites. A FAIL is a product defect against the 05b "Expected" column (see qa2-findings.md for owner and reproduction). The release-blocking set of review/06 §d3 is marked **RB**.

| Id | RB | Result | Proof (suite › test) | Why it fails |
|---|---|---|---|---|
| WPS-01 | **RB** | PASS | gates › WPS-01 a Lauris record with an unknown Harvest # is never matched by initials: no draft, no note, dictation st [PASS] |  |
| WPS-02 | **RB** | PASS | gates › WPS-02 the right Harvest # with the wrong initials on the page is a hard stop (audited), nothing applied [PASS] |  |
| WPS-03 |  | PASS | safety › WPS-03 a clinician opening the phone app acts as the clinician (own caseload), never as another person [PASS] |  |
| WPS-04 |  | PASS | safety › WPS-04 a student off the caseload cannot be opened on the phone: "not on your list. Nothing was opened." [PASS] |  |
| WPS-05 |  | PASS | gates › WPS-05 a timer or dictation for a student off the caseload is refused [PASS] |  |
| WPS-06 |  | FAIL | safety › WPS-06 direct support opens another staffer's student in Lauris: the panel says the student is not on the case [FAIL] | the panel prints why nothing is offered; it printed: Scribe · Daily progress note Lauris connected Direct support D.W. Harvest #4102 TDT · Daily progress note Draft · not saved green · already in Lauris yellow · Psyflo typed, check it Home NOTE Daily progress  |
| WPS-07 |  | PASS | safety › WPS-07 the panel always shows an identity card (initials, Harvest #, school) before it offers anything; a page [PASS] |  |
| WPS-08 | **RB** | PASS | gates › WPS-08 a portal confirmation needs its request, and an issued reference [PASS] |  |
| WPS-09 |  | PASS | safety › WPS-09 / DSL-01 the panel is off for an outpatient (#4300) and a SEBS (#5120) record: nothing read, nothing ty [PASS] |  |
| ICE-01 |  | PASS | safety › ICE-01 a non-scripted screening transcript drafts nothing it was not told; the missing boxes are listed as que [PASS] |  |
| ICE-02 |  | PASS | unit › Flow A · an empty prior-service outcome blocks and asks [PASS] |  |
| ICE-03 | **RB** | PASS | safety › ICE-03 M.R. continued stay: every count equals the stored rows (40 daily notes), the constants 21 and 61 do no [PASS]; enhance › counts are computed from rows and open their rows; the "61 notes" figure does not exist [PASS] |  |
| ICE-04 |  | FAIL | safety › ICE-04 an initial SRA drafted without the school's numbers or the screening facts does not draft criterion 1 ( [FAIL] | criterion 1 was drafted as: "In the last 30 days X.Y. was physically aggressive toward peers on repeated occasions, , lasting ?, moderate intensity; 2 office referrals and 1 day of in-school suspension followed." |
| ICE-05 |  | PASS | safety › ICE-05 a discharge draft with no stored plan writes no event as done (no date after today) [PASS] |  |
| ICE-06 |  | PASS | safety › ICE-06 a dictation that names no objective, time or intervention gets questions, and no objective is inserted [PASS] |  |
| ICE-07 |  | PASS | unit › Flow C · initial SRA leaves criterion 3 blank when 1 and 2 are met, and never drafts trauma-informed care [PASS] |  |
| ICE-08 | **RB** | PASS | safety › ICE-08 a quarterly draft for a client with no stored notes is blank with "Evidence missing", never another stu [PASS] |  |
| UAR-01 | **RB** | PASS | safety › UAR-01 the drafted narrative adds nothing the staffer did not say ("We played basketball at recess a…"); "obse [PASS] |  |
| UAR-02 | **RB** | PASS | safety › UAR-02 the drafted narrative adds nothing the staffer did not say ("He ran laps and was frustrated w…"); "obse [PASS] |  |
| UAR-03 | **RB** | PASS | safety › UAR-03 the drafted narrative adds nothing the staffer did not say ("I observed her at lunch and she …"); "obse [PASS] |  |
| UAR-04 |  | PASS | safety › UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source [PASS] |  |
| UAR-05 | **RB** | PASS | safety › UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve t [PASS] |  |
| UAR-06 |  | PASS | unit › Flow C · initial SRA leaves criterion 3 blank when 1 and 2 are met, and never drafts trauma-informed care [PASS] |  |
| UAR-07 |  | PASS | safety › UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician [PASS] |  |
| EFN-01 | **RB** | PASS | gates › EFN-01..03 Lauris: a processed session cannot be written, processed again, or opened for editing [PASS] |  |
| EFN-02 | **RB** | PASS | gates › EFN-01..03 Lauris: a processed session cannot be written, processed again, or opened for editing [PASS] |  |
| EFN-03 |  | PASS | gates › EFN-01..03 Lauris: a processed session cannot be written, processed again, or opened for editing [PASS] |  |
| EFN-04 |  | PASS | gates › EFN-04 Psyflo: a repeated processed event for a session changes nothing; the note stays unchanged [PASS] |  |
| EFN-05 |  | PASS | gates › EFN-05 consent: a second signature is kept as a new version, the first record and file stay [PASS] |  |
| EFN-06 |  | PASS | gates › EFN-06/07 a sent reply is write-once; patch actions and record rewrites are refused [PASS] |  |
| EFN-07 |  | PASS | gates › EFN-06/07 a sent reply is write-once; patch actions and record rewrites are refused [PASS] |  |
| EFN-08 |  | PASS | enhance › Mode B (historical) stores an analysis, refuses any fill or write, and exposes no fill action [PASS]; s4 › S4[scenario] · 2 Scan & Enhance › Evidence review (Mode B): read-only, Psyflo's own copies; NO fill, approve o [PASS] |  |
| EFN-09 | **RB** | PASS | safety › EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route [PASS] |  |
| EFN-10 |  | PASS | gates › SIGNED is final: a second signature event or a reject after signing is refused (Lauris and Psyflo) [PASS] |  |
| MCS-01 | **RB** | PASS | gates › MCS-01 Process Form (observed) lands in Pending clinical approval; nothing can be signed or sent from a client [PASS] |  |
| MCS-02 | **RB** | PASS | gates › MCS-02 a second Process Form for the same request is an anomaly, not a second processed state [PASS] |  |
| MCS-03 | **RB** | PASS | gates › MCS-03 a direct-support user cannot sign in Lauris, and a forged signed event is not believed [PASS] |  |
| MCS-04 | **RB** | PASS | gates › MCS-08 approval: only a designated approver; the signer on the signed PDF and the events is the one read from  [PASS] |  |
| MCS-05 |  | PASS | gates › MCS-01 Process Form (observed) lands in Pending clinical approval; nothing can be signed or sent from a client [PASS] |  |
| MCS-06 |  | PASS | gates › MCS-01 Process Form (observed) lands in Pending clinical approval; nothing can be signed or sent from a client [PASS] |  |
| MCS-07 |  | PASS | gates › MCS-07 signed in Lauris BEFORE the internal approval: held, not marked signed, Send blocked [PASS] |  |
| MCS-08 |  | PASS | safety › MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is th [PASS] |  |
| MCS-09 | **RB** | PASS | gates › MCS-09 send: a person with send.packet presses it; the actor is the session, never args.by; the event is simul [PASS] |  |
| MCS-10 |  | PASS | safety › MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and [PASS] |  |
| URA-01 |  | PASS | safety › URA-01 direct support opening Authorizations is told the screen is not available for the role (no data) [PASS] |  |
| URA-02 | **RB** | PASS | roles › anonymous: /api/state, /api/do (admin and plain actions), /files and the roster [PASS] |  |
| URA-03 |  | PASS | safety › URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has n [PASS] |  |
| URA-04 |  | PASS | safety › URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates on [PASS] |  |
| URA-05 | **RB** | FAIL | safety › URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowe [FAIL] | localStorage.psyflo_user='dowens' signed the khale page in as dowens (admin): the client mints a session for any roster id with no credential (web/js/api.js _legacyChanged) expected "khale" but got "dowens" |
| URA-06 | **RB** | FAIL | safety › URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capab [FAIL]; roles › user.update: a role change is presenter-only; designations go through two people [PASS] | user.update by a direct-support presenter session answered 200; khale's role afterwards: admin |
| URA-07 | **RB** | PASS | roles › cross-origin: JSON only and an origin allow-list on state-changing calls [PASS] |  |
| URA-08 | **RB** | PASS | roles › anonymous: /api/state, /api/do (admin and plain actions), /files and the roster [PASS] |  |
| URA-09 |  | PASS | gates › URA note review: not your own note; a decision is write-once; only the assigned reviewer or a supervisor [PASS] |  |
| URA-10 | **RB** | FAIL | safety › URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo co [FAIL]; gates › presenter actions are refused without presenter mode; the demo reply is recorded as simulated with a demo refe [PASS] | after one reload the direct-support session was presenter=true / demo.advanceDay answered 200 in 3 of 3 attempts [{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200}] (web/js/api.js init re-signs every st |
| URA-11 |  | FAIL | safety › URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child — a  [FAIL] | a child's progress is served to a browser that holds no link: "Harvest Outreach Center English Español Checklist How M.R. is doing With Harvest since Feb 9 · plain words, no scores Good days at school Going up M.R.'s daily " |
| URA-12 |  | PASS | gates › WPS-05 a timer or dictation for a student off the caseload is refused [PASS] |  |
| URA-13 |  | PASS | roles › routes: every registry route has a capability entry; each role opens exactly what the matrix allows [PASS] |  |
| PDU-01 |  | PASS | gates › PDU-01 the decision clock is "Day N" with the configured window and a source; the date comes from the rules ta [PASS]; clock › PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number  [PASS] |  |
| PDU-02 |  | PASS | clock › PDU-02 an information request that is not answered becomes "missed" (no 08:40 fudge); the reply-due time is sh [PASS] |  |
| PDU-03 |  | PASS | safety › PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses i [PASS] |  |
| PDU-04 |  | PASS | safety › PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or  [PASS] |  |
| PDU-05 |  | PASS | safety › PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a [PASS] |  |
| PDU-06 |  | PASS | clock › PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number  [PASS] |  |
| PDU-07 |  | PASS | safety › PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request [PASS] |  |
| IIU-01 |  | PASS | safety › IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3 [PASS] |  |
| IIU-02 |  | PASS | safety › IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3 [PASS] |  |
| IIU-03 |  | PASS | gates › IIU-03/04/05/06 invalid units, dates and results are refused [PASS] |  |
| IIU-04 |  | PASS | gates › IIU-03/04/05/06 invalid units, dates and results are refused [PASS] |  |
| IIU-05 |  | PASS | gates › IIU-03/04/05/06 invalid units, dates and results are refused [PASS] |  |
| IIU-06 |  | PASS | gates › IIU-03/04/05/06 invalid units, dates and results are refused [PASS] |  |
| IIU-07 |  | FAIL | safety › IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future — T.N [FAIL] | T.N. has used 65 of 65 units today (2026-10-29) but the authorization says it is exhausted on 2026-11-24 |
| IIU-08 |  | PASS | safety › IIU-08 D.W.'s early-discharge dates agree across the authorization transition, the drafted discharge and the L [PASS] |  |
| IIU-09 |  | PASS | gates › IIU-09 units must follow the recorded direct time: a note with 3 units on 100 minutes is flagged for review [PASS] |  |
| IIU-10 |  | PASS | safety › IIU-10 time blocks marked not direct (lunch, transport) never count as direct time [PASS] |  |
| IIU-11 |  | FAIL | safety › IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the au [FAIL] | Lauris processed a note with 0 units available: /consumers/3402?tab=active&processed=7052 |
| EXA-01 |  | PASS | s4 › S4[scenario] · 5 missing evidence is a list, not a sentence: every gap that lacks a stored record prints "Evid [PASS] |  |
| EXA-02 |  | FAIL | safety › EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself — the  [FAIL] | the renewal is "Renew by Nov 13" but the rule (14 business days before Nov 13) gives Oct 26 |
| EXA-03 |  | PASS | safety › EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date  [PASS] |  |
| EXA-04 |  | PASS | clock › EXA-04 appeal window: computed from the notice date (60 days, unverified, confirm on the letter); closed after [PASS] |  |
| EXA-05 |  | PASS | safety › EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed [PASS] |  |
| EXA-06 |  | NOT-RUNNABLE | safety › EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day [NOT-RUNNABLE] |  |
| DSL-01 |  | PASS | safety › WPS-09 / DSL-01 the panel is off for an outpatient (#4300) and a SEBS (#5120) record: nothing read, nothing ty [PASS] |  |
| DSL-02 |  | PASS | roles › service line: outpatient (P.G., R-0377) never appears in the staff state [PASS] |  |
| DSL-03 | **RB** | PASS | s4 › S4[scenario] · 6 household context is OFF by default (a person must include it); "Use it in the continued-stay [PASS]; enhance › counts are computed from rows and open their rows; the "61 notes" figure does not exist [PASS] |  |
| DSL-04 | **RB** | PASS | gates › DSL-04 the internal quarterly is staff only: absent from every other projection [PASS] |  |
| DSL-05 |  | PASS | safety › DSL-05 a school user cannot share an update about a student of another school; nothing is stored [PASS] |  |
| DSL-06 |  | PASS | safety › DSL-06 no SEBS or outpatient referral or client reaches Psyflo's state for any staff role (every referral is f [PASS] |  |
| DSL-07 |  | PASS | safety › DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel  [PASS] |  |
| DSL-08 |  | PASS | analytics › administrator and supervisor get aggregates only: no clinical text in their state, no drill-down, no patient i [PASS] |  |
| DSL-09 | **RB** | PASS | roles › anonymous: /api/state, /api/do (admin and plain actions), /files and the roster [PASS] |  |
| SVR-01 | **RB** | PASS | gates › SVR-01 fax: Send by a person -> simulated Sfax; events carry sim:true and the person, never an actor called "S [PASS] |  |
| SVR-02 | **RB** | PASS | safety › SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, in [PASS] |  |
| SVR-03 |  | PASS | safety › SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as m [PASS] |  |
| SVR-04 |  | PASS | safety › SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availi [PASS] |  |
| SVR-05 |  | FAIL | safety › SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microph [FAIL] | a synthetic-data warning is missing on the microphone prompt and on the phone screen: "Kayla · ES-1 MR M.R. Harvest # 3310 · Campbell ES-1 · grade 2 Change Say what happened What happened Use the microphone? Your browser turns speech into text. In some browser |
| SVR-06 | **RB** | PASS | analytics › every selector result and panel carries one provenance tag, and the baseline is labelled "Sample data, illustr [PASS]; s6 › S6[scenario] · 4b earlier views: the seeded baseline is labelled "Sample data, illustrative" (never "Harvest's [PASS] |  |
| SVR-07 |  | PASS | safety › SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser au [PASS] |  |
| SVR-08 |  | PASS | bridge-contract › the bridge source: message shapes, origin checks, no clicks, no background fetch to Lauris, same copy in exten [PASS] |  |
| SVR-09 |  | FAIL | safety › SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the serve [FAIL]; roles › presenter controls need presenter mode, not only a role [PASS] | no demo controls on the page expected 0 but got 6 |
| SVR-10 |  | NOT-RUNNABLE | v3 only (PSY.submit5): the unified build has no such entry point; the equivalent MCS-05 (Send refused while unsigned) is proved by gates |  |

Release-blocking failures: URA-05, URA-06, URA-10.
