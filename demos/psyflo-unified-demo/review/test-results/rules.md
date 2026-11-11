# rules · PASS

Run 2026-11-11T16-10-48Z · 750 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | every rule has key, label, value, unit, category, source, verified_on, note, default |  |
| PASS | the register is covered: R-001..R-054 each appear in at least one rule |  |
| PASS | unit bands: official 120/180/300 by default; the 60-minute rule is only an alternate value |  |
| PASS | the named rules exist with the right category: plan due, decision clock, additional info, continued stay, notes, discharge, signature modes, eligibility, group size |  |
| PASS | settings.rule: admin only, a reason is required, the change is audited and kept in the row history |  |
| PASS | a rule change applies forward only: a new information request uses it, stored dates do not move |  |
| PASS | changing the unit bands changes unitsFor; a reset to the default restores it |  |
| PASS | signature mode: switching consent to in-person refuses a remote signature |  |
