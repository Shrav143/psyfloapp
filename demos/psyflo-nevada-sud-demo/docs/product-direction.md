# Psyflo × Harvest — Product Direction from the Site Visit

Nov 5, 2026 · @Deanna

## What the evidence is

Six of the nine recordings in the Drive folder were readable: the six public Plaud links from the 10/29 and 10/30 site visit, about 11.7 hours of audio. The three links dated 11/04 and 11/05 are workspace-only and need a Plaud login; their transcripts were pasted in afterwards and are cited as t7 (11/04 leadership demo, about 2 hours, ten decision-makers), t8 (11/04 session with Michelle Hamilton, Clinical Advisor) and t9 (11/05 conversation with a program director about escalation and the opt-out program). Speakers are labelled by Plaud as "Speaker N"; roles below are inferred from content and marked where uncertain.

| Recording | Length | Harvest voices | Setting |
| --- | --- | --- | --- |
| 10/29 Field consult: TDT PA workflow and barriers | 97 min | Jillian, LPC, Asst. Clinical Support Supervisor | Interview at a school site |
| 10/29 Planning: school-based TDT documentation automation | 165 min | TDT direct staff and a site lead (names not given), then Psyflo team only | School visit, then team debrief |
| 10/29 Program walkthrough: denials, intake, authorizations | 78 min | A long-tenured program representative (14 years) | Walkthrough of forms and Lauris |
| 10/30 Partnership discussion | 214 min | Executive director (founder) and leadership | Harvest main site, Beacon |
| 10/30 Product-design meeting | 71 min | Clinic lead (likely the executive director) | Demo and pilot discussion |
| 10/30 Product discovery: workflow and Virginia compliance | 75 min | Clinic lead; Michelle Hamilton named as point person | Demo walkthrough, licensing |

One organization only, so every count in this doc is "within Harvest": it is strong evidence for Harvest's pilot and thin evidence for the market. Where Harvest voices disagree with each other, that is shown rather than averaged.

## The vision

Psyflo is the evidence layer for school-based behavioral health: every contact becomes a note, every note becomes a case, and every case becomes proof, to a payer, an auditor, a parent or a funder. Prior authorization is the outlet that pays and the reason a clinic buys, but it is not the product's identity; the 11/04 leadership meeting made that plain when the energy went to notes that teach staff how to write (t7, 1:41:01), a parent who signs before intake so the child shows up (t7, 14:26), teachers feeding the record (t7, 33:46), and supervisors seeing who is behind (t8, 47:32). Michelle Hamilton set the order: paperwork in order first, then client progress, and authorizations fall out of that (t8, 35:27).

The product has four doors and one engine. Staff live in the extension inside Lauris and in a mobile app on the work iPhones; supervisors and admins live in the platform (tracker, staff dashboard, analytics); parents and schools put evidence in through two portals. The engine is the same everywhere: capture, cite the source of every sentence, a person signs, a clock runs, a number comes out. That is why the 11/01 simplification ("the extension is the product, the platform is two tabs") stays true for the frontline staffer and the first phase, but cannot stand as the whole vision: two of the product's strongest supporters asked for a parent portal, a school portal and a staff dashboard by name.

One hundred and thirty distinct features came up across the six site-visit recordings, the 11/01 feedback session and the 11/04–11/05 transcripts (48 on a first pass, 48 on a line-by-line re-read, 34 from the November meetings). That inventory is now a risk of its own, so the vision carries a discipline the site-visit week did not need: the order is not negotiable. Notes and time on the phone first, the clinician's packets second, the portals and the staff dashboard third, compliance and the quality layer after, and no phase ships to Harvest until the one before it has met its proof. Access is the entry point; quality of care is where it goes (t8, 45:39–46:36).

Nothing in the new material loosens the constraints. Lauris stays the record, a person signs everything, there is no EHR integration, and the extension works only on TDT clients (t7, 1:02:28). One longer question is now real even though the answer for this pilot is no: Lauris cannot show one child's PHQ-9 history, its parent portal was never used, and its rejected box piles up (t8, 27:09, 33:40, 09:10), so whether Psyflo eventually becomes the system of record for programs like this belongs in the vision, not off it.

The inventory below lists every feature; the picture after it shows how they fit into four stages; after the evidence on pain and reactions, "Where to start and in what order" sequences them.

## Everything that came up: the feature inventory

Every feature mentioned by anyone, with who raised it and what Harvest said; "in demo" means it exists in the current 17-screen demo. Sources are recording and minute:second; N1 is the 11/01 Deanna and Shravan feedback session.

**Capture, inside Lauris**

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 1 | School referral link with attachments; flags what is missing for screening | Psyflo (t6, 10:54) | none captured; screening is 30–45 min unreimbursed (t1, 04:44) | yes |
| 2 | Medicaid eligibility check at referral, proof kept | Psyflo (t6, 11:23); Harvest was told it should have done weekly checks "and screenshotted the checks" across the whole authorization, not once at intake (t2, 161:48) | wanted for audit defense | yes |
| 3 | Family link: guardian confirms phone, time, transport, language by text | Psyflo (t1, 17:01; t6, 12:22) | "I say yes and no" (t1, 19:04); no reaction when shown (t6); warmly received by the leadership group: "will help us to really eliminate no-shows for intakes" (t7, 14:26) | yes |
| 4 | Remote e-signature of the intake packet (DocuSign) | Psyflo (t6, 12:48) | blocked by rule and partly by Lauris: "They have to sign it in person in front of in front of you." (t1, 07:51); whether Lauris can send documents was deferred to Maria (t1, 08:56) | no |
| 5 | Screening-call coach: what to ask, what is still missing | Psyflo (t6, 15:12) | none captured | yes |
| 6 | Scribe: record screening and intake with consent, fill the Lauris form | Psyflo (t6, 14:53); N1 | consent needs attorney (t6, 59:08); typing is "a screen in between us" (t1, 16:05) | yes |
| 7 | Scribe for daily, collateral and monthly notes (dropdown by form) | N1; staff already "speak it into my phone" (t2, 55:13) | positive | yes |
| 8 | Scan & enhance: plain words to clinical language, non-billable verbs flagged, put back in the same box | Psyflo (t2, 59:29); N1 | "Helping with the notes from the beginning is the biggest thing" (t6, 31:18); "AI can easily take it and just misrepresent it" (t5, 41:45) | yes |
| 9 | Intervention-rationale library: why basketball, why movement, which goal | Harvest (t2, 56:27, VOLUNTEERED) | asked for; also the source of clinician-written prompts (t2, 78:22) | no |
| 10 | Track time: start/stop per student, 15-minute increments, timer audit log | Psyflo (t5, 34:02; t6, 32:58) | "This is what everybody needs." (t6, 33:36); the 15-minute button was Psyflo's addition, not a Harvest ask (t5, 34:02) | yes |
| 11 | Treatment-plan goal and objective suggestions from screening and intake | Psyflo (t6, 16:29) | Jillian keeps a goal Google Sheet (t1, 34:11) | yes |
| 12 | Permission levels: direct support, licensed clinical, admin | N1 | direct staff must not see clinical content | yes |
| 13 | Incident quick-capture from the extension | Psyflo (t6, 44:22) | "You could." (t6, 44:28) | no |
| 14 | Camera that watches and writes the note | Harvest, half-joking (t2, 54:56) | not pursued | no |

**Draft, a clinician signs**

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 15 | Initial SRA draft, every sentence cited, green from Lauris and yellow to check | Psyflo (t6, 17:40) | "I love what you said about citing articles" (t4, 120:45) | yes |
| 16 | Published-evidence library (DOE 2025, VA BH Commission 2023) | Harvest already does it by hand (t1, 46:23) | "got tired of justifying insurance all the time" (t1, 46:23) | partly |
| 17 | Continued-stay SRA from DPNs, weekly and monthly notes, 30-day recency, cited | Psyflo (t6, 32:18) | "That is incredible." (t6, 32:57); replaces Jillian's Google Doc (t1, 54:16) | yes |
| 18 | Additional-information reply within 24 hours | Psyflo | "I have less than 24 hours to send it." (t1, 60:49) | yes |
| 19 | Partial-approval decision support: accept, add info, peer-to-peer, early discharge and new initial | Psyflo (t6, 20:48) | "majority of our SRAs are partial approvals" (t1, 56:55); workaround at t1, 64:30 | yes |
| 20 | Peer-to-peer brief: denial reason, units, questions, points, evidence | Psyflo (t6, 23:33) | "This is genius. Thank you." (t6, 25:02) | yes |
| 21 | Peer-to-peer scheduling automation | Psyflo (t5, 31:09) | unsolved; calls are "a month or two out" (t1, 58:19) | no |
| 22 | Guardian appeal letter with e-sign link and translation | Psyflo (t6, 22:20) | only guardians appeal (t1, 63:49); none overturned in 6 years (t1, 62:13) | partly |
| 23 | Overdue-decision notice citing the 7-day standard | Psyflo | Jillian believes MCOs have 14 days and they wait for the last one (t1, 81:24); the 7-day standard is Psyflo's reading of the 2026 rule | yes |
| 24 | Quarterly report, discharge summary and internal quarterly form drafts | Harvest workflow (t3, 41:58; t1, 55:13) | Lauris pre-fills about half | no |
| 25 | Supervision notes by dictation | Harvest (t6, 55:27, VOLUNTEERED) | "hundreds of supervision notes" in Word (t6, 55:20) | no |
| 26 | Manual note-enhancement service while the product is built | Psyflo team (t2, 77:23) | internal idea | n/a |

**Send and track**

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 27 | Packet assembly and clinician-press-Send by Sfax; portal opened in the clinician's own login | Psyflo | "I wish that I wish that they had portals" (t3, 46:52) | yes |
| 28 | Agents submit with stored credentials | N1; Psyflo (t5, 27:26) | conflicts with sign-off and "Hoping there is still a person reviewing this." (t4, 126:34) | no, by decision |
| 29 | Inbound fax reading and matching by member ID and reference | Psyflo | approvals come "when you faxed back" (t2, 160:35) | yes |
| 30 | Day-10 receipt call dialed by Psyflo, handed to staff | Psyflo | Harvest already calls at 10 days (t1, 81:24) | yes |
| 31 | Authorizations tracker with stage, clocks and filters; replaces master and per-school trackers | Psyflo; N1 | "we have a lot of trackers which we have to track too" (t1, 51:04) | yes |
| 32 | Renewal reminder emails two weeks ahead | N1 | staff text the supervisor "are we sitting with SRA today?" (t1, 74:05) | yes |
| 33 | Units countdown against Lauris "units available" | Psyflo | units must match Lauris (t6, 20:39) | yes |
| 34 | Historical import of trackers and Lauris exports, full past text searchable | Psyflo (t6, 19:37); Harvest wants history (t5, 29:00) | "can you go back and see all the text?" (t5, 29:00) | no |
| 35 | Payer playbook: what each MCO asks, which channel, who answers | Psyflo (t6, 23:07) | "depends on who you get" (t2, 14:53) | partly |
| 36 | Decision read-back from Availity and UHC in session | Psyflo | 24-hour portal monitoring burden (t1, 80:29) | yes |
| 37 | Audit packet assembled electronically instead of print-and-ship | Harvest pain (t2, 138:22) | "you can't upload except for one insurance company" (t2, 138:22); licensure auditors also want it printed (t6, 42:31), so the packet must be print-ready | no |
| 38 | Redesign readiness: CANS Excel per SRA, 15-minute units, caseload cap | Psyflo (t4); Harvest asks (t5, 33:17) | "That would be great." (t5, 33:28) | partly |

**Prove and report**

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 39 | Outcomes baseline by payer; units requested vs awarded; decision days | Psyflo | needed to measure the pilot (t5, 23:19) | yes |
| 40 | Grant data pulls: cited sentences across SRAs, incident counts by semester | Harvest (t6, 18:09; t4, 200:07, VOLUNTEERED) | "I'm just gonna write it into this." (t4, 201:23) | partly |
| 41 | Ask-a-question agent over Psyflo and tracker data, PDF reports | N1; Psyflo (t6, 18:46) | "Kind of like focus." (t6, 19:36) | shown as later |
| 42 | Incident reporting: EHR report, 24-hour state portal, 3-in-3-months flag, risk-analysis meetings | Harvest (t6, 36:01–46:29, VOLUNTEERED) | "it would be a total game changer." (t6, 36:01) | no |
| 43 | QI evidence tied to plan objectives; licensure audit binder | Harvest (t6, 42:49) | two years on a corrective action plan (t6, 43:06) | no |
| 44 | Staff credential and certification expiry tracking | Harvest (t6, 52:30) | "someone who goes in constantly" (t6, 52:30) | no |
| 45 | Time-tracker audit report (timer on/off) for payer disputes | Psyflo (t6, 32:58) | "what everybody needs" (t6, 33:36) | partly |
| 46 | An EHR offering for brand-new providers | Harvest founder (t4, 177:45) | contradicted by "just do this add-on like this." (t6, 33:57) | no |
| 47 | Rollout kit: staff video with QR feedback, Psyflo-run training, Slack help bubble | Harvest asks (t6, 60:10, 27:08); Psyflo | "Perfect." (t6, 72:14) | n/a |
| 48 | Pricing: $2 per note on \~500 notes a month, or $10–15 per patient plus implementation | Psyflo team (t2, 89:10–89:19) | Harvest asked when charging starts (t6, 28:59) | n/a |

**Second pass: 48 more items a line-by-line re-read surfaced**

These are workarounds, wishes, questions and pitch lines that the first pass folded into bigger rows or missed. A spreadsheet, a binder, an email chain or a one-person registry is a feature in disguise; each one below names the thing that would replace it.

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 49 | Payer-disclosure filter: flag sensitive family detail in the intake and suggest what to leave out of the SRA while the chart stays complete | Jillian (t1, 23:32, 29:13, VOLUNTEERED) | "did I share too much information with that insurance company? ... those are the things that keep me up at night" | no |
| 50 | Prior-service verification log: provider, last session, frequency, on-leave status, so "not in your records" denials can be answered without calling the guardian | Jillian (t1, 39:43); staffer on case managers on leave (t1, 40:57) | "I have to go have that conversation with the guardian" | no |
| 51 | Screening routed to whoever can do it, including the virtual LPC; clinician capacity view | Jillian (t1, 05:32, VOLUNTEERED) | two on-site LPCs, one virtual who "can do the admissions" | no |
| 52 | Conditional intake logic: answers trigger the substance-use assessment and depression screen; in-flow guidance for new residents | program representative (t3, 32:03, VOLUNTEERED) | newer staff are "looking quite a bit" | no |
| 53 | Intake sequencing: developmental history before trauma; answer out of order and confirm later | Jillian (t1, 24:58, VOLUNTEERED) | "that should be before the trauma" | no |
| 54 | Guardianship and consent-authority tracker (foster placements that changed "yesterday") | program representative (t3, 37:08, VOLUNTEERED) | "are we allowed to talk to them?" | no |
| 55 | Release-of-information and collateral-contact log (PCP, agencies), with the required doctor contacts at intake and after | program representative (t3, 31:00, VOLUNTEERED) | "those are all like not in our computer" | no |
| 56 | Referral risk-history screen: charges, weapons, substance use surfaced before admission | operations lead (t4, 48:04, VOLUNTEERED) | "I wish I would've done that in the records" | no |
| 57 | Per-school operations sheet replaced: attendance, direct hours, trips, quarterly contacts | Harvest leader (t2, 05:32, VOLUNTEERED) | "this like one stop shop for every school" in Google Sheets | no |
| 58 | Staff day planner coordinated with teachers (morning sweep, lunch block, classroom vs room) | Harvest leader (t2, 43:03, LED) | "be intentional and be proactive" | no |
| 59 | Internal-only "concerns" note type, visible to clinical staff, never sent out | Harvest leader (t2, 45:00, VOLUNTEERED) | "protect our clients and their families from opinions" | no |
| 60 | Safety-plan completeness check whenever a note mentions suicidal ideation | Harvest leader (t2, 11:53, VOLUNTEERED) | "didn't like do a good job of like doing the safety plan" | no |
| 61 | Maintenance-day note framing: medical-necessity language for calm days | Harvest leader (t2, 61:00, VOLUNTEERED) | "those are hard because ... that's gonna get rejected" | no |
| 62 | Payer-language lint before Process Form: "observed", minute gaps, punctuation | founder (t4, 166:35); leader (t2, 51:10) | "but they use the word observed, then like that whole bit gets away" | partly (#8) |
| 63 | Copy-forward detection: narratives pasted "over and over" vs sections that legitimately never change | program representative (t3, 41:58, VOLUNTEERED) | "it should be original work" | no |
| 64 | Absence and non-billable handling: stop forms generating for absent kids; flag non-billables | founder (t4, 175:37, LED) | "so many non-villables when kids are absent" | no |
| 65 | Case-formulation summary for direct staff at other education levels (an exception to #12) | Jillian (t1, 27:38, VOLUNTEERED) | "I have to be able to help them understand" | no |
| 66 | Daily progress-rating trend with a "not progressing, try something else" alert | Harvest leader (t2, 57:29, LED) | "you're rating them one to ... they're not progressing" | no |
| 67 | Units-request calculator: unit-to-hours sheet and how many to ask for | Psyflo asked (t1, 74:42); Jillian "we have a unit breakdown somewhere" | LED | no |
| 68 | Plain-language explanation of the payer's own letters for guardians | Harvest staffer (t1, 62:59, VOLUNTEERED) | guardians "don't really" understand them | no |
| 69 | Covering-clinician handoff pack for 24-hour requests and one-shot peer-to-peers when the LPC is out | Jillian (t1, 60:59, VOLUNTEERED) | "they never even met the client" | no |
| 70 | Co-occurring-diagnosis focus: which condition to write to | Psyflo team (t2, 75:50) | internal | no |
| 71 | Audit-response drafting, including extrapolated recoupment audits | founder (t4, 125:38, 198:24); leader (t2, 141:48) | "the team will put just days and weeks of time" | no |
| 72 | Retro-claim dispute pack: SRA sent, approval fax, dates, in one bundle | Harvest leader (t2, 160:35, VOLUNTEERED) | the $10,000 bill for two-year-old services | no |
| 73 | Reverse-engineer payer denial logic and answer with the payer's own criteria | Psyflo (t4, 169:22) | internal | no |
| 74 | Internal SRA sign-off queue replacing the email chain (Jillian approves every SRA) | Jillian (t1, 82:06, LED) | "I approve all the SRS that go out" | partly (#31) |
| 75 | Reviewer approval queue before form data populates downstream in Lauris | program representative (t3, 43:27, LED) | "They review it. They approve it." | no |
| 76 | Tiered note-review queue: trainer reads every note for new staff, then spot checks with pattern detection | Harvest leader (t2, 52:27, LED) | "if they start noticing patterns, they'll pick them up" | no |
| 77 | Supervisor backlog view: who is behind on dailies | Harvest leader (t2, 49:28, VOLUNTEERED) | "nobody pays for that" | no |
| 78 | MCO phone-negotiation log: offered, countered, awarded | Jillian (t1, 69:17, VOLUNTEERED) | 150 asked, 120 offered, 140 countered, 110 given | no |
| 79 | Appeal-in-progress exposure: unpaid service days and back-pay reconciliation | program representative (t3, 20:45, VOLUNTEERED) | "without a guarantee that we'll get paid" | no |
| 80 | Submit-or-withhold triage for continued stays Harvest expects to lose | program representative (t3, 09:20, VOLUNTEERED) | "don't ask again essentially" | partly (#35) |
| 81 | Summer and change-of-service continuation handling | Harvest leader (t2, 13:11, VOLUNTEERED) | "summer gets here and they're like nah" | no |
| 82 | Post-intake clocks: ISP and clinical information in 24 hours, everything in a week | Jillian (t1, 33:32, VOLUNTEERED) | "has to be completed within 24 hours of that intake" | no |
| 83 | Form-mapping audit for the Lauris base sheet (about half auto-fills; mapping unknown) | program representative (t3, 41:58, LED) | "which ones are set up to go where?" | no |
| 84 | Multi-locality tax-ID split for clients and staff (Campbell vs Lynchburg) | program representative (t3, 43:51, VOLUNTEERED) | "It would be great if we did that one day." | partly (locality toggle) |
| 85 | Program-track configuration: grant-funded vs Medicaid rules; screening grant kids for Medicaid criteria | program representative (t3, 03:54); leader (t2, 156:40) | "we mimic it" | partly (grant route) |
| 86 | Client-number registry (one person assigns Harvest numbers by email) | program representative (t3, 26:54, VOLUNTEERED) | "we have one person that that keeps up with all of our numbers" | no |
| 87 | Org chart: schools, program directors, site supervisors, changing as sites are cut | program representative (t3, 07:31, VOLUNTEERED) | "Some people are filling in right now" | no |
| 88 | School-partner contact and agreement tracker (district contacts turn over; signatures chased) | program representative (t3, 75:57, VOLUNTEERED) | "she's retiring this year" | no |
| 89 | Policy and regulation monitor: General Assembly timing, CPST delay, new DBHDS regs | program representative (t3, 14:25, 61:35); clinic lead (t6, 54:16) | the stated top priority is knowing TDT continues | no |
| 90 | Lauris partnership or API, brokered through Harvest's contact | clinic lead asked (t5, 23:58); Psyflo (t4, 175:23; t6, 73:36) | "Do you try to integrate with our EHRs? How?" | no |
| 91 | School-division reporting: hours delivered vs incidents by county, benchmarked to Virginia | founder (t4, 204:02, VOLUNTEERED) | "seventy thousand hours of this to prevent" | no |
| 92 | State-portal incident submission: classify level, file within 24 hours, track the clock | clinic lead (t6, 45:18, VOLUNTEERED) | "submit it within twenty four hours" | no |
| 93 | Monthly Lauris incident and CPS import with filterable tags | clinic lead (t6, 47:04, LED) | the admin assistant retags each row by hand | no |
| 94 | Employee-file and policy audit packet (certificates, policies, procedures) | clinic lead (t6, 53:13, VOLUNTEERED) | "scan in all of our employee file stuff" | no |
| 95 | Billing and claims dashboard extended with diagnosis and incident data | Psyflo (t6, 18:46) | "Kind of like focus." | no |
| 96 | Service-delivery evidence pack for payers who dispute 5+ hour days (lunch, bathroom supervision) | Jillian (t1, 77:41, VOLUNTEERED) | "sometimes I wish I could record" | partly (#10) |

Not product features but said on tape and worth a line: a recording-consent form and compliance pack (BAA, SOC 2, outside counsel; t5, 37:13–37:47); pre-decision "how it physically works" collateral (t5, 53:47); one to two weeks on site beside Jillian (t5, 69:23); clinician-written prompts with Harvest's trainer (t2, 78:22); grant-funded procurement via Rural Health Transformation, USDA cost-share and VIPC (t4, 180:37–188:47); a Notable conversation (t5, 51:50); the Jupiter LMS running separately from the EHR (t4, 37:08); ABA, IOP and PHP as later service lines (t4, 195:02).

**Third pass: the 11/04 leadership demo, the 11/04 session with Michelle Hamilton, and the 11/05 program-director conversation (pasted transcript, cited as t7, t8, t9)**

This is where the portals live, and it changes three earlier readings: the family link was received warmly by the full leadership group, a mobile app is a Harvest ask rather than a Psyflo idea, and a parent portal and a school portal were asked for by name. Ten decision-makers were in the room (t7, 05:43: "as far as decision makers ... we are all in the room").

| # | Feature | Raised by | Harvest reaction / evidence | In demo |
| --- | --- | --- | --- | --- |
| 97 | Parent portal: enrollment paperwork signed before intake, real-time view of the child's progress, DSM and other surveys on a cadence, quarterly signed on the phone, virtual intake or reassessment where allowed | Harvest (t7, 32:48; 41:52–42:49; 1:48:25–1:49:24, VOLUNTEERED) | "I think, will help us to really eliminate no-shows for intakes" (t7, 14:26); "I love the idea of with the parent portal, all the enrollment paperwork going in there" (t8, 41:52); caution: Lauris's version 12 years ago failed because of codes (t8, 33:40) | partly (#3) |
| 98 | School portal: one place for the referral button, daily classroom information, teacher feedback for admin meetings, incident uploads, behavior surveys, and a view of student progress | Psyflo proposed (t7, 32:48–34:41); Harvest "The school portal might be cool though" (t7, 33:46, VOLUNTEERED) | wants teacher feedback in one place; schools want functioning, grades and discipline linked to interventions (t8, 40:56–41:52) | partly (#1) |
| 99 | Staff portal or dashboard: each staffer sees their own note completion, what is missing, progress on goals; supervisor sees the same and the conversation starts there | Michelle Hamilton (t8, 02:48–05:27; 47:32–48:28, VOLUNTEERED); Psyflo asked (t8, 46:36) | "I don't want somebody telling me what to do. I want to know myself." (t8, 08:14); the Lauris rejected box "piles up" (t8, 09:10) | no |
| 100 | Staff performance and training metrics: note completion %, care continuity, progress tracking, therapeutic alliance, measurement-based care, high-acuity caseload ratio, deliberate-practice plans, incentives | Michelle Hamilton (t8, 02:48–05:27; 20:41–23:28, VOLUNTEERED) | "being able to do something like this in your system would be amazing to me" (t8, 05:27) | no |
| 101 | Mobile app for direct staff: pick the student, start/stop, dictate; works on the work iPhones and iPads; runs with the screen locked | Harvest (t7, 15:07–17:02; 33:48–34:47; 43:23, VOLUNTEERED) | "what would be incredibly helpful is if something was mobile friendly for us" (t7, 16:05); today staff dictate into Notes or email themselves (t7, 17:02) | no |
| 102 | Short-term dictation workaround: an email address or Notes capture that routes into Psyflo | Psyflo (t7, 17:54) | accepted as interim | no |
| 103 | Voice tagging: say the student's name to start or tag; type-or-speak for privacy in hallways | Harvest (t7, 18:46; 31:55; 43:23, VOLUNTEERED) | "if it was somehow voice activated, like I'm going to begin working with Jonathan" (t7, 31:55) | no |
| 104 | Record planned interventions in the room, not only time | Harvest (t7, 36:40–37:37, VOLUNTEERED) | "during a planned intervention ... it would it could record" | no |
| 105 | Dictation lands in the Lauris saved session so staff open it and press save ("maybe you don't even need the browser extension") | Psyflo and Harvest together (t7, 34:47–36:40) | fits how staff already pre-open notes each morning | no |
| 106 | Date-range selector and include/exclude checkboxes for the evidence a draft uses (last 30 days vs six months) | clinical director (t7, 27:21–29:47, VOLUNTEERED) | "That's a great idea." (Psyflo); historical information still matters for continued stays | partly (Case toggle) |
| 107 | Keyword counts across the period ("physical aggression three times, eloped twice") for continued stays | Harvest (t7, 1:02:28–1:03:56, VOLUNTEERED) | reads every note by hand today | partly (#17) |
| 108 | Boilerplate detection across the last 30 notes so enhanced notes differ day to day | Harvest (t7, 1:08:47–1:10:37, VOLUNTEERED) | auditors look for "boilerplate language, paragraphs, sentences" | no |
| 109 | Goal-neglect alert: "two months since the plan and you haven't hit this goal"; same intervention six times | Harvest (t7, 1:42:53; t8, 48:28, VOLUNTEERED) | "one of the milestones" | no |
| 110 | Specific intervention suggestions ("a brisk 15-minute walk"), feeding the quarterly's next-quarter recommendations | Harvest (t7, 1:11:36–1:12:31, VOLUNTEERED) | staff "still struggle with like planning interventions" | no |
| 111 | Real-time prompts during an intervention or conversation; next-step suggestions for QMHPs | Psyflo (t8, 50:22–51:19); Harvest "They would love that too" | staff "want to know exactly what do I say when this happens" | no |
| 112 | Internal quarterly generated from notes with a sensitive-information strip-out, or a separate opinion flow | Harvest (t7, 53:25–56:15, VOLUNTEERED) | "that internal quarterly is off limits" in audits | no |
| 113 | Quarterly report assembled from daily progress ratings plus PHQ, GAD and cross-cutting measures; per-client assessment trends | Michelle Hamilton (t7, 41:18–42:16; t8, 27:09–28:06, VOLUNTEERED) | Lauris cannot show one child's PHQ-9 history without a custom agency-wide report | no |
| 114 | Assessment reminders to staff ("time for the next SUDS / DSM") | Psyflo (t8, 07:19); Harvest "I would love that" | takes pressure off site supervisors | no |
| 115 | Discrepancy detection between parent, child, teacher and staff surveys | Psyflo (t8, 42:49–43:45); Harvest "that would be really helpful" | children not disclosing to parents is a known gap (t8, 31:50) | no |
| 116 | Restraint and incident pattern alerts per staff member, monthly, instead of at the year-end report | Michelle Hamilton (t8, 28:06–30:00, VOLUNTEERED) | "I don't see it till the end of the year"; the annual report takes April to August | no |
| 117 | Discharged-client re-check prompt at the start of a semester | Michelle Hamilton (t8, 44:42, VOLUNTEERED) | raised after a loss; "something to make sure that we're not missing anything" | no |
| 118 | Stakeholder and school-district report: staff surveys, the school survey, process data, demographics by program, outcomes, grades, discipline, attendance, extracurriculars | Michelle Hamilton (t8, 24:26–32:45, VOLUNTEERED) | "it's housed in so many places" | no |
| 119 | Grant-program (SEBs) eligibility tracker: read DPNs to flag kids who now meet TDT criteria; FAPT evidence | Harvest (t7, 1:21:46–1:26:32, VOLUNTEERED) | "almost like an eligibility tracker" | no |
| 120 | Signature clocks: days waiting for signature; block the next form until signed; missing-signature sweep at migration; find the scanned signed copy | clinical director (t7, 1:13:29–1:16:22, VOLUNTEERED) | "we don't have a signature on this" found only at audit | no |
| 121 | Supervisor note-quality view and approval routing for trainees (QMHP-T) and anyone needing oversight | Harvest (t7, 1:06:23–1:08:47, VOLUNTEERED) | trainee notes must already be reviewed | partly (#76) |
| 122 | Units-low email with auto-drafted renewal | Psyflo (t7, 1:12:31) | "Oh yes." | yes (#32) |
| 123 | Auto-submit through Medicaid portals and read status back | Psyflo (t7, 26:24) | no objection; Harvest uses only UHC and Anthem portals and reads no decisions there (t7, 31:00) | ruled out (#28) |
| 124 | Exact DMAS form rendering; UHC's different process deprioritized | Harvest (t7, 29:47; 30:44, VOLUNTEERED) | "let's figure all the other ones out, and then we can circle back to United" | partly |
| 125 | Extension scoped to TDT clients only; outpatient and SEBs records never pulled into a TDT request; consent folded into the informed-consent packet | Harvest (t7, 57:44–1:02:28; 46:10, VOLUNTEERED) | "I do have concerns about not wanting to disclose my outpatient information for a TDT authorization" | no |
| 126 | Knowledge library for drafts: DSM, textbooks, Harvest's eight approaches, DMAS and each MCO's manual, with agents checking for manual updates | Harvest asked where goals come from (t7, 48:05–51:29, VOLUNTEERED); Psyflo | "a very strict, based approach to our ISP creations" | no |
| 127 | Historical migration from Lauris by export on a cadence: \~52 active TDT clients first, \~2,000 client numbers later; signature and gap checks on the way in | Psyflo (t7, 42:16–44:12; 1:17:52–1:21:46) | active first, discharged later | no |
| 128 | Appeal letters drafted for guardians, e-signed by link and faxed; Harvest had stopped appeals because they became contentious and was evaluating a competitor's AI denial-letter tool | Psyflo; Harvest (t7, 37:26–39:22, VOLUNTEERED) | "If it's simple as they just sign a letter, then I mean, why not?" | partly (#22) |
| 129 | Pre- and post-launch staff survey on admin time and satisfaction; KPIs: note timeliness and compliance, admin time, approvals, person-centered and confidentiality safeguards | Harvest and Psyflo (t7, 1:44:18–1:48:25) | "my number one thing would be ... completing notes in compliance" | n/a |
| 130 | Escalation ladder and program tracks: school resources, parent consent before referral, SEBs for non-Medicaid, TDT, opt-out at alternative schools for all students unless a guardian opts out | program director (t9, 00:00–07:15, VOLUNTEERED) | parent consent is required before a school may submit a referral | partly (#85) |

**On "staff portal, family portal, school portal"**

All three are in the 11/04 material, and two were Harvest's own words. The parent portal (#97) is the family link grown up: enrollment signed before intake, progress visible to the guardian, short surveys on a cadence, a phone signature on the quarterly. The school portal (#98) is the referral link plus a daily channel from teachers and administrators into the record. The staff portal (#99, #100) is a dashboard each staffer and supervisor opens: what is done, what is missing, how they are progressing against their own goals. All three are evidence surfaces for the same pipeline: what a parent, a teacher or a staffer enters becomes evidence the drafts cite and the reports count.

## How it comes together

All 130 items sit in one of four stages, and everything flows left to right: what the extension captures is what the drafts cite, what the clinician signs is what the tracker follows, and what the tracker holds is what the reports count. Bold items are the ones Harvest reacted to most strongly; grey items are the compliance line that reuses the same engine; P2 and P3 mark later phases.

&#91;embedded content: product pipeline · 4 stages, 28 features, foundation rules\]

Read it as one engine with four outlets. Capture is where Harvest's time goes today (screening 30–45 minutes, intake 2–3 hours, up to six daily notes per staffer), so it is where a minute saved is worth most; it has four doors: the extension in Lauris, the mobile app on the work iPhones, the parent portal and the school portal. Draft is where the clinician's judgment lives and where every objection about accuracy applies; nothing leaves it unsigned. Send and track replaces three layers of Google Sheets, a fax machine and an email chain with one row per request. Prove and report is the same data turned outward: to a payer disputing hours, an auditor asking for QI evidence, or a funder asking how many incidents this semester. The items Harvest asked for that are not on the picture (an EHR for new providers, remote e-signature, auto-submitting agents, a watching camera) are the ones the constraints rule out.

## What hurts most, by how often and how hard it came up

The pain Harvest raised most often and without prompting is not prior authorization itself but the two things on either side of it: notes that cannot support a request, and a decision process they have mostly given up fighting. Counts are recordings out of six in which a Harvest voice raised the theme; V = volunteered, L = led by a Psyflo question.

| Theme | Raised in | How | Strongest statement (verbatim, ≤40 words) |
| --- | --- | --- | --- |
| Direct-staff notes cannot carry the clinical case; clinicians spend time deciphering them; new staff freeze | 4 of 6 (t1, t2, t5, t6) | V in t1, t2, t6; L in t5 | "I know what I did, I know what just happened, but I don't know how to write it." — t2, 53:28, Harvest leader |
| Partial approvals, peer-to-peers and appeals rarely work; early-discharge-and-resubmit is the workaround | 4 of 6 (t1, t2, t3, t4) | V | "honestly our peer to peer rates are super unsuccessful. They're just unsuccessful." — t1, 74:05, Jillian, LPC |
| Virginia redesign makes any process investment feel wasted; nobody knows what happens July 1 | 5 of 6 (t1, t3, t4, t5, t6) | V | "One thing that kept me from trying to get more efficient is what's the point?" — t5, 32:50, clinic lead |
| Audits and clawbacks: print-and-ship, one-word note voids, a $1M demand settled under NDA | 4 of 6 (t1, t2, t4, t6) | V | "They're taking back all of the money they gave us over three years of payments, and we owe them a million dollars." — t2, 141:48, Harvest leader |
| Clinical staff are too few and too stretched to change process; any tool becomes a written staff expectation | 4 of 6 (t1, t4, t5, t6) | V | "we have our hands in seven thousand different boxes." — t1, 17:28, Jillian |
| Continued-stay SRA is hand-assembled from every daily, weekly and monthly note into a Google Doc | 2 of 6 (t1, t2) | L (t1), V (t2) | "A lot of times I will create a Google Doc just where I'm like writing notes from the notes that are already there" — t1, 54:16, Jillian |
| Stage tracking lives in fax, email chains and three layers of Google Sheets; 24-hour info requests need constant monitoring | 3 of 6 (t1, t2, t3) | L (t1), V (t2, t3) | "I have to constantly be monitoring, or someone has to constantly be monitoring to see what that feedback was" — t1, 80:29, Jillian |
| Licensure, incident reporting and QI evidence are a second compliance system kept in spreadsheets and binders | 1 of 6 (t6), \~20 minutes | V | "if you could create a system for this for providers like you did for the prior role, it would be a total game changer." — t6, 36:01, clinic lead |
| MCOs dispute that 3 units (5+ hours) of daily contact really happen | 2 of 6 (t1, t6) | V | "our NCOs are saying there's absolutely no way you're spending five plus hours with these kids." — t1, 75:38, Jillian |
| Getting data back out of Lauris (cited sentences for grants, incident categories) is clunky | 3 of 6 (t4, t5, t6) | V | "She just asked me last week to pull every sentence you cited." — t6, 18:09, clinic lead |
| Families cannot do remote paperwork: phones only, elderly guardians, mistrust, in-person signatures | 1 of 6 (t1) | L | "Parents don't have computers; they just have phones. Okay. And some of our guardians are like grandmothers that are like 70 years old." — t1, 19:49, Jillian |

Two things to hold against this ranking. The redesign theme is loud but is not a product gap; it is an adoption risk Psyflo can only answer by committing to track it. The compliance theme comes from one voice in one meeting, so it is thin evidence for the market even though it was the longest unprompted stretch of the whole visit.

## How Harvest reacted to what Psyflo showed

The warmest reactions went to the parts that take work off a clinician's desk with a paper trail attached; the coolest went to anything that asks families or staff to change how they work. Only the 10/30 meetings (t4, t5, t6) include a demo, so reaction counts are out of three.

| Psyflo proposed | Harvest said | Tone | V/L | Source |
| --- | --- | --- | --- | --- |
| Peer-to-peer call brief assembled from the record | "This is genius. Thank you." | positive | L | t6, 25:02, clinic lead |
| Dictated daily notes feeding a continued-stay SRA with citations | "That is incredible." | positive | L | t6, 32:57 |
| Time tracker as audit defense when payers dispute contact hours | "I'm serious. This is what everybody needs. This really is what everybody needs." | positive | L | t6, 33:36 |
| Data pulls for grants (incidents, cited sentences) | "That sounds really cool. I'm looking at it." / "I'm just gonna write it into this." | positive | L (feature), V (use) | t4, 201:16–201:23, executive director |
| End-to-end scope, referral to appeal | "95% confident this is gonna work." | positive | V | t6, 60:02 |
| Citing published studies in the SRA | "I would love to picture a world where someone who is reviewing the SRA at an MCO actually reads that" | positive, skeptical of payers | L | t4, 120:45 |
| AI-enhanced notes | "AI can easily take it and just misrepresent it. It's not what that was." | cautious; from her own test | V | t5, 41:45, clinic lead |
| AI-enhanced notes | "AI could help if it was all vetted and HIPAA" | conditional | L | t2, 56:27, Harvest leader |
| Human in the loop | "Hoping there is still a person reviewing this." | cautious then positive | V | t4, 126:34 |
| 3 hours to 3 minutes claim | "If the fact it will free up fifty minutes, also" | skeptical of size, still wants it | L | t5, 48:44 |
| Lauris integration | "I would caution you when I see this integrated with an EHR." / "just do this add-on like this." | strategic warning | V | t6, 33:50–33:57 |
| Lauris integration | "Do you try to integrate with our EHRs? How?" then "we've got a good relationship with them" | curious, protective of Lauris | V | t5, 23:58, 35:14 |
| Offer an EHR to brand-new providers | "You offered it to up and coming and new brand new providers, never had it. EHR." | idea, one voice | V | t4, 177:45, executive director |
| Family link / async intake | "I say yes and no" … "there's a lot of barriers to just submitting documents, and also you know they don't understand it." | cautious to negative | L | t1, 19:04, 20:41, Jillian |
| Family link (shown in demo) | no reaction captured | — | L | t6, 12:22 |
| Training as staff scale | "Is it something that we have to have a trainer who knows the system if we keep adding people?" | practical worry | V | t6, 27:08 |
| When pricing starts | "Do you have an idea of the pricing for like when you would start to like charge?" | practical | V | t6, 28:59 |
| Pilot without deposit, value before price | "I appreciate the budget piece of it too. We get it." | positive | L | t4, 192:00 |

Three reads on this table. First, in the site-visit week every positive was about a document Psyflo assembles for a clinician to sign; the 11/04 leadership meeting added two more kinds of positive, the parent portal for enrollment and no-shows (t7, 14:26) and a mobile app for direct staff (t7, 16:05), so the earlier caution on the family link should be read as one clinician's view, not the organization's. Second, the three accuracy cautions came from three different people in three meetings, which makes checkability a requirement rather than a preference. Third, the only direct advice on strategy, from the person who would run the pilot, was to remain an add-on.

## Where to start and in what order

Start where a wrong output is cheapest and the volume is highest (daily notes), move to the packet Jillian builds by hand (continued stay), then let the tracker and reports grow out of what those two produce; the compliance line comes after the authorization line has proven itself. Feature numbers refer to the inventory.

| Phase | Build | Why now | Proof it worked |
| --- | --- | --- | --- |
| 0 · Groundwork, before any output reaches Harvest | BAA and recording-consent form (t6, 59:08); intervention-rationale library written with Harvest's documentation trainer (#9; t2, 78:39); an evaluation set from Harvest's "examples of badness" (t5, 45:30); one-week measured baseline of minutes per note | Every accuracy objection came before any feature was tried; prompts need a clinician's hand | Harvest's reviewer marks drafts "made up" vs "good recommendations" and the made-up rate is near zero |
| 1 · Daily notes in the extension (support staff) | #101–#103 mobile capture on the work iPhones (start with the #102 email or Notes workaround while the app is built), #7 Scribe for dailies, #8 Scan & enhance with a visible diff, #108 boilerplate check, #62 payer-language lint, #60 safety-plan check, #61 maintenance-day framing, #10 Track time, #12 roles, #33 units vs Lauris; for supervisors #76 tiered review queue and #77 backlog view; #64 absence handling | Highest volume (\~30 notes a day), smallest blast radius, the problem both the program lead and the team named first (t6, 31:18; t2, 80:03) | Minutes per note down from the measured baseline; zero flagged non-billable verbs at Process Form; staff keep using it in week 4 |
| 2 · The clinician's packets | #17 continued-stay SRA with #106 date range and #107 keyword counts, #18 info-request reply, #19 partial doors, #20 peer-to-peer brief, #128 guardian appeal by link, #15 initial SRA on the exact DMAS form (#124), #16 and #126 evidence and knowledge library, #11 plan goals with #110 specific interventions, #125 TDT-only scoping; with them #49 disclosure filter, #50 prior-service log, #63 copy-forward detection, #67 units calculator, #69 covering-clinician pack, #65 formulation summary for direct staff | Built on phase-1 notes; the best-received screens; replaces Jillian's Google Doc and binder | Hours from intake to signed SRA halved; a continued-stay packet assembled from notes with every sentence cited |
| 3 · Send, track, remind | #97 parent portal (enrollment signed before intake, #120 signature clocks) and #98 school portal (referral plus daily classroom input), #27 packet and clinician Send, #74 sign-off queue, #29 inbound fax, #30 receipt call, #31 tracker with clocks (#82 intake clocks too), #32 renewal reminders, #36 portal read-back, #23 overdue notice, #2 weekly eligibility proof, #78 negotiation log, #79 appeal exposure, #80 submit-or-withhold triage, #81 summer transitions, #96 service-delivery evidence pack | Replaces the master tracker, per-school sheets and email chain; gives the 7-day and 24-hour clocks an owner | No unlogged submission; decision clock misses to zero; one row per request, filterable by stage |
| 4 · Prove | #99 and #100 staff dashboard and performance metrics (note completion first, per Michelle Hamilton, t8, 35:27), #113–#116 quarterly from ratings and assessments, assessment reminders, survey discrepancy and incident-pattern alerts, #109 goal-neglect alert, #118 stakeholder report, #39 baseline by payer, #40 grant data pulls, #91 school-division reporting, #45 timer audit log, #66 progress-rating trends, #35 payer playbook, #34 historical import, #95 claims view, #71–#73 audit and retro-claim response | The founder wanted grant numbers on the spot (t4, 201:23); the baseline is the pilot's own scorecard | A grant report pulled in minutes; units awarded vs requested by payer, before and after |
| 5 · Compliance line | #13 incident capture, #42 and #92 incident reporting with the 24-hour state-portal clock, #93 monthly Lauris import with tags, #43 QI evidence, #44 credentials, #94 employee-file packet, #25 supervision notes, #37 audit packet, #55 ROI and collateral log, #57 per-school operations sheet, #88 school-partner tracker | Largest unprompted ask; same capture-and-cite engine; defends against an EHR copying the authorization features | Monthly licensure report produced without the admin assistant retagging rows; next licensure review with no CAP finding |
| Later or not at all | #41 ask-a-question agent (after phases 3–4 hold real data); #38 redesign pieces and #89 regulation monitor as rules firm up; #21 peer-to-peer scheduling; #111 real-time intervention prompts and #119 SEBs eligibility tracker once notes are reliable; #51–#56 intake refinements as the portal matures; #58, #59, #83–#87 operational configuration only when a second clinic needs it; #90 a Lauris partnership if Gray opens the door; #4 e-signature, #28 credentialed agents, #46 an EHR, #14 a camera are ruled out by constraints | Evidence is one voice or the constraints cut against it | — |

Three rules for the order. Nothing in a later phase ships to Harvest until the earlier phase's proof is met, because the team said on tape that a wrong output could end the pilot (t5, 70:19). Each phase adds buttons to the extension or rows to the tracker, never a new login or a new place to type. And the front door is now a real workstream: leadership asked for the parent portal and the school portal by name (t7, 32:48–34:41; t8, 41:52), with enrollment-before-intake as the first job because it attacks no-shows and unsigned paperwork at once (t7, 14:26; 1:13:29).

| Measure for the pilot | Baseline said on tape | Target to agree with Harvest |
| --- | --- | --- |
| Minutes per daily note | "spending 30 minutes on this note" (t2, 87:10, Psyflo estimate) | measure in week 1; Harvest expects about 50 minutes a day saved (t5, 48:44) |
| Hours from intake to signed initial SRA | "three, at least almost four hours" before the SRA plus "six more hours of paperwork" (t1, 35:52, 32:39) | halve, on the pilot caseload |
| Units awarded vs requested | "majority of our SRAs are partial approvals" (t1, 56:55); 150 → 110 (t1, 69:17) | track by payer; Psyflo cannot control the decision |
| Decision clock misses | calls at \~10 days because faxes go missing (t1, 81:24) | zero unlogged submissions; receipt confirmed for every fax |
| Notes voided at audit for wording | "that whole bit gets away" (t2, 51:10) | zero flagged non-billable verbs reaching Process Form |

## Constraints the product must respect

Five constraints came from Harvest or from Psyflo's own team on tape, and each one rules something out.

| Constraint | Where it comes from | What it rules out |
| --- | --- | --- |
| No EHR integration; Lauris is the record and units must match it | "Typically, EHRs, mental health EHRs, are very closed systems." (t5, 24:01, Psyflo); "we have to adjust the. Units in the works, so that these units match up" (t6, 20:39, clinic lead) | Any push into Lauris other than typing into an open form; any second copy of a note that can drift from the one processed in Lauris |
| Output must be checkable and must not invent | "it came back and it gave me the best stuff. But I was like, yeah, do that, like oh my gosh, that's good. I didn't" (t5, 43:12, VOLUNTEERED); "If you miss sincerity, insurance is going to be" (t2, 26:50, Psyflo) | Free-text generation without a per-sentence source; shipping a 70% MVP to Jillian without sitting beside her first (t5, 70:31, Psyflo) |
| Nothing adds work; adoption becomes a written staff expectation | "if it's something that I'm going to say I want them to do this, then it's going to be written into their stuff" (t5, 39:46); "I'm trying to think of all my people to protect their time." (t4, 197:31) | Separate logins, separate data entry, any step that is not a button on the page they already have open |
| A person signs; only clinical staff reply to payers; only guardians appeal | "It has to be submitted by clinical staff within 24 hours." (t1, 60:59); "a guardian has to do that appeal. We can just support them in that process." (t1, 63:49) | Agents submitting under a clinician's credentials; Psyflo sending anything on its own |
| Recording needs consent and legal review; BAA before any data | "We probably need to talk to like our digital health attorney about the patient. The patient recording consent." (t6, 59:08, Psyflo); "Hoping there is still a person reviewing this." (t4, 126:34) | Recording screenings or intakes in the pilot before the consent form and BAA are signed |
| The Virginia redesign may change forms, units and caseload rules with days of notice | "it's happening in less than 24 hours. Right, it ends on. June thirtieth, it starts July one." (t1, 18:03); "I don't believe it's going to happen July one because everybody knows it's not ready." (t3, 11:25) | Hard-coding DMAS form layouts; promising a date-certain migration; building a 15-minute-unit model as anything other than configurable |

Two of these conflict with ideas in the 11/01 feedback transcript (agents logging into portals, pushing notes into the EHR). The site-visit evidence sides with the constraints: Harvest's pilot owner wants a person reviewing and an add-on beside Lauris.

## Where Harvest voices disagree, and what settles it

Harvest is not one opinion; four disagreements matter for the build and each has a cheap way to resolve it.

| Question | One view | Other view | What settles it |
| --- | --- | --- | --- |
| Is Lauris good enough to build beside? | "I do think that Loris is good" and it is reasonably priced (t3, 01:17, program representative) | "You generate forms for non-villables, so many non-villables when kids are absent" and "they don't want to hear what happens" (t4, 175:37, executive director) | Neither view changes the add-on decision; the Lauris contact "Gray" (t6, 74:27) can confirm whether form-fill on open pages is tolerated |
| Should Psyflo integrate with or become an EHR? | "just do this add-on like this" (t6, 33:57, clinic lead) | "Have you ever considered offering the same service that Laura does within what you're doing?" (t4, 170:49, executive director) | The pilot owner's view governs the pilot; revisit EHR-for-new-providers only with a second clinic asking |
| How much time will the notes tool really save? | "spending 30 minutes on this note will get it done in three minutes" (t2, 87:10, Psyflo) | "If the fact it will free up fifty minutes" a day (t5, 48:44, clinic lead) | Measure a one-week baseline per staffer before enabling the tool |
| Can families do anything before intake remotely? | Harvest had "considered it near the end of the school year" (t1 summary; t1, 17:28) | "Parents don't have computers; they just have phones" and signatures are in person (t1, 19:49, 07:51) | Ask the senior advisor who appoints the pilot tester (t5, 46:27); do not build further until she says yes |
| Who decides? | "If Marie is on board, then you" (t5, 15:25, Psyflo relaying Carrington) | "I want to do another meeting with our clinical director and Jonathan." (t5, 39:13) and Michelle Hamilton approving phases (t6, 62:38) | Treat Michelle Hamilton as the phase gate and the clinical director as the clinical sign-off |

Two open questions had no answer on tape: whether only a guardian can appeal (asked at t6, 21:47, not resolved) and whether Lauris exposes anything beyond the screen (Psyflo claimed "an open HCI" at t5, 28:45; Harvest said it has no third-party integrations at t5, 36:08).

## What this means for the demo and the next two weeks

The current 17-screen demo already matches the recommended shape; the changes below are additions and one demotion, not a rebuild.

| Change to the demo | Why | Evidence |
| --- | --- | --- |
| Scan & enhance shows a diff: staffer's words, Psyflo's additions, each addition tagged with its source (treatment-plan intervention, timer, prior note) | Accuracy was the one recurring objection | t5, 41:45; t5, 45:51 |
| An intervention-rationale panel in the extension (why movement, why basketball, which goal it serves) | Asked for unprompted by the Harvest leader; it is also the source for clinician-written prompts | t2, 56:27; t2, 78:22 (Psyflo) |
| Analytics gets "pull every cited sentence" and an incident export, labelled for grant use | Both founders' voices reacted to data for grants more than to any dashboard | t4, 201:23; t6, 18:09 |
| A phase-2 board: incident quick-capture, QI evidence, credential expiries, supervision notes | Largest unprompted ask; shows the roadmap without promising it | t6, 36:01–55:27 |
| Family link stays and grows into a parent-portal board: enrollment signed before intake, progress view, surveys on a cadence, phone signature on the quarterly | Asked for by name on 11/04; expected to cut no-shows and unsigned paperwork | t7, 14:26, 32:48, 1:13:29; t8, 41:52 |
| Add a school-portal board: referral button, daily classroom input, teacher feedback, incident upload, student progress view | "The school portal might be cool though"; schools want functioning tied to interventions | t7, 33:46–34:41; t8, 40:56 |
| Add a mobile-app board: pick student, start/stop, dictate, screen locked; show the email or Notes workaround beside it | All staff carry work iPhones; mobile asked for directly | t7, 16:05–17:54, 33:48–34:47 |
| Add a staff-dashboard board: my notes done and missing, my goals, the supervisor's view of the same | "I want to know myself"; the rejected box piles up | t8, 02:48–05:27, 09:10, 47:32 |
| Keep peer-to-peer brief, partial-approval doors and early-discharge path exactly where they are | Best-received screens | t6, 25:02; t1, 64:30 |

Commitments made on tape in the 10/30 meetings, listed as said; this doc does not know which have happened since:

- [ ] Send the brief (referral to appeal, pain points, solutions, features), a proposed timeline and the BAA — "We'll send over all those things by Monday" (t6, 66:09)
- [ ] Staff-meeting video with a QR code for feedback, for the \~100-person Tuesday meeting (t6, 60:10, 67:25)
- [ ] Zoom with Michelle Hamilton as point person and phase approver (t6, 62:17)
- [ ] Wednesday 9 am session with the whole Harvest team (t6, 69:29)
- [ ] Introduction to the Lauris contact "Gray" (t6, 74:27)
- [ ] Ask for the documentation trainer and the training textbook; pay for clinician time to write prompts (t2, 78:39)
- [ ] Collect Harvest's "examples of badness" notes for an evaluation set (t5, 45:30)
- [ ] Digital-health attorney on recording consent (t6, 59:08)
- [ ] Senior advisor on site this week appoints the pilot tester (t5, 46:27)
- [ ] Plan 1–2 weeks on site beside Jillian before any output reaches her (t5, 69:23–70:31, Psyflo)

Sources: six Plaud recordings linked from the Drive folder (10/29: field consult, direct-staff visit and debrief, program walkthrough; 10/30: partnership discussion, product-design meeting, product discovery). Timestamps are minutes:seconds into each recording; speaker roles are inferred from content. The 11/04 and 11/05 recordings were not readable without a Plaud login.
