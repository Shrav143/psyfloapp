# Test results · 2026-11-12T02-59-17Z

49 suites pass · 0 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 1588 pass, 0 fail, 1 skip · 1296 s

Commit b062baf · node v22.22.0 · demo time 15:30 · workers 4 · base port 5100

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [unit](unit.md) | PASS | 11 | 0 | 0 | 0.5 |
| [analytics](analytics.md) | PASS | 24 | 0 | 0 | 29.9 |
| [bridge-contract](bridge-contract.md) | PASS | 7 | 0 | 0 | 0.6 |
| [clock](clock.md) | PASS | 10 | 0 | 0 | 1.2 |
| [authorizations](authorizations.md) | PASS | 23 | 0 | 0 | 47.4 |
| [decisions](decisions.md) | PASS | 7 | 0 | 0 | 1.1 |
| [dashboard](dashboard.md) | PASS | 16 | 0 | 0 | 31.1 |
| [denials](denials.md) | PASS | 19 | 0 | 0 | 3.1 |
| [denials-ui](denials-ui.md) | PASS | 10 | 0 | 0 | 48.5 |
| [documentation](documentation.md) | PASS | 16 | 0 | 0 | 33.2 |
| [errors](errors.md) | PASS | 5 | 0 | 0 | 6.2 |
| [enhance](enhance.md) | PASS | 14 | 0 | 0 | 15.3 |
| [fixtures](fixtures.md) | PASS | 7 | 0 | 0 | 5.2 |
| [flags](flags.md) | PASS | 17 | 0 | 0 | 26.4 |
| [family](family.md) | PASS | 47 | 0 | 0 | 64.3 |
| [flo](flo.md) | PASS | 21 | 0 | 0 | 30.0 |
| [flowB](flowB.md) | PASS | 4 | 0 | 0 | 3.8 |
| [flowA](flowA.md) | PASS | 7 | 0 | 0 | 26.5 |
| [a11y](a11y.md) | PASS | 255 | 0 | 0 | 200.1 |
| [flowC](flowC.md) | PASS | 6 | 0 | 0 | 20.9 |
| [gates](gates.md) | PASS | 29 | 0 | 0 | 5.9 |
| [lauris](lauris.md) | PASS | 9 | 0 | 0 | 1.0 |
| [flowD](flowD.md) | PASS | 5 | 0 | 0 | 13.3 |
| [mywork](mywork.md) | PASS | 15 | 0 | 0 | 30.8 |
| [panels](panels.md) | PASS | 17 | 0 | 0 | 34.5 |
| [mobile](mobile.md) | PASS | 8 | 0 | 0 | 68.8 |
| [patient](patient.md) | PASS | 8 | 0 | 0 | 11.2 |
| [presenter](presenter.md) | PASS | 28 | 0 | 0 | 125.8 |
| [parity](parity.md) | PASS | 4 | 0 | 0 | 147.0 |
| [roles](roles.md) | PASS | 24 | 0 | 0 | 10.6 |
| [referrals](referrals.md) | PASS | 8 | 0 | 0 | 24.6 |
| [rules](rules.md) | PASS | 8 | 0 | 0 | 0.9 |
| [s1](s1.md) | PASS | 37 | 0 | 0 | 38.2 |
| [hosted](hosted.md) | PASS | 0 | 0 | 0 | 278.8 |
| [routes](routes.md) | PASS | 61 | 0 | 0 | 114.7 |
| [s3](s3.md) | PASS | 36 | 0 | 0 | 83.4 |
| [s4](s4.md) | PASS | 32 | 0 | 0 | 44.8 |
| [s2](s2.md) | PASS | 34 | 0 | 0 | 120.7 |
| [s5](s5.md) | PASS | 47 | 0 | 0 | 74.9 |
| [s6](s6.md) | PASS | 35 | 0 | 0 | 47.6 |
| [school](school.md) | PASS | 11 | 0 | 0 | 17.0 |
| [scribe](scribe.md) | PASS | 12 | 0 | 0 | 20.5 |
| [safety](safety.md) | PASS | 48 | 0 | 1 | 81.9 |
| [smoke](smoke.md) | PASS | 96 | 0 | 0 | 51.9 |
| [settings](settings.md) | PASS | 17 | 0 | 0 | 66.2 |
| [voice](voice.md) | PASS | 10 | 0 | 0 | 14.3 |
| [ui-kit](ui-kit.md) | PASS | 37 | 0 | 0 | 63.3 |
| [visual](visual.md) | PASS | 236 | 0 | 0 | 205.3 |
| [audit](audit.md) | PASS | 150 | 0 | 0 | 1296.3 |

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

