# safety · FAIL

Run 2026-11-11T20-07-23Z · 81326 ms · instance 1 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | WPS-03 a clinician opening the phone app acts as the clinician (own caseload), never as another person |  |
| PASS | WPS-04 a student off the caseload cannot be opened on the phone: "not on your list. Nothing was opened." |  |
| PASS | WPS-06 direct support opens another staffer's student in Lauris: the panel says the student is not on the caseload and offers no draft |  |
| PASS | WPS-07 the panel always shows an identity card (initials, Harvest #, school) before it offers anything; a page whose initials disagree is a hard stop (see enhance) |  |
| PASS | WPS-09 / DSL-01 the panel is off for an outpatient (#4300) and a SEBS (#5120) record: nothing read, nothing typed |  |
| PASS | ICE-01 a non-scripted screening transcript drafts nothing it was not told; the missing boxes are listed as questions and "Nothing invented" is not a vacuous PASS |  |
| PASS | ICE-03 M.R. continued stay: every count equals the stored rows (40 daily notes), the constants 21 and 61 do not exist, gaps print "Evidence missing | verify" |
| PASS | ICE-04 an initial SRA drafted without the school's numbers or the screening facts does not draft criterion 1 (no frequency, duration, intensity or office-referral counts that nobody gave) |  |
| PASS | ICE-05 a discharge draft with no stored plan writes no event as done (no date after today) |  |
| PASS | ICE-06 a dictation that names no objective, time or intervention gets questions, and no objective is inserted |  |
| PASS | ICE-08 a quarterly draft for a client with no stored notes is blank with "Evidence missing", never another student's numbers |  |
| PASS | UAR-01 the drafted narrative adds nothing the staffer did not say ("We played basketball at recess a…"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-02 the drafted narrative adds nothing the staffer did not say ("He ran laps and was frustrated w…"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-03 the drafted narrative adds nothing the staffer did not say ("I observed her at lunch and she …"); "observed" is flagged and the text is not rewritten |  |
| PASS | UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source |  |
| PASS | UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve to a stored record |  |
| PASS | UAR-05b (not release-blocking) every source chip of those drafts carries a date |  |
| PASS | UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician, not to direct support |  |
| PASS | EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route refuses a processed session |  |
| PASS | MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is the guardian behind the link |  |
| PASS | MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and staff are refused, and no "faxed" event appears |  |
| PASS | URA-01 direct support opening Authorizations is told the screen is not available for the role (no data) |  |
| PASS | URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has no clinical-record access." |  |
| PASS | URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates only (no patient rows) |  |
| PASS | URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowens must not turn the page into the administrator |  |
| PASS | URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child |  |
| PASS | PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses it, and the send says simulated with the person as actor |  |
| PASS | PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or regulation cited as settled |  |
| PASS | PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a sent request) because they come from the rules table |  |
| PASS | PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request is due Saturday), with a source chip |  |
| PASS | IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3 |  |
| PASS | IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future |  |
| PASS | IIU-08 D.W.'s early-discharge dates agree across the authorization transition, the drafted discharge and the Lauris discharge panel |  |
| PASS | IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the authorization end date |  |
| FAIL | EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself | the renewal is "Renew by null" but the rule (14 business days before Nov 13) gives Oct 26 |
| FAIL | EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date and an owner | "Dashboard Clinician (LMHP-type) Thu Oct 29 · 3:30 pm Search patients All 19 Needs attention 16 Behind 5 In review 5 Authorization 6 All clear 3 Site All sites C" does not match /Units used up · T\.N\./ |
| FAIL | EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed | no re-check line in My Work "Dashboard Clinician (LMHP-type) Fri Nov 6 · 3:30 pm Search patients All 19 Needs attention 17 Behind 14 In review 5 Authorization 7 All clear 2 Site All sites C" does not match /DMAS portal · a person runs the lookup/[Ee]ligibility (re-?check/check due)/ |
| SKIP | EXA-06 services after a lapse of more than 31 days are flagged for discharge review | NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse |
| PASS | DSL-05 a school user cannot share an update about a student of another school; nothing is stored |  |
| PASS | DSL-06 no SEBS or outpatient referral or client reaches Psyflo's state for any staff role (every referral is for TDT; no H.B. or P.G.) |  |
| PASS | DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel says "No signed school release" and does not file it as a contact |  |
| PASS | SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, information reply by fax on an Availity payer, appeal signing |  |
| PASS | SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as mock pages |  |
| PASS | SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availity reading that does not exist; the Lauris wording is "page bridge", never "Lauris API" as a capability |  |
| PASS | SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microphone use |  |
| PASS | SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser automation, no scheduled submission in the product code |  |
| PASS | SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server |  |
| PASS | URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo controls, no dock, and the server refuses demo.advanceDay and request.demoReply (three attempts: the escalation is a race with the page's own sign-in) |  |
| PASS | URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capability AND a presenter, never a presenter alone |  |

## Output (tail)

```
PASS UAR-01 the drafted narrative adds nothing the staffer did not say ("We played basketball at recess a…"); "observed" is flagged and the text is not rewritten
PASS UAR-02 the drafted narrative adds nothing the staffer did not say ("He ran laps and was frustrated w…"); "observed" is flagged and the text is not rewritten
PASS UAR-03 the drafted narrative adds nothing the staffer did not say ("I observed her at lunch and she …"); "observed" is flagged and the text is not rewritten
PASS UAR-04 no predicted success percentages, research citations or outcome promises in any drafting source
PASS UAR-05 every box of every draft type (continued stay, quarterly, initial request) cites sources that resolve to a stored record
PASS UAR-05b (not release-blocking) every source chip of those drafts carries a date
PASS UAR-07 "Good recommendation" / "Needs improvement" are stored with who and when and are visible to a clinician, not to direct support
PASS EFN-09 there is no addendum or late-entry path to a processed record: no action, no control, every write route refuses a processed session
PASS MCS-08 a consent cannot be signed by a typed name or by staff: no token is 401, staff is 403; the signer is the guardian behind the link
PASS MCS-10 an appeal cannot be signed or sent for a request that is not denied (R-0402 is a partial): guardian and staff are refused, and no "faxed" event appears
PASS URA-01 direct support opening Authorizations is told the screen is not available for the role (no data)
PASS URA-03 the administrator opening a continued-stay form in Lauris: "Not permitted. The administrator role has no clinical-record access."
PASS URA-04 the administrator is denied Referrals and Eligibility; Analytics for the administrator is aggregates only (no patient rows)
PASS URA-05 a role cannot be taken by writing localStorage: with direct support signed in, setting psyflo_user=dowens must not turn the page into the administrator
PASS URA-11 a guardian page needs its link: with no session and no token, #/ParentProgress?c=DW shows no child
PASS PDU-03 an overdue request gets a notice DRAFTED for a person to send; nothing is sent until a person presses it, and the send says simulated with the person as actor
PASS PDU-04 the overdue-notice action does not assert a rule as law: no "Under the 7-calendar-day…", no statute or regulation cited as settled
PASS PDU-05 a change to the decision window moves every dependent date (the overdue state and the decision day of a sent request) because they come from the rules table
PASS PDU-07 an information request states its due time and that the hours are calendar hours (a Friday 5 pm request is due Saturday), with a source chip
PASS IIU-01 / IIU-02 the unit bands: 60, 90, 119 minutes = 0 units; 120 and 179 = 1; 180 and 299 = 2; 300 = 3
PASS IIU-07 an authorization that is used up (65 of 65) carries ONE exhaustion date that is not in the future
PASS IIU-08 D.W.'s early-discharge dates agree across the authorization transition, the drafted discharge and the Lauris discharge panel
PASS IIU-11 the mock Lauris warns or refuses a daily note when no units are available (T.N. 0 left) or after the authorization end date
FAIL EXA-02 the renewal due date follows the rule (end date minus 14 business days), not the end date itself — the renewal is "Renew by null" but the rule (14 business days before Nov 13) gives Oct 26
FAIL EXA-03 an exhausted authorization (T.N.) says service continues unpaid or that no units are left, with a date and an owner — "Dashboard Clinician (LMHP-type) Thu Oct 29 · 3:30 pm Search patients All 19 Needs attention 16 Behind 5 In review 5 Authorization 6 All clear 3 Site All sites C" does not match /Units used up · T\.N\./
FAIL EXA-05 an eligibility re-check that is due appears in My Work (Do next) once the recheck interval has passed — no re-check line in My Work "Dashboard Clinician (LMHP-type) Fri Nov 6 · 3:30 pm Search patients All 19 Needs attention 17 Behind 14 In review 5 Authorization 7 All clear 2 Site All sites C" does not match /DMAS portal · a person runs the lookup|[Ee]ligibility (re-?check|check due)/
SKIP EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse
PASS DSL-05 a school user cannot share an update about a student of another school; nothing is stored
PASS DSL-06 no SEBS or outpatient referral or client reaches Psyflo's state for any staff role (every referral is for TDT; no H.B. or P.G.)
PASS DSL-07 a counselor update is held back when no signed school release is on file: the monthly collateral panel says "No signed school release" and does not file it as a contact
PASS SVR-02 no "faxed" or "sent" event exists unless the Send stub ran and returned a reference: overdue notice, information reply by fax on an Availity payer, appeal signing
PASS SVR-03 the DMAS lookup page says it is a mock; the portals (Availity, state incident portal) are labelled as mock pages
PASS SVR-04 the "How the data gets in" text actually served claims no AI rewrite, OCR read-back, Sfax API or Availity reading that does not exist; the Lauris wording is "page bridge", never "Lauris API" as a capability
PASS SVR-05 the speech-to-text control says where the audio goes and that the data is synthetic, before any microphone use
PASS SVR-07 no stored credentials, tokens or unattended payer or Lauris sessions: no secret literals, no browser automation, no scheduled submission in the product code
PASS SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server
PASS URA-10 / SVR-09 a direct-support browser session is never a presenter: after a page reload it holds no demo controls, no dock, and the server refuses demo.advanceDay and request.demoReply (three attempts: the escalation is a race with the page's own sign-in)
PASS URA-06 a direct-support user cannot promote themselves: user.update {role:admin} needs the administrator capability AND a presenter, never a presenter alone
RESULT safety pass=45 fail=3 skip=1
```
