# Psyflo × Harvest · build brief for Claude Code

Nov 6, 2026 · @Deanna

## What we are building

A working demo of the whole Psyflo vision for Harvest Outreach Center: every one of the 46 screens on the design canvas, clickable, on one shared dataset, with four flows that really run and everything else reading seed data. It is for showing a clinic what the product will be, not for a pilot; a scoped-down build follows later.

The canvas is the visual source of truth. Each screen exists as a `.dc.html` file in `screens/` (real markup and CSS, with the brand tokens and components already in it); `canvas.json` gives the order and titles; `notes.md` holds the "How the data gets in" note for every screen. Build the screens to look like the files, not approximately like them.

**Done means:**

1. Every screen in the register below renders with the seed data and every button or link on it goes somewhere real (the screen the canvas links to, or a state change on the same screen). No dead ends, no lorem.
2. The four live flows run end to end in front of an audience, on a laptop with the mock Lauris in one tab and the extension panel beside it, and on a phone-sized window for the phone and portal screens.
3. One login per role (direct support, supervisor, clinician, admin) lands on that role's first screen and hides what the role cannot see.
4. Nothing on any screen claims a thing the product cannot do under the rules in the next section. If a seeded number needs a source, the screen says it ("Harvest's Lauris export · Oct 29").
5. Synthetic data only. No real names, no real Medicaid IDs, no real payer phone numbers. The footer "Demo data · nothing is real" stays on every app screen.

## Rules that never bend

These come from Harvest and from Psyflo's own line on risk. Anything that would break one is out, however convenient.

1. **No Lauris integration.** No API, no database, no scraping of pages nobody has open. The extension reads and types on the Lauris page the user has in front of them, and nothing else. History older than the pilot comes from a file Harvest's admin exports from Lauris by hand (see Migration, screen 44).
2. **Open form only.** Psyflo writes into a Lauris form only while that form is open in the user's tab. Phone dictation and assessment answers wait in Psyflo until the staffer opens that student in Lauris, then drop in. Nothing is ever "sent to Lauris" in the background.
3. **A person presses Process Form, Get Signature and Send.** Psyflo drafts; a human reads and clicks. No stored clinician credentials, no unattended sessions in Availity, the UHC portal or the DMAS portal. Send means: for fax payers Psyflo faxes through Harvest's Sfax account after the click; for portal payers the click opens the portal in the clinician's own login with the packet ready.
4. **A person signs everything.** Clinician signatures happen in Lauris's Forms to Approve. Guardian signatures happen on the parent portal. Psyflo never signs.
5. **Eligibility is checked only after the guardian submits the family link with insurance details.** Never from the school's referral alone. A person runs the DMAS lookup from the details Psyflo prepared; Psyflo stores the dated screenshot and reminds weekly.
6. **TDT clients only.** The extension recognises TDT consumers and stays off for outpatient and SEBS records.
7. **Nothing invented in a draft.** Every sentence Psyflo writes into a form traces to a note, a call, the referral or the family link, and the panel can show which (the numbered source chips on the continued-stay screen are the model).
8. **Green and yellow.** On every Lauris form, green boxes are what Lauris already had; yellow boxes are what Psyflo typed and the user must check. The two-chip legend sits in every extension panel header.
9. **Lauris stays the record.** Psyflo keeps proofs (signed PDFs, fax receipts, eligibility screenshots, timer logs) and its own tracker, and never claims to be the chart.

## The four surfaces

One placement rule decides where every feature lives: **if it is a Lauris form, the extension writes it; if it is not, it lives in the Psyflo app; portals are for people without a Lauris login.**

| Surface | What it is | How to build it for the demo | Screens |
| --- | --- | --- | --- |
| Psyflo app | The platform: Do next, Referrals, Authorizations, Staff, Compliance, Analytics, Settings. Dark sidebar, paper background, DM Sans. | A web app with routes per screen, one seed store, role-based nav. | 0, 2, 6, 7, 9, 10, 19, 27, 28, 29, 34, 35, 36, 38, 40–45 |
| Lauris extension | A browser side panel beside Lauris pages. Reads the open page, types into open form boxes, shows the "Before you hang up" and "Boxes on this form" panels. | A real browser extension (Manifest V3, side panel) that targets the **mock Lauris** site below. If an extension is too much for the demo environment, the fallback is the mock Lauris rendering the panel inside its own page at the same 400px width; the panel code must be the same either way. | 13–18, 23–26, 32, 33, 37 |
| Phone app | What direct support staff carry: pick a student or say the name, timer, say what happened, assessments. | A responsive web app at 390×844 (PWA is enough); microphone input real, transcription stubbed or real (see stack). | 20, 21, 22 |
| Parent portal | For guardians: family link, consent signing, progress in plain words, 2-minute check-in, appeal letter. English and Spanish toggle. | Phone-sized public pages reached by a tokenised link (no login). | 8, 11, 12, 31, 39 |
| School portal | For counselors, teachers and administrators: refer, share today, teacher check-in, how students are doing. | Desktop public pages with a school login (seeded users). | 3, 4, 5, 30 |

The mock Lauris is a fifth thing to build: a plain multi-page site that looks like Lauris Online (navy sidebar, Consumers list, consumer record with the six tabs, Session Entry forms, Forms to Approve) and holds the seed consumers. It exists so the extension has real DOM to read and real inputs to type into. Section "Mock Lauris" lists its pages and form fields.

## Cast and calendar

One dataset, one "today" (Thu Oct 29, 2026), and every screen reads from it. `seed.json` in the bundle is the authoritative copy; the canvas board titles carry each screen's story date so you can tell which moment in the timeline a screen shows.

| Who | Story | Where they appear |
| --- | --- | --- |
| **T.W., 12** · Lynchburg MS-2 · grandmother Denise Rivers · clinician J. Perez · Humana | The new student. Referred Oct 13 → family link Oct 14 → eligibility Oct 15 → screening call Oct 16 → consent signed Oct 19 → intake Oct 20 → plan Oct 21 → request processed, signed and faxed Oct 22 (F-2291) → receipt confirmed Oct 27 → decision due today | School portal, referral, family link, eligibility, parent screens, screening, intake, plan, initial request, sign-off, Sent, Do next |
| **M.R., 7** · Campbell ES-1 · staff K. Hale · Anthem | The student in service. In TDT since Feb; authorization Aug 18 – Nov 13, 83 of 110 units used; continued stay drafted from 61 notes; quarterly ready; weekly call and monthly collateral today | Phone app, daily note, weekly, monthly, quarterly, continued stay, staff dashboard, analytics "one child" |
| **D.W., 15** · Campbell HS-1 · staff S. Lane · Sentara | The partial. Sentara offered 110 of 150 on Oct 27; Level 2 incident Oct 28 (state portal due today); plan: accept, discharge Dec 5, new initial Dec 8 | Incident, partials, early discharge, discharge summary, compliance |
| **K.T., 9** · Lynchburg MS-2 · Anthem | The information request: Anthem asked for three things Oct 28, 5:40 pm; reply due today | Info request, authorizations |
| **T.N., 8 (girl)** · Campbell ES-1 · Sentara | The peer-to-peer: 65 of 150 awarded, units ran out, call Dec 9 | Peer-to-peer brief, partials, authorizations only |
| **E.C., 5 (Ethan)** · Lynchburg ES-3 · Anthem | The denial: guardian-led appeal, 51 days left | Appeal letter, partials |
| **J.T., D.P., A.G., E.S., C.B.** | K. Hale's other students | Extension consumer list, phone, staff dashboard |
| **L.B., N.K., P.S., R.D.** | R. Owens's (trainee) students | Review queue |
| **A.M., 10 · J.O., 14 · L.V., 16** | Highest-need list, early-discharge example, after-school example | Compliance, authorizations |

**Staff:** Jordan Perez (LPC, clinician, signs requests) · Dana Owens (admin, program office, runs the Lauris export) · Carla Diaz (site supervisor, Campbell ES-1/ES-2, reviews R. Owens's and S. Lane's every note) · Kayla Hale (QMHP-C, direct support) · R. Owens (QMHP-T, new hire) · S. Lane (QMHP-C, backlog) · J. Reyes (QMHP-C). **School:** R. Bell (counselor, MS-2), Mr. Okafor (7th-grade math).

**Payers:** the five Cardinal Care MCOs plus FFS, with channel, decision days, partial rate and "tends to ask / what works" in `seed.json` → `payers`. Fax payers: Sentara, Humana, Aetna, FFS. Availity: Anthem. Portal: UHC.

## Data model

Ten records. Keep it flat; the demo does not need more than a JSON store with ids.

| Record | Key fields | Written by |
| --- | --- | --- |
| Staff | id, name, credential, role (direct\_support · supervisor · clinician · admin), sites, review\_mode (spot\_check · every\_note), reviewer | Users screen |
| School, SchoolUser | id, name, locality; user name, role, school | Seed; school portal login |
| Referral | id, client (initials, age, grade, school), guardian, form answers (concerns, interventions tried, attachments, referral\_for), stage (needs\_screening · waiting\_on\_school · screening\_booked · in\_intake · in\_service · grant\_program), screening (who, when), family\_link (sent, opened, steps done) | School portal referral form; Referral review |
| FamilyLink | referral, token, steps (guardian · insurance · consent · best time · transport), answers, submitted\_at | Family link pages (phone) |
| Eligibility | client, checked\_at, checked\_by, result, plan, effective, screenshot, next\_check | Eligibility screen (a person records the result) |
| Client | id, initials, first\_name (parent screens only), age, grade, school, harvest\_no, guardian, medicaid (plan), clinician, staff, stage, service\_start, diagnosis, goals\[ \] (n, name, objective, interventions), strengths, authorization (payer, units, used, start, end) | Intake and plan (extension); Migration import |
| Request | id, client, payer, channel (fax · availity · portal), service, type (initial · continued\_stay · additional\_info · peer\_to\_peer · early\_discharge\_new\_initial · appeal), units\_requested, units\_awarded, dates, stage (see lifecycle), clocks, proofs (signed\_pdf, fax\_ref, delivery\_receipt, receipt\_call), events\[ \] (timestamp, what, who) | Extension (draft), Sign-off, Sent, Partials, Info request |
| Note | client, staff, date, type (daily · weekly\_guardian · monthly\_collateral · quarterly · incident · discharge), fields per type, dictation, enhanced, review (pending · approved · returned · flagged), contact\_time\[ \], units, processed\_at | Phone app, extension, review queue |
| Incident | date, client, school, level (1–3), what, actions, cps, injury, state\_portal (due, filed), supervisor\_review | Incident form (extension); Compliance |
| Checkin | client, week\_of, by (teacher or guardian), answers | School portal, parent portal |
| Assessment | client, instrument (PHQ-A · GAD-7 · SUDS · DSM cross-cutting child/parent), date, score, answers (held until the student is open in Lauris) | Phone app; Migration import |
| Export | run\_at, run\_by, counts per table | Migration screen |

The audit trail is one append-only `events` list across records (timestamp, who, what, record) and is what Sent, Info request and the review queue read when they show "what happened, in order".

## Request lifecycle

A request moves through these stages; a person's click moves it except where the trigger is a reply arriving or a clock running out. The Authorizations screen's filters (All open, Needs my sign-off, Info requested, Partial, Denied, Active, Renewal due) are views over `stage`.

| Stage | How it gets here | Clock shown | Leaves when |
| --- | --- | --- | --- |
| draft\_ready | Psyflo drafted the form from the record (initial: after the ISP; continued stay: 14 business days before the authorization ends) | days left to the 30-day limit (initial) or days of units left (continued stay) | Clinician presses Process Form in Lauris → awaiting\_signature |
| awaiting\_signature | Form processed in Lauris | same | Get Signature pressed in Forms to Approve → signed |
| signed | Signed PDF saved from the Lauris preview; packet assembled | — | Clinician presses Send → submitted |
| submitted | Faxed (Sfax ref) or uploaded in the clinician's portal session | decision due = sent + 7 calendar days; receipt check on day 5 for Humana | Reply arrives → approved / partial / info\_requested / denied; clock passes → overdue |
| overdue | No reply by the due date | days overdue | Reply arrives; overdue notice drafted for a clinician to send |
| info\_requested | Payer asks for more (fax read by OCR, or read when the clinician opens Availity) | 24 h from when it was read | Clinician sends the reply → submitted (clock restarts) |
| partial\_decide | Payer offers fewer units (call logged by staff, or letter) | reply-by date | One of four doors: accept → active; add information → info\_requested (only if the payer asked); peer-to-peer → peer\_to\_peer\_booked; early discharge → active with a discharge plan |
| peer\_to\_peer\_booked | Call date set by the payer | days until the call, units left before it | Outcome logged → active or denied |
| denied | Full denial | appeal window (guardian-led) | Guardian signs the appeal letter → appeal\_sent; or closed |
| appeal\_sent | Faxed after the guardian signs | payer's appeal clock | Decision → active or closed |
| active | Units awarded | units left; renewal due = end − 14 business days | Renewal window opens → a new continued-stay request in draft\_ready; or early\_discharge planned |
| early\_discharge | Plan set on the Early discharge screen | discharge date, earliest new initial (30 days after acceptance) | Discharge summary processed → new initial request in draft\_ready |

**Units arithmetic used everywhere:** 3 units per school day when direct time is 5 h or more; 150 units ≈ 13 weeks; renewals go in 14 business days before the end date; a new initial after early discharge needs 30 days from the acceptance date.

## The four live flows

These must work in front of an audience, with real input and visible results. Everything else can be seeded.

**Flow A · Screening call fills the Lauris form (screens 7 → 14 → 15).** Start on Referral review for REF-118 with the family link submitted and eligibility recorded. Open the mock Lauris, create the consumer, open Admission Screening; the panel shows the six boxes already filled from the referral and the family link (yellow). Press Record and read the scripted screening call in `scripts/screening_TW.md` aloud (or play the provided audio). While recording, the panel shows only the "Before you hang up" prompts, which tick off as the matching answers are spoken. Press Stop: Psyflo drafts the 19 boxes into the open form, yellow, with the narrative summary last. The user edits one box, presses Process Form in the mock Lauris; the request's clock starts. Then open the CNA for the same consumer: presenting issue and prior services are pre-filled from the screening (copied, green-on-yellow label "copied from screening").

**Flow B · Say what happened, then the daily note (screens 20 → 21 → 23).** On the phone, K. Hale is with M.R. (timer running since 1:52). Tap "Say what happened", speak one sentence (the seed dictation is the fallback), see it turned into note language with the ISP intervention and goal named, tap Looks right. Switch to the laptop: open M.R. in the mock Lauris, open today's Daily Progress Note. The panel says "1 dictation waiting"; the narrative and the contact-time rows drop into the open form, yellow, with the "What Psyflo added, and where it came from" chips. The user confirms the 3 units, presses Process Form. The staff dashboard's "Daily notes today" goes 4 of 6 → 5 of 6.

**Flow C · Draft, sign, send, track (screens 17 → 18 → 19 → 29).** Open T.W.'s TDT Initial SRA in the mock Lauris; the panel shows the draft with the criterion text editable in the panel, "Fill all 7 boxes" types them into the form. Process Form. Open Forms to Approve, press Get Signature; Psyflo saves the preview as the signed PDF and assembles the packet. Open Psyflo's Sent screen for R-0416, press Send: for Humana (fax) the stubbed Sfax returns a reference and a delivery receipt within a few seconds and the timeline gains the two events; the Authorizations row moves to Submitted with "decision due Oct 29". (For a portal payer, Send opens the mock Availity page instead.) Then on Authorizations press "Reply received" on the demo-only control and choose partial: the row moves to Partial — decide and the Partials screen shows the four doors.

**Flow D · The family link (screens 8 → 9 → 11 → 12).** From Referral review press "Send the family link"; the SMS is stubbed, and the link opens on the phone-sized window. Walk the five steps; on the insurance step choose Medicaid through a health plan, type a fake ID, Next. On submit the Eligibility screen in the app changes from "waiting for the family link" to "details received — run the check", with the lookup details prepared; the user records the result (active, Humana) and the referral's eligibility chip updates. Then open Parent signs, sign with a finger, and see the Parent portal show the consent done.

**Demo-only controls.** Because replies from payers cannot arrive during a demo, the Authorizations screen gets a small "Demo: receive a reply" control (approved · partial · information request · denied) that is visible only to the admin role and labelled as demo. Same for "Demo: advance the clock a day". These are the only places the demo cheats, and they are labelled.

## Drafting rules and a worked example

Every draft Psyflo writes into a form, and every enhanced note, passes these checks before the panel shows it. They are the product's judgment, so implement them as explicit checks with a visible pass/fail in the panel ("Checked before you process"), not as hints in a prompt.

1. **Dates within the last 30 days** for anything offered as current evidence; older facts are labelled with their date.
2. **Counts, never percentages:** "3 of 5 escalations", "6 dated occasions (Oct 2, 6, 9, 14, 20, 22)". The forms ask that way.
3. **Frequency, duration, intensity** for every behaviour named (2–3×/week · 5–20 min · moderate).
4. **Interventions named from Harvest's list** (`seed.json` → `interventions`), with *why* it was used (movement → regulation), not just that it happened.
5. **Every note names an ISP objective** and states progress as a count.
6. **No "observed":** direct-support notes say what the staffer did ("worked with", "prompted", "used"), never what they watched.
7. **Prior services carry provider, dates and outcome.** An empty outcome blocks the draft and asks the question instead ("Did Piedmont help? When did it end and why?"). "Information about outpatient" and pro-bono contacts are flagged as not counting as prior care.
8. **School counseling goes under care coordination,** never as the failed prior service.
9. **Criterion 3 is left blank when criteria 1 and 2 are met** (two of three is enough); the panel says so.
10. **Nothing the clinician marked exclude,** and nothing from the family that is not on the form's question. Household disclosures stay out of payer-facing text unless the clinician presses Include.
11. **Trauma-informed care and the admission decision are never drafted.** Psyflo notes when the section was discussed and leaves the box to the clinician.
12. **Answer the question and stop** on information requests: three items asked, three answered, nothing added.
13. **Vary language across days.** If a staffer's last 30 notes share a paragraph, the enhancer varies it and the supervisor sees the pattern.
14. **Quiet day rule:** a day with nothing to report says what was maintained and what still needed staff presence, so a flat week never reads as "goals met".

**Worked example.** `scripts/screening_TW.md` is a complete scripted screening call with the expected box-by-box output. Use it as the acceptance test for Flow A: feed the transcript in, compare the drafted boxes to the table at the bottom of the script. The same facts later feed the initial SRA (screen 17): criterion 1 from the aggression and elopement rows plus the school's numbers; criterion 2 from the Piedmont row with its outcome; level of care from "alternative placement raised twice"; strengths from the last answer. `scripts/dictation_MR.md` is the Flow B equivalent: one spoken sentence in, the enhanced daily-note paragraph out, with the three source chips (intervention from the ISP list, duration from the timer, objective from the plan).

## Mock Lauris

A plain server-rendered site that looks like Lauris Online and holds the seed consumers. The extension reads it and types into it; nothing else talks to it. The left half of every extension screen on the canvas is the reference for its look (navy sidebar #2F3A4A, white form cards, Arial, green/yellow boxes). Field names below are our best reading of Lauris from Harvest's descriptions; Harvest should correct them from a real screen before the pilot, and the extension must map fields by label text, not position, so corrections are cheap.

| Page | Route | What is on it |
| --- | --- | --- |
| Sign in | `/login` | Username, password; any seed staff id signs in |
| Consumers | `/consumers` | Filter row (consumer, record #, assigned staff, caseload group), list with Unique ID · Name · Staff · Group · Last updated · Units available; Active / Discharged tabs. Sidebar counts: Saved Session, Forms to Approve, Rejected Forms, Consumers w/o Authorizations |
| Consumer record | `/consumers/:harvest_no` | Header (initials, Harvest #, locality, school, staff, units available / "No authorizations available"); tabs General Information · Authorization Information · Documents · Active File · Medications · Allergies |
| Session entry | `/consumers/:id/session/:form` | "Add Session" with a form picker, then the form. Forms: `screening`, `cna`, `isp`, `dpn`, `weekly`, `collateral`, `quarterly`, `incident`, `sra-initial`, `sra-continued`, `discharge`. Each ends with **Save Form Data** and **Process Form** |
| Saved Session | `/saved` | Forms saved but not processed (the morning list direct staff open) |
| Forms to Approve | `/approvals` | Processed forms awaiting signature, with a PREVIEW ONLY render and **Get Signature** / **Reject** |
| Rejected Forms | `/rejected` | Reviewer note per form |
| Surveys | `/consumers/:id/surveys` | PHQ-A, GAD-7, SUDS, DSM cross-cutting; Lauris scores on save |

**Form fields the extension must find by label.** Admission screening: Guardian on the call · Medicaid · IEP · behaviours table (Behaviour, Y/N, Frequency, Duration, Intensity, Example given) · Prior / current services · School coordination to date · Narrative summary · Meets admission criteria? · Preliminary diagnosis. CNA: Presenting issue · Prior services · Developmental history · Medical / medications / prescriber · Family mental-health history · Trauma history · PHQ-9 items · Strengths and resources (48 boxes total). ISP 2.0: Diagnosis 1 · Start / end · Prescribed frequency · Setting · Presenting issue · Strengths · Goals 1–3 (Objective, two intervention drop-downs from the list, Est. completion) · Discharge criteria · Signatures. Daily Progress Note: Service · Setting · Direct time · Units · Objective addressed (drop-down from ISP) · Interventions (ISP picklist) · Mood check-in · Progress today · Narrative. Weekly: Date · Contact with · Duration · Release on file · What was discussed · Follow-up. Collateral: Date · Collateral · Method · Release · Information shared/received · Coordination. Incident: Date/time · Location · Level · Staff present · What happened · Actions taken · CPS report · Injury · Supervisor review. TDT Initial SRA (H2016): Member · Group NPI / tax ID · Procedure · Request dates / units / hours · Section I criteria 1–3 · Level of care · Section III trauma-informed care · Barriers · Goals 1–3 · Strengths · Discharge. CMHRS Continued Stay: Member · Current authorization · Units used · Request · Progress toward goals · Continued need / risk · Care coordination · Family involvement · Barriers · Goals. Quarterly: Goal 1–3 progress · Assessments · Recommendations · Attendance / school functioning · Guardian signature. Discharge: Discharge date · Reason · Dates of service · Progress · Condition at discharge · Services recommended · Guardian notified.

**What Process Form does in the mock:** marks the session processed, timestamps it, copies the form into the consumer's Active File, and (for the SRAs, ISP and quarterly) adds it to Forms to Approve. **Get Signature** stamps the reviewer and time and exposes a "signed" preview the extension can save as PDF. **Reject** adds a reviewer note and moves it to Rejected Forms. The extension listens for all three.

## Screen register

Numbers match the canvas board titles. **Live** means the screen reads and writes the store and its buttons do what they say; **Seeded** means it renders from `seed.json` and buttons navigate but do not compute; **Seeded + Live** means the data is seeded and the listed actions work. Every screen's look comes from its `.dc.html` file.

| # | Screen | Surface | Build | What the user can do |
| --- | --- | --- | --- | --- |
| 0 | Sign in (`Login.dc.html`) | App | Live | Sign in as any seed user; land on the role's first screen (direct support → phone/extension home, supervisor → Review queue, clinician → Do next, admin → Authorizations) |
| 1 | Where things live (`WhereThingsLive.dc.html`) | Canvas | Static | Audience reference; link it from the demo nav as "How it fits" |
| 2 | Do next · clinician home (`DoNext.dc.html`) | App | Live | Lists from the store: today's calls, decisions due, replies due, drafts; each line opens its screen; changes as flows run |
| 3 | School portal (`SchoolPortal.dc.html`) | Portal | Seeded + Live | Refer a student → form; Share today → sends a Checkin; teacher check-in saves answers; student cards read counselor counts and check-ins |
| 4 | Referral form (`ReferralForm.dc.html`) | Portal | Live | Full referral form; Submit creates a Referral (REF-122) and opens Referral sent; Save and finish later keeps a draft |
| 5 | Referral sent (`ReferralSent.dc.html`) | Portal | Live | Confirmation; "attach now" adds the missing attachment to the referral |
| 6 | Referrals list (`Referrals.dc.html`) | App | Live | List over Referral.stage; filters; rows open Referral review; per-school table counted from the list |
| 7 | Referral review (`Referral.dc.html`) | App | Live | Schedule screening call (writes screening + a Do next line); Send the family link (Flow D); Route to grant program; criteria panel reads the referral form |
| 8 | Family link (`FamilyLink.dc.html`) | Parent | Live | Five-step tokenised form on the phone; insurance step; submit updates the Referral and Eligibility |
| 9 | Eligibility check (`Eligibility.dc.html`) | App | Live | Shows prepared lookup details after the link; a person records the result (active/inactive, plan); weekly reminder |
| 10 | Settings · family link (`FamilyLinkSettings.dc.html`) | App | Seeded | Toggle questions on/off; preview on a phone opens Family link; Save persists |
| 11 | Parent signs (`ParentSign.dc.html`) | Parent | Live | Plain-language summary, full form expander, finger signature; Sign stores a PDF and marks the consent done |
| 12 | Parent portal (`ParentPortal.dc.html`) | Parent | Seeded + Live | Reads consent state, this week's progress (from notes), check-in due; English/Spanish toggle |
| 13 | Extension home (`ExtHome.dc.html`) | Extension | Live | Role toggle (demo), three task tiles with form picker and student picker; Open Psyflo links; consumer list read from the mock Lauris page |
| 14 | Screening call (`ExtScreening.dc.html`) | Extension | Live (Flow A) | Record/Stop, "Before you hang up" prompts tick as answers are heard, Stop drafts 19 boxes, Fill / One at a time |
| 15 | Intake / CNA (`ExtCNA.dc.html`) | Extension | Live (after Flow A) | Fields pre-filled from screening; Pause recording; "Still to ask" list; Fill 31 boxes |
| 16 | Treatment plan (`ExtISP.dc.html`) | Extension | Seeded | Three goals drafted; Fill the 3 goals types them; "Where each goal came from"; merge suggestion |
| 17 | Initial SRA (`ExtSRA.dc.html`) | Extension | Live (Flow C) | Criterion text editable in the panel; Fill all 7 boxes; checks pass/fail; Process Form in the mock |
| 18 | Sign-off (`ExtSignOff.dc.html`) | Extension | Live (Flow C) | Reads Forms to Approve; Get Signature stamps and saves the PDF; "After signing: open Send" |
| 19 | Sent (`Submission.dc.html`) | App | Live (Flow C) | Send presses Sfax stub (fax) or opens mock Availity (portal); timeline from events; Overdue notice ready |
| 20 | Mobile app (`MobileApp.dc.html`) | Phone | Live (Flow B) | Student chips, Start/Stop timer (keeps running), Say what happened, day-so-far from the store |
| 21 | Say what happened (`MobileDictate.dc.html`) | Phone | Live (Flow B) | Microphone (or typed), note-language rewrite with chips, Looks right / Fix it; waits for the open student |
| 22 | Assessments (`MobileAssess.dc.html`) | Phone | Seeded + Live | Due list; Ask now opens a two-question SUDS and stores answers until the student is open in Lauris |
| 23 | Daily note (`ExtDPN.dc.html`) | Extension | Live (Flow B) | Dictation waiting drops in; narrative with source chips; contact-time rows from the timer; confirm units; Good recommendation / That didn't happen |
| 24 | Weekly guardian call (`ExtWeekly.dc.html`) | Extension | Seeded | Record/Stop; Fill 4 boxes; "Also noted for the continued stay" |
| 25 | Monthly collateral (`ExtMonthly.dc.html`) | Extension | Seeded | Record/Stop; filled-from chips (portal, call, chart); Fill 3 boxes |
| 26 | Incident report (`ExtIncident.dc.html`) | Extension | Seeded | Level 2 banner with the 24-h clock; Fill 6 boxes; state-portal button opens an external stub and logs the time |
| 27 | Supervisor review queue (`ReviewQueue.dc.html`) | App | Live | Queue of notes by trainee; wrote-vs-enhanced diff; Approve / Return with a note / That didn't happen update the note |
| 28 | Staff dashboard (`StaffDashboard.dc.html`) | App | Seeded + Live | My view / Supervisor view toggle; KPIs count from notes; open items link out; goal watch per student |
| 29 | Authorizations (`Authorizations.dc.html`) | App | Live | Filters over Request.stage; payer/service/type filters; row buttons open the right screen; demo-only "receive a reply" and "advance a day" for admins |
| 30 | Teacher check-in (`SchoolTeacher.dc.html`) | Portal | Live | Teacher's own students; Share today; one-minute check-in saves answers |
| 31 | Parent survey (`ParentSurvey.dc.html`) | Parent | Live | Three questions + free text; Next saves a Checkin and updates the parent portal |
| 32 | Quarterly report (`ExtQuarterly.dc.html`) | Extension | Seeded | Per-goal bars from 61 ratings; Fill 6 boxes; guardian signature sent to the parent portal |
| 33 | Continued stay (`ExtCase.dc.html`) | Extension | Seeded + Live | Date-range toggle recounts keyword tallies; Include/Exclude the household disclosure; Fill the 6 yellow boxes; numbered source chips |
| 34 | Information request (`InfoRequest.dc.html`) | App | Seeded + Live | Reply drafted from the request + notes; Edit; "Open in Availity and send" opens the mock Availity and logs the send; 24-h clock |
| 35 | Partials & denials (`Partials.dc.html`) | App | Live | Four doors; choosing one sets the plan and moves the request; last-time comparison; why-insurers-say-no table from the tracker |
| 36 | Early discharge (`EarlyDischarge.dc.html`) | App | Live | Computes units run-out, earliest new initial (30 days), discharge and intake dates; Set this plan writes reminders |
| 37 | Discharge summary (`ExtDischarge.dc.html`) | Extension | Seeded | Summary drafted from notes; Fill 6 boxes; Then: new intake Dec 8 |
| 38 | Peer-to-peer call notes (`PeerBrief.dc.html`) | App | Seeded | Call notes assembled from the request; Print; Log the outcome moves the request |
| 39 | Appeal letter (`AppealLetter.dc.html`) | Parent | Live | Guardian reads the letter, Change the wording (editable), Sign and send → appeal\_sent; English/Spanish |
| 40 | Payer playbook (`PayerPlaybook.dc.html`) | App | Seeded | Table from payers in the seed; "Rules Psyflo applies to every draft" lists the drafting rules |
| 41 | Compliance (`Compliance.dc.html`) | App | Seeded + Live | Incident table from incidents; File now for the Level 2; QI evidence; credentials; supervision notes; Print the binder (PDF stub) |
| 42 | Analytics (`Analytics.dc.html`) | App | Seeded | Baseline KPIs and monthly chart from analytics\_baseline; by-payer table; one-child table from M.R.'s quarter; Export PDF/CSV stub; locality toggle |
| 43 | Users & roles (`Users.dc.html`) | App | Live | Add a user; change role; what-each-role-can-see table; role drives nav everywhere |
| 44 | Migration (`Migration.dc.html`) | App | Seeded | Export counts and cadence; Missing signatures list; "Send to portal" creates a parent-portal signing task |
| 45 | Settings · library (`SettingsLibrary.dc.html`) | App | Seeded | Consents and knowledge library; Add a document (upload stub) |

## Stack, stubs and the bundle

**Stack (suggested, not required):** one monorepo. `app/` and `portals/` as a single React (or similar) web app with routes, served on one origin; `mock-lauris/` as a small server-rendered site on a second port; `extension/` as a Manifest V3 side-panel extension pointed at the mock Lauris origin (with the in-page fallback described under surfaces); `phone/` as routes inside the web app constrained to 390px; one JSON store (`seed.json` loaded into SQLite or an in-memory store with a reset button). Styling: lift the CSS from the `.dc.html` files; the tokens are navy #151B24, teal #217A78, light teal #5FC0BE, marigold #F0B44C, paper #F8F6F2, DM Sans; Lauris shell #2F3A4A with Arial.

**Real vs stubbed:**

| Capability | Demo build |
| --- | --- |
| Speech to text (screening, dictation) | Real if a key is available (any hosted STT); otherwise the scripted transcript files are the input and the UI still shows "Recording" |
| Drafting and enhancement | Real LLM call behind a single `draft(formType, sources)` function that enforces the drafting rules and returns box-by-box text plus source references; the worked examples are its tests |
| Fax (Sfax) | Stub that returns a reference and a delivery receipt after 3 s and stores the "sent" PDF |
| SMS (family link) | Stub that shows the message and the link on screen |
| Availity / UHC portal | A one-page mock per portal with an upload box and a confirmation the extension can read |
| DMAS eligibility | Not automated at all; the Eligibility screen is where a person records a result |
| Signed PDFs | Render the Lauris preview to PDF in the browser |
| Email | Stub that logs to the events list |
| Lauris export / import | Seeded; the Migration screen shows counts; a "re-run export" button just re-reads the seed |
| Analytics chart | Drawn from `analytics_baseline.monthly` |

**Roles and what they hide:** direct support sees the extension (own students), the phone and their own dashboard; supervisor adds the Review queue, the Staff dashboard and Compliance for their site; clinician adds screening, intake, requests, Authorizations and the Do next home; admin sees everything plus Users, Migration, Settings and the demo-only controls.

**What is in the bundle (`psyflo-harvest-handoff.zip`):**

- `BRIEF.md` — this document
- `screens/*.dc.html` — the 46 screens (markup, CSS, and a small `Component` class per screen with its demo state) and `canvas.json` (order, titles, sizes)
- `notes.md` — the "How the data gets in" note for every screen
- `seed.json` — the dataset
- `scripts/screening_TW.md`, `scripts/dictation_MR.md` — worked examples and acceptance tests for Flows A and B
- `demo/psyflo-harvest-demo.html` — the single-file clickable storyboard, useful for seeing how screens link and for the "How the data gets in" drawer
- The UX audit (reasoning behind the current wording and data choices) lives at https://claude.ai/artifact/7RvD7RFsVH2kfoDX4PLDEw; the design canvas at https://claude.ai/artifact/4oiK8qkV7iKyj7pHUSUiqw
- `product-direction.md` — the product vision and the feature inventory from Harvest's transcripts, for anything the screens do not settle

**Open with Harvest (do not block on these):** whether Lauris copies ISP goals into the SRA form; the exact Lauris field labels; whether Harvest's Sfax account can be used for the demo; the real DMAS and CMHRS form text.
