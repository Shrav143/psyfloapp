// Scenario S6 · leadership view, end to end (review/06 b, S6; prompt Part 14.2): the administrator opens Analytics: the pilot scorecard and the three
//   sections (Patient Outcomes, Payer Performance, Patient Population), provenance banners (case-backed vs the illustrative cohort vs the "Sample data,
//   illustrative" baseline), the minimum group size of 5, drill-down only for case-backed data and the clinical-records permission, a payer row that opens
//   Denial Intelligence, an export file that matches the screen, and no clinical text for the administrator. The figures MOVE while the page is open when
//   a note is processed (S1) or a payer decision is recorded (S5). Runs from demo.scenario s6, the fixture analytics-case and a fresh canvas reset.
import { suite, assert, api, tryApi, state, reset, playwright, bridge, lpost, BASE, LAURIS, MODES, start, flow, openAs, noErrors, mainText, rootText, waitState, shot, lsnap, req, cli, scoreRows, pilotDom, same, sleep, download, parseCsv, csvBlock, sid } from './lib/scenario.mjs';
import * as V from '../web/js/shared/analytics/view.js';
import * as C from '../web/js/shared/analytics/common.js';

const T = suite('s6');
const { chromium } = playwright();
const b = await chromium.launch();
const ledgers = {};
const CLINICAL = /Piedmont|Physical aggression toward|hospitali|Played basketball|Walked with|Objective 1 ·|office referrals this month/i;
const actor = (s, id) => { const a = (s.staff || []).find(x => x.id === id); return { ...a, designations: a.designations || [] }; };
const panelsOnScreen = p => p.evaluate(() => [...document.querySelectorAll('#root .a-card')].filter(c => !c.closest('details')).map(c => ({ title: c.querySelector('h3').innerText.trim(), rows: [...c.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g, ' ').trim())) })));
const expandAll = async p => { for (let k = 0; k < 10 && await p.locator('[data-x="more"][aria-expanded="false"]').count(); k++) { await p.locator('[data-x="more"][aria-expanded="false"]').first().click(); await p.waitForTimeout(120); } };
const stripPairs = async p => { const t = await p.locator('.a-strip').first().innerText().catch(() => ''); const l = t.split('\n').map(x => x.trim()).filter(Boolean); const out = []; for (let i = 0; i + 1 < l.length; i += 2) out.push([l[i], l[i + 1]]); return out; };

async function run(mode) {
  const F = flow(T, `S6[${mode}]`); const L = {}; const pages = [];
  try {
    await start(mode, { scenario: 's6', fixture: 'analytics-case', preset: 'canvas' });
    let ad;
    await F.step('first state: the administrator\'s scorecard is what the selectors compute from the stored records (six measures); the dataset is case-backed, as of the demo date', async () => {
      const s = await state('dowens'), c = await state('jperez'); assert.eq(s.today, '2026-10-29');
      L.sc0 = scoreRows(s, 'dowens'); assert.deepEq(Object.keys(L.sc0).sort(), ['intake', 'missing', 'notes', 'prep', 'receipts', 'unresolved']); assert.eq(Object.keys(L.sc0).length, 6);
      for (const k of Object.keys(L.sc0)) assert.eq(scoreRows(c, 'jperez')[k].headline, L.sc0[k].headline, 'every role sees the same figure: ' + k);
      L.s0 = s; L.first = { today: s.today, scorecard: Object.fromEntries(Object.entries(L.sc0).map(([k, v]) => [k, v.headline])), payerRequests: V.sectionView(s, actor(s, 'dowens'), C.PROV.CASE, 'payer', {}).strip.map(x => x.id + ':' + x.value).join(',') };
    });

    // ---------------------------------------------------------------- 1 open Analytics
    await F.step('1 Analytics (admin): three sections as links, Case-backed by default, the banner says where the figures come from; the pilot scorecard shows the six measures and every tile equals its selector; aggregates only', async () => {
      ad = await openAs(b, 'dowens'); pages.push(ad); await ad.goto(BASE + '/#/Analytics'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      const t = await mainText(ad); for (const x of ['Patient Outcomes', 'Payer Performance', 'Patient Population', 'Pilot scorecard', 'Case-backed', 'Counted from stored records · as of Oct 29, 2026', 'Aggregates only']) assert.match(t, new RegExp(x));
      assert.eq(await ad.locator('.a-tabs a').count(), 3, 'exactly three sections'); const dom = await pilotDom(ad); assert.eq(Object.keys(dom).length, 6);
      for (const [k, v] of Object.entries(L.sc0)) assert.eq(dom[k].headline, v.headline, 'tile ' + k + ': screen = selector');
      assert.ok(!CLINICAL.test(await ad.content()), 'no clinical text for the administrator'); assert.eq(await ad.locator('[data-x="drill"]').count(), 0, 'no patient drill-down for the administrator');
      await shot(ad, `s6-${mode}-1-analytics`);
    });
    await F.step('2 timeliness moves while the page is open (S1): a processed daily note raises "Notes on time" by one over one, on the screen within seconds, with no reload', async () => {
      const before = await pilotDom(ad); const den0 = L.sc0.notes.den, num0 = L.sc0.notes.num;
      const sess = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: '220 min', f3: '2', f9: 'Worked with M.R. on the break card, objective 1.' }); const id = sid(sess); assert.ok(id);
      const j = await bridge('lauris.observed', { event: 'processed', session: id, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: { 'Direct time': '220 min', Units: '2', Narrative: 'Worked with M.R. on the break card, objective 1.' }, typed: [], user: 'K. Hale' }); assert.ok(j.ok, j.error);
      const exp = scoreRows(await state('dowens'), 'dowens'); assert.eq(exp.notes.den, den0 + 1); assert.eq(exp.notes.num, num0 + 1);
      const t0 = Date.now(); await ad.waitForFunction(h => { const e = document.querySelector('.a-tile__b[data-id="notes"] b'); return e && e.innerText.trim() === h; }, exp.notes.headline, { timeout: 6000 }); L.liveMs = Date.now() - t0;
      assert.ok(L.liveMs < 4000, `the screen followed the store in ${L.liveMs} ms`); assert.ok(before.notes.headline !== (await pilotDom(ad)).notes.headline, 'the tile changed');
    });
    await F.step('3 payer outcomes (S5 effect): a recorded decision moves "Units approved" and "Offers awaiting a reply" and the unresolved count on the Payer Performance section, which prints case-backed figures only', async () => {
      await ad.goto(BASE + '/#/Analytics?section=payer'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      const pv = s => V.sectionView(s, actor(s, 'dowens'), C.PROV.CASE, 'payer', {}); const units = s => Object.fromEntries(pv(s).panels.find(p => p.id === 'pay.units').rows.map(r => [r.label, r.v]));
      const s0 = await state('dowens'); const u0 = units(s0); const unres0 = scoreRows(s0, 'dowens').unresolved.num;
      await api('request.partialDecide', { id: 'R-0402', door: 'accept' }, 'jperez');
      const s1 = await state('dowens'); const u1 = units(s1); assert.eq(u1['Offers awaiting a reply'], u0['Offers awaiting a reply'] - 1); assert.eq(u1['Units approved'] - u0['Units approved'], 110); assert.eq(scoreRows(s1, 'dowens').unresolved.num, unres0 - 1);
      await ad.waitForFunction(() => /Units approved/.test(document.body.innerText), null, { timeout: 4000 });
      const t = await mainText(ad); assert.match(t, new RegExp('Units approved\\s*\\n?\\s*' + u1['Units approved'])); assert.match(t, /Offers awaiting a reply\s*\n?\s*0/); assert.ok(!/Harvest's Lauris export/.test(await ad.content()), 'the baseline is never called a Lauris export');
      await shot(ad, `s6-${mode}-3-payer`);
    });
    await F.step('3b a payer row opens Denial Intelligence filtered to that payer (a link, not a dead cell); an upcoming-work row opens its case', async () => {
      await ad.goto(BASE + '/#/Analytics?section=payer'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      const href = await ad.locator('a[href^="#/DenialIntelligence?payer=sentara"]').first().getAttribute('href'); assert.ok(href, 'a Sentara row link');
      await ad.locator('a[href^="#/DenialIntelligence?payer=sentara"]').first().click(); await ad.waitForSelector('.ui-qt__row'); await ad.waitForTimeout(400);
      const rows = await ad.$$eval('.ui-qt__row', rs => rs.map(r => r.innerText.replace(/\s+/g, ' '))); assert.ok(rows.length >= 1 && rows.every(r => /Sentara/.test(r)), 'only Sentara cases: ' + rows.length);
      assert.match(await mainText(ad), /Status view · no clinical text/, 'the administrator\'s view of the case queue carries no clinical text');
    });
    await F.step('4 patient population, then the Illustrative cohort: a separate dataset with its own banner, never summed with the case-backed figures; groups under 5 are "Fewer than 5" in both', async () => {
      await ad.goto(BASE + '/#/Analytics?section=population'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      const caseTxt = await mainText(ad); assert.match(caseTxt, /Case-backed/); assert.match(caseTxt, /Fewer than 5/); assert.ok(!/Illustrative cohort · generated|Generated cohort of 120/.test(caseTxt));
      await ad.getByRole('link', { name: 'Illustrative cohort' }).first().click(); await ad.waitForTimeout(900);
      const ill = await mainText(ad); assert.match(ill, /Generated cohort of 120 patients/); assert.match(ill, /Not reconciled with Authorizations or Denial Intelligence/); assert.match(ill, /Illustrative/); assert.match(ill, /Fewer than 5/);
      assert.eq(await ad.locator('.a-tile__b').count(), 0, 'the pilot scorecard (case-backed) is not shown over cohort data'); assert.ok(!/\bR-0\d{3}\b|\bCOH-\d+/.test(ill + await ad.content().then(h => h.replace(/<[^>]+>/g, ' '))), 'no request id and no cohort patient id on the screen for the administrator');
      const cells = await ad.$$eval('main td', tds => tds.map(t => t.innerText.trim())); assert.ok(!cells.some(c => /^[1-4]$/.test(c)), 'no cell of 1 to 4 (a group under 5) in the cohort tables: ' + cells.filter(c => /^[1-4]$/.test(c)).slice(0, 5));
      await shot(ad, `s6-${mode}-4-cohort`);
    });
    await F.step('4b earlier views: the seeded baseline is labelled "Sample data, illustrative" (never "Harvest\'s Lauris export"); outcomes and goals sections keep groups under 5 hidden', async () => {
      await ad.goto(BASE + '/#/Analytics?section=outcomes'); await ad.waitForSelector('.a-tile__b'); await ad.getByRole('button', { name: 'Earlier views' }).click(); await ad.waitForTimeout(500);
      const dlg = await ad.locator('[role=dialog]').innerText(); assert.match(dlg, /Sample data, illustrative/); assert.ok(!/Lauris export/.test(await ad.content()));
      await ad.keyboard.press('Escape'); await ad.waitForTimeout(200);
      const cells = await ad.$$eval('main td', tds => tds.map(t => t.innerText.trim())); assert.ok(!cells.some(c => /^[1-4]$/.test(c)), 'no cell of 1 to 4 in the outcomes tables: ' + cells.filter(c => /^[1-4]$/.test(c)).slice(0, 5));
    });
    await F.step('4c minimum group size on the counts the administrator reads outside tables: no tile or strip prints a count of 1 to 4 for a group of requests or people', async () => {
      await ad.goto(BASE + '/#/Analytics?section=payer'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      const pairs = await stripPairs(ad); const small = pairs.filter(([, v]) => /^[1-4]$/.test(v));
      assert.ok(small.length === 0, `the Payer Performance strip prints groups under 5 to the administrator: ${small.map(([k, v]) => k + ' ' + v).join(', ')} (all strip items: ${pairs.map(p => p.join(' ')).join('; ')})`);
    }, { soft: true, once: true });
    await F.step('5 drill-down is gated: the administrator has none; the clinician (own caseload) opens the patients behind a case-backed group; the cohort offers no drill-down to anyone', async () => {
      const cl = await openAs(b, 'jperez'); pages.push(cl); await cl.goto(BASE + '/#/Analytics?section=population'); await cl.waitForSelector('.a-tile__b'); await cl.waitForTimeout(600);
      const n = await cl.locator('[data-x="drill"]').count(); assert.ok(n >= 1, 'the clinician has drill-down buttons: ' + n);
      await cl.locator('[data-x="drill"]').first().click(); await cl.waitForTimeout(700); const dlg = await cl.locator('[role=dialog], .ui-overlay--drawer').first().innerText(); assert.match(dlg, /[A-Z]\.[A-Z]\./, 'patient initials behind the group');
      await cl.keyboard.press('Escape'); await cl.goto(BASE + '/#/Analytics?section=population&dataset=illustrative'); await cl.waitForTimeout(800); assert.eq(await cl.locator('[data-x="drill"]').count(), 0, 'the cohort offers no drill-down');
      const sup = await openAs(b, 'cdiaz'); pages.push(sup); await sup.goto(BASE + '/#/Analytics?section=population'); await sup.waitForSelector('.a-tile__b'); await sup.waitForTimeout(500); assert.eq(await sup.locator('[data-x="drill"]').count(), 0, 'a supervisor has none either');
      const ks = await openAs(b, 'khale'); pages.push(ks); await ks.goto(BASE + '/#/Analytics'); await ks.waitForTimeout(900); assert.ok(!(await ks.locator('.a-tile__b').count()), 'direct support has no analytics'); assert.ok([401, 403].includes((await tryApi('enhance.historical', { client: 'DW' }, 'khale')).status), 'and no clinical evidence review of another staffer\'s student');
    });
    await F.step('6 export: the CSV the administrator downloads prints the period, the filters, the dataset and the definitions, and every panel equals what is on screen cell for cell; the PDF downloads', async () => {
      await ad.goto(BASE + '/#/Analytics?section=payer&period=90d'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(600);
      await ad.click('[data-x="export"]'); await ad.waitForSelector('[role="dialog"] input[name="a-fmt"]');
      const f = await download(ad, () => ad.getByRole('button', { name: 'Download' }).click()); assert.match(f.name, /^Psyflo_analytics_case_payer_last-90-days_.+\.csv$/); const rows = parseCsv(f.text);
      assert.match(f.text, /^Report,Psyflo analytics report/); assert.ok(rows.some(r => r[0] === 'Dataset' && /Case-backed/.test(r[1]))); assert.ok(rows.some(r => r[0] === 'Period' && /Last 90 days/.test(r[1]))); assert.ok(rows.some(r => r[0] === 'Site') && rows.some(r => r[0] === 'Definitions'));
      await expandAll(ad); const screen = await panelsOnScreen(ad); assert.ok(screen.length >= 4);
      for (const p of screen) { const got = csvBlock(rows, p.title); assert.ok(got, `"${p.title}" is in the file`); assert.deepEq(got, p.rows, `"${p.title}" matches the screen`); }
      const tiles = await ad.evaluate(() => [...document.querySelectorAll('.a-tile')].map(t => t.querySelector('b').innerText.trim())); const sc = csvBlock(rows, 'Pilot scorecard'); assert.ok(sc); assert.deepEq(sc.map(r => r[1]), tiles, 'the scorecard in the file = the tiles');
      assert.ok(!CLINICAL.test(f.text), 'no clinical text in the administrator\'s file');
      await ad.click('[data-x="export"]'); await ad.waitForSelector('[role="dialog"] input[name="a-fmt"]'); await ad.check('input[name="a-fmt"][value="pdf"]'); await ad.check('input[name="a-scope"][value="all"]');
      const pdf = await download(ad, () => ad.getByRole('button', { name: 'Download' }).click()); assert.match(pdf.name, /\.pdf$/); assert.ok(pdf.text.startsWith('%PDF-1.4'));
      L.csvRows = rows.length;
    });
    await F.step('7 the administrator\'s state and screens carry no clinical text: the API projection withholds notes, drafts, screenings and evidence; Denial Intelligence and the case show status only; the clinical routes say why', async () => {
      const s = await state('dowens'); assert.ok(s.notes.every(n => !('fields' in n) && !('dictation' in n)), 'note rows are metadata only'); for (const k of ['screenings', 'drafts', 'dictations', 'evidence_marks', 'doc_versions', 'internal_quarterlies']) assert.eq((s[k] || []).length, 0, k);
      for (const h of ['/DenialCase?id=R-0408&section=evidence', '/Authorization?id=R-0411&section=evidence', '/MyWork']) { await ad.goto(BASE + '#' + h); await ad.waitForTimeout(1000); assert.ok(!CLINICAL.test(await ad.content()), 'clinical text on ' + h); }
      const j = await tryApi('enhance.historical', { client: 'MR' }, 'dowens'); assert.ok(!j.ok && j.status === 403, 'the clinical evidence review is refused for admin');
      L.last = { scorecard: Object.fromEntries(Object.entries(scoreRows(await state('dowens'), 'dowens')).map(([k, v]) => [k, v.headline])), notes: s.notes.length, csv: L.csvRows };
    });
    await F.step('no console errors for any role on Analytics', async () => { noErrors(pages); });
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}

for (const m of MODES) await run(m);
if (MODES.length < 2) T.skip('S6 parity: first and last state across start modes', 'MODES was narrowed to one start mode');
else await T.test('S6 parity: the first and the last state are the same whether it started from demo.scenario, the fixture analytics-case or a fresh canvas reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) { same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`); same(ledgers[ms[0]].last, ledgers[m].last, `last state (${ms[0]} vs ${m})`); }
});
await b.close();
await T.done();
