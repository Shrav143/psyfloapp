# 04 · Implementation plan (as built)

> **Update, Nov 11.** Written before the direct support and site supervisor feedback round. Where this document describes **My Work** (the logo target, its To do, Review and Team sections) or **Track Time**, read the current product instead: the rail is patient-first (Dashboard, Documentation, Authorizations, Denial Intelligence, Analytics), My Work's sections moved to the Dashboard and Documentation, and Track Time was removed. See `docs/FEEDBACK-ROUND-2026-11-11.md`.

Deliverable 4 (prompt Part 21, item 4) · Nov 11, 2026 · Psyflo × Harvest unified demo

This is the plan as it was executed, not as it was proposed. It lists the code changes by module and file, compares phases B to H with the plan in `review/04-architecture.md` section G, reports what happened to each risk in the review's register, names the dependencies, accounts for every v3 module (ported or deliberately not), and ends with limitations and next steps for a pilot build.

Sizes are from `git diff --numstat` against the pristine Nov 8 commit (`d9e0537`) plus a count of registered actions. They describe this working tree on Nov 11. Test results change while QA is still working: read `review/test-results/summary.md` for the current run, not this file.

## 1. What changed, in numbers

| Area | Before (Nov 8) | After |
|---|---|---|
| Server actions | 85 in 13 files | 137 in 23 files (`store.register`); 92 entries in the authorization table, fail closed |
| Screens | 47 templates, 33 controllers | 53 templates and 57 controllers; 52 registered routes; 55 controllers added or changed (+4,278, −1,738 lines); 33 templates changed (+998, −1,857) |
| Shell (`web/js/app.js`) | 287 lines | 530 lines: sessions, rail, dock, overlays, repaint holding |
| Extension panel | one file, `panel.js`, 997 lines | a 3-line loader, `core.js` (304), `parts.js` (66), 9 view modules (1,606), 5 lib modules (265) |
| Shared client code | `model.js`, `dates.js`, `draft.js` | those three changed, plus 24 new files (27 touched, +4,366 lines): permissions, rules, clock, nav, maturity, selectors, analytics |
| UI kit | none | 15 modules (960 lines), `tokens.css` and `components.css` (463 lines), a gallery route |
| Seeds | `seed.json` plus a few extras | 13 `seed/extra` files (+4,734 lines): rules (72), M.R. notes corpus, disputes, scenarios |
| Tests | 7 files | 45 files in `test/` (7,976 lines) and 9 library modules (1,217 lines); 41 suites run by one runner |
| Maturity registry | none | 89 entries: Working 29, Simulated 32, Pilot (preview) 5, Future 23 |

The product still runs on Node 20 with no installed dependencies. The mock Lauris, the mock portals and the page bridge keep their contract; `test/bridge-contract.mjs` guards it.

## 2. Code changes by module and file

### 2.1 Server foundation (lead; built first)

| File | Change |
|---|---|
| `server/psyflo/session.js` (new) | Server-side sessions. `POST /api/session` takes a staff id, a portal token, a school user or a sign-out, and returns a token carried in `X-Psyflo-Session`. The actor is the session; `args.by`, `staff`, `signer` and `who` are ignored. Presenter sessions need `presenter:true` and `DEMO_PRESENTER` not set to 0 |
| `server/psyflo/authz.js` (new) | The per-action capability table. An action with no entry is refused (403). Entry kinds: capabilities, portal token, page bridge, internal-only |
| `server/psyflo/project.js` (new) | Role projection of `/api/state`: every key is present, withheld data is empty. Admin receives no clinical text; a guardian receives their child's plain material; a school user receives status text |
| `server/psyflo/gates.js` (new) | `Refusal`, `needDocRef`, `needUnits`. A refusal rolls the whole action back, writes an audit event "Refused · …" and answers 409 or 422 |
| `server/attest.js` (new) | Demo-grade attestation: a reported page-bridge event is checked against what the mock Lauris or mock portal itself shows before Psyflo records "processed" or "signed" |
| `server/psyflo/store.js` | Clock (`store.clock`, `advance`), hooks (`observed`, `reset`, `advance`, `scenario`), `defineAction`, rollback on any exception, projection and authz registration |
| `server/psyflo/actions/core.js` (+440, −148) | New stage `needs_approval` ("Pending clinical approval"); `request.approve`, `request.send`, `request.resend`, `request.appealSend`; write-once payer decisions with a document reference; `applyAward` creates the "Enter units in Lauris" task and never writes units into Lauris |
| `server/psyflo/actions/x-foundation.js` (new) | `demo.scenario` (the six scenarios and the checkpoint fixtures), `settings.rule` (rule edits, audited), `user.designate` and `user.designateApprove` |
| `server/index.js`, `server/util.js` | Action autoload with optional `authz`, `projection` and `hooks` exports; one clock shared with the mock Lauris; presenter and test environment variables |

### 2.2 Client foundation (lead)

| File | Change |
|---|---|
| `web/js/shared/permissions.js` (new) | `ROLES` (four staff roles plus guardian and school), 31 capabilities, `can()`, `routeAllowed()`. Imported by the server and the client, so both enforce one table |
| `web/js/shared/rules.js` (new), `seed/extra/rules.json` (72 rules) | Deadlines, unit bands and signature modes with a source category and verification label. Edited only through `settings.rule`, audited |
| `web/js/shared/clock.js` (new) | `today(s)` and `now(s)`. The hard-coded Oct 29 and the 08:40 fudge in `model.js` and `draft.js` are gone |
| `web/js/shared/nav.js`, `redirects-live.js`, `web/js/registry.js` | The rail as data, 14 redirect rules, route flags. Every historic route id still resolves |
| `web/js/shared/maturity.js` (new) | One registry of how real each route and feature is |
| `web/js/app.js`, `api.js`, `ext-composite.js` | Sessions, the shell, landmarks and focus, the presenter dock, scenario running, overlay stack, repaint holding while an overlay is open or a field is being typed in |
| `web/css/tokens.css`, `components.css` (new) | Brand kept (DM Sans, paper, teal, navy for tool chrome only, marigold as marker); the legacy `--ink`, `--muted` names remap so old screens keep working |

### 2.3 UI kit (`web/js/ui/*`, 15 modules)

`chip.js` (status vocabulary, maturity, source, dataset, evidence chips), `filter-bar.js` and `query.js` (URL state), `queue-table.js`, `overlay.js` (modal, drawer, popover, confirm on one stack), `timeline.js` (timeline and history), `draft-review.js` (three-way review), `dock.js`, `sim.js`, `toast.js`, `misc.js`, `util.js`, `wire.js` (one delegated listener), `contrast.js`, `index.js`. The gallery is the presenter-only route `UiKit`. Specification: `docs/UI-KIT.md`.

### 2.4 Screens by owner

| Owner | Files | What they built |
|---|---|---|
| E1 My Work, Settings, Login | `MyWork.js`, `MyWorkViews.js`, `Settings.js`, `SettingsData.js`, `Login.js`, `sel/mywork.js` (515), `actions/x-settings.js` | One role-filtered list; seven Settings tabs; designated access with a second-person confirmation; `seed/extra/scenarios.json` |
| E2 Authorizations, referrals | `Authorizations.js`, `Authorization.js` (case shell), `Referral.js`, `Referrals.js`, `sel/auth.js` (538), `actions/x-auth.js` | Queue, case shell (Submission and Early discharge became sections), five-state eligibility panel, owner and backup owner, Day-N clocks |
| E3 Denial Intelligence | `DenialIntelligence.js`, `DenialCase.js`, `DenialCaseViews.js`, `sel/disputes.js` (524), `actions/x-disputes.js` (11 actions), `payer-guidance.js`, `seed/extra/disputes.json` | A `disputes` layer that reconciles into `request.stage`; queue and five-tab workspace; information request, partial decision, peer-to-peer, appeal and reconsideration as actions inside the case |
| E4 Analytics | `Analytics.js`, `AnalyticsParts.js`, `shared/analytics/*` (10 modules), `actions/x-analytics.js` | Pilot scorecard, three sections, case-backed and illustrative datasets, minimum group size 5, CSV and PDF export, rule-based question box |
| E5 Extension | `web/panel/core.js`, `views/*`, `lib/*`, `shared/enhance.js`, `actions/x-enhance.js`, `x-scribe.js`, `seed/extra/notes-corpus.json` | Panel split into views; Scribe note-type selector; three-way review; Scan & Enhance modes A and B; M.R. corpus of 40 daily, 9 weekly and 3 monthly notes |
| E6 Portals | `ParentPortal.js` (+373, −236), other `Parent*`, `FamilyLink.js`, `SchoolPortal.js`, `ReferralForm.js`, `AppealLetter.js`, `sel/portal.js`, `actions/x-portal-*.js` | Checklist home, one task per screen, signature modes, school "Harvest needs" card, four-section referral form |
| E7 Capture | `MobileApp.js`, `MobileDictate.js`, `MobileAssess.js`, `shared/time.js`, `panel/views/time.js`, `actions/x-time.js` (12 actions), `server/lauris/*` | One time model (four separate figures), phone flow, mock Lauris clock, Time and Authorizations pages |

### 2.5 Mock Lauris, page bridge and extension

`server/lauris/store.js` (+141) now reads Psyflo's clock, so a day advance moves both. `server/lauris/site.js` gained a Time Tracker page and an Authorizations page where a person types units; the page prints "N units available" and a flash the bridge reads, which is the only thing that closes the "Enter units in Lauris" task. `web/panel/bridge.js` changed by 13 lines, additively: a new `authorization` event and hooks for the hosted build. Every element id and message shape in the contract is unchanged. `extension/bridge.js` is the packaged copy, written at server start.

### 2.6 Tests and tooling

`test/run-all.mjs` starts the three servers per suite on given ports with a fresh data directory, runs the 41 suites in isolation and writes `review/test-results/*.md`. Families: unit; screens (`smoke`, `routes`, `ui-kit`, `visual`, `a11y`, `audit`); flows A to D; safety (`roles`, `gates`, `clock`, `rules`, `decisions`, `bridge-contract`, `safety`); areas (`authorizations`, `denials`, `analytics`, `enhance`, `time`, `mobile`, `family`, `school`, `settings`, `mywork`, `referrals`, `lauris`, `scribe`, `panels`); scenarios S1 to S6 and `fixtures`; `presenter`; `hosted`. The hosted single-file build has its own script, `scripts/build-hosted.mjs`, and a README (`hosted/README.md`).

## 3. Phases B to H, planned and executed

Plan: `review/04-architecture.md` section G. Execution is read from `docs/BUILD-BRIEF.md` and the commit history (`5553abe` foundation, `b0779b6` Denial Intelligence and Analytics, `e9c79c2` portals, `4c81d25` My Work, Settings, Authorizations, Track Time, mobile and mock Lauris pages, `961787e` the extension panel).

| Phase | Planned | Executed | Gate |
|---|---|---|---|
| Kickoff | Lead freezes routes, nav, permission map, redirects, hooks, clock, tokens, runner | Done as two foundation tracks: F1 server (sessions, authz, projection, gates, clock, rules, hooks) and F2 client (tokens, kit, shell, dock, nav, redirects). All new routes were registered with stubs first | `routes.mjs` fails on a live route that still renders a stub |
| B | Tokens and shared components | Inside F2, before any screen work. Wider than planned: overlays, draft review and the dock were built here | `ui-kit.mjs` |
| C | Three-tab navigation, My Work, redirects, permissions, presenter and modes | Foundation plus E1. The "More" menu was dropped for a rail with Referrals and Settings as small links | `routes.mjs`, `roles.mjs`, `clock.mjs`, `presenter.mjs` |
| D | Panel split, simple home, Scribe selector, Track Time, Scan & Enhance A and B | E5 and E7 in parallel. The panel was split in the first 20 minutes so Track Time could build against the view registry | `bridge-contract.mjs`, `enhance.mjs`, `time.mjs`, `panels.mjs` |
| E | Authorizations and Denial queues and workspaces | E2 and E3. The plan said to ship the workspace first as a shell that deep-links to the old screens. That was not done: Information request, Partials and Peer-to-peer were folded in directly and the old routes redirect | `denials.mjs`, `authorizations.mjs`, S3 and S5 |
| F | Analytics, three sections, datasets, export | E4, with the pilot scorecard first | `analytics.mjs` |
| G | Mobile, family, school, review queue, settings | E6, E1 and E7 | `visual`, `a11y`, `mobile`, `family`, `school` |
| H | Regression, visual and accessibility passes, documents | QA engineers wrote the scenario, parity, audit and visual suites; the lead integrated. Documents 1 to 9 written last | `review/test-results/summary.md` |

Three differences from the plan. First, the plan put the design system under one engineer after the kickoff; it was built before the owners started, which removed the dependency but made the foundation larger. Second, the plan proposed daily rebases and pull requests; the build used one working tree with a file-ownership table, lead-only files, and a rule that only the lead commits. Third, the plan's Tier 2 list (folding the denial screens, the History component, the settings matrix, unit rules, My Work sections, the mobile flow, portal polish) was built in the same pass as Tier 1. Tier 3 became Future chips only.

## 4. Risks: the register and what happened

Numbers follow `review/04-architecture.md` section H.

| # | Risk | What happened |
|---|---|---|
| 1 | Id collisions (#4471, REF-121, cohort `L.V.`, `T.N.`) | Master ids only. `seed/extra/crosswalk.json` holds the mapping. The cohort uses `COH-001` to `COH-120` and hides initials. No v3 Harvest number is imported |
| 2 | Status vocabularies diverge | One `request.stage` plus a stage `needs_approval`. Disputes reconcile through the existing `request.*` actions. One status table in `ui/chip.js` feeds queues, chips and the rail counts |
| 3 | Clock drift | `store.clock`; the mock Lauris reads it; seed literals removed; `clock.mjs`. A day advance moves both stores |
| 4 | Unit rule conflict (60 versus 120 minutes) | Rules table with the official 120, 180 and 300 minute bands as default, source chip shown, alternate selectable in Settings. The seeded M.R. note uses 220 minutes, which is 2 units |
| 5 | Repaint loses typed edits | The app holds a repaint while an overlay is open or a changed field has focus; `ui.draftField` keeps drafts in a store. Tested with a live update during typing |
| 6 | The template engine cannot express v3 UIs | Kit helpers return HTML for `raw()` holes; no engine change. Cost was higher than budgeted for the denial workspace |
| 7 | Bridge contract regressions | `bridge-contract.mjs`; the bridge changed by 13 additive lines |
| 8 | Role gating is cosmetic | Server-side sessions, an action table and a projected state. Labelled demo-grade: there is no password and no identity provider |
| 9 | v3 reintroduces autonomy | Not ported (section 6). Agents, auto-submit, addenda and "Synced" by a simulated writer are Future chips or absent |
| 10 | Datasets blend silently | Provenance in every selector's return type; one dataset per view; `analytics.mjs` |
| 11 | Scenario 4 has no rows | Corpus seeded; counts computed from rows. After a processed daily note the evidence count moves from 15 to 16 and units left from 27 to 25 [run Nov 11] |
| 12 | Merge conflicts across engineers | Ownership table held. Lead-only changes were asked for in reports and made by the lead |
| 13 | Test fragility | `run-all.mjs` with a fresh server per suite; flow C builds T.W. itself instead of needing flow A first; S3 can start from the `tw-isp-ready` fixture |
| 14 | State growth | The 120-patient cohort is generated in the browser and never stored; `analytics_agg` is a derived key |
| 15 | Canned panel drafts for three students | Canned drafts carry the chip "Illustrative sample". Other students get "there is no draft" |
| 16 | MV3 extension cannot be tested headless | **Still open.** The in-page panel passes `panels.mjs`; the real side panel was not run |
| 17 | Presenter controls mistaken for product | A dock that looks like nothing in the product, closed by default |

One risk the register did not list: an overlay survives a hash change. A drawer opened on a case stays open, with its scrim, after browser Back or an edited address, and blocks the page until Escape. This sits in lead-only files (`web/js/ui/overlay.js`, `web/js/app.js`) and is unfixed.

## 5. Dependencies

- **Runtime:** Node 20 or later. No npm packages for the product.
- **Tests:** Playwright with Chromium, at `/opt/node22/lib/node_modules/playwright` here or via `PW=`. Nothing else.
- **Hosted build:** esbuild, installed outside the repo (`npm i esbuild --prefix "$HOSTED_TOOLS"`).
- **Network:** one request, to Google Fonts, for DM Sans. Without it the pages fall back to the system sans.
- **Browser:** Chrome for the Web Speech microphone and for the MV3 extension. The in-page panel runs in any modern browser; Safari and Firefox were not tested.
- **Order of build dependencies:** foundation, then the seven owners, then QA. Inside the owners, E7 depended on E5's view registry; E3's payer guidance depended on nothing; E4's payer section links to E3's drawer.
- **External services:** Lauris, Sfax, SMS, DMAS, Availity, the UHC portal and the state incident portal are all simulated. Nothing leaves the machine.

## 6. Ported from v3, and not ported

Source: `demos/psyflo-tdt-v3-reference`. Dispositions follow `review/04-architecture.md` section D1.

### Ported (module, destination, what changed)

| v3 module | Destination | Change |
|---|---|---|
| `04-filterbar`, `04b-daterange` | `ui/filter-bar.js`, `query.js` | Ten dropdowns became chips plus "More filters"; state written into the URL |
| `80-auth-list`, `80-p1-util` | `sel/auth.js`, `Authorizations.js` | Owner column added; Deadline separated from Next action; one next action per row |
| `08-history` | `ui/timeline.js` | Actor and Simulated chips kept; the drawer fields are What, When, Who, Document, Source, Next action; voice and agent actors dropped |
| `01-core` evidence kinds | `ui/chip.js` | Fourteen kinds reduced to four verification labels plus maturity and dataset chips |
| `02-core-data` (27 rules) | `seed/extra/rules.json` (72 rules) | Every rule gets a source category and a verification date |
| `50-denials-util`, `50-denials`, `51-denial-detail` | `sel/disputes.js`, `DenialIntelligence.js`, `DenialCase.js` | Stepper and rail replaced by five tabs; only valid options shown |
| `86-partials`, `87-p2p`, `88-requests` | `DenialCaseViews.js`, `x-disputes.js` | Merged with the master's Partials, PeerBrief and InfoRequest; the info reply is one answer per item asked |
| `41-analytics`, `41c` to `41f`, `85-analytics-data`, `85c-cohort` | `shared/analytics/*`, `Analytics.js` | The cohort is generated client-side with `COH-` ids; the minimum group size is enforced inside the selectors |
| `06-pdf-report` | `analytics/pdf-report.js` | Export writes the period, filters, definitions and dataset |
| `63-ext-time`, `time.js` | `shared/time.js`, `x-time.js`, `views/time.js` | Recorded, direct, documented and potentially billable time are four figures; an active timer is never called billable |
| `scribe.js` | `x-scribe.js`, `views/scribe.js` | Note-type selector; what is not said becomes a question |
| `76-enhance`, `76b-cna-scan` | `shared/enhance.js`, `x-enhance.js`, `views/enhance.js` | Modes A and B; one finding at a time; no Accept all; no addenda |
| `05-sync` version ladder | `doc_versions`, `ui/draft-review.js` | "Saved" and "Processed" are set only from an observed page event |
| `83-settings`, `84-family-settings` | `Settings.js`, `x-settings.js` | Roles matrix, units, audit, family-link settings; admin has no clinical-record access |
| presenter menu, roles as feature flags | `ui/dock.js`, `permissions.js` | Server-enforced; dock outside the viewport |
| `73-lauris-auths` layout | mock Lauris Authorizations page | A person types units; the page, not Psyflo, shows them |

### Deliberately not ported

| v3 item | Reason |
|---|---|
| Simulated browser frame and the 1,180 px scaled canvas | Not responsive; fights a real 400 px panel |
| Per-page top bar (locality, bell, FLO) | Repeats on every page; locality moved into filters |
| Agents that sign in to Lauris, payers or phone lines (`07-api`, `09-voice`, `42-flow`) | Autonomous action; prompt Part 4.2. Shown as Future chips only |
| "Accept all suggestions" | Bulk acceptance defeats the review gate |
| Dated addenda and "Save & Push to Lauris" on processed notes | Part 4.1 and the Nov 7 audit-risk decision; processed records are write-once and the server refuses the write |
| "Synced to Lauris" set by a simulated writer | A fact that only an observed page event may set |
| One-click Submit (`77-flow-initial`) | A person presses Process Form, Get Signature and Send |
| Redirects that hide Referrals | Part 6 forbids |
| The seven-item "recommended next steps" on every case | Only valid options are shown |
| Provider-authored appeal draft | Guardian-led by default; the provider path shows "Not verified" |
| Newsreader serif headings | One typeface across panel, portals and platform |
| v3 Harvest numbers and ids | Collide with master ids; the crosswalk is for reference only |
| `63b-ext-overview` roster | Stretch item, not built; the panel home lists the consumers on the open Lauris page |
| Claims disputes, money exposure, the DMAS form simulator, a weekly analytics email | Tier 3: roadmap only |

## 7. Known limitations

- **Not run:** the MV3 side panel in real Chrome; live microphone and Web Speech; Safari and Firefox; a venue network; a published artifact host for the hosted build (`hosted/README.md`).
- **Simulated:** Lauris, Sfax, SMS, DMAS, the payer portals, signatures' identity (a name read from the mock Lauris event), rule-based drafting (no language model).
- **Demo-grade identity:** sign-in has no password. The server enforces the matrix all the same.
- **Overlay defect** above (section 4).
- **Small groups:** with ten requests spread across five payers, every row of Payer Performance reads "Fewer than 5". That is the minimum-group rule working, and it means the case-backed payer table says little until there is more data.
- **Seeded history:** requests sent before the approval stage existed show "Not recorded" for approver and signer.
- **The scripted screening call** plays at about 1.3 seconds per line, 37 lines, roughly 48 seconds. A faster pace exists only as a console switch used by tests.
- **Rules:** 7 and 14 day decision windows, the 30-day clocks, the day-10 call and the 1 hour versus 2 hour daily minimum are unverified or Harvest-reported and carry chips that say so. `docs/deliverables/08-unresolved-decision-register.md` lists them.
- **Hosted build:** data is in memory; a reload resets the demo.
- **Targets under 24 px** remain on desktop: 18 px info buttons and sortable headers.

## 8. Next steps for a pilot build

Pilot scope and waves are in `09-pilot-vs-full-vision.md`; the open decisions are in `08-unresolved-decision-register.md`. Engineering steps, in order:

1. **Run the manual checklist** in `review/test-results/summary.md`: the MV3 panel in Chrome (S1 and S3), a real microphone, Safari and Firefox, the venue network.
2. **Real identity and storage.** Replace demo sessions with an identity provider; replace the JSON store with a database; keep the action table, the projection and the gates, which are the parts that carry over. Sign a BAA before any real record enters.
3. **Real Lauris access.** Confirm field labels against the real forms (`server/lauris/forms.js` is a best reading) and run the bridge on the real pages. Decide whether Psyflo may fill without a person pressing Fill each time.
4. **Drafting.** Put a hosted model behind the same `draft(formType, sources)` function with the existing checks as the gate, or keep rules. Either way each statement keeps its source chip.
5. **Integrations in this order:** Sfax, then eligibility lookup (a person still runs it), then SMS. Each replaces a stub and keeps the Simulated chip until it is real.
6. **Fix the overlay defect**, then re-run the visual and accessibility suites with a screen reader.
7. **Replace unverified rules** with Harvest's answers, one rule at a time, in Settings; each edit is audited.
8. **Measure the pilot scorecard** on a real site for a baseline week.
