# Prior-Authorization Competitive Landscape: Behavioral Health and Medicaid-Heavy Clinics

**Prepared for:** Psyflo product and go-to-market
**Date:** 2026-09-19
**Scope:** Vendors that solve some part of eligibility verification, the prior-authorization (PA) lifecycle, denials, or appeals. Pure voice-AI intake and patient-engagement vendors appear once in the "adjacent" list and are otherwise excluded.
**Evidence basis:** the 58-vendor competitor table, five vendor decks, five recorded demo calls, four call summaries, and 19 product screenshots (13 CombineHealth, 6 HealOS/Arrow). Every claim names its source with a tag defined in Section 8 (for example `[CH-demo]`, `[HO-shots]`, `[Table]`).

**On the demo calls.** The Psyflo researcher spoke as a clinic operator ("Ravi" of "Harbor Reach Care", a Medicaid day-treatment program in Sullivan County and East Harlem). What that persona said describes the target customer's problem; it is cited as `[persona]` and never attributed to a vendor. What vendors showed and said is the evidence.

---

## 1. Executive summary

1. **Three overlapping waves.** Infrastructure that payers own or that wraps 270/271 transactions (Availity, clearinghouses, Nirvana, Sohar); horizontal "AI RCM agent" companies that grew out of coding, claim-status calls, or denials and are now adding PA (CombineHealth, HealOS, LunaBill, Heron, Aegis, Neon, Tennr); and a crowded multi-specialty PA-platform layer (Humata, Infinx, Myndshft, Rhyme, Notable, EasyPA, Flow, CoOrdio, QuickIntell, Davner, Praxigen, Artificer). Behind these sit at least fifteen behavioral-health-native entrants (Lucida, Oprox, Flexbone, XY.ai, Ember, Adentris, CriteriaIQ, Athon, Supa, Linear, Ritten, RevAxis, SCALE ShieldAI, Ceven, mdhub) `[Table]`.

2. **The gap Psyflo targets was confirmed on every demo call.** None of the seven demoed vendors showed a standing authorization ledger (units approved versus consumed, effective and expiration dates, renewal triggers, partial-approval states) or a payer-behavior history. CombineHealth has no PA product yet (expected "within the next month") `[CH-email]`; HealOS offered a booking-time overutilization flag built for physical therapy and chiropractic `[HO-demo]`; LunaBill's head of RCM took unit tracking and renewal triggers back to the CEO and CTO `[LB-demo]`; Aegis's CEO called the clinic profile a weak fit `[AE-demo]`.

3. **Submission is becoming a commodity; approval and visibility are not.** HealOS runs portal RPA across 490 pre-seeded payer portals, configured in plain English in about 30 minutes, at $0.75 to $1.00 per PA `[HO-deck]` `[HO-demo]`. Neon submits PAs through portals "in minutes" `[NE-demo]`. Psyflo should own what to submit, when to renew, and whether the clinic is delivering care it will be paid for, not the typing.

4. **Fact 1: CombineHealth is the most complete demoed product and the most expensive.** Six named agents, a rolling seven-day eligibility run that crawls the EHR in the browser, an appeals workflow with a six-step timeline and visible reasoning steps, an IVR-navigating voice agent, and a payer-by-denial-reason heatmap `[CH-shots]` `[CH-demo]`. Priced at $9,000 per month fixed for 2,500 visits, or $1 to $1.25 per eligibility check, $4 to $5 per appeal, $3 to $3.50 per call plus $1,500 platform fee `[CH-email]`. No PA agent, nothing for units or renewals `[CH-demo]`.

5. **Fact 2: HealOS/Arrow has the best explainable-agent UI and the lowest unit prices.** Each claim shows "22 sources · 1 run", a check-results summary, plain-language findings, a scheduled recheck with a cooldown date, and inline questions for a human `[HO-shots]`. Pricing is $0.75 to $1.00 per PA, $0.15 per eligibility check, and 2% of recovered denied AR `[HO-demo]`. The tool is configured per practice after signup, so much rests on vendor claims `[Table]`.

6. **Fact 3: the behavioral-health-native cohort already describes Psyflo's feature list.** Lucida (documentation-gap detection, continued-stay narratives, P2P packets, Sunwave and Availity integration), Oprox ("Prior Authorization Intelligence for Behavioral Health", approval probability), Flexbone (visit-cap tracking with reauthorization before the cap), XY.ai (renewal before windows close), CriteriaIQ (authorization probability with dimension-level explanation), and Athon (Sunwave and Availity connectors) are the true competitive set. All are undemoed and rated High or Medium-High threat `[Table]`.

7. **Fact 4: the unit ledger is proven in adjacent verticals but never fused with approval intelligence.** VGPM, ABA Matrix, StrataEMR, and AveeCare decrement authorized units as sessions are documented, block scheduling when units are exhausted, and raise renewal tasks `[Table]`. Ritten does this inside a behavioral-health EHR but is "less advanced publicly on approval prediction and appeal intelligence" `[Table]`.

8. **Fact 5: eligibility depth for behavioral health is available as infrastructure.** Sohar reports up to 95% accuracy on copay, coinsurance, and deductible, a 93% pickup rate for carve-outs, TPAs, and MCOs such as Carelon and Magellan, a 5-second average response, and references at Talkiatry, Rula, and Mindful Health Solutions `[SO-deck]`. Psyflo should partner for 270/271 depth, not build it.

9. **Pricing anchors are established.** Eligibility from $0.15 (HealOS) to $1.25 (CombineHealth) per check; PA $0.75 to $1.00 (HealOS); appeals $4 to $5 and payer calls $3 to $3.50 (CombineHealth); platform fee $1,500 per month (CombineHealth); contingency of 2% (HealOS) to 4% (Heron) of recovered revenue; about $14.99 per patient per month (Heron platform); enterprise minimums of $25,000 (Mend) `[CH-email]` `[HO-demo]` `[HB-sum]` `[TN-sum]`. The target persona currently spends about $2,000 per month on Claude credits plus offshore contractors at $12 per hour and two full-time PA staff `[persona]`.

10. **Recommended position:** an authorization intelligence and ledger layer for Medicaid behavioral-health programs, with a clinician sign-off gate, payer-by-program rules, renewal triggers, partial-approval and P2P states, and payer scorecards; submission and eligibility through partners. Two risks: well-funded multi-specialty players moving down-market (Humata's 2026 independent-practice product, Infinx, Tennr's $160M Series C) and behavioral-health natives that already integrate with Sunwave `[Table]` `[TN-sum]`.

---

## 2. Market map by layer

Each entry gives what the vendor does; coverage across Eligibility (E), Prior auth (PA), Denials (D), Appeals (A); evidence; pricing if known; threat; and what to borrow.

### 2(a) Infrastructure and incumbents

**Availity** (payer portal and clearinghouse). Eligibility lookups, claims, and PA submission; used by four of five Kentucky Medicaid MCOs. Per-payer manual lookups, no mental-health benefit detail (carve-outs, daily limits, session counts), no exception reporting, overwrites history `[Table]`. E ✓, PA submission only. Pricing not captured. Threat: Low (a rail). Borrow: nothing; CombineHealth's Adam and Lucida both drive it as a channel `[CH-deck]` `[Table]`.

**Clearinghouses and eligibility APIs (Change Healthcare, Trizetto, Waystar, Stedi, Optum, pVerify, Experian, Zoll).** Sohar's comparison prices insurance-discovery calls at $0.60 (Sohar), $0.75 (Stedi, Zoll), $0.80 (Nirvana), $0.85 (Waystar), $1.00 (Trizetto), $1.20 (pVerify), with piloted hit rates from 20% (Trizetto) to 60% (pVerify) and p95 latency from 12 seconds (Sohar) to 120 seconds (Optum) `[SO-deck]`. Heron requires a clearinghouse and sits between it and the EHR `[HB-sum]`. E ✓. Threat: Low.

**Nirvana** (eligibility API embedded in Valant and Sunwave). Instant active/inactive plus deductible from an EHR button; returns "verified" only, no carve-out or benefit detail, not all payers, no re-verification cadence `[Table]`; $0.80 per discovery call and 40% reported hit rate per Sohar `[SO-deck]`. E partial. Threat: Medium, because its limits define the eligibility gap the target clinic feels today.

**Sohar Health** (verification, discovery, network-status, cost-estimate APIs). Section 3.5. E ✓ deep; PA, D, A ✗. $0.60 per discovery call; verification not priced; transactional `[SO-deck]`. Threat: Low as competitor, High as partner. Borrow: carve-out detection, a network-status rules engine that "removes the Excel spreadsheet", human fallback for checks automation cannot finish.

**Behavioral-health EHRs: Sunwave, Valant, mdhub, Ritten.** The target clinic runs Sunwave (CRM plus EHR, Nirvana eligibility, claims) and previously Valant; Sunwave "just has a button where it shows there's a prior-authorization requirement, green and red" with no units, trends, or history `[persona]`. mdhub is an AI-native behavioral-health EHR listing intake, eligibility, PA, documentation, coding, claims, and denials; undemoed `[Table]`. Ritten is in 2(d). Threat: Medium (an EHR can absorb a ledger field).

**Policy data: Policy Reporter and MMIT.** Policy Reporter offers a covered-lives dashboard (about 23 relevant commercial payers across NY, NJ, PA; about 26 with Medicare plus three Medicaid programs), roughly 5,000 documents across behavioral health, payment, preventive services, and PA, and archived policy versions when payers remove old ones (a Cigna May change denied a February authorization) `[PR-sum]`. Neon uses Policy Reporter and MMIT APIs for PA requirements and passes the cost through `[NE-demo]`. Partner. Borrow: policy versions with effective dates as a first-class object.

### 2(b) Horizontal AI RCM agents

**CombineHealth** (autonomous mid-cycle RCM; practices, RCM firms, health systems). Section 3.1. E ✓, PA ✗ (in development), D ✓, A ✓. $9,000 per month fixed for 2,500 visits, or per-unit plus $1,500 platform fee `[CH-email]`. Threat: High `[Table]`. Borrow: appeal case timeline, reasoning-step cards, plain-language eligibility action lines, payer-by-reason heatmap.

**HealOS AI / Arrow** (AI scribe plus RCM agents; small clinics). Section 3.2. E ✓, PA ✓ (submission and polling), D ✓, A ✓. $0.75 to $1.00 per PA, $0.15 per eligibility check, 2% of recovered denied AR `[HO-demo]`. Threat: Medium-High `[Table]`. Borrow: sources-checked count, questions-to-human, scheduled recheck with cooldown, status buckets as tiles.

**LunaBill** (AI voice AR follow-up; hospitals, RCM firms). Section 3.3. E partial (bundled), PA partial (upload-and-submit via portal logins), D ✓ (status plus recommended action), A partial. Pricing undisclosed; 10-account single-payer pilot offered `[LB-demo]`. Threat: Medium `[Table]`. Borrow: "what we did, what we found, recommended action" summary beside the full transcript.

**Heron Billing** (AI billing platform; small clinics). Section 3.7. E ✓ (recurring scheduled), PA listed, D ✓, A ✓. 4% of recovered revenue plus $1,000 to $1,500 setup; about $14.99 per patient per month for platforms `[HB-sum]`. Threat: Medium-High `[Table]`. Borrow: eligibility schedules adjustable per payer policy.

**Aegis Health** (AI denials and appeals; hospitals, DME, some outpatient). Section 3.6. Post-adjudication only: D ✓, A ✓. Pricing undisclosed. Threat: Low `[Table]`. Borrow: recurring-denial root-cause analytics, underpayment recovery against contracts.

**Neon Health** (AI agents plus RPA; patient services). Section 3.4. E partial (RPA on the EHR button), PA ✓ (portal submission and status checks), D ✗, A ✗. Usage-based, GPU-provisioned, targeting 30% to 70% savings `[NE-demo]`. Threat: Medium `[Table]`. Borrow: plan-by-program rule tuples and the accuracy flywheel.

**Tennr** (patient orchestration; enterprise). Section 3.8. E ✓, PA ✓, D outcome reported. Enterprise volume pricing; not for small practices `[TN-sum]` `[Table]`. Threat: Low now. Borrow: the CHE Behavioral Health outcome framing.

**Cair Health** (agentic RCM for billing companies and specialty EHRs): eligibility through appeals, EOB extraction, payer calls; demo scheduled, no evidence yet `[Table]`. **Nanonets Health** (front-to-back RCM agents for behavioral health): intake through remittance including PA; undemoed; one of the few horizontal vendors naming behavioral health `[Table]`. **RapidClaims** (autonomous coding and denials, health systems; demo scheduled) and **Amperos Health** (AI denials and collections, specialty groups) are post-submission and hospital-scale `[Table]`. **Taiga** sells a billing service whose PA tooling is not standalone software; the call was cancelled on 9/18 once confirmed `[Table]`. **SuperDial** is payer-call automation for RCM firms and MSO/DSOs, a call rail like Infinitus `[Table]`. Threat for all: unrated.

### 2(c) Multi-specialty PA platforms

**Humata Health** (AI PA continuum; enterprise). PolicyMatch evaluates clinical documentation against payer criteria before submission; approval-risk scoring; submission; auth status; post-auth monitoring; EHR integration. In 2026 launched an independent-practice product returning a real-time documentation and denial-risk score `[Table]`. PA ✓ end-to-end. Threat: High. Borrow: pre-submission risk score.

**Infinx** (AI PA agents). Patient Access Plus separates PA determination, initiation, and follow-up agents; flags denial and peer-review risk, documentation gaps, and payer-specific clinical requirements; continuous follow-up; EHR write-back; dashboards `[Table]`. Threat: High. Borrow: an explicit "risk of peer review" flag.

**Myndshft** (PA automation). Requirement determination, continuously updated payer rules library, submission, status monitoring, ML adapting to payer responses; medical and pharmacy benefits `[Table]`. Threat: Medium.

**Rhyme** (payer-provider PA network; large health systems). Millions of authorizations; shared payer-provider dashboard; end-to-end process observation; less focus on appeals or document generation `[Table]`. Threat: Medium.

**Notable** (AI agents for authorizations; health systems). Portal automation, documentation selection, EHR write-back, aggregate PA dashboard; "more automation-focused than authorization-intelligence focused" `[Table]`. Threat: Medium.

**EasyPA** (AI PA and appeals engine). Payer-specific packet generation, approval-likelihood score, central status tracking, appeals engine with deadline tracking and payer analytics of where approvals are won and lost; "very close to the PsyFlo thesis"; demo scheduled `[Table]`. Threat: Medium-High. Borrow: won/lost-by-payer analytics.

**Flow** (AI PA automation; behavioral health listed). Detects whether PA is needed, creates payer-ready packets, continuous monitoring, appeals using payer-specific evidence and previous approval data `[Table]`. Threat: Medium-High. Borrow: appeals that cite prior approvals.

**CoOrdio Confirm** (AI PA with approval prediction). Assembles documentation, monitors payer workflows, identifies gaps, routes denials to appeals, predicts approval likelihood `[Table]`. Threat: Medium-High.

**QuickIntell** (AI PA lifecycle). Validates units and service dates; distinguishes approved, partially approved, and denied; routes to appeals or P2P; renewal calendar; writes approved units and effective dates back to the EHR; "one of the closest feature-by-feature matches" `[Table]`. Threat: High. Borrow: tri-state approval status, renewal calendar, unit write-back.

**Davner** (managed PA layer): checks criteria, reviews documentation, submits via the right channel, follows up and appeals until approval; demo scheduled `[Table]`. Threat: Medium. **Praxigen** (source-grounded PA workspace, early stage): PA and criteria lookup, clinical-note checker, case queue, appeals, pre-claim checks, analytics; demo scheduled `[Table]`. Threat: Medium. Borrow: source-grounded citations. **Artificer Health** (pilot-stage end-to-end PA dashboard): extraction, submission, rules, tracking, appeals, analytics `[Table]`. Threat: Medium.

**ParaHealth** (full PA lifecycle with proactive reauthorization; medication-PA positioning). Appeal states, P2P, denial outcomes, payer performance, reauths prefilled with updated clinical data and policy changes before expiration; "excellent functional comparable" `[Table]`. Threat: Medium-High. Borrow: reauth prefilled with updated clinicals and policy diffs.

### 2(d) Behavioral-health-specific authorization and revenue-integrity players

**Lucida** (authorization defense service plus software; PHP, IOP, residential, detox, SUD). PA, eligibility, payer-specific concurrent-review workflows, continued-stay narratives, P2P packet building, documentation-gap detection, appeals, denial reconsideration, Availity and Sunwave integration; scores appeal opportunities, tracks deadlines; "one of the closest conceptual matches" `[Table]`. E, PA, D, A ✓. Threat: High. Borrow: notes read against payer criteria before review.

**Oprox** (behavioral-health PA intelligence; VC-backed). Cross-references EHR data with payer-specific medical-necessity criteria and historical approval outcomes, surfaces gaps, approval probability, denials, appeals, concurrent review; demo scheduled `[Table]`. Threat: High. Borrow: historical outcomes as a probability input.

**Flexbone AI** (PA with visit-cap renewal tracking; behavioral health and rehab). Tracks authorized visits against completed visits, triggers reauthorization before the cap, pulls new clinical evidence, routes to MBHOs, handles denials and appeals, EHR write-back; "frames behavioral PA as renewal driven" `[Table]`. Threat: High. Borrow: cap-minus-completed as the trigger.

**Adentris** (behavioral-health revenue integrity). Extracts ASAM level, treatment plan, and medical necessity from the EHR; payer-ready UR summaries; submits via portal, fax, and phone; tracks concurrent review and P2P windows; one queue across channels; coding QA `[Table]`. Threat: Medium-High. Borrow: one queue across portal, fax, phone.

**XY.ai** (behavioral-health agentic PA). Tracks expirations, collects documentation proactively, submits renewals before windows close, monitors payer responses, drafts medical-necessity appeals `[Table]`. Threat: Medium-High.

**Ritten** (behavioral-health EHR with native authorization tracking). Authorizations by payer and CPT, remaining units and expiration, alerts before depletion, outpatient through residential structures; weaker on approval prediction and appeals `[Table]`. Threat: Medium. Borrow: authorization keyed by payer times CPT with level-of-care structures.

**Athon AI** (behavioral-health AI operations). Authorization-expiry watch, concurrent-review windows, Sunwave and Availity connectors, denial intelligence, census and cash analytics; "overlaps directly with Harbor's existing technology" `[Table]`. Threat: Medium-High.

**Supa** (behavioral-health operations agents; IOP, PHP, MAT, SUD). PA, expiration and session-limit tracking, concurrent-review cadence, denial-pattern detection, payer authorization rules, eligibility, coding, claims `[Table]`. Threat: Medium-High.

**CriteriaIQ** (medical-necessity intelligence). Initial and concurrent authorization documentation; ASAM, MCG, InterQual, LOCUS; authorization probability with dimension-level explanation `[Table]`. Threat: High. Borrow: dimension-level explanation.

**Ember AI** (IOP, PHP, residential, addiction): obtains authorizations, creates clinical documentation, monitors continued-stay deadlines, manages appeal lifecycles `[Table]`. Threat: Medium-High. **Linear Health** (behavioral-health groups): psychiatric intake and PA automation, more intake than ledger `[Table]`. Threat: Medium-High. **RevAxis / Margo**: drafts authorization packets, detects expiration before service `[Table]`. Threat: Medium. **Ceven** (PT and behavioral health): visit-count tracking, expiration alerts, reauth drafting with clinical justification, plan-of-care deadlines `[Table]`. Threat: Medium.

**SCALE ShieldAI** (PA unit management; broader market, separate SCALE behavioral-health practice). Monitors approved units and date ranges so care does not exceed the authorization, expiring-unit alerts, auth status, appeals on adverse determinations; "one of the few competitors publicly describing exactly the Harbor issue" `[Table]`. Threat: High. Borrow: units and dates as the product spine.

### 2(e) Unit-ledger analogs from ABA, therapy, and home care

**VGPM** (ABA practice management): authorized versus remaining units, expiration, utilization percent, renewal alerts, scheduling blocked when exhausted, payer-specific rule storage; "almost a perfect analog for Harbor's unit ledger" `[Table]`. Threat: Medium-High. Borrow: utilization percent, scheduling block, payer rules in the same object. **ABA Matrix**: real-time decrement as sessions occur, expiration alerts, scheduling block; not SMI or TRP `[Table]`. Threat: Medium. **StrataEMR** (PT, OT, SLP, ABA): units per patient per CPT, auto-decrement when session notes complete, reauthorization tasks before units run out `[Table]`. Threat: Medium. Borrow: note completion as the decrement event. **AveeCare** (home care, Medicaid): service type, units, effective dates, used versus remaining, renewal reminders, flags on visits that would exceed authorization `[Table]`. Threat: Medium. Borrow: the pre-visit "would exceed authorization" flag. **Silna Health** (ABA PA automation): expiration reminders, guided submission, payer follow-up, payer-specific documentation rules, document validation before submission; more completeness than decision support `[Table]`. Threat: Medium. **Ceven** also fits here (2(d)).

### 2(f) Appeals point solutions

**JustAppeals**: first-level, second-level, and external-review appeals plus P2P support from clinical records; downstream only `[Table]`. Threat: Medium. Borrow: external review as a lifecycle state. **Intelliga Health** (early stage): denials into customized appeal letters; the kind of point tool the persona said she does not want to stitch together with five others `[Table]`. Threat: Low. **Infinitus** (payer-call agents, including psychiatry): calls payers for PA requirements, auth status, and appeal status and returns structured results; "very relevant to the where-is-this-appeal problem" `[Table]`. Threat: Medium. Borrow: structured call results on the case, not a transcript dump.

### Adjacent (excluded from the core map)

**Kouper Health** (eClinicalWorks voice agent, $14 to $18 per AI-hour, no behavioral-health customers) `[KO-sum]`; **Mend** ($25,000 minimum, call-volume qualified) `[TN-sum]` `[Table]`; **Sonic AI / Bonsai** (behavioral-health intake voice agent; demo scheduled), **Simbie AI** (clinical voice agent), **Collectly** (patient billing and cost estimation), and **Alvee Health** (SDOH billing agents; Sullivan County starting to work with them) `[Table]` `[TN-sum]`.

---

## 3. Deep dives on the demoed products

### 3.1 CombineHealth

**Company.** Three years old, San Francisco, started by solving a coding problem for an industry veteran and expanded to practices, RCM companies, and health systems `[CH-demo]`. Managing directors Sourabh Agrawal and Shikha Mohanty; advisor Caral Edelberg `[CH-deck]`. Claims 99.2% model accuracy, real-time policy tracking across 100-plus payers, 50-plus payer portals, SOC 2 and HIPAA, US-only data, and scale from 10 actions a day to 10,000 an hour; reported outcomes of 9% higher collections, 35% lower costs, 40% fewer AR days, 12% fewer denials `[CH-deck]`.

**Agent roster** `[CH-deck]` `[CH-shots]`. **Mark** (biller and eligibility): navigates 50-plus portals, applies payer-specific SOPs, enters charges, reads ERAs and scanned paper EOBs. **Amy** (coder): codes from notes, scrubs claims, queries providers. **Penny** (knowledge assistant, "Policy Review"): a supporting agent other agents call for payer policy; "I don't think there is any solution where we offer it directly" `[CH-demo]`. **Adam** (A/R follow-up): portal and aggregator status checks, AI payer calls through IVR trees and hold time, customizable scripts, voicemail and inbound, priority rules by age, dollar value, payer. **Rachel** (appeals): validates the denial from the ERA, drafts payer-specific letters with citations, pulls coding rationale from Amy and policy from Penny, learns the organization's writing style, monitors filing deadlines and escalation tiers. **Taylor** (analyst): chat over 50-plus metrics, monthly executive reports. The navigation also shows **CaseCraft** and **Ask Max**, not demoed `[CH-shots]`.

**Eligibility, as demoed.** Because Sunwave is a web application, the agents "crawl across the website and take all action necessary" with no provider button-pressing `[CH-demo]`. The run executes seven days ahead on a rolling window so appointments added inside the window are verified the next day; the window is configurable `[CH-demo]`. The table has four columns: patient name (blue link), date, a status pill, and a plain-language note `[CH-shots]`. Status pills: green "Verification Completed", green "Verification Completed; Collect Upfront", red "Inactive", amber "Action Required". Notes include "No deductible applies; collect the $15 PCP copay", "Both primary and secondary insurance policies are inactive. Obtain updated insurance information from the patient and rerun eligibility before the visit", "Obtain a PCP referral before a specialist visit. Do not bill without referral", "Secondary insurance is inactive and should not be billed", and "Confirm whether the patient has a commercial Aetna plan or a Medicare Advantage D-SNP, then verify network status and visit cost share before the appointment" `[CH-shots]`. "We don't stop at the dump. We put an intelligence layer over it and tell you only the stuff that needs action" `[CH-demo]`. Custom checks exist (an annual-wellness-visit check for an internal-medicine client) `[CH-demo]`. The pricing sheet says eligibility covers "authorization requirements and payer-specific coverage rules" `[CH-email]`, but no PA-requirement determination was shown.

**Appeals, as demoed.** The Appeals list (dated September 17, 2026) shows Claim ID, DOS, patient, payer, Status ("Human review required"), Priority (High or Medium), Procedures (CPT list), and Reason/Remark (CARC plus RARC) `[CH-shots]`. A case opens with a persistent header strip ("Patient: Bond, James | Claim ID | Payer: Blue Cross Blue Shield NJ | DOS | Provider | Balance: $196.04 | Status: human review required") and three panes `[CH-shots]`:

1. **Left, a six-step timeline** with green filled dots for completed and hollow dots for pending: Denial Received & Categorised; Denial Validity Check; Draft Appeal Letter / Cover Letter Creation; Draft Appeal Packet Review; Submission; Follow-up Scheduled ("Adam takes up from here and will follow up").
2. **Center, a document viewer** with tabs "1. ERA", "2. CMS-1500 Claim Form", "3. Medical Record (MR Note)", later "1. Cover Letter, 2. Appeal Letter, 3. CMS1500, 4. Denial EOB, 5. MR Note".
3. **Right, structured findings.** At step one: Denial Summary (billed $196.04, allowed $0, paid $0, "PR-50, non-covered services because it is not deemed a medical necessity"), a Denial Category pill, and the RARC (N383, "Not covered when deemed cosmetic"). At the validity step, a stack of **Reasoning Steps** cards: "Denial reason review" (line-level adjustments per CPT), "Primary denial prioritization" ("the denial on CPT 11200 resulted in zero payment and is the primary denial requiring appeal review"), "Clinical documentation review" (quotes the note with "This procedure was medically necessary" highlighted), "Policy criteria comparison" ("Based on BCBS NJ Billing Guidelines, Policy #008, removal of benign lesions is considered medically necessary ... when associated with pain, tenderness, bleeding..."), and "Root cause assessment".

The cover-letter step is an editable form (To Address, From, Date, Subject, Notes/Message) with a "Generate Documents" button; "people know certain nuances which will help you get the appeal approved," so edits are kept and fed back into training `[CH-demo]` `[CH-shots]`. The packet-review step shows removable document chips, "+ Add Document", the payer's mailing address and fax number, and two actions, "Submit on Payer Portal" and "Download Appeal Packet"; the right pane separates standard documents (cover letter, appeal letter, CMS-1500, EOB/ERA) from claim-specific ones with one-line rationales (MR Note "required as primary supporting evidence"; BCBS NJ Billing Guidelines "required to provide the applicable payer coverage criteria") `[CH-shots]`. The submission step embeds a screenshot of the payer portal's messaging form with attachments uploading and a green "Submission Complete, screenshot available in main view" `[CH-shots]`.

**A/R follow-up and voice agent.** The AR Followup list shows Case ID, patient, a Status dropdown (Completed or "Need Human Review"), payer, Days in AR, and Notes such as "Waiting for approval to send provider notes to the payor for appealing the E/M charge denial" `[CH-shots]`. The claim detail has a dated timeline (Patient seen by the provider; Claim Submitted by billing team; Claim Processing by Aetna; Follow Up via Phone Call; Reprocessing Status Check) and a right pane "Follow-up by Adam" with avatar, a purpose line ("Adam from provider office called Aetna to investigate the denial reason and request reprocessing"), an audio player (3:24), and the full transcript starting with the IVR text `[CH-shots]`. Adam calls only when the portal shows no change for about two weeks; the rep played Adam pressing IVR buttons and then discussing a Medicare-rate payment with a live agent `[CH-demo]`.

**Analytics.** A donut of denial categories (Bundling 20%, Missing Documents 19%, Non-Covered 10%, Timely Filing 10%, Patient Eligibility 10%, Provider Credentialing 9%, COB 8%, Authorization/Pre-cert 6%), a bar chart by payer class, and a "Payor Denial Count Heatmap" with a Chart/Table toggle, rows by denial category and columns by payer (Medicare, Medicaid, VA, BCBS, UHC, Aetna, Cigna, Others) `[CH-shots]`. The rep described a consultative layer where their experts analyze payer behavior and write rules into the agents, and offered to encode the clinic's comorbidity coding strategy (diagnosis A yields 30 units, comorbid diagnosis B yields 60) as a rule `[CH-demo]`.

**Prior authorization.** "Right now in our product pipeline ... I don't have anything to show you for that" `[CH-demo]`; the email says "in development ... ready to show you within the next month" `[CH-email]`. Nothing for units, renewals, or partial approvals.

**Pricing and implementation.** Variable: $1 to $1.25 per eligibility check, $3 to $3.50 per call, $4 to $5 per appealed denial, Taylor included, $1,500 monthly platform fee. Fixed: $9,000 per month for up to 2,500 visits `[CH-email]`. On the call: $400 eligibility (400 checks) plus about $5,000 appeals (1,250 denials at $4) plus calls on roughly 20% of appeals, "all of that combined becomes $9,000 per month" `[CH-demo]`. Staged go-live: A/R in about 2 weeks, eligibility in about 4 (PMS integration, configuration, validation), appeals in about 6 (note ingestion, configuration to client rules) `[CH-deck]` `[CH-email]`.

### 3.2 HealOS AI / Arrow

**Company.** Founder and CEO Kaushik Tiwari (Thiel Fellow, Y Combinator, Columbia; Better Financial, Truedime, GlucoIQ; Attack Capital). Claims 31 practices, 490 payer portals, 9 EHR integrations, 12,400 PAs per month across partners in Q1 2026, and benchmarks across 40 partners of 14 hours per week of PA work per mid-size practice, 73% of denials overturned on appeal, 32% of PAs pended for missing information, and 1 in 6 approved authorizations denied on first pass `[HO-deck]`. The application is **Arrow** (app.arrowhq.com); the demo tenant was "M&D Billing Practice", shown by RCM operations head Bhupinder with account executive Prakhyat `[HO-shots]` `[HO-demo]`. HealOS also sells an AI scribe and receptionist `[HO-demo]`.

**PA module, per the deck.** Five capabilities: Portal Automation (browser RPA that logs in, navigates, fills forms with EHR data, and submits; plain-English workflows, 490-plus pre-seeded portals, 30-minute setup, reusable), EHR Integration (CPT, ICD-10, demographics, clinical context), Appeal Wizard (one-click appeal with letter generation), AI Phone (payers without portals), and Status Polling (re-runs until a decision) `[HO-deck]`. Staff time per request falls from about 95 minutes to about 3 `[HO-deck]`. The queue mock has search, "All Statuses" and "All Payers" filters, "+ New Request", and one card per request with ID, patient, DOB, payer, CPT, and a status-specific second line: PENDED ("Ref #: AUTH..., Expected: Feb 13"), APPROVED ("Auth #: AET789456, Valid: Jan 28 to Apr 28"), DENIED ("Not medically necessary per policy"), IN PROGRESS ("Polling payer portal...") `[HO-deck]`. Portal automation is five steps: Set up (plain English becomes a visual, conditional, editable, reusable node graph), Log in (Credentials Vault; sessions persist), Navigate, Submit (captures the reference number), Re-run (polls until decision, writes back) `[HO-deck]`. A runs slide shows Day 1 "Submitted", Day 2 "Pended", Day 5 "Approved"; the outcome writes a status banner, auth number, validity dates, and coverage summary to the EHR `[HO-deck]`. Resolution mix: 62% approved, 26% pended (AI uploads requested documents and resubmits), 12% denied (reason captured, one-click appeal) `[HO-deck]`. A "Coastal Care Health" testimonial claims 92% fewer PA staff hours, 4x successful appeals, $28,000 monthly recovered `[HO-deck]`. The proposed next step is to run one real open authorization live on a 30-minute call `[HO-deck]`.

**Claims workflow, live product.** The dashboard has a date range, "Ingested service dates", KPI tiles (Collections, Collection Rate, AR Outstanding $1.94M, Days in AR 366, Denial Rate) each with "No change from last year", and a cumulative "AR Outstanding & Collections Trends" chart `[HO-shots]`. Navigation: Inbox, Insights, Dashboard Studio, My Dashboards, Ask Arrow; Workspace: Dashboard (Overview, Accounts Receivable, Payment Integrity, Denials, Providers), Insurance Verification, Authorizations & Referrals, Encounters, Coding, Claims (51), Queues (51) `[HO-shots]`. The Claims page has a Board/List toggle and six status tiles that act as filters, each with dollar value, claim count, and a proportional bar: All, Submitted, No Response, Needs resolution, Resolved, Closed without collection; columns are Patient, Patient ID, Payer verdict ("Awaiting payer verdict" pill), Current work ("Waiting on payer"), Service Date, Amount, with Add claims, Export, Edit columns `[HO-shots]`.

A claim detail is two panes. Left: name, status pill, priority ("High" or "Medium Priority"), "Current work: Waiting on payer", Balance (Primary), Date of Service, Patient ID, Biller (Unassigned), Aging Days, EHR Status ("Awaiting Payer Response"), "Last fetched from EHR" timestamp, Tags, a Charges table (CPT, Diagnosis, Billed, Adjustment), and an Insurance panel ("Not Verified"; payer, subscriber, plan, member ID, Prior auth, Effective, Termination, Eligibility verified, "View eligibility details") `[HO-shots]`. Right, the **Arrow** pane: "Analyzed 5d ago", Re-check, play, refresh; a run header ("1m elapsed, Claim information review, ERA remittance review · 17 steps"); "CHECK RESULTS, Claim status and underpayment need a look, 7 checks"; first-person findings ("No adjudication is available for CPT 93971, and the clearinghouse cannot retrieve this payer's status", "I found no adjudication, remittance, usable activity event, or supporting document on file", "The next step is awaiting LA Care's response"); collapsible sub-runs ("Claim Status Check (3 steps)", "Denial Analysis (1 step)"); a scheduled card ("Waiting for payer response, Checks again Sep 25, 2026", tagged "Scheduled", with "Open"); a DETAILS block (Waiting on, Next check, Last checked, "Cooldown: Next recheck available Sep 19"); a provenance chip ("22 sources · 1 run", "32 sources · 1 run"); a **Question 1/2** card ("What provider license number should LA Care use to verify the rendering provider for this claim?") with an answer box and Previous/Next; and a chat input ("Ask a follow-up question...") `[HO-shots]`. On the call the workup was described as checking "39 sources, 40 sources" (biller notes, payment-posting analysis, "26 information modules", ERA, AR, clearinghouse), with a call summary read aloud: "LA Care's IVR found no claim and the 180-day filing deadline from March expired. Representative Rachel could not complete verification because the provider address did not match and the license number was unavailable" `[HO-demo]`.

**Behavioral health and units.** Sunwave integration was confirmed; the scribe pulls dates of service, diagnosis, and procedure codes from notes to draft claims, returned for human review before submission at first `[HO-demo]`. On overutilization: "when any patient with the overutilization of the limits will appear in the appointment, the system will have a note on that," with an optional "don't book this patient" alert and cash-pay routing; the reference cases are a physical therapist and a chiropractor `[HO-demo]`. No ledger, payer history, or renewal trigger. The tool is "specifically prepared for your practice" over one to two weeks while HealOS's human RCM team works the AR backlog in parallel `[HO-demo]`.

**Pricing.** $0.75 to $1.00 per PA; $0.15 per eligibility check; 2% of amounts recovered on denied claims; a lump-sum option (about $400-plus per month at 20 PAs per day over 22 days) `[HO-demo]`.

### 3.3 LunaBill

Vanessa, head of RCM (29 years of operations, joined in August), demoed; CEO Suhail and CTO David were absent `[LB-demo]`. LunaBill built agents for the most time-consuming RCM work, claim follow-up calls with "10 minutes to upwards of an hour just on hold," then added eligibility, PA, and some payment posting `[LB-demo]`. The overview shows active, paid, and denied counts and a claim pipeline chart; integrations are Tebra, InSync, eClinicalWorks, Epic Showroom, plus SFTP or CSV drops on any cadence (hourly to twice monthly) and API write-back `[LB-demo]`. Per claim, the agent runs an eligibility check, logs into the portal for status, and calls if warranted; the case shows the full transcript on the right and, on the left, DOS, payer, billed amount, actions taken ("checked the claim in the portal, showed that it was denied"), the denial reason (for example CO97), and a recommended action ("appeal with additional documentation") `[LB-demo]`. Eligibility re-checks are free inside follow-up; a separate Eligibility tab serves clients, often ASCs, who want pre-scheduled services verified `[LB-demo]`.

PA: "you'll be able to upload the same types of requests ... as long as we have access via login through the payer portals ... you can see what's in progress and what the decisions are" `[LB-demo]`. The pilot offer was 10 accounts on one payer, LunaBill operating a portal login "as if we were an additional FTE," no EHR access needed; Sunwave was not on the integration list `[LB-demo]`. Vanessa asked whether the need was authorizations or claim statusing, said "what I don't want to do is overpromise" on Medicaid PA, asked how often the payer updates policy, and took unit tracking, exhaustion triggers, and payer-trend visibility back to the CEO and CTO `[LB-demo]`. No pricing.

### 3.4 Neon Health

An "AI automation platform for patient services" with pharma and patient-support heritage: GLP-1 PA automation for a DTC provider with 10,000-plus scripts a month and a 2,000-PA backlog (2x faster PA, 13% more approvals); PSP enrollment intake (3.5x faster missing-information retrieval, 72% fully automated, 18 to about 7 FTEs); benefit-verification calls for CareMetx (300% ROI, 2x throughput) `[NE-deck]`. Capabilities: web-portal navigation, voice, fax, SMS, email, orchestration, escalation to human, business-rule codification, data enrichment, audit trail, predictive scheduling, and automated QA scoring 100% of calls against work instructions `[NE-deck]`. Neon frames a "partner build" fusing the customer's domain expertise with its automation `[NE-deck]` `[NE-demo]`.

"We are not the experts in behavioral health. We're also not the experts in retina, and yet we do many hundreds of thousands of retina medical benefit verifications every month ... our partners use our platform to codify all of the business logic and rules" `[NE-demo]`. Requirements are codified per **plan-comma-program tuple** (Medicaid ACT, Medicaid HCBS, Medicaid CFTSS, then commercial plans); for each patient the agent resolves plan, then program, then the tuple's requirements; with no tuple it searches, escalates, or uses a default and learns from the denial `[NE-demo]`. That is the **accuracy flywheel**: exceptions flagged, a human answers, the answer updates instructions, "and unlike a human, they won't forget it" `[NE-deck]` `[NE-demo]`. Policy requirements can come from Policy Reporter or MMIT at pass-through cost `[NE-demo]`. Integration is point-click automation through a service account on Valant or Sunwave, starting from a CSV export `[NE-demo]`. Three offers: PA automation (portal submission "in minutes"), outreach campaigns, and RPA for the recurring eligibility button plus MCP setup so Claude can update the clinic's sheet in place `[NE-demo]`. Voice calls for benefit checks were not recommended at this scale ("roughly on par with outsourcing call centers to India") `[NE-demo]`. Pricing is usage-based and invoiced on activity, but needs a volume estimate to provision GPUs and meet SLAs; the goal is 30% to 70% savings with 50% as the benchmark `[NE-demo]`.

### 3.5 Sohar Health

CEO Dr Ashish Mandavia and CTO Lucas Gordon (ex-Pelago), with staff from Optum, Iodine, ChenMed, Particle, and Navina; HIPAA and SOC 2 Type 2; up to 1,000 concurrent calls and 15 million checks per year `[SO-deck]`. Four APIs: **Verification** (RTE plus VoB; 5-second average, 93% within 30 seconds; up to 95% accuracy on copay, coinsurance, deductible; statistical models pick the most accurate benefits from the 270/271; "payer intelligence" corrects member details in real time; 93% pickup of carve-outs, TPAs, and MCOs such as Carelon Behavioral Health and Magellan; a rules engine for network status; clinical-operations staff resolve complex cases within 24 hours, including weekends). **Discovery** (coverage without insurance details; 55% weighted hit rate versus Trizetto 25%, Nirvana 40%, Experian 21%; p95 12 seconds; used at intake and for lapsed coverage on repeat verification). **Network Status** (by Tax ID across payer-plan combinations, carve-outs and tiers, 0.2 seconds, replacing the shared spreadsheet). **Cost Estimate** (line-by-line from live benefits plus contracted CPT rates maintained by dashboard or remittance) `[SO-deck]`.

Behavioral-health references: Talkiatry (18% intake conversion lift, 90% of manual verification cost saved), Rula (30% more automation than Change Healthcare, 95% benefits accuracy, 1,000 hours saved weekly), Mindful Health Solutions (25% more accurate estimates than Phreesia, 94% eligibility automation) `[SO-deck]`. The deck attributes roughly half of intake drop-off to insurance and eligibility steps and quotes 17 seconds from discovery to cost estimate `[SO-deck]`. Sohar solves the "Nirvana returns verified only" problem, including carve-outs and network status, and is a partner for everything downstream.

### 3.6 Aegis Health

Co-founder and CEO Krishang Todi; Y Combinator; onshore US team; mostly large and rural hospitals, some DME and outpatient; no behavioral-health or IOP clients `[AE-demo]`. The product "comes in after you've submitted the claim": underpayments against payer contracts, appeal or correct-and-resubmit, recurring-cause analytics `[AE-demo]`. The CEO said it "works best when there's a very high volume of denials and a lot of the cases are not administrative" and flagged the weak fit for a single-CPT, per-diem Medicaid clinic with about 15 denials a day, half administrative; he offered a walkthrough, vendor-selection advice ("they say something and then the product does something completely different"), and introductions `[AE-demo]`. No pricing.

### 3.7 Heron Billing

AI billing platform for smaller clinics between the EHR and a mandatory clearinghouse; 2,500 patients live on a digital-health RTM platform, 1,700 ramping, a 37,000-patient waitlist; 97% to 98% clean-claim rate `[HB-sum]`. Covers PA, eligibility, claim creation, submission, denials, appeals, underpayments, remittance; eligibility runs on a recurring schedule adjusted per payer policy; integration by API or FTP; complements offshore billers; not targeting Epic `[HB-sum]`. Pricing: 4% of recovered revenue per claim, only when recovered, covering first attempts and appeals, plus $1,000 to $1,500 setup; about $14.99 per patient per month for platforms `[HB-sum]`. Gaps: horizontal, no upstream batch eligibility with exception reporting, no PA approval-tracking view `[Table]`.

### 3.8 Tennr

Patient orchestration on top of the EMR: admission engine, benefits verification, PA, communications; $160M Series C, 400,000-plus prescriber NPIs, about 70% of DME orders `[TN-sum]`. CHE Behavioral Health: intake from 7 days to 3, intake FTEs from 18 to 5 (repurposed), monthly denials and write-offs from $10M to $5M `[TN-sum]`. Only non-face-to-face interactions (fax, email, portal, phone); walk-ins out of scope; pricing needs real referral volume; reconnect late October `[TN-sum]`. Threat is low today and rises if Tennr productizes for small clinics `[Table]`.

---

## 4. Feature matrix

Legend: ✓ shown or explicitly claimed; **partial** limited form or claimed without detail; ✗ absent or disclaimed; **unk** not observable. Columns are the seven demoed vendors plus six high-threat undemoed comparables, whose cells rely on `[Table]`.

| Capability | CombineHealth | HealOS/Arrow | LunaBill | Neon | Sohar | Heron | Humata | Infinx | QuickIntell | Lucida | Oprox | Flexbone | VGPM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Batch / rolling eligibility | ✓ 7-day rolling | partial | partial | partial (RPA button) | ✓ | ✓ scheduled | unk | unk | unk | partial | unk | unk | unk |
| Carve-out / COB detection | partial (primary vs secondary) | unk | unk | unk | ✓ 93% | unk | unk | unk | unk | unk | unk | unk | unk |
| PA requirement determination | partial (PA agent pending) | unk | ✗ | partial (tuples) | ✗ | unk | ✓ | ✓ | partial | partial | ✓ | partial | ✗ |
| Payer × program rules | partial (consultant-encoded) | partial (per-practice SOPs) | unk | ✓ | partial | partial | ✓ | ✓ | unk | ✓ | ✓ | partial | ✓ |
| Documentation gap detection | partial (appeal-time) | partial (pended → upload) | ✗ | partial | ✗ | unk | ✓ | ✓ | unk | ✓ | ✓ | partial | ✗ |
| Packet generation | ✓ appeals | partial | ✗ | partial | ✗ | unk | ✓ | partial | unk | ✓ | partial | ✓ | ✗ |
| Clinician sign-off gate | ✓ human review status | partial (questions; PA "no human in loop") | unk | partial (escalation) | ✗ | unk | unk | unk | unk | unk | unk | unk | ✗ |
| Portal / fax / phone submission | ✓ | ✓ portal, phone | ✓ portal | ✓ all three | ✗ | partial (clearinghouse) | ✓ | ✓ | unk | ✓ | unk | ✓ | ✗ |
| Status polling | ✓ | ✓ cooldown, next check | ✓ | ✓ | ✗ | unk | ✓ | ✓ | partial | partial | unk | unk | ✗ |
| Unit and date ledger | ✗ | partial (booking flag) | ✗ | unk | ✗ | unk | unk | unk | ✓ | unk | unk | ✓ | ✓ |
| Renewal triggers | ✗ | ✗ | ✗ | unk | ✗ | unk | unk | unk | ✓ calendar | partial | unk | ✓ | ✓ |
| Partial-approval handling | ✗ | ✗ (3 states) | ✗ | unk | ✗ | unk | unk | unk | ✓ | unk | unk | unk | unk |
| P2P workflow | ✗ | ✗ | ✗ | ✗ | ✗ | unk | unk | partial (risk flag) | ✓ | ✓ packets | unk | unk | ✗ |
| Appeals drafting | ✓ | ✓ wizard | partial | ✗ | ✗ | ✓ | unk | unk | ✓ | ✓ | ✓ | ✓ | ✗ |
| Appeal tracking / receipt confirmation | ✓ | partial | partial | unk | ✗ | unk | unk | unk | partial | partial | unk | unk | ✗ |
| Payer scorecard / history | ✓ heatmap | partial | ✗ | partial (flywheel) | ✗ | unk | partial | partial | unk | partial | ✓ | unk | ✗ |
| Policy change monitoring | ✓ 100+ payers | unk | ✗ | partial (pass-through) | ✗ | unk | partial | partial | unk | partial | partial | unk | ✗ |
| Voice agent for payer calls | ✓ Adam | ✓ | ✓ | ✓ | ✗ | unk | unk | unk | unk | unk | unk | unk | ✗ |
| EHR write-back | ✓ browser agents | ✓ auth #, dates | ✓ API/CSV | ✓ point-click | partial | ✓ | ✓ | ✓ | ✓ | partial (Sunwave) | unk | ✓ | native |
| Analytics / leakage | ✓ Taylor | ✓ KPIs | partial | partial | partial | unk | partial | ✓ | unk | unk | unk | unk | partial |

Reading the matrix: the demoed horizontal vendors are strong in the bottom rows (submission, polling, calls, write-back, analytics) and empty in the middle rows that define Psyflo (ledger, renewal, partial approval, P2P). Only QuickIntell and Flexbone claim the middle rows, and neither is demoed or specific to the Medicaid programs the persona runs `[Table]`.

---

## 5. Pricing landscape

| Vendor | Model | Numbers | Source |
|---|---|---|---|
| CombineHealth | Per-unit or fixed | $1 to $1.25 per eligibility check; $3 to $3.50 per payer call; $4 to $5 per appealed denial; analytics included; $1,500 per month platform; fixed $9,000 per month up to 2,500 visits; go-live in 2, 4, and 6 weeks by agent | `[CH-email]` `[CH-deck]` `[CH-demo]` |
| HealOS / Arrow | Per-unit plus contingency | $0.75 to $1.00 per PA; $0.15 per eligibility check; 2% of recovered denied AR; lump-sum option (about $400-plus per month at 20 PAs per day) | `[HO-demo]` |
| Heron Billing | Contingency plus setup; PPPM | 4% of recovered revenue per claim (only when recovered) plus $1,000 to $1,500 setup; about $14.99 per patient per month for platforms | `[HB-sum]` |
| Neon Health | Usage-based, volume-committed | Invoiced on activity; volume estimate required for GPU provisioning and SLAs; targets 30% to 70% savings; policy lookups passed through | `[NE-demo]` |
| Sohar Health | Transactional API | $0.60 per discovery call (Nirvana $0.80, Stedi $0.75, Zoll $0.75, Waystar $0.85, Trizetto $1.00, pVerify $1.20); other APIs not priced | `[SO-deck]` |
| LunaBill | Undisclosed | 10-account, one-payer pilot; operates as "an additional FTE" via portal login | `[LB-demo]` |
| Aegis Health | Undisclosed | Value in high-volume medical-necessity and coding denials; weak fit acknowledged | `[AE-demo]` |
| Tennr | Enterprise volume | Needs referral volume and call split to price; not for small practices | `[TN-sum]` `[Table]` |
| Kouper Health (adjacent) | Per AI-hour | $14 to $18 per hour of active AI talk time | `[KO-sum]` |
| Mend (adjacent) | Enterprise minimum | $25,000 minimum; mid-five-figure contracts standard for peers | `[TN-sum]` `[Table]` |
| Policy Reporter (data) | Subscription | Pending internal discount approval; undisclosed | `[PR-sum]` |
| Humata, Infinx, QuickIntell, Lucida, Oprox, Flexbone, others | Unknown | No pricing captured | `[Table]` |
| Target clinic today (persona) | Internal | About $2,000 per month Claude credits; two offshore contractors at $12 per hour; two full-time PA staff; leakage from $85,000 per month at the prior clinic to $10,000 to $25,000 after the Claude-plus-spreadsheet workflow | `[persona]` |

Implications: per-PA near $1 and per-eligibility near $0.15 are already on the table, so Psyflo cannot charge for submission volume. What is unpriced is prevented leakage (units delivered without authorization, expired authorizations, missed renewals) and clinician time avoided in P2P. A platform fee near $1,500 is accepted by buyers of CombineHealth; a 2% to 4% contingency on recovered revenue is accepted for AR work.

---

## 6. UI/UX patterns worth adopting

1. **Case timeline with named agent steps and explicit human gates.** CombineHealth's six steps (Denial Received & Categorised through Follow-up Scheduled) with green completed and hollow pending dots, a "Human review required" case status, and the handoff note "Adam takes up from here" `[CH-shots]`. Psyflo's authorization case: Eligibility Verified, Requirements Resolved, Packet Drafted, Clinician Sign-off, Submitted, Decision (Approved / Partial / Denied), Renewal Scheduled.

2. **Reasoning-step cards beside the source document.** "Denial reason review", "Primary denial prioritization", "Clinical documentation review" with the supporting sentence highlighted, "Policy criteria comparison" citing the policy number, and "Root cause assessment" next to tabbed ERA, CMS-1500, and MR Note viewers `[CH-shots]`. For PA: Program criteria, Note evidence found, Evidence missing, Payer history for this diagnosis and program, Predicted outcome.

3. **Sources-checked provenance chip and run header.** Arrow's "22 sources · 1 run", "17 steps", "7 checks" `[HO-shots]` and the spoken "39 sources, 40 sources" `[HO-demo]`. Trust comes from showing what was consulted.

4. **Questions to the human, inline in the run.** Arrow's "Question 1/2: What provider license number should LA Care use...?" with an answer box `[HO-shots]`, plus Neon's flywheel where the answer becomes a permanent rule `[NE-deck]`. Ask the clinician only what cannot be inferred and remember it per payer and program.

5. **Scheduled recheck with visible cadence and cooldown.** "Waiting for payer response, Checks again Sep 25, 2026 [Scheduled]" and the DETAILS block with Waiting on, Next check, Last checked, Cooldown `[HO-shots]`. For authorizations: "Payer SLA day 9 of 14; next check tomorrow; escalate to call on day 15."

6. **Plain-language action line on every eligibility row.** "Obtain updated insurance information from the patient and rerun eligibility before the visit", "Do not bill without referral", "Secondary insurance is inactive and should not be billed" `[CH-shots]`. Psyflo adds carve-out and program lines ("Behavioral health is carved out to Carelon; PSR requires PA before the first visit").

7. **Collect-upfront and copay flags as a status variant.** The green "Verification Completed; Collect Upfront" pill with "collect the $15 PCP copay", and flagging high remaining deductibles before the payer does `[CH-shots]` `[CH-demo]`.

8. **Denial heatmap, payer by reason, with a Chart/Table toggle.** Rows of denial categories against Medicare, Medicaid, VA, BCBS, UHC, Aetna, Cigna, Others `[CH-shots]`. Psyflo's version: payer by program by outcome (approved, partial, denied, P2P) with units requested versus granted.

9. **Status buckets as clickable KPI tiles with dollars, count, and a proportional bar.** Arrow's Claims page (All, Submitted, No Response, Needs resolution, Resolved, Closed without collection) `[HO-shots]`. For Psyflo: Not Started, Awaiting Clinician, Submitted, Pended, Approved, Partially Approved, Denied (appeal open), P2P Scheduled, Expiring in 14 days, Exhausted.

10. **Separate "verdict" and "current work" fields on every row.** Arrow's "Payer verdict: Awaiting payer verdict" versus "Current work: Waiting on payer" `[HO-shots]`: payer state versus who owns the next action.

11. **Persistent case header strip.** CombineHealth's "Patient | Claim ID | Payer | DOS | Provider | Balance | Status" `[CH-shots]` and Arrow's status pill, priority, aging days, EHR status, and "Last fetched from EHR" `[HO-shots]`. Psyflo: Patient | Program | Payer | Auth # | Units used / approved | Valid through | Days to renewal | Status.

12. **Editable draft before generation, with a document checklist that says why each attachment is required.** The cover-letter form, "Generate Documents", removable document chips, "+ Add Document", and standard versus claim-specific documents with one-line rationales `[CH-shots]`. PA packets: standard (request form, treatment plan) versus program-specific (collateral, LOCUS score, discharge summary).

13. **Submission evidence and channel details on the case.** The payer-portal screenshot with "Submission Complete" plus mailing address and fax number `[CH-shots]`; HealOS captures the reference number on submit `[HO-deck]`. Necessary because some of the persona's payers accept only fax `[persona]`.

14. **Purpose line, audio, and transcript in one pane; structured outcome first.** CombineHealth's "Follow-up by Adam" pane `[CH-shots]`, LunaBill's left-side summary with recommended action `[LB-demo]`, HealOS's call summary text `[HO-demo]`.

15. **Status-specific second line on queue cards.** PENDED shows reference and expected date; APPROVED shows auth number and validity window; DENIED shows the reason; IN PROGRESS shows "Polling payer portal..." `[HO-deck]`. Psyflo adds PARTIAL ("20 of 40 units approved through 11/30").

16. **Booking-time enforcement.** HealOS's appointment note and "don't book this patient" alert with cash-pay routing `[HO-demo]`, and the ABA and home-care pattern of blocking scheduling when units are exhausted `[Table]`. Surface the ledger at scheduling and check-in, not only in a report.

---

## 7. Positioning

### How Psyflo should differentiate

**1. Own the ledger, not the portal.** Every demoed vendor either lacks a ledger (CombineHealth, LunaBill, Aegis, Heron), offers a booking-time flag built for PT and chiro (HealOS), or needs the clinic to codify it as rules (Neon) `[CH-demo]` `[LB-demo]` `[HO-demo]` `[NE-demo]`. The persona's loss is not failed submissions; it is care delivered against authorizations that were partial, exhausted, or expired ("40 units but only got approved for 20 ... they're still coming into the clinic") and eligibility lapses found after 10 or 20 claims `[persona]`. Units approved, units consumed per documented session, effective and expiration dates, partial states, and renewal thresholds are the product; submission is an integration.

**2. Make approval intelligence payer-by-program and evidence-cited.** Neon's tuples (Medicaid ACT, HCBS, CFTSS as distinct rule sets) are the right data model `[NE-demo]`; CombineHealth's policy-criteria card citing "Policy #008" is the right presentation `[CH-shots]`; CriteriaIQ's dimension-level explanation and Oprox's historical approval outcomes are the right ambition `[Table]`. Before submission, show which criteria are evidenced in the note, which are missing, and how this payer has decided this program and diagnosis before.

**3. Put a clinician sign-off gate in the timeline.** CombineHealth's "Human review required" state and editable draft feed a training loop `[CH-demo]` `[CH-shots]`; HealOS's PA flow is "no human in the loop" `[HO-deck]`. Where the persona described diagnosis-selection judgment that changes units from 30 to 60 `[persona]`, sign-off is a compliance feature.

**4. Treat partial approval, P2P, and renewal as first-class states.** Only QuickIntell (approved, partially approved, denied; renewal calendar; P2P routing) and Lucida (P2P packets) describe these `[Table]`. HealOS has three states and 26% of requests pend `[HO-deck]`; CombineHealth's timeline ends at "Follow-up Scheduled" `[CH-shots]`. The persona's funnel (50% denied, 25% overturned, 10% to 15% to P2P at an hour of clinician time each) is what nobody models `[persona]`.

**5. Buy eligibility depth and submission rails; sell visibility.** Sohar's carve-out pickup and behavioral-health references `[SO-deck]`, HealOS's 490 portals at $0.75 to $1 per PA `[HO-deck]` `[HO-demo]`, and Infinitus or SuperDial for calls `[Table]` are cheaper to integrate than rebuild. Psyflo's monthly value is prevented write-off, which the persona sized at $10,000 to $25,000 per month after self-built tooling `[persona]`.

**6. Price against prevented leakage with a platform fee the market accepts.** CombineHealth's $1,500 platform fee plus per-unit charges was judged "within our budget" at about $9,000 per month `[CH-demo]`; a contingency on recovered or prevented units matches HealOS (2%) and Heron (4%) norms `[HO-demo]` `[HB-sum]`.

**7. Ship the payer scorecard the persona keeps "in the back of our heads."** "I wish I saw that somewhere" `[persona]`. CombineHealth's heatmap is the closest visual `[CH-shots]`; EasyPA's won-and-lost analytics and ParaHealth's payer-performance tracking are the closest claims `[Table]`.

### Risks

**Well-funded multi-specialty players moving down-market.** Humata's 2026 independent-practice product returns a real-time documentation and denial-risk score; Infinx already separates determination, initiation, and follow-up agents `[Table]`. Tennr's $160M Series C and CHE Behavioral Health case show behavioral health on the enterprise roadmap `[TN-sum]`. CombineHealth will show a PA agent within a month and can encode clinic rules consultatively `[CH-email]` `[CH-demo]`.

**Behavioral-health natives already on the target stack.** Lucida and Athon connect to Sunwave and Availity; Oprox and CriteriaIQ market approval probability; Flexbone and XY.ai market renewal-driven PA; Ember and Adentris cover concurrent review and P2P windows `[Table]`. None are demoed, so execution is unverified, but their language matches Psyflo's thesis closely enough that differentiation must come from execution on the ledger and Medicaid-program specificity (ACT, HCBS, CFTSS, PSR/CORE).

**EHRs absorbing the ledger.** Ritten tracks remaining units and expiration by payer and CPT; Sunwave could add the field the persona is missing `[Table]` `[persona]`. The defense is the intelligence and history layer an EHR field cannot supply.

**Submission commoditization dragging price expectations down.** With $0.75 to $1 per PA and $0.15 per eligibility on the table `[HO-demo]`, buyers may anchor on transactions. Sell outcomes: units authorized and paid, renewals never missed.

**Vendor credibility fatigue.** The persona reported being pitched "a completely different product" after explaining the unit problem, and Aegis's CEO warned that vendors "say something and then the product does something completely different" `[persona]` `[AE-demo]`. Lead with a live ledger on the clinic's own data, following HealOS's "bring one real PA and run it on the call" pattern `[HO-deck]`.

---

## 8. Source register

| Tag | Source | Type | Location or identifier |
|---|---|---|---|
| `[Table]` | "5 · Alternatives & Players Map (Competitor Demos)", 58-vendor export from Superhuman Docs | Competitor table | `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/research/competitor_table.txt` |
| `[CH-deck]` | "Harbor Reach Care <> CombineHealth AI" (agents, workflow, security, impact, implementation, pricing) | Vendor deck (Google Drive) | fileId `1ssMDmTHedvdF0Ic7vXtH8BrhpkP28OPD` |
| `[CH-email]` | "Re: Thank you for your interest in CombineHealth", Chaitanya Mahale, September 17, 2026 (pricing, PA timeline, staged go-live) | Vendor email (Google Drive) | fileId `1Nq4pIR75Gbo5Vj3n4dW6RSvsW-ztkTWz` |
| `[CH-demo]` | Combine Health Demo call transcript (Chaitanya Mahale, VP Growth) | Granola transcript | meeting `0f9b2ae1-2a62-440c-b8aa-25dcc122e446`; text copy at `.../scratchpad/research/combine_health_demo_transcript.txt` |
| `[CH-shots]` | CombineHealth screenshots: eligibility list, appeals list, appeal case timeline, ERA / CMS-1500 / MR Note tabs, reasoning steps, cover-letter form, packet builder with mailing and fax, payer-portal submission, AR follow-up list, claim timeline with voice-agent recording and transcript, denial heatmap | PNG screenshots | `.../scratchpad/shots/shot_5.36.19..png` through `shot_5.43.10..png` (13 files) |
| `[HO-deck]` | "Prior Authentication Customer Demo.pptx", HealOS Module 03 Prior Authorization (17 slides) | Vendor deck (Google Drive) | fileId `1vXSBfcMjcGLnTD9_GwCQkLieZFrgfROf` |
| `[HO-demo]` | HealOS Demo call transcript (Prakhyat, account executive; Bhupinder, RCM operations head) | Granola transcript | meeting `25c732f8-bfdf-43ef-a120-5f8a9a3e4ad1` |
| `[HO-shots]` | HealOS / Arrow screenshots (app.arrowhq.com): dashboard KPIs, claims list with status buckets, claim detail with Arrow run and sources chip, check results, questions to human, insurance-verification panel with recheck details | PNG screenshots | `.../scratchpad/shots/shot_5.47.08..png` through `shot_5.47.48..png` (6 files) |
| `[SO-deck]` | "Sohar capabilities deck_v3", Automating Insurance Intake for Providers (Ashish Mandavia, CEO) | Vendor deck (Google Drive) | fileId `1fC3qoiYklh6-NhseFpZoz73I22GKi9om` |
| `[NE-deck]` | "Neon Health [current]", AI automation platform for patient services | Vendor deck (Google Drive) | fileId `1LAilJWpZ82jjc5BZ5-x3GpGGdUK-8B3k` |
| `[NE-demo]` | Neon Health Demo call transcript (Stedman) | Granola transcript | meeting `c737366c-7624-4ede-96b1-de8db788c37a` |
| `[LB-demo]` | Luna Bill demo call transcript (Vanessa, head of RCM) | Granola transcript | meeting `66bbe2e2-5fbd-427a-bc68-12f716429144` |
| `[AE-demo]` | Aegis Demo call transcript (Krishang Todi, co-founder and CEO) | Granola transcript | meeting `f73a68c7-ae5d-4b7a-ad18-c7f44b955177` |
| `[HB-sum]` | Heron Billing Demo, September 2, 2026 (Harsh Gupta, Prithvi Rana) | Granola AI summary | meeting `59e5f752-7f01-4c97-b0ba-bd006ba16694` |
| `[TN-sum]` | Tennr Demo, August 31, 2026, including debrief on Mend and other voice-AI vendors | Granola AI summary | meeting `91b4f36d-ca90-4312-aa4e-91b6752f407d` |
| `[KO-sum]` | Kouper Health Demo, August 31, 2026 | Granola AI summary | meeting `eb9dd98b-d457-472c-8ca9-492ce99a0aff` |
| `[PR-sum]` | Psyflo <> Policy Reporter, June 17, 2026 (Rayellen Kishbach) | Granola AI summary | meeting `11390a82-5560-4042-aee4-f1adcb6ad455` |
| `[persona]` | Statements by the Psyflo researcher in the clinic-operator persona ("Ravi", "Harbor Reach Care") across the CombineHealth, HealOS, LunaBill, Neon, and Aegis calls; used only to characterize the target customer's problem | Research framing | Same transcripts as above |

**Coverage note.** All 58 table rows were reviewed; vendors with empty "does well" and "gap" fields (Cair, mdhub, SuperDial, Collectly, Nanonets, RapidClaims, Amperos, Sonic AI, Simbie) are listed with feature lists only. JustAppeals appears twice in the export and is treated once. The file `Screenshot_2026-09-19_at_5.40.52 PM.png` is byte-identical to `shot_5.40.52..png` and was not counted separately.
