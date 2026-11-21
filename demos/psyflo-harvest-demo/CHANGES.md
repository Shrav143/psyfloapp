# v2 changes (Nov 11, 2026)

The Nov 8 demo rebuilt to the design prompt in `docs/DESIGN-PROMPT-v2.md` (builders' brief: `docs/V2-BUILD-BRIEF.md`). Same data, same four live flows, same rules that never bend. Synthetic data only.

## What changed

- **Less text, same features.** 47 screens measured by `test/words.mjs`: 9,188 words before, 2,697 after (71% fewer; the sidebar is excluded and drafted note text, letters, scripts and form boxes marked `data-doc` are not counted). Every screen is under its budget: Worklist 120, app screens 150, Lauris panel views 100, phone 60, guardian pages 70.
- **Four-item menu:** Worklist, Authorizations (views Prior auth & UR and Intake), Documentation (views Note timeliness and Chart review), Analytics (KPIs and Outcomes). Settings (Users & roles, Payer rules), Help and Sign out are in the avatar menu.
- **Presenter menu** (⋯, or `Shift+P`) replaces the navy demo bar: screen picker, switch user, reset, mock Lauris, "How the data gets in", How it fits, Roadmap, the example dictation and scripted call, and the admin-only demo controls. "Demo data · nothing is real" stays as one plain line.
- **RCM names from one file** (`web/js/shared/labels.js`): Worklist, Intake, Prior auth & UR, Note timeliness, Chart review, Pending clinical approval, Pending signature, Ready to submit, Pended, Partial approval, Authorized, Reauth due, Overdue, Backlog, Timely %, Pre-submission checks, Activity log, Attachments. Harvest, Lauris and DMAS names stay (SRA, Process Form, Forms to Approve, Continued stay as the form title).
- **`?` help tips** (20 words or fewer, ten in the whole product) replace explanatory paragraphs.
- **Authorizations drawer** replaces the Sent screen: activity log, attachments, and the actions for the stage (Approve, Send by fax / Open Availity, Log call, Send notice, Resend).
- **Roadmap** (presenter menu): title-only tiles for the later screens (incident reports, quarterly reports, discharge summary, payer scorecard, parent progress, insurance letters, parent survey, book a call).
- **Lauris panel:** one 400 px frame for every view (state card with one button, collapsed boxes with source chips, one checks line, sticky footer). Screening needs "Consent read" before Record. The panel drafts only into a form that is open; nothing edits notes already saved in Lauris.

## Workflow changes (design prompt section 7, constants in `seed/extra/10-v2.json`)

1. **Decision clock:** `Day N`, `Day 10 · follow-up`, `Overdue` only after day 14 (decision window and call day are settings; the 7-day public standard is a tip, not the default).
2. **Clinical approval** between Process Form and Get Signature (`needs_approval`, action `request.approve`).
3. **Units bands** from the regulation: 1 unit 2–2.99 h, 2 units 3–4.99 h, 3 units 5 h or more.
4. **Post-intake clocks** (plan 24 h as Harvest's practice, paperwork 7 days, initial request 30 days) as config.
5. **Weekly eligibility re-verification:** list, Verify with a dated screenshot, next check in seven days.
6. **Sample data** tag on every invented number; no "Harvest's export" labels on seeded figures.
7. **Referral consent:** the school form requires "Guardian agrees to the referral"; the action rejects a referral without it.

## Flows covered by tests (`node test/all-flows.mjs`, 10 of 10 pass)

A screening → B daily note → C draft, approve, sign, send → D referral consent, family link, phone → E clinical approval → F eligibility re-verification → G day-10 payer call and resend → decisions (additional info, partial approval, P2P, early discharge, appeal) → Documentation, Chart review, Analytics, Roadmap → every panel view.

## Words per screen

| # | Screen | Surface | Before | After | Budget |
|---|---|---|---|---|---|
| 1 | WhereThingsLive | canvas | 329 | 133 | 400 |
| 2 | DoNext | app | 203 | 89 | 120 |
| 3 | SchoolPortal | school | 313 | 67 | 150 |
| 4 | ReferralForm | school | 235 | 121 | 150 |
| 5 | ReferralSent | school | 62 | 38 | 150 |
| 6 | Referrals | app | 99 | 99 | 150 |
| 7 | Referral | app | 464 | 86 | 150 |
| 8 | FamilyLink | parent | 55 | 10 | 70 |
| 9 | Eligibility | app | 125 | 131 | 150 |
| 11 | ParentSign | parent | 107 | 23 | 70 |
| 12 | ParentPortal | parent | 104 | 39 | 70 |
| 13 | ExtHome | ext | 240 | 50 | 100 |
| 14 | ExtScreening | ext | 203 | 32 | 100 |
| 15 | ExtCNA | ext | 203 | 32 | 100 |
| 16 | ExtISP | ext | 203 | 32 | 100 |
| 17 | ExtSRA | ext | 203 | 32 | 100 |
| 18 | ExtSignOff | ext | 80 | 30 | 100 |
| 19 | Submission | app | 151 | 114 | 150 |
| 20 | MobileApp | phone | 103 | 57 | 60 |
| 21 | MobileDictate | phone | 21 | 17 | 60 |
| 22 | MobileAssess | phone | 81 | 34 | 60 |
| 23 | ExtDPN | ext | 122 | 48 | 100 |
| 24 | ExtWeekly | ext | 100 | 42 | 100 |
| 25 | ExtMonthly | ext | 98 | 38 | 100 |
| 26 | ExtIncident | ext | 112 | 45 | 100 |
| 27 | ReviewQueue | app | 311 | 108 | 150 |
| 28 | StaffDashboard | app | 375 | 85 | 150 |
| 29 | Authorizations | app | 412 | 114 | 150 |
| 31 | ParentSurvey | parent | 52 | 47 | 70 |
| 32 | ExtQuarterly | ext | 227 | 80 | 100 |
| 33 | ExtCase | ext | 294 | 73 | 100 |
| 34 | InfoRequest | app | 535 | 44 | 150 |
| 35 | Partials | app | 537 | 70 | 150 |
| 36 | EarlyDischarge | app | 186 | 60 | 150 |
| 37 | ExtDischarge | ext | 111 | 46 | 100 |
| 38 | PeerBrief | app | 505 | 50 | 150 |
| 39 | AppealLetter | parent | 112 | 29 | 70 |
| 40 | PayerPlaybook | app | 413 | 120 | 150 |
| 42 | Analytics | app | 268 | 53 | 150 |
| 43 | Users | app | 210 | 116 | 150 |
| 46 | ParentEnroll | parent | 144 | 56 | 70 |
| 47 | ParentProgress | parent | 73 | 19 | 70 |
| 48 | ParentQuarterly | parent | 203 | 57 | 70 |
| 49 | ParentLetters | parent | 151 | 18 | 70 |
| 50 | ParentSchedule | parent | 53 | 13 | 70 |
| 51 | Roadmap | app | new | 29 | 150 |
| 52 | PayerScorecard | app | new | 84 | 150 |
| | **Total (45 existing screens)** | | **9188** | **2697** | |

Roadmap and Payer scorecard are new screens.

## Judgment calls and differences from the prompt

- **Early discharge dates** are computed from the data: for D.W., units run out Dec 18, discharge Dec 18, new request earliest Dec 21 (the later of acceptance + 30 days and the first school day after discharge). The prompt's example said Jan 17 (discharge + 30). One line in `unitPlan` (`web/js/screens/Partials.js`) changes it if Harvest says 30 days runs from discharge.
- **Label changes from the research pass:** "Note timeliness" (not "Compliance", which Harvest uses for state filings), "Pending clinical approval", "Overdue". The request type stays "Reauth" in lists; the DMAS form keeps "Continued stay".
- **"Assigned to me"** has no clinician-assignment data, so it filters to items that need a person at Harvest.
- The presenter button is bottom-left on Lauris screens (bottom-right covered the panel's sticky footer).
- The panel's header chip reads "Pending approval" (to keep the student's initials visible); its status line reads "pending clinical approval".
- Intake rows open the Referral page; there is no Referral drawer from Intake.
- Partial approval uses `request.partialChoice` (accept and stretch, accept and use up, request P2P); the older `partialDecide` had no stretch door.
- Family link has ten one-question screens (language is a question even though EN/ES is at the top; switching the question off in Settings gives nine).
- Documentation's Review chip opens a dialog (`staff.reviewMode`). Analytics' site filter is All sites, Campbell County, Lynchburg City.
- The phone's presenter command "Use the example" plays the voice-tag sentence on the Today screen, which moves the timer to another student.

## Not verified

- The Chrome side-panel build (`extension/`) was not run here; the in-page panel is the same code and is what the tests drive.
- Not confirmed with Harvest (kept in presenter notes, not in the UI): in-person signing, the 24-hour plan deadline versus 30 days, one-hour versus two-hour daily minimum, 30 versus 31 days to restart, whether a full denial can go to peer-to-peer, who may file an appeal.
- Web facts in the research pass were read from search summaries; the state agency pages were not reachable. The 7-day standard (72 hours expedited) from Jan 1 2026 and the July 2027 redesign start are supported by the sources found; the TDT unit bands, the 24-hour deadlines and any remedy for a late payer are not.
- Mock forms still stand in for the real DMAS PDFs (the Nov 7 call asked for the real forms).
