# Coverage: Authorizations (queue and case page)

Every control on `/authorizations` and `/authorizations/case/:id` and the diagram that shows it. New case and Eligibility & Benefits are other modules; this module only hands off to them.

File names below are in `src/03-authorizations/`. Short names: 10 queue-overview, 12 bands, 14 tile, 16 filters, 18 signal, 20 ways-in, 22 header, 23 numbers, 24 tabs, 26 send-gates, 30 actions-tab, 32 card, 34 apply, 36 dismiss, 38 refine-and-context, 40 picture, 42 chip, 50 criteria, 60 risk, 62 modals, 70 draft-read-edit, 72 checks-versions, 74 send, 80 exits, 82 writes.

## Queue (`/authorizations`)

| Control | Diagram |
|---|---|
| Sidebar 'Authorizations' (and its badge), Demo menu 'Authorizations: the queue' | 10, 12 |
| Header line and sub line (filtered and unfiltered wording) | 10 |
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
| Empty queue: 'Nothing needs you today' + 'Open Case Manager' | 16, 80 |
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
| 'Back to queue' | 22, 80 |
| Header title chips, due pill, status line, Integrity badge | 22 |
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
| 'Refine recommendations' | 38 |
| 'Add clinical context' dialog: box, 'Add context', 'Cancel', X, Esc | 38 |
| 'Dismiss recommendations' | 30, 36 |
| Dismiss dialog: four reasons, 'Tell us in a few words', 'Dismiss and log', 'Cancel', X, Esc, dimmed area, gating warning | 36 |
| 'Logged decisions' | 30, 38 |
| Controls locked while the agents work | 30, 32, 34, 38 |

## Clinical picture, Payer criteria, Risk analysis

| Control | Diagram |
|---|---|
| Source chips (every tab) and the source dialog: 'Close', X, dimmed area, Esc | 40, 42, 50, 70 |
| 'Settle it' | 40 |
| ASAM dimensions, trend chart, 'What stands out', 'Engagement and behavior', 'Still open' (read only) | 40 |
| 'Go to the action', 'Open the action' | 50 |
| 'Re-check criteria' | 50 |
| Criteria table, facts, 'To keep the approval chance high' | 50 |
| Risk cards, 'Why this number' bars, 'Likely outcomes', 'How sure are we', 'Can you trust it?' (read only) | 60 |
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
| Dashboard chance and history written by Apply and Dismiss, notification 'Approval chance updated', queue after a request is sent | 82, 34, 74 |

## Not drawn

- Animations: the ring counting up (10 and 23 mention it), the fade-in of a tab, the chevron turn. Reduced-motion users get the value at once; no diagram of that.
- Hover states and the `title` hint on the greyed-out 'Send to payer' (shown as 'a hover hint' in 22 only).
- Chart and donut hover: the charts have no interaction in the code.
- Sidebar sub links ('New case', 'Eligibility & Benefits') and the global top bar: Global shell module.
- The Demo menu 'Fast-forward' and 'Reset demo data' only appear as notes (12, 16, 18): their own diagram is in Global shell.
- The 'Nothing needs you today' message is drawn (16) but cannot appear with the seed data, so it was not run in the app.

## Looks broken or dead in the demo

- After a request is signed and sent in New case, its case page still shows the old status line and due pill, and 'Send to payer' stays on (74).
- 'Open in review and sign' and 'Send to payer' only reach 'Review and sign' for requests with a seeded New case draft (R-0988). R-1042 opens at 'Agents work'. Every other request (even a ready one such as R-1142) opens a new draft at the 'Referral' step (26).
- 'Open in review and sign' is on even for requests already with the payer or denied (26).
- Edits and applied actions on the Draft tab are not carried into the New case summary that is signed (74).
- The dismiss toast says the reason 'feeds Analytics'; no Analytics screen reads it (36).
- 'Add clinical context' says Scribe will use it in the next draft; the draft text never changes (38).
- 'Refine recommendations' and 'Send back to Scribe' only show a toast (38, 72).
- About 27 Case Manager IDs (for example R-0903 in 'Ready to step down?') open 'Request not found' (20).
- Small copy slip: '+1 pts' on a one-point card (32).
