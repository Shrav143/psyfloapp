# Coverage: New Case, steps 2 to 5 (Eligibility & Benefits, Clinical documentation, Authorization preparation, Review & submit)

Source: `src/pages/newcase/*` (EligibilityStep, NoAuthCard, ExceptionActions, DocumentedReasonForm, useVerifyRun, verificationFor, DocumentationStep, DropPanel, RecordsChecklist, DocRow, typicalDocs, readFiles, PreparationStep, AgentRow, QuestionModal, useAgentRun, JustificationCard, justification, narrative, ChancePanel, ReviewStep, ReviewSummary, MissingCard, NarrativeCard, ValidationSummary, ChecksCard, SignCard, caseIssues, reviewModel, stepState), `src/store/cases.ts`, `src/data/cases.ts`, `src/data/patients.ts`, `src/data/agents.ts`, `src/data/verification.ts` and `src/store/eligibility.ts` (read through the shared verification record; the Eligibility module owns them), `src/pages/authorizations/reviewAndSign.ts`. Diagram numbers are the file prefixes in this folder.

| File | Title |
|---|---|
| 30 | Eligibility & Benefits › Initial authorization |
| 31 | Eligibility & Benefits › Concurrent review |
| 32 | Eligibility & Benefits › Reauthorization / renewal |
| 33 | Eligibility & Benefits › Modification / extension |
| 34 | Eligibility & Benefits › Retroactive authorization |
| 35 | Eligibility & Benefits › Warnings and documented exceptions |
| 36 | Eligibility & Benefits › No authorization required |
| 40 | Clinical documentation › The checklist and Continue |
| 41 | Clinical documentation › Drop files and let Reader sort them |
| 42 | Clinical documentation › Required and typical documents by type |
| 43 | Clinical documentation › Clinical summary and document rows |
| 44 | Clinical documentation › Replace a document or mark it not available |
| 45 | Clinical documentation › Pull a chart from EMR Connect |
| 50 | Authorization preparation › Start the run and watch it |
| 51 | Authorization preparation › An agent asks a question |
| 52 | Authorization preparation › Finished, paused or left |
| 53 | Authorization preparation › An agent could not finish |
| 54 | Authorization preparation › Paused in Settings |
| 55 | Authorization preparation › Justification by type |
| 56 | Authorization preparation › Approval chance and ways to raise it |
| 60 | Review & submit › The draft and the summary |
| 61 | Review & submit › What is missing |
| 62 | Review & submit › Validation summary and checks |
| 63 | Review & submit › Sign and send to payer |
| 64 | Review & submit › After sending |
| 65 | Review & submit › Send back to Scribe |
| 80 | Save as draft and leave |
| 90 | Edge cases and where to see them |

## Step 2, Eligibility & Benefits

| Control | Diagram |
|---|---|
| The line under the heading, one per type | 30 to 34 |
| 'Verify needs a little more', 'Open Intake' | 30, 34 |
| Verify's wait ('Verify is checking coverage and benefits with Summit'), about 1.2 s; the case gets its id first | 30, 34 |
| A recent check is reused (under 24 hours, same dates, payer and level of care); a stale check says why | 30, 31 |
| 'Refresh verification', 'View full verification details' and its drawer | 30, 31 |
| The verification summary rows and the footnote linking to Eligibility & Benefits | 30 |
| A review, renewal or modification shows the patient's last check and never starts one by itself | 31, 32, 33 |
| Payer changed: 'Switch this case to Cardinal' | 32, 35 |
| Modification: what the change does to the requirement | 33 |
| Retroactive: coverage for the dates of service; lapsed coverage | 34 |
| The eight warnings and 'What you can do' | 35 |
| 'Continue with a documented exception', 'Continue without a verification', 'Document and continue', 'Cancel', 'Undo' | 35 |
| 'Open Settings to resume Verify' | 35, 54 |
| 'No authorization is required' card; 'Save verification to the patient record', 'Return to Case Manager', 'Continue with a documented exception' | 36 |
| Steps 3 to 5 Not applicable | 02, 36 |
| 'Back', 'Save as draft', 'Continue to Clinical documentation', the hint | 30 to 34 |

## Step 3, Clinical documentation

| Control | Diagram |
|---|---|
| Drop zone, privacy line, 'Pull a chart from EMR Connect', 'Use sample chart' | 40, 41, 45 |
| 'N of M ready', the bar, 'Required documents are in' | 40, 42 |
| Required documents from Payers, typical items by type, 'Not on the list' | 42, 43 |
| Clinical summary rows 'Diagnoses (ICD-10)' and 'Reason for the request' and their editors | 43 |
| Document rows: 'Add file', 'Use sample file', 'Mark not available', the eye, 'Replace', the x, 'View', 'Add a referral' | 43, 44 |
| 'Mark not available' reason, 'Undo' | 44 |
| Reader's reading, findings, 'Reader guessed this one' | 41, 43 |
| EMR picker: 'Chart from EMR Connect', 'Pull', 'Cancel', 'Open EMR Connect'; no system connected; a linked patient keeps their details | 45 |
| 'Back', 'Save as draft', 'Continue', 'Start the agents?', 'Cancel', 'Start the agents' | 40 |

## Step 4, Authorization preparation

| Control | Diagram |
|---|---|
| 'The agents have not started', 'Start the agents' | 50 |
| Agent rows (ten), clock chip, banners (paused, records changed, all ten done) | 50, 52, 54 |
| 'Pause all agents', 'Resume agents', 'Resume Verify', 'Skip ahead', 'Review & submit' | 50, 54 |
| 'Needs your answer', 'Answer', the question pop-up, 'Answer later', 'Send answer', note box | 51 |
| 'Could not finish', 'Retry', 'Skip and note' | 53 |
| The justification section titled for the type, 'Evidence that is missing' | 55 |
| Approval chance panel and 'To raise it further' | 56 |
| Reopening a draft that already ran | 52, 80 |

## Step 5, Review & submit

| Control | Diagram |
|---|---|
| 'What is missing' (blocking, acknowledge, note), the fix buttons, 'Nothing is missing' | 61 |
| 'Summary' list (ten rows) | 60 |
| 'Medical-necessity summary', 'Edit', 'Cancel', 'Save changes', source chips and the drawer | 60 |
| 'The packet is built when the agents finish', 'Go to Authorization preparation' | 60 |
| 'Validation summary' rows, 'Checks' card | 62 |
| Approval chance card | 56, 60 |
| 'Signing as', the two signers, the attestation and acknowledgement tick-boxes, 'Sign and send to payer (demo)', 'Demo: simulated send', the confirm pop-up | 63 |
| 'Send back to Scribe', quick notes, 'Send back' | 65 |
| After sending: the new case, Dashboard, queue, Case Manager, patient record | 64 |
| 'Back', 'Save as draft' | 60, 80 |

## Not drawn

- The text of every agent line and every document's checks: drawn by example (Summit, Residential 3.5), the rest follows from `runText.ts` and `documents.ts`.
- Dropdown and drawer internals (arrow keys, focus): shared components.
- The Dashboard, queue and Case Manager screens themselves: other modules; 64 hands off to them.
- Layout below 1080 px (the right column stacks under the left).
- The case page's Draft tab: Authorizations module; 60 and 55 name it.

## Things in the demo that look odd (for the reviewer)

- Step 2's check and the run's Verify row are two separate simulated checks. Step 2 uses the shared verification record; the Verify row on step 4 keeps the run's own scripted line, and Cardinal's portal can still fail the first time.
- Only a few things block sending: no patient, payer, service or dates; coverage confirmed inactive with no documented exception; an unanswered duplicate; and no clinician as signer. Missing documents, an empty section of the summary and a check that could not run warn and can be signed after an acknowledgement.
- A payer that needs no authorization (Beacon for IOP and PHP) makes steps 3 to 5 Not applicable, but they still open: the person can go on with a documented exception.
- The authorization window and reference shown on step 2's summary come from the Eligibility module's own record; Intake's authorization card reads the Case Manager ledger. For the same patient the two can show different dates or references.
- The Sign card opens as Jordan Perez, who is a UR coordinator, so the first click is to switch to Dr. Rivera. That is the clinician gate, not a fault.
- Pulling a chart from EMR Connect on a case that follows a known patient fills only the diagnoses and the reason.
