# Coverage: Authorizations › Eligibility & Benefits

Routes: `/authorizations/eligibility`, `/authorizations/eligibility/verify` (`?referral=`, `?case=`), `/authorizations/eligibility/:id`.
Source: `src/pages/eligibility/*`, `src/store/eligibility.ts`, `src/data/eligibility.ts`.
All five reasons for 'Fix before billing' can be reached, and Verify re-checks on its own (see 'Fixed in this pass' at the foot).

## List (`/authorizations/eligibility`)

| Control | What it does | Diagram |
|---|---|---|
| Sidebar 'Eligibility & Benefits' (+ badge) | Opens the list; badge counts rows that are not 'Cleared to bill' (9 at the start) | 10, 33 |
| Header button 'Verify a patient' | Opens an empty Verify form | 12, 20 |
| Tile 'Cleared to bill' / 'Authorization first' / 'Fix before billing' / 'Re-check due' | Toggles the verdict filter. 'Re-check due' counts rows with a re-check still booked | 11, 52 |
| Banner 'Why we check twice.' | Static text | 10 |
| Search 'Search by case ID or initials' | Filters rows by ID or patient label | 11 |
| Menu 'All payers' / 'All programs' / 'All verdicts' (click, arrows, Enter, Esc, click outside) | Filters rows | 11 |
| 'Clear filters' (bar, empty state) | Resets search and the three menus | 11, 51 |
| 'Show 12 more' / 'Show 10 more' | Adds rows; hidden while any filter is on | 11 |
| Empty state 'No patients match these filters' | Shown when no row matches | 11, 51 |
| Table row, patient ID link | Opens the result | 12 |
| Table headers | Static, not sortable; fixed sort order | 10 |
| Chips Program / Eligibility / Benefits / Authorization / Verdict | Read-only, meanings | 10, 44 |
| Per-row 'Re-check' | Quick re-check, spinner, toast | 12, 50 |
| Hint under the verdict: 'Checked 3 h ago' / 'Checking now' | Read-only | 10, 50 |
| Hint 'Re-check due Tue 11:32 am' | Read-only, shown on rows with a re-check booked | 10, 52 |
| Hint 'Re-checked automatically at 11:32 am' | Read-only, after Verify's own re-check | 10, 52 |
| Hint 'Not re-checked: Verify is paused in Settings' | Read-only, when a booked time passed and Verify is paused | 10, 52 |

## Verify (`/authorizations/eligibility/verify`)

| Control | What it does | Diagram |
|---|---|---|
| Ways in: list button, Demo menu item 4, referral 'Open full Eligibility & Benefits check', queue pill 'Coverage needs a fix', case recommendation 'Open Eligibility & Benefits' | Open the form, empty or pre-filled | 20 |
| `?referral=` found / not found (toast 'Referral not found') | Pre-fill or toast | 20, 51 |
| `?case=` on the list / only in the queue / unknown | Pre-fill, partial pre-fill, nothing | 20, 51 |
| Back link '← Eligibility & Benefits' | Returns to the list | 21 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx' with `?case=`) | Returns to the referral or the case; only when `?referral=` names a referral that exists | 20, 21 |
| Row 'Try a sample' with six chips: 'Cleared to bill', 'Coverage lapsed', 'Not found', 'Not covered', 'Another plan pays first', 'Limit reached' | Fills the whole form with a member who ends in that answer; chips lock while checking | 21, 22 |
| 'Use sample card' (+ toast 'Sample card loaded') | Fills the J.M. details | 21 |
| Drop zone (click, drop, Enter or Space), 'Use sample file' | Reader reads a card, fills payer and member ID | 21 |
| 'Replace' on the card strip | Back to the drop zone, values kept | 21 |
| Payer, State, Member ID, Date of birth, Program, Date of service | Form fields | 21 |
| Hint line and 'Check now' on or off | Validation by shape only | 21, 51 |
| 'Check now' | Starts the live check, locks the form | 30 |
| Live check rows (Reader, Verify, Verify, Caller, Criteria, Navigator) | Ticking steps | 30, 31 |
| 'Skip ahead' and timer pill | Speeds up the steps | 30 |
| Banner 'All answers are in. Opening the result.' | Then opens the result | 30, 33 |
| Caller fallback (Evergreen), production retry ladder | Phone call step | 32 |
| Leave mid-check | Check is dropped | 32, 51 |
| What is saved: known row, sample card, new `V-` row, scripted answers (endings 1012, 9999, 3030, 6060, 9090) | Store changes; `?referral=` and `?case=` go on to the result | 33 |

## Result (`/authorizations/eligibility/:id`)

| Control | What it does | Diagram |
|---|---|---|
| Back link '← Eligibility & Benefits' | Returns to the list | 40, 45 |
| Back link '← Back to referral RF-xxxx' (or '← Back to case R-xxxx') | Returns to the referral or the case; only when the address carries `?referral=` | 40, 45 |
| Verdict banner (three verdicts, headline and reason wording, five reasons for 'Fix before billing') | Read-only | 40, 41 |
| Banner 'Not re-checked: Verify is paused in Settings' | Read-only, when a booked re-check passed while Verify is paused | 40, 52 |
| 'Start authorization' | Opens New case pre-filled | 45 |
| 'Open case' | Opens the case | 45 |
| 'Open in Case Manager' | Opens Case Manager | 45 |
| 'Request retro-eligibility' | Toast only | 45 |
| 'Ask Caller to phone the payer' | Toast only | 45 |
| 'Check again' | Quick re-check | 45, 50 |
| 'Payment checks' seven rows, chips and the 'What the patient pays:' line | Read-only. When coverage is not found: the first row and one grey row only, and no patient-pays line | 42, 43 |
| Pill 'Checked live at ...' / 'Last checked ..., 3 d ago' / 'Re-checked automatically at ...' | Read-only | 40, 52 |
| 'What the agents checked' rows (accordion, one open at a time) | Opens an answer | 40 |
| 'Next checks' list | Read-only; starts with the booked re-check when there is one | 40, 52 |
| Chip meanings in the table and on this page | Read-only | 44 |
| Unknown ID: 'We could not find that check' + 'Back to Eligibility & Benefits' | Empty state | 51 |

## Not drawn

- Tab or Enter on the patient ID link: works like a click, drawn once as a click (12). The row itself is not keyboard focusable.
- Toast dismissal, Demo menu and Ask FLO: belong to the global shell diagrams.
- The 'Coverage checked' drawer in New case, which reuses the seven rows: owned by the New case diagrams, linked from 43.
- The static 'Privacy mode on' pill and the 'State' menu (its only option is 'Ohio'): mentioned in 21, no branch.

## Fixed in this pass

- 'Not covered', 'Another plan pays first' and 'Limit reached' can now be reached: a seeded patient for each on the list (R-1118, I-2275, R-0921) and a chip for each under 'Try a sample' on Verify (22). The list has 37 patients, 28 cleared, 4 'Authorization first', 5 'Fix before billing', 5 re-checks due, badge 9.
- 'Re-check due: this week, done automatically' now runs. When the Demo clock passes a booked time Verify re-checks the patient on its own, the row and result say so, and a bell message is added. If Verify is paused in Settings the row says 'Not re-checked: Verify is paused in Settings' and the re-check runs when Verify is resumed (52).
- 'Not found' no longer shows a patient-pays line, six grey rows or timings for agents that were never asked (42, 43, 40).
- A check that began from a referral has a way back: 'Back to referral RF-xxxx' on Verify and on the result (20, 21, 40, 45).

## Still open

- Manual 'Re-check', 'Check again' and 'Check now' are not blocked by a paused Verify: the person is asking for them.
- After a card is read, the date of birth stays empty, so 'Check now' stays off until it is typed.
- A re-check never changes a verdict. Its only visible effect is the new time stamp and the bell message.
- No result button leads to the Dashboard.
