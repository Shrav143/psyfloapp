## 13 · Panel home · Oct 29 (`ExtHome.dc.html`)

HOW THE DATA GETS IN · panel home

Captured: nothing is typed here. The panel reads two things: the Consumers list on the Lauris page you have open (initials, program, units) and Psyflo's own store.

Flows: Worklist shows up to three rows, built by the same function as the Worklist in the app (referrals, calls, requests, clocks, weekly eligibility checks). A row's button opens the Lauris form it names, or the Psyflo screen for it. Direct support and supervisors see their own caseload instead: a waiting phone dictation, a daily note not yet written, notes awaiting review. The Student field only lists TDT students on the Lauris page; the buttons act on the student shown. Track time starts or stops that staffer's timer in Psyflo (the stop time is start plus the elapsed time on the clock, as on the phone). Which buttons appear comes from the signed-in staffer's role, read from the Lauris page.

Populates: the timer blocks that fill the daily note's contact time (23).

## 14 · Panel · screening call · Oct 16 (`ExtScreening.dc.html`)

HOW THE DATA GETS IN · screening call

Captured: step 1 (Fill) types the boxes Psyflo already holds into the open Admission Screening: guardian, phone and language from the family link, Medicaid from the recorded eligibility check, IEP from the referral form. Step 2 (Record) needs the Consent read box ticked, then listens through the browser's speech recognition; nothing is kept until you press Record. The presenter menu can play the scripted call instead. Step 3 (Review) drafts the boxes from the transcript.

Flows: while recording, only the Still to ask list shows; each item ticks when its answer is heard in the transcript. Stop drafts the rest of the boxes (one line per box, numbered source chips: 1 call, 2 referral). Open a box to edit the drafted text before typing; Fill types them into the form, or One at a time types one and highlights the next. Rows that hold several Lauris boxes (a behaviour's yes, frequency, duration, intensity, example) are edited in Lauris. Admission decision and diagnosis stay blank: yours. Documentation checks run on the draft (frequency, duration and intensity; counts not percentages; prior service with provider, dates and outcome). A person presses Process Form.

Populates: the screening in Psyflo's store (transcript, facts, boxes), the 30-day clock for the initial request (starts when Process Form is seen), and the pre-filled boxes of the CNA (15).

## 15 · Panel · intake / CNA · Oct 20 (`ExtCNA.dc.html`)

HOW THE DATA GETS IN · intake

Captured: presenting issue and prior services are copied from the screening and carry a Copied from screening chip; developmental history, medical, family mental-health history and strengths come from the recorded intake conversation (seeded here); PHQ-9 answers come from the interview. Trauma history is never drafted.

Flows: Fill types every box into the open CNA; open a box to edit it first. The Still to ask list is the interviewer's own checklist: developmental history comes before trauma history, then the prior-service dates, the danger question and the releases. Tick each as it is asked. Pause stops the recording indicator. A person presses Process Form.

Populates: the intake date in Psyflo (starts the plan clock) and the plan (16).

## 16 · Panel · treatment plan · Oct 21 (`ExtISP.dc.html`)

HOW THE DATA GETS IN · treatment plan

Captured: three goals drafted from the intake and the plan meeting: one objective each, two interventions from Harvest's list, an estimated completion. Start and end dates, frequency, presenting issue and strengths come from the CNA.

Flows: the header chip is the plan clock (24 hours from the intake is Harvest's practice, read from the clocks setting): Plan 18 h, then Plan done once the plan is processed. Fill the 3 goals types the plan into the open ISP. Interventions show as chips on each goal. After Process Form the guardian signature goes to the parent portal (Send to guardian); the guardian signs there.

Populates: the client's goals (used by the daily note, the initial request and the quarterly), and the initial request draft, created when Process Form is seen.

## 17 · Panel · initial request · Oct 22 (`ExtSRA.dc.html`)

HOW THE DATA GETS IN · initial request

Captured: seven boxes written from the screening call, the intake, the plan, the referral and the counts the school entered on its portal. Every box carries numbered source chips. Criterion 3 stays blank when criteria 1 and 2 are met. Trauma-informed care is left to the clinician. Goals and strengths are green: Lauris already holds them from the plan.

Flows: open a box to edit its text (criterion 1 is the one usually edited); Fill 7 boxes types them into the open Lauris form. Pre-submission checks run on the draft (numbers, dates, prior services, school counseling placement, criterion 3, nothing extra). After Process Form the same panel becomes one status line: Processed, pending clinical approval, with an Approve button for clinician and admin (writes Approved by <name>; nothing changes in Lauris); then Pending signature; then Signed, ready to submit with Open Send, which opens Authorizations on that request.

Populates: the request's stage in Psyflo (needs_approval, awaiting_signature, signed) and its activity log. A person presses Process Form and Get Signature in Lauris and Send in Psyflo.

## 18 · Panel · sign-off · Oct 22 (`ExtSignOff.dc.html`)

HOW THE DATA GETS IN · sign-off

Captured: the panel reads the Forms to Approve list and the preview of the form you have open (title, rows, whether it shows as signed). Nothing is typed.

Flows: sign-off is a state of the request panel, not a separate page. On the list it shows each waiting form with its Psyflo request. On a preview, Pre-submission checks compare the preview with what Psyflo typed (edits since, criteria, days left on the 30-day limit). When a person presses Get Signature, the extension sees it, Psyflo saves the signed preview as a PDF and the status line changes to Signed, ready to submit. If approval was skipped the activity log says so; Lauris is never blocked.

Populates: the signed PDF and packet on the request (shown in Authorizations as Attachments).

## 23 · Panel · daily note · Oct 29 (`ExtDPN.dc.html`)

HOW THE DATA GETS IN · daily note

Captured: what the staffer says or types: a dictation saved on the phone that waits for this student, or Record or Type right in the panel. Contact time comes from the phone timer (Track time); the unconfirmed block is a block added after the fact. Objective, interventions and mood come from the plan, the dictation and the timer.

Flows: a waiting phone dictation drops into the open note by itself. Narrative, objective, mood and progress are drafted; each row has numbered source chips (1 what you said, 2 your timer, 3 the plan, 4 the school counselor). The units chip shows the direct time and the units under the bands (1 unit 2 to 2.99 h, 2 units 3 to 4.99 h, 3 units 5 h or more; read from the clocks setting). The ⋯ on the unconfirmed block removes it and recounts. Confirm types the time and units. A school update appears under From school with Add to note or Leave out; it enters the narrative as a credited quote. Good recommendation or Needs improvement is stored with the dictation and the note. A person presses Process Form.

Populates: Psyflo's note store and the units used on the authorization; the daily-notes count in Documentation.

## 24 · Panel · weekly call · Oct 29 (`ExtWeekly.dc.html`)

HOW THE DATA GETS IN · weekly call

Captured: the guardian call, recorded with consent on file. In this demo the four boxes (who and how long, what was discussed, follow-up, contact) are drafted from the recorded call that is already in the sample data; the Record button only shows the recording indicator.

Flows: numbered source chips on each box; open a box to edit; Fill 4 boxes or One at a time types them into the open Lauris form. For continued stay lists what the call also noted (family involvement, continuing need), kept for the continued-stay request. A person presses Process Form.

Populates: the weekly guardian note, which feeds the continued stay (33) and the quarterly (32).

## 25 · Panel · monthly collateral · Oct 29 (`ExtMonthly.dc.html`)

HOW THE DATA GETS IN · monthly collateral

Captured: the collateral contact: the school counselor's counts and teacher check-in from the school portal, the recorded conversation, and the plan shared from the chart. In this demo the boxes come from the sample data.

Flows: numbered source chips (1 school portal, 2 conversation, 3 chart). Under From school, a counselor message not yet used as a contact can be filled as one; the release on file (from the parent portal or already in Lauris) is shown and, without one, Release on file stays blank. Fill types the boxes; coordination is yours to check. A person presses Process Form.

Populates: the monthly collateral note and the school-coordination line of the continued stay.

## 26 · Panel · incident report · Oct 28 (`ExtIncident.dc.html`)

HOW THE DATA GETS IN · incident report

Captured: for the worked example (D.W.) the six boxes are drafted from the guardian's call to the site supervisor and the safety plan. For any other student, Record or Type what happened and Psyflo puts those words in What happened, with the school and the signed-in staffer; time, level, actions, CPS and injury are left to you.

Flows: the header chip is the 24-hour state portal clock for a Level 2 incident, read from the incident record. State portal opens the portal in your own session and logs the time you pressed it. Fill types the boxes; a person presses Process Form, which routes the report to the supervisor.

Populates: the incident list in Documentation and the compliance record.

## 32 · Panel · quarterly report · Oct 29 (`ExtQuarterly.dc.html`)

HOW THE DATA GETS IN · quarterly report

Captured: goal bars count the days rated progress in the daily notes (41 of 61 and so on); assessments come from the Lauris surveys, attendance from the school portal, guardian involvement from the weekly calls.

Flows: six boxes with numbered source chips, editable; Fill types them into the open form. Family version sends the guardian's copy to the parent portal for signature. Internal quarterly is staff only: four boxes seeded from the weekly calls, collateral and incident log, saved in Psyflo, never typed into Lauris, never sent to the guardian, school or insurer.

Populates: the quarterly note, the parent portal signature task, and Psyflo's internal quarterly store.

## 33 · Panel · continued stay · Oct 29 (`ExtCase.dc.html`)

HOW THE DATA GETS IN · continued stay

Captured: the counts and the draft come from the student's daily notes, weekly calls, monthly collateral, the school portal and the plan change, for the range you pick (Last 30 days or Whole period). The chips count aggression, elopement, use of a taught strategy and safety holds across the notes in range.

Flows: six boxes, each with numbered source chips and editable; Sources lists what each number is. Household detail has Include and Exclude: Include adds the family disclosure to the continued-need text, Exclude leaves it out and the payer text says nothing about home. Fill 6 boxes types them into the open Lauris form. Pre-submission checks run on the draft. After Process Form the panel follows the same status line as the initial request (17): approval, signature, Open Send.

Populates: the reauth request in Psyflo (stage and activity log) and the audit record of which sources were typed.

## 37 · Panel · discharge summary · Dec 5 (`ExtDischarge.dc.html`)

HOW THE DATA GETS IN · discharge summary

Captured: six boxes drafted from the daily notes, the guardian calls and the early-discharge plan in Psyflo (discharge date, reason, progress as counts, condition, services recommended, guardian notified).

Flows: numbered source chips, editable; Fill types them into the open form. The row below the checks shows the next date from the plan (new intake) and opens the early-discharge plan in Psyflo. A person presses Process Form, and Psyflo drafts the new initial request from that.

Populates: the discharge note and the new initial request draft.
