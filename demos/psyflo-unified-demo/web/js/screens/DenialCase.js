// Stub for the pre-registered route DenialCase (?id=R-0402&section=decision|evidence|options|action|history&action=info|options|p2p|appeal|reconsider). Owner: E3
// Replace web/screens/DenialCase.dc.html and this controller with the real screen, then flip ROUTES_LIVE.DenialCase in
// web/js/shared/redirects-live.js (and the REDIRECTS_LIVE flags that point here). test/routes.mjs fails while a live route is still a stub.
import { register, Screen } from '../app.js';
register('DenialCase', class extends Screen {
  renderVals() { const p = Object.entries(this.params || {}).map(([k, v]) => k + '=' + v).join('&'); return { received: p || '(none)' }; }
});
