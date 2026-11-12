# settings · PASS

Run 2026-11-12T02-13-46Z · 67969 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | roles: a raise needs a second person (not the proposer, an administrator or a clinician); a lowering applies at once; never your own |  |
| PASS | people: new users start as direct support or supervisor; clinician and administrator go through a role change |  |
| PASS | designated access: proposed by an administrator, confirmed by someone else, never for yourself, never a clinical-record grant for an administrator |  |
| PASS | rules: a reason is required, only the administrator edits, the type is kept, and a change is audited with its values |  |
| PASS | rules: the dependent screen changes (day-5 follow-up makes the Aetna request a follow-up call in My Work); reset restores it |  |
| PASS | units: the alternate bands change the units a day earns; restore returns the official bands (audited) |  |
| PASS | signature mode per document type: default remote (not validated); In person changes the rule the family screens read |  |
| PASS | family link questions: ask and required switches (the guardian link reads them); the insurance question is locked |  |
| PASS | the administrator has no clinical-record access: Settings never carries note text, and the matrix says so |  |
| PASS | Settings: seven tabs, one h1, every tab renders without console errors; only the administrator opens it |  |
| PASS | rules tab: filter by source, search, edit in the drawer (reason required, value type kept), history and the audit tab show it |  |
| PASS | units tab: the try-it box follows the bands; switching to the alternate asks why and is audited |  |
| PASS | roles tab: the matrix is drawn from permissions.js; designate in the UI, the clinician confirms from My Work, the grant takes effect |  |
| PASS | people tab: change a role with a reason (a lowering applies, a raise waits), the second person confirms in Settings or My Work |  |
| PASS | family tab: In person changes the rule, asks why, shows Policy not validated; the family-link question switches work |  |
| PASS | presenter tab: how it fits, architecture, maturity legend with all four levels, the unresolved decisions with where each is set |  |
| PASS | Login: four role cards, the family and school entries, no password, no demo chrome; signing in lands on the role's home; works at 390 |  |
