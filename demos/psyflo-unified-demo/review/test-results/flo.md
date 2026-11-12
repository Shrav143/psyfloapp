# flo · PASS

Run 2026-11-12T01-30-29Z · 29949 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | fail closed: no actor, a guardian and a school user get no answers; FLO exists for the four staff roles only |  |
| PASS | counts equal the selectors the screens use: notes behind, notes in review, units flagged, patients, per role |  |
| PASS | scope: direct support only hears about their own patients; every table row is a patient on the role's own roster |  |
| PASS | role limits: direct support has no denials and no intake forms; administrator is told note text is hidden by design |  |
| PASS | clinical text is never read or quoted: notes, diagnoses and medications are refused for every role, and no answer contains text from the clinician's full record |  |
| PASS | an unsupported question gets an honest limit and starters to try, never a guess; an empty question gets the help answer |  |
| PASS | every answer names its source, and a rule answer carries the rule's own source category |  |
| PASS | stage meanings: every stage the app has a plain meaning, and the answer is the meaning and nothing else |  |
| PASS | the Dashboard legend is read from the Dashboard's own icon map, so it cannot drift |  |
| PASS | links go only to screens the role may open |  |
| PASS | read-only: asking anything never changes the state it is given |  |
| PASS | khale: FLO opens on every platform page the role can open (2), focus lands in the input, Escape closes it, no console errors |  |
| PASS | cdiaz: FLO opens on every platform page the role can open (5), focus lands in the input, Escape closes it, no console errors |  |
| PASS | jperez: FLO opens on every platform page the role can open (7), focus lands in the input, Escape closes it, no console errors |  |
| PASS | dowens: FLO opens on every platform page the role can open (6), focus lands in the input, Escape closes it, no console errors |  |
| PASS | asking in the drawer: Enter sends, the answer has a summary, a table, links and a source line; a follow-up chip asks again; history survives closing and reopening; New chat clears |  |
| PASS | a link in an answer opens its screen and closes the drawer |  |
| PASS | read-only in the browser: asking questions (including "do this" requests) leaves /api/state exactly as it was |  |
| PASS | direct support in the browser: own caseload only, denials answered as not part of the role |  |
| PASS | administrator in the browser: units and status answered, note text refused, nothing from a note on the page |  |
| PASS | phone width (390 px): the drawer fits, the input and Send are reachable, tables scroll inside the answer, no sideways page scroll |  |
