// Denial Intelligence · the queue of cases that need a payer-decision response (E3, rebuilt in the artifact's layout for R3): a "Decision date" card,
// one filter card (search, status, decision type, payer, service, assigned clinician, deadline, next step), one table (Denial · Consumer · Payer ·
// Service · Decision · Status · Next step · Deadline · Owner) and the pager at the bottom (10, 25, 50, 100). No "N of M" at the top, no KPI cards:
// aggregates belong to Analytics. Every deadline carries its source chip.
// Deep links: #/DenialIntelligence?status=&decision=partial|denied|info&payer=&service=&owner=&deadline=&next=&q=&from=&to=&size=&page=
import { register, Screen, raw, ui, M, hrefFor } from '../app.js';
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
    const tone = dl.sev === 'overdue' ? 'danger' : dl.sev === 'soon' ? 'warning' : 'neutral';
    return `<div class="d-dl"><span class="d-dl__row">${rel ? ui.chip(rel, { tone, icon: dl.sev === 'overdue' ? 'alert' : dl.sev === 'soon' ? 'clock' : null, size: 'sm' }) : '<span class="ui-muted">No date</span>'}</span>${ui.sourceChip(dl)}</div>`;
  }
  nextCell(r) {
    const dl = r.open ? r.deadline : null;
    const sub = dl ? `${dl.label}${dl.date ? ' ' + (String(dl.date).includes('T') ? M.fmtDateTime(dl.date) : M.fmtDate(dl.date)) : ''}` : '';
    return `<span class="d-nx">${esc(r.next.label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
  }
  setF(patch) { this.setState({ f: { ...this.state.f, ...patch }, page: 1 }); }
  // the Decision date card: two dates and three quick ranges
  dateCard() {
    const f = this.state.f; const today = M.today(this.s); const wk = D.weekBounds(today);
    const on = (a, b) => f.from === a && f.to === b;
    const quick = [['Today', today, today], ['This week', wk.from, wk.to], ['Before this week', '', M.addDays(wk.from, -1)]];
    return `<section class="d-datec" aria-labelledby="d-dc-h"><div class="d-datec__h"><h2 id="d-dc-h">Decision date</h2><span class="d-sm ui-muted">${f.from || f.to ? `${f.from ? esc(M.fmtDate(f.from)) : 'Any'} – ${f.to ? esc(M.fmtDate(f.to)) : 'any'}` : 'Any dates'}</span></div>
      <div class="d-datec__f"><label>Start date<input class="ui-input" type="date" id="d-from" value="${esc(f.from)}"></label><span aria-hidden="true">→</span><label>End date<input class="ui-input" type="date" id="d-to" value="${esc(f.to)}"></label></div>
      <div class="d-datec__q">${quick.map(([l, a, b]) => `<button type="button" class="ui-fchip" data-d-range data-from="${esc(a)}" data-to="${esc(b)}" aria-pressed="${on(a, b)}"><span>${esc(l)}</span></button>`).join('')}</div></section>`;
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
      { key: 'case', label: 'Denial', sort: true, primary: true, render: r => `<span class="d-caseid"><b>${esc(r.id)}</b><small>${esc(r.request)}</small></span>` },
      { key: 'consumer', label: 'Consumer', sort: true, render: r => `<span class="d-who">${esc(r.consumer)}</span>` },
      { key: 'payer', label: 'Payer', sort: true, render: r => esc(r.payerName) },
      { key: 'service', label: 'Service', sort: true, hideBelow: 1280, render: r => ui.chip(r.service, { tone: 'neutral', size: 'sm' }) },
      { key: 'decision', label: 'Decision', sort: true, render: r => `<span class="d-dec"><b>${esc(r.decision.main)}</b><small>${esc(r.decision.sub)}</small></span>` },
      { key: 'status', label: 'Status', sort: true, render: r => ui.statusChip(r.status, { kind: 'dispute' }) },
      { key: 'next', label: 'Next step', sort: true, render: r => this.nextCell(r) },
      { key: 'deadline', label: 'Deadline', sort: true, render: r => this.deadlineCell(r) },
      { key: 'owner', label: 'Owner', sort: true, hideBelow: 1280, render: r => `<span class="d-own">${ui.chip(r.ownerShort, { tone: 'neutral', size: 'sm' })}</span>` }
    ];
    const sorted = ui.sortRows(rows, this.state.sort, D.queueGetters);
    const pg = ui.pager.slice(sorted, { size: this.state.size, page: this.state.page });
    const table = ui.queueTable({
      id: 'di-q', caption: 'Denial cases', columns, rows: pg, href: r => '#/DenialCase?id=' + encodeURIComponent(r.request), sort: this.state.sort, onSort: sort => this.setState({ sort, page: 1 }),   // the kit's bounded scroll region stays: the header is sticky on a long page and the pager below it stays in view (QA1-03)
      empty: { title: Object.values(f).some(v => v) ? 'Nothing matches' : 'No open denial cases', body: all.length ? 'Change a filter, or open the Closed status to see resolved cases.' : 'A case opens by itself when a payer asks for information, offers fewer units or denies a request.' }
    });
    const pager = ui.pager({ id: 'di-pg', total: rows.length, size: this.state.size, page: this.state.page, noun: 'denials', onChange: ({ size, page }) => this.setState({ size, page }) });
    const clinical = D.canReadClinical(me);
    const note = clinical ? '' : ui.chip('Status view · no clinical text', { tone: 'info', icon: 'lock', title: 'Administrators see status, units and deadlines. Clinical text is for clinicians.' });
    return { mat: raw(ui.maturity('route.DenialIntelligence') + note), date: raw(this.dateCard()), bar: raw(bar), table: raw(table), pager: raw(pager) };
  }
  after(root) {
    const commit = patch => { ui.query.writeQuery({ from: patch.from ?? this.state.f.from, to: patch.to ?? this.state.f.to }); this.setF(patch); };
    const from = root.querySelector('#d-from'), to = root.querySelector('#d-to');
    if (from) from.onchange = () => commit({ from: from.value });
    if (to) to.onchange = () => commit({ to: to.value });
    root.querySelectorAll('[data-d-range]').forEach(b => { b.onclick = () => { const same = this.state.f.from === b.dataset.from && this.state.f.to === b.dataset.to; commit(same ? { from: '', to: '' } : { from: b.dataset.from, to: b.dataset.to }); }; });
  }
});
