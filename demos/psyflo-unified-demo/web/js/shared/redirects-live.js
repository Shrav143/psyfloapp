// Flags that decide when the new routes replace the old ones. Engineers flip these in the SAME change that builds the screen.
// Nothing else needs editing: registry.js (redirects, home), nav.js (rail) and the All screens picker read this file.
//
// 1. ROUTES_LIVE  -- a pre-registered new route becomes live when its screen is really built (the stub's `is-stub` marker is gone).
//    The rail, the home landing and the screens picker point at a new route ONLY when its flag is true; until then they point at the
//    old route named as `fallback` in shared/nav.js. test/routes.mjs fails when a live route still renders `.is-stub`.
// 2. REDIRECTS_LIVE -- an old route id hands over to its new target (registry.js REDIRECTS, keyed by `flag`). With the flag off the
//    old screen keeps working. Turn a redirect on only after (a) the target route is live and (b) it reads the same deep-link params.
//
//   E2 (authorizations):  ROUTES_LIVE.MyWork, ROUTES_LIVE.Authorization  · REDIRECTS_LIVE.DoNext/ReviewQueue/StaffDashboard/Authorizations/Submission/EarlyDischarge/Eligibility
//   E1 (settings, My Work shell): ROUTES_LIVE.Settings, ROUTES_LIVE.MyWork · REDIRECTS_LIVE.Users/WhereThingsLive
//   E3 (denial intelligence): ROUTES_LIVE.DenialIntelligence/DenialCase · REDIRECTS_LIVE.InfoRequest/Partials/PeerBrief
//   E4 (analytics): REDIRECTS_LIVE.PayerPlaybook (Analytics?section=payer&panel=guidance)
export const ROUTES_LIVE = {
  MyWork: true,
  Authorization: true,
  DenialIntelligence: true,
  DenialCase: true,
  Settings: true,
  UiKit: true // built by the foundation: presenter-only gallery of the UI kit
};

export const REDIRECTS_LIVE = {
  DoNext: true,
  ReviewQueue: true,
  StaffDashboard: true,
  Users: true,
  Authorizations: true,    // only Authorizations?id=… (the queue itself stays on Authorizations)
  Submission: true,
  EarlyDischarge: true,
  InfoRequest: true,
  Partials: true,          // ?id=… goes to DenialCase, no id goes to DenialIntelligence?decision=partial
  PeerBrief: true,
  PayerPlaybook: true,
  Eligibility: true,       // stays inside the referral workspace: Referral?id=…&panel=eligibility
  WhereThingsLive: true   // opens the presenter drawer (Architecture); ?full=1 still opens the page
};
