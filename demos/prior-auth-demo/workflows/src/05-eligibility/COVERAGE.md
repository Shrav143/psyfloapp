# Coverage: Authorizations › Eligibility & Benefits

Routes: `/authorizations/eligibility`, `/authorizations/eligibility/verify` (`?referral=`, `?case=`), `/authorizations/eligibility/:id`.
Source: `src/pages/eligibility/*`, `src/store/eligibility.ts`, `src/data/eligibility.ts`, `src/data/verification.ts` (the shared verification record), `src/data/payerConfigPlan.ts` (plan type and routing).
All five reasons for 'Fix before billing' can be reached, and Verify re-checks on its own (see 'Fixed in this pass' at the foot).

## List (`/authorizations/eligibility`)

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Eligibility & Benefits' (+ badge) | Opens the list; badge counts rows that are not 'Cleared to bill' inside the site view (9 at the start, both sites) | 10, 33, 64 |
| Site switch in the top bar ('Both sites', 'Site A', 'Site B'), or a one-site viewer | Rows, tiles, count, search, menus and the badge follow it; Both sites is Site A plus Site B; a 'Site A' or 'Site B' tag sits beside the title when narrowed | 10, 11, 64 |
| Slim title row 'Eligibility & Benefits' with the primary button 'Verify a patient' | Opens an empty Verify form | 10, 12, 20 |
| Small tiles '28 Cleared to bill', '4 Authorization first', '5 Fix before billing', '5 Re-check due' (one line each; the meaning is the tooltip); a fifth 'Not checked' only while a check that could not run is listed | The verdict filter: a click presses one tile, a second click releases it. 'Re-check due' counts rows with a re-check still booked | 10, 11, 52 |
| Search 'Search by case ID or initials' | Filters rows by ID or patient label | 11 |
| Menu 'All payers' / 'All programs' (click, arrows, Enter, Esc, click outside) | Filters rows | 11 |
| 'Showing 12 of 37' at the right of the filter bar | Read-only count | 11 |
| 'Clear filters' (bar, empty state) | Resets search, both menus and the tiles | 11, 51 |
| 'Show 12 more' / 'Show 1 more' | Adds rows; hidden while any filter is on | 11 |
| Empty state 'No patients match these filters' | Shown when no row matches | 11, 51 |
| Table row, patient ID link | Opens the result | 12 |
| Table headers Patient, Verdict, Eligibility, Benefits, Authorization | Static, not sortable; fixed sort order; the verdict sits right after the patient | 10 |
| Chips Verdict / Eligibility / Benefits / Authorization, including 'ID differs', 'Not confirmed', 'Requirement unknown' and 'Not checked' | Read-only, meanings | 10, 44, 61 |
| Per-row 'Re-check' | Quick re-check, spinner, toast | 12, 50 |
| Quiet second line under each patient: program, payer, day limit ('14 of 14 days', 'No day limit'), 'Checked 3 h ago' / 'Checking now' | Read-only | 10, 50 |
| Same line: 'Re-check due Tue 11:32 am', 'Re-checked automatically at 11:32 am', 'Not re-checked: Verify is paused in Settings' (amber) | Read-only | 10, 52 |
| Same line: 'Now with Cardinal since 10/01', 'The plan has the ID ending 5521', 'Enrollment not confirmed', 'Could not be checked: Verify is paused in Settings' | Read-only, one part for each warning that has no chip of its own | 10, 61 |

## Verify (`/authorizations/eligibility/verify`)

| Control | What it does | Diagram |
|---|---|---|
| Ways in: list button, Demo menu item 4, referral 'Open full Eligibility & Benefits check', queue pill 'Coverage needs a fix', case recommendation 'Open Eligibility & Benefits' | Open the form, empty or pre-filled | 20 |
| `?referral=` found / not found (toast 'Referral not found') | Pre-fill or toast | 20, 51 |
| `?case=` on the list / only in the queue / unknown | Pre-fill, partial pre-fill, nothing | 20, 51 |
| Back link '← Eligibility & Benefits' | Returns to the list | 21 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx' with `?case=`) | Returns to the referral or the case; only when `?referral=` names a referral that exists | 20, 21 |
| Card 'Patient and service' with the pill 'Privacy mode on' (no page header) | Read-only | 21 |
| Import row 'Pull from EMR' (only when a record system is connected at the site in view), 'Import a file', 'Paste a screenshot'; review; 'Apply' / 'Cancel' | Shared ImportSources, target insurance. Apply fills payer and member ID; a quiet line names the source, the group and the coverage dates | 21, 24 |
| Payer (with the plan type under it), State, Member ID, Date of birth, Program, Date of service | Form fields | 21 |
| 'Check now' on or off | Validation by shape only; no hint line | 21, 51 |
| Strip 'Try a sample' at the foot of the form: 'Cleared to bill', 'Authorization first' (J.M.'s card, only when R-1042 is in view), 'Coverage lapsed', 'Not found', 'Not covered', 'Another plan pays first', 'Limit reached' | Fills the whole form with a member who ends in that answer; chips lock while checking | 21, 22 |
| 'More samples' / 'Fewer samples' (aria-expanded) and the row 'Needs a look': 'Payer changed', 'Member ID mismatch', 'Benefit not confirmed', 'Provider not confirmed', 'Requirement unknown' | Opens or folds the row; each chip fills the form with a member whose check ends with a warning | 23 |
| Banner 'Verify is paused in Settings' and link 'Open Settings' (only while Verify is paused) | 'Check now' still saves the check, marked 'Not checked' | 23, 33, 51 |
| 'Check now' | Starts the live check, locks the form | 30 |
| Live check rows (Reader, Verify, Verify, Caller, Criteria, Navigator): a label while waiting and working, the answer when done | Ticking steps | 30, 31 |
| 'Skip ahead' and timer pill; the pill reads 'Opening the result' at the end | Speeds up the steps, then opens the result | 30, 33 |
| Caller fallback (Evergreen), production retry ladder | Phone call step | 32 |
| Leave mid-check | Check is dropped | 32, 51 |
| What is saved: a verification record for a known row, J.M.'s card, or a new `V-` check at the site in view; scripted answers (endings 1012, 9999, 3030, 6060, 9090, 7070, 8080, 5050, 4040, 2020); a check that could not run while Verify is paused | Store changes; `?referral=` and `?case=` go on to the result | 33, 60 |

## Result (`/authorizations/eligibility/:id`)

| Control | What it does | Diagram |
|---|---|---|
| Back link '← Eligibility & Benefits' | Returns to the list | 40, 45 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx') | Returns to the referral or the case; only when the address carries `?referral=` | 40, 45 |
| Title row: patient ID (24 px), initials and age, level of care, payer and group; site tag when narrowed | Read-only; no headline | 40 |
| Verdict band: verdict (four, including 'Not checked') and the one fact that decides it, as a label and a value ('Coverage' 'Lapsed 10/12') | Read-only | 40, 41 |
| Rows 'Eligibility' (pill, dates, a plan the member moved to), 'Plan type and routing', 'Benefits' (pill, program, codes, limit), 'Patient pays' (only with a cost share), 'What this service needs' (pill, line, the payer's saved rules read live from Payers, 'Open Summit's rules') | Read-only; the link opens the payer's Rules tab | 40, 46, 47 |
| Warning block, only for what no row says (a refresh that could not run while Verify is paused) | Read-only | 40, 61 |
| Facts line: Member (masked), Dates of service, Time checked (demo clock, with the re-check due), Source | Read-only | 40, 46 |
| Banner 'Not re-checked: Verify is paused in Settings' ('Due ...', 'Open Settings') | When a booked re-check passed while Verify is paused | 40, 52 |
| 'Start authorization' (verdict 'Authorization first') | Opens `/authorizations/new?verification=ID&type=initial` | 45, 62 |
| 'Create authorization from verification' (every result) | Opens `/authorizations/new?verification=ID`; the authorization type is still to choose | 45, 62 |
| 'Request retro-eligibility' (lapsed), 'Ask Caller to phone the payer' (ended, not found), 'Ask Caller to confirm the benefit' (benefit not confirmed), 'Ask Navigator to check enrollment' (enrollment not confirmed) | Toast only | 45 |
| 'Open Settings' (only when the check did not run) | Opens Settings | 45, 51 |
| 'Open case' / 'Open in Case Manager' | Opens the case or Case Manager | 45 |
| 'Re-check' | Refreshes the shared verification record; while Verify is paused the last result stays with the one warning | 45, 50, 60 |
| Row 'Verification details' with 'Payment checks: 6 of 7 pass, 1 needs a look' and 'View full verification details' | Opens the side panel | 40, 63 |
| Side panel: 'Payment checks' (seven rows), 'How this was checked' (agents, accordion, one open at a time), 'History' (HistoryFeed: Agent and Scheduled flags) | Read-only | 42, 43, 52, 63 |
| Side panel from New Case: rows, facts and warnings first; footer 'Open the full result'; Escape, the close button or a click outside closes it | Read-only; the footer button opens the result | 63 |
| Unknown ID: 'We could not find that check' + 'Back to Eligibility & Benefits' | Empty state | 51 |
| A check at a site the viewer cannot see: 'This coverage check is not available at Site A' | Notice instead of the result | 40, 51, 64 |

## Shared verification record (used by Eligibility & Benefits and New Case)

| Control | What it does | Diagram |
|---|---|---|
| One record per case or `V-` check: coverage, plan type and routing, benefits, authorization requirement, provider, existing authorization, cost share, warnings, 'simulated' source | Written by Verify, the list's 'Re-check', the Demo clock and New Case; read by the list, the result and New Case step 2 | 60 |
| Reuse rule: same patient, payer and program, dates inside the record's dates, checked within 24 demo hours | New Case reuses the record, or offers 'Refresh verification' | 60 |
| 'Refresh verification' (New Case) | Runs the check again on the demo clock and replaces the record | 50, 60 |
| The eight warnings | See 61 | 61 |
| 'Create authorization from verification' | See 62 | 62 |
| Side panel 'Verification details' | See 63 | 63 |
| Site of a check | See 64 | 64 |

## Not drawn

- Enter or Space on the tiles, the sample chips and 'View full verification details': drawn as clicks (11, 23, 40).
- The import's own screens (mapping, review, EMR chart picker) belong to the shared import; 24 draws only what Verify does with the result.
- Tab or Enter on the patient ID link: works like a click, drawn once as a click (12). The row itself is not keyboard focusable.
- Toast dismissal, Demo menu and Ask FLO: belong to the global shell diagrams.
- The 'Coverage checked' drawer in New Case, which reuses the seven rows: owned by the New Case diagrams, linked from 43. It no longer shows 'What the patient pays: $0 ...' for Ohio Medicaid, and shows no cost line for it.
- The static 'Privacy mode on' pill and the 'State' menu (its only option is 'Ohio'): mentioned in 21, no branch.
- The tile tooltips (native hover titles): mentioned in 10 and 11.

## Fixed in this pass

- 'Not covered', 'Another plan pays first' and 'Limit reached' can now be reached: a seeded patient for each on the list (R-1118, I-2275, R-0921) and a chip for each under 'Try a sample' on Verify (22). The list has 37 patients, 28 cleared, 4 'Authorization first', 5 'Fix before billing', 5 re-checks due, badge 9.
- 'Re-check due: this week, done automatically' now runs. When the Demo clock passes a booked time Verify re-checks the patient on its own, the row and result say so, and a bell message is added. If Verify is paused in Settings the row says 'Not re-checked: Verify is paused in Settings' and the re-check runs when Verify is resumed (52).
- 'Not found' no longer shows a patient-pays line, six grey rows or timings for agents that were never asked (42, 43, 40).
- A check that began from a referral has a way back: 'Back to referral RF-xxxx' on Verify and on the result (20, 21, 40, 45).

## Still open

- A paused Verify does not block 'Re-check' or 'Check now': each runs and says it could not ask the plan, and the last result stays with the warning 'Verification service unavailable' (50, 61).
- An imported card has no date of birth, so 'Check now' stays off until it is typed (24).
- History shows only the latest check: a refresh replaces the record, so earlier checks are not kept.
- A re-check never changes a verdict, except that a check which never ran ('Not checked') gets its real answer. Its visible effect is the new time stamp, the toast and the bell message.
- No result button leads to the Dashboard.

## Changed in round 4

- The list, the figures and the badge read the shared verification records inside the site view (64). Both sites is Site A plus Site B.
- A check made in New Case is a row here, and a check made here is the one New Case finds and reuses (60).
- The two closed sections on the result became one row and a side panel, 'Verification details' (40, 63).
- Warnings (eight) sit in one quiet block under the result, and every one can be reached (23, 61). New: payer changed, member ID mismatch, benefit not confirmed, provider not confirmed, requirement unknown, and a check that cannot run while Verify is paused.
- The result has 'Create authorization from verification', and 'Start authorization' now carries the stored verification (62).
- Seeded rows are unchanged in number (37 patients, 28, 4, 5, 5, badge 9). R-0975 now also says the member moved to Cardinal on 10/01. Everything else new is reached with a chip under 'More samples'.

## Changed in the UX round

- Result first: one summary card (verdict, Eligibility, Benefits, What this service needs, one facts line, one plain note), with 'Payment checks' and 'How this was checked' closed below it (40, 46, 47).
- Plan type and routing come from the payer record and New Case's plan type; a payer without one shows nothing (46). Copay, deductible and coinsurance show only for plan types that have them; Ohio Medicaid shows no '$0' (47).
- The list keeps four figures, folds 'Why we check twice' into an info icon (13), and puts payer, day limit and checked time on a quiet second line (10).

## Changed in round 6 (declutter)

- List: the headline card ('28 of 37 patients are cleared to bill.' with its info tip and the line under it) and the card subtitle are gone. A slim title row holds 'Verify a patient'. The four tiles are one line each and are the only verdict filter (the 'All verdicts' menu is gone). The verdict column sits right after the patient and the program moved to the quiet line, so the verdict stays in view at 1024 px (10, 11). The info icon diagram (13) was removed with the icon.
- Verify: no header box, no 'Use sample card' (J.M.'s card is the sample 'Authorization first'), no subtitles, no hint lines, no live-check subtitle or footer. The shared import row replaces the card drop zone (21, 24). Live-check rows show a label, then the answer (30, 31).
- Result: no headline and no reason sentence. One card: the verdict with the one fact that decides it and the actions, then label and value rows. Warnings already said by a row are not repeated; 'Caller can confirm ...' and 'Navigator can check ...' became buttons. 'Check again' is 'Re-check', as on the list. 'Payment checks and how this was checked' is the row 'Verification details'; the panel gained History and lost 'Next checks' and 'About this check' on the result page (40, 41, 45, 47, 63).

