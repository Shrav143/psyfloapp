## 1 · How it fits (`WhereThingsLive.dc.html`)

HOW TO READ THE DEMO · How it fits

The rule on this screen is the one the demo follows: a Lauris form is filled by the panel beside it (screening, intake, plan, notes, both SRAs) and a person presses Process Form, Get Signature and Send; everything that is not a Lauris form lives in the Psyflo app (Worklist, Authorizations, Documentation, Analytics, with Users & roles and Payer rules under the avatar menu); guardians and schools use their own pages. The role table is the same one Users & roles shows, read from the screen register. Reached from the presenter menu (How it fits) and the avatar menu (Help).

## 27 · Chart review · Documentation (`ReviewQueue.dc.html`)

HOW THE DATA GETS IN · Chart review

Captured: the reviewer's decision on each note: Approve, Return with note, That didn't happen. The reviewer's note is typed here and saved with the decision.

Flows: only staff on 100% review have their notes held here. When they press Process Form in Lauris the panel reports the note and Psyflo marks it pending until a supervisor approves or returns it. Staff on Sampled go through at Process Form. The drawer shows what the staffer wrote next to what Psyflo added (added words shaded) and the documentation checks. A decision is saved on the note and in the audit trail; nothing is written to Lauris, and notes already saved in Lauris are never edited. A returned note goes back to the staffer to fix in Lauris.

Populates: Note timeliness (Flags, Review); the note's audit trail.

Seeded: the pending notes are sample records for R. Owens and S. Lane. Supervisors see the staff routed to them; clinicians and admin see everyone. The All sites dropdown filters by the staffer's site.

## 28 · Note timeliness · Documentation (`StaffDashboard.dc.html`)

HOW THE DATA GETS IN · Note timeliness

Captured: nothing typed. Backlog and Timely % are counted from the notes the panel reports at Process Form: a daily note is due within 24 hours of the session (end time from the Psyflo timer, else 3:30 pm dismissal), the weekly guardian call by the end of the week, the monthly collateral by month end. Processing a note in Lauris moves the count the same minute.

Flows: Review (100% review or Sampled) is the staff record's review_mode. A supervisor, clinician or admin changes it by choosing the chip in the Review column (logged in the audit trail). Each flag is one line and opens the record it is about: the form in Lauris, the treatment plan, the incident, or Chart review. Direct support see only their own row, marked Mine; a supervisor sees the staff at their sites; clinician and admin see everyone.

Seeded: a staffer with no notes in Psyflo yet shows the sample export rate with a Sample data tag. Flags such as "Goal 3 untouched" and "not in Lauris since Oct 21" are sample text; "waiting for C. Diaz" and "Same words in N notes" are counted from the notes.

Populates: Analytics (Backlog and this week's Timely point); the supervision conversation.

## 40 · Payer rules (`PayerPlaybook.dc.html`)

HOW THE DATA GETS IN · Payer rules

Captured: what each payer tends to ask and what works, typed in by Harvest from past decisions. Reference material: no rates, counts or clocks here.

Flows: the 14 drafting rules are the checks every draft must pass before a person processes it; they are the same checks the panel shows as Pre-submission checks and Documentation checks. Opens from the avatar menu (Settings).

## 42 · Analytics (`Analytics.dc.html`)

HOW THE DATA GETS IN · Analytics

Captured: nothing typed. KPIs are Harvest's two pilot measures, Timely notes and Minutes per note, with a weekly line, plus Backlog. Outcomes follow one student over time: PHQ-A, DSM cross-cutting, daily rating, office referrals.

Flows: Backlog and this week's Timely point are counted live from the notes the panel reports (the same count as Note timeliness). The earlier weeks and Minutes per note are a seeded series (seed/extra/23-b3.json). M.R.'s measures are seeded from the quarter on the client record; once the real surveys arrive, assessments come from Lauris, ratings from daily notes and referrals from the school portal. The All sites dropdown picks Campbell County or Lynchburg City.

Seeded: both blocks carry a Sample data tag, because Harvest has not calculated these measures yet. The payer scorecard and the monthly units chart moved to the Payer scorecard on the Roadmap.

## 43 · Users & roles (`Users.dc.html`)

HOW THE DATA GETS IN · Users & roles

Captured: who works at Harvest and their role, typed in by the admin (Add user) or imported from the staff list.

Flows: the role decides which pages the app shows and which buttons the panel shows; changing a role changes that person's sidebar the next time the page paints. "What each role sees" is read from the screen register, so it always matches what opens. Review (100% review or Sampled) is set per direct-support staffer on Note timeliness. Opens from the avatar menu (Settings), admin only.

## 51 · Roadmap (`Roadmap.dc.html`)

HOW TO READ THE DEMO · Roadmap

Later phases, title only: Incident reports, Quarterly reports, Discharge summary, Payer scorecard, Parent progress, Insurance letters, Parent survey, Book a call. Every tile opens a screen that already exists and shows only for roles that can open it. Nothing here is in the main navigation; it is reached from the presenter menu. These screens are built as vision: they use sample data and are not part of the launch path (notes, screening and intake, referrals and authorizations).

## 52 · Payer scorecard · Later (`PayerScorecard.dc.html`)

HOW THE DATA GETS IN · Payer scorecard

Captured: nothing typed. Partial rate, awarded vs requested, full denials, decision days and unpaid clinical hours by payer, and units requested vs awarded by month.

Flows: when Harvest's 12-month tracker export is in, Psyflo would calculate these from decided requests; until then every figure is seeded (state.payers, analytics_baseline, payer_full_denials) and the page says Sample data. Reached from the Roadmap.
