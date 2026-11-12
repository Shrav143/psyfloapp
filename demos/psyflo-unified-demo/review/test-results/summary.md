# Test results · 2026-11-12T17-18-53Z

0 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 18 pass, 1 fail, 0 skip · 58 s

Commit b6843f8 · node v22.22.0 · demo time 15:30 · workers 1 · base port 7500

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [workflows-ui](workflows-ui.md) | FAIL | 18 | 1 | 0 | 57.7 |

## Failures

- **workflows-ui** · the "second person" guardrail: a saved change waits (the live version does not change), Settings says so, a different person (the clinician, from the Dashboard) confirms, the proposer cannot — "Confirm a workflow change\nWorkflow\nLate notes, two people\nChange\n1 block added, 1 link added, renamed\nProposed by\nD. Owens · Oct 29, 3:30 pm\n\nA workflow only de" does not match /Dana Owens/

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

