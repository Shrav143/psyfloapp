# What the diagrams found in the demo

While mapping every click, the writers ran the built demo and compared it with the code and the PRDs. These are places where the demo does less than the screen suggests, or where two screens disagree. None of it was changed. Each module's `COVERAGE.md` has the full detail.

## Things that look like they work but do not go anywhere

- **Settings (agents):** the freedom dropdowns, switches and Pause all are local to the Settings page. Nothing elsewhere reads them. New case has its own separate pause button.
- **Payers:** rule and document edits never reach New case, the queue or the approval chance, although the page text says they will. Only Dashboard rows and the bell change.
- **EMR Connect:** the write-back switch and the saved field mappings are never read by another screen. "Pull a chart" in New case uses a fixed list of four charts and works with every system disconnected. Reconnect skips Fix and any test.
- **Case Manager:** 26 of 56 tracker rows open "Request not found", so 26 of 47 reviews have an "Open case" button that dead-ends. "Draft all due reviews" is a toast only, and no next review is created after signing.
- **Denial Intelligence:** nothing records the decision on a filed appeal, so overturned, upheld and next level are production-only steps. Accepting a denial writes History and a notification only; Case Manager and Analytics do not change.
- **Authorizations case page:** "Refine recommendations" and "Send back to Scribe" only show a toast. Clinical context never changes the draft. The dismiss reason "feeds Analytics" is not read anywhere. After sign and send the page still shows the old status and "Send to payer" stays on.
- **Analytics:** every denial row opens plain `/denials` with no payer or reason. There is no Print or PDF.

## Two screens that disagree

- A new case never counts under Dashboard "Preparing". After signing, the Case Manager ledger still says "56 active cases".
- Payers' "Drafts updated" never changes the Case Manager lists. Cardinal's change lists Summit and Beacon drafts and calls the already-sent I-2231 "not yet sent".
- P-1499 shows "Answer due in 20 h" in the tracker and "9 h" on its case page.
- "Send to payer" reaches Review and sign only for R-0988. R-1042 lands on Agents work, and other requests (even ready R-1142) open a blank draft at Referral.
- Draft-tab edits on the case page do not reach the New case summary.

## States that cannot be reached

- Eligibility: "Not covered", "Another plan pays first" and "Limit reached" are coded but unreachable. "Re-check due … done automatically" is only a label. A "Not found" result still shows the patient-pays line.
- Denial Intelligence: "Probably accept" and "No call time is left" cannot show. Call times ignore the demo clock, so past times are offered after fast-forward.
- Authorizations queue: "Nothing needs you today". Payers: the no-drafts change branch.
- New case: "Question 1 of at most 3" but only one question is ever asked. Two checks always pass, and the "Start date" row is always green. There is no agent failure state, and no "Replace" or "Mark not available" control for documents.

## Behaviour worth a second look

- Escape closes more than it should: the sign modal also closes the denial drawer and drops unsaved edits; "Save the workflow?" also closes the Payers editor and loses every edit; Manage with the Map pop-up open closes the drawer first; a Dashboard pop-up closes the drawer too. The Demo menu does not close on Escape.
- Changing the medical records after the agents ran silently restarts the run. Attaching a referral clears finished agent work silently.
- Dashboard: clicking a case ID pushes two history entries, so Back needs two presses. The toast reads "Demo: payer payer received it". "Payer received it" after "Approves" leaves the request counted in Decided today. The table has no sort control and Payers at a glance has no link to Payers. The FLO link "Open Dashboard, By payer" has no matching view.
- New case: "Accept referral and continue" is never disabled. A failed age row gets Ask although the footer ignores age. There is no "Back to the draft" button on the full referral page (the breadcrumb is the way back), and Eligibility has no way back to the referral.
- Edit payer silently logs "Reached by: Portal" for values off the list. Duplicate payer names are allowed.
- Small copy: "1 reviews" on a Case Manager day card. Ask FLO's fallback says "suggestions below" after the chips are gone.
