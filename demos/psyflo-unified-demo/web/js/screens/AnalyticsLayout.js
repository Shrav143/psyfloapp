// Analytics page layouts, one per section, in the artifact's order. Each layout names panels by id; a panel that no layout names is still
// printed (as a table card) under "More figures", so nothing the exports carry is ever missing from the screen. Browser only.
import { esc } from '../runtime.js';
import { ui } from '../ui/index.js';
import { PROV } from '../shared/analytics/common.js';
import * as Z from './AnalyticsViz.js';

const row2 = (...cards) => `<div class="an-row">${cards.filter(Boolean).join('')}</div>`;
const sec = (title, sub) => `<h2 class="an-sech">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2>`;
const must = (P, id, fn) => (P[id] ? fn(P[id]) : '');

// the geography card: counties and cities on top, then each school or site
function geography(P, o) {
  const a = P['pop.locality'], b = P['pop.sites']; if (!a && !b) return '';
  const rows = [...(a ? a.rows : []), ...(b ? b.rows.map(r => ({ ...r, label: r.label })) : [])];
  return Z.hbars({ ...(b || a), id: 'pop.geo', title: 'Geographic distribution', definition: [a && a.definition, b && b.definition].filter(Boolean).join(' '), rows, total: (b || a).total, note: '' }, o, { sub: 'by county and school' });
}
const unitsTiles = (p, o) => Z.tiles({ ...p, title: 'Units and service impact', rows: (p.rows || []).map(r => ({ label: r.label, value: r.v })) }, o);

const LAY = {
  outcomes: (P, o, st) => [
    Z.kpis(P['out.kpi'], o),
    Z.trend(P, o, st.om),
    row2(must(P, 'out.feedback', p => Z.feedback(p, o)), must(P, 'out.complete', p => Z.tiles({ ...p, title: 'Data completeness', rows: p.rows }, o, { completeness: true, title: 'Data completeness' }))),
    Z.timeline(o),
    must(P, 'out.review', p => Z.review(p, o)),
    row2(must(P, 'out.assess', p => Z.tableCard(p, o, { title: 'Assessment trends by scale' })), must(P, 'out.goals', p => Z.tableCard(p, o, { title: 'Goals and progress' })))
  ],
  payer: (P, o, st) => [
    Z.kpis(P['pay.kpi'], o),
    must(P, 'pay.by_payer', p => Z.tableCard({ ...p, wide: true }, o, { title: 'Payer comparison', cls: 'an-card--wide' })),
    row2(must(P, 'pay.trend', p => payTrend(p, o, st.pm)), must(P, 'pay.upcoming', p => Z.tableCard(p, o))),
    row2(must(P, 'pay.reasons', p => Z.hbars(p, o, { title: 'Top denial reasons' })), must(P, 'pay.docdef', p => Z.hbars(p, o, { title: 'Documentation deficiencies' }))),
    row2(must(P, 'pay.denial_by_payer', p => Z.tableCard(p, o)), must(P, 'pay.service', p => Z.hbars(p, o, { key: 'share', sub: r => `n = ${r.decided && r.decided.suppressed ? 'fewer than 5' : r.decided}` }))),
    row2(must(P, 'pay.appeals', p => Z.tiles({ ...p, rows: p.rows.map(r => ({ label: r.label, value: r.n })) }, o)), must(P, 'pay.units', p => unitsTiles(p, o))),
    must(P, 'pay.insights', p => Z.insights(p, o))
  ],
  population: (P, o) => [
    must(P, 'pop.kpi', p => Z.tiles({ ...p, rows: p.rows }, o, { title: 'Population summary', cls: 'an-card--wide' })),
    sec('Patient Demographics'),
    row2(must(P, 'pop.age', p => Z.hbars(p, o, { title: 'Age distribution' })), geography(P, o)),
    row2(must(P, 'pop.payer', p => Z.hbars(p, o, { title: 'Insurance coverage', sub: 'by payer' })), must(P, 'pop.referral', p => Z.hbars(p, o, { title: 'Referral sources', sub: 'ranked' }))),
    row2(must(P, 'pop.enrollment', p => Z.hbars(p, o, { title: 'Enrollment', sub: 'by status' }))),
    sec('Diagnosis & Clinical Needs'),
    row2(must(P, 'pop.dx', p => Z.hbars(p, o, { title: 'Most common primary diagnoses', pct: true })), must(P, 'pop.cooc', p => Z.hbars(p, o, { title: 'Co-occurring diagnoses', pct: true }))),
    sec('Service Utilization'),
    row2(must(P, 'pop.util', p => Z.tableCard(p, o)), must(P, 'pop.service', p => Z.hbars(p, o, { title: 'Service types' }))),
    must(P, 'pop.flow', p => Z.vcols(p, o, { title: 'Admissions and discharges', sub: 'last six months', cls: 'an-card--wide' })),
    sec('Intervention Utilization'),
    must(P, 'pop.ivs', p => Z.tableCard(p, o, { title: 'Most frequently documented interventions', cls: 'an-card--wide' })),
    sec('Treatment Goals & Needs'),
    must(P, 'pop.goals', p => Z.hbars(p, o, { title: 'Treatment goals', cls: 'an-card--wide' }))
  ]
};
const NAMED = { outcomes: ['out.kpi', 'out.trend', 'out.func', 'out.feedback', 'out.complete', 'out.review', 'out.assess', 'out.goals'], payer: ['pay.kpi', 'pay.by_payer', 'pay.trend', 'pay.upcoming', 'pay.reasons', 'pay.docdef', 'pay.denial_by_payer', 'pay.service', 'pay.appeals', 'pay.units', 'pay.insights'],
  population: ['pop.kpi', 'pop.age', 'pop.sites', 'pop.locality', 'pop.payer', 'pop.referral', 'pop.enrollment', 'pop.dx', 'pop.cooc', 'pop.util', 'pop.service', 'pop.flow', 'pop.ivs', 'pop.goals'] };

// authorization trends: metric chips switch between volume, outcome and units
function payTrend(p, o, pm) {
  const M = { volume: ['requests'], outcome: ['approved', 'notFull'], units: ['reqU', 'apprU'] }; const cur = M[pm] ? pm : 'volume';
  const chip = (v, l) => `<button type="button" class="an-chip" data-x="pm" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`;
  const chips = `<div class="an-chips" role="group" aria-label="Measure shown">${chip('volume', 'Authorization volume')}${chip('outcome', 'Approved in full, or not')}${chip('units', 'Requested vs approved units')}</div>`;
  return Z.vcols(p, o, { keys: M[cur], chips, title: 'Authorization trends', sub: 'requests by month sent' });
}

// -> html of the section body. P: id -> panel
export function layout(section, panels, o, st) {
  const P = Object.fromEntries((panels || []).map(p => [p.id, p])); const named = new Set(NAMED[section] || []);
  const main = (LAY[section] || (() => []))(P, o, st).join('');
  const rest = (panels || []).filter(p => !named.has(p.id));
  const more = rest.length ? sec('More figures', 'also in the export') + `<div class="an-row">${rest.map(p => Z.tableCard(p, o)).join('')}</div>` : '';
  return main + more;
}
export { PROV };
