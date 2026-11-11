// Stub for the pre-registered route MyWork (?section=todo|review|team|day|referrals). Owner: E2 builds the sections; E1 builds the shell.
// Replace web/screens/MyWork.dc.html and this controller with the real screen, then flip ROUTES_LIVE.MyWork in
// web/js/shared/redirects-live.js (and the REDIRECTS_LIVE flags that point here). test/routes.mjs fails while a live route is still a stub.
import { register, Screen } from '../app.js';
register('MyWork', class extends Screen {
  renderVals() { const p = Object.entries(this.params || {}).map(([k, v]) => k + '=' + v).join('&'); return { received: p || '(none)' }; }
});
