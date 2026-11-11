# Prompt: simplify the Psyflo × Harvest demo and align it to Harvest's real workflow

**How to use:** paste this into Claude Code, opened in the `psyflo-harvest-demo` repo (the Nov 8 build). It does not change the product rules in `docs/BRIEF.md` ("Rules that never bend"). It changes four things: how much the demo says, how it is laid out, what the menus and statuses are called (revenue cycle management, RCM, terminology), and seven pieces of workflow logic that differ from how Harvest actually works.

**Status:** this is a plan. Nothing has been changed in the demo yet.

**Revision (Nov 11):** applies the reviewer's comments on the summary, plus three label changes from the research pass (Note timeliness, Pending clinical approval, Overdue). Menu, view, status and metric names now use RCM terminology (section 5.5). All seven workflow changes were agreed (section 7). The three Harvest workflow stages the demo does not show are left out (section 9).

---

## 0. The job in five lines

1. The people using this are experts. Harvest clinicians, supervisors, direct-care staff and admins know what a continued-stay request, a partial award and a peer-to-peer are. Never explain a button or a status to them.
2. Remove text, not features. Every capability the demo shows today stays reachable; most of the words around it go.
3. One screen, one main job, one main button.
4. Where something genuinely needs a rule explained, use a small `?` that explains on hover, not a sentence on the page.
5. Make the demo match the workflow Harvest described in the recordings. Section 7 lists the seven places it does not today.

Work in a copy or a branch. Commit in the order given in section 10. Keep `npm test` and the flow tests green throughout.

---

## 1. Who uses it and what they need

| Surface | User | Their job | Where it lives |
|---|---|---|---|
| Phone app | Direct-care staff (QMHP, up to 6 students each) | Start and stop time with a student, say what happened, answer an assessment | `web/screens/MobileApp`, `MobileDictate`, `MobileAssess` |
| Lauris side panel | Direct-care staff, clinicians | Fill the Lauris form that is open: screening, intake (CNA), plan, daily, weekly, monthly note, request | `web/panel/*` |
| Psyflo app | Clinician, supervisor, admin | See what needs me today, track every request, decide on partial awards, see who is behind on notes | `web/screens/*.dc.html` + `web/js/screens/*.js` |
| Guardian and school pages | Guardians (often on a phone), school counselors | Sign, answer a few questions, refer a student | `web/screens/Family*`, `Parent*`, `School*`, `Referral*` |

Staff surfaces assume expert users. Guardian pages are the exception: guardians are not experts (many are grandparents on a phone), so their pages use short plain-language labels, but still no paragraphs.

What Harvest said matters most (use this to decide what is prominent):

- Notes first. "My number one thing would be completing notes in compliance" (N4D 1:44:18 to 1:48:25). Pilot measures are timely notes (due within 24 hours) and time spent writing notes. Not approval rate.
- Screening and intake that fill the Lauris form (screening is 30 to 45 minutes, unpaid; intake 2 to 3 hours).
- Referrals and authorizations tracked in one place instead of fax, email chains and three layers of spreadsheets ("we have a lot of trackers which we have to track too", FC 51:04).
- Everything else in the demo is the wider vision. Keep it, but do not let it compete with the launch path (section 9).

---

## 2. Keep exactly as is

- The nine rules in `docs/BRIEF.md` "Rules that never bend": no Lauris integration, open form only, a person presses Process Form / Get Signature / Send, a person signs, eligibility only after the family link, TDT only, nothing invented in a draft, green and yellow boxes, Lauris stays the record.
- The four live flows (A screening, B daily note, C draft-sign-send, D family link), the 14 drafting rules and their pass/fail checks, the numbered source chips, the green/yellow legend in the panel header, the mock Lauris, the Sfax/SMS/Availity stubs.
- The data model and the request lifecycle, except for the additions in section 7.
- Role-based visibility (direct support, supervisor, clinician, admin).
- Synthetic data only. The line "Demo data · nothing is real" stays on every app screen and in the panel footer, but as one plain muted line, not a boxed badge.
- The "How the data gets in" notes (`seed/notes.md`). They stay, behind the presenter menu (section 5).

---

## 3. The simplicity rules (these are testable)

**3.1 Word budgets.** Count visible words in `#root` (or `#panel` for the extension), excluding anything inside an element marked `data-doc` (drafted note text, letters, call scripts, transcripts, form boxes, user data typed in). Budgets:

| Surface | Today (measured) | Budget |
|---|---|---|
| Psyflo app screen | average 273, worst 632 | 150 or fewer; Worklist 120 or fewer |
| Extension panel view | average 202, worst 319 | 100 or fewer |
| Phone screen | 26 to 113 | 60 or fewer |
| Guardian page (one step) | 55 to 220 | 70 or fewer |

Add `test/words.mjs` (section 10) that fails above these.

**3.2 Copy rules.**
- Headings: 1 to 4 words, nouns ("Worklist", "Authorizations"). The one exception is the sentence headline on the Worklist (section 6.1).
- Buttons: 1 to 3 words, a verb ("Reply", "Decide", "Fill 7 boxes", "Send by fax").
- Chips: 1 to 3 words.
- No sentence under a heading, under a button or under a field. No subtitle lines. No "Psyflo does X for you" text anywhere.
- No numbered instruction lists ("1 Fill the boxes… 2 Open… 3 Press…"). If a sequence exists, show it as a stepper with labels only.
- No "not yet" chips repeated down a list. Show one progress line ("2 of 5 done").
- Dates and numbers are specific and short: "Oct 30", "9 h left", "27 of 110". Never "in 9 hours and 12 minutes".
- Sentence case. Lauris's own labels keep Lauris's wording ("Consumers", "Process Form", "Forms to Approve").
- Say "student" in Psyflo. Say "consumer" only where mirroring a Lauris screen.
- Use RCM terms for menus, views, statuses and metrics (section 5.5). Keep the name Harvest, Lauris or DMAS already uses where one exists ("SRA", "Process Form", "Forms to Approve", "Continued stay" as a form title).

**3.3 The `?` help pattern (the only explanation allowed).**
- A 16 px outline circle with `?`, placed at the right end of a section header, a table column header or beside a chip. Border and glyph `#525B66`.
- Opens on hover, keyboard focus and tap. Never a link, never a modal.
- Tooltip: navy `#151B24` background, white 13/18 text, max width 260 px, 150 ms delay, **20 words or fewer**, one sentence.
- Rules: at most 1 per section, at most 3 per screen, about 10 in the whole product. Use it only for a rule or term an expert could not infer. The list in section 8.2 is complete; do not add more without a reason.
- Accessible: `button` element with `aria-label="About <thing>"`, tooltip has `role="tooltip"` and is tied with `aria-describedby`.

**3.4 One main action.** Each screen or panel state has exactly one filled teal button. A row in a list has one button; it is filled only if the action is due within 24 hours, otherwise outlined. Secondary actions are text links or live in a `⋯` menu. Never two filled buttons side by side.

**3.5 Lists, not cards.** Use rows with a fixed grammar (section 6) instead of cards inside cards. Tables have at most 6 columns and no prose column. The "next action" column is deleted everywhere: the button label is the next action.

**3.6 Filters.** One "Assigned to me" toggle and up to three dropdowns. No row of pill tabs with counts. No date-range pickers unless the data is a time series.

**3.7 Nothing about the demo inside the product.** No demo bar, no "Demo only" chips, no "Demo: advance the clock" buttons, no "(demo)" role switcher inside the panel. All of that moves to the presenter menu.

---

## 4. Brand and visual system

Source: the token list in `docs/BRIEF.md` ("Stack, stubs and the bundle"), the CSS in `web/screens/*.dc.html` and `web/panel/panel.css`, and the Psyflo logo files. The zip contains no separate brand-guideline document. These values are what the demo and the logo already use. Use them; do not introduce any other color.

### 4.1 Colors

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#151B24` | Text, sidebar, panel header, tooltips, selected chips |
| `--teal` | `#217A78` | Primary button, links, active nav, progress |
| `--teal-dark` | `#15605E` | Hover, text on teal tint |
| `--teal-light` | `#5FC0BE` | Focus ring and accents on navy, logo "flo" |
| `--teal-tint` | `#DDF1EF` | "OK" chip, selected row |
| `--marigold` | `#F0B44C` | Accent on navy, progress "watch" bar. Logo dot is `#E0A030` |
| `--paper` | `#F8F6F2` | Page background |
| `--white` | `#FFFFFF` | Cards, panel body, inputs |
| `--line` | `#E6E1D9` | Card and row borders |
| `--line-strong` | `#D9D4CC` | Input and button borders |
| `--ink-2` | `#3E4652` | Secondary text |
| `--ink-3` | `#525B66` | Tertiary text, labels, `?` glyph |
| `--ink-4` | `#8E99A6` | Decorative only, or text on navy |
| `--lauris` | `#2F3A4A` | Mock Lauris shell only (Arial) |

Status chips (background / text): **ok** `#DDF1EF` / `#15605E`; **watch** `#FCEFD0` / `#6F4A05`; **late or denied** `#FBE9E4` / `#8A2E1C`; **info** `#EEEBE5` / `#3E4652`; **current** `#151B24` / `#FFFFFF`.

Lauris boxes in the panel and mock: **green** (already in Lauris) fill `#E6F4EA`, border `#BFE3CB`; **yellow** (Psyflo typed, check it) fill `#FFF8E6`, border `#E8C56A`. Text `#151B24` on both.

Meaning of color, used the same everywhere: teal = done or on track; marigold/watch = needs attention soon; red = late, denied or blocked, nothing else; grey = information.

### 4.2 Contrast rules (measured)

- White on teal button: 5.1:1. Teal text on white: 5.1:1. Fine.
- `#8E99A6` on paper is **2.7:1 and fails** for text. Use it only on navy (where it passes) or for non-text decoration.
- Marigold `#F0B44C` on white is **1.85:1 and fails**. Marigold is a fill or an accent on navy, never text on a light background.
- Every text pair 4.5:1 or better (3:1 for text 18 px and up and for UI borders).

### 4.3 Type, space, shape

- **DM Sans** only (400, 500, 600, 700); Arial only inside the mock Lauris.
- Page title 24/32 600. Section header 16/24 600. Body 14/20 400. Label 12/16 600 (sentence case, not all caps). Chip and button 14/20 600 (chip 12/16). Numbers tabular.
- 4-point spacing grid. Page padding 24 px (16 px on phone). Row height 52 px desktop, 56 px phone.
- Radii: chips full pill, buttons and inputs 8 px, cards 12 px. Borders, not shadows. The only shadow is on popovers and the drawer: `0 6px 24px rgba(21,27,36,.14)`.
- Focus ring: 2 px `#217A78` outside, 2 px offset; on navy `#5FC0BE`.
- Hit targets: 36 px high on desktop, 44 px on phone.
- Icons: 20 px line icons, 1.5 px stroke, as the sidebar already uses. No emoji.
- Logo: use the supplied files. Full-color logo on light, white/reverse on navy.

---

## 5. App shell

**5.1 Presenter layer (hidden by default).** Delete the navy demo bar (`#bar` built in `web/js/app.js`). Replace it with one `⋯` icon button, top right of the header (bottom right on phone). It opens a popover: Jump to screen, Switch user, Reset (live flows or canvas snapshot), Open mock Lauris, How the data gets in, How it fits, Roadmap, and (admin only) "Demo: receive a reply" and "Demo: advance a day". Keyboard: `Shift+P`. Nothing else about the demo is visible in the product.

**5.2 Sidebar (240 px, navy).** Four items for staff with a platform login:

| Item | What is in it | Who sees it |
|---|---|---|
| Worklist | What needs action now (was Do next) | clinician, supervisor, admin |
| Authorizations | Intake (referral through intake) and Prior auth & UR (request through decision) | clinician, admin |
| Documentation | Note timeliness (was Staff dashboard) and Chart review (was Review queue) | everyone; direct support sees only their own row |
| Analytics | KPIs and Outcomes | clinician, admin |

The names come from the RCM glossary in section 5.5.

For a supervisor, the Worklist lists the notes awaiting their review instead of clinical items. At the bottom: the avatar and name; its menu holds Settings (Users & roles, Payer rules, was Payer playbook), Help, Sign out. Delete the "The four doors" group (extension, mobile app, parent portal, school portal): those are other surfaces, reachable from the presenter menu, not product navigation. Counts: Worklist and Authorizations only, and only the "assigned to me" number.

**5.3 Header.** Page title on the left. On the right: the story date ("Thu, Oct 29") as plain text and, if there is one, the page's single primary action. Delete "As of …" prefixes, the "Both localities" chip (it becomes an "All sites" dropdown on Authorizations, Documentation and Analytics) and the "Demo only" chip.

**5.4 Footer.** One muted 12 px line at the bottom of the sidebar: `Demo data · nothing is real`. No box, no dot.

**5.5 Terminology (RCM lingo).** Menus, views, statuses and metrics use standard revenue cycle management and utilization review terms. Put every label in one file, `web/js/shared/labels.js` (nav, views, request types, statuses, metrics, button names), and import it from `web/js/app.js`, `web/js/registry.js`, the screen controllers and `web/panel/panel.js`, so a name changes in one place. Where Harvest, Lauris or DMAS already has its own name, keep it. Use the names in this table everywhere, including the wireframes below.

| Was | Now |
|---|---|
| **Navigation** Today / Team / Reports | **Worklist** / **Documentation** / **Analytics** (Authorizations is unchanged) |
| **Views** New students / Requests | **Intake** / **Prior auth & UR** |
| Notes / Review (Team) | **Note timeliness** / **Chart review** |
| Pilot / Student progress (Reports) | **KPIs** / **Outcomes** |
| **Filters** Needs me / Waiting on others / Funding | **Assigned to me** / **Awaiting response** / **Funding source** |
| **Request types** Initial / Continued stay / More info / Peer-to-peer | **Initial auth** / **Reauth** / **Additional info** / **P2P** (Appeal is unchanged) |
| **Statuses** Draft ready / Needs approval / Awaiting signature / Signed | **Ready for review** / **Pending clinical approval** / **Pending signature** / **Ready to submit** |
| Info requested / Partial / Active / Renewal due | **Pended** / **Partial approval** / **Authorized** / **Reauth due** |
| Late / `Day 10 · call` | **Overdue** / `Day 10 · follow-up` |
| **Metrics and parts** On time / Behind / Approval (Every note, Spot check) | **Timely %** / **Backlog** / **Review** (100% review, Sampled) |
| Awarded / Weekly eligibility checks / Run check | **Authorized** / **Eligibility re-verification** / **Verify** |
| Checks (on a request) / Checks (on a note) | **Pre-submission checks** / **Documentation checks** |
| Timeline / Proofs / Decide | **Activity log** / **Attachments** / **Review offer** (partial approval) |
| **Unchanged names** | SRA, Process Form, Get Signature, Send, Forms to Approve, Continued stay (as the DMAS form title in the panel), Lauris, Sfax, Availity, TDT, SEBS, units, Payer scorecard, Payer rules |

The phone app keeps its own plain words (Today, Students, Assess, Me): it is used in the hallway, not at a desk.

---

## 6. Screens

Screen numbers are the canvas numbers in `web/js/registry.js`. "Stage" is the stage in the Harvest TDT Workflow Map (27 stages).

### 6.1 Worklist (screen 2, `DoNext`) · stages 1, 8–10, 15, 19, 23

Sentence headline, as in the earlier Prior Auth designs: **"7 items need action."** (the count). Under it one list, then one collapsed line.

```
Worklist                                                   Thu, Oct 29   ⋯
7 items need action.

 2:00 pm   A.R., 9 · Lynchburg ES-3 · Screening call           [Open in Lauris]
 9 h left  K.T., 9 · Anthem · additional info                  [Respond]
 Day 10    A.L., 6 · Humana · payer follow-up                  [Open]
 Oct 30    D.W., 15 · Sentara · partial approval 110 of 150    [Review offer]
 Ready     M.R., 7 · Reauth                                    [Review in Lauris]
 New       T.W., 12 · Referral                                 [Review]
 12 due    Eligibility re-verification                         [Start]

 Awaiting response · 6                                          View
```

- Left chip is the clock or state (section 7.1). Middle is student initials, age, school or payer, and 2 to 5 words. Right is the one button.
- Merge "Today", "This week" and "Waiting on others" into this list and one line ("Awaiting response"). "This week" items appear in the list when due within 7 days, with the date as the chip.
- Delete the greeting ("Good afternoon, Dana"), the "7 things" chip and the "Open Lauris" header button.

### 6.2 Authorizations (screens 6 and 29, `Referrals`, `Authorizations`) · stages 1, 8–11, 19–21

One page, two views in a segmented control at the top: **Prior auth & UR** (default; request through decision) and **Intake** (referral through intake).

```
Authorizations   [Prior auth & UR | Intake]   All sites ▾  Status ▾  Payer ▾   [ ] Assigned to me

Student   Request          Payer           Units              Status                          
M.R., 7   Reauth           Anthem          ▓▓▓▓░ 27 of 110    Ready for review · 9 days       [Review in Lauris]
K.T., 9   Additional info  Anthem          150                Pended · 9 h left               [Respond]
D.W., 15  Reauth           Sentara         150 → 110          Partial approval · Oct 30       [Review offer]
A.L., 6   Initial auth     Humana          150                Day 10 · follow-up              [Open]
J.O., 14  Initial auth     Aetna           150                Submitted · Day 6               [View]
T.N., 8   P2P              Sentara         150 → 65           Call Dec 9                      [Call notes]
E.C., 5   Initial auth     Anthem          90                 Denied · 51 days                [Letter]
```

- Units column: remaining of authorized once active (`27 of 110`); requested → authorized while pending or partial (`150 → 110`). This is a spec note, not screen text.

- Delete: the 7 pill tabs with counts, the request-type and service dropdowns (type is in the Request column), the prose "Next action" column, the "History · n" links, the "Channels by payer" card, the header button "Open a student in Lauris to draft a continued stay", and the two Demo buttons.
- Channel (Sfax, Availity, UHC portal) is small grey text under the payer name.
- Clicking a row opens a right-hand drawer (440 px) that replaces the separate Sent screen (19):

```
R-0399 · A.L., 6 · Humana                                  ✕
Initial auth · sent Oct 19 · Sfax F-2280
Day 10 · follow-up with payer  ?

Activity log
 Oct 19  9:20 am   Sent by fax                     J. Perez
 Oct 19  9:21 am   Delivery receipt                Sfax
 Oct 28  11:05 am  Receipt confirmed by phone      C. Diaz

Attachments   [Signed PDF]  [Fax receipt]  [Eligibility Oct 22]
                                                         [Send notice]
```

- The Intake view uses the same row grammar: Student, School, Funding source (TDT, SEBS or Outpatient), Stage (Referral, Screening, Intake, Plan), Status and clock, one button. T.W.'s family link, eligibility and screening are shown in the drawer as a checklist (6.3), not as separate cards.
- Requests awaiting approval (section 7.2) show `Pending clinical approval` in Status and an `[Approve]` button for the clinical lead.

### 6.3 Referral (screens 7, 9; `Referral`, `Eligibility`) · stages 1–3

Opens as the drawer from Intake, and as a full page when linked. One checklist replaces five cards.

```
T.W., 12 · Lynchburg MS-2                Funding source: TDT ▾
[Send family link]   Book call

Before the screening call
 ✓ Referral form             ✓ Behaviour report      ✓ Attendance log
 ✗ Schedule and grades       [Ask school]
 · Guardian details          waiting on family link
 · Medicaid ID, verification  waiting on family link   [Verify]
 · Consent to contact        waiting on family link

Criteria (DMAS Section I)     2 needed · 1 shown   ?
 ✓ Relationships             ○ Prior services      ○ Danger to self or others
```

- Funding source is a three-way dropdown: TDT, SEBS, Outpatient. It replaces "Route to grant program".
- Eligibility becomes one line: `Medicaid · not verified`, then `Active · Humana · verified Oct 15` with a screenshot icon. The `Verify` button opens the mock DMAS lookup (a person reads it and records the result). Keep rule 5: this stays disabled until the family link is submitted, and the disabled button's tooltip says "After the family link".
- Delete the "What the insurance form needs · what we can show" paragraphs. Each criterion is one line with a status icon; its evidence text appears in a tooltip on hover and is written into the SRA by the panel later.
- Delete the five "not yet" rows of the Family link card. Replace with one line: `Family link · 2 of 5 done`.

### 6.4 Decision pages: additional info, partial approval, denial, P2P, early discharge (screens 34, 35, 38, 36, 39) · stages 10–13, 21

All five use one layout: title line with a clock chip, a left column of facts, a right column of choices or a draft, one filled button at the bottom right. Documents (letters, scripts, drafted replies) are exempt from the word budget; the chrome around them is not.

**Additional info request (34).** Title `Additional info · K.T., 9 · Anthem`, chip `9 h left of 24`. Left: the three questions asked, numbered, as the payer wrote them. Right: the draft reply, editable, every sentence with source chips. Buttons: `[Open Availity and send]` (filled), `Edit` (text). Answer exactly what was asked (drafting rule 12).

**Partial approval (35).**

```
Sentara partial approval · 110 of 150 · D.W., 15            Reply by Oct 30
▓▓▓▓▓▓▓░░░  110 units · 7 of 13 weeks

( ) Accept 110, spread to Jan 30            8 units a week
(•) Accept, use them, discharge Dec 18      then new initial
( ) Request P2P                            call date needed
                                                    [Log decision]
Last time with Sentara    150 → 120 → 140 → 110
```

- Options are radio rows: a title and one fragment of 6 words or fewer. "Logged, not sent" chips are removed; the log action's result is shown in a toast.
- The reason Sentara gave appears as one chip with a `?` that shows what worked last time.
- Delete the "Why insurers say no · what Psyflo checks before sending" table from this screen. Those checks live in the SRA panel's "Pre-submission checks" list (6.6) and in Settings → Payer rules.
- Denial row (E.C.): one line `Denied · appeal window 51 days` with `[Guardian letter]`. Delete the paragraph.

**Peer-to-peer notes (38).** Keep: this is the best-received screen ("This is genius", DS 25:02). Title `Call notes · T.N., 8 · Sentara · Dec 9, 2:00 pm`. Sections as short labeled blocks: Opening, Points (with dated counts), Ask, Questions to expect, Evidence. `[Print]` and `[Log outcome]`. Remove the intro and closing sentences.

**Early discharge (36).** Three date tiles in a row: `Units run out Dec 18`, `Discharge Dec 18`, `New request earliest Jan 17`. One `[Set this plan]`. No paragraph. The 30-day restart is a config value (section 7.5).

**Appeal letter (39, guardian phone).** Keep the letter; chrome only: language toggle (EN/ES), `[Sign and send]`, `[Change wording]`.

### 6.5 Documentation (screens 27 and 28, `StaffDashboard`, `ReviewQueue`) · stages 15, 25

Two views: **Note timeliness** (default) and **Chart review** (supervisor and up). Direct support see only their own row, framed as "mine".

```
Documentation   [Note timeliness | Chart review]                     All sites ▾

Staff       Backlog  Timely %  Review          Flags
K. Hale     2        89%       Sampled         Goal 3 untouched 6 weeks
R. Owens    0        100%      100% review     7 waiting for C. Diaz
S. Lane     0        67%       100% review     4 not in Lauris since Oct 21
J. Reyes    0        95%       Sampled         3 safety holds in 30 days
```

- Two numbers lead: **Timely %** (daily notes processed in Lauris within 24 hours of the session) and later **Minutes per note** (Harvest's pilot measures). Put a `?` on "Timely %": `Processed in Lauris within 24 hours of the session.`
- Delete "Patterns to talk about this month" paragraphs. The same facts are the Flags column, one line each, clickable.
- Delete the footnote about how notes are counted.
- **Chart review** keeps the wrote-versus-enhanced diff and Approve / Return / That didn't happen. Row grammar like the Worklist.

### 6.6 Lauris side panel (screens 13 to 18, 23 to 26, 32, 33, 37) · stages 2, 6–8, 15–17, 20, 21

One frame, used by every view. 400 px wide.

```
┌ psyflo.  Daily note · M.R.                   4 of 6 ┐   navy header
│ (green · in Lauris) (yellow · Psyflo typed)     ?   │   legend stays (rule 8)
├──────────────────────────────────────────────────────┤
│ [ Record ]  [ Type ]                                 │   the one primary action
│                                                      │
│ Contact time                                         │
│  8:05–8:35   Morning check-in                        │
│  1:40–3:10   Afternoon classes       unconfirmed     │
│ Narrative                                       Edit │
│  Worked with M.R. on a taught strategy… ¹ ² ³        │   data-doc, yellow
│ Documentation checks   9 of 9 ✓                      │   expands to the list
├──────────────────────────────────────────────────────┤
│ Direct time 5 h 10 min → 3 units  ?      [Confirm 3] │   sticky footer
└──────────────────────────────────────────────────────┘
```

Rules for every panel view:
- Header: logo, `<Form> · <Student>`, one status chip on the right. The `?` in the legend row says: `Reads only the page you have open.`
- Body order: one state card with the single filled button; then the boxes list (label, drafted text with source chips, collapsed to one line, expand to edit); then `Documentation checks n of n ✓` (`Pre-submission checks` on a request); then the sticky footer.
- Delete every paragraph: the Scribe explanation, the "1 Fill… 2 Open… 3 Press…" steps, "Nothing is recorded until you press Record" (it becomes the mic's `?`), "Who can see what", the "Open Psyflo" tiles with descriptions (replace with one `Open Psyflo ↗` link in the header), the role toggle ("Signed in as (demo)"), and the greeting.
- "Use the example" and "Play the scripted call" move to the presenter menu.
- The checks list keeps its pass/fail logic exactly; it is collapsed by default and shows `9 of 9 ✓`, or `8 of 9` in watch color with the failing check on top.
- Disabled buttons say why in a native tooltip ("Save Consumer first").

**Home (no form open, 13).** Header only, then `Worklist` with up to 3 rows in the Worklist row grammar (`M.R., 7 · Reauth · Ready for review  [Review]`), then a student search field. Three launcher buttons for the role: direct support `Say what happened`, `Track time`; clinician adds `Record a call` and `Draft a request`. No cards with descriptions.

**Screening (14).** Referral dropdown, then a three-label stepper `Fill · Record · Review` and one button for the current step: `Fill 5 boxes` → `Record` → `Fill 19 boxes`. A checkbox `Consent read` must be ticked before `Record` enables (recording needs consent; Harvest's attorney review is open). While recording: only the "Still to ask" list with ticks, a timer and `Stop`. After stop: boxes list, `[Fill all]` filled, `One at a time` text. Eligibility note: the amber banner becomes the disabled-button tooltip.

**CNA (15) and plan (16).** Same frame. CNA: `Fill 31 boxes`, a `Still to ask` list (developmental history before trauma). Plan: three goals as rows with intervention chips from Harvest's list; `Fill the 3 goals`. Show the 24-hour plan clock as a header chip (section 7.4).

**Request, sign-off (17, 18).** Draft panel: 7 boxes, criterion text editable inline, `Pre-submission checks 9 of 9 ✓`, `[Fill 7 boxes]`. After Process Form in Lauris, the same panel becomes a status line: `Processed · pending clinical approval`, then `Pending signature`, then `Signed · ready to submit`, then `Open Send` (opens the Authorizations drawer). Sign-off is a state of this view, not a separate page. The person still presses Process Form and Get Signature in Lauris.

**Daily note (23).** As in the frame above. `Say what happened` is the whole top card: `Record` and `Type` (a textarea with placeholder `What happened?`). After dictation the narrative drops in yellow with source chips (intervention from the plan, duration from the timer, objective from the plan). The units chip has a `?` (7.3). "The afternoon block didn't happen" becomes a `⋯` menu on that contact-time row.

**Weekly (24) and monthly (25).** Same frame: `Record`, boxes (4 and 3), source chips, `Fill`.

**Continued stay (33).** The best-received screen; keep all of it, remove prose.

```
Continued stay · M.R.                              Ready for review
[Last 30 days | Whole period | Pick dates]      from 21 notes · 61 days
Aggression 3 · Eloped 2 · Taught strategy 3 of 5 · Safety hold 0

Progress                                                     Edit
 In the last 30 days M.R. used a taught strategy… ³ ⁴ ⁶
Continued need                                    Household detail  ?
 Two escalations… [Include] [Exclude]
Sources · 7                                              [Fill 6 boxes]
```

The `?` beside the household detail: `Family details stay out of payer text unless you include them.` (Jillian's top worry: "did I share too much information… those are the things that keep me up at night", FC 29:13.)

**Quarterly (32), discharge (37), incident (26).** Same frame and rules; they are "Later" (section 9) but must not look different.

### 6.7 Phone app (screens 20 to 22)

```
psyflo.                          Kayla · ES-1
 M.R.  56:38                           [Stop]
 (M.R.) (J.T.) (D.P.) (A.G.) (E.S.) (C.B.)
 [          Say what happened          ]
 Today                          2 notes waiting
 8:05   Morning check-in                30 min
 9:50   In-class support                1 h 15
 11:40  Lunch support                   45 min
 …
 Today · Students · Assess 2 · Me
```

- Delete the paragraph "Your day so far…" and turn it into rows. Delete "Or just say the name.", "Since 1:52 pm · runs with the screen locked" and any demo controls above the header.
- `Say what happened`: one big mic, the transcript in note language, `Looks right` filled, `Fix it` text. (Already about 26 words. Keep.)
- Assessments: due list, `Ask now`.
- Voice tagging ("I'm going to begin working with…") and the screen-locked timer are real asks (N4D 15:07 to 18:46, 31:55). Keep them working; they need no on-screen explanation.

### 6.8 Guardian and school pages (screens 3, 4, 5, 8, 11, 12, 31, 39, 46 to 50)

- **School referral form (4).** Remove the intro paragraph. The question "Has the guardian been told a referral is being made?" becomes a required `Guardian agrees to the referral` (Yes/No); the reason is in section 7.7. The three attachments stay as checkboxes; "the authorization request needs all three" becomes a `?`.
- **School portal (3).** `Refer a student` (filled), the students list in row grammar, `Share today`.
- **Family link (8).** One question per screen, progress dots, EN/ES toggle at the top, one button. Labels 12 words or fewer.
- **Parent signs (11), Parent portal (12), Enrollment (46).** Short plain labels and one button each. Signing stays available (leadership asked for enrollment paperwork before intake, N4D 14:26 and N4P 41:52). See decision 3 in the summary about whether Harvest requires in-person signing; do not add UI text about it. Keep it in the presenter notes.
- **Progress, quarterly, letters, schedule (47 to 50).** Keep as is, trimmed to the guardian budget; they are "Later".

### 6.9 Analytics (screen 42) and Payer rules (40) · stage 26

**Analytics** shows two blocks only:

1. **KPIs:** `Timely notes` and `Minutes per note` (Harvest's two pilot measures), as two large numbers each with a weekly line, plus `Backlog`.
2. **Outcomes:** one student over time (PHQ-A, DSM cross-cutting, daily rating, office referrals) with a trend chip per row.

Move the payer scorecard (partial rate, awarded vs asked, full denials, decision days, "unpaid clinical hours") and the monthly units chart to Roadmap (section 9). Harvest has never calculated these rates; the 12-month tracker export is not in yet, and every figure on this page is invented. Replace every source line that says "Harvest's Lauris export" or "master tracker" under an invented number with a small `Sample data` tag.

**Payer rules (40, now under Settings).** Keep the table (payer, channel, what they tend to ask, what works) and the "rules Psyflo applies to every draft" list. It is reference material, not a primary page.

---

## 7. Workflow alignment (logic and data)

These are the seven places where the demo does not match how Harvest works. The reviewer agreed with all seven. Make these changes in `web/js/shared/model.js`, `dates.js`, the seed overrides and the affected controllers. Put new constants in `seed/extra/00-config.json` under a `clocks` key; do not hard-code them.

### 7.1 Decision clock

What Harvest does: sends the request, calls the payer around day 10 because faxes go astray, expects many payers to use all 14 days, and receives decisions by fax even after a phone call. The public record says 7 calendar days since January 2026. Some payers take more than a month. (FC 80:51 to 81:24, DA 14:22, N4D.)

What the demo does: due date = sent + 7, "decision overdue 3 days", an "Overdue notice citing the 7-day standard" as the default next step.

Change:
- Add `clocks: { call_day: 10, decision_days: 14, public_standard_days: 7 }`.
- The status chip on a submitted request shows `Day N`, becomes `Day 10 · follow-up` at day 10, and goes red (`Overdue`) only after `decision_days`.
- The `?` on that chip: `Harvest calls at day 10. Public rule: 7 days. Many payers take 14.`
- The overdue notice is still available, but as a secondary action once the 7-day standard has passed, not the default.
- Stop using the invented per-payer `decides_in_days` (4 to 7) to drive clocks. Leave the field in the seed; do not read it.

### 7.2 Internal approval before signature

What Harvest does: the clinical lead approves every SRA, then the clinician attests and signs, then the team is emailed "approved" (stage 9, FC 82:06).

What the demo does: draft → Process Form → Get Signature → Send, with no approval step.

Change: add request stage `needs_approval` between `draft_ready` and `awaiting_signature`. It appears as `Pending clinical approval` in the Authorizations list with an `[Approve]` button for the clinical lead role, and in the panel status line. Approving writes an event (`Approved by <name>`) and changes nothing in Lauris. A person still presses Process Form, Get Signature and Send.

### 7.3 Units bands

The regulation: 1 unit = 2 to 2.99 hours, 2 units = 3 to 4.99 hours, 3 units = 5 hours or more, per day (12VAC30-80-30 A.3.c). `unitsForDirectMinutes` in `web/js/shared/dates.js` returns 1 unit from 60 minutes. Change it to 120 / 180 / 300 and read the thresholds from config. The `?` on the units chip: `1 unit 2–2.99 h · 2 units 3–4.99 h · 3 units 5 h or more.` (Harvest also describes a one-hour daily minimum against a two-hour program rule; that conflict is unresolved. Do not show either on screen. Keep it in the presenter notes.)

### 7.4 Post-intake clocks

What Harvest does: the treatment plan is due within 24 hours of the intake, the rest of the paperwork within a week (FC 33:32), and the initial request within 30 days of intake (DA 14:00). The regulation says 30 days for the plan; the 24 hours is Harvest's practice, and that conflict is unresolved.

Change: add `isp_due_hours: 24`, `paperwork_due_days: 7`, `initial_sra_days: 30`. The Worklist and the Authorizations Intake view show the earliest open one as a clock chip (`Plan 18 h`). Keep the 30-day limit on the initial request as it is.

### 7.5 Weekly eligibility re-verification

What Harvest learned the hard way: a retroactive eligibility clawback of about $10,000, and the payer's answer was that Harvest should have checked weekly (DA 160:35 to 161:48). Proof means a dated screenshot for every week of the authorization.

Change: every active student gets `eligibility.next_check = last_checked + 7 days`. The Worklist shows one line, `12 due · Eligibility re-verification`. Its list (reuse screen 9) has columns Student, Last verified, Result, Next due, `[Record]`. Recording requires a screenshot file. A person runs the DMAS lookup; Psyflo only stores and reminds. Also expose `restart_days: 30` for early discharge (one source says 31; unresolved).

### 7.6 Sources on invented numbers

Every statistic in the demo is synthetic. Replace the `Source: Harvest's Lauris export · Oct 29` and `master tracker` lines under seeded figures with a `Sample data` tag. Keep real sources only for things Harvest actually provided (forms, rules, the 27 photographed Lauris screens).

### 7.7 Referral consent

What Harvest does: a school may submit a referral only with the parent's agreement (stage 1; N5 0:00 to 7:15).

What the demo does: the referral form asks "Has the guardian been told a referral is being made?"

Change: replace it with a required Yes/No field `Guardian agrees to the referral`. A referral cannot be submitted on `No`; the form says `Guardian agreement is needed to refer` beside the field. Add `guardian_agrees` to the Referral record and show it as the first line of the Intake checklist (6.3).

---

## 8. Copy deck and help list

### 8.1 Before and after (strings taken from the current demo)

| Where | Now | After |
|---|---|---|
| Panel · screening | "Scribe · speaker or phone on speaker · Read consent first. While you talk the panel shows only what the insurer still needs; it drafts the boxes when you hang up." | `☐ Consent read` and `[Record]` |
| Panel · screening | "1 Fill the boxes below and press Save Consumer. 2 Open Admission Screening… 3 Press Record…" | Stepper: `Fill · Record · Review` |
| Panel · daily note | "One or two sentences about what you did with M.R. today. Psyflo writes the note from it, the plan and your timer." | Placeholder in the box: `What happened?` |
| Panel · daily note | "The microphone uses the browser's speech recognition; nothing is recorded until you press Record." | `?` on the mic: `Nothing is recorded until you press Record.` |
| Panel · home | "Authorizations · where every request stands · 3 need action" tile | `Open Psyflo ↗` link in the header |
| Panel · home | "Who can see what" table | Deleted |
| Authorizations | "Receipt confirmed Oct 28 (C. Diaz called). Overdue notice citing the 7-day standard is ready for you to send." | Chip `Day 10 · follow-up`, button `[Open]` |
| Authorizations | Header button "Open a student in Lauris to draft a continued stay" | Deleted (the action is on the row) |
| Authorizations | `Demo only`, `Demo: receive a reply`, `Demo: advance the clock a day` | Presenter menu |
| Sidebar | "THE FOUR DOORS" and four items | Deleted |
| Partials | "Logged, not sent: 110 units recorded as awarded; about 8.2 units a week until Jan 30. Nothing goes to Sentara." | Toast: `Logged · 110 units` |
| Partials | Seven-row "Why insurers say no · what Psyflo checks before sending" table | Moved to Payer rules; checks live in the SRA panel |
| Denial card | "Only the guardian can appeal. Drafted for her: a one-page plain-language letter…" | `Denied · appeal window 51 days  [Guardian letter]` |
| Documentation | "Patterns to talk about this month" (four paragraphs) | Flags column, one line each |
| Documentation | Footnote "Notes behind and on time are counted from the notes the extension reports at Process Form…" | `?` on "Timely %" |
| Referral | "Missing before the screening call: 1. Schedule and grades… 2. Insurance details… 3… 4…" | Checklist rows with status icons |
| Family link card | Five rows each ending `not yet` | `Family link · 2 of 5 done` |
| Phone | "Your day so far: 8:05 Morning check-in, classroom 30 min · 9:50 In-class support…" (one paragraph) | Six rows |
| Analytics | "Source: Harvest's Lauris export · Oct 29 + master tracker" under invented numbers | `Sample data` |

### 8.2 The complete list of `?` help items

1. Panel legend: `Reads only the page you have open.`
2. Mic: `Nothing is recorded until you press Record.`
3. Submitted-request clock chip: `Harvest calls at day 10. Public rule: 7 days. Many payers take 14.`
4. Units chip: `1 unit 2–2.99 h · 2 units 3–4.99 h · 3 units 5 h or more.`
5. Pre-submission and documentation checks line: `Rules every draft must pass before you process it.`
6. Household detail (continued stay): `Family details stay out of payer text unless you include them.`
7. `Pending clinical approval` chip: `The clinical lead approves before the clinician signs.`
8. Eligibility proof: `Dated screenshot kept in Psyflo, not in Lauris.`
9. Documentation "Timely %": `Processed in Lauris within 24 hours of the session.`
10. School referral attachments: `The authorization request needs all three.`

---

## 9. Launch path first, the rest on a Roadmap page

Harvest's launch needs are notes, screening and intake capture, and referrals plus authorizations (NEXT-STEPS). Everything else is vision. Add `phase: 'now' | 'later'` to each entry in `web/js/registry.js`.

- **Now (in the main navigation):** phone 20 to 22; panel 13 to 18, 23 to 25, 33; Worklist, Authorizations (with the drawer), Referral, the five decision pages (34, 35, 36, 38, 39); Documentation; school referral 3 to 5; family link 8, 11, 12.
- **Later (reachable only from the presenter menu → Roadmap):** incident report 26; quarterly 32 and 48; discharge summary 37; the Analytics payer scorecard; parent survey, progress, letters and schedule 31, 47, 49, 50. The weekly (24) and monthly (25) notes are Now. Settings pages (Users and roles 43, Payer rules 40) are admin configuration, not roadmap: they stay in the avatar menu.
- **Roadmap page:** a grid of title-only tiles, each with a small `Later` chip and a link to a screen that already exists: Incident reports, Quarterly reports, Discharge summary, Payer scorecard, Parent progress, Insurance letters, Parent survey, Book a call. Title and one icon per tile; no descriptions. Do not add tiles or screens for payer audits, state licensing review or the day-school placement; they are not part of this demo.

---

## 10. Order of work, tests, and what "done" means

**Commit order** (each commit keeps tests green):
1. Tokens and shell: palette variables, type scale, `labels.js` (section 5.5), presenter menu, 4-item sidebar, header, footer line.
2. The `?` help component and the word-budget test.
3. Side panel: frame, then each view.
4. Psyflo app: Worklist, Authorizations with drawer, Referral, decision pages, Documentation, Analytics.
5. Phone and guardian/school pages.
6. Workflow logic (section 7) and seed config.
7. Roadmap page and `phase` flags.
8. `CHANGES.md`: per screen, words before and after, what was removed, what moved.

**Add `test/words.mjs`:** visit every registered screen (admin, 1440×900; phone and guardian screens 390×844); take `innerText` of `#root` (or the panel iframe body) after removing `[data-doc]` elements; fail above the section 3.1 budgets; print a table. Use `node test/smoke.mjs` as the pattern.

**Done means all of these:**
1. `npm test`, `node test/smoke.mjs`, `flowA.mjs`, `flowB.mjs`, `flowC.mjs`, `flowD.mjs`, `panels.mjs` pass; no console errors; no unwired anchors; no dead ends.
2. `node test/words.mjs` passes the budgets.
3. A contrast check on every text/background pair passes 4.5:1 (3:1 for large text and borders). No hex values outside section 4.1 appear in screens, panel CSS or the shell (add a lint).
4. Both data presets (live flows, canvas snapshot) render every kept screen without a crash.
5. Roles behave as in section 5.2: direct support sees phone, panel and its own Documentation row; supervisor sees Worklist and Documentation; clinician sees Worklist, Authorizations and Documentation; admin sees all plus Settings.
6. The rules in `docs/BRIEF.md` still hold. Grep for any copy that says something is "sent to Lauris", and confirm Process Form, Get Signature and Send are only ever pressed by a person.
7. Screenshots saved to `shots/` for every kept screen at 1440×900 (staff) and 390×844 (phone, guardian), plus the panel at 400 px.
8. The `?` count matches section 8.2 (10 items, no more than 3 per screen).
9. Menu, view, status and metric names in the Psyflo app and panel match section 5.5 and come only from `labels.js`. A grep of the app's strings for the old names ("Today", "Team", "Reports", "New students", "Needs me", "Draft ready") finds none. The phone app is exempt.

**Out of scope:** new features, new screens, server rules, the mock Lauris layout, any real integration.

---

### Sources

Harvest TDT Workflow Map (27 stages, updated 10 Nov) and the consolidated reference PDF; recordings and notes FC, DA, PW (29 Oct), PT, PD, DS (30 Oct), GR (2 Nov), N4P, N4D (4 Nov), N5 (5 Nov); the demo's own `docs/BRIEF.md`, `docs/product-direction.md`, `NEXT-STEPS.md` and `docs/CONTRACT.md`. Timestamps are minutes and seconds into each recording. The demo's own docs call the same recordings t1 to t9 (t1 = FC, t2 = DA, t3 = PW, t4 = PT, t5 = PD, t6 = DS, t7 = N4D, t8 = N4P, t9 = N5).
