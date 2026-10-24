# Coverage: Denial Intelligence (`/denials`, `/denials?payer=&reason=&view=&sort=`, `/denials/:id`, `/denials/:id/brief`, `/denials/:id/report`)

`/denials` is the dashboard of open denials; each denial has its own page at `/denials/:id`. An older `/denials?id=` link is replaced by `/denials/:id`. 'Add a denial letter' and the options' detail are right-hand panels (the `Drawer`), the full summaries and the dimensions are pop-ups, and every list, figure, denial, brief and report follows the site view (diagram 26).

Files are in this folder. A control listed with two files is drawn in the first and continued in the second.

## Global entries

| Control | Diagram |
|---|---|
| Sidebar 'Denial Intelligence' (opens the dashboard) and its badge (8 at the start for Both sites, 4 for Site A, 4 for Site B) | 10, 26 |
| Demo menu, Suggested path 'Denial Intelligence: D-3318' | 10 |
| Notification rows ('Denied today', 'Denied', 'Partly approved', 'Denial analyzed', 'Appeal filed', 'Appeal decision', 'Call outcome', 'Denial closed'); the older `?id=` ones open `/denials/:id` | 10, 60 |
| Ask FLO link 'Open Denial Intelligence' | 10 |
| Dashboard Do next 'Open denial'; Dashboard drawer and Authorizations case page (also from Case Manager) 'Open in Denial Intelligence'; Analytics case panel 'Open the denial' | 10, 60 |
| Analytics 'Open in Denial Intelligence' on a reason, rows of 'Common denial reasons by payer' (the dashboard with that payer and reason) | 10, 17 |
| Demo menu 'Fast-forward 1 hour', 'Fast-forward 1 day', 'Reset demo data' | 50 |

## Dashboard of open denials

| Control | Diagram |
|---|---|
| Title row 'Denial Intelligence', the (i) with 'Authorization denials only. Claim denials are handled in billing and are not in this demo.', the 'Site A' tag | 11, 26 |
| Button 'Add a denial letter' (title row, and the empty state) | 11, 15 |
| Figures 'Open', 'Deadlines this week', 'To decide', 'Peer-to-peer booked', 'Appeals in progress', 'Closed' (buttons with aria-pressed, `?view=`) | 11, 17 |
| Payer chips 'All payers' and one per payer with its count (`?payer=`), chip 'Reason: ...' with 'Clear the reason' (`?reason=`) | 17 |
| Table: Denial (id link), Patient, Payer, Level of care, Denied, Chance, Next step and its date, Deadline, Owner; 'New' on a letter just analyzed | 11, 15 |
| Column headings (sort buttons, aria-sort, `?sort=`) | 11 |
| A row, or its id link by keyboard: opens `/denials/:id` | 11, 12 |
| Closed view: Outcome and Closed date columns | 11, 13, 40 |
| Empty states 'No open denials' ('Add a denial letter', 'Open the Dashboard'), 'No denials match these filters' ('Clear filters'), 'No closed denials yet' | 11, 17 |
| Letter panel 'Add a denial letter': drop area (click, Enter, Space, drag), the shared import ('Import a file', 'Paste a screenshot', review and 'Apply'), 'Use sample letter', X on the letter row, pills of what was read, pill 'Identifiers removed on upload', note box, 'Analyze the denial', 'Add the letter first, or use the sample letter.' | 15 |
| Four agent steps (Reader, Advocate, Historian, Integrity), toast 'The analysis is ready', Escape or X mid-way (keeps going), leaving the page mid-way (stops); the new denial is listed first | 15 |

## A denial's page

| Control | Diagram |
|---|---|
| Address `/denials/:id` (known, unknown: 'We could not find denial D-xxxx', at another site, a request that is not a denial); a new key per denial, so History and dialogs start fresh | 10, 26, 25 |
| Direct link to a denial, brief or report at a site the viewer is not looking at: out-of-site card ('This denial is not available at Site A', 'brief', 'report'), 'Show Site B' for a both-sites viewer | 26, 10 |
| Crumbs 'Denial Intelligence' (the dashboard) and the D-id | 12 |
| Header card: D-id, level of care chip, type pill, the read pill, '64% chance of overturning', the deadline pill (left out once filed or settled), payer, initials and age, diagnosis, letter name, 'Note: ...' | 12, 50 |
| Header links 'Appeal analysis report' and 'Case R-0997' | 12, 70, 60 |
| 'Your options': three choices with chance, 'likely' range and what each gets back, 'Recommended', the buttons 'Book a call', 'Draft the appeal' ('Draft the corrected request'), 'Accept the decision'; 'Compare the options' | 16, 12 |
| The route under way or settled inside its own choice: 'Call booked ...' with 'Open the brief' and 'Change the time'; 'Advocate is drafting' or 'Drafted, ready to sign' with 'Open the draft'; 'Appeal filed ... · decision ...' with 'Record the payer's decision' and 'View the appeal'; 'Accepted ...' with 'Plan the step-down'; 'Overturned on appeal', 'Partly overturned on appeal', 'Overturned on the call', 'Partly restored on the call'; 'Upheld on the call', 'Window closed' | 13, then 20, 21, 30, 32, 33, 40, 60 |
| Recommended step: one of six words, the 'Recommended' pill, the word as the dashboard's next step, the pill 'Investigate by hand' when no route is picked | 24 |
| 'Compare the options' panel: three radio cards, chances, 'Needs', footer button for the route picked ('Book a call' or 'Change the time', 'Draft the appeal', 'Accept the decision'), 'Why FLO suggests ...' and the reasons, toast 'The peer-to-peer window has closed' | 16, 24, 51 |
| Sign-off as a control state: 'Sign-off: A clinician signs before it is filed' (confirm), 'Draft · a clinician signs before filing' (drawer), 'Draft for clinician review' (brief), the report's line under the title and footer | 30, 21, 71, 72 |
| 'What Cardinal said', 'What the chart shows' | 12 |
| 'Where the denial is weak': severity pill, source chip, 'Fix: ...', 'Add to the evidence' and 'Added to the evidence' | 14 |
| 'Full summary' in that card header: pop-up 'Where the denial is weak, full summary', 'Copy all', 'Copy' on each recommendation, 'Close', X, Esc, click outside, 'Copied', 'Select the text and press Ctrl or Cmd C' | 14, 18 |
| Source drawer: X, Esc, click outside | 14 |
| Framework card titled 'ASAM Criteria', 'LOCUS' or 'CALOCUS-CASII' (left out for Late notice and Retro-authorization denied): six rows, each a button opening the dimension pop-up (reading, long text, source, 'Copy', 'Close', Esc) | 19 |
| 'Full summary' in that card header: pop-up 'ASAM Criteria, full summary', 'Copy all', 'Copy' on each dimension, 'Close', X, Esc, click outside | 19 |
| 'History' folded section: one list newest first, flags 'Agent', 'Decision' (good, mid, risk), 'Logged decision', 'Scheduled' | 25 |
| Every folded section: a real button with aria-expanded, Enter and Space, closed again when a denial is opened | 25 |

## Sites

| Control | Diagram |
|---|---|
| Top bar site switcher (Both sites, Site A, Site B) and Demo menu 'Viewing as' (Jordan Perez, Alex Morgan, Dr. Rivera, Sam Okafor): the figures, the payer chips, the table, Closed and the badge follow the view | 26 |
| A one-site viewer (Dr. Rivera, Site A; Sam Okafor, Site B) never sees, counts or lists the other site's denials; every figure for Both sites = Site A plus Site B (Open 8 = 4 + 4) | 26, 11 |
| A letter-added denial belongs to the site in view (Site A when both are in view), recorded on the denial, with a D- number the site rule places at that site | 15, 26 |
| Step-down plan in Case Manager and the accepted denial in Analytics follow the denial's site | 26, 40 |

## Peer-to-peer

| Control | Diagram |
|---|---|
| Modal 'Confirm the next step: peer-to-peer call': three time cards (only times after the demo clock and before the payer's window closes), pill 'Booked', 'Confirm and book the call', 'Cancel', X, Esc, click outside, 'No call time is left...' | 20, 50, 51 |
| Brief page: crumbs (Denial Intelligence, the D-id, Brief), pill 'Draft for clinician review', 'Your opening', 'Three points to make', 'What they may say', 'The ask.', 'Call details', 'Chance of overturning' | 21 |
| Brief folded sections 'Key dates and numbers' and 'Have these open' (count of ticks on the right), kept in the page, open on paper | 21, 22, 25 |
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
| Ways in: header link on the denial, brief link, address `/denials/:id/report`; not-found state and 'Back to Denial Intelligence' | 70 |
| Panel 'Generating appeal analysis' (Reader, Advocate, Historian), reduced motion, leaving mid-way, saved time, 'Reset demo data' | 70 |
| 'Regenerate' | 70, 72 |
| 'Back to the denial' link, crumbs 'Denial Intelligence' and the D-id | 70, 72 |
| The report: title block, 'Worked example' tag (D-3297), 'Our read', facts, chances, benchmark note | 71 |
| Every section: reasoning, what the chart shows as a whole, where the denial is weak (with 'Added to the evidence' or 'Not added yet'), the framework's dimensions ('ASAM Criteria dimensions', 'LOCUS dimensions'; left out for Late notice and Retro-authorization denied), what we would do, options compared, criteria, documents with ticked fixes, pushback, the ask, outlook, timeline, how it was made | 71 |
| 'Copy report' ('Copied', clipboard fallback, 'Select the text and press Ctrl or Cmd C') | 72 |
| 'Download PDF' (jsPDF loaded on click, file name, toast 'PDF downloaded', toast 'Could not make the PDF', 'Download PDF is off in this preview') | 72 |
| 'Print' ('Print is off in this preview', print layout) | 72 |

## Written appeal

| Control | Diagram |
|---|---|
| Modal 'Confirm the next step: written appeal': 'Draft the appeal', 'Cancel', X, Esc | 30 |
| Appeal drawer: drafting spinner 'Advocate is drafting the letter', chips Advocate and Integrity, letter box, evidence tick boxes, X, Esc, click outside | 30, 31 |
| 'Save draft' and the toast 'Draft saved' | 31 |
| 'Sign and file' (drawer) and modal 'Sign and file the appeal': 'Signing as', attestation tick box, 'Sign and file', 'Cancel', X, Esc (closes only the modal; the drawer keeps unsaved edits) | 31 |
| Appeal filed toast, notification, 'Appeal filed ... · decision ...' in the written appeal choice | 31, 32 |
| 'View the appeal' (read-only drawer, pill 'Filed letter, read only', 'Close') | 32 |
| 'Record the payer's decision', modal: three result cards (Overturned, Partly overturned, Upheld), note, 'Next step' for Upheld ('Appeal to the next level' with its new deadline, or 'Accept the denial' with a reason), 'Record the decision', 'Record and start the second-level appeal', 'Record and accept the denial', 'Cancel', X, Esc | 33 |
| 'Overturned on appeal' and 'Partly overturned on appeal' in the written appeal choice; ladder Appeal, Second-level appeal, External review | 13, 33 |
| Decision clock, daily check, receipt (PRD parts marked) | 32 |

## Accept

| Control | Diagram |
|---|---|
| Modal 'Accept the decision?': 'Reason for the record' menu (four reasons), note, 'Accept and close', 'Cancel', X, Esc | 40 |
| Result: toast, notification, 'Accepted ...' in the accept choice, the dashboard's 'Closed', step-down plan in Case Manager, accepted denial logged for Analytics, 'Logged decision' in History | 40, 11, 13, 25, 60 |

## Deadlines

| Control | Diagram |
|---|---|
| Time-left text, colours, sort order, closed windows (peer-to-peer, to file, to resubmit, filed) | 50, 11 |
| Call times follow the clock | 20, 50 |
| Overdue behaviour of options ('Deadline passed'), call booking, brief, appeal | 51 |

## Keyboard

Esc closes one layer per press: a menu, then the modal, then the drawer behind it (20, 23, 30, 31, 33, 40); the 'Compare the options' and 'Add a denial letter' panels close with Esc, X or a click on the dimmed area, and focus goes back to the button that opened them (15, 16). Esc closes only a Full summary or dimension pop-up, and focus returns to its button or row (18, 19). Tab reaches every table heading (sort) and every row's id link; Enter opens the denial (11). Enter and Space open the file chooser (15). Enter and Space open and close every folded section (25); Esc does not close one.

## Not drawn

- Print dialog contents and the exact print layout (diagrams 22 and 72 name the rules): browser behaviour.
- Page layout of the PDF (title band, running header, page numbers): described in 72 in words, not drawn.
- Dollar amounts: the demo no longer shows any 'at stake', 'at risk' or 'written off' figure on this screen. The amounts stay in the data and are passed to Analytics.
- Arrow-key use inside the 'Signing as' and 'Reason for the record' menus: shared menu component, owned by another module's diagram if at all.
- Resubmission path for D-3290 (chip 'Resubmitting', 'Packet is writing the resubmission'): the recommendation reads 'Correct and resubmit' and its button opens the written-letter flow (24, 30). The demo has no separate resubmission screen, so after the confirm step the drawer, the sign dialog and the chip 'Appeal filed' use the appeal's words.
- 'Ask for reconsideration' is on the list of six words but no demo denial maps to it: it needs a payer rule that names it, and none is invented (24).
- The appeal draft area has no inline section to fold: the letter, with its 'Evidence to attach' list, already lives in a right-hand drawer that opens from 'Open the draft' and closes with Esc (30).
- The report's evidence excerpts and reasoning stay open: the report is the document that is copied, saved as a PDF and printed (71, 72).
- PRD 05 steps with no screen in the demo: receipt call after sending, expedited 72-hour clock, deemed exhaustion, the member's signed request for a state fair hearing, argument library. Drawn in 32 only as PRD notes.
- PRD 04 items with no screen in the demo: categorisation, reasoning cards and validity, root cause, route override, resubmit corrected, partial review, refused peer-to-peer, escalation dossier, prevention rules, claim denials, continuity decision.
- Dashboard demo controls 'Denies' and 'Approves part': they belong to the Dashboard module. Only their result (a new D- number here, read with LOCUS when the case is a mental health condition alone, such as I-2166) is shown in 10 and 19.

## Demo oddities seen

- D-3306 (Summit, 27%, 'Probably accept') is added to the Dashboard's requests by the denials store when the demo starts, so the Dashboard counts 40 requests and 8 in 'Appeal or call'.
- The next-level windows (60 days for a second-level appeal, 120 for external review) and the 30-day decision date are demo values. External review is filed through the same sign step; in production no agent files at that level.
- A filed appeal never changes by itself, whatever the clock. The person records the payer's decision (32, 33).
- After a deadline passes, the appeal option reads 'Deadline passed' and filing still works (51).
- A booked call time that has passed stays in the peer-to-peer choice and on the brief. The demo does not mark it missed.
- A call booked by the Dashboard demo control has no time picked, so the choice reads 'Call booked' alone until 'Change the time'.
- The brief page opens for any request id, even a filed appeal, and can log an outcome again.
