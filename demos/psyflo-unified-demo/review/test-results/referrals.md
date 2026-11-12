# referrals · PASS

Run 2026-11-12T02-13-46Z · 25175 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | eligibility states follow the records: waiting for the link -> details received (check required) -> recorded -> follow-up scheduled |  |
| PASS | who may run the check: a clinician, or a supervisor designated for it; an undesignated admin or direct support may not |  |
| PASS | before the link is submitted the check is refused (never from the school form alone) |  |
| PASS | consent and the 30-day clock come from the rules table: not started before intake; send-by from the configured start event; a rule change moves it |  |
| PASS | Referrals: compact queue with status chips and counts, URL state, the old ?f= link, search, sort, real links; roles |  |
| PASS | S2 REF-118: Send the family link (Simulated SMS) -> guardian submits -> five-state eligibility panel -> record with a dated proof -> book the screening call |  |
| PASS | inactive: Hold and tell the family (stub), lift the hold; Route to the grant program |  |
| PASS | the criteria panel keeps its logic: two of three shown, missing items printed as "Evidence missing | verify …" |
