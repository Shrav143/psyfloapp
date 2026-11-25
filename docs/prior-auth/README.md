# Psyflo Prior Authorization — Research, PRDs and Demo

This folder is the hand-off package for designing the Psyflo prior-authorization platform.

## Read in this order

1. `research/00-research-synthesis.md` — the end-to-end process, leakage causes, segments, what the demo must prove.
2. `research/tracy-call-transcripts.md` — cleaned transcripts of both Tracy Cosker calls with verbatim quotes.
3. `research/competitor-landscape.md` — 58 vendors, deep dives on the demoed products, feature matrix, pricing, UI patterns to borrow.
4. `prd/_brief.md` — the shared brief every PRD assumes (principles, personas, glossary, template).
5. The PRDs:

| # | PRD | Product line |
| --- | --- | --- |
| 01 | `prd/01-platform-overview-and-architecture.md` | Strategy, IA, roadmap, pricing hypotheses |
| 02 | `prd/02-eligibility-and-benefits-verification.md` | Eligibility & benefits verification |
| 03 | `prd/03-prior-authorization-lifecycle.md` | Request → decision → ledger → renewal |
| 04 | `prd/04-denials-management.md` | Denials: validity, route, deadline, P2P |
| 05 | `prd/05-appeals.md` | Appeals workspace, receipt confirmation, decision clocks |
| 06 | `prd/06-payer-intelligence-and-rules-engine.md` | Rule tuples, policy watch, observed scorecard |
| 07 | `prd/07-ai-agents-and-automation.md` | Agents, guardrails, sign-off gates |
| 08 | `prd/08-analytics-leakage-and-ask.md` | Today, leakage waterfall, Ask Psyflo |
| 09 | `prd/09-integrations-and-data-model.md` | EHR/portal integration tiers, canonical data model, HIPAA |
| 10 | `prd/10-demo-walkthrough-for-tracy.md` | The six-minute script for Monday |

## The clickable demo

`apps/frontend` → `/demo` (redirects to `/demo/today`). Mock data only, no backend, every button does something. Run locally with `bun run dev` from the repo root and open `http://localhost:3000/demo`.

Routes: `/demo/today`, `/demo/eligibility`, `/demo/authorizations`, `/demo/authorizations/[id]`, `/demo/authorizations/new`, `/demo/renewals`, `/demo/denials`, `/demo/appeals`, `/demo/appeals/[id]`, `/demo/payers`, `/demo/leakage`, `/demo/agents`. Data engine: `apps/frontend/src/lib/demo/` (documented in `docs/frontend/lib/demo-docs.md`).
