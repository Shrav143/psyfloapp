// Extension screens (13–18, 23–26, 32, 33, 37) are not app pages: they are the mock Lauris page with the
// Psyflo panel beside it. In the app they open as a live composite — the mock Lauris in a frame, with the
// panel rendered by Lauris's in-page fallback at 400px. The same Lauris URL works in its own tab with the
// MV3 side-panel extension installed.
import { DCLogic, esc } from './runtime.js';
import { api } from './api.js';
import { isLive } from './registry.js';

const T = (id) => (api.state.clients.find(c => c.id === id) || {});
const no = (id, fallback) => T(id).harvest_no || fallback;

// Psyflo knows a student's Harvest # only once the panel has seen that student open in Lauris (or from the seed).
export const EXT_TARGETS = {
  ExtHome: p => ({ path: '/consumers', what: 'Consumers list' }),
  ExtScreening: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/screening`, what: 'T.W. · Admission Screening' } : { path: '/consumers/new?referral=REF-118', what: 'New consumer for REF-118' }; },
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
  get css() { return `#stage.ext{background:#E9E6E0}.xbar{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;min-height:48px;padding:6px 16px;background:#F8F6F2;font:14px 'DM Sans',system-ui,sans-serif;color:#1B1B19;border-bottom:1px solid #E5DCD0}
.xbar a{color:#15605E;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;min-height:36px;padding:0 4px;border-radius:6px}.xbar a:hover{text-decoration:underline}
.xbar .xtitle{margin:0;font-size:15px;font-weight:600;line-height:1.2}.xbar .u{flex:1;min-width:120px;font-size:13px;color:#5A544B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xframe{display:block;width:100%;flex:1 1 auto;min-height:0;height:auto;border:0;background:#F2F3F5}`; }
  // a slim top bar: the way back into the platform, what this page is, and the page in its own tab (no addresses, no developer notes)
  prepare() {
    const H = window.__HOSTED__;   // hosted preview: the frame is filled by the virtual network (after()), not loaded from a URL
    return `<div class="xbar"><a class="xback" href="{{back}}">← Back to Psyflo</a><h1 class="xtitle">{{title}}</h1><span class="u">{{what}}</span><a class="xopen" href="{{direct}}" target="_blank" rel="noopener">${H ? 'Open full screen' : 'Open in its own tab'} ↗<span class="ui-sr"> (opens a new tab)</span></a></div>
<iframe class="xframe" title="Mock Lauris with the Psyflo panel" ${H ? 'data-src' : 'src'}="{{url}}"${H ? '' : ' allow="microphone"'}></iframe>`;
  }
  after(root) { const f = window.__HOSTED__ && window.__vnet && root.querySelector('iframe.xframe'); if (f && !f.dataset.mounted) { f.dataset.mounted = '1'; window.__vnet.mountFrame(f, f.dataset.src); } }
  renderVals() {
    if (!this._t) {
      const t = laurisHref(this.meta?.id || 'ExtHome', this.params);
      const rest = String(this.meta?.title || 'Lauris').replace(/^Extension · /, ''); const role = (api.session && api.session() || {}).role;
      this._t = { ...t, title: 'Lauris · ' + rest.charAt(0).toUpperCase() + rest.slice(1), back: isLive('MyWork') ? '#/MyWork' + (role === 'supervisor' ? '?section=review' : '') : '#/DoNext' };
    }
    return this._t;
  }
  onStore() { /* keep the frame; the panel inside updates itself */ }
}
