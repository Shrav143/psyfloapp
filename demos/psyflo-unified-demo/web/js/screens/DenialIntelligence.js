// Denial Intelligence · the queue of cases that need a payer-decision response (E3). One focused table: Case · Consumer · Payer · Service ·
// Decision · Status · Next action · Deadline (with its source chip) · Owner. No KPI cards: aggregates belong to Analytics.
// Deep links: #/DenialIntelligence?status=&decision=partial|denied|info&payer=&owner=&deadline=&next=&q=
import { register, Screen, raw, ui, M, hrefFor } from '../app.js';
import { hoursBetween } from '../shared/dates.js';
import * as D from '../shared/sel/disputes.js';

const KEYS = ['q', 'decision', 'status', 'payer', 'owner', 'deadline', 'next'];
const esc = ui.esc;

register('DenialIntelligence', class extends Screen {
  init() {
    const f = {}; for (const k of KEYS) f[k] = this.params[k] != null ? String(this.params[k]) : '';
    this.state = { f, sort: { key: 'deadline', dir: 'asc' }, limit: 25 };
  }
  rows() { return D.queueRows(this.s, this.state.f); }
  deadlineCell(r) {
    if (!r.open) return `<span class="ui-muted">Closed ${esc(M.fmtDate(r.closed))}</span>`;
    const dl = r.deadline; if (!dl) return '<span class="ui-muted">—</span>';
    const hourly = dl.date && String(dl.date).includes('T');
    const when = dl.date ? (hourly ? M.fmtDateTime(dl.date) : M.fmtDate(dl.date)) : dl.label;
    let rel = '';
    if (dl.date) {
      const h = hourly ? Math.round(hoursBetween(M.now(this.s), dl.date)) : null;
      if (hourly && Math.abs(h) < 72) rel = h < 0 ? `${-h} h late` : `${h} h left`;
      else rel = dl.days < 0 ? `${-dl.days} d late` : dl.days === 0 ? 'Today' : `${dl.days} d`;
    }
    const tone = dl.sev === 'overdue' ? 'danger' : dl.sev === 'soon' ? 'warning' : 'neutral';
    return `<div class="d-dl"><span class="d-dl__row"><span class="d-dl__d">${esc(when)}</span>${rel ? ui.chip(rel, { tone, icon: dl.sev === 'overdue' ? 'alert' : dl.sev === 'soon' ? 'clock' : null, size: 'sm' }) : ''}</span>${ui.sourceChip(dl)}</div>`;
  }
  renderVals() {
    const s = this.s; const me = this.me; const f = this.state.f;
    const all = D.disputesOf(s); const rows = this.rows();
    const openAll = D.queueRows(s, {});
    const count = k => openAll.filter(r => r.type === k).length;
    const uniq = (arr) => [...new Set(arr)];
    const payers = uniq(all.map(d => d.payer)).map(id => [id, D.payerFirst(s, id)]);
    const owners = uniq(all.map(d => d.owner).filter(Boolean)).map(id => [id, D.ownerName(s, id)]);
    const chips = [{ key: 'decision', value: 'partial', label: 'Partial', count: count('partial') }, { key: 'decision', value: 'info', label: 'Info requested', count: count('info') }, { key: 'decision', value: 'denied', label: 'Denied', count: count('denied') }];
    const bar = ui.filterBar({
      id: 'di-f', label: 'Denial filters', chipsLabel: 'Decision', search: { key: 'q', placeholder: 'Consumer, case or payer', label: 'Search cases' }, chips,
      selects: [{ key: 'status', label: 'Status', options: D.STATUS_FILTERS }, { key: 'payer', label: 'Payer', options: [['', 'All payers'], ...payers] }, { key: 'owner', label: 'Owner', options: [['', 'All owners'], ...owners] }],
      more: [{ key: 'deadline', label: 'Deadline', options: [['', 'Any'], ['overdue', 'Overdue'], ['7', 'Within 7 days'], ['none', 'No date set']] }, { key: 'next', label: 'Next action', options: [['', 'Any'], ...D.NEXT_GROUPS] }],
      state: f, shown: rows.length, total: all.length, noun: 'cases',
      onChange: next => this.setState({ f: next, limit: 25 }), onClear: next => this.setState({ f: next, limit: 25 })
    });
    const columns = [
      { key: 'case', label: 'Case', sort: true, primary: true, render: r => `<span class="d-caseid"><b>${esc(r.request)}</b><small>${esc(r.id)}</small></span>` },
      { key: 'consumer', label: 'Consumer', sort: true, render: r => `<span class="d-who">${esc(r.consumer)}</span>` },
      { key: 'payer', label: 'Payer', sort: true, render: r => esc(r.payerName) },
      { key: 'service', label: 'Service', sort: true, hideBelow: 1280, render: r => esc(r.service) },
      { key: 'decision', label: 'Decision', sort: true, render: r => `<span class="d-dec"><b>${esc(r.decision.main)}</b><small>${esc(r.decision.sub)}</small></span>` },
      { key: 'status', label: 'Status', sort: true, render: r => ui.statusChip(r.status, { kind: 'dispute' }) },
      { key: 'next', label: 'Next action', sort: true, render: r => `<span class="d-nx">${esc(r.next.label)}</span>` },
      { key: 'deadline', label: 'Deadline', sort: true, render: r => this.deadlineCell(r) },
      { key: 'owner', label: 'Owner', sort: true, hideBelow: 1280, render: r => `<span class="d-own">${esc(r.ownerShort)}</span>` }
    ];
    const sorted = ui.sortRows(rows, this.state.sort, D.queueGetters);
    const table = ui.queueTable({
      id: 'di-q', caption: 'Denial cases', columns, rows: sorted, href: r => '#/DenialCase?id=' + encodeURIComponent(r.request), sort: this.state.sort, onSort: sort => this.setState({ sort }),
      limit: this.state.limit, total: rows.length, onMore: () => this.setState({ limit: this.state.limit + 25 }),   // bounded scroll region (the kit default) so the header stays sticky on a long queue (QA1-03)
      empty: { title: (f.status || '') === '' ? 'No open denial cases' : 'Nothing matches', body: all.length ? 'Change a filter, or open the Closed status to see resolved cases.' : 'A case opens by itself when a payer asks for information, offers fewer units or denies a request.' }
    });
    const clinical = D.canReadClinical(me);
    const right = (clinical ? '' : ui.chip('Status view · no clinical text', { tone: 'info', icon: 'lock', title: 'Administrators see status, units and deadlines. Clinical text is for clinicians.' })) + `<a class="ui-btn ui-btn--secondary" href="${esc(hrefFor('Authorizations.dc.html'))}">Authorizations</a>`;
    return { mat: raw(ui.maturity('route.DenialIntelligence')), right: raw(right), bar: raw(bar), table: raw(table) };
  }
});
