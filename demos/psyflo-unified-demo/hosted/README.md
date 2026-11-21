# Hosted preview

`index.html` is the whole unified Psyflo × Harvest demo in one file (about 3 MB, everything inline, no server). Synthetic data only.

Build: `node scripts/build-hosted.mjs` (esbuild lives outside the repo: `npm i esbuild --prefix "$HOSTED_TOOLS"`; add `--min` to minify). Test: `node test/hosted.mjs` (Playwright; opens the file from `file://` and inside a sandboxed outer iframe).

## What it is

The Node server code (store, actions, authz, sessions, role projection, gates, rules, pdf, the mock Lauris, the mock Availity / UHC / state portal / DMAS pages) is bundled **unchanged** by esbuild and runs in the page behind a virtual network (`scripts/hosted/vnet.js`). `/api/session`, `/api/roster`, `/api/state` (with the `X-Psyflo-Session` header and the role projection), `/api/do` (same authorize, run, refusal checks as `server/index.js`), `/api/stream` (an in-process emitter), `/api/config`, `/files/*`, `/seed/*`, the screens and the mock sites answer from memory. The mock Lauris, its Psyflo panel and the portals are `srcdoc` frames that reach the network by `postMessage`; the seed lives in an in-memory file system. Sessions use the same code path (in-memory tokens). Presenter mode is on for every sign-in (`DEMO_PRESENTER`), and the dock says "Hosted preview · data resets on reload".

Built to the published-artifact contract: title "Psyflo Harvest Demo", light colour scheme and an explicit body background, no external script, the only network request is the Google Fonts stylesheet (system-ui otherwise), no `eval` or `new Function` (the template engine's component branch is cut), no `<a download>` and no script-driven save, no horizontal scroll at 390 px on the phone, family and school screens. Works when the host serves it by URL, as `srcdoc`, or from `file://`, with or without `allow-same-origin` (`localStorage`, `sessionStorage` and cookies may throw: memory fallbacks).

## What differs from `npm start`

- **Data is in memory only.** A reload resets the demo and signs everyone out. Nothing persists, nothing is shared between viewers.
- **Popups become an overlay with a Close button** (Esc closes it): "Open in Lauris", Forms to Approve, the mock Availity / UHC / DMAS pages, the state incident portal, "Open mock Lauris" in the dock. A sandboxed page cannot open tabs. The Lauris route screens (`Ext*`) show the mock Lauris with the panel inline, as before.
- **PDFs open as text in a viewer overlay** (signed forms, fax receipts, consents, call notes). The artifact viewer blocks downloads, so there is no Download link: exports (Analytics CSV / PDF, the audit log CSV) say "Open file" / "Open CSV" and show the content as text.
- **Family and parent links are hash routes** (`#/FamilyLink?t=<token>`, `#/ParentPortal?t=<token>`); the texted link in the Referral view reads `https://psyflo.invalid/f/<token>` and opens the route. Routes use `history.pushState` (fragment navigation fails in a sandboxed `file://` page).
- **Sign-in is a presenter sign-in**, and the dock handle is visible from the start (Presentation mode keeps it collapsed to a one-line ribbon).
- **Speech:** no microphone is assumed. The scripted call (panel: "Play the scripted call", or the presenter command `{psyflo:'present', cmd:'script'}` posted to the panel frame) and "Use the example" on the phone work without it.
- Different from the Node build by construction: ids are random (as before), the clock is the browser's wall clock from 3:30 pm on Oct 29 (like the Node build without `DEMO_TIME`), `psyflo.invalid`, `lauris.invalid` and `ext.invalid` are the virtual origins shown in addresses.
- Not carried over: the Chrome side-panel extension, the real PDF viewer, separate tabs and windows, data that survives a restart.

## Build-time patches (the bundle only; the sources stay as they are)

`scripts/build-hosted.mjs` rewrites a few places that cannot work in a hosted page, and stops if one no longer matches: `web/js/runtime.js` (drop the `new Function` branch), `Analytics.js` and `Settings.js` (the save-a-file helpers open the viewer), `Referral.js` and `ParentPortal.js` (server paths become the virtual origin and hash routes). Hosted-aware lines in the shared client files are guarded by `window.__HOSTED__` and do nothing in the Node build.
