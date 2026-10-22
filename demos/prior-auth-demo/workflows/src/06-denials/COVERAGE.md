# Coverage: Denial Intelligence (`/denials`, `/denials?id=`, `/denials?payer=&reason=`, `/denials/:id/brief`, `/denials/:id/report`)

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
| Quiet line under the page description 'Authorization denials only. Claim denials are handled in billing and are not in this demo.' (no control for claim denials) | 12 |
| Ghost button 'See on the Dashboard' (in the header card, under the payer line) | 11, 12, 60 |
| 'Add a denial letter' folded section (right column, above 'Open denials'; above the empty state when none is open), summary 'Drop a letter or use a sample', opened by click, Enter or Space; kept mounted while closed | 15, 25 |
| Inside it: drop area (click, Enter, Space, drag), 'Use sample letter', X on the file row, note box, 'Analyze the denial', 'Add the letter first, or use the sample letter.' (a new denial clears the filters) | 15, 17 |
| Four agent steps (Reader, Advocate, Historian, Integrity), toast 'The analysis is ready', leaving the page mid-way | 15 |
| Header card: small tag 'Authorization denial', program chip, D-id, type pill, '64% chance of overturning' pill, deadline pill, payer line, 'Your note' | 12, 50 |
| Header button 'Appeal analysis report' (under the 'Our read' tile) | 12, 70 |
| 'Our read' tile (Worth challenging, Borderline, Probably accept) | 12, 16 |
| Next-step block under the header card: the states where it stands (accepted, closed on an appeal decision, closed on a call, filed: appeal, second-level appeal or external review), the states under way (drafting with and without a draft, call booked) and the recommendation (nothing under way) | 13 |
| Block buttons, primary first: 'Plan the step-down', 'Record the payer's decision' then 'View the appeal', 'Open the draft', 'Open the brief' then 'Change the time' | 13, then 32, 33, 30, 20, 21, 60 |
| Recommended next step: one of six words (Ask for reconsideration, Correct and resubmit, Peer-to-peer review, File an appeal, Accept, Investigate by hand), the plain sentences under it, the mapping from the denial type, the request and the analysis | 24 |
| Recommendation buttons: 'Choose a time and prepare the brief', 'Draft the appeal letter', 'Draft the corrected request' (and its confirm 'Confirm the next step: correct and resubmit'), 'Accept the decision and plan the step-down', 'Read the findings' (scrolls to and focuses 'Where the denial is weak') | 24, 20, 30, 40 |
| 'Why FLO suggests this' folded section inside the recommendation (reasons, the rule, 'It is not a payer rule') | 24, 25 |
| Sentence 'Draft by FLO's agents. A clinician reviews and signs before anything is sent.' beside the recommendation, the draft letter (drawer), the call-booked block, the brief, the copied brief, the report (under the title and as footer, text and PDF) | 13, 24, 30, 21, 22, 71, 72 |
| 'What Cardinal said', 'What the chart shows' | 12 |
| 'What the agents did' folded section (summary names the agents, pill 'Done in 0:48') | 12, 25 |
| 'Where the denial is weak': severity pill, source chip, 'Suggested fix', 'Add to the evidence' and 'Added to the evidence' | 14 |
| 'Full summary' in the card header: pop-up 'Where the denial is weak, full summary', 'Copy all', 'Copy' on each recommendation, 'Close', X, Esc, click outside, 'Copied', 'Select the text and press Ctrl or Cmd C' | 14, 18 |
| Source drawer: X, Esc, click outside | 14 |
| 'The six ASAM dimensions' (left out for Late notice and Retro-authorization denied) | 12 |
| 'Full summary' in that card header: pop-up 'The six ASAM dimensions, full summary', 'Copy all', 'Copy' on each dimension, 'Close', X, Esc, click outside | 19 |
| 'Your options': three radio cards, 'Recommended' (the route of the recommended step), chances, 'Needs', a button under the cards only for a route the block above has no button for, 'A call is already booked...' ('Probably accept' on D-3306 recommends Accept) | 16 |
| Toast 'The peer-to-peer window has closed' | 16, 51 |
| 'What has happened' folded section (summary: step count and the latest step), timeline inside | 12, 25 |
| Every folded section: a real button with aria-expanded, Enter and Space, closed again when the page is reopened | 25 |
| 'Open denials' card: subtitle 'Soonest deadline first', count pill, rows (Tab, Enter, Space, click) with id, program chip, deadline pill, type and the tag 'Authorization denial', 'N% win chance', order, 'Closed' section, empty text | 11 |
| Link 'Report' on each row of the card | 11, 70 |

## Peer-to-peer

| Control | Diagram |
|---|---|
| Modal 'Confirm the next step: peer-to-peer call': three time cards (only times after the demo clock and before the payer's window closes), 'Booked now', 'Confirm and book the call', 'Cancel', X, Esc, click outside, 'No call time is left...' | 20, 50, 51 |
| Brief page: crumbs, 'Your opening', 'Three points to make', 'What they may say', 'The ask.', 'Call details', 'Chance of overturning' | 21 |
| Brief folded sections 'Key dates and numbers' (summary: call and window) and 'Have these open' (summary: ticks), kept in the page, open on paper | 21, 22, 25 |
| Brief page not-found state and 'Back to Denial Intelligence' | 21 |
| Brief page link 'Appeal analysis report' (top right) | 21, 22, 70 |
| 'Have these open' tick boxes (open the section first) | 21, 22 |
| 'Book the call' and 'Change the call time' | 20, 22 |
| 'Copy brief' (clipboard, fallback, both toasts) | 22 |
| 'Print' (off in the hosted preview, print layout) | 22 |
| 'Record the call outcome', modal: three outcome cards, note, 'Log the outcome', 'Cancel', X, Esc | 23 |
| Brief banner 'Outcome logged: ...' and 'Back to the denial' | 21, 23 |
| What each outcome does (closed, or written appeal started; scheduled call line leaves the History) | 23 |

## Appeal analysis report

| Control | Diagram |
|---|---|
| Ways in: header button, row link 'Report', brief link, address `/denials/:id/report`; not-found state and 'Back to Denial Intelligence' | 70 |
| Panel 'Generating appeal analysis' (Reader, Advocate, Historian), reduced motion, leaving mid-way, saved time, 'Reset demo data' | 70 |
| 'Regenerate' | 70, 72 |
| 'Back to the denial' link, crumbs 'Denial Intelligence' and the D-id | 70, 72 |
| The report: title block, 'Worked example' tag (D-3297), 'Our read', facts, chances, benchmark note | 71 |
| Every section: reasoning, what the chart shows as a whole, where the denial is weak (with 'Added to the evidence' or 'Not added yet'), the six ASAM dimensions (left out for Late notice and Retro-authorization denied), what we would do, options compared, criteria, documents with ticked fixes, pushback, the ask, outlook, timeline, how it was made | 71 |
| 'Copy report' ('Copied', clipboard fallback, 'Select the text and press Ctrl or Cmd C') | 72 |
| 'Download PDF' (jsPDF loaded on click, file name, toast 'PDF downloaded', toast 'Could not make the PDF', 'Download PDF is off in this preview') | 72 |
| 'Print' ('Print is off in this preview', print layout) | 72 |

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
| Result: toast, notification, 'Closed. You accepted the decision', 'Closed' list, step-down plan in Case Manager, accepted denial logged for Analytics | 40, 11, 13, 60 |

## Deadlines

| Control | Diagram |
|---|---|
| Time-left text, colours, sort order, closed windows (peer-to-peer, to file, to resubmit, filed) | 50, 11 |
| Call times follow the clock | 20, 50 |
| Overdue behaviour of options ('Deadline passed'), call booking, brief, appeal | 51 |

## Keyboard

Esc closes one layer per press: a menu, then the modal, then the drawer behind it (20, 23, 30, 31, 33, 40). Esc closes only the Full summary pop-up (18, 19). Tab stays inside a Full summary pop-up and focus returns to its button when it closes. Enter and Space open the file chooser (15) and a list row (11). Enter and Space open and close every folded section (25); Esc does not close one.

## Not drawn

- Print dialog contents and the exact print layout (diagrams 22 and 72 name the rules): browser behaviour.
- Page layout of the PDF (title band, running header, page numbers): described in 72 in words, not drawn.
- Dollar amounts: the demo no longer shows any 'at stake', 'at risk' or 'written off' figure on this screen. The amounts stay in the data and are passed to Analytics.
- Arrow-key use inside the 'Signing as' and 'Reason for the record' menus: shared menu component, owned by another module's diagram if at all.
- Resubmission path for D-3290 (chip 'Resubmitting', 'Packet is writing the resubmission'): the recommendation reads 'Correct and resubmit' and its button opens the written-letter flow (24, 30). The demo has no separate resubmission screen, so after the confirm step the drawer, the sign dialog and the chip 'Appeal filed' use the appeal's words.
- 'Ask for reconsideration' is on the list of six words but no demo denial maps to it: it needs a payer rule that names it, and none is invented (24).
- The appeal draft area has no inline section to fold: the letter lives in a drawer that opens from 'Open the draft' and closes with Esc (30).
- The report's evidence excerpts and reasoning stay open: the report is the document that is copied, saved as a PDF and printed (71, 72).
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
