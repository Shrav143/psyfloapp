# UI kit

Shared components, tokens and the app shell for the unified demo. Foundation (F2) owns `web/css/tokens.css`, `web/css/components.css`, `web/js/ui/*`, `web/js/app.js`, `web/js/registry.js`, `web/js/shared/{maturity,nav,redirects-live}.js`. Everyone else uses them and adds classes with their own owner prefix (`a-`, `d-`, `e-`…). Gallery of every component in every state: `#/UiKit` (open the presenter dock first: `Ctrl+Shift+P` or `?present=1`).

```js
import { register, Screen, M, raw, ui, toast, modal, go } from '../app.js';   // ui is the whole kit
```

## 1. How a controller uses the kit with this runtime

The runtime paints a template with `{{holes}}` and attaches handlers only where the template says `onClick="{{fn}}"` (also `onInput`, `onChange`, `onSubmit`, `onKeydown`). A kit helper returns an **HTML string**. Put it in a hole with `raw()`:

```js
renderVals() {
  return {
    queue: raw(ui.queueTable({ id: 'auth', caption: 'Authorizations', columns, rows: this.rows(), href: r => '#/Authorization?id=' + r.id,
                               sort: this.state.sort, onSort: sort => this.setState({ sort }) })),
    bar:   raw(ui.filterBar({ id: 'auth-f', state: this.state.f, chips, selects, shown, total, onChange: f => this.setState({ f }) }))
  };
}
```
```html
<div>{{bar}}</div>
{{queue}}
```

**Events.** Callbacks cannot live in an HTML string. A helper that takes callbacks (`onChange`, `onSort`, `onOpen`, `onAccept`…) stores them in a registry under its `id` and stamps `data-ui-id` on its root; one delegated listener on `document` (installed when `ui` loads, `ui/wire.js`) finds them. So:

- Pass a **stable `id`** per component (`'auth'`, `'auth-f'`). Re-rendering with the same id replaces the callbacks, which is exactly what a repaint needs. Without an `id` the kit makes one (`qt-a1`, numbered per repaint; app.js resets the counter before every `renderVals`). Components rendered **outside `renderVals`** (inside a modal body, in a popover) must be given an explicit `id`.
- Components that open their own detail (evidence chip, timeline event, info popover) carry their data in a `data-ui-*` attribute and need no registry.
- Plain buttons you write yourself inside raw HTML: either use `onClick="{{fn}}"` in the template, or give them `data-x="name"` and wire them in `after(root)`:
  ```js
  after(root) { root.querySelectorAll('[data-x="send"]').forEach(b => { b.onclick = () => this.send(); }); }
  ```
  (`after` runs after every paint, so the new elements are wired again.)
- Real links: use `href="#/Route?x=y"` or `href="Route.dc.html?x=y"`. Both go through the redirect table (`hrefFor`). Never an `<a>` without `href`.

**Repainting.** `this.setState(patch)` merges into `this.state` and repaints the whole screen (`repaint()` does the same without a patch). The store pushes a new revision over SSE after every action, and app.js repaints on each one. app.js now **holds a repaint back** while (a) an overlay is open, (b) the controller sets `noRepaint = true`, or (c) the person is typing in a field whose value differs from what was painted. It runs the held repaint when the overlay closes or the field loses focus.

**Holding local draft state so a repaint never wipes typing.** Three layers, use the first that fits:

1. `ui.draftField({ key:'reply:R-0408', label:'Reply', value: seedText })` renders a labelled textarea bound to the **draft store**; every `input` event saves into `ui.draft`, and the next paint renders the stored text. Read it with `ui.draft.get(key, fallback)`, clear after sending with `ui.draft.clear(key)`; `ui.draft.clearPrefix('reply:')` drops a family.
2. Your own inputs: update `this.state.x` in an `onInput` handler **without** calling `setState` (no repaint), and render `value="{{x}}"`. Give the input a stable `id` so app.js restores focus and caret.
3. Long editors: set `this.noRepaint = true` while editing, clear it when done, and call `this.repaint()`.

`demo.reset` from the dock clears the draft store.

## 2. Tokens (`web/css/tokens.css`)

Brand kept: DM Sans, paper `#F8F6F2`, teal `#217A78` (hover `#15605E`), navy `#151B24` for tool chrome only (presenter ribbon, extension header, toasts), marigold `#F0B44C` as the marker. Rail is light sand. Values and contrast:

| Token | Value | Use / contrast |
|---|---|---|
| `--ink-900` | `#1B1B19` | text, 16.0:1 on paper |
| `--muted-700` | `#5A544B` | secondary text, 6.9:1 paper, 6.2:1 sand (never `#8A857B`, `#9A9388`, `#8E8A82` for text) |
| `--paper-50` `--surface-0` `--sand-100` `--line-200` | `#F8F6F2` `#FFFFFF` `#EFE8DE` `#E5DCD0` | page, cards, rail and table head, hairline |
| `--control-500` | `#857F75` | input and select border, 4.0:1 on white (WCAG 1.4.11) |
| `--teal-600` / `--teal-700` / `--teal-300` / `--teal-tint` | `#217A78` `#15605E` `#5FC0BE` `#E1F0EF` | primary (white 5.1:1), hover (7.3:1), on-dark accent, selected row |
| `--danger-fg/bg` `--warning-fg/bg` `--success-fg/bg` `--neutral-fg/bg` `--info-fg/bg` | `#8A2E1C/#FBE7E2` `#6F4A05/#FCEFD0` `#1D4F43/#E3EFEA` `#4A453D/#EFE8DE` `#1F4E8C/#DCE8F7` | status pairs 6.7 to 7.9:1 |
| type | `--fs-12…--fs-34` with `--lh-*` | 12 caption (floor) · 13 small · 14 body · 16 body-lg · 18 · 22 · 28 · 34 |
| space, radius, shadow | `--sp-1…7` (4 to 48) · `--r-1…4` (4/8/12/16) · `--shadow-pop` `--shadow-drawer` | |
| controls, focus, motion | `--h-control` 40 · `--h-touch` 44 · focus ring 2 px `--teal-600` (teal-300 on navy) · `--dur` 120 ms, off under `prefers-reduced-motion` | |

`theme.remap` (bottom of tokens.css) keeps the v3 names (`--ink`, `--muted`, `--line`, `--bg`, `--green`, `--teal`, `--amber`, `--chrome`…) and the master brand names resolving, so ported v3 code and every canvas screen keep working. The kit never styles bare tags inside a screen and the screen's own CSS loads after the kit, so a screen can always override. Legacy hex to token map for owners restyling a screen is in the comment there. `web/js/ui/contrast.js` holds the token pairs; `test/ui-kit.mjs` and the gallery check them from the live custom properties.

## 3. Components

All helpers are exported on `ui` and as named exports of `web/js/ui/index.js`. HTML options (`body`, `footer`, `html`) take trusted HTML; everything else is escaped.

### Chips

- `ui.chip(text, { tone, icon, detail, title, size:'sm', className, attrs })`. Tones: `neutral info success warning danger outline navy`. States: with or without icon and detail.
- `ui.statusChip(value, { kind, detail, text })` is the **unified status vocabulary**. `value` is a `request.stage` (`draft_ready pending_approval awaiting_signature signed submitted overdue info_requested partial_decide peer_to_peer_* p2p_awaiting denied appeal_sent active early_discharge closed …`), a dispute status (`decide p2p-prep info-req upheld overturned …`), a note review state, a clock state (`ok soon overdue`), an actor (`staff psyflo lauris payer family system`) or a signature mode. Text, tone and icon come from `ui.STATUS` (exported for tests). `ui.resolveStatus(value, kind)` returns `{kind,key,text,tone,icon,group}`; `group` is the queue filter group (`draft awaiting submitted needs denial active closed`). Unknown values fall back to a neutral humanised chip with `unknown:true`.
- `ui.maturity(featureId | {level,note})`. Reads `web/js/shared/maturity.js`. Simulated, Pilot (preview) and Future always show; Working is in the DOM but hidden unless the presenter's Maturity overlay is on (`html[data-maturity="all"]`). Register a feature's level **once** in `maturity.js`; never hard-code a chip.
- `ui.sourceChip(kind | rule, { source, verified_on, note })` (alias `ui.verification`): `official` Officially verified · `payer` Payer-specific · `harvest` Harvest-reported · `unverified` Unverified. Accepts the row returned by `rule(s, key)` (reads `category`, `source`, `verified_on`, `note`). Separate axis from maturity; never share one chip.
- `ui.datasetChip('case_backed'|'harvest_export'|'illustrative')` for Analytics.
- `ui.evidenceChip({ n, label, date, quote, source, href, hrefLabel, state })`. States `sourced` (default) · `missing` ("Evidence missing — verify …") · `excluded` · `sensitive`. Click opens a popover with the quote, source and "Open in Lauris".
- `ui.progress({ value, max, label, tone, text })` (`role="progressbar"`), `ui.stepper(steps, { current })` (`aria-current="step"`), `ui.statStrip(items)` (max 6 count chips instead of tiles).

### filterBar

```js
ui.filterBar({ id, search:{ key:'q', placeholder }, chips:[{ key:'status', value:'needs', label:'Needs action', count:5 }],
  selects:[{ key:'payer', label:'Payer', options:[['', 'All'], ['anthem','Anthem']] }], more:[…selects],
  state:{ status, q, payer }, shown, total, noun, onChange(next, {key, value}), onClear, url:true })
```
Chips are `<button aria-pressed>`; clicking the lit chip clears it. State is yours (`this.state.f`); initial values come from `this.params`. With `url:true` (default) every change is also written into the hash query with `history.replaceState` (no re-route, your state survives), so a filter survives reload and can be copied. Helpers: `ui.query.readQuery(['status','q'])`, `ui.query.writeQuery({ status:'needs' })`. States: idle, active filters (count and "Clear filters (n)"), "More filters" open when one is set.

### queueTable

```js
ui.queueTable({ id, caption, columns:[{ key, label, sort:true, primary:true, align:'right', hideBelow:1280, render:r=>html }],
  rows, rowId, href:r=>'#/Authorization?id='+r.id, onOpen(row,id), sort:{key,dir}, onSort({key,dir}), rowClass, limit, limitStep, onMore, total,
  maxHeight, empty:{title,body,action}, error:{title,body,onRetry}, loading })
```
Sortable headers (`aria-sort`, button inside the `th`), sticky header inside a scroll region (`role=region`, focusable), whole row opens on click; with `href` the first (primary) cell holds a real link and is the only tab stop; with `onOpen` and no `href` the row is `tabindex=0` and Enter or Space opens it. ArrowUp/ArrowDown move between rows. States: rows, empty, loading, error (with retry), "Show N more". `ui.sortRows(rows, sort, getters)` sorts for you. Columns collapse with `hideBelow` (1280, 1024, 768).

### Overlays

`ui.modal`, `ui.drawer`, `ui.popover`, `ui.confirm`, all on one stack (`ui.overlay`): `role="dialog"` (`alertdialog` for confirm), `aria-modal`, `aria-labelledby` the title, focus moves in, Tab and Shift+Tab are trapped, the page behind becomes `inert`, Escape closes the top layer, a scrim click closes, focus returns to the opener (or its replacement after a repaint: give opener buttons an `id` or `data-ui-return`). While an overlay is open the screen does not repaint.

```js
const h = ui.modal({ title:'Send the reply', body:'<p>…</p>', size:'sm'|'md'|'lg',
  actions:[{ label:'Cancel', tone:'secondary' }, { label:'Send', tone:'primary', onClick: h => this.send(), keepOpen:false }],
  onMount:(dialog, h)=>{…}, onClose:result=>{…}, initialFocus:'#reply', dismissable:true });
h.update({ title, body }); h.close('why'); await h.closed;           // handle
ui.drawer({ title, body, footer })                                    // right side, 460 px
ui.popover({ anchor: buttonEl, title, body, focus:true })             // anchored, non-modal
const ok = await ui.confirm({ title, body, confirmLabel, tone:'danger' })
ui.tooltip('text')  ·  ui.infoPopover({ label, title, html })        // inline help instead of paragraphs
```
`modal(html, (box, close) => …)` exported by app.js keeps working (now an accessible dialog; its container is still `#modal`). Static markup for docs and tests: `ui.dialogHtml(opts)`. Toast: `ui.toast(msg, 'err'?)` (`role="status"`, `role="alert"` for errors); `ui.toastHtml`.

### Timeline and history

`ui.timeline(events, { id, onOpen })` and `ui.history(events, { id, title, limit, open })`. Event: `{ id, at, what, who, actor:'staff'|'psyflo'|'lauris'|'payer'|'family'|'system', sim, document:{name,href}, source, next:{label,href}, tone }`. Newest first, actor chip, Simulated chip when `sim`. Clicking an event opens a drawer: What · When · Who · Document · Source · Next action; missing fields read "Not recorded" (nothing is invented). `onOpen(event)` replaces the default drawer. `history` is the compact accordion (first `limit` rows, "Show N more" inside).

### draftReview

```js
ui.draftReview({ id, title, items:[{ id, label, staffInput, psyfloText, changed:['phrase'], sources:[evidenceOpts], missing, state:'pending'|'accepted'|'rejected'|'edited',
    editing, hasPrevious, canAccept, acceptReason }], versions:[…], current:1, bulk:{ count }, approve:{ label },
  onAccept(id) onReject(id) onEdit(id) onSave(id,text) onCancel(id) onRestore(id) onAcceptSourced() onApprove() })
```
Three-way: Staff input · PsyFlo wording (changed phrases marked) · Source (evidence chips). Per item Accept, Reject, Edit, Restore previous; sources open a popover. Wide containers show three columns, narrow ones (the 400 px panel) switch to tabs (container query). There is **no bulk accept**: the optional "Accept the N with sources" only counts items that have sources and still leaves **Approve and fill**, which stays disabled until every item has a decision. Items with no source print "Evidence missing — verify" and cannot be accepted silently. The edit text lives in `ui.draft` under `${id}:${item.id}`. "Synchronized" in the version ladder must only be set from an observed Lauris event.

### Smaller pieces

`ui.emptyState({ tone:'empty'|'error'|'denied'|'loading', title, body, action:{label,href}, onAction })` · `ui.skipLink()` · `ui.kbd('Ctrl','Shift','P')` · `ui.icon(name)` (`ui.ICON_NAMES`) · `ui.presenterDock(model)`.

## 4. The shell

- **Landmarks and focus.** `<html lang="en">`; first tab stop is "Skip to main content"; the rail is `<nav aria-label="Main">`; the screen's own `<main>` is the main landmark (if a template has none, `#root` takes `role="main"`); every route has one `h1` (the shell adds a hidden one when a screen has none); focus moves to main on route change and the title is announced in `#sh-announce`. Reduced motion is honoured globally. Rail collapses to icons at 1024 px.
- **Rail foot at every width.** Above 1024 px: demo line, Help, user card with a "Sign out" link. At 1024 px and below the rail is icons only: Help and Sign out stay as 44 px icon buttons with names (`aria-label`, `title`) and "Demo data · nothing is real" becomes a slim line along the bottom of the window (still inside `#rail`). At 700 px and below the rail is a top bar with the same two icon buttons at its right end. The wordmark is the full-colour variant (`web/js/logo-color.svg`); `web/js/logo.svg` (white and light teal) is only for navy surfaces.
- **Framed Lauris routes** (`Ext*`) have no rail: a slim top bar gives "Back to Psyflo" (My Work), the route title as the `h1`, what is open, and "Open in its own tab".
- **Rail** from `web/js/shared/nav.js`: logo (My Work), three large items (Authorizations, Denial Intelligence, Analytics), divider, small Referrals and Settings. An item shows only if the user may open the route it points at (`routeAllowed` from `permissions.js`). Counts show only when greater than zero. Foot: "Demo data · nothing is real", Help, user card.
- **Presenter dock** (`#dock`, above the viewport). Presentation: hidden by default, `Ctrl+Shift+P` or `?present=1` shows it (28 px handle when collapsed, a ribbon when open). Explore (`?mode=explore`, stored in `localStorage psyflo_mode`): always docked open. The mode label is always in the ribbon. Contents: Scenario (reads `state.scenarios`, calls `demo.scenario {id}`, signs in as the returned role, opens the returned route; a scenario that points at a route that is not yet live lands on the old screen), Role (4 staff roles, guardian, school; no page reload), Reset (Live flows or Canvas snapshot), Simulate (receive a reply, advance a day), Notes ("How the data gets in" drawer with the maturity chips of the screen), Maturity overlay, Surfaces (Platform, Lauris + panel, Phone, Family, School), All screens (Explore: role-aware search). Presenter-only code never renders inside `#stage`. Demo controls for screens: `import { sim } from '../app.js'; sim.receiveReply(); sim.advanceDay();`.

## 5. Routes, redirects and the live flags

`web/js/registry.js` holds `SCREENS` (shape unchanged; never remove an id), `REDIRECTS` and `resolveRoute()`. `route()` and `hrefFor()` apply the table before the `BY_ID` check, so `go('Submission.dc.html?id=R-0399')` and a pasted `#/Submission?id=R-0399` both end on the canonical route once the redirect is live; `legacy=1` in the query always bypasses it.

```js
// web/js/shared/redirects-live.js  (engineers flip these in the same change that builds the screen)
export const ROUTES_LIVE    = { MyWork:false, Authorization:false, DenialIntelligence:false, DenialCase:false, Settings:false, UiKit:true };
export const REDIRECTS_LIVE = { DoNext:false, ReviewQueue:false, StaffDashboard:false, Users:false, Authorizations:false, Submission:false, EarlyDischarge:false,
                                InfoRequest:false, Partials:false, PeerBrief:false, PayerPlaybook:false, Eligibility:false, WhereThingsLive:false };
```
- **Build a new screen:** replace `web/screens/<Id>.dc.html` and `web/js/screens/<Id>.js` (the stub carries the class `is-stub`), set `ROUTES_LIVE.<Id> = true`. The rail, the home landing and the All screens picker then point at it; until then they point at the old screen named as `fallback` in `nav.js`.
- **Hand an old route to its new target:** set `REDIRECTS_LIVE.<OldId> = true`, only after the target is live and reads the same query params. `test/routes.mjs` fails if a live route still renders `.is-stub`, if a live redirect leads to a route that is not live, or if a historic id stops resolving.
- Params are passed through unchanged: `MyWork?section=todo|review|team|day|referrals`, `Authorization?id=&section=timeline|documents|evidence|submission|units|payer|tasks|transition`, `DenialCase?id=&section=decision|evidence|options|action|history&action=info|options|p2p|appeal|reconsider`, `Settings?tab=people|roles|units|rules|audit|family|presenter`, `Analytics?section=&dataset=`. Read them in `init()` from `this.params`.
- `Eligibility` stays inside the referral workspace (`Referral?id=…&panel=eligibility`, never away from Referrals). `AppealLetter` is guardian-facing and is never redirected.

## 6. Maturity registry

`web/js/shared/maturity.js`: `{ featureId: { level:'working'|'simulated'|'pilot'|'future', note, title?, routes?, verification? } }` for every route (`route.<Id>`) and the main features. `maturityOf`, `levelOf`, `featuresFor(routeId)`. Rule: the label states the claim made to Harvest; pilot scope overrides demo fidelity; a feature blocked by a rule or consent shows a source chip (`verification`) instead of its own tier. The mock Lauris is declared Simulated once (`lauris.mock`).

## 7. Tests

`node test/ui-kit.mjs` (focus trap, aria, keyboard, contrast, dock, shell, typing during a live update), `node test/routes.mjs` (redirect table, flags, deep links, rail never leads to a stub). Both take `BASE=http://localhost:<port>`.
