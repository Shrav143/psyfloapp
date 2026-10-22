# Dashboard: coverage

Source: `src/pages/dashboard/*`, `src/lib/floFacts.ts` (the Summary from FLO), `src/store/core.ts`, `src/store/selectors.ts`, `src/store/queue.ts` (due times), `src/store/manager.ts` (ledger), `src/store/agentSettings.ts`, `src/store/emr.ts`, `src/store/cases.ts` (drafts), `src/components/ui/Disclosure.tsx`, `src/components/ui/DateRangePicker.tsx`, `src/components/ui/Dropdown.tsx`, `src/components/ui/Overlay.tsx`, `src/components/ui/escape.ts`. Checked by clicking through a build at `#/dashboard`, round 2 (one daily work list).

Files (all in this folder):

| File | Nodes |
|---|---|
| 10-arrive-on-the-dashboard | 37 |
| 11-headline-and-sub-line | 23 |
| 12-check-all-now-and-the-demo-clock | 25 |
| 13-summary-from-flo | 26 |
| 20-filter-menus | 28 |
| 30-pick-a-date-range | 29 |
| 31-date-range-shortcuts-keys-and-address | 28 |
| 40-clear-filters-and-empty-states | 23 |
| 50-key-figures-click-a-figure | 28 |
| 51-what-the-stages-mean | 21 |
| 60-requests-table-order-rows-and-paging | 27 |
| 61-requests-table-read-a-row | 25 |
| 62-requests-table-sort-the-rows | 18 |
| 70-request-drawer-open-and-read | 23 |
| 71-request-drawer-check-now-open-case-closing | 25 |
| 72-request-drawer-needs-you-boxes | 28 |
| 73-approve-the-write-back | 20 |
| 80-answer-a-payer-information-request | 33 |
| 85-demo-controls-the-payer-answers | 28 |
| 86-demo-controls-approve-part-or-deny | 21 |
| 88-payer-performance | 37 |

The page, top to bottom: headline, Summary from FLO, four key figures, filter bar, one Requests table (with 'What the stages mean' closed under it), Payer performance (closed). No banner. Round 2 replaced the six stage tiles with the four figures (50), folded the stage help under the table (51), added the summary (13), and moved 'Payers at a glance' into the closed 'Payer performance' (88).

## Entry points

| Control | Diagram |
|---|---|
| Sidebar 'Dashboard' (badge = Info requested count) | 10 |
| Address `/` redirects to `/dashboard` | 10 |
| Link with `?request=ID` (notifications, 'See on the Dashboard', 'Open R-xxxx', 'Open it on the Dashboard') | 10, 70 |
| Link with `?focus=payers` (Ask FLO 'Open Dashboard, Payer performance'): opens Payer performance, scrolls to it, outlines it, drops the part from the address | 10, 88 |
| Link with `?payer=`, `?stage=`, `?program=`, `?type=`, `?from=&to=` | 10, 31 |
| Old link `?period=7d`, `30d`, `quarter` | 31 |
| Bad or unknown filter values (ignored) | 10 |
| Unknown request ID (closes after 0.2 s) | 10, 86 |
| Demo menu 'Reset demo data' (lands here) | 10 |
| Demo menu 'Fast-forward 1 hour' / '1 day' (effect on this page) | 12 |

## Page header and filter bar

| Control | Diagram |
|---|---|
| Headline and sub line (the nine variants, plus the three groupings: Needs you, Due within 24 hours, Waiting on payers) | 11 |
| 'Check all now' (spinner, toast) | 12 |
| 'Check all now' disabled and the link 'Navigator is paused in Settings' | 12 |
| 'All payers' menu: open, each option, pick | 20 |
| 'All programs' menu | 20 |
| 'All request types' menu | 20 |
| 'All stages' menu: All stages, the three groupings, the six stages, each with its count | 20 |
| Menu keys: ArrowDown, ArrowUp, Enter, Escape; click outside; click the button again | 20 |
| Green and bold menu when not 'All' | 20 |
| 'Clear filters' (filter bar) | 40 |
| 'Clear filters' (empty state) | 40 |
| Date button (open, close by clicking again) | 30 |
| Shortcuts 'Last 7 days', 'Last 30 days', 'Last 90 days', 'This month' | 31 |
| Month arrows 'Earlier months', 'Later months' (disabled past today) | 31 |
| Day buttons: first day, last day, earlier day restarts, third click restarts, days after today disabled, hover preview | 30 |
| 'Apply' (disabled until two days) | 30 |
| 'Cancel', Escape, click outside | 30 |
| Calendar keys: arrows, Enter, Space | 31 |
| `from` / `to` in the address, default leaves none | 30, 31 |
| What the range changes (Payers table only) | 30, 31, 88 |

## Summary from FLO, key figures and stage help

| Control | Diagram |
|---|---|
| 'Summary from FLO' card and its note 'From today's demo data' (label only) | 13 |
| Line 1 (who needs you, most urgent, due soonest) and its link 'Open I-2207' | 13 |
| Line 2 (authorizations that end within 7 days, units used of total, 'already ended') and 'Open Case Manager' | 13 |
| Line 3 (denial deadlines this week, 'already closed') and 'Open Denial Intelligence' | 13 |
| The lines change with the demo clock, a payer reply, a signed request (recomputed) | 13, 12, 85 |
| Figures: Needs you, Due within 24 hours, Waiting on payers, Denials to act on (counts and the line under each) | 50 |
| A figure is a button: click, Enter, Space; outlined and pressed; second click clears | 50 |
| Needs you, Due within 24 hours, Waiting on payers set a grouping and show it in the Stage menu; Denials to act on sets Stage 'Appeal or call' (`?stage=appeal`) | 50, 20 |
| Needs you at 0 reads 'Nothing needs you right now.' | 50, 11 |
| Cases saved in New case with no row: count in Needs you; the line 'N more are being prepared in New case' and 'Open Active cases' | 50, 60 |
| A figure at 0 leads to the empty state | 50, 40 |
| 'What the stages mean': open and close (Enter, Space), six stages with statuses and counts, note on the bars | 51 |
| A stage name in 'What the stages mean' sets Stage | 51 |
| Old stage names Preparing, Received, Under review, Info requested, Decided today, Appeal or call (menu, chips, `?stage=`) | 20, 50, 51 |

## Requests table

| Control | Diagram |
|---|---|
| Default row order (waiting on you first, then the nearest clock) | 60 |
| Sort headings Case, Payer, Where it is, Clock (click, Enter, Space; ascending, descending, off) | 62 |
| Headings 'What happens next' and the Open column (not sortable) | 60 |
| One-line helper 'Waiting on you first, then the nearest clock.' | 60 |
| Row click | 60 |
| Case ID link (one history entry) | 60 |
| 'Open' button | 60 |
| 'Show 8 more', '32 not shown', paging reset | 60 |
| 'Showing 8 of 40' and 'Showing 8 of 8' with Appeal or call | 60 |
| Chip, four bars, hover text (auth track and denial route) | 61 |
| Clock: note, time left, 'window closed', today, time in stage, 'late', 'very late' | 61 |
| What happens next with agent badge | 61 |
| Empty state 'No requests match' | 40 |

## Request drawer

| Control | Diagram |
|---|---|
| Header, chip, facts, chance row, History, 'Details' (closed) with Sent and Checks (all messages) | 70 |
| 'Close' (X), Escape (one layer at a time), dimmed area, browser Back | 71 |
| 'Check now' (hidden for Preparing) | 71 |
| 'Open case' | 71 |
| 'Open in Denial Intelligence' (denials only) | 71 |
| Box 'Needs your input' + 'Review the answer' | 72, 80 |
| Box 'Packet is drafting the answer' + 'Check on the draft' | 72 |
| Box 'Approved. Write-back waits for you' + 'Approve write-back' (only while write-back is on in EMR Connect) | 72, 73 |
| Calm line 'Write-back is off for your records system.' + 'Turn it on in EMR Connect.' | 72 |
| Answer pop-up: 'Not yet', 'Sign and send answer', X, dimmed area, Escape (closes only the pop-up) | 80 |
| Answer pop-up content for Residential 3.5, PHP, IOP, Detox | 80 |
| Write-back pop-up: 'Cancel', 'Write to the EMR', X, dimmed area, Escape, busy state | 73 |
| Demo controls: blocked for Preparing, for denials and for a decided request | 85 |
| Which replies are offered in Received, Under review and Info requested | 85 |
| 'Payer received it' (never offered: every sent request is already Received) | 85 |
| 'Under review', 'Asks for information' (toast names the payer: 'Demo: Cardinal ...') | 85 |
| 'Approves' | 86 |
| 'Approves part', 'Denies' (new D- number, drawer switch) | 86 |

## Payer performance

| Control | Diagram |
|---|---|
| Closed section: title and the computed line (slowest payer and its average wait) | 88 |
| Open and close the section (Enter, Space, click) | 88 |
| Payer row click (and Enter or Space on a focused row), second click clears | 88 |
| Payer name link (opens that payer on Payers) | 88 |
| 'Open Payers' link | 88 |
| 'Open Analytics' link | 88 |
| Section opens, scrolls into view and is outlined for about 2 seconds after `?focus=payers` | 88 |
| 'All payers' totals row (not clickable) | 88 |
| Columns and rules (Waiting, Decision time, Approved as asked, Denied, Info asks, Reached by) | 88 |
| Header sentences: 'Click a row to narrow...' and the one about Program and Request type | 88 |

## Not drawn

- Hover and focus styling: row tint, figure hover tint, menu cursor highlight, calendar day hover colour. No behaviour change.
- Window resizing: the four figures go two by two under 1280 px wide, the filter bar wraps and the tables scroll inside their card; the page itself never scrolls sideways.
- The FLO panel and the notification bell are Global shell. Their links into this page are shown only as entry points. The FLO answer link 'Open Dashboard, Payer performance' lands on `?focus=payers` (88).
- 'No events yet.' in History: no request has an empty history, so it cannot be reached (noted in 70).
- 'Clear filters' in the empty state when no menu is set: only possible with zero requests, so it cannot be reached (noted in 40).
- Authorizations case page and Denial Intelligence screens: only `goto` nodes.

## Gaps found earlier and now fixed

- Clicking the case ID pushed two history entries. It now pushes one (60).
- The toast after a demo reply read 'Demo: payer payer received it'. It now names the payer, for example 'Demo: Cardinal approved it' (85, 86).
- 'Payer received it' after 'Approves' left the request counted in Decided today. A request now only moves forward, so only the replies still ahead of it are offered (85, 86).
- The requests table had no sort control (62).
- Payers at a glance had no link to Payers, and Ask FLO's 'Open Dashboard, By payer' had no view to land on (88).
- A case being prepared in New case never counted under Preparing (50, 11).
- The write-back box ignored the EMR Connect switch (72, 73).
- 'Check all now' ignored the Settings pause (12).
- Escape with a pop-up open in the drawer closed both layers. It now closes one layer at a time (71, 73, 80).

## Round 2 notes

- The three groupings (Needs you, Due within 24 hours, Waiting on payers) cannot be one stage, so they are held on the page and shown in the Stage menu. They are not in the address and do not survive leaving the page; `?stage=` keeps working for the six stages.
- The progress-bar note moved from the card header to 'What the stages mean' (51); the one-line helper replaced it (60).
- The old six tinted stage tiles are gone. Their counts are in the Stage menu and in 'What the stages mean'.
- A screen-reader-only span in the table cells widened the page by hundreds of pixels at 1024 and 768 px. The table is now positioned, so the page no longer scrolls sideways.

## Left as it is

- Drawer 'Check now' and the line 'Next automatic check in ...' do not read the Settings pause; only 'Check all now' does (71, 12).
- The sort is not kept in the address, so a shared link opens in the default order (62).
