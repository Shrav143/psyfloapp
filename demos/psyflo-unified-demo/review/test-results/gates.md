# gates · PASS

Run 2026-11-12T20-05-25Z · 7351 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | WPS-01 a Lauris record with an unknown Harvest # is never matched by initials: no draft, no note, dictation stays waiting |  |
| PASS | WPS-02 the right Harvest # with the wrong initials on the page is a hard stop (audited), nothing applied |  |
| PASS | WPS-03 no default person: an unknown or missing Lauris user, Harvest # or session records nothing |  |
| PASS | WPS-04 a forged event (no such session, or another user) is not believed |  |
| PASS | WPS-05 a dictation for a student off the caseload is refused |  |
| PASS | WPS-08 a portal confirmation needs its request, and an issued reference |  |
| PASS | MCS-01 Process Form (observed) lands in Pending clinical approval; nothing can be signed or sent from a client call |  |
| PASS | MCS-02 a second Process Form for the same request is an anomaly, not a second processed state |  |
| PASS | MCS-03 a direct-support user cannot sign in Lauris, and a forged signed event is not believed |  |
| PASS | MCS-07 signed in Lauris BEFORE the internal approval: held, not marked signed, Send blocked |  |
| PASS | MCS-08 approval: only a designated approver; the signer on the signed PDF and the events is the one read from Lauris |  |
| PASS | SIGNED is final: a second signature event or a reject after signing is refused (Lauris and Psyflo) |  |
| PASS | MCS-09 send: a person with send.packet presses it; the actor is the session, never args.by; the event is simulated, not "Sfax" |  |
| PASS | PS-2 the portal confirmation attaches only to its request and an issued reference |  |
| PASS | PDU-01 the decision clock is "Day N" with the configured window and a source; the date comes from the rules table |  |
| PASS | GT-6 a re-send is a distinct action with a reason; it never resets the first send date |  |
| PASS | SVR-01 fax: Send by a person -> simulated Sfax; events carry sim:true and the person, never an actor called "Sfax" |  |
| PASS | PS-1 an overdue notice or a guardian signature is not a send: "sent" is recorded only when the Send stub ran |  |
| PASS | EFN-01..03 Lauris: a processed session cannot be written, processed again, or opened for editing |  |
| PASS | EFN-04 Psyflo: a repeated processed event for a session changes nothing; the note stays unchanged |  |
| PASS | IIU-09 units must follow the recorded direct time: a note with 3 units on 100 minutes is flagged for review |  |
| PASS | EFN-05 consent: a second signature is kept as a new version, the first record and file stay |  |
| PASS | EFN-06/07 a sent reply is write-once; patch actions and record rewrites are refused |  |
| PASS | payer decisions need a document reference and are write-once (a correction needs a reason and appends) |  |
| PASS | IIU-03/04/05/06 invalid units, dates and results are refused |  |
| PASS | URA note review: not your own note; a decision is write-once; only the assigned reviewer or a supervisor |  |
| PASS | presenter actions are refused without presenter mode; the demo reply is recorded as simulated with a demo reference |  |
| PASS | DSL-04 the internal quarterly is staff only: absent from every other projection |  |
| PASS | RE-4 guardian appeal: signing is not sending; a person presses Send and the stub returns the reference |  |
