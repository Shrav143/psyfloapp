# patient · PASS

Run 2026-11-12T20-01-12Z · 16284 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | selector fails closed: no actor, a portal actor, an unknown id, and a patient outside the role's scope all return null |  |
| PASS | the chart holds documentation with or without an authorization: T.W. has forms and no authorization; M.R. has both |  |
| PASS | clinician: header, Documentation tab with open items first, Open / All and Notes / Forms filters, sample-data chip on forms, tab to Authorization |  |
| PASS | a patient with no authorization says so in one line; the chart still shows intake, CNA and plan |  |
| PASS | supervisor: a Review icon for notes waiting on them opens the Dashboard's Documents view with the note; the one other action on a row is Open in Lauris; no write verbs |  |
| PASS | direct support: Open in Lauris on what is behind (the same helper as the Dashboard), own patient only; another person's patient is denied and shows nothing of theirs |  |
| PASS | administrator: statuses only, Open case allowed, no Review, no Open in Lauris, no Write buttons |  |
| PASS | phone width: the chart has no horizontal scroll and the documentation rows stack with 44 px buttons |  |
