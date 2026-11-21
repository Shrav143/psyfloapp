# Psyflo × Harvest · full-vision demo (v2: simpler, RCM names, workflow-true)

**v2 (Nov 11)** applies the design prompt in `docs/DESIGN-PROMPT-v2.md`: about 70% fewer words on screen, a four-item menu (Worklist · Authorizations · Documentation · Analytics), RCM terminology from one file (`web/js/shared/labels.js`), `?` hover tips instead of explanatory text, demo controls moved into the presenter menu (the ⋯ button, or `Shift+P`), and seven workflow changes (decision clock, clinical approval, weekly eligibility re-verification, post-intake clocks, unit bands, referral consent, sample-data labels). See `CHANGES.md`. The screen numbers below are the original canvas numbers.

A working demo of the whole Psyflo vision for Harvest Outreach Center, built from the handoff bundle (`docs/BRIEF.md`): the canvas screens (less those dropped after the Nov 7 and Nov 8 product calls: 10 family link settings, 30 teacher check-in, 41 compliance, 44 migration, 45 library) plus family-portal screens 46–50 on one shared dataset, a mock Lauris, the Lauris extension panel (as a real MV3 side-panel extension and as an in-page fallback), the phone app and the parent and school portals. **Synthetic data only — nothing is real.**

## Run it

Needs Node 20+ and nothing else (no npm install).

```bash
npm start
```

| Origin | What |
| --- | --- |
| http://localhost:4000 | Psyflo app, portals, phone app, extension panel, API |
| http://localhost:4001 | Mock Lauris Online (any seed staff id signs in: `jperez`, `khale`, `cdiaz`, `slane`, `rowens`, `dowens`) |
| http://localhost:4002 | Mock Availity, UHC portal, state incident portal, DMAS lookup |

Ports: `APP_PORT`, `LAURIS_PORT`, `EXT_PORT`; data lives in `data/` (or `DATA_DIR`). If the app is reached through another host name, set `PSYFLO_APP_URL`, `LAURIS_URL` and `EXT_URL`.

**Reset** from the presenter menu (⋯ → “Reset…”) or `npm run reset`:
- **Live flows** (default): T.W. is rewound to the moment the school referred him (Oct 13), so Flows D → A → C build his story in front of the audience. Everything else is the Oct 29 seed.
- **Canvas snapshot**: Oct 29 exactly as the design canvas shows it (T.W.'s request already sent, decision due today).

## Sign in

Open http://localhost:4000, pick a role card (or type a seed email). Each role lands on its first screen and the sidebar and screen picker hide what the role cannot see:

| Role | Seed user | Lands on |
| --- | --- | --- |
| Direct support | Kayla Hale (`khale`) | Extension home (laptop) or the phone app (phone-sized window) |
| Supervisor | Carla Diaz (`cdiaz`) | Worklist (notes awaiting her review) |
| Clinician | Jordan Perez (`jperez`) | Worklist |
| Admin | Dana Owens (`dowens`) | Worklist (+ Settings in the avatar menu, demo-only controls in the presenter menu) |

Below the role cards, **Family portal** and **School counselor** open the portals directly (families normally arrive by a texted link, counselors by their own school login). The school portal is referral-only; there is no teacher portal.

The presenter menu (⋯ in the sidebar footer, or bottom-left on portal, phone and Lauris screens; `Shift+P`) holds the screen picker, switch user, reset, the mock Lauris, “How the data gets in” (the note for each screen), “How it fits”, the Roadmap, the example dictation and scripted call, and, for the admin, “Demo: receive a reply” and “Demo: advance a day”. Nothing else about the demo shows inside the product.

## The extension

The panel is one page (`web/panel/`) that talks to a page bridge (`web/panel/bridge.js`) on the Lauris page. Two ways to run it, same code:

1. **In-page fallback (no install):** the mock Lauris shows the panel at 400px on the right (toggle with the “psyflo · on” chip). Extension screens in the app (13–18, 23–26, 32, 33, 37) open as this composite.
2. **Real side panel:** Chrome → `chrome://extensions` → Developer mode → *Load unpacked* → `extension/`. Open the mock Lauris, click the toolbar icon. The in-page panel hides itself when the extension is present. (`extension/bridge.js` is copied from `web/panel/bridge.js` each time the server starts.)

The bridge reads only the open page, finds boxes by **label text**, types only when you press a button, and never presses Process Form, Get Signature or Send. It reports what it sees a person do (Process Form, Get Signature, Reject, create a consumer, a portal confirmation) to Psyflo's own tracker. Psyflo's store (`server/psyflo`) and Lauris's (`server/lauris`) are separate modules; Psyflo never reads Lauris data.

## The live flows (demo script)

Reset to **Live flows** first. Lauris and the app can sit side by side; every app tab updates live.

**Flow D · family link (8 → 9 → 11 → 12).** Sign in as Jordan → Referrals → REF-118 → *Send the family link*. The stubbed SMS shows the link; open it in a phone-sized window (or the phone frame). Walk the five steps; on insurance pick *Medicaid through a health plan*, type any ID. Submit → the Eligibility screen flips to “details received — run the check”. Open the DMAS lookup (mock), then record *active · Humana*; the referral's chip updates. Then Parent signs → sign with a finger → Parent portal shows the consent done.

**Flow A · screening fills the Lauris form (7 → 14 → 15).** In the mock Lauris (`/consumers/new?referral=REF-118`, or Referral review → *Open in Lauris*): the panel offers *Fill boxes* from the referral → *Save Consumer* → *Open Admission Screening*. Six boxes from the referral and family link drop in yellow. Press *Record (microphone)* and read `seed/scripts/screening_TW.md` aloud, or *Play the scripted call*. While recording, only “Before you hang up” shows; prompts tick as answers are heard. *Stop* → 11 boxes drafted (6 before + 11 + 2 left for you = 19), narrative last, every box with its sources and the drafting checks. *Fill* → edit one box → *Process Form*: the 30-day clock starts. *Open the intake (CNA)*: presenting issue and prior services arrive labelled “copied from screening”.

**Flow B · say what happened → daily note (20 → 21 → 23).** On the phone as Kayla: M.R.'s timer is running; *Say what happened*, speak one sentence (or use the example), *Looks right*. On the laptop open M.R. → Daily Progress Note in Lauris (as `khale`): “1 dictation waiting” drops the narrative, contact-time rows, mood and progress in, yellow, with “What Psyflo added, and where it came from”. *Confirm 3 units* → *Process Form*. Staff dashboard: Daily notes today 4 of 6 → 5 of 6.

**Flow C · draft, sign, send, track (17 → 18 → 19 → 29).** (After Flow A.) In Lauris open T.W.'s ISP → *Fill the 3 goals* → *Process Form* (Psyflo drafts R-0416). *Open the initial request (SRA)*: criterion 1 is editable in the panel; *Fill all 7 boxes* (criterion 3 left blank because 1 and 2 are met; trauma-informed care left to you) → *Process Form* → *Open Forms to Approve* → the SRA → *Get Signature*: Psyflo saves the signed preview as a real PDF and assembles the packet → *After signing: open Send* → *Send*: the Sfax stub returns a reference and delivery receipt in ~3 s and the timeline gains both events. Authorizations shows Submitted with its decision date; as admin use *Demo: receive a reply → partial* and the row moves to *Partial — decide*; Partials shows the four doors.

**Flow E · clinical approval (29).** (After Flow C's Process Form.) The request reads *Pending clinical approval* in Authorizations and on the panel's status line. As the clinical lead (admin or clinician) open the row → *Approve* (the `?` explains it); the request moves to *Pending signature*. A person still presses Get Signature in Lauris, then *Send by fax* in the drawer.

**Flow F · eligibility re-verification (2 → 9).** Worklist → “12 due · Eligibility re-verification” → *Start*. *Verify* opens the mock DMAS lookup in a new tab; record the result and attach the screenshot; the next check is set seven days out and the Worklist count drops.

**Flow G · payer follow-up (2 → 29).** A request at day 10 shows *Day 10 · follow-up* on the Worklist. Open it → *Log call* → pick what the payer said. “Fax not found” brings the row back with *Resend*; the other outcomes move it to “Awaiting response”. Past day 14 it reads *Overdue*.

## Real vs stubbed

| Capability | In this build |
| --- | --- |
| Speech to text | Real in Chrome via the Web Speech API (screening and phone dictation); the scripted transcript is the fallback and the acceptance test |
| Drafting / enhancement | `draft(formType, sources)` in `web/js/shared/draft.js`: deterministic extractors over the transcript, dictation and record, with every box carrying numbered sources. The 14 drafting rules run as explicit pass/fail checks shown in the panel. No LLM is called; a hosted model can sit behind the same function and the checks still gate it |
| Fax (Sfax) | Stub: reference + delivery receipt after 3 s; receipt stored as a PDF |
| SMS | Stub: message and link shown on screen and logged |
| Availity / UHC portal | One-page mocks; Send opens them in the clinician's own session; the extension reads the confirmation number |
| DMAS eligibility | Not automated: a mock lookup page a person reads, and the Eligibility screen where a person records the result |
| Signed PDFs | Real PDFs generated from the Lauris preview (`server/pdf.js`, no dependencies), consents and appeal letters with the finger signature |
| Lauris export / import | Seeded; the Migration screen was dropped (Nov 7): start with the ~55 active clients by a daily export/import until a better path exists |
| Payer replies, clock | Demo-only controls on Authorizations, admin only, labelled “Demo” |

## Tests

```bash
npm test                      # drafting acceptance tests from seed/scripts (Flows A and B, SRA rules)
node test/smoke.mjs           # renders every registered screen headless; reports console errors and unwired links (AS=khale|cdiaz|jperez|dowens)
node test/flowA.mjs && node test/flowC.mjs   # Flow A then Flow C through the mock Lauris and the in-page panel
node test/flowB.mjs           # Flow B
node test/panels.mjs          # every panel view
```
```bash
node test/flowD.mjs           # referral consent, family link on the phone, phone dictation and assessments
node test/flowE.mjs           # clinical approval → signature → Send by fax from the Authorizations drawer
node test/flowF.mjs           # weekly eligibility re-verification from the Worklist
node test/flowG.mjs           # day-10 payer follow-up call, then resend
node test/decisions.mjs       # additional info, partial approval (all three choices), P2P, early discharge, appeal
node test/docs-analytics.mjs  # Documentation, Chart review, Analytics, Payer scorecard, Roadmap
node test/words.mjs           # word budgets per screen (150 app, 120 Worklist, 100 panel, 60 phone, 70 guardian)
node test/lint.mjs            # palette and retired-name lint
node test/all-flows.mjs       # every flow test in order (BASE=http://localhost:4000)
BASE=http://localhost:4000 OUT=./shots node test/shots.mjs   # screenshots of every screen and key state
```
(The browser tests use the Playwright preinstalled in this environment; set `PW=/path/to/playwright` elsewhere.)

## Layout

```
server/        index.js (3 ports) · pdf.js · psyflo/ (store + actions) · lauris/ (mock Lauris) · external/ (portal mocks)
web/           index.html + js/app.js (shell) · js/runtime.js (renders the .dc.html canvas screens) · js/screens/* (one controller per screen)
web/screens/   the canvas screens (visual source of truth) and the family screens 46–50, used as live templates
web/panel/     the extension panel + page bridge
extension/     MV3 side-panel extension
seed/          seed.json (the dataset), extra/*.json (additions), scripts/ (worked examples), notes.md
docs/          BRIEF.md, CONTRACT.md (how screens are wired), product-direction.md, storyboard.html (the original clickable storyboard)
```

## Open questions carried from the brief

- **Early discharge dates:** at 3 units per school day, D.W.'s 110 units from Oct 29 run out Dec 18, so the Early discharge screen computes discharge Dec 18 / intake Dec 21. The canvas and brief say Dec 9 / Dec 5 / Dec 8; the seeded discharge-summary panel keeps the canvas dates. Needs a holiday calendar or a different units start from Harvest to reconcile.
- **Decision due date:** in the live preset R-0416 is sent today, so its decision is due Nov 5 (sent + 7 days); in the canvas snapshot it is due Oct 29 as in the brief.
- Seed calendar slips: REF-117's "Fri Oct 31" (Oct 31, 2026 is a Saturday); "Tue Dec 9" is a Wednesday.

Lauris field labels are our best reading (the extension maps by label text, so corrections are cheap; see `server/lauris/forms.js`). Whether Lauris copies ISP goals into the SRA (the mock does, as green boxes). The scripted call says Piedmont was “last spring” while the expected output says Mar–Jun 2025; the demo follows the expected output.
