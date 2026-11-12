// Analytics: panel builders over normalised "facts" (pure ESM). Both people datasets (the case-backed records and the illustrative
// cohort) are turned into the same facts, so one set of builders makes the Patient Outcomes and Patient Population panels, and the
// minimum group size is enforced in exactly one place.
//
// A panel is plain JSON: { id, title, kind:'table', columns:[{key,label,align}], rows:[{...cells}], definition, note, provenance, chart? }.
// A cell is a number, a string, null, or { suppressed:true, min } (prints "Fewer than 5"). The screen, the CSV and the PDF all print a panel
// through cellText(), so the three always agree.
//
// A person-level fact: { id, site, siteLabel, locality, payer, payerLabel, age, ageBand, program, status, enrolled, ended,
//   dx:[{key,label}], goals:[{key,label,touched?,pct?}], ivs:[{key,label,n}], series:[{inst,label,lowerBetter,points:[{d,v}]}],
//   feedback:[{src,q,v}], monthly:{ 'YYYY-MM':{ incidents, office } }, svc:[{key,label,n}], units:{authorized,used}, flags:[], have:{ goals, score, note, guardian } }
import { grp, sup, groupPatients, MIN_FLOOR, median, r1, monthLabel, addMonths, monthKey, sum, pct, inRange } from './common.js';
import { daysBetween } from '../dates.js';

export const AGE_BANDS = [['5–7', 5, 7], ['8–10', 8, 10], ['11–13', 11, 13], ['14–17', 14, 17]];
export const ageBand = a => { if (a == null || a === '') return null; const b = AGE_BANDS.find(x => a >= x[1] && a <= x[2]); return b ? b[0] : a < 5 ? 'Under 5' : '18 and over'; };

export const DX_LABEL = { F90: 'ADHD', F91: 'Conduct and behavior', F93: 'Childhood anxiety', F41: 'Anxiety', F32: 'Depression', F33: 'Depression', F43: 'Trauma and stress', F12: 'Substance use', F84: 'Autism spectrum', F98: 'Other childhood', F34: 'Mood' };
export function dxFromText(text) {
  const out = []; for (const m of String(text || '').matchAll(/\b([A-Z]\d{2})(?:\.\d+)?/g)) { const k = m[1]; if (!out.some(x => x.key === k)) out.push({ key: k, label: `${k} ${DX_LABEL[k] || 'Other diagnosis'}` }); }
  return out;
}
export const GOAL_AREAS = [
  ['emotion', 'Emotional regulation', /regulat|emotion|coping|strategy|calm|feel|anx|mood|depress/i],
  ['peer', 'Peer and social', /peer|friend|social|conflict|contact|aggress|bully/i],
  ['school', 'School participation', /class|school|attend|work|task|assign|direction|follow|focus|elope/i],
  ['family', 'Family functioning', /famil|home|guardian|parent/i],
  ['safety', 'Safety and risk', /safety|harm|danger|suicid|substance/i]
];
export const goalArea = text => { const g = GOAL_AREAS.find(a => a[2].test(String(text || ''))); return g ? { key: g[0], label: g[1] } : { key: 'other', label: 'Other goal' }; };

const T = (columns, rows, o = {}) => ({ kind: 'table', columns, rows, ...o });
const COLS = (first, ...more) => [{ key: 'label', label: first }, ...more.map(([key, label]) => ({ key, label, align: 'right' }))];
const SMALL = (min, n) => ({ label: `Groups under ${min}${n ? ` (${n})` : ''}`, n: sup(min), _small: true });

// one-dimension count table: patients per group, small groups rolled up
export function groupPanel(facts, id, title, keyFn, env, o = {}) {
  const g = groupPatients(facts, keyFn, { min: env.min, label: o.label, order: o.order });
  const rows = g.rows.map(r => ({ label: r.label, n: r.n, _key: r.key, ...(env.drill && !o.noDrill ? { _drill: { p: id, k: r.key } } : {}) }));
  if (g.hidden) rows.push(SMALL(env.min, g.hidden));
  const total = g.total >= env.min ? g.total : sup(env.min);
  return { id, title, ...T(COLS(o.first || 'Group', ['n', o.col || 'Patients']), rows), total: { label: o.totalLabel || 'In scope', n: total }, definition: o.definition || '', note: o.note || '', empty: !rows.length ? (o.empty || 'None recorded in the stored records.') : '' };
}

// ---------- the grouping predicates, shared by the panel builders and by the clinician drill-down ----------
export const GROUPERS = {
  'pop.enrollment': f => f.status,
  'pop.age': f => f.ageBand,
  'pop.sites': f => f.site,
  'pop.payer': f => f.payer,
  'pop.dx': f => (f.dx && f.dx[0] ? f.dx[0].key : null),
  'pop.cooc': f => (f.dx && f.dx.length > 1 ? 'two' : f.dx && f.dx.length ? 'one' : 'none'),
  'pop.service': f => (f.svc || []).map(x => x.key),
  'pop.goals': f => (f.goals || []).map(g => g.key),
  'pop.ivs': f => (f.ivs || []).filter(i => i.n > 0).map(i => i.key),
  'out.assess': f => (f.series || []).filter(s => s.points.length > 1).flatMap(s => [s.inst, s.inst + '|' + direction(s)]),
  'out.review': f => f.flags || [],
  'out.complete': f => ['goals', 'score', 'note', 'guardian'].filter(k => f.have && k in f.have).map(k => (f.have[k] ? k : 'no:' + k))
};
export const membersOf = (facts, panelId, key) => (GROUPERS[panelId] ? facts.filter(f => [].concat(GROUPERS[panelId](f)).includes(key)) : []);

export function direction(series) {
  const p = [...(series.points || [])].sort((a, b) => (a.d < b.d ? -1 : 1)); if (p.length < 2) return 'none';
  const a = p[0].v, z = p[p.length - 1].v; if (!a) return z ? (series.lowerBetter ? 'worse' : 'better') : 'steady';
  const ch = (z - a) / Math.abs(a); const good = series.lowerBetter ? ch <= -0.1 : ch >= 0.1, bad = series.lowerBetter ? ch >= 0.1 : ch <= -0.1;
  return good ? 'better' : bad ? 'worse' : 'steady';
}
const DIR_LABEL = { better: 'Improved', steady: 'Little change', worse: 'Worsened' };

const STATUS_LABEL = { active: 'In service', awaiting: 'Awaiting authorization', intake: 'In intake', referral: 'Referred', discharged: 'Discharged', other: 'Other' };
const STATUS_ORDER = ['active', 'awaiting', 'intake', 'referral', 'discharged', 'other'];
const COOC_LABEL = { none: 'No diagnosis recorded', one: 'One diagnosis', two: 'Two or more diagnoses' };
const REVIEW_LABEL = { no_score: 'No score on record', stale_score: 'Last score over 60 days old', goal_untouched: 'A goal with no note in 28 days', worse: 'Latest score worse than first', safety: 'Incident in the period' };
const COMPLETE_LABEL = { goals: 'Treatment goals on record', score: 'A score on a recognised scale', note: 'A processed note in the last 30 days', guardian: 'A guardian contact in the last 30 days' };

// ---------- Patient Population ----------
export function populationPanels(F, env) {
  const P = [];
  P.push(populationKpi(F, env));
  P.push(groupPanel(F, 'pop.enrollment', 'Enrollment', GROUPERS['pop.enrollment'], env, { first: 'Status', label: k => STATUS_LABEL[k] || k, order: STATUS_ORDER, definition: 'Patients by where they are in care today. Counted from the stored client record.' }));
  P.push(groupPanel(F, 'pop.age', 'Age groups', GROUPERS['pop.age'], env, { first: 'Age', order: AGE_BANDS.map(b => b[0]), definition: 'Patients by age in years. Patients with no age on record are not placed in a group.' }));
  P.push(groupPanel(F, 'pop.sites', 'Schools and localities', GROUPERS['pop.sites'], env, { first: 'Site', label: k => (F.find(f => f.site === k) || {}).siteLabel || k, definition: 'Patients by the school or site on their record. Localities are Campbell County and Lynchburg City.' }));
  if (F.some(f => f.locality)) P.push(groupPanel(F, 'pop.locality', 'Counties and cities', f => f.locality, env, { first: 'Locality', noDrill: true, definition: 'Patients by the county or city of their school or site (Campbell County and Lynchburg City).' }));
  if (F.some(f => f.payer)) P.push(groupPanel(F, 'pop.payer', 'Insurance mix', GROUPERS['pop.payer'], env, { first: 'Plan', label: k => (F.find(f => f.payer === k) || {}).payerLabel || k, definition: 'Patients by the plan on their authorization or Medicaid record.' }));
  if (F.some(f => f.referral)) P.push(groupPanel(F, 'pop.referral', 'Referral sources', f => f.referral, env, { first: 'Referred by', noDrill: true, definition: 'Patients by who referred them, as recorded at referral. Sources with fewer than the minimum number of patients are rolled into one row.' }));
  P.push(groupPanel(F, 'pop.dx', 'Diagnoses', GROUPERS['pop.dx'], env, { first: 'Primary diagnosis', label: k => (F.map(f => f.dx && f.dx[0]).find(d => d && d.key === k) || { label: k }).label, definition: 'The first diagnosis code on the record, grouped by its category. A diagnosis is not a treatment goal, an intervention or a service.', empty: 'No diagnosis is stored for these patients.' }));
  P.push(groupPanel(F, 'pop.cooc', 'Co-occurring', GROUPERS['pop.cooc'], env, { first: 'Diagnoses on record', label: k => COOC_LABEL[k] || k, order: ['none', 'one', 'two'], definition: 'How many diagnosis codes the record holds for each patient.' }));
  P.push(groupPanel(F, 'pop.service', 'Service types', GROUPERS['pop.service'], env, { first: 'Service', label: k => (F.flatMap(f => f.svc || []).find(x => x.key === k) || { label: k }).label, definition: 'Patients by the service on their requests or enrollment. A service type is not an intervention.' }));
  P.push(groupPanel(F, 'pop.goals', 'Treatment goals', GROUPERS['pop.goals'], env, { first: 'Goal area', label: k => (F.flatMap(f => f.goals || []).find(g => g.key === k) || { label: k }).label, definition: 'Patients with at least one treatment goal in the area. Goals are grouped by the wording of the objective. A goal is not an intervention.', empty: 'No treatment goals are stored for these patients.' }));
  const ivRows = ivPanel(F, env);
  P.push(ivRows);
  P.push(utilizationPanel(F, env));
  P.push(flowPanel(F, env));
  return P;
}

function ivPanel(F, env) {
  const g = groupPatients(F.filter(f => (f.ivs || []).some(i => i.n > 0)), GROUPERS['pop.ivs'], { min: env.min, label: k => (F.flatMap(f => f.ivs || []).find(i => i.key === k) || { label: k }).label });
  const rows = g.rows.map(r => ({ label: r.label, n: r.n, entries: sum(F.flatMap(f => (f.ivs || []).filter(i => i.key === r.key)).map(i => i.n)), ...(env.drill ? { _drill: { p: 'pop.ivs', k: r.key } } : {}) }));
  if (g.hidden) rows.push({ ...SMALL(env.min, g.hidden), entries: sup(env.min) });
  const withIv = new Set(F.filter(f => (f.ivs || []).some(i => i.n > 0)).map(f => f.id)).size;
  return { id: 'pop.ivs', title: 'Documented interventions', ...T(COLS('Intervention', ['n', 'Patients'], ['entries', 'Entries']), rows),
    total: { label: 'With a documented intervention', n: withIv >= env.min ? withIv : withIv ? sup(env.min) : 0 },
    definition: 'Interventions named in processed notes, by the number of patients and note entries. An intervention is not a diagnosis, a goal or a service type, and naming one says nothing about its effect.', note: env.ivNote || '',
    empty: rows.length ? '' : 'No interventions are documented in stored notes for a group this size.' };
}

function utilizationPanel(F, env) {
  const hasUnits = F.some(f => f.units);
  if (hasUnits) {
    const g = groupPatients(F.filter(f => f.units), f => f.payer || 'none', { min: env.min, label: k => (F.find(f => f.payer === k) || {}).payerLabel || 'No plan recorded' });
    const rows = g.rows.map(r => { const m = F.filter(f => f.units && (f.payer || 'none') === r.key); const a = sum(m.map(f => f.units.authorized)), u = sum(m.map(f => f.units.used)); return { label: r.label, n: r.n, authorized: a, used: u, share: a ? Math.round((100 * u) / a) + '%' : '—' }; });
    if (g.hidden) rows.push({ ...SMALL(env.min, g.hidden), authorized: sup(env.min), used: sup(env.min), share: sup(env.min) });
    return { id: 'pop.util', title: 'Utilization', ...T(COLS('Plan', ['n', 'Patients'], ['authorized', 'Units authorized'], ['used', 'Units used'], ['share', 'Used']), rows), total: { label: 'With an authorization', n: g.total >= env.min ? g.total : sup(env.min) },
      definition: 'Units used against units authorized, for patients with an authorization on record. Units follow processed daily notes.', empty: rows.length ? '' : 'No authorization is stored for a group this size.' };
  }
  const g = groupPatients(F.filter(f => (f.svc || []).some(x => x.n)), f => (f.svc || []).filter(x => x.n).map(x => x.key), { min: env.min, label: k => (F.flatMap(f => f.svc || []).find(x => x.key === k) || { label: k }).label });
  const rows = g.rows.map(r => ({ label: r.label, n: r.n, weeks: sum(F.flatMap(f => (f.svc || []).filter(x => x.key === r.key)).map(x => x.n)) }));
  if (g.hidden) rows.push({ ...SMALL(env.min, g.hidden), weeks: sup(env.min) });
  return { id: 'pop.util', title: 'Utilization', ...T(COLS('Service', ['n', 'Patients'], ['weeks', 'Service weeks']), rows), total: { label: 'Receiving services', n: g.total >= env.min ? g.total : sup(env.min) },
    definition: 'Weekly service records in the period, by service type.', empty: rows.length ? '' : 'No service records in the period.' };
}

function flowPanel(F, env) {
  const end = monthKey(env.asOf); const months = []; for (let i = 5; i >= 0; i--) months.push(addMonths(end, -i));
  const rows = months.map(m => { const a = F.filter(f => f.enrolled && monthKey(f.enrolled) === m).length, d = F.filter(f => f.ended && monthKey(f.ended) === m).length; return { label: monthLabel(m), admitted: grp(a, env.min), discharged: grp(d, env.min) }; });
  return { id: 'pop.flow', title: 'Admissions and discharges', ...T(COLS('Month', ['admitted', 'Admitted'], ['discharged', 'Discharged']), rows), definition: 'Patients whose service start or discharge falls in the month, last six months. Months with fewer than the minimum group are not shown.', chart: { type: 'months', keys: ['admitted', 'discharged'] } };
}

// ---------- the headline cards (the artifact's KPI row): every figure is a count of patients or a median, small groups never shown ----------
const pctOf = (n, d) => (d > 0 ? Math.round((100 * n) / d) + '%' : '—');
const KPI = (label, value, sub, o = {}) => ({ label, value, sub: sub || '', ...o });
const KPI_COLS = [{ key: 'label', label: 'Measure' }, { key: 'value', label: 'Value', align: 'right' }, { key: 'sub', label: 'What it counts' }];
function medianDays(F, env) {
  const d = F.filter(f => f.enrolled && f.ended).map(f => daysBetween(f.enrolled, f.ended)).filter(x => x >= 0);
  return d.length >= env.min ? { value: Math.round(median(d)) + ' days', n: d.length } : { value: d.length ? sup(env.min) : '—', n: d.length };
}
function populationKpi(F, env) {
  const N = new Set(F.map(f => f.id)).size; const from = env.from || '1900-01-01', to = env.asOf || '9999-12-31';
  const active = F.filter(f => f.status === 'active').length;
  const adm = F.filter(f => f.enrolled && inRange(f.enrolled, from, to)).length, dis = F.filter(f => f.ended && inRange(f.ended, from, to)).length;
  const md = medianDays(F, env); const g = n => grp(n, env.min);
  return { id: 'pop.kpi', title: 'Population summary', ...T(KPI_COLS, [
    KPI('Total patients', g(N), 'Patients in scope, unique'),
    KPI('Active patients', g(active), 'In service on the last day'),
    KPI('New admissions', g(adm), 'Service start in the period'),
    KPI('Discharges', g(dis), 'Discharged in the period'),
    KPI('Length of treatment', md.value, md.n >= env.min ? `Median, ${md.n} discharged patients` : 'A median needs 5 discharged patients')]),
    definition: 'Unique patients, service starts and discharges are counted separately. Length of treatment is the median number of days from service start to discharge, over patients who have been discharged.' };
}
function outcomeKpi(F, env) {
  const N = new Set(F.map(f => f.id)).size; const g = n => grp(n, env.min);
  const active = F.filter(f => f.status === 'active'); const usable = F.filter(f => (f.series || []).some(s => s.points.length > 1));
  const dirOf = f => { const d = f.series.filter(s => s.points.length > 1).map(direction); return d.includes('worse') ? 'worse' : d.includes('better') ? 'better' : 'steady'; };
  const better = usable.filter(f => dirOf(f) === 'better').length, steady = usable.filter(f => dirOf(f) === 'steady').length, worse = usable.filter(f => dirOf(f) === 'worse').length;
  // three complementary groups: if any is small, none is shown (the total would reveal it)
  const hide = usable.length < env.min || [better, steady, worse].some(n => n > 0 && n < env.min);
  const d = n => (hide ? sup(env.min) : pctOf(n, usable.length)); const dsub = txt => (hide ? (usable.length < env.min ? `A group under ${env.min} is not shown` : 'Hidden so a small group cannot be worked out') : txt);
  const review = F.filter(f => (f.flags || []).length).length;
  const scored = active.filter(f => f.have && f.have.score).length, unscored = active.length - scored;
  const hideC = active.length < env.min || (scored > 0 && scored < env.min) || (unscored > 0 && unscored < env.min);
  const md = medianDays(F, env);
  return { id: 'out.kpi', title: 'Headline measures', ...T(KPI_COLS, [
    KPI('Active patients', g(active.length), 'In service on the last day of the period'),
    KPI('Showing improvement', d(better), dsub(`${better} of ${usable.length} patients with two or more scores. Latest score at least 10% better than the first, on the same scale`)),
    KPI('Little change', d(steady), dsub(`${steady} of ${usable.length} patients with two or more scores. Latest score within 10% of the first`)),
    KPI('Worsening', d(worse), dsub(`${worse} of ${usable.length} patients with two or more scores. Latest score at least 10% worse than the first`), { tone: 'warn' }),
    KPI('Needing clinical review', g(review), N >= env.min ? `Of ${N} patients in scope. No score, an old score, a goal with no note, a worse score or an incident` : 'A group under 5 is not shown', { tone: 'warn' }),
    KPI('Score on record', hideC ? sup(env.min) : pctOf(scored, active.length), hideC ? 'Hidden so a small group cannot be worked out' : `${scored} of ${active.length} active patients have a score on a recognised scale`),
    KPI('Length of treatment', md.value, md.n >= env.min ? `Median days to discharge, ${md.n} discharged patients` : 'A median needs 5 discharged patients')]),
    definition: 'Direction compares each patient\'s latest score with the first, for patients with two or more scores on one scale (lower is better on PHQ, GAD, SUDS and the DSM cross-cutting measures). Improvement, little change and worsening add up to the patients with usable scores; a change of 10% or more counts. Nothing is estimated and no score is compared across different scales.' };
}
// average change from each patient's first reading, by reading number, one line per scale (a scale needs 5 patients with two readings)
function trendPanel(F, env) {
  const byInst = new Map();
  for (const f of F) for (const s of f.series || []) { if (s.points.length < 2) continue; if (!byInst.has(s.inst)) byInst.set(s.inst, { label: s.label, runs: [] }); byInst.get(s.inst).runs.push([...s.points].sort((a, b) => (a.d < b.d ? -1 : 1)).map(p => p.v)); }
  const scales = [...byInst.entries()].filter(([, e]) => e.runs.length >= env.min).sort((a, b) => b[1].runs.length - a[1].runs.length).slice(0, 6);
  const K = Math.min(6, Math.max(0, ...scales.map(([, e]) => Math.max(...e.runs.map(r => r.length)))));
  const cols = [{ key: 'label', label: 'Reading' }, ...scales.map(([k, e], i) => ({ key: 's' + i, label: e.label, align: 'right' }))];
  const rows = [];
  for (let k = 0; k < K; k++) {
    const row = { label: k === 0 ? 'First reading' : `Reading ${k + 1}` };
    scales.forEach(([, e], i) => {
      const at = e.runs.filter(r => r.length > k && r[0] > 0);
      row['s' + i] = k === 0 ? 0 : at.length >= env.min ? r1(sum(at.map(r => (100 * (r[k] - r[0])) / r[0])) / at.length) : at.length ? sup(env.min) : null;
    });
    rows.push(row);
  }
  return { id: 'out.trend', title: 'Outcomes over time', ...T(cols, rows), n: scales.map(([, e]) => ({ label: e.label, n: e.runs.length })),
    definition: 'Each line is one scale: the average percent change from each patient\'s own first reading, at the same reading number (lower is better). Scales from different instruments are never added together. A scale needs 5 patients with two or more readings, and a point needs 5 patients with that reading.',
    empty: scales.length ? '' : 'No scale has two or more stored scores for 5 or more patients.' };
}

// ---------- Patient Outcomes ----------
export function outcomePanels(F, env) {
  const P = [];
  const N = new Set(F.map(f => f.id)).size;
  P.push(outcomeKpi(F, env));
  P.push(trendPanel(F, env));
  const usable = F.filter(f => (f.series || []).some(s => s.points.length > 1));
  // two complementary cells: if either is a small group, both are hidden (otherwise the total would reveal the small one)
  const hideBoth = N < env.min || (usable.length > 0 && usable.length < env.min) || (N - usable.length > 0 && N - usable.length < env.min);
  const cell = n => (hideBoth ? sup(env.min) : n);
  P.push({ id: 'out.usable', title: 'Usable outcome data', ...T(COLS('Patients', ['n', 'Count']), [
    { label: 'In scope', n: N >= env.min ? N : sup(env.min) },
    { label: 'Two or more scores on one scale', n: cell(usable.length) },
    { label: 'Without usable scores', n: cell(N - usable.length) }]),
    definition: 'A patient has usable outcome data when the record holds two or more scores on the same recognised scale (for example PHQ-A). Trends are never drawn from anything else.', note: usable.length || !N ? '' : 'No patient has two scores on one scale in the stored records.' });
  // goals and progress (a goal area, patients with it, and patients with progress noted in the period)
  const gk = groupPatients(F.filter(f => (f.goals || []).length), GROUPERS['pop.goals'], { min: env.min, label: k => (F.flatMap(f => f.goals || []).find(g => g.key === k) || { label: k }).label });
  const gRows = gk.rows.map(r => { const m = F.filter(f => (f.goals || []).some(g => g.key === r.key)); const touched = m.filter(f => f.goals.some(g => g.key === r.key && (g.touched > 0))).length;
    const prog = m.flatMap(f => f.goals.filter(g => g.key === r.key && g.pct != null).map(g => g.pct));
    return { label: r.label, n: r.n, noted: grp(touched, env.min), ...(prog.length >= env.min ? { avg: Math.round(sum(prog) / prog.length) + '%' } : {}), ...(env.drill ? { _drill: { p: 'pop.goals', k: r.key } } : {}) }; });
  if (gk.hidden) gRows.push({ ...SMALL(env.min, gk.hidden), noted: sup(env.min) });
  const showAvg = gRows.some(r => r.avg != null);
  P.push({ id: 'out.goals', title: 'Goals and progress', ...T(COLS('Goal area', ['n', 'Patients'], ['noted', 'Progress noted'], ...(showAvg ? [['avg', 'Average progress']] : [])), gRows),
    definition: 'Progress noted = patients whose processed notes in the period name an objective in this goal area. Progress is what staff documented; interventions are counted separately under Patient Population, and nothing here says one caused the other.', empty: gRows.length ? '' : 'No treatment goals are stored for a group this size.' });
  // assessment trends (only where scores exist)
  const insts = new Map(); for (const f of F) for (const s of f.series || []) if (s.points.length > 1) { if (!insts.has(s.inst)) insts.set(s.inst, { label: s.label, ids: new Set(), dirs: { better: new Set(), steady: new Set(), worse: new Set() } }); const e = insts.get(s.inst); e.ids.add(f.id); e.dirs[direction(s)].add(f.id); }
  const aRows = [...insts.entries()].sort((a, b) => b[1].ids.size - a[1].ids.size).filter(([, e]) => e.ids.size >= env.min).map(([k, e]) => ({ label: e.label, n: e.ids.size, better: grp(e.dirs.better.size, env.min), steady: grp(e.dirs.steady.size, env.min), worse: grp(e.dirs.worse.size, env.min), ...(env.drill ? { _drill: { p: 'out.assess', k }, _drills: { better: { p: 'out.assess', k: k + '|better' }, steady: { p: 'out.assess', k: k + '|steady' }, worse: { p: 'out.assess', k: k + '|worse' } } } : {}) }));
  const aHidden = [...insts.values()].filter(e => e.ids.size < env.min).length; if (aHidden) aRows.push({ ...SMALL(env.min, aHidden), better: sup(env.min), steady: sup(env.min), worse: sup(env.min) });
  P.push({ id: 'out.assess', title: 'Assessment trends', ...T(COLS('Scale', ['n', 'Patients'], ['better', DIR_LABEL.better], ['steady', DIR_LABEL.steady], ['worse', DIR_LABEL.worse]), aRows),
    definition: 'Only scales with two or more stored scores per patient. Direction compares the latest score with the first (a change of 10% or more); lower is better on PHQ-A, GAD-7, SUDS and the DSM cross-cutting measures. It is a description of the scores, not of a treatment effect. No score is estimated.', empty: aRows.length ? '' : 'No scale has two or more scores for a group this size.' });
  // behavioral and school functioning by month
  const end = monthKey(env.asOf); const months = []; for (let i = 5; i >= 0; i--) months.push(addMonths(end, -i));
  const hasOffice = F.some(f => f.monthly && Object.values(f.monthly).some(m => m.office > 0));
  const fRows = months.map(m => { const ids = F.filter(f => f.monthly && f.monthly[m]); const inc = ids.filter(f => f.monthly[m].incidents > 0), off = ids.filter(f => f.monthly[m].office > 0);
    const tally = (list, key) => (list.length >= env.min ? sum(list.map(f => f.monthly[m][key])) : list.length ? sup(env.min) : 0);
    return { label: monthLabel(m), inc: tally(inc, 'incidents'), off: hasOffice ? tally(off, 'office') : null }; });
  const hasF = F.some(f => f.monthly && Object.keys(f.monthly).length);
  P.push({ id: 'out.func', title: 'Behavior and school', ...T(COLS('Month', ['inc', 'Incidents'], ['off', 'Office referrals']), hasF ? fRows : []),
    definition: 'Incident reports and school office referrals by month, from stored reports and school counts. A month is not shown when fewer than the minimum number of patients had one.', empty: hasF ? '' : 'No incident or school counts are stored.', chart: { type: 'months', keys: ['inc', 'off'] } });
  // Treatment Feedback & Engagement
  P.push(feedbackPanel(F, env));
  // data completeness
  const comp = ['goals', 'score', 'note', 'guardian'].filter(k => F.some(f => f.have && k in f.have));
  // with / without are complementary: if either is a small group, both are hidden
  const compRows = comp.map(k => { const have = F.filter(f => f.have && f.have[k]).length, none = N - have; const hide = N < env.min || (have > 0 && have < env.min) || (none > 0 && none < env.min);
    return { label: COMPLETE_LABEL[k], n: hide ? sup(env.min) : have, without: hide ? sup(env.min) : none, ...(env.drill ? { _drill: { p: 'out.complete', k }, _drills: { without: { p: 'out.complete', k: 'no:' + k } } } : {}) }; });
  P.push({ id: 'out.complete', title: 'Data completeness', ...T(COLS('Record element', ['n', 'With it'], ['without', 'Without it']), compRows),
    definition: 'How many in-scope patients have each kind of record. A gap is a documentation gap, not a clinical finding.', empty: comp.length ? '' : 'No completeness data.' });
  // patients requiring clinical review
  const rk = groupPatients(F.filter(f => (f.flags || []).length), GROUPERS['out.review'], { min: env.min, label: k => REVIEW_LABEL[k] || k });
  const rRows = rk.rows.map(r => ({ label: r.label, n: r.n, ...(env.drill ? { _drill: { p: 'out.review', k: r.key } } : {}) })); if (rk.hidden) rRows.push(SMALL(env.min, rk.hidden));
  P.push({ id: 'out.review', title: 'Needs clinical review', ...T(COLS('Signal', ['n', 'Patients']), rRows), definition: 'Signals that a clinician may want to look: no score on record or none in 60 days, a goal with no note in 28 days, a latest score worse than the first, or an incident in the period. A signal prompts a review; it is not a conclusion.', empty: rRows.length ? '' : 'No signal for a group this size.' });
  return P;
}

function feedbackPanel(F, env) {
  const SRC = { patient: 'Patient', caregiver: 'Caregiver', teacher: 'Teacher', school: 'School staff', clinician: 'Clinician' };
  const rows = []; let hidden = 0;
  const by = new Map(); for (const f of F) for (const x of f.feedback || []) { if (!by.has(x.src)) by.set(x.src, { ids: new Set(), vals: [], resp: 0, often: 0, answered: 0 }); const e = by.get(x.src); e.ids.add(f.id); e.resp++; if (typeof x.v === 'number') e.vals.push(x.v); if (x.pos != null) { e.answered++; if (x.pos) e.often++; } }
  for (const [src, e] of [...by.entries()].sort((a, b) => b[1].ids.size - a[1].ids.size)) {
    if (e.ids.size < env.min) { hidden++; continue; }
    rows.push({ label: SRC[src] || src, n: e.ids.size, resp: e.resp, view: e.vals.length >= env.min ? r1(sum(e.vals) / e.vals.length) + ' of 5' : e.answered >= env.min ? Math.round((100 * e.often) / e.answered) + '% positive' : '—' });
  }
  if (hidden) rows.push({ ...SMALL(env.min, hidden), resp: sup(env.min), view: sup(env.min) });
  return { id: 'out.feedback', title: 'Treatment feedback', ...T(COLS('Source', ['n', 'Patients'], ['resp', 'Responses'], ['view', 'Typical answer']), rows),
    definition: 'Treatment Feedback & Engagement: what patients, caregivers and school staff reported, by source. Averages and shares are shown only for 5 or more responses. Engagement is reported separately from progress and from interventions.', empty: rows.length ? '' : 'No feedback is stored for a group this size.' };
}
export { pct };
