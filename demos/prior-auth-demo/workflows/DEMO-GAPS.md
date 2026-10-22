# What the diagrams found in the demo, and what was done about it

Mapping every click showed places where the demo did less than its screen suggested. Each one below was fixed in the demo and the affected diagrams were redrawn to match. The few that remain are listed at the end. Every module's `COVERAGE.md` has the detail.

## Dashboard
| Found | Now |
|---|---|
| A case ID click pushed two history entries | One entry, so Back is one press |
| Toast read "Demo: payer payer received it" | Names the payer: "Demo: Cardinal approved it" |
| "Payer received it" after "Approves" left the request in Decided today | Demo replies only move forward; a decided request says so |
| No way to sort the requests table | Case, Payer, Where it is and Clock sort, with a direction mark and keyboard support |
| Ask FLO linked to a Dashboard view that did not exist | The link first scrolled to a Payer performance section, which was removed in the later simplification. The slow-payers answer now ends with "Open Analytics, turnaround" |
| Cases being prepared in New case were not counted under Preparing | The tile and headline count them, with a line linking to Case Manager |
| Write-back box ignored the EMR Connect switch | Shown only when write-back is on; otherwise one line pointing to EMR Connect |
| Check all now ignored a paused Navigator | Disabled, with a link to Settings |

## Authorizations: queue and case page
| Found | Now |
|---|---|
| Refine recommendations was a toast | A panel with three focuses that re-orders the actions, adds one, and moves the approval chance |
| Add clinical context changed nothing | Saved, listed under "Context you added", nudges the score, and appears in the draft |
| "Feeds Analytics" on a dismissal was not true | The reason is recorded and Analytics counts it |
| After Sign and send the case page kept the old status | New status chip, a disabled "Sent to payer", and "Open on the Dashboard" |
| "Nothing needs you today" could not appear | Requests leave the queue when sent, decided or settled, so the Act now band can empty |

## New case
| Found | Now |
|---|---|
| "Accept referral and continue" was never disabled | Disabled with a reason when blocking items are missing; Mark OK, a reply or Ask the referrer lifts one |
| A failed age row offered Ask the referrer | Only Mark OK and Decline reasons |
| No way back to the case from the full referral page | "Back to the case" |
| `?referral=` had no link in the UI | "Start a case from this referral" |
| Attaching a referral silently cleared finished agent work | A confirmation first, then a toast |
| Admitted referrals showed no checklist action | "Open the case" |
| Documents had no Replace or Mark not available | Both, with a reason and Undo |
| Agents could not fail | Verify cannot reach one payer's portal on a first run: Retry, or Skip and note |
| Two checks and the Start date row always passed | Every check reads the case, the saved Payers documents and rules |
| "Question 1 of at most 3" but only one was asked | Scribe asks one or two, shown as "Question 1 of N" |
| Changing records after a run silently restarted it | A toast and a banner on Agents work |
| Agent pause did nothing | Agents honour Settings; the footer button and Settings share one state |
| "Send to payer" reached Review and sign for one request only | Any request opens at the right step of a draft built from it |
| Draft tab edits never reached the New case summary | One shared narrative, including added clinical context |
| "Pull from EMR" used a fixed list and worked with every system off | Needs a connected system, lists charts per system, leaves fields blank with a "needs a mapping" note |
| Payers edits did not reach New case | Required documents, checks and the approval chance read the saved Payers config |
| Payers added on Payers were not offered anywhere else | They join every payer picker (New case, Eligibility, the queue) |

## Eligibility & Benefits and Analytics
| Found | Now |
|---|---|
| Not covered, Another plan pays first and Limit reached could not be reached | Seeded rows plus a "Try a sample" row of chips in the Verify form |
| "Re-check due … done automatically" was only a label | Verify re-checks when the demo clock passes the time, unless paused |
| A "Not found" result still showed the patient-pays line | One row, no payment lines |
| No way back to the referral | "Back to referral" or "Back to case" |
| Analytics denial rows opened plain /denials | They open the list narrowed to that payer and reason |
| No Print on the monthly report | Print, with a "Print is off in this preview" message when hosted |
| Analytics ignored what other modules record | Appeal decisions, accepted denials and dismissal reasons feed it |

## Denial Intelligence
| Found | Now |
|---|---|
| Nothing recorded a filed appeal's decision | "Record the payer's decision": overturned, partly overturned or upheld, with the next level or accept |
| Accepting a denial changed nothing elsewhere | Writes the amount off in Analytics and adds a step-down plan in Case Manager |
| "Probably accept" and "No call time is left" could not show | D-3306 reads "Probably accept"; fast-forwarding past every slot shows the second |
| Call times ignored the demo clock | Only times after the clock are offered |

## Case Manager
| Found | Now |
|---|---|
| 26 of 56 tracker rows (and 26 reviews) opened "Request not found" | A Ledger case page for every ledger case |
| "Draft all due reviews" was a toast | Cadence drafts the reviews, unless it is paused |
| No next review after signing | The next review is booked and shown |
| Ledger count ignored cases sent from New case | They join the tracker as "New today" |
| Payers' Drafts updated did nothing here | Rows are tagged "Updated for a payer change" |
| Denial hand-offs claimed a step-down plan that did not exist | A Step-down plans card |
| P-1499 showed 20 h in the tracker and 9 h on its case page | One due time |
| "1 reviews" | Fixed |

## Payers, EMR Connect, Settings, shell
| Found | Now |
|---|---|
| Page text promised edits reached screens that never read them | They do, and the text says exactly where |
| Cardinal's change listed other payers' drafts and a sent request | Only that payer's unsent drafts, read live |
| The "no drafts" branch could not be reached | Evergreen and Harborview changes have no open drafts |
| Edit payer logged "Reached by: Portal" for off-list values; duplicate names allowed | Validated, with inline messages |
| Chart checker had no paste option | "Paste chart text" |
| Settings freedom, switches and Pause all changed nothing | One shared state read by New case, Check all now, Draft all, Verify |
| Write-back and field mappings were never read | Read by the Dashboard and New case |
| Reconnect skipped Fix and the test | Runs Fix when needed, then the same three checks as Connect |
| Ask FLO's fallback pointed to suggestions that were gone | The chips stay |
| Escape closed more than one layer, dropping unsaved edits | One layer per press everywhere, including the Demo menu |

## Still limited
- Freedom levels other than the pause: only Reader and Navigator read theirs, and only in EMR Connect (Settings says so).
- The Dashboard drawer's "Check now" and the manual re-check buttons ignore a paused agent.
- Ask FLO's conversation is not cleared by Reset demo data.
- A payer added on Payers has benchmark figures only until it has decisions of its own.
- Scheduled EMR sync and payer reject/defer are production behaviour with no screen in the demo.
