# lauris · PASS

Run 2026-11-12T20-05-25Z · 906 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | Authorizations page: a table of every active consumer with payer, dates, units and status; filters; links to the consumer's authorization tab |  |
| PASS | the consumer's Authorization Information tab: the header says "N units available", the entry form posts to the existing endpoint |  |
| PASS | T.W.: truthfully "No authorizations available" until a person enters units; the task closes only when the bridge sees units at or above the award |  |
| PASS | a script that omits the payer or the end date is not refused (the form requires them); bad numbers and dates are, with a message and no change |  |
| PASS | units gate: a daily note that enters units is refused (and kept as Saved Session) when none are authorized, none are left, or the authorization ended; a note with no units is not |  |
| PASS | the Lauris pages print the demo clock; a day advance moves Lauris with Psyflo (new pages too) |  |
| PASS | Time Tracker: a page where a person types the time of a service; the page reports it as a saved entry, never as units |  |
| PASS | M.R. #3310 corpus: E5's sessions are in the Active File, newest first; new work gets a higher session number and sorts above the history |  |
| PASS | the test snapshot route exists only with DEMO_TEST=1 (guard in the source; the suite itself runs with it on) |  |
