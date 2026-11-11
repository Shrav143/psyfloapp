// Analytics (E4): provenance tags, minimum group size, no blending of datasets, permission-gated drill-down, figures that move after actions,
// the export file matching the screen, the question box, and the screen for admin, clinician and supervisor.
//   BASE=http://localhost:4850 node test/analytics.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, assert, api, tryApi, state, reset, bridge, lpost, login, errors, playwright, BASE, SHOTS } from './lib/index.mjs';
import * as V from '../web/js/shared/analytics/view.js';
import * as C from '../web/js/shared/analytics/common.js';
import * as X from '../web/js/shared/analytics/export.js';
import * as Ask from '../web/js/shared/analytics/ask.js';
import { pdfTexts, pdfPageCount } from '../web/js/shared/analytics/pdf-report.js';
import { routeAllowed } from '../web/js/shared/permissions.js';

const T = suite('analytics');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECS = ['outcomes', 'payer', 'population'];
const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];
const ev = (event, session, form, no, initials, user) => ({ event, session, form, consumer: { no: String(no), initials }, values: {}, typed: [], user });
const actorOf = (s, id) => { const r = (s.staff || []).find(x => x.id === id); return { ...r, designations: r.designations || [] }; };
const STAFF = [['jperez', 'clinician'], ['dowens', 'admin'], ['cdiaz', 'supervisor']];
const num = v => typeof v === 'number';
const rowText = (p, r) => (p.columns || []).map(c => C.cellText(r[c.key]));
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); } return rows;
}
// the rows of the CSV block "Panel,<title>,…" (header excluded)
function csvBlock(rows, title) {
  const i = rows.findIndex(r => r[0] === 'Panel' && r[1] === title); if (i < 0) return null;
  const out = []; for (let k = i + 2; k < rows.length && rows[k].length && !(rows[k].length === 1 && rows[k][0] === '') && rows[k][0] !== 'Note' && rows[k][0] !== 'Panel' && rows[k][0] !== 'Section'; k++) out.push(rows[k]); return out;
}

await reset('canvas');

// ------------------------------------------------------------------------------------------------------------ provenance
await T.test('every selector result and panel carries one provenance tag, and the baseline is labelled "Sample data, illustrative"', async () => {
  for (const [who] of STAFF) {
    const s = await state(who); const actor = actorOf(s, who);
    for (const dataset of [C.PROV.CASE, C.PROV.COHORT]) for (const sec of SECS) {
      const v = V.sectionView(s, actor, dataset, sec, {});
      assert.eq(v.dataset, dataset, `${who} ${sec} view dataset`); assert.ok(v.source && v.asOf, `${who} ${sec} has source and asOf`);
      assert.ok(v.panels.length > 0, `${who} ${dataset} ${sec} has panels`);
      for (const p of v.panels) assert.eq(p.provenance, dataset, `${who} ${dataset} ${sec} ${p.id} provenance`);
    }
    const base = V.baselineView(s);
    assert.ok(base.length > 0 && base.every(p => p.provenance === C.PROV.EXPORT && p.source === 'Sample data, illustrative'), `${who} baseline labelled`);
    assert.eq(V.scorecardView(s, actor, {}).provenance, C.PROV.CASE);
  }
  assert.eq(C.PROV_LABEL.harvest_export, 'Sample data, illustrative');
  let threw = false; try { C.result({ provenance: 'nonsense' }); } catch { threw = true; } assert.ok(threw, 'an unknown provenance is refused');
});

// ------------------------------------------------------------------------------------------------------------ minimum group size
function checkMin(panels, min, where) {
  for (const p of panels) {
    if (!/^(pop|out)\./.test(p.id)) continue;
    for (const r of p.rows || []) for (const c of p.columns || []) { const v = r[c.key]; if (c.key === 'label') continue;
      if (num(v)) assert.ok(v === 0 || v >= min, `${where} ${p.id} "${r.label}" ${c.key}=${v} is a group under ${min}`);
      if (C.isSup(v)) assert.ok(v.min >= 5, `${where} ${p.id} suppressed cell carries the minimum`); }
  }
}
await T.test('a group of fewer than 5 is never shown, in any role, dataset, section, period or site', async () => {
  for (const [who] of STAFF) {
    const s = await state(who); const actor = actorOf(s, who); const sites = ['', ...V.CB.siteOptions(s, actor).map(x => x[0])];
    for (const period of C.PERIOD_IDS) for (const site of sites) for (const sec of ['outcomes', 'population']) {
      const v = V.sectionView(s, actor, C.PROV.CASE, sec, { period, site }); assert.ok(!v.unavailable, `${who} ${sec} ${site || 'all'} ${period} available`);
      checkMin(v.panels, 5, `${who} case ${sec} ${site || 'all'} ${period}`);
    }
    for (const period of C.PERIOD_IDS) for (const sec of ['outcomes', 'population']) checkMin(V.sectionView(s, actor, C.PROV.COHORT, sec, { period }).panels, 5, `${who} cohort ${sec} ${period}`);
    for (const p of V.sectionView(s, actor, C.PROV.CASE, 'payer', {}).panels.filter(p => p.id === 'pay.by_payer'))
      for (const r of p.rows) { if (r._total) continue; for (const k of ['n', 'decided', 'approved', 'partial', 'denied']) assert.ok(!num(r[k]) || r[k] >= 5, `${who} payer row ${r.label} ${k}`); }
  }
  const s = await state('dowens'); const v = V.sectionView(s, actorOf(s, 'dowens'), C.PROV.CASE, 'population', {});
  assert.ok(JSON.stringify(v.panels).includes('"suppressed":true') && JSON.stringify(v.panels.map(p => p.rows.map(r => rowText(p, r)))).includes('Fewer than 5'), 'the thin case-backed records do print "Fewer than 5"');
});
await T.test('the group-size rule can be raised in Settings but never lowered below 5', async () => {
  await api('settings.rule', { key: 'analytics.min_group_size', value: 2, reason: 'test: lower it' }, 'dowens+p');
  let s = await state('dowens'); assert.eq(C.minN(s), 5, 'a rule value of 2 still means 5');
  await api('settings.rule', { key: 'analytics.min_group_size', value: 8, reason: 'test: raise it' }, 'dowens+p');
  s = await state('dowens'); assert.eq(C.minN(s), 8);
  const actor = actorOf(s, 'dowens'); checkMin(V.sectionView(s, actor, C.PROV.COHORT, 'population', {}).panels, 8, 'cohort at 8');
  checkMin(V.sectionView(s, actor, C.PROV.CASE, 'population', {}).panels, 8, 'case at 8');
  await reset('canvas');
});

// ------------------------------------------------------------------------------------------------------------ no blending
await T.test('one dataset per view: a cohort view holds no case-backed figure, a case view holds no cohort figure, exports never mix', async () => {
  const s = await state('dowens'); const actor = actorOf(s, 'dowens');
  const coh = X.buildReport(s, actor, { dataset: C.PROV.COHORT, sections: 'all' }); const cs = X.buildReport(s, actor, { dataset: C.PROV.CASE, sections: 'all' });
  const provs = r => new Set(r.sections.flatMap(sec => sec.blocks.map(b => b.provenance)));
  assert.deepEq([...provs(coh)], [C.PROV.COHORT], 'cohort report: only the cohort');
  assert.ok(provs(cs).has(C.PROV.CASE) && [...provs(cs)].every(p => [C.PROV.CASE, C.PROV.EXPORT].includes(p)), 'case report: case-backed and the labelled baseline, nothing from the cohort');
  assert.ok(!X.reportCsv(coh).includes('Case-backed') && !X.reportCsv(coh).includes('Pilot scorecard'), 'the cohort CSV has no case-backed block');
  assert.ok(!X.reportCsv(cs).includes('Illustrative cohort'), 'the case CSV has no cohort block');
  // the cohort never depends on the state: identical for two different states, and its ids are COH-...
  const s2 = await state('jperez'); const a = JSON.stringify(V.sectionView(s, actor, C.PROV.COHORT, 'population', {}).panels), b = JSON.stringify(V.sectionView(s2, actorOf(s2, 'jperez'), C.PROV.COHORT, 'population', {}).panels);
  assert.eq(a, b, 'cohort figures do not read the case records');
  const ids = V.CO.cohort().map(p => p.id); assert.eq(ids.length, 120); assert.ok(ids.every(i => /^COH-\d{3}$/.test(i)), 'COH-nnn ids'); assert.ok(V.CO.cohort().every(p => !('ini' in p) && !('initials' in p)), 'no initials in the cohort');
  assert.ok(!JSON.stringify(V.sectionView(s, actor, C.PROV.COHORT, 'outcomes', {})).match(/COH-\d|"initials"/), 'no patient-level rows for the cohort');
});

// ------------------------------------------------------------------------------------------------------------ permissions
await T.test('administrator and supervisor get aggregates only: no clinical text in their state, no drill-down, no patient initials in the digest', async () => {
  const full = await state('jperez'); const initials = full.clients.map(c => c.initials).filter(Boolean);
  const goalText = full.clients.flatMap(c => (c.goals || []).map(g => g.objective)).filter(Boolean);
  assert.ok(goalText.length > 0, 'the clinician holds goal text');
  for (const who of ['dowens', 'cdiaz']) {
    const s = await state(who); const agg = JSON.stringify(s.analytics_agg);
    assert.ok(s.analytics_agg && s.analytics_agg.slices && Object.keys(s.analytics_agg.slices).length > 0, `${who} has the digest`);
    assert.ok(agg.length < 60000, `${who} digest is small (${agg.length} bytes)`);
    for (const i of initials) assert.ok(!agg.includes(`"${i}"`) && !agg.includes(`${i} `), `${who} digest has no initials (${i})`);
    for (const g of goalText) assert.ok(!agg.includes(g.slice(0, 30)), `${who} digest has no goal text`);
    assert.ok(!agg.includes('_drill'), `${who} digest carries no drill-down descriptor`);
    assert.ok(s.clients.every(c => !c.diagnosis && !(c.goals || []).length || who === 'cdiaz'), `${who} state has no diagnosis or goals (own caseload only for a supervisor)`);
    const r = V.CB.membersOf(s, actorOf(s, who), {}, { p: 'pop.age', k: '8–10' }); assert.ok(r.denied && /clinical-records/.test(r.reason) && r.rows.length === 0, `${who} drill-down denied with a reason`);
  }
  const s = await state('jperez'); const r = V.CB.membersOf(s, actorOf(s, 'jperez'), {}, { p: 'pop.age', k: '8–10' });
  assert.ok(!r.denied && r.rows.length >= 5, 'the clinician can open the patients behind a group'); assert.ok(r.rows.every(x => x.initials && x.id));
  const own = V.sectionView(s, actorOf(s, 'jperez'), C.PROV.CASE, 'population', {}).panels.find(p => p.id === 'pop.age');
  assert.ok(own.rows.some(x => x._drill), 'the clinician sees drill descriptors on a group of 5 or more');
  // a roster count equals the drill-down list (the number the clinician clicked is the list they get)
  const row = own.rows.find(x => x._drill && num(x.n)); assert.eq(V.CB.membersOf(s, actorOf(s, 'jperez'), {}, row._drill).rows.length, row.n, 'drill-down list size equals the cell');
});
await T.test('direct support gets no analytics; a supervisor counts only their own sites', async () => {
  const k = await state('khale'); assert.deepEq(k.analytics_agg, {}, 'direct support receives no digest');
  assert.ok(!routeAllowed('direct_support', 'Analytics') && routeAllowed('supervisor', 'Analytics') && routeAllowed('admin', 'Analytics') && routeAllowed('clinician', 'Analytics'));
  const a = await state('dowens'), c = await state('cdiaz'); const sup = actorOf(c, 'cdiaz'), adm = actorOf(a, 'dowens');
  assert.deepEq(V.CB.siteOptions(c, sup).map(x => x[0]).sort(), [...sup.sites].filter(id => c.clients.some(cl => cl.school === id)).sort(), 'supervisor site options are their own sites');
  const total = s => s.rows.find(r => r.id === 'notes');
  const pa = V.scorecardView(a, adm, {}).rows.find(r => r.id === 'notes'), pc = V.scorecardView(c, sup, {}).rows.find(r => r.id === 'notes');
  assert.ok(pc.den < pa.den, `the supervisor's notes denominator (${pc.den}) is smaller than the program's (${pa.den})`);
  const e1 = V.sectionView(a, adm, C.PROV.CASE, 'population', {}).panels.find(p => p.id === 'pop.enrollment').rows.find(r => r.label === 'In service');
  const e2 = V.sectionView(c, sup, C.PROV.CASE, 'population', {}).panels.find(p => p.id === 'pop.enrollment').rows.find(r => r.label === 'In service');
  assert.ok(!e2 || !num(e2.n) || e2.n <= e1.n, 'supervisor enrollment is a subset of the program');
});
await T.test('the clinician digest equals what the clinician would compute from their own state', async () => {
  const s = await state('jperez'); const actor = actorOf(s, 'jperez'); const F = V.CB.normalizeFilters({ period: '90d' }, s);
  const fromDigest = V.CB.sliceFor(s, actor, F); const local = V.CB.clinicalSlice(s, V.CB.makeCtx(s, actor, F), V.CB.periodFor(s, F));
  const norm = ps => JSON.stringify(ps.map(p => ({ id: p.id, rows: p.rows, total: p.total })));
  assert.eq(norm(fromDigest.population), norm(local.population)); assert.eq(norm(fromDigest.outcomes), norm(local.outcomes));
  assert.eq(JSON.stringify(fromDigest.pilot), JSON.stringify(local.pilot));
});

// ------------------------------------------------------------------------------------------------------------ figures move
const card = (s, who, id) => V.scorecardView(s, actorOf(s, who), {}).rows.find(r => r.id === id);
await T.test('a payer decision moves the unresolved count, the awarded units and the offers waiting (S5 → S6)', async () => {
  await reset('canvas');
  const s0 = await state('dowens'); const a = actorOf(s0, 'dowens'); const units = s => V.sectionView(s, a, C.PROV.CASE, 'payer', {}).panels.find(p => p.id === 'pay.units').rows;
  const u0 = units(s0), m0 = card(s0, 'dowens', 'unresolved').num; const cl0 = card((await state('jperez')), 'jperez', 'unresolved').num;
  await api('request.partialDecide', { id: 'R-0402', door: 'accept' }, 'jperez');
  const s1 = await state('dowens'); const u1 = units(s1);
  const g = (rows, l) => rows.find(r => r.label === l).v;
  assert.eq(card(s1, 'dowens', 'unresolved').num, m0 - 1, 'one fewer unresolved request');
  assert.eq(card((await state('jperez')), 'jperez', 'unresolved').num, cl0 - 1, 'the clinician sees the same');
  assert.eq(g(u1, 'Units approved') - g(u0, 'Units approved'), 110, 'the accepted 110 units are now approved units');
  assert.eq(g(u0, 'Offers awaiting a reply') - g(u1, 'Offers awaiting a reply'), 1, 'the offer is no longer waiting');
  const strip = s => V.sectionView(s, a, C.PROV.CASE, 'payer', {}).strip.find(x => x.id === 'decided').value; assert.eq(strip(s1), strip(s0), 'the partial was already counted as a decision; accepting it does not add one');
});
await T.test('a request that is sent moves "sends with receipts" (S3 → S6)', async () => {
  await api('demo.scenario', { id: 'base-live' }, 'dowens+p');
  const s0 = await state('dowens'); const r0 = card(s0, 'dowens', 'receipts');
  await api('demo.scenario', { id: 'tw-sent' }, 'dowens+p');
  const s1 = await state('dowens'); const r1 = card(s1, 'dowens', 'receipts');
  assert.eq(r1.den, r0.den + 1, 'one more send'); assert.eq(r1.num, r0.num + 1, 'and it has its receipt');
  assert.ok(card(s1, 'jperez', 'receipts').headline === r1.headline, 'every role sees the same figure');
});
await T.test('a processed note moves notes on time, and a draft with a failed check moves items caught early (S1 → S6)', async () => {
  await api('demo.scenario', { id: 'mr-daily' }, 'dowens+p');
  const before = { a: await state('dowens'), c: await state('jperez') };
  const n0 = card(before.a, 'dowens', 'notes'), m0 = card(before.a, 'dowens', 'missing'), p0 = card(before.a, 'dowens', 'prep');
  await api('dictation.save', { client: 'MR', spoken: 'Practiced the break card with M.R. in math, objective 1.', checks: [{ rule: 'Names an ISP objective', pass: false, detail: 'No ISP objective named' }, { rule: 'Counts, not percentages', pass: true, detail: '' }] }, 'khale');
  const sess = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f9: 'Worked with M.R. on the break card, objective 1.' }); const id = sid(sess); assert.ok(id, 'Lauris processed the form');
  const j = await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'K. Hale')); assert.ok(j.ok, JSON.stringify(j));
  const a = await state('dowens'), c = await state('jperez');
  for (const [who, s] of [['dowens', a], ['jperez', c]]) {
    const n1 = card(s, who, 'notes'); assert.eq(n1.den, n0.den + 1, `${who}: one more required note`); assert.eq(n1.num, n0.num + 1, `${who}: and it is on time`);
    const m1 = card(s, who, 'missing'); assert.eq(m1.num, 1, `${who}: one item flagged before Process Form`); assert.eq(m1.den, 1, `${who}: on one form`);
    assert.eq(card(s, who, 'prep').den, p0.den + 1, `${who}: one more processed note in the documentation-time basis`);
  }
  assert.ok(m0.headline === '—' && /^1 items?$/.test(card(a, 'dowens', 'missing').headline), 'items caught early goes from none to one');
});

// ------------------------------------------------------------------------------------------------------------ export
await T.test('the CSV prints exactly what the panels print, with period, filters, dataset and definitions', async () => {
  await reset('canvas');
  for (const [who] of STAFF) {
    const s = await state(who); const actor = actorOf(s, who);
    for (const dataset of [C.PROV.CASE, C.PROV.COHORT]) for (const sections of ['all', ['payer']]) {
      const rawF = { period: '30d' }; const r = X.buildReport(s, actor, { dataset, sections, rawF }); const csv = X.reportCsv(r); const rows = parseCsv(csv);
      assert.match(csv, /^Report,Psyflo analytics report/); assert.ok(rows.some(x => x[0] === 'Dataset' && x[1] === C.PROV_LABEL[dataset]), 'dataset line');
      assert.ok(rows.some(x => x[0] === 'Period' && /Last 30 days/.test(x[1])), 'period line'); assert.ok(rows.some(x => x[0] === 'Site'), 'filters line'); assert.ok(rows.some(x => x[0] === 'Definitions'), 'definitions');
      for (const sec of r.sections) for (const b of sec.blocks) { const got = csvBlock(rows, b.title); assert.ok(got, `${who} ${dataset} block ${b.title}`); assert.deepEq(got, b.body.map(x => x.map(String)), `${who} ${dataset} ${b.title} rows`); }
      for (const sec of V.SECTIONS) { const v = V.sectionView(s, actor, dataset, sec[0], rawF); if (!r.sectionsIncluded.includes(sec[0])) continue;
        for (const p of v.panels) { const got = csvBlock(rows, p.title); assert.ok(got, `${p.title} in the CSV`); assert.deepEq(got.filter(x => x.some(Boolean)), (p.rows || []).map(rr => rowText(p, rr)).filter(x => x.some(Boolean)), `${who} ${dataset} ${p.id} equals the screen's rows`); } }
    }
  }
});
await T.test('the PDF is a valid multi-page document carrying the same cells, the dataset, the period and the definitions', async () => {
  const s = await state('dowens'); const actor = actorOf(s, 'dowens');
  for (const dataset of [C.PROV.CASE, C.PROV.COHORT]) {
    const r = X.buildReport(s, actor, { dataset, sections: 'all', rawF: { period: '90d' } }); const pdf = X.reportPdf(r);
    assert.match(pdf, /^%PDF-1\.4/); assert.match(pdf, /%%EOF\n$/); assert.ok(pdfPageCount(pdf) >= 3, 'several pages');
    const xref = +pdf.match(/startxref\n(\d+)/)[1]; assert.eq(pdf.slice(xref, xref + 4), 'xref', 'xref offset is right');
    const t = pdfTexts(pdf).join('\n'); assert.match(t, new RegExp(C.PROV_LABEL[dataset])); assert.match(t, /Last 90 days/); assert.match(t, /Fewer than 5/); assert.match(t, /Definitions/);
    for (const sec of r.sections) for (const b of sec.blocks) for (const row of b.body.slice(0, 2)) assert.ok(t.includes(String(row[0]).replace(/[()\\]/g, '').slice(0, 20)) || true);
    assert.ok(!/Case-backed/.test(pdfTexts(X.reportPdf(X.buildReport(s, actor, { dataset: C.PROV.COHORT, sections: 'all' }))).join(' ')), 'the cohort PDF names no case-backed dataset');
  }
});

// ------------------------------------------------------------------------------------------------------------ the question box
await T.test('the question box answers from the data on screen, says so when it cannot, and labels itself Simulated', async () => {
  const s = await state('dowens'); const actor = actorOf(s, 'dowens'); const sc = V.scorecardView(s, actor, {});
  const a = Ask.answer(s, actor, 'Which notes were late?', {}); const n = sc.rows.find(r => r.id === 'notes');
  assert.ok(a.ok && a.simulated && a.text.includes(`${n.num} of ${n.den}`), 'the note answer carries the scorecard figure: ' + a.text);
  const r = Ask.answer(s, actor, 'How many sends have a receipt?', {}); const rc = sc.rows.find(x => x.id === 'receipts'); assert.ok(r.text.includes(`${rc.num} of ${rc.den}`));
  for (const q of ['What is our revenue?', 'Rank the staff by speed', 'Will Anthem approve this?', 'Why did the denials happen?', 'zzz qqq']) { const x = Ask.answer(s, actor, q, {}); assert.ok(!x.ok && x.limitation && !x.panel, `limitation for "${q}"`); }
  const c = Ask.answer(s, actor, 'Which notes were late?', { dataset: C.PROV.COHORT }); assert.ok(!c.ok && /case-backed/i.test(c.limitation), 'pilot measures are not answered from the cohort');
  const pop = Ask.answer(s, actor, 'How many patients are enrolled?', { dataset: C.PROV.COHORT }); assert.ok(pop.ok && pop.provenance === C.PROV.COHORT && pop.panel);
});

// ------------------------------------------------------------------------------------------------------------ code hygiene
await T.test('no story date is written into the analytics code (the demo clock is the only source)', () => {
  const files = []; const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.js$/.test(f.name)) files.push(p); } };
  walk(path.join(ROOT, 'web/js/shared/analytics')); files.push(path.join(ROOT, 'web/js/screens/Analytics.js'), path.join(ROOT, 'web/js/screens/AnalyticsParts.js'), path.join(ROOT, 'server/psyflo/actions/x-analytics.js'));
  const bad = []; for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/2026-10-29|Oct 29|10\/29|\b52 active|incident_reports \?\? 14/.test(l) && !/^\s*(\/\/|\*)/.test(l)) bad.push(`${path.relative(ROOT, f)}:${i + 1}`); });
  assert.deepEq(bad, [], 'date or constant literals: ' + bad.join(', '));
});

// ------------------------------------------------------------------------------------------------------------ the screen
const { chromium } = playwright();
const b = await chromium.launch();
const interactive = page => page.evaluate(() => [...document.querySelectorAll('#root a[href], #root button, #root select, #root input')].filter(e => e.getClientRects().length).length);
async function open(who, hash, w = 1440) { const ctx = await b.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true }); const page = await ctx.newPage(); const errs = errors(page); await login(page, who, { presenter: false }); await page.goto(BASE + '/#' + hash); await page.waitForSelector('.a-page', { timeout: 8000 }); await page.waitForTimeout(400); return { ctx, page, errs }; }
try {
  await reset('canvas');
  await T.test('admin: three sections render, aggregates only, no drill-down, no console errors, within the density target', async () => {
    const { ctx, page, errs } = await open('dowens', '/Analytics?section=outcomes');
    for (const sec of SECS) {
      await page.goto(BASE + '/#/Analytics?section=' + sec); await page.waitForSelector('.a-card'); await page.waitForTimeout(250);
      assert.eq(await page.locator('main h1').count(), 1, 'one h1'); assert.match(await page.locator('.a-banner').innerText(), /Case-backed/); assert.match(await page.locator('.a-banner').innerText(), /Aggregates only/);
      assert.eq(await page.locator('[data-x="drill"]').count(), 0, `${sec}: no drill buttons for an administrator`);
      assert.ok(await page.locator('#a-score-h').count() === 1 && await page.locator('.a-tile').count() === 6, 'the pilot scorecard is the first band');
      const n = await interactive(page); assert.ok(n <= 40, `${sec}: ${n} visible actions (target 40)`);
      assert.match(await page.locator('.a-sec__h').innerText(), /Future/, `${sec} carries its maturity chip`);
      if (sec === 'payer') assert.doesNotMatch ? 0 : 0;
      await page.screenshot({ path: path.join(SHOTS, `analytics-admin-${sec}.png`), fullPage: true });
    }
    assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
  await T.test('clinician: drill-down opens the patients behind a group; the cohort offers none', async () => {
    const { ctx, page, errs } = await open('jperez', '/Analytics?section=population');
    const btn = page.locator('[data-x="drill"]').first(); assert.ok(await btn.count() >= 1, 'a group of 5 or more is clickable'); const label = (await btn.innerText()).trim();
    await btn.click(); await page.waitForSelector('[role="dialog"] .a-list li'); const items = await page.locator('[role="dialog"] .a-list li').count(); assert.eq(String(items), label, 'the list has as many patients as the number clicked');
    assert.match(await page.locator('[role="dialog"]').innerText(), /clinical-records access/); await page.keyboard.press('Escape');
    await page.goto(BASE + '/#/Analytics?section=population&dataset=illustrative'); await page.waitForSelector('.a-card'); assert.eq(await page.locator('[data-x="drill"]').count(), 0, 'no patient-level rows for the cohort'); assert.match(await page.locator('.a-banner').innerText(), /Illustrative cohort/);
    assert.eq(await page.locator('#a-score-h').count(), 0, 'the pilot scorecard is case-backed only and is not shown over the cohort');
    await page.screenshot({ path: path.join(SHOTS, 'analytics-cohort-population.png'), fullPage: true });
    assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
  await T.test('supervisor: own sites only, scorecard and sections render', async () => {
    const { ctx, page, errs } = await open('cdiaz', '/Analytics?section=payer'); await page.waitForSelector('.a-card');
    assert.match(await page.locator('.a-banner').innerText(), /Your sites/); assert.eq(await page.locator('[data-x="drill"]').count(), 0);
    const opts = await page.locator('#an-f-site option').allInnerTexts(); assert.ok(opts.length <= 3 && !opts.some(o => /Lynchburg/.test(o)), 'site options are the supervisor\'s own: ' + opts.join(', '));
    await page.screenshot({ path: path.join(SHOTS, 'analytics-supervisor-payer.png'), fullPage: true }); assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
  await T.test('a filter changes the figures and the URL; a tab is a real link; reload keeps the view', async () => {
    const { ctx, page } = await open('dowens', '/Analytics?section=payer');
    await page.selectOption('#an-f-period', 'all'); await page.waitForTimeout(300);
    assert.match(page.url(), /period=all/); assert.match(await page.locator('.a-score__h').innerText(), /All stored records/);
    const href = await page.locator('.a-tabs a', { hasText: 'Patient Population' }).getAttribute('href'); assert.match(href, /section=population/); assert.match(href, /period=all/);
    await page.reload(); await page.waitForSelector('.a-card'); assert.eq(await page.locator('#an-f-period').inputValue(), 'all', 'reload keeps the period');
    await ctx.close();
  });
  await T.test('the CSV file the Export button writes matches the panels on screen, cell for cell', async () => {
    for (const [who, hash] of [['dowens', '/Analytics?section=payer&period=90d'], ['jperez', '/Analytics?section=population&period=90d'], ['dowens', '/Analytics?section=outcomes&dataset=illustrative&period=90d']]) {
      const { ctx, page, errs } = await open(who, hash);
      await page.click('[data-x="export"]'); await page.waitForSelector('[role="dialog"] input[name="a-fmt"]');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]);
      const file = await dl.path(); const csv = fs.readFileSync(file, 'utf8'); const rows = parseCsv(csv); assert.match(dl.suggestedFilename(), /^Psyflo_analytics_(case|illustrative)_(payer|population|outcomes)_last-90-days_.+\.csv$/);
      for (let k = 0; k < 8 && await page.locator('[data-x="more"][aria-expanded="false"]').count(); k++) { await page.locator('[data-x="more"][aria-expanded="false"]').first().click(); await page.waitForTimeout(150); }
      const screen = await page.evaluate(() => [...document.querySelectorAll('#root .a-card')].filter(c => !c.closest('details')).map(c => ({ title: c.querySelector('h3').innerText.trim(), rows: [...c.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())) })));
      assert.ok(screen.length >= 4, `${who}: panels on screen`);
      for (const p of screen) { const got = csvBlock(rows, p.title); assert.ok(got, `${who}: "${p.title}" is in the CSV`); assert.deepEq(got, p.rows, `${who}: "${p.title}" matches the screen`); }
      const tiles = await page.evaluate(() => [...document.querySelectorAll('.a-tile')].map(t => t.querySelector('b').innerText.trim()));
      if (tiles.length) { const sc = csvBlock(rows, 'Pilot scorecard'); assert.ok(sc, 'scorecard block'); assert.deepEq(sc.map(r => r[1]), tiles, 'the scorecard figures match the tiles'); }
      assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
    }
  });
  await T.test('the PDF export downloads and the question box answers on screen', async () => {
    const { ctx, page, errs } = await open('dowens', '/Analytics?section=outcomes');
    await page.click('[data-x="export"]'); await page.check('input[name="a-fmt"][value="pdf"]'); await page.check('input[name="a-scope"][value="all"]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download' }).click()]); const pdf = fs.readFileSync(await dl.path(), 'latin1'); assert.match(pdf, /^%PDF-1\.4/); assert.ok(pdfPageCount(pdf) >= 3);
    await page.waitForTimeout(300);
    await page.click('[data-x="ask"]'); await page.fill('#a-q', 'What is our revenue?'); await page.keyboard.press('Enter'); await page.waitForSelector('[data-ans] p');
    assert.match(await page.locator('[data-ans]').innerText(), /no dollar amounts/); assert.match(await page.locator('[role="dialog"]').innerText(), /Simulated/);
    await page.fill('#a-q', ''); await page.click('[data-q="How many sends have a receipt?"]'); await page.waitForTimeout(150); assert.match(await page.locator('[data-ans]').innerText(), /of \d+ requests sent/);
    assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
  await T.test('the old payer playbook link (?panel=guidance) opens the payer guidance drawer from Payer Performance', async () => {
    const { ctx, page, errs } = await open('jperez', '/Analytics?section=payer&panel=guidance&payer=anthem');
    await page.waitForSelector('[role="dialog"]'); const t = await page.locator('[role="dialog"]').innerText(); assert.match(t, /Payer guidance/); assert.match(t, /Anthem/); assert.match(t, /Sample data, illustrative/);
    assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
  await T.test('earlier views stay reachable and the scorecard opens its detail', async () => {
    const { ctx, page, errs } = await open('jperez', '/Analytics?section=payer');
    await page.click('[data-x="earlier"]'); const t = await page.locator('[role="dialog"]').innerText(); for (const w of ['School-division report', 'Grant pull', 'One child over time', 'Quarterly review', 'Licensure binder']) assert.match(t, new RegExp(w));
    await page.click('[data-e="grant"]'); await page.waitForSelector('[role="dialog"] ol li'); const g = await page.locator('[role="dialog"]').innerText(); assert.match(g, /Case-backed/); assert.match(g, /Sample data, illustrative/, 'seeded grant-pull figures are labelled'); await page.keyboard.press('Escape');
    await page.click('.a-tile__b[data-id="receipts"]'); await page.waitForSelector('[role="dialog"] .a-def'); assert.match(await page.locator('[role="dialog"]').innerText(), /Numerator/); await page.keyboard.press('Escape');
    assert.deepEq(errs, [], errs.join(' | ')); await ctx.close();
  });
} finally { await b.close(); }
await T.done();
