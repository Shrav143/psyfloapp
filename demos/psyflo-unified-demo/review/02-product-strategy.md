# Product strategy and prioritization (Agent B)

Prepared 11 Nov 2026 for the PsyFlo x Harvest unified demo. Companion file: `02b-roadmap-evidence-register.md` (all 130 inventory items with tier, evidence and code status). Staff appear by role only.

**Evidence and its limits.** Ids are G- (Granola digest), P- (Plaud digest), T-/U- (team-workspace digest), and "PD #n" (`docs/product-direction.md`). The Plaud connector returned no recordings, so **every P- id is secondary**: PsyFlo's own written record of what Harvest said. I mark a claim with † when it rests on P- evidence alone. The Granola digest has Harvest speaking for itself in only one meeting (2 Nov; G-045 to G-059). The closest-to-primary sources are the Drive transcripts of the 4 Nov clinical-advisor session and the 5 Nov program-director session (T digest, S-19). No Harvest tracker, claims or payer data has been seen (T digest, gap 10). I read both codebases; I did not run the app.

## Headline findings

1. **The pilot's value chain is short**: notes, then note-timeliness visibility, then one tracker with receipts. Harvest's top measure is "completing notes in compliance" (P-136†, G-049). Everything else is sequenced behind proof (PD phase rules; T-058).
2. **The Nov 8 "can wait" list collides with that measure.** It defers the staff dashboard, review queue and analytics (T-056), yet the pilot KPI needs a note-timeliness slice of exactly those. Recommendation in sections c and h.
3. **Screening and intake recording is contested**: a launch must-have on Nov 8 (T-056) but "spring, consent-gated" on Nov 7 (T-057), with the BAA, recording consent and counsel still open on Nov 10 (T-049, T-050, T-060). I tier it UNRESOLVED.
4. **The demo states things as Harvest's or as law that are not.** Seeded analytics and staff figures are labeled "Harvest's Lauris export" although Harvest has never computed those rates (U-14, T-045, T-067). Hard-coded rules appear as fact (section j).
5. **The largest value-versus-code gap is continued-stay evidence**: Harvest's most enthusiastic reaction (P-114†) sits on a draft built from three sample notes and static counts.
6. **Roles do not match the evidence at two points.** Most admission screenings are done by site supervisors (QMHPs), not LPCs (T-005), but the demo gates screening to clinicians. Site supervisors do most unit and authorization tracking (T-044, P-072), but the demo hides Authorizations from them.
7. **A 12-13 minute story works as two continuous students plus one decision case** (section i). Everything else lives in Explore.

## a. Jobs to be done, ranked

Rank = evidence strength x frequency x fit with the pilot window. Harvest's own words are paraphrased.

| # | Job | Who, how often | Evidence | Demo today |
|---|---|---|---|---|
| 1 | After a session, get an accurate note into Lauris that a payer and auditor will accept, without translating "what I did" into clinical language | Direct support (QMHP); up to about 6 TDT students plus 4 others (P-085); daily | P-087, P-088, P-092, T-034; T-043 (62% call daily notes the biggest paperwork item; about 40% of the day on paperwork); T-046 (4.6 of 5, top-rated) | Strong, rule-based |
| 2 | See who is behind and what bounced, and coach without surveillance | Site supervisors, clinical advisor; daily to weekly | P-091, P-099, P-134†, T-038; T-043 (14 of 25 hear back on a note only when something is wrong) | Seeded counts plus live Process Form events |
| 3 | Build the continued-stay request from 60+ notes without re-reading them | LPC; each authorization cycle | P-106, T-023, P-114† ("incredible"); T-046 (4.3) | Seeded, thin |
| 4 | Know where every request stands, what is due, who owns it | Site supervisors (2-3 h a week, T-044), program director, LPC; daily | P-059, P-111, P-112, T-018; T-044 (4 of 6 supervisors learn of low units with under a week's notice) | Strong |
| 5 | Answer partials, information requests and peer-to-peers inside their clocks | LPC; bench of two (T-014); most SRAs come back partial (P-063); per decision | P-069, P-070, P-126†, T-014; T-046 (4.3) | Good |
| 6 | Get a new student from referral to a defensible initial SRA without retyping | LPC and site supervisors; per new student (screening 30-45 min unpaid; intake 2-3 h; about 9-10 h before the first request, T-009) | P-010, P-036, P-044, T-005 | Strong chain |
| 7 | Prove to a payer or auditor that what was billed happened | Director of Programs, leadership; audits every 3-4 months, up to about 20 clients (P-079) | P-066, P-080, P-081, T-024 | Weak (timer log only) |
| 8 | Protect families' sensitive detail and still win approval | LPC; every SRA | P-052† (strongest unprompted statement of the visit), T-040; T-046 (3.9) | Toggle on seeded text |
| 9 | Get schools and families to supply what blocks the chain | Site supervisors, school counselors, guardians; per referral | P-003, P-018, P-021†, T-002, G-048 | Broad; signature rule unresolved |
| 10 | See across schools and programs: progress, funder numbers, outcomes | Executive director, clinical advisor; monthly to annual | G-049 to G-054, P-104†; T-045 (leadership least sure of audit losses, units and partial rates) | Illustrative only |
| 11 | Stay compliant: incidents, credentials, QI evidence | Clinic lead; one voice, about 20 minutes (P-140†) | G-054; deprioritized by PsyFlo (G-087) | Mostly dropped |

Not a product job but an adoption risk: "know whether TDT continues" (P-117, G-047).

## b. Urgent operational value versus interesting future functionality

| Rank | Capability | Why this rank | Evidence |
|---|---|---|---|
| **Urgent** | | | |
| 1 | Note capture, checkable draft, fill the open Lauris form, a person processes | Highest volume, smallest blast radius, the need Harvest named first | P-087, P-092, T-034, T-046 |
| 2 | Note-timeliness view (own day; supervisor backlog) | It is the pilot's headline measure and staff want to "know myself" | P-134†, P-136†, P-091, G-049 |
| 3 | One authorization tracker with clocks, history, owner | No system of record today; three layers of sheets and an email chain | P-059, P-112, T-018, T-044 |
| 4 | Human-pressed Send with a stored receipt | Fax is the main channel; faxes go astray (P-055, P-057) | P-057, T-010 |
| 5 | Info-request reply, partial doors, peer-to-peer brief | Best-received screens; clinical time is the scarcest resource | P-126†, P-069, P-070 |
| 6 | Trust layer: source chips, edit everything, clinician signs | Three people raised accuracy; 16 of 26 worry about it | P-128, P-123, T-046 |
| 7 | Baseline kit: survey, one-week time baseline, examples-of-badness set | Without it no claim can be tested | T-042 to T-045, P-129, T-051 |
| 8 | Continued-stay evidence index (read-only) | Delight is high, but legacy notes make early packets "choppy" (G-092), so wave 2 | P-114†, P-113, G-090, G-092 |
| **Interesting, later** | | | |
| 9 | Parent-portal depth (progress, surveys, quarterly signature) | Leadership likes it; remote-signature rule unresolved; one LPC skeptical | P-020, P-021†, T-007 |
| 10 | Staff performance, incentives, goal-neglect alerts | Wanted, but only after note completion holds (P-135†) | P-134†, P-138 |
| 11 | Outcomes analytics (FIT, PHQ trends), stakeholder reports | Needs real data Harvest has not shared | G-049, G-100, T-045 |
| 12 | Compliance line (incidents, QI, credentials) | One voice; Nov 8 "can wait" | P-140†, G-087 |
| 13 | Payer playbook, denial-logic analysis, negotiation log | Internal ideas; numbers are illustrative | G-076, U-14 |
| 14 | Voice agents, data agent, predicted success, auto-submit | No Harvest ask; conflict with human gates | G-037, G-075, T-055 |
| 15 | Redesign readiness (CANS, 15-minute units) | Rules and date uncertain | T-032, G-047 |
| 16 | EHR for new providers, camera | One voice; ruled out | P-121, P-142 |

## c. Pilot scope versus full vision

**Proposed pilot scope** (my recommendation; the lead must confirm).
- **W1, Feb 1 launch (training mid-February):** note capture and Mode A review (daily, weekly guardian, monthly collateral); Track Time as support; a note-timeliness slice; referrals; the authorization tracker with human-pressed Send and receipts; the six pilot measures.
- **W2, later in the pilot window:** screening and intake Scribe (consent-gated), initial SRA drafting and sign-off, continued-stay evidence (Mode B), information-request reply, partial doors, peer-to-peer brief, family link, supervisor review queue.
- **Outside the pilot:** everything else.

Pilot length and terms are inconsistent across sources (8 weeks, 2-3 months; G-086, G-106). Harvest chooses one site and one or two staff, and whatever it adopts becomes a written staff expectation (G-045, T-052), so the scope should stay small.

### The four-level maturity model

Part 4.5 lists four levels. They mix two questions: how real is the demo, and will the pilot include it? A feature can work in the demo and still be outside the pilot (the parent-portal progress view does). **The rule: the label states the claim PsyFlo makes to Harvest, and pilot scope always overrides demo fidelity.** Apply in order:

1. Not in pilot scope: **Future**, even if it clicks.
2. Blocked by a rule, consent, decision or contradictory Harvest evidence: no tier chip; show a source chip instead (Officially verified / Payer-specific / Harvest-reported / Unverified, per Part 4.6). The register calls these UNRESOLVED.
3. In pilot scope and the demo plays an external system, a language model or an unverified rule: **Simulated**.
4. In pilot scope and it runs end to end with nothing external faked: **Working**.
5. In pilot scope but only a static preview or not built: **Pilot (preview)**.

| Register token | Chip text | Tooltip (presenter details) |
|---|---|---|
| WORKING-IN-DEMO | Working | Runs end to end in this demo on demo data; in pilot scope |
| SIMULATED | Simulated | The demo plays Sfax, SMS, DMAS, a payer, speech or a language model, or a rule not yet verified |
| PILOT | Pilot (preview) | Proposed for the pilot; not working yet |
| FUTURE | Future | Vision; not part of the pilot, even where it works |

**Visibility.** Client-facing screens carry a chip only for Simulated, Pilot (preview) and Future; Working is unmarked. The presenter drawer ("How the data gets in") lists all four for every section. The mock Lauris is declared simulated once, globally, rather than on every extension feature. Tier (maturity) and verification (rule provenance) are separate axes and must not share one chip.

### Capability areas

| Area | Tier | Harvest asked? | Conflict with Nov 7-8 launch priorities |
|---|---|---|---|
| Daily, weekly, monthly note capture and Mode A review | Simulated (W1) | Yes, volunteered: P-087, P-092, T-034 | Dates differ: roadmap has notes on Feb 15 (T-057), launch is "ready Feb 1" (T-056). Drafting is rule-based, no model |
| Track Time and unit conversion | Working (W1) | Clinic lead yes (P-127†); staff rate it lowest (T-046, 3.4) | The documentation-time KPI is not Track Time; unit rule must be configurable (master hard-codes 60 minutes; T-068 says 2 hours) |
| Screening and intake recording | Unresolved | Typing hurts rapport (P-029); consent needs counsel (P-131) | Nov 8 must-have vs Nov 7 spring vs BAA open (T-056, T-057, T-050) |
| Referrals (school form, missing-info flags, grant route) | Working (W1) | Yes: T-002, G-059 | None; but who screens is unclear (T-005) |
| Family link, eligibility record, parent signing | Simulated / Unresolved | Leadership warm (P-021†); LPC cautious (P-020†); T-046 4.4 | Nov 8 keeps "signing" in launch; roadmap puts portal late March (T-057); signature rule open (T-007) |
| Initial SRA draft, sign-off, Send, receipt | Simulated (W1 send, W2 draft) | Yes: P-044; T-010 | Roadmap: packet and tracker Feb 8 (T-057); Sfax API unverified (G-070) |
| Authorization tracker, clocks, history | Working (W1) | Yes: P-112, P-059 | Clock rules unverified (U-6); keep configurable |
| Continued-stay evidence (Mode B) | Simulated (W2) | Yes: P-114†, P-113 | Later by PsyFlo's own plan (G-092) |
| Payer decisions: info request, partials, peer-to-peer | Working / Simulated (W2) | Yes: P-069, P-070, P-126† | None |
| Appeals and early discharge | Unresolved | Mixed: P-075 vs P-076; "why not" (P-077) | Who may appeal, early-discharge practice undocumented (U-4, U-12) |
| Note timeliness, supervisor backlog, review queue | Working (W1 slice, W2 queue) | Yes: P-091, P-134†, P-136† | **Nov 8 "can wait" contradicts Harvest's top KPI** |
| Analytics: outcomes, payer, population | Future (pilot scorecard only) | Yes: G-049 to G-054 | Nov 7 "not a priority" is PsyFlo's decision, not Harvest's (G-087, G-088) |
| Mobile staff experience | Simulated (W1) | Yes, via PD only: P-094†, T-035. Granola holds no such ask because the 4 Nov session is not in Granola; G-010 relays laptops for the EHR | No locked-screen recording is implemented; do not promise it |
| Family portal beyond signing | Future | Yes: P-022† | Nov 8 "can wait" |
| School portal beyond referral | Future | "Might be cool": P-137 | Teacher portal dropped Nov 7 |
| Compliance line | Future | One voice: P-140† | Nov 8 "can wait" |
| Agents, voice agents, predictions | Future | No | Contradicts human gates (Part 4.2) |

## d. What drives adoption, and what serves leadership or payers

| Audience | Features that win them | Evidence |
|---|---|---|
| **Direct support (must love)** | Dictate or type, get a checkable draft, fill Lauris with no copy-paste; help on quiet days; the "why" behind an intervention; zero extra logins; seeing their own completion | P-087, P-088, P-090, P-093, P-134†; T-046 (24 of 26 want to edit everything); register C-3 (no new logins) |
| **Supervisors (must love)** | Who is behind, what bounced, units low; trainee-note review | P-088, P-091, T-044 |
| **Clinicians (must love)** | Continued-stay evidence, peer-to-peer brief, 24-hour reply, one tracker, no re-reading 60 notes | P-106, P-112, P-126†; T-046 (4.3 each) |
| **Leadership (satisfied by)** | Note-compliance rate, payer and outcome analytics, grant pulls, stakeholder reports, time-tracker audit trail | P-136†, G-049, G-053, P-127 |
| **Payers and auditors (satisfied by)** | Source-cited statements, dated evidence, timer logs, eligibility proof, signature records | P-081, P-066, T-024, P-008 |

Two cautions. The timer is the lowest-rated feature among Harvest staff (T-046, 3.4) though the clinic lead called it essential for audit defense (P-127†, T-048): treat it as an audit asset, not the hero. Harvest's own survey flags AI accuracy (16 of 26), privacy (7) and impersonality (7) as concerns (T-046), so the trust layer is an adoption feature, not a compliance footnote. Part-4 survey ratings were partly placeholders (T-047); T-046 is the separate, later form.

## e. Screens that belong in Explore only

The main path (section i) needs about 15 of the master's 46 screens: MobileApp, MobileDictate, ExtDPN, ExtCase, Authorizations (with Submission), Referral, FamilyLink (20 seconds), ExtScreening, ExtSRA, ExtSignOff, Partials, PeerBrief, Analytics, one StaffDashboard slice. The rest:

| Group | Move to Explore | Why |
|---|---|---|
| Presenter and admin | WhereThingsLive, Users | Presenter or settings, not daily work (Part 6) |
| Payer depth | PayerPlaybook, EarlyDischarge, InfoRequest, AppealLetter | Reached from a denial case; Nov 7 deprioritized playbook (G-087); early discharge and appeals are unresolved (U-4, U-12) |
| Family portal depth | ParentEnroll, ParentProgress, ParentQuarterly, ParentLetters, ParentSchedule, ParentSurvey, ParentSign | A single guardian journey is enough; Nov 8 "can wait" |
| Extension depth | ExtWeekly, ExtMonthly, ExtIncident, ExtQuarterly, ExtDischarge, ExtISP, ExtCNA | Same pattern as ExtDPN; incidents and quarterlies are outside the pilot |
| Supervisor depth | ReviewQueue, full StaffDashboard | Show the timeliness slice only |
| Mobile depth | MobileAssess | Assessments are not a pilot job |
| v3 | FLO data agent, voice agent, cohort analytics detail, ask-a-question box, Settings and roles matrix, Lauris admin pages (60-62, 73-74), Help | No Harvest ask, conflicts with Part 9.6, or illustrative data |

Keep v3's authorization queue and case shell, Denial Intelligence workspace, provenance labels, unit-rule model, and the cohort's minimum-group-size rule (5) as ported patterns, not screens.

## f. Personas

| Persona | Goals | Frustrations | Top 3 screens |
|---|---|---|---|
| **Direct support (QMHP-C or trainee)** | Finish notes before dismissal (about 2:30-3:00, T-019); stay out of trouble in audits | Translation gap, dread, backlog spiral (P-087, P-088); "observed" can void a note (P-081); learns of problems from the rejected box (P-099, T-043) | MobileApp or MobileDictate; ExtDPN; own-day status |
| **Supervisor (site supervisor, QMHP)** | Catch up behind staff; track units; send packets; run enrollment paperwork | 2-3 h a week on units (T-044); fax-inbox watching (P-059); nobody pays for catch-up time (P-088) | ReviewQueue; StaffDashboard; Authorizations (read) |
| **Clinician (LPC, assistant clinical support supervisor)** | Defensible SRAs, fast; protect the family's detail; approve every outgoing SRA | Hand-built Google Doc (P-106); under 24 hours to reply (P-069); peer-to-peer weeks out (P-070); "hands in seven thousand boxes" (PD) | Do next; ExtSRA or ExtCase; Authorizations and Partials |
| **Administrator (program director; leadership)** | Know where work stalls; defend audits; grants; know TDT continues | Audits on paper (P-079); no calculated partial rate (T-045); staff turnover (T-045, 4.7) | Authorizations; Analytics; Users |
| **Guardian** | Sign and understand without a computer; get the child to intake | Phones only, many grandparents (P-020†); misread payer letters (P-073); transport failures (P-018) | Parent portal home; documents; plain-language letters |
| **School counselor** | Refer once; know the status; see that interventions link to functioning | Google Form to a static sheet (G-059, T-002); parent consent first (P-003); privacy limits | ReferralForm; SchoolPortal status; ReferralSent |

## g. Outcomes and measurable success criteria

Psyflo can only see what the extension observes at Save, Process Form, Reject and Sign, what a person records in Psyflo, and what Harvest exports (no Lauris API). Three constraints apply to every measure: about 52 active TDT students (T-003) and a one-site start (T-052) mean small denominators, so report counts ("17 of 20") with percentages secondary and apply minimum-group-size rules (Part 12.6); no numeric target comes from Harvest unless stated; and figures like "97% on time" were hypothetical (G-104) and must not appear.

### Pilot measures

| Measure | Numerator | Denominator | Data source | Reads it | Baseline and target |
|---|---|---|---|---|---|
| **1. Notes completed in the agreed window** | Required notes (daily, weekly guardian contact, monthly collateral) with a Process Form event at or before the due time | Required notes due in the period: scheduled service days per assigned student, minus recorded absences (daily); weeks (weekly); months per collateral partner (monthly) | Extension-observed Process Form events; timer end time, else a dismissal time (master assumes 3:30 pm, staff say about 2:30-3:00, T-019); an absence flag (item 64, not built) | Supervisors, clinical advisor, admin; staff see their own | Harvest's "number one thing" (P-136†). Window is a setting: Harvest says daily notes within 24 h (G-049, T-020), but DMAS Chapter IV shows no 24-hour rule (T-072, U-3). No target on tape: agree one after a two-week baseline |
| **2. Time spent preparing documentation** | (a) Median and 75th-percentile elapsed minutes from first Psyflo capture or draft event for a form to its Process Form; (b) self-reported weekly paperwork hours | (a) Processed notes by type; (b) pilot respondents, pre vs post | (a) Psyflo events (a proxy: the bridge sees Save, Process Form, Reject, Sign and Create, not "form opened"); (b) the staff survey instrument (S-09); a one-week observed baseline per pilot staffer (P-130) | Harvest leadership; staff see their own | Baseline: about 40% of the day on paperwork; 10 of 26 spend 11+ hours a week (T-043). Harvest expects about 50 min a day saved (P-129†); PsyFlo's "30 to 3 minutes" is untested |
| **3. Completed intake to review-ready SRA** | Elapsed hours from the CNA Process Form to the SRA reaching "awaiting signature" (Process Form pressed, ready for approval); also report intake-to-ISP and ISP-to-SRA separately | New initial SRAs in the period | Observed Process Form events on CNA, ISP, SRA; waiting states (guardian, signature) logged separately | Clinical lead, admin | Baseline: 3.5-4 h before the SRA, about 6 more h of paperwork (P-044, P-036); elapsed days unknown. "Halve it" is a PsyFlo proposal (PD). Cases per month unknown (T-009), so report each case |
| **4. Missing documentation items caught before processing** | Flagged items (failed drafting checks, blank required boxes, "evidence missing" markers) resolved or knowingly waived with a reason before Process Form | Forms processed (items per 100 forms, by type and check-set version); also resolved / flagged | Panel "Checked before you process" results; cross-check with Lauris Rejected-box counts from Harvest's export | Supervisors, clinical advisor | No baseline. PD proposes zero flagged non-billable verbs reaching Process Form and a near-zero "made-up" rate from Harvest reviewers; both are PsyFlo proposals. Adding a check raises the count, so version the check set |
| **5. Authorization submissions with receipts recorded** | Send events with a stored receipt (Sfax delivery receipt, portal confirmation number, or a logged receipt-call outcome) | All Send events by a person in the period | Psyflo events and proofs | Clinical lead, program director | PD target: zero unlogged submissions. Blind to anything sent outside Psyflo; report that gap. The day-10 call confirms receipt (P-057), not a decision |
| **6. Unresolved payer requests** | Snapshot count of requests awaiting a Harvest action or outcome record: info requested, partial not yet decided, peer-to-peer requested or awaiting outcome, denied with no action, no reply past the configured decision window; plus age and count past clock | Open requests (shown beside the count) | Psyflo request store; initial in-flight requests keyed in by hand (import not built) | Clinical lead (owner), program director | No system of record today (P-059, T-018); baseline = count at pilot day 0. No target |

Two non-headline gates belong beside these: the **draft rejection rate** (share of draft statements staff mark "that didn't happen" or reject) with a near-zero goal (PD phase 0), and **week-4 continued use** by pilot staff (PD). The pre- and post-launch staff survey on admin time and satisfaction is a pilot deliverable (P-136†, T-041).

### Long-term measures (not pilot gates)

| Measure | Why it waits |
|---|---|
| Units awarded vs requested by payer; partial rate; decision days | Psyflo cannot control decisions; Harvest never computed them (T-045); approval rate is explicitly not a pilot KPI (NEXT-STEPS) |
| Appeal attempts and outcomes; early-discharge resubmissions; unpaid hours | Practices undocumented (U-4, U-12); needs months of data |
| Audit findings and voided notes | Detail is under NDA (T-024) |
| Staff turnover and retention | Leadership's top worry (T-045) but slow-moving |
| Intake no-show rate; signatures complete before intake | Needs the family portal and a settled signature rule (P-021†) |
| Client outcomes (PHQ, GAD, FIT trends) | Needs real data; do not infer causation from intervention exposure (Part 12.1) |
| Clinician time freed for care; units approved for students who need them | Harvest's two stated pilot goals (G-058); measurable only with a baseline |

## h. Recommended information architecture

| Surface | Recommendation |
|---|---|
| Management platform | **Authorizations, Denial Intelligence, Analytics.** The evidence supports the jobs (tracking, payer decisions, leadership data), not the structure: Harvest has not yet seen a three-tab platform (first walkthrough 12 Nov, G-110), and a 1 Nov decision was two tabs (G-039). Treat 12 Nov as the first test |
| My Work | A role-composed home, outside the three tabs, with sections rather than sidebar items. Supervisor: review plus backlog. Clinician: do next, drafts, information requests. Admin: needs-action across work. Referrals is a **section** with its own detail route |
| Extension | Scribe, Track Time, Scan & Enhance. SRA and continued stay are **document types inside Scan & Enhance** (as v3 does), not a fourth button. Track Time stays visually secondary (T-046) |
| Mobile | My Students, Current Activity, Say What Happened, Review, Ready in Lauris. Start with the interim email or Notes route (item 102) |
| Family and school portals | Entered from Login cards and the presenter menu, never from the staff sidebar |
| Settings and Users | Footer menu for admin |

**Where I disagree with Part 6 and Part 12:**

1. **Referrals workspace.** The three-tab platform has no home for it. Make it a My Work section, keep the route names, and do not import v3's redirect that removes it (Part 6 already forbids this).
2. **Pilot measures have no home in Part 12.** Measures 1, 2 and 4 are documentation measures, not Patient Outcomes, Payer Performance or Patient Population. Add a **Pilot scorecard band** at the top of Analytics (not a fourth section), mirrored in My Work for supervisors.
3. **StaffDashboard and ReviewQueue to "My Work".** Agree, but for supervisors they are the landing screen, not buried items (P-091, P-134†).
4. **Supervisor access.** Site supervisors do most tracking (T-044) yet cannot open Authorizations in the master (`min: 3`). Give supervisors a site-scoped read view.
5. **Screening role.** Most screenings are done by QMHP site supervisors (T-005); do not gate screening Scribe to LPCs without Harvest confirming.
6. **EarlyDischarge to "care transition".** Agree as one option inside a partial decision, labeled "Harvest-reported practice, unverified" (P-071, U-4); keep the route for deep links.
7. **PayerPlaybook.** Keep it contextual only (denial case, Payer Performance); its numbers are illustrative and Nov 7 deprioritized it (G-087).
8. **"The four doors" in the staff sidebar** (`app.js`) puts guardian and school journeys in clinicians' daily navigation; Part 11 says not to.

## i. Recommended presentation story (12-13 minutes)

Audience: Harvest leadership (ten decision-makers at the 4 Nov demo, P-021†), the clinical advisor who approves phases (P-135†), and the Director of Programs, who has said she will test PsyFlo's AI-output position (T-049). The 12 Nov walkthrough is the first time Harvest sees the simplified design (G-110).

| Time | Act | Screens | Message | Evidence |
|---|---|---|---|---|
| 0:00-1:00 | Frame | One slide: the chain; the four chips; three promises (a person reviews, signs and sends; Lauris stays the record; every sentence has a source) | We answer the accuracy concern first | P-128, P-123, T-046 |
| 1:00-4:00 | **M.R. daily note** | MobileDictate, ExtDPN (original, proposed, sources, checks), Process Form, own-day status | Less friction, judgment stays | P-087, T-046 |
| 4:00-6:30 | **M.R. continued stay** | ExtCase (Mode B), Authorizations case | The notes you just wrote become evidence; nothing invented | P-114†, P-106 |
| 6:30-9:00 | **T.W. new student** | Referral, FamilyLink (20 s, Simulated), ExtScreening, ExtSRA with source chips, sign in Lauris, Send (Simulated), receipt | Capture once, reuse | P-044, T-010 |
| 9:00-11:00 | **D.W. partial decision** | Authorizations, open in Denial Intelligence, options, peer-to-peer brief, record outcome, return to the updated row | Continuity when a payer pushes back | P-126†, P-063 |
| 11:00-12:30 | **Leadership and pilot** | Analytics pilot scorecard, one payer click-through, export; pilot slide with chips | What is pilot, simulated, later | P-136†, G-058 |
| 12:30-13:00 | Ask | One site, one or two staff, baseline week, BAA | A small, measurable start | T-052, G-102 |

**Changes from the prompt's order:** continued stay follows the daily note, because it is the same student and shows "notes become evidence." **Cut to Explore:** eligibility detail, parent signing, appeals, info-request, early discharge, incidents, quarterly, review queue, playbook, FIT and population analytics.

## j. Risks to the pilot narrative

| Risk | Evidence | Mitigation in the demo |
|---|---|---|
| Seeded figures labeled "Harvest's Lauris export" (analytics baseline, staff averages, payer rates) | U-14, T-045, T-067; `Analytics.js`, `StaffDashboard.js` | Relabel "Illustrative" (Part 12.6); never show beside Harvest's name |
| Hard-coded rules shown as fact: 60-minute unit (T-068 says 120), receipt call day 5 for one payer (Harvest: about day 10), "7 days", 24-hour clocks, 30-day limit, weekly eligibility, "only a guardian can appeal" | U-1, U-4 to U-9, U-12; `dates.js`, `core.js`, `ParentLetters.js` | Configurable rules with a source chip (Part 4.6) |
| Remote guardian signing with no in-person caveat | P-016, P-017, T-007 | Signature-mode setting; no claim of legal equivalence (Part 4.3) |
| Screening and intake recording presented as launch-ready | T-049, T-050, T-056, T-057, T-060 | Consent gate, Unresolved chip, BAA first |
| Promising locked-screen mobile recording | P-094†, G-010 | State only what is tested; start with email or Notes |
| Autonomy language: "auto-submit", agents, voice agents | G-037, G-069, T-055 | Future card only; never in the main path |
| Time-saved and accuracy claims ("30 to 3 minutes", "97%", "90% accurate") | P-129, G-104, G-084 | Show the baseline plan instead of a number |
| "Integrated with Lauris" wording | G-085, P-120 | Say "works on the open page"; no integration claim (Part 9.6) |
| Rule-based drafting presented as AI quality | README (no model called); T-061 | Label drafting Simulated; real model needs a BAA-covered path |
| UI-only permissions | `/api/state` returns all data | Say "role views", not "access control" |
| Scope creep from 130 items and "100 ideas" | T-041, T-058 | Register plus phase gates |
| A manual back-end enhancement service kept quiet | G-029, T-062 | Disclose it if offered |
| Seed claims counsel reviewed recording consent | `seed/extra/staff.json`; P-131, G-107 | Remove or fix before the library screen returns |
| v3 cohort includes IOP and PHP patients | P-124 | Keep cohort Explore-only and labeled |

## Decisions I most want the lead to confirm

1. **The pilot-scope waves and the claim-based tier rule**, including screening and intake recording as Unresolved and continued-stay evidence as W2.
2. **A Pilot scorecard band in Analytics** using the six definitions in section g, and relabelling every seeded "Harvest's Lauris export" figure as illustrative.
3. **Configurable, source-labeled rules** in place of the hard-coded ones in section j, starting with the 60-minute unit rule and the remote-signature caveat.
