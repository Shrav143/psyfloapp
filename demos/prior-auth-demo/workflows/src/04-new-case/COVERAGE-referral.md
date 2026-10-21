# Coverage: New case overview, stepper and step 1 (Referral)

Source: `src/pages/newcase/` (NewCasePage, steps, ReferralStep, intake, seedDrafts), `src/pages/referrals/` (all), `src/store/referrals*.ts`, `src/data/referral*.ts`, `src/routes.ts`. Steps 2 to 4 are in files 30 to 43 (other writer).

Files: 00 overview · 01 stepper · 10 start screen · 11 checklist rows · 12 ask the referrer · 13 accept · 14 mark OK and decline · 15 check coverage · 16 full page · 17 statuses · 18 Extracted tab and document · 19 Validation tab · 20 Fit, Activity, notes · 21 checklist buttons · 22 the referrer replies · 23 header actions · 24 decision banners · 25 schedule intake.

## Ways in

| Control | Diagram |
|---|---|
| Sidebar 'New case' (makes a fresh blank case each click) | 00 |
| 'New case' button on Authorizations and on Case Manager, 'Start a new case' (empty Preparing card) | 00 |
| Demo menu 'New case: start from a referral', FLO answer link 'Start a case from a referral' | 00 |
| Old addresses /referrals and /referrals/:id | 00, 16 |
| Typed /authorizations/new?referral=ID (found and not found) | 00 |
| 'Start authorization' on a coverage result (?payer=&program=&member=&initials=&age=) | 00, 15 |
| Case Manager row buttons 'Continue', 'Answer', 'Watch', 'Review and sign'; bell link; 'Open in review and sign' on a case | 00 |
| Missing case: 'We could not find that draft', 'Start a new case' | 00 |
| Sent case: '... was sent', 'Open it on the Dashboard', 'Back to Case Manager' | 00 |
| Agents-already-ran redirect on opening | 00 |
| Link 'Case Manager' above the title | 00, 01 |

## Stepper

| Control | Diagram |
|---|---|
| Steps 'Referral', 'Medical records', 'Agents work' (earlier steps clickable) | 01 |
| 'Review and sign' and current step (disabled) | 01 |
| Stepper on the full referral page (not clickable) | 01, 16 |
| 'Back' (Medical records, Agents work, Review and sign) | 01 |
| 'Continue', 'Save as draft', 'Pause all agents', 'Skip ahead', 'Review and sign', 'Sign and send' (named only, drawn in 30 to 43) | 01 |
| Title and sentence per step; 'Use sample chart' | 01 |

## Step 1 start screen

| Control | Diagram |
|---|---|
| Drop panel 'Drop the referral documents' (drop, click, Enter or Space) | 10 |
| 'Use sample referral' | 10 |
| Reader reading screen (four steps), no Cancel | 10 |
| 'Already arrived (N)' list, 'Check', 'Show N more', 'Show fewer', pills | 10 |
| 'No referral? Continue without one' | 10 |
| Bell notification 'New referral read', toast 'Reader read the documents' | 10 |

## Referral checklist

| Control | Diagram |
|---|---|
| Four sections, 'n of 11 ready', row states Done, Missing, Check this, Waiting | 11 |
| Row 'Ask the referrer', 'Mark OK' | 11, 12, 14 |
| Row 'Run coverage check', 'Check again' | 11, 15 |
| 'Use different documents' | 21 |
| 'Ask the referrer for the N missing items' | 21, 12 |
| 'Decline' | 21, 14 |
| 'Demo: the referrer replies' | 21, 22 |
| 'Open the full referral' | 21, 16 |
| 'Accept referral and continue' (never disabled) | 21, 13 |
| 'Continue to medical records', 'Reopen referral', green and red banners | 21, 17 |

## Dialogs

| Control | Diagram |
|---|---|
| Request more information: 'Send by', 'Message', 'Cancel', 'Send request', Close, Escape, click outside | 12 |
| Accept this referral?: 'Owner', 'Program', 'Target admission date', 'Cancel', 'Accept referral', warnings banner | 13 |
| Mark OK with a reason: 'Reason', 'Cancel', 'Mark OK' (5 characters) | 14 |
| Decline: 'Reason', 'Note', courtesy switch, 'Cancel', 'Decline referral' | 14 |
| Schedule intake and Change the intake visit: 'Date', 'Time', 'Cancel', 'Schedule intake' | 25 |
| Add a note: text box, 'Cancel', 'Add note' | 20 |

## Full referral page

| Control | Diagram |
|---|---|
| Crumbs 'New case', 'Referral', RF number (plain text) | 16 |
| Not found page, 'Back to the referral step' | 16 |
| Header pills, 'Past response target', small stepper (read only) | 16 |
| 'Accept referral', 'Request information', 'Decline' | 23, 13, 12, 14 |
| 'Schedule intake', 'Change intake', 'Mark admitted', 'Reopen referral' | 23, 25, 14 |
| 'Owner' dropdown | 23 |
| 'Add note' | 23, 20 |
| 'More': demo reply, download, Copy link (hosted: 'Copy link is off in this preview') | 23 |
| Banners: 'Reopen', 'Open R-1042', 'Continue to medical records', 'Review findings', 'Open coverage' | 24, 17 |
| Tabs Extracted, Validation, Coverage, Fit, Activity | 16 |
| Extracted: row, eye, 'Why this value?', pencil, 'Save', 'Cancel', Enter | 18 |
| Source document: 'Referral form' and 'Face sheet', 'Previous', 'Next', block click, print button | 18 |
| Validation: 'Request information for all open findings', 'Show in document', 'Resolve' menu | 19 |
| Coverage tab: 'Run coverage check', 'Check again', 'Open full Eligibility & Benefits check' | 15 |
| Fit tab (read only) | 20 |
| Activity tab: Timeline, notes, 'Add a note', 'Add note' | 20 |

## Not drawn

- Several referrals at once in the Decline dialog ('Decline N referrals', 'already decided and will be skipped'): the code supports it, no screen in the demo selects more than one.
- Menu internals of the Dropdown (arrow keys, closing on outside click): shared component, shown only as 'pick'.
- Sidebar badge arithmetic and the bell panel contents: drawn as one 'drops' or 'Bell' node; the shell is another module.
- Layout below 1100 px (document panel stacks above the tabs).
- The amount of time the Demo menu clock moves ('received 4 h ago' text): only named.
- Hosted-preview address handling (memory router): one 'also' line in 00.

## Things in the demo that look odd (for the reviewer)

- `?referral=` is no longer linked from any button (typed address only, and impossible in the hosted preview).
- The checklist 'Accept referral and continue' is never disabled.
- A failed age check still gets 'Ask the referrer' on its row, but the footer button and the reply ignore age.
- Attaching a referral to a case whose agents already ran clears the agents' work without a warning.
- The full referral page has no 'Back to the draft' button; the crumbs 'New case' and 'Referral' are the way back.
- Admitted referrals have no main button on the checklist (dead end, reachable only by address).
- Toast 'RF-2053 is now Intake scheduled.' while the pill says 'Scheduled'.
- Eligibility 'Verify a patient' opened from a referral has no way back to the referral or its case.
