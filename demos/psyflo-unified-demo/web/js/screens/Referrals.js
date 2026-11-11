// 6 · Referrals list (Live). A view over Referral.stage; the per-school table is counted from the list.
// Also exports the small referral selectors the other referral screens share (Referral, Eligibility, DoNext).
import { register, Screen, M, canSee } from '../app.js';

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
  { k: 'new', label: 'New', test: r => ['needs_screening', 'waiting_on_school'].includes(r.stage) },
  { k: 'booked', label: 'Screening booked', test: r => r.stage === 'screening_booked' },
  { k: 'intake', label: 'In intake', test: r => r.stage === 'in_intake' },
  { k: 'grant', label: 'Grant program', test: r => r.stage === 'grant_program' },
  { k: 'all', label: 'All this year', test: () => true }
];

register('Referrals', class extends Screen {
  init() { this.state = { f: this.params.f || 'new' }; }
  renderVals() {
    const s = this.s; const year = s.today.slice(0, 4);
    const list = s.referrals.filter(r => r.stage !== 'draft' && String(r.received || '').slice(0, 4) === year)
      .slice().sort((a, b) => (String(b.received) > String(a.received) ? 1 : String(b.received) < String(a.received) ? -1 : 0));
    const chips = CHIPS.map(c => ({ label: c.label, n: list.filter(c.test).length, on: this.state.f === c.k ? ' on' : '', pressed: String(this.state.f === c.k), pick: () => this.setState({ f: c.k }) }));
    const cur = CHIPS.find(c => c.k === this.state.f) || CHIPS[0];
    const rows = list.filter(cur.test).map(r => {
      const [stage, chip] = stageChip(r);
      const done = ['in_service', 'grant_program', 'declined'].includes(r.stage);
      return { id: r.id, student: refStudent(s, r), school: M.school(s, r.school).name, received: M.fmtDate(r.received), stage, chip, next: refNext(s, r), href: 'Referral.dc.html?id=' + r.id, btn: done ? 'View' : 'Open' };
    });
    // per-school table, counted from the list
    const by = {};
    for (const r of list) {
      const t = by[r.school] || (by[r.school] = { id: r.school, referred: 0, started: 0, grant: 0, declined: 0, days: [] });
      t.referred++;
      const st = refStarted(s, r);
      if (st) { t.started++; t.days.push(M.daysBetween(String(r.received), st)); }
      if (r.stage === 'grant_program') t.grant++;
      if (r.stage === 'declined') t.declined++;
    }
    const all = Object.values(by).sort((a, b) => b.referred - a.referred || a.id.localeCompare(b.id));
    const median = d => { if (!d.length) return '—'; const x = d.slice().sort((a, b) => a - b); const m = Math.floor(x.length / 2); return String(x.length % 2 ? x[m] : Math.round((x[m - 1] + x[m]) / 2)); };
    const top = all.slice(0, 3).map(t => ({ ...t, name: M.school(s, t.id).name, median: median(t.days) }));
    const rest = all.slice(3);
    if (rest.length) {
      const o = rest.reduce((a, t) => ({ referred: a.referred + t.referred, started: a.started + t.started, grant: a.grant + t.grant, declined: a.declined + t.declined, days: a.days.concat(t.days) }), { referred: 0, started: 0, grant: 0, declined: 0, days: [] });
      top.push({ ...o, name: rest.length === 1 ? M.school(s, rest[0].id).name : `Other (${rest.length} schools)`, median: median(o.days) });
    }
    return { chips, rows, empty: rows.length ? '' : 'Nothing in this list right now.', schools: top };
  }
});
