# referrals · FAIL

Run 2026-11-11T16-10-48Z · 21513 ms · instance 2 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | eligibility states follow the records: waiting for the link -> details received (check required) -> recorded -> follow-up scheduled |  |
| PASS | who may run the check: a clinician, or a supervisor designated for it; an undesignated admin or direct support may not |  |
| PASS | before the link is submitted the check is refused (never from the school form alone) |  |
| PASS | consent and the 30-day clock come from the rules table: not started before intake; send-by from the configured start event; a rule change moves it |  |
| PASS | Referrals: compact queue with status chips and counts, URL state, the old ?f= link, search, sort, real links; roles |  |
| PASS | S2 REF-118: Send the family link (Simulated SMS) -> guardian submits -> five-state eligibility panel -> record with a dated proof -> book the screening call |  |
| FAIL | inactive: Hold and tell the family (stub), lift the hold; Route to the grant program | expected "inactive" but got "active" |
| PASS | the criteria panel keeps its logic: two of three shown, missing items printed as "Evidence missing | verify …" |

## Output (tail)

```
PASS eligibility states follow the records: waiting for the link -> details received (check required) -> recorded -> follow-up scheduled
PASS who may run the check: a clinician, or a supervisor designated for it; an undesignated admin or direct support may not
PASS before the link is submitted the check is refused (never from the school form alone)
PASS consent and the 30-day clock come from the rules table: not started before intake; send-by from the configured start event; a rule change moves it
PASS Referrals: compact queue with status chips and counts, URL state, the old ?f= link, search, sort, real links; roles
PASS S2 REF-118: Send the family link (Simulated SMS) -> guardian submits -> five-state eligibility panel -> record with a dated proof -> book the screening call
FAIL inactive: Hold and tell the family (stub), lift the hold; Route to the grant program — expected "inactive" but got "active"
PASS the criteria panel keeps its logic: two of three shown, missing items printed as "Evidence missing — verify …"
RESULT referrals pass=7 fail=1 skip=0
```
