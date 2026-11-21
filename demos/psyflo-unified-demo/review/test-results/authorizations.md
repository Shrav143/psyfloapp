# authorizations · PASS

Run 2026-11-12T20-05-25Z · 50563 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | every request.stage maps to the chip group of the status vocabulary (one mapping, tested) |  |
| PASS | the queue: chips overlap, counts follow the other filters, a draft is also a renewal, an overdue request is also submitted |  |
| PASS | v3 deep-link names (show=, st=, exp=, range=) become the canonical filters |  |
| PASS | deadlines carry a source: day counts from the rules table, Harvest-reported, never a bare 7 or 14 |  |
| PASS | QA2 D6: the case Evidence section reads the same gaps as the Scan & Enhance panel (evidenceIndex), never a fixed "Nothing missing" |  |
| PASS | QA2 D10: Reauth due is the end date minus the lead time from the rules table, with its source; the end date is not the due date |  |
| PASS | roles: admin sees status, units and the queue but no evidence text; direct support has no queue |  |
| PASS | owner and backup: set by anyone who opens the queue, visible to admin, the backup must be a different clinician or supervisor |  |
| PASS | the follow-up call log is append-only, needs the send capability, and a confirmed receipt is kept once |  |
| PASS | a payer decision needs its document reference and a plausible date; it is write-once |  |
| PASS | approved: Active, the award in the tracker (not Lauris), and the human task "Enter units in Lauris" opens |  |
| PASS | the task closes only when the open Lauris page shows the units: a forged event, or no action at all, cannot close it |  |
| PASS | partial and denied: the stage follows, the appeal window comes from the rules table |  |
| PASS | reconcile: units approved at 150 on T.N. replace the 65, and T.W. is not Active without units |  |
| PASS | the queue (R3, after the artifact): no demo buttons, a Status dropdown instead of chips, URL state, v3 links, sort, search, Denial Intelligence links |  |
| PASS | the table (feedback Nov 11, laid out like the artifact): units are one bar "N left of M" flagged from 75% used; the Next action cell holds the button and a dated deadline with a warning icon; ten filters on the page |  |
| PASS | S3 R-0416: Review packet -> Approve (Pending clinical approval) -> Sign in Lauris -> Send -> Submitted with the Sfax receipt |  |
| PASS | the history: rows open What · When · Who · Document · Source · Next action in a pop-up; ?section=timeline lands on History; every row has an actor tag |  |
| PASS | Record decision: approved opens the Enter units in Lauris task (card with the Lauris link); Psyflo does not write units; admin sees the task read-only |  |
| PASS | a supervisor may approve once designated (two people confirm it); the approval is recorded under the supervisor, and a different person can send |  |
| PASS | case actions on an overdue request: Log call, Overdue notice (no legal standard cited), Send again with a reason, Change owner |  |
| PASS | old routes keep working: Submission and EarlyDischarge land on the case sections; legacy=1 opens the old screen |  |
| PASS | direct support has no Authorizations; a missing or foreign case says so instead of failing |  |
