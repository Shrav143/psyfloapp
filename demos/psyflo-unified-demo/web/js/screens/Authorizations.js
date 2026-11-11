// 29 · Authorizations — the work queue over request.stage (E2). Selectors: shared/sel/auth.js. One row per request; the row opens the case.
// Also exports small helpers shared by the other request screens (Sent, Info request, Partials, Early discharge, Peer-to-peer)
// so they read requests the same way. Keep these exports: other screens import them.
import { register, Screen, M, raw, esc, ui, modal, toast, session, api, canOpen } from '../app.js';
import { isLive } from '../registry.js';
import { can } from '../shared/permissions.js';
import { authQueue, queueOptions, normalizeParams, LEGACY_KEYS, CHIPS } from '../shared/sel/auth.js';

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

const NOUN = 'requests';
const COLS_HELP = 'Sorted by what is most urgent. Click a column to sort.';

register('Authorizations', class extends Screen {
  init() {
    const f = normalizeParams(this.params, this.s.today);
    this.state = { f: { q: f.q, status: f.status, payer: f.payer, type: f.type, owner: f.owner, stage: f.stage, site: f.site, ends: f.ends }, range: { from: f.from, to: f.to }, sort: { key: f.sort || 'priority', dir: f.dir }, limit: 25 };
    // a v3 link (show= st= exp= range=) or an old tab link lands on the canonical names; the address says so
    if (LEGACY_KEYS.some(k => this.params[k] != null)) ui.query.writeQuery({ status: f.status, stage: f.stage, ends: f.ends, from: f.from, to: f.to, show: '', st: '', exp: '', range: '', tab: '' });
  }
  get me() { return session.actor; }
  filters() { const st = this.state; return { ...st.f, from: st.range.from, to: st.range.to, sort: st.sort.key === 'priority' ? '' : st.sort.key, dir: st.sort.dir }; }
  setF(next) { this.setState({ f: { ...this.state.f, ...next }, limit: 25 }); }
  renderVals() {
    const s = this.s; const me = this.me; const st = this.state;
    const q = authQueue(s, this.filters(), me); const o = queueOptions(s);
    const opt = (head, list) => [['', head], ...list];
    const chips = CHIPS.map(c => ({ key: 'status', value: c.value, label: c.label, count: q.counts[c.value] })).concat([{ key: 'status', value: '', label: 'All', count: q.counts.all }]);
    const bar = ui.filterBar({
      id: 'auth-f', label: 'Authorization filters', chipsLabel: 'Status', state: st.f,
      search: { key: 'q', placeholder: 'Search cases', label: 'Search cases' }, chips,
      selects: [{ key: 'payer', label: 'Payer', options: opt('All payers', o.payers) }, { key: 'type', label: 'Type', options: opt('All types', o.types) }, { key: 'owner', label: 'Owner', options: opt('Anyone', o.owners) }],
      more: [{ key: 'stage', label: 'Stage', options: opt('Any stage', o.stages) }, { key: 'site', label: 'Site', options: opt('Both sites', o.sites) }, { key: 'ends', label: 'Ends within', options: [['', 'Any time'], ['7', '7 days'], ['30', '30 days'], ['60', '60 days']] }],
      shown: q.shown, total: q.total, noun: NOUN, onChange: f => this.setF(f), onClear: f => { this.state.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.setF(f); }
    });
    const cols = [
      { key: 'case', label: 'Case', sort: true, primary: true, width: '21%', render: r => `<span class="a-case-l"><b>${esc(r.label)}</b> <span class="a-id">${esc(r.id)}</span></span><span class="a-sub">${esc(r.school || '')}</span>` },
      { key: 'payer', label: 'Payer', sort: true, hideBelow: 1024, width: '12%', render: r => `${esc(r.payer)}<div class="a-sub">${esc(r.channel)}${r.ref ? ' · ' + esc(r.ref) : ''}</div>` },
      { key: 'type', label: 'Request type', sort: true, hideBelow: 1280, width: '11%', render: r => `${esc(r.typeLabel)}<div class="a-sub">${esc(r.service)}</div>` },
      { key: 'status', label: 'Status', sort: true, width: '13%', render: r => ui.statusChip(r.stage) + (r.inDI ? (canOpen('DenialCase') || canOpen('Partials') ? `<div class="a-di"><a href="${esc(diHref(r.req))}">In Denial Intelligence</a></div>` : '<div class="a-sub">In Denial Intelligence · clinician only</div>') : '') },
      { key: 'units', label: 'Units', sort: true, width: '15%', render: r => this.unitsCell(r) },
      { key: 'deadline', label: 'Deadline', sort: true, width: '16%', render: r => this.deadlineCell(r) },
      { key: 'owner', label: 'Owner', sort: true, hideBelow: 1280, width: '7%', render: r => `<span title="${esc(r.owner.backup ? 'Backup: ' + r.owner.backup.name : 'No backup set')}">${esc(r.owner.short)}</span>` },
      { key: 'next', label: 'Next action', sort: true, render: r => this.nextCell(r) }
    ];
    const table = ui.queueTable({
      id: 'auth', caption: 'Authorizations', columns: cols, rows: q.rows, rowId: r => r.id, href: r => caseHref(r.id),
      sort: st.sort.key === 'priority' ? {} : st.sort, onSort: sort => { this.setState({ sort }); ui.query.writeQuery({ sort: sort.key, dir: sort.dir }); },
      limit: st.limit, limitStep: 25, onMore: () => this.setState({ limit: st.limit + 25 }), total: q.shown, maxHeight: 'none',
      empty: { title: q.total ? 'No requests match' : 'No requests yet', body: q.total ? 'Clear a filter to see more.' : 'Requests appear after a packet is drafted.' }
    });
    const canDraft = !!me && can(me, 'drafts.clinical');
    const action = canDraft ? `<a class="ui-btn ui-btn--primary" href="ExtCase.dc.html">Start continued stay</a>` : `<span class="a-why" title="Starting a request needs a clinician">Needs clinician</span>`;
    const range = `<fieldset class="a-range"><legend class="a-range__l">Authorization period</legend><label class="a-range__f"><span class="ui-sr">From</span><input class="ui-input" type="date" id="a-from" aria-label="Period from" value="${esc(st.range.from)}"></label><span aria-hidden="true">to</span><label class="a-range__f"><span class="ui-sr">To</span><input class="ui-input" type="date" id="a-to" aria-label="Period to" value="${esc(st.range.to)}"></label>${st.range.from || st.range.to ? '<button type="button" class="ui-linkbtn" data-x="range-clear">Clear dates</button>' : ''}</fieldset>`;
    return { bar: raw(bar), queue: raw(table), action: raw(action), range: raw(range), maturity: raw(ui.maturity('route.Authorizations')), help: raw(ui.infoPopover({ label: 'About the deadline column', title: 'Deadlines', html: `<p>${esc(COLS_HELP)}</p><p>Every deadline shows where its number comes from: Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption. Day counts come from the day the request was sent.</p>` })) };
  }
  unitsCell(r) {
    const u = r.units; const warn = u.daysLeft != null && u.daysLeft < 10;
    const bar = u.showBar ? `<div class="a-bar${warn ? ' is-warn' : ''}" role="img" aria-label="${esc(`${u.used} of ${u.total} units used`)}"><i style="width:${Math.min(100, u.pct)}%"></i></div>` : '';
    const sub = u.showBar ? `<div class="a-sub">${esc(u.sub)}</div>` : (r.stage === 'submitted' || r.stage === 'overdue') && r.req.sent ? `<div class="a-sub">sent ${esc(M.fmtDate(r.req.sent))}</div>` : '';
    const days = u.showBar && u.daysLeft != null && u.rate ? `<div class="a-sub">about ${u.daysLeft} school days</div><div class="a-chips">${ui.sourceChip(u.rate.rule)}</div>` : '';
    return `<span class="a-units"><b class="ui-num">${esc(u.text)}</b></span>${bar}${sub}${days}`;
  }
  deadlineCell(r) {
    const d = r.deadline; if (d.kind === 'none') return '<span class="ui-muted">—</span>';
    const chips = [d.sev === 'overdue' || d.sev === 'soon' ? ui.statusChip(d.sev, { kind: 'clock' }) : '', d.rule ? ui.sourceChip(d.rule) : ''].filter(Boolean).join('');
    return `<div class="a-dl a-dl--${d.sev}"><span class="a-dl__t">${esc(d.text)}</span></div>${d.sub ? `<div class="a-sub">${esc(d.sub)}</div>` : ''}${chips ? `<div class="a-chips">${chips}</div>` : ''}`;
  }
  nextCell(r) {
    const n = r.next; const href = n.di && (canOpen('DenialCase') || canOpen('Partials')) ? diHref(r.req) : caseHref(r.id);
    return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(href)}">${esc(n.label)}<span class="ui-sr"> for ${esc(r.label)}, ${esc(r.id)}</span></a>${n.why ? `<div class="a-sub">${esc(n.why)}</div>` : ''}`;
  }
  after(root) {
    const upd = (k, v) => { this.state.range = { ...this.state.range, [k]: v }; ui.query.writeQuery({ [k]: v }); this.repaint(); };
    const from = root.querySelector('#a-from'), to = root.querySelector('#a-to');
    if (from) from.onchange = () => upd('from', from.value);
    if (to) to.onchange = () => upd('to', to.value);
    root.querySelectorAll('[data-x="range-clear"]').forEach(b => { b.onclick = () => { this.state.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.repaint(); }; });
  }
});
