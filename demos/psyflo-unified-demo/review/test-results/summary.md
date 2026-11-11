# Test results · 2026-11-11T18-46-11Z

3 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 201 pass, 1 fail, 0 skip · 480 s

Commit 0f44ed7 · node v22.22.0 · demo time 15:30 · workers 1 · base port 4810

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [presenter](presenter.md) | FAIL | 27 | 1 | 0 | 170.9 |
| [routes](routes.md) | PASS | 56 | 0 | 0 | 166.1 |
| [smoke](smoke.md) | PASS | 85 | 0 | 0 | 50.0 |
| [ui-kit](ui-kit.md) | PASS | 33 | 0 | 0 | 92.1 |

## Failures

- **presenter** · PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician) — page.click: Timeout 30000ms exceeded.

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

