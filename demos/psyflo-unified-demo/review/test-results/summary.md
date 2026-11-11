# Test results · 2026-11-11T18-34-44Z

2 suites pass · 2 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 129 pass, 5 fail, 1 skip · 143 s

Commit 7d81f4f · node v22.22.0 · demo time 15:30 · workers 3 · base port 4990

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [roles](roles.md) | PASS | 24 | 0 | 0 | 10.9 |
| [safety](safety.md) | PASS | 49 | 0 | 1 | 86.7 |
| [ui-kit](ui-kit.md) | FAIL | 31 | 2 | 0 | 101.9 |
| [presenter](presenter.md) | FAIL | 25 | 3 | 0 | 142.5 |

## Failures

- **ui-kit** · maturity chips: Working is hidden until the presenter overlay is on; Simulated, Pilot and Future always show — page.evaluate: TypeError: Cannot read properties of null (reading 'querySelectorAll')
- **ui-kit** · modal: role=dialog, aria-labelledby, focus trap both ways, Escape, scrim click, focus return — page.focus: Timeout 30000ms exceeded.
- **presenter** · PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician) — page.click: Timeout 30000ms exceeded.
- **presenter** · PRES-07 "Demo data · nothing is real" is on every app screen (rail foot) and on the phone and portal screens — screens without the "Demo data · nothing is real" line expected [] but got ["MobileApp (phone)","MobileDictate (phone)","MobileAssess (phone)"]
- **presenter** · EXP-02 supervisor: "All screens" lists every route this role may open and each opens in two clicks — Eligibility opened as supervisor

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

