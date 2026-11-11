# 01 Clinical workflow and healthcare operations review (Agent A)

Role: Virginia school-based behavioral health clinical operations director. Date: 11 Nov 2026. Scope: how Harvest actually runs TDT from referral to discharge, and which demo assumptions the evidence does not support. No code was edited.

## 0. How to read this

**Evidence ids.** G-nnn = `review/evidence/granola.md`. P-nnn = `review/evidence/plaud.md`. T-nnn = `review/evidence/team-workspace.md`. Other short names: WM = `harvest_workflow_map_1.md` (earlier synthesis of three 29 Oct recordings); REF = `Harvest-TDT-Workflow-Reference-2026-11-10.pdf` (cited by part, stage and page); RN = `research/RESEARCH-NOTES.md`; BRIEF, CONTRACT, PD, NOTES = `docs/BRIEF.md`, `docs/CONTRACT.md`, `docs/product-direction.md`, `seed/notes.md`. Code paths are relative to `demos/psyflo-unified-demo/` unless prefixed `v3:` (`demos/psyflo-tdt-v3-reference/source/`).

**Status tags.** [O] official text, read by the team-workspace agent in Drive copies of DMAS and Virginia Administrative Code documents (T-068 to T-075); I did not open the live sites and currency is unchecked. [H] Harvest-reported: staff said it, but the rule behind it is unknown. [U] unverified: PsyFlo secondary compilation, payer-specific guidance not seen, or a demo assumption.

**How much weight each source carries.**
- The Plaud connector returned no recordings. Every P- item is secondary (WM for 29 Oct, PD for 30 Oct to 5 Nov). Nothing here was checked against audio.
- T- items for 4 and 5 Nov (T-002, T-019, T-020) come from Drive-hosted transcripts read by the team-workspace agent and are the closest to primary for those days.
- Only one Granola meeting has Harvest speaking for itself (2 Nov, G-045 to G-059). Most G- items are PsyFlo's retelling or demo content. The Granola digest finished while I worked; I read it in full and re-checked it before finalizing (only wording changed). I did not re-read the Granola meetings myself.
- I ran the master app briefly on private ports to read its state, then stopped it.

Real staff, student and family names in the sources are omitted. Initials such as T.W. and M.R. are synthetic demo records.

---

## 1. Referral to discharge as Harvest does it

Order follows what staff described. "Hands to" is the next owner. Contested clocks are tagged and resolved in section 7.

| # | Step | Trigger | Who (role) | System | Clock (status) | Output, hands to | Pain staff named |
|---|---|---|---|---|---|---|---|
| 1 | School escalation and parent consent | Student not helped by school supports | Counselor or behavior interventionist; parent | School records, phone | Consent before referral [H] (P-003, T-002; 5 Nov, one speaker) | Consented referral, to Harvest | Uneven school supports; Harvest withdrew TDT from some schools (P-004) |
| 2 | Referral submitted | Counselor decides to refer | School counselor | Google Form into a static Excel sheet, reviewed by hand (G-059, T-002) | None stated | Form plus attachments, to Harvest reviewer (role not stated) | Missing information; school gets no status (not discussed with Harvest) |
| 3 | Review and track fork | Referral lands | Harvest reviewer (unnamed role) | Sheet | None | Medicaid to TDT; no Medicaid to grant program (SEBS: limited places, no diagnosis, school administration decides); alternative schools use opt-out (P-001, P-003, T-003) | Mixed caseloads (P-002); grant ends Dec 2027 and 2028 (P-005) |
| 4 | First guardian call; service-history call | Referral reviewed | Harvest staff (role not stated) | Phone; common-behaviors form (T-002) | None | Behaviors seen at home; 2 to 3 years of prior services, because payers ask (T-006); to screener | Phone time defending prior services later (REF Part B, FC 39:43 to 41:49) |
| 5 | Client number and Lauris record | Referral accepted | One person issues numbers by email; site supervisor builds base sheet (P-027); admin creates ID (G-044) | Email; Lauris | None | Number and record, to screener | Single-person dependency (P-027) |
| 6 | Eligibility | Insurance details known | Not established (P-006) | Not established | Cadence: weekly with screenshot (one payer's auditor, relayed) [H, second-hand] (P-008); each visit (DMAS bulletin via RN) [U]; none in Drive documents (T-026) | Dated result; no Harvest source for who or where | Retro billback of about $10,000 despite three approvals (P-009); Harvest does not run weekly checks (T-025) |
| 7 | Admission screening | Referral qualifies | LPC, two on site, a virtual LPC may screen (P-010, P-013); Director says most are QMHP site supervisors (T-005) | Phone; typed live; Lauris form (setting inferred) | 30 to 45 min; unreimbursed [H] (P-010, P-011) | Behaviors with frequency, duration, intensity; services; IEP; narrative; yes/no; preliminary diagnosis. Not sent to payer, only seen in audit (P-012). To intake | Unpaid; diagnosis before meeting the child (P-014); thin LPC bench (P-013); school coordination (P-010) |
| 8 | Intake scheduling | Admission yes | LPC, site supervisor, drivers | Phone; Harvest transport | Face to face required; telehealth withdrawn [H] (P-015) | Appointment | Transport failures (P-018); remote pre-paperwork considered and dropped (P-019) |
| 9 | Intake: CNA plus enrollment pack | Appointment kept | LPC runs CNA; site supervisor (QMHP) runs enrollment half (P-025) | Lauris CNA and forms; paper; base sheet | 2 to 3 h (P-025), about 2.5 h (REF A4 update). CNA face to face by LMHP-type, 15 elements [O] (T-071) | CNA; releases; medication, emergency, falls, human-rights, transport, behavior, marketing consents (P-026). To ISP | Live typing harms rapport (P-029); trauma asked before development (P-031); releases and guardianship tracked outside the computer (P-032, P-033) |
| 10 | Signatures at intake | Intake | Guardian; client 14 or older also consents; clinician present | Paper, wet ink | In person [H] (P-016); origin unresolved (P-017, T-007) | Signed packet, to chart | Missing signatures found only at audit (P-024) |
| 11 | ISP | CNA done | LPC, guardian and client present | Lauris ISP; Google Sheet goal scaffold (P-038) | Within 24 h of intake, rest within a week [H] (P-035). ISP within 30 calendar days of starting services, reviewed at least every 90 days [O] (T-070) | Measurable goals, named interventions; about 6 more hours of paperwork (P-036). To SRA writer | Goals combined to save time (P-037); residents take days (P-036) |
| 12 | Initial SRA, internal approval | ISP done | LPC writes; assistant clinical support supervisor approves every outgoing SRA by email (P-046); clinical director and assistant cover (T-010) | Lauris SRA on exact DMAS PDF, about half auto-filled (P-045, T-010); email | Send within 30 days of intake, no backdating [H] (P-053); 3.5 to 4 h elapsed before SRA starts (P-044); SRA writing time never captured (T-009) | SRA with 2 of 3 and 1 of 5 criteria, prior services [O] (T-074). To signer | Copy and paste; what to disclose to a payer (P-052); prior-service proof (P-050); denied for too few and too many services (P-051) |
| 13 | Attestation | Approved | LMHP-type, credentials; NPI on initial form [O] (T-074) | Lauris Forms to Approve (BRIEF) | Signature "actual or electronic" on both SRA forms [O] (T-074) | Signed form, to sender | Approval step is a single person (P-046) |
| 14 | Sending | Signed | Site supervisor sends (P-039); program director monitors (P-059) | SFax (T-010); Availity (Anthem); UHC portal | Channel varies by payer and day [H] (P-055) | Fax reference, to follow-up | Misrouted faxes; unannounced portal moves (P-055, P-057) |
| 15 | Payer follow-up | Sent | Staff (role not stated) | Phone | Receipt call about day 10 [H] (P-057) | Confirmation, to tracker | Payers answer on the last day; Anthem 24 h turnarounds need constant watching (P-058, P-060) |
| 16 | Decision recorded | Payer reply | Site supervisor, program director watch fax inbox and Availity; LPC (P-059) | Fax; phone; email chain; master Google Sheet; Lauris Authorizations, units keyed by hand (T-018) | Window: 14 days [H] (P-058, T-012) versus 7 calendar days since 1 Jan 2026 [U] (T-076); some exceed a month (T-012) | Award in units (65 or 80 on a three-month ask, P-064), to unit tracking. Payer also writes to guardian (P-073) | No system of record for stage (P-059); no rate computed (P-063) |
| 17 | Partial award response | Award below ask | LPC; clinical staff only for the doors below | Phone; trackers | None | Four doors: accept (gap unpaid), add information, peer-to-peer, or use units, discharge early and write a new initial, the default (T-014, P-071) | Payers question early use; a colleague objected (P-071) |
| 18 | Additional-information request | Payer pends | Clinical staff only (P-069) | Availity (Anthem), fax | Under 24 h [H] (P-069, T-015); outpatient pend 3 business days [U] (T-076) | Reply restating the SRA, to payer | Covering clinician never met the student (P-069, P-074) |
| 19 | Peer-to-peer | Partial or denial | Clinical staff only; allowed once (P-070) | Payer phone queue and calendar | One to two months out [H] (P-070) | Outcome, to tracker | Units gone by the call; credentials challenged; no full denial overturned in six years (P-070) |
| 20 | Denial, reconsideration, appeal | Full denial | Guardian per LPC (P-075); Harvest per Director (P-076); unresolved (T-017) | Letter, fax | Member appeal 60 days [U] (G-074; v3 cites 42 CFR 438.402); provider path 30 days after MCO denial [U] (RN section 3) | Appeal letter, to payer | Rarely used; outcomes untracked; guardians misread letters (P-073, P-077) |
| 21 | Daily service and daily note (DPN) | Each school day | Direct support | Lauris saved session in morning, processed at day end; phone Notes or email (T-019); direct-hours Google Sheet (P-083) | Due within 24 h [H] (T-020); none found in Chapter IV [O] (T-072) | Processed note draws units down (T-018). To supervisor review, Lauris rejected box | Translation gap, dread, backlog (P-087, P-088); quiet days (P-090) |
| 22 | Weekly guardian contact | Weekly | Direct support | Lauris | At least weekly [O] (T-070) | Note, to continued-stay evidence | Not discussed as a pain |
| 23 | Monthly collateral | Monthly | Direct support | Lauris; releases outside computer (P-033) | Monthly per outside provider [H] (P-101) | Note, to SRA care coordination | Release tracking (P-033) |
| 24 | Incident report | Event | Staff; program director enters tracker; admin assistant runs monthly Lauris report (REF Stage 16, p. 51) | Lauris; state portal; Google Sheets; binders | Some level 2 to state portal in 24 h [H] (P-141); 3 incidents in 3 months flags a child (P-140) | Report, to tracker and binder | Second compliance system on spreadsheets (P-140) |
| 25 | Quarterly and internal quarterly | About every 3 months | Direct staff write; reviewed with parent | Lauris; printed, signed, scanned into another Lauris area (T-022) | ISP review at least every 90 days with guardian signature [O] (T-070). Whether the quarterly is that review is my hypothesis, not evidenced | Quarterly; internal quarterly kept from audits (P-102) | Quarterly and SRA dates drift when awards are short (P-103) |
| 26 | Unit watch, continued stay | Units low, about 2.5 months in (REF A4 update, FC 64:30) | Direct staff warn site supervisor, who texts LPC (P-072); LPC reads all notes (P-106) | Lauris warning; Google Doc scratchpad | Reapply when units run low [H]; 14 business days ahead [U] (P-109, T-076); insurers want last 30 days [H] (P-106) | Continued-stay SRA, to signer | 60 or more notes by hand; weak notes from high turnover; summer denials (P-106 to P-108) |
| 27 | Early discharge, new initial | Units used up after accepted partial | LPC, clinical team | Lauris; new SRA | 30-day gap to restart as initial [H] (P-071); lapse over 31 consecutive days means discharge [O] (T-070) | Discharge, new intake | Full redo of a 2-plus hour intake (P-071) |
| 28 | Discharge or return | Goals met, lapse, exit | LPC, clinical team | Lauris | 30 days without billable service forces discharge [H] (P-053); 31 [O] | Discharge; SEBS step-down (T-003); returning clients reactivated (P-027) | Progress read as grounds to discharge; students return (P-090) |
| O | Audit overlay | Payer audit | Director of Programs, team | Paper, printed and shipped | Every 3 to 4 months, about 20 clients per payer (P-079) | Packet | One wrong verb voids a note (P-081); extrapolated audit (P-080) |

Gaps: who receives referrals, who verifies eligibility, who makes the day-10 call, discharge summary content and guardian notification are not described in any source (P-006, WM gap D).

---

## 2. Roles: what each may do, sign and see

| Role | May do, sign, see | Source disagreements |
|---|---|---|
| Direct support (QMHP-C/E; QMHP-T trainee) | Writes DPN, weekly, monthly, quarterly, incident notes (P-101). Lauris dropdowns limited to what their credential allows (T-019). Trainee notes need supervisor review (T-019, P-091). Cannot reply to payers (P-069). Not licensed (G-008) | Laptops (G-010) versus work iPhones (T-030, P-094). Whether Lauris hides screening data from them is speculation (G-034) |
| Site supervisor (QMHP) | Pre-fills enrollment forms (P-023); runs enrollment half of intake (P-025); sends packet (P-039); watches fax inbox (P-059); tracks units 2 to 3 h a week, all six surveyed (T-044); reviews notes | Audit says screenings are licensed-only; Director says mostly supervisors (T-005, T-004). Demo "supervisor" is a note reviewer (BRIEF) |
| Assistant clinical support supervisor (LPC; the SRA writer) | Screens, runs CNA and ISP, writes SRA, approves every outgoing SRA by email (P-046), answers information requests, peer-to-peer; trains staff on tracking (REF Stage 17) | Single point of failure; cover is clinical director and assistant (T-010). Whether the second on-site or virtual LPC may approve is unstated (P-046) |
| Clinical director; senior clinical advisor | Clinical sign-off; advisor sets priority order (T-034, P-135); wants own-note view for staff (P-134) | Who approves the pilot differs by voice (P-132) |
| Virtual LPC; residents | Virtual LPC screens, cannot do intakes (P-013). Residents slow (P-036) | None |
| Program director; Director of Programs | Watches fax inbox and Availity (P-059); enters incidents (REF Stage 16); audit history and payer relationships (P-079); owns the signature-rule answer (P-017) | Answer never recorded (P-017) |
| Administrator, operations, billing | Director of operations handles billing; program support manager builds sheets and sends texts; admin assistant runs monthly incident report; one person issues client numbers (REF A2 update; Stage 16; P-027) | No billing or claims role in the 29 Oct rooms (WM section 6); claims not discussed (REF). Executive access to clinical records unknown (G section 3h) |
| Executive director | Grant writing; wants a person reviewing output (P-123); pilot approver unclear (P-132) | P-123 versus no objection to auto-submit (P-062) |
| School counselor | Refers with parent consent (P-003); supplies grades, schedule, outcome of school supports (G-060) | Teacher feedback asked for 4 Nov (P-137); Nov 7 product call dropped teacher portal (README). School privacy never discussed (G section 3l) |
| Guardian; client 14 or older | Signs forms in person [H] (P-016); client also consents; weekly contact; may sign quarterly by phone if allowed (P-022); receives payer letters (P-073) | Remote signature (P-021) versus in person (P-016); appeal right (P-075 versus P-076) |
| Payer reviewer (MCO or FFS contractor) | Approves, partials, denies, phones offers (P-067), asks information (P-069), schedules peer-to-peer (P-070); challenges credentials (P-070). Licensed but may never see the child (G-003, non-Harvest) | Window 14 versus 7 days (P-058). Secondary physician review for under-21 denials [U] (T-080) |
| DMAS, state portals | Eligibility lookup [U] (RN); AIMS online appeals from 5 Nov [U] (T-079); FFS contractor portal via MES since June [U] (T-076); state incident portal (P-141); DMAS helpline for eligibility mismatches [O guidance] (T-075) | Harvest reads decisions by fax, not portals (T-011, P-061) versus staff watching Availity (P-059, P-060) |

**Signature matrix.** DPN: staff, processed in Lauris, trainee notes supervisor-approved (T-019). CNA: LMHP-type, face to face, dated signature [O] (T-071). ISP: LMHP-reviewed, guardian signs [O] (T-070 and v3: `source/screens/02-core-data.js:84-85`), client 14 or older consents [H] (P-016). SRA: LMHP-type attestation [O] (T-074) after internal approval [H] (P-046). Quarterly: guardian, printed and scanned today [H] (T-022). Appeal letter: guardian (P-075), provider path unresolved (T-017).

---

## 3. TDT daily documentation

**What a daily note must contain.**

| Element | Status | Evidence |
|---|---|---|
| Individual-specific; signed and contemporaneously dated; service, date, setting, credentials, time or units; supports billed time; duplicates do not count; retractable | [O] | T-072 |
| Progress on each ISP objective (yes or no), mood check-in, goals pulled from the plan | [H] | P-086, REF Stage 9 |
| Interventions picked from credential-limited dropdowns; missing option means going back to clinical staff | [H] | T-019 |
| Frequency, duration, intensity, dates within last 30 days (insurer wants these in continued stay) | [H] | P-106 |
| Avoid "observed"; one wrong verb can void the note and its payment | [H] | P-081 |
| Original narrative, not boilerplate; auditors look for it | [H] | P-097 |
| Safety plan completeness when suicidal ideation is mentioned | [H] | P-098 |
| Quiet days still need medical-necessity wording | [H] | P-090 |

**Timing.** Written at day end because dismissal is about 2:30 to 3:00; crisis days from memory (T-019). Due within 24 h "under Medicaid guidelines" per the senior clinical advisor, with auditors now seeing timestamps (T-020, 4 Nov); no 24-hour text in Chapter IV [O] (T-072); no recording gives a note deadline (P-089); Harvest's own pilot measure is notes complete within 24 h and in compliance (G-049, P-136). Treat 24 h as Harvest policy until sourced. Staff survey: 14 of 25 hear back only when something is wrong; new staff need 3 to 6 months before notes need no fixing (T-043).

**Units and minutes: every number in the sources, not reconciled.**

| Source | Figure |
|---|---|
| Official [O] | Program at least 2 h a day with at least 2 therapeutic activities (T-070, T-073). 1 unit = 2 to 2.99 h; 2 = 3 to 4.99 h; 3 = 5 h or more (T-068). Same regulation also prints 1 unit = 2 to 3 h, 2 = 4 to 6.99 h, 3 = 7 h or more under "therapeutic day treatment or partial hospitalization"; looks legacy, unresolved (T-068). A "780 units a year" cap appears only in a search summary, not in Drive copies (T-069, RN) |
| Director of Programs [H] | Staff need one hour of direct intervention a day, splittable into 30 and 15 minute pieces; 2 to 3 h on escalated days (P-082) |
| SRA-writing LPC [H] | Typical child needs 3 units, "five-plus hours"; recalled 2 units as "two to four hours", hedged (P-065). Payers usually award 2 units a day, which is 4 h (REF Part A update, PW 67:43) |
| Payers | Dispute 5-plus hour days; carve out bathroom and lunch (P-066); Chapter IV excludes idle, waiting, transport, documentation time, classroom monitoring without treatment [O] (T-070) |
| Awards | 65 or 80 units on a three-month ask (P-064); 150 asked, 120 offered, 140 countered, 110 awarded, one real case (P-067, T-013) |
| Redesign | 15-minute units from 1 Jul 2027, draft [U] (G-077, T-078); Harvest doubts they work in schools (P-116) |
| Master demo | 60, 180, 300 minutes for 1, 2, 3 units (`web/js/shared/dates.js:55`); "3 units per school day"; "150 units is about 13 weeks" (BRIEF). 150 units is 10 weeks at 3 a day, 15 at 2 (U-16) |
| v3 demo | Tiers 120, 180, 300 minutes, daily maximum 3, rule editable with a required source (`v3: time.js:138-176`) |
| Demo case M.R. | Timer blocks total 310 min, 3 units, but 90 min is marked unconfirmed and includes lunch, recess and transitions (`seed/extra/00-flows.json`). Confirmed blocks alone are 220 min, 2 units under either band set. `seed/scripts/dictation_MR.md` lists blocks totalling 270 min yet states 5 h 10 min |

**Who bills.** Not established. Staff key approved units by hand into Lauris Authorizations from the faxed award, notes draw units down, and Lauris warns when low (T-018). Lauris lists 837 billing on its site (WM section 4b, vendor claim) and charges Harvest per form processed (T-027). A director of operations "handles billing" (REF A2 update). Whether anyone reconciles units authorized to units billed is open (RN section 6). Documentation time itself is not reimbursable [O] (T-070).

---

## 4. Existing students versus newly admitted students

| Dimension | Newly admitted | Already in program | Evidence |
|---|---|---|---|
| Work | Referral, call, screening, intake, ISP, initial SRA | Daily, weekly, monthly, quarterly notes; continued stay; units watch | P-101, P-106 |
| Who carries it | LPC and site supervisor; heavy clinical load, about 9.5 to 10.5 h per client before first request is WM's assembly, not stated | Direct support and supervisors; LPC reads notes at renewal | P-025, P-036, WM section 5 |
| Clocks | 24 h ISP [H], 30-day send [H], 31-day CNA validity [O] | 24 h note [H], 90-day ISP review [O], annual CNA update [O], 31-day lapse [O] | P-035, P-053, T-070, T-071 |
| Data in PsyFlo | Created in the system from the start | Legacy notes live in Lauris; about 52 active TDT clients exported first, about 2,000 numbers later (P-139) | G-092 |
| Evidence quality | Clean | Early continued stays "choppy" from old notes (G-092); read-only history only (G-093) | G-092, G-093 |
| Authorization | Initial SRA on H2016 form | Continued Stay form; setting changes (school, after school, summer) supported on continued stay [O guidance] (T-075) | T-074, T-075 |
| Transitions | SEBS to TDT when criteria met; short TDT award moves back to SEBS | Returning discharged clients reactivated; fresh intake to return (P-027, REF Stage 19) | T-003 |
| Pilot plan | Referral through initial SRA, ideally at a new school (PsyFlo idea; Harvest has not agreed) | Continued stay follows | G-092 |

---

## 5. Non-billable administrative work, ranked by pain

Rank weighs how often it was volunteered, how many voices, and any number. No time study exists; hours are named figures, not measurements (T-009).

| Rank | Work | Who | Time evidence | Pain evidence |
|---|---|---|---|---|
| 1 | Writing daily notes | Direct support | About 40% of day on paperwork versus 53% with students; 10 of 26 spend 11 or more hours a week; daily notes the biggest item, 28 of 45 (T-043). PsyFlo says 30 minutes a note and one staffer 3 hours on heavy days (G-064, P-129) | Dread, freezing, spiral (P-087, P-088); volunteered unprompted (P-092) |
| 2 | Continued-stay assembly | LPC | Reads 60 or more notes by hand; time not measured (P-106) | Hardest cycle point (T-023); LPC prefers writing an initial (P-107) |
| 3 | Intake paperwork after the visit | LPC, residents | About 6 h after ISP; residents take days (P-036) | 24 h ISP clock is the hardest deadline (REF Stage 4) |
| 4 | Authorization tracking and chasing | Site supervisors, program director | 2 to 3 h a week each, six of six; four of six learn of low units with under a week's notice (T-044) | No system of record (P-059); many trackers (P-112) |
| 5 | Payer monitoring and calls | Site supervisor, program director | Constant for 24 h turnarounds (P-060); day-10 calls (P-057) | Misrouted faxes (P-057) |
| 6 | Supervisor and trainer catch-up | Supervisors, trainer | Unpaid (P-088, P-091) | Training cut back (P-087) |
| 7 | Unpaid admission screening | LPC or QMHP | 30 to 45 min per referral (P-011) | Preliminary diagnosis before contact (P-014) |
| 8 | Audit response | Director of Programs, team | Days to weeks; about 50 lb of paper, about $800 shipping (P-079) | Extrapolated audit near $1 million, NDA (P-080) |
| 9 | Prior-service proof calls to guardians | LPC | Not measured (P-050) | Phone time defending services (REF) |
| 10 | Incident and licensure system | Program directors, admin assistant | Monthly manual flagging and binders (REF Stage 16) | "Total game changer" if solved, one voice (P-140) |
| 11 | Annual outcomes compilation | Clinical leadership | April to August (REF Stage 18) | Data scattered (G-051) |
| 12 | Enrollment pre-fill, client numbers, base sheet | Site supervisor, one registry holder | Not measured (P-023, P-027) | Single-person risk (P-027) |
| 13 | Evidence cheat sheet upkeep | LPC, own time | Not measured (P-049) | Tired of justifying to insurers (P-049) |

The CNA may be billable as a TDT assessment code (REF A4 rates table); whether Harvest bills it is not established.

---

## 6. Handoffs and failure modes

| # | Handoff | Failure modes staff described |
|---|---|---|
| H1 | School to Harvest | Form lands in static sheet reviewed by hand (G-059); consent rule exists because of a complaint (T-002) |
| H2 | Referral to screener | Capacity: two on-site LPCs, one virtual, two residents (P-013) |
| H3 | Screening to intake | Content carries forward but screening is never seen by payer (P-012); trauma before development order (P-031) |
| H4 | Registrar to record | One person controls numbers (P-027) |
| H5 | Intake to ISP | 24 h clock; goals combined (P-035, P-037) |
| H6 | ISP to SRA writer | Copy and paste (P-044); prior services must show outcome (P-050) |
| H7 | Writer to approver to signer to sender | Email chain, one approver, site supervisor sends (P-046, P-039) |
| H8 | Sender to payer | Wrong fax number; payer says sent, Harvest never got it (P-057); portal migrations unannounced (P-055) |
| H9 | Payer to Harvest | Decision by fax or phone; Harvest does not read portals (T-010); payer also writes guardians, who misread (P-073) |
| H10 | Decision to trackers and Lauris | Units hand-keyed; "pending" units trick; sheet plus email (T-018) |
| H11 | Direct staff to site supervisor | Low-unit warnings by word or text (P-072) |
| H12 | Direct staff to clinician | Weak notes feed the SRA (P-092, P-107); dropdown gaps send staff back to clinical staff (T-019) |
| H13 | Reviewer to staff | Lauris rejected box piles up (P-099); 14 of 25 hear back only when something is wrong (T-043) |
| H14 | LPC out to covering clinician | Under-24 h reply or one-shot peer-to-peer by someone who never met the student (P-069, P-074) |
| H15 | Harvest to guardian | Letters misread; no Harvest-to-guardian status updates described (P-073) |
| H16 | Clinical to compliance | State portal 24 h, tracker, binder printed by hand (P-141, REF Stage 16) |
| H17 | Harvest to auditor | Paper printed and shipped; one payer accepts uploads (P-079) |
| H18 | Discharge back to referral | No re-check prompt; advisor wants one each semester (P-115) |

---

## 7. Product assumptions the interviews do not support

"Where" gives the demo location. Recommendations: keep, reword, configurable, remove. The v3 demo handles provenance better than the master in places (it has a rule register with `policy`, `observed` and `unverified` kinds, `v3: source/screens/02-core-data.js:70-98`).

| # | Assumption | Where | Evidence for and against | Rec |
|---|---|---|---|---|
| A1 | ISP and clinical information due 24 h after intake, shown as a countdown | `web/screens/ExtISP.dc.html:105`; NOTES 16 | For: P-035, G-015. Against: Chapter IV says 30 calendar days [O] (T-070); advisor unsure (T-008). v3 uses 30 days (`02-core-data.js:84`) | Configurable; Harvest-practice chip, official 30 days beside it |
| A2 | Initial SRA must go within 30 days of intake | `web/js/shared/model.js:36`; BRIEF | For: P-053. Against: not in Chapter IV (T-016). v3 marks it observed | Configurable with provenance label |
| A3 | Decision due = sent plus 7 calendar days, overdue turns red | `model.js:44-49`; BRIEF lifecycle | For: RN section 3 (secondary). Against: Harvest believes 14, many answer on day 14, some exceed a month (P-058, T-012) | Configurable per payer; neutral "day N"; show both sources |
| A4 | Per-payer decision days (4 to 7), partial rates (25 to 74%), request counts | `seed/seed.json` payers; Payer Playbook | Harvest has never computed rates (T-045, P-063); copied into playbook as "learned from past decisions" (NOTES 40) | Remove from client view or label illustrative |
| A5 | Analytics tagged "Harvest's Lauris export and master tracker" | `web/js/screens/Analytics.js:58-64` | Numbers are synthetic (G-076, T-067) | Remove attribution; label illustrative |
| A6 | Receipt check on day 5 | BRIEF lifecycle; `seed/extra/requests.json` | Harvest calls about day 10 to confirm receipt (P-057); G-068 says day 10 | Reword to day 10, configurable; receipt check, not decision chase |
| A7 | One unit from 60 minutes | `web/js/shared/dates.js:55` | Official bands start at 120 (T-068); one hour is a Director statement (P-082) | Configurable; default official bands with source |
| A8 | Three units a day for run-out math | `model.js:38`; `EarlyDischarge.js` | Typical need 3 (P-065); payers usually award 2 (REF) | Configurable per student |
| A9 | 5 h 10 min contact equals 3 units, includes unconfirmed block and lunch | `seed/extra/00-flows.json`; dictation script | Payers dispute lunch (P-066); non-reimbursable list [O] (T-070) | Reword; confirmed time only drives units |
| A10 | "150 units is about 13 weeks" | BRIEF | Not from any source (U-16) | Remove; compute from rate |
| A11 | Weekly eligibility re-check with screenshot, default on | `web/js/screens/Eligibility.js`; BRIEF rule 5 | For: one auditor, relayed (P-008). Against: not Harvest practice (T-025), no cadence in Drive (T-026) | Configurable; "last verified [date]" |
| A12 | Eligibility only after family link | BRIEF rule 5 | No Harvest evidence either way (P-006); Medicaid ID may arrive on the first call | Reword: any source, recorded by a person |
| A13 | Family link signs consent and enrollment before intake; ISP link sent while guardian is in the room | NOTES 11, 12, 16, 46 | For: leadership ask (P-021, P-022). Against: in person (P-016), source unresolved (P-017), LPC doubts (P-020), PsyFlo unsure (G-061) | Configurable per document; no rule text |
| A14 | Screener is a clinician; family books from clinician calendars | NOTES 7 and 50 | Two LPCs (P-013) versus mostly QMHPs (T-005) | Configurable screener role |
| A15 | Clinician presses Send | BRIEF rule 3; lifecycle | Site supervisor sends (P-039); LPC approves (P-046) | Reword: approver and sender are separate configurable roles |
| A16 | No internal approval stage | BRIEF lifecycle | One clinician approves every SRA (P-046) | Add "Pending clinical approval" |
| A17 | Supervisor presses Get Signature | NOTES 18 vs BRIEF rule 4 | Attestation is LMHP-type [O] (T-074); BRIEF says clinician | Reword: credentialed signer roster |
| A18 | Harvest checks Availity daily; read-back; fax OCR matching | NOTES 19, 34; G-069 | Harvest reads decisions by fax, not portals (T-011, P-061); Anthem info requests on Availity (P-060); SFax API unverified (G-070) | Simulated; per-payer channel setting |
| A19 | Payer channels (Humana and FFS by fax) | `seed/seed.json` payers | PsyFlo brief says Humana on Availity, FFS portal only (T-076, T-077); Harvest names Anthem, Sentara, UHC only (REF A5 update) | Reword; confirm MCO list (T-051) |
| A20 | Only guardians appeal; "the appeal is theirs" | NOTES 39, 49; AppealLetter | For: P-075. Against: P-076, T-017; v3 notes provider appeal with consent (`02-core-data.js:97`) | Configurable initiator; keep guardian letter as one path |
| A21 | 60-day appeal window with countdown | `model.js:55`; G-074 | v3 cites 42 CFR 438.402; RN has 30-day provider path (T-081) | Configurable with source |
| A22 | Early discharge needs 30-day gap, labelled "DMAS rule" | `web/js/screens/EarlyDischarge.js:46` | Harvest-reported (P-071); official lapse is over 31 days (T-070) | Reword: drop "DMAS rule" |
| A23 | Daily notes due in 24 h as a staff KPI; 3:30 pm default end | `web/js/screens/StaffDashboard.js:25`; NOTES 28 | Harvest asked for 24 h metric (G-049); not in Chapter IV (T-072); dismissal 2:30 to 3:00 (T-019) | Configurable Harvest-policy KPI |
| A24 | Weekly and monthly notes filled by clinician | NOTES 24, 25 | Direct support writes them (P-101) | Reword |
| A25 | Admin lands on Authorizations | README roles | Site supervisors and program director track (T-044, P-059); billing sits with operations (REF) | Configurable tracker owner |
| A26 | 61 daily, 12 weekly, 3 monthly notes cited | `seed/extra/requests.json` draft_sources | PsyFlo arithmetic (P-110); only 53 weekdays elapsed by 29 Oct; store holds one M.R. note | Count from stored notes |
| A27 | Addendum to processed or six-month-old notes | `v3: 76-enhance.js:754`, `68-dpn.js:155` | No Harvest request; correction process unknown (P-100); decision against editing (G-093) | Remove; read-only history |
| A28 | Psyflo agent submits; voice agent phones payers | `v3: 08-history.js:22-23`, `01-core.js:94` | Harvest wants a person reviewing (P-123); only clinical staff do peer-to-peer (P-070) | Remove from path |
| A29 | Claim-denial queue for Billing | `v3: 02-core-data.js:135-137` | Marked illustrative; no claims role seen (WM section 6) | Remove for Harvest |
| A30 | Teacher check-ins in parent progress | ParentProgress; seed | Nov 7 call dropped them; Harvest asked for teacher feedback (P-137) | Reword: counselor-mediated; confirm |

---

## 8. Open questions for Harvest, by who must answer

| Who | Question | Why the demo needs it |
|---|---|---|
| Director of Programs | Is in-person signature a Medicaid, MCO or Lauris limit, per document? (P-017) | A13 |
| Director of Programs | Who may appeal in Harvest's name? (P-078) | A20 |
| Director of Programs | Is the TDT daily minimum one hour or two? (P-082) | A7 |
| Senior clinical advisor | Is the 24 h ISP clock a rule, whose, and does it run from intake or service start? (T-008) | A1 |
| Senior clinical advisor | Is the 24 h note due date Medicaid, MCO, licensing or Harvest policy? (T-020) | A23 |
| SRA-writing LPC | How long does one SRA take; how many a month? (T-009) | Pilot baseline |
| SRA-writing LPC | Who covers approval and signature when she is out; which clinicians may attest? (P-046) | A15, A17 |
| SRA-writing LPC | What does the day-10 call accomplish, and who makes it? (P-057) | A6 |
| Site supervisors | Who sends, who watches the fax inbox, who keys units? (P-039, T-018) | A15, A25 |
| Director of operations | Who verifies eligibility, how often, where? (P-006) | A11, A12 |
| Director of operations | Who bills, and is the CNA billed? Does anyone reconcile units authorized to units billed? (RN section 6) | Section 3 |
| Director of operations | What counts as a billable form under the Lauris contract? (WM gap D) | Cost risk |
| Clinical director | Who screens: LPC or QMHP? (T-005) | A14 |
| Clinical director | How are corrections or addenda to processed notes handled? (P-100) | A27 |
| Executive director | Which MCOs does Harvest bill, with channel and window each? (T-051) | A19 |
| Executive director | Which school and staff start the pilot? (T-052) | Scope |
| Lauris contact | Does Lauris accept e-signature, expose any API, tolerate form fill on open pages? (G-023) | A13, A18 |
| Payer provider relations or DMAS | Decision window, information-request window, reconsideration and appeal clocks per payer | A3, A21 |
| PsyFlo counsel | Recording consent, BAA, retention for screening or P2P recording (P-131, T-060) | Flow A |
| PsyFlo lead | Is the platform two tabs or three, and when does teacher feedback return? (G-039) | A30 |

---

## 9. What the demo should make true (one page)

A Harvest leader will check these first.

1. **Lauris stays the record.** Staff open the day's notes in a saved session in the morning and process at day end. PsyFlo drafts; a person presses Process Form, Get Signature and Send (T-019, T-054).
2. **A daily note is per student per day**, written by direct support from credential-limited dropdowns; trainee notes wait for supervisor review; a rejected box exists (T-019, P-099).
3. **Units follow a rule that shows its source.** Default to official bands (2, 3, 5 hours); the Director's one-hour figure is visible as a conflict, never silently used. A running timer is not billable time. Lunch, recess and transitions are never auto-counted (A7, A9, P-066).
4. **Awards are partial and in units.** Show requested and awarded; no rate is presented as Harvest data (P-063, T-045).
5. **The SRA chain has the real roles.** LPC writes; internal approver signs off; LMHP-type attests; site supervisor sends; clinical staff only reply to payers and do peer-to-peer; a backup owner is visible (P-046, P-039, P-069).
6. **Every clock shows provenance and is configurable.** 24 h ISP is Harvest practice next to the 30-day official figure. Decision window shows "Day N, call about day 10" with 7 and 14 as labelled sources. Information request is 24 h [H]. Early discharge says "Harvest practice", not "DMAS rule" (A1 to A3, A22).
7. **No universal signature rule.** Each document has its own mode and status; a remote signature never claims to satisfy an in-person requirement (P-017).
8. **Screening is 30 to 45 minutes, unreimbursed, typed live**, ends in a yes or no and a preliminary diagnosis, and is never sent to a payer. Intake is 2 to 3 hours in person with the CNA by an LMHP-type (P-010, T-071).
9. **Channels match Harvest.** SFax out; Anthem information requests on Availity; UHC portal; decisions arrive by fax or phone; Harvest reads no decisions in portals (T-010, T-011).
10. **Four doors after a partial**, early discharge labelled as Harvest's default practice with its documented gap; appeal initiator shown as unresolved (P-071, T-017).
11. **Continued stay is a read-only evidence packet.** Counts come from stored notes; last 30 days by default; the internal quarterly never enters it (P-106, P-102).
12. **Workload is believable.** About six TDT daily notes per staffer; dismissal 2:30 to 3:00; supervisors spend 2 to 3 hours a week on units (P-085, T-019, T-044).
13. **TDT only.** Outpatient and SEBS records never appear in a TDT request; non-Medicaid goes to the grant route (P-124, P-001).
14. **Nothing invented.** Synthetic data is labelled; analytics are illustrative or case-backed, never "Harvest's export"; no likelihood percentages (T-067, G-075).
15. **No autonomous agents.** No stored credentials, no auto-submit, recording only with consent (P-123, T-060).
16. **Dates cohere.** One demo clock; Oct 31, 2026 is a Saturday; early-discharge and unit run-out dates compute from the same rate (README open questions).
17. **The redesign is a risk, not a date.** July 2027 may slip; 15-minute units are a configurable future rule; Harvest's top ask is certainty (P-116, P-117).
