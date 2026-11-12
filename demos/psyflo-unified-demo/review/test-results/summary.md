# Test results · 2026-11-12T20-05-25Z

53 suites pass · 0 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 1725 pass, 0 fail, 1 skip · 4376 s

Commit 201db5e · node v22.22.0 · demo time 15:30 · workers 4 · base port 5100

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [unit](unit.md) | PASS | 11 | 0 | 0 | 0.4 |
| [analytics](analytics.md) | PASS | 24 | 0 | 0 | 38.1 |
| [bridge-contract](bridge-contract.md) | PASS | 7 | 0 | 0 | 0.7 |
| [clock](clock.md) | PASS | 10 | 0 | 0 | 1.5 |
| [authorizations](authorizations.md) | PASS | 23 | 0 | 0 | 50.6 |
| [decisions](decisions.md) | PASS | 7 | 0 | 0 | 1.3 |
| [dashboard](dashboard.md) | PASS | 22 | 0 | 0 | 52.0 |
| [denials](denials.md) | PASS | 19 | 0 | 0 | 3.9 |
| [denials-ui](denials-ui.md) | PASS | 10 | 0 | 0 | 55.0 |
| [enhance](enhance.md) | PASS | 14 | 0 | 0 | 15.4 |
| [errors](errors.md) | PASS | 5 | 0 | 0 | 10.5 |
| [documentation](documentation.md) | PASS | 21 | 0 | 0 | 65.6 |
| [fixtures](fixtures.md) | PASS | 7 | 0 | 0 | 6.0 |
| [flags](flags.md) | PASS | 17 | 0 | 0 | 28.7 |
| [family](family.md) | PASS | 47 | 0 | 0 | 83.9 |
| [flo](flo.md) | PASS | 21 | 0 | 0 | 35.3 |
| [flowB](flowB.md) | PASS | 4 | 0 | 0 | 4.5 |
| [flowA](flowA.md) | PASS | 7 | 0 | 0 | 27.7 |
| [flowC](flowC.md) | PASS | 6 | 0 | 0 | 22.1 |
| [flowD](flowD.md) | PASS | 5 | 0 | 0 | 14.7 |
| [gates](gates.md) | PASS | 29 | 0 | 0 | 7.4 |
| [a11y](a11y.md) | PASS | 262 | 0 | 0 | 278.4 |
| [lauris](lauris.md) | PASS | 9 | 0 | 0 | 0.9 |
| [fmt](fmt.md) | PASS | 9 | 0 | 0 | 33.7 |
| [mywork](mywork.md) | PASS | 15 | 0 | 0 | 35.2 |
| [mobile](mobile.md) | PASS | 8 | 0 | 0 | 71.2 |
| [panels](panels.md) | PASS | 17 | 0 | 0 | 35.2 |
| [patient](patient.md) | PASS | 8 | 0 | 0 | 14.7 |
| [presenter](presenter.md) | PASS | 28 | 0 | 0 | 117.6 |
| [parity](parity.md) | PASS | 4 | 0 | 0 | 147.7 |
| [roles](roles.md) | PASS | 25 | 0 | 0 | 12.0 |
| [referrals](referrals.md) | PASS | 8 | 0 | 0 | 25.6 |
| [rules](rules.md) | PASS | 8 | 0 | 0 | 1.1 |
| [s1](s1.md) | PASS | 37 | 0 | 0 | 43.7 |
| [hosted](hosted.md) | PASS | 0 | 0 | 0 | 304.6 |
| [routes](routes.md) | PASS | 64 | 0 | 0 | 136.4 |
| [s3](s3.md) | PASS | 36 | 0 | 0 | 89.9 |
| [s4](s4.md) | PASS | 32 | 0 | 0 | 46.7 |
| [s2](s2.md) | PASS | 34 | 0 | 0 | 129.9 |
| [s5](s5.md) | PASS | 47 | 0 | 0 | 82.9 |
| [s6](s6.md) | PASS | 35 | 0 | 0 | 51.8 |
| [school](school.md) | PASS | 11 | 0 | 0 | 19.6 |
| [scribe](scribe.md) | PASS | 12 | 0 | 0 | 21.5 |
| [safety](safety.md) | PASS | 48 | 0 | 1 | 88.7 |
| [smoke](smoke.md) | PASS | 108 | 0 | 0 | 58.9 |
| [settings](settings.md) | PASS | 18 | 0 | 0 | 73.7 |
| [voice](voice.md) | PASS | 10 | 0 | 0 | 16.1 |
| [workflows-actions](workflows-actions.md) | PASS | 17 | 0 | 0 | 16.6 |
| [ui-kit](ui-kit.md) | PASS | 38 | 0 | 0 | 86.8 |
| [workflows-engine](workflows-engine.md) | PASS | 33 | 0 | 0 | 1.1 |
| [workflows-ui](workflows-ui.md) | PASS | 22 | 0 | 0 | 76.3 |
| [visual](visual.md) | PASS | 254 | 0 | 0 | 264.8 |
| [audit](audit.md) | PASS | 152 | 0 | 0 | 4375.9 |

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

