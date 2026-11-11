# time · PASS

Run 2026-11-11T16-10-48Z · 1063 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | the seeded day keeps four separate figures: recorded 310, direct 220, documented none, 2 potentially billable units (official bands, with a source) |  |
| PASS | the older readers of the contact-time rows see the same blocks as the entries |  |
| PASS | an active timer is never billable: starting, running and pausing change none of the four figures |  |
| PASS | stop records a draft at once (never lost); it is not direct time until a person describes and saves it; units follow the rule, not the timer |  |
| PASS | entries that overlap count once (two entries for the same minutes never inflate the figures) |  |
| PASS | the active activity: said at Start in the person's own words (optional), changeable while timing, and the starting text of the stopped entry, which still has to be saved |  |
| PASS | wrong-student protection: a Harvest # that is not the student is refused; no caseload fallback; roles without Track Time are refused |  |
| PASS | the older contact-time rows hold only the student of the timer: another student's time never rides along |  |
| PASS | the timer reads the demo clock: a day advance leaves it running from the earlier day; its end is asked for, never guessed |  |
| PASS | manual correction keeps the earlier version: reason required, corrected_from, nothing edited in place |  |
| PASS | a saved entry is only confirmed by Save; changing its words is a correction with a reason |  |
| PASS | discard: a stopped timer is removed; a saved entry is voided with a reason and kept; the figures drop it |  |
| PASS | a person adds time they did not time: a reason is required and it is shown as added by hand; no future times |  |
| PASS | link to the daily note: linking is not documenting; a processed note lists the time and makes it final |  |
| PASS | a note whose time disagrees with the saved entries is flagged, not silently reconciled |  |
| PASS | units follow the configured rule only: change the bands (admin, with a reason) and the same minutes give other units |  |
| PASS | who sees time: a direct support worker their own entries; clinician all; supervisor and admin none (entries hold activity text) |  |
| PASS | microphone consent is a recorded answer per person per demo day; typing needs none; voice without it is refused |  |
| PASS | a dictation saved again replaces the waiting one; a processed (used) one is final |  |
| PASS | helpers: identity card, contact-time matching, minutes parsing |  |
