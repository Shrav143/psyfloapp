# Psyflo prior-auth demo

A clickable, interactive front-end demo of **Psyflo**: AI-native prior authorization, utilization review, documentation and denials for behavioral-health and SUD programs. All data is invented, and no clinic is named. Nothing is sent anywhere.

Stack: Vite 8, React 19, TypeScript (strict), Tailwind CSS v4, react-router-dom 7 (HashRouter), zustand 5, lucide-react. The production build is one self-contained `dist/index.html`.

## Run it

```bash
cd demos/prior-auth-demo
bun install            # or npm install
bun run dev            # http://localhost:5173
bun run build          # typecheck + build to dist/index.html (open it by double-click)
```

## What is in it

| Sidebar | Route | What you can do |
|---|---|---|
| Dashboard | `/dashboard` | The cockpit. **Lifecycle** chips (Awaiting sign-off, Submitted, Decision pending, Info requested, Denied / appeal) filter the table, and two arrow chips (Active, Renewal due) open Authorizations with the same filter. **Do next** lists the few things to do now, each with one button, computed from today's demo data. One table of authorizations shows days in state (with the payer's median and a flag when a Medicaid managed care decision passes the CMS 7-day time), units, window, next action and owner; a row opens a right-hand quick view with the demo controls that make the payer answer |
| Authorizations | `/authorizations`, `/authorizations/case/:id` | One workspace for every authorization, from preparation to the payer's decision and the approved authorization's reviews (Case Manager is part of it). View chips with counts: All, Needs attention, In progress, With the payer, Approved, Denied (the last four add up to All) and Reviews this week. Search (patient, request ID, payer), payer, service, request type, deadline, and More (owner, status, the Cardinal payer signal). One table: patient and request, status (units used on approved authorizations), next action, deadline, owner, approval chance, and the row's own action (answer, review and sign, open or sign the review, start the reauthorization, open the denial, continue a draft). A row opens a quick view; Reviews this week has Draft all due reviews and Sign all clean drafts. The case page opens on the next action, then the facts, three tabs (Recommended actions, Clinical picture & draft, Criteria & risk) and History with flags; an approved authorization with no open request opens its summary (window, units, reviews, next step, history). `/manager` links land on the matching view |
| Authorizations > New Case | `/authorizations/new`, `/authorizations/new/:draftId`, `/authorizations/new/referral/:id` | One adaptive workflow for five **authorization types** (Initial, Concurrent review, Reauthorization / renewal, Modification / extension, Retroactive), in five steps: **Referral** (the incoming referrals, drop referral documents or use a sample, a known patient, or continue without one; a referral's checklist opens here and accepting it fills Intake; other types skip it), **Intake** (patient onboarding: initials, date of birth, sex, payer, plan type, member ID, level of care, request type, start date, primary diagnosis; a referral or a known patient; bring the record in by **Pull from EMR**, **Import a file** with field mapping, or **Paste a screenshot**), **Eligibility & Benefits** (the same verification record the standalone page uses, reused or refreshed), **Clinical documentation** (the payer's documents with the same three ways in, then **Authorization preparation**: start the agents and answer their questions), **Review & submit** (what is missing, the summary, sign and send). The published payer workflow shows under the stepper. Save as draft on every step |
| Authorizations > Eligibility & Benefits | `/authorizations/eligibility` | Coverage check: a list with four small verdict figures that filter it, Verify a patient (paste a screenshot of the card, import a file, or type it), and a result with one verdict block, its actions, then eligibility, benefits and what the service needs. **Create authorization from verification** opens New Case with the check carried over; details and History open in a right-hand panel |
| Denial Intelligence | `/denials`, `/denials/:id`, `/denials/:id/brief`, `/denials/:id/report` | Opens on a **dashboard of open denials**: figures that filter, payer chips, a sortable table, and Closed. Each denial has its own page: the header (chance of overturning, deadline, the read, Appeal analysis report), **Your options** first (peer-to-peer, written appeal, accept; the one under way shows its status inside it), what the payer said, where the denial is weak (Full summary pop-ups), the framework card (a pop-up per dimension) and **History** with flags. Add a denial letter by dropping it, pasting a screenshot or importing a file. Every denial has an **Appeal analysis report** (copy or PDF) |
| Analytics | `/analytics` | For the clinic owner. Six figures with 12-month sparklines (approval rate, denial rate, first-pass approval, decision time with the share past the CMS time, preventable denials, appeals overturned); a monthly trend; a **payer scorecard**; a **payer by case-mix** heatmap (diagnosis group, program, request type, population); denial reasons (Pareto, preventable or not); Site A against Site B. Click a payer, a cell, a reason or a month for a right-hand panel with the cases behind the number, and a case summary with a link to the case. All of it comes from one case-level dataset, so a chart and its list always agree. Demo values are labelled; no dollar figures |
| EMR Connect | `/emr` | Connection health (last sync, charts matched, failures), one **Action required** line, each system marked read only or read and write back with the write-back switch, and an **Advanced** section for field mappings and the activity log. Each site has its own clinical record system and the billing system serves both, so everything follows the site view |
| Payers | `/payers` | The **Payer Workflow Studio**. A list of payers with search and filters (state, insurance type, workflow status) and Add payer. A payer opens a workspace with four tabs: **Workflow Builder** (a drag-and-drop canvas of steps with conditions and branches, a step editor on the right, templates, save draft, validate and publish, version history), **Rules & Instructions** (eight groups of rules, each with its source, effective dates, last verified, owner and version; all demo rules are Unverified until a person marks them verified with a source and a date; documents with the chart checker), **Test Workflow** (run a fictional case through a workflow and watch the path) and **History & Changes** (the change to acknowledge, which workflows and cases it touches, workflow versions, the edit audit and Historian's suggestions). A published workflow is applied in New Case, which shows its name and version and keeps the version it started with |
| Settings | `/settings` | The sixteen agents, how much freedom each has, Pause all. A pause is felt by New Case, Check all now, Draft all due reviews and Verify. **Sites and access** (closed) shows which of the four demo roles can see which site, with a View as button for each |

Top right: **Ask FLO** (Psyflo's assistant, answers from the data), **Notifications**, and **Demo** (reset data, fast-forward the demo clock, a suggested path through the product).

## Sites and access

A clinic can run more than one site, and staff at one site must not see the other site's patients (HIPAA minimum necessary). The demo has two, **Site A** and **Site B**, and four viewers: Jordan Perez (UR coordinator, both sites, the default), Alex Morgan (clinic owner, both sites), Dr. Rivera (clinician, Site A only) and Sam Okafor (billing, Site B only). Switch viewer from **Demo > Viewing as** (or Settings > Sites and access). A viewer who may see both sites gets a **Both sites | Site A | Site B** switch in the top bar, and a small site tag beside a page title when one site is chosen; a one-site viewer gets a locked "Site A only" label, with a note on why, and no switch.

Every case belongs to a site. `siteOf(caseId)` in `src/data/sites.ts` places it, so a case is at the same site on every screen: the demo's headline cases are placed by hand, every other id by a stable hash (about 55% Site A). Every list, count, sidebar badge, chart, search, picker and answer reads the view (`useScope()`, and `sitesInView(state)` in selectors), and a link to a record at a site you cannot see opens a notice that names no patient. In the default view (Jordan, Both sites) every figure in CONVENTIONS.md is unchanged, and Site A plus Site B always add up to Both sites. Site belongs to the case, not to the payer: payers, agents and Settings are clinic-wide. EMR Connect is the one connection that follows the site, because each site has its own clinical record system and the billing system serves both.

## Suggested walk-through (about 10 minutes)

1. Dashboard: read the Lifecycle chips and **Do next**, click a chip to filter the table, open a row and use the demo controls to have the payer answer. Switch **Both sites / Site A / Site B** in the top bar.
2. Demo > Viewing as > Dr. Rivera: only Site A is visible everywhere. Switch back to Jordan Perez.
3. Authorizations > New Case: on Intake choose Paste a screenshot, Use a sample screenshot, review the fields and Apply (or Import a file, Use a sample export, map the columns); continue through Eligibility & Benefits; on Clinical documentation use the sample chart, then start the agents at the bottom, answer Scribe's question; sign as the clinician and Sign and send (demo). Find it on the Dashboard and in Authorizations. Try Concurrent review and Reauthorization with an existing patient.
4. Eligibility & Benefits: verify a patient, then **Create authorization from verification**.
5. Authorizations: pick Needs attention, then Approved and Reviews this week (open a review, Sign all clean drafts); open R-1042, apply the recommended actions and watch the chance climb; open Clinical picture & draft and toggle a screener; open I-2289 to see LOCUS instead of ASAM.
6. Denial Intelligence: the open denials dashboard, sort by deadline, open D-3318, read Your options, open the brief.
7. Analytics: click Cardinal in the scorecard, then a cell in the case-mix heatmap, then a case.
8. Payers: Cardinal, History & Changes, Acknowledge change, Review & apply changes. Summit, Workflow Builder, open "Summit initial authorization, residential", drag in a step, Test, Publish. Test Workflow, preset "Treatment plan missing". New Case with Summit Medicaid and Residential 3.5 shows the workflow in use under the stepper.

## Workflow diagrams

The diagrams also found places where the demo did less than its screens suggested. Those were fixed, and `workflows/DEMO-GAPS.md` lists each one and what it does now.

`workflows/` maps every screen, click and decision of the demo as flow diagrams, one menu tab and sub tab at a time, with one set of shapes and colours. Open `workflows/out/Psyflo-workflow-diagrams.html`, or read `workflows/README.md`.

## Code map

```
src/
  main.tsx, App.tsx          entry and routes (HashRouter)
  routes.ts                  every link in the app, so modules never hard-code each other's URLs
  index.css                  Tailwind v4 theme tokens (colors, fonts, radii)
  lib/                       cn, format (percent, plurals, bands), time (the demo clock)
  data/                      shared types, agents, seed data; per-module data files
  store/                     one zustand store built from slices (core + one per module)
  components/ui/             the design kit (Button, Card, Dropdown, Drawer, Table, charts, ...)
  components/layout/         sidebar, top bar, Ask panel, notifications, shell
  pages/<module>/            one folder per module
CONVENTIONS.md              the rules the modules were built to
scripts/shot.mjs            screenshot a route of a build
```

State: one store. The Dashboard's requests are the shared spine; other modules create and change them through `submitCase`, `simulateReply`, `updateRequest` and `addEvent`. "Reset demo data" restores every slice.

## Hosted preview

`VITE_HOSTED=1 bun run build` makes a build for hosting inside a page that blocks downloads, printing and an address bar of its own. It keeps the route in memory (no `#/path` in the URL), and Export CSV, Download report, Print and Copy link say they are off in the preview instead of doing nothing. The normal build is unchanged.
