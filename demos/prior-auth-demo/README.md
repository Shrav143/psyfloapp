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
| Dashboard | `/dashboard` | One page: four filters (Payer, Program, Request type, Stage) and a separate calendar where you pick a start and an end day (with shortcuts) for the outcome figures. Six-stage strip, requests table with progress bars and clocks, payers at a glance, a request drawer with history, and demo controls to make the payer answer |
| Authorizations | `/authorizations`, `/authorizations/case/:id` | Queue ranked by money and time, case page with five tabs (recommended actions, clinical picture, payer criteria, risk analysis, draft). Refine recommendations and clinical context change the case; a sent request shows as sent |
| Authorizations > New case | `/authorizations/new`, `/authorizations/new/:draftId`, `/authorizations/new/referral/:id` | Four steps: **Referral** (drop the referral documents and Reader lists what is missing, or check one that already arrived, or go on without one), **Medical records** (one checklist: drop the whole chart and Reader ticks off the patient, insurance, request and documents, and names what is missing), **Agents work** (Scribe asks a question), **Review and sign**. Sign and send puts the request on the Dashboard. A referral can also be opened in full: the source document, extracted fields with evidence, validation, coverage and fit checks, and accept / request information / decline |
| Authorizations > Eligibility & Benefits | `/authorizations/eligibility` | Live-looking coverage check: list, verify a patient, verdict |
| Denial Intelligence | `/denials`, `/denials/:id/brief` | Where a denial is weak, options with chances, peer-to-peer brief, written appeal, accept |
| Case Manager | `/manager` | **Active cases**: the cases the agents are preparing (with the next action for you), then the tracker of every active case; every tracker row opens a case page. **Reviews this week**: draft all due reviews, sign, and the next review is booked |
| Analytics | `/analytics` | Performance: approval by payer, edits to drafts, denial reasons, what helps most, monthly report |
| EMR Connect | `/emr` | Connected systems, sync, field mappings, connect a system |
| Payers | `/payers` | Each payer's workflow with conditions, rules, documents with a chart checker, and changes to acknowledge |
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
  lib/                       cn, format (money, bands), time (the demo clock)
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
