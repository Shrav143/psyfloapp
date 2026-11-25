# Build contract for screen controllers

Read `docs/BRIEF.md` first (rules that never bend, data model, lifecycle, the four flows, the screen register). This file says how the code is laid out and how to wire a screen.

## Layout

```
server/index.js              one process, three ports: APP_PORT (4000) app+API, LAURIS_PORT (4001) mock Lauris, EXT_PORT (4002) mock Availity/UHC/state portal/DMAS
server/psyflo/store.js       Psyflo's store (seed → state; presets 'live' and 'canvas'); never touches Lauris data
server/psyflo/actions/*.js   actions, loaded in filename order; core.js has the shared ones
server/lauris/*              mock Lauris (separate store; Psyflo never reads it)
seed/seed.json               THE dataset (do not edit); seed/extra/*.json are merged over it (arrays appended, objects merged, new keys pass through to state)
web/index.html, web/js/app.js        app shell: routing, roles, generated sidebar, demo bar, drawer, modal, toasts
web/js/runtime.js            .dc.html template engine
web/js/api.js                store client (state + SSE live updates + api.do)
web/js/shared/model.js       selectors (requestClock, doNext, requestHref, labels…) — import as M
web/js/shared/dates.js       date helpers (story dates are local ISO strings, today = state.today)
web/js/shared/draft.js       draft(formType, sources) + the drafting-rule checks
web/screens/*.dc.html        the 46 canvas screens = the templates (visual source of truth)
web/js/screens/<Id>.js       one controller per screen (this is what you write)
web/panel/                   the extension panel (owned by the lead — do not edit)
```

Run a private copy while you work (pick your own ports and data dir so parallel servers do not collide):

```
APP_PORT=4110 LAURIS_PORT=4111 EXT_PORT=4112 DATA_DIR=/tmp/<you>/data node server/index.js
BASE=http://localhost:4110 AS=dowens node test/smoke.mjs [ScreenId]     # renders every (or one) screen headless; prints console errors + unwired #anchors
```
Playwright is preinstalled globally (see test/smoke.mjs for how it is required). Reset data: `POST /api/do {action:'demo.reset', args:{preset:'live'|'canvas'}}` or delete your DATA_DIR.

## How a screen renders

`#/Authorizations?id=R-0416` → app.js loads `web/screens/Authorizations.dc.html`, takes the markup inside `<x-dc>` as the template and the `<helmet>` CSS, and renders it with the controller registered for `Authorizations` (falls back to the file's own `Component` class = static canvas demo state).

Template syntax (runtime.js): `{{path}}` (HTML-escaped; return `raw(html)` for trusted markup), `<sc-for list="{{rows}}" as="r">…</sc-for>` (nesting allowed), `<sc-if value="{{cond}}">…</sc-if>` (also `{{!cond}}`), and handlers `onClick="{{fn}}"`, `onInput`, `onChange`, `onSubmit`, `onKeydown` (fn receives (event, element)).

Links inside templates:
- `href="Submission.dc.html?id=R-0416"` → app route (query becomes `this.params`). Use these for all navigation.
- `href="#name"` → calls `this.anchors.name(event, el)` on your controller; if none, scrolls to `#name`; if neither exists the smoke test reports it as **unwired** (a dead end — not allowed).
- `href="#/Id?x=y"` is also a route. External `http…` and `/files/…` links open normally.

App-surface screens: the dark 240px `<aside>` in the template is **replaced by a generated sidebar** (role-filtered nav, live counts, current user). Leave that aside alone; do not try to edit it.

## Writing a controller

```js
// web/js/screens/Authorizations.js
import { register, Screen, M, raw, modal, toast, go, session, api } from '../app.js';
register('Authorizations', class extends Screen {
  init() { this.state = { tab: 'all' }; }            // once per visit; this.params = route query
  prepare(tpl) { return tpl.replace('…static text…', '{{hole}}'); }   // optional one-time template surgery
  renderVals() {                                       // called on every repaint (setState, store change)
    const s = this.s;                                  // the live Psyflo state (read-only; mutate via actions)
    return { rows: …, pick: () => this.setState({ tab: 'x' }) };
  }
  get anchors() { return { send: () => this.do('request.send', { id: 'R-0416' }) }; }
  after(root) { }                                      // optional DOM work after each paint
  get css() { return '.extra{…}'; }                    // optional extra CSS
});
```
Base `Screen` gives: `this.s` (state), `this.me` (signed-in staff record), `this.params`, `this.M` (model selectors), `await this.do(action, args)` (POSTs to the store, toasts errors, returns result; every open tab repaints via SSE), `this.go(target, params)`, `this.toast(msg)`, `this.setState(patch)`. Also exported: `modal(html, (box, close) => …)` with `[data-close]` buttons, `toast`, `go`, `session` (`session.user`, `session.schoolUser`, `session.setSchoolUser(id)`), `hrefFor`, `api`.

Two ways to make the canvas markup live — prefer whichever keeps the look **identical**:
1. Edit the `.dc.html` in `web/screens/` for your screens only: replace hard-coded text with `{{holes}}`, wrap repeated rows in `<sc-for>`, swap `href="#x"` placeholders for real routes or anchors. Keep every class, inline style and wording that is not data.
2. `prepare(tpl)` string surgery in the controller (good for small swaps).
Never restyle. Lift any new markup from patterns already in the same file.

## Store and actions

State keys (see server/psyflo/store.js `buildState`): `today, preset, staff, school_users, schools, payers, interventions, clients, referrals, requests, notes, notes_sample, incidents, checkins, shares, counselor_counts, school_numbers, analytics_baseline, compliance, migration, family_links, eligibility, dictations, assessments, timers, consents, files, reminders, plans, portal_tasks, screenings, exports, settings, library, drafts, appeals, events` (+ any key you add in `seed/extra/<yourgroup>.json`).

`events` is the append-only audit trail `{at, what, who, record}`; Sent / Info request / review queue read "what happened, in order" from it via `M.eventsFor(s, recordId)`.

Actions already in `server/psyflo/actions/core.js` (read it — names and args): `demo.reset, demo.advanceDay, referral.create/update/attach/scheduleScreening/routeGrant/stage, familyLink.send/open/step/submit, eligibility.record, consent.sign, checkin.save, share.today, portalTask.create, request.ensure/processed/signed/send/portalConfirmed/overdueNotice/receiptCheck/demoReply/partialDecide/p2pOutcome/infoReply/infoSend/appealSign/close/set, plan.set, timer.start/stop, dictation.save/used/discard, assessment.save/used, note.processed/review, screening.done, draft.save, client.update, incident.filePortal/save, user.add/update, settings.set, library.add, migration.rerun, reminder.done, file.pdf`.

Need another action? Add it in **your own** file `server/psyflo/actions/x-<group>.js` (default-export an object of `name(state, args) { … }`; `this` is the store: `this.now()`, `this.event(what, who, record)`, `this.writeFile(name, buffer)`; `import { makePdf } from '../../pdf.js'` for PDFs). Do not edit core.js — if a core action is wrong, say so in your report. Restart the server to load new actions.

Selectors in `web/js/shared/model.js` (`M.*`): `client, staff, payer, school, clientLabel, staffShort, payerShort, requestClock, requestHref, requestTags, doNext, eventsFor, notesToday, waitingDictations, eligibilityFor, familyLinkFor, STAGE_LABEL, TYPE_LABEL, CHANNEL_LABEL, REF_STAGE, ROLE_LABEL, fmtDate, fmtDateTime, fmtTime, daysBetween, addDays…`. Add new pure selectors in your controller file (do not edit model.js; report if something there is wrong).

## Non-negotiables (from the brief)

- **No dead ends**: every link and button goes to a real screen or changes state on the same screen. Smoke test must show no unwired anchors and no console errors for your screens.
- **Nothing claims what the product cannot do**: no Lauris API, nothing "sent to Lauris", a person presses Process Form / Get Signature / Send, a person signs, eligibility only after the family link, Psyflo never signs. Seeded numbers that need a source say it ("Harvest's Lauris export · Oct 29").
- **Synthetic data only**; keep "Demo data · nothing is real" (the generated sidebar carries it on app screens).
- **Demo-only controls** (receive a reply, advance a day) appear only for admin, labelled "Demo".
- Extension screens (`Ext*.dc.html`) open as the mock Lauris with the panel; link to them as `ExtDPN.dc.html?client=MR`, `ExtSRA.dc.html?client=TW`, `ExtSignOff.dc.html?request=R-0416` etc. You do not build them.
- Both presets must work: `live` (default: T.W. rewound to his Oct 13 referral; no R-0416 until the ISP/SRA is drafted) and `canvas` (Oct 29 snapshot exactly as the canvas). Screens must render sensibly when a record they usually show does not exist yet (fall back to another record or an honest empty state, never a crash).

## Report back

When done: files you changed, what is live vs seeded per screen, any action/selector you added, anything in the shared code that looked wrong, and the smoke-test output for your screens.
