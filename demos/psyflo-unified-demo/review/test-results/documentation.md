# documentation · PASS

Run 2026-11-11T21-13-30Z · 36201 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | scope per role: supervisor = the staff they manage and their sites, clinician and administrator = every patient; every row is a patient in scope |  |
| PASS | statuses: Open = behind + due + in progress + needs review + sent back; the on-time share counts filed notes only; types come from the documents |  |
| PASS | the administrator's state carries no note text; the supervisor and clinician may |  |
| PASS | the server refuses what the screen hides: administrator and direct support cannot review; nobody reviews their own note |  |
| PASS | supervisor: one h1, Open is the default, the table has Patient to Action, the status chips carry counts, nothing outside the scope |  |
| PASS | filters: status chip, document type, search, group; each persists in the URL and survives a reload; Clear filters returns to Open |  |
| PASS | sorting by Due and Status; Show more for a long list; header stays |  |
| PASS | review drawer: ?id= opens it on load; approve end to end (status changes in the table, audit event, toast); the decided note leaves Needs review |  |
| PASS | return with a note: the note is required, the drawer stays open on the error; then the note goes back (status Sent back, audit event, reviewer named) |  |
| PASS | "That didn't happen" needs a note too and flags the note (sent back, flagged in the audit trail) |  |
| PASS | old links land here: ReviewQueue, My Work review and team, and a note deep link opens the drawer |  |
| PASS | By staff: one row per staffer in scope; a row opens the Documents tab for that person; approval mode changes through staff.reviewMode |  |
| PASS | clinician: every patient, Review on notes waiting, no review on their own notes, forms marked as sample data |  |
| PASS | administrator: statuses and dates, no Review button, no note text in the page or in any response, the drawer link does nothing |  |
| PASS | direct support has no Documentation: the standard notice, no table, no data request for it |  |
| PASS | phone width: no sideways scroll for the supervisor (both tabs), the clinician and the administrator; touch targets 44 px |  |
