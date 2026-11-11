# 08 · Unresolved decision register

Deliverable 8 (prompt Part 21, item 8) · Nov 11, 2026 · PsyFlo × Harvest unified demo

Every row is open: no answer has been received from Harvest, DMAS, a payer or counsel. Each row says what the demo does in the meantime, as a configurable setting with a default and a visible label, so nothing is stated as law that is not officially verified. Built from the review set (`review/00` section 6, `review/01` sections 7 and 8, `review/05c`, the three evidence digests) and checked against `seed/extra/rules.json` and the code. The evidence is secondary where it comes from Plaud (no recording could be read) and where it is PsyFlo's retelling of Harvest; I did not review originals. Ids: G-, P-, T-, U- as in `01-evidence-and-conflicts.md`; [O] marks official text read from Drive copies (currency unchecked).

**Who must answer.** Harvest director (the Director of Programs unless a card says operations or executive); clinical lead (senior clinical advisor, clinical director or the SRA-writing LPC, as named); compliance counsel; DMAS/payer (DMAS, the FFS contractor or an MCO); PsyFlo product; engineering. **Categories:** clinical, regulatory, operational, technical. **Demo settings** live in Settings (admin only): People, Roles, Units, Rules, Audit, Family link, Presenter. Every change asks for a reason, is audited and applies from then on. Rule chips read Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption. The Presenter tab lists eleven of these questions; this register covers 35.

## Register

| ID | Question | Who must answer | Category | Demo setting and default | Where in the demo |
|---|---|---|---|---|---|
| UD-001 | Guardian signature: in person or remote, per document | Harvest director; compliance counsel | regulatory | `signature.mode.<doc>` = Remote allowed; chip Policy not validated | Settings, Family link; ParentSign, ParentEnroll, ParentQuarterly, AppealLetter |
| UD-002 | Daily minimum: one hour or two | Harvest director; DMAS/payer | regulatory | `tdt.min_daily_minutes` = 120, off; no minimum shown | Settings, Rules (Service); Track Time |
| UD-003 | Unit bands and the 15-minute redesign (Jul 1, 2027) | DMAS/payer; PsyFlo product | regulatory | `units.tdt.day_tiers` = 120/180/300, Officially verified; redesign rows information only | Settings, Units; Track Time |
| UD-004 | Decision timing and the day-10 follow-up, by payer | DMAS/payer; Harvest director | regulatory | Day N; follow-up day 10 and Overdue after 14, both Harvest-reported; 7 days reference only | Authorizations queue and case; Settings, Rules |
| UD-005 | Additional-information deadline and reply | DMAS/payer | regulatory | `info_request.hours` = 24, payer message wins; 3 business days off | Denial case, Provide requested information |
| UD-006 | Continued-stay lead time | Harvest director; DMAS/payer | operational | `continued_stay.lead_business_days` = 14, Unverified | Authorizations, Renewal due |
| UD-007 | Plan deadline: 24 hours or DMAS 30 days | clinical lead; DMAS/payer | regulatory | `isp.due_hours_harvest` = 24 and `isp.due_days_official` = 30, each with its chip | Settings, Units (no screen reads them) |
| UD-008 | Weekly eligibility re-check, and who verifies | Harvest director (operations); DMAS/payer | operational | `eligibility.recheck_days` = 7, Unverified; a person records every check | Referral, Eligibility panel; My Work |
| UD-009 | Who approves, attests and sends outgoing SRAs | clinical lead; Harvest director | operational | Stage Pending clinical approval; approve and send are designated permissions | Authorization case; Settings, Roles and People |
| UD-010 | Early discharge: DMAS rule or Harvest practice, and the gap | clinical lead; DMAS/payer | regulatory | `early_discharge.min_gap_days` = 30, Unverified; lapse 31 days Official | Authorization case, Transition |
| UD-011 | Who may appeal; provider path; window | Harvest director; compliance counsel; DMAS/payer | regulatory | `appeal.initiators` = guardian; provider path Not verified; window 60, Unverified | Denial case, Appeal; AppealLetter |
| UD-012 | Reconsideration rights and clocks | DMAS/payer | regulatory | `appeal.reconsideration_days` = 30, off; chip Payer rule not verified | Denial case, Reconsideration |
| UD-013 | Screening and intake recording: consent and the BAA | compliance counsel; Harvest director | regulatory | `recording.require_consent_record` = On; Pilot (preview) | Extension, Scribe; Settings, Family link |
| UD-014 | Peer-to-peer recording | compliance counsel; clinical lead | regulatory | `p2p.recording_enabled` = Off; typed notes only | Denial case, peer-to-peer |
| UD-015 | May the extension fill Lauris without a press each time | Harvest director; PsyFlo product | operational | A person presses Fill every time | Extension, every Scribe view |
| UD-016 | Lauris access and what the page bridge may read | Harvest director; engineering | technical | Page bridge to the open page only; no API; no background reads | `extension/bridge.js`; Settings, Presenter |
| UD-017 | Addenda and late entries (not built) | clinical lead; compliance counsel | regulatory | None offered; processed records are write-once | Extension, Scan & Enhance; `enhance.addendum` Future |
| UD-018 | School-counselor update in the daily note | clinical lead; DMAS/payer | clinical | Per update: add to the note credited to the counselor, fill a collateral contact, or leave out | School portal; Extension, Scribe, daily note |
| UD-019 | Incident reports and the state portal | clinical lead; Harvest director | regulatory | `incident.state_portal_hours` = 24, Harvest-reported; Future | Extension, incident view; mock state portal |
| UD-020 | Analytics priority and data | Harvest director; PsyFlo product | operational | Three sections plus Pilot scorecard; `analytics.min_group_size` = 5 | Analytics |
| UD-021 | Pilot site, scope and length | Harvest director; PsyFlo product | operational | No setting; waves labelled PsyFlo proposal; maturity chips | Settings, Presenter, Maturity; deliverable 9 |
| UD-022 | Initial SRA send window, start event, no backdating | Harvest director; DMAS/payer | regulatory | `initial_sra.send_within_days` = 30, start at intake processed; Harvest-reported | Authorizations, Deadline |
| UD-023 | Note due times: daily, weekly, monthly | clinical lead; compliance counsel | regulatory | `notes.daily_due_hours` = 24, label Harvest target | My Work; Analytics scorecard measure 1 |
| UD-024 | Payer channels and packet contents | Harvest director; DMAS/payer | operational | `payers.channels` per payer, Harvest-reported | Authorization case, Submission |
| UD-025 | Payer replies: who, how many peer-to-peer attempts, cover | clinical lead; DMAS/payer | operational | Clinical staff only; one attempt | Denial case |
| UD-026 | Drafting conventions | clinical lead; compliance counsel | clinical | 30-day window, counts not percentages, flag observed | Scribe, ExtSRA, ExtCase checks |
| UD-027 | Household detail in payer-facing drafts | clinical lead; compliance counsel | clinical | Not included unless a person opts in | Continued-stay draft |
| UD-028 | Run-out rate and school calendar | Harvest director; engineering | technical | `units.rate_per_school_day` = 3, projection only | Authorization case, Transition; Partials |
| UD-029 | Family link: keep it, what it asks, expiry | Harvest director; PsyFlo product | operational | Optional; `family_link.expires_days` = 7 | Settings, Family link; FamilyLink |
| UD-030 | Who performs admission screening | Harvest director; clinical lead | operational | Clinicians only | Settings, Roles; ExtScreening |
| UD-031 | Units: read from Lauris or confirm in Psyflo | engineering; Harvest director | technical | Psyflo never writes units; a person enters them in Lauris | Authorization case, Units |
| UD-032 | Trainee-note review | clinical lead; Harvest director | operational | `review.trainee_every_note` = On; per-staff mode | Settings, People; My Work, Review |
| UD-033 | Who may see clinical text | Harvest director; compliance counsel | regulatory | Administrator sees no clinical text; no grant path built | Settings, Roles |
| UD-034 | Mobile capture and extension deployment | Harvest director; engineering | technical | Mobile Simulated; browser speech; no locked-screen promise | MobileApp, MobileDictate |
| UD-035 | Pilot measure baselines, targets and owners | Harvest director; clinical lead; PsyFlo product | operational | Counts and definitions; no targets | Analytics, Pilot scorecard |

## Decisions

### UD-001 · Guardian signature mode, per document

- **Why it matters.** A remote signature that Harvest or a payer does not accept voids the paper. An in-person-only rule removes the main benefit of the family portal.
- **Evidence.** In person: the LPC says the guardian signs every form in front of the clinician and clients 14 and older also consent; the parent signs even pre-filled forms; telehealth intake was withdrawn; remote pre-paperwork was considered and dropped for lack of capacity (P-016, P-023, P-015, P-019). Whether the rule is Medicaid, MCO or Lauris was deferred and never answered (P-017, T-007). Remote: leadership asked for enrollment papers signed before intake and the quarterly signed on a phone, where allowed (P-021, P-022, T-036); both DMAS SRA forms accept an electronic signature for the clinician attestation, a different document [O] (T-074). PsyFlo's own product direction ruled out remote e-signature of the packet (PD #4).
- **Demo meanwhile.** One row per document: consent, release, enrollment, quarterly, appeal. Default Remote allowed with the chip Policy not validated, beside the row's source chip. The server refuses a remote consent when a document is set to in person, and the family screens change.
- **Impact.** In person: screens show what to bring and when; the portal keeps review, confirm and booking; the pilot family link shrinks to pre-fill. Remote: counsel and Harvest confirm identity and audit evidence; the default stays. Mixed: keep the per-document setting. Note the default is the least evidence-aligned option.

### UD-002 · Daily minimum: one hour or two

- **Why it matters.** It decides whether a short day is billable and what staff are told.
- **Evidence.** One hour a day, splittable into 15 to 30 minute pieces: the Director of Programs; the audit repeats it (P-082, T-021). At least two hours a day with at least two therapeutic activities: DMAS Chapter IV and 12VAC30-50-130 [O] (T-070, T-073). Untested hypothesis: one hour is a program minimum and two hours the lowest billable band.
- **Demo meanwhile.** `tdt.min_daily_minutes` = 120 and `tdt.min_activities` = 2, both off; no screen states a minimum; units start at 120 minutes.
- **Impact.** Two hours: switch the rows on and add a below-minimum check in Track Time. One hour is a real billing floor: needs an official source, and the bands change (UD-003). Either way a 90-minute day yields no units under the official bands.

### UD-003 · Unit bands and the 15-minute redesign

- **Why it matters.** Unit arithmetic drives every balance, run-out date and pilot measure that touches units.
- **Evidence.** [O] 12VAC30-80-30: 2 to 2.99 h = 1 unit, 3 to 4.99 h = 2, 5 h or more = 3 (T-068). The same text prints a second schedule (2 to 3 h, 4 to 6.99 h, 7 h or more) under day treatment or partial hospitalization, which looks legacy; check the live code. The LPC recalled two units as two to four hours, hedged (P-065); payers usually award two units a day. Redesign: TDT retires Jun 30, 2027 and 15-minute units start Jul 1 per an unofficial PsyFlo digest (T-078); Harvest does not expect the date to hold and doubts 15-minute units in schools (G-047, T-032, P-116). The Nov 2 demo said 15-minute increments are supported (G-077); the build has no 15-minute rule.
- **Demo meanwhile.** `units.tdt.day_tiers` = 120 to 1, 180 to 2, 300 to 3, rounded down, maximum 3, chip Officially verified. An alternate 60/180/300 set is selectable in Settings, Units, with the label Alternate bands (60-minute rule). `redesign.tdt_end` and `redesign.cpst_start` are information only and never compute a date or unit.
- **Impact.** Legacy schedule live: 7 hours for 3 units would cut awards sharply and the bands change. 15-minute units adopted: a new rule model, forms and note rules; the redesign is an adoption risk, not a date.

### UD-004 · Decision timing and the day-10 follow-up, by payer

- **Why it matters.** It sets when a request shows Overdue and when staff call.
- **Evidence.** Harvest believes 14 days, many payers answer on day 14, some take over a month (P-058, T-012). The call about day 10 confirms receipt; it is not a chase for a decision (P-057). PsyFlo's secondary compilation: 7 calendar days since Jan 1, 2026, 72 hours expedited, extendable; Virginia MCO applicability unconfirmed (T-076). Anthem sometimes answers in 24 hours (P-060).
- **Demo meanwhile.** The queue and case show Day N. `decision.followup_day` = 10 and `decision.overdue_after_days` = 14, both Harvest-reported; `decision.public_standard_days` = 7 is reference only, Unverified; expedited 72 hours is off. The reader supports a per-payer scope, but no per-payer rows exist and `settings.rule` edits existing rows only, so per-payer values need a seed change.
- **Impact.** If 7 days: Overdue and the overdue notice move earlier and a day-10 call falls after the deadline. If 14: nothing changes. Per payer: engineering adds rows.

### UD-005 · Additional-information deadline

- **Why it matters.** A missed reply can cost the decision; only clinical staff may reply.
- **Evidence.** Under 24 hours, mostly Anthem on Availity (P-069, T-015). Outpatient pend response is 3 business days in a PsyFlo compilation citing an appendix not in Drive (T-076). No source says whether a reply restarts the payer clock. The one Payer-specific row rests on Harvest and Anthem practice, not a payer document.
- **Demo meanwhile.** `info_request.hours` = 24; the due time in the payer message wins; the 3-business-day row is off. `decision.restart_on_info_reply` = false: the clock keeps its first send date.
- **Impact.** Payers differ: per-payer rows. 3 business days applies to TDT: the Needs action clock relaxes. Covering-clinician planning follows the window (UD-025).

### UD-006 · Continued-stay lead time

- **Why it matters.** It decides when Renewal due appears and how soon an LPC must start reading notes.
- **Evidence.** MCO continued stays go in 14 business days ahead, payer unnamed (T-076; a workflow-map line saying the same is unsupported, P-109). Harvest reapplies when units run low, about 2.5 months into a three-month window (U-8). Late submissions are not rejected, but untimely days or units are denied (T-076).
- **Demo meanwhile.** `continued_stay.lead_business_days` = 14, Unverified. Renewal due shows when the end date minus the lead has passed, or when units left are inside the lead. `continued_stay.late_policy_text` is display only.
- **Impact.** A different lead shifts Renewal due across the queue and My Work. A units-based trigger changes the basis. Pilot measure 6 is unaffected.

### UD-007 · Plan deadline: 24 hours or 30 days

- **Why it matters.** The hardest clock in the intake week and an input to pilot measure 3.
- **Evidence.** Plan within 24 hours of intake, rest in a week: the LPC, firm and repeated (P-035), source of the rule unstated; the senior clinical advisor was unsure whether it runs from intake or service start (T-008). [O] ISP within 30 calendar days of starting services, reviewed every 90 days (T-070).
- **Demo meanwhile.** Both rows exist with chips (Harvest-reported, Officially verified). They are visible only in Settings, Units, Deadlines and clocks; no working screen counts down either (see `01` 4c-2).
- **Impact.** 24 hours is a licensing or MCO rule: add an ISP countdown to the intake step, owned by the LPC. Internal target only: show it as a Harvest target beside the 30-day rule.

### UD-008 · Eligibility re-check and who verifies

- **Why it matters.** An approval is not proof of enrollment: a payer approved a member three times and still billed back about $10,000 two years later (P-009).
- **Evidence.** No source says who verifies today (P-006). Weekly checks with screenshots are one payer auditor's advice, relayed after that dispute (P-008); Harvest says it is not doing them (T-025); no cadence appears in the Drive documents (T-026). A bulletin summary suggests every visit (unverified).
- **Demo meanwhile.** A person holding `eligibility.run` (clinicians; supervisors and administrators when designated) records the DMAS result with date, person and source. The lookup is a simulated page. Re-check reminder 7 days (`eligibility.recheck_days`, Unverified); check only after the family link (`eligibility.require_family_link`, a design rule).
- **Impact.** Operations verifies: designate that role. Weekly required: keep reminders and the proof log. Not required: switch reminders off. Each visit: daily reminders.

### UD-009 · Who approves, attests and sends outgoing SRAs

- **Why it matters.** One approver is a single point of failure, and the attestation must come from an eligible signer.
- **Evidence.** One person approves every outgoing SRA by email; the clinical director and an assistant cover when she is out (P-046, T-010). The attestation is by an LMHP-type with credentials, NPI on the initial form [O] (T-074). The site supervisor sends (P-039); the program director monitors. Whether the second on-site LPC or the virtual LPC may approve is not stated.
- **Demo meanwhile.** Stage Pending clinical approval. `approve.sra` is designated for supervisors and clinicians and confirmed by a second person; `send.packet` is held by clinicians and designated for supervisors and administrators; `signature.sra.roster` = LMHP-types (Officially verified); owner and backup per case. The Presenter list marks this Decided; the roster is still open.
- **Impact.** Single approver: designate one plus a backup and an escalation. Any LMHP-type: broaden the designation. Supervisor must send: designate supervisors. It shapes the W2 sign-off queue.

### UD-010 · Early discharge: rule or practice

- **Why it matters.** After a partial, the default path is to use the units, discharge and write a new initial; if it is gaming in a payer's eyes the path closes.
- **Evidence.** Harvest default; payers question it; restarting reportedly needs a 30-day gap and a full redo of the 2-hour-plus intake (P-071); no Harvest policy documents it (T-014). [O] A lapse of more than 31 consecutive days requires discharge (T-070). The Nov 2 demo added a monitoring plan and 30 service-free days (G-073).
- **Demo meanwhile.** `early_discharge.min_gap_days` = 30 (Unverified), `early_discharge.require_monitoring_plan` = On (design rule), `discharge.lapse_days` = 31 (Official), `discharge.harvest_gap_days` = 30. Text says Harvest practice. A legacy screen still prints DMAS rule (`01` 4c-3).
- **Impact.** A DMAS rule: enforce the gap and mark it Officially verified. Practice only: label stays. If payers reject it: the option leaves the Partials screen. Dates also depend on UD-028.

### UD-011 · Who may appeal; provider path; window

- **Why it matters.** It decides whether Harvest prepares appeals for guardians only, or may file its own.
- **Evidence.** The LPC understands only the guardian may appeal and Harvest helps (P-075); the Director says Harvest appeals when it believes the child needs the service (P-076); Harvest almost never appeals, one attempt last year with no response (T-017). An earlier demo rule cites a federal text for provider appeals with consent and a 60-day window, not opened by the team; an unofficial digest says provider appeals use the AIMS portal from Nov 5 (T-079).
- **Demo meanwhile.** `appeal.initiators` = guardian; the provider path shows Not verified; `appeal.window_days` = 60 from the notice date, Unverified; the system never exercises an appeal right.
- **Impact.** Guardian only: nothing changes. Provider path added: a consent step, the AIMS filing and a staff role. A different window changes the countdown.

### UD-012 · Reconsideration rights and clocks

- **Why it matters.** A mandatory first step changes the order of options on every denial.
- **Evidence.** PsyFlo's brief: reconsideration within 30 calendar days, required before a DMAS appeal (T-076); the research notes found a DMAS appeal clock after the MCO's last denial and no MCO reconsideration deadline (T-081). Under-21 denials as not medically necessary reportedly need secondary physician review (T-080, unofficial).
- **Demo meanwhile.** `appeal.reconsideration_days` = 30, off; the Reconsideration section shows Payer rule not verified; `appeal.epsdt_note` is display only.
- **Impact.** Mandatory: enable the row and place Reconsideration before Appeal. MCO-specific: per-payer rows. The EPSDT note may move into the evidence checklist.

### UD-013 · Screening and intake recording: consent and the BAA

- **Why it matters.** Recording is the largest privacy exposure and the launch scope is disputed (T-056 against T-057).
- **Evidence.** PsyFlo needs a recording-consent form, a digital-health attorney and a BAA before any recording (P-131). The Director of Programs asked for the BAA and HIPAA documents before any client data (T-049); on Nov 10 the BAA was still open (T-050). PsyFlo bars recording clinic calls in tools without a BAA (T-060). Which AI and speech vendors a BAA covers, retention and regional endpoints are open (T-061). Screenings are not recorded today; typing during the call harms rapport (T-004, P-029).
- **Demo meanwhile.** A consent card records who agreed before recording starts; refusing means typing. `recording.require_consent_record` = On. Chips read Pilot (preview) on ExtScreening and ExtCNA. Speech uses the browser's recognition; data is synthetic.
- **Impact.** Approved: record in wave 2 with a BAA-covered engine. Not approved: typed Scribe with question prompts only.

### UD-014 · Peer-to-peer recording

- **Why it matters.** Both a legal question and a trust question for the payer.
- **Evidence.** Harvest's open question: is it allowed and with whose consent (NEXT-STEPS); no digest holds an answer. The LPC would like a recording as proof in disputes, a wish rather than a request (P-066, P-142).
- **Demo meanwhile.** `p2p.recording_enabled` = Off. Typed call notes are always allowed and stored as notes, never as a transcript. When switched on, every participant's agreement must be recorded.
- **Impact.** Allowed: switch on after counsel and retain transcripts under the BAA. Not allowed: no change.

### UD-015 · Filling Lauris without a press each time

- **Why it matters.** It separates a helper from an unattended writer and sets the human-confirmation story.
- **Evidence.** Open since Nov 8 (NEXT-STEPS); the contract and prompt require human confirmation before processing, signing or sending (Part 9.6). No Harvest answer.
- **Demo meanwhile.** A person presses Fill each time; the bridge types only into the open form, shows typed boxes in yellow, and never presses Process Form, Get Signature or Send.
- **Impact.** Auto-fill allowed: fewer clicks, but a new consent and audit question. Press each time: current design.

### UD-016 · Lauris access and what the page bridge may read

- **Why it matters.** Everything depends on tolerance of form filling on an open page, and PsyFlo has described the connection inconsistently.
- **Evidence.** No API is known and the integrations link goes nowhere (T-027). PsyFlo asked for an API check and no answer appears (G-023). The clinic lead advised an add-on beside Lauris (P-120). A Lauris contact was introduced or requested (P-144). Lauris bills per form (T-027).
- **Demo meanwhile.** The bridge reads and types only on the page a person has open, finds boxes by label, and has no API, no background request and no database access. Wording everywhere: page bridge to the open Lauris page. The mock Lauris is declared Simulated once.
- **Impact.** Lauris objects: the add-on model needs another route. Lauris accepts: record that in writing and the pilot proceeds. Per-form billing may raise Harvest's Lauris bill.

### UD-017 · Addenda and late entries

- **Why it matters.** The build refuses every write to a processed note; Harvest has no policy on corrections that PsyFlo can see.
- **Evidence.** No Harvest request to edit processed notes exists. Retroactive edits were ruled out on audit and claw-back grounds, with the reasoning unvalidated (G-093, G-094). One wrong verb can void a note in audit (P-081); no source says how corrections are handled (P-100); the rejected-notes box exists in Lauris (P-099).
- **Demo meanwhile.** No addendum or late-entry action exists. Mode B reads Psyflo's captured copies only. `enhance.addendum` is registered Future.
- **Impact.** If Harvest and counsel validate a policy: design a separate, attributable, dated and audited flow. Otherwise nothing changes.

### UD-018 · School-counselor update in the daily note

- **Why it matters.** School information in a billed note may cause billing or privacy problems.
- **Evidence.** Open since Nov 8: in the day's daily note credited to the counselor, or as a non-billable contact note (NEXT-STEPS). Teacher check-ins were dropped Nov 7 (`review/01` A24).
- **Demo meanwhile.** The counselor's short update waits in Psyflo. In Scribe the staff member chooses per update: add it to the daily note as per the counselor, fill a collateral contact, or leave it out. Each use is logged. There is no setting.
- **Impact.** Daily note: keep path one. Separate contact: remove the daily-note option. Not allowed: updates stay visible to staff only.

### UD-019 · Incident reports and the state portal

- **Why it matters.** A state filing clock runs in a separate system.
- **Evidence.** Level 2 and 3 incidents go to the state portal within 24 hours; three in three months flags a child (P-141, P-140). One voice; the licensing source is not in Drive. A second compliance system lives in spreadsheets and binders.
- **Demo meanwhile.** `incident.state_portal_hours` = 24, Harvest-reported; a working preview with a mock state portal, registered Future (`compliance.incident`).
- **Impact.** Confirmed: promote to a pilot slice with the clock. Not in scope: stays a preview.

### UD-020 · Analytics priority and data

- **Why it matters.** Harvest asked for analytics on Nov 2 while PsyFlo marked it not a priority (G-049 to G-054 against G-087).
- **Evidence.** Leaders want progress tracking, feedback-informed treatment, cross-student search and licensure tracking. Harvest has never computed its own approval or partial rates (T-045), so any real baseline needs its export.
- **Demo meanwhile.** Pilot scorecard first (Working); Patient Outcomes, Payer Performance and Patient Population are Future; one dataset per view (case-backed or illustrative), never summed; groups under 5 suppressed (`analytics.min_group_size`).
- **Impact.** Higher priority: promote views once real data exists. Lower: scorecard only.

### UD-021 · Pilot site, scope and length

- **Why it matters.** Harvest starts small, and whatever it adopts becomes a written staff expectation (G-045, T-052).
- **Evidence.** No site or staff chosen (T-052). Length is quoted as 8 weeks or 2 to 3 months for other clinics (G-086, G-106). PsyFlo suggested a new school (G-092) and a December start as a brainstorm (G-102). The approver differs by voice (P-132). Launch scope conflicts (T-056, T-057). No commitment yet (G-045); BAA open (T-050).
- **Demo meanwhile.** No setting. Waves W1 and W2 in deliverable 9 are PsyFlo's proposal pending Harvest's choice; chips follow the pilot scope.
- **Impact.** A new school: every note created in the system, cleaner continued stays. An existing school: legacy-note gaps early. Length sets the measurement baseline.

### UD-022 · Initial SRA send window, start event, no backdating

- **Why it matters.** A late send can force a new intake.
- **Evidence.** Within 30 days of intake, payment from the submission date, thirty days without a billable service forces discharge (P-053, P-054). Not in Chapter IV and not in the two regulations read (T-016, U-5). Three possible start points appear in the sources.
- **Demo meanwhile.** `initial_sra.send_within_days` = 30 from `initial_sra.start_event` = intake processed; `initial_sra.start_not_before_submission` = On. All Harvest-reported.
- **Impact.** A different start event moves the Send by date. A different length changes the Deadline column.

### UD-023 · Note due times

- **Why it matters.** It is the denominator of Harvest's top pilot measure.
- **Evidence.** Daily notes within 24 hours is Harvest's KPI and the advisor says Medicaid guidelines (G-049, T-020); no such text in Chapter IV (T-072); no recording gives it (P-089). Weekly contacts at least weekly [O] (T-070).
- **Demo meanwhile.** `notes.daily_due_hours` = 24, label Harvest target; weekly by end of week; monthly at month end; the scorecard reads these.
- **Impact.** A different window moves every on-time count. Absences are not recorded, so a day without a note counts as missed.

### UD-024 · Payer channels and packet contents

- **Why it matters.** Wrong channel means a lost fax.
- **Evidence.** Harvest sends mostly by fax; Anthem uses Availity; UHC has a portal but usually phones; decisions return by fax (P-055, T-010). PsyFlo's brief says FFS is portal-only and Aetna fax-preferred (T-076, T-077). Harvest speakers never named Humana or Aetna. UHC may want the CNA and ISP attached.
- **Demo meanwhile.** `payers.channels` per payer and `packet.uhc.attachments` = CNA, ISP, both Harvest-reported. Send uses a simulated Sfax or a mock portal page.
- **Impact.** A confirmed MCO list replaces the seed; channel changes alter Send.

### UD-025 · Payer replies: who, how many attempts, cover

- **Why it matters.** Under-24-hour replies and one-shot peer-to-peers fall on one LPC.
- **Evidence.** Clinical staff only (P-069, P-070); a covering clinician may never have met the student (P-074). One peer-to-peer per denial, one to two months out.
- **Demo meanwhile.** `info_reply.requires_licensed`, `p2p.requires_licensed` = On; `p2p.attempts` = 1; `payer.reply` is held by clinicians only. A handoff pack is not built.
- **Impact.** Broader staff: change the capability. A handoff pack becomes a wave-2 candidate.

### UD-026 · Drafting conventions

- **Why it matters.** They decide what a draft may say.
- **Evidence.** Insurers want the last 30 days (T-023); auditors look for observed and for boilerplate (T-024, P-097); prior services must carry provider, dates and outcome (P-030, P-050); forms ask frequency, intensity, duration (T-074). Counts-not-percentages and criterion 3 blank when 1 and 2 are met are PsyFlo design rules.
- **Demo meanwhile.** `evidence.current_window_days` = 30; `style.flag_terms` = observed, monitored, watched (flag, never rewrite); `style.counts_not_percentages`; `drafting.blank_criterion3_when_met`; prior-service fields. Missing evidence prints Evidence missing.
- **Impact.** Changes alter checks in Scribe, ExtSRA and ExtCase; staff edits remain the person's own words.

### UD-027 · Household detail in payer-facing drafts

- **Why it matters.** The LPC cannot protect confidentiality and win approval at once (P-052); Harvest asked for a filter (T-040).
- **Evidence.** Anything absent from the chart cannot be asserted; disclosure is the clinician's judgment.
- **Demo meanwhile.** Household context is excluded unless a person opts in for that draft, and only from a stored note that says it.
- **Impact.** Default include or exclude changes the first draft; counsel may set limits by payer.

### UD-028 · Run-out rate and school calendar

- **Why it matters.** Run-out and early-discharge dates depend on units per school day and holidays.
- **Evidence.** None for 3 a day; 150 units is 10 weeks at 3 a day, 15 at 2; the 13 weeks figure has no source (U-16). Payers usually award two units a day (REF).
- **Demo meanwhile.** `units.rate_per_school_day` = 3 for projection only, always shown with its assumption; weeks equivalent derived, never a constant. No holiday calendar.
- **Impact.** A per-student rate and Harvest's school calendar move every projected date.

### UD-029 · Family link: keep it, what it asks, expiry

- **Why it matters.** PsyFlo itself is unsure it is worth keeping (G-024, G-061).
- **Evidence.** Leaders warm, an LPC doubtful (P-021, P-020); usefulness 4.4 of 5 in demo feedback (T-046); many parents use phones (G-048).
- **Demo meanwhile.** Optional; question toggles in Settings, Family link; `family_link.expires_days` = 7, enforced on unsubmitted links; SMS is a stub.
- **Impact.** Dropped: referral and eligibility steps shrink. Kept: confirm questions and expiry.

### UD-030 · Who performs admission screening

- **Why it matters.** The role decides who needs the screening Scribe.
- **Evidence.** The audit says licensed clinicians; the Director says most are site supervisors, who are QMHPs (T-004, T-005). Two on-site LPCs, one virtual (P-013).
- **Demo meanwhile.** Screening and intake views need `drafts.clinical`, held by clinicians; others see a reason.
- **Impact.** If supervisors screen, the capability must be designated to them, with the license-bound items left to clinicians.

### UD-031 · Units: read from Lauris or confirm in Psyflo

- **Why it matters.** Units must match Lauris (P-122).
- **Evidence.** Open question (NEXT-STEPS). Staff key approved units by hand and Lauris draws them down per processed note (T-018).
- **Demo meanwhile.** Psyflo never writes units; an approved decision opens a task to enter them in Lauris, closed only by an observed page event.
- **Impact.** Read: a bridge read of the units box. Confirm: keep the task.

### UD-032 · Trainee-note review

- **Why it matters.** Review is the safeguard for new staff and an input to supervisor workload.
- **Evidence.** Trainee notes must be supervisor-reviewed; others are spot-checked (T-019, P-091); new staff need 3 to 6 months (T-043).
- **Demo meanwhile.** `review.trainee_every_note` = On; each staff member is every-note or spot check in Settings, People; notes wait in My Work, Review.
- **Impact.** The set of people on every-note review changes the review queue size.

### UD-033 · Who may see clinical text

- **Why it matters.** Executives and administrators may or may not see clinical records.
- **Evidence.** Unknown whether executives or administrators have record access (Granola digest 3h).
- **Demo meanwhile.** The administrator sees status, units and aggregates and no clinical text. `review/00` section 3 item 12 describes a logged grant, but `notes.view` is N for administrators in `permissions.js` and nothing can raise it (`01` 4c-9), so no grant path exists today.
- **Impact.** If Harvest wants administrators to read clinical text: add a designated, two-person grant to the matrix and a role projection. Otherwise nothing changes.

### UD-034 · Mobile capture and extension deployment

- **Why it matters.** Deployment speed depends on browsers and who may install an extension across about 22 buildings (T-030).
- **Evidence.** Work iPhones and iPads exist; not everyone has a laptop (T-030); an earlier relay said staff use laptops (G-010); locked-screen recording was requested (P-094). School internet is unreliable.
- **Demo meanwhile.** MobileApp is Simulated; dictation uses the browser's speech; no locked-screen claim; the real Chrome side panel and microphone are untested (`review/test-results/summary.md`).
- **Impact.** iPhone-only staff: mobile becomes the main capture path, with email or Notes as an interim. Locked-screen needs device testing first.

### UD-035 · Pilot measure baselines, targets and owners

- **Why it matters.** Without them the pilot cannot be called a success or a failure.
- **Evidence.** No numeric target comes from Harvest; hypothetical figures such as 97 percent were never data (G-104); no baseline exists (T-009). Harvest's top measure is notes completed in compliance (P-136).
- **Demo meanwhile.** The scorecard shows counts, definitions and limits; no targets; baseline is pilot day 0.
- **Impact.** Targets, owners and a two-week baseline are needed before the first review.

## Rule coverage

Every rule in `seed/extra/rules.json` whose category is Unverified demo assumption (U, 28 rows) or Harvest-reported (H, 25 rows) maps to a decision above; 53 rows in all. The one Payer-specific row (`info_request.hours`) is in UD-005.

| Decision | Rules (category) |
|---|---|
| UD-001 | `signature.mode.consent` (H), `signature.mode.release` (H), `signature.mode.enrollment` (H), `signature.mode.quarterly` (H), `signature.mode.appeal` (U) |
| UD-003 | `units.tdt.alt_tiers` (U), `redesign.tdt_end` (U), `redesign.cpst_start` (U) |
| UD-004 | `decision.followup_day` (H), `decision.overdue_after_days` (H), `decision.public_standard_days` (U), `decision.expedited_hours` (U), `submission.receipt_check_day` (H) |
| UD-005 | `decision.restart_on_info_reply` (U), `info_request.outpatient_business_days` (U) |
| UD-006 | `continued_stay.lead_business_days` (U), `continued_stay.late_policy_text` (U) |
| UD-007 | `isp.due_hours_harvest` (H), `isp.max_age_days` (H) |
| UD-008 | `eligibility.recheck_days` (U), `eligibility.require_family_link` (U) |
| UD-010 | `discharge.harvest_gap_days` (H), `early_discharge.min_gap_days` (U), `early_discharge.require_monitoring_plan` (U) |
| UD-011 | `appeal.window_days` (U), `appeal.start_event` (U), `appeal.initiators` (U) |
| UD-012 | `appeal.reconsideration_days` (U), `appeal.epsdt_note` (U) |
| UD-013 | `recording.require_consent_record` (U) |
| UD-014 | `p2p.recording_enabled` (U) |
| UD-019 | `incident.state_portal_hours` (H) |
| UD-020 | `analytics.min_group_size` (U), `analytics.dataset` (U) |
| UD-022 | `initial_sra.send_within_days` (H), `initial_sra.start_event` (H), `initial_sra.start_not_before_submission` (H) |
| UD-023 | `notes.daily_due_hours` (H), `notes.monthly_collateral_due` (H) |
| UD-024 | `payers.channels` (H), `packet.uhc.attachments` (H) |
| UD-025 | `info_reply.requires_licensed` (H), `p2p.attempts` (H), `p2p.requires_licensed` (H) |
| UD-026 | `evidence.prior_service_required_fields` (H), `evidence.current_window_days` (H), `style.flag_terms` (H), `style.counts_not_percentages` (U), `drafting.blank_criterion3_when_met` (U) |
| UD-028 | `units.rate_per_school_day` (U), `units.weeks_equivalent` (U) |
| UD-029 | `family_link.expires_days` (U) |
| UD-032 | `review.trainee_every_note` (H) |
