## 2 · Worklist (Psyflo app) · Oct 29 (`DoNext.dc.html`)

HOW THE DATA GETS IN · Worklist

Captured: nothing new. Every row is worked out from what Psyflo already holds; no one types into this page.

Flows: the headline count is the number of rows. The left chip is the clock or state: the screening call time (booked screenings), "9 h left" (the 24-hour clock on an additional-info request), "Day 10" (days since the request was sent, from the sent date and the config values call day 10 and decision window 14), the reply-by date on a partial approval, "Ready" (a drafted request waiting in Lauris), "New" (a referral not yet worked). The middle is the student initials and age from the student or referral record, the payer from the request, and a short label. The button goes to where the work happens; it is filled only when the action is due within 24 hours. "12 due · Eligibility re-verification" counts the weekly re-verification rows whose next due date is today or earlier; it drops as each one is verified. "Awaiting response" counts requests waiting on a payer (sent but before day 10, after a logged follow-up call, or a booked peer-to-peer) and referrals waiting on the school or the family; View opens Authorizations filtered to those. A student in intake adds a row with the earliest open clock (plan, paperwork, initial request) worked out from the date the intake was processed in Lauris.

For a supervisor the list is the notes waiting for their review (staff on every-note review, routed to that supervisor). Approve and Return write the review decision on the note.

Populates: the Worklist count in the sidebar; nothing else.

## 6 · Intake (Psyflo app) · Oct 29 (`Referrals.dc.html`)

HOW THE DATA GETS IN · Intake

Captured: nothing new. One row per referral the school portal sent, with the funding source chosen on the referral.

Flows: Student and School come from the referral and the student record. Funding source is the choice made on the Referral page (TDT by default, SEBS once routed, Outpatient). Stage is where the referral is: Referral, Screening, Intake, Plan. Status and clock is worked out from the family link, the eligibility check and the booked screening (for example "Details received", "Awaiting family · Oct 13", "Call Oct 29, 2:00 pm"); a student in intake shows the earliest open post-intake clock ("Plan 18 h"). The button opens the next step; a row opens the Referral page. Assigned to me hides referrals waiting on the family or the school.

Populates: the Worklist rows for new referrals and eligibility to verify.

## 7 · Referral (Psyflo app) · Oct 14 (`Referral.dc.html`)

HOW THE DATA GETS IN · Referral

Captured: the school's referral form (guardian agrees to the referral, behaviour report, attendance log, schedule and grades, concerns, interventions tried) arrives from the school portal; guardian details, Medicaid ID and consent to contact arrive from the family link the guardian fills on their phone.

Flows: each checklist line reads one of those answers; "waiting on family link" stays until the guardian submits. Ask school logs an email to the counselor and leaves the referral where it is. Verify opens the Eligibility page and stays disabled until the family link is submitted (the check is never run from the school's referral alone). The Medicaid line shows the dated result and a screenshot icon once a person has recorded it; the screenshot is kept in Psyflo, not in Lauris. Criteria are fixed rules over the referral form against the DMAS TDT initial SRA, Section I (2 of 3); hover shows the evidence the panel later writes into the SRA. Funding source: choosing SEBS routes the referral to the grant program, TDT and Outpatient only record the choice. Send family link texts the guardian (SMS stub); Book call saves the screening call and adds it to the Worklist and the Lauris panel.

Populates: Intake and Worklist rows; the screening panel's questions to ask.

## 9 · Eligibility (Psyflo app) · Oct 29 (`Eligibility.dc.html`)

HOW THE DATA GETS IN · Eligibility

Captured: with no parameter this is the weekly re-verification list. A person runs the lookup on the DMAS site in their own login, then records Active or Inactive, the plan and a dated screenshot. Psyflo does not automate the lookup.

Flows: each student in service has a next due date seven days after the last verification. Rows due today come first; Verify opens a modal with a link to the DMAS lookup, the result, the plan and the required screenshot (a file, or the demo's stand-in). Saving stores the screenshot as a dated PDF in Psyflo, moves the next due date seven days out and updates the student's Medicaid status; the Worklist count drops. With a referral (?referral=REF-118) this is the first verification, opened only after the family link is submitted: the lookup details come from the guardian's answers, the result is recorded once and repeats weekly in the list.

Populates: the Worklist line "N due"; the attachment "Eligibility" in the Authorizations drawer; the referral's eligibility line.

## 19 · Authorization activity (Psyflo app) · Oct 29 (`Submission.dc.html`)

HOW THE DATA GETS IN · Authorization activity

Captured: nothing on this page. It forwards to the Authorizations drawer for the same request, which now holds what this page showed: the activity log, the signed PDF, the fax receipt and Send.

Flows: a person still presses Send. Fax insurers: Send by fax goes through Harvest's Sfax account (stub: reference and receipt after about 3 seconds). Portal insurers: Open Availity or Open UHC portal opens the portal in the clinician's own login with the packet ready; the extension reads the confirmation.

Populates: the request's stage and clocks (Authorizations).

## 29 · Authorizations (Psyflo app) · Oct 29 (`Authorizations.dc.html`)

HOW THE DATA GETS IN · Authorizations

Captured: stage changes come from the extension (Process Form, Get Signature), from Send, from the day-10 payer call and from the decision pages; units come from the Lauris consumer list and the daily notes; decisions come from Sfax or the portal read-back.

Flows: Student and Request come from the request record. Payer and its channel (Sfax, Availity, UHC portal) come from the payer sheet. Units show remaining of authorized once active (from the units used in daily notes) and requested to awarded while pending or partial. Status is one chip worked out from the stage and the dates: "Day 6", "Day 10 · follow-up" (config call day 10; the public rule of 7 days and the 14-day window are config values), "Overdue" only after the decision window, "Pended · 9 h left" (24-hour clock). Pending clinical approval waits for the clinical lead; approving writes an event and changes nothing in Lauris. The button goes to the next step; Open and View open the drawer. The drawer lists the activity log (every Send, receipt, call, payer reply and decision with who and when; older rows are worked out from the request's own dates), the attachments (signed PDF from the Lauris preview, Sfax receipt, the eligibility screenshot) and the actions for the stage: Approve, Send by fax or Open the portal, Log call (the four outcomes of the day-10 payer call), Send notice (secondary), Resend when the payer did not have the fax. Filters: All sites, Status, Payer and Assigned to me read the same records.

Populates: the Worklist.
