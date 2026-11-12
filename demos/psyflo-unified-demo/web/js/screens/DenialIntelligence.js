// Denial Intelligence · the queue of cases that need a payer-decision response (E3, rebuilt in the artifact's layout for R3, formatted like Authorizations for R4:
// ui.dateCard, the shared page, filter grid, table and cells; the source and the lock are icons with a hover definition): a "Decision date" card,
// one filter card (search, status, decision type, payer, service, assigned clinician, deadline, next step), one table (Denial · Consumer · Payer ·
// Service · Decision · Status · Next step · Deadline · Owner) and the pager at the bottom (10, 25, 50, 100). No "N of M" at the top, no KPI cards:
// aggregates belong to Analytics. Every deadline carries its source chip.
// Deep links: #/DenialIntelligence?status=&decision=partial|denied|info&payer=&service=&owner=&deadline=&next=&q=&from=&to=&size=&page=
import { register, Screen, raw, ui, M, hrefFor } from '../app.js';
import { deadlineCell, ownerCell, lockHint, svcShort } from './a-fmt.js';
import { hoursBetween } from '../shared/dates.js';
import * as D from '../shared/sel/disputes.js';

const KEYS = ['q', 'decision', 'status', 'payer', 'service', 'owner', 'deadline', 'next', 'from', 'to'];
const esc = ui.esc;

register('DenialIntelligence', class extends Screen {
  init() {
    const f = {}; for (const k of KEYS) f[k] = this.params[k] != null ? String(this.params[k]) : '';
    this.state = { f, sort: { key: 'deadline', dir: 'asc' }, ...ui.pager.fromQuery(this.params) };
  }
  rows() { return D.queueRows(this.s, this.state.f); }
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
    return deadlineCell({ date: dl.date ? String(dl.date).slice(0, 10) : '', sev: dl.sev, why: [dl.label, rel].filter(Boolean).join(' · '), text: dl.date ? (hourly ? M.fmtDateTime(dl.date) : M.fmtDate(dl.date)) : 'No date' }, dl);
  }
  nextCell(r) { return `<span class="d-nx">${esc(r.next.label)}</span>`; }
  setF(patch) { this.setState({ f: { ...this.state.f, ...patch }, page: 1 }); }
  // the Decision date card (ui.dateCard, the same card as Authorizations): two dates and three quick ranges
  dateCard() {
    const f = this.state.f; const today = M.today(this.s); const wk = D.weekBounds(today);
    const quick = [['Today', today, today], ['This week', wk.from, wk.to], ['Before this week', '', M.addDays(wk.from, -1)]];
    return ui.dateCard({ id: 'di-dc', title: 'Decision date', from: f.from, to: f.to, hint: 'The dates match the day the payer decided or asked.',
      chips: quick.map(([label, a, b]) => ({ key: label, label, from: a, to: b, on: f.from === a && f.to === b })),
      onChange: c => { ui.query.writeQuery({ from: c.from, to: c.to }); this.setF({ from: c.from, to: c.to }); } });
  }
  renderVals() {
    const s = this.s; const me = this.me; const f = this.state.f;
    const all = D.disputesOf(s); const rows = this.rows();
    const uniq = arr => [...new Set(arr)];
    const payers = uniq(all.map(d => d.payer)).map(id => [id, D.payerFirst(s, id)]);
    const owners = uniq(all.map(d => d.owner).filter(Boolean)).map(id => [id, D.ownerName(s, id)]);
    const services = uniq(D.queueRows(s, { status: 'all' }).map(r => r.service)).map(x => [x, x]);
    const bar = ui.filterBar({
      id: 'di-f', label: 'Denial filters', search: { key: 'q', placeholder: 'Consumer, ID or payer', label: 'Search cases' },
      selects: [{ key: 'status', label: 'Status', options: D.STATUS_FILTERS }, { key: 'decision', label: 'Decision type', options: [['', 'All types'], ['partial', 'Partial approval'], ['info', 'Information requested'], ['denied', 'Denied']] },
        { key: 'payer', label: 'Payer', options: [['', 'All payers'], ...payers] }, { key: 'service', label: 'Service', options: [['', 'All services'], ...services] }, { key: 'owner', label: 'Assigned clinician', options: [['', 'All clinicians'], ...owners] },
        { key: 'deadline', label: 'Deadline', options: [['', 'Any deadline'], ['overdue', 'Overdue'], ['7', 'Within 7 days'], ['none', 'No date set']] }, { key: 'next', label: 'Next step', options: [['', 'Any next step'], ...D.NEXT_GROUPS] }],
      state: f, onChange: next => this.setF(next), onClear: next => { ui.query.writeQuery({ from: '', to: '' }); this.setState({ f: { ...next, from: '', to: '' }, page: 1 }); }
    });
    const columns = [
      { key: 'case', label: 'Denial', sort: true, primary: true, width: '10%', render: r => `<span class="d-caseid"><b>${esc(r.id)}</b><span class="ui-sub">${esc(r.request)}</span></span>` },
      { key: 'consumer', label: 'Consumer', sort: true, width: '8%', render: r => `<span class="d-who">${esc(r.consumer)}</span>` },
      { key: 'payer', label: 'Payer', sort: true, width: '10%', render: r => esc(r.payerName) },
      { key: 'service', label: 'Service', sort: true, hideBelow: 1280, width: '7%', render: r => esc(svcShort(r.service)) },
      { key: 'decision', label: 'Decision', sort: true, width: '14%', render: r => `<span class="d-dec"><b>${esc(r.decision.main)}</b><span class="ui-sub">${esc(r.decision.sub)}</span></span>` },
      { key: 'status', label: 'Status', sort: true, width: '14%', render: r => ui.statusChip(r.status, { kind: 'dispute' }) },
      { key: 'next', label: 'Next step', sort: true, width: '14%', render: r => this.nextCell(r) },
      { key: 'deadline', label: 'Deadline', sort: true, width: '15%', className: 'd-c-dl', render: r => this.deadlineCell(r) },
      { key: 'owner', label: 'Owner', sort: true, hideBelow: 1280, width: '9%', render: r => ownerCell(r.ownerShort, r.backupName) }
    ];
    const sorted = ui.sortRows(rows, this.state.sort, D.queueGetters);
    const pg = ui.pager.slice(sorted, { size: this.state.size, page: this.state.page });
    const table = ui.queueTable({
      id: 'di-q', caption: 'Denial cases', columns, rows: pg, href: r => '#/DenialCase?id=' + encodeURIComponent(r.request), sort: this.state.sort, onSort: sort => this.setState({ sort, page: 1 }),   // a long list scrolls inside the kit's bounded region (sticky header, pager in view: QA1-03); a short one is not boxed (the same rule as Authorizations)
      maxHeight: pg.length > 12 ? undefined : 'none', empty: { title: Object.values(f).some(v => v) ? 'Nothing matches' : 'No open denial cases', body: all.length ? 'Clear a filter, or open the Closed status to see resolved cases.' : 'A case opens by itself when a payer asks for information, offers fewer units or denies a request.' }
    });
    const pager = ui.pager({ id: 'di-pg', total: rows.length, size: this.state.size, page: this.state.page, noun: 'denials', onChange: ({ size, page }) => this.setState({ size, page }) });
    const clinical = D.canReadClinical(me);
    const note = clinical ? '' : lockHint('Status view, no clinical text: administrators see status, units and deadlines. Clinical text is for clinicians.', { label: 'Status view · no clinical text' });
    const help = ui.infoPopover({ label: 'About this table', title: 'Denial Intelligence', html: '<p>Every open case where a payer asked for information, offered fewer units or denied a request, sorted by what is most urgent. Click a column to sort.</p><p>A warning icon beside a date means due soon or overdue; hover it for the reason. The small icon after a date shows where the number comes from (Officially verified, Payer-specific, Harvest-reported or Unverified demo assumption) when you hover it.</p>' });
    const active = ['q', 'decision', 'status', 'payer', 'service', 'owner', 'deadline', 'next'].filter(k => f[k]).length + (f.from || f.to ? 1 : 0);
    const clear = active ? `<div class="ui-fclear"><button type="button" class="ui-linkbtn" data-x="clear-all">Clear all filters (${active})</button></div>` : '';
    return { mat: raw(ui.maturity('route.DenialIntelligence') + note), help: raw(help), date: raw(this.dateCard()), bar: raw(bar), clear: raw(clear), table: raw(table), pager: raw(pager) };
  }
  after(root) {
    root.querySelectorAll('[data-x="clear-all"]').forEach(b => { b.onclick = () => { ui.query.writeQuery(Object.fromEntries(KEYS.map(k => [k, '']).concat([['page', '']]))); this.setState({ f: Object.fromEntries(KEYS.map(k => [k, ''])), page: 1 }); }; });
  }
});
