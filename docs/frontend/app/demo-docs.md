# Demo Routes (`src/app/demo/`)

Clickable, mock-data-only demo of the Psyflo prior-authorization cockpit. Built for the Harbor Behavioral Health design-partner demo; see `docs/prior-auth/` for the research and PRDs it implements.

## Structure

```text
src/app/demo/
├── layout.tsx                 # Wraps every route in DemoShell (sidebar, top bar, Ask panel)
├── page.tsx                   # Redirects to /demo/today
├── ~lib/                      # Shell: nav config, sidebar shell, top bar, Ask Psyflo sheet
├── today/                     # Coverage hero by cause, uncovered patient list, needs-me queue, agent feed
├── eligibility/               # Rolling 7-day verification run, exceptions, member detail sheet, checks settings
├── authorizations/            # Board (lifecycle tiles, filters, table)
│   ├── [id]/                  # Patient detail: two clocks, attendance chart, history, side panel
│   └── new/                   # Five-step request wizard with clinician sign-off gate and agent submission
├── renewals/                  # Renewal radar lanes, lead-time table, week plan
├── denials/                   # Denial queue, validity/route sheet, heatmap, prevention rules
├── appeals/                   # Appeals list; [id]/ appeal workspace (timeline, letters, packet, sign & send)
├── payers/                    # Payer scorecard, trend, denial mix, partials, policy changes
├── leakage/                   # Leakage waterfall by cause, clinician time, care continuity
└── agents/                    # Agent roster, runs with questions to human, guardrails, vault, integrations, audit trail
```

## Patterns

- `page.tsx` files are server components that only render a `~lib/*-client.tsx` component (wrapped in `Suspense` when the client reads search params). Dynamic routes await `params`.
- All data comes from `@/lib/demo/*` (see `docs/frontend/lib/demo-docs.md`); all session interactions go through `useDemoStore`; feedback via `sonner` toasts.
- Shared visual language via `@/lib/demo-ui/*`. Status colours are semantic: green covered/approved, amber partial/attention, red exhausted/denied/overdue, violet sign-off, blue in flight, cyan Medicare-first.
- Every outbound action (request, renewal, appeal) ends at a sign-off step; agent runs are simulated with `LiveRun`.
- The demo is unauthenticated and outside the dashboard layouts on purpose; `src/middleware.ts` returns early for `/demo/*` so no Supabase session is created, and the demo must never import database or auth modules.
- Dates in the UI are relative to `DEMO_TODAY` (21 Sep 2026), not the wall clock, so the story holds on any real date.
- Session-only overrides (a denial routed to P2P, an appeal signed, a policy acknowledged) live in `useDemoStore` or component state and are layered over the read-only dataset in each route's `*-helpers.ts` / `*-model.ts`.
