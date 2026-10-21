# Coverage: Analytics

Route: `/analytics` (one page, no sub tabs, no query string).
Source: `src/pages/analytics/*`, `src/data/analytics.ts`, `src/lib/hosted.ts`.

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Analytics' | Opens the page, no badge | 10 |
| Menu 'This quarter' (Period): 'This quarter', 'Last quarter', 'Last 12 months' | Recomputes the whole page | 11 |
| Menu 'All payers' (Payer): all payers and six payers | Recomputes the whole page; pill highlights when a payer is chosen | 11 |
| Menu keyboard (arrows, Enter, Esc) and click outside | Moves, picks, closes | 11 |
| Button 'Monthly report' | Opens the report window | 30 |
| Tile 'Approved as asked' (with trend line) | Read-only, not clickable | 12 |
| Tile 'Top denial cause' | Read-only | 12 |
| Tile 'Advice taken works' | Read-only | 12 |
| Tile 'Sent without edits' | Read-only | 12 |
| Hidden figure: '-' and 'Not enough decisions yet' (under 20) | Tiles and cards | 11, 12 |
| Card 'Approval rate by payer' (bars, colour bands, footnote, one-payer comparison) | Read-only, no hover | 20 |
| Card 'How people edit agent drafts' (donut, legend) | Read-only, no hover | 20 |
| Card 'What helps most' (four ranked rows) | Read-only, rows are not links | 20 |
| Card 'Common denial reasons by payer': row click | Opens Denial Intelligence | 21 |
| Same card: reason text button | Opens Denial Intelligence | 21 |
| Same card: row hover tint, 'Not enough decisions yet' state | Link cue, empty state | 21 |
| Report window: steps by Analyst, spinner, ticks | 4 steps of 0.75 s | 30 |
| Report window: 'Cancel' / 'Done', X 'Close', Escape, click outside | Close at any time | 30 |
| Report window: panel 'Your report is ready' | Shows the two buttons | 30, 31 |
| 'Download report' | Saves the .md file, toast 'Report downloaded' | 31, 32 |
| 'Download data (CSV)' | Saves the .csv file, toast 'Report downloaded' | 31, 32 |
| Hosted preview: toast 'Download is off in this preview' | No file, no second toast | 31 |
| File contents (sections, columns, hidden figures) | Read-only | 32 |

## Not drawn

- Print, PDF, Export, Share and email: none exist in the demo. The product requirements' monthly pack (one PDF, operator approves) is noted once in 31 and 32.
- Hover tooltips and chart click-through: none exist. Said in 12 and 20.
- Hidden bar row (grey bar, '-' and a footnote naming the payer): the code is there, but with the demo's numbers no period and payer reaches fewer than 20 decisions on the bars. Not drawn.
- Donut 'not enough' state: drawn in 20 and marked, no demo view reaches it.
- Menus, toasts and Ask FLO in the top bar: global shell diagrams.

## Seen in the demo (for the report)

- Every denial row opens the plain `/denials` list. The payer and the reason are not carried across, although the card says 'Select a row to open Denial Intelligence.'
- The 'Monthly report' button shows a download icon but opens a window; downloads happen inside it.
- The Period and Payer choices are not kept in the address, so a refresh or Back resets them.
- With 'All payers', 'Top denial cause' is the share among the denials listed in the table, not among every denial.
