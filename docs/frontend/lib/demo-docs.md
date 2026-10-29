# Demo Data Engine (`src/lib/demo/`) and Demo UI (`src/lib/demo-ui/`)

Architecture overview for the seeded, deterministic dataset behind the Psyflo prior-authorization demo (`/demo/*`). No API, no database: everything is generated in memory once per process and derived at render time.

## Design

- **Deterministic seed.** `seed.ts` holds a small PRNG (`createRng`) seeded with a constant, so every load produces the same 60 patients, versions and visits. Numbers on screen never drift between runs, which matters for a scripted demo.
- **Bucket-first generation.** `bucketForIndex` fixes which coverage bucket each of the 60 patients lands in on the demo "today" (45 covered, 6 awaiting decision, 4 units exhausted, 2 window expired, 2 denied-in-appeal, 1 no auth). `seed-auths.ts` generates a realistic version chain per patient from intake to today (decisions drawn from the payer rate tables; denials handed to `seed-denial.ts`, which runs the peer-to-peer and written appeal and always resolves them in the past). `seed-shape.ts` then forces the chain's final state to match the bucket and re-syncs the version's events; the denied bucket lives in `seed-shape-denied.ts` (odd MRN: appeal under review, even MRN: appeal packet awaiting sign-off). `seed-base.ts` holds the shared generator context and `baseVersion` factory. This is how the Today screen lands on "45 of 60" while the history stays statistically calibrated.
- **Nothing dated in the future.** Generated denials are never decided in the last 40 days (recent adverse outcomes are placed explicitly by the buckets and stories), so no version, event or appeal filing carries a date after `DEMO_TODAY`.
- **Immutable ledger.** An `Authorization` owns `versions[]` (initial, renewal, p2p, appeal) and `events[]`. Nothing is edited in place; stories append.
- **Derived, not stored.** `derive.ts` computes coverage per visit (`coverageOn`, including "still covered by the previous approval while a renewal is denied or pending"), the two clocks (`clocksFor`: units used/remaining, days elapsed/remaining, exhaustion date, binding clock, file-by date, stranded units), renewal lanes and human labels. Screens call these; they never store results.
- **Stories over statistics.** `stories.ts` holds the story MRN registry and the four-renewals patient; `stories-today.ts` hand-places the single-patient stories (hero two-clocks patient, overdue renewal, missing document, dual-eligible, fast approval, MRN typo, renewal denied while the window is still active). `dataset.ts` applies them after generation and tunes renewal lanes.
- **Feature modules** build on the dataset: `eligibility.ts` (this morning's rolling 7-day run with exception rows), `denials.ts` (PA denials from the ledger over 180 days with appeal filing/receipt/decision dates, plus claim-level fixtures), `appeals.ts` + `appeal-parts.ts` + `appeal-types.ts` (appeal cases with timeline steps, three-part packets, reasoning cards, call transcript), `agents.ts` + `agent-runs.ts` (roster, submission script, recorded runs, integrations), `analytics.ts` (payer scorecard, trends, denial mix, partials), `leakage.ts` (leakage waterfall, clinician time, sparkline, today's coverage), `payers.ts` + `policy-changes.ts` (payer definitions, rate tables, policy watch feed), `ask.ts` (canned ledger-backed answers).
- **Session state** lives in `store.ts` (zustand): site filter, sign-off queue, signed/submitted ids, acknowledged policies, answered agent questions, Ask panel state, lead-time buffer. Nothing persists.

## Common tasks

- **Change a demo number:** adjust the rate tables in `payers.ts` (`FIRST_PASS_BY_QUARTER`, `PARTIAL_BY_QUARTER`) or a story in `stories.ts` / `stories-today.ts`; then print `coverageOn` counts per patient with a short `bun run` script against `getDataset()` and confirm the 45/6/4/2/2/1 split still holds.
- **Add a screen:** read from `getDataset()` and the derive/analytics helpers; put page-specific components in the route's `~lib/`; never mutate dataset objects from the UI (use the store).
- **Add a payer rule:** `payers.ts` (`PAYERS`). **Add a policy change:** `policy-changes.ts` (`POLICY_CHANGES`).
- **Add a story:** append versions/events in `stories-today.ts`, register the MRN in `STORY_MRNS`, wire it by patient index in `dataset.ts`; never change the bucket of the patient you borrow.

## Demo UI (`src/lib/demo-ui/`)

Shared presentational pieces used by every demo route: `primitives.tsx` (PageHeader, Panel, StatTile, KV, EmptyState, PayerChip), `status-badge.tsx` (one status → label + tone map for authorizations, visits, eligibility, denials, appeals, agents; `StatusBadge`, `Pill`), `agent-run.tsx` (`RunSteps` static timeline and `LiveRun` scripted playback used by the wizard, appeals and eligibility).

## Constraints

Every file under 250 lines. Data files import only from each other; UI never imports seed internals (screens read `dataset.ts`, `derive.ts` and the feature modules). Dates are ISO strings; "today" is the constant `DEMO_TODAY` (2026-09-21) so the story holds on any real date.
