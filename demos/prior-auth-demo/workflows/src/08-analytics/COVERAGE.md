# Coverage: Analytics

Route: `/analytics` (one page, no sub tabs, no query string).
Source: `src/pages/analytics/*`, `src/data/analytics.ts`, `src/lib/hosted.ts`. It also reads what other screens record: appeal rulings and accepted denials (Denial Intelligence), dismissed recommendations (Authorizations), and the Dashboard's requests (Workload).

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Analytics' | Opens the page, no badge | 10 |
| Quiet note under the description ('Modeled: ... Demo values: ... live') | Read-only, says what is modeled, what is sample and what is live, once | 10, 12 |
| Menu 'This quarter' (Period): 'This quarter', 'Last quarter', 'Last 12 months' | Recomputes the whole page | 11 |
| Menu 'All payers' (Payer): all payers and six payers | Recomputes the whole page; pill highlights when a payer is chosen | 11 |
| Menu 'All programs' (Program): 'All programs', 'Residential', 'IOP', 'PHP', 'Withdrawal management' | Recomputes the whole page from the program weights (Demo values); pill highlights when a program is chosen | 11, 13 |
| Button 'Clear filters' (only while a payer or program is picked) | Puts payer and program back; the period stays | 11, 13 |
| Menu keyboard (arrows, Enter, Esc) and click outside | Moves, picks, closes | 11 |
| Button 'Monthly report' (document icon) | Opens the report window | 30 |
| Tile 'Approval rate' (with trend line) | Read-only, not clickable | 12 |
| Tile 'Denial rate' (denials and accepted count, trend line) | Read-only | 12 |
| Tile 'Turnaround' (days, typical days, trend line; demo values) | Read-only | 12 |
| Tile 'Preventable denials' (count, share of denials) | Read-only | 12, 23 |
| Info buttons on the four tiles (hover or focus shows the text, Escape hides it) | Short definition; turnaround says 'Demo values' | 12 |
| Hidden figure: '-' and 'Not enough decisions yet' (under 20) | Tiles and cards | 11, 12 |
| Chart 'Approval rate by payer' (bars, colour bands, footnote, one-payer comparison) | Read-only, no hover | 20 |
| Chart 'Preventable denials by reason' (up to five bars and one 'other' row) | Read-only; rows add up to the tile | 23 |
| Chart 'How people edit agent drafts' (donut, legend) | Read-only, no hover | 20 |
| Card 'Workload' ('handled', 'still open', meter, scope line) | Live from the Dashboard's requests; follows payer and program, not the period | 20 |
| Link 'Open the Dashboard' (in the Workload card) | Opens the Dashboard | 20 |
| Heading 'Detailed breakdowns' and its three folded sections (click, Enter, Space; one summary line each) | Opens and closes in place; start closed | 24 |
| Section 'Common denial reasons by payer': row click | Opens Denial Intelligence, narrowed to the row's payer and reason | 21 |
| Same section: reason text button | Same as the row | 21 |
| Same section: row hover tint, 'Not enough decisions yet' state | Link cue, empty state | 21 |
| Same section, foot: 'Appeals overturned' and 'Denials accepted' (a count) | Read-only; move when Denial Intelligence records a ruling or an accepted denial; '-' under 20 rulings | 22 |
| Section 'How FLO's advice and drafts perform': four facts ('Approved as asked', 'Top denial cause', 'Advice taken works', 'Sent without edits') | Read-only | 24 |
| Same section: 'Why recommendations were dismissed' | Read-only; counts by reason; absent when nobody dismissed a recommendation (and in 'Last quarter'); the summary adds the count | 22, 24 |
| Section 'What helps most' (four ranked rows) | Read-only, rows are not links | 24 |
| Report window: steps by Analyst, spinner, ticks | 4 steps of 0.75 s; subtitle names period, payer and program | 30 |
| Report window: 'Cancel' / 'Done', X 'Close', Escape, click outside | Close at any time. Escape closes one layer: an open menu first, then the window | 30 |
| Report window: panel 'Your report is ready' | Shows the three buttons | 30, 31 |
| 'Download report' | Saves the .md file, toast 'Report downloaded' | 31, 32 |
| 'Download data (CSV)' | Saves the .csv file, toast 'Report downloaded' | 31, 32 |
| 'Print' | Opens the browser's print window with a plain page of the report (title, period, scope, program, every section) | 31 |
| Hosted preview: toast 'Download is off in this preview' / 'Print is off in this preview' | No file and nothing printed, no second toast | 31 |
| File contents (sections, columns, hidden figures, preventable rows, program) | Read-only; the printed page has the same sections | 32 |

## Not drawn

- PDF file, Export, Share and email: none exist in the demo. Print hands the report to the browser's print window instead. The product requirements' monthly pack (one PDF, operator approves) is noted once in 31 and 32.
- The print page itself (it is a plain page without controls): described in 31, not drawn as a screen.
- Chart click-through: none exists. The preventable chart is read-only; the denial table is the way into Denial Intelligence.
- Hidden bar row (grey bar, '-' and a footnote naming the payer): the code is there, but with the demo's numbers no period and payer reaches fewer than 20 decisions on the bars for all programs. With one program and one payer it can. Not drawn.
- Donut 'not enough' state: drawn in 20 and marked, only a very small program and payer reaches it.
- Menus, toasts and Ask FLO in the top bar: global shell diagrams.

## Changed in round 2 (UX refinement)

- The four tiles are now approval rate, denial rate, turnaround and preventable denials. The old four facts (approved as asked, top denial cause, advice taken works, sent without edits) moved into the folded section 'How FLO's advice and drafts perform' (12, 24).
- New 'Program' menu and 'Clear filters' (11, 13). The demo had no per-program split, so a weighting table of Demo values drives it.
- New chart 'Preventable denials by reason' (23). Each denial reason is tagged fixable or not in `src/data/analytics.ts`.
- Denial counts are now added up from the payers (decisions times the rest of the approval rate) and each payer's denials are spread over its reasons. The denial table, the preventable chart, the tiles and the report all use the same counts, so the starting figures changed: top denial cause 23% (Cardinal, 73 denials) instead of 29%, 'Last 12 months' approval rate 68% instead of 69%.
- 'Common denial reasons by payer', 'How FLO's advice and drafts perform' and 'What helps most' are folded under 'Detailed breakdowns' (21, 22, 24). 'How people edit agent drafts' stays as the third chart.
- New card 'Workload' from the Dashboard's live requests (20).
- One quiet note says what is modeled, what is demo values and what is live; info buttons give the definitions (12).
- The monthly report adds denial rate, turnaround, preventable denials and the program; the CSV has two more columns, 'program' and 'unit' (30, 31, 32).

## Still open

- The 'Monthly report' button opens a window; downloads and printing happen inside it.
- The Period, Payer and Program choices are not kept in the address, so a refresh or Back resets them.
- With 'All payers', 'Top denial cause' is the share of all denials held by the biggest single reason at one payer.
- The starting figures for appeals and accepted denials are invented. A recorded event counts in 'This quarter' and 'Last 12 months', never in 'Last quarter'.
- Workload shows the Dashboard's requests right now. It does not follow the period.
