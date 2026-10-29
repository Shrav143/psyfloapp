# Psyflo UX refinement: review of the ChatGPT prompt, the improved prompt, and the plan

## 1. What was wrong with the original prompt

The original is a good checklist of themes (calm screens, progressive disclosure, nothing breaks), but used as written it would make the demo worse in six ways.

| Problem in the original | Why it matters | What the improved prompt does |
|---|---|---|
| Asks for "financial exposure" in Analytics | You told us to remove at-stake figures everywhere. It would bring dollar figures back | Counts, rates and days instead: preventable denials, denials accepted, turnaround. No dollar figures anywhere |
| "Do not invent data" and also "add attendance, claim reconciliation, MCO and FFS routing, policy sources, verification source" | These cannot both hold. Every figure in the demo is sample data | Sample data is allowed only when it is labelled as demo data. A "source", "verified" or "checked" line must say it is simulated. Anything that needs a feed the demo does not have (claims, per-session attendance) is left out, not faked |
| Says "AI reasoning", "AI actions", "AI agents" | Product rule: the assistant is FLO, the workers are named agents, and the words "AI" and "bot" are not used | FLO and the named agents. Reasoning is "FLO's reasoning", and it is always labelled as a recommendation, never a payer fact |
| Adds items to nearly every screen while asking for less clutter | Net result is a busier app | Every addition must fold, replace or sit behind a disclosure. A screen may not end up with more visible blocks than it has now |
| Asks for New case to become four form steps (patient and coverage, program and service, documentation, review) | New case is built around a referral and a chart: Reader fills the form from the documents. A form wizard would throw that away and was not what you approved | Keep the four steps that exist (Referral, Medical records, Agents work, Review and sign). Make Review show what is missing first and say plainly that nothing is sent until a person signs |
| Asks for claim denials, claim reconciliation, "mock features that do nothing" in the same prompt | The demo has no claims feed. A claim-denial toggle would be a control that does nothing | Denial Intelligence is labelled as authorization denials. Claim denials are named as out of scope for this demo, with no placeholder control |

It also leaves out three things worth having: an exact status vocabulary, a rule that a summary is computed from the demo data (not written by hand), and a test method.

## 2. The improved prompt

Use this as the brief for any tool that edits the demo.

---

**Task.** Refine the existing Psyflo prior-authorization demo (React, TypeScript, Tailwind tokens, zustand, react-router in `demos/prior-auth-demo`). Improve the content inside each existing screen. Do not rebuild the app.

**Product.** Psyflo serves Medicaid-heavy behavioral health and substance use providers (IOP, PHP, residential, withdrawal management). Users are authorization coordinators, utilization review teams, billing and revenue cycle staff, case managers and operations leaders. It is an operational tool, not an analytics dashboard.

**Do not change (hard rules)**
1. The left sidebar, its order, names, badges and hierarchy (Dashboard, Authorizations with New case and Eligibility & Benefits under it, Denial Intelligence, Case Manager, Analytics, EMR Connect, Payers, Settings). No new sidebar tabs.
2. Colors, fonts, branding, the shell (top bar with Demo menu and clock, Ask FLO, notifications).
3. Routes and deep links, filters, detail pages and drawers, the demo time controls, the Demo menu, FLO. Nothing that works is removed.
4. No dollar figures for money at stake, at risk, written off or protected, anywhere.
5. No invented facts. The demo's sample data stays sample data and is labelled "Demo data" where a viewer could mistake it for real. A line about a source, a verification or a sync must say it is simulated. Payer rules not confirmed are shown as "Not verified".
6. Words: the assistant is FLO, the workers are named agents. Never "AI" or "bot". The chart "supports" an argument; never "the patient needs". FLO output is a recommendation for a person to review, never a payer fact.
7. A control either works or is not shown. No placeholder buttons.

**Make each screen calmer (progressive disclosure)**
- Order on every page: title, one line of description, primary action, at most four key figures, the main work area, then secondary detail.
- Secondary detail (evidence, long explanations, audit history, technical settings, extra analytics) sits in a collapsed section with a one-line summary, or in a drawer.
- Fewer simultaneous alerts: at most one banner on a page, and information banners fold into an info icon with the text on hover or focus.
- More space between sections. Color is for urgency, exceptions and status only.
- Keyboard order, focus rings, contrast and text sizes stay accessible. No horizontal scroll at 1280, 1024 and 768 px wide.

**Screens**

*Dashboard.* One daily work list. Order: headline, a FLO summary (two or three plain lines computed from today's data: who needs you, what is due soonest, authorizations expiring within 7 days, denial deadlines this week, each linking to the screen), four figures (needs you, due within 24 hours, waiting on payers, denials to act on), then the single request list ordered with the ones waiting on you first. Stage filters and the date control stay. Payer performance moves into a collapsed section that links to Analytics.

*Authorizations.* The queue row shows: case and patient, program, payer, status, deadline, next action, with the approval chance as one small number. Clinical scores, agent activity lines and payer notes move to the case page. Add the request-type filter: Initial, Concurrent review, Reauthorization, Retrospective. At most four figures above the list. On the case page: put the next action at the top; show authorization facts where the data has them (requested and approved units, units used, review or expiry date, documents complete or missing); fold the two explanatory banners into one line; add a collapsed History that labels each entry as a person or an agent.

*New case.* Keep the four steps. The last step lists what is missing first, then the summary, and says that nothing is sent until a person signs. Surface missing items as soon as they are known.

*Eligibility & Benefits.* Result first (eligible or not, with effective dates), then benefits, then what the service needs for authorization. Show plan type and routing (Medicaid managed care, fee for service, commercial or Medicare Advantage) where the data has it, the time checked, and the source labelled as simulated. Show copay, deductible and coinsurance only when they apply and are on file. Coverage being active does not mean a service is covered.

*Denial Intelligence.* Order by deadline. Label every item as an authorization denial and say that claim denials are not in this demo. One recommended next step in plain words (reconsideration, correction and resubmission, peer-to-peer, appeal, accept, or investigate by hand), with the chart evidence, FLO's reasoning, the agents' work and the generated letter collapsed by default. State that a clinician reviews and signs before anything is sent. The long summaries, the six ASAM dimensions and the appeal analysis report stay.

*Case Manager.* Default to the tracker ordered by what is due next, with units approved, used and remaining and the next review or expiry. Cases being prepared become a short collapsed list that links to Authorizations rather than repeating the queue. Case history stays; the event log is collapsed.

*Analytics.* Four key figures (approval rate, denial rate, turnaround, preventable denials), two or three charts, and the detailed tables in a collapsed section. Filters: payer, program, date range. Label modeled values and demo values.

*EMR Connect.* Top: connection health, last sync, what data is available, failures, and the one action required. Field mappings and logs move into a collapsed Advanced section. Say clearly what is read only and what is write back.

*Payers.* Compact guidance by payer, plan type, program and request type: whether an initial request or a review is needed, the source, the date last verified, and changes. Unverified items say "Not verified".

**FLO.** Ask FLO suggestions follow the screen: on a case it offers what is missing, when the authorization runs out, and what the payer requires; on Case Manager, which reviews are due; elsewhere, what is due soonest. Answers are computed from the demo data and say which case they refer to. One recommendation at a time, with the reasoning folded away.

**Statuses** (one meaning each, used the same everywhere): Draft (being prepared), Ready for review (waiting for a person to sign), Submitted (signed and sent), Acknowledged (payer has it), Under review, Info requested, Approved, Denied, Completed. Where the demo already uses a stage name, show the matching status in help text instead of renaming the stage.

**Process.** Audit the code first and reuse what works. Write a screen-by-screen plan. Change one screen at a time. After each, click through every route and nested route, check keyboard use, and check 1280, 1024 and 768 px. Update the workflow diagrams for any screen whose behavior changed. Finish with a changelog by sidebar tab: simplified, added, kept.

**Success tests.** A coordinator sees the most urgent work within five seconds of opening the Dashboard. The next action on a case is visible without reading a narrative. A revenue cycle manager finds the payers that are slowing things down and the preventable denials without opening anything. The app looks calm, spacious and trustworthy.

---

## 3. Decisions recorded while auditing (what is already done and what changes)

Already in the demo, so left alone: units used and total per case (Case Manager), review and expiry clocks, request-type filter on the Dashboard, a case page with five tabs, human sign-off before sending, the appeal report and summaries, read-only versus write-back wording in EMR Connect.

Deliberately not built, because the demo has no data for it: per-session attendance, claim denials and authorization-to-claim reconciliation, case owner and assignment (one demo user only), live payer policy sources.

The changelog by sidebar tab follows.


## 4. Changelog by sidebar tab

Page heights at 1440 px wide, before and after: Dashboard 1,856 to 1,562; Authorizations queue 3,121 to 2,419; Denial Intelligence 3,340 to 2,668; Case Manager 2,333 to 1,416; EMR Connect 1,197 to 1,026; Payers 2,299 to 2,127. Pills on the queue went from 99 to 56 and on Case Manager from 133 to 26. The case page is a little taller (2,352 to 2,549) because it now opens on the next action and the authorization facts; the two banners it used to carry are one line.

**Sidebar and shell: kept.** Order, names, badges, hierarchy, colors, fonts, the Demo menu and clock, notifications and Ask FLO are unchanged. One shared `Disclosure` and one shared `InfoTip` were added to the UI kit so every folded section and every info icon behaves the same way (real buttons, `aria-expanded`, Escape).

**Dashboard.** Simplified: the six tinted stage tiles became four figures (Needs you, Due within 24 hours, Waiting on payers, Denials to act on) that also filter the list; one request list with the ones waiting on you first; Payers at a glance, the "What the stages mean" help and the date-range calendar were later removed at your request (the calendar only fed the payer table, so it went with it). Added: Summary from FLO, three lines computed from today's data (who needs you, authorizations ending within 7 days, denial deadlines this week), each linking to the place it is about. Kept: the four filter menus, sorting, the request drawer and its demo replies, Check all now, `?stage=`. The `?focus=payers` and `?from=&to=` links are gone; Ask FLO's slow-payers answer now links to Analytics.

**Authorizations.** Simplified: one line per request (case and patient, program, payer, request type, status, deadline, next action, approval chance); scores, agent lines and payer notes moved to the case page; five figures became four; the payer signal is one line. Added: request-type filter (Initial, Concurrent review, Reauthorization, Retrospective) and filters in the address; "What the statuses mean" help; on the case page a Next action block, an authorization facts row (requested, approved, used, left, documents, who it waits on), and a closed History that labels people and agents. Kept: bands and their order, the five tabs, Refine, Add context, Apply selected, Send to payer and every gate.

**New case.** Kept the four steps (the referral and chart drive the form). The last step now opens with What is missing, says once that nothing is sent until a person signs, and the button reads "Sign and send to payer". One alert at a time on each step.

**Eligibility & Benefits.** Simplified: "Why we check twice" is an info icon; each patient is a chips line plus one quiet second line. The result reads in order: eligibility with effective dates, benefits and limits, then what the service needs for authorization, with plan type and routing, the time checked and a source labelled as simulated. Cost share appears only when the plan has one on file, and a plain note says active coverage does not mean the service is covered. Kept: all six sample verdicts, Re-check, Start authorization, back links.

**Denial Intelligence.** Simplified: header and one recommended next step in one block; "What the agents did", FLO's reasoning and "Add a denial letter" are folded; the open list is ordered by deadline. Added: "Authorization denial" labels and the line that claim denials are not in this demo; a clinician-reviews-and-signs sentence beside every draft, brief and report; the recommendation vocabulary. Kept: both Full summary pop-ups, the six ASAM dimensions, the appeal analysis report and its PDF, and every sign gate.

**Case Manager.** Opens on the tracker: status, next due, units or days used and left, a "runs out before review" flag where the data shows it. Being prepared is one folded row that links to Authorizations, so the queue is not repeated. The ledger case page folds its history. Kept: both tabs, draft all due reviews, sign, step-down plans.

**Analytics.** Four figures (approval rate, denial rate, turnaround, preventable denials), a Program filter beside period and payer, three charts above the fold (approval by payer, preventable denials by reason, edit share) with workload, and the detailed tables in closed sections. Modeled and demo values are labelled once. No dollar figures anywhere. The denial reason counts now add up to the denials the rates imply.

**EMR Connect.** Connection health at the top (last sync, charts matched, files pulled, sync failures), one Action required line, each system marked read only or read and write back with its switch, and field mappings and the log in a closed Advanced section. "Simulated connection" is said once.

**Payers.** (Superseded by the Payer Workflow Studio, section 16.) Compact rows by plan type, programs and what is needed; each payer opens with a policy status line that says the rules are demo rules, not verified against the payer's current policy; rules, documents and the key of step types are folded. Kept: edit, add, acknowledge, update drafts, the chart checker.

**FLO.** Ask FLO suggestions now follow the screen (a case, Case Manager, Denial Intelligence, Eligibility) and the answers are computed from the demo data, name the case, say they are not a payer confirmation, and link to the place. All earlier answers still work.

## 5. Not built, and why

- **Per-session attendance, claim denials, authorization-to-claim reconciliation:** the demo has no claims or attendance feed; building them would be controls with nothing behind them.
- **Case owner and assignment:** there is one demo user.
- **Live payer policy sources and verification dates:** none exist; the Payers pages say so.
- **Financial exposure in Analytics:** removed from the plan on purpose (see section 1).
- **"Ask for reconsideration":** it is in the vocabulary, but no demo denial maps to it because that needs a payer rule that names it.
- **A second sidebar:** see the recommendation in the chat reply.

## 6. Known nuance

The Dashboard says 3 need you; the Authorizations figure says 21 are waiting on you. They use different rules: the Dashboard counts what is waiting on a person's input right now; the queue counts everything that is yours to work (not yet sent, a denial to work, a question). Both labels say what they count.

# Round 4: sites, a cleaner actionable Dashboard, owner analytics, side panels, and the five-step New case

## 7. The ChatGPT "redesign New case" prompt: what it asks, what is missing, what we changed

**What it asks for.** One adaptive New case workflow instead of one that assumes every request starts with a referral. An Authorization type selector (Initial, Concurrent review, Reauthorization or renewal, Modification or extension, Retroactive). Five steps (Intake, Eligibility & Benefits, Clinical documentation, Authorization preparation, Review & submit) with per-step states (Complete, Needs attention, Pending, Not applicable, Blocked). Eligibility reuses the existing standalone check. A data model with Patient, Treatment episode, Authorization, Authorization request and Verification result as separate, linked things. The standalone Eligibility & Benefits page stays and gains "Create authorization from verification". A long list of edge cases.

**What is good and kept as written:** the selector and its five options, one adaptive page (not five pages), the five steps and their names, the per-step states, reuse of the verification engine, reuse of a recent verification instead of a new one, "verify coverage for the dates of service" for retroactive requests, no duplicate patient on a concurrent review, never implying a guaranteed outcome, "create authorization from verification", saving a draft when information is incomplete, and linking the finished request to patient, episode and authorization.

**Gaps and conflicts, and the decision for each**

| # | Gap or conflict in the prompt | Decision |
|---|---|---|
| 1 | Says "AI", "AI agents", "AI preparation status" | The assistant is FLO and the workers are the named agents (Reader, Verify, Scribe, Criteria, Integrity, Scrubber and the rest). Never "AI" or "bot" |
| 2 | Asks for patient name and date of birth | The demo shows initials, age and a masked member ID only. All data is fictional and labelled demo data |
| 3 | No mention of sites | Patient search, incoming referrals, existing authorizations and duplicate checks only see the sites the viewer can see. A new case belongs to one site: the current site, or a Site picker in Intake when both are in view |
| 4 | "Submit to payer" is ambiguous | The demo records a simulated send. The last step keeps the clinician sign-off gate (only a clinician signs; the coordinator cannot) and the button reads "Sign and send to payer (demo)". Nothing is shown as sent until the store records it |
| 5 | "Duplicate authorization request" is listed with no rule | Define it: same patient, same payer and same program with an open request or an active authorization whose dates overlap the requested dates. Warn with a link to the existing one. The user may continue with a short reason, which is recorded. A concurrent review or modification is linked to the authorization it refers to and is never a duplicate of it |
| 6 | "Only prevent final submission when a required condition is unresolved" does not say which | Blocking: no patient, payer, service or requested dates; coverage confirmed inactive with no documented exception; an unresolved duplicate; no clinician sign-off. Everything else (missing documents, unknown requirements, unavailable verification, uncertain benefits) warns, stays visible, and can be saved as a draft |
| 7 | The data model is described but not tied to what exists | Derive it from existing data, do not rebuild it: Patient = one per person across cases (initials, age, payer, site); Treatment episode = a stay at one level of care (the Case Manager ledger case); Authorization = the approved window, days or units on an episode; Request = the request or draft (Dashboard request, queue item, New case draft); Verification = an Eligibility & Benefits result for a patient, payer, program and dates of service |
| 8 | Request types do not match the demo's | Initial = Admission and Initial request; Concurrent review = Continued stay; Reauthorization = Recertification; Retroactive = Retro-authorization; Modification / Extension is added as a new request type everywhere request types are listed (Dashboard and Authorizations filters, mapping function, labels). Peer-to-peer, appeal and resubmission stay denial work and appear only under All |
| 9 | Edge cases need seeded examples to be testable | Use existing records: lapsed coverage (R-1101, R-0975); nearing expiry (I-2207, I-2193); no units left (a ledger case with none left, add one if missing); payer changed (add one Eligibility row if missing); verification unavailable (when the Verify agent is paused in Settings); coverage uncertain and authorization not required (Eligibility samples); retro with unknown payer rule (a payer with no Backdating rule) |
| 10 | "Reuse the verification engine" is not specific | One shared verification module and one stored record per (patient, payer, program, dates of service). New case reads and writes it; the standalone page reads and writes it. A record is reused when the patient, payer, program and dates match and it was checked within 24 demo hours, otherwise the step offers Refresh. "Last verified" uses the demo clock and says the source is simulated |
| 11 | "Avoid unnecessary modals" but also a long list of detail panels | Steps are inline pages. Detail ("View full verification details", authorization history, a case quick view) opens in a right-hand side panel, not a centered modal. Centered dialogs are for confirmations only |
| 12 | Document requirements per type are examples | Required documents come from the saved Payers config (documents by program). Type-specific items are labelled "typical for a continued stay" (and so on) and never presented as a payer's rule unless the Payers config says so |
| 13 | Retroactive rules | Reuse the Backdating rule already in Payers config and the retro-authorization wording in Denial Intelligence. If the payer has no rule on file, say "No rule on file for this payer. Check with the payer" and do not guess |
| 14 | Step states are named but not defined | Complete (all required items done), Needs attention (something to fix, can still go on), Pending (not started or waiting on an agent or a reply), Not applicable (for example, no authorization required), Blocked (a blocking condition from row 6). Shown on the stepper and in each step's header |
| 15 | Authorization preparation | This is the existing Agents work step under a new name, with the same agents and gates. For each type it prepares a different justification (initial, continued-stay, renewal, modification, retroactive) from the documents that exist, and flags what is missing; it never invents clinical facts |
| 16 | The earlier rules still apply | One alert at a time per step, progressive disclosure, no dollar figures, no placeholder controls, FLO wording, accessibility |

## 8. The improved New case prompt (use this as the brief)

Redesign the **New case** page of the Psyflo prior-authorization demo (`demos/prior-auth-demo`) as one adaptive workflow. Keep the design system, the sidebar, routes (`/authorizations/new`, `/authorizations/new/:draftId`, `/authorizations/new/referral/:id`), the sample referrals and charts, and everything that works. Inspect first; reuse the existing Eligibility & Benefits components and logic, the referral intake, the draft model, the agents and the sign-off gate.

1. **Authorization type** dropdown under the page heading, default Initial: Initial authorization, Concurrent review, Reauthorization / renewal, Modification / extension, Retroactive authorization. It decides the Intake content, the Eligibility behavior, the documents asked for, the justification prepared and the wording of the last step. One page, five steps.
2. **Five steps**, horizontal, existing visual language, checkmarks on complete steps, free to go back, progress saved in the draft: Intake, Eligibility & Benefits, Clinical documentation, Authorization preparation, Review & submit. Each step shows its state (Complete, Needs attention, Pending, Not applicable, Blocked).
3. **Intake** by type. Initial: the referral drop zone ("Start with a referral or patient"), "Create case manually", and the Incoming referrals list (statuses "Documents complete", "N items missing" only when documents or fields are really missing, otherwise "N items to review"; the button reads Review). Concurrent review, Reauthorization and Modification: search existing patients (only those in the current site view), pick the treatment episode and the authorization; show status, approved dates, authorized and remaining days or units, expiry and history; no new patient is created. Modification adds the proposed change (more units, more days, revised dates, different service or level of care, correction). Retroactive: patient, payer, service, dates of service, why it was not obtained ahead of time, supporting documents, and the warning that retroactive authorization depends on the payer and may not be available.
4. **Eligibility & Benefits** as step 2, built from the shared verification module: coverage status and dates, payer and plan type (Medicaid managed care, fee for service, commercial), benefits for the service, authorization requirement (required, concurrent review required, not required, unknown), provider participation, existing authorization, copay or deductible only when they apply. Initial: run or reuse a check. Concurrent review: show the last check and say whether to refresh. Reauthorization: check coverage or payer change. Modification: check whether the change alters the requirement. Retroactive: verify the dates of service. Show "Last verified [time], simulated source", **Refresh verification** and **View full verification details** (side panel). Exceptions (inactive, payer changed, member ID mismatch, benefit not confirmed, not covered, provider unresolved, service unavailable, requirement unknown) warn and never force the user to abandon the case. If no authorization is required: say so, for which payer, service and dates, and offer Save verification to the patient record, Return to Case Manager, or Continue with a documented exception.
5. **Clinical documentation** (was Medical records): the existing checklist and extraction, with the required items for the type and payer and a compact "3 of 4 ready" readiness line.
6. **Authorization preparation** (was Agents work): the existing agents. Prepare the request for the type (initial, continued-stay, renewal, modification, retroactive justification), match evidence to criteria, flag inconsistencies and missing evidence, build the packet, keep source links.
7. **Review & submit** (was Review and sign): the summary (patient, payer, type, service, level of care, dates, units, eligibility status, existing authorization, documentation readiness, medical necessity summary, outstanding warnings), a final checklist, editable packet, the clinician sign-off gate, and "Sign and send to payer (demo)". On completion: save the request, link it to the patient, episode and existing authorization, keep the verification and documents, record the type and status, show it in Authorizations, Dashboard and Case Manager, and open the resulting case.
8. **Standalone Eligibility & Benefits** stays. Its result gains **Create authorization from verification**, which opens New case with patient, payer, service and the verification carried over and the type still to choose. A verification started inside New case is the same record the standalone page shows.
9. **Edge cases** (section 7 row 9) each produce a clear warning and a next action. Drafts save when incomplete.
10. **Sites.** Patient search, the incoming list and duplicate checks respect the site view. A new case is assigned to a site.

## 9. Multi-site (Site A and Site B), for HIPAA minimum necessary

- `src/data/sites.ts`: `siteOf(caseId)` gives every case a site, the same on every screen. `src/data/viewers.ts`: four viewers (Jordan Perez, UR coordinator, both sites; Alex Morgan, clinic owner, both sites; Dr. Rivera, clinician, Site A only; Sam Okafor, billing, Site B only). `src/store/session.ts` holds the viewer and the selected scope. `src/lib/scope.ts` exposes `useScope()` with `has(caseId)`, `filter(rows, idOf)`, `sites`, `label`, `restricted`.
- Top bar: **Both sites | Site A | Site B** (locked "Site A only" for a one-site viewer). Demo menu: **Viewing as**. The default viewer is Jordan Perez on **Both sites**, so every number in CONVENTIONS.md is unchanged by default.
- Every list, count, badge, chart, FLO answer, notification, search result, picker and report must read the scope. A one-site viewer must never see, count, search or link to the other site's records. A link to the other site's record shows the `OutOfSite` card (it names no patient).
- Site is an attribute of the case, not of the payer. Payers, agents and Settings are clinic-wide.

## 10. The Dashboard (reference: the "Auth cockpit" screenshot)

Look: very little chrome. White cards on the warm background, one serif card title and one quiet sentence under it, generous padding, thin dividers, a small number of states, no tinted tiles, no progress bars, no icons in rows. Structure, top to bottom: **Lifecycle** (a row of compact state chips with counts, each a filter), **Do next** (the actionable list: the few things a person should do now, each with one button), then **the table** ("59 authorizations": one line per case, a toggle "Needs me today", payer and status menus, sorted by days in the current state so anything stuck floats to the top). Columns: Case (id and initials), Payer, Service (program), Status, Days in state (with the payer's median and a flag when it is past the CMS decision time), Units (approved to left), Window (approved dates), Next action, Owner (you, an agent, or the payer). A row opens the case quick view in a right-hand panel. The page must answer "what should I do now" in five seconds and must not carry dollar figures.

## 11. Owner and executive analytics (research notes and plan)

Who: the clinic owner or C-suite. Questions they ask: Are we getting paid for the care we deliver? Which payers are slow, denying or cutting days? Why are we denied, and could we have prevented it? Is one site doing worse? Are we getting better or worse over time?

Grounding (searched 2026-10-22; treat benchmarks as indicative only, the demo labels all values as demo values):
- CMS Interoperability and Prior Authorization final rule (CMS-0057-F): from 1 January 2026 impacted payers, including Medicaid and CHIP fee for service and managed care, must decide expedited requests within 72 hours and standard requests within 7 calendar days, and must publicly report prior authorization metrics (approvals, denials, appeal overturns, decision times). Source: CMS prior authorization API FAQ (cms.gov). State pages vary, so the demo says "check your state".
- Public payer reports show approval rates per request type, and appeal overturn rates are widely reported to be high when denials are appealed (published ranges differ by source, so the demo does not quote a benchmark as fact).
- Revenue cycle KPI lists for substance use treatment providers center on denial rate, first-pass resolution, days in accounts receivable and write-offs. Prior authorization sits upstream of all of them.

Plan (all tied to cases, not only aggregates):
1. **Headline figures with trend:** approval rate, denial rate, first-pass approval (approved as requested, no cut), average decision time with the share past the CMS time, preventable denials, appeals overturned. Each with a 12-month sparkline.
2. **Trend lines** (12 months) of approvals and denials, overall and per payer, for the chosen sites.
3. **Payer scorecard:** one row per payer: decisions, approval rate, denial rate, partial approvals (days or units cut), average days to decision, past CMS time, info requests, appeals overturned, trend arrow. Click a row to open that payer's analysis in a right-hand panel.
4. **Payer analysis panel:** trend lines (approval and denial by month), approval by diagnosis group, program and request type, top denial reasons with counts, the cases behind the numbers (id, initials, diagnosis group, program, request type, site, outcome, reason, days) with a link to the case when it exists in the demo, and a "what this payer tends to do" summary (computed: for example denies continued-stay requests for substance use more often than for mood disorders).
5. **Payer by case-mix matrix** (heatmap): payers down, diagnosis group (alcohol use, opioid use, stimulant or other substance use, depression or anxiety, trauma-related, co-occurring) across, cell = approval rate and count. Click a cell to list the cases (approved and denied) and the reasons. Second matrix: payer by program (IOP, PHP, residential, detox). Third: payer by request type.
6. **Denial reasons:** Pareto of reasons with a preventable flag, then reasons by payer and by diagnosis group. Click a reason to see the cases.
7. **Length of stay and units:** requested versus approved days or units by payer and level of care (partial approvals).
8. **Process health:** retro-authorizations (a sign of missed authorizations), time from referral to approved start, requests per month (workload), appeals and peer-to-peer outcomes.
9. **Site comparison** (only when the viewer can see both): Site A against Site B on the headline figures.
10. Every figure is computed from one case-level dataset (`src/data/decisions.ts`) so a chart, its table and its case list always agree. The dataset reproduces the existing headline numbers for "Both sites, this quarter" (71% approval, 311 denials of 1,070 decisions, payer rates, denial reason counts) so CONVENTIONS.md stays true.

## 12. Right-hand side panels (pop-ups) where they save space

Use one right-hand panel pattern (the existing `Drawer`, Escape closes one layer at a time, panels can stack: a case quick view opened from a payer panel). Where: Dashboard row quick view (exists); Authorizations queue row quick view; Case Manager tracker row quick view; Denial Intelligence **Open denials** (the list becomes a panel opened from the header, so the page is one column); Eligibility result details; New case "View full verification details" and "Authorization history"; Analytics payer panel, matrix cell case list, reason case list and case summary. A panel shows a summary first and a button to open the full page. Centered modals stay for confirmations only.

# Round 5: Payer Workflow Studio (the Payers tab)

Source: the uploaded brief "PsyFlo | Payer Workflow Studio, Claude implementation brief" (7 pages, October 2026). This section is the review of that brief, the decisions we made, and the contract the agents build against.

## 13. What the brief asks for, in one paragraph

Turn the Payers tab into a Payer Workflow Studio: a visual, saved, conditional workflow builder per payer (palette on the left, canvas in the middle, contextual editor on the right), with four views inside a payer (Workflow Builder, Rules & Instructions, Test Workflow, History & Changes), central payer rules with provenance, a deterministic engine shared by the simulator and New case, validation before publishing, versions, starter templates, an optional "generate from a description" action, a payers landing page with filters, and published workflows applied in New case. Keep the sidebar name, branding and existing payer records.

## 14. Review: gaps, conflicts and the decisions

| # | In the brief | Decision |
|---|---|---|
| 1 | "AI" everywhere (AI agent nodes, "Generate Workflow with AI") | Wording stays FLO and the named agents. Agent nodes pick one of the existing agents (Reader, Criteria, Scribe, Caller, Historian and so on) or a Custom agent; "Generate workflow with FLO" is a demo draft: with no model behind the demo it builds from a library of sample drafts by matching words in the description, is labelled "Demo draft, not a live model", and is never published without a person |
| 2 | "Saved, reopen" but the demo keeps state in memory | State lives in the store and is also written to browser storage (localStorage, guarded by try/catch) so a reload keeps it. Say so on the page ("Saved in this browser. In the hosted preview, storage can be blocked: changes then last until you close the tab"). Reset demo data restores the seeds |
| 3 | Payer, product, state, service, authorization type hierarchy | Add `org`, `state` and `product` to payer records (demo: Ohio and one product each; Add payer asks for them). The workflow and rule metadata carry payer, state, product, services, request type and dates. Matching prefers the most specific; equal specificity is flagged as a conflict, never picked silently |
| 4 | Four views replace Process, Rules, Documents, Changes | Keep every capability: Process becomes the Workflow Builder (the existing step workflow is migrated into a graph, not lost); Rules and Documents (with the chart checker) become Rules & Instructions groups; Changes, the edit log, Acknowledge and Update drafts become History & Changes (button reads "Review & apply changes"). Old deep links (`?tab=process`, `rules`, `documents`, `changes`) still land on the matching new tab. Readers elsewhere (Eligibility's requirement, New case's documents, Analytics, FLO) keep reading the same payer config |
| 5 | Rule provenance and verification status | All seeded rules are demo samples: `unverified`, source "Demo sample", never a made-up URL or date a payer confirmed. User-entered rules are `unverified` until a person marks them verified with a source. Unknown or unverified rules route to manual review in the engine |
| 6 | Triggers and integrations that do not exist (payer portal, API, webhook, fax, email, task system) | Every node and trigger carries a support status: Live (backed by something real in this app, such as the eligibility check, documents, tasks), Demo simulation, or Not configured. Integration nodes show Connected only for what EMR Connect really has connected; credentials are never entered in the app ("Managed outside this app") |
| 7 | Simulator and execution must share logic | One pure engine (`runWorkflow(workflow, facts, rules)`) used by Test Workflow and by New case. No model is used for branching; conditions are structured |
| 8 | New case matching and trace | Keep the five stages. New case finds the published workflow by specificity, shows "Workflow: name vN (payer, service, request type)" with View workflow (a right-hand panel with the read-only canvas and the path so far), uses a labelled default when nothing matches, pins the version on the draft, and writes executed, skipped and pending nodes, overrides and rule references to the case history. It never forces an order on clinical steps |
| 9 | Inheritance (section 32) | Built as specificity matching plus "Starts from" (a workflow can be created from a template or another workflow and keeps a link). Partial node-level overrides are not built; it says so |
| 10 | In-progress cases and rule changes | A case keeps the workflow version it started with. A rule change lists affected workflows and open cases and needs "Review & apply" by a person; it never rewrites a submitted packet or switches a version silently |
| 11 | "Nontechnical users" and "airy" canvas | Sensible defaults, templates first, advanced fields collapsed, plain-language node titles, keyboard operation (nodes focusable, Enter opens the editor, arrow keys nudge, Delete removes with undo) |
| 12 | Sites | Workflows and rules are clinic-wide (like payers). Nothing here is site-scoped; the cases they apply to are, through New case |
| 13 | Work size | Priorities follow the brief's own phases: a truly functional core first (builder, conditions, save and load, templates, rules, engine, validation, simulator, New case), then the extras (generation demo, integrations labels, impact analysis) |

## 15. The contract (what each agent can rely on)

`src/data/workflow/types.ts` (written by the lead) defines the shared types: stages, node kinds and categories, node and edge, conditions and operators, case facts, the run result and trace, rule records with provenance, workflow, version, match result and the field spec the contextual editor renders. Read it first. Folders: `src/data/workflow/` (types, catalog, templates, seeds, rules, engine, validate, match, impact: owner ENGINE), `src/store/workflows.ts` (store slice and persistence: ENGINE), `src/pages/payers/studio/**` (builder and test: STUDIO), the rest of `src/pages/payers/**` (landing page, workspace shell, Rules & Instructions, History & Changes and the existing payer flows: PAYERS), New case and Case Manager integration (CASES).
Exports each agent provides to the others:
- ENGINE: `NODE_CATALOG`, `nodeDef(kind)`, `TEMPLATES`, `workflowFromTemplate(templateId, meta)`, `SEED_WORKFLOWS`, `SEED_RULES`, `runWorkflow(workflow, facts, rules)`, `validateWorkflow(workflow, rules, integrations)`, `matchWorkflow(facts, workflows)`, `defaultFactsFor(payerId, service, requestType)`, `impactOfRuleChange(...)`, `autoLayout(nodes, edges)`, and the store: `useStore` state `workflows`, `workflowVersions`, `payerRules` with actions `createWorkflow`, `duplicateWorkflow`, `saveWorkflowDraft`, `publishWorkflow`, `archiveWorkflow`, `restoreWorkflowVersion`, `saveRule`, `markRuleVerified`, and selectors `selectPayerWorkflows(payerId)`, `selectWorkflowById(id)`, `selectPayerRules(payerId)`.
- STUDIO: `WorkflowBuilderTab({ payerId })`, `TestWorkflowTab({ payerId })`, `WorkflowCanvas({ workflow, readOnly, runState?, onChange? })` (also used read-only by New case through `WorkflowViewPanel({ workflowId, version?, trace? })`), `NodeLibrary`, `NodeConfigurationPanel`, `WorkflowSelector`.
- PAYERS: `PayersLandingPage`, `PayerWorkspace` (four tabs), `RulesInstructionsTab({ payerId })`, `HistoryChangesTab({ payerId })`.
- CASES: matching and trace in New case (`pages/newcase/**`), the "Workflow" chip and View workflow panel, history lines, and a line on the Case Manager case page.

## 16. Round 5 changelog: Payer Workflow Studio

Payers keeps its sidebar name, its six payer records and everything that already worked (acknowledge a change, review and apply it to open drafts, the Case Manager tag, the chart checker, the edit log, Edit payer, Add a payer, Historian's suggestions). What changed:

- **Landing page** at `/payers`: search, filters for state, insurance type and workflow status, Add payer (organization, product, state), and a table with product and state, published and draft workflow counts, last update, publication status and "Change waiting".
- **Workspace** at `/payers/:id` with four tabs: Workflow Builder, Rules & Instructions, Test Workflow, History & Changes. The old Process, Rules, Documents and Changes tabs map onto them. The old step-by-step editor is kept as a read-only "Earlier process view (migrated)"; every old process was migrated into a published graph workflow, so nothing was lost.
- **Workflow Builder**: node library (triggers, verification, clinical documentation, conditions and branching, payer rules, actions, agent steps with prompts and a variable picker, integrations that say Live, Demo simulation or Not configured), canvas (pan, zoom, drag, connect, branch, duplicate, delete, undo and redo, tidy, fit, keyboard operation), a step editor with a condition builder, branches, document checklist, prompt editor and rule picker, templates, "Generate with FLO" (a demo draft, no model), draft and published and archived states, version history with restore, validation that blocks publishing.
- **Rules & Instructions**: eight groups with provenance (source, effective dates, last verified, owner, version, verification status). All seeded rules are demo samples and Unverified. A rule becomes Verified only when a person gives a source and a date. Edits need a reason and bump the version.
- **Test Workflow**: a fictional case form with eight presets, one engine shared with New case, an animated path, rules read, warnings, the outcome sentence and "Fix in builder".
- **History & Changes**: the pending payer change with its impact on workflows and open cases (it never rewrites a submitted packet or switches a case's workflow version), workflow versions, edit audit by area, Historian suggestions.
- **New case** matches the most specific published workflow (payer, state, product, service, request type, effective dates), shows "Workflow: name · vN", View workflow and Trace, uses a labelled default when nothing matches, shows both names when two match equally, pins the version when the case moves on, offers "Review newer version" and writes the trace to the case history. The blocking rules from round 4 are unchanged: the workflow informs and warns.
- **Saved in this browser**: workflows, versions, library rules and each payer's saved page persist in localStorage (guarded). A change waiting and the cases and drafts it acts on start over on reload, and Reset demo data restores every seed.

Limits, said plainly in the demo: no live payer rules or policy sources, no live portal, fax, email, API or webhook integrations, "Generate with FLO" is a keyword-driven sample draft, partial node-level overrides are not built, and browser Back cannot be intercepted by the unsaved-changes guard.

## 17. Round 6 changelog: less text, one type scale, merged tabs

What the user asked: remove the text that explains, teaches or repeats; smaller cards and more white space; one consistent font size scale; and specific changes per tab. What changed:

- **Everywhere**: one type scale (24, 18, 16, 14, 13, 12, 11 px), smaller card padding and stat tiles, "New Case" capitalized, explanatory subtitles removed or moved into an (i). History on Authorizations and Denial Intelligence is one list with standard flags on the right: Agent, Decision, Logged decision, Scheduled.
- **Dashboard**: the table has no title or ordering sentence; Lifecycle and Do next have no subtitles; the headline has no sub line.
- **Authorizations**: three tabs (Recommended actions; Clinical picture & draft with the draft in the main column and a clinical rail beside it; Criteria & risk with criteria met, approval chance, the biggest risks and each criterion's evidence, the breakdown in a pop-up). A compact multi-screener chart (checkbox per screener, Add screener, View results), modelled on the user's Blueprint example. Logged decisions folded into History. Status narration replaced by a status pill, an Integrity chip and the Send button's state.
- **Frameworks**: ASAM Criteria for substance use and co-occurring conditions, LOCUS for adult mental health only, CALOCUS-CASII under 18; payer licensed criteria (InterQual, MCG) stay the payer's criteria. Four demo cases are mental health only and show LOCUS.
- **New Case**: four steps; Intake is patient onboarding (date of birth with computed age, sex, payer, plan type, member ID, level of care, request type, start date, primary diagnosis; secondary insurance, clinician and NPI, guardian and referral source folded under More); three ways to bring a record in on Intake and Clinical documentation (Pull from EMR, Import a file with field mapping, Paste a screenshot), also on Eligibility Verify, EMR Connect and a denial letter; authorization preparation is the last section of Clinical documentation; the notes the user named are gone.
- **Eligibility & Benefits**: no headline card, four one-line verdict figures, Verify a patient in the title row, no header box or instructions on Verify, one verdict block on the result.
- **Denial Intelligence**: opens on a dashboard of open denials (figures that filter, payer chips, sortable table); each denial on its own page with Your options first and the step under way shown inside its option; the headline card and the duplicate top card are gone; the framework card has a pop-up per dimension; History with flags.

Limits: the screenshot reading and the file import are simulated in this demo (deterministic sample readings, nothing leaves the browser); an imported insurance card carries no date of birth.

## 18. Round 7: Case Manager merged into Authorizations

The user asked to combine Case Manager and Authorizations into one tab and to touch nothing else. The audit, the comparison table, the decisions and the full implementation report are in `AUTHORIZATIONS-CONSOLIDATION.md`. In short: the sidebar has Authorizations with All Authorizations, New Case and Eligibility & Benefits, and no Case Manager; `/authorizations` is one workspace with view chips (All, Needs attention, In progress, With the payer, Approved, Denied, Reviews this week), filters, and one table in which every request is one row with its own status, next action, deadline, owner, approval chance and action; approved authorizations keep their units, window and reviews; Reviews this week keeps Draft all due reviews, Sign all clean drafts and the review drawer; saved drafts, accepted denials and open denials are rows too. Old `/manager` links redirect. New Case, Eligibility & Benefits and every other tab are unchanged, apart from four navigation labels that named Case Manager. No page subtitle was added, to keep round 6's decision.
