# How the data gets in · one note per screen

One note per screen for Community Counseling Center of Southern Nevada (adult substance use treatment, ASAM criteria, Nevada Medicaid). Each says what the screen captures, how it flows, what it populates, and the engineering behind it. Synthetic data only; plan behaviours are demo assumptions to confirm per contract.

## 0 · Sign in (`Login.dc.html`)

HOW THE DATA GETS IN · Sign in

Captured: email and password, or CCC of SN's single sign-on. The same login works in the app and the extension beside the Client Record.

Flows: the role set on Users & roles decides what each person sees: counselors and the peer specialist get the extension; the clinical supervisor gets the review and request screens; the clinical director signs requests; billing & admin (Dana Owens, Lena Ortiz) get authorizations, claims and credentialing.

## 1 · Where things live · read first (`WhereThingsLive.dc.html`)

HOW TO READ THE DEMO · Where things live

The rule the demo follows: a Client Record form is written by the extension beside it (intake screening, ASAM assessment, treatment plan, prior authorization requests, continued stay, discharge summary); everything that is not a Client Record form lives in the Psyflo app (referrals, eligibility, send and track, plan replies, partial decisions, peer-to-peer notes, reconsiderations, claims and denials, credentialing, analytics). The Client Record keeps tracking authorizations by entitlement with expiry and units-used reminders, as it has since 2009. Psyflo does the part that hurts: gathering the documentation, reformatting it for each plan, sending it, and working the denials.

## 2 · Do next · clinician home (Psyflo app) · Oct 29 (`DoNext.dc.html`)

HOW THE DATA GETS IN · Do next

Captured: nothing new. One list of what is due, built from the referrals, requests, clocks and reminders already in Psyflo: decisions due or overdue, 24-hour information requests, Molina's next 5-session request after session 3, peer-to-peer calls, new referrals from drug court, P&P, the ED and self-referrals.

Flows: each line opens the screen where the work happens; anything that is a Client Record form opens in the Client Record with the extension beside it.

## 3 · Referral partner portal (`SchoolPortal.dc.html`)

Hidden in the Nevada build. Drug court and P&P referrals arrive by fax or email and are entered on Referrals.

## 4 · Referral form (`ReferralForm.dc.html`)

Hidden in the Nevada build.

## 5 · Referral sent (`ReferralSent.dc.html`)

Hidden in the Nevada build.

## 6 · Referrals list (Psyflo app) · Oct 29 (`Referrals.dc.html`)

HOW THE DATA GETS IN · Referrals list

Captured: each referral as it arrives: Clark County drug court and Nevada P&P referrals (fax or email, with the case summary and a signed 42 CFR Part 2 release), hospital ED / UMC discharges, HIV clinic partners, and self-referrals by phone or the website. Intake staff type the few fields Psyflo needs; attachments are stored with the referral.

Flows: the stage moves as the eligibility check, the intake screening and the ASAM assessment happen. Clients with no Medicaid go to the grant programs (Ryan White Part A/C, SAPTA block grant, HOPWA) and need no prior authorization. The per-site table is counted from the list.

## 7 · Referral review (Psyflo app) · Oct 14 (`Referral.dc.html`)

HOW THE DATA GETS IN · review

Captured: nothing new. Psyflo reads the referral and its attachments (for T.W.: the drug court case summary with four positive drug screens and three missed check-ins since September, prior Level 1 treatment and two detox admissions) and lays out what already points to a level of care and what to ask on the screening call.

Flows: referral answers → fixed rules → 'shown / not shown / ask'. The final level of care is set by the ASAM assessment, not here. "Schedule screening call" creates the to-do; "Route to grant program" sends a no-Medicaid client to Ryan White / SAPTA with no PA step.

Engineering: rules are fixed logic over the form; the model only words the 'ask' prompts.

## 8 · Family link (`FamilyLink.dc.html`)

Hidden in the Nevada build: clients are adults and are called directly.

## 9 · Eligibility check (Psyflo app) · Oct 15 (`Eligibility.dc.html`)

HOW THE DATA GETS IN · Eligibility check

Captured: the Medicaid ID and date of birth from the referral (drug court and P&P send them) or from the screening call.

Flows: a person runs the Nevada Medicaid eligibility (EVS) lookup in their own login and records what it shows: FFS or which MCO (Anthem, CareSource, HPN, Molina, SilverSummit), effective dates and any gap. Psyflo stores the dated proof and sets a re-check while the client is in treatment. No Medicaid → grant program, sliding fee scale.

Populates: the referral's eligibility status; the payer on the prior authorization request.

## 11 · Client signs (`ParentSign.dc.html`)

Hidden in the Nevada build.

## 12 · Client portal (`ParentPortal.dc.html`)

Hidden in the Nevada build.

## 13 · Extension · home · Oct 29 (`ExtHome.dc.html`)

HOW THE DATA GETS IN · extension

Captured: the extension reads the Client Record page that is open (here the client list: names, program, units available by entitlement). Licensed staff get Scribe (record a conversation into the form you pick) and Review a request; admins get links to the Psyflo app.

Flows: what is on the page → Psyflo (read only). Which buttons appear comes from the person's role, set by the admin in Psyflo.

Populates: Scribe only ever writes into a form box on the open Client Record page; a person presses Save or Process.

Engineering: browser extension on the Client Record; reads the page on load; role enforced server-side so a counselor login cannot fetch request content.

## 14 · Scribe · intake screening · Oct 16 (`ExtScreening.dc.html`)

HOW THE DATA GETS IN · call

Captured: the screener's call with the client is recorded with consent (42 CFR Part 2 notice read first). Psyflo transcribes it and pulls out substances, amounts and last use, withdrawal history, prior treatment and detox, MAT, housing, legal status and referral source.

Flows: before the call, the extension fills the contact, Medicaid and referral boxes (green) from the referral and the eligibility record. During the call: audio → transcript → fields → typed into the yellow boxes on the open form. The screener checks and saves.

Populates: the Client Record screening form (the record); Psyflo keeps the fields for the ASAM assessment and the prior authorization request.

Engineering: audio deleted after processing; the extension writes only into boxes on the open form.

## 15 · Scribe · ASAM assessment · Oct 20 (`ExtCNA.dc.html`)

HOW THE DATA GETS IN · ASAM assessment

Captured: the in-person assessment is recorded (consent). Psyflo drafts the six dimensions: D1 acute intoxication / withdrawal potential, D2 biomedical conditions, D3 emotional, behavioral or cognitive conditions, D4 readiness to change, D5 relapse, continued use or continued problem potential, D6 recovery / living environment, each with a risk rating and the evidence. The urine drug screen taken that day is recorded with its result.

Flows: green boxes = copied from the referral and screening; yellow = written from today's recording. The LCADC checks every rating and the recommended level (1 or 2.1). Trauma history is never drafted.

Populates: the Client Record assessment (official). Psyflo keeps the dimension text for the treatment plan and the prior authorization request, and the UDS result so SilverSummit's Level 2.1 packet is complete.

## 16 · Scribe · treatment plan · Oct 21 (`ExtISP.dc.html`)

HOW THE DATA GETS IN · treatment plan

Captured: nothing new. Psyflo drafts goals with measurable objectives tied to the ASAM dimensions rated highest (for T.W.: D5 relapse prevention, D1/D2 MAT adherence, D6 recovery environment), with interventions from CCC of SN's list (motivational interviewing, relapse prevention, MAT coordination, Seeking Safety, peer support).

Flows: draft → typed into the yellow boxes on the open treatment plan → talked through with the client → clinician edits → client and clinician sign in the Client Record.

Populates: the Client Record treatment plan. Psyflo reads the saved plan back to check IOP group notes against it and to fill the goals on the initial and continued-stay requests.

## 17 · Review a request · prior authorization · Oct 22 (`ExtSRA.dc.html`)

HOW THE DATA GETS IN · prior authorization

Captured: nothing new. Psyflo writes the request from what it already holds: the ASAM assessment by dimension, the treatment plan, the referral and the UDS result. Level 2.1 IOP: H0015, 1 unit = 1 hour, 9 units a week (3 hours a day, 3 days a week), 72 units for 8 weeks. Level 1: H0004 / H0005. Each sentence carries its source.

Flows: the request is reformatted for the plan that will read it: CareSource's own form with the six ratings on page 1, HPN's portal boxes, SilverSummit's form plus the assessment-day UDS (Psyflo blocks the packet until it is attached, learned from 3 denials since Sep 22), the Client Record printout for the others. Clinician reads and edits → Fill → saves → signs in the Client Record with credentials and NPI.

Populates: the Client Record holds the signed form. Psyflo keeps a PDF copy and marks the request 'signed' on Authorizations, ready for Send.

Engineering: the extension writes form boxes only, never a submit; edit log between draft and saved version kept for audit.

## 18 · Sign-off · Oct 22 (`ExtSignOff.dc.html`)

HOW THE DATA GETS IN · Sign-off

Captured: nothing new. The form is already filled in the Client Record.

Flows: the clinical director reads it and signs there. Psyflo notes the time so the request clock starts. Psyflo never signs.

## 19 · Sent · a person presses Send · Oct 29 (`Submission.dc.html`)

HOW THE DATA GETS IN · Sent

Captured: the signed PDF, the packet Psyflo assembled for that plan (form, attachments, cover sheet), and the fax or portal result.

Flows: fax plans (SilverSummit, Molina, CareSource) → the clinician presses Send → Psyflo faxes through CCC of SN's Sfax account; reference and delivery receipt stored. Portal plans → Send opens Availity (Anthem), the HPN provider portal or the Nevada Medicaid portal in the clinician's own login with the packet ready; the extension reads the confirmation. Receipt check: Psyflo reminds a person to call on day 2, with the fax reference.

Populates: the request's stage and the plan's decision clock (per contract · confirm). Level 2.1 cannot be backdated, so every day without a decision is flagged as unbillable.

## 20 · Mobile app (`MobileApp.dc.html`)

Hidden in the Nevada build.

## 21 · Mobile · say what happened (`MobileDictate.dc.html`)

Hidden in the Nevada build.

## 22 · Mobile · assessments (`MobileAssess.dc.html`)

Hidden in the Nevada build.

## 23 · IOP group note (`ExtDPN.dc.html`)

Hidden in the Nevada build.

## 24 · Weekly individual session (`ExtWeekly.dc.html`)

Hidden in the Nevada build.

## 25 · Collateral contact (`ExtMonthly.dc.html`)

Hidden in the Nevada build.

## 26 · Incident report (`ExtIncident.dc.html`)

Hidden in the Nevada build.

## 27 · Supervisor review queue (`ReviewQueue.dc.html`)

Hidden in the Nevada build.

## 28 · Staff dashboard (`StaffDashboard.dc.html`)

Hidden in the Nevada build.

## 29 · Authorizations · Oct 29 (`Authorizations.dc.html`)

HOW THE DATA GETS IN · Authorizations

Captured: stage changes from the extension (saved, signed), from Send, and from plan replies; units from the Client Record client list (by entitlement) and the IOP group notes; decisions from Sfax or the portal read-back.

Flows: every event updates the row; the clocks (plan decision timeframe, 24-hour information request, Molina's next 5-session request after session 3, Level 1 session 24, renewal lead time) are computed from dates. Grant-funded clients need no PA and are not on this list. Filters: drafts to review and send, info requested, partial, denied, active, renewal due.

Populates: Analytics. Admins see the whole program; clinicians see their caseload.

Engineering: replaces the spreadsheet tracker; a one-time import seeds the history; every row has a History toggle with the request's full communication history in date order.

## 31 · Client survey (`ParentSurvey.dc.html`)

Hidden in the Nevada build.

## 32 · ASAM 30-day review (`ExtQuarterly.dc.html`)

Hidden in the Nevada build.

## 33 · Review a request · continued stay · Oct 29 (`ExtCase.dc.html`)

HOW THE DATA GETS IN · continued stay

Captured: nothing new. The clinician opens the continued-stay form in the Client Record; the panel assembles the draft from the IOP group notes, individual sessions, UDS results and collateral contacts (drug court, P&P) already copied to Psyflo, in the date range the clinician picks (last 30 days by default).

Flows: the draft is organised by ASAM dimension against the continued-service criteria. For a client abstinent inside Level 2.1 (M.R.: 5 weeks, 8 of 8 UDS negative since Sep 24) it argues D5: relapse risk remains high without the Level 2.1 structure, with dated UDS results, D4 and D6 status, and which step-down criteria are not yet met. Every sentence cites its note. Clinician edits → Fill → saves → signs → the clinician presses Send in the app.

Populates: the Client Record form; the Authorizations row and clocks; the peer-to-peer notes or the information-request reply if the plan pushes back.

## 34 · Plan asks for more information · Oct 29 (`InfoRequest.dc.html`)

HOW THE DATA GETS IN · asks for more

Captured: the request arrives in Availity (read by the extension when staff are logged in) or by fax (Sfax). The 24-hour clock starts when it is read.

Flows: Psyflo pairs the plan's questions (for K.T., Anthem wants the ASAM six-dimension summary) with the request already sent, the assessment and the last 30 days of notes → a reply. Items with no dated source are left for the clinician to answer from the chart.

Populates: faxed through Sfax by default, or pasted into the Availity case from the clinician's own login, after a clinician approves. Logged on the request.

## 35 · Partials & denials · Oct 29 (`Partials.dc.html`)

HOW THE DATA GETS IN · Partials & denials

Captured: the decision on a partial approval, with who and when. Molina approves Level 2.1 five sessions at a time (D.W.: 72 units asked, 5 sessions offered); IOP runs 3 days a week, so the next request must go in after session 3 to be decided before session 5, and Psyflo drafts it then.

Flows: accept and plan the next request; accept and step down; ask for a peer-to-peer. Internal choices are logged on the request; nothing goes to the plan without a person pressing Send. Denials open the reconsideration / appeal letter.

Populates: the request's stage and history on Authorizations; the step-down plan; the peer-to-peer call notes.

## 36 · Step-down · 2.1 to Level 1 · Oct 29 (`EarlyDischarge.dc.html`)

HOW THE DATA GETS IN · Step-down

Captured: the decision to step a client down from Level 2.1 IOP to Level 1 (or discharge), and the planned dates.

Flows: Psyflo lays out the last IOP day, the first Level 1 session and when the new Level 1 initial must reach the plan (some plans want a new initial, not a continued stay); reminders go to the clinician.

Populates: Authorizations; the new Level 1 initial request.

## 37 · Scribe · discharge / transfer summary (`ExtDischarge.dc.html`)

HOW THE DATA GETS IN · Discharge summary

Captured: nothing new. Counted from the IOP group notes, UDS results and the last continued-stay request.

Flows: drafted into the open Client Record discharge or transfer form with the ASAM ratings at admission and now; the clinician reads and saves.

Populates: the step-down plan and the new Level 1 initial request.

## 38 · Peer-to-peer call notes · Oct 29 (`PeerBrief.dc.html`)

HOW THE DATA GETS IN · notes

Captured: nothing new.

Flows: criteria text from the submitted request, organised by ASAM dimension; dates and UDS results from the notes; likely questions from the denial-reason table (most often "abstinent, no longer meets medical necessity"). T.N.'s call with Molina's medical director is Nov 4.

Populates: a printable page the clinician holds during the call; the outcome is logged back on the request. Recording is optional and only with everyone's agreement.

## 39 · Reconsideration / appeal letter · Oct 29 (`AppealLetter.dc.html`)

HOW THE DATA GETS IN · Reconsideration

Captured: the denial (reason, date, codes) read from Availity or the faxed letter, and the clinician's signature.

Flows: Psyflo drafts the letter from the denial and the record. For E.C. (Anthem denied 90837 as "provider type not eligible") it cites CCC of SN's Nevada Medicaid enrollment for both SUD and mental health (Provider Type 17, Specialty 215 · confirm) and the therapist's own NPI and Anthem credentialing. For timely-filing denials it attaches proof of the first submission. A person reads, signs and sends it.

Populates: the request's appeal stage and clocks.

## 40 · Payer playbook · what changed (`PayerPlaybook.dc.html`)

HOW THE DATA GETS IN · Payer playbook

Captured: what each plan asks for, learned from denials, information requests and replies, plus notes staff type in after a call (reps change every couple of months; nobody tells the clinic when policy changes).

Flows: "what changed" is surfaced from patterns: SilverSummit's unannounced UDS-at-assessment rule (3 denials since Sep 22), Molina's 5 sessions at a time, HPN not following the 24-session Level 1 rule, Anthem's provider-type misreads, CareSource's ratings on page 1. Used when drafting a request for that plan.

Populates: the request checklist and the drafting rules for each plan.

## 53 · Denial Intelligence · timely filing (`Claims.dc.html`)

HOW THE DATA GETS IN · Denial Intelligence

Captured: nothing new to type. Denials and payments are read from the 835 remittance files and EOBs the biller already downloads from each plan's portal (Nevada Medicaid, Anthem, CareSource, HPN, Molina, SilverSummit), plus the claim acceptance reports (277CA) that prove when a claim was first filed. Demo numbers.

Flows: each denial line is matched to its claim, client and clinician; the plan's denial code is decoded in plain English; the timely-filing clock (180 days from date of service · confirm per contract) counts down per claim. Psyflo flags "paid last week, denied this week" when the same code, clinician and client were treated differently, and ages the receivables.

Populates: a reconsideration packet with proof of timely filing that a person reviews and sends; the write-off trend and the AR aging on this screen.

Engineering: Psyflo reads the files the biller saves; it does not log in to plan portals or submit claims.

## 54 · Credentialing · NPI × plan (`Credentialing.dc.html`)

HOW THE DATA GETS IN · Credentialing

Captured: each clinician's credentialing status, entered by the credentialing coordinator (Lena Ortiz): NPI, Nevada Medicaid enrollment under Provider Type 17 / Specialty 215 (demo assumption · confirm), then each MCO packet, with the dates sent and approved and what each plan asked for.

Flows: Nevada Medicaid first (2–3 weeks typical, one took 6 months); its approval letter goes into every MCO packet (fastest about 6 weeks). Psyflo counts days waiting, names what is blocking (Medicaid letter, an information request), and counts sessions a clinician has seen that cannot be billed under that plan yet.

Populates: the grid on this screen; a warning on Authorizations and Claims when a request or claim names a clinician not yet credentialed with that plan.

## 42 · Analytics · Oct 29 (`Analytics.dc.html`)

HOW THE DATA GETS IN · Analytics

Captured: nothing new. Authorization outcomes from Authorizations and a one-time import of the tracker history (about 150–200 auth actions a month); measures (BAM, PHQ-9, GAD-7) and UDS results from the Client Record export; attendance from the IOP group notes; denials and write-offs from Claims.

Flows: the authorization baseline by plan is the pilot's scorecard (decided, partial rate, full denials, appeals, median decision days, step-downs, unbillable IOP hours). One client's progress over time shows BAM days of use, UDS negatives and PHQ-9 side by side. Grant reports (Ryan White, SAPTA) are assembled from the same rows.

Populates: the pilot measures and grant pulls on demand. Demo numbers.

## 43 · Users & roles (`Users.dc.html`)

HOW THE DATA GETS IN · Users & roles

Captured: who works at CCC of SN, their Nevada credential (LCADC, CADC, CADC-I intern, LCSW, LCPC, PRSS), NPI and role, typed in by the admin or imported from the staff list.

Flows: the role decides which buttons the extension shows and which pages the app shows; CADC-I interns can be set so every note waits for supervisor approval.

## 46 · Enrollment packet (`ParentEnroll.dc.html`)

Hidden in the Nevada build.

## 47 · Progress · client view (`ParentProgress.dc.html`)

Hidden in the Nevada build.

## 48 · 30-day review · client signs (`ParentQuarterly.dc.html`)

Hidden in the Nevada build.

## 49 · Plan letters, explained (`ParentLetters.dc.html`)

Hidden in the Nevada build.

## 50 · Book the assessment (`ParentSchedule.dc.html`)

Hidden in the Nevada build.
