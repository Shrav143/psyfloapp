## 0 · Sign in (`Login.dc.html`)

HOW THE DATA GETS IN · Sign in

Captured: work email and password, or the Harvest Google sign-in. The role cards fill a seed user for the demo. The same login works in the app, the extension and the phone app.

Flows: the role set on the Users page decides what each person sees and where they land: direct support on the phone app (or the extension home on a laptop), supervisor and clinician on the Worklist, admin on Authorizations.

Family and school pages need no staff login. Families arrive by a texted link; the school counselor has a school account. The two links under the role cards open those pages directly for the demo.

## 3 · School portal (`SchoolPortal.dc.html`)

HOW THE DATA GETS IN · school portal

Captured: the referrals the counselor sends (through Refer a student) and short updates about a student already in TDT (Share today). Nothing else: no teacher portal, no treatment plan, no notes.

Flows: each row reads one referral of the counselor's school from Psyflo's own store: status chip, student, one button (View, Attach for a missing file, Finish for a saved draft). Harvest staff move the status as they work the referral; the school sees it change without a Harvest login. A counselor update waits in Psyflo; in the extension a staffer adds it to that day's note or files it as a collateral contact, and its chip here changes to show which.

Populates: Intake (the list of referrals) and the Lauris admission screening later. Counselor updates never go to Lauris on their own.

## 4 · Referral form (school) (`ReferralForm.dc.html`)

HOW THE DATA GETS IN · form

Captured: the counselor fills this web form (the same fields as Harvest's paper form) and attaches the behaviour report, attendance log, and schedule and grades. Guardian agrees to the referral is a required Yes or No: the form cannot be submitted on No (it says so beside the field), and the server refuses a referral without a Yes (referral.create and referral.submitDraft). A school may refer only with the parent's agreement.

Flows: straight to Psyflo, stored under Harvest's account as form.guardian_agrees (true) and on the referral record. It shows as the first line of the Intake checklist. Save for later keeps a draft that nothing sees until it is submitted. Nothing goes to Lauris.

Populates: the referral in Intake, then the family link, the screening form and the initial request: every field here is reused downstream.

Engineering: Psyflo-hosted form with file upload, covered by the BAA, no EHR involvement.

## 5 · Referral sent (school) (`ReferralSent.dc.html`)

HOW THE DATA GETS IN · Referral sent

Captured: nothing new, except a file the counselor attaches now (Attach now), which is added to the referral and logged.

Flows: reads the referral by id from Psyflo's store: what happens next and which of the three attachments are still missing.

Populates: the referral in Intake and its activity log.

## 8 · Family link (phone) (`FamilyLink.dc.html`)

HOW THE DATA GETS IN · family link

Captured: the guardian answers on their own phone, one question per screen: name and relationship, phone, language, the child's insurance, Medicaid ID (or a photo of the card), birth date, permission to call, best time and whether they can get to the intake. English or Spanish at the top. Which questions are asked is set in Settings; address and household are off by default.

Flows: to Psyflo only. Each group of questions saves as the guardian moves on (five steps: guardian, insurance, consent, best time, transport), so the referral shows how many are done. Send submits the link. Only then does the Eligibility page show the prepared lookup details; nothing is checked before, and the screening call never asks for the ID.

Populates: Eligibility (a person runs the DMAS lookup and records the result), the guardian boxes on the Lauris screening form and the intake header (typed in by the extension only when the screener opens those forms), and the referral checklist.

Engineering: SMS through a HIPAA-eligible provider, link expires in 7 days, optional (the screener can ask the same questions on the call).

## 11 · Parent signs (phone) (`ParentSign.dc.html`)

HOW THE DATA GETS IN · Parent signs

Captured: the guardian's finger signature on the consent or the school release, with the plain-language summary above it and the full form one tap away.

Flows: Sign stores a signed PDF in Psyflo, closes the portal task and marks the consent done on the parent portal. A person at Harvest attaches the PDF to the Lauris Documents tab. Psyflo never signs for anyone. Whether Harvest requires in-person signing for any form is open: nothing on the page says so.

Populates: the consent date on the intake and on the initial request, and the signed list on the parent portal.

## 12 · Parent portal (phone) (`ParentPortal.dc.html`)

HOW THE DATA GETS IN · portal

Captured: what the family does here, one row each: sign the forms, the enrollment packet, a check-in every two weeks, booking the first call or the intake visit.

Flows: every row reads Psyflo's store (consents, portal tasks, enrollment answers, check-ins, the family's booking state, this week's good days from daily ratings, the newest insurance step). The one filled button is the first thing that needs the family. English or Spanish at the top.

Populates: nothing new. Signatures, packet answers and check-ins are saved by the screens each row opens (11, 46, 31, 50).

## 20 · Mobile app (phone) (`MobileApp.dc.html`)

HOW THE DATA GETS IN · phone app

Captured: on the work iPhone: tap a student chip, start or stop the timer, say what happened. The timer is a stored start time, so it keeps counting with the screen locked. Voice tagging: the mic in the timer card listens for "I'm going to begin working with D.P." (browser speech recognition) and moves the timer to that student; the presenter menu's example plays the same sentence through the same parser.

Flows: taps and speech go to Psyflo with timestamps. Stopping saves a block that ends where the timer on screen reads. The day so far is rows built from those blocks and from the notes already said; "2 notes waiting" counts the students whose daily note is not in yet. Students lists the six students with their note status and a Start or Stop button. Me shows who is signed in and signs out.

Populates: the daily note in Lauris (staff open the student there, read it and press Process Form: nothing is written to Lauris except into an open form), contact time and units, and the Documentation view.

Engineering: iOS app plus a web fallback; on-device recording with upload when there is signal.

## 21 · Mobile · say what happened (phone) (`MobileDictate.dc.html`)

HOW THE DATA GETS IN · Say what happened

Captured: the staffer's voice (browser speech recognition) or typing. If the microphone is missing or blocked the scripted example dictation is used so the demo never stalls; the presenter menu's "Use the example" fills the same text.

Flows: turned into note language with the plan's intervention and goal named, each phrase with a source chip (intervention list, timer duration, plan objective); the staffer taps Looks right or Fix it. Looks right saves a dictation that waits in Psyflo until the staffer opens that student's daily note in Lauris, where it drops in as yellow boxes for them to check.

Populates: the daily note in Lauris; the day-so-far rows on Today.

## 22 · Mobile · assessments (phone) (`MobileAssess.dc.html`)

HOW THE DATA GETS IN · Assessments

Captured: the student's answers, tapped on the phone by the staffer: two questions for the SUDS, 25 for the DSM cross-cutting child version (a safety question at the end tells the staffer to tell the clinician).

Flows: Ask now opens the instrument; Save answers holds the answers in Psyflo until the student is open in Lauris, then they drop into the Lauris survey and Lauris scores them. The due list and this month's scores are seeded.

Populates: the student's progress and the quarterly.

## 31 · Parent survey (phone) (`ParentSurvey.dc.html`)

HOW THE DATA GETS IN · Parent survey

Captured: the guardian's check-in every two weeks: three questions and an optional note, from the phone link, no login. English or Spanish.

Flows: Send stores the answers with the student; the parent portal shows when the next one is due; staff see it in the extension before the next call.

Populates: guardian collateral, the quarterly and the family progress view (47).

## 46 · Enrollment packet (phone) (`ParentEnroll.dc.html`)

HOW THE DATA GETS IN · enrollment packet

Captured: the seven papers done at home before the intake visit: intake information (pre-filled from the family link for the guardian to check), rights and responsibilities, privacy notice, insurance and fees (read and acknowledge), two emergency contacts, and the two signed forms (consent, school release), which open Parent signs (11).

Flows: each item saves as the guardian goes. Signed PDFs and acknowledgements are handed to the Lauris Documents tab by the site supervisor. The packet row on the parent portal counts what is done.

Populates: the intake checklist, so the visit is the conversation and not the paperwork.

## 47 · Progress · family view (phone) (`ParentProgress.dc.html`)

HOW THE DATA GETS IN · family progress

Captured: nothing new. Daily ratings and goal progress from staff notes, office referrals from the school counselor, the skills practised from the plan's interventions, and the guardian's own check-ins. Later phase.

Flows: Psyflo turns those into plain words: good days by month, each goal as a bar, trips to the office. No scores and no diagnoses.

Populates: nothing. Read-only for the guardian. The numbers are sample data.

## 48 · Quarterly report · guardian signs (phone) (`ParentQuarterly.dc.html`)

HOW THE DATA GETS IN · quarterly signature

Captured: the guardian's finger signature on the quarterly report, on the phone instead of in person. Later phase.

Flows: the clinician sends the signature request from the quarterly report; the guardian reads the quarter in plain words (or the full report) and signs; the signed PDF closes the portal task and goes with the continued-stay request.

Populates: the guardian signature box on the quarterly and the signed list on the parent portal.

## 49 · Insurance letters, explained (phone) (`ParentLetters.dc.html`)

HOW THE DATA GETS IN · insurance letters

Captured: nothing new. Every step of the child's requests from Authorizations: sent, waiting, more information asked, partly approved, denied, appealed, approved. Later phase.

Flows: each step is a card with what it means in plain words; a denial links to the appeal letter (39) because only a guardian can appeal. The word list is one tap away.

Populates: the insurance row on the parent portal.

## 50 · Book the first call or the intake (phone) (`ParentSchedule.dc.html`)

HOW THE DATA GETS IN · family booking

Captured: the time the guardian picks for the screening call (phone) and later the intake visit (in person), whether they need a ride, and their answer the day before. Later phase.

Flows: open times come from the clinicians who do screenings and intakes (in the build: their calendars); each time goes to the first clinician free. A booked call is the same booking a clinician would make in Psyflo. A ride request and the intake visit land on the clinician's Worklist; "Change it" asks Harvest to call.

Populates: the screening and intake dates on the referral and the student's timeline, and the next-step row on the parent portal.
