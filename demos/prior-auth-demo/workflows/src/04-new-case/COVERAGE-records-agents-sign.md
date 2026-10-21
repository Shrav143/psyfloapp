# Coverage: New case, steps 2 to 4 (Medical records, Agents work, Review and sign)

Source: `src/pages/newcase/*`, `src/store/cases.ts`, `src/data/cases.ts`, `src/data/agents.ts`. Diagram numbers are the file prefixes in this folder.

| File | Title |
|---|---|
| 30 | Medical records › The checklist and Continue |
| 31 | Medical records › Drop files and let Reader sort them |
| 32 | Medical records › Patient and insurance rows (also EMR pull) |
| 33 | Medical records › Request and document rows |
| 34 | Agents work › Start the run and watch it |
| 35 | Agents work › An agent asks a question |
| 36 | Agents work › Finished, paused or left |
| 37 | Review and sign › The draft and the summary |
| 38 | Review and sign › Sign and send |
| 39 | New case › Save as draft and leave |
| 40 | Medical records › The Coverage row |
| 41 | Review and sign › Validation summary and checks |
| 42 | Review and sign › After sending |
| 43 | Review and sign › Send back to Scribe |

## Every page, step 2 (Medical records)

| Control | Diagram |
|---|---|
| 'Case Manager' back link (top left, every step) | 39 |
| 'Use sample chart' (header) | 31 |
| Stepper: 'Referral' (done, clickable) | 30 |
| Stepper: 'Agents work' and 'Review and sign' (greyed out here) | 30, 36 |
| Drop zone: drop, click, Enter, Space | 31 |
| 'Pull a chart from EMR Connect' (toggle) | 32 |
| EMR picker: chart dropdown, 'Pull', 'Pulling', 'Cancel' | 32 |
| Progress line, 'Ready to continue' pill | 30 |
| 'Add' / 'Edit': Patient initials and age | 32 |
| Editor: Patient initials, Age, 'Done', Escape | 32 |
| 'Add' / 'Edit': Payer and plan (Payer, Plan type) | 32 |
| 'Add' / 'Edit': Member ID | 32 |
| Row sources: 'Read from ... by Reader. Check it.', 'From referral', 'From EMR Connect' | 32 |
| Coverage row: 'View checks' | 40 |
| Coverage drawer: 'Check again', 'Close', X, Escape | 40 |
| Coverage row: 'Choose another payer' | 40 |
| 'Add' / 'Edit': Level of care (closes on pick) | 33 |
| 'Add' / 'Edit': Request type (closes on pick) | 33 |
| 'Edit': Start date | 33 |
| Diagnoses: search box, match list, chip x ('Remove F10.20') | 33 |
| 'Add' / 'Edit': Reason for the request | 33 |
| Document row: 'Add file' (file picker) | 33 |
| Document row: 'Use sample file' | 33 |
| Document row: 'Add a referral' | 33 |
| Document row: 'View' (referral that came with the case) | 33 |
| Document row: eye 'View FILE' and the preview drawer (Escape closes) | 33 |
| Document row: X 'Remove FILE' | 33 |
| Footer: 'Back' | 30 |
| Footer: 'Save as draft' | 30, 39 |
| Footer: 'Continue' (when off, and when on) | 30 |
| Footer hint line ('Still needed: ...') | 30 |
| Modal 'Start the agents?': 'Cancel', 'Start the agents', Escape | 34 |

## Step 3 (Agents work)

| Control | Diagram |
|---|---|
| Ten agent rows (Reader to Scrubber), clock chip | 34 |
| Approval chance ring and pill | 34 |
| 'To raise it further' tick-boxes (two) | 34, 36 |
| Row button 'Answer', pill 'Needs your answer' | 35 |
| Question pop-up: choice cards, note box, 'Answer later', 'Send answer', Escape | 35 |
| Footer: 'Back' | 36 |
| Footer: 'Pause all agents' / 'Resume agents' and the paused banner | 34 |
| Footer: 'Skip ahead' | 34 |
| Footer: 'Review and sign' (off until all ten are done) | 36 |
| Banner 'All ten agents are done' | 36 |
| Stepper: 'Referral', 'Medical records' | 36 |
| Resuming a draft that already ran | 36, 39 |

## Step 4 (Review and sign)

| Control | Diagram |
|---|---|
| Source chips (e.g. 'Psychiatric eval p.3') and the document drawer | 37 |
| Summary card: 'Edit', 'Cancel', 'Save changes' | 37 |
| Validation summary: row toggles | 41 |
| Checks card (four checks, read only) | 41 |
| Approval chance card | 37 |
| 'Signing as' dropdown (Jordan Perez, Dr. Rivera) | 38 |
| Acknowledgement tick-box (only with a warning) | 38 |
| Attestation tick-box | 38 |
| 'Sign and send' button, 'Sign and send?' pop-up: 'Cancel', 'Sign and send' | 38 |
| 'Send back to Scribe', its pop-up: three quick chips, note box, 'Cancel', 'Send back' | 43 |
| Footer: 'Back' | 37 |
| Footer: 'Save as draft' | 37, 39 |
| Request lands on the Dashboard, toast, notification | 38, 42 |
| 'R-1701 was sent' page: 'Open it on the Dashboard', 'Back to Case Manager' | 42 |
| 'We could not find that draft' page: 'Start a new case' | 39 |
| Case Manager after sending: 'Being prepared' card, 'N sent today' | 42 |
| Case Manager row for a draft: ID link, button (Continue, Watch, Answer, Review and sign), status filter | 39 |

## Not drawn

- **'Replace' and 'Mark not available'** on a document: there is no such control. A file is swapped by removing it and adding another, or by dropping a file whose name fits the same slot (31, 33).
- **Agent failure or retry**: none exists. The run stops only for a question, a pause, or when the page is closed (36).
- **Step 1 Referral, the referral page, and the Eligibility result page**: other writers. Linked with `goto`.
- **The Dashboard request drawer and the whole Case Manager page**: other writers. Linked with `goto`. Only the parts about drafts are drawn here (39, 42).
- **Title text of other writers' diagrams** in my `goto` labels ('Dashboard › Open a request', 'Dashboard › Stage strip and requests', 'Case Manager › Active cases', 'Eligibility & Benefits › Result', 'New case › Referral step') are my best guess and may need renaming to match.

## Things in the demo that look broken or hollow

- Two Checks always pass: 'All N requirements covered' and 'Level of care matches the request'. 'Start date' in the Validation summary is always green.
- A new case never counts under 'Preparing' on the Dashboard (only the five seeded cases do), and after signing the Case Manager ledger still says '56 active cases.' with no row for it.
- Question pop-up says 'Question 1 of at most 3' but only one question is ever asked.
- The agents only move while step 3 is open. Case Manager keeps showing the agent that was working.
- Changing the records after the agents ran silently throws their work away (no message).
- A file with no telling name takes the next open required slot, so a duplicate can land in another slot ('Reader guessed this one. Check it.').
- The row hint 'Summit usually asks for one' on the therapy note is fixed text, even for other payers.
- A signed seeded case keeps its Dashboard request type (R-0988 shows 'admission' although the draft says 'Continued stay').
