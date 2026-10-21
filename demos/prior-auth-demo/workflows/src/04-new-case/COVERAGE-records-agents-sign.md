# Coverage: New case, steps 2 to 4 (Medical records, Agents work, Review and sign)

Source: `src/pages/newcase/*`, `src/store/cases.ts`, `src/data/cases.ts`, `src/data/agents.ts`, `src/pages/authorizations/reviewAndSign.ts` and the Draft tab. Diagram numbers are the file prefixes in this folder.

| File | Title |
|---|---|
| 30 | Medical records › The checklist and Continue |
| 31 | Medical records › Drop files and let Reader sort them |
| 32 | Medical records › Patient and insurance rows |
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
| 44 | Medical records › Pull a chart from EMR Connect |
| 45 | Medical records › Replace a document or mark it not available |
| 46 | Agents work › An agent could not finish |
| 47 | Agents work › Paused in Settings |

On the case page (drawn in `03-authorizations`): 26 (Send to payer and Open in review and sign, and which draft and step they open), 70 (Draft tab, the summary shared with step 4), 72, 74.

## Every page, step 2 (Medical records)

| Control | Diagram |
|---|---|
| 'Case Manager' back link (top left, every step) | 39 |
| 'Use sample chart' (header) | 31 |
| Stepper: 'Referral' (done, clickable) | 30 |
| Stepper: 'Agents work' and 'Review and sign' (greyed out here) | 30, 36 |
| Drop zone: drop, click, Enter, Space | 31 |
| 'Pull a chart from EMR Connect' (toggle) | 44 |
| 'No records system is connected' message: 'EMR Connect' link, 'Close' | 44 |
| EMR picker: chart dropdown (each chart names its system), 'Pull', 'Pulling', 'Cancel' | 44 |
| Picker note and row note 'needs a mapping' with 'Open EMR Connect' | 44, 32 |
| Progress line, 'Ready to continue' pill | 30 |
| 'Updated for a payer change on 10/20' line | 30, 37 |
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
| Document list (the payer's saved list, referral first, required, then recommended) | 30, 33 |
| Document row: 'Add file' (file picker) | 33 |
| Document row: 'Use sample file' | 33 |
| Document row: 'Add a referral' | 33 |
| Document row: 'View' (referral that came with the case) | 33 |
| Document row: eye 'View FILE' and the preview drawer (Escape closes) | 33 |
| Document row: 'Replace' (file picker, Reader reads again) | 45 |
| Document row: 'Mark not available', reason box, 'Mark not available', 'Cancel', Escape, Enter | 45 |
| Document row (marked): 'Add file', 'Undo' | 45, 33 |
| Document row: X 'Remove FILE' | 33 |
| Toast 'Records changed after the agents ran' | 31, 32, 33, 36, 44, 45 |
| Footer: 'Back' | 30 |
| Footer: 'Save as draft' | 30, 39 |
| Footer: 'Continue' (when off, and when on) | 30 |
| Footer hint line ('Still needed: ...') | 30 |
| Modal 'Start the agents?': 'Cancel', 'Start the agents', Escape | 34 |

## Step 3 (Agents work)

| Control | Diagram |
|---|---|
| Ten agent rows (Reader to Scrubber), clock chip | 34 |
| Approval chance ring and pill, 'Held back N points' line | 34, 37 |
| 'To raise it further' tick-boxes (two) | 34, 36 |
| Row button 'Answer', pill 'Needs your answer' | 35 |
| Question pop-up ('Question 1 of N'): choice cards, note box, 'Answer later', 'Send answer', Escape | 35 |
| Row pill 'Could not finish' with 'Retry' and 'Skip and note'; pill 'Skipped and noted' | 46 |
| Row pill 'Paused in Settings' | 47 |
| Banner 'Agents are paused in Settings' (or 'NAME is paused in Settings') with 'Resume agents' / 'Resume NAME' | 47 |
| Banner 'Records changed after the last run. The agents re-checked.' | 34, 36 |
| Footer: 'Back' | 36 |
| Footer: 'Pause all agents' / 'Resume agents' (same switches as Settings) | 34, 47 |
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
| 'Context added.' paragraph (from the case page) | 37, 70 |
| Validation summary: row toggles, Start date row, document rows | 41 |
| Checks card (four checks, each worked out from the case) | 41 |
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
| Case Manager after sending: 'Being prepared' card, 'N sent today', new row in the table | 42 |
| Case Manager row for a draft: ID link, button (Continue, Watch, Answer, Review and sign), status filter | 39 |
| Case page: 'Send to payer', 'Open in review and sign' (which draft, which step) | 26, 74 |
| Draft tab: 'Edit', 'Save changes' (the same text as step 4) | 70 |

## Not drawn

- **Step 1 Referral, the referral page, and the Eligibility result page**: other writers. Linked with `goto`.
- **The Dashboard request drawer and the whole Case Manager page**: other writers. Linked with `goto`. Only the parts about drafts are drawn here (39, 42).
- **Custom payers** (added on Payers with 'Add a payer'): New case's payer list is the six seeded payers, so a payer added there cannot be chosen on step 2 yet.
- **Title text of other writers' diagrams** in my `goto` labels is matched by words, so a renamed diagram may need its label changed.

## Things in the demo that still look hollow or odd

- The agents only move while step 3 is open. Case Manager keeps showing the agent that was working (39).
- A file with no telling name takes the next open required slot on the payer's list, so a duplicate can land in another slot ('Reader guessed this one. Check it.') (31).
- Demo only: a replacement file is always read clean, and a new file has a one in five chance of an amber finding (31, 45).
- Demo only: the failure to reach a portal happens only for Cardinal Health Plan on a case's first run (46). A case opened from a request on the case page never fails.
- A signed seeded case keeps its Dashboard request type (R-0988 shows 'admission' although the draft says 'Continued stay').
