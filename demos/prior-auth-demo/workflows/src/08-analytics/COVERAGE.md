# Coverage: Analytics

Route: `/analytics` (one page, no sub tabs, no query string).
Source: `src/pages/analytics/*`, `src/data/analytics.ts`, `src/lib/hosted.ts`. It also reads what other screens record: appeal rulings and accepted denials (Denial Intelligence), dismissed recommendations (Authorizations).

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Analytics' | Opens the page, no badge | 10 |
| Menu 'This quarter' (Period): 'This quarter', 'Last quarter', 'Last 12 months' | Recomputes the whole page | 11 |
| Menu 'All payers' (Payer): all payers and six payers | Recomputes the whole page; pill highlights when a payer is chosen | 11 |
| Menu keyboard (arrows, Enter, Esc) and click outside | Moves, picks, closes | 11 |
| Button 'Monthly report' (document icon) | Opens the report window | 30 |
| Tile 'Approved as asked' (with trend line) | Read-only, not clickable | 12 |
| Tile 'Top denial cause' | Read-only | 12 |
| Tile 'Advice taken works' | Read-only | 12 |
| Tile 'Sent without edits' | Read-only | 12 |
| Hidden figure: '-' and 'Not enough decisions yet' (under 20) | Tiles and cards | 11, 12 |
| Card 'Approval rate by payer' (bars, colour bands, footnote, one-payer comparison) | Read-only, no hover | 20 |
| Card 'How people edit agent drafts' (donut, legend) | Read-only, no hover | 20 |
| Card 'What helps most' (four ranked rows) | Read-only, rows are not links | 20 |
| Card 'Common denial reasons by payer': row click | Opens Denial Intelligence, narrowed to the row's payer and reason | 21 |
| Same card: reason text button | Same as the row | 21 |
| Same card: row hover tint, 'Not enough decisions yet' state | Link cue, empty state | 21 |
| Same card, foot: 'Appeals overturned' and 'Written off after accepted denials' | Read-only; move when Denial Intelligence records a ruling or an accepted denial; '-' under 20 rulings | 22 |
| Card 'Why recommendations were dismissed' | Read-only; counts by reason; hidden when nobody dismissed a recommendation (and in 'Last quarter') | 22 |
| Report window: steps by Analyst, spinner, ticks | 4 steps of 0.75 s | 30 |
| Report window: 'Cancel' / 'Done', X 'Close', Escape, click outside | Close at any time. Escape closes one layer: an open menu first, then the window | 30 |
| Report window: panel 'Your report is ready' | Shows the three buttons | 30, 31 |
| 'Download report' | Saves the .md file, toast 'Report downloaded' | 31, 32 |
| 'Download data (CSV)' | Saves the .csv file, toast 'Report downloaded' | 31, 32 |
| 'Print' | Opens the browser's print window with a plain page of the report (title, period, scope, every section) | 31 |
| Hosted preview: toast 'Download is off in this preview' / 'Print is off in this preview' | No file and nothing printed, no second toast | 31 |
| File contents (sections, columns, hidden figures) | Read-only; the printed page has the same sections | 32 |

## Not drawn

- PDF file, Export, Share and email: none exist in the demo. Print hands the report to the browser's print window instead. The product requirements' monthly pack (one PDF, operator approves) is noted once in 31 and 32.
- The print page itself (it is a plain page without controls): described in 31, not drawn as a screen.
- Hover tooltips and chart click-through: none exist. Said in 12 and 20.
- Hidden bar row (grey bar, '-' and a footnote naming the payer): the code is there, but with the demo's numbers no period and payer reaches fewer than 20 decisions on the bars. Not drawn.
- Donut 'not enough' state: drawn in 20 and marked, no demo view reaches it.
- Menus, toasts and Ask FLO in the top bar: global shell diagrams.

## Fixed in this pass

- Every denial row now opens Denial Intelligence narrowed to its payer and reason (21).
- 'Monthly report' has a 'Print' button, and says so in the hosted preview (31).
- Analytics reads what other screens record: written-off dollars and accepted denials, appeal rulings in the overturn rate, and the reasons recommendations were dismissed (22).

## Still open

- The 'Monthly report' button opens a window; downloads and printing happen inside it.
- The Period and Payer choices are not kept in the address, so a refresh or Back resets them.
- With 'All payers', 'Top denial cause' is the share among the denials listed in the table, not among every denial.
- The starting figures for appeals and write-offs are invented. A recorded event counts in 'This quarter' and 'Last 12 months', never in 'Last quarter'.
