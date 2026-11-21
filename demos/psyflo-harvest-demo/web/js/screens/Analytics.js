// Analytics (screen 42). Two blocks only. KPIs: Timely notes and Minutes per note (Harvest's two pilot measures) as large numbers with a
// weekly line, plus Backlog. Outcomes: one student over time with a trend chip per row.
// Live: Backlog and this week's Timely point are counted from the notes the panel reported (the same count as Documentation).
// Seeded: the earlier weeks, Minutes per note (state.kpi_series, seed/extra/23-b3.json) and M.R.'s quarter (client.quarter); both blocks carry `Sample data`.
import { register, Screen, M, raw, esc, helpIcon } from '../app.js';
import { VIEWS, METRIC, FILTER, PAGE_TITLE } from '../shared/labels.js';
import { noteTimeliness } from './StaffDashboard.js';

const LOCALITY = { cc: 'Campbell County', lc: 'Lynchburg City' };
const localityOf = st => [].concat(st.sites || []).map(id => String(id).slice(0, 2).toLowerCase());

// a weekly line: grey, the current week in teal; each week answers to hover and keyboard through its title
export function sparkline(vals, labels, fmt, about) {
  const W = 400, H = 52, P = 6, min = Math.min(...vals), max = Math.max(...vals);
  const x = i => P + i * (W - 2 * P) / Math.max(1, vals.length - 1);
  const y = v => H - P - (max === min ? 0.5 : (v - min) / (max - min)) * (H - 2 * P);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const hits = vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="9" fill="transparent"><title>Week of ${esc(labels[i])}: ${esc(fmt(v))}</title></circle>`).join('');
  const last = vals.length - 1;
  return raw(`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(about)}, weekly" preserveAspectRatio="xMinYMid meet" style="display:block;height:auto;overflow:visible">
    <polyline points="${pts}" fill="none" stroke="var(--ink-4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <circle cx="${x(last).toFixed(1)}" cy="${y(vals[last]).toFixed(1)}" r="5" fill="var(--teal)" stroke="var(--white)" stroke-width="2"></circle>${hits}</svg>`);
}

// lower is better for symptom scores and referrals; higher is better for the daily rating
export function trend(vals, higherBetter) {
  const a = vals[0], c = vals[vals.length - 1];
  const gain = higherBetter ? (c - a) / a : (a - c) / a;
  if (gain >= 0.2) return { word: 'Improving', chip: 'ok' };
  if (gain > 0) return { word: 'Slower', chip: 'watch' };
  return gain === 0 ? { word: 'Flat', chip: 'info' } : { word: 'Worse', chip: 'late' };
}

register('Analytics', class extends Screen {
  init() { this.state = { loc: 'all' }; }
  renderVals() {
    const s = this.s, loc = this.state.loc, ks = s.kpi_series || {};
    const set = ks[loc] || ks.all || { timely: [], minutes: [] };
    const weeks = (ks.weeks || []).map(d => M.fmtDate(d));
    // live part: the staff in this locality
    const staff = s.staff.filter(x => x.role === 'direct_support' && (loc === 'all' || localityOf(x).includes(loc)));
    let on = 0, counted = 0, backlog = 0;
    for (const st of staff) { const t = noteTimeliness(s, st.id); on += t.onTime; counted += t.counted; backlog += t.behind.length; }
    const timely = (set.timely || []).slice(); if (counted) timely[timely.length - 1] = Math.round(100 * on / counted);
    const minutes = (set.minutes || []).slice();
    const tl = timely.length, ml = minutes.length;
    // outcomes: one student over time
    const mr = M.byId(s.clients, 'MR'); const q = (mr && mr.quarter) || {};
    const defs = [['PHQ-A', q.phq_a, false], ['DSM cross-cutting', q.dsm_parent, false], ['Daily rating', q.daily_rating, true], ['Office referrals per month', q.office_referrals_per_month, false]].filter(d => Array.isArray(d[1]));
    const outcomes = defs.map(([name, v, hb]) => { const t = trend(v, hb); return { name, a: v[0], b: v[Math.floor(v.length / 2)], c: v[v.length - 1], word: t.word, chip: t.chip }; });
    return {
      title: PAGE_TITLE.Analytics, today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      kpis: VIEWS.analytics.kpis, outcomesTitle: VIEWS.analytics.outcomes, student: mr ? M.clientLabel(s, 'MR') : '',
      sites: [{ id: 'all', name: FILTER.site }, ...Object.entries(LOCALITY).map(([id, name]) => ({ id, name }))].map(o => ({ ...o, sel: o.id === loc ? 'selected' : '' })),
      pickSite: e => this.setState({ loc: e.target.value }),
      timelyLabel: METRIC.timelyNotes, timelyValue: tl ? timely[tl - 1] + '%' : '—', timelyLine: tl ? sparkline(timely, weeks, v => v + '%', METRIC.timelyNotes) : '',
      minutesLabel: METRIC.minutesPerNote, minutesValue: ml ? minutes[ml - 1].toFixed(1) : '—', minutesLine: ml ? sparkline(minutes, weeks, v => v.toFixed(1) + ' min', METRIC.minutesPerNote) : '',
      backlogLabel: METRIC.backlog, backlog, backlogLate: backlog > 0,
      outcomes, noOutcomes: !outcomes.length
    };
  }
});
