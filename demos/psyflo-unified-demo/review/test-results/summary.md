# Test results · 2026-11-11T18-38-50Z

0 suites pass · 1 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 26 pass, 2 fail, 0 skip · 125 s

Commit db055dd · node v22.22.0 · demo time 15:30 · workers 1 · base port 4990

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [presenter](presenter.md) | FAIL | 26 | 2 | 0 | 124.4 |

## Failures

- **presenter** · PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician) — page.click: Timeout 30000ms exceeded.
- **presenter** · PRES-07 "Demo data · nothing is real" is on every app screen (rail foot) and on the phone and portal screens — screens without the "Demo data · nothing is real" line expected [] but got ["MobileApp (phone)","MobileDictate (phone)","MobileAssess (phone)"]

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

