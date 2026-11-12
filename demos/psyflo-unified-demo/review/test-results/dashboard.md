# dashboard · PASS

Run 2026-11-12T20-04-23Z · 40337 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | fail closed: no actor, no patients; a portal actor has none either |  |
| PASS | scope by role: direct support own caseload, supervisor the staff they manage, clinician and administrator everyone |  |
| PASS | units: the flag is the rules-table threshold (75% used) and nothing else; 0 left is out |  |
| PASS | filters: attention chips, search by Lauris number, units flagged, staff, due overdue; counts match the rows |  |
| PASS | sorting: default is attention (red first); patient, units and staff sorts are stable and reversible |  |
| PASS | R4 every item carries the Lauris page where its work is done: notes by type, existing notes by session, rejected, intake, CNA, plan, quarterly, discharge, assessments; authorization and referral steps carry none |  |
| PASS | R4 the Lauris link helper fails closed: no actor, no path, or a role without ext.use (the administrator) gives nothing; the URL is /login?as=<id>&next=<path> |  |
| PASS | R4 view rule: Documents and Staff need the documentation capability; direct support always gets Patients |  |
| PASS | direct support: one h1, no paragraphs, only own patients, items under the patient with a verb, units bar with the flag, no console errors |  |
| PASS | expand and collapse: per-row chevron, Expand all / Collapse all, the choice lands in the address |  |
| PASS | supervisor: roster for their staff, Staff filter, chips filter the table, search by Lauris number, a patient opens the chart |  |
| PASS | filter state survives a reload and Clear filters resets it; an empty result says so with a way out |  |
| PASS | clinician: all patients, Responsible column, authorization chip with the unit bar, sort by Patient, items open their screen |  |
| PASS | administrator: statuses and dates only, no Lauris link, no write or review action, no note text; every EHR item opens the chart, an authorization step opens its screen |  |
| PASS | two-person confirmations: after the administrator proposes a designation the clinician sees the strip with a Review button; the proposer does not, and no strip when nothing waits |  |
| PASS | R4 every action is an icon link into Lauris at the note or form: the right href for each item kind, a hover definition, a new tab; no text buttons |  |
| PASS | R4 a note waiting for a reviewer has two icons, Open in Lauris and Review (the drawer, in place); direct support sees Lauris only; the drawer opens the note in Lauris too |  |
| PASS | R4 Open in Lauris lands on the form with the Psyflo panel already beside it, showing the same patient (from the icon, and for the intake, daily note and CNA pages) |  |
| PASS | phone width: no horizontal scroll, patients become cards, buttons are 44 px |  |
| PASS | the old My Work, Do next and Staff dashboard routes land on the Dashboard (the review and team sections on its Documents and Staff views, see documentation.mjs) |  |
| PASS | feedback Nov 12: no date or time and no "N of M" above the table; rows per page 10, 25, 50, 100 at the bottom, kept in the address |  |
| PASS | the rail is dark navy with a teal active item, the top bar carries FLO and the bell on every platform page, and a note waiting for review gives no date |  |
