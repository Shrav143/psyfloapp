# settings · PASS

Run 2026-11-12T17-43-18Z · 63412 ms · instance 0 · exit 0

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
| PASS | Settings: opens on the workflow map (no tab bar), the six older pages open from More settings with one h1 and a way back, no console errors; only the administrator opens it |  |
| PASS | rule library (the old Rules tab, now in the workflow map): filter by source, search, edit in the drawer (reason required, value type kept), and the audit tab shows it |  |
| PASS | units tab: the try-it box follows the bands; switching to the alternate asks why and is audited |  |
| PASS | roles tab: the matrix is drawn from permissions.js; designate in the UI, the clinician confirms from My Work, the grant takes effect |  |
| PASS | people tab: change a role with a reason (a lowering applies, a raise waits), the second person confirms in Settings or My Work |  |
| PASS | family tab: In person changes the rule, asks why, shows Policy not validated; the family-link question switches work |  |
| PASS | presenter tab: how it fits, architecture, maturity legend with all four levels, the unresolved decisions with where each is set |  |
| PASS | Login at 1440: a small card near the top of the window, not a page of boxes: under 440 px wide, no role cards, no scrolling |  |
| PASS | Login: one small card with one dropdown of people grouped by role, the family and school entries, no password, no demo chrome; signing in lands on the role's home; works at 390 |  |
