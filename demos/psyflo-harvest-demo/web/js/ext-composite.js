// Extension screens (13–18, 23–26, 32, 33, 37) are not app pages: they are the mock Lauris page with the
// Psyflo panel beside it. In the app they open as a live composite — the mock Lauris in a frame, with the
// panel rendered by Lauris's in-page fallback at 400px. The same Lauris URL works in its own tab with the
// MV3 side-panel extension installed.
import { DCLogic, esc } from './runtime.js';
import { api } from './api.js';

const T = (id) => (api.state.clients.find(c => c.id === id) || {});
const no = (id, fallback) => T(id).harvest_no || fallback;

// Psyflo knows a student's Harvest # only once the panel has seen that student open in Lauris (or from the seed).
export const EXT_TARGETS = {
  ExtHome: p => ({ path: '/consumers', what: 'Consumers list · the panel reads it' }),
  ExtScreening: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/screening`, what: 'T.W. · Admission Screening' } : { path: '/consumers/new?referral=REF-118', what: 'New consumer for REF-118 (Flow A starts here)' }; },
  ExtCNA: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/cna`, what: 'T.W. · CNA' } : { path: '/consumers/new?referral=REF-118', what: 'T.W. is not in Lauris yet · create the consumer first' }; },
  ExtISP: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/isp`, what: 'T.W. · ISP 2.0' } : { path: '/consumers/new?referral=REF-118', what: 'T.W. is not in Lauris yet · create the consumer first' }; },
  ExtSRA: p => { const id = p.client || 'TW'; const n = T(id).lauris_no || (id !== 'TW' ? T(id).harvest_no : null); return n ? { path: `/consumers/${n}/session/sra-initial`, what: `${T(id).initials} · TDT Initial SRA` } : { path: '/consumers/new?referral=REF-118', what: 'T.W. is not in Lauris yet · create the consumer first' }; },
  ExtSignOff: p => ({ path: '/approvals', what: 'Forms to Approve' }),
  ExtDPN: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/dpn`, what: 'Daily Progress Note' }),
  ExtWeekly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/weekly`, what: 'Weekly guardian call' }),
  ExtMonthly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/collateral`, what: 'Monthly collateral' }),
  ExtIncident: p => ({ path: `/consumers/${no(p.client || 'DW', 4102)}/session/incident`, what: 'Incident report' }),
  ExtQuarterly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/quarterly`, what: 'Quarterly report' }),
  ExtCase: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/sra-continued`, what: 'CMHRS Continued Stay' }),
  ExtDischarge: p => ({ path: `/consumers/${no(p.client || 'DW', 4102)}/session/discharge`, what: 'Discharge summary' })
};

export function laurisHref(id, params = {}, as) {
  const t = (EXT_TARGETS[id] || EXT_TARGETS.ExtHome)(params);
  let who = as; try { who = who || localStorage.getItem('psyflo_user') || 'jperez'; } catch { who = 'jperez'; }
  return { url: `${api.config.laurisURL}/login?as=${encodeURIComponent(who)}&next=${encodeURIComponent(t.path)}`, direct: api.config.laurisURL + t.path, what: t.what };
}

export class ExtComposite extends DCLogic {
  constructor(params) { super(params); this.params = params || {}; this.noRepaint = true; }
  // The frame fills the viewport: no strip above it. The presenter menu button moves to the bottom left so it never covers the panel's footer.
  get css() { return `#stage.ext{background:var(--paper)}
.xframe{display:block;width:100%;height:100vh;border:0;background:var(--paper)}
body[data-surface="ext"] .pm-fab{right:auto;left:12px;bottom:12px}`; }
  // hosted preview: no server to load a src from, so the page's virtual network renders the Lauris page into the frame (srcdoc)
  prepare() { return `<iframe class="xframe" title="Mock Lauris with the Psyflo panel" ${window.__HOSTED__ ? 'data-src' : 'src'}="{{url}}" ${window.__HOSTED__ ? '' : 'allow="microphone"'}></iframe>`; }
  after(root) { const f = window.__HOSTED__ && window.__vnet && root.querySelector('iframe.xframe'); if (f && !f.dataset.mounted) { f.dataset.mounted = '1'; window.__vnet.mountFrame(f, f.dataset.src); } }
  renderVals() { if (!this._t) this._t = laurisHref(this.meta?.id || 'ExtHome', this.params); return this._t; }
  onStore() { /* keep the frame; the panel inside updates itself */ }
}
