// Hosted-preview helpers (hosted/index.html, built by scripts/build-hosted.mjs). In the Node build every one of them is the plain browser behaviour.
// The hosted page is ONE document at any address with no server: its prelude (scripts/hosted/prelude.js) sets window.__HOSTED__ and window.__vhash.
export const isHosted = () => !!window.__HOSTED__;
// a route change that also works where fragment navigation is refused (a sandboxed page opened from file://): the prelude pushes the state and fires hashchange
export const setHash = h => { if (window.__vhash) window.__vhash(h); else location.hash = h; };
