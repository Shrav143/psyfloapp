# Test results · 2026-11-12T00-34-45Z

5 suites pass · 2 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 203 pass, 2 fail, 1 skip · 319 s

Commit 6e160c9 · node v22.22.0 · demo time 15:30 · workers 2 · base port 5300

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [denials](denials.md) | PASS | 19 | 0 | 0 | 3.6 |
| [denials-ui](denials-ui.md) | FAIL | 9 | 1 | 0 | 47.4 |
| [parity](parity.md) | FAIL | 3 | 1 | 0 | 151.7 |
| [presenter](presenter.md) | PASS | 28 | 0 | 0 | 128.9 |
| [s6](s6.md) | PASS | 35 | 0 | 0 | 53.6 |
| [routes](routes.md) | PASS | 61 | 0 | 0 | 127.9 |
| [safety](safety.md) | PASS | 48 | 0 | 1 | 88.9 |

## Failures

- **denials-ui** · overview (artifact layout): header card with the process line, left menu, seven steps; Analyze opens a slide-over and fills "Where the denial is weak"; the review and the documentation request are saved — "Denial Intelligence\n/\nK.T.\nK.T., 9\nInformation request\nUpdate status\nCall payer · voice agent\nOpen in Authorizations\nOpen in Lauris\n(opens Lauris in a new tab)\n" does not match /Received[\s\S]*1 of 1 received/
- **parity** · no id is NOT-VERIFIED that could have been verified: no silent removal of a kept feature, no id without a probe or a passing suite — 7 ids:

## Skipped (reason required)

- safety · EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

