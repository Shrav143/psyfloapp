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
| Dashboard | `/dashboard` | One page, five filters (Payer, Program, Request type, Stage, Period). Six-stage strip, requests table with progress bars and clocks, payers at a glance, a request drawer with history, and demo controls to make the payer answer |
| Referrals | `/referrals`, `/referrals/:id` | Referral dashboard (funnel, sources, weekly volume, filters, status tabs), referral detail with the source document, extracted fields with evidence, validation summary, coverage and fit checks, and accept / request information / decline |
| Authorizations | `/authorizations`, `/authorizations/case/:id` | Queue ranked by money and time, case page with five tabs (recommended actions, clinical picture, payer criteria, risk analysis, draft) |
| Authorizations > New case | `/authorizations/new` | Intake with document validation, agents working (Scribe asks a question), review and sign, Sign and send puts the request on the Dashboard |
| Authorizations > Eligibility & Benefits | `/authorizations/eligibility` | Live-looking coverage check: list, verify a patient, verdict |
| Denial Intelligence | `/denials`, `/denials/:id/brief` | Where a denial is weak, options with chances, peer-to-peer brief, written appeal, accept |
| Active Cases | `/active` | Cases the agents are preparing, with the next action for you |
| Case Manager | `/manager` | Ledger of active cases, and clinical reviews to sign this week |
| Analytics | `/analytics` | Performance: approval by payer, edits to drafts, denial reasons, what helps most, monthly report |
| EMR Connect | `/emr` | Connected systems, sync, field mappings, connect a system |
| Payers | `/payers` | Each payer's workflow with conditions, rules, documents with a chart checker, and changes to acknowledge |
| Settings | `/settings` | The sixteen agents, how much freedom each has, Pause all |

Top right: **Ask Psyflo** (answers from the data), **Notifications**, and **Demo** (reset data, fast-forward the demo clock, a suggested path through the product).

## Suggested walk-through (about 9 minutes)

1. Dashboard: read the headline, set Stage to Appeal or call, pick Cardinal in Payer, open a row, use the demo controls to have the payer answer.
2. Referrals: open the clean urgent referral, run the coverage check, accept it, start the authorization.
3. New case: use the sample chart, answer Scribe's question, sign as the clinician, Sign and send, find it on the Dashboard.
4. Eligibility & Benefits: verify a patient.
5. Authorizations: open R-1042, apply the recommended actions and watch the chance climb.
6. Denial Intelligence: D-3318, choose the peer-to-peer call, read the brief.
7. Payers: Cardinal, Changes, Acknowledge change, Update drafts. Summit, Process, Edit workflow.

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
