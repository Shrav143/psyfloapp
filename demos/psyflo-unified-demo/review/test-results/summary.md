# Test results · 2026-11-11T21-13-30Z

46 suites pass · 0 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 1518 pass, 0 fail, 1 skip · 1163 s

Commit db8b24d · node v22.22.0 · demo time 15:30 · workers 4 · base port 5100

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [unit](unit.md) | PASS | 11 | 0 | 0 | 0.4 |
| [analytics](analytics.md) | PASS | 22 | 0 | 0 | 28.1 |
| [bridge-contract](bridge-contract.md) | PASS | 7 | 0 | 0 | 0.4 |
| [clock](clock.md) | PASS | 10 | 0 | 0 | 0.8 |
| [authorizations](authorizations.md) | PASS | 23 | 0 | 0 | 53.2 |
| [decisions](decisions.md) | PASS | 7 | 0 | 0 | 1.4 |
| [dashboard](dashboard.md) | PASS | 14 | 0 | 0 | 29.8 |
| [denials](denials.md) | PASS | 19 | 0 | 0 | 3.5 |
| [denials-ui](denials-ui.md) | PASS | 8 | 0 | 0 | 36.7 |
| [documentation](documentation.md) | PASS | 16 | 0 | 0 | 36.2 |
| [errors](errors.md) | PASS | 5 | 0 | 0 | 5.9 |
| [enhance](enhance.md) | PASS | 14 | 0 | 0 | 13.9 |
| [fixtures](fixtures.md) | PASS | 7 | 0 | 0 | 4.9 |
| [flowA](flowA.md) | PASS | 7 | 0 | 0 | 25.1 |
| [flowB](flowB.md) | PASS | 4 | 0 | 0 | 3.2 |
| [flowC](flowC.md) | PASS | 6 | 0 | 0 | 20.9 |
| [family](family.md) | PASS | 47 | 0 | 0 | 57.2 |
| [gates](gates.md) | PASS | 29 | 0 | 0 | 5.2 |
| [flowD](flowD.md) | PASS | 5 | 0 | 0 | 13.5 |
| [lauris](lauris.md) | PASS | 9 | 0 | 0 | 1.1 |
| [a11y](a11y.md) | PASS | 255 | 0 | 0 | 188.4 |
| [mywork](mywork.md) | PASS | 15 | 0 | 0 | 30.2 |
| [mobile](mobile.md) | PASS | 8 | 0 | 0 | 69.5 |
| [panels](panels.md) | PASS | 17 | 0 | 0 | 34.3 |
| [patient](patient.md) | PASS | 8 | 0 | 0 | 10.8 |
| [presenter](presenter.md) | PASS | 28 | 0 | 0 | 123.1 |
| [parity](parity.md) | PASS | 4 | 0 | 0 | 147.8 |
| [roles](roles.md) | PASS | 24 | 0 | 0 | 12.7 |
| [referrals](referrals.md) | PASS | 8 | 0 | 0 | 26.0 |
| [rules](rules.md) | PASS | 8 | 0 | 0 | 0.8 |
| [hosted](hosted.md) | PASS | 0 | 0 | 0 | 268.6 |
| [s1](s1.md) | PASS | 37 | 0 | 0 | 40.0 |
| [routes](routes.md) | PASS | 61 | 0 | 0 | 124.5 |
| [s3](s3.md) | PASS | 36 | 0 | 0 | 83.4 |
| [s2](s2.md) | PASS | 34 | 0 | 0 | 122.5 |
| [s4](s4.md) | PASS | 32 | 0 | 0 | 43.8 |
| [s6](s6.md) | PASS | 35 | 0 | 0 | 50.5 |
| [s5](s5.md) | PASS | 47 | 0 | 0 | 74.0 |
| [school](school.md) | PASS | 11 | 0 | 0 | 18.8 |
| [scribe](scribe.md) | PASS | 12 | 0 | 0 | 20.9 |
| [safety](safety.md) | PASS | 48 | 0 | 1 | 85.6 |
| [smoke](smoke.md) | PASS | 96 | 0 | 0 | 51.8 |
| [settings](settings.md) | PASS | 17 | 0 | 0 | 66.2 |
| [ui-kit](ui-kit.md) | PASS | 37 | 0 | 0 | 60.3 |
| [visual](visual.md) | PASS | 220 | 0 | 0 | 173.4 |
| [audit](audit.md) | PASS | 150 | 0 | 0 | 1162.5 |

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

