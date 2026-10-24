# Coverage: Authorizations, the functions Case Manager had

Case Manager is no longer a screen. Since round 7 its functions are views, rows and panels of the one Authorizations page (`/authorizations`), and these diagrams are titled `Authorizations › ...` so they read as one module with `src/03-authorizations/`. The folder keeps its name because the build reads it. The worklist itself (views, filters, sort, pages, the request quick views, sites) is in `03`; rows below name those diagrams as `03/NN`.

Source: `src/pages/authorizations/AuthorizationsPage.tsx` and `worklist/*` (the rows, views and the Reviews this week columns), `src/pages/manager/ManagerRedirect.tsx`, `CaseQuickView.tsx`, `ReviewDrawer.tsx`, `SignDialog.tsx`, `LedgerCasePage.tsx`, `CaseRoute.tsx`, `ledgerRows.ts`, `ledgerCase.ts`, `helpers.ts`, `useDraftReviews.ts`, `useWorkflowLine.ts`, `src/store/manager.ts`, `src/store/cases.ts`, `src/store/ripples.ts`, `src/data/manager.ts`, `src/data/managerReviews.ts`, `src/data/cases.ts`, `src/pages/newcase/runText.ts`, and `src/App.tsx` (the redirects and the case route).

Short names: 10 old links, 20 drafts, 21 draft status rules, 23 step-down plans, 24 payer change, 30 approved view, 31 open an approved authorization, 32 deadline words, 34 sent today, 35 units, 36 tracked quick view, 40 reviews view, 41 review drawer, 42 add update, 43 sign, 44 draft all and sign all, 45 after signing, 52 sites, 60 ledger case page, 61 workflow line.

## Old links

| Control | Diagram |
|---|---|
| `/manager`, `/active`, `?tab=reviews`, `?tab=cases`, `?show=active` or `renewal`, `?review=` (redirect, replace, always names the view; other parameters dropped) | 10 |
| Links that still ask for Case Manager: Dashboard Lifecycle 'Active' and 'Renewal due', Dashboard 'Open Active cases' and the 'Do next' item for a saved draft, Denial Intelligence 'Plan the step-down' and the notification 'Denial closed', Ask FLO 'Open Reviews this week' and 'Open R-0912, review', the ledger case page's 'Open the review' | 10 |
| Links that now open plain `/authorizations` (the last view comes back): the notification 'Drafts updated', Eligibility 'Open in Authorizations', New Case 'Back to Authorizations' | 10, 24 |
| The queue's old `?status=` addresses | 10, 03/11 |
| Sidebar: no Case Manager row; 'All Authorizations' is green; the Authorizations badge unchanged | 10 |

## In progress: saved drafts

| Control | Diagram |
|---|---|
| 'Save as draft' in New Case and its toast 'Draft saved' / 'R-1710 is in Authorizations.' | 20 |
| A draft of a listed request: 'Open the draft in New Case' under the next action | 20, 03/04 |
| A draft of its own: case ID link (to New Case), ' · No patient yet', 'Level not set · No payer yet', no quick view | 20 |
| Status chips 'Intake not finished', 'Needs your input', 'Agents working', 'Ready to sign'; buttons 'Continue', 'Answer', 'Watch', 'Review and sign'; where each opens in New Case | 20, 21 |
| Next-action line (first sentence of the agent line), owner (the agent who has it), chance ('None' while intake is unfinished), an agent that could not finish | 21 |
| Due pill per request type ('Notice due in 5 h', 'Window closes in 18 h', 'Expires in 3 days', 'Review due 4:00 pm', 'Packet due Thu', 'Overdue') and its deadline band | 21 |
| Needs attention for drafts | 20, 21 |
| Once signed and sent: the row leaves In progress | 20, 34 |

## With the payer: a request sent today

| Control | Diagram |
|---|---|
| A request sent in New Case: 'New today' row in With the payer, or its existing ledger row or Dashboard row | 34 |
| What the new row reads as the request moves (with the payer, info requested, approved, denied) | 34 |
| 'N sent today' (only on With the payer) and '/dashboard?stage=received' | 34, 03/01 |

## Approved

| Control | Diagram |
|---|---|
| View chip 'Approved 32' (`?view=approved`) and what an approved row says (status and chips, units, next action, deadline, owner, chance, button) | 30 |
| Units used line ('12 of 14 days used'), the bar (terracotta from 75 percent), 'Runs out before review', the info icon 'About units and approval chance' | 35, 30 |
| Deadline words of a ledger row (step-down, booked next review, the case page's own due time, the eight clock kinds, colour and Act now) | 32 |
| Row case ID: case page, ledger case page, out-of-site card, 'Request not found' | 31 |
| Row buttons: 'Update the review', 'Review and sign', 'Check the review', 'Open the review', 'Open the denial', 'Start reauthorization', 'Open' | 31, 40 |
| Browser Back from the case page (same view and filters; sort and page start again) | 31 |
| Tracked quick view: row click and the 'Quick view ID' icon, `?quick=`, title, ledger status pill, 'Next due' and the next step | 36 |
| Tracked quick view facts: units or days, approved window, level of care, payer, workflow, site, approval chance, next review, documents, latest history | 36, 61 |
| Tracked quick view footer: 'Open case', 'Draft review' ('Cadence drafted 1 review', paused message), 'Open review' (closes the quick view and opens the review drawer) | 36 |
| Tracked quick view keys: focus on 'Open case', Tab stays inside, Escape, X, dimmed area; focus returns to the row's icon; closes when the case leaves the view | 36 |
| The Dashboard's 'Showing Active' and 'Showing Renewal due' chip | 03/08, 10 |

## Denied: step-down plans

| Control | Diagram |
|---|---|
| Accepting a denial in Denial Intelligence; 'Plan the step-down' and the notification 'Denial closed' | 23, 10 |
| The accepted row: 'Accepted', 'Plan the step-down: ...', 'Open case', its deadline ('Step-down plan open' or 'None'), Needs attention, the status filter 'Accepted' | 23 |
| 'Consider a step-down' notes on R-0873 and P-1522 and their hover text | 23, 40 |

## Updated for a payer change

| Control | Diagram |
|---|---|
| 'Update drafts' in Payers (History & Changes, Edits waiting), the note 'Updated for a payer change · date' under the patient, the notification 'Drafts updated' | 24 |

## Reviews this week

| Control | Diagram |
|---|---|
| View chip 'Reviews this week 47' (`?view=reviews`), Demo menu step 7, old `/manager?tab=reviews` | 40, 10 |
| Columns 'Review' (status pill, 'Check to look at', the missing item) and 'Due' ('Review 2 · Tue 10/20, 8:30 am'); default order by review time; sort by 'Due' | 40 |
| Row buttons 'Update the review', 'Open the review', 'Review and sign', 'Check the review'; a signed row's own button | 40, 45 |
| `?review=` in the address, and links that open a review | 40, 41, 10 |
| Drawer header, 'J.S., 51 · privacy mode', 'Drafted by' / 'To be drafted by', 'Draft by FLO's agents. ...' | 41 |
| 'Not drafted yet' panel and 'Draft this review' (paused message, 'Cadence drafted 1 review') | 41 |
| 'The draft' text box (editable, locked, read-only), 'Integrity checks' (four rows), banner 'Signing is one review at a time...' | 41 |
| 'Sign review' (enabled, greyed with 'Add your update first' or 'Draft the review first', replaced by 'Signed by') | 41, 43 |
| 'Open case' (case page Draft tab, or the ledger case page) | 41, 42, 45 |
| 'Close', X, dimmed area, Escape (saves an edited draft; one layer per press) | 41 |
| 'Needs your update' panel, 'Your update' box, 'Add to the draft' (1.3 s, toast 'Review updated') | 42 |
| Sign dialog: banner, 'Signing clinician', 'One check needs a look' and 'I read this and I accept it', the attestation, 'Sign review', 'Cancel', X, Escape | 43 |
| 'Draft all due reviews' (paused toast, 'Cadence drafted 4 reviews', 'Nothing to draft') | 44 |
| 'Sign all clean drafts' (enabled and greyed), its dialog, 'Sign 33 reviews', toast '33 reviews signed' | 44 |
| After signing: the row, the drawer banner 'Next review: ...', the next review Cadence books, the ledger row's deadline and status, the ledger case page | 45 |

## Sites

| Control | Diagram |
|---|---|
| Top bar site switch and Demo menu 'Viewing as': the Approved and Reviews this week views, the review buttons, the bulk review actions, step-down rows, the tracked quick view and `?review=` follow the view; Site A + Site B = Both sites | 52, 03/12 |
| Out-of-site card for a case link at a site the viewer is not looking at; 'Show Site B' for a both-sites viewer; 'Back to the Dashboard' | 52, 31 |

## Ledger case page (`/authorizations/case/ID` for a case only the ledger has)

| Control | Diagram |
|---|---|
| Header: crumb 'Authorizations › R-0856', level chip, case ID, review type, status pill, sub line | 60 |
| 'Case summary' (privacy pill, patient, payer, service, authorization dates, units used and 'Runs out before review', reviews due, next review, next on the clock, approval chance) | 60, 35 |
| 'Next step' card | 60 |
| 'History' fold (summary 'N entries. Latest: ...'; click, Enter or Space) | 60 |
| 'Open the review' (to Reviews this week with the drawer open) | 60, 10 |
| 'Back to Authorizations' and the crumb (plain address: the last view comes back) | 60 |
| Row 'Workflow' and the workflow's lines in History, and the same row in the tracked quick view | 61 |
| 'Request not found' (an address typed by hand only) | 60, 31 |

## Removed with Case Manager (no diagram)

- The page header ('56 active cases.', '47 clinical reviews due this week.'), the tab switch 'Active cases' / 'Reviews this week' and `?tab=` as a tab.
- The folded 'Being prepared' row, its four chips and its eight-step bar; the folded 'Step-down plans' row.
- The tracker's four status tiles, its own columns (Units or days, Level of care, Payer) and its ten-row pager; the Reviews tab's three tiles, day cards, 'Show N more' / 'Show fewer' and the 'Ready to step down?' card.
- The Case Manager filter bar ('Search by case ID or initials', 'All levels of care', 'Any status', 'Any review status') and its empty states ('Nothing is being prepared', 'No cases match', 'No reviews match'): the worklist's filters and its one empty state replace them (03/07, 03/08).
- The Case Manager sidebar row and its bubble.

## Not drawn

- Hover colours, focus order, screen reader labels.
- Exact words in the draft text box (seven parts, written per level of care). Only its parts are named in 41.
- What New Case, the case page and the Dashboard do after a hand-off. Those are other modules' diagrams.
- The 'No clean drafts to sign' toast is in the store but the button is greyed out first, so it is shown dotted in 44.
- The Settings switches that pause Cadence are in the Settings diagrams.

## What the demo still does not do

- 'Sign all clean drafts' counts the clean drafts left on screen by the search and filters, but signs every clean draft at the sites in view (with Payer set to Cardinal the dialog says 5 and 29 are signed) (44).
- Some text in other tabs still names Case Manager: the Dashboard's 'Open Active cases' link, the 'Decision accepted' toast and 'Denial closed' notification in Denial Intelligence, the Payers 'Drafts updated' toast and notification and its History line (10, 23, 24).
- 'Start reauthorization' is reachable only for a request sent and approved today, after Fast-forward: every seed approval has a review this week and signing books the next one (31).
- The ledger case page's 'not approved yet' wording cannot be reached at the start: every ledger case not approved yet is also a request (60).
- The 'Consider a step-down' notes are two fixed IDs (R-0873, P-1522), a prompt not worked out from the ledger.
- A request sent today has no review this week, even when the payer approves it.
- The ledger's status and approval chance on the seed rows are stored; they do not follow the case page, the Dashboard or a reply from the payer, apart from 'On track' after a signature. A row for a request sent today does follow its request.
- The next review is booked from an interval alone. The demo does not send the signed review to the payer.
