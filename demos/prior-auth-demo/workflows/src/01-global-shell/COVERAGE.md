# Coverage: Global shell

Source: `src/App.tsx`, `src/routes.ts`, `src/pages/manager/ManagerRedirect.tsx`, `src/lib/floAnswers.ts`, `src/components/layout/*` (the sidebar's `GroupItem`), (including the site switcher, the Demo menu's Viewing as, `OutOfSite` and `SiteTag`), `src/store/session.ts`, `src/lib/scope.ts`, `src/data/sites.ts`, `src/data/viewers.ts`, `src/store/core.ts`, `src/lib/time.ts`, `src/lib/hosted.ts`, `src/components/ui/Toaster.tsx`.

| Control | Where | Diagram |
|---|---|---|
| Logo 'psyflo.' and caption 'Prior auth & UR' (label only) | Sidebar top | 10 (note) |
| Captions 'Main', 'Connections' (labels only) | Sidebar | 10 (note) |
| 'Dashboard' | Sidebar | 10, 13 |
| 'Authorizations' label and row (a link to /authorizations; from another page the worklist reopens its last view, on the worklist itself it shows All) | Sidebar | 10, 12 |
| Arrow beside 'Authorizations', its own button ('Expand Authorizations' / 'Collapse Authorizations', tooltip 'Expand' / 'Collapse', Enter or Space): shows or hides the sub rows without navigating | Sidebar | 10, 12 |
| 'All Authorizations' (sub row, the same page as 'Authorizations', no badge) | Sidebar | 10, 13 |
| 'New Case' (sub row) | Sidebar | 10, 13 |
| 'Eligibility & Benefits' (sub row) | Sidebar | 10, 13 |
| 'Denial Intelligence' | Sidebar | 10, 13 |
| 'Analytics' (no badge) | Sidebar | 10, 13 |
| 'EMR Connect' (no badge) | Sidebar | 10, 13 |
| 'Payers' | Sidebar | 10, 13 |
| Number bubbles on Dashboard, Authorizations, New Case, Eligibility & Benefits, Denial Intelligence, Payers. Every one follows the site view except Payers, which is clinic-wide (a payer's rules are not site data). No Case Manager row or badge | Sidebar | 11 |
| Group open or closed: opens by itself when the address comes into an Authorizations page, otherwise keeps the person's choice (closed stays closed inside the group, open stays open outside it); arrow right or down | Sidebar | 12 |
| Green highlight rules: one row; 'All Authorizations' on the worklist and on a case page; the whole 'Authorizations' row while the group is closed on one of its pages; old /manager and /active links light the Authorizations rows after the redirect; bubble colour on the green row | Sidebar | 11, 12, 13 |
| 'Demo data' tile (label only) | Sidebar footer | 10 (note), 50 |
| 'Settings' | Sidebar footer | 10, 50 |
| 'Help' (toast) | Sidebar footer | 50 |
| 'Sign out' (toast) | Sidebar footer | 50 |
| User card: initials, name and role of the viewer ('JP', 'Jordan Perez', 'UR coordinator' until another viewer is chosen) (label only) | Sidebar footer | 50 |
| Site view: 'Both sites', 'Site A', 'Site B' (a switch for a viewer with both sites; pressed state and a hidden status line announce the choice) | Top bar | 24 |
| Locked label 'Site A only' or 'Site B only' with its info note (one-site viewer; no switch) | Top bar | 24 |
| Info icons 'About the site view' and 'Why Dr. Rivera sees one site' (hover, focus or click; Escape closes) | Top bar | 24 |
| 'As of' date (wide windows only) | Top bar | 24 |
| Page-title tag 'Site A' or 'Site B' (only when a viewer with both sites has narrowed the view; the page owners place it) | Page titles | 24 |
| Notice 'This case is not available at Site A' for a record at a site that is not in view, with 'Show Site B' (viewer with both sites) and 'Back to the Dashboard' | Any record page | 00-overview 40 |
| 'Demo' button with clock pill (the word 'Demo' is hidden under 1024 px) | Top bar | 20, 40 |
| 'Ask FLO' button | Top bar | 20, 21 |
| 'Notifications' bell and red dot | Top bar | 20, 30 |
| Dimmed area, 'X', Escape on both drawers (Escape closes only the top layer) | Drawers | 20, 21, 30 |
| Demo menu: 'Time' text | Demo menu | 40 |
| 'Viewing as': the four people, the current one ticked | Demo menu | 40, 44 |
| 'Fast-forward 1 hour', 'Fast-forward 1 day' | Demo menu | 41 |
| 'Suggested path' steps 1 to 7 (2 'Authorizations: every request in one list', 7 'Authorizations: reviews this week') | Demo menu | 40, 42 |
| 'Reset demo data' (also puts the viewer back to Jordan Perez on Both sites) | Demo menu | 43 |
| Toast 'Now viewing as ...' | Bottom right | 44, 70 |
| Close by outside click, 'Demo' again, or Escape | Demo menu | 40 |
| Suggestion chips that follow the screen: four on the Dashboard and most screens (New Case included); three on a case page ('What is missing for R-1042?', 'When does this authorization run out?', 'What does Summit require?'); three on the Authorizations worklist, every view ('What needs me today?', 'What is due soonest?', 'Which reviews are due?'); one each on Denial Intelligence and Eligibility & Benefits. Shown at the start, under a fallback answer, and again when the person has moved to another screen | Ask FLO | 21, 23 |
| Line 'Suggested for R-1042' (or the screen's name: 'Suggested for Authorizations') above the chips (label only) | Ask FLO | 21 |
| 'Ask a question' box, 'Send', Enter | Ask FLO | 21 |
| 'FLO is working…', greeting that names the viewer and the sites it reads ('Hi Dr. Rivera, ... Site A'), chat memory | Ask FLO | 21 |
| A change of viewer or site starts a new conversation (nothing said about the other view stays on screen) and works the chips out again | Ask FLO | 21 |
| FLO reads only the cases at the sites in view: counts say 'at Site A', a case at the other site is 'not found among the cases you can see', Both sites = Site A + Site B | Ask FLO | 22, 23 |
| 'What needs me today?' answers with the Dashboard's Do next list (same rows, same order) and its link 'Open Do next on the Dashboard' | Ask FLO | 22 |
| Answer rules and the links under answers (each opens a matching view: Analytics for the slow-payers answer, the nearest open denial, Payers › Cardinal › History & Changes, the request to start with, New Case) | Ask FLO | 22 |
| Answers that read a case, a payer or a screen: missing, ends, requires, reviews due, fix before billing; each with its link ('Open R-1042, Recommended actions', 'Open I-2207', 'Open Payers, Cardinal, Documents', 'Open R-0912, review' to Reviews this week with the review drawer open, 'Open R-0921 in Eligibility & Benefits', 'Open Reviews this week', 'Open Authorizations') | Ask FLO | 22, 23 |
| The line 'This is FLO's reading of the demo data, not a payer confirmation.' (once, under those answers and the denial answer) | Ask FLO | 22, 23 |
| Which notifications are listed: the ones about cases at the sites in view and the ones about no case; the bell dot, the unread count and 'Mark all read' use only those | Notifications | 30 |
| Notification row click (mark read, close, go) | Notifications | 30 |
| 'Mark all read' | Notifications | 30 |
| Subtitle '4 unread' / 'You are all caught up' | Notifications | 30 |
| What creates a notification ('Drafts updated' opens Authorizations, 'Denial closed' opens Authorizations › All) | Store events | 31 |
| '/' to /dashboard | Address | 60 |
| '/manager' and '/active' to /authorizations: ?tab=reviews or ?review= to Reviews this week (?review= kept), anything else to All; ?show=active or ?show=renewal kept | Address | 60 |
| '/referrals' to /authorizations/new | Address | 60 |
| '/referrals/:id' to /authorizations/new/referral/:id | Address | 60 |
| Unknown address: 'Page not found' | Address | 60 |
| Unknown record on a known page (case: 'Request not found' with 'Back to Authorizations'; draft) | Address | 60 (hand-off) |
| Toast: stack, tones, 4 s fade, click to dismiss | Bottom right | 70 |
| Toasts raised by the shell (Help, Sign out, clock, reset, hosted preview) | Bottom right | 70 |
| Toasts raised on Authorizations › Reviews this week (Draft all due reviews, Sign all clean drafts, Review signed, Review updated) | Bottom right | 70 (hand-off) |

## Not drawn

- Hover colours, keyboard focus order and screen reader text: no flow of their own.
- Ask FLO and Notifications are made exclusive by the store, but the dimmed area covers the top bar buttons, so a person cannot switch from one to the other with one click. Drawn as a note in 20.
- The hosted preview's in-memory router is only mentioned in 60's note.
- An unknown address under /authorizations/ (for example /authorizations/xyz) shows 'Page not found' but still counts as an Authorizations page for the sidebar: the group opens, no row is green while it is open, and the 'Authorizations' row is green while it is closed. Too fine for 13.
- The worklist's own parameters, views and older queue parameters (?status=, ?view=, filters) belong to Authorizations (03), not to the shell.
- No privacy-mode switch exists anywhere in the shell. Privacy mode is always on (stated on Settings).

## Things that look broken or odd (for the report)

- Fast-forward changes the clock and what is worked out from it. It never makes a payer reply or a referral arrive. The one thing it can start is Verify's automatic re-check of a patient whose re-check came due, which raises a 'Re-checked automatically' notification.
- The chat in Ask FLO lives in the page, so 'Reset demo data' does not clear it and its old answers keep the old numbers.
- The sidebar group's open or closed choice and the worklist's last view also live in the page: 'Reset demo data' keeps both, a reload clears both.
- /authorizations?tab=reviews (a Case Manager parameter typed straight onto the new address) is rewritten to the All view, not to Reviews this week. Only /manager?tab=reviews and /active?tab=reviews map to Reviews this week.
- Two notifications and their toasts still name Case Manager in their words ('Each needs a new signature in Case Manager' from Payers, 'Case Manager has a step-down plan' from Denial Intelligence); their links open Authorizations. That text belongs to those modules.
