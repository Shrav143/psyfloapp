# Coverage: New Case overview, stepper, Intake and the referral

Source: `src/pages/newcase/` (NewCasePage, steps, stepState, authType, AuthTypePicker, NewCaseStepper, IntakeStep, InitialIntake, IntakeSources, IntakeForm, ReferralRows, importIntake, ExistingIntake, ModificationCard, RetroIntake, PatientSearch, AuthorizationCard, DuplicateWarning, SitePicker, DatesFields, intake, duplicates, caseIssues, seedDrafts), `src/components/import/` (ImportSources and its parts), `src/pages/referrals/` (all), `src/data/patients.ts`, `src/store/patients.ts`, `src/store/cases.ts`, `src/store/referrals*.ts`, `src/data/referral*.ts`, `src/routes.ts`. Steps 2 to 4 are in COVERAGE-steps-2-to-5.md (the file name is kept so links resolve).

Files: 00 how a case starts · 01 the stepper · 02 step states · 03 Authorization type · 04 Intake, Initial authorization · 05 Concurrent review · 06 Reauthorization / renewal · 07 Modification / extension · 08 Retroactive authorization · 09 find a patient and the authorization · 10 the row of ways in (import, referrals, known patient) · 11 checklist rows · 12 ask the referrer · 13 accept · 14 mark OK and decline · 15 check coverage · 16 full page · 17 statuses · 18 Extracted tab and document · 19 Validation tab · 20 Fit, Activity, notes · 21 checklist buttons · 22 the referrer replies · 23 header actions · 24 decision banners · 25 schedule intake · 26 possible duplicate · 27 the onboarding form (Patient, Coverage, Request, More) · 28 sites and scope · 29 reopen and resume · 37 to 39 the import: Pull from EMR, Import a file with field mapping, Paste a screenshot, and the review with Apply.

## Ways in

| Control | Diagram |
|---|---|
| Sidebar 'New Case' (makes a fresh blank case each click) | 00 |
| 'New Case' button on Authorizations | 00 |
| Demo menu 'New Case: start from a referral', FLO answer link | 00 |
| Old addresses /referrals and /referrals/:id | 00, 16 |
| 'Start a case from this referral' on the full page, or typed ?referral=ID (found, not found, other site) | 00, 23, 28 |
| 'Create authorization from verification' and 'Start authorization' on an Eligibility result (?verification=, ?type=initial) | 00 |
| 'Start renewal' in the Dashboard's what-to-do list (?type=reauth&patient=) | 00, 06 |
| ?type=initial, concurrent, reauth, modify, retro; paths.newCase({type}) | 00, 03 |
| ?step=intake, eligibility, documentation, review; preparation and the older agents open Clinical documentation at Authorization preparation; the older referral and records | 00, 29 |
| ?payer=&program=&member=&initials=&age= | 00 |
| Authorizations draft row buttons (In progress) 'Continue', 'Answer', 'Watch', 'Review and sign'; bell link; 'Open in review and sign' and 'Send to payer' on a case page | 29, 80 |
| Missing case: 'We could not find that draft', 'Start a new case' | 29 |
| Sent case: '... was sent', 'Open the case', 'Open it on the Dashboard', 'Back to Authorizations' | 29, 64 |
| Case at another site: 'This case is not available at Site B', 'Show Site B' | 29, 28 |
| Agents-already-ran redirect on opening | 29 |
| Link 'Authorizations' above the title | 00, 01, 29 |

## Stepper, states and type

| Control | Diagram |
|---|---|
| Four steps, each a button with its state (Complete, Needs attention, Pending, Not applicable, Blocked) | 01, 02 |
| Free movement to any step; progress kept in the draft | 01 |
| The step's reason as the stepper's tooltip (no step header) | 01, 02 |
| Opening Clinical documentation does not start the agents | 01, 50 |
| 'Back', 'Save as draft', 'Continue to ...' on each step; the bar's one line is a workflow warning | 01 |
| Header card 'New Case' with the case id and 'Authorization type'; 'Use sample chart' in the drop row of Clinical documentation | 01, 41 |
| Stepper on the full referral page (Intake current, not clickable) | 01, 16 |
| 'Authorization type' dropdown: five types, request type recorded, patient cleared for existing-authorization types, tidy-up of reasons, run restart | 03 |
| Disabled once sent | 03 |

## Intake by type

| Control | Diagram |
|---|---|
| The row: 'Pull from EMR' (connected sites only), 'Import a file', 'Paste a screenshot', 'Referrals N', 'Known patient'; typing into the form is the by-hand way | 10 |
| 'Pull from EMR': chart picker, 'Pull', the fields a mapping leaves out, 'Map it' | 37 |
| 'Import a file': drop or choose, 'Use a sample export', the mapping table, 'Row to import', 'Skip', 'Apply mapping', 'Cancel'; XLSX; PDF; pasted cells; unreadable files | 38 |
| 'Paste a screenshot': Ctrl+V or Cmd+V, drop or choose an image, 'Use a sample screenshot', 'Reading…', 'Demo: reading is simulated' | 39 |
| The review: 'N fields found', a box per field and document, 'Check', 'replaces J.M.', 'Apply N', 'Cancel'; 'From EMR', 'From file', 'From screenshot' under applied fields | 39 (review) |
| Referrals panel: 'Drop referral documents', 'Use sample referral', Reader's reading in the panel; the referral is placed at the site in view | 10 |
| Referrals panel rows, statuses (Documents complete, N items missing, N items to review, Waiting on the referrer), 'Review' | 10 |
| 'Known patient' panel: the patient search, results, no match, 'N more' | 10, 09 |
| 'Use a different referral' or 'Use a different patient', the line 'From referral ...' or 'Existing patient ...' | 04 |
| Form: 'Initials', 'Date of birth' with the age worked out, 'Age' for a draft with only an age, 'Sex', 'Payer', 'Plan type' (the payer's plans), 'Member ID', 'Level of care', 'Request type', 'Requested start date', 'Primary diagnosis (ICD-10)', 'Site'; 'More': 'Secondary insurance', 'Requested end date', 'Attending clinician', 'Clinician NPI', 'Referral source', 'Guardian' (under 18) | 27 |
| Requested start date; end date under More | 04, 27 |
| Bar 'Save as draft', 'Continue to Eligibility & Benefits' | 04, 80 |
| Concurrent review: patient, authorization, 'Dates to review' | 05 |
| Reauthorization / renewal: 'Dates to renew', ending soon, none left | 06 |
| Modification / extension: 'Proposed change', 'What should change', amounts, 'Why the change is needed', 'Dates the change covers', 'Payer approval: not yet' | 07 |
| Retroactive authorization: payer's Backdating rule or 'No rule on file', the form with 'First date of service' and 'Last date of service', 'Why it was not obtained ahead of time' and the four reasons, 'Supporting documents' | 08 |
| Patient card, 'Change patient', 'Which treatment episode?', 'Which authorization?', authorization card, 'History' drawer | 09 |
| Possible duplicate: 'Open R-1042', 'Continue with a reason', 'Continue with this reason', 'Cancel', 'Undo' | 26 |
| 'Site' choice, locked site, ids by site; links to other sites | 28 |
| 'Updated for a payer change on ...' | 04, 40 (named) |

## Referral checklist

| Control | Diagram |
|---|---|
| Four sections, 'n of 11 ready', row states Done, Missing, Check this, Waiting | 11 |
| Row 'Ask the referrer', 'Mark OK' (a failed age row has only 'Mark OK') | 11, 12, 14 |
| Row 'Run coverage check', 'Check again' | 11, 15 |
| 'Use different documents' | 21 |
| 'Ask the referrer for the N missing items' | 21, 12 |
| 'Decline' | 21, 14 |
| 'Demo: the referrer replies' | 21, 22 |
| 'Open the full referral' | 21, 16 |
| 'Accept referral and continue' (disabled, with the line 'Resolve N items first: ...', while a required item is open) | 21, 13 |
| 'Continue with this referral', 'Reopen referral', green and red banners | 21, 17 |
| 'Open the case', or the note 'Admitted' with 'See the full referral' (admitted referral) | 21, 17 |
| Required rows (patient age, clinician credentials, clinician signature, diagnosis code, level of care, insurance and member ID) and the advisory rest | 11, 13, 21 |

## Dialogs

| Control | Diagram |
|---|---|
| Request more information: 'Send by', 'Message', 'Cancel', 'Send request', Close, Escape, click outside | 12 |
| Accept this referral?: 'Owner', 'Program', 'Target admission date', 'Cancel', 'Accept referral', warnings banner | 13 |
| Mark OK with a reason: 'Reason', 'Cancel', 'Mark OK' (5 characters) | 14 |
| Attach this referral? (agents already ran): 'Cancel', 'Continue', Close, Escape, click outside | 13 |
| Decline: 'Reason', 'Note', courtesy switch, 'Cancel', 'Decline referral' | 14 |
| Schedule intake and Change the intake visit: 'Date', 'Time', 'Cancel', 'Schedule intake' | 25 |
| Add a note: text box, 'Cancel', 'Add note' | 20 |

## Full referral page

| Control | Diagram |
|---|---|
| Crumbs 'New Case', 'Referral', RF number | 16 |
| 'Back to the case' beside the crumbs | 16 |
| Not found page, 'Back to Intake' | 16 |
| A referral at another site: 'This referral is not available at Site A' | 28 |
| Header pills, 'Past response target', small stepper (read only) | 16 |
| 'Accept referral' (disabled like the checklist button), 'Request information', 'Decline' | 23, 13, 12, 14 |
| 'Start a case from this referral' | 23, 00 |
| 'Schedule intake', 'Change intake', 'Mark admitted', 'Reopen referral' | 23, 25, 14 |
| 'Owner' dropdown | 23 |
| 'Add note' | 23, 20 |
| 'More': demo reply, download, Copy link (hosted: 'Copy link is off in this preview') | 23 |
| The one decision banner (only the most important one shows; it steps aside on the tab it points to): 'Reopen', 'Open R-1042', 'Continue with this referral', 'Review findings', 'Open coverage' | 24, 17 |
| Tabs Extracted, Validation, Coverage, Fit, Activity | 16 |
| Extracted: row, eye, 'Why this value?', pencil, 'Save', 'Cancel', Enter | 18 |
| Source document: 'Referral form' and 'Face sheet', 'Previous', 'Next', block click, print button | 18 |
| Validation: 'Request information for all open findings', 'Show in document', 'Resolve' menu, 'Mark OK with reason' button on a failed age row | 19 |
| Coverage tab: 'Run coverage check', 'Check again', 'Open full Eligibility & Benefits check' (keeps ?referral=, and ?case= once the referral is a request), 'Back to referral' on the Eligibility pages | 15 |
| Fit tab (read only) | 20 |
| Activity tab: Timeline, notes, 'Add a note', 'Add note' | 20 |

## Not drawn

- Several referrals at once in the Decline dialog ('Decline N referrals', 'already decided and will be skipped'): the code supports it, no screen in the demo selects more than one.
- Menu internals of the Dropdown (arrow keys, closing on outside click): shared component, shown only as 'pick'.
- Sidebar badge arithmetic and the bell panel contents: drawn as one 'drops' or 'Bell' node; the shell is another module.
- Layout below 1100 px (document panel stacks above the tabs).
- The amount of time the Demo menu clock moves ('received 4 h ago' text): only named.
- Hosted-preview address handling (memory router): one 'also' line in 00.
- The exact patients and authorizations of the demo's patient book: named by example (R-1101, R-0975, I-2207, I-2193, R-0902, R-0921) in 90, not listed.

## Things in the demo that look odd (for the reviewer)

- Only six referral findings are required. Everything else (an expired order, missing patient phone, missing clinical components, urgent criteria, lapsed or unchecked coverage) is advisory: the Accept dialog lists it and accepting goes ahead.
- A referral that is Awaiting info can still be accepted: asking the referrer counts as handling a required row. Asking marks every open row as waiting, not only the ones named in the message.
- No referral in the demo has a missing age or date of birth. The rule is by state (a failed age check has no 'Ask'; a missing one would), so the missing-age case is not drawn.
- 'Start a case from this referral' skips the accept step: the case is filled from the referral and opens on Intake, and the referral stays as it was.
- 'Continue with this referral' attaches the referral again each time, which overwrites what was typed on Intake since. It asks first only when the agents ran.
- 'Back to the case' from the full referral page opens Intake on its start screen when no referral is attached yet; the crumb 'Referral' goes to the checklist.
- 'Back to referral' on the Eligibility pages (another module) opens the full referral without the case in the address; the page then finds the draft that holds the referral.
- The sample chart is J.M., 34, Summit, Residential 3.5, the same person as the open request R-1042. Using it on an initial authorization raises the possible-duplicate alert, and the person continues with a reason. That is the duplicate rule working, not a fault.
- A modification or a review is never a duplicate of the authorization it follows, but another open request or an overlapping active authorization for the same patient, payer and level of care still is.
- Changing the Authorization type of a case started by hand from a patient who is not in the patient book clears the patient: a review, renewal or modification follows an existing authorization, so a typed patient would be a second record.
