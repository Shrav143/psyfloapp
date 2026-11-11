# patient · PASS

Run 2026-11-11T20-47-05Z · 11729 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | selector fails closed: no actor, a portal actor, an unknown id, and a patient outside the role's scope all return null |  |
| PASS | the chart holds documentation with or without an authorization: T.W. has forms and no authorization; M.R. has both |  |
| PASS | clinician: header, Documentation tab with open items first, Open / All and Notes / Forms filters, sample-data chip on forms, tab to Authorization |  |
| PASS | a patient with no authorization says so in one line; the chart still shows intake, CNA and plan |  |
| PASS | supervisor: Review buttons for notes waiting on them go to the Documentation queue with the note; no write verbs |  |
| PASS | direct support: Write note on what is behind, own patient only; another person's patient is denied and shows nothing of theirs |  |
| PASS | administrator: statuses only, Open case allowed, no Review or Write buttons |  |
| PASS | phone width: the chart has no horizontal scroll and the documentation rows stack with 44 px buttons |  |
