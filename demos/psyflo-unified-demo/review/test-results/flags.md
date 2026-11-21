# flags · PASS

Run 2026-11-12T20-05-25Z · 28675 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | seed: two open flags and one cleared one, each with its audit event; the author sees the note, the administrator does not |  |
| PASS | direct support has no flags in the projection and cannot flag, clear or add history (403); a missing request is a 404 |  |
| PASS | flag: a reason from the list is required ("other" needs a note); one open flag per request; clear needs a flag; every step is audited with who and when |  |
| PASS | the queue knows the flag: a Flagged status, the flag on the row, and nothing for a role that cannot open the queue |  |
| PASS | notifications: a flag raised by somebody else, payer items, deadlines and units; never your own flag; ids are stable |  |
| PASS | roles: direct support gets units and notes only (own patients), no payer or flag items; a role gets no item about a record it cannot open |  |
| PASS | notify.read: per person, only ids the person has, "all" reads everything; a new situation is unread again; nobody else's list is visible; it is not an audit event |  |
| PASS | a state change on the same record is a new notification: the payer reply moves R-0402 from "offered" to something else |  |
| PASS | history: every step has an actor kind from the artifact's six; Sfax is the Psyflo agent (simulated), a payer call recorded by staff is Payer, Lauris reads are From Lauris; no upcoming or clock rows |  |
| PASS | history: a voice-agent event (Denial Intelligence logs these) is tagged Voice agent and Simulated, in any role's History |  |
| PASS | history.add: a person's own entry (call, note, document, payer contact) is an audit event with who and when and sends nothing; short text and unknown kinds are refused |  |
| PASS | list: a flag button on every row, the flag dialog needs a reason, the row shows the flag and its reason, the other person sees it in the bell; the Flagged status filters |  |
| PASS | bell: unread number on the top bar, a drawer grouped by Flags / Payer / Deadlines / Units, Mark read and Mark all read are per person, an item opens its record and reads it; keyboard: Escape closes and focus returns |  |
| PASS | bell for direct support: only their own patients (units, notes sent back), no payer or flag items, and no route to Authorizations |  |
| PASS | case page: the flag banner and the flag button open the same dialog; clearing is one click and lands in History; a supervisor may clear a clinician's flag |  |
| PASS | case page History: actor tags, a filter by who with counts, a pop-up per row, Add to history; the Simulated chip on stub steps |  |
| PASS | phone width 390: the list, the case page and the bell have no horizontal page scroll; flag and history targets are at least 24 px |  |
