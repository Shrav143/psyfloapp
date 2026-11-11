# Test results · 2026-11-11T20-12-52Z

2 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 38 pass, 1 fail, 0 skip · 112 s

Commit 4b84709 · node v22.22.0 · demo time 15:30 · workers 1 · base port 5520

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [dashboard](dashboard.md) | PASS | 14 | 0 | 0 | 23.0 |
| [patient](patient.md) | PASS | 8 | 0 | 0 | 15.0 |
| [settings](settings.md) | FAIL | 16 | 1 | 0 | 74.2 |

## Failures

- **settings** · Login: four role cards, the family and school entries, no password, no demo chrome; signing in lands on the role's home; works at 390 — page.waitForFunction: Timeout 8000ms exceeded.

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

