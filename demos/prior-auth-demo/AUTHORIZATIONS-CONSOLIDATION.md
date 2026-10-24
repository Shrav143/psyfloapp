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
