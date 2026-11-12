# Psyflo × Harvest · unified demo

A working demo of Psyflo for Harvest Outreach Center, rebuilt on Nov 11, 2026 from the Nov 8 master and the secondary TDT authorization demo, and revised on Nov 12 (navy rail and DM Sans from the Nov 8 look; Authorizations, Denial Intelligence and Analytics laid out as in the product owner's earlier artifact; flags, a bell and the FLO assistant on every page; a 10, 25, 50 or 100 rows pager at the foot of every table). One application, one dataset, five surfaces: the management **platform**, the **Lauris extension panel** beside a mock Lauris, a **phone** app for staff, a **family** portal and a **school** portal. **Synthetic data only. Nothing is real.**

What it shows: a person says what happened, Psyflo drafts from the stored record with a source on every statement, and a person reviews, presses Process Form, Get Signature and Send. Psyflo records and tracks; it never signs, never stores credentials, never submits unattended.

## Run it

Needs Node 20 or later. There is nothing to install.

```bash
node server/index.js        # or: npm start
```

Or double-click `Start demo (Mac).command` or `Start demo (Windows).bat` (they open the browser; keep the window open, close it to stop).

| Port | What |
|---|---|
| http://localhost:4000 | Psyflo app, portals, phone app, extension panel, API |
| http://localhost:4001 | Mock Lauris Online. Any seed staff id signs in: `http://localhost:4001/login?as=jperez` |
| http://localhost:4002 | Mock Availity, UHC portal, state incident portal, DMAS lookup |

Environment: `APP_PORT`, `LAURIS_PORT`, `EXT_PORT`; `DATA_DIR` (default `data/`); `PSYFLO_APP_URL`, `LAURIS_URL`, `EXT_URL` when reached by another host name; `DEMO_PRESENTER=0` turns presenter sessions off, `PRESENTER_PIN` requires a PIN for them; `DEMO_TIME=HH:MM` fixes the time of day; `DEMO_TEST=1` seeds the random generators and exposes a Lauris snapshot for tests; `ALLOWED_ORIGINS` adds CORS origins.

**Reset:** dock **Reset** (below), or `npm run reset`.
- **Live flows** (default): T.W. is rewound to the moment the school referred them, so the referral, eligibility, screening, plan, request, signature and send build in front of the audience. Everything else is the Oct 29 seed.
- **Canvas snapshot:** Oct 29 exactly as designed; T.W.'s request is already sent and a decision is due.

The demo clock starts at Thu Oct 29, 3:30 pm. One clock drives Psyflo and the mock Lauris; **Advance a day** moves both.

## Sign in

The first screen is **Sign in**: one small card with one dropdown of people grouped by role, then quiet links to the **Family portal** and **School counselor**. Sign-in is demo-grade: there is no password and no identity provider, but the server enforces the permission table on every call and projects `/api/state` by role.

| Role | Person (synthetic) | Id | Lands on |
|---|---|---|---|
| Direct support | Kayla Hale | `khale` | extension home on a laptop, the phone app on a narrow window |
| Supervisor | Carla Diaz | `cdiaz` | Dashboard (patient roster) |
| Clinician | Jordan Perez | `jperez` | Dashboard (patient roster) |
| Admin | Dana Owens | `dowens` | Dashboard (statuses and dates). No clinical text, by design |
| Guardian | T.W.'s guardian | token `tw-demo` | family checklist |
| School counselor | R. Bell | `rbell` | school portal |

The rail shows only what the role may open. Direct support gets the Dashboard (their own patients). Supervisors and clinicians also get Authorizations (and the Documents and Staff views inside the Dashboard); administrators see statuses only. `docs/deliverables/06-demo-walkthrough-guide.md` has the full table.

## Presenter dock and modes

The product fills the window. The **presenter dock** is separate: a navy ribbon above the viewport with a dashed marigold edge and the label PRESENTER. It is closed and out of the tab order until you press `Ctrl+Shift+P` or open any page with `?present=1`.

- **Presentation mode** (default): the dock stays closed unless opened.
- **Explore mode** (`?mode=explore`, remembered in the browser): the dock is open as a slim ribbon, with an **All screens** picker (searchable, role-aware).

Dock menus: **Scenario** (six; signs in as the scenario's role, resets to its preset, opens its first screen), **Role** (no page reload), **Reset** (Live flows or Canvas snapshot), **Simulate** (Receive a reply, Advance a day), **Notes** ("How the data gets in" for the open screen), **Maturity** (overlay that also shows Working chips), **Surfaces** (Platform, Lauris + panel in a new tab, Phone, Family, School).

Maturity chips say how real a feature is: **Simulated**, **Pilot (preview)**, **Future**; Working is unmarked. A separate chip family says where a rule comes from: Officially verified, Payer-specific, Harvest-reported, Unverified.

## Scenarios and fixtures

`demo.scenario` (dock, or `POST /api/do`) loads a scenario or a checkpoint fixture into both stores.

| Scenario | Case | Role | Preset | Fixture |
|---|---|---|---|---|
| 1 Direct staff daily documentation | M.R. | Direct support | Live | `mr-daily` |
| 2 School referral through intake | T.W., REF-118 | School, then clinician | Live | `tw-referral` |
| 3 Initial authorization | T.W., R-0416 | Clinician | Canvas | `tw-isp-ready` |
| 4 Continued-stay evidence | M.R., R-0411 | Clinician | Canvas | `mr-corpus` |
| 5 Payer decision | D.W., K.T., T.N., E.C. | Clinician | Canvas | `payer-decision` |
| 6 Leadership view | aggregate | Admin, then clinician | Canvas | `analytics-case` |

Other fixtures: `base-live`, `base-canvas`, `tw-link-submitted`, `tw-eligible`, `tw-screened`, `tw-signed`, `tw-sent`. Fixtures run the same internal actions as the screens. The scenario table is `seed/extra/scenarios.json`. The 14-minute route and the click paths are in `docs/deliverables/06-demo-walkthrough-guide.md`.

## The five surfaces

| Surface | Where | What it is |
|---|---|---|
| Platform | `http://localhost:4000` | Rail (patient-first): **Dashboard** (the roster, with Patients, Documents and Staff views; every item's icon opens the Lauris note or form with the Psyflo panel beside it; the logo opens it), **Authorizations**, **Denial Intelligence**, **Analytics**, then **Referrals** and **Settings** (a workflow map: drag blocks, link them, add rules and guardrails; People, Roles, Units, Family link, Audit and Presenter sit under More settings). A patient opens to a chart: Documentation first, the Authorization as one section. Case shell, denial workspace, pilot scorecard, three analytics sections, Settings (People, Roles, Units, Rules, Audit, Family link, Presenter) |
| Lauris extension | mock Lauris on 4001, panel at 400 px | Two buttons: **Scribe** and **Scan & Enhance** (clinicians and designated supervisors). Three-way draft review, evidence review (read-only), authorization path |
| Phone | `#/MobileApp` at 390 px | My students, Current activity, Say what happened, assessments |
| Family | `/f/<token>`, `/parent/<token>/<Screen>` | Checklist home, one task per screen, English and Español, signature mode per document |
| School | school sign-in | "Harvest needs" card, status text only, a four-section referral form |

Every historic route id still resolves; 14 redirects send old ids to the new screens, and `legacy=1` on a URL opens the old one. See `docs/deliverables/03-ux-before-and-after.md`.

## The extension

The panel is one page (`web/panel/`) talking to a **page bridge** (`web/panel/bridge.js`) on the Lauris page. The bridge reads only the open page, finds boxes by label text, types only when a person presses a panel button, and never presses Process Form, Get Signature or Send. It reports what it sees a person do. Say "page bridge to the open Lauris page", never "Lauris API".

1. **In-page panel (default):** the mock Lauris shows the panel at 400 px on the right (the "psyflo · on" chip toggles it).
2. **Chrome side panel:** `chrome://extensions`, Developer mode, **Load unpacked**, choose `extension/`, open the mock Lauris, click the toolbar icon. The in-page panel hides itself when the extension is present. **This path has not been run in real Chrome.** `extension/bridge.js` is copied from `web/panel/bridge.js` at server start.

## Tests

```bash
node test/run-all.mjs                       # every suite, one worker, ports 4900 to 4902
node test/run-all.mjs --only roles,gates    # a subset
node test/run-all.mjs --list                # suite names and tags
npm test                                    # drafting unit tests only
node test/smoke.mjs [ScreenId]              # one screen or all, per role
```

The runner starts the servers on given ports with a fresh data directory per suite, runs 49 suites in isolation (unit, screens, flows A to D, safety, areas, scenarios S1 to S6, presenter, hosted) and writes `review/test-results/<suite>.md` and `summary.md`. Browser suites use Playwright; set `PW=/path/to/playwright` if it is not in the usual place. Results change while QA works: read `summary.md`, not this file.

## Hosted single-file build

`hosted/index.html` is the whole demo in one file (about 3 MB, no server, nothing leaves the page). The server code runs in the page behind a virtual network. Data is in memory only; a reload resets it; popups become overlays; PDFs open as text. Build: `node scripts/build-hosted.mjs` (esbuild lives outside the repo). Test: `node test/hosted.mjs`. Details and differences: `hosted/README.md`.

## Where things are

```
server/        index.js (three ports) · psyflo/ (store, sessions, authz, projection, gates, 23 action files) · lauris/ (mock Lauris) · external/ (portal mocks) · pdf.js · attest.js
web/           index.html · js/app.js (shell) · js/registry.js (routes, redirects) · js/ui/ (UI kit) · js/shared/ (permissions, rules, clock, nav, maturity, selectors, analytics) · js/screens/ · screens/ (templates)
web/panel/     the extension panel: core.js, views/, lib/, bridge.js
extension/     MV3 side-panel extension
seed/          seed.json · extra/*.json (rules, scenarios, notes corpus, disputes, …) · notes/*.md ("How the data gets in") · scripts/ (worked examples)
test/          run-all.mjs, suites, lib/
hosted/        the single-file build and its README
review/        the review set (below) and review/test-results/
docs/          BRIEF.md, CONTRACT.md, BUILD-BRIEF.md, UI-KIT.md, UNIFIED-DEMO-PROMPT.md, engineer-briefs/, deliverables/
```

**Reviews** (`review/`): `00-unified-recommendations.md` (resolved conflicts, binding), `01` clinical workflow, `02` product strategy, `03` and `03b` UX and density audits, `04` architecture, `04b` feature inventory, `05`, `05b` and `05c` safety, test plan and rules register, `06` and `06b` demo and QA, `06c-parity-map.csv`, `evidence/`.

**Deliverables** (`docs/deliverables/`): `01-evidence-and-conflicts.md`, `03-ux-before-and-after.md`, `04-implementation-plan.md`, `06-demo-walkthrough-guide.md`, `08-unresolved-decision-register.md`, `09-pilot-vs-full-vision.md`. The rows for the feature preservation matrix are `review/04b-feature-inventory.md` and `review/06c-parity-map.csv`. Test results: `review/test-results/`.

The "How the data gets in" note for any screen is in `seed/notes/*.md` and in the dock's **Notes** drawer.

## Honest limits

- **Synthetic data.** Initials and invented names. Seeded figures labelled "Sample data, illustrative" are not Harvest's numbers.
- **Simulated integrations.** The mock Lauris is our approximation, with its own store; field labels are a best reading. Sfax, SMS, DMAS, Availity, the UHC portal and the state portal are stubs or one-page mocks. Signatures are a name read from the mock Lauris event.
- **FLO and the voice agent are Simulated.** FLO answers from the records a role can already see and links to them; the "Call payer" step never dials, uses invented opening hours labelled as an assumption, and saves only what a clinician types. Both are labelled Simulated, and neither does anything unattended.
- **Rule-based drafting, no language model.** Every statement traces to a stored record or says "Evidence missing — verify …".
- **Rules are not law.** Deadlines, clocks, unit bands and signature modes come from a table with a source and a verification label. Several are Harvest-reported or unverified, and say so.
- **Not run:** the MV3 extension in real Chrome; the live microphone and Web Speech; Safari and Firefox; a venue network; a published host for the hosted file. The in-page panel and the mock Lauris pass the automated suites in headless Chromium.
- **Demo-grade identity.** No password; the server still enforces roles. Admin has no clinical-record access and there is no grant path in this build.
- **Known defect:** a drawer stays open if the address hash changes under it (browser Back); Escape closes it.
- **Open questions for Harvest** are in `docs/deliverables/08-unresolved-decision-register.md`.

Fonts: DM Sans is embedded in the stylesheet, so the pages make no font request. Nothing here reaches a network service.
