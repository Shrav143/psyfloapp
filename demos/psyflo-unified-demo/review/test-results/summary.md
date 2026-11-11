# Test results · 2026-11-11T20-15-02Z

3 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 138 pass, 1 fail, 0 skip · 145 s

Commit 4b84709 · node v22.22.0 · demo time 15:30 · workers 2 · base port 5520

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [roles](roles.md) | FAIL | 23 | 1 | 0 | 13.7 |
| [settings](settings.md) | PASS | 17 | 0 | 0 | 68.8 |
| [routes](routes.md) | PASS | 61 | 0 | 0 | 120.5 |
| [ui-kit](ui-kit.md) | PASS | 37 | 0 | 0 | 62.0 |

## Failures

- **roles** · with PRESENTER_PIN set: the server and the dock ask for the PIN, a wrong PIN is refused, the right PIN unlocks the presenter tools (own server) — the unlock button goes once unlocked expected 0 but got 1

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

