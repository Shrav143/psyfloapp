# workflows-actions · PASS

Run 2026-11-12T20-05-25Z · 16630 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | authority: only the administrator creates, saves, enables or deletes a workflow (403 for clinician, supervisor, direct support); anonymous is 401 |  |
| PASS | create: blank (off, with only the locked guardrail), duplicate of a workflow, from a template key; a name is required; unknown source is 404; every create is audited |  |
| PASS | save: version + 1 and a history entry with who, when and the note; the audit event says what changed; an identical save changes nothing |  |
| PASS | save keeps the locked guardrail on every save: dropped, moved, given settings, doubled or linked, there is exactly one with no links and no settings |  |
| PASS | save refuses with 422 and says what is wrong: no trigger, unknown block, a link to nothing, a cycle, an unreachable block, a setting out of range, an unknown rule, a bad name |  |
| PASS | a warning does not stop a save: it comes back with the result (a Yes exit that leads nowhere) |  |
| PASS | enable: refuses a workflow with validation errors (a blank one), turns a valid one on and off, audits both; the bell shows the workflow item for the named role only while it is on |  |
| PASS | delete: needs a reason of four or more characters, removes the workflow, audits who and why; a missing workflow is 404 |  |
| PASS | there can be up to 40 workflows |  |
| PASS | two-person: a change to a workflow with the "second person" guardrail waits in pending (the live version stays), the proposer cannot confirm, a clinician can, the history says who proposed and who confirmed |  |
| PASS | two-person: removing the guardrail is a guarded change too, and a pending change blocks other people's saves (409) but not a decision |  |
| PASS | projection: the administrator reads every workflow with its history; supervisor, clinician and direct support read the enabled ones without history or pending; portal actors read none |  |
| PASS | audit: every write is an event with who, when and the record "workflows", and the event text carries no message text from a workflow |  |
| PASS | bell: the clinician sees a Workflows group with "From workflow: <name>" and a "Needs your confirmation" mark; the supervisor sees the notice without the mark; turning the workflow off removes them live |  |
| PASS | bell at 390 px: the workflow item fits (no horizontal page scroll) and its link and Mark read targets are at least 24 px |  |
| PASS | a rule-bound number is the rule: editing units.warn_used_pct through settings.rule changes what the workflow shows in the bell (and the Dashboard warning with it) |  |
| PASS | a reset rebuilds the five seeded workflows (two on) and clears pending confirmations |  |
