# Coverage: Case Manager

Source: `src/pages/manager/*`, `src/store/manager.ts`, `src/store/cases.ts`, `src/store/ripples.ts`, `src/data/manager.ts`, `src/data/managerReviews.ts`, `src/data/cases.ts`, `src/pages/newcase/runText.ts`, and `src/App.tsx` (the case route).

| Control | Where | Diagram |
|---|---|---|
| Page opens on the tracker (Active cases); 'Being prepared' and 'Step-down plans' are folded rows above it | Active cases | 10, 20, 23 |
| Header counts '56 active cases.' (57 with a new case; '1 active case.' singular), '5 are still being prepared.' | Active cases | 10, 34 |
| Header '47 clinical reviews due this week.' ('48' when a next review falls this week; singular for one) | Reviews this week | 10, 45 |
| 'New case' button | Active cases header | 10 |
| Switch 'Active cases' / 'Reviews this week' | Filter bar, right | 10 |
| Address `?tab=reviews`, `?tab=cases`, none, `/active` | Address | 10, 51 |
| Links in from other pages and the shell, and '?review=' from the Ledger case page | Other pages | 51 |
| Search 'Search by case ID or initials' | Filter bar | 11 |
| 'All levels of care' dropdown | Filter bar | 11 |
| 'All payers' dropdown | Filter bar | 11 |
| 'Any status' dropdown | Filter bar, Active cases | 11, 30 |
| 'Any review status' dropdown (adds 'Not drafted yet') | Filter bar, Reviews | 11 |
| 'Clear filters' button | Filter bar | 11 |
| Dropdown keys (arrows, Enter, Escape) and outside click | Filter bar | 11 |
| Folded row 'Being prepared' with its summary '5 being prepared, 3 need you' ('1 of 5 match the filters, 1 needs you', 'Nothing is being prepared'), opened by click, Enter or Space | Active cases | 20 |
| Link 'Open in Authorizations' (moves inside the opened row under 900 px) | Being prepared row | 20 |
| Opened row: subtitle, row source | Active cases | 20 |
| '4 sent today' button | Being prepared, opened | 20 |
| Chips 'All', 'Agents working', 'Needs your input' (badge), 'Ready to sign' (badge) | Being prepared | 20 |
| Row order (needs a person first, then earliest due) | Being prepared | 20 |
| Row: level chip, ID link, patient, payer, request | Being prepared | 21 |
| Tag 'Updated for a payer change · date' | Being prepared row, tracker row | 24 |
| Folded row 'Step-down plans' (summary '1 plan to start...'), opened by click, Enter or Space; its row, 'From denial D-xxxx', 'Open case' | Active cases, between the folded row and the tracker | 23 |
| Row: eight-step bar, agent badge and line | Being prepared | 21, 22 |
| Row: due pill, status pill, approval chance, 'Not started' | Being prepared | 21, 22 |
| Row buttons 'Continue', 'Answer', 'Watch', 'Review and sign' | Being prepared | 21 |
| Row ID link; clicking elsewhere on the row does nothing | Being prepared | 21 |
| Status rules (question, ready, working, intake) and due clocks per request type | Being prepared | 22 |
| Four status tiles 'Needs action', 'Review due', 'Awaiting payer', 'On track' | Tracker | 30 |
| Table columns (Case, Status, Next due, Units or days, Level of care, Payer, Approval chance, Open), default sort by Next due, 'Showing 1 to 10 of 56', footnote | Tracker | 30 |
| Text 'New today' and the row of a case signed and sent today | Tracker | 34 |
| Sort buttons: Case, Status, Next due, Units or days, Payer, Approval chance | Tracker headers | 31 |
| 'Level of care' and 'Open' headers (not sortable) | Tracker headers | 31 |
| 'Previous', 'Next', 'Page N of M' | Tracker pager | 31 |
| Cells: Units or days ('10 of 21 days used, 11 left', 'none left', 'not yet approved'), Next due (eight kinds, the case page's own words for a request, 'Next review <date>', 'Step-down plan open'), Approval chance (one small number), Status (the one coloured pill) | Tracker rows | 32 |
| 'Runs out before review' (red text, only when the approval is used up at the usual pace before the next review), and the footnote that explains the pace | Tracker rows, ledger case page | 35, 60 |
| Row click, case ID, 'Open' button | Tracker rows | 33 |
| Ledger case page: header, 'Case summary', 'Next step', 'Open the review', 'Back to Case Manager', crumb | Case page for a ledger-only case | 60 |
| Ledger case page 'History': folded, summary '4 entries. Latest: ...', opened by click, Enter or Space | Case page for a ledger-only case | 60 |
| 'Request not found' (an address typed by hand only) | Hand-off | 33, 60 |
| Three tiles on Reviews (35 / 39 drafted, '4 not drafted yet') | Reviews | 40 |
| 'Showing N of 47 reviews' line | Reviews | 40 |
| Day cards ('1 review' singular), review rows, 'Check to look at', status pills incl. 'Not drafted yet' | Reviews | 40 |
| 'Show N more' / 'Show fewer' | Reviews day card | 40 |
| Row ID link and 'Open' | Reviews | 40, 41 |
| 'Ready to step down?' card: R-0873, P-1522 | Reviews, right | 40 |
| Drawer header, 'J.S., 51 · privacy mode', 'Drafted by', 'Draft by FLO's agents. A clinician reviews and signs before anything is sent.' | Review drawer | 41 |
| 'Not drafted yet' panel and 'Draft this review' | Review drawer | 41 |
| Banner 'Next review: <date>' on a signed review | Review drawer | 41, 45 |
| 'The draft' text box (editable, locked, read-only) | Review drawer | 41 |
| 'Integrity checks' (four rows) | Review drawer | 41 |
| Banner 'Signing is one review at a time...' | Review drawer | 41 |
| 'Sign review' (enabled, greyed, replaced by 'Signed by') | Review drawer footer | 41, 43 |
| 'Open case' | Review drawer footer | 41 |
| 'Close', X, dimmed area, Escape (saves edited draft; one layer per press) | Review drawer | 41 |
| 'Needs your update' panel, 'Your update' box | Review drawer | 42 |
| 'Add to the draft' (1.3 s, toast 'Review updated') | Review drawer | 42 |
| Sign dialog: banner, 'Signing clinician', warning box and tick, attestation tick | Sign dialog | 43 |
| Sign dialog: 'Sign review', 'Cancel', X, Escape | Sign dialog | 43 |
| 'Draft all due reviews' (paused: 'Cadence is paused in Settings'; 'Cadence drafted 4 reviews'; 'Nothing to draft') | Reviews header | 44 |
| 'Sign all clean drafts' (enabled and greyed), its dialog, 'Sign 29 reviews' (33 after drafting) | Reviews header | 44 |
| What changes after signing; the next review Cadence books | Reviews, tracker, Ledger case page | 45 |
| Empty states: 'Nothing is being prepared', 'No cases match these filters' (both inside the opened Being prepared row), 'No cases match', 'No reviews match' (Step-down plans has none: it hides) | Cards and tables | 50 |
| 'Start a new case' and each 'Clear filters' | Empty states | 50 |

## Not drawn

- Hover colours, focus order, screen reader labels (the lists announce 'Showing N of 47' politely).
- Exact words in the draft text box (seven parts, written per level of care). Only its parts are named in 41.
- What New case, the case page and the Dashboard do after a hand-off. Those are other modules' diagrams.
- The `Sign all clean drafts` toast 'No clean drafts to sign' is in the store but the button is greyed out first, so it is shown dotted in 44.
- The 'Draft this review' button's paused path is drawn in 41; the Settings switches that pause Cadence are in the Settings diagrams.

## What the demo still does not do

Fixed since the first pass: every tracker row, every review's 'Open case' and every 'Ready to step down?' ID now open a real page (Ledger case page, 60); 'Draft all due reviews' drafts for real and honours a paused Cadence (44); signing books the next review (45); the count includes cases sent today (34); payer-change tags (24); step-down plans (23); the tracker's due times match the case page (32); plurals.

- Decision for the placement of 'Being prepared': one folded row above the tracker, not a folded block under it. The count of cases that need a person ('3 need you') is the only thing on the page that is waiting on a person, so it sits where the first glance lands, and the tracker still starts in the first screen. A block under a ten-row table would be below the fold and never seen.
- 'Ready to step down?' still lists two fixed IDs (R-0873, P-1522). It is a prompt and is not worked out from the ledger.
- A new case sent today has no review this week, even when the payer approves it: its first review falls after Sunday.
- The tracker's Status and Approval chance on the 56 seed rows are stored on the ledger row. They do not follow the case page, the Dashboard or a reply from the payer (only the Clock does), apart from 'On track' after a signature. A row for a case sent today does follow its request.
- The next review is booked from an interval alone. The demo does not send the signed review to the payer.
