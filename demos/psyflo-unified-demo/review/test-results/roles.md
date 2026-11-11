# roles · PASS

Run 2026-11-11T19-10-20Z · 10060 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | matrix: every documented capability, every role |  |
| PASS | admin has no clinical-record access; notes.view is never granted by a designation |  |
| PASS | can(): A needs the caseload, D needs the designation, unknown role/capability/user fail closed |  |
| PASS | routes: every registry route has a capability entry; each role opens exactly what the matrix allows |  |
| PASS | every action has a capability entry (and nothing is declared for an action that does not exist) |  |
| PASS | anonymous: /api/state, /api/do (admin and plain actions), /files and the roster |  |
| PASS | no screening transcript reaches an unauthenticated caller: /api/state is 401, the roster is empty, the scripted call needs a session |  |
| PASS | a made-up or tampered token is the same as no token |  |
| PASS | action sweep: every action x every staff role gets 401/403 exactly when the matrix says no |  |
| PASS | presenter controls need presenter mode, not only a role |  |
| PASS | user.update: a role change is presenter-only; designations go through two people |  |
| PASS | projection: direct support sees only their caseload; no screenings, drafts, versions, fills, other staff notes |  |
| PASS | projection: admin sees unit balances and authorization status but no clinical text |  |
| PASS | projection: supervisor sees status and their reviewees' notes; clinician sees clinical text |  |
| PASS | a role switch changes what the API returns (same server, different token) |  |
| PASS | service line: outpatient (P.G., R-0377) never appears in the staff state |  |
| PASS | portal sessions: a guardian sees one child; a school user sees their own school; neither can use staff actions |  |
| PASS | files need a session and the right role |  |
| PASS | cross-origin: JSON only and an origin allow-list on state-changing calls |  |
| PASS | presenter PIN and DEMO_PRESENTER are honoured by sign-in |  |
| PASS | a plain sign-in is never a presenter; the public roster says whether presenter mode exists and needs a PIN, and never carries the PIN |  |
| PASS | createSession: PIN required when PRESENTER_PIN is set (wrong or missing is 403 with pin flag), the right PIN elevates, DEMO_PRESENTER=0 never does |  |
| PASS | regression (URA-05/06/10): writing localStorage.psyflo_user, or reloading, never turns a role session into another person or a presenter |  |
| PASS | with PRESENTER_PIN set: the server and the dock ask for the PIN, a wrong PIN is refused, the right PIN unlocks the presenter tools (own server) |  |
