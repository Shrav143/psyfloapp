# Unified build brief (shared by every engineer)

You are one engineer building the unified Psyflo × Harvest demo inside the Nov 8 master project (this folder, `demos/psyflo-unified-demo/`). The spec is `docs/UNIFIED-DEMO-PROMPT.md`. The review set in `review/` holds the findings and the decisions; `review/00-unified-recommendations.md` §3 lists the resolved conflicts and is binding. Read, in this order: that file, `docs/BRIEF.md` (the rules that never bend), `docs/CONTRACT.md` (how a screen is wired), `README.md`, then the review files named in your task. The secondary demo (v3) lives in `demos/psyflo-tdt-v3-reference/` (`source/screens/*.js`, built HTML `Psyflo Harvest TDT authorization demo v3.html`): it is a library of patterns and logic. Port behaviour into the master's architecture; never embed it, and never import its redirects.

## Product rules (from the prompt and the reviews; none bend)

1. A person presses Process Form, Get Signature and Send. Psyflo drafts and records; it never signs, never stores credentials, never submits unattended. "Processed", "Signed" and "Synced" states are set only from an observed bridge event or a person's recorded action, never by a simulated writer.
2. Processed or finalized records are write-once. No addendum or late-entry feature. Scan & Enhance Mode B (historical) is read-only and reads Psyflo's captured copies; Mode A (current draft) may fill the open form.
3. Nothing invented. Every statement in a draft traces to a stored record; counts are computed from stored records; missing evidence prints "Evidence missing — verify …". Seeded canned drafts carry the chip "Illustrative sample".
4. Rules (deadlines, units, signature modes) come from the rules table with a source category and a verification label: Officially verified · Payer-specific · Harvest-reported · Unverified demo assumption. Never state a rule as law that is not officially verified.
5. Say "page bridge to the open Lauris page". Never "Lauris API" or "integration".
6. Least privilege, server-side: use `can()` from `web/js/shared/permissions.js`. Admin has no clinical-record access by default.
7. Analytics data carries provenance: `case_backed`, `harvest_export` (labelled "Sample data, illustrative"), `illustrative` (the v3 cohort, ids `COH-…`). One dataset per view, never summed together, minimum group size 5, no patient-level drill-down outside case-backed data plus the clinical-records permission.
8. Maturity chips: Working (unmarked), Simulated, Pilot (preview), Future; use `web/js/shared/maturity.js` and `ui.maturity()`; a feature's level is registered once. Rule provenance chips are a separate axis.
9. Synthetic data only. "Demo data · nothing is real" stays on every app screen. Master ids are canonical (`R-xxxx`, `REF-xxx`, initials); never import v3 Harvest numbers.
10. Interactive means real: every visible control navigates, changes state, opens a useful detail, performs a permitted operation, or says why it is unavailable. No dead buttons, no lorem.

## Foundation contracts (built first; engineers rely on them)

- **Permissions** `web/js/shared/permissions.js` (pure ESM, imported by server and client): `ROLES` (`direct_support`, `supervisor`, `clinician`, `admin`, plus portal actors `guardian`, `school`), `CAPS` (the capability names of `review/05-safety-and-data-integrity.md` §5), `can(user, cap, ctx?)`, `routeAllowed(role, routeId)`, `ROUTE_CAPS`.
- **Session and API** `web/js/api.js`: `signIn(staffId)` / `signOut()` / existing `state`, `do(action,args)`, stream. The server derives the actor from the session; ignore `args.by`. `/api/state` returns the role-projected state. Portal tokens keep working for the allow-listed portal actions.
- **Clock** `store.clock` and `web/js/shared/clock.js`: `today(s)`, `now(s)`; `demo.advanceDay` moves Psyflo and the mock Lauris together. No hard-coded dates in code.
- **Rules** `web/js/shared/rules.js` + `seed/extra/rules.json`: `rule(s, key)` returns `{value, unit, category, source, verified_on, note}`; `unitsFor(s, service, minutes)`; deadlines return `{date, source, verification}`.
- **UI kit** `web/css/tokens.css`, `web/css/components.css`, `web/js/ui/*.js` (see `docs/UI-KIT.md`): fragment helpers that return HTML for `raw()`: `chip`, `statusChip`, `maturity`, `sourceChip`, `filterBar`, `queueTable`, `drawer`, `modal`, `timeline`, `history`, `evidenceChip`, `draftReview`, `emptyState`, `toast`, `presenterDock`. Add classes prefixed with your owner id (`a-`, `d-`…); never edit these shared files.
- **Navigation** `web/js/shared/nav.js` (data-driven), redirect table in `web/js/registry.js`. Canonical new routes: `MyWork`, `Authorization`, `DenialIntelligence`, `DenialCase`, `Settings`; `Analytics` takes `?section=outcomes|payer|population&dataset=case|illustrative`. Every historic route id stays valid.
- **Hooks** `store.hooks`: `observed` (bridge event), `reset`, `advance` registries so action files react without editing lead files.
- **Seeds** pass through `seed/extra/*.json` (arrays appended, objects merged). "How the data gets in" notes: every new or changed screen needs a section in `seed/notes/<owner>.md` (same format as `seed/notes.md`: `## <n> · <title> (\`Screen.dc.html\`)`, then `HOW THE DATA GETS IN · …`, Captured / Flows); the server appends all `seed/notes/*.md`.
- **Test harness** `test/run-all.mjs` + `test/lib/*.mjs` (spec: `review/06b-qa-harness-spec.md`): one command starts servers on given ports, resets, runs the suites in isolation, writes `review/test-results/*.md`. Write new tests as `test/<name>.mjs` using the lib.

## File ownership

Lead-only after the foundation (do not edit; ask in your report): `web/index.html`, `web/js/app.js`, `web/js/registry.js`, `web/js/runtime.js`, `web/js/api.js`, `web/js/ext-composite.js`, `web/js/shared/{model,dates,draft,permissions,rules,clock,maturity,nav}.js`, `web/js/ui/*`, `web/css/tokens.css`, `web/css/components.css`, `server/index.js`, `server/util.js`, `server/pdf.js`, `server/psyflo/store.js`, `server/psyflo/actions/{core,lead-extension,x-panel}.js`, `web/panel/bridge.js`, `extension/*`, `seed/seed.json`, `seed/extra/{crosswalk,rules}.json`, `docs/`.

| Owner | Owns |
|---|---|
| **E1 My Work, settings, login** | `MyWork*`, `DoNext`, `ReviewQueue`, `StaffDashboard`, `Settings*`, `Users`, `Login`, `WhereThingsLive`, `web/js/shared/sel/mywork.js`, `actions/x-settings.js`, `actions/x-mywork.js`, `seed/extra/{settings,scenarios}.json`, `seed/notes/e1.md` |
| **E2 authorizations, referrals, eligibility** | `Authorizations*`, `Authorization*`, `Submission`, `EarlyDischarge`, `Referrals`, `Referral`, `Eligibility`, `web/js/shared/sel/auth.js`, `actions/x-auth.js`, `seed/extra/auth.json`, `seed/notes/e2.md` |
| **E3 denial intelligence** | `DenialIntelligence*`, `DenialCase*`, `InfoRequest`, `Partials`, `PeerBrief`, `PayerPlaybook`, `web/js/shared/payer-guidance.js`, `web/js/shared/sel/disputes.js`, `actions/x-disputes.js`, `seed/extra/disputes.json`, `seed/notes/e3.md` |
| **E4 analytics** | `Analytics*`, `web/js/shared/analytics/*`, `actions/x-analytics.js`, `seed/extra/analytics.json`, `seed/notes/e4.md` |
| **E5 extension** | `web/panel/*` (except `bridge.js` and `views/time.js`), `Ext*.dc.html` and controllers, `web/js/shared/enhance.js`, `actions/{x-enhance,x-scribe}.js`, `seed/extra/notes-corpus.json`, `seed/notes/e5.md` |
| **E6 portals** | `Parent*`, `FamilyLink`, `SchoolPortal`, `ReferralForm`, `ReferralSent`, `AppealLetter` (guardian side), `actions/x-portal-*.js`, `seed/extra/portals.json`, `seed/notes/e6.md` |
| **E7 capture surfaces** | `Mobile*`, `web/panel/views/time.js`, `web/js/shared/time.js`, `actions/x-time.js`, the mock Lauris (`server/lauris/*`, new pages for time and authorizations; the bridge contract in `review/04-architecture.md` §F must not change), `seed/extra/time.json`, `seed/notes/e7.md` |

After the foundation, `server/lauris/*` belongs to E7 (not lead-only). Each engineer writes the tests for their own area as `test/<name>.mjs` with the shared lib. QA, parity, interaction-audit and scenario suites are written by the lead in the integration phase.

New action names must be unique across all files (grep before adding); `node --check` every action file (a syntax error crashes the server for everyone). Do not run git commands that change state (no add, commit, stash, checkout, reset); the lead commits.

## How to work

- Run your own server so you do not collide: `APP_PORT=<p> LAURIS_PORT=<p+1> EXT_PORT=<p+2> DATA_DIR=/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/data-<owner> node server/index.js` from this folder. Ports: foundation F1 4800, F2 4810; E1 4820, E2 4830, E3 4840, E4 4850, E5 4860, E6 4870, E7 4880; lead 4890. Reset data with `POST /api/do {"action":"demo.reset","args":{"preset":"live"|"canvas"}}`. Restart after adding an action file. Stop servers you start by PID.
- Playwright: `/opt/node22/lib/node_modules/playwright/index.js` (set `PW=`), see `test/smoke.mjs`. Take screenshots of what you build (1440×900 and 1024 for the platform, 400 px wide for the panel, 390×844 for phone, parent and school pages) into `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/shots-<owner>/` and LOOK at them with the Read tool; fix what looks wrong or crowded.
- Reading the v3 source: `demos/psyflo-tdt-v3-reference/source/screens/*.js` and `source/*.js`. The built HTML opens with Playwright via file://.
- Design: use the UI kit and the token set (`review/03-ux-audit.md` §h). Few words: headings 1-4 words, buttons 1-3 words, no sentence under a heading or button; replace narrative explanations with visible states ("3 items need review") and detail on demand (drawers, accordions, popovers). Keep one primary action per screen section. Keyboard focus, labels, 4.5:1 contrast, 44 px touch targets on phone and portals, one `h1`, landmarks, `role="status"` for announcements.
- Before you report: `node test/smoke.mjs <ScreenId>` for each of your screens (no console errors, no unwired anchors) for each role that may open it; both presets (`live`, `canvas`) render; run the suites that touch your area (`node test/run-all.mjs --only <suite>`) and fix what you broke; every control does something real; the existing flow tests (A-D, panels) still pass or you update them (test files for your area are yours).
- Privacy: nothing leaves the machine; no network calls except the fonts link already in `index.html`.
- Report (under 400 words): files changed or added; what is live versus seeded versus simulated; tests run and results; every need you have for a lead-only file (exact change wanted); anything in the reviews or the prompt you disagreed with and why.
