# Test results · 2026-11-12T17-05-05Z

0 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 26 pass, 6 fail, 0 skip · 1 s

Commit adeb3f9 · node v22.22.0 · demo time 15:30 · workers 1 · base port 7400

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [workflows-engine](workflows-engine.md) | FAIL | 26 | 6 | 0 | 0.8 |

## Failures

- **workflows-engine** · trigger payer_reply: one stage group each (info, partial, denied, p2p, overdue); an empty choice starts nothing — expected ["R-0399"] but got []
- **workflows-engine** · conditions route a record down Yes or No: payer is, service is, units left, partial award, owner is, evidence has gaps — expected 5 but got 4
- **workflows-engine** · condition evidence_missing: Yes for a patient whose stored evidence has gaps, No for one without (a one-day window and a note on file) — T.N. has a note for the one day in the window expected ["TN"] but got ["MR","TN"]
- **workflows-engine** · guardrail evidence_required: stops a record with evidence gaps and keeps the one without — expected ["TN"] but got ["MR","TN"]
- **workflows-engine** · notificationsFor appends the workflow items (unread, group Workflows) without changing the others; read state works on their ids — expected 12 but got 11
- **workflows-engine** · seed behaviour on the Oct 29 canvas: the partial offer gives the clinician a task (to confirm) and the supervisor a notice; follow-up day gives nothing yet; templates run when turned on — M.R. (25% left), S.B. and T.N.: 

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

