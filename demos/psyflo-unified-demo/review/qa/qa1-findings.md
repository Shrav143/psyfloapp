# QA1 findings · interaction audit, accessibility, visual, presenter modes

Nov 11, 2026. Build: commit e71c528 plus the working tree of that day (E5's panel and `web/js/screens/Ext*.js` were still moving). Node v22.22.0, Playwright 1.56 Chromium (headless), demo time 15:30, preset `live`, one server on ports 4920-4922, data in the scratchpad `data-qa1`. No product code was edited. The browser had no DM Sans (the font link is blocked in this sandbox; `fc-match "DM Sans"` returns Inter), so widths are those of the fallback font: re-look at wrapping on the demo laptop.

New files: `test/audit.mjs`, `test/a11y.mjs`, `test/visual.mjs`, `test/presenter.mjs`, `test/lib/audit.mjs` (sweep engine, route inventory `appRoutes()`), `test/lib/a11y.mjs` (structure, contrast, targets, tab walk, dialog check, layout checks, contact sheets), `review/qa/qa1-audit.md` (counts per role and route, every finding, every skipped control) and `review/qa/qa1-audit.json` (summary and findings). `test/run-all.mjs`: one line appended to the `META` table (timeouts and tags for the four suites). Run any of them with `node test/run-all.mjs --ports 4920 --only audit|a11y|visual|presenter`; each also runs alone with `BASE=http://localhost:4920`. `AUDIT_ROLES=clinician,panel AUDIT_ONLY=<regex> AUDIT_TAG=<shard> AUDIT_MERGE=1`, `A11Y_ROLES`, `A11Y_ONLY`, `VISUAL_ONLY`, `PRESENTER_ONLY` narrow a run. Every suite starts with `demo.scenario base-live`, so it does not depend on what ran before on the server.

## 1. Results

| Suite | Tests | Pass | Fail | What a failure is |
|---|---|---|---|---|
| audit | 145 (6 shards) | 138 | 7 | 7 real defects (QA1-07, 10, 11); 2,891 controls swept, see §2 |
| a11y | 228 | 214 | 14 | 14 real defects (QA1-02, 09, 12, 13, 14) |
| visual | 206 | 198 | 8 | 8 real defects (QA1-01, 02, 03) |
| presenter | 28 | 26 | 2 | 2 real defects (QA1-05, 08) |
| **Total** | **607** | **576** | **31** | 17 distinct defects, none high |

No failing test is loosened, skipped or allow-listed. Failures that came from my own harness were fixed in the harness (§6). `a11y` and `visual` give the same counts on a fresh server through `run-all` (QA2's run: 214/14 and 198/8), and the panel shard of the audit gave the same five findings on two consecutive runs. No high-severity (demo-blocking) defect was found in what these suites cover.

What passes and is worth knowing (all checked, none assumed):
- **Zero dead controls** on 1,561 controls of the clinician platform (95 targets), 273 supervisor controls, 131 guardian controls, 82 school controls, 65 direct-support controls on desktop and phone. 51 clicks changed server state (Approve, Send the family link, Set plan, Exclude, Draft from records, guardian Sign, Pause and Stop of the timer ...); the fixture was reloaded after each one.
- **Panel safety.** The panel sweep never pressed Process Form, Get Signature or Send (denied by name, plus any control starting with "Send", 2 found: "Send the family version for the guardian's signature", "Send to parent for signature"; neither was clicked). The mock Lauris database hash was taken before and after every one of the 224 panel clicks: 0 writes into Lauris. 4 clicks typed into the open Lauris form, as designed.
- 0 unnamed controls, 0 console errors, 0 native `confirm` dialogs, 0 broken popup or link targets; 2 server refusals (400/409) from an invalid "Set plan" and an empty quarterly save, both shown to the person (a toast, a message in the panel). 78 targets opened an overlay; its 658 inner controls were swept too.
- Accessibility: skip link first and working; one `h1` and one `main` on all 76 desktop route checks; every form field labelled; `aria-pressed` on every filter chip; focus visible on every Tab stop of every route; the dock is out of the tab order until opened; rail, queue table (sort, arrow keys, Enter), drawer and modal pass trap, Escape and focus return; every enabled control on the 7 main screens is reachable by Tab; reduced motion honoured; `lang="en"`; toasts in `role=status` and errors in `role=alert`. Contrast: all token pairs pass (`ui/contrast.js`), and on every screen type the worst of the distinct text/background pairs is 5.1:1 (30 sampled per screen, every distinct pair checked); form field borders 3:1 or better.
- Presenter: Presentation mode shows no "Reset" or "Demo:" in the product viewport; Ctrl+Shift+P toggles the dock; role switch changes the rail without a reload (all four roles); scenarios s1 to s6 land on the right route as the right role with the right case; Reset asks before it resets; Sign out works for all four staff roles; Explore mode shows its label and every route a role may open is in "All screens" (two clicks).

## 2. Interaction audit (P19.3), counts

| Role and viewport | Targets | Controls | Findings |
|---|---|---|---|
| clinician · 1440 | 95 | 1,561 | 0 |
| supervisor · 1440 | 15 | 273 | 0 |
| admin · 1440 | 23 | 550 | 4 |
| direct support · 1440 | 9 | 36 | 0 |
| direct support · phone 390 | 3 | 29 | 0 |
| guardian · 390 (presenter session as T.W.'s guardian, and by link token `ar-demo`) | 14 | 131 | 0 |
| school · 390 | 4 | 82 | 0 |
| signed out (Login, reference page) | 2 | 5 | 0 |
| panel · 400 px beside the mock Lauris (clinician, direct support, supervisor, admin; 24 Lauris pages) | 38 | 224 | 5 |
| **Total** | **203** | **2,891** | **9 controls** |

Outcomes: NAVIGATED 1,133 · DOM 653 · DETAIL 571 · CLOSE 319 · POPUP 52 · STATE 51 · allowed no-change 45 (active tab or toggle, text field, link to the current page) · SKIPPED 31 · TOAST-ONLY 10 (every one states why: "Enter the document reference first.", "Say why the packet is being sent again.") · FILE-CHOOSER 5 · TYPED 4 · DISABLED-EXPLAINED 4 · NO-EFFECT 5 · DISABLED-UNEXPLAINED 3 · FOCUS-ONLY 1 · SCROLL 1 · DOWNLOAD 1 · 2 state-dependent controls that were absent after a reload (not defects). Per route: `review/qa/qa1-audit.md`.

How it works: every visible control (a, button, input, select, textarea, summary, `[role=button|tab|link|menuitem|switch|checkbox|radio]`, `[onclick]`, `tr[tabindex=0]`) is stamped with `data-qa`, de-duplicated by tag, name and href (first and last of identical rows), and clicked from a freshly loaded page; the outcome comes from a snapshot before and after (hash, DOM, field values, overlays, toasts, scroll, focus, `rev` of the store, a hash of the mock Lauris, new tabs, downloads, file choosers). A no-effect result gets a second look after 0.7 to 1.1 s. Routes: every route a role may open (`routeAllowed`) with the parameter variants of `docs/UI-KIT.md` §5, `?expand` of collapsed sections, fixtures `tw-isp-ready`, `tw-signed`, `tw-sent`, `analytics-case`, `mr-daily` and the canvas preset. Skipped on purpose and listed: Sign out (covered by PRES-10), presenter actions, 2 outward "Send" buttons in the panel, selects with one option, file pickers beyond opening the chooser.

## 3. Defects, ranked

Severity as in `review/06-demo-and-qa.md` §e (H blocks the demo, M fix before Harvest sees it, L polish). Owners follow `docs/BUILD-BRIEF.md`.

| # | Sev | Owner | Defect | Test |
|---|---|---|---|---|
| QA1-01 | M | lead (`web/js/api.js`) | A failed `/api/state` reads as "Nothing needs you right now" | visual |
| QA1-02 | M | lead (`web/css/components.css`) | Sign out, Help and the demo line vanish at 1024 px and below | a11y, visual |
| QA1-03 | M | E2, E3 | Queue headers are not sticky on Authorizations, Denial Intelligence, Referrals | visual |
| QA1-04 | M | lead (`web/js/ext-composite.js`, shell), E5 | Framed Lauris pages have no rail, no way back, developer text | inspection |
| QA1-05 | M | E7 | Phone screens lack "Demo data · nothing is real" | presenter |
| QA1-06 | M | lead (`web/js/logo.svg`, rail) | The wordmark is white and light teal on the light rail (1.2:1) | inspection |
| QA1-07 | M | E5 | The panel NOTE selector silently reverts on five pages | audit |
| QA1-08 | L | lead (`permissions.js`), E2 | "All screens" offers Eligibility to a designated supervisor; it opens "Not available" | presenter |
| QA1-09 | L | E1 | My Work scrolls sideways at 400 px | a11y |
| QA1-10 | L | E1 | Settings, Family link: four locked switches give no reason | audit |
| QA1-11 | L | E1 | Settings, Audit log: record links lead an administrator to "Not available" | audit |
| QA1-12 | L | E5 | Panel home: student links are 17 px tall | a11y |
| QA1-13 | L | E6 | Portal targets under 44 px | a11y |
| QA1-14 | L | E2 | Authorizations "Case" sort header is 18 px tall at 400 px | a11y |
| QA1-15 | L | E7 | Mobile "Change" with a student selected does nothing you can see | audit |
| QA1-16 | L | E5 | Panel `h1` is cut with an ellipsis and has no title | visual note |
| QA1-17 | L | E2 | Authorizations rows are about 120 px tall | visual |

### QA1-01 · M · a server failure shows an empty, calm screen (lead, `web/js/api.js` `refresh()`)
- **Reproduce.** Sign in as `jperez`. Make `GET /api/state` answer 500 (Playwright `page.route('**/api/state', r => r.fulfill({status:500}))`, or stop the store) and open `#/MyWork?section=todo`.
- **Seen.** The rail, the role chip and "Today 0 · Nothing needs you right now. New replies, drafts and approvals appear here as they arrive." No error, no retry. `refresh()` falls back to the public roster when the state request is not 401, so the empty roster state is painted as if it were the person's work. `POST /api/do` answering 500 is handled well (an alert is announced): only the state path is silent.
- **Expect.** A visible error with a retry, or keep the last good state and say it is old.
- Test: `visual › error state · /api/state fails on load`. Screenshot: `scratchpad/shots-qa1/vis/error-state-500.png`.

### QA1-02 · M · the rail foot disappears at 1024 px and below (lead, `components.css` lines 293 and 307)
- **Reproduce.** Open any app screen at 1024×768 (a projector size) or 700 px and below.
- **Seen.** At 1024 the rail collapses to icons and `.sh-user a{display:none}` removes Sign out; the "Demo data · nothing is real" line becomes a dot with a tooltip. At 700 px and below `.sh-foot{display:none}` removes Help, Sign out and the demo line altogether (the rail becomes a top bar). A person cannot sign out in the product viewport, and BUILD-BRIEF rule 9 ("stays on every app screen") is not met at 1024 px or below.
- **Expect.** Keep a Sign out control (icon with a name) and the demo line (or a one-line chip) at every width.
- Tests: `a11y › A11Y-06 …at 1024 / 700 / 400 px`, `visual › Help drawer open (400)`. Screenshots: `shots-qa1/mywork-400.png`, `shots-qa1/contact-platform-1024-1.png`.

### QA1-03 · M · long queues lose their column headers (E2 Authorizations and Referrals, E3 Denial Intelligence)
- **Reproduce.** Add rows until a queue holds 60 (the test pushes clones into `api.state` and repaints), scroll the page 400 px.
- **Seen.** `Authorizations.js:117`, `DenialIntelligence.js:61` and `Referrals.js:88` pass `maxHeight: 'none'` to `ui.queueTable`, so the table never becomes a scroll region and the sticky header has nothing to stick in: the header is 86, 161 and 203 px above the top of the window after scrolling. Sort works, headers announce `aria-sort`, no cell is clipped. `review/06` §d4 asks for a sticky header on the 60-row queues.
- **Expect.** Drop `maxHeight: 'none'`, or make the header stick to the window (the table wrapper's `overflow:hidden` prevents that today).
- Tests: `visual › long table · … 60 rows` (3 queues × 2 widths). Screenshot: `shots-qa1/vis/long-auth-1440.png`.

### QA1-04 · M · framed Lauris pages are a dead end inside the platform (lead, `ext-composite.js` and the shell; E5 for `Ext*.js`)
- **Reproduce.** As `jperez` open My Work, press "Open screening" (goes to `#/ExtScreening?referral=REF-121`), or open any `#/Ext*` route.
- **Seen.** The route is a thin wrapper around an iframe: no rail (`body[data-surface="ext"] .sh-rail` is hidden), no Sign out, no link back; the only control is "Open in its own tab". The bar prints the raw address (`http://localhost:4921/consumers`) and "in-page fallback at 400px; same panel as the extension". A direct-support user lands here after sign-in on a desktop and reaches My Work only through the panel's "My day in Psyflo" button. The wrapper pages are not wrong as a mock, but a presenter or a Harvest reviewer who follows the link has only the browser's Back button.
- **Expect.** Keep the rail (or a "Back to My Work" link and Sign out) on these routes, and drop the developer sentence in Presentation mode.
- Screenshot: `shots-qa1/explore-ExtHome.png`. (Reachability: EXP-04 for direct support passes only through the panel button.)

### QA1-05 · M · phone screens do not say the data is not real (E7)
- **Reproduce.** Sign in as `khale`, open `#/MobileApp`, `#/MobileDictate` or `#/MobileAssess` at 390×844, search the page for "nothing is real".
- **Seen.** Absent on all three (the rail, which carries the line elsewhere, is not shown on the phone surface). The family and school pages carry it. BUILD-BRIEF rule 9.
- Test: `presenter › PRES-07`. Screenshot: `shots-qa1/mobile-home.png`.

### QA1-06 · M · the logo is almost invisible on the light rail (lead, `web/js/logo.svg`, `.sh-logo`)
- **Seen.** The wordmark's fills are `#FFFFFF`, `#5FC0BE` and `#F0B44C`, made for a dark ground; on `--sand-100` (#EFE8DE) they are 1.22:1, 1.77:1 and 1.52:1. The text-contrast probe cannot see SVG, so no suite flags it. Visible in every screenshot of the platform ("psyflo." in the top left) and in the 400 px top bar.
- **Expect.** A dark variant of the mark for the light rail (teal-700 and ink), keep the white one for the navy header of the phone and the panel.
- Screenshots: `shots-qa1/explore-mywork.png`, `shots-qa1/vis/dock-scenario-menu.png`.

### QA1-07 · M · the panel's NOTE selector offers types it will not switch to (E5, `web/panel/views/scribe.js`)
- **Reproduce.** `${LAURIS}/login?as=jperez&next=/consumers/3310/session/weekly`; in the panel choose "Intake / CNA" (or any other type) in NOTE. Same on the daily note (as `khale` and `jperez`), the monthly collateral page and T.W.'s CNA page (fixture `tw-isp-ready`, `/consumers/4492/session/cna`).
- **Seen.** The six types are listed, every choice is silently put back to the page's own type; the panel text is identical before and after, and nothing says "open that form in Lauris". BUILD-BRIEF rule 10: a control either does something or says why not.
- **Expect.** Disable the other types with a reason ("Open Intake / CNA in Lauris first"), or switch the Lauris page.
- Test: `audit › panel …` (five targets, identical on two runs).

### QA1-08 · L · "All screens" lists a route that dead-ends for a designated supervisor (lead `permissions.js`, E2)
- **Reproduce.** Explore mode as `cdiaz` (holds the `eligibility.run` designation), "All screens", Eligibility. It redirects to `Referral?id=…&panel=eligibility`, which needs `referrals`, a capability a supervisor never has: "Not available for Site supervisor".
- **Expect.** `routeAllowed` for a redirected id should test the target's capability, or the picker should not list it.
- Test: `presenter › EXP-02 supervisor`.

### QA1-09 · L · My Work scrolls sideways at 400 px (E1)
- **Seen.** At 400 px the rail becomes a top bar (good) but the tab strip (`a.mw-tab`, "To do · Review · Team · Referrals") runs to x=481 and the page scrolls 54 px; "Referrals" is cut off. The `nav.mw-tabs` is not a scroll container. Fix: `overflow-x:auto` on the strip, or wrap.
- Tests: `a11y › A11Y-F … MyWork (400)` ×4. Screenshot: `shots-qa1/mywork-400.png`.

### QA1-10 · L · locked switches give no reason (E1, `Settings.js` `sw(…, disabled)`)
- **Reproduce.** Administrator, Settings, Family link: "Ask: Child's insurance and Medicaid ID", "Required: Child's insurance and Medicaid ID", "Required: Who else lives in the home" are `disabled` with no `title` or `aria-describedby` (a fourth, "Required: Home address", was passed only because its neighbouring text matched the heuristic). BUILD-BRIEF rule 10.
- Test: `audit › admin · Settings?tab=family`.

### QA1-11 · L · audit-log links lead the administrator to a refusal (E1)
- **Reproduce.** Administrator, Settings, Audit log: the "REF-118" link opens `Referral?id=REF-118`: "Not available for Administrator". Render record ids as text for roles that cannot open them.
- Test: `audit › admin · Settings?tab=audit`.

### QA1-12 to QA1-17 · L
- **QA1-12 (E5).** Panel home, "On this page · N": student links are 17 px tall (22 to 26 px wide), 9 under 24 px (`a11y › A11Y-X panel jperez · home`).
- **QA1-13 (E6).** Under 44 px on phone and portal screens: "Clear" 41×44 on ParentSign and AppealLetter; nine student links 25 to 30 px wide on SchoolPortal (`a11y › A11Y-P`).
- **QA1-14 (E2).** "Case" sort header 48×18 px on Authorizations at 400 px (supervisor, clinician, admin; `a11y › A11Y-F … Authorizations (400)`).
- **QA1-15 (E7).** MobileApp "Change" with a student already selected only moves focus to the chip list: no visible change (`FOCUS-ONLY` in the audit; allowed, listed).
- **QA1-16 (E5).** Panel `h1` ("Scribe · Daily progress n…", "Psyflo · Kayla Hale, QMH…") is cut by an ellipsis without a `title`.
- **QA1-17 (E2).** Authorizations rows are about 120 px tall at 1440 (the Deadline cell stacks three lines), so about six rows fit a 900 px window (`03b` density target); `shots-qa1/vis/long-auth-1440.png`.

## 4. What the contact sheets show (looked at, not only counted)

Sheets in `scratchpad/shots-qa1/`: `contact-platform-1440-1..5.png` (55 screens), `contact-platform-1024-1..5.png` (53), `contact-states-1..4.png` (long tables, empty, denied, not found, error states, 16 dialogs and drawers at 400, 1024 and 1440), `contact-phone-390-1.png`, `contact-phone-360-1.png`, `contact-portals-390-1..2.png`, `contact-portals-360-1..2.png`, `contact-panel-400-1..2.png` (21 pages), and the single screens under `vis/` (205). The platform reads as one product: the same chips, tables, case shell and drawers on every role; dialogs fit at 400 px; empty states carry a message and a "Clear filters" action; "Not available for Direct support" gives two ways out; the panel at 400 px is tidy (one primary button per view, accordions, "Demo data · nothing is real" in its foot); the family and school pages are clean at 390 and 360. Visual defects I could see: the faint logo (QA1-06); the sideways tab strip (QA1-09); the six-row density of the Authorizations queue (QA1-17); a native select in "Owner and backup" cuts "Asst. Clinical Support Su…" at 400 px (native control, accepted); at 1024 the Settings tab strip is cut by the open drawer. The text-over-text and clipping detectors (checked against a synthetic page that overlaps, clips and hides text) report nothing on any shipped screen; they ignore closed `<details>` and visually hidden text.

## 5. What I could not test

- **The MV3 extension in real Chrome** (load unpacked, side panel, content script, `chrome.*`): only the in-page panel in the mock Lauris at 400 px was exercised. Manual checklist item stays PENDING.
- **A screen reader** (NVDA, JAWS, VoiceOver): names, roles, landmarks, `aria-live` and focus order are checked from the DOM; what is actually spoken is not.
- Real touch devices (iOS Safari, Android Chrome, safe areas, pinch zoom); Firefox and Safari; real DM Sans metrics; the venue network and projector scaling; live microphone, Web Speech and the camera (a file chooser opens, nothing is captured).
- Contrast of text over images or gradients (none found, reported as "unknown" by the probe), of SVG art (QA1-06 was found by eye), and of states I did not reach (hover, pressed).
- The audit covers the states of the fixtures it applies. A control that exists only in a state nobody reached (a payer reply of a kind not seeded, the school portal after a decline) was not clicked. Second-level overlays are swept one level; a dialog opened from a dialog is not.
- Parallel runs: one server only (ports 4920-4922), so the audit runs serially (about 60 minutes in shards; `run-all` gives it a 90-minute limit).

## 6. Notes on the suites

- **Harness bugs I found in my own work and fixed** (so a red result is the product's): a Chrome date input holds several Tab stops in one element (the walk ended early); closed `<details>` and `pm-sr` style hidden text were read as overlapping text; a click that opens the family link in the same window replaces the staff session (every fresh load now restores the session the group started with); the guardian language toggle leaked into the next control (reset on every load); file pickers were read as "no effect" (file chooser events are captured); a panel button that asks the Lauris page to move detached the iframe (handled as navigation); a late effect was read as none (second look); toasts covering a control made it "unclickable" (waits them out); two-step contrast: all distinct pairs are checked, not only the 30 sampled.
- Findings that are not defects of the product and were therefore not counted: the 400/409/422 answers of `/api/do` (designed refusals, flagged `refused`); "Sign in" buttons on a session that a click had replaced.
- Severity differs from QA2 only where a number is mine; D1 of `qa2-findings.md` (any session becomes presenter) is a safety defect these suites cannot see and is not repeated here.
