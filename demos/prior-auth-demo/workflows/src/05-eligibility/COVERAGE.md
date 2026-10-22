# Coverage: Authorizations › Eligibility & Benefits

Routes: `/authorizations/eligibility`, `/authorizations/eligibility/verify` (`?referral=`, `?case=`), `/authorizations/eligibility/:id`.
Source: `src/pages/eligibility/*`, `src/store/eligibility.ts`, `src/data/eligibility.ts`, `src/data/verification.ts` (the shared verification record), `src/data/payerConfigPlan.ts` (plan type and routing).
All five reasons for 'Fix before billing' can be reached, and Verify re-checks on its own (see 'Fixed in this pass' at the foot).

## List (`/authorizations/eligibility`)

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Eligibility & Benefits' (+ badge) | Opens the list; badge counts rows that are not 'Cleared to bill' inside the site view (9 at the start, both sites) | 10, 33, 64 |
| Site switch in the top bar ('Both sites', 'Site A', 'Site B'), or a one-site viewer | Rows, title count, figures, search, menus and the badge follow it; Both sites is Site A plus Site B; a 'Site A' or 'Site B' tag sits beside the title when narrowed | 10, 11, 64 |
| Header button 'Verify a patient' | Opens an empty Verify form | 12, 20 |
| Tile 'Cleared to bill' / 'Authorization first' / 'Fix before billing' / 'Re-check due' | Toggles the verdict filter. 'Re-check due' counts rows with a re-check still booked | 11, 52 |
| Info icon beside the title (button 'Why we check twice', hover, focus, click, Escape): the old banner's text | 10, 13 |
| Search 'Search by case ID or initials' | Filters rows by ID or patient label | 11 |
| Menu 'All payers' / 'All programs' / 'All verdicts' (click, arrows, Enter, Esc, click outside); 'Not checked' appears in the verdict menu only while a check that could not run is on the list | Filters rows | 11 |
| 'Clear filters' (bar, empty state) | Resets search and the three menus | 11, 51 |
| 'Show 12 more' / 'Show 10 more' | Adds rows; hidden while any filter is on | 11 |
| Empty state 'No patients match these filters' | Shown when no row matches | 11, 51 |
| Table row, patient ID link | Opens the result | 12 |
| Table headers | Static, not sortable; fixed sort order | 10 |
| Chips Program / Eligibility / Benefits / Authorization / Verdict (one line, chips only), including 'ID differs', 'Not confirmed', 'Requirement unknown' and 'Not checked' | Read-only, meanings | 10, 44, 61 |
| Per-row 'Re-check' | Quick re-check, spinner, toast | 12, 50 |
| Quiet second line under each patient: payer, day limit ('14 of 14 days', 'No day limit'), 'Checked 3 h ago' / 'Checking now' | Read-only | 10, 50 |
| Same line: 'Re-check due Tue 11:32 am' | Read-only, shown on rows with a re-check booked | 10, 52 |
| Same line: 'Re-checked automatically at 11:32 am' | Read-only, after Verify's own re-check | 10, 52 |
| Same line: 'Not re-checked: Verify is paused in Settings' (amber) | Read-only, when a booked time passed and Verify is paused | 10, 52 |
| Same line: 'Now with Cardinal since 10/01', 'The plan has the ID ending 5521', 'Enrollment not confirmed', 'Could not be checked: Verify is paused in Settings' | Read-only, one part for each warning that has no chip of its own | 10, 61 |
| Card subtitle 'Simulated checks against the state and the plan...' and the page line 'Checks in this demo are simulated' | Read-only | 10 |

## Verify (`/authorizations/eligibility/verify`)

| Control | What it does | Diagram |
|---|---|---|
| Ways in: list button, Demo menu item 4, referral 'Open full Eligibility & Benefits check', queue pill 'Coverage needs a fix', case recommendation 'Open Eligibility & Benefits' | Open the form, empty or pre-filled | 20 |
| `?referral=` found / not found (toast 'Referral not found') | Pre-fill or toast | 20, 51 |
| `?case=` on the list / only in the queue / unknown | Pre-fill, partial pre-fill, nothing | 20, 51 |
| Back link '← Eligibility & Benefits' | Returns to the list | 21 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx' with `?case=`) | Returns to the referral or the case; only when `?referral=` names a referral that exists | 20, 21 |
| Row 'Try a sample' with six chips: 'Cleared to bill', 'Coverage lapsed', 'Not found', 'Not covered', 'Another plan pays first', 'Limit reached' | Fills the whole form with a member who ends in that answer; chips lock while checking | 21, 22 |
| Button 'More samples' / 'Fewer samples' (aria-expanded) and the row 'Needs a look': 'Payer changed', 'Member ID mismatch', 'Benefit not confirmed', 'Provider not confirmed', 'Requirement unknown'; link 'Settings' in its note | Opens or folds the row; each chip fills the form with a member whose check ends with a warning | 23 |
| Banner 'Verify is paused in Settings' and link 'Open Settings' (only while Verify is paused) | Says a check cannot ask the plan anything; 'Check now' still saves the check, marked 'Not checked' | 23, 33, 51 |
| 'Use sample card' (+ toast 'Sample card loaded') | Fills the J.M. details | 21 |
| Drop zone (click, drop, Enter or Space), 'Use sample file' | Reader reads a card, fills payer and member ID | 21 |
| 'Replace' on the card strip | Back to the drop zone, values kept | 21 |
| Payer, State, Member ID, Date of birth, Program, Date of service | Form fields | 21 |
| Hint line and 'Check now' on or off | Validation by shape only | 21, 51 |
| 'Check now' | Starts the live check, locks the form | 30 |
| Live check rows (Reader, Verify, Verify, Caller, Criteria, Navigator), card subtitle 'Simulated in this demo: ...' | Ticking steps | 30, 31 |
| 'Skip ahead' and timer pill | Speeds up the steps | 30 |
| Banner 'All answers are in. Opening the result.' | Then opens the result | 30, 33 |
| Caller fallback (Evergreen), production retry ladder | Phone call step | 32 |
| Leave mid-check | Check is dropped | 32, 51 |
| What is saved: a verification record for a known row, the sample card, or a new `V-` check at the site in view; scripted answers (endings 1012, 9999, 3030, 6060, 9090, 7070, 8080, 5050, 4040, 2020); a check that could not run while Verify is paused | Store changes; `?referral=` and `?case=` go on to the result | 33, 60 |

## Result (`/authorizations/eligibility/:id`)

| Control | What it does | Diagram |
|---|---|---|
| Back link '← Eligibility & Benefits' | Returns to the list | 40, 45 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx') | Returns to the referral or the case; only when the address carries `?referral=` | 40, 45 |
| Summary card, top band: verdict (four verdicts including 'Not checked', headline and reason wording, the reasons for 'Fix before billing') | Read-only | 40, 41 |
| Summary card, warnings block (one quiet list, one line each, only when the check found something): coverage not active, payer changed, member ID does not match, benefit not confirmed, service not covered, provider participation not confirmed, verification service unavailable, authorization requirement unknown | Read-only | 40, 61 |
| Summary card, 'Eligibility': 'Eligible', 'Not eligible' or 'Needs a fix', with 'Effective 01/01/2026, no end date', 'ended 09/30/2026' or 'lapsed 10/12/2026' | Read-only; 'Not found' has no dates | 40, 47 |
| Summary card, 'Benefits': Covered, Limited or Not covered, the service limit (days or units used and left, or 'No annual day limit') and, only when the plan has them, 'Patient pays: Copay ..., deductible ... left, coinsurance ...' | Read-only; Ohio Medicaid shows no cost line; 'Not found' shows 'Not checked' and no cost | 40, 47 |
| Summary card, 'What this service needs': 'Required, not on file', 'In progress', 'Payer reviewing', 'Retro request open', 'On file' or 'Not required', then the payer's saved rules (read live from Payers) and 'Open Summit's rules' | Read-only; the link opens the payer's Rules tab | 40, 47 |
| Facts line: Payer (with its group), Plan type and routing, Member (masked), Dates of service ('10/21/2026 to 10/31/2026'), Time checked (demo clock, with the re-check due), Source ('Simulated check against the payer portal', 'Simulated check, confirmed by phone' for Evergreen) | Read-only; a payer with no plan type has no plan type item | 40, 46 |
| Small note 'Active coverage does not mean this service is covered. Check the benefits and the authorization requirement.' | Read-only, not a banner | 40, 47 |
| Banner 'Not re-checked: Verify is paused in Settings' | Read-only, when a booked re-check passed while Verify is paused | 40, 52 |
| 'Start authorization' (verdict 'Authorization first') | Opens `/authorizations/new?verification=ID&type=initial` | 45, 62 |
| 'Create authorization from verification' (every result) | Opens `/authorizations/new?verification=ID`; the authorization type is still to choose | 45, 62 |
| 'Open Settings' (only when the check did not run) | Opens Settings | 45, 51 |
| 'Open case' | Opens the case | 45 |
| 'Open in Case Manager' | Opens Case Manager | 45 |
| 'Request retro-eligibility' | Toast only | 45 |
| 'Ask Caller to phone the payer' | Toast only | 45 |
| 'Check again' | Refreshes the shared verification record; while Verify is paused the last result stays with a warning | 45, 50, 60 |
| One row 'Payment checks and how this was checked' with the one-line summary ('6 of 7 pass, 1 needs a look') and the button 'View full verification details' | Opens the side panel 'Verification details' | 40, 63 |
| Side panel 'Verification details', section 'Payment checks' (seven rows and their chips) | Read-only. When coverage is not found: the first row and one grey row only | 42, 43, 63 |
| Side panel, section 'How this was checked' (agents' rows, accordion, one open at a time) and 'Next checks' | Opens an answer; 'Next checks' is read-only and starts with the booked re-check when there is one | 52, 63 |
| Side panel, section 'About this check'; footer 'Open the full result' (only when the panel is opened from New case); Escape, the close button or a click outside closes it | Read-only; the footer button opens the result | 63 |
| Chip meanings in the table and on this page | Read-only | 44 |
| Unknown ID: 'We could not find that check' + 'Back to Eligibility & Benefits' | Empty state | 51 |
| A check at a site the viewer cannot see: 'This coverage check is not available at Site A' (names no patient; 'Show Site B' for staff who may see both) | Notice instead of the result | 40, 51, 64 |

## Shared verification record (used by Eligibility & Benefits and New case)

| Control | What it does | Diagram |
|---|---|---|
| One record per case or `V-` check: coverage, plan type and routing, benefits, authorization requirement, provider, existing authorization, cost share, warnings, 'simulated' source | Written by Verify, the list's 'Re-check', the Demo clock and New case; read by the list, the result and New case step 2 | 60 |
| Reuse rule: same patient, payer and program, dates inside the record's dates, checked within 24 demo hours | New case reuses the record, or offers 'Refresh verification' | 60 |
| 'Refresh verification' (New case) | Runs the check again on the demo clock and replaces the record | 50, 60 |
| The eight warnings | See 61 | 61 |
| 'Create authorization from verification' | See 62 | 62 |
| Side panel 'Verification details' | See 63 | 63 |
| Site of a check | See 64 | 64 |

## Not drawn

- Enter or Space on the info icon, the sample buttons and 'View full verification details': drawn as clicks (13, 23, 40).
- Tab or Enter on the patient ID link: works like a click, drawn once as a click (12). The row itself is not keyboard focusable.
- Toast dismissal, Demo menu and Ask FLO: belong to the global shell diagrams.
- The 'Coverage checked' drawer in New case, which reuses the seven rows: owned by the New case diagrams, linked from 43. It no longer shows 'What the patient pays: $0 ...' for Ohio Medicaid, and shows no cost line for it.
- The static 'Privacy mode on' pill and the 'State' menu (its only option is 'Ohio'): mentioned in 21, no branch.

## Fixed in this pass

- 'Not covered', 'Another plan pays first' and 'Limit reached' can now be reached: a seeded patient for each on the list (R-1118, I-2275, R-0921) and a chip for each under 'Try a sample' on Verify (22). The list has 37 patients, 28 cleared, 4 'Authorization first', 5 'Fix before billing', 5 re-checks due, badge 9.
- 'Re-check due: this week, done automatically' now runs. When the Demo clock passes a booked time Verify re-checks the patient on its own, the row and result say so, and a bell message is added. If Verify is paused in Settings the row says 'Not re-checked: Verify is paused in Settings' and the re-check runs when Verify is resumed (52).
- 'Not found' no longer shows a patient-pays line, six grey rows or timings for agents that were never asked (42, 43, 40).
- A check that began from a referral has a way back: 'Back to referral RF-xxxx' on Verify and on the result (20, 21, 40, 45).

## Still open

- A paused Verify does not block 'Re-check', 'Check again' or 'Check now': each runs and says it could not ask the plan, and the last result stays with the warning 'Verification service unavailable' (50, 61).
- After a card is read, the date of birth stays empty, so 'Check now' stays off until it is typed.
- A re-check never changes a verdict, except that a check which never ran ('Not checked') gets its real answer. Its visible effect is the new time stamp, the toast and the bell message.
- No result button leads to the Dashboard.

## Changed in round 4

- The list, the figures and the badge read the shared verification records inside the site view (64). Both sites is Site A plus Site B.
- A check made in New case is a row here, and a check made here is the one New case finds and reuses (60).
- The two closed sections on the result became one row and a side panel, 'Verification details' (40, 63).
- Warnings (eight) sit in one quiet block under the result, and every one can be reached (23, 61). New: payer changed, member ID mismatch, benefit not confirmed, provider not confirmed, requirement unknown, and a check that cannot run while Verify is paused.
- The result has 'Create authorization from verification', and 'Start authorization' now carries the stored verification (62).
- Seeded rows are unchanged in number (37 patients, 28, 4, 5, 5, badge 9). R-0975 now also says the member moved to Cardinal on 10/01. Everything else new is reached with a chip under 'More samples'.

## Changed in the UX round

- Result first: one summary card (verdict, Eligibility, Benefits, What this service needs, one facts line, one plain note), with 'Payment checks' and 'How this was checked' closed below it (40, 46, 47).
- Plan type and routing come from the payer record and New case's plan type; a payer without one shows nothing (46). Copay, deductible and coinsurance show only for plan types that have them; Ohio Medicaid shows no '$0' (47).
- The list keeps four figures, folds 'Why we check twice' into an info icon (13), and puts payer, day limit and checked time on a quiet second line (10).
