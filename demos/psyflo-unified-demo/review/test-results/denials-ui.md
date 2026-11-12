# denials-ui · FAIL

Run 2026-11-12T00-34-45Z · 47356 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | queue (artifact layout): nine columns, four open cases sorted by deadline, a source chip on each deadline, rows link to the case, the filters of the artifact, the pager at the foot (no "N of M" at the top) |  |
| PASS | old routes keep working and hand over: Partials, InfoRequest, PeerBrief -> the case; Partials (no id) -> the queue filtered |  |
| PASS | S5 by clicking: D.W. partial -> what Sentara said, evidence, all paths -> peer-to-peer -> outcome 130 -> back to the authorization with the stage Active |  |
| PASS | K.T. information reply: Evidence-missing blocks review, an edit clears it, Send opens the mock Availity page and the case closes when the page confirms |  |
| PASS | E.C. appeal on Availity: Mark ready for upload reads "Ready to upload", never "Sent"; the send appears only after the Availity page confirms (QA2 D3) |  |
| PASS | admin: the queue and the case show status and deadlines; no clinical text reaches the page; analysis, calls and drafts are locked, marking for review is not |  |
| PASS | keyboard and dialogs: tabs and rows are reachable, the dialog traps focus, Escape closes it and focus returns |  |
| FAIL | overview (artifact layout): header card with the process line, left menu, seven steps; Analyze opens a slide-over and fills "Where the denial is weak"; the review and the documentation request are saved | "Denial Intelligence\n/\nK.T.\nK.T., 9\nInformation request\nUpdate status\nCall payer · voice agent\nOpen in Authorizations\nOpen in Lauris\n(opens Lauris in a new tab)\n" does not match /Received[\s\S]*1 of 1 received/ |
| PASS | Update status offers only the recorded steps that fit the stage (status is derived from the request, never typed); Lauris opens on the consumer |  |
| PASS | 1024 px and 390 px: no horizontal scroll on the queue or any section |  |

## Output (tail)

```
PASS queue (artifact layout): nine columns, four open cases sorted by deadline, a source chip on each deadline, rows link to the case, the filters of the artifact, the pager at the foot (no "N of M" at the top)
PASS old routes keep working and hand over: Partials, InfoRequest, PeerBrief -> the case; Partials (no id) -> the queue filtered
PASS S5 by clicking: D.W. partial -> what Sentara said, evidence, all paths -> peer-to-peer -> outcome 130 -> back to the authorization with the stage Active
PASS K.T. information reply: Evidence-missing blocks review, an edit clears it, Send opens the mock Availity page and the case closes when the page confirms
PASS E.C. appeal on Availity: Mark ready for upload reads "Ready to upload", never "Sent"; the send appears only after the Availity page confirms (QA2 D3)
PASS admin: the queue and the case show status and deadlines; no clinical text reaches the page; analysis, calls and drafts are locked, marking for review is not
PASS keyboard and dialogs: tabs and rows are reachable, the dialog traps focus, Escape closes it and focus returns
FAIL overview (artifact layout): header card with the process line, left menu, seven steps; Analyze opens a slide-over and fills "Where the denial is weak"; the review and the documentation request are saved — "Denial Intelligence\n/\nK.T.\nK.T., 9\nInformation request\nUpdate status\nCall payer · voice agent\nOpen in Authorizations\nOpen in Lauris\n(opens Lauris in a new tab)\n" does not match /Received[\s\S]*1 of 1 received/
PASS Update status offers only the recorded steps that fit the stage (status is derived from the request, never typed); Lauris opens on the consumer
PASS 1024 px and 390 px: no horizontal scroll on the queue or any section
RESULT denials-ui pass=9 fail=1 skip=0
```
