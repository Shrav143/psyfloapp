# mywork · PASS

Run 2026-11-11T18-24-51Z · 33490 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | sections by role, and a hand-typed section can never open what the role may not see |  |
| PASS | fail closed: no actor, no list; direct support cannot see another person's day; nobody in scope is nobody (no default person) |  |
| PASS | clinician: urgent first (24-hour information reply), verbs per item, referrals in their own section |  |
| PASS | administrator: operations only, no clinical items and no clinical text anywhere |  |
| PASS | supervisor: review queue is the staff routed to them and never their own notes; designated sending shows Send notice |  |
| PASS | direct support: one progress line, next overdue note first, due-next list, no tiles of other people |  |
| PASS | the note deadline comes from the rules table: 24 h by default, changing it changes who is behind |  |
| PASS | the server refuses what the screen hides: admin and direct support cannot review a note; a reviewer cannot review their own |  |
| PASS | clinician lands on To do: top three with verbs, Show all expands, tabs carry counts, one h1, no console errors |  |
| PASS | supervisor lands on Review: approve a note, return one with a required note, approval mode in Team |  |
| PASS | Team deep link ?staff= opens that person's day; the old StaffDashboard and ReviewQueue routes land here |  |
| PASS | administrator: Operations and Team, "Clinical text hidden for your role", no note text, review is denied with the reason |  |
| PASS | direct support: My day only, one progress line, Write note goes to the form; works at phone width without sideways scroll |  |
| PASS | a row whose screen the role may not open says why (a disabled button), never a dead link |  |
| PASS | every link on every My Work section, for every role, resolves to a screen the role may open |  |
