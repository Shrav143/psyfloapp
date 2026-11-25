// Analytics over the ASAM Criteria (pure ESM, imported by casebacked.js, panels.js, the server digest and the screen). Every panel here is counted from the
// stored records (assessments, requests, their reasons) or from the seeded `denial_reasons` rows (labelled "Sample data, illustrative"); nothing is typed in.
// The same minimum group size applies as everywhere else (a group of fewer than 5 prints "Fewer than 5", complementary groups are hidden together).
//
//   asamPayerPanels(R, env)       Payer Performance, case-backed: outcomes by level of care requested · payer reasons by ASAM dimension · denials and partial
//                                 approvals by level-of-care reading (the latest assessment against the level asked for). R: request facts with level, dims, lvl, state.
//   levelPopulationPanels(F, env) Patient Population: patients by level of care · by reassessment state. F: clinical facts with `asam`.
//   asamOutcomePanels(F, env)     Patient Outcomes: change in each dimension's rating between a patient's first and latest assessment (patients with two or more).
//   baselineAsamPanels(s)         the seeded denial_reasons rows by dimension, and by level-of-care reason or not, in one panel (sample data; counts as seeded, small groups hidden).
import { PROV, sup, grp, groupPatients } from './common.js';
import { DIMS, LEVELS, levelById, levelName } from '../asam.js';
import { reasonRow } from '../sel/asam-view.js';

const COLS = (first, ...more) => [{ key: 'label', label: first }, ...more.map(([key, label]) => ({ key, label, align: 'right' }))];
const isDecided = r => ['approved', 'partial', 'denied'].includes(r.outcome);
const STATE_LABEL = { match: 'Ratings support the level asked', over: 'Ratings fit a lower level', under: 'Ratings point higher', none: 'Not assessed', hidden: 'Ratings not available to this role' };
const STATE_ORDER = ['match', 'over', 'under', 'none'];
const SMALL = (min, n) => ({ label: `Groups under ${min}${n ? ` (${n})` : ''}`, n: sup(min), _small: true });

// ---------------------------------------------------------------------------------------------------------------- Payer Performance (case-backed)
export function asamPayerPanels(R, env) {
  const min = env.min; const P = [];
  // outcomes by the level of care asked for
  const byLevel = new Map(); for (const r of R) { const k = r.level || 'none'; if (!byLevel.has(k)) byLevel.set(k, []); byLevel.get(k).push(r); }
  const lvlKeys = [...byLevel.keys()].sort((a, b) => (a === 'none') - (b === 'none') || parseFloat(a) - parseFloat(b));
  const rows = lvlKeys.map(k => {
    const l = byLevel.get(k); const d = l.filter(isDecided); const small = l.length < min;
    const ap = d.filter(r => r.outcome === 'approved').length, pa = d.filter(r => r.outcome === 'partial').length, de = d.filter(r => r.outcome === 'denied').length;
    const hide = small || [ap, pa, de].some(n => n > 0 && n < min);   // three complementary groups: hidden together
    return { label: k === 'none' ? 'Level not recorded' : levelName(k), n: small ? sup(min) : l.length, decided: small ? sup(min) : d.length, approved: hide ? sup(min) : ap, partial: hide ? sup(min) : pa, denied: hide ? sup(min) : de, _small: small };
  });
  P.push({ id: 'asam.by_level', title: 'Outcomes by level of care requested', kind: 'table', columns: COLS('Level requested', ['n', 'Requests'], ['decided', 'Decided'], ['approved', 'Approved'], ['partial', 'Partial'], ['denied', 'Denied']), rows,
    definition: 'Requests grouped by the ASAM level of care they ask for (Level 2.1 intensive outpatient, Level 1 outpatient), with how the decided ones came out. A level with fewer than 5 requests is not shown, and the three outcomes are hidden together when any one of them is a small group. A pattern here describes this period; it does not show that a level causes a decision.',
    empty: 'No request is recorded for this period.' });
  // payer reasons by ASAM dimension (stored cases only: a reason is counted once per request)
  const withReason = R.filter(r => (r.dims && r.dims.length) || r.lvl || r.reasonText);
  const keyOf = r => [...(r.dims || []).map(n => 'd' + n), ...(r.lvl ? ['level'] : []), ...(!(r.dims || []).length && !r.lvl ? ['none'] : [])];
  const g = groupPatients(withReason, keyOf, { min, order: [...DIMS.map(d => 'd' + d.n), 'level', 'none'], label: k => (k === 'level' ? 'Level of care' : k === 'none' ? 'Not compared with a dimension yet' : `${DIMS[+k.slice(1) - 1].short} ${DIMS[+k.slice(1) - 1].label}`) });
  const drows = g.rows.map(r => ({ label: r.label, n: r.n })); if (g.hidden) drows.push(SMALL(min, g.hidden));
  P.push({ id: 'asam.dims', title: 'Payer reasons by ASAM dimension', kind: 'table', columns: COLS('Dimension the reason turns on', ['n', 'Requests']), rows: drows, total: { label: 'Requests with a recorded reason', n: g.total >= min ? g.total : (g.total ? sup(min) : 0) },
    definition: 'Each request whose payer reason is recorded is read against the six ASAM dimensions (the reasons table, then a keyword reading of the payer\'s own words) and counted once under every dimension the reason turns on; a reason about the level of care is counted separately. A group of fewer than 5 requests is not shown. A reason that names no dimension is "not compared yet", never guessed.',
    empty: withReason.length ? '' : 'No request in this period carries a recorded payer reason.' });
  // denials and partial approvals by what the ratings said about the level asked for
  const adverse = R.filter(r => r.outcome === 'denied' || r.outcome === 'partial');
  const sg = groupPatients(adverse, r => r.state || 'none', { min, order: STATE_ORDER.concat(['hidden']), label: k => STATE_LABEL[k] || k });
  const srows = sg.rows.map(r => ({ label: r.label, n: r.n })); if (sg.hidden) srows.push(SMALL(min, sg.hidden));
  P.push({ id: 'asam.state', title: 'Denials and partial approvals by level-of-care reading', kind: 'table', columns: COLS('What the ratings say about the level asked', ['n', 'Requests']), rows: srows, total: { label: 'Denied or partly approved', n: sg.total >= min ? sg.total : (sg.total ? sup(min) : 0) },
    definition: 'For each denied or partly approved request, the latest ASAM assessment on file read against the level the request asked for: the ratings support it, the ratings fit a lower level (a step-down is likely), the ratings point higher, or there is no assessment. The level the ratings fit is a demo decision rule, suggested and not determined. A group of fewer than 5 requests is not shown.',
    empty: adverse.length ? '' : 'No request in this period was denied or partly approved.' });
  return P.map(p => ({ ...p, provenance: PROV.CASE }));
}

// ---------------------------------------------------------------------------------------------------------------- Patient Population
export const REASSESS_LABEL = { overdue: 'Reassessment overdue', soon: 'Due within 7 days', ok: 'Reassessment on time', none: 'Not assessed' };
export function levelPopulationPanels(F, env) {
  if (!env.meta && !F.some(f => f.asam !== undefined)) return [];
  const g1 = groupPatients(F, f => f.level || (f.asam && f.asam.level) || 'none', { min: env.min, order: [...LEVELS.map(l => l.id), 'none'], label: k => (k === 'none' ? 'Level not recorded' : levelName(k)) });
  const rows1 = g1.rows.map(r => ({ label: r.label, n: r.n, _key: r.key, ...(env.drill ? { _drill: { p: 'pop.level', k: r.key } } : {}) })); if (g1.hidden) rows1.push(SMALL(env.min, g1.hidden));
  const g2 = groupPatients(F, f => (f.asam && f.asam.state) || 'none', { min: env.min, order: ['overdue', 'soon', 'ok', 'none'], label: k => REASSESS_LABEL[k] || k });
  const rows2 = g2.rows.map(r => ({ label: r.label, n: r.n, _key: r.key, ...(env.drill ? { _drill: { p: 'pop.reassess', k: r.key } } : {}) })); if (g2.hidden) rows2.push(SMALL(env.min, g2.hidden));
  return [
    { id: 'pop.level', title: 'Level of care', kind: 'table', columns: COLS('ASAM level', ['n', 'Patients']), rows: rows1, total: { label: 'In scope', n: g1.total >= env.min ? g1.total : sup(env.min) },
      definition: 'Patients by the ASAM level of care of their open request (or, with no request, the level the clinician recommended in the latest assessment). A level with fewer than 5 patients is not shown.', empty: rows1.length ? '' : 'No level of care is recorded for a group this size.' },
    { id: 'pop.reassess', title: 'Reassessment', kind: 'table', columns: COLS('Where the clock stands', ['n', 'Patients']), rows: rows2, total: { label: 'In scope', n: g2.total >= env.min ? g2.total : sup(env.min) },
      definition: 'Patients by the age of their latest ASAM assessment against the reassessment rule (asam.reassess_days, an unverified demo assumption: payers set their own intervals). Not assessed means no assessment is on file. A group of fewer than 5 patients is not shown.', empty: rows2.length ? '' : 'No assessment dates are stored for a group this size.' }
  ].map(p => ({ ...p, provenance: PROV.CASE }));
}

// ---------------------------------------------------------------------------------------------------------------- Patient Outcomes
export function asamOutcomePanels(F, env) {
  const A = F.filter(f => f.asam && f.asam.first && f.asam.ratings);   // patients with two or more assessments
  if (!env.meta && !F.some(f => f.asam !== undefined)) return [];
  const min = env.min; const rows = DIMS.map(d => {
    const lower = A.filter(f => f.asam.ratings[d.n - 1] != null && f.asam.first[d.n - 1] != null && f.asam.ratings[d.n - 1] < f.asam.first[d.n - 1]).length;
    const higher = A.filter(f => f.asam.ratings[d.n - 1] != null && f.asam.first[d.n - 1] != null && f.asam.ratings[d.n - 1] > f.asam.first[d.n - 1]).length;
    const same = A.length - lower - higher;
    const hide = A.length < min || [lower, same, higher].some(n => n > 0 && n < min);
    return { label: `${d.short} ${d.label}`, lower: hide ? sup(min) : lower, same: hide ? sup(min) : same, higher: hide ? sup(min) : higher };
  });
  return [{ id: 'out.asam', title: 'ASAM ratings: change since the first assessment', kind: 'table', provenance: PROV.CASE, columns: COLS('Dimension', ['lower', 'Lower risk'], ['same', 'No change'], ['higher', 'Higher risk']), rows: A.length >= min ? rows : [],
    total: { label: 'Patients with two or more assessments', n: A.length >= min ? A.length : (A.length ? sup(min) : 0) },
    definition: 'For each dimension, the number of patients whose latest rating is lower, the same or higher than their first rating (the clinician\'s 0 to 4 ratings; lower is lower risk). Only patients with two or more assessments are counted, and the three groups are hidden together when any one is under 5. Counts, not percentages; no rating is estimated.',
    empty: A.length >= min ? '' : 'Fewer than 5 patients have two or more ASAM assessments.' }];
}

// ---------------------------------------------------------------------------------------------------------------- the seeded baseline (sample data)
export function baselineAsamPanels(s, min) {
  const rowsIn = (s.denial_reasons || []).filter(x => x && x.reason && x.count != null); if (!rowsIn.length) return [];
  const read = rowsIn.map(x => ({ ...x, ...reasonRow(x) }));
  const label = (s.provenance && s.provenance.label_harvest_export) || 'Sample data, illustrative';
  const common = { provenance: PROV.EXPORT, source: label, asOf: (s.migration && s.migration.last_export) || (s.today || '') };
  const total = read.reduce((a, x) => a + (+x.count || 0), 0);
  const tally = n => read.filter(x => x.dims.includes(n)).reduce((a, x) => a + (+x.count || 0), 0);
  const drows = DIMS.map(d => { const n = tally(d.n); return { label: `${d.short} ${d.label}`, n: n >= min || n === 0 ? n : sup(min) }; });
  const lvl = read.filter(x => x.level).reduce((a, x) => a + (+x.count || 0), 0), other = total - lvl;
  const hide = [lvl, other].some(n => n > 0 && n < min);
  const rows = [...drows, { label: 'About the level of care', n: hide ? sup(min) : lvl, _total: true }, { label: 'About something else', n: hide ? sup(min) : other, _total: true }];
  return [{ id: 'base.dims', title: 'Seeded payer reasons by ASAM dimension', kind: 'table', ...common, columns: COLS('Dimension or kind of reason', ['n', 'Denials']), rows, total: { label: 'Reasons recorded', n: total >= min ? total : sup(min) },
    definition: `${label}. The seeded denial reasons, each read against the six ASAM dimensions (the dimensions stored with the reason). A reason can turn on more than one dimension, so the dimension rows do not add up to the total. The last two rows split the same reasons by whether the reason is about the level of care (the level flag stored with the reason); they are hidden together when either is under ${min}. Seeded figures, never summed with the case-backed counts. A dimension under ${min} is not shown.` }];
}
export { levelById };
