# analytics · PASS

Run 2026-11-11T16-10-48Z · 20655 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | every selector result and panel carries one provenance tag, and the baseline is labelled "Sample data, illustrative" |  |
| PASS | a group of fewer than 5 is never shown, in any role, dataset, section, period or site |  |
| PASS | the group-size rule can be raised in Settings but never lowered below 5 |  |
| PASS | one dataset per view: a cohort view holds no case-backed figure, a case view holds no cohort figure, exports never mix |  |
| PASS | administrator and supervisor get aggregates only: no clinical text in their state, no drill-down, no patient initials in the digest |  |
| PASS | direct support gets no analytics; a supervisor counts only their own sites |  |
| PASS | the clinician digest equals what the clinician would compute from their own state |  |
| PASS | a payer decision moves the unresolved count, the awarded units and the offers waiting (S5 → S6) |  |
| PASS | a request that is sent moves "sends with receipts" (S3 → S6) |  |
| PASS | a processed note moves notes on time, and a draft with a failed check moves items caught early (S1 → S6) |  |
| PASS | the CSV prints exactly what the panels print, with period, filters, dataset and definitions |  |
| PASS | the PDF is a valid multi-page document carrying the same cells, the dataset, the period and the definitions |  |
| PASS | the question box answers from the data on screen, says so when it cannot, and labels itself Simulated |  |
| PASS | no story date is written into the analytics code (the demo clock is the only source) |  |
| PASS | admin: three sections render, aggregates only, no drill-down, no console errors, within the density target |  |
| PASS | clinician: drill-down opens the patients behind a group; the cohort offers none |  |
| PASS | supervisor: own sites only, scorecard and sections render |  |
| PASS | a filter changes the figures and the URL; a tab is a real link; reload keeps the view |  |
| PASS | the CSV file the Export button writes matches the panels on screen, cell for cell |  |
| PASS | the PDF export downloads and the question box answers on screen |  |
| PASS | the old payer playbook link (?panel=guidance) opens the payer guidance drawer from Payer Performance |  |
| PASS | earlier views stay reachable and the scorecard opens its detail |  |
