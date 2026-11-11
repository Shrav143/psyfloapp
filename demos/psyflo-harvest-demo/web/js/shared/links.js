// Deep links for the portals. The Node build serves /f/<token> (family link) and /parent/<token>/<Screen> (guardian pages).
// The hosted preview is one page at any address with no server, so there they are hash routes of the same page
// (#/FamilyLink?t=<token>, #/<Screen>?t=<token>), which the app's router already understands.
export const isHosted = () => !!window.__HOSTED__;
export const famLink = token => isHosted() ? `${location.href.split('#')[0]}#/FamilyLink?t=${token}` : `${location.origin}/f/${token}`;
// qs: '' or '?a=b' (the extra query the guardian screens keep)
export function parentHref(token, id, qs = '') {
  if (!isHosted()) return `/parent/${token}/${id}${qs}`;
  const q = new URLSearchParams(String(qs).replace(/^\?/, '')); q.set('t', token);
  return `#/${id}?${q}`;
}
// In-page navigation to a hash route. A sandboxed page opened from file:// refuses fragment navigation, so the hosted preview's
// prelude does it with history.pushState and fires hashchange itself; the Node build uses the plain browser behaviour.
export const setHash = (h, replace) => window.__vhash ? window.__vhash(h, replace) : (replace ? location.replace(h) : (location.hash = h));
