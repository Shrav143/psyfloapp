# Test results · 2026-11-11T16-10-48Z

29 suites pass · 3 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 534 pass, 3 fail, 0 skip · 265 s

Commit 4c81d25 · node v22.22.0 · demo time 15:30 · workers 3 · base port 4890

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [unit](unit.md) | PASS | 9 | 0 | 0 | 0.4 |
| [bridge-contract](bridge-contract.md) | PASS | 7 | 0 | 0 | 0.4 |
| [clock](clock.md) | FAIL | 9 | 1 | 0 | 0.9 |
| [decisions](decisions.md) | PASS | 8 | 0 | 0 | 3.6 |
| [analytics](analytics.md) | PASS | 22 | 0 | 0 | 20.7 |
| [denials](denials.md) | PASS | 18 | 0 | 0 | 1.9 |
| [denials-ui](denials-ui.md) | PASS | 7 | 0 | 0 | 27.0 |
| [enhance](enhance.md) | PASS | 14 | 0 | 0 | 14.1 |
| [fixtures](fixtures.md) | PASS | 7 | 0 | 0 | 5.1 |
| [authorizations](authorizations.md) | PASS | 20 | 0 | 0 | 43.5 |
| [flowB](flowB.md) | PASS | 4 | 0 | 0 | 5.1 |
| [flowA](flowA.md) | PASS | 7 | 0 | 0 | 25.3 |
| [flowC](flowC.md) | PASS | 6 | 0 | 0 | 20.7 |
| [gates](gates.md) | PASS | 29 | 0 | 0 | 5.7 |
| [family](family.md) | PASS | 35 | 0 | 0 | 42.8 |
| [lauris](lauris.md) | PASS | 8 | 0 | 0 | 0.5 |
| [flowD](flowD.md) | PASS | 5 | 0 | 0 | 13.4 |
| [mywork](mywork.md) | PASS | 15 | 0 | 0 | 25.9 |
| [panels](panels.md) | PASS | 16 | 0 | 0 | 32.2 |
| [roles](roles.md) | PASS | 20 | 0 | 0 | 1.5 |
| [referrals](referrals.md) | FAIL | 7 | 1 | 0 | 21.5 |
| [rules](rules.md) | PASS | 8 | 0 | 0 | 0.8 |
| [s1](s1.md) | PASS | 3 | 0 | 0 | 10.4 |
| [school](school.md) | PASS | 11 | 0 | 0 | 18.0 |
| [mobile](mobile.md) | PASS | 11 | 0 | 0 | 79.7 |
| [scribe](scribe.md) | PASS | 10 | 0 | 0 | 13.5 |
| [routes](routes.md) | PASS | 56 | 0 | 0 | 97.6 |
| [smoke](smoke.md) | PASS | 85 | 0 | 0 | 46.4 |
| [time](time.md) | PASS | 20 | 0 | 0 | 1.1 |
| [settings](settings.md) | PASS | 17 | 0 | 0 | 67.7 |
| [time-panel](time-panel.md) | FAIL | 7 | 1 | 0 | 30.7 |
| [ui-kit](ui-kit.md) | PASS | 33 | 0 | 0 | 50.6 |

## Failures

- **clock** · PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number has a source — M.doNext is not a function
- **referrals** · inactive: Hold and tell the family (stub), lift the hold; Route to the grant program — expected "inactive" but got "active"
- **time-panel** · the Lauris Time Tracker: Track Time types one entry into the open form (yellow) and a person presses Save Time Entry; the page reports a saved entry, not units — the page bridge saw a person save it

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

