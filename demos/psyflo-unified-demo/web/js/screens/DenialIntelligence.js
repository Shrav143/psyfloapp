// Stub for the pre-registered route DenialIntelligence (?status=…&decision=partial). Owner: E3
// Replace web/screens/DenialIntelligence.dc.html and this controller with the real screen, then flip ROUTES_LIVE.DenialIntelligence in
// web/js/shared/redirects-live.js (and the REDIRECTS_LIVE flags that point here). test/routes.mjs fails while a live route is still a stub.
import { register, Screen } from '../app.js';
register('DenialIntelligence', class extends Screen {
  renderVals() { const p = Object.entries(this.params || {}).map(([k, v]) => k + '=' + v).join('&'); return { received: p || '(none)' }; }
});
