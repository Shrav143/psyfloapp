// Extension screens (13–18, 33, 37; 23–26 and 32 hidden in the Nevada build) are not app pages: they are the mock Client Record page with the
// Psyflo panel beside it. In the app they open as a live composite — the mock Client Record in a frame, with the
// panel rendered by Client Record's in-page fallback at 400px. The same Client Record URL works in its own tab with the
// MV3 side-panel extension installed.
import { DCLogic, esc } from './runtime.js';
import { api } from './api.js';
import { homeFor } from './registry.js';

const T = (id) => (api.state.clients.find(c => c.id === id) || {});
const no = (id, fallback) => T(id).lauris_no || T(id).harvest_no || fallback;
const notYet = { path: '/consumers/new?referral=REF-118', what: 'T.W. is not in Client Record yet · create the client first (Flow A starts here)' };

// Psyflo knows a client's record # only once the panel has seen that client open in Client Record (or from the seed).
export const EXT_TARGETS = {
  ExtHome: p => ({ path: p.path || '/consumers', what: 'Clients' }),
  ExtScreening: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/screening`, what: 'T.W. · Intake screening' } : { path: '/consumers/new?referral=REF-118', what: 'New client for REF-118 (Flow A starts here)' }; },
  ExtCNA: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/cna`, what: 'T.W. · ASAM assessment' } : notYet; },
  ExtISP: p => { const n = T('TW').lauris_no; return n ? { path: `/consumers/${n}/session/isp`, what: 'T.W. · Treatment plan' } : notYet; },
  ExtSRA: p => { const id = p.client || 'TW'; const n = T(id).lauris_no || (id !== 'TW' ? T(id).harvest_no : null); return n ? { path: `/consumers/${n}/session/sra-initial`, what: `${T(id).initials} · Prior authorization request · Level 2.1 IOP` } : notYet; },
  ExtSignOff: p => ({ path: '/approvals', what: 'Forms to Approve' }),
  ExtDPN: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/dpn`, what: 'IOP group note' }),
  ExtWeekly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/weekly`, what: 'Weekly collateral update' }),
  ExtMonthly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/collateral`, what: 'Collateral contact' }),
  ExtIncident: p => ({ path: `/consumers/${no(p.client || 'DW', 4102)}/session/incident`, what: 'Incident report' }),
  ExtQuarterly: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/quarterly`, what: 'Treatment plan review (90-day)' }),
  ExtCase: p => ({ path: `/consumers/${no(p.client || 'MR', 3310)}/session/sra-continued`, what: 'Continued stay request · Level 2.1 IOP' }),
  ExtDischarge: p => ({ path: `/consumers/${no(p.client || 'JO', 4400)}/session/discharge`, what: 'Discharge / transfer summary · 2.1 → Level 1' })
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
.xframe{display:block;width:100%;height:calc(100vh - 41px);border:0;background:#F2F3F5}`; }
  prepare() {
    return `<div class="xbar"><a href="{{home}}">← Back to Psyflo</a><span style="flex:1"></span><a href="{{direct}}" target="_blank" rel="noopener">Open in its own tab ↗</a></div>
<iframe class="xframe" title="Client Record with the Psyflo panel" src="{{url}}" allow="microphone"></iframe>`;
  }
  renderVals() { if (!this._t) { const t = laurisHref(this.meta?.id || 'ExtHome', this.params); let role = 'clinician'; try { const u = api.state.staff.find(x => x.id === localStorage.getItem('psyflo_user')); if (u) role = u.role; } catch { } this._t = { ...t, home: '#/' + homeFor(role) }; } return this._t; }
  onStore() { /* keep the frame; the panel inside updates itself */ }
}
