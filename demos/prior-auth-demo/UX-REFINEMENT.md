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

**Payers.** Compact rows by plan type, programs and what is needed; each payer opens with a policy status line that says the rules are demo rules, not verified against the payer's current policy; rules, documents and the key of step types are folded. Kept: edit, add, acknowledge, update drafts, the chart checker.

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
