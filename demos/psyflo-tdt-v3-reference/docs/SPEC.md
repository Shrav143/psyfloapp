# Psyflo × Harvest TDT demo, v2: build spec for screen authors

You build part of a **clickable, high-fidelity demo that must read as a real product, not a mockup or a walkthrough**. It ships as one self-contained HTML file. Read this whole file, then your assignment (message you were given). Work only in your own files.

WORK DIR (all paths below are relative to it): `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/tdt-v2`

## 1. What the demo is (the user's words, tidied)

Harvest Outreach Center runs school-based **Therapeutic Day Treatment (TDT, H2016)** in Virginia and bills Virginia Medicaid MCOs (Sentara, Anthem HealthKeepers, Aetna, Humana, UnitedHealthcare) and FFS (Acentra). Their EHR is **Lauris Online**. **Lauris is the source of truth.** Psyflo has two parts:

1. **The Psyflo browser extension pops out beside Lauris.** All clinical input happens here. Inside Lauris the extension does these things:
   * **transcribes** calls and hallway voice notes (scribe),
   * **tracks time** (tap start/stop; contact time is the proof of hours behind units),
   * **writes enhanced note summaries** (turns what was said into billable-language daily notes, screening and intake narratives, with checks),
   * on an **authorization** (the **DMAS authorization form** opened from Lauris > Authorizations) it opens on the side and **recommends how to improve that authorization**: what an insurer will want, what is missing, the chance of a full award, each recommendation done by typing a draft into the Lauris form box (the clinician checks it; the extension never processes or signs).
2. **The Psyflo web platform** (its own browser tab, opened from the extension's "Open Psyflo platform ↗") is a **digital review and tracking platform**: Dashboard, New Cases, Authorizations (case hub, recommendations, drafts), Payer Intelligence (denials, partials, peer-to-peer), Analytics, plus Lauris connection, Payers, Settings, Help. It shows what the extension read from Lauris. It has **no clinical data-entry fields**: where an action needs input, the platform shows a "Do it in Lauris" button that goes to the right Lauris form with the extension open.

Rules of the product (do not break them):
* Psyflo **never signs, never processes a Lauris form, never speaks for Harvest about a member**. A licensed clinician does (Lauris "Process Form", "Forms to Approve", signature).
* Fictional data only. **Initials only** for children (e.g. `T.W., 12`). No real names, no Medicaid IDs. Insurer rules/approval figures are placeholders (say "demo values" where figures appear). Keep the sensitive family disclosure generic ("a change in the household").
* The demo must not look like a demo: **no "demo: next screen →" links, no "Schematic of the EHR…" footnotes, no walkthrough/guide/step numbers, no "prototype" wording, no "(prototype)" toasts that say a thing is stubbed**. If something is genuinely out of scope, make the control do the closest believable thing (open a modal with realistic content, or a toast that states the outcome, e.g. "Saved in Lauris"). The only allowed demo-ish element is the small "Demo data" chip in the Psyflo sidebar.
* Plain, short sentences (the existing copy style). No em-dash-heavy marketing voice. No lorem ipsum. Realistic Harvest content: TDT, school days, H2016/UG/U7 units, Campbell County and Lynchburg City, MCOs, Sfax/Availity.

Today in the demo is **Thu Oct 29, 2026**, clock 10:42 am. The signed-in user is **Jordan Perez, LPC, Assistant Clinical Support Supervisor** in both Lauris and Psyflo. Direct-care staff: Kayla Hale. Program director: Maria.

## 2. The window (shell, already built: `src/shell.js`, `shell.css`, `platform.css`, `lauris.css`, `build.py`, `data.js`, `lauris-data.js`, `time.js`, `reco.js`) — do not edit these

The demo is a **browser window** (tab strip, back/forward/reload, URL pill, a `psyflo · on/off` extension button). It always opens on tab 1 **Lauris Online** with the extension **off** (button pulses, tooltip "Click to open Psyflo beside Lauris"). The Psyflo platform opens as a second tab when a screen with `app:'psyflo'` is navigated to (e.g. `PSY.go('home')`, or the panel's "Open Psyflo platform ↗" button). The window is fluid (min 1180 px, scales down below), full viewport height. Each screen is rendered in a **Shadow DOM** root inside the page area; tabs keep their own history.

If you need a change in a shared file, **do not edit it**: say so in your final report.

### Registering a screen
```js
PSY.register({
  id: 'lauris-consumers',       // route id; navigate with PSY.go('lauris-consumers?c=4471')
  app: 'lauris',                // 'lauris' | 'psyflo' | 'public' (defaults from kind:'ext'→lauris, 'web'→psyflo)
  label: 'Consumers',           // used in the tab title: "Lauris Online — Consumers"
  url: 'consumers',             // path shown in the URL pill (string or fn(params)); default is derived from the id
  css: `...`,                   // extra CSS for this screen (shadow-scoped). Prefix your classes.
  render(params, S, ctx) { return `<html string>`; },   // params = query as object, S = PSY.state
  mount(root, ctx) { /* attach behaviour after render. root = shadowRoot */ },
  unmount(root) {},
});
```
A later registration with the same id replaces an earlier one (file order = alphabetical in `src/screens/`, after `captured.js`). **Use only your own id range** (section 5).

### Wiring (use these first; every control that does something must carry one so it can be tested)
* `data-go="route"` or `data-go="route?k=v&k2=v2"` navigates (and switches tab if the screen belongs to the other app). `data-go="back"` = browser back. `data-go="#some-id"` scrolls to an element inside the screen.
* `data-act="name"` calls `PSY.acts[name](el, ctx, ev)`. Define your own acts in your files, prefixed by your screen area (`l1b-…`). Read attributes with `el.getAttribute('data-…')`.
* Built-in acts: `ext-close`, `ext-open`, `xp-tab` (`data-xp-tab="notes|time|review"`), `xp-pause`, `open-platform` (`data-to` optional route, default `home`), `open-lauris` (`data-to` optional), `toast` (`data-msg`), `pf-loc`, `pf-bell`, `demo-menu`.
* `ctx` = `{ id, params, root, go, refresh, toast(msg), modal({title,sub,body(html),wide,actions:[{label,primary,onClick}],onOpen(el)}), q(sel), qa(sel) }`. `PSY.refresh()` re-renders the current screen (keeps scroll of elements marked `data-scroll="key"`). On **Lauris pages avoid refresh** (it loses what was typed): mutate the DOM instead and keep anything that matters in `PSY.state.boxes` via `PSY.flag(key, value)`.
* Modals live outside your shadow root (`.btn .p/.o`, `.chip`, `.opt`, `label`, inputs, `.letter`, `ul.log` styled). `PSY.ui.toast(msg)`.
* Never use `href` for in-app navigation, never `alert/confirm/prompt`, no `<script>` in markup, no external libraries or fonts. Inline SVG is fine. Charts are hand-built SVG/HTML.

### State and data
* `PSY.data.cases` (11 cases) and `PSY.allCases()` / `PSY.caseView(id)` (case merged with overrides). `PSY.setCase(id, patch)` changes stage, stageLabel, stageTone, clock{text,tone}, next, cta{label,go,params,primary}, units{line,sub,bar,barTone}, needsClinician, today. Stages: `sign | info | submitted | decision | partial | p2p | denied | appeal | active`. Dashboard, lists, sidebar counts and Payer Intelligence derive from these, so **always change state through the helpers**.
* `PSY.log(caseId, text)`, `PSY.flag(key[, value])`, `PSY.setAction/PSY.action(key)`, `PSY.now()` ("10:42 am"), `PSY.esc(str)`, `PSY.locOk(case)` (locality filter from the top bar), `PSY.flowRank()` (T.W. story: referral 0 < screened 1 < cna 2 < isp 3 < approved 4 < signed 5; `PSY.state.flow.tw`).
* `PSY.data.lauris`: Lauris roster `consumers` (id, ini, age, case, group, staff, units, ends, payer, auth, school, note), `byId/byCase/byIni`, `units(c)`, `unitsLabel(c)`. `PSY.data.payers`. `PSY.data.referrals`.
* `PSY.time`: contact time (`entries(ini)`, `total`, `unitsFor(mins)`, `start(ini)`, `stop()`, `running()`). State in `PSY.state.timer`.
* **Recommended actions**: `PSY.reco.list/pending/total/next/chance/complete/dismiss/undo` and `PSY.data.reco[caseId]` (read the contract at the top of `src/reco.js`; data in `src/screens/30-reco-data.js`). Done actions are stored in `PSY.state.actions['R-0416.a1']`.
* Anything new you store goes under `PSY.state.<yourkey>` with a default created on first use (`PSY.state.x = PSY.state.x || {…}`); call `PSY.save()` after mutating. State persists in sessionStorage; **Reset demo** lives in the sidebar "Demo data" chip.
* Switching browser tabs re-renders the tab you return to if the other tab changed state, so Lauris DOM-only edits are lost then: store what matters in state.

### Helpers for building pages
* **Lauris page**: `PSY.lauris.page({ active:'Consumers', main:'<html>', panel:{ context:'text under the logo', notes:'<html>', time:'<html>' (optional), review:'<html>' (optional), tab:'notes|time|review', case:'R-0416' } | false })` returns the full Lauris chrome: dark header "» Lauris Online", left menu (11 clickable items; `active` is the item label), your `main`, and the **extension panel** (`<aside data-psy="panel">`: logo header, tabs **Notes | Time | Review**, footer with Listening status and **Open Psyflo platform ↗**). The panel opens/closes with the toolbar `psyflo` button (animated slide). Default Time and Review bodies are supplied by `PSY.ext.defaults.time(o)` and `PSY.ext.defaults.review(o)` (L1a defines the first, L2 the second; pass `time`/`review` explicitly only when a page needs its own).
  * `PSY.ext.reveal('review')` (call in `mount`): selects a tab and slides the panel open if closed, i.e. "Psyflo opens beside the form and speaks up".
  * `PSY.ext.tab(name)`, `PSY.ext.set(true|false)`, `PSY.ext.seeIt(root, {to, label, text})` (puts a green "Captured. … [See it in Psyflo →]" card at the top of the Notes tab after Process Form).
  * Panel building blocks (classes available inside the panel): `.xcard` (+ `.t` teal, `.a` amber, `.w` white), `.cap` (small caps label), `.btn .p/.o/.s`, `.chip .r/.y/.g/.n`, `.tog .on`, `.ck` (check row with svg), `.mark`, `.stamp` (3-col time row), `.sec`, `.fld` (inputs), `.tx`. Panel panes scroll by themselves; mark long scrollers `data-scroll`.
  * Lauris classes in your `main` (Lauris look: Arial 13px, slate #2F3A4A menu, amber #E0A030 accents): `.ef` wrapper, `label` (small caps), `.in` (+ `.g` green = Lauris-filled, `.a` amber = typed by Psyflo for the clinician to check), `.lcard`, `.ltabs/.ltab(.on)`, `.lt` table (`tr.hov`), `.lk` link (`.lk.warn` orange), `.lb` button (`.lb.pri` primary blue), `.lh1`, `.lmuted`, `.lsel`. Add your own `css` for anything else.
  * `PSY.lauris.counts()` gives menu badge numbers, `PSY.lauris.user`.
* **Platform page**: `PSY.platform.page({ active:'dash|ref|auth|di|an|lauris|payers|settings|help', title:'…', sub:'…', actions:'<html buttons>', crumbs:[{label,go},{label}], body:'<html>', wide?:true })` returns sidebar + the "AS OF Thu, Oct 29 [Both localities | Campbell | Lynchburg] · Demo chip · bell" bar + page header (serif h1) + a content column (max 1220 px). Always build web screens with it. `PSY.platform.bar()` and `PSY.ui.sidebar(active)` exist separately; `PSY.platform.icons` has line icons.
  * Platform CSS classes available without defining them: `.card` (+ `.card-h` `.card-b`), `.tiles/.tile` (`.l` label, `b` big serif number, `span` note), `.stat`, `.btn` (`.p` green primary, `.o` outline, `.s` small), `.chip` (`.g .y .r .n .b`), `.th`, `.row` (+ `.t` `.s`), `.bar > i`, `.seg > button.on`, `.crumb`, `.src`, `.fld` (input/select/textarea), `h1/h2/.serif` (Newsreader serif).
  * **Automatic theme**: every non-Lauris screen is passed through `PSY.theme.remap`, which converts the old board colours (teal #217A78, ink #151B24, bg #F8F6F2 …) to the v01_2 palette. For new markup use the palette directly.
* Screens that are not Lauris must not use `position:fixed`.

## 3. Visual language

### Psyflo platform = the v01_2 look (look at `refs/v01_2/*.png`, especially `01-Dashboard.png`, `02-Authorizations.png`, `03-Denial_Intelligence.png`, `04-Analytics.png`, `dash.png`, `auth-list.png`, `case-1.png`, `case-tab2.png`, `case-tab3.png`, `denials.png`, `denial-1.png`)
Warm cream page `#FAF6F1`, white cards with 1px `#E5DCD0` borders and 12–14px radius, ink `#1B1B19`, muted `#6B665E`, line `#E5DCD0`, row line `#EFE8DE`, dark green `#1D4F43` (active nav, primary buttons, hover `#17403A`), soft green `#E3EFEA/#1D4F43`, amber chip `#F6E7C8/#6F4A05`, red chip `#F6DDD6/#8A2E1C`, neutral chip `#EFE8DE/#4A453D`. Headings serif (Newsreader 600), body DM Sans 14px, tiny caps labels 11–12px/600 letter-spacing .08em. Left sidebar 256px (built). **Simple and calm**: the user said the old dashboard was "way too busy". One idea per card, few numbers, generous white space, at most one primary button per card/row.

### Lauris = a believable EHR (see `refs/legacy/lauris-*.html` + screenshots `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/tdt-main/shots/p04.png … p12.png`)
Plain, dense, Arial. Menu and field names are Lauris's. Do not add footnotes saying it is schematic.

### Extension panel = Psyflo brand (navy #151B24, teal #217A78, amber #F0B44C), 400px wide, DM Sans.

## 4. Routes and who owns them

| Route (app) | Owner | Notes |
|---|---|---|
| `lauris-consumers` (lauris) | L1a | list, filters, "N units available" links open the consumer file |
| `lauris-consumer?c=4471&tab=general\|auth\|docs\|file\|meds\|allergies` | L1a | consumer file with tabs; "Authorization Information" tab lists the auths with Open → `lauris-dmas?case=…` |
| `lauris-add-session?c=…` | L1a | choose consumer and session type; opens the right form |
| `lauris-saved`, `lauris-approvals`, `lauris-reports`, `lauris-user`, `lauris-time`, `lauris-rejected`, `lauris-noauth` | L1a | every left-menu item is a working page |
| `lauris-screening?c=4492`, `lauris-cna?c=4492`, `lauris-isp?c=4492`, `lauris-dpn?c=4471` | L1b | session forms with the extension's transcription and enhanced summaries |
| `lauris-auths`, `lauris-auth?id=…`, `lauris-dmas?case=R-0416[&action=a1][&fill=1]`, `lauris-forms` | L2 | authorizations list, the DMAS form (initial H2016 and CMHRS continued stay), Review tab recommendations, Forms to Approve (sign) |
| `home` (Dashboard), `referrals` (New Cases), `ref-review`, `auth-list` (Authorizations), `case?case=R-0416` (case hub), `connect-lauris`, `payers`, `payer?p=…`, `settings`, `help`, `family-settings` | P1 | |
| `denials` (Payer Intelligence), `denial-detail?case=R-0384`, `partials`, `p2p-notes`, `analytics`, `info-request`, `draft-initial`, `draft-continued`, `sent?case=…` | P2 | |
| `ref-form`, `family-phone` (public) | existing (captured.js) | school referral form and the family's phone link; leave |

Existing implementations of the P1/P2 routes already work (captured design-board screens in `src/captured.js` and authored files `src/screens/10-*, 20-*, 40-*, 41-*, 50-*, 51-*`) and are auto-themed; your job is to **restyle/simplify them into the v01_2 look using `PSY.platform.page` and to add what is missing**. Do **not** edit `captured.js`; re-register a route by id in your own file (copy any `EX[...]`/act logic you need from `captured.js` into your file; acts defined there remain available, e.g. `ref-schedule`, `door-accept`, `log-outcome`, `approve-fill`). Legacy reference of the old extension screen for recommendations: `refs/legacy/21-lauris-case.js` (L2 ports its logic to the DMAS form).

**File ranges** (create files only in your range, `src/screens/NN-name.js`): L1a `60–64`, L1b `65–69`, L2 `70–74`, P1 `80–84` (+ you may restyle and replace the existing `10-referrals.js, 20-case.js, 20-case-data.js, 40-dash-util.js, 40-home.js` in place, since you own them), P2 `85–89` (+ you own and may edit in place `41-analytics.js, 50-denials.js, 50-denials-util.js, 51-denial-detail.js`). `30-reco-data.js` (recommendation content): L2 may edit it; others read only. `00-starter.js` is a placeholder; delete nothing there.

## 5. Story that must hold end to end (cross-screen contracts)

1. **Start**: Lauris Consumers, extension off. User clicks `psyflo` → panel slides out: Notes tab shows the day (what to write, who is low on units, a timer), Time and Review tabs work. Left menu items open real pages.
2. **New case T.W. (R-0416, referral REF-118)**: platform New Cases → screening call booked → in Lauris `lauris-screening` the extension transcribes the call and drafts the narrative → Process Form sets `PSY.state.flow.tw='screened'` and shows `PSY.ext.seeIt(...)`; same for `lauris-cna` (`'cna'`) and `lauris-isp` (`'isp'`); the platform case page and `draft-initial` show what was read from Lauris.
3. **Authorizations in Lauris**: Lauris > Authorizations lists authorization requests; **Open** an authorization opens the **DMAS form** (`lauris-dmas`). For T.W. it is the *TDT H2016 Initial Service Authorization Request* (July 2021 form); for M.R. (continued stay) the *CMHRS Continued Stay* form. **The extension panel opens on its own on the Review tab** and recommends improvements to this authorization (chance of full award, ordered list of recommended actions). Each action is done by the extension typing a draft into the right DMAS field (amber `.in.a` box, "typed by Psyflo, check it"); marking it done calls `PSY.reco.complete(case, actionId, value)` so the platform's case hub, dashboard and recommendation counts update. Process Form → `PSY.state.flow.tw='approved'` and the form appears in **Forms to Approve**; signing there (clinician, with attestation) → `'signed'`, `PSY.setCase('R-0416', stage 'submitted' …)` and the platform shows it as sent.
4. **Platform side**: the dashboard stays simple; the case hub (P1) shows clinical picture, criteria, **recommended actions with "Do it in Lauris"** → `lauris-dmas?case=R-0416&action=a1`; after the action is done in Lauris the case hub shows the value read back with a source tag ("Read from Lauris · DMAS form, Section III · 10:42 am").
5. **Insurer answers** (P2): info request, partial decision, peer-to-peer notes, denial and appeal, Payer Intelligence patterns, Analytics. Where these need input, they link to Lauris ("Do it in Lauris") rather than taking input.
6. **Daily work**: `lauris-dpn?c=4471` (M.R.): the extension turns a hallway voice note into a billable narrative; time comes from the Time tab entries; Confirm counts units against the authorization (`PSY.state.boxes['units-used.4471']`), so Lauris unit counts and the platform's "students running low on units" agree.

## 6. Build and test

```bash
cd /tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/tdt-v2
OUT_NAME=<yourname>.html python3 build.py        # builds out/<yourname>.html from ALL files in src/ (each file is its own <script>, so another agent's syntax error only breaks that file)
cd shots && PROTO=../out/<yourname>.html node ../tests/shot2.mjs 1440 900 <prefix> [--ext] <route> '<route?x=y>' …   # viewport screenshots (PNG in shots/, named <prefix>-<route with _>.png) + page errors; --ext opens the panel first
```
Always build with your own `OUT_NAME` (others build at the same time). Look at your screenshots with the Read tool at 1440×900 **and 1280×720** and fix what looks off (overflow, clipped text, misaligned columns). For interaction, write your own Playwright script in `tests/<yourname>-click.mjs` (Playwright: `import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs"`, executablePath `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; clicks pierce shadow roots with normal selectors, e.g. `p.click('text=Process Form')`, `p.locator('.btn',{hasText:'…'})`; navigate with `await p.evaluate(()=>PSY.go('…'))`; the extension button is `#extBtn`; read state with `PSY.state`). **Zero console/page errors** is part of done. Every visible control must do something sensible.

Quality bar: it must look like it came from one designer: same spacing, type, chips; real Harvest-specific content; no dead buttons; no overflow at 1280×720; no horizontal scroll.

## 7. Domain facts
* Service: TDT school day (H2016), after-school (H2016-UG), summer (H2016-U7). Units: 1 unit = 2–2.99 h/day, 2 = 3–4.99 h, 3 = 5+ h. Typical ask 150 units. Initial request goes in within 30 days of intake. Insurer decision clock 7 calendar days (72 h expedited). Info requests give 24 hours. Continued stay is drafted about 14 business days before units run out. Early discharge + new initial is the workaround when a partial runs out.
* **DMAS initial TDT form (H2016, July 2021, 8 pp.)**: Member info; Provider info; Procedure code (H2016 school day / UG after-school / U7 summer); School name; Request From/To dates, total units, hours per week; Retro review Y/N; New service Y/N; primary and secondary ICD-10; medication table (4 rows). **Section I eligibility: two of three criteria** — (1) difficulty establishing/maintaining relationships (with school data: IEP, unexcused absences, ISS/OSS days, classes passing), (2) documented repeated interventions that have not worked (provider table: Provider | currently in service? | dates | outcomes), (3) cognitive ability to recognise danger to self/others — **plus one of five level-of-care items (a–e)**, each with its own substantiation box. **Section II** care coordination (PCP, other concerns, services table, coordination plan). **Section III** trauma-informed care (evidence Y/N, plan). **Section IV** goals (instructions; Resources and Strengths; Barriers; school/family coordination; 3 goal blocks: measurable objective, days/week, interventions, LMHP hours/week, "if no in-school counseling why"). **Section V** discharge (step-down table, level of care, est. date). Attestation (signature actual/electronic, printed name, credentials and NPI, date, assessment date). Full text: `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/harvest/pdfsrc/initial.txt` and `…/scratchpad/harvest/docs.md` §3A. **CMHRS continued stay (Dec 2021, 6 pp.)**: docs.md §3B: care coordination since last authorization, progress toward each goal, lack of progress and ISP changes, family involvement, barriers.
* Denial wording Harvest sees most: "already connected to other services", "can be addressed through the IEP", "can be addressed in outpatient", "internalizing symptoms not observable", "school counseling is not a covered service", "no documented failed prior service", "no way you're spending 5+ hours with these kids".
* Peer-to-peer: one chance, earliest slot often 4–8 weeks out, by then most units are gone. Only the guardian can file an appeal; Harvest drafts a plain-language letter and keeps serving the child.
* Channels: Sentara/Aetna/Humana/FFS by Sfax; Anthem by Availity (clinician sends in own login); UnitedHealthcare by UHC portal. Lauris holds the clinical record but not authorization tracking.
* Background: `refs/harvest_workflow_map_1.md` (long; grep it).

## 8. Rules of engagement
* Only create/edit **your** files. Plain browser JS (no modules), each file in an IIFE, safe to load before other screens exist. Fail soft when you use another owner's API (`if (!PSY.reco) …`, `PSY.ext.defaults.time && …`).
* Shared helper code that two of your screens need goes in your own `…-util.js`.
* Build the core first and make it work, then polish. Report honestly what is done, stubbed, and what you need from the integrator.
* Final report (short): files, routes registered, acts defined, state keys used, what is stubbed, problems, the exact verification commands you ran, and which screenshots you checked.
