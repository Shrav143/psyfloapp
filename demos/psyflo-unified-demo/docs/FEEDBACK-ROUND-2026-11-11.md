# Feedback round, Nov 11: direct support and site supervisor

Source: the product owner's walkthrough notes on the direct support and site supervisor logins (voice notes, summarised here without names). This file records what was asked, what the demo now does, and what is still a judgment call. Synthetic data only.

## What was asked

| # | Ask | Role | What the demo does now |
|---|---|---|---|
| 1 | Remove time tracking; it is not necessary. Remove the time-tracking parts from the browser extension. | Direct support | The Track Time tool, the timer and the time-entry flow are gone from the Lauris panel, the MV3 extension, the phone app and the platform. Units used and left still come from Lauris. |
| 2 | Keep the Scribe and Scan & Enhance (for the licensed staff). | Direct support | Both stay as they were, with the same role gating. See "Open questions" on who may use Scan & Enhance. |
| 3 | The work dashboard is confusing ("Behind", "Next", "To fix", goals). Show the patient roster the person is responsible for; outstanding items under each patient, like a table; alerts such as behind on notes; filters; no paragraphs, only key data points. For all users, not only direct support. | All | **Dashboard** replaces My Work: one table of patients, outstanding items under each patient, alert icons, filters. Clicking a patient opens the patient chart. |
| 4 | Authorization dashboard: simpler, a table with filters like the reference screenshot. | Site supervisor | **Authorizations** is one filtered table with every filter on the page (payer, request type, assigned clinician, location, school, stage, units remaining, next step due, authorization period). |
| 5 | Unit tracking: a bar, "110 left of 150"; a yellow warning near 75% used; simpler. | Site supervisor | One bar of what is left, "110 left of 150". Yellow with a warning icon from 75% used (rules table, `units.warn_used_pct`), red at 0 left. Used in Dashboard, Authorizations and the patient chart. |
| 6 | Deadlines simpler: the date and a yellow warning icon. | Site supervisor | The deadline cell is a date. A yellow icon means due soon, a red one overdue. The reason and its source (officially verified, payer-specific, Harvest-reported, unverified demo assumption) are in the tooltip, not in visible text. |
| 7 | The supervisor's real job is documentation: daily and initial notes, intake forms, CNAs, squared up with the EHR, checking that staff submit on time, enhancing and approving notes. That holds with or without a prior authorization. The authorization is another part of the patient record. | Site supervisor | **Documentation** is its own tab (notes, intake forms, CNAs, treatment plans, quarterly reports) with filters, an on-time figure and the review drawer. The **patient chart** holds Documentation first and the Authorization as one section. A patient with no authorization is a normal chart. |

## The structure decision (the question the owner asked)

Authorizations are not the SRA, and the SRA is not the immediate problem; the patient record is. The rail is now patient-first:

- **Dashboard**: the roster. Every role starts here; the scope differs (direct support: own caseload; supervisor: the staff and sites they manage; clinician and administrator: the clinic).
- **Documentation**: notes and forms across patients. Supervisor, clinician, administrator (status only, never note text). Direct support does their own documentation from the Dashboard and the Lauris panel.
- **Authorizations**: the payer queue, unchanged in purpose, simpler to read.
- **Denial Intelligence** and **Analytics**: unchanged.
- **Patient chart** (reached from the roster): Documentation, then Authorization as a section. Authorization is not required for a chart to exist.

The old My Work sections land on the new screens (`?legacy=1` still opens the old screen): todo and day go to Dashboard, review and team to Documentation, referrals to Referrals.

## Open questions (also in the decision register)

- **UD-036 Who may use Scan & Enhance.** The notes say "include the Scribe and note Scan & Enhance for licensing". Read here as: keep both, for licensed staff. Scribe: direct support (own caseload) and clinicians. Scan & Enhance: clinicians; a supervisor only when an administrator designates them; direct support not. If the intent was that direct support staff also get Scan & Enhance, that is a one-row change in the permission matrix.
- **UD-037 The intake / CNA / treatment plan / quarterly tracker.** Notes come from what the extension reports at Process Form. The other forms have no Harvest export, so their status and due dates are labelled illustrative until the intake tracker reads Lauris.
- **UD-038 The 75% warning.** A display threshold chosen from the feedback, not a payer rule. Editable in Settings, rules table, `units.warn_used_pct`.
- **UD-039 Supervisor scope on the Dashboard.** The staff they manage plus unassigned patients at their sites. Authorizations stays organisation-wide for supervisors, as before.
