// Denial Intelligence · the queue of cases that need a payer-decision response (E3; R4: the shared page, table and cells; R6: simpler, with a side drawer;
// R7: Oprox parity, in drawers and chips, no new page).
// One search box, the Status select and one "Filters" button; every other filter, the "Group by urgency" switch and the Decision date card live in the Filters drawer
// (same URL keys, same results). One table with what decides the order: Case · Payer · Decision · Status · Next step · Deadline, and, for the treating clinician,
// Suggestions. R7 adds, without a new column: urgency groups ("Highest financial risk · act now", "Due within 24 hours", "Due this week", "Later") with counts; a due-in
// chip and a dollars-at-risk chip on every row (every role); a Needs input badge and the sample lift line under the Suggestions chip (clinician); the Urgency filter
// (URL key urg); one dismissible payer line (the pulse) with See why; an Insights button; and Analyze a denial (clinician), a wizard in a side drawer.
// Administrators see status, units, deadlines, money, the pulse and insights, never a suggestion or the payer's reason. Every deadline carries its source chip.
// Deep links: #/DenialIntelligence?status=&decision=partial|denied|info&payer=&service=&owner=&deadline=&urg=overdue|24h|week&grp=0&next=&q=&from=&to=&dim=&size=&page=
import { register, Screen, raw, ui, M, api } from '../app.js';
import { deadlineCell, lockHint } from './a-fmt.js';
import { hoursBetween } from '../shared/dates.js';
import * as D from '../shared/sel/disputes.js';
import { disputeReason, DIMS } from '../shared/sel/asam-view.js';
import { ASAM_CSS } from './asam-ui.js';
import { openDenialRecs, recsOf, countsOf, REC_PHONE_CSS } from './DenialRecs.js';
import { atRisk, urgency, bands, BAND_ORDER, BAND_LABEL, URGENCY_FILTERS, urgencyMatch, payerPulse, packetLine, liftLine } from '../shared/intel.js';
import { INTEL_CSS, openPulse } from './DenialIntelDoc.js';
import { openIntake } from './DenialIntelWizard.js';

const KEYS = ['q', 'decision', 'status', 'payer', 'service', 'owner', 'deadline', 'urg', 'next', 'dim', 'from', 'to'];
const DRAWER_KEYS = ['decision', 'payer', 'service', 'owner', 'deadline', 'urg', 'next', 'dim'];   // behind the Filters button (with the Decision date card)
// the ASAM dimension filter: a dimension the payer's stated reason turns on, the level of care itself, or a reason not compared with the dimensions yet
const DIM_FILTER = [['', 'Any dimension'], ...DIMS.map(d => [String(d.n), `${d.short} ${d.label}`]), ['level', 'Level of care'], ['none', 'Not compared yet']];
const esc = ui.esc;
const PULSE_KEY = 'psyflo.pulse.denial';
const pulseDismissed = () => { try { return sessionStorage.getItem(PULSE_KEY) === '1'; } catch { return false; } };

const QUEUE_CSS = `
.d-qbar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:0 0 var(--sp-3)}
.d-qbar .ui-fbar{display:contents}
.d-qbar .ui-fsearch{flex:1 1 280px;min-width:200px;max-width:440px}
.d-qbar .ui-fsearch .ui-input{width:100%}
.d-qbar .ui-fsel .ui-select{max-width:none;width:100%}
.d-qbar .ui-fsel{flex:0 0 200px}
.d-qbar .ui-fcount{display:none}
.d-qbar__b{flex:0 0 auto}
.d-sug{display:inline-flex;flex-direction:column;align-items:flex-start;gap:1px;min-height:32px;padding:4px 12px;border:1px solid var(--teal-300);background:var(--teal-tint);color:var(--teal-700);border-radius:var(--r-3);font:600 var(--fs-13)/1.3 var(--font);cursor:pointer;text-align:left}
.d-sug:hover{border-color:var(--teal-600)}
.d-sug--in{display:none;margin-top:6px}
@media (max-width:767px){.d-sug--in{display:inline-flex}}
.d-sug__i{font-weight:500;color:var(--muted-700);font-size:var(--fs-12)}
.d-sugc{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.d-lift{font-size:var(--fs-12);line-height:1.3;color:var(--muted-700)}
.d-due{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.d-caseid .in-money{margin-top:4px}
.d-fx{display:flex;flex-direction:column;gap:var(--sp-3)}
.d-fx .ui-fbar{display:flex;flex-direction:column;align-items:stretch;gap:12px}
.d-fx .ui-fsel{width:100%}
.d-fx .ui-fsel .ui-select{max-width:none;width:100%}
.d-fx__n{margin:0;color:var(--muted-700);font-size:var(--fs-13)}
.d-sw{display:flex;align-items:center;gap:10px;min-height:44px;font-size:var(--fs-14);cursor:pointer}
.d-sw input{width:20px;height:20px;flex:0 0 auto}
.d-wz{display:flex;flex-direction:column;gap:var(--sp-3)}
.d-wz h3{margin:0;font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600}
.d-wz h4{margin:0;font-size:var(--fs-16);font-weight:600}
.d-wz h3:focus{outline:none}
.d-wz section{display:flex;flex-direction:column;gap:8px;min-width:0}
.d-wz__steps{display:flex;flex-wrap:wrap;gap:6px 14px;list-style:none;margin:0;padding:0;font-size:var(--fs-13);color:var(--muted-700)}
.d-wz__steps li{display:inline-flex;align-items:center;gap:6px}
.d-wz__steps li span{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--sand-100);font-weight:600;color:var(--ink-900)}
.d-wz__steps li.is-now{color:var(--ink-900);font-weight:600}.d-wz__steps li.is-now span,.d-wz__steps li.is-done span{background:var(--teal-600);color:var(--surface-0)}
.d-wz__tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.d-wz__tile{display:flex;flex-direction:column;gap:8px;margin:0;padding:12px 14px;border:1px dashed var(--control-500);border-radius:var(--r-3);min-width:0}
.d-wz__tile legend{padding:0 6px;font-weight:600}
.d-wz__tile label{font-size:var(--fs-13);color:var(--muted-700)}
.d-wz__tile .ui-select,.d-wz__file{width:100%;max-width:100%}
.d-wz__got{display:flex;align-items:center;gap:8px;margin:0;padding:8px 10px;border-radius:var(--r-2);background:var(--success-bg);color:var(--success-fg);min-width:0}
.d-wz__got span{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.d-wz__rec{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--paper-50)}
.d-wz__src{margin:0;font-size:var(--fs-12);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-700);overflow-wrap:anywhere}
.d-wz__rec .ui-sdl>div{grid-template-columns:120px minmax(0,1fr)}
.d-wz__st{margin:0;font-weight:600}
@media (max-width:760px){.d-sug,.d-qbar__b,.d-fx .ui-select{min-height:44px}.d-qbar .ui-fsel,.d-qbar .ui-fsearch{flex:1 1 100%;max-width:none}.d-wz .ui-btn{min-height:44px}.d-wz__rec .ui-sdl>div{grid-template-columns:1fr}.d-wz .ui-select,.d-wz__file{min-height:44px}}
`;

register('DenialIntelligence', class extends Screen {
  init() {
    const f = {}; for (const k of KEYS) f[k] = this.params[k] != null ? String(this.params[k]) : '';
    this.state = { f, sort: { key: 'deadline', dir: 'asc' }, grp: String(this.params.grp) !== '0', pulseOff: pulseDismissed(), ...ui.pager.fromQuery(this.params) };
  }
  get css() { return ASAM_CSS + QUEUE_CSS + REC_PHONE_CSS + INTEL_CSS; }
  // what the payer's reason turns on (sel/asam-view.js: the reason table, then reasonDims over the payer's own words); the lead's queue rows do not carry it
  reasonOf(r) { return disputeReason(this.s, D.byDisputeId(this.s, r.id)); }
  // the request's clock and money, one read per paint (every role: dates and units only)
  signals(r) {
    const k = r.id; if (!this._sig || this._sigRev !== this.s.rev) { this._sig = new Map(); this._sigRev = this.s.rev; }
    if (!this._sig.has(k)) { const req = M.byId(this.s.requests, r.request); this._sig.set(k, req && r.open ? { u: urgency(this.s, req), risk: atRisk(this.s, req) } : { u: null, risk: null }); }
    return this._sig.get(k);
  }
  rows() {
    const dim = this.state.f.dim; const urg = this.state.f.urg; let rows = D.queueRows(this.s, this.state.f);
    if (urg) rows = rows.filter(r => { const u = this.signals(r).u; return r.open && urgencyMatch(u, urg); });
    if (!dim) return rows;
    return rows.filter(r => { const x = this.reasonOf(r); return dim === 'level' ? x.level : dim === 'none' ? !x.dims.length && !x.level : x.dims.includes(+dim); });
  }
  // the reason cell line: the dimensions as chips (hover names each), then the level-of-care mark; "not compared yet" when the words match none
  reasonLine(r) {
    const x = this.reasonOf(r);
    if (x.none) return '<span class="ui-sub d-rs">Reason not recorded</span>';
    const dims = x.dims.map(n => { const d = DIMS.find(z => z.n === n); return `<span class="d-dim" title="${esc(`${d.short} ${d.name}`)}" aria-label="${esc(`${d.short} ${d.name}`)}">${esc(d.short)}</span>`; }).join('');
    const lvl = x.level ? `<span class="d-dim d-dim--lv" title="The reason is about the level of care">Level of care</span>` : '';
    return dims || lvl ? `<span class="d-rs" data-asam-dims="${esc(x.dims.join(','))}">${dims}${lvl}</span>` : '<span class="ui-sub d-rs">Not compared with the dimensions yet</span>';
  }
  deadlineCell(r) {
    if (!r.open) return `<span class="ui-muted">Closed ${esc(M.fmtDate(r.closed))}</span>`;
    const dl = r.deadline; if (!dl) return '<span class="ui-muted">—</span>';
    const hourly = dl.date && String(dl.date).includes('T');
    let rel = '';
    if (dl.date) {
      const h = hourly ? Math.round(hoursBetween(M.now(this.s), dl.date)) : null;
      if (hourly && Math.abs(h) < 72) rel = h < 0 ? `${-h} h late` : `${h} h left`;
      else rel = dl.days < 0 ? `${-dl.days} d late` : dl.days === 0 ? 'Today' : `${dl.days} d`;
    }
    const cell = deadlineCell({ date: dl.date ? String(dl.date).slice(0, 10) : '', sev: dl.sev, why: [dl.label, rel].filter(Boolean).join(' · '), text: dl.date ? (hourly ? M.fmtDateTime(dl.date) : M.fmtDate(dl.date)) : 'No date' }, dl);
    const u = this.signals(r).u;
    return `<div class="d-due">${u && u.label ? ui.dueChip(u) : ''}${cell}</div>`;
  }
  nextCell(r) { return `<span class="d-nx">${esc(r.next.label)}</span>`; }
  // Suggestions: the live count, how many of those are high impact, how many are included; one button that opens the list for that case. Under it (clinician only):
  // the Needs input badge and the sample lift line (the basis for that sample is printed once under the table)
  sugCell(r, counts, inline = false) {
    if (!r.open) return '<span class="ui-muted">—</span>';
    const c = counts.get(r.request); if (!c || (!c.live && !c.included)) return '<span class="ui-muted">None</span>';
    const said = `${c.live} suggestion${c.live === 1 ? '' : 's'}, ${c.high} high impact, ${c.included} included`;
    const btn = `<button type="button" class="d-sug${inline ? ' d-sug--in' : ''}" id="d-sug${inline ? 'm' : ''}-${esc(r.request)}" data-x="sug" data-request="${esc(r.request)}" aria-label="Suggestions for ${esc(r.consumer)}: ${esc(said)}. Open the list"><span>${c.live}${c.high ? ` · ${c.high} high` : ''}</span>${c.included ? `<span class="d-sug__i">${c.included} included</span>` : ''}</button>`;
    if (inline) return btn;
    return `<div class="d-sugc">${btn}${ui.needsInputBadge(c.inputs)}${c.lift ? `<span class="d-lift">${esc(c.lift)}</span>` : ''}</div>`;
  }
  setF(patch) { this.setState({ f: { ...this.state.f, ...patch }, page: 1 }); }
  // the Decision date card (ui.dateCard, the same card as Authorizations), inside the Filters drawer: two dates and three quick ranges
  dateCard() {
    const f = this.state.f; const today = M.today(this.s); const wk = D.weekBounds(today);
    const quick = [['Today', today, today], ['This week', wk.from, wk.to], ['Before this week', '', M.addDays(wk.from, -1)]];
    return ui.dateCard({ id: 'di-dc', title: 'Decision date', from: f.from, to: f.to, hint: 'The dates match the day the payer decided or asked.',
      chips: quick.map(([label, a, b]) => ({ key: label, label, from: a, to: b, on: f.from === a && f.to === b })),
      onChange: c => { ui.query.writeQuery({ from: c.from, to: c.to }); this.setF({ from: c.from, to: c.to }); this.refreshFilters(); } });
  }
  // the Filters drawer: the grouping switch, the date card, then the other selects, one per line; the count says what the table behind it now shows
  filtersBody() {
    const s = this.s; const f = this.state.f; const all = D.disputesOf(s); const uniq = arr => [...new Set(arr)];
    const payers = uniq(all.map(d => d.payer)).map(id => [id, D.payerFirst(s, id)]);
    const owners = uniq(all.map(d => d.owner).filter(Boolean)).map(id => [id, D.ownerName(s, id)]);
    const services = uniq(D.queueRows(s, { status: 'all' }).map(r => r.service)).map(x => [x, x]);
    const bar = ui.filterBar({ id: 'di-fx', label: 'Denial filters',
      selects: [{ key: 'decision', label: 'Decision type', options: [['', 'All types'], ['partial', 'Partial approval'], ['info', 'Information requested'], ['denied', 'Denied']] },
        { key: 'payer', label: 'Payer', options: [['', 'All payers'], ...payers] }, { key: 'service', label: 'Service', options: [['', 'All services'], ...services] }, { key: 'owner', label: 'Assigned clinician', options: [['', 'All clinicians'], ...owners] },
        { key: 'deadline', label: 'Deadline', options: [['', 'Any deadline'], ['overdue', 'Overdue'], ['7', 'Within 7 days'], ['none', 'No date set']] }, { key: 'urg', label: 'Urgency', options: URGENCY_FILTERS },
        { key: 'next', label: 'Next step', options: [['', 'Any next step'], ...D.NEXT_GROUPS] }, { key: 'dim', label: 'ASAM dimension', options: DIM_FILTER }],
      state: f, onChange: next => { this.setF(next); this.refreshFilters(); }, onClear: next => { ui.query.writeQuery({ from: '', to: '' }); this.setState({ f: { ...next, from: '', to: '' }, page: 1 }); this.refreshFilters(); } });
    const n = this.rows().length;
    const grp = `<label class="d-sw" for="di-grp"><input type="checkbox" id="di-grp" data-x="grp"${this.state.grp ? ' checked' : ''}><span>Group by urgency</span></label>`;
    return `<div class="d-fx">${grp}${this.dateCard()}${bar}<p class="d-fx__n" role="status">${n} denial case${n === 1 ? '' : 's'} match${n === 1 ? 'es' : ''}</p></div>`;
  }
  // repaint the open drawer after a change, and put focus back on the control that was used (the drawer body is replaced)
  refreshFilters() {
    const h = this._fx; if (!h || !h.dialog || !h.dialog.isConnected) return;
    const ae = document.activeElement; const id = ae && h.dialog.contains(ae) ? ae.id : ''; const chip = ae && ae.matches && ae.matches('[data-ui-dc-chip]') ? ae.dataset.key : null;
    h.update({ body: this.filtersBody() }); this.wireFilters();
    const t = id ? h.dialog.querySelector('#' + CSS.escape(id)) : chip != null ? h.dialog.querySelector(`[data-ui-dc-chip][data-key="${CSS.escape(chip)}"]`) : null;
    if (t) t.focus({ preventScroll: true });
  }
  wireFilters() {
    const h = this._fx; if (!h || !h.dialog) return; const g = h.dialog.querySelector('#di-grp');
    if (g) g.onchange = () => { ui.query.writeQuery({ grp: g.checked ? '' : '0' }); this.setState({ grp: g.checked }); this.refreshFilters(); };
  }
  openFilters(el) {
    this._fx = ui.drawer({ title: 'Filters', body: this.filtersBody(), returnFocus: el, actions: [{ label: 'Done', tone: 'primary' }], onClose: () => { this._fx = null; } }); this.wireFilters();
  }
  // the page's rows in display order: with grouping on, open cases sit under their urgency heading (the highest financial risk first), sorted as chosen inside each; closed cases follow
  grouped(sorted) {
    if (!this.state.grp || this.state.f.status === 'closed') return { rows: sorted, of: null, groups: [] };
    const open = sorted.filter(r => r.open); const closed = sorted.filter(r => !r.open);
    const b = bands(open.map(r => { const g = this.signals(r); return { id: r.id, hours: g.u ? g.u.hours : null, dollars: g.risk ? g.risk.dollars : 0 }; }));
    const at = new Map(sorted.map((r, i) => [r.id, i])); const ord = k => BAND_ORDER.indexOf(k);
    const rows = [...open].sort((x, y) => (ord(b.byId[x.id]) - ord(b.byId[y.id])) || (at.get(x.id) - at.get(y.id))).concat(closed);
    const groups = b.groups.map(g => ({ key: g.key, label: BAND_LABEL[g.key], count: g.ids.length })); if (closed.length) groups.push({ key: 'closed', label: 'Closed', count: closed.length });
    return { rows, of: r => (r.open ? b.byId[r.id] : 'closed'), groups };
  }
  renderVals() {
    const s = this.s; const me = this.me; const f = this.state.f;
    const all = D.disputesOf(s); const rows = this.rows();
    const clinical = D.canReadClinical(me);
    const bar = ui.filterBar({
      id: 'di-f', label: 'Search and status', search: { key: 'q', placeholder: 'Consumer, ID or payer', label: 'Search cases' },
      selects: [{ key: 'status', label: 'Status', options: D.STATUS_FILTERS }],
      state: f, onChange: next => this.setF(next), onClear: next => { ui.query.writeQuery({ from: '', to: '' }); this.setState({ f: { ...next, from: '', to: '' }, page: 1 }); }
    });
    const nMore = DRAWER_KEYS.filter(k => f[k]).length + (f.from || f.to ? 1 : 0);
    const filtersBtn = `<button type="button" class="ui-btn ui-btn--secondary d-qbar__b" id="di-filters-b" data-x="filters" aria-haspopup="dialog">Filters${nMore ? ` (${nMore})` : ''}</button>`;
    const gp = this.grouped(ui.sortRows(rows, this.state.sort, D.queueGetters));
    const pg = ui.pager.slice(gp.rows, { size: this.state.size, page: this.state.page });
    // the Suggestions of the rows on this page: clinicians only (the list is built from clinical records, which no other role receives)
    const counts = new Map(); if (clinical) for (const r of pg) if (r.open) { const recs = recsOf(s, r.request, me); counts.set(r.request, { ...countsOf(recs), inputs: packetLine(recs).inputs, lift: liftLine(recs) }); }
    const columns = [
      { key: 'case', label: 'Case', sort: true, primary: true, width: '16%', render: r => `<span class="d-caseid"><b>${esc(r.consumer)}</b><span class="ui-sub">${esc(r.id)} · ${esc(r.request)}</span>${this.signals(r).risk ? ui.moneyChip(this.signals(r).risk) : ''}</span>` },
      { key: 'payer', label: 'Payer', sort: true, width: '9%', render: r => esc(r.payerName) },
      { key: 'decision', label: 'Decision', sort: true, width: '19%', render: r => `<span class="d-dec"><b>${esc(r.decision.main)}</b><span class="ui-sub">${esc(r.decision.sub)}</span>${this.reasonLine(r)}${clinical ? this.sugCell(r, counts, true) : ''}</span>` },
      { key: 'status', label: 'Status', sort: true, width: '12%', render: r => ui.statusChip(r.status, { kind: 'dispute' }) },
      { key: 'next', label: 'Next step', sort: true, width: '13%', render: r => this.nextCell(r) },
      { key: 'deadline', label: 'Deadline', sort: true, width: '14%', className: 'd-c-dl', render: r => this.deadlineCell(r) },
      ...(clinical ? [{ key: 'sug', label: 'Suggestions', hideBelow: 768, width: '17%', render: r => this.sugCell(r, counts) }] : [])
    ];
    let table = ui.queueTable({
      id: 'di-q', caption: 'Denial cases', columns, rows: pg, href: r => '#/DenialCase?id=' + encodeURIComponent(r.request), sort: this.state.sort, onSort: sort => this.setState({ sort, page: 1 }),   // a long list scrolls inside the kit's bounded region (sticky header, pager in view: QA1-03); a short one is not boxed (the same rule as Authorizations)
      maxHeight: pg.length > 12 ? undefined : 'none', empty: { title: Object.values(f).some(v => v) ? 'Nothing matches' : 'No open denial cases', body: all.length ? 'Clear a filter, or open the Closed status to see resolved cases.' : 'A case opens by itself when a payer asks for information, offers fewer units or denies a request.' }
    });
    // the urgency headings are rows of the same table (th scope=colgroup); the pager counts cases, not headings
    if (gp.of) { let prev = null; for (const r of pg) { const k = gp.of(r); if (k === prev) continue; prev = k; const g = gp.groups.find(x => x.key === k); const at = `<tr data-ui-row data-row-id="${esc(r.id)}"`; if (g && table.includes(at)) table = table.replace(at, ui.bandRow({ label: g.label, count: g.count, cols: columns.length, key: k }) + at); } }
    const pager = ui.pager({ id: 'di-pg', total: rows.length, size: this.state.size, page: this.state.page, noun: 'denials', onChange: ({ size, page }) => this.setState({ size, page }) });
    const note = clinical ? '' : lockHint('Status view, no clinical text: administrators see status, units and deadlines, with dollars at risk and insights. Clinical text is for clinicians.', { label: 'Status view · no clinical text' });
    const help = ui.infoPopover({ label: 'About this table', title: 'Denial Intelligence', html: '<p>Every open case where a payer asked for information, offered fewer units or denied a request. Cases sit under an urgency heading; the highest financial risk comes first. Click a column to sort inside each group, or turn grouping off in Filters.</p><p>A warning icon beside a date means due soon or overdue; hover it for the reason. The small icon after a date shows where the number comes from (Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption) when you hover it.</p><p>Dollars at risk are the units not approved times a demo rate; hover the chip for the basis.</p>' + (clinical ? '<p>The Suggestions chip shows how many suggestions Psyflo has for the case and how many are high impact. It opens the list in a side drawer.</p>' : '') });
    const active = KEYS.filter(k => k !== 'from' && k !== 'to' && f[k]).length + (f.from || f.to ? 1 : 0);
    const clear = active ? `<div class="ui-fclear"><button type="button" class="ui-linkbtn" data-x="clear-all">Clear all filters (${active})</button></div>` : '';
    const actions = `<div class="d-hact"><button type="button" class="ui-btn ui-btn--secondary" id="di-insights-b" data-x="insights" aria-haspopup="dialog">Insights</button>${clinical ? `<button type="button" class="ui-btn ui-btn--primary" id="di-analyze-b" data-x="analyze" aria-haspopup="dialog">Analyze a denial</button>` : ''}</div>`;
    const pulse = this.state.pulseOff ? '' : ui.pulseStrip(payerPulse(s));
    const showLift = clinical && [...counts.values()].some(c => c.lift);
    return { mat: raw(ui.maturity('route.DenialIntelligence') + note), help: raw(help), actions: raw(actions), pulse: raw(pulse), bar: raw(bar + filtersBtn), clear: raw(clear), table: raw(table), pager: raw(pager), basis: raw(showLift ? ui.basisLine() : '') };
  }
  after(root) {
    root.querySelectorAll('[data-x="clear-all"]').forEach(b => { b.onclick = () => { ui.query.writeQuery(Object.fromEntries(KEYS.map(k => [k, '']).concat([['page', '']]))); this.setState({ f: Object.fromEntries(KEYS.map(k => [k, ''])), page: 1 }); }; });
    root.querySelectorAll('[data-x="filters"]').forEach(b => { b.onclick = () => this.openFilters(b); });
    root.querySelectorAll('[data-x="sug"]').forEach(b => { b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); openDenialRecs({ ref: b.dataset.request, me: this.me, el: b }); }; });
    root.querySelectorAll('[data-x="insights"]').forEach(b => { b.onclick = () => { ui.insightsDrawer({ s: () => api.state, scope: 'denial', returnFocus: b }); if (D.canReadClinical(this.me)) api.do('intel.event', { kind: 'insights', scope: 'denial' }).catch(() => null); }; });
    root.querySelectorAll('[data-x="analyze"]').forEach(b => { b.onclick = () => openIntake({ me: this.me, el: b }); });
    root.querySelectorAll('[data-pulse-see]').forEach(b => { b.id = b.id || 'di-pulse-see'; b.onclick = () => openPulse({ s: this.s, me: this.me, el: b }); });
    root.querySelectorAll('[data-pulse-x]').forEach(b => { b.onclick = () => { try { sessionStorage.setItem(PULSE_KEY, '1'); } catch { } this.setState({ pulseOff: true }); const t = document.getElementById('di-insights-b'); if (t) t.focus(); }; });
  }
});
