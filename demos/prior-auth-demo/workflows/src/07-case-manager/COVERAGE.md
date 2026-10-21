# Coverage: Case Manager

Source: `src/pages/manager/*`, `src/store/manager.ts`, `src/store/cases.ts`, `src/data/manager.ts`, `src/data/managerReviews.ts`, `src/data/cases.ts`, `src/pages/newcase/runText.ts`.

| Control | Where | Diagram |
|---|---|---|
| Header counts '56 active cases.', '5 are still being prepared.' | Active cases | 10 |
| Header '47 clinical reviews due this week.' | Reviews this week | 10 |
| 'New case' button | Active cases header | 10 |
| Switch 'Active cases' / 'Reviews this week' | Filter bar, right | 10 |
| Address `?tab=reviews`, `?tab=cases`, none, `/active` | Address | 10, 51 |
| Links in from other pages and the shell | Other pages | 51 |
| Search 'Search by case ID or initials' | Filter bar | 11 |
| 'All levels of care' dropdown | Filter bar | 11 |
| 'All payers' dropdown | Filter bar | 11 |
| 'Any status' dropdown | Filter bar, Active cases | 11, 30 |
| 'Any review status' dropdown | Filter bar, Reviews | 11 |
| 'Clear filters' button | Filter bar | 11 |
| Dropdown keys (arrows, Enter, Escape) and outside click | Filter bar | 11 |
| Card 'Being prepared', subtitle, row source | Active cases | 20 |
| '4 sent today' button | Being prepared | 20 |
| Chips 'All', 'Agents working', 'Needs your input' (badge), 'Ready to sign' (badge) | Being prepared | 20 |
| Row order (needs a person first, then earliest due) | Being prepared | 20 |
| Row: level chip, ID link, patient, payer, request | Being prepared | 21 |
| Row: eight-step bar, agent badge and line | Being prepared | 21, 22 |
| Row: due pill, status pill, approval chance, 'Not started' | Being prepared | 21, 22 |
| Row buttons 'Continue', 'Answer', 'Watch', 'Review and sign' | Being prepared | 21 |
| Row ID link; clicking elsewhere on the row does nothing | Being prepared | 21 |
| Status rules (question, ready, working, intake) and due clocks per request type | Being prepared | 22 |
| Four status tiles 'Needs action', 'Review due', 'Awaiting payer', 'On track' | Tracker | 30 |
| Table columns, default sort, 'Showing 1 to 10 of 56', footnote | Tracker | 30 |
| Sort buttons: Case, Payer, Units used, Clock, Approval chance, Status | Tracker headers | 31 |
| 'Level of care' and 'Open' headers (not sortable) | Tracker headers | 31 |
| 'Previous', 'Next', 'Page N of M' | Tracker pager | 31 |
| Cells: Units used, Clock (eight kinds), Approval chance, Status | Tracker rows | 32 |
| Row click, case ID, 'Open' button | Tracker rows | 33 |
| 'Request not found' on the case page | Hand-off | 33 |
| Three tiles on Reviews | Reviews | 40 |
| 'Showing N of 47 reviews' line | Reviews | 40 |
| Day cards, review rows, 'Check to look at', status pills | Reviews | 40 |
| 'Show N more' / 'Show fewer' | Reviews day card | 40 |
| Row ID link and 'Open' | Reviews | 40, 41 |
| 'Ready to step down?' card: R-0903, P-1522 | Reviews, right | 40 |
| Drawer header, 'J.S., 51 · privacy mode', 'Drafted by' | Review drawer | 41 |
| 'The draft' text box (editable, locked, read-only) | Review drawer | 41 |
| 'Integrity checks' (four rows) | Review drawer | 41 |
| Banner 'Signing is one review at a time...' | Review drawer | 41 |
| 'Sign review' (enabled, greyed, replaced by 'Signed by') | Review drawer footer | 41, 43 |
| 'Open case' | Review drawer footer | 41 |
| 'Close', X, dimmed area, Escape (saves edited draft) | Review drawer | 41 |
| 'Needs your update' panel, 'Your update' box | Review drawer | 42 |
| 'Add to the draft' (1.3 s, toast 'Review updated') | Review drawer | 42 |
| Sign dialog: banner, 'Signing clinician', warning box and tick, attestation tick | Sign dialog | 43 |
| Sign dialog: 'Sign review', 'Cancel', X, Escape | Sign dialog | 43 |
| 'Draft all due reviews' | Reviews header | 44 |
| 'Sign all clean drafts' (enabled and greyed), its dialog, 'Sign 33 reviews' | Reviews header | 44 |
| What changes after signing; 'Cadence books the next review' | Reviews | 45 |
| Empty states: 'Nothing is being prepared', 'No cases match these filters', 'No cases match', 'No reviews match' | Cards and tables | 50 |
| 'Start a new case' and each 'Clear filters' | Empty states | 50 |

## Not drawn

- Hover colours, focus order, screen reader labels (the lists announce 'Showing N of 47' politely).
- Exact words in the draft text box (seven parts, written per level of care). Only its parts are named in 41.
- What New case, the case page and the Dashboard do after a hand-off. Those are other modules' diagrams.
- The `Sign all clean drafts` toast 'No clean drafts to sign' is in the store but the button is greyed out first, so it is shown dotted in 44.

## Things that look broken or odd (for the report)

- 26 of the 56 tracker rows open 'Request not found' on the case page (every row from R-0881 down in the data, such as R-0856). Their reviews' 'Open case' buttons do the same: 26 of 47.
- On Reviews, 'Ready to step down?' lists R-0903, which also opens 'Request not found'.
- 'Draft all due reviews' only raises a toast. 'Cadence books the next review' is only text: no new review appears after signing.
- Day card header reads '1 reviews' when a day has one.
- P-1499 reads 'Answer due in 20 h' in the tracker and 'Answer due in 9 h' on its case page.
- Tracker rows never change: signing and sending a case removes it from 'Being prepared' but the tracker still lists it with its old clock and status.
