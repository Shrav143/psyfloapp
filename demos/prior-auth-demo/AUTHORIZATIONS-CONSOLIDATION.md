# Authorizations and Case Manager: audit and consolidation

Round 7. Scope: the Authorizations workspace, the Case Manager functionality merged into it, and the smallest navigation and routing changes that the merge needs. Nothing else changes.

## 1. What exists today (from the repository)

**Authorizations** (`/authorizations`, `src/pages/authorizations/QueuePage.tsx`): the queue of 56 open requests (`QUEUE_ITEMS`, `openItems()` drops one once nothing is left for a person: sent, decided, appeal filed). Rows are grouped in three bands (Act now, Due within 24 hours, Due this week) as tiles: ID, initials and age, level of care, payer and type, status chip (Preparing, Ready to sign, With the payer, Denial route, plus Needs your input and Coverage needs a fix), deadline, the next action (`nextActionOf`, shared with the case page), approval chance, Open, quick view (`QuickView`, `?quick=`). Four figures (Urgent now, Due within 24 hours, Waiting on you, average approval chance), filters kept in the address (search, payer, request type, status, urgency, Cardinal payer signal), the payer signal banner. The case page (`/authorizations/case/:id`, `CaseRoute`) opens `CasePage` for a request and already reads the Case Manager ledger for Approved, used, left, approval end and next review (`facts.ts`).

**Case Manager** (`/manager`, `src/pages/manager/ManagerPage.tsx`), two tabs:
- *Active cases*: the tracker of 56 ledger rows (`SEED_LEDGER` plus cases sent today, `useLedgerRows`): status (Needs action, Review due, Awaiting payer, On track) as four filtering tiles, next due on the clock (`clockText`: notice, window, P2P, answer, expiry, review, decision, units, next review, step-down), units or days used and left with a meter and "Runs out before review", level of care, payer, approval chance, quick view (`CaseQuickView`), Open, sort and paging, "Updated for a payer change" and "New today" tags; above it **Being prepared** (New Case drafts saved and not sent, with status Agents working, Needs your input, Ready to sign, the run line, Continue or Review and sign, and "N sent today") and **Step-down plans** (denials accepted in Denial Intelligence). `?show=active` and `?show=renewal` come from the Dashboard's Lifecycle chips.
- *Reviews this week*: 47 continued-stay reviews (one per approved ledger case), grouped by day, with Draft all due reviews, Sign all clean drafts, the review drawer (`ReviewDrawer`, `?review=`), review status filter, and two step-down prompts.
- A ledger case with no request opens `LedgerCasePage` (case summary, authorization window, units, reviews due, next review, clock, approval chance, next step, history).

**Shared data**: one store. The queue rows, the ledger rows, the Dashboard requests, the New Case drafts and the reviews are separate slices of the same store, linked by id: 24 of the 56 queue rows are also ledger rows (the same request), 32 ledger rows are approved authorizations with no open request, 27 Dashboard requests are queue rows and 30 are ledger rows, and 6 open denials are in neither list. Every review belongs to one ledger row. Other modules link to `paths.manager()` (Dashboard Lifecycle chips and Do next, New Case back links, Eligibility, Ask FLO, the Demo menu path, notifications).

## 2. Comparison

| Feature | Authorizations | Case Manager | Consolidation plan |
|---|---|---|---|
| Authorization records | 56 open requests (queue), in three urgency bands | 56 ledger rows (24 are the same requests), plus drafts and accepted denials | One worklist derived from the same store slices, one row per request (merged by id), no new store |
| Status | Phase: Preparing, Ready to sign, With the payer, Denial route; Needs your input; Coverage needs a fix | Needs action, Review due, Awaiting payer, On track; draft states | One lifecycle status (In progress, With the payer, Approved, Denied) with the existing chip kept as the row's status pill; "Needs attention" is a separate action dimension, never added to status totals |
| Next action | `nextActionOf` (shared with the case page), specific buttons | Next due on the clock; Continue, Answer, Review and sign; Open the review | The existing logic per record: queue rows keep `nextActionOf`, drafts keep their call to action, approved rows get their review or renewal action |
| Deadlines | Due verb and time, bands | Clock kinds incl. expiry, review, units, P2P, step-down | One Deadline column (the record's own clock text) and a Deadline filter (Act now, Within 24 hours, Next 7 days) |
| Approved units and dates | On the case page only | Units or days used and left, meter, runs out before review, approval window | Under the status pill on approved rows; full detail on the case page and the ledger case page |
| Upcoming reviews | Not shown | Reviews this week, Draft all, Sign all clean, review drawer | A "Reviews this week" view of the same worklist with the bulk actions and the drawer |
| Being prepared (drafts) | Preparing queue rows | Saved drafts with the run line | Drafts are rows of In progress; a draft of a queue request stays one row |
| Step-down plans | Not shown | Accepted denials | The denial's row reads Accepted with "Plan the step-down" |
| Denials | Denial route rows, link to Denial Intelligence | P2P row | Every open denial is a Denied row with Open in Denial Intelligence |
| Quick view | `QuickView` (`?quick=`) | `CaseQuickView` | Both kept; the row opens the one that fits the record |
| Filters | Search, payer, type, status, urgency, payer signal | Search, level of care, payer, status, review status, show | All kept: search, payer, service, request type, deadline; owner, status detail and payer signal under More; review status in the reviews view; `show` from the Dashboard |
| Detail | `CasePage` with ledger facts | `LedgerCasePage` | Unchanged; the ledger page's links say Authorizations |
| Summary | Four figures | Four status tiles | One row of view chips with counts (All, Needs attention, In progress, With the payer, Approved, Denied, Reviews this week) and the average approval chance |
| Routes | `/authorizations`, `?quick=`, filters | `/manager?tab=&show=&review=`, `/active` | `/authorizations?view=…`; `/manager` and `/active` redirect with their parameters mapped |

## 3. Decisions

- The sidebar loses Case Manager; Authorizations gains **All Authorizations** (the same page as the parent). New Case and Eligibility & Benefits are unchanged.
- No page subtitle: round 6 removed explanatory subtitles everywhere, and the user asked to keep those decisions.
- The Authorizations sidebar badge stays the queue's (due today); the Case Manager badge's items are counted in Needs attention.
- Other modules are not edited. Their links to `paths.manager()` resolve to the matching Authorizations view through `routes.ts` and the `/manager` redirect. Text in other modules that still names Case Manager is listed in section 5 as a follow-up.

## 4. What was built

**Authorizations** (`/authorizations`, `AuthorizationsPage.tsx`): title, New Case; the Cardinal payer signal banner; view chips with counts (All 95, Needs attention 30, In progress 19, With the payer 36, Approved 32, Denied 8, Reviews this week 47 at Both sites); the filter bar (search by patient, request ID or payer; Payer; Service; Request type; Deadline with counts; More: Owner, Status, Cardinal payer signal; the Dashboard's "Showing Active" or "Showing Renewal due" chip); one table (Patient / request, Status with the record's own chips and, for an approved authorization, units used with a meter and "Runs out before review", Next action, Deadline, Owner, Chance, the row's own action button), sortable, 15 a page, quick views on row click. On narrow windows the Owner and Chance columns fold into the Next action and Deadline cells, and below 1100 px the status sits under the patient.

**Case Manager features carried over**: the approved-authorization ledger (Approved view, units used and left, approval window and next review on the quick view and the case page), Reviews this week (the view, Draft all due reviews, Sign all clean drafts, the review drawer, review status in the row, `?review=`), Being prepared (saved drafts are In progress rows with Continue, Answer, Watch or Review and sign; a queue request with a draft offers "Open the draft in New Case"), step-down plans (an accepted denial's row reads Accepted with "Plan the step-down"), the step-down prompts (a note on R-0873 and P-1522), "N sent today", "New today" and "Updated for a payer change" tags, the ledger quick view (`CaseQuickView`) and the ledger case page (`LedgerCasePage`), the `?show=active|renewal` filters with the Dashboard's own tests.

**Reused, not rebuilt**: `nextActionOf`, `reviewPath`, `QuickView`, `CaseQuickView`, `ReviewDrawer`, `SignDialog`, `useDraftReviews`, `useLedgerRows`, `clockText`, `nextStep`, `reviewsOf`, `runsOutBeforeReview`, `payerUpdateFor`, `draftState`, `runLine`, `dueChip`, `SignalBanner`, `StatusHelp`, `CaseRoute`, `CasePage`, `LedgerCasePage`, the UI kit. The worklist (`worklist/model.ts`) only derives rows from the store; it stores nothing.

**Routes**: `/authorizations?view=…` (new parameters `view`, `program`, `owner`, `state`, `show`; the queue's `q`, `payer`, `type`, `urgency`, `signal`, `quick` kept; `?status=` still works and is rewritten). `/manager` and `/active` redirect (`ManagerRedirect.tsx`): `?tab=reviews` and `?review=` to Reviews this week (`/authorizations?tab=reviews` does the same), `?show=` kept, otherwise All. `paths.manager()` returns the Authorizations view, so links in other modules land in the right place without editing them. `paths.authorizations(view?)` is new.

**Navigation**: the sidebar's Authorizations group has All Authorizations (highlighted on the list and on a case page), New Case, Eligibility & Benefits; Case Manager is removed; the Authorizations badge is unchanged (19). The arrow next to Authorizations is its own button: it opens and closes the group without leaving the page, the group opens by itself when you arrive on an Authorizations page and closes when you leave, as before, and in between keeps your choice, and while it is closed on one of its pages the Authorizations row is the highlighted one. The Demo menu path says "Authorizations: reviews this week". Ask FLO on Authorizations offers "What needs me today?", "What is due soonest?" and "Which reviews are due?".

**Files**: new `src/pages/authorizations/AuthorizationsPage.tsx`, `worklist/model.ts`, `worklist/useWorkRows.ts`, `worklist/ViewChips.tsx`, `worklist/WorkFilterBar.tsx`, `worklist/WorkTable.tsx`, `worklist/params.ts`, `src/pages/manager/ManagerRedirect.tsx`. Changed `src/App.tsx` (routes), `src/routes.ts`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx` (Demo path labels), `src/lib/floAnswers.ts` (Ask FLO labels and chips), `src/pages/authorizations/CaseHeader.tsx`, `CasePage.tsx` and `QueueTop.tsx`, `src/pages/manager/LedgerCasePage.tsx`. Deleted `QueuePage.tsx`, `BandCard.tsx`, `RequestTile.tsx`, `QueueFilterBar.tsx`, `ManagerPage.tsx`, `LedgerView.tsx`, `PreparingCard.tsx`, `StepDownCard.tsx`, `CaseRow.tsx`, `StepBar.tsx`, `ReviewsView.tsx`. Docs: README, CONVENTIONS, this file, UX-REFINEMENT section 18. Workflow diagrams: `workflows/src/03-authorizations` now draws the worklist (12 new diagrams replace the queue's 8), `workflows/src/07-case-manager` keeps its folder name but holds the Case Manager functions as "Authorizations › …" diagrams (20, from 25), the overview and the global shell show the new sidebar and its arrow, and every link between diagrams that pointed at Case Manager points at the Authorizations diagram that carries it (336 diagrams, every link resolved).

**Label-only changes in New Case and Eligibility & Benefits** (both under Authorizations; no layout, step or logic change): "Back to Case Manager" became "Back to Authorizations" (sent page) and the crumb "Case Manager" became "Authorizations"; "Return to Case Manager" became "Return to Authorizations" (no-authorization outcome); the draft-saved toast says "is in Authorizations"; Eligibility's "Open in Case Manager" became "Open in Authorizations". New Case still has four steps; no fifth step was added.

## 5. Not changed, and follow-ups

No change to Dashboard, Denial Intelligence, Analytics, EMR Connect, Payers or Settings. Their links to Case Manager now land on the matching Authorizations view. Some of their own text still names Case Manager and is left for a separate pass, because it belongs to those tabs:
- Dashboard: the Lifecycle info tip and the Active and Renewal due chips' screen-reader label ("Opens Case Manager"); a request drawer note ("Sign and send it from Case Manager first").
- Denial Intelligence: the accept route's line and its toast and notification ("Case Manager adds a step-down plan").
- Payers: the Update drafts text and toasts ("Each returns to Case Manager for a new signature").
- Settings: a pause effect line ("Draft all due reviews in Case Manager waits").
- Workflow Studio catalog: the step name "Update Case Manager".
- Dashboard: the "Open Active cases" link label.
- Denial Intelligence and the "Denial closed" notification link to the Authorizations list (All), not straight to the Denied view; Payers' "Drafts updated" notification opens the list in the last view used.

## 6. Build and tests

`tsc --noEmit` is clean, and `vite build` and the hosted build both succeed (one 2.7 MB file). The browser regression ran on a build of the pushed code and passed every suite:
- Workflow engine unit checks: 1,124.
- Round 7 worklist checks:
  - views, counts and sites, with A + B = Both in every view
  - filters, legacy addresses and redirects
  - quick views, drafts and denials
  - no horizontal scroll at 1440, 1280 and 1024 px
- Moved behaviors:
  - accepting a denial gives an Accepted row with "Plan the step-down"
  - Draft all, Sign all clean, then signing one review books the next one
  - the Dashboard's Active (40) and Renewal due (19) chips land on the same rows
- Unchanged tabs: Authorizations case pages, New Case, Eligibility & Benefits, Denial Intelligence, Dashboard, shell and sites, EMR Connect, Analytics, Payers and Workflow Studio.
- The hosted demo inside a sandboxed frame.

Tests that pointed at the removed screens were moved to the merged worklist; the old Case Manager suite was retired, because those checks now run against Authorizations.
