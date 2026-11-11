// Stub for the pre-registered route Settings (?tab=people|roles|units|rules|audit|family|presenter). Owner: E1
// Replace web/screens/Settings.dc.html and this controller with the real screen, then flip ROUTES_LIVE.Settings in
// web/js/shared/redirects-live.js (and the REDIRECTS_LIVE flags that point here). test/routes.mjs fails while a live route is still a stub.
import { register, Screen } from '../app.js';
register('Settings', class extends Screen {
  renderVals() { const p = Object.entries(this.params || {}).map(([k, v]) => k + '=' + v).join('&'); return { received: p || '(none)' }; }
});
