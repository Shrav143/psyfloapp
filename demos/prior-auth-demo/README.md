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
| Dashboard | `/dashboard` | One daily work list: the headline, a **Summary from FLO** (three lines computed from today's demo data, each linking to the case, Case Manager or Denial Intelligence), four figures (Needs you, Due within 24 hours, Waiting on payers, Denials to act on) that also filter the list, filters (Payer, Program, Request type, Stage) with a calendar for the outcome figures, one requests table (waiting on you first, then the nearest clock), a request drawer with history and demo controls to make the payer answer, and a closed **Payer performance** section |
| Authorizations | `/authorizations`, `/authorizations/case/:id` | Queue in three bands (Act now, Due within 24 hours, Due this week), one line per request (case and patient, program, payer, request type, status, deadline, next action, approval chance), four figures, and filters including **request type** (Initial, Concurrent review, Reauthorization, Retrospective). The case page opens on the **next action**, then the authorization facts (requested, approved, used, left, documents, who it waits on), five tabs, and a closed **History** that labels people and agents |
| Authorizations > New case | `/authorizations/new`, `/authorizations/new/:draftId`, `/authorizations/new/referral/:id` | Four steps: **Referral** (drop the referral documents and Reader lists what is missing, or check one that already arrived, or go on without one), **Medical records** (one checklist: drop the whole chart and Reader ticks off the patient, insurance, request and documents, and names what is missing), **Agents work** (Scribe asks a question), **Review and sign**. Sign and send puts the request on the Dashboard. A referral can also be opened in full: the source document, extracted fields with evidence, validation, coverage and fit checks, and accept / request information / decline |
| Authorizations > Eligibility & Benefits | `/authorizations/eligibility` | Coverage check: list, verify a patient, and a result that reads in order: eligibility with effective dates, benefits and limits, then what the service needs for authorization, with plan type and routing, the time checked and a simulated source. Cost share shows only when the plan has one |
| Denial Intelligence | `/denials`, `/denials/:id/brief`, `/denials/:id/report` | Authorization denials ordered by deadline. Each opens on one **recommended next step** (reconsideration, correct and resubmit, peer-to-peer, appeal, accept or investigate by hand) with the reasoning, the agents' work and the letter folded away and a clear line that a clinician reviews and signs before anything is sent. Where the denial is weak and the six ASAM dimensions each have a **Full summary** pop-up to copy from. Every denial has an **Appeal analysis report** (12 to 13 sections, copy or download as a PDF; D-3297 is the worked example) |
| Case Manager | `/manager` | Opens on the **tracker** of every active case: status, next due, units or days used and left, level of care, payer, approval chance, and a flag when units run out before the next review. Cases being prepared are one folded row that links to Authorizations. **Reviews this week**: draft all due reviews, sign, and the next review is booked |
| Analytics | `/analytics` | Four figures (approval rate, denial rate, turnaround, preventable denials) with filters for period, payer and program; approval by payer, preventable denials by reason, edit share and workload; detailed breakdowns folded away; monthly report. Modeled and demo values are labelled; no dollar figures |
| EMR Connect | `/emr` | Connection health (last sync, charts matched, failures), one **Action required** line, each system marked read only or read and write back with the write-back switch, and an **Advanced** section for field mappings and the activity log |
| Payers | `/payers` | Compact rows by plan type, programs and what is needed (initial request or review). Each payer's page opens with a policy status line (demo rules, not verified) and has workflow, rules, documents with a chart checker, and changes to acknowledge |
| Settings | `/settings` | The sixteen agents, how much freedom each has, Pause all. A pause is felt by New case, Check all now, Draft all due reviews and Verify |

Top right: **Ask FLO** (Psyflo's assistant, answers from the data), **Notifications**, and **Demo** (reset data, fast-forward the demo clock, a suggested path through the product).

## Suggested walk-through (about 9 minutes)

1. Dashboard: read the headline, set Stage to Appeal or call, pick Cardinal in Payer, open a row, use the demo controls to have the payer answer.
2. Authorizations > New case, Referral step: check the clean urgent referral from "Already arrived", run the coverage check, accept it and continue. Or drop the sample referral and watch Reader build the checklist.
3. Medical records and onward: use the sample chart, Continue, start the agents, answer Scribe's question, sign as the clinician, Sign and send, find it on the Dashboard. Case Manager shows it while it is being prepared.
4. Eligibility & Benefits: verify a patient.
5. Authorizations: open R-1042, apply the recommended actions and watch the chance climb.
6. Denial Intelligence: D-3318, choose the peer-to-peer call, read the brief.
7. Payers: Cardinal, Changes, Acknowledge change, Update drafts. Summit, Process, Edit workflow.

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
