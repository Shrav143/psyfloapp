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
  get css() { return `#stage.ext{background:#E9E6E0}.xbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 14px;background:#DEDAD3;font:13px 'DM Sans',system-ui,sans-serif;color:#151B24;border-bottom:1px solid #D9D4CC}
.xbar a{color:#15605E;font-weight:600}.xbar .u{flex:1;min-width:200px;background:#fff;border:1px solid #D9D4CC;border-radius:999px;padding:5px 12px;font-size:12px;color:#525B66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xframe{display:block;width:100%;height:calc(100vh - 92px);border:0;background:#F2F3F5}`; }
  prepare() {
    return `<div class="xbar"><span class="u">{{direct}}</span><span>{{what}}</span><a href="{{direct}}" target="_blank" rel="noopener">Open in its own tab ↗</a><span style="color:#525B66">Mock Lauris with the Psyflo panel beside it (in-page fallback at 400px; same panel as the extension)</span></div>
<iframe class="xframe" title="Mock Lauris with the Psyflo panel" src="{{url}}" allow="microphone"></iframe>`;
  }
  renderVals() { if (!this._t) this._t = laurisHref(this.meta?.id || 'ExtHome', this.params); return this._t; }
  onStore() { /* keep the frame; the panel inside updates itself */ }
}
