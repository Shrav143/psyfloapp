# Feedback round, Nov 12: administrator view as the master, artifact layouts, theme

Source: the product owner's dictated walkthrough on the administrator login (Nov 12), plus the Nov 8 demo (colours, font and formatting only) and the earlier individual-views artifact. Platform only; the browser extension was left alone. Synthetic data only.

## What was asked and what the demo does now

| # | Ask | What the demo does now |
|---|---|---|
| 1 | Remove the "presentation product, hosted data resets" strip | The presenter ribbon is hidden by default on every build (Ctrl+Shift+P opens it). The hosted line is gone. The rail chip "Demo data · nothing is real" stays (UD-046). |
| 2 | Remove the date and time at the top right | Gone from the Dashboard header. No page header carries a date, time or "N of M". |
| 3 | Remove "19 of 19 patients"; let the user view 10, 25, 50 or 100 at the bottom | The count is gone from every table. A footer pager shows "Showing 1–10 of 19", a "Rows per page" select (10, 25, 50, 100) and previous/next. Size and page live in the address, so a reload keeps them. Used by the Dashboard, Documentation, Patient chart, Authorizations, Denial Intelligence and Analytics tables. |
| 4 | Leave the Dashboard as it is; push back if the reading is wrong | Unchanged apart from items 1 to 3. The questions are answered below. |
| 5 | Documentation: Open chart → any note → open it in Lauris | "Open in Lauris" on every note row, in the review drawer and on the patient chart, for roles that hold the extension capability (UD-045). It opens the mock Lauris at that consumer's note. |
| 6 | Authorizations: the artifact's list and its authorization page, flags, a separate notification system, history, flags on the deadline column | The list has the artifact's ten columns, a period card and ten filters. The case page has the artifact's two-column cards and a History card with who-did-it tags and a filter. Flags: one open flag per request, a reason and an optional short note, raised and cleared as audit events, shown on the row and next to the deadline. The bell is a separate notification centre (Flags, Payer, Deadlines, Units, Notes), per role, per person. Nothing is emailed, texted or pushed (UD-043). |
| 7 | Denial Intelligence and Analytics: copy the artifact | Denial Intelligence: the artifact's queue (Decision date card and filters), case header with a process line and Update status, left menu, Overview with seven recommended steps, "What the payer said", "Where the denial is weak", slide-over panels, documentation request, History, "Call payer · voice agent" and the partial and peer-to-peer paths. Analytics: the artifact's frame (period panel, section tabs, headline cards, line and column charts, tiles, a "Table" link under each chart, Export, Earlier views, Ask FLO) for Outcomes, Payer and Population. |
| 8 | Colours, font and formatting like the Nov 8 demo | DM Sans (embedded, so the hosted file does not depend on a font service), paper `#F8F6F2`, ink `#151B24`, teal `#217A78`, a dark navy rail with a teal active item, white cards with soft borders. Tokens only; no component or feature came from that zip. |
| 9 | A chatbot on every page, an AI icon at the top | FLO, a sparkle button at the top right of every platform page. A right-side drawer, rule-based, read-only, Simulated. It answers about the records the role can already see and links to them (UD-042 on the name). |
| 10 | Carry every change from the administrator view to the other logins; keep role access | Every change is in the shared shell, kit and screens, so the site supervisor, clinician and direct support see the same look. No permission cell was widened. |

## Where the artifact and the unified demo differ (the unified demo won)

- **A person starts every key step.** The voice agent never dials; FLO only answers and links; nothing is sent, filed or called unattended.
- **No invented clinical or payer text.** The payer's side of a simulated call is a labelled placeholder. "Where the denial is weak" lists Strong, Gap, Clarify and Risk points from stored records, not likelihoods.
- **Status is derived, not typed.** "Update status" offers only the recorded steps the stage allows (UD-044).
- **The administrator sees status, not clinical text.** Weak points, evidence, flag notes and drafts are withheld from the administrator; marking a case for review is allowed.
- **Datasets stay separate** in Analytics (case-backed, Harvest export, illustrative) with the minimum group size of 5 and complementary suppression.
- **Not ported:** Analytics compare-with-previous-period and the weekly email toggle, revenue in dollars, case-backed referral sources (not stored), diagnosis drill-down, claims row CL-217, the artifact's simulated agent that signs in to Lauris, PDF and CSV from FLO.

## Your Dashboard questions

- **Patient name, then a dash under Authorization.** The dash means no authorization on file. That is a normal chart; a patient does not need one.
- **The dropdown under a patient.** It lists what is outstanding for that patient: late or due-soon notes, forms, CNAs and plan reviews. It is not a list of everything done. The Notes badge counts what needs action (behind, sent back, due soon, in review); there is no "done" count, so "three due, three coming up, three done" is not what it shows.
- **A prior authorization with a partial.** "Partial: decide" means the payer approved part of what was asked. The decision is yours: accept, add information, ask for a peer-to-peer, or plan the transition. That reading was right.
- **"October 26".** The Next date column is the earliest outstanding date for that patient. It is not always the authorization due date. A note waiting for review used the note's session date, which could be in the past; that was a bug and it is fixed (a review item has no due date).
- **The arrow.** It expands the outstanding items for that patient.
- **The "i" icon.** There is no "i" icon on the Dashboard. The Alerts column has small category icons that open the chart.
- **The calendar icon.** It marks a deadline alert (a date coming up or overdue); the date is in the Next date column.

## Open questions

- **UD-042** FLO or Flow. The Nov 12 dictation says "Flow"; the artifact and an earlier rename say FLO.
- **UD-040 / UD-041** Payer opening hours are invented demo data; the voice agent is Simulated.
- **UD-043** Flag notes are hidden from administrators and supervisors.
- **UD-045** The administrator does not get "Open in Lauris".
- **UD-046** Keep or remove the "Demo data · nothing is real" chip.
- The fragment "call pay / voice agent / opening hours / open authorizations / missing documentation" was read as Denial Intelligence and case-level content. Say if it meant something else.

## Tests

49 of 49 suites pass on the final run (1,588 tests, 1 skipped); see `docs/deliverables/07-test-results.md`. Not yet done: showing these screens to the staff who asked for them.
