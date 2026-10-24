# Coverage: Analytics

Route: `/analytics` (one page, no sub tabs, no query string).
Source: `src/pages/analytics/*`, `src/data/decisions.ts` (the case records) and its helpers `decisionTypes.ts`, `decisionsGen.ts`, `decisionsProfile.ts`, `decisionsReal.ts`, `src/data/analytics.ts` (the quarter's calibration and the denial reasons), `src/components/ui/charts.tsx` and `src/components/ui/chartkit/*` (the SVG charts), `src/lib/hosted.ts`. It also reads what other screens record: appeal rulings and accepted denials (Denial Intelligence), dismissed recommendations (Authorizations), the Dashboard's requests (live workload) and the site view (top bar).

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Analytics' | Opens the page, no badge | 10 |
| Quiet note under the description ('Demo values: this is sample data. ...') | Read-only, says once what is sample and what is live | 10, 11 |
| Menu 'This quarter' (Period): 'This quarter', 'Last quarter', 'Last 12 months' | Recomputes the whole page | 11 |
| Menu 'All payers' (Payer): all payers and six payers | Recomputes the whole page; pill highlights when a payer is chosen | 11 |
| Menu 'All programs' (Program): Residential 3.5, IOP, PHP, Detox | Recomputes the whole page | 11 |
| Menu 'All diagnosis groups' (Diagnosis group): six groups | Recomputes the whole page | 11 |
| Button 'Clear filters' (only while a payer, program or diagnosis group is picked) | Puts those three back to 'All'; the period stays | 11 |
| Menu keyboard (arrows, Enter, Esc) and click outside | Moves, picks, closes | 11 |
| Label 'Site view: Both sites' with its info button | Read-only; follows the top bar switch; says 'Site A' for a one-site viewer | 11, 22 |
| Notice 'No decisions match these filters in ...' | Shown when a slice is empty | 11 |
| Button 'Monthly report' (document icon) | Opens the report window | 30 |
| Six headline figures (Approval rate, Denial rate, First-pass approval, Average decision time, Preventable denials, Appeals overturned) | Each is a button: opens the case list panel for the cases it counts | 12, 19 |
| Change line and sparkline on each figure | Read-only: change against the earlier period, twelve months | 12 |
| Info buttons on the figures (hover or focus shows the text, Escape hides it) | Short definition; decision time names the CMS time and says 'Check your state' | 12 |
| Hidden figure: dash and a line saying what it rests on (under 20) | Figures | 11, 12 |
| Tabs 'Rate' and 'Count' on 'Approvals and denials by month' | Lines of rates, or stacked areas of counts | 13 |
| Hover or focus on the trend chart | Tooltip with exact values and the decisions in the month | 13 |
| Left, Right, Home, End on the focused trend chart | Moves between months; the month is read out | 13 |
| Click a month, or Enter on the focused chart | Opens the case list panel for that month | 13, 19 |
| 'View data table' under every chart (a button) | Opens a table of the same numbers; reads 'Hide data table' | 13, 16, 17, 20, 21, 22 |
| Payer scorecard row (click, or Enter on the payer name) | Opens the Payer analysis panel | 14, 15 |
| Scorecard counts: 'Approved in part', 'Past CMS time', 'Info requests', 'Appeals overturned' | Open the case list panel for that payer and figure | 14, 19 |
| Scorecard 'All payers' row and footnote | Read-only; the clinic's own average; CMS note | 14 |
| Tabs 'Diagnosis group', 'Program', 'Request type', 'Population' on 'Payer by case mix' | Change the columns of the grid | 16 |
| Grid cell (click, Enter, hover, focus) | Tooltip; opens the case list panel for that payer and column | 16, 19 |
| Grid payer name | Opens the Payer analysis panel | 16, 15 |
| Grid column heading | Opens the case list for that column across payers | 16 |
| Grid legend | Color scale, striped under 55%, up mark from 80%, dashed under 10 decisions | 16 |
| Pareto row on 'Denial reasons' | Opens the case list panel for that reason; a one-payer reason offers 'Open in Denial Intelligence' | 17, 19 |
| Donut slice or legend row (Preventable, Not preventable) | Opens those denials | 17, 19 |
| 'Preventable denials by payer' bars | Open that payer's preventable denials | 17, 19 |
| 'Reasons by diagnosis group' bars | Open that group's denials | 17, 19 |
| Card 'Site A and Site B' (Both sites only): bars, table, figures in the Site A and Site B columns | Read-only comparison; the two site columns open the case list for that site; 'Both sites' is not clickable | 22, 19 |
| Case list panel: title, counts, 'Most common reasons', outcome tabs, sortable headings, paging, 'Copy summary', 'Open in Denial Intelligence', X, Escape | Lists the cases behind a number | 19 |
| Payer analysis panel: figures, 'What this payer tends to do', month trend, bars by diagnosis group, program and request type, top denial reasons, cases table, 'Copy summary', X, Escape | One payer's analysis; stacks | 15 |
| Case summary panel: outcome, reason, facts, 'What was done', 'Timeline', 'Copy summary', 'Open case', 'Open the denial', X, Escape | One decision in plain words | 18 |
| Escape on a panel | Closes the top layer only; focus returns to what opened it | 15, 18, 19 |
| Heading 'Detailed breakdowns' and its five folded sections (click, Enter, Space; one summary line each) | Opens and closes in place; start closed | 24 |
| 'Length of stay and units': tabs All, Residential 3.5, IOP, PHP, Detox; payer rows | Requested against approved; a row opens the case list | 20 |
| 'Process health': retro-authorizations, referral to authorization, workload by month, peer-to-peer calls and appeals, live workload | Charts, month clicks, live card | 21 |
| 'Common denial reasons by payer': row click, reason text button | Opens Denial Intelligence, narrowed to the row's payer and reason | 23 |
| Same section, foot: 'Appeals overturned' and 'Denials accepted' | Read-only; move when Denial Intelligence records a ruling or an accepted denial; dash under 20 rulings | 23 |
| 'How FLO's advice and drafts perform': four facts, how people edit drafts, 'Why recommendations were dismissed' | Read-only | 24 |
| 'What helps most' (four ranked rows) | Read-only | 24 |
| Report window: steps by Analyst, spinner, ticks | 4 steps of 0.75 s; subtitle names period, site view, payer, program and diagnosis group | 30 |
| Report window: 'Cancel' / 'Done', X 'Close', Escape, click outside | Close at any time. Escape closes one layer: an open menu first, then the window | 30 |
| Report window: panel 'Your report is ready' | Shows the three buttons | 30, 31 |
| 'Download report' | Saves the .md file, toast 'Report downloaded' | 31, 32 |
| 'Download data (CSV)' | Saves the .csv file, toast 'Report downloaded' | 31, 32 |
| 'Print' | Opens the browser's print window with a plain page of the report | 31 |
| Hosted preview: toast 'Download is off in this preview' / 'Print is off in this preview' | No file and nothing printed, no second toast | 31 |
| File contents (sections, columns, hidden figures, site view) | Read-only; the printed page has the same sections | 32 |

## Not drawn

- PDF file, Export, Share and email: none exist in the demo. Print hands the report to the browser's print window instead. The product requirements' monthly pack (one PDF, operator approves) is noted once in 31 and 32.
- The print page itself (it is a plain page without controls): described in 31, not drawn as a screen.
- Chart tooltips and the heat colors as separate screens: described inside 13 and 16.
- The pointer-only parts of the Pareto, donut and stacked bars (the hover highlight and the segment tooltips) are described in 17; the keyboard route to the same cases is the row buttons and the data tables.
- Menus, toasts and Ask FLO in the top bar: global shell diagrams.

## Changed in round 4 (owner analytics)

- The page is now computed from one set of case records (`src/data/decisions.ts`, twelve months, deterministic) instead of tables of percentages. A chart, its table and its case list cannot disagree, and every figure follows the site view.
- New: six headline figures with twelve-month sparklines and a change (10, 12), the monthly trend with Rate and Count (13), the payer scorecard (14), the Payer analysis panel (15), the payer by case mix grid with four tabs (16), the denial reasons Pareto, preventable donut and reasons by diagnosis group (17), the case summary panel (18), the case list panel (19), length of stay (20), process health (21), the site comparison (22), a Diagnosis group filter and the site view label (11).
- Folded into 'Detailed breakdowns' with the old sections: the common reasons table with the Denial Intelligence drill-down (23), FLO's advice, draft edits and the dismissed recommendations (24), what helps most (24). The old three charts, the four tiles, the Program weights table and the Workload card are gone; the workload now lives in 'Process health' (21).
- The monthly report adds the new figures, the trend, the scorecard, the grid, length of stay, process health and the site comparison, and names the site view (30 to 32).
- The starting set is unchanged: 1,070 decisions, 71% and 29% (311 denials, 207 preventable), the six payer rates, 56% of 96 appeals overturned, 17 denials accepted, 2.4 days, 84% advice taken works, 75% sent without edits.

## Still open

- Period, payer, program and diagnosis group are not kept in the address, so a refresh or Back resets them.
- Denials and approvals recorded during the demo count only when Denial Intelligence records an appeal ruling or an accepted denial, or when a denial letter is added; a decision made with the Dashboard's demo controls does not join the history.
- The CMS decision time is a yardstick from the 2026 rule for Medicaid managed care plans. It is not applied to the commercial, Medicare Advantage and carve-out payers, and the page says to check your state.
