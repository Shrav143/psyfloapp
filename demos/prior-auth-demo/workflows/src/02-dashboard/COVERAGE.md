# Dashboard: coverage

Source: `src/pages/dashboard/*`, `src/store/core.ts`, `src/store/selectors.ts`, `src/components/ui/DateRangePicker.tsx`, `src/components/ui/Dropdown.tsx`, `src/components/ui/Overlay.tsx`. Checked by clicking through `dist/index.html#/dashboard`.

Files (all in this folder):

| File | Nodes |
|---|---|
| 10-arrive-on-the-dashboard | 31 |
| 11-headline-and-sub-line | 19 |
| 12-check-all-now-and-the-demo-clock | 19 |
| 20-filter-menus | 26 |
| 30-pick-a-date-range | 29 |
| 31-date-range-shortcuts-keys-and-address | 28 |
| 40-clear-filters-and-empty-states | 23 |
| 50-stage-strip-click-a-tile | 24 |
| 60-requests-table-order-rows-and-paging | 24 |
| 61-requests-table-read-a-row | 25 |
| 70-request-drawer-open-and-read | 24 |
| 71-request-drawer-check-now-open-case-closing | 25 |
| 72-request-drawer-needs-you-boxes | 23 |
| 73-approve-the-write-back | 20 |
| 80-answer-a-payer-information-request | 33 |
| 85-demo-controls-the-payer-answers | 24 |
| 86-demo-controls-approve-part-or-deny | 21 |
| 88-payers-at-a-glance | 24 |

## Entry points

| Control | Diagram |
|---|---|
| Sidebar 'Dashboard' (badge = Info requested count) | 10 |
| Address `/` redirects to `/dashboard` | 10 |
| Link with `?request=ID` (notifications, 'See on the Dashboard', 'Open R-xxxx', 'Open it on the Dashboard') | 10, 70 |
| Link with `?payer=`, `?stage=`, `?program=`, `?type=`, `?from=&to=` | 10, 31 |
| Old link `?period=7d`, `30d`, `quarter` | 31 |
| Bad or unknown filter values (ignored) | 10 |
| Unknown request ID (closes after 0.2 s) | 10, 86 |
| Demo menu 'Reset demo data' (lands here) | 10 |
| Demo menu 'Fast-forward 1 hour' / '1 day' (effect on this page) | 12 |

## Page header and filter bar

| Control | Diagram |
|---|---|
| Headline and sub line (all nine variants) | 11 |
| 'Check all now' (spinner, toast) | 12 |
| 'All payers' menu: open, each option, pick | 20 |
| 'All programs' menu | 20 |
| 'All request types' menu | 20 |
| 'All stages' menu | 20 |
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

## Stage strip

| Control | Diagram |
|---|---|
| Tiles: Preparing, Received, Under review, Info requested, Decided today, Appeal or call | 50 |
| Second click clears Stage | 50 |
| Tile with 0 leads to the empty state | 50, 40 |
| Chevrons between tiles (decoration, no action) | 50 |
| Tile texts and counts | 50 |

## Requests table

| Control | Diagram |
|---|---|
| Fixed row order (no sort control) | 60 |
| Column headings (not clickable) | 60 |
| Row click | 60 |
| Case ID link | 60 |
| 'Open' button | 60 |
| 'Show 8 more', '31 not shown', paging reset | 60 |
| 'Showing 8 of 39', '$ at stake' with Appeal or call | 60 |
| Chip, four bars, hover text (auth track and denial route) | 61 |
| Clock: note, time left, 'window closed', today, time in stage, 'late', 'very late' | 61 |
| At stake, What happens next with agent badge | 61 |
| Empty state 'No requests match' | 40 |

## Request drawer

| Control | Diagram |
|---|---|
| Header, chip, facts, chance row, History, clock banner (all messages) | 70 |
| 'Close' (X), Escape, dimmed area, browser Back | 71 |
| 'Check now' (hidden for Preparing) | 71 |
| 'Open case' | 71 |
| 'Open in Denial Intelligence' (denials only) | 71 |
| Box 'Needs your input' + 'Review the answer' | 72, 80 |
| Box 'Packet is drafting the answer' + 'Check on the draft' | 72 |
| Box 'Approved. Write-back waits for you' + 'Approve write-back' | 72, 73 |
| Answer pop-up: 'Not yet', 'Sign and send answer', X, dimmed area, Escape | 80 |
| Answer pop-up content for Residential 3.5, PHP, IOP, Detox | 80 |
| Write-back pop-up: 'Cancel', 'Write to the EMR', X, dimmed area, Escape, busy state | 73 |
| Demo controls: blocked for Preparing and for denials | 85 |
| 'Payer received it', 'Under review', 'Asks for information' | 85 |
| 'Approves' | 86 |
| 'Approves part', 'Denies' (new D- number, drawer switch) | 86 |

## Payers at a glance

| Control | Diagram |
|---|---|
| Payer row click, payer name button, second click clears | 88 |
| 'All payers' totals row (not clickable) | 88 |
| Columns and rules (Waiting, Decision time, Approved as asked, Denied, Info asks, Reached by) | 88 |
| Header sentence about Program and Request type | 88 |

## Not drawn

- Hover and focus styling: row tint, tile lift, menu cursor highlight, calendar day hover colour. No behaviour change.
- Window resizing (filter bar wraps, tables scroll sideways).
- The FLO panel and the notification bell are Global shell. Their links into this page are shown only as entry points. The FLO answer link is labelled 'Open Dashboard, By payer' (`Panels.tsx`) but lands on the plain Dashboard; there is no By payer view.
- 'No events yet.' in History: no request has an empty history, so it cannot be reached (noted in 70).
- 'Clear filters' in the empty state when no menu is set: only possible with zero requests, so it cannot be reached (noted in 40).
- Authorizations case page and Denial Intelligence screens: only `goto` nodes.

## Odd or dead behaviour seen (also in the report)

- Clicking the case ID pushes two history entries, so Back must be pressed twice (60).
- Escape with a pop-up open from the drawer closes the pop-up and the drawer together, and during the write-back the write still finishes (71, 73, 80).
- The 'Payer received it' button toast reads 'Demo: payer payer received it' (85).
- After 'Approves', 'Payer received it' leaves the request counted in Decided today as well as Received (86).
- Requests table has no sort control, and Payers at a glance has no link to the Payers page (60, 88).
