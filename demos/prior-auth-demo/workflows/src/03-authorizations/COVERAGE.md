# Coverage: Authorizations (worklist and case page)

Every control on `/authorizations` and `/authorizations/case/:id` and the diagram that shows it. New Case and Eligibility & Benefits are other modules; this module only hands off to them. The functions Case Manager had (the Approved view and units, Reviews this week and the review drawer, saved drafts, step-down plans, the tracked quick view, the ledger case page, the old Case Manager links) are views and panels of this same page and are drawn in `src/07-case-manager/` (titled `Authorizations › ...`); the rows below name those diagrams as `07/NN`.

Source: `src/pages/authorizations/AuthorizationsPage.tsx`, `src/pages/authorizations/worklist/*` (`model.ts`: `buildWorkRows`, views, filters, sort; `WorkTable.tsx`, `WorkFilterBar.tsx`, `ViewChips.tsx`, `params.ts`, `useWorkRows.ts`), `QuickView.tsx`, `QuickViewLite.tsx`, `QueueTop.tsx` (the signal banner), `StatusHelp.tsx`, and for the case page `CasePage.tsx`, `CaseHeader.tsx` and `tabs/*`.

File names below are in `src/03-authorizations/`. Short names: 01 arrive, 02 views, 03 rows, 04 read a row, 05 row action, 06 quick view, 07 search and filter, 08 deadline, More and the Showing chip, 09 signal, 10 sort and page, 11 addresses, 12 sites, 20 ways-in, 21 next-action, 22 header, 23 numbers, 24 tabs, 25 out-of-site, 26 send-gates, 27 facts-row, 28 history, 30 actions-tab, 32 card, 34 apply, 36 dismiss, 38 refine, 39 context, 40 picture (the clinical rail), 42 chip, 44 screener chart, 46 framework, 50 criteria and risk, 62 pop-ups, 70 draft-read-edit, 72 checks-versions, 74 send, 80 exits, 82 writes.

## Worklist (`/authorizations`)

| Control | Diagram |
|---|---|
| Sidebar 'Authorizations' and 'All Authorizations' (same page), the badge (open requests due now or within 24 hours, at the sites in view), Demo menu path steps 'Authorizations: every request in one list' and 'Authorizations: reviews this week' | 01, 12, 07/40 |
| A plain `/authorizations` (sidebar, 'Back to Authorizations', crumbs) brings back the last view and filters used since the page loaded; never `?quick=` or `?review=`; a reload forgets them | 01, 11 |
| Title 'Authorizations' and the small site tag ('Site A') when one site is in view; no subtitle | 01, 12 |
| 'New Case' button | 01, 80 |
| 'Draft all due reviews' and 'Sign all clean drafts' (only on Reviews this week) | 01, 07/44 |
| 'N sent today' (only on With the payer, only when something was sent today; opens `/dashboard?stage=received`) | 01, 80, 07/34 |
| Payer signal: one-line banner, 'Review the four' ('Review it' for one, 'Review the three' at Site B) / 'Show all requests'; the count is the affected open requests in view | 09, 12 |
| Payer signal: info icon 'More about this signal' (hover, focus, Esc) | 09 |
| Payer signal: X 'Dismiss signal' (hidden until the data is reset; a filter that is on stays on) | 09 |
| View chips with counts: 'All', 'Needs attention'; 'In progress', 'With the payer', 'Approved', 'Denied' (these four add up to All); 'Reviews this week'; click to pick, click the chosen one again for All; `?view=`; counts follow search and filters, not the chosen view | 02, 01, 12 |
| What each view holds (life views; Needs attention and Reviews this week cut across) | 02, 03 |
| Search 'Search by patient, request ID or payer' (every ID the record is known by, initials, payer name; ignores case and punctuation) | 07 |
| '/' shortcut to the search box | 07 |
| 'All payers' menu and its six payers | 07 |
| 'All services' menu (Residential 3.5, IOP, PHP, Detox), `?program=` | 07 |
| 'All request types' menu (Initial, Concurrent review, Reauthorization, Modification / extension, Retrospective) and how each record's own type maps | 07 |
| 'Any deadline' menu with counts ('Act now · 12', 'Within 24 hours · 29', 'Next 7 days · 79'; counted in the chosen view), `?urgency=` | 08 |
| 'More' (opens a second row; reads 'More · on' while one of its filters is on): 'Any owner', 'Any status' (16 chips), info icon 'What the statuses mean', 'Cardinal payer signal · 4' | 08, 09 |
| Showing chip from the Dashboard ('Showing Active (approved, units left)', 'Showing Renewal due (review due or ending within 7 days)') and its X 'Remove this filter' | 08, 07/10 |
| Chip 'Showing the 4 affected by the Cardinal signal' ('Showing the request affected by the Cardinal signal' for one) and its X 'Remove the Cardinal signal filter' | 09 |
| Menu keys: Up, Down, Enter, Esc, click outside; a menu off its first option turns green | 07 |
| 'Clear filters' (next to 'More', once any filter is on; the view stays) | 07, 09 |
| Empty result 'No authorizations match' + 'Clear filters' (clears and goes back to All); no row at all: 'Nothing to track yet' + 'New Case' | 07 |
| Filters, view and panels in the address (`?view=`, `?q=`, `?payer=`, `?program=`, `?type=`, `?urgency=`, `?owner=`, `?state=`, `?signal=1`, `?show=`, `?quick=`, `?review=`); each change replaces the entry; values that are not choices are ignored | 07, 08, 11 |
| The queue's old `?status=` (you, input, preparing, ready, payer, denial) and Case Manager's `?tab=reviews` rewritten once in today's words | 11 |
| Table header line: 'N authorizations', 'Approval chance, open requests 79%', info icon 'About units and approval chance' | 01, 07/30 |
| Rows: one per request from the open queue requests, the ledger, the Dashboard requests, saved drafts and accepted denials; the list's own order | 03 |
| Row: request ID link (case page, or New Case for a saved draft) | 04, 20, 07/20 |
| Row: patient, level, payer, request type; notes 'New today', 'Updated for a payer change · date', 'Consider a step-down' (hover for the reason) | 04, 03, 07/24, 07/23 |
| Row: status chip and extra chips ('Needs your input', 'Needs action', 'Review due', 'Needs your update'); 'Coverage needs a fix' (link to Eligibility & Benefits) | 04, 80 |
| Row: units used line, bar and 'Runs out before review' | 04, 07/35 |
| Row: next action line; 'Open the draft in New Case' (a queue request with a saved draft, in progress) | 04, 07/20 |
| Row: deadline pill (the record's own words; dot in Act now; 'None') | 04, 07/32 |
| Row: owner (agent badge and name, or 'None'); chance (or 'None') | 04 |
| Row: the action button for an open request ('Go to action', 'Send to payer', 'Open the draft', 'Open on Dashboard', 'Open the denial', 'Review and sign', 'Open'); short labels with the full name in the tooltip | 05 |
| Row button of a ledger row, a review, a saved draft and an accepted denial | 07/31, 07/40, 07/20, 07/23 |
| Narrow windows: owner above the next action under 1400 px, chance under the deadline under 1240 px, status under the patient under 1100 px; no sideways scroll | 04 |
| Quick view: the small icon 'Quick view ID' and a click on the row away from links and buttons; `?quick=` (opening on a fresh load, an unknown or other-site ID is dropped); the row is highlighted | 06, 11, 12 |
| Quick view panels: Dashboard request panel, the lighter panel (its lines, 'Open case', 'Review and sign'), the tracked quick view | 06, 07/36 |
| Quick view: Esc, X and the dimmed area close it | 06 |
| Sort: 'Patient / request', 'Status', 'Deadline' ('Due' on Reviews this week), 'Chance' (up, down, back to the list's order; Chance two steps); 'Next action', 'Owner' and the button column do not sort | 10 |
| Pager: '1 to 15 of 95', 'Previous', 'Page 1 of 7', 'Next' (only past 15 rows; back to page 1 on any view, filter or sort change) | 10 |
| Sites: rows, every count, the average, the badge, the signal count, search and `?quick=` follow the viewer and the site switch; Site A + Site B = Both sites | 12 |
| Old Case Manager addresses (`/manager`, `/active`) and links from other tabs | 07/10 |

## Case page (`/authorizations/case/:id`)

| Control | Diagram |
|---|---|
| Ways in (a worklist row's ID and its 'Go to action', 'Open the draft', 'Open' or 'Open case', a quick view's 'Open case', the review drawer's 'Open case', Dashboard drawer 'Open case', Eligibility result 'Open case', notification, typed address) | 20 |
| 'Request not found': 'No request X' + 'Back to Authorizations' | 20 |
| A case at a site the viewer cannot see: card 'This case is not available at Site A' (no patient named), 'Show both sites' (viewers who have both), 'Back to the Dashboard' | 25, 20, 80 |
| Quiet site label at the end of the header sub line, for a viewer who can see both sites (said once, not again as a fact) | 25, 22, 27 |
| Crumb 'Authorizations' | 22, 80 |
| 'Next:' block: one line, primary button ('Go to this action', 'Send to payer', 'Open on the Dashboard', 'Open in Denial Intelligence', 'Open the draft') | 21, 22 |
| Chip 'Integrity 2/4' or 'Integrity 4/4' in the Next block while the request is prepared (hover: the open checks; click: opens 'Clinical picture & draft') | 21, 26, 72 |
| 'Open in review and sign' | 22, 26, 74 |
| 'Send to payer' (once, in the Next block), on and off states; the reason is its tooltip | 21, 26, 74 |
| Greyed-out 'Sent to payer' once the request is with the payer or decided | 21, 22, 26 |
| 'Open on the Dashboard' (Next block, or at the end of the diagnosis line when the next action is something else) | 21, 22, 80 |
| 'Back to Authorizations' (plain address: the last view and filters come back) | 22, 80 |
| Title line: ID, level and type chips, status pill (Preparing, Ready to sign, With the payer, Denial route, or the request's own status), due pill, info icon 'What the statuses mean' | 22 |
| Authorization facts row (approved with used and left, window or approval ends or next review, documents, workflow, waiting on); request type, days and site are in the title line only | 27 |
| Diagnosis line and scores | 22 |
| Figure 'Approval chance' / 'Chance to overturn' and the info icon 'About the approval chance' | 23 |
| Figure 'How sure are we' and the info icon 'About the similar cases' | 23 |
| Figure 'Days likely granted' / 'Days in question' (units for IOP) and the info icon 'About the days likely granted' | 23 |
| Three tabs, address `?tab=` (actions, draft, criteria), the five old names (`picture`, `risk` scroll to their section), tab badges | 24, 20 |
| Jump to one card (`?rec=`, outline, scroll) | 24, 21 |
| 'History': one list, closed by default, a flag on every line (Agent, Decision, Logged decision, Scheduled), no duplicates | 28 |

## Recommended actions

| Control | Diagram |
|---|---|
| Card checkbox and title (include or leave out) | 32 |
| 'Why this matters' | 32 |
| Answer box, 'Needs your input' and 'Answer added' pills, red error text | 32, 34 |
| 'Send note' (cards with a question) | 32 |
| 'Add a note', note box, 'Send note', 'Cancel' (cards without a question) | 32 |
| 'Open Eligibility & Benefits' (coverage card) | 32, 80 |
| 'Dismiss' on a card | 32, 36 |
| 'Applied (N)' lines (open to read) | 30 |
| 'Dismissed (N)' list and 'Bring back' | 30, 36 |
| Line 'Every recommendation is applied' | 30 |
| 'N of M selected' and 'Apply selected (N)': missing answers, work strip, results | 30, 34 |
| 'Refine recommendations' panel: three focuses, 'Apply focus', 'Cancel', X, Esc | 38 |
| Chip 'Focus: ...' and its X 'Clear focus'; card pill 'Added for your focus' | 30, 32, 38 |
| 'Add clinical context' pop-up: box, 'Add context', 'Cancel', X, Esc | 39 |
| Side-panel card 'Context you added' (notes, '+1 pt') | 30, 39 |
| 'Dismiss recommendations' | 30, 36 |
| Dismiss pop-up: four reasons, 'Tell us in a few words', 'Dismiss and log', 'Cancel', X, Esc, dimmed area, gating warning | 36 |
| Dismissal written to the list Analytics reads | 36, 82 |
| What was logged by hand lands in History at once, flagged 'Logged decision' (the 'Logged decisions' box is gone) | 28, 30, 38, 39 |
| Controls locked while the agents work | 30, 32, 34, 38, 39 |

## Clinical picture & draft

| Control | Diagram |
|---|---|
| The draft: sections, source chips, 'New' marks | 70, 42 |
| 'Edit', section boxes, 'Cancel', 'Save changes' ('No changes to save', 'Draft saved') | 70 |
| Fold 'Integrity checks' (four checks, pill) and 'Re-check' | 72 |
| Fold 'Versions', 'Current', 'View', version pop-up ('Close', X, dimmed area, Esc) | 72 |
| 'Send back to Scribe' | 72 |
| Clinical picture rail beside the draft; under it and folded at 1024 px and below | 40, 24 |
| Diagnosis line, status pill, source chip, 'In draft' | 40 |
| Screener chart: tooltip, keyboard, legend checkboxes, 'Add screener' menu, 'View results' pop-up | 44 |
| Framework name ('ASAM Criteria', 'LOCUS · adult mental health'), info icon 'Which framework applies', six rows, the dimension pop-up and 'Show in draft' | 46, 40 |
| Folds 'Medications', 'What stands out', 'Engagement' | 40 |
| Source chips and the source side panel: X, dimmed area, Esc | 42 |
| Sending: the header's 'Send to payer' and what follows (New Case, sign, Dashboard 'Received', the row moves to With the payer) | 74 |

## Criteria & risk

| Control | Diagram |
|---|---|
| Figures 'Criteria met' and 'Approval chance', 'See the breakdown' | 50, 62 |
| 'Biggest risks' chips (open the card on Recommended actions) | 50, 24 |
| Criterion rows (Met, Partial, Not met), the fold with evidence, quote, source chip, 'N pts at risk' and the action | 50 |
| 'Re-check criteria' | 50 |
| Criteria text that follows the framework (substance use or mental health) | 46, 50 |
| Fold 'Similar decisions', 'See all', 'How it is calculated' | 50, 62 |
| Pop-ups 'Why 62%' (bars and likely outcomes), 'Comparable decisions', 'How the approval chance is calculated' ('Close', 'Got it', X, dimmed area, Esc) | 62 |

## Hand-offs and side effects

| Item | Diagram |
|---|---|
| All links out of the worklist page and the case page | 80 |
| Dashboard chance and history written by Apply, Add context and Dismiss (History on the case page reads them), notification 'Approval chance updated', clinical context list, dismissal list, the request's row in Authorizations (its chance; after it is sent or decided) | 82, 34, 39, 74, 28 |

## Not drawn

- Animations: the ring counting up (23 mentions it), the fade-in of a tab, the chevron turn. Reduced-motion users get the value at once; no diagram of that.
- Hover states and the `title` hint on the greyed-out 'Send to payer' (shown as 'a hover hint' in 21 only), and the tooltip 'Quick view' on the icon button.
- The top bar site switch, the locked 'Site A only' label and the Demo menu 'Viewing as' themselves: Global shell module. 12 and 25 only show what this module does with them.
- The Dashboard's request panel that the quick view reuses for a request on the Dashboard: Dashboard module ('Request drawer').
- Chart and donut hover: the charts have no interaction in the code.
- Sidebar sub links ('New Case', 'Eligibility & Benefits'), the Authorizations arrow that opens and closes the group, and the global top bar: Global shell module.
- The Demo menu 'Fast-forward' and 'Reset demo data' only appear as notes; their own diagram is in Global shell.
- The sort key 'payer' exists in the code but no header uses it.
- 'Nothing to track yet' needs every record gone, which the demo cannot reach.

## Still limited in the demo

- The routing of 'Open in review and sign' and 'Send to payer' into New Case, 'Send back to Scribe' on the Draft tab, and what the Draft tab carries into the signed summary belong to the Draft tab and New Case; they are drawn in 26, 72 and 74 and not repeated here. 'Open in review and sign' stays on even for a request already with the payer.
- Clinical context is saved in the shared list. The Draft tab and New Case read it themselves; this page does not rewrite the draft text.
- Each of the first three notes of clinical context adds a point to the approval chance, whatever it says. A refinement is a fixed re-order plus one fixed card per focus, not a new reading of the chart.
- An ID with no queue record and no Dashboard request opens the ledger case page when it is in the ledger, and ends at 'Request not found' only when it is in neither (20).
- The lighter quick view and the Dashboard panel do not give focus back to the row's icon when they close (the panel looks for `[data-quick="ID"]`, the icon carries an empty `data-quick`); the tracked quick view does (06).
- The status help tip still says 'Approved, Completed: These leave the queue. See the Dashboard and Case Manager.' (08).
- The view chips' counts and the table follow the filters, but 'Sign all clean drafts' signs every clean draft in view whatever the filters (07/44).

## Changed in round 7 (one worklist)

- The queue (bands, tiles, four figures, the 'Urgency' and 'Status' menus, 'Show N more', the empty 'Open Case Manager' message) is replaced by one table with view chips; its diagrams 10 to 18 became 01 to 12. Case Manager's functions are views and panels of the same page (07).
- The case page is unchanged apart from 'Back to Authorizations', the 'Authorizations' crumb and the words for where its row goes (20, 21, 22, 26, 27, 34, 39, 74, 80, 82). 80 is now 'Where the worklist and the case page lead'.

## Changed in the fourth round (sites, five request types, quick view)

- Sites: the list, its counts, the sidebar badge and the payer-signal count follow the viewer and the site switch; a case at another site shows a card; a viewer with both sites sees the site on the case page (12, 25, 20, 22, 27).
- Request type filter has five choices; Modification / extension maps the 'Modification' type, `?type=modify` (07).
- Quick view panel on each row (04, 06). Case facts gain 'Window' and 'Site' (27).

## Fixed since the first mapping

- After a request is signed and sent, its case page shows the new status chip and line, a greyed-out 'Sent to payer' and 'Open on the Dashboard' (22, 30, 82).
- 'Refine recommendations' opens a panel and re-orders the cards, adds one card and moves the preview (38).
- 'Add clinical context' is saved in the shared list, shown on the page and nudges the approval chance by a point (39).
- The dismiss reason is written to the list Analytics reads (36).
