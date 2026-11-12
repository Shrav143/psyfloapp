# voice · PASS

Run 2026-11-12T20-05-25Z · 16073 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | payer hours are demo data with a source label, for every payer, and role-projected |  |
| PASS | the line status: Anthem is open at the story time (Thu 3:30 pm), Sentara closed at 3 pm; the weekend and the next opening are worked out |  |
| PASS | the script is built from stored case facts only, and the payer side is a labelled placeholder (nothing is made up for the payer) |  |
| PASS | a closed line cannot be called: the server refuses (nothing recorded, no change); an open line records the call with who, when and a note typed by the person |  |
| PASS | the call is a clinician's: supervisor, administrator and direct support are all refused; the administrator sees only the number of calls |  |
| PASS | closed on a weekend: Anthem refuses on Saturday too (calendar advance), and the refusal names Monday |  |
| PASS | analysis, missing-evidence check, clinical review and the documentation request: person-initiated, audited, role-limited, nothing is sent |  |
| PASS | screen: a closed line shows Closed now and blocks the call; Cancel saves nothing |  |
| PASS | screen: an open line runs the scripted call, shows its transcript, saves only when the person records it (with their own note), and History shows it |  |
| PASS | screen: running the call and then closing it saves nothing; the administrator has the button disabled with the reason |  |
