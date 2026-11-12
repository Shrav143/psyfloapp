# How the data gets in · one note per screen

Blue notes from the design canvas. Each says what the screen captures, how it flows, what it populates, and the engineering behind it.

## 0 · Sign in (`Login.dc.html`)

HOW THE DATA GETS IN · Sign in

Captured: email and password, or the Harvest Google sign-in. The same login works in the app, the extension and the phone app.

Flows: the role set on the Users page decides what each person sees.

## 1 · Where things live · read first (`WhereThingsLive.dc.html`)

HOW TO READ THE DEMO · Where things live

The rule on this screen is the one the demo follows: a Lauris form is written by the extension beside it (screening, intake, plan, notes, both SRAs); everything that is not a Lauris form lives in the Psyflo app (referral review, send and track, payer replies, partial decisions, the peer-to-peer brief, staff, compliance, analytics); parents and schools use portals. The screens that follow are in workflow order, and each carries a blue note like this one saying how its data is captured, where it flows, and what it populates.

## 2 · Do next · clinician home (Psyflo app) · Oct 29 (`DoNext.dc.html`)

HOW THE DATA GETS IN · Do next

Captured: nothing new. One list of what is due, built from the referrals, requests, clocks and reminders already in Psyflo.

Flows: each line opens the screen where the work happens; anything that is a Lauris form opens in Lauris.

## 3 · School portal · Oct 13 (`SchoolPortal.dc.html`)

HOW THE DATA GETS IN · portal

Captured: the referral (guardian consent attested first), and short updates from the counselor about a student in TDT ("Share an update"). Per the Nov 7 product call there is no teacher portal, no teacher check-ins and no view of the treatment plan.

Flows: the referral goes to Psyflo tagged with the school and the counselor; the counselor sees where each of the school's referrals stands (contacting the family, screening booked, started TDT, routed to the grant program) and is asked only for missing attachments.

Populates: Referrals (6) and Referral review (7); the school section of the referral used to fill the Lauris admission screening.

Counselor updates never go to Lauris on their own. In the extension a staffer either adds one to that day's daily note, credited to the counselor ("Per the school counselor, …"), or fills it into a collateral contact (contact with: the counselor; method: school portal message; information received: the update). Each use is logged on the update and shown back to the counselor. Ask Harvest whether they prefer a non-billable contact note in Lauris for these, and whether school information in a daily note raises any billing question.

## 4 · Referral form (school) · Oct 13 (`ReferralForm.dc.html`)

HOW THE DATA GETS IN · form

Captured: the school counselor fills this web form (same fields as Harvest's paper form) and attaches the behaviour report, attendance log, schedule and grades.

Flows: straight to Psyflo, stored under Harvest's account. Nothing goes to Lauris yet.

Populates: the referral review (2), and later the screening form (5), the intake (6) and the initial request (8) — every field here is reused downstream.

Engineering: Psyflo-hosted form with file upload; covered by the BAA; no EHR involvement.

## 5 · Referral sent (school) · Oct 13 (`ReferralSent.dc.html`)

HOW THE DATA GETS IN · Referral sent

Captured: nothing new. The confirmation shows what the school sent and what happens next.

Flows: the referral appears in Referral review; the school sees its status in the School portal without a Harvest login.

## 6 · Referrals list (Psyflo app) · Oct 29 (`Referrals.dc.html`)

HOW THE DATA GETS IN · Referrals list

Captured: nothing new. Every referral the school portal sent, with its stage.

Flows: the stage moves as the family link, the eligibility check and the screening call happen. The per-school table is counted from the list.

## 7 · Referral review (Psyflo app) · Oct 14 (`Referral.dc.html`)

HOW THE DATA GETS IN · review

Captured: nothing new — the referral is read by Psyflo against the DMAS TDT criteria (2 of 3, 1 of 5).

Flows: referral answers → fixed rules → 'shown / not shown / ask'. The Medicaid eligibility check does not run here: the school form has no insurance details. It runs only after the family submits the link with the insurance step, using a staff login to the insurer or DMAS portal; the dated result and screenshot are stored in Psyflo, not in Lauris, and the check repeats weekly while the student is in service.

Populates: 'ask now' prompts on the screening panel (5); family-link status (3); home to-do (13). 'Schedule screening call' creates the to-do and the panel item; 'Route to grant program' emails/texts the named people and moves the referral to the Grant program list.

Engineering: rules are fixed logic from the form; the AI model only words the 'ask' prompts. Weekly re-checks after enrollment, proof kept in Psyflo.

Scheduling (Nov 7): "Qualifies · family books the call" texts the family a link to book the screening call themselves on the parent portal (50) from the clinicians' open times (a stand-in for their Google Calendars; the time goes to the first clinician free). After the screening, "Qualifies for TDT · family books the intake" does the same for the in-person intake, with a ride request. Booking for the family stays as a fallback.

## 8 · Family link (phone) · insurance step · Oct 14 (`FamilyLink.dc.html`)

HOW THE DATA GETS IN · link

Captured: the guardian types phone, consent, Medicaid card number, DOB, best time, transport, language on their phone (text-message link). Which questions are asked is set on 3b.

Flows: to Psyflo only. Step 2 collects the insurance details (plan, Medicaid ID, date of birth). The eligibility check runs only when the family submits that step; nothing is checked before, and the screening call does not ask for the ID.

Populates: the guardian boxes on the Lauris screening form (5) and the intake header (6) — typed in by the extension when the screener opens those forms (Phase 2), or shown in the panel for staff to type (Phase 1).

Engineering: SMS through a HIPAA-eligible provider; link expires in 7 days; optional — the screener can ask the same questions on the call.

## 9 · Eligibility check (Psyflo app) · Oct 15 (`Eligibility.dc.html`)

HOW THE DATA GETS IN · Eligibility check

Captured: the insurance details the guardian typed into the family link (Medicaid ID, MCO, date of birth).

Flows: checked against the Virginia Medicaid eligibility response only after the guardian submits the link — never before. Result shows the MCO, effective dates and any gap.

Populates: the referral's eligibility status; the payer on the request.

## 11 · Parent signs (phone) · Oct 19 (`ParentSign.dc.html`)

HOW THE DATA GETS IN · Parent signs

Captured: the guardian's typed name and signature on the consent and release, before intake.

Flows: the signed PDF is stored with the referral and attached to the Lauris Documents tab by the intake clinician.

Populates: the consent date on the intake and the SRA.

## 12 · Parent portal (phone) · Oct 29 (`ParentPortal.dc.html`)

HOW THE DATA GETS IN · portal

Captured: guardian signs the enrollment packet before the intake (so the visit is the conversation), answers a short check-in every two weeks (DSM cross-cutting items; the child gets their own version at 11+), asks for a ride, signs the quarterly on the phone. Clinical questions stay on the call.

Flows: signatures and answers go to Psyflo; signed PDFs are handed to Lauris's Documents tab by the site supervisor until Lauris's own Consumer Access login is turned on; survey answers feed the client-progress view (21) and the quarterly.

Populates: a plain-language progress view for the guardian built from goals and daily ratings (no scores, no diagnoses); the intake checklist (2); the discrepancy flag when parent and child answers diverge.

Engineering: SMS link, phone-first, two languages; in-person signature rules still apply to whatever Lauris and DMAS require in person; consent for AI use folded into the informed-consent packet after attorney review.

Added Nov 7: a "next step" tile at the top when the family has a call or visit to book (50) or to confirm the day before; the treatment plan arrives here to sign on the phone when the clinician presses "Send to parent" on the plan (16), so a guardian sitting in the intake room gets a link and signs.

## 13 · Extension · three buttons · Oct 29 (`ExtHome.dc.html`)

HOW THE DATA GETS IN · buttons

Captured: the extension reads the Lauris page that is open (here the consumer list: names, group, 'units available'). The three buttons are Scribe (record a conversation into the form you pick), Track time (start/stop with a student) and Scan & enhance (read the note on the open page and improve it). Licensed clinical staff get a fourth, Review a service request. Admins get links to the Psyflo app instead.

Flows: what is on the page → Psyflo (read only). Timer taps → Psyflo with timestamps. Which buttons appear comes from the person's permission level (direct support / licensed clinical / admin), set by the admin in Psyflo.

Populates: Track time feeds the units on the daily note (11) and the Authorizations page (10). Scribe and Scan & enhance only ever write into a form box on the open Lauris page.

Engineering: Chrome extension on laurisonline.com; reads the page on load; writes nothing on this page; role comes from the Psyflo login, enforced server-side so a support-staff login cannot fetch screening, intake or request content; same timer in the phone companion app.

Updated Nov 7: The "N new referrals" tile (clinician, admin) lists Psyflo's referrals still in "needs screening" that the extension hasn't yet seen created in Lauris, with school, concerns, IEP, family-link status and eligibility from the referral form, the family link and the eligibility record. Scan & enhance was dropped. Direct support's picker is fixed: daily note, weekly guardian call, monthly collateral call, incident report; the timer is optional.

## 14 · Scribe · screening call · Oct 16 (`ExtScreening.dc.html`)

HOW THE DATA GETS IN · call

How the screener gets here: the same way as today — Add Session → Admission Screening in Lauris. Psyflo's to-do and the panel button open that form; either way it is the form they always use.

Captured: the LPC's call is recorded (consent read first). Psyflo transcribes it and pulls out each behaviour with frequency, duration and intensity, prior services, IEP, school coordination.

Flows: before the call, the extension fills the guardian/Medicaid/IEP boxes (green) from the referral and family link. During the call: audio → transcript → fields → typed into the yellow boxes on the open form. The LPC checks and presses Process Form.

Populates: Lauris (official, after Process Form); Psyflo keeps the fields for the intake (6) and the initial request (8).

Engineering: audio from a softphone or room mic; the extension writes only into boxes on the open form; audio deleted after processing.

Updated Nov 7: On New Consumer the panel types Name, Locality, School and Program from the referral form, Date of birth from the family link and Clinician from Psyflo's assignment (or whoever is signed in), each with its source chip; a person presses Save Consumer and the extension links the new Harvest # back to the referral. On Admission Screening the guardian, phone, language, Medicaid ID, Medicaid and IEP boxes come from the family link, the eligibility check and the referral, each with its chip.

Updated Nov 8: Recording starts from the panel, never from Lauris, and the panel shows "Record the screening call" wherever it lands on the way to a screening: numbered steps on New Consumer (the consumer must exist in Lauris first), "Open Admission Screening to record" on the consumer page, and the recorder at the top of the Admission Screening form.

## 15 · Scribe · intake / CNA · Oct 20 (`ExtCNA.dc.html`)

HOW THE DATA GETS IN · CNA

Captured: the 2–3 h in-person intake is recorded (consent). Same pipeline as the screening.

Flows: green boxes = copied from the referral and screening fields Psyflo already holds. Yellow = written from today's recording. Typed into the Lauris CNA form on screen; the LPC checks and presses Process Form. The trauma section is never drafted.

Populates: Lauris CNA (official). Psyflo keeps the fields for the treatment plan (7) and the initial request (8). Enrollment paperwork stays on paper.

Engineering: long audio handled in chunks; PHQ-9 answers filled as values, Lauris scores them; no writing outside the open form.

## 16 · Scan & enhance · treatment plan · Oct 21 (`ExtISP.dc.html`)

HOW THE DATA GETS IN · (ISP)

How the clinician gets here: Add Session → Individual Service Plan 2.0 in Lauris, within 24 h of the intake, with the guardian and client present — as today.

Captured: nothing new. Psyflo drafts three goals with measurable objectives from the intake, the referral attachments and Harvest's own goal scaffold; interventions are chosen from the drop-down lists on this form.

Flows: draft → typed into the yellow boxes on the open Lauris ISP → talked through with the family → clinician edits → signatures on the Lauris pad → Process Form.

Populates: Lauris ISP (official). Psyflo reads the processed plan back and uses its objectives to check every daily note (12) and to fill the goals on the initial and continued-stay requests (8, 15).

Engineering: objectives are always counts, never percentages; drop-down values are read from the form's own options; same form-fill mechanism as screening and intake.

Updated Nov 7: "Send to parent for signature" creates a signing task on the guardian's parent portal (12); the guardian signs there (Psyflo never signs). The panel shows the task's status: sent and waiting, or signed.

## 17 · Review a request · initial SRA · Oct 22 (`ExtSRA.dc.html`)

HOW THE DATA GETS IN · service request

Captured: nothing new. Psyflo writes the narrative sections from what it already holds: referral + attachments, screening and intake fields (captured at Process Form), the treatment plan (read from the Lauris ISP), and the daily notes. Each sentence carries its source. Lauris fills the header, provider, codes and goals itself (green).

Flows: the clinician reads and edits each paragraph in the panel → 'Fill' types them into the yellow boxes on the open Lauris form → clinician checks → Process Form → Forms to Approve → signs with credentials and NPI. The final text is whatever was in the Lauris box at Process Form; Psyflo keeps that version, not an earlier one.

Populates: Lauris holds the official signed form. Psyflo reads the signed preview page, keeps a PDF copy, and marks the request 'signed' on the Authorizations page (10) ready for Send (9).

Engineering: the one place the extension WRITES into a Lauris page (form boxes only, never a submit). Fallback: a per-box copy button. Edit log between draft and processed version kept for audit.

## 18 · Sign-off · Forms to Approve · Oct 22 (`ExtSignOff.dc.html`)

HOW THE DATA GETS IN · Sign-off

Captured: nothing new. The form is already filled in Lauris.

Flows: the supervisor reads it in Lauris Forms to Approve and presses Get Signature there. Psyflo only notes the time the form was approved so the request clock starts.

## 19 · Sent · a person presses Send · Oct 29 (`Submission.dc.html`)

HOW THE DATA GETS IN · Sent

Captured: the signed PDF (from the Lauris preview), the packet Psyflo assembled (form, cover sheet, payer's number or portal), and the fax or portal result.

Flows: fax insurers → the clinician presses Send in Psyflo → Psyflo faxes via the Sfax API from Harvest's account; reference and delivery receipt stored. Portal insurers → Send opens Availity/UHC in the clinician's own login with the packet ready; the clinician uploads; the extension reads the confirmation. Receipt check: Psyflo reminds a person to call, with the script and the fax reference; the outcome is typed in.

Populates: the request's stage and clocks (10). Replies from insurers arrive by fax into Sfax, are read by OCR, matched by member ID and reference, and move the stage.

Engineering: Sfax API in and out; OCR + matching rules;  no unattended portal sessions and no stored clinician credentials — the press-Send step is deliberate.

## 20 · Mobile app (phone) · Oct 29 (`MobileApp.dc.html`)

HOW THE DATA GETS IN · app

Captured: on the work iPhone (every staffer has one): pick a student or say their name, start/stop the timer, say what happened. The timer keeps counting with the screen locked. Typing is always an option when someone is within earshot.

Flows: taps and dictation go to Psyflo with timestamps. The dictation is turned into note language using the ISP drop-down names and waits in Psyflo; it drops into the note the moment the staffer opens that student in Lauris.

Populates: the daily note in Lauris (staff read it and press save/process); contact time and units (11, 10); the staff dashboard (19).

Engineering: iOS app plus a web fallback; interim path is an email/Notes capture that routes into Psyflo; on-device recording with upload when there is signal (schools often have none); nothing is written to Lauris except into an open form.

## 21 · Mobile · say what happened (phone) · Oct 29 (`MobileDictate.dc.html`)

HOW THE DATA GETS IN · Say what happened

Captured: the staffer's voice, recorded on the phone and uploaded when there is signal.

Flows: turned into note language using the ISP objective names; the staffer taps Looks right or Fix it.

Populates: the daily note in Lauris, where staff read it and press save.

## 22 · Mobile · assessments (phone) · Oct 29 (`MobileAssess.dc.html`)

HOW THE DATA GETS IN · Assessments

Captured: the student's answers, typed on the phone by the staffer.

Flows: held in Psyflo until the staffer opens that student in Lauris, then dropped into the Lauris survey; Lauris scores it.

Populates: Analytics client progress; the quarterly.

## 23 · Scan & enhance · daily note · Oct 29 (`ExtDPN.dc.html`)

HOW THE DATA GETS IN · note

Captured: the staffer writes or dictates the note in the Lauris box, then presses Scan & enhance. Psyflo reads the box, rewrites it in note language using the intervention names from the treatment plan drop-downs, and shows the stronger version in the panel. Contact time: ● Start/Stop taps during the day (Track time), ○ added later from the note.

Flows: the staffer edits the enhanced note in the panel → 'Use this' puts it back in the same Lauris box → Process Form. At Process Form the extension copies the finished note to Psyflo — one copy, the last thing entered in Lauris. Units = direct time under the band rule, confirmed by the staffer.

Populates: Psyflo's note store (feeds 12–15); units left on Authorizations (10); the contact-time evidence used on partials and peer-to-peers (14, 15).

Engineering: the word check is a list of non-billable verbs plus an AI rewrite; copy-on-Process-Form reads the page; units checked against 'units available' each time the page is open; a direct-support login sees only its own students' notes.

Updated Nov 7: The note starts from what the staffer says: a dictation from the phone, or recorded or typed right in the panel. Psyflo drafts narrative, objective, mood and progress from those words, the ISP and the timer; the person presses Fill. On Save Form Data or Process Form the extension reads the boxes as saved (including edits after the fill) and Psyflo keeps that as the saved version, showing how many boxes changed. "Good recommendation" or "Needs improvement" (with a short note on how) is stored with the dictation and the processed note.

Counselor updates: School counselor updates (sent from the school portal, kept in Psyflo, never read from Lauris) show as "From school today" on that student's daily note. "Add to the narrative" puts the update in as a credited quote ("Per the school counselor (R. Bell)…"), marked as the counselor's report rather than staff observation; the staffer can edit it or leave it out. Using it is logged on the update.

## 24 · Scribe · weekly guardian call · Oct 29 (`ExtWeekly.dc.html`)

HOW THE DATA GETS IN · Weekly guardian call

Captured: the call audio (Scribe), with the guardian's spoken consent at the start.

Flows: drafted into the Lauris weekly contact note in the open form; the clinician reads and presses Process Form.

Populates: guardian contact on the continued-stay request.

## 25 · Scribe · monthly collateral · Oct 29 (`ExtMonthly.dc.html`)

HOW THE DATA GETS IN · Monthly collateral

Captured: the teacher, guardian or provider contact (Scribe or typed).

Flows: drafted into the Lauris monthly collateral note; the clinician reads and presses Process Form.

Populates: collateral evidence on the quarterly report and the continued-stay request.

Counselor updates: School-portal updates not yet filed are offered as collateral contacts: Psyflo fills Date, Collateral, Method and Information received from the update, and Release on file only when a signed school release is in Psyflo (if Lauris already shows one, that box is left alone; if neither has one, the panel warns). Coordination is left for the person, who presses Process Form; the use is logged on the update.

## 26 · Incident report · Level 2 · Oct 28 (`ExtIncident.dc.html`)

HOW THE DATA GETS IN · Incident report

Captured: the staffer's account of what happened (Scribe or typed), the level, and who was told.

Flows: drafted into the Lauris incident form; for Level 2 the state portal entry is prepared and the 24-hour clock shown; a person submits it.

Populates: Compliance; three incidents in three months flags highest need.

Updated Nov 7: For the worked example (D.W.) the drafted report is seeded. For any other student the staffer says or types what happened; Psyflo types it into What happened, plus Location from the student's school and Staff present from who is signed in. Time, level, actions, CPS and injury stay with the person.

## 27 · Supervisor review queue · Oct 29 (`ReviewQueue.dc.html`)

HOW THE DATA GETS IN · Supervisor review queue

Captured: the supervisor's decision — Approve, Return, or Something here didn't happen.

Flows: shows what the staffer wrote next to what Psyflo added; nothing is written to Lauris until the staffer presses save.

Populates: the staff dashboard; the note's audit trail.

Updated Nov 7: Only staff flagged to need approval (new hires, anyone on review or probation) have their notes held here; when they press Process Form in Lauris the extension reports the note and Psyflo marks it pending until a supervisor approves or returns it. Everyone else is spot check and goes through at Process Form. A supervisor turns approval on or off for a staffer from "Who needs approval" on this screen (saved on the staff record, logged); notes already waiting stay until decided.

## 28 · Staff dashboard · Oct 29 (`StaffDashboard.dc.html`)

HOW THE DATA GETS IN · dashboard

Captured: nothing new — everything is read from what the extension, the phone app and Lauris's rejected-forms list already carry: notes done and open, time in by 24 h, rejected forms and why, contacts made, assessments due, goals named in notes, progress ratings, safety-care holds.

Flows: the same page in two views. The staffer sees their own day and their deliberate-practice goals; the site supervisor sees every staffer at the site, review mode per person (trainee notes route for approval), and patterns the month they happen.

Populates: the metrics Michelle Hamilton described (note completion, care continuity, progress tracking, measurement-based care, high-acuity ratio) and the supervision conversation.

Engineering: role-scoped views; approval routing is a permission flag; pattern alerts are simple thresholds against site averages; nothing here is typed in.

Updated Nov 7: Notes behind and on time are counted from the notes the extension reports at Process Form: daily notes within 24 h of the session (end time from the Psyflo timer, else 3:30 pm dismissal), the weekly guardian call by the end of the week, the monthly collateral by month end. Rejected forms, safety-care holds and the "(export)" on-time figures come from Harvest's Lauris export. Direct support see only their own day, a supervisor the staff at their sites, clinicians and admin everyone. Goal watch by student was dropped (Nov 7).

## 29 · Authorizations · Oct 29 (`Authorizations.dc.html`)

HOW THE DATA GETS IN · Authorizations

Captured: stage changes from the extension (processed, signed), from Send (9), and from screens 12–15; units from the Lauris consumer list and the daily notes; decisions from Sfax or the portal read-back.

Flows: every event updates the row; the clocks (7-day decision, 24-hour information request, 14-business-day renewal lead) are computed from dates. The filters are the ones staff asked for: needs my sign-off, info requested, partial, denied, active, renewal due. Renewal-due rows send a reminder email to the owning clinician two weeks ahead.

Populates: the Analytics page (16). Admins see the whole program; licensed clinical staff see their caseload; direct support staff do not see this page.

Engineering: this replaces the Google Sheet master tracker; a one-time import of the sheet seeds the history; row visibility filtered by role server-side.

Updated Nov 7: Every row has a History toggle with the request's full communication history in date order, from its audit trail (each Send, Sfax receipt, receipt call, payer reply, decision, call date and outcome, with who and when). Seeded requests, or ones that predate the audit trail, get entries worked out from their own dates (sent, decision due, information requested, offer, denial, call date, appeal window), so nothing reads empty. Upcoming dates are flagged.

Updated Nov 8: "Needs my sign-off" is now "Drafts to review and send": requests Psyflo drafted that wait for the clinician to review, sign in Lauris and send.

## 31 · Parent survey (phone) · Oct 29 (`ParentSurvey.dc.html`)

HOW THE DATA GETS IN · Parent survey

Captured: the guardian's monthly answers, from the phone link, no login.

Flows: stored with the client; shown in the extension panel and the quarterly report.

Populates: guardian collateral; Analytics client progress.

## 32 · Review a request · quarterly report · Oct 29 (`ExtQuarterly.dc.html`)

HOW THE DATA GETS IN · Quarterly report

Captured: nothing new. Daily notes, weekly calls, collateral, school and parent check-ins for the quarter.

Flows: Psyflo totals the objective evidence and drafts the Lauris quarterly form; the clinician reads and presses Process Form.

Populates: the continued-stay request.

Updated Nov 8: Two quarterlies. The family version is the Lauris form, drafted from daily-note ratings, assessments, guardian calls and the school portal; the guardian signs it on the parent portal (48). The internal quarterly is staff only: home context and plan are suggested from Psyflo's weekly calls, collateral contacts and incident log, the rest typed by staff; it is saved in Psyflo only, never typed into Lauris, never sent to the guardian, school or insurer, and never used in a request.

## 33 · Review a request · continued stay · Oct 29 (`ExtCase.dc.html`)

HOW THE DATA GETS IN · stay

Captured: nothing new. The clinician opens the CMHRS Continued Stay form in Lauris; the panel assembles the draft from the daily notes, weekly guardian calls, monthly collaterals and the internal quarterly already copied to Psyflo at Process Form, in the date range the clinician picks (last 30 days by default; insurers want recent dates). Lauris fills the header, current authorization, units used and goals (green).

Flows: keyword counts and every drafted sentence cite the note they came from; the clinician edits in the panel, decides whether a family disclosure goes to the payer (excluded text stays in the chart), then Fill types the paragraphs into the yellow boxes. Process Form → Forms to Approve → signature with NPI → Psyflo takes the signed copy and prepares the packet → the clinician presses Send in the app.

Populates: the Lauris form (the record); the Authorizations row and clocks; the next peer-to-peer brief or information-request reply if the payer pushes back.

Engineering: same write path as the initial SRA (form boxes only, never a submit); this used to be a separate app screen and was moved into the extension because the continued-stay SRA is a Lauris form.

## 34 · Insurer asks for more information · Oct 29 (`InfoRequest.dc.html`)

HOW THE DATA GETS IN · asks for more

Captured: the request arrives on Availity (read by the extension when a staff member is logged in) or by fax (Sfax, OCR). The 24-hour clock starts when it is read; Harvest checks Availity daily for open requests.

Flows: Psyflo pairs the insurer's questions with the request already sent and the last 30 days of notes → a reply letter.

Populates: pasted into the Availity case from the clinician's login, or faxed via Sfax, after a clinician approves. Logged on the request.

Engineering: the reply is limited to facts already in the submitted packet plus dated notes; nothing new is introduced.

Updated Nov 8: The reply goes by fax through Harvest's Sfax account by default, for every insurer, so the request's whole history (and the fax receipt) stays in one place. Uploading in the insurer's own portal (e.g. Availity) is still offered as "Upload in … instead".

## 35 · Partials & denials · Oct 29 (`Partials.dc.html`)

HOW THE DATA GETS IN · Partials & denials

Captured: the decision on a partial approval (most replies are partial: asked 150, offered 110), with who and when.

Flows: three choices. Accept and stretch spreads the awarded units to the current end date (Psyflo shows units per week). Accept and use them up keeps the same care, runs out early, then discharges and starts a new initial (36). Ask for a peer-to-peer (38). The first two are internal: nothing goes to the insurer, Psyflo only logs the choice on the request. Denials go to the guardian-led appeal letter (39).

Populates: the request's stage and history on Authorizations (29); the early-discharge plan; the peer-to-peer call notes.

## 36 · Early discharge · plan the new initial · Oct 29 (`EarlyDischarge.dc.html`)

HOW THE DATA GETS IN · Early discharge

Captured: the decision to discharge and the planned dates.

Flows: Psyflo lays out the 30-day gap and the day the new initial can be sent; reminders go to the clinician.

Populates: Authorizations; the new initial request.

Updated Nov 7: Reached from "Accept and use them up" on Partials (35), which logs the decision without sending anything to the insurer. Dates come from the awarded units at the usual daily rate and the 30-day new-initial rule; Set this plan writes the reminders.

## 37 · Scan & enhance · discharge summary · Dec 5 (`ExtDischarge.dc.html`)

HOW THE DATA GETS IN · Discharge summary

Captured: nothing new. Counted from the daily notes, weekly calls and the continued-stay request.

Flows: drafted into the open Lauris discharge form; the clinician reads and presses Process Form.

Populates: the early-discharge plan and the new initial request.

## 38 · Peer-to-peer call notes · Oct 29 (`PeerBrief.dc.html`)

HOW THE DATA GETS IN · notes

Captured: nothing new.

Flows: criteria text from the submitted request; dates from the notes; units left on the call date from the countdown; contact-time log from the Start/Stop taps; likely questions from the denial-reason table.

Populates: a printable page the clinician holds during the call; the outcome is logged back on the request.

Engineering: assembled in advance; nothing generated during the call.

Updated Nov 7: The insurer calls to agree a time, outside Psyflo. Staff enter the agreed date and time here and it is logged on the request ("date to be set" until then). The call notes are assembled from the submitted request; the call is not recorded. After the call staff log the outcome with an optional note: "Awaiting decision" keeps the request waiting, approved or partial makes it active with the units, denied opens the guardian-led appeal window.

Updated Nov 8: Recording (Nov 8): optional. Put the call on speaker and ask at the start whether everyone agrees; with that confirmed, the browser's speech-to-text writes a transcript, or staff type notes during the call if anyone says no. The transcript is kept on the request (logged, sent nowhere) and pre-fills the note when the outcome is logged.

## 39 · Appeal letter · guardian (phone) · Oct 29 (`AppealLetter.dc.html`)

HOW THE DATA GETS IN · Appeal letter

Captured: the guardian's choice to appeal and their signature, on the phone.

Flows: Psyflo drafts the letter from the denial and the record; the guardian reads, signs and sends it — the appeal is theirs.

Populates: the request's appeal stage and clocks.

## 40 · Payer playbook (`PayerPlaybook.dc.html`)

HOW THE DATA GETS IN · Payer playbook

Captured: what each MCO asks for, learned from past decisions and typed in by Harvest.

Flows: used when drafting a request for that payer.

Populates: the request checklist.

## 42 · Analytics · Oct 29 (`Analytics.dc.html`)

HOW THE DATA GETS IN · Analytics

Captured: nothing new. Authorization outcomes from the tracker (10) and a one-time import of the master-tracker history; assessments (PHQ, GAD, DSM cross-cutting, SUDS) migrated from Lauris surveys; daily ratings from notes; attendance and referrals from the school portal (18); incidents from Compliance (20).

Flows: the authorization baseline by payer stays the pilot's scorecard. Client progress shows one child over time with parent and child measures side by side and flags where they diverge. Reports (division, grant, quarterly, binder) are assembled from the same rows.

Populates: the pilot measures; the year-end division report that used to take April to August; grant pulls on demand.

Engineering: Psyflo's own data plus cadence exports from Lauris; "ask a question" is a later phase once phases 3–4 hold real data.

## 43 · Users & roles (`Users.dc.html`)

HOW THE DATA GETS IN · Users & roles

Captured: who works at Harvest and their role, typed in by the admin or imported from the staff list.

Flows: the role decides which buttons the extension shows and which pages the app shows.

## 46 · Enrollment packet (phone) (`ParentEnroll.dc.html`)

HOW THE DATA GETS IN · enrollment packet

Captured: the seven papers in the enrollment packet, done at home on the guardian's phone before the intake visit: intake information (pre-filled from the family link for the guardian to check), rights and responsibilities, privacy notice, insurance and fees (read and acknowledge), two emergency contacts, and the two signed forms (consent for services, school release) through Parent signs (11).

Flows: each item saves as the guardian goes; the signed PDFs and acknowledgements are handed to Lauris's Documents tab by the site supervisor, as for screen 12.

Populates: the packet tile on the parent portal (12); the intake checklist, so the visit is the conversation and not the paperwork. Leadership expects this to cut intake no-shows (product direction #97).

## 47 · Progress · family view (phone) (`ParentProgress.dc.html`)

HOW THE DATA GETS IN · family progress

Captured: nothing new. Daily ratings and goal progress from staff notes, office referrals from the school counselor, teacher check-ins (only once the school release is signed), and the guardian's own check-ins (31).

Flows: Psyflo turns those into plain words: good days by month, each goal as days met, the skills practised (from the plan's interventions, in a parent's words), what the teacher said.

Populates: nothing. Read-only for the guardian. No scores and no diagnoses.

## 48 · Quarterly report · guardian signs (phone) (`ParentQuarterly.dc.html`)

HOW THE DATA GETS IN · quarterly signature

Captured: the guardian's signature on the quarterly report, on the phone instead of in person.

Flows: the clinician sends the signature request from the quarterly report (32); the guardian reads the quarter in plain words (or the full report) and signs; the signed PDF closes the portal task and goes with the continued-stay request (33).

Populates: the guardian signature box on the quarterly; the signed list on the parent portal (12).

## 49 · Insurance letters, explained (phone) (`ParentLetters.dc.html`)

HOW THE DATA GETS IN · insurance letters

Captured: nothing new. Every step of the child's requests from the authorization tracker (29): sent, waiting, more information asked, partly approved, denied, appealed, approved.

Flows: each step becomes a card saying what it means and what the guardian has to do (usually nothing). A denial links to the appeal letter (39), because only a guardian can appeal.

Populates: the insurance tile on the parent portal (12). Answers the staff observation that guardians "don't really" understand the payer's letters (product direction #68).

## 50 · Book the first call or the intake (phone) (`ParentSchedule.dc.html`)

HOW THE DATA GETS IN · family booking

Captured: the time the guardian picks for the screening call (phone) and later the intake visit (in person), whether they need a ride to the intake, and their answer the day before ("Still good for tomorrow?").

Flows: open times come from the clinicians who do screenings and intakes (in the build: their Google Calendars through the Calendar API); each time goes to the first clinician free. A booked screening call is the same booking the clinician would make (Do next, the Lauris panel). A ride request and the intake visit land on the clinician's Do next; a "need to change" answer asks Harvest to call.

Populates: the screening and intake dates on the referral and the client timeline; the "next step" tile on the parent portal (12).

