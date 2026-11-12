# workflows-engine · FAIL

Run 2026-11-12T17-05-05Z · 829 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | the catalog: every kind has blocks, every block has a definition and a parameter shape the engine reads, ports follow the kind |  |
| PASS | trigger units_used: the authorizations at the warning share; the rule-bound number is the rule (a stored 99 does not win), and editing the rule moves the line |  |
| FAIL | trigger payer_reply: one stage group each (info, partial, denied, p2p, overdue); an empty choice starts nothing | expected ["R-0399"] but got [] |
| PASS | trigger deadline_near: within N days or past it; the kind of deadline narrows it (renewal, decision, appeal) |  |
| PASS | trigger followup_day: a submitted request on or past the follow-up day (the rule), judged on the day given |  |
| PASS | trigger note_late: notes behind (daily, weekly guardian, monthly collateral), filtered by type, labelled by initials |  |
| PASS | trigger eligibility_due: a check older than the interval (the rule) is a candidate; a patient with no recorded check is not |  |
| FAIL | conditions route a record down Yes or No: payer is, service is, units left, partial award, owner is, evidence has gaps | expected 5 but got 4 |
| FAIL | condition evidence_missing: Yes for a patient whose stored evidence has gaps, No for one without (a one-day window and a note on file) | T.N. has a note for the one day in the window expected ["TN"] but got ["MR","TN"] |
| PASS | actions: notify, add a task and suggest a flag each give one effect with its roles; messages fill only {patient}, {payer}, {date} |  |
| PASS | branching: a fan-out reaches every branch once; a chain passes through guardrails; a record that falls off the map is counted, not matched |  |
| PASS | guardrail roles_only: only those roles receive what follows; no role left stops the path and says why |  |
| PASS | guardrail person_confirms: the item waits for the named roles ("needs your confirmation"); other roles are not asked |  |
| PASS | guardrail max_per_day: at most n items per role; the most urgent stay, the rest are counted as limited and not shown |  |
| PASS | guardrail source_required: stops a path whose rule is an unverified demo assumption (and says which); lets a Harvest-reported or verified one through |  |
| FAIL | guardrail evidence_required: stops a record with evidence gaps and keeps the one without | expected ["TN"] but got ["MR","TN"] |
| PASS | two_person and the locked never_auto have no effect at run time: the locked guardrail takes no links and is never walked |  |
| PASS | validate: a good workflow is ok; errors for no trigger, an unknown block, a link to a missing block, a port the block lacks, a link into a trigger or the locked block |  |
| PASS | validate: a cycle, a block no trigger reaches (the locked guardrail needs no link), a rule key that is not in the rules table |  |
| PASS | validate: a parameter out of range or of the wrong type (number, whole number, select, multi, roles, payers, text, bool) |  |
| PASS | validate warns (does not refuse): nothing after a trigger, a Yes or No exit that leads nowhere |  |
| PASS | tidy: x and y are multiples of the grid, triggers sit at the left, Yes is above No, the locked guardrail is bottom right, the input is untouched and it is idempotent |  |
| PASS | tidy: two triggers stack, a block nobody links to is placed (not lost), a cycle does not hang it |  |
| PASS | normalize and ensureLocked: positions snap to the grid, settings come from the catalog, one locked guardrail is always present, duplicate links go |  |
| PASS | newId: n-xxxx, unique among the ids taken |  |
| PASS | run and workflowItems are deterministic and never write: a deep-frozen state and workflow give the same answer twice |  |
| PASS | the same answer from the clinician, supervisor and administrator projections (the engine reads status, never note text) |  |
| PASS | workflowItems: enabled workflows only, items for the role named, ids "wf:<workflow>:<record>:<node>", group Workflows, a source and a link the role may open |  |
| PASS | workflowItems for direct support: only their own patients, linked to the patient chart |  |
| FAIL | notificationsFor appends the workflow items (unread, group Workflows) without changing the others; read state works on their ids | expected 12 but got 11 |
| PASS | seed: five workflows (two on, three off), each valid and laid out on the grid with the locked guardrail; the same graphs as the templates |  |
| FAIL | seed behaviour on the Oct 29 canvas: the partial offer gives the clinician a task (to confirm) and the supervisor a notice; follow-up day gives nothing yet; templates run when turned on | M.R. (25% left), S.B. and T.N.:  |

## Output (tail)

```
PASS the catalog: every kind has blocks, every block has a definition and a parameter shape the engine reads, ports follow the kind
PASS trigger units_used: the authorizations at the warning share; the rule-bound number is the rule (a stored 99 does not win), and editing the rule moves the line
FAIL trigger payer_reply: one stage group each (info, partial, denied, p2p, overdue); an empty choice starts nothing — expected ["R-0399"] but got []
PASS trigger deadline_near: within N days or past it; the kind of deadline narrows it (renewal, decision, appeal)
PASS trigger followup_day: a submitted request on or past the follow-up day (the rule), judged on the day given
PASS trigger note_late: notes behind (daily, weekly guardian, monthly collateral), filtered by type, labelled by initials
PASS trigger eligibility_due: a check older than the interval (the rule) is a candidate; a patient with no recorded check is not
FAIL conditions route a record down Yes or No: payer is, service is, units left, partial award, owner is, evidence has gaps — expected 5 but got 4
FAIL condition evidence_missing: Yes for a patient whose stored evidence has gaps, No for one without (a one-day window and a note on file) — T.N. has a note for the one day in the window expected ["TN"] but got ["MR","TN"]
PASS actions: notify, add a task and suggest a flag each give one effect with its roles; messages fill only {patient}, {payer}, {date}
PASS branching: a fan-out reaches every branch once; a chain passes through guardrails; a record that falls off the map is counted, not matched
PASS guardrail roles_only: only those roles receive what follows; no role left stops the path and says why
PASS guardrail person_confirms: the item waits for the named roles ("needs your confirmation"); other roles are not asked
PASS guardrail max_per_day: at most n items per role; the most urgent stay, the rest are counted as limited and not shown
PASS guardrail source_required: stops a path whose rule is an unverified demo assumption (and says which); lets a Harvest-reported or verified one through
FAIL guardrail evidence_required: stops a record with evidence gaps and keeps the one without — expected ["TN"] but got ["MR","TN"]
PASS two_person and the locked never_auto have no effect at run time: the locked guardrail takes no links and is never walked
PASS validate: a good workflow is ok; errors for no trigger, an unknown block, a link to a missing block, a port the block lacks, a link into a trigger or the locked block
PASS validate: a cycle, a block no trigger reaches (the locked guardrail needs no link), a rule key that is not in the rules table
PASS validate: a parameter out of range or of the wrong type (number, whole number, select, multi, roles, payers, text, bool)
PASS validate warns (does not refuse): nothing after a trigger, a Yes or No exit that leads nowhere
PASS tidy: x and y are multiples of the grid, triggers sit at the left, Yes is above No, the locked guardrail is bottom right, the input is untouched and it is idempotent
PASS tidy: two triggers stack, a block nobody links to is placed (not lost), a cycle does not hang it
PASS normalize and ensureLocked: positions snap to the grid, settings come from the catalog, one locked guardrail is always present, duplicate links go
PASS newId: n-xxxx, unique among the ids taken
PASS run and workflowItems are deterministic and never write: a deep-frozen state and workflow give the same answer twice
PASS the same answer from the clinician, supervisor and administrator projections (the engine reads status, never note text)
PASS workflowItems: enabled workflows only, items for the role named, ids "wf:<workflow>:<record>:<node>", group Workflows, a source and a link the role may open
PASS workflowItems for direct support: only their own patients, linked to the patient chart
FAIL notificationsFor appends the workflow items (unread, group Workflows) without changing the others; read state works on their ids — expected 12 but got 11
PASS seed: five workflows (two on, three off), each valid and laid out on the grid with the locked guardrail; the same graphs as the templates
FAIL seed behaviour on the Oct 29 canvas: the partial offer gives the clinician a task (to confirm) and the supervisor a notice; follow-up day gives nothing yet; templates run when turned on — M.R. (25% left), S.B. and T.N.: 
RESULT workflows-engine pass=26 fail=6 skip=0
```
