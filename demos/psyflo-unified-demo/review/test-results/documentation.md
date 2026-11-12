# documentation · PASS

Run 2026-11-12T20-04-23Z · 47803 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | scope per role: supervisor = the staff they manage and their sites, clinician and administrator = every patient; every row is a patient in scope |  |
| PASS | statuses: Open = behind + due + in progress + needs review + sent back; the on-time share counts filed notes only; types come from the documents |  |
| PASS | the administrator's state carries no note text; the supervisor and clinician may |  |
| PASS | the server refuses what the screen hides: administrator and direct support cannot review; nobody reviews their own note |  |
| PASS | R4 one rail item: there is no Documentation item in the navigation for any role; the Dashboard item lights up for the old ids |  |
| PASS | R4 documents carry the Lauris page of the document and the Lauris number apart (the number is what a person reads) |  |
| PASS | supervisor: one h1 (Dashboard), Documents is a view of it, Open is the default, the table has Patient to Open, the status chips carry counts, nothing outside the scope |  |
| PASS | R4 every document row opens in Lauris: an icon with the Lauris page of that document; Review only on a note waiting for this reviewer; the chart icon |  |
| PASS | R4 the switch: Patients / Documents / Staff are real links (a view is an address); q, site and staff travel with it; Back keeps the view |  |
| PASS | filters: status chip, document type, search, group; each persists in the URL and survives a reload; Clear filters returns to Open |  |
| PASS | sorting by Due and Status; the pager (rows per page 10, 25, 50, 100) replaces the count and Show more; header stays |  |
| PASS | review drawer: ?id= opens it on load; approve end to end (status changes in the table, audit event, toast); the decided note leaves Needs review |  |
| PASS | return with a note: the note is required, the drawer stays open on the error; then the note goes back (status Sent back, audit event, reviewer named) |  |
| PASS | "That didn't happen" needs a note too and flags the note (sent back, flagged in the audit trail) |  |
| PASS | old links land on the Dashboard's Documents view and keep their filters: #/Documentation, #/ReviewQueue, My Work review and team, a note deep link opens the drawer, ?legacy=1 bounces there |  |
| PASS | Staff view: one row per staffer in scope; a row opens the Documents view for that person; approval mode changes through staff.reviewMode |  |
| PASS | clinician: every patient, Review on notes waiting, no review on their own notes, forms marked as sample data |  |
| PASS | administrator: statuses and dates, no Review button, no Open in Lauris, no note text in the page or in any response, the drawer link does nothing |  |
| PASS | direct support has no Documents view: no switch, ?view=documents and #/Documentation fall back to Patients (their own caseload), no table of documents, nothing named Documentation in the rail |  |
| PASS | the rail has one item for all of it: Dashboard, lit on Patients, Documents and Staff; no Documentation item for the supervisor, clinician or administrator either |  |
| PASS | phone width: no sideways scroll for the supervisor (all three views), the clinician and the administrator; documents become cards with 44 px icons |  |
