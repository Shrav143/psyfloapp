# denials · PASS

Run 2026-11-12T20-05-25Z · 3880 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | four seeded cases match their requests (D.W. R-0402, K.T. R-0408, T.N. R-0388, E.C. R-0384) |  |
| PASS | the queue selector: columns, filters, deadline with its source, sorted by deadline |  |
| PASS | a request that enters a decision stage opens a case by itself, once (the receive-reply simulation) |  |
| PASS | S5: D.W. partial -> peer-to-peer -> outcome 130 -> Active, 130 units to the tracker, a task for Lauris, case closed |  |
| PASS | closed cases and recorded decisions are write-once |  |
| PASS | D.W. decision document: a phone offer has none until a person records it; stored once |  |
| PASS | accept as offered / stretch / use them up reconcile through the request actions |  |
| PASS | K.T. information request: grounded draft, placeholders block review, the portal send waits for the page, then the case closes |  |
| PASS | a fax payer: the reference comes only from the send stub (simulated Sfax), never from the caller |  |
| PASS | E.C. appeal (Availity): seeded sample cannot be reviewed; the guardian signs; Mark ready for upload is not a send; the send is recorded only when the portal page confirms; the answer is recorded with its document |  |
| PASS | appeal on a FAX payer: Send records the stub reference at once (simulated Sfax); a caller-supplied reference is ignored |  |
| PASS | E.C. appeal upheld closes the request; reconsideration upheld returns to the decision with the path marked tried |  |
| PASS | T.N. peer-to-peer: held awaiting, then denied -> the case becomes a denial with the p2p path tried; then approved 150 elsewhere is overturned |  |
| PASS | T.N. p2p approved at 150 -> overturned (the 65 of 65 authorization is kept as history) |  |
| PASS | evidence is dated, sourced and gated; missing items print "Evidence missing | verify …"; sensitive records stay out of drafts unless included |
| PASS | roles: admin sees status and deadlines but no clinical text; only a clinician works the case; DS and supervisor see nothing |  |
| PASS | guardian: only the reviewed appeal letter of their own child; no dispute, evidence or other child |  |
| PASS | reconcile is idempotent and survives a day advance; no second case opens; presets both seed four cases |  |
| PASS | the status is derived from the request, never stored out of step (selector agrees with the stored status for every case) |  |
