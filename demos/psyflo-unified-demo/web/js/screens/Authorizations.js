// 29 · Authorizations — the work queue over request.stage (E2), laid out like the artifact's All Authorizations (R3) and formatted like Denial Intelligence (R4:
// ui.dateCard, the shared page, filter grid, table and cells; sources and lines are icons with a hover definition).
// R6 · simpler, with a side drawer: the page shows the search, the Status filter and one Filters button; every other filter, the Authorization period card and
// the sort live in the Filters drawer. The table keeps what decides the order: Consumer · Level of care · Payer · Assigned clinician · Remaining (with what was
// requested and approved) · Status (with the request type and period) · Next action, and, for the treating clinician only, Suggestions: a small chip "3 · 2 high"
// that opens the "Suggested by Psyflo" drawer for that row without leaving the list (web/js/screens/AuthRecs.js). The Level of care cell holds the service
// ("IOP day · H0015") with the ASAM level beneath, the match-state chip from the client's latest assessment and the reassessment flag (sel/asam-view.js).
// R7 · Oprox parity: the rows group under urgency headings ("Highest financial risk · act now", "Due within 24 hours", ...; the "Group by urgency" switch, URL key grp=0), the Next
// action cell carries the due-in chip and the dollars-at-risk chip (every role), the Suggestions cell the packet line, the needs-input badge and the lift line (clinician; sample),
// the Filters drawer an Urgency filter (URL key urg), a quiet line says how many recertifications are due, the payer line (pulse, with See why) and the Insights button are for every
// role, and Analyze a case (clinician) opens the intake drawer (AuthIntelWizard.js). The numbers come from shared/intel.js and shared/sel/auth-intel.js.
// Selectors: shared/sel/auth.js. One row per request; the row opens the case.
// Also exports small helpers shared by the other request screens (Sent, Info request, Partials, Early discharge, Peer-to-peer)
// so they read requests the same way. Keep these exports: other screens import them.
import { register, Screen, M, raw, esc, ui, modal, toast, session, api, canOpen } from '../app.js';
import { isLive } from '../registry.js';
import { can } from '../shared/permissions.js';
import { authQueue, queueOptions, normalizeParams, LEGACY_KEYS, CHIPS } from '../shared/sel/auth.js';
import { openFlagDialog, flagButton } from './a-flag.js';
import { A_CSS } from './a-css.js';
import { deadlineCell, ownerCell, svcShort } from './a-fmt.js';
import { ASAM_CSS, levelCell } from './asam-ui.js';
import { REASSESS_FILTERS } from '../shared/sel/asam-view.js';
import { mayRecs, recsFor, recChip, openRecs, RECS_CSS } from './AuthRecs.js';
import { urgency, payerPulse, urgencyMatch, URGENCY_FILTERS, urgencyFilterOk, BAND_LABEL, BAND_ORDER } from '../shared/intel.js';
import { bandsOf, recertCount, rowSignals } from '../shared/sel/auth-intel.js';
import { dueHtml, riskHtml, pulseHidden, hidePulse, openPulseWhy, openInsights } from './AuthIntel.js';
import { openAnalyze, AW_CSS } from './AuthIntelWizard.js';

// ---------- shared request helpers ----------
export const details = (s, id) => (s.request_details && s.request_details[id]) || {};
// the live row wins; seeded tracker fields fill what the seed row lacks
export const view = (s, r) => r ? { ...(details(s, r.id).fill || {}), ...r } : null;
export const findReq = (s, id) => view(s, M.byId(s.requests, id));
// the request a screen shows: ?id if it exists, else the first fallback id that exists, else the first matching pred
export function pickReq(s, id, fallbacks = [], pred = () => false) {
  if (id) { const r = findReq(s, id); if (r) return r; }
  for (const f of fallbacks) { const r = findReq(s, f); if (r) return r; }
  const r = s.requests.find(pred);
  return r ? view(s, r) : null;
}
export const clientOf = (s, r) => M.byId(s.clients, r.client);
export const schoolName = (s, r) => { const c = clientOf(s, r); const sc = c?.school || details(s, r.id).school; return sc ? M.school(s, sc).name : ''; };
export const rateFor = r => /after-school/i.test(r.service || '') ? 1 : /outpatient/i.test(r.service || '') ? 0 : 3;
const WHO = { Psyflo: 'Psyflo', Sfax: 'Sfax', demo: 'Demo', 'payer (demo)': 'payer' };
export function whoLabel(s, who) { if (!who) return ''; if (WHO[who]) return WHO[who]; const st = M.byId(s.staff, who); return st ? M.staffShort(s, who) : who; }
export function stamp(s, at) {
  if (!at) return '';
  const d = at.slice(0, 10) === s.today ? 'Today' : M.fmtDate(at);
  const t = M.fmtTime(at);
  return t ? `${d} · ${t}` : d;
}
// "what happened, in order" rows from the audit trail
export function evHtml(s, e) {
  const who = whoLabel(s, e.who);
  return raw(`${esc(e.what)}${who && !e.what.includes(who) ? ` <span style="color:#525B66">· ${esc(who)}</span>` : ''}${e.demo ? ' <span class="chip y">demo</span>' : ''}`);
}
export function timeline(s, id) {
  return M.eventsFor(s, id).map(e => ({ dt: stamp(s, e.at), html: evHtml(s, e) }));
}
// full communication history: audit trail + entries derived from the request's own dates (model.requestHistory)
export function historyRows(s, r) {
  return M.requestHistory(s, r).map((e, i) => ({
    dt: e.at ? stamp(s, e.at) : 'Before pilot',
    html: raw(`${e.upcoming ? '<span class="chip n" style="margin-right:6px">upcoming</span>' : ''}${evHtml(s, e).html}`),
    st: i === 0 ? 'border-top:0' : ''
  }));
}
// open a page on the mock portals (Availity / UHC) in a new tab; the tab is opened inside the click
// so the browser does not block it, then pointed at the URL the action returns
export async function openPortal(screen, action, args) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  let res;
  try { res = await screen.do(action, args); } catch (e) { if (w) w.close(); return null; }
  if (res && res.open) {
    const url = `${api.config.extURL}${res.open}`;
    if (w) w.location.href = url; else window.open(url, '_blank');
  } else if (w) w.close();
  return res;
}
export async function openFile(screen, action, args, pick = r => r?.file?.url || r?.url) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  try { const res = await screen.do(action, args); const url = pick(res); if (url) { if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close(); return res; }
  catch { if (w) w.close(); return null; }
}
export function stageCls(stage) {
  return { draft_ready: 'chip b', awaiting_signature: 'chip b', signed: 'chip b', info_requested: 'chip y', partial_decide: 'chip y', peer_to_peer_requested: 'chip y', p2p_awaiting: 'chip y', overdue: 'chip r', denied: 'chip r', active: 'chip g', early_discharge: 'chip g' }[stage] || 'chip n';
}
export function unitsLeft(s, r) {
  const c = clientOf(s, r); const a = c?.authorization;
  if (!a || !a.units) return null;
  return { units: a.units, used: a.used || 0, left: a.units - (a.used || 0) };
}


// Where "In Denial Intelligence" goes: the E3 workspace once it is live (contract: #/DenialCase?id=<requestId>), else the old screen that does the job
export const diHref = r => (isLive('DenialCase') ? `#/DenialCase?id=${encodeURIComponent(r.id)}` : '#/' + M.requestHref(r).replace(/\.dc\.html/, ''));
export const caseHref = (id, section) => `#/Authorization?id=${encodeURIComponent(id)}${section ? '&section=' + section : ''}`;

const NOUN = 'authorizations';
const COLS_HELP = 'Sorted by what is most urgent. Click a column to sort.';
const KEYS = ['q', 'status', 'payer', 'service', 'type', 'owner', 'site', 'school', 'level', 'reassess', 'units', 'due', 'urg'];
const KIND = { initial: 'Initial SRA', early_discharge_new_initial: 'Initial SRA', continued_stay: 'Concurrent SRA', concurrent: 'Concurrent SRA' };

// 29 · All Authorizations. First sight: search, Status, one Filters button, the table. Filters drawer: the Authorization period card, ten more filters, the sort.
// The units are one bar ("110 left of 150", a yellow flag from 75% used); the Next action cell holds the one button, the deadline with its icon, and the flag button.
const SORTS = [['', 'Most urgent first'], ['case', 'Consumer'], ['level', 'Level of care'], ['payer', 'Payer'], ['owner', 'Assigned clinician'], ['period', 'Authorization period'], ['requested', 'Units requested'], ['approved', 'Units approved'], ['units', 'Units remaining'], ['status', 'Status'], ['deadline', 'Next action date']];
const LIST_CSS = `
.a-page .a-fr{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 14px}
.a-page .a-fr .ui-fbar{display:flex;flex:1 1 360px;grid-template-columns:none;gap:12px 14px;align-items:flex-end}
.a-page .a-fr .ui-fbar .ui-fsearch{flex:1 1 220px;order:-1}
.a-page .a-fr .ui-fbar .ui-fsel{flex:0 1 220px;min-width:160px}
.a-fr__b{flex:0 0 auto;min-height:44px}
.a-fd{display:flex;flex-direction:column;gap:var(--sp-4)}
.a-fd .ui-fbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:end;gap:12px}
@media (max-width:520px){.a-fd .ui-fbar{grid-template-columns:1fr}}
.a-fd .ui-fcount{grid-column:1/-1}
.a-fd .ui-fsel{width:100%}.a-fd .ui-fsel .ui-select{width:100%;max-width:none}
.a-fd .ui-datecard{width:100%;max-width:none}
.a-fd__sort{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px}
.a-fd__sort .ui-fsel{margin:0}
.a-sub-l{display:block;margin-top:2px}
.a-c-recs{white-space:normal}
.a-owner-l{display:none}
@media (max-width:1599px){.a-owner-l{display:block}}
@media (min-width:1600px){.a-c-case{min-width:90px}}
@media (max-width:1599px){.ui-hide-lt-1600{display:none}}
.a-nx__s{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}
.a-sg{display:flex;flex-direction:column;align-items:flex-start;gap:3px;max-width:230px}
.a-sg__r{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.a-sg__t{font-size:var(--fs-12);line-height:1.3;color:var(--muted-700)}.a-sg__l{color:var(--success-fg)}
.a-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin:0 0 var(--sp-2)}
.a-recert{font-size:var(--fs-13);font-weight:600;color:var(--danger-fg)}
.a-grp{display:inline-flex;align-items:center;gap:8px;min-height:32px;font-size:var(--fs-13);cursor:pointer}
.a-grp input{width:18px;height:18px;accent-color:var(--teal-600)}
.a-basis{margin:var(--sp-2) 0 0}
.a-recchip--m{display:none;margin-top:6px}
@media (max-width:767px){.a-recchip--m{display:inline-flex}.a-fd__sort{grid-template-columns:1fr}.a-grp,.a-recert{min-height:44px}.a-sg{max-width:none}}
`;
register('Authorizations', class extends Screen {
  init() {
    const f = normalizeParams(this.params, this.s.today);
    const pg = ui.pager.fromQuery(this.params);
    f.urg = urgencyFilterOk(this.params.urg) ? this.params.urg : '';
    this.state = { grp: this.params.grp !== '0', f: Object.fromEntries(KEYS.map(k => [k, f[k] || ''])), stage: f.stage || '', range: { from: f.from, to: f.to }, sort: { key: f.sort || 'priority', dir: f.dir }, size: pg.size, page: pg.page };
    // a v3 link (show= st= exp= range= ) or an old tab link lands on the canonical names; the address says so
    if (LEGACY_KEYS.some(k => this.params[k] != null)) ui.query.writeQuery({ status: f.status, stage: f.stage, ends: f.ends, from: f.from, to: f.to, show: '', st: '', exp: '', range: '', tab: '' });
    this.ends = f.ends || '';
    this.fd = null;   // the open Filters drawer
  }
  get css() { return A_CSS + ASAM_CSS + RECS_CSS + LIST_CSS + AW_CSS; }
  get me() { return session.actor; }
  filters() { const st = this.state; return { ...st.f, stage: st.stage, ends: this.ends, from: st.range.from, to: st.range.to, sort: st.sort.key === 'priority' ? '' : st.sort.key, dir: st.sort.dir }; }
  setF(next) { this.setState({ f: { ...this.state.f, ...next }, page: 1 }); ui.query.writeQuery({ page: '' }); }
  // how many of the filters that live in the drawer are set (the number on the Filters button)
  hiddenActive() { const st = this.state; return KEYS.filter(k => k !== 'q' && k !== 'status' && st.f[k]).length + (st.stage ? 1 : 0) + (this.ends ? 1 : 0) + (st.range.from || st.range.to ? 1 : 0); }
  // the Filters drawer: the Authorization period card, the other ten filters and the sort (the same controls, the same address, the same state as before)
  filtersHtml() {
    const s = this.s; const st = this.state; const o = queueOptions(s, this.me);
    const opt = (head, list) => [['', head], ...list];
    const range = ui.dateCard({
      id: 'auth-dc', title: 'Authorization period', from: st.range.from, to: st.range.to,
      hint: 'The dates match any overlap with the authorization period. An Ends in chip matches the date the authorization ends instead.',
      chips: ['7', '30', '60'].map(d => ({ key: d, label: `Ends in ${d} days`, on: this.ends === d })),
      onChange: c => { this.onDates(c); this.refreshFilters(); }
    });
    const bar = ui.filterBar({
      id: 'auth-f2', label: 'More authorization filters', state: st.f,
      selects: [
        { key: 'payer', label: 'Payer', options: opt('All payers', o.payers) },
        { key: 'service', label: 'Service type', options: opt('All services', o.services) },
        { key: 'type', label: 'Request type', options: opt('All requests', o.types) },
        { key: 'owner', label: 'Assigned clinician', options: opt('All clinicians', o.owners) },
        { key: 'site', label: 'Location', options: opt('All locations', o.sites) },
        { key: 'school', label: 'School', options: opt('All schools', o.schools) },
        { key: 'level', label: 'Level of care', options: opt('All levels', o.levels) },
        { key: 'reassess', label: 'Reassessment', options: opt('Any', REASSESS_FILTERS) },
        { key: 'units', label: 'Units remaining', options: [['', 'Any'], ['25', '25% or less'], ['50', '50% or less'], ['warn', 'Flagged (75% used)']] },
        { key: 'due', label: 'Next step due', options: [['', 'Any time'], ['overdue', 'Overdue'], ['today', 'Today'], ['7', 'In 7 days'], ['30', 'In 30 days']] },
        { key: 'urg', label: 'Urgency', options: URGENCY_FILTERS }
      ],
      onChange: f => { this.setF(f); this.refreshFilters(); }, onClear: f => { this.clearAll(f); this.refreshFilters(); }
    });
    const sk = st.sort.key === 'priority' ? '' : st.sort.key;
    const sort = `<div class="a-fd__sort"><label class="ui-fsel"><span class="ui-fsel__l">Sort by</span><select class="ui-select" id="a-sort-k">${SORTS.map(([v, l]) => `<option value="${esc(v)}"${v === sk ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label><label class="ui-fsel"><span class="ui-fsel__l">Order</span><select class="ui-select" id="a-sort-d"><option value="asc"${st.sort.dir !== 'desc' ? ' selected' : ''}>Ascending</option><option value="desc"${st.sort.dir === 'desc' ? ' selected' : ''}>Descending</option></select></label></div>`;
    return `<div class="a-fd">${range}${bar}${sort}</div>`;
  }
  // the rows the list shows: the filters, then the urgency filter, then (grouped) in urgency order; the pager slices these rows and never counts a heading
  view() {
    const s = this.s; const st = this.state; const q = authQueue(s, this.filters(), this.me); const b = bandsOf(s);
    let rows = q.rows.filter(r => urgencyMatch(urgency(s, r.req), st.f.urg));
    if (st.grp) rows = rows.map((r, i) => ({ r, i })).sort((x, y) => (BAND_ORDER.indexOf(b.byId[x.r.id]) - BAND_ORDER.indexOf(b.byId[y.r.id])) || (x.i - y.i)).map(x => x.r);
    return { q, b, rows };
  }
  shownCount() { return this.view().rows.length; }
  refreshFilters() {
    const d = this.fd; if (!d || !d.dialog || !d.dialog.isConnected) { this.fd = null; return; }
    const ae = document.activeElement; const id = ae && ae.id && d.dialog.contains(ae) ? ae.id : '';
    d.update({ body: this.filtersHtml() });
    const n = this.shownCount(); const go = d.dialog.querySelector('[data-ui-action="0"]'); if (go) go.textContent = `Show ${n} authorization${n === 1 ? '' : 's'}`;
    if (id) { const el = d.dialog.querySelector('#' + CSS.escape(id)); if (el) el.focus({ preventScroll: true }); }
  }
  openFilters(opener) {
    if (this.fd) return;
    const n = this.shownCount();
    ui.drawer({ title: 'Filters', body: this.filtersHtml(), returnFocus: opener || null, actions: [{ label: `Show ${n} authorization${n === 1 ? '' : 's'}`, tone: 'primary' }],
      onClose: () => { this.fd = null; },
      onMount: (dlg, h) => {
        this.fd = h;
        dlg.addEventListener('change', e => {
          if (e.target.id !== 'a-sort-k' && e.target.id !== 'a-sort-d') return;
          const k = dlg.querySelector('#a-sort-k').value; const dir = dlg.querySelector('#a-sort-d').value;
          this.setState({ sort: { key: k || 'priority', dir }, page: 1 }); ui.query.writeQuery({ sort: k, dir: k ? dir : '', page: '' });
          this.refreshFilters();
        });
      } });
  }
  renderVals() {
    const s = this.s; const me = this.me; const st = this.state;
    const { q, b, rows: all } = this.view();
    const opt = (head, list) => [['', head], ...list];
    const active = KEYS.filter(k => st.f[k]).length + (st.stage ? 1 : 0) + (this.ends ? 1 : 0) + (st.range.from || st.range.to ? 1 : 0);
    const hidden = this.hiddenActive();
    const bar = ui.filterBar({
      id: 'auth-f', label: 'Authorization filters', state: st.f,
      search: { key: 'q', placeholder: 'Initials or Lauris #', label: 'Search authorizations' },
      selects: [{ key: 'status', label: 'Status', options: opt('All statuses', CHIPS.map(c => [c.value, c.label])) }],
      onChange: f => this.setF(f), onClear: f => this.clearAll(f)
    });
    const rows = ui.pager.slice(all, { size: st.size, page: st.page });
    const recs = mayRecs(me);
    const recsOf = new Map(recs ? rows.map(r => [r.id, recsFor(s, r.id)]) : []);
    const sig = new Map(rows.map(r => [r.id, rowSignals(s, r.req, me, { recs: recs ? recsOf.get(r.id) : null, bands: b })]));
    const W = recs ? ['8%', '13%', '9%', '8%', '11%', '12%', '20%', '19%'] : ['10%', '18%', '11%', '9%', '16%', '16%', '20%'];   // column widths: the Suggestions column is the clinician's
    const cols = [
      { key: 'case', label: 'Consumer', sort: true, primary: true, width: W[0], className: 'a-c-case', render: r => `<span class="a-case-l"><b>${esc(r.initials)}</b></span>${r.lauris ? `<span class="ui-sub ui-nw">Lauris #${esc(r.lauris)}</span>` : ''}<span class="ui-sub a-owner-l">${esc(r.owner.short)}</span>` },
      { key: 'level', label: 'Level of care', sort: true, hideBelow: 768, width: W[1], className: 'a-c-level', render: r => levelCell(r.asam, { svc: `${esc(svcShort(r.serviceLabel))}${r.serviceCode ? ' · ' + esc(r.serviceCode) : ''}` }) },
      { key: 'payer', label: 'Payer', sort: true, hideBelow: 768, width: W[2], render: r => `<span title="${esc(r.payerFull)}">${esc(r.payerId === 'uhc' ? 'UHC' : r.payer)}</span>` },
      { key: 'owner', label: 'Assigned clinician', sort: true, hideBelow: 1600, width: W[3], render: r => ownerCell(r.owner.short, r.owner.backup && r.owner.backup.name) },
      { key: 'units', label: 'Remaining', sort: true, width: W[4], className: 'a-c-units', render: r => this.unitsCell(r) },
      { key: 'status', label: 'Status', sort: true, width: W[5], render: r => this.statusCell(r) },
      { key: 'deadline', label: 'Next action', sort: true, width: W[6], className: 'a-c-next', render: r => this.nextCell(r, recs ? recsOf.get(r.id) : null, sig.get(r.id)) },
      ...(recs ? [{ key: 'recs', label: 'Suggestions', hideBelow: 768, width: W[7], className: 'a-c-recs', render: r => this.recCell(r, recsOf.get(r.id) || [], sig.get(r.id)) }] : [])
    ];
    let table = ui.queueTable({
      id: 'auth', caption: 'Authorizations', columns: cols, rows, rowId: r => r.id, href: r => caseHref(r.id),
      sort: st.sort.key === 'priority' ? {} : st.sort, onSort: sort => { this.setState({ sort, page: 1 }); ui.query.writeQuery({ sort: sort.key, dir: sort.dir, page: '' }); },
      maxHeight: rows.length > 12 ? undefined : 'none', empty: { title: q.total ? 'Nothing matches' : 'No authorizations yet', body: q.total ? 'Clear a filter to see more.' : 'Authorizations appear after a request is drafted.' }
    });
    // the urgency headings: one row above the first case of each group on this page, with the count of the whole group
    if (st.grp && rows.length) {
      const n = {}; all.forEach(r => { const k = b.byId[r.id]; n[k] = (n[k] || 0) + 1; });
      let last = null;
      for (const r of rows) { const k = b.byId[r.id]; if (k === last) continue; last = k; const tag = `<tr data-ui-row data-row-id="${r.id}"`; table = table.replace(tag, ui.bandRow({ label: BAND_LABEL[k], count: n[k], cols: cols.length, key: k }) + tag); }
    }
    const pager = ui.pager({ id: 'auth-pg', total: all.length, size: st.size, page: st.page, noun: NOUN, label: 'Authorizations pages', onChange: ({ size, page }) => this.setState({ size, page }) });
    const canDraft = !!me && can(me, 'drafts.clinical');
    const action = `${canDraft ? `<a class="ui-btn ui-btn--primary" href="ExtCase.dc.html">Start continued stay</a>` : ''}${canDraft ? `<button type="button" class="ui-btn ui-btn--secondary" id="a-analyze" data-ui-return="a-analyze" data-x="analyze" aria-haspopup="dialog">${ui.icon('sparkle', 16)} Analyze a case</button>` : ''}<button type="button" class="ui-btn ui-btn--secondary" id="a-insights" data-ui-return="a-insights" data-x="insights" aria-haspopup="dialog">${ui.icon('bars', 16)} Insights</button>`;
    const stageNote = st.stage ? `<div class="ui-stagenote" role="status"><span>Stage: <b>${esc(M.STAGE_LABEL[st.stage] || st.stage)}</b></span><button type="button" class="ui-linkbtn" data-x="stage-clear">Clear stage</button></div>` : '';
    const clear = active ? `<div class="ui-fclear"><button type="button" class="ui-linkbtn" data-x="clear-all">Clear all filters (${active})</button></div>` : '';
    const nRe = recertCount(s);
    const meta = `<div class="a-meta">${nRe ? `<button type="button" class="ui-linkbtn a-recert" data-x="recert" title="Show the requests with a renewal due">${nRe} ${nRe === 1 ? 'recertification' : 'recertifications'} due</button>` : ''}<label class="a-grp"><input type="checkbox" id="a-grp" data-x="grp"${st.grp ? ' checked' : ''}> Group by urgency</label></div>`;
    const pulse = pulseHidden() ? '' : ui.pulseStrip(payerPulse(s));
    const basis = recs ? `<div class="a-basis">${ui.basisLine()}</div>` : '';
    const fbtn = `<button type="button" class="ui-btn ui-btn--secondary a-fr__b" id="a-filters" data-ui-return="a-filters" data-x="filters" aria-haspopup="dialog">${ui.icon('sort', 16)} Filters${hidden ? ` (${hidden})` : ''}</button>`;
    return { bar: raw(`<div class="a-fr">${bar}${fbtn}</div>`), stage: raw(pulse + stageNote), clear: raw(clear + meta), queue: raw(table + basis), pager: raw(pager), action: raw(action), range: raw(''), maturity: raw(ui.maturity('route.Authorizations')), help: raw(ui.infoPopover({ label: 'About this table', title: 'Authorizations', html: `<p>${esc(COLS_HELP)}</p><p>Remaining shows what is left of the units, with what was requested and approved beneath it. It turns yellow once ${esc(String(ruleWarn(s)))}% of the units are used. A warning icon beside a date means due soon or overdue; hover it for the reason. The small icon after a date shows where the number comes from (Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption) when you hover it.</p><p>Level of care shows the service, the ASAM level the request asks for, and a chip for what the client's latest assessment says about it (ratings support it, a step-down is likely, or the ratings point higher). A flag appears when the reassessment is due or overdue, when an incident came after the last assessment, or when the level is above or below what the ratings fit. The ratings are the clinician's; the level the ratings fit is only suggested.</p><p>Status shows the request type and the authorization period. The Filters button opens the Authorization period card, the other filters and the sort.</p><p>The rows are grouped by urgency: the one request with the most money at stake that is due within three days comes first, then what is due within 24 hours, within the week, and later. Next action shows how soon it is due and the dollars at risk, which are units times a demo rate. Turn Group by urgency off for the plain list.</p>${recs ? `<p>Suggestions (treating clinician only) shows how many suggestions Psyflo has for a request and how many are high impact, whether the packet still needs the clinician's own words, and the sample lift line. It opens the suggestions without leaving the list.</p>` : ''}<p>The flag button marks an authorization for attention. The people who work authorizations see it here and in their notifications (the bell at the top right).</p>` })) };
  }
  num(v) { return v == null ? '<span class="ui-muted" aria-label="Not recorded">—</span>' : `<b class="ui-num">${esc(String(v))}</b>`; }
  clearAll(f) {
    this.state.range = { from: '', to: '' }; this.ends = ''; this.state.stage = '';
    ui.query.writeQuery({ from: '', to: '', ends: '', stage: '', page: '' }); this.setF(f);
  }
  // Remaining: the bar (or the text) and what was requested and approved beneath it
  unitsCell(r) {
    const u = r.units;
    if (u.showBar) return `${ui.unitsBar({ total: u.total, used: u.used, left: u.left, warn: u.warn, warnPct: u.warnPct }, { compact: true })}<span class="ui-sub a-sub-l">${esc(u.text)}</span>`;
    return `<span class="a-muted a-nw">${esc(u.text)}</span>`;
  }
  // Status: the chip, then the request type and the authorization period
  statusCell(r) {
    const sub = [KIND[r.type] || r.typeLabel, r.periodText].filter(Boolean).join(' · ');
    return `${ui.statusChip(r.stage)}${sub ? `<span class="ui-sub a-sub-l">${esc(sub)}</span>` : ''}`;
  }
  deadlineLine(r, extra = '') {
    const d = r.deadline; if (d.kind === 'none') return extra ? `<div class="ui-dlcell">${extra}</div>` : '';
    const why = [d.text, d.sub].filter(Boolean).join(' · ');
    return deadlineCell({ date: d.date ? String(d.date).slice(0, 10) : '', sev: d.sev, why, text: d.short ? `${d.short}` : d.text }, d.rule, extra);
  }
  nextCell(r, recs, sig) {
    const n = r.next; const href = n.di && (canOpen('DenialCase') || canOpen('Partials')) ? diHref(r.req) : caseHref(r.id);   // a denial-stage row opens the Denial Intelligence case for every role that may open it
    const btn = !n.allowed
      ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(href)}" title="${esc(n.why || 'Needs another role')}">View<span class="ui-sr"> ${esc(r.initials)}, ${esc(r.id)}. ${esc(n.label)}: ${esc(n.why || 'needs another role')}</span></a>`
      : `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(href)}">${esc(n.label)}<span class="ui-sr"> for ${esc(r.initials)}, ${esc(r.id)}</span></a>`;
    const fl = can(this.me, 'authorizations') ? flagButton({ id: r.id, label: r.label, flag: r.flag }, { label: false }) : '';
    const mini = recs ? recChip(r.id, recs, r.initials, { phone: true }) : '';   // phone widths: the Suggestions column is hidden, the chip sits here
    const chips = sig && (sig.urgency.label || sig.risk) ? `<div class="a-nx__s" data-sig>${dueHtml(sig.urgency, false)}${riskHtml(sig.risk)}</div>` : '';   // the clock and the money: every role
    return `<div class="a-nx"><div class="a-nx__a">${btn}${fl}</div>${chips}${this.deadlineLine(r)}${r.flag ? `<div class="a-nx__f" title="Flagged by ${esc(r.flag.byShort || '')} · ${esc(r.flag.reasonLabel || '')}">${esc(r.flag.reasonLabel || 'Flagged')}</div>` : ''}${mini}</div>`;
  }
  // Suggestions (the treating clinician): the chip, then the packet line with the needs-input badge, then the lift line (a sample)
  recCell(r, recs, sig) {
    const chip = recChip(r.id, recs, r.initials);
    if (!sig || !sig.packet) return chip;
    // the badge says it in a few words; the packet line (shared/intel.js packetLine) is its full text for assistive technology and on hover; with no input needed it is shown as written
    const pk = sig.inputs ? `<span class="ui-sr">${esc(sig.packet.text)}</span>` : `<span class="a-sg__t">${esc(sig.packet.text)}</span>`;
    return `<div class="a-sg" data-packet title="${esc(sig.packet.text)}"><div class="a-sg__r">${chip}${ui.needsInputBadge(sig.inputs)}</div>${pk}${sig.lift ? `<span class="a-sg__t a-sg__l" data-lift>${esc(sig.lift)}</span>` : ''}</div>`;
  }
  onDates({ from, to, chip }) {   // the date card: typing a date clears an Ends in chip; an Ends in chip keeps the dates
    this.state.range = { from, to }; this.ends = chip; this.state.page = 1;
    ui.query.writeQuery({ from, to, ends: chip, page: '' }); this.repaint();
  }
  // a band heading spans the columns that are on screen (a column hidden at a narrow width must not leave a phantom column behind)
  fixBands() { const n = [...document.querySelectorAll('.a-page thead th')].filter(th => getComputedStyle(th).display !== 'none').length || 1; document.querySelectorAll('.a-page .in-band th').forEach(th => { th.colSpan = n; }); }
  after(root) {
    this.fixBands();
    if (!this._mq && typeof matchMedia === 'function') { this._mq = [768, 1600].map(w => matchMedia(`(max-width:${w - 1}px)`)); this._mq.forEach(m => m.addEventListener('change', () => this.fixBands())); }
    root.querySelectorAll('[data-x="stage-clear"]').forEach(b => { b.onclick = () => { this.state.stage = ''; this.state.page = 1; ui.query.writeQuery({ stage: '', page: '' }); this.repaint(); }; });
    root.querySelectorAll('[data-x="clear-all"]').forEach(b => { b.onclick = () => this.clearAll(Object.fromEntries(KEYS.map(k => [k, '']))); });
    root.querySelectorAll('[data-x="filters"]').forEach(b => { b.onclick = () => this.openFilters(b); });
    root.querySelectorAll('[data-flag]').forEach(b => {
      b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); const row = (this.s.requests || []).find(x => x.id === b.dataset.flag); if (!row) return; const q = authQueue(this.s, {}, this.me).all.find(x => x.id === b.dataset.flag); openFlagDialog(this, { id: row.id, label: q ? q.initials : row.id, flag: q ? q.flag : null }, b); };
    });
    root.querySelectorAll('[data-recs]').forEach(b => { b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); if (mayRecs(this.me)) openRecs(this, b.dataset.recs, { opener: b }); }; });
    root.querySelectorAll('[data-x="insights"]').forEach(b => { b.onclick = () => openInsights(this, b, { log: mayRecs(this.me) }); });
    root.querySelectorAll('[data-x="analyze"]').forEach(b => { b.onclick = () => { if (mayRecs(this.me)) openAnalyze(this, b); }; });
    root.querySelectorAll('[data-pulse-see]').forEach(b => { b.id = b.id || 'a-pulse-see'; b.onclick = () => openPulseWhy(this, b); });
    root.querySelectorAll('[data-pulse-x]').forEach(b => { b.onclick = () => { hidePulse(); this.repaint(); setTimeout(() => { const n = document.getElementById('a-insights'); if (n) n.focus(); }, 30); }; });
    root.querySelectorAll('[data-x="recert"]').forEach(b => { b.onclick = () => { this.setF({ status: 'renewal' }); ui.query.writeQuery({ status: 'renewal' }); }; });
    root.querySelectorAll('[data-x="grp"]').forEach(b => { b.onchange = () => { this.setState({ grp: b.checked, page: 1 }); ui.query.writeQuery({ grp: b.checked ? '' : '0', page: '' }); setTimeout(() => { const n = document.getElementById('a-grp'); if (n) n.focus(); }, 30); }; });
  }
});
const ruleWarn = s => ((s.rules || []).find(r => r.key === 'units.warn_used_pct') || {}).value || 75;
