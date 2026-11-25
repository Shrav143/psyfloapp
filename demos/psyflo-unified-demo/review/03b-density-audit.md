# 03b · Density audit (Part 18)

Nov 11, 2026 · Agent C · companion to `03-ux-audit.md` · no code edited.

Every number below came from Playwright DOM queries on the running demos (master Live preset on ports 4710 to 4712; v3 HTML opened by `file://`) unless tagged. Scripts and raw JSON are in the session scratchpad (`…/scratchpad/uxc/`: `lib.mjs` holds the counting function, `*-measure.json` the results); screenshots in `…/scratchpad/shots-uxc/`.

**Tags in the "Clicks" column.** [M] clicked with Playwright · [T] traced from controller code or `test/flow*.mjs` · [V] read from a screenshot. "not traced" means I did not click that path. **Demo** column: M = master, V = v3.

## Counting rule (stated once)

Scope: visible DOM (`checkVisibility`) inside the screen root, full page height (not only the first viewport). Roots: master `#root`; v3 the shadow root of the active host; master panel `#panel` inside its iframe; v3 panel `[data-psy="panel"]`. The master demo bar is excluded from every count and reported as "+8 bar" in the navigation column (its 8 controls: prev, picker, next, How it fits, How the data gets in, Mock Lauris, Switch user, Reset).

| Column | Rule |
|---|---|
| Primary nav choices | Persistent navigation links: master sidebar (role-filtered: clinician 11, admin 12, supervisor 6, direct support 5, portals and phone 0); v3 `.sb-i` + `.sb-small` (5). v3's top-bar controls (locality ×3, Read from Lauris, FLO, bell) are counted under actions, not here. Panel: header or quick-action buttons that switch task; demo-only role toggles shown separately |
| Visible actions | `button`, `a[href]`, `[data-go]`, `[data-act]`, `summary`, `[role=button]`, plus `input` (not hidden), `select`, `textarea`; excludes nav and bar; nested duplicates dropped. Shown as total (buttons and links + inputs) |
| Explanatory paragraphs | Leaf text blocks (`p`, `div`, `span`, `li`, `dd`) of 12 or more words (10 in the panel), not inside buttons, links, table cells, labels, headings or chips; "w" is the words in those blocks. Drafted content (a letter, a note) counts, which inflates InfoRequest and PeerBrief |
| Repeated labels | Occurrences beyond the first of identical control labels and heading strings (digits normalised); row-level buttons repeated per row count on purpose. The most repeated string is shown with its total occurrences |
| Cards above the main task | Outermost bordered, rounded (6 px or more), non-interactive containers of at least 110×36 px whose bottom edge is above the top of the anchor (table head, first row, draft, or primary action). † = no single anchor, so the figure is all cards on the screen. [V] = counted from the screenshot |
| Clicks, key task | The task is named in the cell; clicks from the role's first screen unless stated |
| Places one case identity repeats | The two most frequent case tokens (initials like `K.T.`, ids like `R-0408`) with the number of separate elements that carry them |

v3 states with the extension's work area open (Scan & Enhance, Scribe) replace the list; those rows describe the open work area.

## Measured counts, by surface

### Platform
| ID | Screen | Demo | Primary nav choices | Visible actions (buttons/links + inputs) | Explanatory paragraphs (words) | Repeated labels (extra occurrences) | Cards above the main task | Clicks, key task | Places one case identity repeats |
|---|---|---|---|---|---|---|---|---|---|
| P1 | My Work (master Do next, clinician) | M | 11 (+8 bar) | 19 (19+0) | 4 (60w) | 9 (open in lauris x5) | 0 | Open the most urgent item: **1** [M] | A.R.×2, D.W.×2 |
| P1 | My Work: no v3 counterpart (v3 `home` redirects to `auth-list`, `shell.js:123`) | V | — | — | — | — | — | — | — |
| P2 | Referrals queue | M | 11 (+8 bar) | 9 (9+0) | 0 (0w) | 3 (open x4) | 0 | Open REF-118: **2** via nav, 1 from My Work row [M] | REF-121×1, A.R.×1 |
| P3 | Referral case (REF-118) | M | 11 (+8 bar) | 8 (8+0) | 10 (225w) | 0 | 0 | Send the family link: **2** + scroll (button at y=1,189 px) [M] | REF-118×2, T.W.×1 |
| P4 | Eligibility (REF-118) | M | 11 (+8 bar) | 5 (5+0) | 2 (34w) | 0 | 7† | Record the DMAS result: **3** [T] | REF-118×1, T.W.×1 |
| P5 | Authorizations queue | M | 11 (+8 bar) | 32 (29+3) | 6 (87w) | 9 (history · # x7) | 0 | Open M.R. continued-stay draft: **2** from My Work [M] | M.R.×2, K.T.×1 |
| P5 | Authorizations queue (`auth-list`) | V | 5 | 32 (20+12) | 0 (0w) | 2 (ends in # days x3) | 2 | Open K.T. in Denial Intelligence: **1** [M]; v3 has no home, so +1 from its Lauris landing | K.T.×1, D.W.×1 |
| P6 | Authorization case / send page (R-0399 Sent) | M | 11 (+8 bar) | 3 (3+0) | 2 (29w) | 0 | 0 | Send the overdue notice: **2** from the queue [T] | A.L.×2 |
| P6 | Authorization case (`auth-detail` R-0411) | V | 5 | 13 (13+0) | 3 (40w) | 4 (open in lauris x5) | 1 | Review the draft: **2** from the queue [T] | M.R.×2 |
| P6 | Sent page (`sent` R-0399) | V | 5 | 8 (8+0) | 5 (88w) | 0 | 1 | Send the overdue notice: **2** [T] | A.L.×2 |
| P7 | Denial queue: no master counterpart (Partials is one case) | M | — | — | — | — | — | — | — |
| P7 | Denial Intelligence queue (`denials`) | V | 5 | 33 (23+10) | 0 (0w) | 0 | 1 | Open D.W.: **1** [M] | DI-408×1, K.T.×1 |
| P8 | Partial decision (master Partials, R-0402) | M | 11 (+8 bar) | 7 (7+0) | 14 (271w) | 0 | 0 | Log the Sentara decision: **3** from My Work [M] | D.W.×1, T.N.×1 |
| P8 | Denial case workspace (`di-case` R-0402) | V | 5 | 31 (31+0) | 2 (36w) | 0 | 2 | Accept 120 units: **5** from the tab (tab, DI-402, rail, Accept, confirm) [M] | D.W.×2, DI-402×1 |
| P8 | Options view (`partials` R-0402) | V | 5 | 24 (24+0) | 5 (94w) | 1 (select x2) | 5† | as above | D.W.×4, DI-402×1 |
| P9 | Information request (R-0408) | M | 11 (+8 bar) | 6 (6+0) | 14 (445w) | 0 | 0 | Send the Anthem reply: **3** (2 [M] + send [T]) | K.T.×6 |
| P9 | Information request (`info-request`) | V | 5 | 25 (24+1) | 2 (38w) | 0 | 4† | Send the reply: **5** (Open in DI, rail, Approve, Prepare, Simulate) [M/T] | K.T.×3, DI-408×1 |
| P10 | Peer-to-peer notes (R-0388) | M | 11 (+8 bar) | 10 (8+2) | 12 (324w) | 2 (change the call date x2) | 0 | Log the outcome: **2** from the queue [T] | T.N.×2 |
| P10 | Peer-to-peer script (`p2p-notes`) | V | 5 | 21 (21+0) | 3 (57w) | 0 | 4† | not traced | T.N.×2, DI-388×1 |
| P11 | Early discharge (D.W.) | M | 11 (+8 bar) | 3 (3+0) | 3 (68w) | 0 | 5 [V] | Set this plan: **1** on screen (3 to reach) [T] | D.W.×1 |
| P12 | Payer playbook | M | 11 (+8 bar) | 1 (1+0) | 17 (317w) | 0 | 2† | Read what Sentara tends to ask: **1** (nav) [M] | — |
| P13 | Analytics (one page) | M | 11 (+8 bar) | 8 (8+0) | 4 (70w) | 0 | 8 | Export: **2** (nav, Export; modal opens) [M] | M.R.×3 |
| P13 | Analytics · Patient Outcomes | V | 5 | 144 (135+9) | 18 (354w) | 68 (review documentation x35) | 5 | Export outcomes PDF: **4** (tab, Export Report, format, Generate) [M/T] | K.K.×1, L.O.×1 |
| P13 | Analytics · Payer Performance | V | 5 | 55 (46+9) | 15 (330w) | 4 (patient population x2) | 5 | Open a payer's detail: **3** [T] | — |
| P13 | Analytics · Patient Population | V | 5 | 51 (43+8) | 17 (350w) | 15 (mark as clinician confirmed x8) | 5 | not traced | — |
| P14 | Review queue (supervisor) | M | 6 (+8 bar) | 13 (13+0) | 8 (176w) | 2 (require approval x2) | 0 | Approve one note: **1** [M] | L.B.×4, N.K.×1 |
| P15 | Staff dashboard (direct support) | M | 5 (+8 bar) | 18 (10+8) | 6 (115w) | 5 (open in lauris x3) | 7 | Write the overdue D.P. note: **1** (opens Lauris) [T] | M.R.×5, E.S.×4 |
| P15 | Staff dashboard (supervisor) | M | 6 (+8 bar) | 8 (8+0) | 9 (263w) | 1 (# notes awaiting your approval x2) | 4† | See who is behind: **1** (nav) [T] | J.T.×2, D.P.×1 |
| P15 | Staff roster: no v3 platform counterpart (extension Overview, see X1) | V | — | — | — | — | — | — | — |
| P16 | Users & roles | M | 12 (+8 bar) | 8 (1+7) | 3 (77w) | 6 (select x7) | 2† | Change a role: **2** [T] | — |
| P16 | Settings · Roles tab | V | 5 | 62 (62+0) | 2 (32w) | 1 (view as x2) | 3† | Switch a feature off for a role: **3** [T] | — |

### Extension panel (400 px)
| ID | Screen | Demo | Primary nav choices | Visible actions (buttons/links + inputs) | Explanatory paragraphs (words) | Repeated labels (extra occurrences) | Cards above the main task | Clicks, key task | Places one case identity repeats |
|---|---|---|---|---|---|---|---|---|---|
| X1 | Home · direct support (`ExtHome`, khale) | M | 0 (+4 demo role toggles) | 14 (12+2) | 4 (61w) | 0 | 2† | Start a daily note: **2** [T] | M.R.×2, J.T.×1 |
| X1 | Home · direct support (consumers + panel, DSS) | V | 2 (Overview, Scribe) + footer Track time | 21 (21+0) | 3 (38w) | 0 | 1† | Start Scribe on the open page: **1** [M] | M.R.×2, T.N.×1 |
| X1 | Home · clinician (`ExtHome`, jperez, live) | M | 0 (+4 demo role toggles) | 37 (35+2) | 8 (116w) | 5 (new consumer from this referral x3) | 4† | Start a new consumer from REF-118: **1** [T] | K.T.×2, J.O.×2 |
| X1 | Home · clinician (consumers + panel, LCS) | V | 3 (Overview, Scribe, Scan & Enhance) + footer Track time | 21 (21+0) | 0 (0w) | 0 | 0† | Open the roster's first action: **1** [M] | K.T.×1, S.B.×1 |
| X1 | Home · supervisor / admin (`ExtHome`) | M | 0 (+4 demo role toggles) | 30 (28+2) | 4 (60w) | 1 (start x2) | 2† | — | K.T.×2, J.O.×2 |
| X2 | Daily note · direct support (`ExtDPN`) | M | 0 | 6 (5+1) | 4 (62w) | 0 | 1† | Dictation to processed note: **2** in panel + Lauris (Confirm 3 units, Process Form), plus 3 phone taps [T, `test/flowB.mjs`] | M.R.×2 |
| X2 | Daily note · direct support (DPN + panel, DSS) | V | 3 | 20 (20+0) | 3 (38w) | 3 (#/#/# x3) | 3† | Scribe, record, stop, review, confirm, Process Form: **~6** [T] | M.R.×3 |
| X2 | Scribe session open (DSS) | V | 1 | 8 (8+0) | 1 (14w) | 0 | 0† | — | M.R.×4 |
| X3 | Weekly guardian call (`ExtWeekly`) | M | 0 | 3 (3+0) | 3 (36w) | 0 | 1† | Fill 4 boxes: **1** [T] | M.R.×1 |
| X3 | Monthly collateral (`ExtMonthly`) | M | 0 | 3 (3+0) | 4 (46w) | 0 | 1† | Fill 3 boxes: **1** [T] | M.R.×1 |
| X4 | Admission screening (`ExtScreening`, T.W.) | M | 0 | 3 (3+0) | 5 (100w) | 0 | 2† | Record, Stop, Fill: **3** (+ Process Form) [T, `test/flowA.mjs`] | — |
| X4 | Admission screening (`lauris-screening`) | V | 3 | 43 (39+4) | 15 (622w) | 19 (accept x7) | 8† | not traced | T.W.×4 |
| X5 | Intake / CNA (`ExtCNA`) | M | 0 | 3 (3+0) | 14 (226w) | 0 | 1† | Fill 15 boxes: **1** [T] | T.W.×1 |
| X5 | Intake / CNA (`lauris-cna`) | V | 3 | 41 (36+5) | 11 (350w) | 17 (accept x7) | 8† | not traced | T.W.×2 |
| X6 | Treatment plan (`ExtISP`) | M | 0 | 3 (3+0) | 12 (183w) | 0 | 2† | Fill the 3 goals: **1** [T] | T.W.×2 |
| X6 | Treatment plan (`lauris-isp`) | V | 3 | 17 (17+0) | 7 (82w) | 0 | 2† | not traced | T.W.×1, M.R.×1 |
| X7 | Initial SRA (`ExtSRA`) | M | 0 | 3 (2+1) | 19 (289w) | 0 | 2† | Fill all 7 boxes: **1** [T] | T.W.×3 |
| X7 | Initial SRA · Scan & Enhance result (T.W.) | V | 4 | 78 (75+3) | 36 (796w) | 51 (accept x14) | 15† | Accept one recommendation: **1** each ×14; "Accept all": 1 [M] | T.W.×6 |
| X8 | Continued stay (`ExtCase`, M.R.) | M | 0 | 7 (7+0) | 8 (205w) | 0 | 4† | Fill the 6 yellow boxes: **1** (+ period, Include/Exclude) [T] | M.R.×3 |
| X8 | Continued SRA · focus workspace (M.R.) | V | 2 | 90 (88+2) | 56 (1269w) | 39 (accept x12) | 13† | — | M.R.×13 |
| X9 | Sign-off (`ExtSignOff`) | M | 0 | 6 (6+0) | 4 (55w) | 5 (open x6) | 1† | Open a form: **1**; Get Signature is a human click in Lauris | J.T.×1, D.P.×1 |
| X9 | Forms to Approve (`lauris-forms`) | V | 3 | 21 (21+0) | 0 (0w) | 0 | 0† | same | K.T.×1, S.B.×1 |
| X10 | Track Time (card on `ExtHome`) | M | 0 (+4 demo role toggles) | 14 (12+2) | 4 (61w) | 0 | 2† | Start a timer: **2**; stop: 1 [T] | M.R.×2, J.T.×1 |
| X10 | Track Time open (footer control + entry) | V | 2 | 24 (24+0) | 2 (29w) | 3 (#/#/# x3) | 4† | Start: **1** [M]; stop: 1; Save entry: 1 | M.R.×4 |
| X11 | Scan & Enhance on a daily note | V | 4 | 12 (10+2) | 0 (0w) | 1 (select x2) | 1† | Choose Scribe or scan: **1** | M.R.×3 |
| X12 | Incident report (`ExtIncident`) | M | 0 | 3 (3+0) | 5 (62w) | 0 | 1† | Fill 6 boxes: **1** [T] | D.W.×2 |
| X12 | Quarterly report (`ExtQuarterly`) | M | 0 | 8 (4+4) | 7 (134w) | 0 | 2† | Fill 6 boxes: **1** [T] | M.R.×2 |
| X12 | Discharge summary (`ExtDischarge`) | M | 0 | 3 (3+0) | 4 (47w) | 0 | 0† | Fill 6 boxes: **1** [T] | D.W.×2 |

### Mobile staff (390 px)
| ID | Screen | Demo | Primary nav choices | Visible actions (buttons/links + inputs) | Explanatory paragraphs (words) | Repeated labels (extra occurrences) | Cards above the main task | Clicks, key task | Places one case identity repeats |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Mobile home (`MobileApp`) | M | 0 (+8 bar in 3 rows, 132 px) | 12 (12+0) | 1 (53w) | 0 | 1 | Start a timer for M.R.: **2** [T] | M.R.×4, J.T.×1 |
| M2 | Say what happened (`MobileDictate`) | M | 0 (+8 bar in 3 rows, 132 px) | 6 (5+1) | 0 (0w) | 0 | 1† | Save a dictation: **3** (Speak/type, Looks right, Done) [T] | M.R.×1 |
| M3 | Assessments (`MobileAssess`) | M | 0 (+8 bar in 3 rows, 132 px) | 4 (4+0) | 1 (12w) | 0 | 3† | Start a SUDS check: **1** [T] | A.G.×2, E.S.×2 |
| M1–M3 | v3 has no phone surface | V | — | — | — | — | — | — | — |

### Family portal (390 px)
| ID | Screen | Demo | Primary nav choices | Visible actions (buttons/links + inputs) | Explanatory paragraphs (words) | Repeated labels (extra occurrences) | Cards above the main task | Clicks, key task | Places one case identity repeats |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Family link, 5 steps (`FamilyLink`) | M | 0 (+8 bar in 3 rows, 132 px) | 9 (3+6) | 2 (26w) | 0 | 0† | Submit the link: **6** (5 Next + Submit) [T] | — |
| F2 | Parent signs (`ParentSign`) | M | 0 (+8 bar in 3 rows, 132 px) | 4 (4+0) | 2 (73w) | 0 | 3† | Sign: **2** [T] | — |
| F3 | Parent portal home (`ParentPortal`) | M | 0 (+8 bar in 3 rows, 132 px) | 8 (8+0) | 1 (12w) | 0 | 0 | Open the consent: **1** [M] | — |
| F4 | Enrollment packet (`ParentEnroll`) | M | 0 (+8 bar in 3 rows, 132 px) | 18 (12+6) | 1 (25w) | 0 | 7† | Finish 7 items: **7+** [T] | — |
| F5 | Progress (`ParentProgress`) | M | 0 (+8 bar in 3 rows, 132 px) | 6 (6+0) | 1 (23w) | 0 | 2† | — | — |
| F6 | Quarterly report, guardian signs (`ParentQuarterly`) | M | 0 (+8 bar in 3 rows, 132 px) | 7 (7+0) | 3 (104w) | 0 | 5† | Sign: **2** [T] | M.R.×4 |
| F7 | Insurance letters (`ParentLetters`) | M | 0 (+8 bar in 3 rows, 132 px) | 5 (5+0) | 7 (112w) | 0 | 2† | Read a letter: **1** [T] | — |
| F8 | Book a call (`ParentSchedule`) | M | 0 (+8 bar in 3 rows, 132 px) | 4 (4+0) | 2 (25w) | 0 | 1† | Book: **2** [T] | — |
| F9 | Survey (`ParentSurvey`) | M | 0 (+8 bar in 3 rows, 132 px) | 12 (2+10) | 1 (16w) | 0 | 0† | Submit: **4** [T] | — |
| F10 | Appeal letter (`AppealLetter`) | M | 0 (+8 bar in 3 rows, 132 px) | 4 (4+0) | 3 (74w) | 0 | 3† | Sign and send: **1** (+ optional edit) [T] | — |
| F0 | Family-link questions (v3 `family-settings`, an admin page, not a guardian screen) | V | 5 | 28 (28+0) | 2 (48w) | 0 | 3† | Toggle a question: **1** [T] | — |

### School portal (desktop)
| ID | Screen | Demo | Primary nav choices | Visible actions (buttons/links + inputs) | Explanatory paragraphs (words) | Repeated labels (extra occurrences) | Cards above the main task | Clicks, key task | Places one case identity repeats |
|---|---|---|---|---|---|---|---|---|---|
| S1 | School portal home (`SchoolPortal`) | M | 0 (+8 bar) | 17 (14+3) | 7 (156w) | 8 (view x9) | 0 | Start a referral: **1** [T] | T.W.×1, N.P.×1 |
| S2 | Referral form (`ReferralForm`) | M | 0 (+8 bar) | 52 (3+49) | 2 (27w) | 0 | 1† | Submit a referral: **1** after 49 fields [T] | — |
| S3 | Referral sent (`ReferralSent`) | M | not measured (needs a just-submitted referral) | — | — | — | — | — | — |
| S1–S3 | v3 has no school portal | V | — | — | — | — | — | — | — |
## Proposed targets and reduction plan

Targets are ceilings I would test against, not promises. Priority tags: **MUST** / **SHOULD** / **COULD**. Row IDs match the measured tables.

### Platform targets

Global: persistent nav for a clinician 19 (11 sidebar + 8 bar) → **7** (6 rail items + a Presenter handle) · tab stops before main content 20 → **≤9** with a skip link (MUST) · presenter bar out of the product viewport (MUST).

| ID | Nav | Actions | Prose blocks | Repeats | Cards above | Clicks | Reduction plan |
|---|---|---|---|---|---|---|---|
| P1 | 6 | ≤12 | ≤1 | ≤2 | 0 | 1 | MUST. Group Today / This week / Waiting on others; show the top 3 with item-specific verbs ("Review draft", "Write note", "Send reply") in place of 5 identical "Open in Lauris"; "Show all 7"; no greeting paragraph |
| P2 | 6 | ≤8 | 0 | ≤1 | 0 | 1 from My Work | SHOULD. Status chips plus queue; "From schools this year" table moves to Analytics · Population |
| P3 | 6 | ≤8 | ≤2 | 0 | 0 | 2, no scroll | MUST. State-driven primary in the header (Send family link, Book call, Open in Lauris); criteria panel becomes an accordion "2 criteria needed · 1 shown" with one line per criterion and an Open source button; "Missing before the screening call" becomes a "3 missing" chip that expands |
| P4 | 6 | ≤6 | ≤1 | 0 | 0 | 2 | MUST. Panel inside P3 (not a route); visible "Simulated" chip on the DMAS lookup; three-state checklist (received, check run, result recorded with date and source) |
| P5 | 6 | ≤22 | 0 | ≤3 | 0 | 1 from My Work, 2 from nav | MUST. 7 chips + search + "More filters" popover; one primary plus overflow per row; "History · n" becomes a row drawer; the sentence-length header button becomes "Prepare continued stay ▾" |
| P6 | 6 | ≤12 | ≤1 | ≤2 | ≤1 | 2 | MUST. CaseShell: stage shown once (header chip), Next step panel, Timeline with latest event first, accordions Documents / Evidence / Units / Payer / Tasks. v3 pages show the case across 8 cards at once; keep 3 open |
| P7 | 6 | ≤24 | 0 | 0 | 0 | 1 | MUST. v3 queue columns exactly per Part 8.1; 10 dropdowns become 3 chips + More; date range into a popover |
| P8 | 6 | ≤18 | ≤1 | ≤1 | ≤1 | 3 | MUST. Sections Decision · Evidence · Options · Action · History replace stepper + rail + 7-step list; only valid options, each with deadline and verification chip; v3's 5-click decision drops to 3 |
| P9 | 6 | ≤8 | ≤4 | 0 | 0 | 2 | MUST. One header button; "What Anthem asked" collapsed to a quote with "Show request"; the letter preview collapses after 6 lines with source chips; K.T. appears once in the header |
| P10 | 6 | ≤10 | ≤5 | 0 | 0 | 2 | SHOULD. Talking points as editable bullets; payer questions in an accordion; one "Change the call date" |
| P11 | 6 | ≤4 | ≤2 | 0 | 0 | 1 | SHOULD. Plan timeline with three key dates inline; basis chip "3 units/day · no holiday calendar · unverified" (Part 15.5) |
| P12 | 6 | ≤8 | ≤3 | 0 | 0 | 1 | SHOULD. Payer drawer reachable from any case and from Analytics · Payer Performance; cells become chips; "Rules Psyflo applies to every draft" moves to Settings |
| P13 | 6 | ≤40 per section | ≤4 | ≤6 | ≤2 (dataset banner + filter bar) | 3 | MUST. StatStrip of at most 6 chips; row click opens a drawer, so 35 "Review documentation" buttons go; one definition per metric behind an info popover; v3's 144 actions → ≤40 |
| P14 | 3 | ≤10 | ≤2 | 0 | 0 | 1 | SHOULD. The 27-word rule becomes an info popover; "Who needs approval" moves to the Team tab |
| P15 | 1 to 3 | ≤12 | ≤2 | ≤1 | 1 | 1 | SHOULD. One "Next up" card, one progress line; daily-note status shown once instead of five times; goals collapsed |
| P16 | 6 | ≤8 | ≤2 | ≤2 | 0 | 2 | SHOULD. Fix the breadcrumb (Settings · People); permission matrix as a drawer |

### Extension panel targets (400 px)

Global: no role toggles in product UI (4 today on home) → 0 (MUST) · three action buttons (Scribe, Track Time, Scan & Enhance where permitted) · ≤2 screens of scroll (≤1,500 px; clinician home today 2,083 px, v3 SRA scan 6,550 px) (MUST) · text floor 13 px.

| ID | Nav | Actions | Prose blocks | Repeats | Cards | Clicks | Reduction plan |
|---|---|---|---|---|---|---|---|
| X1 DS | 3 buttons | ≤8 | ≤1 | 0 | ≤1 | 1 | MUST. Next-task card; Recent activity collapsed; "Daily note" preselected from the open Lauris form |
| X1 clinician | 3 buttons | ≤10 | ≤2 | ≤1 | ≤1 | 1 | MUST. 3 referral cards and 2 school updates become one "5 to review" row opening a sheet; 37 actions → ≤10; scroll ≤1,200 px |
| X1 supervisor/admin | 3 | ≤8 | ≤1 | 0 | ≤1 | 1 | SHOULD. Same shell; admin sees no clinical text |
| X2 | 3 | ≤6 | ≤2 | 0 | ≤1 | 2 | MUST. Keep Record, Draft, Confirm units; keep the one-line mic privacy statement; keep "The afternoon block didn't happen" visible as a secondary button (it is an integrity control) |
| X3 | 3 | ≤4 | ≤2 | 0 | ≤1 | 1 | SHOULD. Show "Recording" only while recording (seeded banner reads as live) |
| X4 | 3 | ≤6 | ≤2 | 0 | ≤1 | 3 | MUST. Remove "The scripted call is the acceptance test in seed/scripts" from product copy; show only unanswered questions while recording (Part 9.2) |
| X5 / X6 | 3 | ≤6 | ≤4 | 0 | ≤1 | 1 | SHOULD. Field rows with the reason on expand; "Still to ask" stays |
| X7 | 3 | ≤6 | ≤5 | 0 | ≤2 | 1 | MUST. 7 check sentences become "7 of 7 pass ▾"; sources as chips with popovers |
| X8 | 3 | ≤8 | ≤5 | 0 | ≤3 | 1 | MUST. Sources table becomes chips; keep the Include / Exclude disclosure toggle; add Mode B evidence index |
| X9 | 3 | ≤6 | ≤2 | 0 | ≤1 | 1 | COULD. "open" chip links (28 px tall) become full-width rows |
| X10 | 3 | ≤8 | ≤1 | 0 | ≤1 | 1 | MUST. Footer timer as v3; Recorded / Direct / Documented / Billable as four figures; manual correction kept |
| X11 | 3 | ≤24 per screen | ≤4 | ≤2 | ≤2 | 1 | MUST. One recommendation open at a time; "3 of 14 reviewed"; no Accept all; compare in a sheet; ≤2,000 px |
| X12 | 3 | ≤6 | ≤3 | 0 | ≤1 | 1 | COULD. Banner on home while an incident clock runs |

### Mobile staff targets (390 px)

Global: demo bar 132 px in 3 rows (15.6% of the viewport) → 28 px handle (MUST).

| ID | Nav | Actions | Prose blocks | Repeats | Cards | Clicks | Reduction plan |
|---|---|---|---|---|---|---|---|
| M1 | 0 | ≤8 | 0 | 0 | ≤2 | 2 | MUST. My Students, Current Activity, Say What Happened only; "Your day so far" paragraph (53 words of times joined by "·") becomes a 5-row list; remove "runs with the screen locked"; add PatientBar and a state chip (Draft · Waiting for Lauris · Processed) |
| M2 | 0 | ≤6 | 0 | 0 | ≤1 | 3 | MUST. Confirm-student step before saving; bigger Speak target; explicit mic-denied state |
| M3 | 0 | ≤4 | 0 | 0 | ≤3 | 1 | SHOULD. Keep; targets 48 px |

### Family portal targets (390 px)

Global: bar 132 px → handle; semantic `h1/h2`; every target ≥44 px; body 16 px (MUST).

| ID | Nav | Actions | Prose blocks | Repeats | Cards | Clicks | Reduction plan |
|---|---|---|---|---|---|---|---|
| F1 | 0 | ≤9 | ≤1 | 0 | 0 | 6 | SHOULD. Keep five steps; add "step 2 of 5"; radios become full-width rows (18 px inputs today) |
| F2 / F6 | 0 | ≤4 | ≤2 | 0 | ≤1 | 2 | MUST. Signature-policy chip (remote allowed, in person required, pending, completed); "Type your name" alternative |
| F3 | 0 | ≤6 | ≤1 | 0 | ≤3 | 1 | MUST. Checklist home "3 of 7 done"; language toggle 44 px |
| F4 | 0 | ≤10 per screen | ≤1 | 0 | ≤1 | 7 | MUST. One item per screen; progress counted |
| F5 | 0 | ≤4 | ≤1 | 0 | ≤2 | 1 | COULD. Proposed badge in presenter overlay [E 3l] |
| F7 | 0 | ≤4 | ≤3 | 0 | ≤2 | 1 | SHOULD. 7 paragraphs (112 words) become What this says · What you can do · By when, with the date's verification status |
| F8 / F9 | 0 | ≤8 | ≤1 | 0 | ≤1 | 2 / 4 | COULD. Survey: one question per screen |
| F10 | 0 | ≤4 | ≤2 | 0 | ≤2 | 1 | MUST. "Who files" shown with a verified or not-verified chip; links ≥44 px (16 to 18 px today) |
| F0 (v3 admin) | — | — | — | — | — | — | Port as Settings · Family link (SHOULD); not a guardian screen |

### School portal targets (desktop)

| ID | Nav | Actions | Prose blocks | Repeats | Cards | Clicks | Reduction plan |
|---|---|---|---|---|---|---|---|
| S1 | 0 | ≤12 | ≤3 | ≤2 | ≤2 | 1 | SHOULD. A "Harvest needs" card (missing information) above the list; "View" ×9 becomes row click; school sees status text only |
| S2 | 0 | ≤14 visible | ≤1 | 0 | 0 | 1 | SHOULD. 49 inputs in 4 sections, required fields first, "Save and finish later" kept; checkboxes ≥24 px (20 px today) |
| S3 | — | — | — | — | — | — | Not measured; check after redesign |

## Totals

| Measure | Master today | v3 today | Target |
|---|---|---|---|
| Persistent nav controls, clinician | 19 (11 + 8 bar) | 6 (5 + Presenter) | 7 |
| Visible actions, 15 master platform screens | 150 (avg 10.0) | 11 v3 screens: 437 (avg 39.7) | master avg ≤10 on pages, queues ≤24, analytics ≤40 |
| Explanatory blocks, 15 master platform screens | 105 (avg 7.0), 2,298 words | 11 v3 screens: 70, 1,387 words (queues and cases: 5 blocks) | avg ≤2.5, ≤800 words |
| Repeated labels, 15 master platform screens | 36 | v3 Analytics outcomes alone: 68 | ≤12 |
| Panel actions, 18 master states | 201 (avg 11.2; clinician home 37) | 17 v3 states: Scan & Enhance results 78 to 133 | home ≤10; review screens ≤24 |
| Panel scroll height | 1,395 px average, clinician home 2,083 | SRA scan 6,550 | ≤1,500 |
| Presenter chrome inside product UI | 4 role toggles + 2 Demo buttons + 8-control bar (132 px on phone) | Presenter pill inside the browser frame | 0 (dock outside the viewport) |
| Family and mobile phone screens | 13 screens, 99 actions, 0 headings on the 6 probed | no counterpart | headings on all; targets ≥44 px |

## What the numbers say

1. The master's pages are short on actions (average 10) but heavy on reading (7 blocks, 2,298 words across 15 screens). The fix is states and chips in place of paragraphs, not fewer controls.
2. v3's queues and case pages are the quietest screens in either demo (0 paragraphs on both queues). Its Analytics tabs are the loudest (144, 55 and 51 actions; 354, 330 and 350 words of explanation).
3. The master panel is lean per form (3 to 8 actions) and heavy at home for a clinician (37 actions, 2,083 px). v3's panel is lean at home (21) and extreme in review (78 to 133 actions, up to 6,550 px). The unified panel takes the master's per-form leanness and v3's review card, one card open at a time.
4. The phone and portal screens are not dense. Their problems are chrome (a 132 px bar), 16 to 27 px targets, and no heading structure.
5. Counts that dropped to zero in the target are not removed features: Referrals, Eligibility, Payer playbook, History, drafting rules and every Ext form stay reachable (drawers, accordions, Settings, "More filters").
