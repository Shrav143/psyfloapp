# Hosted preview

`index.html` is the whole Psyflo × Harvest demo in one file (about 1.3 MB, everything inline, no server). Synthetic data only. Build: `node scripts/build-hosted.mjs` (esbuild lives outside the repo: `npm i esbuild --prefix "$HOSTED_TOOLS"`). Test: `node test/hosted.mjs`.
The Node server code (store, actions, mock Lauris, mock Availity/UHC/DMAS/state portals) is bundled unchanged and runs in the page behind a virtual network (`scripts/hosted/`); the Lauris page and the panel are `srcdoc` frames that talk to it by `postMessage`.
**Data is in memory only: a page reload resets the demo** (the presenter menu says so). Sign-in uses `localStorage` when the page may touch it, else memory. Works from `file://` and inside a sandboxed iframe without `allow-same-origin`.
What differs from `npm start`: portals, DMAS and "Open mock Lauris" open in an in-app overlay with a Close button (a sandboxed page cannot open tabs); generated PDFs open as text in a viewer with Download; the family link and parent links are hash routes (`#/FamilyLink?t=…`);
the panel's "Open Send" moves the page to Authorizations instead of opening a second tab; routes use `history.pushState` (fragment navigation fails in a sandboxed `file://` page).
Speech: no microphone is assumed; use the presenter menu ("Use the example", "Play the scripted call"). Fonts: DM Sans from Google Fonts, `system-ui` otherwise; nothing else leaves the page.
Not carried over: the Chrome side-panel extension, the real PDF viewer tab, separate browser tabs and windows, data that survives a restart.
