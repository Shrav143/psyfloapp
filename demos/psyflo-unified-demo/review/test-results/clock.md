# clock · FAIL

Run 2026-11-11T16-10-48Z · 851 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | both presets start on Oct 29; Psyflo and the mock Lauris print the same date |  |
| PASS | advancing the day moves Psyflo AND Lauris together; the default skips the weekend |  |
| PASS | a Lauris stamp uses the same clock (a form processed after the advance is dated that day) |  |
| PASS | the time of day is not the machine clock and is never silently pinned (fixed only through DEMO_TIME) |  |
| PASS | PDU-02 an information request that is not answered becomes "missed" (no 08:40 fudge); the reply-due time is shown |  |
| FAIL | PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number has a source | M.doNext is not a function |
| PASS | the seeded overdue request (R-0399) is overdue by the rule, not by a constant |  |
| PASS | EXA-04 appeal window: computed from the notice date (60 days, unverified, confirm on the letter); closed after it, never negative |  |
| PASS | deadlines return the date, the source and the verification label from the rules table |  |
| PASS | no hard-coded story date in the foundation code (the Oct 29 literal, "Oct 29", 10/29, the 08:40 fudge) |  |

## Output (tail)

```
PASS both presets start on Oct 29; Psyflo and the mock Lauris print the same date
PASS advancing the day moves Psyflo AND Lauris together; the default skips the weekend
PASS a Lauris stamp uses the same clock (a form processed after the advance is dated that day)
PASS the time of day is not the machine clock and is never silently pinned (fixed only through DEMO_TIME)
PASS PDU-02 an information request that is not answered becomes "missed" (no 08:40 fudge); the reply-due time is shown
FAIL PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number has a source — M.doNext is not a function
PASS the seeded overdue request (R-0399) is overdue by the rule, not by a constant
PASS EXA-04 appeal window: computed from the notice date (60 days, unverified, confirm on the letter); closed after it, never negative
PASS deadlines return the date, the source and the verification label from the rules table
PASS no hard-coded story date in the foundation code (the Oct 29 literal, "Oct 29", 10/29, the 08:40 fudge)
RESULT clock pass=9 fail=1 skip=0
```
