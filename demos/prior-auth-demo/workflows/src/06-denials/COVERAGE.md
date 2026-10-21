# Coverage: Denial Intelligence (`/denials`, `/denials?id=`, `/denials?payer=&reason=`, `/denials/:id/brief`)

Files are in this folder. A control listed with two files is drawn in the first and continued in the second.

## Global entries

| Control | Diagram |
|---|---|
| Sidebar 'Denial Intelligence' and its badge (8 at the start) | 10 |
| Demo menu, Suggested path 'Denial Intelligence: D-3318' | 10 |
| Notification rows ('Denied today', 'Denied', 'Partly approved', 'Denial analyzed', 'Appeal filed', 'Appeal decision', 'Call outcome', 'Denial closed') | 10, 60 |
| Ask FLO link 'Open Denial Intelligence' | 10 |
| Analytics row 'Common denial reasons by payer' (opens with that payer and reason as filters); Authorizations banner 'Open in Denial Intelligence'; Dashboard drawer 'Open in Denial Intelligence' | 10, 17, 60 |
| Demo menu 'Fast-forward 1 hour', 'Fast-forward 1 day', 'Reset demo data' | 50 |

## Denial Intelligence page

| Control | Diagram |
|---|---|
| Address `?id=` (known, unknown, closed here, none) and the 'We could not find ... Showing ... instead.' banner | 10, 17 |
| Address `?payer=` and `?reason=`: chip row 'Showing', chip X ('Remove filter ...'), 'Clear', subtitle 'N of M match the filters', in-list text 'No open denials match the filters.', empty state 'No open denials match these filters' with 'Clear filters', `?id=` kept beside the filters | 11, 17 |
| Empty state 'No open denials' and its link 'Open the Dashboard' | 10, 60 |
| Page header button 'See on the Dashboard' | 11, 12, 60 |
| 'Add a denial letter': drop area (click, Enter, Space, drag), 'Use sample letter', X on the file row, note box, 'Analyze the denial', 'Add the letter first, or use the sample letter.' (a new denial clears the filters) | 15, 17 |
| Four agent steps (Reader, Advocate, Historian, Integrity), toast 'The analysis is ready', leaving the page mid-way | 15 |
| Header card: program chip, D-id, type pill, status pill, '$ at stake', deadline pill, payer line, 'Your note' | 12, 50 |
| 'Our read' tile (Worth challenging, Borderline, Probably accept) | 12, 16 |
| Status banner: accepted, closed on an appeal decision, closed on a call, filed (appeal, second-level appeal or external review), drafting (with and without a draft), call booked, none | 13 |
| Banner buttons 'Plan the step-down', 'See on the Dashboard', 'View the appeal', 'Record the payer's decision', 'Open the draft', 'Change the time', 'Open the brief' | 13, then 32, 33, 30, 20, 21, 60 |
| 'What the agents did', 'What Cardinal said', 'What the chart shows' | 12 |
| 'Where the denial is weak': severity pill, source chip, 'Suggested fix', 'Add to the evidence' and 'Added to the evidence' | 14 |
| Source drawer: X, Esc, click outside | 14 |
| 'The six ASAM dimensions' (left out for Late notice and Retro-authorization denied) | 12 |
| 'Your options': three radio cards, 'Recommended', chances, 'Needs', button under the cards, 'A call is already booked...' ('Probably accept' on D-3306 recommends Accept) | 16 |
| Toast 'The peer-to-peer window has closed' | 16, 51 |
| 'What has happened' timeline | 12 |
| 'Open denials' card: count pill, rows (Tab, Enter, Space, click), route pills, order, 'Closed' section, empty text | 11 |

## Peer-to-peer

| Control | Diagram |
|---|---|
| Modal 'Confirm the next step: peer-to-peer call': three time cards (only times after the demo clock and before the payer's window closes), 'Booked now', 'Confirm and book the call', 'Cancel', X, Esc, click outside, 'No call time is left...' | 20, 50, 51 |
| Brief page: crumbs, 'Your opening', 'Three points to make', 'What they may say', 'The ask.', 'Key dates and numbers', 'Call details', 'Chance of overturning' | 21 |
| Brief page not-found state and 'Back to Denial Intelligence' | 21 |
| 'Have these open' tick boxes | 21, 22 |
| 'Book the call' and 'Change the call time' | 20, 22 |
| 'Copy brief' (clipboard, fallback, both toasts) | 22 |
| 'Print' (off in the hosted preview, print layout) | 22 |
| 'Record the call outcome', modal: three outcome cards, note, 'Log the outcome', 'Cancel', X, Esc | 23 |
| Brief banner 'Outcome logged: ...' and 'Back to the denial' | 21, 23 |
| What each outcome does (closed, or written appeal started; scheduled call line leaves the History) | 23 |

## Written appeal

| Control | Diagram |
|---|---|
| Modal 'Confirm the next step: written appeal': 'Draft the appeal', 'Cancel', X, Esc | 30 |
| Appeal drawer: drafting spinner, letter box, evidence tick boxes, X, Esc, click outside | 30, 31 |
| 'Save draft' and the toast 'Draft saved' | 31 |
| 'Sign and file' (drawer) and modal 'Sign and file the appeal': 'Signing as', attestation tick box, 'Sign and file', 'Cancel', X, Esc (closes only the modal; the drawer keeps unsaved edits) | 31 |
| Appeal filed toast, notification, banner 'Appeal filed. Waiting on the payer' | 31, 32 |
| 'View the appeal' (read-only drawer, 'Close') | 32 |
| 'Record the payer's decision', modal: three result cards (Overturned, Partly overturned, Upheld), note, 'Next step' for Upheld ('Appeal to the next level' with its new deadline, or 'Accept the denial' with a reason), 'Record the decision', 'Record and start the second-level appeal', 'Record and accept the denial', 'Cancel', X, Esc | 33 |
| Banners 'Overturned on appeal' and 'Partly overturned on appeal'; ladder Appeal, Second-level appeal, External review | 13, 33 |
| Decision clock, daily check, receipt (PRD parts marked) | 32 |

## Accept

| Control | Diagram |
|---|---|
| Modal 'Accept the decision?': 'Reason for the record' menu (four reasons), note, 'Accept and close', 'Cancel', X, Esc | 40 |
| Result: toast, notification, 'Closed. You accepted the decision', 'Closed' list, step-down plan in Case Manager, write-off counted in Analytics | 40, 11, 13, 60 |

## Deadlines

| Control | Diagram |
|---|---|
| Time-left text, colours, sort order, closed windows (peer-to-peer, to file, to resubmit, filed) | 50, 11 |
| Call times follow the clock | 20, 50 |
| Overdue behaviour of options ('Deadline passed'), call booking, brief, appeal | 51 |

## Keyboard

Esc closes one layer per press: a menu, then the modal, then the drawer behind it (20, 23, 30, 31, 33, 40). Enter and Space open the file chooser (15) and a list row (11).

## Not drawn

- Print dialog contents and the exact print layout: browser behaviour.
- Arrow-key use inside the 'Signing as' and 'Reason for the record' menus: shared menu component, owned by another module's diagram if at all.
- Resubmission path for D-3290 (chip 'Resubmitting', 'Packet is writing the resubmission'): the demo has no screen or button for it. Only the options card applies.
- PRD 05 steps with no screen in the demo: receipt call after sending, expedited 72-hour clock, deemed exhaustion, the member's signed request for a state fair hearing, argument library. Drawn in 32 only as PRD notes.
- PRD 04 items with no screen in the demo: categorisation, reasoning cards and validity, root cause, route override, resubmit corrected, partial review, refused peer-to-peer, escalation dossier, prevention rules, claim denials, continuity decision.
- Dashboard demo controls 'Denies' and 'Approves part': they belong to the Dashboard module. Only their result (a new D- number here) is shown in 10.

## Demo oddities seen

- D-3306 (Summit, 27%, 'Probably accept') is added to the Dashboard's requests by the denials store when the demo starts, so the Dashboard counts 40 requests and 8 in 'Appeal or call'.
- The next-level windows (60 days for a second-level appeal, 120 for external review) and the 30-day decision date are demo values. External review is filed through the same sign step; in production no agent files at that level.
- A filed appeal never changes by itself, whatever the clock. The person records the payer's decision (32, 33).
- After a deadline passes, the appeal option reads 'Deadline passed' and filing still works (51).
- A booked call time that has passed stays on the banner and the brief. The demo does not mark it missed.
- The brief page opens for any request id, even a filed appeal, and can log an outcome again.
