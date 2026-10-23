# Coverage: Authorizations (queue and case page)

Every control on `/authorizations` and `/authorizations/case/:id` and the diagram that shows it. New Case and Eligibility & Benefits are other modules; this module only hands off to them.

File names below are in `src/03-authorizations/`. Short names: 10 queue-overview, 11 site-view, 12 bands, 14 row, 15 quick-view, 16 filters, 17 request-type, 18 signal, 20 ways-in, 21 next-action, 22 header, 23 numbers, 24 tabs, 25 out-of-site, 26 send-gates, 27 facts-row, 28 history, 30 actions-tab, 32 card, 34 apply, 36 dismiss, 38 refine, 39 context, 40 picture, 42 chip, 50 criteria, 60 risk, 62 modals, 70 draft-read-edit, 72 checks-versions, 74 send, 80 exits, 82 writes.

## Queue (`/authorizations`)

| Control | Diagram |
|---|---|
| Sidebar 'Authorizations' (and its badge, which counts the sites in view), Demo menu 'Authorizations: the queue' | 10, 11, 12 |
| Top bar site switch ('Both sites', 'Site A', 'Site B') and the locked 'Site A only' label: what the queue does with them (the controls themselves are Global shell) | 11 |
| Demo menu 'Viewing as' (Jordan, Alex, Dr. Rivera, Sam): rows, bands, figures, badge and signal count follow the viewer; Site A + Site B = Both sites | 11 |
| Header names the site when one site is in view ('12 of 36 open requests at Site A need action today.') | 10, 11 |
| Header line and sub line (filtered, unfiltered and 'Nothing needs action today' / 'Nothing is urgent' wording) | 10, 16 |
| 'New Case' button | 10, 80 |
| Payer signal: one-line banner, 'Review the four' ('Review it' for one) / 'Show all requests'; the count is the affected requests in view | 18, 11 |
| Payer signal: info icon 'More about this signal' (hover, focus, Esc) | 18 |
| Payer signal: X 'Dismiss signal' | 18 |
| Chip 'Showing the 4 affected by the Cardinal signal' (one: 'Showing the request affected by the Cardinal signal') and its X 'Remove the Cardinal signal filter' | 18 |
| Figure 'Approval chance' (not clickable) | 10 |
| Figures 'Urgent now', 'Due within 24 hours', 'Waiting on you' (click: filter, click again: clear) | 10 |
| Approved and denied in the last 30 days (moved to Analytics, no longer on this page) | 10 |
| Search box 'Search by case ID or initials' | 16 |
| '/' shortcut to the search box | 16 |
| 'Payer' menu and its seven options | 16 |
| 'Request type' menu and its six entries (All request types, Initial, Concurrent review, Reauthorization, Modification / extension, Retrospective), the mapping of the nine request types | 17, 16 |
| 'Status' menu and its seven options (including 'Waiting on you') | 16 |
| Info icon 'What the statuses mean' next to 'Status' (hover, focus, Esc) | 16 |
| 'Urgency' menu and its four options | 16 |
| Info icon 'How the list is ordered' (right end of the filter bar) | 16, 12 |
| Menu keys: Up, Down, Enter, Esc, click outside | 16 |
| Filters in the web address (`?payer=`, `?type=` with `initial`, `concurrent`, `reauth`, `modify` or `retro`, `?status=`, `?urgency=`, `?q=`, `?signal=1`), opening a link with filters | 16, 17, 18 |
| Search and every filter reach only requests at the sites in view (a request at the other site is not found) | 16, 11 |
| 'Clear filters' (next to the menus) | 16, 17, 18 |
| Empty result: 'No requests match these filters' + 'Clear filters' | 16, 17 |
| Empty queue: 'Nothing needs you today' + 'Open Case Manager' (shown once no request is left open) | 16, 80 |
| Empty Act now band: 'Nothing needs you today' (the band stays, '0 requests') | 12, 16 |
| A request leaving its band (sent, decided by the payer, denial settled or appeal filed) | 12, 82 |
| Band header (collapse and expand) | 12 |
| 'Show N more' / 'Show fewer' | 12 |
| Ranking inside a band, band colours, band counts | 12 |
| Row: request ID link | 14, 20 |
| Row: small 'Quick view' icon button (aria-label 'Quick view R-1042') and a click on the row away from a link or button | 14, 15 |
| Quick view panel: Dashboard's request panel when the request is on the Dashboard, a lighter panel otherwise; contents, 'Open case', 'Review and sign' (while being prepared) | 15 |
| Quick view: `?quick=ID` in the address, opening on a fresh load, an unknown, finished or other-site ID opens nothing | 15, 11 |
| Quick view: Esc, X and the dimmed area close it; focus goes in, stays inside and returns to the row's button | 15 |
| Row: 'Open' button | 14, 20 |
| Row: 'Coverage needs a fix' pill (link) | 14, 80 |
| Row: program, payer, request type, status chip, 'Needs your input', deadline pill, 'Next: ...', approval chance number and band word | 14, 21 |
| Scores, agent line and payer note (no longer on the row; on the case page under 'At a glance') | 14, 22 |

## Case page (`/authorizations/case/:id`)

| Control | Diagram |
|---|---|
| Ways in (queue ID and 'Open', queue quick view 'Open case', Dashboard drawer 'Open case', Case Manager rows, step-down list and review drawer 'Open case', Eligibility result 'Open case', notification, typed address) | 20 |
| 'Request not found' + 'Back to queue' | 20 |
| A case at a site the viewer cannot see: card 'This case is not available at Site A' (no patient named), 'Show both sites' (viewers who have both), 'Back to the Dashboard' | 25, 20, 80 |
| Quiet site label at the end of the header sub line, and the 'Site' fact, for a viewer who can see both sites | 25, 22, 27 |
| Crumb 'Authorizations' | 22, 80 |
| 'Next:' block: sentence, why line, primary button ('Go to this action', 'Send to payer', 'Open on the Dashboard', 'Open in Denial Intelligence', 'Open the draft') | 21, 22 |
| 'Open in review and sign' | 22, 26, 74 |
| 'Send to payer' (Next block, actions side panel, Draft tab), on and off states and reasons | 21, 26, 30, 74 |
| Greyed-out 'Sent to payer' (Next block and actions side panel) once the request is with the payer or decided | 21, 22, 30 |
| 'Open on the Dashboard' (Next block, or next to the status line when the next action is something else) | 21, 22, 80 |
| 'Back to queue' | 22, 80 |
| Header title chips, due pill or the request's current status chip, info icon 'What the statuses mean' | 22 |
| Authorization facts row (request type, requested, approved with used and left, window or approval ends or next review, documents, waiting on, site) | 27 |
| 'At a glance': diagnosis, scores, agent line, payer note, Integrity badge | 22 |
| Tile 'Approval chance' / 'Chance to overturn' | 23 |
| Tile 'How sure are we' | 23 |
| Tile 'Days likely granted' / 'Days in question' (units for IOP) | 23 |
| One-line notice and the info icon 'About the approval chance' | 23 |
| Denial text (was a banner; now in the Next block) + 'Open in Denial Intelligence' | 21, 23, 80 |
| Five tabs, address `?tab=`, tab badges | 24 |
| Jump to one card (`?rec=`, outline, scroll) | 24, 21 |
| 'History' (closed by default, read only, lines labelled person or agent) | 28 |

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
| 'Send to payer' (large) and what follows: New Case, sign, Dashboard 'Received', queue | 74 |

## Hand-offs and side effects

| Item | Diagram |
|---|---|
| All links out of the queue and the case page | 80 |
| Dashboard chance and history written by Apply, Add context and Dismiss (History on the case page reads them), notification 'Approval chance updated', clinical context list, dismissal list, queue after a request is sent or decided | 82, 34, 39, 74, 28 |

## Not drawn

- Animations: the ring counting up (23 mentions it), the fade-in of a tab, the chevron turn. Reduced-motion users get the value at once; no diagram of that.
- Hover states and the `title` hint on the greyed-out 'Send to payer' (shown as 'a hover hint' in 21 only), and the tooltip 'Quick view' on the icon button.
- The top bar site switch, the locked 'Site A only' label and the Demo menu 'Viewing as' themselves: Global shell module. 11 and 25 only show what this module does with them.
- The Dashboard's request panel that the quick view reuses for a request on the Dashboard: Dashboard module ('Request drawer').
- Chart and donut hover: the charts have no interaction in the code.
- Sidebar sub links ('New Case', 'Eligibility & Benefits') and the global top bar: Global shell module.
- The Demo menu 'Fast-forward' and 'Reset demo data' only appear as a note in 12; their own diagram is in Global shell.
- The whole-queue 'Nothing needs you today' message needs every one of the 56 requests to be sent or handled, so it was checked in the app only for the Act now band (all five requests cleared by signing, a payer reply and settling the denial).

## Still limited in the demo

- The routing of 'Open in review and sign' and 'Send to payer' into New Case, 'Send back to Scribe' on the Draft tab, and what the Draft tab carries into the signed summary belong to the Draft tab and New Case; they are drawn in 26, 72 and 74 and not repeated here. 'Open in review and sign' stays on even for a request already with the payer.
- Clinical context is saved in the shared list. The Draft tab and New Case read it themselves; this page does not rewrite the draft text.
- Each of the first three notes of clinical context adds a point to the approval chance, whatever it says. A refinement is a fixed re-order plus one fixed card per focus, not a new reading of the chart.
- An ID with no queue row and no Dashboard request opens the Ledger case page when it is in the Case Manager ledger, and ends at 'Request not found' only when it is in neither (20).

## Changed in the fourth round (sites, five request types, quick view)

- Sites: the queue, its figures, the sidebar badge and the payer-signal count follow the viewer and the site switch; a case at another site shows a card; a viewer with both sites sees the site on the case page (11, 25, 20, 22, 27).
- Request type filter has five choices; Modification / extension maps the 'Modification' type, `?type=modify`, three queue requests carry it (17, 16).
- Quick view panel on each queue row (14, 15). Case facts gain 'Window' and 'Site' (27).
- Gotos into other modules now name the real titles of their diagrams.

## Changed in the second round (calmer screens)

- Queue: one-line rows (scores, agent line and payer note moved to the case page), four figures instead of five, one compact banner, request type filter, filters in the address, help for the status names and for the ordering (10, 12, 14, 16, 17, 18).
- Case page: 'Next:' block first, authorization facts, 'At a glance', one-line notice with an info icon instead of two banners, the denial banner folded into the Next block, closed History at the bottom (21, 22, 23, 27, 28).
- New Case 'R-... is with the payer' for a request that only the queue's seed data says is with the payer (26).

## Fixed since the first mapping

- After a request is signed and sent, its case page shows the new status chip and line, a greyed-out 'Sent to payer' and 'Open on the Dashboard' (22, 30, 82).
- 'Refine recommendations' opens a panel and re-orders the cards, adds one card and moves the preview (38).
- 'Add clinical context' is saved in the shared list, shown on the page and nudges the approval chance by a point (39).
- The dismiss reason is written to the list Analytics reads (36).
- 'Nothing needs you today' can be reached: requests leave the queue when sent, decided or settled (12, 16).
- Small copy: '+1 pt' (not '+1 pts'), 'Nothing is urgent', '1 of 56 ... matches', 'Back to queue' on the not-found page.
