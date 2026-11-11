# safety · FAIL

Run 2026-11-11T18-03-18Z · 59139 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | WPS-03 a clinician opening the phone app acts as the clinician (own caseload), never as another person |  |
| PASS | WPS-04 a student off the caseload cannot be opened on the phone: "not on your list. Nothing was opened." |  |
| FAIL | WPS-06 direct support opens another staffer's student in Lauris: the panel says the student is not on the caseload and offers no draft | the panel prints why nothing is offered; it printed: Scribe · Daily progress note Lauris connected Direct support D.W. Harvest #4102 TDT · Daily progress note Draft · not saved green · already in Lauris yellow · Psyflo typed, check it Home NOTE Daily progress note Weekly guardian contact Monthly collateral Other supported documentation Open a student in Lauris to start. Timing M.R "Scribe · Daily progress note Lauris connected Direct support D.W. Harvest #4102 TDT · Daily progress note Draft · not saved green · already in Lauris yellow · P" does not match /not on your caseload/i |
| PASS | WPS-07 the panel always shows an identity card (initials, Harvest #, school) before it offers anything; a page whose initials disagree is a hard stop (see enhance) |  |
| PASS | WPS-09 / DSL-01 the panel is off for an outpatient (#4300) and a SEBS (#5120) record: nothing read, nothing typed |  |
| PASS | ICE-01 a non-scripted screening transcript drafts nothing it was not told; the missing boxes are listed as questions and "Nothing invented" is not a vacuous PASS |  |
| PASS | ICE-03 M.R. continued stay: every count equals the stored rows (40 daily notes), the constants 21 and 61 do not exist, gaps print "Evidence missing | verify" |
| FAIL | ICE-04 an initial SRA drafted without the school's numbers or the screening facts does not draft criterion 1 (no frequency, duration, intensity or office-referral counts that nobody gave) | criterion 1 was drafted as: "In the last 30 days X.Y. was physically aggressive toward peers on repeated occasions, , lasting ?, moderate intensity; 2 office referrals and 1 day of in-school suspension followed." |
| PASS | ICE-05 a discharge draft with no stored plan writes no event as done (no date after today) |  |
| PASS | ICE-06 a dictation that names no objective, time or intervention gets questions, and no objective is inserted |  |
| PASS | ICE-08 a quarterly draft for a client with no stored notes is blank with "Evidence missing", never another student's numbers |  |
| PASS | UAR-01 the drafted narrative adds nothing the staffer did not say ("We played basketball at recess a…"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-02 the drafted narrative adds nothing the staffer did not say ("He ran laps and was frustrated w…"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-03 the drafted narrative adds nothing the staffer did not say ("I observed her at lunch and she …"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source |  |
| PASS | UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve to a stored record |  |
| FAIL | UAR-05b (not release-blocking) every source chip of those drafts carries a date | continued stay: source 4 "Request record" has no date / quarterly: source 2 "Assessments on the record" has no date / initialSRA: source 3 "School portal · counts from the counselor" has no date / initialSRA: source 4 "ISP 2.0 (in Lauris)" has no date / initialSRA: source 5 "Intake / CNA" has no date expected [] but got ["continued stay: source 4 \"Request record\" has no date","quarterly: source 2 \"Assessments on the record\" has no date","initialSRA: source 3 \"School portal · counts from the counselor\" has no date","initialSRA: source 4 \"ISP 2.0 (in Lauris)\" has no date","initialSRA: source 5 \"Intake / CNA\" has no date"] |
| PASS | UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician, not to direct support |  |
| PASS | EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route refuses a processed session |  |
| PASS | MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is the guardian behind the link |  |
| PASS | MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and staff are refused, and no "faxed" event appears |  |
| PASS | URA-01 direct support opening Authorizations is told the screen is not available for the role (no data) |  |
| PASS | URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has no clinical-record access." |  |
| PASS | URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates only (no patient rows) |  |
| FAIL | URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowens must not turn the page into the administrator | localStorage.psyflo_user='dowens' signed the khale page in as dowens (admin): the client mints a session for any roster id with no credential (web/js/api.js _legacyChanged) expected "khale" but got "dowens" |
| FAIL | URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child | a child's progress is served to a browser that holds no link: "Harvest Outreach Center English Español Checklist How M.R. is doing With Harvest since Feb 9 · plain words, no scores Good days at school Going up M.R.'s daily " |
| PASS | PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses it, and the send says simulated with the person as actor |  |
| PASS | PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or regulation cited as settled |  |
| PASS | PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a sent request) because they come from the rules table |  |
| PASS | PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request is due Saturday), with a source chip |  |
| PASS | IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3 |  |
| FAIL | IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future | T.N. has used 65 of 65 units today (2026-10-29) but the authorization says it is exhausted on 2026-11-24 |
| PASS | IIU-08 D.W.'s early-discharge dates agree across the authorization transition, the drafted discharge and the Lauris discharge panel |  |
| PASS | IIU-10 time blocks marked not direct (lunch, transport) never count as direct time |  |
| FAIL | IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the authorization end date | Lauris processed a note with 0 units available: /consumers/3402?tab=active&processed=7052 |
| FAIL | EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself | the renewal is "Renew by Nov 13" but the rule (14 business days before Nov 13) gives Oct 26 |
| PASS | EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date and an owner |  |
| PASS | EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed |  |
| SKIP | EXA-06 services after a lapse of more than 31 days are flagged for discharge review | NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse |
| PASS | DSL-05 a school user cannot share an update about a student of another school; nothing is stored |  |
| PASS | DSL-06 no SEBS or outpatient referral or client reaches Psyflo's state for any staff role (every referral is for TDT; no H.B. or P.G.) |  |
| PASS | DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel says "No signed school release" and does not file it as a contact |  |
| PASS | SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, information reply by fax on an Availity payer, appeal signing |  |
| PASS | SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as mock pages |  |
| PASS | SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availity reading that does not exist; the Lauris wording is "page bridge", never "Lauris API" as a capability |  |
| FAIL | SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microphone use | a synthetic-data warning is missing on the microphone prompt and on the phone screen: "Kayla · ES-1 MR M.R. Harvest # 3310 · Campbell ES-1 · grade 2 Change Say what happened What happened Use the microphone? Your browser turns speech into text. In some browsers the browser maker's speech service hears the audio. Psyflo keeps the text, not the au" "Kayla · ES-1 MR M.R. Harvest # 3310 · Campbell ES-1 · grade 2 Change Say what happened What happened Use the microphone? Your browser turns speech into text. In" does not match /synthetic/nothing is real/demo data/no real/i |
| PASS | SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser automation, no scheduled submission in the product code |  |
| FAIL | SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server | no demo controls on the page expected 0 but got 6 |
| FAIL | URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo controls, no dock, and the server refuses demo.advanceDay and request.demoReply (three attempts: the escalation is a race with the page's own sign-in) | after one reload the direct-support session was presenter=true / demo.advanceDay answered 200 in 3 of 3 attempts [{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200}] (web/js/api.js init re-signs every stored session in with presenter:true; no PIN is set by default) |
| FAIL | URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capability AND a presenter, never a presenter alone | user.update by a direct-support presenter session answered 200; khale's role afterwards: admin |

## Output (tail)

```
PASS UAR-02 the drafted narrative adds nothing the staffer did not say ("He ran laps and was frustrated w…"); "observed" is flagged and the text is not rewritten
PASS UAR-03 the drafted narrative adds nothing the staffer did not say ("I observed her at lunch and she …"); "observed" is flagged and the text is not rewritten
PASS UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source
PASS UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve to a stored record
FAIL UAR-05b (not release-blocking) every source chip of those drafts carries a date — continued stay: source 4 "Request record" has no date | quarterly: source 2 "Assessments on the record" has no date | initialSRA: source 3 "School portal · counts from the counselor" has no date | initialSRA: source 4 "ISP 2.0 (in Lauris)" has no date | initialSRA: source 5 "Intake / CNA" has no date expected [] but got ["continued stay: source 4 \"Request record\" has no date","quarterly: source 2 \"Assessments on the record\" has no date","initialSRA: source 3 \"School portal · counts from the counselor\" has no date","initialSRA: source 4 \"ISP 2.0 (in Lauris)\" has no date","initialSRA: source 5 \"Intake / CNA\" has no date"]
PASS UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician, not to direct support
PASS EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route refuses a processed session
PASS MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is the guardian behind the link
PASS MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and staff are refused, and no "faxed" event appears
PASS URA-01 direct support opening Authorizations is told the screen is not available for the role (no data)
PASS URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has no clinical-record access."
PASS URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates only (no patient rows)
FAIL URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowens must not turn the page into the administrator — localStorage.psyflo_user='dowens' signed the khale page in as dowens (admin): the client mints a session for any roster id with no credential (web/js/api.js _legacyChanged) expected "khale" but got "dowens"
FAIL URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child — a child's progress is served to a browser that holds no link: "Harvest Outreach Center English Español Checklist How M.R. is doing With Harvest since Feb 9 · plain words, no scores Good days at school Going up M.R.'s daily "
PASS PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses it, and the send says simulated with the person as actor
PASS PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or regulation cited as settled
PASS PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a sent request) because they come from the rules table
PASS PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request is due Saturday), with a source chip
PASS IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3
FAIL IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future — T.N. has used 65 of 65 units today (2026-10-29) but the authorization says it is exhausted on 2026-11-24
PASS IIU-08 D.W.'s early-discharge dates agree across the authorization transition, the drafted discharge and the Lauris discharge panel
PASS IIU-10 time blocks marked not direct (lunch, transport) never count as direct time
FAIL IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the authorization end date — Lauris processed a note with 0 units available: /consumers/3402?tab=active&processed=7052
FAIL EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself — the renewal is "Renew by Nov 13" but the rule (14 business days before Nov 13) gives Oct 26
PASS EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date and an owner
PASS EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed
SKIP EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse
PASS DSL-05 a school user cannot share an update about a student of another school; nothing is stored
PASS DSL-06 no SEBS or outpatient referral or client reaches Psyflo's state for any staff role (every referral is for TDT; no H.B. or P.G.)
PASS DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel says "No signed school release" and does not file it as a contact
PASS SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, information reply by fax on an Availity payer, appeal signing
PASS SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as mock pages
PASS SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availity reading that does not exist; the Lauris wording is "page bridge", never "Lauris API" as a capability
FAIL SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microphone use — a synthetic-data warning is missing on the microphone prompt and on the phone screen: "Kayla · ES-1 MR M.R. Harvest # 3310 · Campbell ES-1 · grade 2 Change Say what happened What happened Use the microphone? Your browser turns speech into text. In some browsers the browser maker's speech service hears the audio. Psyflo keeps the text, not the au" "Kayla · ES-1 MR M.R. Harvest # 3310 · Campbell ES-1 · grade 2 Change Say what happened What happened Use the microphone? Your browser turns speech into text. In" does not match /synthetic|nothing is real|demo data|no real/i
PASS SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser automation, no scheduled submission in the product code
FAIL SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server — no demo controls on the page expected 0 but got 6
FAIL URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo controls, no dock, and the server refuses demo.advanceDay and request.demoReply (three attempts: the escalation is a race with the page's own sign-in) — after one reload the direct-support session was presenter=true / demo.advanceDay answered 200 in 3 of 3 attempts [{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200},{"pres":true,"adv":200,"reply":200}] (web/js/api.js init re-signs every stored session in with presenter:true; no PIN is set by default)
FAIL URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capability AND a presenter, never a presenter alone — user.update by a direct-support presenter session answered 200; khale's role afterwards: admin
RESULT safety pass=37 fail=12 skip=1
```
