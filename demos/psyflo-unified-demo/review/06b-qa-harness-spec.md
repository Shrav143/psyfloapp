# 06b · QA harness specification (shared by every engineer)

Nov 11, 2026. Agent F. Binding for `test/run-all.mjs` and `test/lib/*.mjs` (named in `docs/BUILD-BRIEF.md`). Companion to `06-demo-and-qa.md`.

## 0. Goals and constraints

1. **One command** starts servers on given ports, runs every suite, writes a results file, stops the servers.
2. **Isolation by construction.** Today `flowC` needs `flowA`'s T.W. in Lauris and `flowB` resets the world; the harness removes the ordering: every suite starts from a named fixture on its own server instance.
3. **No wall clock, no randomness in assertions.** Fixed demo time, patterns for volatile values.
4. **Honest statuses.** A suite that cannot run says so; it never passes by default.
5. Playwright at `/opt/node22/lib/node_modules/playwright` (`PW=` overrides); Node 20+; no new dependencies.

Status vocabulary: `PASS`, `FAIL`, `SKIP` (reason required, counted), `NOT-RUNNABLE` (feature absent or environment cannot do it; never counts as pass), `KNOWN-FAIL` (listed in `test/known-fails.json` with owner and expiry; allowed in a branch run, never in a release run).

## 1. File layout under `test/`

```
test/
  run-all.mjs               # runner (lead-owned)
  preflight.mjs             # demo-machine checks (see 06 section g)
  known-fails.json          # {id, suite, owner, reason, expires}
  requirements.json         # spec ids -> suites (Part 22, Part 19.2, 05b ids, parity groups)
  lib/                      # lead-owned; engineers import, never edit
    env.mjs                 # ports, paths, env parsing, run id
    server.mjs              # startInstance(), stopInstance(), waitReady()
    api.mjs                 # act(), tryAct(), state(), as(staffId), portal(token)
    browser.mjs             # launch(), page(), signIn(), phone(), collectErrors()
    lauris.mjs              # http + ui helpers for the mock Lauris
    panel.mjs               # the 400 px panel beside Lauris
    fixtures.mjs            # apply(name), list(), parity()
    clock.mjs               # fix(), advance(), install(page)
    assertions.mjs          # t.ok/eq/match/includes + gate helpers
    norm.mjs                # normalise volatile values for diffs
    audit.mjs               # interaction-audit engine (06 section d2)
    a11y.mjs  visual.mjs    # keyboard, landmarks, contrast, viewports, screenshots
    parity.mjs              # parses review/04b-feature-inventory.md and 06c-parity-map.csv
    report.mjs              # results.json and results.md writers
  <name>.mjs                # one file per suite (E6 and each owner add theirs)
  legacy/                   # untouched copies of today's flow scripts, run by the adapter
```

Flat `test/<name>.mjs` is kept for suites (BUILD-BRIEF). Today's `flowA`-`flowD`, `panels`, `smoke`, `draft.test.mjs` stay where they are and keep running standalone (`node test/flowA.mjs`); the runner wraps them (section 3.5).

## 2. The runner

```
node test/run-all.mjs [--base-port 4900] [--workers 3] [--only a,b] [--skip x] [--tag safety]
                      [--preset live|canvas] [--time 10:42] [--repeat 1] [--shuffle <seed>]
                      [--out review/test-results] [--data-root <dir>] [--shots <dir>]
                      [--keep-servers] [--attach http://localhost:4000] [--release]
```

Algorithm:

1. Resolve ports: instance `i` gets `base + 10*i` (app), `+1` (Lauris), `+2` (portals). Default base 4900 (4890 and below are reserved by `BUILD-BRIEF`).
2. Start `workers` instances: `APP_PORT LAURIS_PORT EXT_PORT DATA_DIR=<data-root>/w<i> DEMO_TIME=<time> DEMO_TEST=1 node server/index.js`. Poll `GET /api/state` until ready (15 s). Record PIDs in `<out>/<runId>/pids.json`.
3. Build the suite queue from `test/*.mjs` (module default export, section 5) plus legacy wrappers; apply `--only`, `--skip`, `--tag`, `--shuffle`. A worker takes the next suite.
4. Before each suite: `demo.reset {preset}` (both stores), then `fixtures.apply(suite.requires || 'base')`, then verify the precondition probe. A failed fixture marks the suite `FAIL (fixture)`, not `SKIP`.
5. Run each test with a 60 s limit, each suite with 300 s. **No automatic retries.** `--repeat n` runs the whole queue n times to expose flakiness; a test that differs across repeats is reported `FLAKY` and fails a release run.
6. Collect results, console errors and artifacts; write the results files (section 6).
7. In a `finally`: stop every started instance by PID (SIGTERM, then SIGKILL after 3 s), also on SIGINT. `--attach` runs suites against an existing server instead (workers forced to 1; no reset unless `--reset`).

Exit codes: 0 all pass; 1 at least one FAIL, FLAKY or (with `--release`) unexplained SKIP, KNOWN-FAIL or NOT-RUNNABLE outside the approved list; 2 harness error; 3 preflight failure.

Release run = `--release --repeat 3 --workers 1`.

## 3. Order and isolation rules

3.1 **A suite may depend on nothing but its fixture.** Reading state left by another suite is a defect; `--shuffle` in CI proves it.

3.2 **Fixtures are checkpoints, not scripts.** `fixtures.apply(name)` calls the server action `demo.scenario {id}` (the same action the presenter's scenario selector calls), which sets both stores. Names:

| Fixture | State |
|---|---|
| `base-live`, `base-canvas` | the two presets |
| `tw-referral` | REF-118 `needs_screening`, no family link, T.W. not in Lauris |
| `tw-link-submitted` | family link submitted, eligibility `details_received` |
| `tw-eligible` | check recorded (active, Humana, dated) |
| `tw-screened` | consumer #4492 in Lauris, screening processed, referral `in_intake` |
| `tw-isp-ready` | CNA and ISP processed, R-0416 `draft_ready`, Lauris on the SRA form |
| `tw-signed` | R-0416 `signed`, signed PDF stored |
| `tw-sent` | R-0416 `submitted`, receipt stored |
| `mr-daily` | timer running since a fixed start, no dictation waiting, `khale` in every-note mode |
| `mr-corpus` | M.R. notes corpus loaded in both stores |
| `payer-decision` | base plus D.W. partial, K.T. info request, T.N. peer-to-peer, E.C. denied (these are in the seed) |
| `analytics-case` | case-backed analytics enabled over the corpus |

With `DEMO_TEST=1` the server also seeds its random generators (fax references, tokens) from the fixture id so values repeat; assertions still use patterns (`/^F-\d{4}$/`).

3.3 **Fixture parity.** The `fixtures` suite builds `tw-screened` and `tw-isp-ready` through the UI (flowA, flowC steps), normalises both resulting states with `norm.state`, and compares them with the fixture-built states. A drifting fixture fails here, so the fast path cannot silently diverge from what the product does. This replaces "flowC needs flowA".

3.4 **One golden chain.** Only the `golden` suite chains steps (flowD, flowA, flowC, S5) inside one instance; it is the only suite allowed to depend on its own earlier steps, and it writes the screenshots and recordings used as the live-demo fallback.

3.5 **Legacy adapter.** For each old script the runner spawns `node test/<script>.mjs` with `BASE`, `PW`, `SHOTS` (and `KEEP=1` for `flowB`), after applying the suite's fixture (`flowC` declares `requires: 'tw-screened'` so it no longer throws). Pass = exit code 0 and, where the script prints it, `errors: none`. `smoke` passes when no line contains `ERR` and `window.psyflo.current.inst.anchors` covers every `href="#name"` (the old script only lists anchors; `lib/audit.mjs` implements the check). `npm test` runs as its own suite with `node --test`.

3.6 **Time.** Every instance runs with `DEMO_TIME=<HH:MM>` (default 10:42): the story date comes from the store, the time of day from the fixed value. Browser pages call `clock.install(page)` (Playwright `page.clock`) so JavaScript time matches. Assertions on dates use story dates, never `new Date()`. Tests that need the passage of days use `clock.advance(n)` (the `demo.advanceDay` action; it must move the mock Lauris too, which `clock` asserts).

3.7 **Shared-nothing browsers.** Each test opens its own context. No `localStorage` carry-over; sign-in is explicit.

3.8 **Parallelism.** Suites on different instances run in parallel. Within an instance suites run serially. Suites tagged `realtime` (the 3 s Sfax stub) wait for the observed event, not a timer.

## 4. Shared helper API

All helpers are ES modules in `test/lib/`. `t` is the test context passed to every suite (section 5).

### 4.1 `env.mjs`
`ports(i) -> {app, lauris, ext}`, `urls(i) -> {APP, LAURIS, EXT}`, `PW`, `runId`, `outDir`, `PRESET`, `TIME`.

### 4.2 `server.mjs`
`startInstance({index, preset, time, dataDir, env}) -> {pid, urls, stop()}`, `waitReady(urls, ms)`, `stopInstance(inst)`. Used by the runner and by `preflight.mjs`.

### 4.3 `api.mjs` (read and write the Psyflo store)
```js
const api = t.api;                          // bound to the instance; anonymous by default
await api.act('request.send', {id})         // throws on {ok:false}; returns result
const r = await api.tryAct(name, args)      // {ok, status, error, code, result} never throws
const s = await api.state()                 // GET /api/state (role-projected when signed in)
const u = api.as('khale')                   // POST /api/session {staffId}; returns a bound client
await u.act(...); await u.state(); u.token  // sends X-Psyflo-Session
api.portal(token)                           // guardian or school session from a link token
api.request('R-0416'), api.client('MR'), api.events({record:'R-0416'})  // selectors over state()
api.waitFor(pred, {ms:8000})                // poll state() until pred(state) is truthy (observed events, Sfax stub)
api.diff(before, after)                     // normalised structural diff of two states
```
Roles for `as()`: `khale` direct support, `cdiaz` supervisor, `jperez` clinician, `dowens` admin; portal actors via `portal()`. Before the foundation sessions merge, `as()` degrades to anonymous plus the `psyflo_user` localStorage convention, and every test using it is tagged `needs-sessions`.

### 4.4 `lauris.mjs` (the mock Lauris, through its own pages)
```js
const L = t.lauris;
L.http('jperez').get('/consumers/3310')            // cookie login; returns text
L.http('jperez').post('/consumers/3315/session/dpn', {session_id, action:'process', f4:'3'})
L.units(3310)                                      // parses "27 units available" from the consumer page
L.activeFile(3310)                                 // [{session, form, date}]
L.approvals()                                      // rows in Forms to Approve
L.today()                                          // date printed by Lauris (clock check)
await L.open(page, 'khale', '/consumers/3310/session/dpn')   // login then next=
await L.form(page).read()                          // {label: {value, state:'g'|'y'|''}}
await L.form(page).set(label, value)               // a person typing
await L.process(page)                              // presses Process Form, waits for ?processed=
await L.sign(page, sessionId) / L.reject(page, id, note)
L.snapshot()                                       // GET /__test/lauris (DEMO_TEST only): whole mock DB for assertions
```
Psyflo never reads Lauris data; tests may, because they model the auditor. `snapshot()` exists only under `DEMO_TEST=1` and is refused otherwise.

### 4.5 `panel.mjs`
```js
const P = t.panel(page);                           // frame '#psyflo-frame' (in-page mode) or the extension panel
await P.text(); await P.click('Fill all 7 boxes'); await P.has('Dictation dropped in')
await P.fast();                                    // sets ui.fast so scripted calls finish in seconds
await P.chips(box)                                 // source chips of a draft box [{n,label,date}]
await P.checks()                                   // "Checked before you process" rows [{rule,pass}]
await P.size()                                     // {w,h} for the 400 px check
```

### 4.6 `browser.mjs`
```js
const b = await t.browser();                       // shared per suite
const page = await b.page({role:'jperez', viewport:{width:1440,height:900}});  // signed in, errors collected
const phone = await b.phone({role:'khale'})        // 390x844, touch
const guardian = await b.portalPage(token)         // /parent/<token>/...
page.errors()                                      // console 'error' and pageerror, minus the allowlist
```
Every page created through the lib registers an error collector; the runner fails a test that ends with unreported errors unless it called `page.allowErrors(/regex/)`. Default allowlist: blocked font requests (`fonts.googleapis.com`, `fonts.gstatic.com`).

### 4.7 `fixtures.mjs`, `clock.mjs`, `norm.mjs`
`fixtures.apply(name) -> {preset, state}`, `fixtures.list()`, `fixtures.parity(name)`. `clock.fix('HH:MM')`, `clock.advance(n)`, `clock.install(page)`, `clock.today()` (asserts Psyflo and Lauris agree). `norm.state(s)` removes volatile keys (`rev`, `at`, tokens, generated ids, timestamps, fax references) and sorts arrays by id so two states can be compared.

### 4.8 `assertions.mjs`: general and gate helpers
General: `t.ok(cond, msg)`, `t.eq(a, b)`, `t.match(str, re)`, `t.includes(arr, x)`, `t.count(list, n)`.

Gate helpers, one per product rule (each records the spec id in the result):
```js
await t.gate.refuses(() => u.act('request.send', {id:'R-0411'}), {status:[401,403,409], audit:true})
t.gate.stage(api.request('R-0416'), 'signed')                       // current stage equals
await t.gate.noPathWithout('bridge', {record:'R-0416', to:'signed'})// API-only attempts leave the stage unchanged
await t.gate.writeOnce({kind:'note', id}, {field:'fields.Narrative'})// second write refused; text identical
await t.gate.noEvent({record:'R-0402', match:/faxed|sent to/i})      // no 'sent' language without a stub reference
await t.gate.chip(page, ['Simulated'])                              // chip text visible in the viewport
await t.gate.projection(api.as('dowens'), {absent:['notes[*].fields','screenings[*].transcript']})
await t.gate.sources(P, boxes)                                      // every source id resolves to a stored record
await t.gate.counts(P, 'daily notes', api.notesIn(period))          // displayed count equals stored rows
await t.gate.forbidden(['Lauris API','sent to Lauris','OCR'], pagesOrFiles)  // copy scan
```

### 4.9 `audit.mjs` (interaction audit), `a11y.mjs`, `visual.mjs`
`audit.run({roles, routes, variants, preset, allowlist, panel:true}) -> rows` implements the algorithm of `06` section d2 (stamp controls with `data-qa`, reload per control, classify). `a11y.route(page)` returns `{tabStopsBeforeMain, unnamed[], headings, landmarks, lang, contrast[]}`; `a11y.dialog(page, open)` checks focus entry, trap, Esc, return. `visual.matrix(page, route, viewports) -> {hscroll, smallText, smallTargets, clipped[], shot}` saves a PNG per viewport under `<out>/<runId>/shots/`.

### 4.10 `parity.mjs`
`parity.rows()` parses `04b` (291 ids); `parity.map()` reads `06c-parity-map.csv`; `parity.check()` returns `{unmapped, duplicate, suiteMissing, suiteNotRun}`.

## 5. Suite contract

```js
// test/daily-note.mjs
export default {
  name: 'daily-note',
  tags: ['scenario', 'S1'],
  requires: 'mr-daily',                       // fixture; default 'base-live'
  covers: ['P19.2.daily-note', 'P22.9', 'Q08'],
  async run(t) {
    const b = await t.browser();
    const phone = await b.phone({ role: 'khale' });
    await t.test('S1.1 dictation waits in Psyflo, nothing reaches Lauris', async () => {
      await phone.getByText('Say what happened').click();
      await phone.getByText('Use the example').click();
      await phone.getByText('Looks right').click();
      t.eq((await t.api.state()).dictations.filter(d => d.status === 'waiting').length, 1);
      t.eq((await t.lauris.activeFile(3310)).length, 0);
    });
    await t.test('S1.2 Process Form updates every surface', async () => {
      const before = await t.api.state(), u0 = await t.lauris.units(3310);
      const lp = await b.page({ role: 'khale' });
      await t.lauris.open(lp, 'khale', '/consumers/3310/session/dpn');
      await t.panel(lp).click(/^Confirm \d units/);
      await t.lauris.process(lp);
      await t.api.waitFor(s => s.notes.some(n => n.client === 'MR' && n.type === 'daily'));
      t.eq(await t.lauris.units(3310), u0 - 2);                // 220 min = 2 units under the official bands
      const used = s => s.clients.find(c => c.id === 'MR').authorization.used;
      t.eq(used(await t.api.state()), used(before) + 2);
    });
  }
};
```
Rules: test titles start with a spec id (`S1.1`, `WPS-01`, `P22.8`, `M-054`); a suite lists what it `covers`; a test never calls `setTimeout` for synchronisation (use `waitFor`); a test never reads another suite's output.

## 6. Results format

`<out>/<runId>/results.json` (also copied to `<out>/latest.json`) and `results.md` (copied to `<out>/latest.md`):

```json
{
  "runId": "2026-11-11T15-04-22Z", "commit": "b330456", "dirty": true,
  "env": { "node": "v22.22.0", "playwright": "1.x", "time": "10:42", "preset": "live", "workers": 3, "repeat": 1 },
  "summary": { "pass": 0, "fail": 0, "skip": 0, "notRunnable": 0, "knownFail": 0, "flaky": 0, "durationMs": 0 },
  "suites": [{
    "name": "daily-note", "tags": ["scenario"], "requires": "mr-daily", "instance": 1,
    "status": "PASS", "durationMs": 0, "log": "logs/daily-note.log",
    "tests": [{ "id": "S1.1", "title": "…", "status": "PASS", "durationMs": 0,
                "covers": ["P19.2.daily-note"], "error": null, "evidence": ["shots/S1.1.png"], "consoleErrors": [] }]
  }],
  "coverage": {
    "part19_2": { "daily-note": "PASS" },
    "part22":   { "1": "PASS", "8": "FAIL" },
    "safety05b": { "WPS-01": "PASS" },
    "parity":   { "Q01": "PASS" },
    "unmapped": []
  },
  "knownFails": [], "manual": [{ "id": "MV3-panel", "status": "PENDING", "owner": "QA" }]
}
```

`results.md` contains: the summary line; a table of suites; the Part 22 table (criterion, test ids, status) generated from `requirements.json`; the 25-row Part 19.2 table; failures with first error line and artifact links; NOT-RUNNABLE and SKIP reasons; the manual checklist (extension in real Chrome, microphone, target-browser rehearsal, design review sign-off) with PENDING or SIGNED. A criterion is `PASS` only if every test mapped to it passed in this run; unmapped criteria print `NO TEST`.

`requirements.json` maps ids to titles-prefixes:
```json
{ "P22.8": { "text": "Important interactions work", "tests": ["interaction-audit/*"] },
  "P19.2.daily-note": { "tests": ["daily-note/S1.*"] }, "05b.WPS-01": { "tests": ["safety-wrong-patient/WPS-01"] } }
```

## 7. What the harness cannot automate (manual checklist, in every results file)

The MV3 side panel in real Chrome (load unpacked, open Lauris, run S1 and S3); live microphone and Web Speech on the demo laptop; Safari and Firefox behaviour; the venue network; a three-person comprehension check of the run sheet; design sign-off for criterion 18. Each has an owner and a SIGNED or PENDING state; a release run with any PENDING prints "NOT RELEASE READY".

## 8. Migration steps (what to build, in order)

1. Lead: `lib/server.mjs`, `lib/api.mjs`, `lib/env.mjs`, `run-all.mjs` with the legacy adapter; run today's seven scripts green on 3 workers. (First useful checkpoint; proves isolation.)
2. Lead: `demo.scenario` with `base-*`, `tw-*`, `mr-*` fixtures, `DEMO_TIME`, seeded randomness, `DEMO_TEST` Lauris snapshot endpoint; `fixtures` suite.
3. E6: `lib/browser.mjs`, `lib/lauris.mjs`, `lib/panel.mjs`, `lib/assertions.mjs`; port flowA-D to suites using fixtures (`flowC` no longer needs `flowA`).
4. E6 with each owner: scenario suites S1 to S6, `consistency`, safety suites from `05b`, `routes`, `roles`, `presenter`, `clock`.
5. E6: `audit.mjs`, `a11y.mjs`, `visual.mjs`, `parity.mjs`, `copy-scan`; `preflight.mjs`.
6. Lead: release run (3 repeats, 1 worker) on the integrated build; attach `latest.md` to the walkthrough guide.

Ownership: the lead owns `run-all.mjs`, `lib/server.mjs`, `lib/api.mjs`, `lib/fixtures.mjs`, `lib/clock.mjs`; E6 owns the other `lib/` files and every `test/<name>.mjs` not named after another engineer's area; each owner extends the suite for their area.

## 9. Preflight (`test/preflight.mjs`)

Run on the demo laptop before every presentation: servers answer on the three origins; `preset`, `today` and clock print; all fixtures load and the parity check passes; the first six run-sheet screens render with zero console errors in the installed browser; Lauris login, the panel iframe and the mock portals respond; `Notification` and microphone permission state print; popup test opens and closes a window; fonts fallback renders; free disk and memory. Output is a one-screen PASS or FAIL list and exit code 3 on any FAIL.
