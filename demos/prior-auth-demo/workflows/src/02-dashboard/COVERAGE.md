# Dashboard: coverage

Source: `src/pages/dashboard/*` (DashboardPage, Lifecycle, DoNext, CasesTable, TableControls, caseRows, lifecycle, sort-rows, helpers, the request drawer files), `src/lib/doNext.ts` (next action, owner, CMS clock, the Do next list), `src/lib/floFacts.ts`, `src/lib/ledgerFacts.ts` (Active, Renewal due, Units, Window), `src/lib/floScope.ts` and `src/lib/scope.ts` (sites), `src/store/core.ts`, `src/store/selectors.ts`, `src/store/queue.ts` (due times), `src/store/emr.ts`, `src/store/agentSettings.ts`, `src/components/ui/*` (Dropdown, InfoTip, Drawer). Round 4: the cockpit redesign. Checked by clicking through a private build at `#/dashboard` as Jordan Perez (Both sites, Site A, Site B), Dr. Rivera and Sam Okafor, at 1440, 1280, 1024 and 768 px.

Files (all in this folder):

| File | Nodes |
|---|---|
| 10-arrive-on-the-dashboard | 33 |
| 11-title-and-quiet-line | 18 |
| 12-check-all-now-and-the-demo-clock | 23 |
| 13-do-next-what-to-do-now | 29 |
| 14-do-next-how-the-list-is-chosen | 22 |
| 20-table-menus-and-needs-me-today | 21 |
| 40-clear-filters-and-empty-states | 20 |
| 50-lifecycle-click-a-state | 20 |
| 51-lifecycle-active-and-renewal-due | 16 |
| 60-requests-table-order-rows-and-paging | 25 |
| 61-requests-table-read-a-row | 23 |
| 62-requests-table-sort-the-rows | 20 |
| 63-requests-table-days-in-state-and-cms | 22 |
| 65-sites-what-each-site-sees | 20 |
| 70-request-drawer-open-and-read | 23 |
| 71-request-drawer-check-now-open-case-closing | 25 |
| 72-request-drawer-needs-you-boxes | 28 |
| 73-approve-the-write-back | 20 |
| 80-answer-a-payer-information-request | 33 |
| 85-demo-controls-the-payer-answers | 28 |
| 86-demo-controls-approve-part-or-deny | 21 |

The page, top to bottom: a small title and one quiet line (with 'Check all now' on the right), the **Lifecycle** card (five state chips that filter the table, two links that open Case Manager), the **Do next** card (at most five sentences, one button each, 'Suggested by FLO from today's demo data'), and one **table** card ('40 authorizations', one quiet sentence, 'Needs me today' and four menus, nine columns). White cards on the warm background, one serif title and one quiet sentence per card. No key-figure tiles, no separate FLO summary card, no progress bars, no per-row icons, no dollar figures.

## Entry points

| Control | Diagram |
|---|---|
| Sidebar 'Dashboard' (badge = Info requested count at the sites in view) | 10 |
| Address `/` redirects to `/dashboard` | 10 |
| Link with `?request=ID` (notifications, 'Review answer' and 'Open request' on Do next, 'See on the Dashboard', 'Open R-xxxx') | 10, 13, 70 |
| Link with `?payer=`, `?stage=`, `?program=`, `?type=` | 10, 20, 50 |
| Bad or unknown filter values and unknown parts of the address (ignored) | 10 |
| Unknown request ID (closes after 0.2 s) | 10, 86 |
| `?request=ID` for a case at a site the viewer cannot see (out-of-site card) | 10, 65 |
| Demo menu 'Reset demo data' (lands here) | 10 |
| Demo menu 'Fast-forward 1 hour' / '1 day' (effect on this page) | 12, 63 |
| Top-bar site switcher and Demo menu 'Viewing as' (effect on this page) | 65 |

## Title and header

| Control | Diagram |
|---|---|
| Small title: '18 requests are waiting on payers. 3 are waiting on you.' and its variants (none, one, many) | 11 |
| Quiet line 'What to do now, and where every authorization stands.' (label only) | 11 |
| The title does not change with the menus or chips; it follows the sites in view | 11, 65 |
| 'Check all now' (spinner, toast; counts the open requests in view) | 12 |
| 'Check all now' disabled and the link 'Navigator is paused in Settings' | 12 |

## Lifecycle

| Control | Diagram |
|---|---|
| Card title, quiet sentence, info icon 'What the states count' | 50 |
| Chips 'Awaiting sign-off', 'Submitted', 'Decision pending', 'Info requested', 'Denied / appeal': counts and the quiet line under each | 50 |
| A chip is a button: click, Enter, Space; green outline and pressed; a second click clears | 50 |
| A chip sets the Status filter, writes `?stage=` and shows in the Status menu | 50, 20 |
| Counts follow Payer, Program and Request type and the sites in view, never Status | 50, 20 |
| 'Decided today' (6 approved, 2 denied) is not a chip: it is in the Status menu and in `?stage=decided` | 50, 20 |
| Cases saved in New Case count under Awaiting sign-off | 50, 60 |
| 'Active' and 'Renewal due' (links with an arrow to Case Manager, counts of ledger cases, not table rows) | 51 |
| Case Manager opens with `?tab=cases&show=active` or `show=renewal`; the row count there equals the chip; 'Clear filters' drops `show` | 51 |
| Active and Renewal due follow the sites in view | 51, 65 |

## Do next

| Control | Diagram |
|---|---|
| Card title and 'Suggested by FLO from today's demo data' (label only) | 13 |
| A row: one sentence and a quiet line (who, what, when); terracotta only inside 6 hours or past | 13 |
| 'Review and sign' (Review and sign R-0988) and 'Answer Scribe' / 'Answer Packet': open the draft in New Case at the step that fits | 13 |
| 'Review answer' (a payer's question) and 'Open request' (chase a late payer) and 'Approve write-back': open the request drawer | 13 |
| 'Open denial' (peer-to-peer in 36 h): opens the denial in Denial Intelligence | 13 |
| 'Start renewal': opens New Case as a Reauthorization for that patient | 13 |
| 'Open Active cases' (cases saved in New Case that wait for a person) | 13 |
| '2 more need you today.' and 'Show them in the table' (turns 'Needs me today' on and scrolls to the table) | 13 |
| Empty card 'Nothing needs you right now.' | 13 |
| What can be on the list, the order, the five-row limit, the CMS-past rule | 14 |
| The list names only cases at the sites in view | 14, 65 |

## Table card

| Control | Diagram |
|---|---|
| Title 'N authorizations' and one quiet sentence (filters, sort) | 60, 20 |
| 'Needs me today' toggle (pressed, outlined, 'Needs you today.') | 20 |
| 'All payers', 'All programs', 'All statuses', 'All request types' menus: open, each option, pick; green and bold when not 'All' | 20 |
| Status menu with the six states and their counts (5, 4, 14, 3, 8, 8) | 20 |
| Menu keys: ArrowDown, ArrowUp, Enter, Escape; click outside; click the button again | 20 |
| 'Clear filters' (header) and in the empty state | 40 |
| Empty states 'No authorizations match' and 'Nothing needs you today' | 40 |
| Default order (needs you today first, then the longest in state) | 60 |
| Nine columns: Case, Payer, Service, Status, Days in state, Units, Window, Next action, Owner | 60, 61 |
| Every heading sorts (click, Enter, Space; ascending, descending, off) | 62 |
| Row click and the case ID button (one history entry) | 60 |
| 'Show 8 more', '32 not shown', 'Showing 8 of 40', paging reset | 60 |
| Line 'N more are being prepared in New Case' and 'Open Active cases' | 60 |
| Case cell: ID, initials and age | 61 |
| Units '48 → 10' and Window 'Sep 22 – Oct 20' from the Case Manager ledger; a quiet dash with no approval | 61 |
| Status words, Next action verbs, Owner (You, an agent, the payer) | 61 |
| Days in state, 'median 2 d', ochre and terracotta numbers | 63 |
| CMS clock: 'Day 5 of 7', 'Past 7 days' flag, the info icon and its note | 63 |
| Text columns wrap under 1400 px so all nine fit at 1280 | not drawn (layout) |

## Request drawer

| Control | Diagram |
|---|---|
| Header, chip, facts, 'Decision time' row (CMS clock, day 5 or later), chance row, History, 'Details' (closed) with Sent and Checks (all messages) | 70 |
| 'Close' (X), Escape (one layer at a time), dimmed area, browser Back | 71 |
| 'Check now' (hidden for Awaiting sign-off) | 71 |
| 'Open case' | 71 |
| 'Open in Denial Intelligence' (denials only) | 71 |
| Box 'Needs your input' + 'Review the answer' | 72, 80 |
| Box 'Packet is drafting the answer' + 'Check on the draft' | 72 |
| Box 'Approved. Write-back waits for you' + 'Approve write-back' (only while write-back is on in EMR Connect) | 72, 73 |
| Calm line 'Write-back is off for your records system.' + 'Turn it on in EMR Connect.' | 72 |
| Answer pop-up: 'Not yet', 'Sign and send answer', X, dimmed area, Escape (closes only the pop-up) | 80 |
| Answer pop-up content for Residential 3.5, PHP, IOP, Detox | 80 |
| Write-back pop-up: 'Cancel', 'Write to the EMR', X, dimmed area, Escape, busy state | 73 |
| Demo controls: blocked for Awaiting sign-off, for denials and for a decided request | 85 |
| Which replies are offered in Submitted, Decision pending and Info requested | 85 |
| 'Payer received it' (never offered: every sent request is already Submitted) | 85 |
| 'Under review', 'Asks for information' (toast names the payer: 'Demo: Cardinal ...') | 85 |
| 'Approves' | 86 |
| 'Approves part', 'Denies' (new D- number, drawer switch) | 86 |

## Not drawn

- Hover and focus styling: row tint, chip hover tint, menu cursor highlight. No behaviour change.
- Window resizing: the Lifecycle chips wrap (the two ledger links together) under about 1400 px, the table's payer, status and next-action text wraps under 1400 px, and under about 1100 px the table scrolls inside its card; the page itself never scrolls sideways.
- The FLO panel and the notification bell are Global shell. Their links into this page are shown only as entry points.
- 'No events yet.' in History: no request has an empty history, so it cannot be reached (noted in 70).
- Case Manager (what its tracker shows after `show=`), New Case, Denial Intelligence and the case page: only `goto` nodes.
- The wording of the amount in the Window column for IOP: units are turned into days at the demo's own rate (24 units cover 14 days). It is a derived demo date, not a payer fact.

## Gaps found earlier and now fixed

- Clicking the case ID pushed two history entries. It now pushes one (60).
- The toast after a demo reply read 'Demo: payer payer received it'. It now names the payer, for example 'Demo: Cardinal approved it' (85, 86).
- 'Payer received it' after 'Approves' left the request counted in Decided today. A request now only moves forward, so only the replies still ahead of it are offered (85, 86).
- A case being prepared in New Case never counted under Preparing (50, 11).
- The write-back box ignored the EMR Connect switch (72, 73).
- 'Check all now' ignored the Settings pause (12).
- Escape with a pop-up open in the drawer closed both layers. It now closes one layer at a time (71, 73, 80).

## Round 4 notes (2026-10-22, the cockpit redesign)

- Removed from the page: the four tinted key-figure tiles (Needs you, Due within 24 hours, Waiting on payers, Denials to act on), the separate 'Summary from FLO' card (its content is now Do next), the helper paragraphs under the card headers, the four progress bars and the chip in each row, the agent badge in each row, the 'Open' button in each row, the 'Needs you / Due within 24 hours / Waiting on payers' groupings in the Stage menu, and the big white page-header card (the title now sits on the canvas). Deleted diagrams: Headline and sub line (11), Summary from FLO (13), Filter menus (20), Key figures (50).
- Names changed with the redesign: the Stage menu is the **Status** menu and its entries use the Lifecycle's words: Awaiting sign-off (was Preparing, 5), Submitted (was Received, 4), Decision pending (was Under review, 14), Info requested (3), Decided today (8: 6 approved, 2 denied), Denied / appeal (was Appeal or call, 8). The counts and the `?stage=` keys (`preparing`, `received`, `under_review`, `info_requested`, `decided`, `appeal`) are unchanged.
- 'Decided today' is not a chip: the five chips plus Active and Renewal due already fill the row at 1440 px. It stays in the Status menu and in `?stage=decided`, and the Active chip's quiet line says how many approvals came in today.
- The title still reads '18 requests are waiting on payers. 3 are waiting on you.' in the default view. 'Waiting on you' counts questions waiting on a person (a payer's question, an agent's question, a saved case that waits). 'Needs me today' also counts a request ready to sign, a write-back to approve, a late payer to chase and a denial deadline inside 2 days, so it is a longer list on purpose.
- Active (approved, units left, not ended) and Renewal due (review due, or ending within 7 days) are counted on the Case Manager ledger. Case Manager reads the same two tests (`src/lib/ledgerFacts.ts`), so the row count there equals the chip.
- The date range, the payer table, the stage help and `?focus=payers` were already gone in round 3. The `?from=`, `?to=` and `?period=` links are still ignored.

## Left as it is

- Drawer 'Check now' and the line 'Next automatic check in ...' do not read the Settings pause; only 'Check all now' does (71, 12).
- The sort is not kept in the address, so a shared link opens in the default order (62). The same goes for 'Needs me today'.
