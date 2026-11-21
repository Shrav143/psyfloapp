# 03 · UX audit and unified interaction design (Agent C)

Nov 11, 2026 · Principal UX, healthcare software · no code edited · companion file: `03b-density-audit.md` (all counts and the counting rule).

**Tags.** [M] measured with Playwright DOM queries on the running demos · [T] traced from code or tests · [V] seen in a screenshot (`shots-uxc/<file>`, in the session scratchpad `…/scratchpad/shots-uxc/`, 123 files) · [P] the prompt · [E] `review/evidence/*.md`. Priorities: **MUST** (needed to satisfy the prompt), **SHOULD**, **COULD**.

## Headline findings

1. The master's problem is chrome, not features. Before the main task a keyboard user passes 20 tab stops (8 demo-bar controls, 12 sidebar controls) [M]. The demo bar and the sidebar are both `#151B24`, so presenter chrome and product chrome read as one object [V `m-02-DoNext.png`].
2. v3's best assets are its Authorizations and Denial patterns (queue, filter mechanism, case workspace, history, provenance chips). Its worst are Analytics density (144 controls, 2,320 words on one tab [M]) and the simulated browser frame (text scales to 0.33 at 390 px [M]).
3. Contrast: the master passes AA on every text pair on the 15 desktop and phone screens probed except one badge (3.37:1). v3 fails four label colours (2.69 to 3.44:1). Neither demo gives input borders the 3:1 that WCAG 1.4.11 asks for (1.4 to 1.6:1) [M].
4. Keyboard: all 5 v3 sidebar links are `<a>` without `href`, so they cannot be focused [M]. The master's modal never takes focus [M]. Neither demo has a skip link.
5. Presenter controls leak into the product in the master: 4 "signed in as (demo)" role toggles inside the extension home (`web/panel/panel.js:166`), 2 "Demo" buttons in the Authorizations header (`web/screens/Authorizations.dc.html:83`), and a 3-row, 132 px demo bar above every phone screen (15.6% of 844 px) [M].
6. The master's cumulative role levels (`registry.js`) let an administrator open InfoRequest and Partials with clinical narrative [M, `m-role-admin-InfoRequest.png`]. Part 16 forbids this.
7. Click counts are already low in the master (1 to 3 for most key tasks) [M]. The cost is scanning, not clicking: 14 explanatory blocks on InfoRequest, 17 on PayerPlaybook, 7 cards above the work on Staff. v3's denial decision takes 5 clicks [M].
8. Prompt and evidence disagree in six places (section l). Three need a lead decision.

---

## a. Method

Ran the master (ports 4710 to 4712, Live preset unless stated) and the v3 HTML in Chromium. Rendered 46 master screens by the role that owns them (desktop 1440×900; phone 390×844 for phone/parent), 35 panel states at 400 px (18 master in the Live and Canvas presets, 17 v3), 14 v3 platform pages, the presenter menu and Scan & Enhance. Counted DOM with one rule (stated in `03b`), probed contrast on every visible text node, tabbed through Authorizations in both demos, and click-tested seven key tasks. Not done: real MV3 side panel, a screen-reader run, v3 peer-to-peer/screening click paths, the master's ReferralSent. Fonts loaded (DM Sans in both; v3 also Newsreader).

## b. The two design systems

| | Master (Nov 8) | v3 (TDT demo) | Take for the unified system |
|---|---|---|---|
| Tokens | Navy `#151B24`, teal `#217A78`/`#15605E`, light teal `#5FC0BE`, marigold `#F0B44C`, paper `#F8F6F2` (`BRIEF.md` stack note; `web/index.html` repeats them: bar, body, `.mbtn.p`) | Warm remap of the same palette (`shell.js` REMAP): ink `#1B1B19`, bg `#FAF6F1`, rail `#F2EAE1`, line `#E5DCD0`, forest `#1D4F43` | Master brand values for identity; v3 warm neutrals and forest for the working surface |
| Type | DM Sans; 8 distinct sizes (11, 12, 13, 14, 15, 16, 26, 30) [M] | DM Sans + Newsreader headings; 12 sizes including 10.5, 11.5, 12.5, 13.5, 14.5 [M] | One family, 8-step scale, 12 px floor |
| Layout | Dark 240 px sidebar, 11 to 12 items; sticky navy demo bar; content fills the viewport | Warm 256 px rail, 5 items; top bar on every page (locality ×3, Read from Lauris, FLO, bell); fixed 1,180 px canvas scaled by transform (`shell.js:301`) | Light rail, 6 items max; no per-page top bar; real responsive layout |
| Components | Pill tabs, KPI tiles, bordered cards, chips by class, no shadow | Queue tables with sort, filter bar, stepper, rail+workspace, History accordion, evidence chips with icons, shadows only on popovers | v3 components, master density rules |
| Density | Many short pages, 3 to 17 explanatory blocks | Lists are quiet (0 paragraphs on both queues); Analytics is the densest screen in either demo | v3 queues; master's one-task pages; neither's analytics |
| Tone | Plain, first-person ("Reply drafted from the request already sent") | Formal, labelled ("Payer requirement verification needed") | Master voice; v3 provenance labels |

Decision for the lead (SHOULD): light warm rail with navy kept for tool chrome (presenter ribbon, extension header, toasts), instead of the dark rail. Rationale: separates PsyFlo from the navy Lauris shell (`#2F3A4A`, `BRIEF.md`) and from the presenter bar, and cuts 240 px of heavy contrast on every page.

## c. v3 patterns: port and leave out

**Port**

| Pattern | v3 module and behavior | Use |
|---|---|---|
| Queue table with one next-action button per row | `80-auth-list.js`, `50-denials.js`: sortable columns, N-of-M count, deep-link params | Authorizations, Denial queue (MUST) |
| Filter mechanism | `04-filterbar.js`: state per page, `fromParams` deep links, count chips replace KPI tiles (`FB.strip`) | Keep the mechanism; cut 10 dropdowns to chips plus "More filters" (MUST) |
| Case workspace | `51-denial-detail.js`: header chips, 6-step stepper with checks, left rail (Review / Respond), NEXT banner | DenialCase, Authorization case (MUST) |
| Options with deadline and verification | `86-partials.js`: option rows carry deadline, source, "Payer requirement verification needed" | Part 4.6, Part 8.2 (MUST) |
| History with actor tags and pop-up | `08-history.js`: newest first, actor chip, Simulated chip, "View" opens what/when/who/source | Timeline (MUST) |
| Provenance chips | `01-core.js:128-146` `EV.KINDS`: icon + tone + text, 14 kinds | ProvenanceBadge, EvidenceChip (MUST) |
| Dataset banner, privacy floor | `41-analytics.js` Simulated-cohort banner; `85c-cohort.js:40` `MIN_N: 5` | Part 12.6 (MUST) |
| Ask panel and export | `41f-an-ask-export.js`: suggested questions only, honest "not answered" for typed text; export modal with period and filters in the file | Part 12.4 (SHOULD) |
| Extension frame | `shell.js:339-470`: 400 px panel, context header (Lauris connected · M.R. · #4471 · document), 3 action buttons, collapsed pill with case status, focus workspace | Part 9.1 (MUST) |
| Track Time | `63-ext-time.js`: footer timer (idle, running, pause, stop), entry opens in work area, **Recorded ≠ Billable** with unit-rule source and "Configurable" chip | Part 9.4 (MUST) |
| Review card | `76-enhance.js`: Identified issue · Why it matters · Supporting evidence · Policy · Suggested improvement (editable) · Accept / Edit / Reject; "This document" summary (Addressed 4 of 8, Required 14 of 27) | Mode A review (MUST) |
| Version ladder | `05-sync.js`: Original → AI Draft → Clinician Edited → Approved → Synchronized | DraftReview header (SHOULD; "Synchronized" only from an observed Lauris event) |
| Presenter menu | `shell.css` `#presMenu`: View as, 13 numbered scenarios with role · case · surface, API log, Reset | Presentation dock (MUST) |
| Roles as feature flags | `83-settings.js` Roles tab; `shell.js` `PSY.PERMS` | Part 16 (MUST) |

**Leave out**

| Pattern | Why |
|---|---|
| Simulated browser, tab strip, 1,180 px scaled canvas | Not responsive; fights the real MV3 panel; Part 13.5 needs a true 400 px test |
| 10 dropdown filters plus date card on every list (12 inputs [M]) | Part 7.1 asks for compact status filters |
| Per-page top bar with locality ×3, bell, FLO | Repeats on every page; move locality into the filter bar |
| "Call payer · voice agent", actor tags "Psyflo agent: portal or fax submission" | Autonomous action; Part 4.2. Label Future vision, off by default |
| "Accept all suggestions" (`76-enhance.js:520`) | Bulk acceptance defeats the review gate (Part 9.3, 17) |
| "Save as addendum" and "Save & Push to Lauris" on processed notes (`76-enhance.js`, `68-dpn.js:209`) | Part 4.1: historical mode is read-only; Agent D reached the same conclusion |
| Redirects that remove Referrals (`shell.js:123`) | Part 6 forbids |
| "Recommended next steps" list of 7 shown for every case (`v-tall-di-case.png`) | Part 8.2: show only valid options |
| Provider-authored appeal draft (`v-di-appeal.png`) | Harvest says only guardians appeal [`product-direction.md` #22]; master is guardian-led |
| Analytics density: 8 KPI tiles with 2-line definitions, 35 row-level "Review documentation" buttons | Replace with strip plus row click |
| Newsreader serif headings | COULD keep for page titles only; default to DM Sans (one font, same in panel and portals) |
| Unstyled UA buttons in the Ask FLO modal (`v-ask-flo.png`) | Defect |

## d. Problems in the master

1. **Redundant navigation (MUST).** Three layers: demo bar (8 controls including a 46-screen picker with canvas numbers and prev/next arrows), sidebar (11; 12 for admin), then in-page chips and breadcrumbs. The sidebar's "four doors" (extension, mobile, parent, school) are surfaces, not tasks of the signed-in user. Tab titles show canvas numbers ("29 · Authorizations").
2. **Presenter controls inside product UI (MUST).** Finding 5, plus Login copy "Demo: pick a role card…" and the panel's "scripted call is the acceptance test in seed/scripts" (`p-screening-TW.png`).
3. **Title echo.** Submission R-0399 says "overdue" four times and A.L. three times across breadcrumb, h1 and two chips [M, `m-19-Submission.png`]. InfoRequest says K.T. six times. PeerBrief has "Change the call date" in the header and again in the Call date card [M].
4. **Copy where a state would do (SHOULD).** Referral: 10 explanatory blocks, 225 words, five criteria paragraphs each followed by a "Screening call:" instruction [V `m-07-Referral.png`]. ReviewQueue opens with a 27-word rule. Staff shows daily-note status in 5 blocks (banner, 2 tiles, Due next, goals) [M].
5. **Cards above the task.** Staff 7 and Analytics 8 [M]; EarlyDischarge puts 5 date tiles above the plan [V `m-36-EarlyDischarge.png`].
6. **Instruction posing as a button.** Authorizations' primary action is "Open a student in Lauris to draft a continued stay" (`Authorizations.dc.html:92`). InfoRequest has two header buttons, "Edit the reply" and "Review and send", that both scroll the same page [M].
7. **Inconsistent patterns.** Four header patterns (title + date chip on Do next; "AS OF" bar on Authorizations; date bar + chips on ReviewQueue; locality chip only on Referrals), and Users shows "Settings / Users and permissions" though no Settings exists in the nav [V].
8. **Role inheritance (MUST).** Finding 6.
9. **Not responsive.** Authorizations scrolls horizontally at 1024 px (1,119 px wide) and at 768/390 [M, `m-resp-1024-Authorizations.png`]. Part 19.5 names "common desktop sizes".
10. **Unvalidated claim.** MobileApp says the timer "runs with the screen locked" (`MobileApp.js:59`); Part 10 forbids promising it. No Harvest staff asked for a mobile app [E granola 3k].
11. **No maturity cue.** Nothing distinguishes working, simulated, pilot and future (Part 4.5). EarlyDischarge states "30 days after Oct 29 · DMAS rule" with no verification status (Part 4.6).

## e. Unified information architecture

**Rail (232 px, light).** My Work · Authorizations · Denial Intelligence · Analytics · divider · Referrals · Settings. Help and the user card sit at the foot. Role decides what shows:

| Role | Rail | Home |
|---|---|---|
| Direct support | My Work only (platform optional; extension and phone are the product [E G-030]) | My Work · My day |
| Supervisor | My Work, Analytics (own site) | My Work · Review |
| Clinician | My Work, Authorizations, Denial Intelligence, Analytics (caseload), Referrals | My Work · To do |
| Admin | My Work, Authorizations, Denial Intelligence, Analytics, Referrals (if granted), Settings | My Work · Operations |

The three management tabs are the only large items. My Work is the logo target, not a fourth tab. Rail count for a clinician: 6 (master: 11 + 8 bar). Referrals stays in the rail rather than a "More" menu because Scenario 2 starts there (Agent D's `NAV` config can express either; this is a config choice).

**My Work by role (MUST).** One list, role-filtered, grouped Today / This week / Waiting on others, top 3 shown with item-specific verbs ("Review draft", "Write note", "Send reply"), "Show all 7". Direct support: next overdue note, due-next list, one progress line (no tiles). Supervisor: tabs Review | Team. Clinician: urgent items first (24-hour info request, expiring units). Admin: operations only (units low, deadlines, team compliance), no clinical narrative.

**Authorizations tab (MUST).** Header: title, search, one primary action. Chips: Needs action · Draft · Awaiting signature · Submitted · Active · Renewal due · All (Part 7.1), plus "More filters". Columns: Case · Payer · Request type · Status · Units (requested → approved, bar) · Deadline (with source) · Owner · Next action. The master lacks Owner; v3 folds Deadline into the Next action cell. Counts overlap, they are filters, not buckets. Master stages map: draft_ready → Draft; awaiting_signature and signed → Awaiting signature (signed shows "ready to send"); submitted, sending, portal_open → Submitted; overdue, info_requested, partial_decide → Needs action with an "In Denial Intelligence" link; active → Active/Renewal due [T, Agent D C2].

**Denial Intelligence tab (MUST).** Queue columns exactly per Part 8.1. Case workspace sections Decision · Evidence · Options · Action · History; options limited to valid ones, each with deadline and verification chip.

**Analytics tab (MUST).** Sections Patient Outcomes | Payer Performance | Patient Population; FIT inside Outcomes as "Treatment Feedback & Engagement". One dataset per view with a banner: Case-backed or Illustrative cohort.

**Where every master screen lands.** Part 6 is the base. Disagreements in bold.

| Master screens | Lands in | Treatment | vs Part 6 |
|---|---|---|---|
| DoNext | My Work · To do | Role-specific list | Agree |
| Referrals, Referral | Referrals workspace | Queue + case shell | Agree |
| Eligibility | Referral case · Eligibility panel | Panel with "Simulated" DMAS chip | Agree |
| SchoolPortal, ReferralForm, ReferralSent | School Portal | Separate journey | Agree |
| FamilyLink, ParentSign, ParentPortal, ParentEnroll, ParentProgress, ParentQuarterly, ParentLetters, ParentSchedule, ParentSurvey | Family Portal | Checklist home, one task per screen | Agree |
| ExtHome | Extension home | 3 actions + next task | Agree |
| ExtScreening, ExtCNA, ExtDPN, ExtWeekly, ExtMonthly | Extension · Scribe | Note-type selector | Agree |
| ExtISP, ExtSRA, ExtSignOff | Extension · Prepare authorization | One path: Plan → Request → Sign-off | **Merge** Part 6's two groups (task is one) |
| ExtCase (continued stay) | Extension · Prepare authorization (continued-stay variant) | Evidence index, period, exclusions | **Disagree**: Part 6 files it under Clinical documents; it is Scenario 4's hero |
| ExtIncident | Extension · More, plus a banner on home while a clock runs | 24-hour state-portal clock | **Disagree** with burying it; clock needs to surface |
| ExtQuarterly, ExtDischarge | Extension · Clinical documents | Advanced forms | Agree |
| MobileApp, MobileDictate, MobileAssess | Mobile | Focused capture | Agree |
| ReviewQueue, StaffDashboard | My Work · Review / Team / My day | | Agree |
| Authorizations, Submission | Authorizations queue + case shell (Send is a step) | | Agree |
| InfoRequest, Partials, PeerBrief | DenialCase actions | 24-hour clock also in My Work | Agree |
| AppealLetter | DenialCase · Appeal (staff) + Family Portal (guardian) | Master has only the guardian side | Agree; staff side from v3 |
| EarlyDischarge | Authorization case · Transition, also a DenialCase option | One component | Agree |
| PayerPlaybook | Payer drawer (any case) + Analytics · Payer Performance | Drafting rules move to Settings | Agree, plus **move the "Rules Psyflo applies" table out** |
| Analytics | Analytics | 3 sections | Agree |
| Users | Settings · People and roles | Permission matrix | Agree |
| WhereThingsLive | Presenter · Architecture | | Agree |
| Login | Sign-in; Presentation mode uses the dock's role switcher | | Not in Part 6 |

**Deep links and old routes (MUST).** Add canonical routes, keep every historic id as an alias consulted in `route()` and `hrefFor()` before the registry check (Agent D E1; route names below are his). Reference counts of `<Id>.dc.html` in master code [T, grep over `web/`, `server/`]: Authorizations 26, Referrals 20, MobileApp 20, DoNext 19, StaffDashboard 18, ExtHome 17, ParentPortal 17, Analytics 16, SchoolPortal 16, Submission 14, Partials 11, PeerBrief 11, Eligibility 7, InfoRequest 6, Referral 5, EarlyDischarge 3, ReviewQueue 2, AppealLetter 2.

| Old | New |
|---|---|
| `#/DoNext` · `#/ReviewQueue` · `#/StaffDashboard` | `#/MyWork?section=todo` · `review` · `day` (supervisor: `team`) |
| `#/Authorizations?id=R-0416` | `#/Authorization?id=R-0416` |
| `#/Submission?id=R-0399` | `#/Authorization?id=R-0399&section=submission` |
| `#/EarlyDischarge?id=…` | `#/Authorization?id=…&section=transition` |
| `#/InfoRequest?id` · `#/Partials?id` · `#/PeerBrief?id` | `#/DenialCase?id&section=action&action=info` · `options` · `p2p` |
| `#/Partials` (no id) | `#/DenialIntelligence?decision=partial` |
| `#/Eligibility?id=REF-118` | `#/Referral?id=REF-118&panel=eligibility` (never a redirect that hides Referrals) |
| `#/PayerPlaybook` | `#/Analytics?section=payer&panel=guidance` |
| `#/Analytics` | `#/Analytics?section=outcomes` |
| `#/Users` | `#/Settings?tab=people` |
| `#/WhereThingsLive` | presenter drawer (`?present=architecture`) |
| v3 params `show=`, `st=`, `exp=`, `range=`, `ends=` | `status=`, `ends=` (7, 30 or 60), `payer=`, `from=` and `to=` on the queue |
| `ExtDPN.dc.html?client=MR`, `ExtSRA.dc.html?client=TW`, `ExtSignOff.dc.html?request=R-0416`, `/f/<token>`, `/parent/<token>/<Screen>` | Unchanged (CONTRACT callers) |

## f. Screen by screen: before and after

Counts from `03b` (actions = buttons/links + inputs; prose = blocks of 12+ words).

| Screen | Before | After: stays | Folds into | One primary action | Key task: before → after |
|---|---|---|---|---|---|
| My Work (Do next) | 19 actions, 9 repeated "Open in Lauris", 3 lists | Today list, urgency chips | "Waiting on others" collapsed; "This week" behind a toggle | Top item's verb | 1 → 1 |
| Referrals | 9 actions, school table under queue | Status chips, queue | School table → Analytics · Population | Open | 2 → 1 |
| Referral case | 8 actions, 10 blocks/225 words, send button at y=1,189 | Header status, referral form | Criteria panel → accordion, missing items → "3 missing" chip, Eligibility → panel | State-driven: Send family link / Book call | 2 + scroll → 2, no scroll |
| Authorizations | 32 actions, History link ×7, long CTA | Rows, 7 chips | History → row drawer; filters → More | Row's next action | 2 → 1 from My Work |
| Authorization case (Submission) | 3 actions, 4× "overdue" | Timeline, proof of sending | Stepper header, accordions Documents/Evidence/Units/Payer | Send / Overdue notice | 2 → 2 |
| Denial queue | none (v3: 33 actions, 10 filters) | v3 columns | Filters → chips + More | Open case | 1 → 1 |
| Decision workspace (Partials) | 3 doors, "logged only · not sent" | Door cards with consequences | Last-time table → accordion; insurer-reason table → Analytics | Log the choice | 3 → 3 (v3: 5) |
| Info request | 14 blocks/445 words, 2 header scrolls | Reply draft, source chips | "What Anthem asked" → collapsed quote; timeline → drawer | Send via Sfax/Availity | 3 → 2 |
| Peer-to-peer | 12 blocks/324 words | Talking points (editable), call date, outcome log | Questions table → accordion; duplicate "Change the call date" removed | Log the outcome | 2 → 2 |
| Early discharge | 5 date tiles | Plan timeline | Tiles → 3 key dates with basis chip | Set this plan | 1 → 1 |
| Analytics | 8 cards above table; v3 144 actions | 3 sections | KPI strip (≤6), filters bar, row click | Export | 2 → 3 (adds format step) |
| Review queue | 26-word rule, approval block under queue | 2-pane diff | Rule → info popover; "Who needs approval" → Team tab | Approve | 1 → 1 |
| Staff / My day | 7 cards above Due next | Due next | One "Next up" card plus one progress line | Write note | 1 → 1 |
| Users | breadcrumb mismatch | Table | → Settings · People, matrix in drawer | Add a user | 2 → 2 |
| Extension home (DS) | 4 demo role toggles, 14 actions | Student, Scribe, Track Time | Role toggles → dock; recent activity collapsed | Scribe | 2 → 1 |
| Extension home (clinician) | 37 actions, 2,083 px | Next task, Scribe, Track Time, Review | 3 referral cards + 2 school updates → one "5 to review" row | Next task | 1 → 1, ≤1,200 px |
| Scribe (DPN, weekly, monthly, screening, CNA) | 3 to 6 actions | Note-type selector, review, Fill | Source list → chips; checks → "N of N pass" | Fill | 2 → 2 |
| Prepare authorization (ISP, SRA, Case, Sign-off) | SRA 19 blocks/289 words | DraftReview, Fill, checks | Sources → chips; household disclosure toggle kept | Fill all boxes | 1 → 1 |
| Scan & Enhance (v3 only) | 78 actions, 6,550 px | Mode A review cards | One card open at a time; progress "3 of 14"; no Accept all | Approve | n/a |
| Mobile (home, dictate, assess) | 12 actions; 3-row bar | My Students, Current Activity, Say What Happened | Bar → 28 px handle; patient bar added | Say what happened | 3 → 3 |
| Family portal | bar 132 px, 0 headings, targets 16 to 27 px | Checklist home | One task per screen | Next task | 7+ steps, hidden count → 7, counted |
| School portal | 17 actions, 49-field form | Refer, track | Form in 4 sections, required first | Submit referral | 1 → 1 |

## g. Component set

| Component | Behavior | Used by | Source |
|---|---|---|---|
| **StatusChip** | Icon + text + tone (never colour alone); families: stage, clock, provenance, maturity, actor. Spec in section h | everywhere | v3 `EV.KINDS`; master `.chip` |
| **FilterBar** | Search, 7 status chips with counts, "More filters" popover, "N of M", Clear, deep-link params | Authorizations, Denial, Referrals, Analytics | v3 `04-filterbar.js`; master tabs |
| **QueueTable** | Sortable (`aria-sort`), sticky head, whole row opens, one primary per row, column collapse under 1,280 px | 4 queues | v3 `80-auth-list.js` |
| **CaseShell** | Header (student, service, payer, stage, owner) · Next step panel · accordions | Authorization, DenialCase, Referral | v3 `51`; master Referral |
| **Stepper** | Done = check, current = `aria-current="step"` | CaseShell | v3 `51` |
| **EventTimeline** | Latest first, actor and Simulated chips, row opens popover: what/when/who/document/source/next action | CaseShell, Submission | v3 `08-history.js`; master `events` |
| **EvidenceChip** | "2 · Screening call · Oct 16"; tap opens quote and "Open in Lauris"; states: sourced / **Evidence missing — verify** / excluded / sensitive | Drafts, panel, denial | master `.src`; v3 `PSY.ev.cite` |
| **DraftReview (three-way)** | Three tabs or columns: Staff input (read-only) · PsyFlo wording (editable, changed phrases marked yellow) · Source (chips). Per phrase: Accept, Reject, Edit, View source, Restore previous. Final: Approve and fill. No bulk accept; "Accept the 6 with sources" shows count and still requires final review | Scribe, Prepare authorization, Review queue | master ReviewQueue diff + v3 `76-enhance.js` cards |
| **ProvenanceBadge** | Official policy · Payer-documented · Harvest-reported · Unverified (configurable) | deadlines, rules | v3 `policy/documented/observed/unverified` |
| **MaturityBadge** | Working · Simulated · Pilot · Future vision. Simulated always visible on integrations; others show with the presenter "maturity" overlay | all | new; registry `maturity.js` (Agent D E3) |
| **PatientBar** | Initials · Lauris # · service · "Read from the open page" (extension) / "With M.R." (mobile); confirm step before saving | panel, mobile | v3 `X.ctxHtml` |
| **NextTask** | One sentence, one button | My Work, panel | master `doNext` |
| **TimeControl** | Recorded, Direct, Documented, Billable as separate figures; "Configurable" chip; manual correction | panel, mobile | v3 `63-ext-time.js` |
| **Drawer / Popover / Sheet** | Focus moves in, Esc closes, focus returns, `role="dialog"` | all | new |
| **StatStrip** | ≤6 count chips instead of tiles | Analytics, My Work | v3 `FB.strip` |
| **DatasetBanner** | Case-backed vs Illustrative cohort; never mixed | Analytics | v3 simChip |
| **PermissionNotice** | "Not available for Direct support: ask an administrator", plus the way home | all | master denied page; v3 lock chips |
| **PresenterDock** | Section k | shell | v3 `#presMenu`; master `#bar` |

**StatusChip families (SHOULD).** Stage (neutral/blue): Draft, Awaiting signature, Ready to send, Submitted, Active, Closed. Clock: On track (green), Due soon (amber, "9 h left"), Overdue (red, "3 days"). Provenance: as above. Maturity: outline badges. Actor: Staff · PsyFlo draft · From Lauris · Payer.

## h. Token set

| Token | Value | Role / contrast |
|---|---|---|
| ink-900 | `#1B1B19` | Text on paper 16.0:1 |
| muted-700 | `#5A544B` | Secondary text 6.9:1 paper, 6.2:1 sand; replaces `#525B66`, `#6B665E`; ban `#8A857B`, `#9A9388`, `#8E8A82` for text |
| paper-50 | `#F8F6F2` | Page (master brand) |
| surface-0 | `#FFFFFF` | Cards, tables |
| sand-100 | `#EFE8DE` | Rail, table head, inset |
| line-200 | `#E5DCD0` | Hairline |
| control-500 | `#857F75` | Input/select border 4.0:1 white (WCAG 1.4.11) |
| action-800 / 900 | `#1D4F43` / `#17403A` | Primary, selected; white 9.3:1 / 11.5:1 |
| action-tint | `#E3EFEA` | Selected rows, success bg |
| teal-600 | `#217A78` | Icons, progress, focus ring on light (4.2:1 on sand, 4.7 on paper) |
| teal-300 | `#5FC0BE` | On-dark accent, focus on navy 8.05:1 |
| marigold-400 | `#F0B44C` | Brand dot, presenter marker. Never text on light (1.85:1) |
| navy-900 | `#151B24` | Tool chrome only: presenter ribbon, extension header, toasts |
| danger | `#8A2E1C` on `#FBE7E2` | 7.1:1 |
| warning | `#6F4A05` on `#FCEFD0` | 6.9:1 |
| success | `#1D4F43` on `#E3EFEA` | 7.9:1 |
| neutral | `#4A453D` on `#EFE8DE` | 7.8:1 |
| info / PsyFlo draft | `#1F4E8C` on `#DCE8F7` | 6.7:1 |

Type (DM Sans, `tabular-nums` for figures): 12/16 caption (chips, meta only) · 13/18 small (table, panel) · 14/20 body · 16/24 body-lg (phone, portals, inputs) · 18/26 card title · 22/28 h2 · 28/34 h1 · 34/38 stat. Weights 400/500/600. Spacing 4, 8, 12, 16, 24, 32, 48; gutters 24 platform, 16 panel and phone. Radius 4 marks · 8 controls · 12 cards · 16 drawers · full chips. Shadows: none on cards; popover `0 6px 20px rgba(27,27,25,.14)`; drawer `0 24px 60px rgba(27,27,25,.30)`. Controls 40 px high on desktop, 44 on touch. Focus: 2 px `teal-600`, offset 2 (teal-300 on navy). Motion 120 ms, off under `prefers-reduced-motion`.

## i. Panel, mobile, portals

**Extension panel, 400 px (MUST).** Header 56 px: logo, "Lauris connected", PatientBar, role chip, collapse. Under it three equal buttons: **Scribe · Track Time · Scan & Enhance** (the third only with the permission; see l). Body shows one zone: NextTask, current-document status, then accordions (Checks "7 of 7 pass", Sources, Recent activity, collapsed by default). One primary button per view, pinned in a bottom bar for Fill and Confirm. Text 13 px floor (95 of 111 panel text nodes are under 13 px today [M]); chips 12. Buttons 40 px, primary 44. No horizontal scroll; chips wrap; no side-by-side diff, use tabs. Budget: any state ≤2 screens of scroll (≤1,500 px); today clinician home 2,083, v3 SRA scan 6,550 [M]. Green/yellow legend stays in the header (BRIEF rule 8). Three states as v3: collapsed pill (shows case status, closing G-039), 400 sidebar, focus workspace (≥640 px, three-column compare). `panel.css` caps at 520 px; define behaviour wider. The panel reads only the open page; keep the element ids the bridge depends on (`bridge-contract`, Agent D F) unchanged.

**Mobile staff, 390×844 (MUST).** Home has three things: My Students (chips), Current Activity (timer), Say What Happened. Sticky PatientBar; saving a dictation asks "Save to M.R. (grade 2, Campbell ES-1)?" with Change. Bottom bar holds the single primary. State chip on every note: Draft · Waiting for Lauris · Processed in Lauris. Targets 48 px. Remove "runs with the screen locked". Mic-denied, offline and consent states are explicit screens. Presenter bar collapses to a 28 px handle.

**Family portal, 390 (MUST).** Checklist home with "3 of 7 done"; one task per screen; body 16 px; semantic `h1/h2` (0 on the 6 phone screens probed [M]); language toggle ≥44 px at the top; links ≥44 px (today 16 to 27 px [M]). Signature screen follows a policy chip: Remote allowed · In person required · Pending · Completed · Ready to review (Part 4.3), with "Type your name" alternative to drawing. Letters: What this says · What you can do · By when (+ provenance of the date). No clinical terms. Progress, quarterly, letters, schedule and surveys carry the Proposed badge in presenter overlay [E 3l].

**School portal (SHOULD).** Home: one "Harvest needs" card (missing information) above the referral list; referral form in 4 sections, required first (49 inputs today); school sees status text only, never clinical content.

## j. Accessibility

| Defect (measured) | Where | Fix |
|---|---|---|
| 20 tab stops before main content; no skip link | master | Skip link; presenter dock out of tab order until opened (MUST) |
| 5 of 5 sidebar links unfocusable (`<a>` without href) | v3 | Real links (MUST) |
| `<html lang>` missing | v3 | Add (MUST) |
| Modal does not take focus, no trap; focus not returned; route change leaves focus on `body` | master `app.js modal()` | Overlay primitive (MUST) |
| v3 modal lacks `role="dialog"` | v3 | Same |
| Filter chips are buttons without `aria-pressed` | master | Add (MUST) |
| Contrast: white on `#529796` 3.37:1 (sidebar count); v3 `#9A9388` on `#F6F0E8` 2.69, `#8A857B` on `#F2EAE1` 3.08, on `#FAF6F1` 3.41, `#8E8A82` on white 3.44, `#5E7A6F` 4.2 | both | Token set above (MUST) |
| Input borders 1.4 to 1.6:1 | both | `control-500` (SHOULD) |
| Text under 12 px: master Analytics 25 of 147 nodes; v3 Analytics 139 of 607 | both | 12 px floor (SHOULD) |
| Touch targets: panel 37 of 37 controls under 44 px; MobileApp chips 40 px; Parent portal language toggle 27 px; AppealLetter links 16 to 18 px; checkboxes 18 to 20 px | master | 40/44/48 rule (MUST for portals) |
| 0 headings, 0 landmarks on the 6 phone screens probed (MobileApp, ParentPortal, ParentEnroll, FamilyLink, ParentLetters, AppealLetter); no landmarks on SchoolPortal or ReferralForm | master | Semantic structure (MUST) |
| 8 click targets not focusable (auth-list), 6 (denials) | v3 | Buttons or links (MUST) |
| Panel live region wraps the whole panel (`aria-live="polite"` on `#panel`) | master panel | Announce status only |
| Platform breaks at 1024 | master | Collapse rail to icons; hide Owner/Service into row line (MUST) |

Checklist for every new screen: one `h1`; landmarks (`nav`, `main`); every control reachable and visibly focused; labels on all fields; status chips carry text; progress and errors announced (`role="status"`, errors `role="alert"`); dialogs trap and restore focus; no colour-only meaning; 4.5:1 text, 3:1 UI; targets ≥24 px (44 touch); reflow at 400 px and 1024 px; `prefers-reduced-motion`. Test the 400 px panel and the platform separately (Part 13.5).

## k. Presentation and Explore modes

**Presentation (default for a live meeting).** The product fills the window. A 28 px **Presenter** handle sits in a navy ribbon above the viewport, not over it (Ctrl+Shift+P or `?present=1`). Visual language that no product element uses: navy `#151B24`, 1 px dashed marigold border, monospace label PRESENTER, marigold dot. Expanded, it holds: Scenario (the six of Part 14.2, each showing role · case · surface as in v3), Role (4 staff, guardian, school), Reset and preset (Live flows / Canvas snapshot), Simulation (receive a reply, advance both clocks, moved out of the Authorizations header), Notes ("How the data gets in", Architecture), Maturity overlay toggle, Surfaces launcher (Platform, Lauris + panel, Phone, Family, School). Nothing presenter-owned appears inside the product viewport.

**Explore.** Same dock, docked open as a slim ribbon, plus a searchable "All screens" picker (role-aware, no canvas numbers) and the Surfaces launcher; the rail follows the role. Mode indicator always visible in the ribbon ("Explore · all features by role").

Both: a quiet "Demo data · nothing is real" line stays in the rail foot (CONTRACT non-negotiable). On phone widths the ribbon is a 24 px handle.

## l. Prompt versus evidence, and decisions needed

| Item | Prompt | Evidence | UX handling |
|---|---|---|---|
| Scan & Enhance | Primary extension action [P 5, 9.5] | Removed 7 Nov [E G-093]; added 1 Nov for licensed staff [E G-031] | Keep the third button, named for what it does in each mode: Mode A Review draft, Mode B Evidence review (read-only); addendum off |
| Direct support and the platform | Four personas, DS has My Work [P 6, 16] | "Only licensed clinical staff would use the platform" [E G-030]; v3 DSS: no access | DS My Work is optional, reached from the panel |
| Mobile app | Surface 3 | No Harvest staff asked for it [E granola 3k] | Maturity: Simulated/Proposed |
| Family portal beyond signing | Parts 5, 11 | No Harvest ask for progress, quarterly, letters, scheduling, surveys [E 3l] | Proposed badge |
| Analytics | Part 12 | Deprioritised [E G-087]; NEXT-STEPS "can wait" | Proposed (post-pilot) badge; provenance banner |
| Appeals | "Guardian-led or authorized provider" [P 8] | Only guardians appeal [`product-direction.md` #22] | Default guardian-led; provider path "Not verified" |
| Track Time | 15-minute rule configurable | 15-minute button was PsyFlo's addition [`product-direction.md` #10] | Present as a configurable rule, not Harvest policy |

**Three decisions for the lead.** (1) Rail: My Work + 3 tabs + Referrals + Settings (mine), or 3 tabs + "More" (Agent D), and whether direct support gets My Work. (2) Third extension button: "Scan & Enhance" as named, or "Review" with the two modes, given G-093. (3) Visual system: light warm rail with forest action colour and navy only for tool chrome, or keep the dark rail and teal.
