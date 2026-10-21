# Coverage: Authorizations (queue and case page)

Every control on `/authorizations` and `/authorizations/case/:id` and the diagram that shows it. New case and Eligibility & Benefits are other modules; this module only hands off to them.

File names below are in `src/03-authorizations/`. Short names: 10 queue-overview, 12 bands, 14 tile, 16 filters, 18 signal, 20 ways-in, 22 header, 23 numbers, 24 tabs, 26 send-gates, 30 actions-tab, 32 card, 34 apply, 36 dismiss, 38 refine, 39 context, 40 picture, 42 chip, 50 criteria, 60 risk, 62 modals, 70 draft-read-edit, 72 checks-versions, 74 send, 80 exits, 82 writes.

## Queue (`/authorizations`)

| Control | Diagram |
|---|---|
| Sidebar 'Authorizations' (and its badge), Demo menu 'Authorizations: the queue' | 10, 12 |
| Header line and sub line (filtered, unfiltered and 'Nothing needs action today' / 'Nothing is urgent' wording) | 10, 16 |
| 'New case' button | 10, 80 |
| Payer signal banner: 'Review the four' / 'Show all requests' | 18 |
| Payer signal banner: X 'Dismiss signal' | 18 |
| Chip 'Showing the 4 affected by the Cardinal signal' and its X 'Remove the Cardinal signal filter' | 18 |
| Tile 'Approval chance' (not clickable) | 10 |
| Tile 'Urgent' (click: Act now filter) | 10 |
| Tile 'In flight' (click: clear filters) | 10 |
| Tiles 'Approved', 'Denied' (not clickable) | 10 |
| Search box 'Search by case ID or initials' | 16 |
| '/' shortcut to the search box | 16 |
| 'Payer' menu and its seven options | 16 |
| 'Status' menu and its six options | 16 |
| 'Urgency' menu and its four options | 16 |
| Menu keys: Up, Down, Enter, Esc, click outside | 16 |
| 'Clear filters' (next to the menus) | 16, 18 |
| Empty result: 'No requests match these filters' + 'Clear filters' | 16 |
| Empty queue: 'Nothing needs you today' + 'Open Case Manager' (shown once no request is left open) | 16, 80 |
| Empty Act now band: 'Nothing needs you today' (the band stays, '0 requests') | 12, 16 |
| A request leaving its band (sent, decided by the payer, denial settled or appeal filed) | 12, 82 |
| Band header (collapse and expand) | 12 |
| 'Show N more' / 'Show fewer' | 12 |
| Ranking inside a band, band colours, band counts | 12 |
| Tile: request ID link | 14, 20 |
| Tile: 'Open' button | 14, 20 |
| Tile: 'Coverage needs a fix' pill (link) | 14, 80 |
| Tile: level chip, scores, status, 'Needs your input', rule note, due pill, '$ at risk', chance bar and word | 14 |

## Case page (`/authorizations/case/:id`)

| Control | Diagram |
|---|---|
| Ways in (queue ID and 'Open', Dashboard drawer 'Open case', Case Manager rows, step-down list and review drawer 'Open case', Eligibility result 'Open case', notification, typed address) | 20 |
| 'Request not found' + 'Back to queue' | 20 |
| Crumb 'Authorizations' | 22, 80 |
| 'Open in review and sign' | 22, 26, 74 |
| 'Send to payer' (header, actions side panel, Draft tab), on and off states and reasons | 22, 26, 30, 74 |
| Greyed-out 'Sent to payer' (header and actions side panel) once the request is with the payer or decided | 22, 30 |
| 'Open on the Dashboard' (next to the header status line, once the request is past Preparing) | 22, 80 |
| 'Back to queue' | 22, 80 |
| Header title chips, due pill or the request's current status chip, status line, Integrity badge | 22 |
| Tile 'Approval chance' / 'Chance to overturn' | 23 |
| Tile 'How sure are we' | 23 |
| Tile 'Days likely granted' / 'Days in question' | 23 |
| Banner 'This request was denied' + 'Open in Denial Intelligence' | 23, 80 |
| Two standing notes | 23 |
| Five tabs, address `?tab=`, tab badges | 24 |
| Jump to one card (`?rec=`, outline, scroll) | 24 |

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
| Banner 'Every recommendation is applied' | 30 |
| 'Apply selected (N)': missing answers, work strip, results | 34 |
| 'Refine recommendations' panel: three focuses, 'Apply focus', 'Cancel', X, Esc | 38 |
| Banner 'Focus: ...' and 'Clear focus'; card pill 'Added for your focus' | 30, 32, 38 |
| 'Add clinical context' dialog: box, 'Add context', 'Cancel', X, Esc | 39 |
| Side-panel card 'Context you added' (notes, '+1 pt') | 30, 39 |
| 'Dismiss recommendations' | 30, 36 |
| Dismiss dialog: four reasons, 'Tell us in a few words', 'Dismiss and log', 'Cancel', X, Esc, dimmed area, gating warning | 36 |
| Dismissal written to the list Analytics reads | 36, 82 |
| 'Logged decisions' | 30, 38, 39 |
| Controls locked while the agents work | 30, 32, 34, 38, 39 |

## Clinical picture, Payer criteria, Risk analysis

| Control | Diagram |
|---|---|
| Source chips (every tab) and the source dialog: 'Close', X, dimmed area, Esc | 40, 42, 50, 70 |
| 'Settle it' | 40 |
| ASAM dimensions, trend chart, 'What stands out', 'Engagement and behavior', 'Still open' (read only) | 40 |
| 'Go to the action', 'Open the action' | 50 |
| 'Re-check criteria' | 50 |
| Criteria table, facts, 'To keep the approval chance high' | 50 |
| Risk cards, 'Why this number' bars (with the 'Clinical context you added' row), 'Likely outcomes', 'How sure are we', 'Can you trust it?' (read only) | 60 |
| 'See all' and its dialog ('Close', X, dimmed area, Esc) | 60, 62 |
| 'How it is calculated' and its dialog ('Got it', X, dimmed area, Esc) | 60, 62 |
| 'Where this stands' banner | 60 |

## Draft

| Control | Diagram |
|---|---|
| 'Edit', section boxes, 'Cancel', 'Save changes' ('No changes to save', 'Draft saved') | 70 |
| Source chips in the draft, 'New' marks | 70, 42 |
| 'Checks' card (four checks, pill) and 'Re-check' | 72 |
| 'Versions' card, 'Current', 'View', version dialog ('Close', X, dimmed area, Esc) | 72 |
| 'Send back to Scribe' | 72 |
| 'Send to payer' (large) and what follows: New case, sign, Dashboard 'Received', queue | 74 |

## Hand-offs and side effects

| Item | Diagram |
|---|---|
| All links out of the queue and the case page | 80 |
| Dashboard chance and history written by Apply, Add context and Dismiss, notification 'Approval chance updated', clinical context list, dismissal list, queue after a request is sent or decided | 82, 34, 39, 74 |

## Not drawn

- Animations: the ring counting up (23 mentions it), the fade-in of a tab, the chevron turn. Reduced-motion users get the value at once; no diagram of that.
- Hover states and the `title` hint on the greyed-out 'Send to payer' (shown as 'a hover hint' in 22 only).
- Chart and donut hover: the charts have no interaction in the code.
- Sidebar sub links ('New case', 'Eligibility & Benefits') and the global top bar: Global shell module.
- The Demo menu 'Fast-forward' and 'Reset demo data' only appear as a note in 12; their own diagram is in Global shell.
- The whole-queue 'Nothing needs you today' message needs every one of the 56 requests to be sent or handled, so it was checked in the app only for the Act now band (all five requests cleared by signing, a payer reply and settling the denial).

## Still limited in the demo

- The routing of 'Open in review and sign' and 'Send to payer' into New case, 'Send back to Scribe' on the Draft tab, and what the Draft tab carries into the signed summary belong to the Draft tab and New case; they are drawn in 26, 72 and 74 and not repeated here. 'Open in review and sign' stays on even for a request already with the payer.
- Clinical context is saved in the shared list. The Draft tab and New case read it themselves; this page does not rewrite the draft text.
- Each of the first three notes of clinical context adds a point to the approval chance, whatever it says. A refinement is a fixed re-order plus one fixed card per focus, not a new reading of the chart.
- An ID with no queue row and no Dashboard request opens the Ledger case page when it is in the Case Manager ledger, and ends at 'Request not found' only when it is in neither (20).

## Fixed since the first mapping

- After a request is signed and sent, its case page shows the new status chip and line, a greyed-out 'Sent to payer' and 'Open on the Dashboard' (22, 30, 82).
- 'Refine recommendations' opens a panel and re-orders the cards, adds one card and moves the preview (38).
- 'Add clinical context' is saved in the shared list, shown on the page and nudges the approval chance by a point (39).
- The dismiss reason is written to the list Analytics reads (36).
- 'Nothing needs you today' can be reached: requests leave the queue when sent, decided or settled (12, 16).
- Small copy: '+1 pt' (not '+1 pts'), 'Nothing is urgent', '1 of 56 ... matches', 'Back to queue' on the not-found page.
