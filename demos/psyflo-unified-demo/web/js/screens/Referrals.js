// 6 · Referrals queue (E2). A view over Referral.stage: search, status chips, one table, the school counts behind a disclosure.
// Also exports the small referral selectors the other referral screens share (Referral, Eligibility, DoNext). Keep these exports.
import { register, Screen, M, raw, esc, ui, session } from '../app.js';

export const REF_STAGE_CHIP = {
  needs_screening: ['Needs screening call', 'y'], waiting_on_school: ['Waiting on the school', 'n'], screening_booked: ['Screening booked', 'g'],
  in_intake: ['In intake', 'g'], in_service: ['In service', 'g'], grant_program: ['Grant program', 'n'], declined: ['Declined', 'n'], draft: ['Draft (school)', 'n']
};
export const stageChip = r => r.hold ? ['On hold', 'r'] : (REF_STAGE_CHIP[r.stage] || [M.REF_STAGE[r.stage] || String(r.stage || '').replace(/_/g, ' '), 'n']);

// "T.W., 12" for client ids, the free text otherwise ("A.R., 9")
export const refStudent = (s, r) => M.byId(s.clients, r.client) ? M.clientLabel(s, r.client) : (r.client || r.form?.client || 'New student');
export const refShort = (s, r) => refStudent(s, r).split(',')[0];

// Where the student is in the request lifecycle, for referrals already in intake/service
export function refNext(s, r) {
  if (['in_intake', 'in_service'].includes(r.stage) && M.byId(s.clients, r.client)) {
    const q = s.requests.find(q => q.client === r.client && !['closed'].includes(q.stage));
    if (q) {
      const clock = M.requestClock(s, q).text;
      if (q.sent && ['submitted', 'overdue'].includes(q.stage)) return `Request sent ${M.fmtDate(q.sent)} · ${clock}`;
      return `${M.TYPE_LABEL[q.type] || 'Request'} · ${(M.STAGE_LABEL[q.stage] || q.stage).toLowerCase()}`;
    }
  }
  return r.next || '';
}

// started date for the median: the referral's own, or the client's service start
export function refStarted(s, r) {
  if (r.started) return r.started;
  if (r.stage === 'in_service') return M.byId(s.clients, r.client)?.service_start || null;
  return null;
}

const CHIPS = [
  { value: 'new', label: 'New', test: r => ['needs_screening', 'waiting_on_school'].includes(r.stage) },
  { value: 'booked', label: 'Screening booked', test: r => r.stage === 'screening_booked' },
  { value: 'intake', label: 'In intake', test: r => r.stage === 'in_intake' },
  { value: 'grant', label: 'Grant program', test: r => r.stage === 'grant_program' },
  { value: '', label: 'All this year', test: () => true }
];
const TONE = { y: 'warning', g: 'success', n: 'neutral', r: 'danger' };
export const refChip = r => { const [label, cls] = stageChip(r); return ui.chip(label, { tone: TONE[cls] || 'neutral' }); };
// eligibility at a glance for the queue (nothing invented: only what the records say)
export function refElig(s, r) {
  const el = M.eligibilityFor(s, r.id); const fl = M.familyLinkFor(s, r.id);
  if (el && el.status === 'recorded') return { text: el.result === 'active' ? 'Eligible' : 'Not active', tone: el.result === 'active' ? 'success' : 'danger' };
  if (el && el.status === 'details_received') return { text: 'Check required', tone: 'warning' };
  if (fl && fl.sent_at) return { text: 'Link sent', tone: 'neutral' };
  return null;
}
const hrefOf = r => `#/Referral?id=${encodeURIComponent(r.id)}`;

register('Referrals', class extends Screen {
  init() {
    const p = this.params || {}; const raw0 = p.status != null ? p.status : p.f != null ? p.f : 'new';
    const status = ['new', 'booked', 'intake', 'grant'].includes(raw0) ? raw0 : raw0 === 'all' ? '' : p.status != null || p.f != null ? '' : 'new';
    this.state = { f: { q: p.q || '', status, school: p.school || '' }, sort: { key: p.sort || 'received', dir: p.dir || 'desc' }, limit: 25 };
    if (p.f != null) ui.query.writeQuery({ f: '', status: status || 'all' });
  }
  get me() { return session.actor; }
  list() {
    const s = this.s; const year = s.today.slice(0, 4);
    return s.referrals.filter(r => r.stage !== 'draft' && String(r.received || '').slice(0, 4) === year).slice().sort((a, b) => (String(b.received) > String(a.received) ? 1 : String(b.received) < String(a.received) ? -1 : 0));
  }
  renderVals() {
    const s = this.s; const st = this.state; const f = st.f; const all = this.list();
    const hay = r => [r.id, refStudent(s, r), M.school(s, r.school).name, M.REF_STAGE[r.stage] || r.stage, r.next].join(' ').toLowerCase();
    const base = all.filter(r => (!f.q || hay(r).includes(f.q.toLowerCase())) && (!f.school || r.school === f.school));
    const chips = CHIPS.map(c => ({ key: 'status', value: c.value === '' ? 'all' : c.value, label: c.label, count: base.filter(c.test).length }));
    const cur = CHIPS.find(c => (c.value === '' ? 'all' : c.value) === (f.status || 'all')) || CHIPS[CHIPS.length - 1];
    const shown = base.filter(cur.test);
    const schools = [...new Set(all.map(r => r.school))].map(id => [id, M.school(s, id).name]);
    const bar = ui.filterBar({ id: 'ref-f', label: 'Referral filters', chipsLabel: 'Status', state: { ...f, status: f.status || 'all' }, search: { key: 'q', placeholder: 'Search referrals', label: 'Search referrals' }, chips,
      selects: [{ key: 'school', label: 'School', options: [['', 'All schools'], ...schools] }], shown: shown.length, total: all.length, noun: 'referrals',
      defaults: { status: 'all' }, onChange: n => this.setState({ f: { ...n, status: n.status === 'all' ? '' : n.status }, limit: 25 }), onClear: n => this.setState({ f: { q: '', status: '', school: '' }, limit: 25 }) });
    const rowsAll = shown.map(r => ({ r, id: r.id, student: refStudent(s, r), school: M.school(s, r.school).name, received: r.received, next: refNext(s, r), el: refElig(s, r), stage: r.stage }));
    const sorters = { received: x => String(x.received || ''), id: x => x.id, student: x => x.student, school: x => x.school, stage: x => x.stage };
    const rows = ui.sortRows(rowsAll, st.sort, sorters);
    const cols = [
      { key: 'id', label: 'Referral', sort: true, primary: true, width: '22%', render: x => `<b>${esc(x.student)}</b> <span class="a-id">${esc(x.id)}</span>` },
      { key: 'school', label: 'School', sort: true, hideBelow: 1024, render: x => esc(x.school) },
      { key: 'received', label: 'Received', sort: true, hideBelow: 1280, render: x => esc(M.fmtDate(x.received)) },
      { key: 'stage', label: 'Status', sort: true, render: x => `${refChip(x.r)}${x.el ? ` ${ui.chip(x.el.text, { tone: x.el.tone, size: 'sm' })}` : ''}` },
      { key: 'next', label: 'Next', render: x => esc(x.next || '—') },
      { key: 'act', label: 'Open', render: x => `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(hrefOf(x.r))}">${['in_service', 'grant_program', 'declined'].includes(x.stage) ? 'View' : 'Open'}<span class="ui-sr"> ${esc(x.id)}</span></a>` }
    ];
    const table = ui.queueTable({ id: 'refs', caption: 'Referrals', columns: cols, rows, rowId: x => x.id, href: x => hrefOf(x.r), sort: st.sort, onSort: sort => { this.setState({ sort }); ui.query.writeQuery({ sort: sort.key, dir: sort.dir }); }, limit: st.limit, limitStep: 25, onMore: () => this.setState({ limit: st.limit + 25 }), total: shown.length, maxHeight: 'none',
      empty: { title: 'Nothing in this list', body: 'Try another status or clear the search.' } });
    return { bar: raw(bar), table: raw(table), schools: raw(this.schoolTable(base)), maturity: raw(ui.maturity('route.Referrals')) };
  }
  // the per-school counts, computed from the list (kept, behind a disclosure; the long view is Analytics · Patient Population)
  schoolTable(list) {
    const s = this.s; const by = {};
    for (const r of list) {
      const t = by[r.school] || (by[r.school] = { id: r.school, referred: 0, started: 0, grant: 0, declined: 0, days: [] });
      t.referred++; const st = refStarted(s, r); if (st) { t.started++; t.days.push(M.daysBetween(String(r.received), st)); }
      if (r.stage === 'grant_program') t.grant++; if (r.stage === 'declined') t.declined++;
    }
    const all = Object.values(by).sort((a, b) => b.referred - a.referred || a.id.localeCompare(b.id));
    const median = d => { if (!d.length) return '—'; const x = d.slice().sort((a, b) => a - b); const m = Math.floor(x.length / 2); return String(x.length % 2 ? x[m] : Math.round((x[m - 1] + x[m]) / 2)); };
    const row = t => `<tr><th scope="row">${esc(M.school(s, t.id).name)}</th><td class="is-r">${t.referred}</td><td class="is-r">${t.started}</td><td class="is-r">${t.grant}</td><td class="is-r">${t.declined}</td><td class="is-r">${median(t.days)}</td></tr>`;
    return `<details class="a-card a-sec"><summary><span class="a-sec__t">From schools</span><span class="a-sec__s">${all.length} school${all.length === 1 ? '' : 's'} this year</span>${ui.icon('chevD', 16)}</summary><div class="a-sec__b"><table class="a-mini"><caption class="ui-sr">Referrals by school this year</caption><thead><tr><th scope="col">School</th><th scope="col" class="is-r">Referred</th><th scope="col" class="is-r">Started TDT</th><th scope="col" class="is-r">Grant</th><th scope="col" class="is-r">Declined</th><th scope="col" class="is-r">Median days to start</th></tr></thead><tbody>${all.map(row).join('')}</tbody></table></div></details>`;
  }
});
