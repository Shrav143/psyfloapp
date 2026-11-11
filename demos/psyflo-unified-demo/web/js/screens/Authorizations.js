// 29 · Authorizations — the work queue over request.stage (E2). Selectors: shared/sel/auth.js. One row per request; the row opens the case.
// Also exports small helpers shared by the other request screens (Sent, Info request, Partials, Early discharge, Peer-to-peer)
// so they read requests the same way. Keep these exports: other screens import them.
import { register, Screen, M, raw, esc, ui, modal, toast, session, api, canOpen } from '../app.js';
import { isLive } from '../registry.js';
import { can } from '../shared/permissions.js';
import { authQueue, queueOptions, normalizeParams, LEGACY_KEYS, CHIPS } from '../shared/sel/auth.js';
import { verificationLabel } from '../shared/rules.js';

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
const KEYS = ['q', 'status', 'payer', 'type', 'owner', 'stage', 'site', 'school', 'units', 'due', 'ends'];

// 29 · Authorizations, simplified (feedback round Nov 11): one filtered table. Units are one bar ("110 left of 150", a yellow flag from 75% used),
// the deadline is a date with a warning icon, the next step is one button. The words live in tooltips; the case holds the detail.
register('Authorizations', class extends Screen {
  init() {
    const f = normalizeParams(this.params, this.s.today);
    this.state = { f: Object.fromEntries(KEYS.map(k => [k, f[k] || ''])), range: { from: f.from, to: f.to }, sort: { key: f.sort || 'priority', dir: f.dir }, limit: 25 };
    // a v3 link (show= st= exp= range= ) or an old tab link lands on the canonical names; the address says so
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
    // every filter is on the page (nothing behind a "More filters" disclosure): the supervisor filters instead of reading
    const bar = ui.filterBar({
      id: 'auth-f', label: 'Authorization filters', chipsLabel: 'Status', state: st.f,
      search: { key: 'q', placeholder: 'Initials or Lauris #', label: 'Search patients' }, chips,
      selects: [
        { key: 'payer', label: 'Payer', options: opt('All payers', o.payers) }, { key: 'type', label: 'Request type', options: opt('All requests', o.types) },
        { key: 'owner', label: 'Assigned clinician', options: opt('All clinicians', o.owners) }, { key: 'site', label: 'Location', options: opt('All locations', o.sites) },
        { key: 'school', label: 'School', options: opt('All schools', o.schools) }, { key: 'stage', label: 'Stage', options: opt('Any stage', o.stages) },
        { key: 'units', label: 'Units remaining', options: [['', 'Any'], ['25', '25% or less'], ['50', '50% or less'], ['warn', 'Flagged (75% used)']] },
        { key: 'due', label: 'Next step due', options: [['', 'Any time'], ['overdue', 'Overdue'], ['today', 'Today'], ['7', 'In 7 days'], ['30', 'In 30 days']] }
      ],
      shown: q.shown, total: q.total, noun: NOUN, onChange: f => this.setF(f), onClear: f => { this.state.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.setF(f); }
    });
    const cols = [
      { key: 'case', label: 'Patient', sort: true, primary: true, width: '14%', className: 'a-c-case', render: r => `<span class="a-case-l"><b>${esc(r.initials)}</b></span>${r.lauris ? `<span class="a-sub a-nw">Lauris #${esc(r.lauris)}</span>` : ''}` },
      { key: 'payer', label: 'Payer', sort: true, width: '14%', render: r => `<span class="a-nw">${esc(r.payer)}</span>` },
      { key: 'type', label: 'Request', sort: true, hideBelow: 1280, width: '12%', render: r => esc(r.typeLabel) },
      { key: 'status', label: 'Status', sort: true, width: '13%', render: r => ui.statusChip(r.stage) },
      { key: 'units', label: 'Units', sort: true, width: '18%', className: 'a-c-units', render: r => this.unitsCell(r) },
      { key: 'deadline', label: 'Deadline', sort: true, width: '10%', className: 'a-c-dl', render: r => this.deadlineCell(r) },
      { key: 'owner', label: 'Clinician', sort: true, hideBelow: 1280, width: '8%', render: r => `<span class="a-nw" title="${esc(r.owner.backup ? 'Backup: ' + r.owner.backup.name : 'No backup set')}">${esc(r.owner.short)}</span>` },
      { key: 'next', label: 'Next step', sort: true, render: r => this.nextCell(r) }
    ];
    const table = ui.queueTable({
      id: 'auth', caption: 'Authorizations', columns: cols, rows: q.rows, rowId: r => r.id, href: r => caseHref(r.id),
      sort: st.sort.key === 'priority' ? {} : st.sort, onSort: sort => { this.setState({ sort }); ui.query.writeQuery({ sort: sort.key, dir: sort.dir }); },
      limit: st.limit, limitStep: 25, onMore: () => this.setState({ limit: st.limit + 25 }), total: q.shown, maxHeight: q.rows.length > 12 ? undefined : 'none',   // a long queue scrolls inside the table so its header stays visible (QA1-03)
      empty: { title: q.total ? 'No requests match' : 'No requests yet', body: q.total ? 'Clear a filter to see more.' : 'Requests appear after a packet is drafted.' }
    });
    const canDraft = !!me && can(me, 'drafts.clinical');
    const action = canDraft ? `<a class="ui-btn ui-btn--primary" href="ExtCase.dc.html">Start continued stay</a>` : '';
    const pill = d => `<button type="button" class="ui-fchip" data-x="ends" data-v="${d}" aria-pressed="${st.f.ends === d}">Ends in ${d} days</button>`;
    const range = `<fieldset class="a-range"><legend class="a-range__l">Authorization period</legend><label class="a-range__f"><span class="ui-sr">From</span><input class="ui-input" type="date" id="a-from" aria-label="Period from" value="${esc(st.range.from)}"></label><span aria-hidden="true">to</span><label class="a-range__f"><span class="ui-sr">To</span><input class="ui-input" type="date" id="a-to" aria-label="Period to" value="${esc(st.range.to)}"></label><span class="a-range__p">${['7', '30', '60'].map(pill).join('')}</span>${st.range.from || st.range.to ? '<button type="button" class="ui-linkbtn" data-x="range-clear">Clear dates</button>' : ''}</fieldset>`;
    return { bar: raw(bar), queue: raw(table), action: raw(action), range: raw(range), maturity: raw(ui.maturity('route.Authorizations')), help: raw(ui.infoPopover({ label: 'About the units and deadline columns', title: 'Units and deadlines', html: `<p>${esc(COLS_HELP)}</p><p>The unit bar shows what is left. It turns yellow once ${esc(String(ruleWarn(s)))}% of the units are used. A warning icon beside a date means due soon or overdue; hover it for the reason and where the number comes from (Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption).</p>` })) };
  }
  unitsCell(r) {
    const u = r.units;
    if (u.showBar) return ui.unitsBar({ total: u.total, used: u.used, left: u.left, warn: u.warn, warnPct: u.warnPct });
    return `<span class="a-muted a-nw">${esc(u.text)}</span>`;
  }
  deadlineCell(r) {
    const d = r.deadline; if (d.kind === 'none') return '<span class="ui-muted" aria-label="No deadline">—</span>';
    const src = d.rule ? (d.rule.verification || verificationLabel(d.rule.category)) : '';
    const why = [d.text, d.sub].filter(Boolean).join(' · ') + (src ? ` · ${src}` : '');
    return d.date ? ui.dateFlag({ date: String(d.date).slice(0, 10), sev: d.sev, why }) : `<span class="ui-muted" title="${esc(why)}" aria-label="${esc(why)}">—</span>`;
  }
  nextCell(r) {
    const n = r.next; const href = n.di && (canOpen('DenialCase') || canOpen('Partials')) ? diHref(r.req) : caseHref(r.id);   // a denial-stage row opens the Denial Intelligence case for every role that may open it
    if (!n.allowed) return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(href)}" title="${esc(n.why || 'Needs another role')}">View<span class="ui-sr"> ${esc(r.initials)}, ${esc(r.id)}. ${esc(n.label)}: ${esc(n.why || 'needs another role')}</span></a>`;
    return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(href)}">${esc(n.label)}<span class="ui-sr"> for ${esc(r.initials)}, ${esc(r.id)}</span></a>`;
  }
  after(root) {
    const upd = (k, v) => { this.state.range = { ...this.state.range, [k]: v }; ui.query.writeQuery({ [k]: v }); this.repaint(); };
    const from = root.querySelector('#a-from'), to = root.querySelector('#a-to');
    if (from) from.onchange = () => upd('from', from.value);
    if (to) to.onchange = () => upd('to', to.value);
    root.querySelectorAll('[data-x="range-clear"]').forEach(b => { b.onclick = () => { this.state.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.repaint(); }; });
    root.querySelectorAll('[data-x="ends"]').forEach(b => { b.onclick = () => { const on = this.state.f.ends === b.dataset.v; ui.query.writeQuery({ ends: on ? '' : b.dataset.v }); this.setF({ ends: on ? '' : b.dataset.v }); }; });
  }
});
const ruleWarn = s => ((s.rules || []).find(r => r.key === 'units.warn_used_pct') || {}).value || 75;
