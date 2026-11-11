# 04 · Technical architecture review (Agent D)

Scope: master = `demos/psyflo-unified-demo` (pristine Nov 8), v3 = `demos/psyflo-tdt-v3-reference`. No code edited. Method: read every named file; ran the master on ports 4720-4722 (smoke test as admin: all 46 screens render, 0 console errors; 15 previously untested actions exercised through `/api/do`: all behave, guards hold); loaded the built v3 HTML in headless Chromium (41 registered routes render without errors; 323 `data-act` handlers; cohort measured). Baseline test results are in `review/baseline-tests.txt` (all green when `flowA` runs before `flowC`). Not possible here: loading the MV3 extension in real Chrome (only the in-page fallback is exercised), live microphone, and clicking all 323 v3 handlers (I read handlers instead). Line ranges are for the files as committed.

## 0. Headline findings

1. **One seed lineage.** All 11 v3 cases (`R-0377…R-0416`) exist in master with the same request id, initials, payer slug and Oct 29 "today". The join keys differ: Lauris Harvest # differs for 10 of 11, and **#4471 is M.R. in v3 but E.C. in master** (wrong-patient hazard if both maps are ever merged).
2. **Different runtimes.** Master is a client/server app (one global JSON state, SSE, template engine, hash router, real MV3 bridge). v3 is an in-page browser simulation of Lauris *and* Psyflo (Shadow DOM, HTML strings, `PSY.state` in `sessionStorage`). Almost no v3 code runs inside master; v3 *logic and data* port, v3 UI mostly gets re-templated.
3. **Three status vocabularies in v3 vs one in master.** Master `request.stage` (17 values) stays the single lifecycle. v3's 12 "status5" values and 24 dispute statuses become a *dispute-resolution layer* (`disputes`) that reconciles into `request.stage` (section C2).
4. **Best v3 assets:** Denial Intelligence model and workspace, analytics sections plus a seeded cohort, filter bar, Track Time model, evidence/provenance labels, payer-rule registry with verification kinds. **Hardest port:** Scan & Enhance (1,953 lines welded to simulated Lauris pages).
5. **v3 behaviours that conflict with the spec** and must not be ported as-is: dated addenda on processed notes (`68-dpn.js:209-218`), "Synced to Lauris" set by a simulated writer instead of an observed page event (`05-sync.js:48-63`), agents that sign in to Lauris/payers/phone lines (`42-flow.js`, `09-voice.js`, toast "Read Availity" `captured.js:269`), one-click "Submit" (`77-flow-initial.js`), and `PSY.REDIRECT` sending `home`/`referrals`/`ref-review` to Authorizations (`shell.js:123-126`).
6. **Master defects that block a faithful merge:** Lauris's clock does not follow `demo.advanceDay` (verified: Psyflo `today` → Oct 30, Lauris still prints 10/29/2026); hard-coded `2026-10-29` in `model.js:55,153`, `ParentPortal.js:217`, `draft.js:277`; a silent 08:40 time fudge `model.js:50`; unit rule 1 unit at 60 min (`dates.js:55`) vs v3's DMAS tier 120 min (`time.js:146`); evidence counts are constants (`draft.js:345`: `range==='30' ? 21 : 61`) and M.R. has **zero** processed daily notes in the seed, so Scenario 4 (continued-stay evidence) has no rows to review.
7. **Role gating is client-side only.** `/api/do` and `/api/state` accept anonymous calls (verified: anonymous POST of admin-only `request.demoReply` succeeded) and the whole state, including clinical note text, goes to every browser. Master's `min` levels are cumulative, so admin inherits every clinical screen (contradicts spec Part 16).
8. **Analytics has three incompatible datasets**: case-backed requests/notes, the seeded `analytics_baseline` "Harvest export", and v3's 120-patient cohort (1.7 MB JSON; initials `L.V.` and `T.N.` collide with real master students). Tag and separate; never blend.
9. **Incremental migration is feasible** because master already supports additive work: `seed/extra/*.json` keys pass through to state (`store.js:16-23,58-59`), `actions/*.js` autoload (`index.js:21-25`), one controller per screen. Only ~12 files are true conflict hot spots (section G).
10. **Effort:** ≈860 person-hours for full scope; ≈400 for a defensible Tier 1 (section I).

## A. Master architecture map

### A1 Processes and origins
`server/index.js` (71 lines, Node 20, no deps) runs three HTTP servers in one process (`:17-18`, `:66-71`): **app** `APP_PORT` 4000 (static `web/`, `/api/state`, `/api/stream`, `/api/config`, `POST /api/do`, `/files/*` PDFs, `/seed/notes.md`); **mock Lauris** `LAURIS_PORT` 4001 (`server/lauris/site.js`, server-rendered, cookie login, own store `lauris.json`); **mock portals** `EXT_PORT` 4002 (`server/external/site.js`: `/availity|/portal|/uhc/upload`, `/state-portal/incident`, `/dmas/lookup`). The app server rewrites `/f/*`, `/parent/*`, `/school/*`, `/phone/*`, `/app/*` to the SPA (`:56`). At start it copies `web/panel/bridge.js` to `extension/bridge.js` (`:28`, verified identical). Data lives in `DATA_DIR` (`psyflo.json`, `lauris.json`, `files/`).

### A2 State model
One global object (`store.js` class `Store`, `:107-154`), built by `buildState(preset)` (`:39-62`) from `seed/seed.json` + `seed/extra/*.json` (`mergeExtra`: arrays append, objects merge, new keys pass through, `:16-23`). Persisted by synchronous `writeFileSync` after every action (`changed()`, `:121-125`); `rev` increments each time. State is 55 KB, shared by every client (no per-user state). `this.now()` = story `today` + **wall-clock** time of day (`:132-136`).

| Collection | Key fields | Written by (create/mutate) |
|---|---|---|
| `clients` (20) | id (`TW`,`MR`…), initials, harvest_no, lauris_no, stage, authorization{payer,units,used,start,end}, goals[], medicaid, guardian, intake, quarter | seed; `client.update`(orphan), `familyLink.submit`, `eligibility.record`, `lauris.observed`, `intake.*`, `referral.inLauris` |
| `referrals` (31) | REF-nnn, client (id or free text), school, stage, next, form{}, family_link{}, eligibility, screening_offer | `referral.*`, `familyLink.*`, `eligibility.*`, `screening.*` |
| `requests` (10-11) | R-nnnn, client, payer, channel, type, units_requested/offered/awarded, stage, sent, decision_due, fax_ref, signed_pdf, decision{}, p2p_at, appeal{} | `request.*`, `lauris.observed`, `plan.set` |
| `request_details` | per-request seeded fill (pages, info asked, next) | seed only |
| `events` | {at, what, who, record, demo?} append-only audit | `this.event()` in every action |
| `notes` (29), `notes_sample` (3) | client, staff, type, date, units, fields, review | `note.processed` (via `lauris.observed`), `note.review` |
| `dictations`, `assessments`, `timers` | spoken/rewritten/chips/status; instrument/answers; `timers[staff]={client,started,blocks[]}` | `dictation.*`, `panel.dictation`, `assessment.*`, `timer.*` |
| `screenings`, `family_links`, `eligibility`, `consents`, `portal_tasks`, `enrollment` | per referral/client | `screening.*`, `familyLink.*`, `eligibility.*`, `consent.sign`, `portalTask.create`, `enroll.save` |
| `files` | {id,name,url,kind,record,at}; bytes in `DATA_DIR/files` | `store.writeFile` via `consent.sign`, `request.signed/appealSign/pdfCopy`, `file.pdf`, `eligibility.recordProof` |
| `reminders`, `plans`, `shares`, `checkins`, `incidents`, `appeals`, `drafts` | small lists | respective actions; `reminder.done`, `draft.save`, `incident.save` have no caller |
| Extension audit: `fills`, `lauris_versions`, `lauris_seen`, `panel_feedback`, `internal_quarterlies` | what the panel typed / what Lauris saved | `panel.filled`, `lauris.savedVersion`, `lauris.observed`, `panel.feedback`, `quarterly.internalSave` |
| Reference/seeded: `payers` (6), `staff` (7), `schools` (6), `school_users`, `interventions`, `settings`, `library`, `compliance`, `migration`, `analytics_baseline`, `staff_dashboard`, `payer_history`, `denial_reasons`, `parent_progress`, `school_goals`, `assessments_due/history` | read-only in practice | seed |

### A3 Action catalog (85 actions, 13 files; `store.run` calls `fn.call(store, state, args, ctx)`, `:140-146`)
No two files define the same name, so the "later overrides earlier" rule is unused. Full effects: `04b` appendix. `*` = no caller in web/test (orphan).

| File | Actions (args abridged) |
|---|---|
| `core.js` (54) | `demo.reset(preset)` `demo.advanceDay` · `referral.create(form,by,draft)` `.update(id,form,submit)` `.attach` `.scheduleScreening` `.routeGrant` `.stage*` · `familyLink.send/open/step/submit(token…)` · `eligibility.record` · `consent.sign(client,form,signer,signature,lang)` `checkin.save` `portalTask.create` · `request.ensure/processed*/signed/send/portalConfirmed/overdueNotice/receiptCheck/demoReply/partialDecide*/infoReply/infoSend/appealSign/close*/set*/p2pOutcome*` · `plan.set` · `timer.start/stop` `dictation.save/used*/discard` `assessment.save/used` · `note.processed/review` `screening.done*` `draft.save*` `client.update*` `lauris.event*` · `incident.filePortal/save*` · `user.add/update` `settings.set*` `library.add*` `migration.rerun*` `reminder.done*` `file.pdf` |
| `lead-extension.js` (4) | `lauris.observed(event,form,session,consumer,values,typed,preview)` (the bridge's report: created/saved/processed/signed/rejected → screenings, requests, notes, units), `portal.observed`, `panel.filled`, `screening.drafted` |
| `x-panel.js` (4) | `lauris.savedVersion`, `panel.feedback`, `panel.dictation`, `referral.inLauris` |
| `x-family.js` (7) | `enroll.save`, `screening.offer/bookByFamily`, `intake.offer/book/ride/confirm` |
| `x-referrals.js` (5) | `referral.scheduleAndText/routeAndNotify/hold/unhold`, `eligibility.recordProof` (dated PDF proof, closes re-check reminder) |
| `x-requests-history.js` (3) | `request.partialChoice(stretch/use_up/p2p)`, `.p2pSchedule`, `.p2pLog` |
| `x-p2p-recording.js`, `x-requests.js`, `x-quarterly.js`, `x-portals.js`, `x-school.js`, `x-staff-review.js`, `x-staff.js` | `request.p2pRecording(consent gate)`, `request.pdfCopy`, `quarterly.internalSave`, `dictation.annotate`, `school.share/shareUsed`, `staff.reviewMode`, `compliance.qiCheck*` |

17 orphans (no caller): `client.update`, `compliance.qiCheck`, `dictation.used`, `draft.save`, `incident.save`, `lauris.event`, `library.add`, `migration.rerun`, `reminder.done`, `request.close/set/partialDecide/p2pOutcome/processed`, `screening.done`, `settings.set`, `referral.stage`. Consequence: reminders can never be dismissed from the UI; dropped screens (Compliance, Migration, Library, Family-link settings) left store keys and actions with no UI.

### A4 Sync and render loop
`api.js` (31 lines): `init` fetches `/api/state` + `/api/config`, opens `EventSource('/api/stream')`; the server pushes only `{rev}` (`index.js:30-31`); on a new rev the client refetches the **whole state** and calls every listener; 15 s polling fallback. `api.do` POSTs then refreshes. `app.js:275-278` repaints the **entire** screen on every store change unless the controller sets `noRepaint` or a modal is open; focus survives only for inputs with an `id` (`:239-243`). The panel redraws on `api.onChange` (`panel.js:990`). Implication: long edits (denial letters, notes) must hold local draft state in the controller or use `noRepaint`.

### A5 Routing and screen registry
Hash router `#/Id?query` (`app.js:39-60`) plus path routes `/f/<token>` (FamilyLink) and `/parent/<token>/<Screen>`. `route()` (`:191-223`) requires `meta.min`, loads `web/screens/<Id>.dc.html` (**a template file must exist for every route**, `runtime.js:15-35`), instantiates the controller registered by `web/js/screens/<Id>.js` (all imported up front from the SCREENS list, `:283`), swaps the template's 240-px `<aside>` for the generated sidebar (`:225-229`, `:107-127`), applies per-screen CSS. Links in templates are `Id.dc.html?x=y` or `#anchor` (anchors map to `controller.anchors`). Deep-link inventory in code (23 patterns): `Submission?id` (11 uses), `PeerBrief?id` (9), `Eligibility?referral` (7), `Referral?id`, `Partials?id`, `InfoRequest?id` (5 each), `ExtSignOff?request`, `ExtScreening?referral`, `ExtDPN?client`, `Referrals?f`, `ExtSRA/ExtCase?client`, `EarlyDischarge?id`, `AppealLetter?id`, `StaffDashboard?v|staff`, `ReferralSent/ReferralForm?id`, `MobileAssess?client`, `FamilyLink?t|preview`.

**Registry** (`registry.js:7-56`, 46 routes; `min`: 0 none · 1 direct support · 2 supervisor · 3 clinician · 4 admin):

| Surface | Route ids (canvas n) | min |
|---|---|---|
| app | `Login`0 `DoNext`2 `Referrals`6 `Referral`7 `Eligibility`9 `Submission`19 `Authorizations`29 `InfoRequest`34 `Partials`35 `EarlyDischarge`36 `PeerBrief`38 `PayerPlaybook`40 `Analytics`42 | 3 (Login 0) |
| app | `ReviewQueue`27 · `StaffDashboard`28 · `Users`43 | 2 · 1 · 4 |
| canvas | `WhereThingsLive`1 | 0 |
| school | `SchoolPortal`3 `ReferralForm`4 `ReferralSent`5 | 0 |
| parent | `FamilyLink`8 `ParentSign`11 `ParentPortal`12 `ParentSurvey`31 `AppealLetter`39 `ParentEnroll`46 `ParentProgress`47 `ParentQuarterly`48 `ParentLetters`49 `ParentSchedule`50 | 0 |
| phone | `MobileApp`20 `MobileDictate`21 `MobileAssess`22 | 1 |
| ext (Lauris iframe composite, `ext-composite.js`) | `ExtHome`13, `ExtDPN`23 `ExtWeekly`24 `ExtMonthly`25 `ExtIncident`26 (min 1); `ExtScreening`14 `ExtCNA`15 `ExtISP`16 `ExtSRA`17 `ExtSignOff`18 `ExtQuarterly`32 `ExtCase`33 `ExtDischarge`37 (min 3) | 1 / 3 |

Landing (`homeFor`, `registry.js:58-63`): direct support → `ExtHome` (laptop) or `MobileApp` (<600 px); supervisor → `ReviewQueue`; clinician → `DoNext`; admin → `Authorizations`.

### A6 Roles and permissions as implemented
Four staff roles in `seed.staff[].role`; "sign-in" is a localStorage id (`psyflo_user`, `app.js:13-20`), password ignored (`Login.js`). `canSee(id, level)` = `min === 0 || level >= min` (`:21`), so **levels are cumulative** (admin = 4 sees every clinical screen; supervisor cannot see Authorizations). The demo-bar picker shows only the role's screens. Demo-only controls (`demoReply`, `advanceDay`) check `role==='admin'` in the browser (`Authorizations.js:186-195`). The panel has its own `LEVEL` table and `DS_TASKS` vs `CLIN_FORMS` (`panel.js:16-18`). Portals: school user in localStorage (`rbell`); family by tokenized link. No server-side authorization anywhere.

### A7 Lauris boundary, bridge and panel
Lauris has its own module and file (`lauris/store.js`, `lauris.json`); Psyflo never imports it. The only coupling is the HTTP reset hook (`index.js:43` resets Lauris when `demo.reset` is posted) and shared seed. **Bridge** (`web/panel/bridge.js`, 219 lines) runs in three modes with identical code: MV3 content script (`extension/manifest.json`: localhost:4000-4002 only), in-page (Lauris page injects the script and a 400-px `<iframe src=/panel/>`, `lauris/site.js:95-107`), and portal (confirmation reader on the mock Availity/UHC/state pages). It: reads the open page (`readPage`, `:50-95`) through **fixed DOM contracts**, types into `#lauris-form` boxes by **label text** (`findField`, `fill`, `:44-47,120-130`), focuses/marks boxes, and *observes* the PRG flash `#lauris-flash[data-event]` after a person presses Save/Process/Get Signature/Reject (`observe`, `:155-175`), reporting `lauris.observed`, `lauris.savedVersion`, `portal.observed` to `/api/do`. It never clicks Process Form, Get Signature or Send. Transport: panel `postMessage` ↔ bridge (in-page) or `chrome.runtime` relay via `extension/sidepanel.js`. **Panel** (`panel.js`, 997 lines, one flat `ACT` map and `viewHTML()` switch on `page.kind`): consumers list/new consumer/record, 11 form views (screening, CNA, ISP, DPN, weekly, collateral, quarterly, incident, SRA initial, continued stay, discharge), sign-off, portal confirmation, saved/rejected lists, "off for this record" (non-TDT), school-update cards, internal quarterly (staff-only), feedback. Six form views (ISP, weekly, collateral, quarterly, continued stay, discharge) are canvas `<aside>` templates with seeded draft text for **one** student (T.W./M.R./D.W.); other students get "No draft … in this demo" (`panel.js:789-800`). `autoActions()` (`:956-990`) types pre-call screening boxes and a waiting dictation as soon as the form opens (yellow, still not processed). Drafting is deterministic code in `web/js/shared/draft.js` (`draftScreening`, `enhanceDictation`, `draftInitialSRA`, `draftSeeded`, 14 explicit `CHECKS`), imported by both panel and server; no LLM.

### A8 PDF
`server/pdf.js` (93 lines): `makePdf(blocks,{title})` → Helvetica text, word-wrap, optional JPEG signature (`jpegSize`), footer "Demo data, nothing is real". Used by `consent.sign`, `request.signed/appealSign/pdfCopy`, `eligibility.recordProof`, `file.pdf` (Analytics/Compliance reports). **Text only: no charts or tables.** Files go to `DATA_DIR/files/<id>__<name>` and `s.files`.

### A9 Presets and the demo clock
`demo.reset(preset)`: `live` (default) rewinds T.W. to the Oct 13 referral and deletes R-0416 (`applyLive`, `:94-105`); `canvas` is the Oct 29 snapshot incl. T.W.'s family link, eligibility, screening and R-0416 submitted (`applyCanvas`, `:64-92`). Both rebuild state and Lauris. Clock: `state.today` (advanced only by admin `demo.advanceDay`, `core.js:13-19`, which also flips `submitted` past due to `overdue`) + wall-clock hh:mm. Defects: Lauris `db.today` is fixed at build (`lauris/store.js:24,91`); seeded recheck dates disagree (`eligibility.next_check` Nov 5 vs `clients.medicaid.next_check` Oct 19); `requestClock` pretends it is 08:40 when an info request predates today (`model.js:50`); README documents D.W.'s early-discharge Dec 18 vs canvas Dec 9.

## B. v3 architecture map

**B1 Build and modules.** `source/build.py` concatenates 8 top-level files (`data, lauris-data, time, shell, scribe, lf-kit, reco, captured`) plus 63 `screens/*.js` (18,951 lines) plus 19 captured canvas HTML screens into one 2.4 MB HTML; one `<script>` per file; `PSY` is a global namespace; later files override earlier registrations by route id (file order is alphabetical).

**B2 Router and shell** (`shell.js`, 599 lines). The page is a simulated browser window: tabs per app (`lauris`, `psyflo`, `public`), history stack per tab, URL pill, an extension button that docks the Psyflo panel beside Lauris. `PSY.register({id, app, render(params,S,ctx), mount})`; every screen renders into its own **Shadow DOM** from an HTML string; wiring is declarative `data-go` / `data-act` / `data-change`; a re-render is a full replace with scroll snapshot (`renderTab`, `:191-221`). `PSY.REDIRECT` (`:123-126`) removes `home`, `referrals`, `ref-review`, `payers`, `connect-lauris`.

**B3 State, persistence, events.** `PSY.state` (version 5) in `sessionStorage` key `psy-tdt-proto-v2` (`:11-21`): `cases` (patches over static `PSY.data.cases`), `diStatus`, `disputes5`, `sync`, `flows5`, `actions`, `boxes` (free flags), `fb` (filter bars), `audit`, `log`, `perms`, `rates`, `unitOverrides`, `prefs`, `ext`, `timer`, `saved8`, `l1a`, `scribe`, `elig5`. No server, no shared state, no event bus: `PSY.save()` bumps `PSY.rev`; inactive tabs re-render on activation; `PSY.refresh()` re-renders the active tab; modules keep private subscriber lists (`PSY.sync.onChange`, `PSY.time.onChange`). Audit = `PSY.audit.add({t,case,action,by,doc,status})` (`01-core.js:115`), richer `PSY.hist` events carry actor kind (voice/agent/psyflo/staff/lauris/payer), ISO timestamps and pop-ups (`08-history.js`).

**B4 Data.** `data.js`: 6 payers, 11 cases (`R-0416…R-0377`: stage key, clock text, cta route), 3 referrals. `02-core-data.js`: per-case authorization (`R5.auth`: Lauris id, current{authorized,remaining,end,perDay}, decision{type,approved,due,dueSrc,said}), 3 services with unit rules, **28 payer rules** each tagged `policy | documented | observed | unverified` with source and verification, channels, eligibility (+ a coverage-change story for T.W.), 7 disputes (5 authorization, 2 illustrative claims). `lauris-data.js`: 11 consumers with Harvest #. `20-case-data.js` / `30-reco-data.js` / `78-flow-continued.js`: hand-written record excerpts, criteria and recommended actions per case. **Analytics cohort** (`85c-cohort.js`): 120 generated patients `S00001…`, 293 authorizations (209 approved, 39 partial, 24 denied, 12 overturned, 9 pending), 2,961 interventions, weekly service rows, feedback; programs TDT 79 / IOP 27 / individual 9 / PHP 5; payers anthem 77, aetna 78, sentara 57, uhc 57, humana 24; 1.7 MB JSON; k-anonymity `MIN_N = 5`.

**B5 Role model.** Three roles (`dss`, `lcs`, `admin`; no supervisor) × 16 feature flags (`PSY.PERMS`, `:68-72`) with admin overrides (`PSY.can`, `:84-88`): admin lacks `clinicalRecords`, `enhance`, `time`, scribe; LCS lacks `settings`, `allConsumers`. Caseload filters per role (`PSY.caseload`). "View as" lives in the presenter menu (`01-core.js:407-460`: View as, 13 scenarios, Reset, API log).

**B6 Scribe, Time, Enhance.** *Scribe* (`scribe.js`, 674): note-type dropdown filtered by permission (admission, intake, DPN, collateral, monthly) → patient → simulated recording → review transcript → "Generate draft" → fields (a field nothing was said about stays "Not stated") → version flow on `PSY.sync` (Original → AI Draft → Clinician Edited → Approved → Synchronized; states Unsaved/Saved/Ready/Syncing/Synced/Failed; `failNext()` demo) → writer pushes into the simulated Lauris form. *Time* (`time.js` 186 + `63-ext-time.js` 621): start/pause/resume/stop with description and ISP-goal link, entries per patient/day, link to a DPN, **recorded vs billable** via a configurable per-service rule (`tiers [[120,1],[180,2],[300,3]]`, source DMAS Ch. IV), manual add. *Enhance* (`76-enhance.js` 1,800 + `76b` 153): pick patient + document → "scan" (1.3 s simulated) → recommendation cards (issue category, why, evidence citations or "Not documented · collect it", policy reference, editable suggestion, Accept/Edit/Reject) → original vs enhanced → approve → push; for SRAs adds required-field validation, PDF capture, package, **simulated payer submission** and confirmation number.

## C. Overlap and divergence

### C1 Canonical ID mapping (master IDs are canonical; v3 Harvest numbers are not imported)
| v3 case · name | v3 Lauris # | Master client · request | Master Harvest # | Verdict and evidence |
|---|---|---|---|---|
| R-0416 T.W., 12 | 4492 | `TW` · R-0416 (canvas; absent in live until ISP) | 4492 | **Match.** Same id, initials, age, Humana, 150 units, REF-118, #4492 (`data.js:19`, `lauris-data.js`, seed). v3 shows "waiting for signature, 21 d left"; master canvas shows submitted Oct 22, due Oct 29. v3 fax ref F-2291 is on R-0399 there but on R-0416 in master. |
| R-0411 M.R., 7 | 4471 | `MR` · R-0411 | **3310** | Match on request; **number conflict.** 27 of 110 left = master 83 used of 110; both end Nov 13. |
| R-0408 K.T., 9 | 4466 | `KT` · R-0408 | **4480** | Match; number conflict. Both: Anthem/Availity, info asked Oct 28 5:40 pm, due in 24 h. |
| R-0402 D.W. | 4458, **age 14** | `DW` · R-0402 | **4102**, **age 15** | Match; conflicts: age, offer **120 (v3) vs 110 (master, BRIEF.md)**; v3 current auth 90/18 left ends Nov 6 vs master 110 from Oct 29. Use master; the 120 echoes master's September `payer_history`. |
| R-0399 A.L., 6 | 4455 | free-text `"A.L., 6"` · R-0399 | none (no client row) | Match on request (Humana, due Oct 26, overdue). Master needs a client stub to join; fax ref F-2280 (master) vs F-2291 (v3). |
| R-0391 J.O., 14 | 4449 | `JO` · R-0391 | **4400** | Match (fax ref F-2287 in both; prior auth 80 used in 7 wks). **Status conflict:** v3 partial 110 offered Oct 29, reply Nov 2; master `submitted`, due Oct 30. |
| R-0388 T.N., 8 | 4441 | `TN` · R-0388 | **3402** | Match (65 awarded, p2p Dec 9 2 pm). Conflict: units left 9 ending Nov 20 (v3) vs 0, exhausted Nov 24 (master); v3 puts T.N. on K. Hale's caseload, master has no staff. |
| R-0384 E.C., 5 | 4437 | `EC` · R-0384 | **4471 (v3's M.R.)** | Match (Anthem, 90 units, denied Oct 22). Appeal window: v3 Dec 21 (53 d) vs master 51 d (`appeal_days_left`). |
| R-0395 S.B., 11 | 4430 | `SB` · R-0395 | **4210** | Match: 14 left of 80 = 66 used. |
| R-0380 L.V., 16 | 4426 | `LV` · R-0380 | **4110** | Match: 38 of 60 left. |
| R-0377 P.G., 10 | 4419 | `PG` · R-0377 | **4300** | Match: 19 of 24 left, outpatient. |
| REF-118 | — | `REF-118` | — | Match. |
| REF-121 R.M., 8 Campbell ES-1 | — | `REF-121` **A.R., 9, LC-ES3** | — | **Same id, different child.** Do not import. |
| REF-123 G.H., 13 | — | none (next live id is REF-122) | — | No counterpart. |
| Jordan Perez, Kayla Hale | — | `jperez`, `khale` | — | Match. v3 Maria Wood (admin) and Sam Ortiz LCSW: **no counterpart** (master admin Dana Owens; clinician Perez). v3 cohort clinicians D. Reyes, A. Kim: none (master J. Reyes is direct support). |
| Payers `sentara anthem aetna humana uhc ffs` | — | same slugs | — | Match; display names differ (Sentara Community Plan vs Health Plans). |
| Cohort `S00001…S00120` | — | none | — | Illustrative. `L.V.` and `T.N.` also occur as cohort initials; namespace as `COH-` and hide initials. |
| Master-only: J.T., D.P., A.G., E.S., C.B., L.B., N.K., P.S., R.D., A.M. | — | clients | 3315… | No v3 counterpart. |

Rule: unified code joins on master `client.id`, `request.id`, `referral.id`; Harvest # stays a display/Lauris join key owned by master and by what the bridge observes (`matchClient`, `lead-extension.js:12-16`).

### C2 Status mapping
| Master `request.stage` | v3 stage key → status5 | Unified filter group (spec 7.1) | Notes |
|---|---|---|---|
| draft_ready | `sign`/`referral` → draft, review | Draft | v3 shows both as "Waiting for signature" |
| awaiting_signature | `sign` → review | Awaiting signature | |
| signed | `sign` → ready | Awaiting signature ("ready to send") | master only gates Send on this |
| sending, portal_open | — | Submitted (transient) | master only |
| submitted | `submitted`/`sent`/`decision` → submitted, pending | Submitted | |
| overdue | `submitted` + clock text | Needs action | v3 has no overdue state |
| info_requested | `info` → info | Needs action | |
| partial_decide | `partial` → partial (issue `partial` or `reduction`) | Needs action → Denial Intelligence | |
| peer_to_peer_requested/booked, p2p_awaiting | `p2p` → partial; DI `p2p-prep`/`p2p` | Denial Intelligence | |
| denied · appeal_sent | `denied`·`appeal` → denied·appeal | Denial Intelligence | |
| (none) | `recon` → recon | Denial Intelligence | no master stage; keep in `disputes.path='recon'`, `unverified` pathway |
| active | `active` → approved | Active / Renewal due | |
| early_discharge | option inside DI (`alt`/door) | Active + care transition | master only |
| closed | `closed` → closed | All | |

v3 dispute statuses (auth group: decide, drafted, p2p-prep, p2p, recon-prep, recon, evidence-prep, info-req, appeal-prep, appeal, alt, upheld, sent, accepted, resolved, closed; claim group: 8) and `diStatus` (new … overturned, partover, upheld, closed) are **resolution** states. Reconcile: `overturned`→`active` with awarded units; `partover`→`active` with units; `upheld`→stay adverse; `accepted/closed`→no stage change. v3 `claim` disputes are illustrative (no claims domain in master).
Referral stages: master `REF_STAGE` lacks `declined`, which seed uses (4 rows) and `Referrals.js:7` patches locally; v3 uses `needs-call|call-booked|new|grant`.

### C3 Duplicate concepts
Case/authorization (master request vs v3 `PSY.data.cases` + `R5.auth`); audit trail (master `events` vs `audit`/`log`/`hist`); version flow (master `lauris.savedVersion` + `fills` vs `PSY.sync`); timers (`timers`+`blocks` vs `PSY.time` entries); sign-off (Lauris Forms to Approve both); submission (`request.send` vs `PSY.submit5`); eligibility (master record+DMAS proof vs v3 coverage-change alert); partials/p2p/info/appeal (master four screens vs v3 workspace); payer playbook (master table vs v3 rules registry); family-link settings (master store key with no UI vs v3 screen); analytics (3 datasets).

### C4 Clock and date conflicts
Master: story date + wall-clock time; Lauris separate; hard-coded Oct 29 in four places. v3: fixed `10:42 am` (`shell.js:31`), labels like "Dec 9" parsed with year inferred from month (`50-denials-util.js:35-41`: month ≥ Jul → 2026), `TODAY = Oct 29` literal in 14 modules, no day advance. Cohort uses `new Date(2026,9,29)`. Fix: one clock service (below).

### C5 Other conflicts to decide
Unit rule: master 60/180/300 min → 1/2/3 units vs v3 120/180/300 (cites DMAS Ch. IV p. 39); BRIEF.md states only "3 units at 5 h". Two Lauris mocks (server vs in-page). Two PDF writers (`pdf.js` Node vs `PSY.pdf`/`pdfReport` browser). Palette: master navy/teal/DM Sans; v3 remaps hexes at render time (`shell.js:97-105`, e.g. #217A78 → #1D4F43).

## D. Disposition (effort in person-hours, ph; dependencies in section G)

### D1 v3 modules
| Module(s) | Verdict | What changes | ph |
|---|---|---|---|
| `build.py`, `00-starter`, `03-ext-status`, `20-case`, `40-home`, `79-flow-decision`, `81`, `82`, `10-referrals`, `captured/*` + `captured.js` (19 canvas copies) | DROP | superseded by master `.dc.html` screens | 0 |
| `shell.js`, `shell.css` | DROP shell/tabs; PORT 3 ideas | `PSY.can` feature perms → registry permissions; `theme.remap` → runtime re-skin; presenter menu → toolbar | 8 |
| `platform.css`, `lauris.css` | PORT / DROP | chip/table/status patterns → `web/css/components.css`; Lauris CSS dropped | 8 |
| `data.js`, `lauris-data.js`, `10-referrals` | REPLACE-WITH-MASTER | keep only the crosswalk (C1) | 2 |
| `01-core.js` | REFACTOR | statuses → C2; `EV` provenance labels → source chips; `RU` rules → `settings.rules`; `MO` money (opt.); `EL` coverage change → Eligibility; `AL` alerts → My Work | 24 |
| `02-core-data.js` | PORT data | 28 rules, channels, services, benefits, disputes → `seed/extra/*.json` | 8 |
| `04-filterbar`, `04b-daterange` | PORT | → shared `ui/filterbar.js` | 10 |
| `05-sync.js` | REFACTOR | → `doc_versions`; "Synced" only from observed events | 14 |
| `06-pdf-report.js` | PORT | isomorphic report builder with charts; `file.pdf` accepts bytes | 10 |
| `07-api.js`, `09-voice.js`, `42-flow.js` | DROP (roadmap) | autonomous agents violate spec 4.2/9.6; keep as `vision` rows in maturity registry; "Ask" covered by `41f` | 0 |
| `08-history.js` | REFACTOR | History component over master `events` + `requestHistory`; actor tags; drop voice/agent | 16 |
| `20-case-data`, `30-reco-data`, `reco.js`, `78-flow-continued`, `89-drafts` | REFACTOR | static hub/criteria/recommendations → Evidence/Documentation panel data and the missing-evidence seed; no new facts | 40 |
| `40-dash-util`, `80-p1-util` | REFACTOR | owner/days-in-state/deadline/units helpers → `sel/auth.js` | 20 |
| `41-analytics`, `41c`, `41d`, `41e`, `41f`, `85-analytics-data`, `85c-cohort` | PORT | three sections, 38 cards, export, suggested questions; cohort as `illustrative` module; case-backed adapters | 108 |
| `50-denials-util` | REFACTOR | model → `sel/disputes.js` + `x-disputes.js` | 30 |
| `50-denials` | PORT | queue (9 columns, 8 filters, sort) | 14 |
| `51-denial-detail` | REFACTOR | workspace: Decision / Evidence / Options / Action / History; side panels | 48 |
| `86-partials`, `87-p2p`, `88-requests` | REFACTOR / REPLACE | doors + p2p guide merge into master `Partials`/`PeerBrief`; info/sent trail → master | 22 |
| `63-ext-time`, `time.js` | PORT | → `time_entries`, panel Track Time, mobile | 32 |
| `scribe.js` | REFACTOR | note-type selector, "Not stated", version flow only | 20 |
| `76-enhance`, `76b-cna-scan` | REFACTOR | modes A/B, findings schema, source chips; drop addenda and simulated submit | 62 |
| `63b-ext-overview` | PORT (stretch) | roster + stepper → extension "My patients" | 16 |
| `80-auth-list` | PORT | Authorizations queue, filters, detail | 24 |
| `83-settings`, `84-family-settings` | PORT | roles matrix, unit rules, audit CSV, family-link settings | 28 |
| `60`-`62`, `64`-`75`, `77`, `lf-kit.js`, `65`-`69-*`, `70`-`75` (simulated Lauris UIs and DMAS form) | DROP | master mock Lauris is authoritative; copy only Time Tracker and Authorizations page layouts into `server/lauris/site.js`, DMAS field list into `forms.js` | 16 |
| **Total ported/refactored** | | | **≈580** |

### D2 Master screens (all REUSE unless noted)
| Group | Disposition |
|---|---|
| `SchoolPortal, ReferralForm, ReferralSent` | REUSE; privacy review only (Phase G) |
| `Referrals, Referral, Eligibility` | REUSE; reachable from My Work and a "Referrals" link, **never redirected** |
| `FamilyLink, ParentSign, ParentPortal, ParentEnroll, ParentProgress, ParentQuarterly, ParentLetters, ParentSchedule, ParentSurvey, AppealLetter` | REUSE; Phase G checklist home + configurable signature mode (REFACTOR `ParentPortal`, `ParentSign`: 14 ph) |
| `MobileApp, MobileDictate, MobileAssess` | REFACTOR to student → time → say → review → ready flow (20 ph) |
| `Login` | REFACTOR: role cards, mode toggle (4 ph) |
| `DoNext, ReviewQueue, StaffDashboard` | REFACTOR into My Work sections; keep routes (22 ph) |
| `Authorizations, Submission, EarlyDischarge` | REFACTOR: queue + case shell, Submission and transition as sections (counted in D1 `80-auth-list`) |
| `InfoRequest, Partials, PeerBrief, PayerPlaybook` | REFACTOR into Denial workspace actions; routes redirect (counted in D1) |
| `Analytics`, `Users`, `WhereThingsLive` | REFACTOR (three sections); REFACTOR (→ Settings, 6 ph); REUSE inside presenter drawer |
| `ExtHome` + 11 `Ext*` templates + `panel.js` | REFACTOR: split panel into views, simplify home, note-type selector (24 ph); templates REUSE |

### D3 Master server and shared code
`core.js` REUSE (lead-only; add actor/sim fields to `event()`); `lead-extension.js`, `x-panel.js` REUSE + hook points; other 11 action files REUSE; `x-requests-history.js` REFACTOR (wrapped by disputes); 17 orphans: delete or document (3 ph); `store.js` REFACTOR (hooks, clock, projection: 10 ph); `pdf.js` REUSE + raw-bytes path (3 ph); `lauris/*` REUSE (+8 ph pages); `external/site.js` REUSE; `draft.js` REUSE, `dates.js` unit rule made configurable (4 ph).

## E. Target architecture for the three-tab platform (inside master)

**E1 Routes and redirects.** New: `MyWork` (`?section=todo|review|team|referrals`), `Authorization` (case shell `?id=&section=timeline|documents|evidence|submission|units|payer|tasks|transition`), `DenialIntelligence` (queue), `DenialCase` (`?id=&section=decision|evidence|options|action|history&action=`), `Settings` (`?tab=users|roles|units|audit|family-link|presenter`). Kept: `Authorizations`, `Analytics` (`?section=outcomes|payer|population&dataset=case|illustrative`), all Ext/Mobile/Parent/School routes, `Referrals/Referral/Eligibility`, `AppealLetter` (guardian-facing, not a staff redirect). Redirect map in `registry.js`, applied in `route()` and `hrefFor()` before the `BY_ID` check:

| Historic | Target |
|---|---|
| `DoNext` · `ReviewQueue` · `StaffDashboard?v&staff` | `MyWork?section=todo` · `review` · `team` |
| `Users` | `Settings?tab=users` |
| `Submission?id` | `Authorization?id&section=submission` |
| `EarlyDischarge?id` | `Authorization?id&section=transition` |
| `InfoRequest?id` · `Partials?id` · `PeerBrief?id` | `DenialCase?id&section=action&action=info` · `=options` · `=p2p` |
| `PayerPlaybook` | `Analytics?section=payer&panel=guidance` |
| `WhereThingsLive` | presenter drawer (route stays valid) |

Phase E ships the workspace first as a shell that deep-links to the existing screens (lowest risk), then folds them in. A `test/routes.mjs` replays the 23 deep-link patterns of A5 and asserts a render with no console error. Navigation is a data-driven `NAV` config (3 tabs + "More" + user menu) so the UX agent can change it without code.

**E2 Shared selectors** (new `web/js/shared/sel/*.js`, pure, importable by server and panel): `authQueue(s,filters,me)`, `authCase(s,id)`, `deadline(s,req)` (date + source + verification kind), `unitRule(s,service)`, `disputes(s,filters)`, `evidenceIndex(s,client,period)`, `timeSummary(s,client,date)`, `analytics(s,section,filters,dataset)`, `clock(s)`.

**E3 New collections and actions** (all additive; keys pass through seed/extra):

| Collection | Shape | Actions |
|---|---|---|
| `disputes` | `{id:'DI-0402', request, issue, status, path, owner, opened, closed, docs:{info,p2p,appeal,recon:{gen,reviewed,versions[]}}, p2p{date,time,ref,outcome}, deadlines[{kind,date,source,verification}]}`; claim rows `provenance:'illustrative'` | `dispute.open/choose/genDoc/editDoc/reviewDoc/assign/resolve` (resolve calls existing `request.*` to reconcile stage) |
| `evidence_marks` | `{client, ref, excluded, sensitive, reason, by, at}`; the index itself is derived | `evidence.mark`, `evidence.period` |
| `time_entries` | `{id, staff, client, date, start, end, minutes, paused_min, what, goal, status, dpn, source, corrected_from}`; `timers[staff]` stays for the live timer | `time.start/pause/resume/stop/save/discard/link/correct` |
| `doc_versions` | `{key, client, form, mode:'current'|'historical', stages[{stage,text,at,by,src}], findings[{id,category,issue,why,evidence[],rule,suggestion,state}], lauris_status}` | `enhance.scan/decide/approve/filled/historical`; stages beyond `filled` are set **only** by `lauris.observed/savedVersion` hooks |
| `rules` / `unit_rules` | v3 28 rules + per-service tiers with `kind` and `source` | `settings.rule`, `settings.unitRule` |
| maturity registry | static `web/js/shared/maturity.js` `{featureId:{level:'working|simulated|pilot|vision', note}}` | none |
| `events` | add `actor_kind`, `sim` | `event()` signature |

A `store.hooks` registry (`observed`, `reset`) lets x-files react to bridge events and Lauris reset without editing `lead-extension.js`.

**E4 Presentation and Explore.** Mode in `localStorage psyflo_mode` and `?mode=`. The existing `#bar` (`index.html:15-21`, `app.js:157-181`) becomes the presenter toolbar: hidden in Presentation (toggle `Ctrl+Shift+P` or `?presenter=1`, clearly styled as not product), always shown in Explore. Contents: scenario selector (server action `demo.scenario{id}` = reset preset + Lauris hook + seed tweaks + target route; scenarios 1-6 of Part 14.2), role switcher (`session.signIn`, no reload), reset/preset, simulation controls moved from `Authorizations` (admin-only receive-reply, advance **both** clocks, p2p slot), screen picker, "How the data gets in" drawer, maturity chips in the drawer (`data-maturity`). Each new screen needs a `seed/notes.md` section or the drawer reads "No note".

**E5 Analytics datasets and provenance.** Every selector returns `{rows, provenance:'case_backed'|'harvest_export'|'illustrative', asOf, source}`. Rules: one dataset per view (toggle, banner chip); no sums across datasets; `analytics_baseline` is labelled "Harvest Lauris export, Oct 29 (seeded)"; the cohort is generated deterministically in a pure ESM module (not stored in state; 1.7 MB would be re-sent on every SSE refresh), ids `COH-…`, initials hidden; min group size 5 enforced inside selectors, patient-level drilldown only for `case_backed` plus the `clinicalRecords` permission. Pilot metrics (spec 12.5) are `case_backed` and defined in one `metrics.js`.

**E6 Scan & Enhance modes.** *Mode A, current draft*: input = open form read by the bridge; output = findings, accept/reject/edit, compare, approve, **fill the open form** (bridge `fill`), version history in `doc_versions`; "saved/processed in Lauris" arrives only through observed events. *Mode B, historical*: input = Psyflo's own captured copies (`notes`, `lauris_versions`, seeded export), never a Lauris scrape; output = read-only analysis (gaps, repeated boilerplate, dated observations, intervention counts) feeding `evidence`; no fill command is exposed (`mode:'historical'` guard in the action and absent in the panel). v3's addendum path is off by default and listed as "not validated". M.R. needs a seeded corpus (≈61 daily, 12 weekly, 3 monthly notes tied to ISP goals; ≈8 ph) or Scenario 4 has nothing to review.

**E7 Permissions and projection.** Replace cumulative `min` with a permission set per role (v3 flags plus `referrals`, `reviewQueue`, `team`, `users`, `demoControls`); admin default has `auth, denials, analytics, settings, users` and **not** `clinicalRecords`. Add `GET /api/state?as=<staffId>` returning a projection that strips clinical text for roles without access (`notes.fields`, `lauris_versions`, `screenings`, `drafts`, `fills`, `dictations`); `POST /api/do` checks a per-action permission table. Demo-grade (identity is a query parameter) but it removes the "everything is in the network tab" exposure.

**E8 Clock.** `store.clock = {date, time:'wall'|'fixed:HH:MM', advance()}` replacing `state.today`+`new Date()`; Lauris reads it; `model.js` stops hard-coding Oct 29 and the 08:40 fudge; derived dates carry a `basis` field and a `verification` kind (spec 4.6, 15.5).

## F. Lauris bridge preservation plan

**Must not change** (list in `test/bridge-contract.mjs`): element ids `#lauris-flash` (+`data-event|session|form|consumer`), `#lauris-form` (+`data-form|session|consumer`), `#session-form-title`, `#consumer-list tr[data-consumer][data-program]`, `#approval-list tr[data-session]`, `#lauris-preview` (+`.wm`, `.row b`), `#get-signature`, `#approval-status`, `.hdr .nm|.units`, `.top .r`, `.side .lnav .b`, portal `#portal-confirmation[data-ref|request|kind]`, `#portal-form`; box discovery by `label[for]` or `aria-label` text; PRG redirects `?processed=|saved=|signed=|rejected=|created=`; `data-psyflo="typed"` + classes `g`/`y`; panel ↔ bridge message shapes (`{psyflo:'panel',cmd,id}` / `{psyflo:'bridge',type:'page'|id,result}`); origin checks; manifest host permissions; `bridge.js` copy at server start; never click Process/Signature/Send; no background fetch to Lauris. **May change additively:** new `cmd`s (e.g., `read` of an *open* processed note for Mode B), new label aliases in `forms.js`, new mock pages (`/time`, `/authorizations`), panel views. **Constraints for new work:** Track Time and Scan & Enhance must reach Lauris only through `fill`/`read` on the open page; Mode B reads Psyflo's captured copies; in-page and extension modes must both pass `panels.mjs`; the `inpage` panel `<iframe src=/panel/>` stays same-origin with the app.

## G. Migration plan, ownership, order, checkpoints

**Kickoff (lead, before parallel work, ≈30 ph):** reconcile seed and write `seed/extra/crosswalk.json`; pre-register **all new routes** with stub controllers/templates, `NAV`, permission map, redirect table (freezes `registry.js`/`app.js`); add `store.hooks`, clock service, projection; tokens file; `test/run-all.mjs` (reset → ordered flows → report; fixes the flowA→flowC coupling).

| Phase | Content | Gate (all of: `npm test`; smoke as 4 roles; `flowA→flowC`, `flowB`, `flowD`, `panels`; plus) |
|---|---|---|
| B | tokens, `components.css`, `ui/*` (filterbar, table, chip, drawer, timeline, history, source chip), `theme.remap` | screenshots of 5 old screens unchanged; no logic diffs |
| C | three-tab nav, My Work, redirects, permissions, mode + presenter toolbar | `routes.mjs`, `roles.mjs` (each role sees only its permitted routes and data), `clock.mjs` |
| D | panel split, simple home, Scribe selector, Track Time, Scan & Enhance A/B | `bridge-contract.mjs`, `enhance.mjs` (finalized note never overwritten; wrong-patient guard), `time.mjs` |
| E | Authorizations queue/case, `disputes`, Denial queue/workspace, evidence index | `denials.mjs`: partial → dispute → resolve → request stage + queues + analytics reconcile; Scenarios 3-5 end to end |
| F | Analytics three sections, datasets, export, metrics | `analytics.mjs` (provenance tags, min-n, no blending, permission-gated drilldown) |
| G | mobile, family, school, review queue, settings | visual checks 1440/1024, 400-px panel, 390-px phone; keyboard pass |
| H | full regression, visual and a11y passes, walkthrough, registers | acceptance 1-18 of spec Part 22 |

**File ownership (parallel engineers; E = engineer).** *Lead only:* `web/index.html`, `web/js/app.js`, `registry.js`, `runtime.js`, `api.js`, `ext-composite.js`, `shared/model.js`, `dates.js`, `draft.js`, `server/index.js`, `util.js`, `pdf.js`, `psyflo/store.js`, `actions/core.js`, `lead-extension.js`, `x-panel.js`, `server/lauris/site.js`, `forms.js`, `web/panel/bridge.js`, `extension/*`, `seed/seed.json`, `web/css/tokens.css`, `docs/`. Everyone adds only new files with their prefix and a `seed/extra/<group>.json`.

| E | Owns |
|---|---|
| E1 design system, presenter, settings | `web/css/components.css`, `web/js/ui/*`, `ui/presenter.js`, `shared/maturity.js`, `Settings`, `Users`, `Login`, `WhereThingsLive`, `x-settings.js`, `seed/extra/settings.json`, `rules.json` |
| E2 authorizations, My Work | `Authorizations`, `Authorization`, `Submission`, `EarlyDischarge`, `MyWork`, `DoNext`, `ReviewQueue`, `StaffDashboard`, `Referrals`, `Referral`, `Eligibility`, `sel/auth.js`, `sel/mywork.js`, `x-auth.js` |
| E3 denial intelligence | `DenialIntelligence`, `DenialCase`, `InfoRequest`, `Partials`, `PeerBrief`, `PayerPlaybook`, `sel/disputes.js`, `x-disputes.js`, `seed/extra/disputes.json` |
| E4 analytics | `Analytics*` (+`.dc.html`), `shared/analytics/{cohort,casebacked,metrics,export,pdf-report}.js`, `x-analytics.js` |
| E5 extension and capture | `web/panel/panel.js` → `web/panel/views/*`, `panel.css`, `Ext*.dc.html`, `shared/enhance.js`, `shared/time.js`, `x-time.js`, `x-enhance.js`, `MobileApp`, `MobileDictate`, `MobileAssess`, `seed/extra/notes-corpus.json` |
| E6 portals and QA | `Parent*`, `FamilyLink`, `SchoolPortal`, `ReferralForm`, `ReferralSent`, `AppealLetter`, all new `test/*.mjs` (except runner) |

Order: kickoff → B (E1) in parallel with D (E5) and data work (E3/E4 selectors, E2 `sel/auth.js`) → C (lead, E1) → E (E2, E3) and F (E4) → G (E5, E6, E2) → H. Merge rule: engineers rebase on the lead's integration branch daily; a PR touching a lead-only file is rejected.

## H. Risk register
| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| 1 | Harvest # / id collisions (4471; REF-121; cohort `L.V.`,`T.N.`) cause wrong-patient joins | M | H | Master ids only; `crosswalk.json`; `COH-` namespace; test that no v3 number is imported |
| 2 | Status vocabularies diverge in unified code | H | H | Single `request.stage`; disputes reconcile via actions; one mapping table in code with a test |
| 3 | Clock drift (Lauris, hard-coded dates, wall time, 08:40 fudge) produces impossible dates | H | M | Clock service (E8); remove literals; `clock.mjs` |
| 4 | Unit rule conflict (60 vs 120 min) | M | H | Configurable rule with `source`/`verification`; ask Harvest; show "unverified" |
| 5 | Whole-screen repaint loses edits in long workspaces | H | M | Controller-held drafts, `noRepaint`, repaint debounce; test with SSE during typing |
| 6 | Template engine cannot express v3 UIs (no expressions/attrs); rewrite cost | H | M | Use `raw()` for trusted fragments; component helpers in `ui/*`; budget in D1 |
| 7 | Bridge/Lauris DOM contract regressions | M | H | `bridge-contract.mjs`; lead-only files |
| 8 | Role gating is cosmetic; clinical text reaches every browser | H | H | E7 permissions and projection; label demo-grade |
| 9 | v3 patterns reintroduce autonomy (agents, auto-submit, addenda, "Synced") | M | H | Dispositions in D1; maturity labels; safety review of every ported action |
| 10 | Datasets blended silently in analytics | M | H | Provenance tag in selector return type; test |
| 11 | Scenario 4 has no rows (0 M.R. daily notes; constants 21/61) | H | M | Seed corpus; compute counts |
| 12 | Merge conflicts across 6 engineers | M | M | Kickoff freeze, ownership table, daily rebase |
| 13 | Test fragility (shared server state, flowC depends on flowA, wall-clock stamps) | H | M | `run-all.mjs` with resets; fixed clock mode in tests |
| 14 | State and payload growth (cohort 1.7 MB) slows SSE refetch | M | M | Cohort generated client-side, not in state |
| 15 | Seeded-only panel drafts for 3 students undermine Explore mode | H | M | Label "seeded example" via maturity chips; extend corpus to 2 more students if time |
| 16 | MV3 extension cannot be tested headless | M | M | In-page fallback tests + manual Chrome pass in Phase H |
| 17 | Presenter controls mistaken for product | L | M | Distinct styling, hidden by default |

## I. What fits in a realistic build
Assumption: 6 engineers + lead, ≈30 productive hours each per week (≈210 ph/week, ≈420 ph in two weeks). Full scope ≈860 ph: v3 port ≈580 + shell/nav/permissions/presenter 44, tokens/components 30, store/actions/selectors 40, mobile/portals/My Work 56, seed reconciliation and corpus 24, tests/QA 60, orphan cleanup 6.

| Tier | Content | ph | Fits |
|---|---|---|---|
| 1 must-ship | kickoff, nav/redirects/roles/presenter, tokens/components, Authorizations queue + case shell, Denial queue + workspace on master data (links to existing screens), Analytics three sections (case-backed + illustrative toggle, export), extension home + Scribe selector + Track Time + Enhance A/B (core), M.R. corpus, tests | ≈400 | two weeks |
| 2 | fold Partials/Info/Peer into workspace, History component, settings matrix, unit rules, My Work sections, mobile flow, portal polish | ≈260 | weeks 3-4 |
| 3 defer | Overview roster, FLO/voice (roadmap labels only), claims disputes, money exposure, v3 DMAS form sim, weekly analytics email | ≈200 | vision/roadmap |

One-week build: kickoff + Phases B and C + Authorizations queue + Denial queue (skeleton) only.
