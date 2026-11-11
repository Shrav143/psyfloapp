# Test results · 2026-11-11T18-19-51Z

12 suites pass · 5 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 320 pass, 12 fail, 52 skip · 243 s

Commit 63e6bd0 · node v22.22.0 · demo time 15:30 · workers 3 · base port 4800

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [unit](unit.md) | PASS | 11 | 0 | 0 | 0.5 |
| [bridge-contract](bridge-contract.md) | PASS | 7 | 0 | 0 | 0.7 |
| [clock](clock.md) | PASS | 10 | 0 | 0 | 1.1 |
| [decisions](decisions.md) | PASS | 8 | 0 | 0 | 3.6 |
| [fixtures](fixtures.md) | PASS | 7 | 0 | 0 | 5.4 |
| [flowB](flowB.md) | PASS | 4 | 0 | 0 | 6.0 |
| [gates](gates.md) | PASS | 29 | 0 | 0 | 5.8 |
| [rules](rules.md) | PASS | 8 | 0 | 0 | 1.0 |
| [roles](roles.md) | PASS | 24 | 0 | 0 | 12.0 |
| [flowC](flowC.md) | PASS | 6 | 0 | 0 | 22.7 |
| [s3](s3.md) | FAIL | 5 | 4 | 27 | 27.5 |
| [s1](s1.md) | FAIL | 27 | 1 | 10 | 64.0 |
| [s4](s4.md) | PASS | 32 | 0 | 0 | 47.0 |
| [s6](s6.md) | FAIL | 27 | 1 | 7 | 37.4 |
| [s2](s2.md) | PASS | 34 | 0 | 0 | 126.5 |
| [safety](safety.md) | FAIL | 47 | 2 | 1 | 88.0 |
| [s5](s5.md) | FAIL | 34 | 4 | 7 | 165.6 |

## Failures

- **s3** · S3[scenario] · 2 the SRA panel: 7 statements, every one with its sources (referral, screening call, school portal, ISP); criterion 3 and trauma-informed care are left for the clinician, never drafted — "Request · T.W. Lauris connected Clinician T.W. Harvest #4492 Lynchburg City · MS-2 TDT · Initial request (SRA) Draft · not saved green · already in Lauris yello" does not match /Checks\s*7 of 7 pass/
- **s3** · S3[fixture] · 2 the SRA panel: 7 statements, every one with its sources (referral, screening call, school portal, ISP); criterion 3 and trauma-informed care are left for the clinician, never drafted — "Request · T.W. Lauris connected Clinician T.W. Harvest #4492 Lynchburg City · MS-2 TDT · Initial request (SRA) Draft · not saved green · already in Lauris yello" does not match /Checks\s*7 of 7 pass/
- **s3** · S3[fresh] · 2 the SRA panel: 7 statements, every one with its sources (referral, screening call, school portal, ISP); criterion 3 and trauma-informed care are left for the clinician, never drafted — "Request · T.W. Lauris connected Clinician T.W. Harvest #4492 Lynchburg City · MS-2 TDT · Initial request (SRA) Draft · not saved green · already in Lauris yello" does not match /Checks\s*7 of 7 pass/
- **s3** · S3 parity: the first and the last state are the same whether it started from demo.scenario, the fixture tw-isp-ready or a fresh reset — at least two completed runs to compare: 
- **s1** · S1[scenario] · 2 say what happened, review the draft, save: the dictation WAITS in Psyflo (with the Harvest #), nothing reaches Lauris, the phone says Waiting for Lauris — locator.click: Timeout 30000ms exceeded.
- **s6** · S6[fresh] · 3 payer outcomes (S5 effect): a recorded decision moves "Units approved" and "Offers awaiting a reply" and the unresolved count on the Payer Performance section, which prints case-backed figures only — "Analytics\nCase-backed\nIllustrative cohort\nAsk\nEarlier views\nExport\nCase-backed\nCounted from stored records · as of Oct 29, 2026\nAll sites\nAggregates only\nWhy ag" does not match /Units approved\s*\n?\s*315/
- **safety** · UAR-05b (not release-blocking) every source chip of those drafts carries a date — continued stay: source 4 "Request record" has no date expected [] but got ["continued stay: source 4 \"Request record\" has no date"]
- **safety** · SVR-09 demo controls (reply, advance, reset) are hidden from direct support in the UI and refused by the server — no demo controls on the page expected 0 but got 6
- **s5** · S5[scenario] · 11 E.C. (R-0384): the clinician drafts and reviews the appeal letter; the guardian signs on the phone (the signer is the guardian behind the link); staff press Send; "faxed" appears only after Send, the reference comes from the stub — locator.getAttribute: Timeout 30000ms exceeded.
- **s5** · S5[fixture] · 11 E.C. (R-0384): the clinician drafts and reviews the appeal letter; the guardian signs on the phone (the signer is the guardian behind the link); staff press Send; "faxed" appears only after Send, the reference comes from the stub — locator.getAttribute: Timeout 30000ms exceeded.
- **s5** · S5[fresh] · 11 E.C. (R-0384): the clinician drafts and reviews the appeal letter; the guardian signs on the phone (the signer is the guardian behind the link); staff press Send; "faxed" appears only after Send, the reference comes from the stub — locator.getAttribute: Timeout 30000ms exceeded.
- **s5** · S5 parity: the first and the last state are the same whether it started from demo.scenario, the fixture payer-decision or a fresh canvas reset — at least two completed runs to compare: 

## Skipped (reason required)

- s3 · S3[scenario] · 3 edit criterion 1: the person's words replace the draft (Clinician edited, Restore previous appears); the draft is Psyflo's, nothing is in Lauris yet — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 4 Accept the statements with sources, Approve and fill: the boxes are typed yellow (not saved); criterion 3 and trauma-informed care stay blank; the version is recorded by Psyflo — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 4b the drafted request dates start on or after the day the request is drafted (one demo clock, no seed date carried over) — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 5 Process Form (a person): Pending clinical approval, Lauris session processed and in Forms to Approve, the queue says so, the timeline gains events — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 6 internal approval (platform): an undesignated supervisor cannot (button disabled with the reason, server 403); the designated clinician approves; Awaiting signature — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 7 Get Signature (a licensed person, in Lauris Forms to Approve): Signed; the signer on the record and the PDF is the Lauris user; Lauris marks the session signed — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 8 Send (a person, in the platform): sending, then Submitted with the simulated Sfax receipt: a fax reference F-nnnn, a receipt, the decision clock "Day 0"; the actor is the person, events say simulated — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · 9 the timeline and Analytics follow: R-0416 has the full chain of events; the pilot scorecard "Sends with receipts" moves +1 over +1 on the screen and in the selector — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[scenario] · no console errors on the desk, Lauris, the panel or the platform — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 3 edit criterion 1: the person's words replace the draft (Clinician edited, Restore previous appears); the draft is Psyflo's, nothing is in Lauris yet — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 4 Accept the statements with sources, Approve and fill: the boxes are typed yellow (not saved); criterion 3 and trauma-informed care stay blank; the version is recorded by Psyflo — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 4b the drafted request dates start on or after the day the request is drafted (one demo clock, no seed date carried over) — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 5 Process Form (a person): Pending clinical approval, Lauris session processed and in Forms to Approve, the queue says so, the timeline gains events — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 6 internal approval (platform): an undesignated supervisor cannot (button disabled with the reason, server 403); the designated clinician approves; Awaiting signature — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 7 Get Signature (a licensed person, in Lauris Forms to Approve): Signed; the signer on the record and the PDF is the Lauris user; Lauris marks the session signed — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 8 Send (a person, in the platform): sending, then Submitted with the simulated Sfax receipt: a fax reference F-nnnn, a receipt, the decision clock "Day 0"; the actor is the person, events say simulated — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · 9 the timeline and Analytics follow: R-0416 has the full chain of events; the pilot scorecard "Sends with receipts" moves +1 over +1 on the screen and in the selector — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fixture] · no console errors on the desk, Lauris, the panel or the platform — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 3 edit criterion 1: the person's words replace the draft (Clinician edited, Restore previous appears); the draft is Psyflo's, nothing is in Lauris yet — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 4 Accept the statements with sources, Approve and fill: the boxes are typed yellow (not saved); criterion 3 and trauma-informed care stay blank; the version is recorded by Psyflo — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 4b the drafted request dates start on or after the day the request is drafted (one demo clock, no seed date carried over) — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 5 Process Form (a person): Pending clinical approval, Lauris session processed and in Forms to Approve, the queue says so, the timeline gains events — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 6 internal approval (platform): an undesignated supervisor cannot (button disabled with the reason, server 403); the designated clinician approves; Awaiting signature — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 7 Get Signature (a licensed person, in Lauris Forms to Approve): Signed; the signer on the record and the PDF is the Lauris user; Lauris marks the session signed — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 8 Send (a person, in the platform): sending, then Submitted with the simulated Sfax receipt: a fax reference F-nnnn, a receipt, the decision clock "Day 0"; the actor is the person, events say simulated — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · 9 the timeline and Analytics follow: R-0416 has the full chain of events; the pilot scorecard "Sends with receipts" moves +1 over +1 on the screen and in the selector — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s3 · S3[fresh] · no console errors on the desk, Lauris, the panel or the platform — blocked by an earlier failed step in this run: 2 the SRA panel: 7 statements, every one with its sources (r
- s1 · S1[scenario] · 3 Lauris daily note + panel: "Dictation dropped in"; the boxes are typed yellow and NOT saved (no session in Lauris, only the panel.filled event in Psyflo) — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 4 review wording and sources in the panel: the staffer's words, the drafted narrative ("Nothing was added"), the questions for what was not said, 3 of 5 checks — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 5 Process Form (a person's click): the note, the units, the dictation, 3+ audit events, in BOTH stores — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 5b the processed note's Contact time rows are the confirmed blocks only (the unconfirmed 1:40-3:10 pm block is neither counted NOR written into the note) — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 6 the phone and Track Time follow only the observed event: Processed in Lauris, 5 of 6, "In the note" 3 h 40 min = 2 units — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 7 My Work (khale): 5 of 6 in, M.R. no longer open; the supervisor queue follows the review mode (every note: +1; spot check: the note is sampled or not queued, never silently lost) — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 8 the authorization case follows: R-0411 Units used 85 of 110 (25 left), the same figure Lauris prints — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 9 Analytics (admin): the pilot scorecard "Notes on time" moves +1 over +1, the screen shows what the selector computes, no clinical text for admin — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · 10 Denial Intelligence and Authorizations are untouched by a daily note (no dispute opened or closed, no Lauris task) — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s1 · S1[scenario] · no console errors on the phone, Lauris, the panel or the platform — blocked by an earlier failed step in this run: 2 say what happened, review the draft, save: the dictation W
- s6 · S6[fresh] · 3b a payer row opens Denial Intelligence filtered to that payer (a link, not a dead cell); an upcoming-work row opens its case — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · 4 patient population, then the Illustrative cohort: a separate dataset with its own banner, never summed with the case-backed figures; groups under 5 are "Fewer than 5" in both — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · 4b earlier views: the seeded baseline is labelled "Sample data, illustrative" (never "Harvest's Lauris export"); outcomes and goals sections keep groups under 5 hidden — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · 5 drill-down is gated: the administrator has none; the clinician (own caseload) opens the patients behind a case-backed group; the cohort offers no drill-down to anyone — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · 6 export: the CSV the administrator downloads prints the period, the filters, the dataset and the definitions, and every panel equals what is on screen cell for cell; the PDF downloads — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · 7 the administrator's state and screens carry no clinical text: the API projection withholds notes, drafts, screenings and evidence; Denial Intelligence and the case show status only; the clinical routes say why — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- s6 · S6[fresh] · no console errors for any role on Analytics — blocked by an earlier failed step in this run: 3 payer outcomes (S5 effect): a recorded decision moves "Uni
- safety · EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse
- s5 · S5[scenario] · 11b E.C. appeal on an Availity payer: "Mark ready for upload" is a person's note that a upload is next, NOT a send: the stage stays out of "Appeal sent" and the status out of "sent" until the portal page confirms (the way K.T. does) — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[scenario] · 12 the leadership readout agrees with the stores: the four requests show Active, Submitted, Active and the appeal recorded state in the queue; one open Denial Intelligence case remains (the appeal waits for the payer); Analytics = selectors — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[scenario] · no console errors on the desk, the portal, the guardian page, Lauris or Analytics — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[fixture] · 12 the leadership readout agrees with the stores: the four requests show Active, Submitted, Active and the appeal recorded state in the queue; one open Denial Intelligence case remains (the appeal waits for the payer); Analytics = selectors — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[fixture] · no console errors on the desk, the portal, the guardian page, Lauris or Analytics — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[fresh] · 12 the leadership readout agrees with the stores: the four requests show Active, Submitted, Active and the appeal recorded state in the queue; one open Denial Intelligence case remains (the appeal waits for the payer); Analytics = selectors — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea
- s5 · S5[fresh] · no console errors on the desk, the portal, the guardian page, Lauris or Analytics — blocked by an earlier failed step in this run: 11 E.C. (R-0384): the clinician drafts and reviews the appea

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

