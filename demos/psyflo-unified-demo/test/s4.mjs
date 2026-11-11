// Scenario S4 · continued-stay evidence (M.R., R-0411), end to end (review/06 b, S4; prompt Part 14.2):
//   the case (platform) -> Lauris continued-stay form + panel, Scan & Enhance Mode B (Evidence review, read-only) -> pick the period ->
//   counts equal stored rows and OPEN their dated rows -> exclude an item (who, when, why) -> the "Evidence missing" list -> use it in the
//   continued-stay request: Review statements, Approve and fill (typed yellow, NOT processed) -> nothing written to processed notes.
//   Asserted in the Psyflo store (notes, marks, periods, events), the mock Lauris store (sessions unchanged), the case and the queue.
//   Runs from demo.scenario s4, the fixture mr-corpus and a fresh canvas reset; first and last states must be the same.
import { suite, assert, api, tryApi, state, reset, playwright, BASE, LAURIS, MODES, start, flow, openAs, noErrors, panel, panelFrame, formValues, yellow, mainText, waitState, shot, lsnap, lcons, req, cli, evs, scoreRows, same, sleep } from './lib/scenario.mjs';
import { evidenceIndex } from '../web/js/shared/enhance.js';

const T = suite('s4');
const { chromium } = playwright();
const b = await chromium.launch();
const ledgers = {};
const R = 'R-0411';
const mr = s => s.notes.filter(n => n.client === 'MR');
const l3310 = l => l.sessions.filter(x => x.no === 3310);
const stable = s => JSON.stringify(mr(s).map(n => [n.id, n.fields, n.units, n.processed_at, n.session]));
const num = async (P, i) => Number((await P.locator('.cnts .cnt').nth(i).innerText()).match(/\d+/)[0]);

async function run(mode) {
  const F = flow(T, `S4[${mode}]`); const L = {}; const pages = [];
  try {
    await start(mode, { scenario: 's4', fixture: 'mr-corpus', preset: 'canvas' });
    await F.step('first state: R-0411 is a Draft ready continued stay; M.R. has 40 daily notes (83 units), 9 weekly calls and 3 monthly rows in Psyflo; Lauris holds the same sessions; no evidence mark or period yet', async () => {
      const s = await state('jperez'), l = await lsnap();
      assert.eq(req(s, R).stage, 'draft_ready'); assert.eq(req(s, R).type, 'continued_stay');
      assert.eq(mr(s).filter(n => n.type === 'daily').length, 40); assert.eq(mr(s).filter(n => n.type === 'daily').reduce((a, n) => a + n.units, 0), 83, 'the notes add up to the 83 units used'); assert.eq(cli(s, 'MR').authorization.used, 83);
      assert.ok(mr(s).filter(n => n.type === 'weekly_guardian').length >= 9 && mr(s).filter(n => n.type === 'monthly_collateral').length === 3);
      assert.eq(s.evidence_marks.length, 0); assert.eq(s.evidence_periods.length, 0);
      const ls = l3310(l); assert.ok(ls.filter(x => x.form === 'dpn' && x.status === 'processed').length >= 40, 'Lauris holds the daily notes'); assert.eq(lcons(l, 3310).auth.used, 83);
      L.s0 = s; L.l0 = l; L.stable0 = stable(s); L.ls0 = JSON.stringify(ls.map(x => [x.id, x.status, x.form, x.date]));
      L.first = { stage: req(s, R).stage, daily: 40, weekly: mr(s).filter(n => n.type === 'weekly_guardian').length, monthly: mr(s).filter(n => n.type === 'monthly_collateral').length, units: cli(s, 'MR').authorization.used, lSessions: ls.length, marks: 0, periods: 0 };
    });

    // ---------------------------------------------------------------- 1 the case (platform)
    const desk = await openAs(b, 'jperez'); pages.push(desk);
    await F.step('1 open from the case (platform): the Evidence section prints counts from the stored rows (40 / 9 / 3) and links to the continued-stay form in Lauris; opening changes nothing; R-0411 stays Draft ready', async () => {
      await desk.goto(BASE + '/#/Authorization?id=' + R + '&section=evidence'); await desk.waitForTimeout(1300);
      const t = await mainText(desk); assert.match(t, /40 stored/); assert.match(t, /Weekly calls\s*\n?\s*\|?\s*9|Weekly calls[\s\S]{0,12}9/); assert.match(t, /Monthly collateral[\s\S]{0,12}3/); assert.match(t, /Draft ready/);
      const href = await desk.getByRole('link', { name: /Open in Lauris/ }).first().getAttribute('href'); assert.match(decodeURIComponent(href), /consumers\/3310\/session\/sra-continued/);
      assert.eq((await state('jperez')).events.length, L.s0.events.length, 'looking is not an event'); assert.eq(req(await state('jperez'), R).stage, 'draft_ready');
      const row = await (async () => { await desk.goto(BASE + '/#/Authorizations'); await desk.waitForSelector('.ui-qt__row'); await desk.waitForTimeout(400); const r = desk.locator(`.ui-qt__row[data-row-id="${R}"]`); return (await r.count()) ? (await r.first().innerText()).replace(/\s+/g, ' ') : null; })();
      assert.ok(row && /Draft ready/.test(row), 'queue row: ' + row);
      await shot(desk, `s4-${mode}-1-case`);
    });

    // ---------------------------------------------------------------- 2-5 Lauris + panel, Mode B
    const lp = await openAs(b, 'jperez', { width: 1440, height: 1000 }); pages.push(lp); const P = panel(lp);
    await F.step('2 Scan & Enhance › Evidence review (Mode B): read-only, Psyflo\'s own copies; NO fill, approve or write control exists; the period is chosen and kept (who)', async () => {
      await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3310/session/sra-continued')}`); await lp.waitForTimeout(2200); L.homeTxt = (await panelFrame(lp).locator('#panel').innerText()).replace(/\s+/g, ' ');
      await P.getByRole('button', { name: 'Home' }).click(); await P.getByText('Scan & Enhance').first().click(); await P.getByRole('button', { name: 'Evidence review' }).click(); await P.getByText('Read-only').first().waitFor();
      const dom = await panelFrame(lp).evaluate(() => ({ acts: [...document.querySelectorAll('#panel [data-act]')].map(e => e.dataset.act), btns: [...document.querySelectorAll('#panel button')].map(e => e.textContent.trim()) }));
      assert.ok(!dom.acts.some(a => /fill|approve|decide|process|save/i.test(a)), 'no write action in Mode B: ' + dom.acts.join(','));
      assert.ok(!dom.btns.some(t => /^(Fill|Approve and fill|Type|Process|Get Signature|Send)/.test(t)), 'no fill or press button: ' + dom.btns.join(' | '));
      assert.match((await panelFrame(lp).locator('#panel').innerText()), /Psyflo's copies of processed notes\. Never a Lauris scrape\./);
      const a = cli(L.s0, 'MR').authorization; await P.locator('#ev-per').selectOption({ index: 2 }); await lp.waitForTimeout(900);   // the whole authorization
      const s = await state('jperez'); const per = s.evidence_periods.filter(p => p.client === 'MR'); assert.eq(per.length, 1); assert.eq(per[0].by, 'jperez'); assert.eq(per[0].from, a.start);
      L.period = per[0];
      const idx = evidenceIndex(s, 'MR', { from: per[0].from, to: per[0].to || s.today });
      assert.eq(await num(P, 0), idx.counts.daily, 'daily notes on screen = stored rows'); assert.eq(await num(P, 1), idx.counts.weekly); assert.eq(await num(P, 2), idx.counts.monthly);
      assert.eq(idx.counts.daily, 40, 'the whole authorization holds all 40 stored daily notes'); L.all = idx.counts;
      await shot(lp, `s4-${mode}-2-modeB`);
    });
    await F.step('3 counts open their rows: each count lists its dated rows (the number of rows equals the number); rows are read-only text from the stored note', async () => {
      await P.locator('#ev-per').selectOption({ index: 0 }); await lp.waitForTimeout(900);       // last 30 days, where the gaps are
      const s = await state('jperez'); const per = s.evidence_periods.filter(p => p.client === 'MR').at(-1); const idx = evidenceIndex(s, 'MR', { from: per.from, to: per.to || s.today });
      const n0 = await num(P, 0); assert.eq(n0, idx.counts.daily); assert.ok(n0 > 0 && n0 < 40, 'a narrower window');
      await P.locator('.cnts .cnt').first().click(); await lp.waitForTimeout(500);
      const rows = await panelFrame(lp).locator('details.acc').count(); assert.ok(rows >= Math.min(n0, 8), 'rows open under the count: ' + rows);
      const first = (await panelFrame(lp).locator('details.acc summary').first().innerText()); assert.match(first, /^[A-Z][a-z]{2} \d+ · daily note/, 'a dated row: ' + first);
      L.idx = idx; L.n0 = n0;
    });
    await F.step('4 Exclude (a person): the dialog asks why; the row leaves the count; who, when and why are kept; the note itself and Lauris are untouched', async () => {
      await P.locator('details.acc summary').filter({ hasText: /daily note/i }).first().click();
      await P.getByRole('button', { name: 'Exclude' }).first().click(); await P.locator('.sheet').getByRole('button', { name: 'Exclude' }).click(); await lp.waitForTimeout(500);
      assert.eq((await state('jperez')).evidence_marks.length, 0, 'a reason is required: nothing is marked without one');
      await P.getByLabel(/Why/).fill('visit with the supervisor, not a service day for this goal'); await P.locator('.sheet').getByRole('button', { name: 'Exclude' }).click(); await lp.waitForTimeout(900);
      const s = await state('jperez'); const m = s.evidence_marks.at(-1); assert.ok(m.excluded && m.by === 'jperez' && /^2026-10-29T/.test(m.at) && /visit with the supervisor/.test(m.reason), JSON.stringify(m));
      assert.eq(await num(P, 0), L.n0 - 1, 'the count drops by one'); assert.eq(stable(s), L.stable0, 'no processed note was changed'); assert.eq(JSON.stringify(l3310(await lsnap()).map(x => [x.id, x.status, x.form, x.date])), L.ls0, 'Lauris was not written');
      assert.ok(s.events.some(e => /Evidence excluded from the request/.test(e.what) && e.who === 'jperez'), 'audit event with who');
      const idx = evidenceIndex(s, 'MR', { from: L.period.from, to: s.today }); L.excluded = m.ref; L.counts2 = evidenceIndex(s, 'MR', { from: (s.evidence_periods.filter(p => p.client === 'MR').at(-1)).from, to: s.today }).counts;
      assert.eq(L.counts2.excluded, 1);
    });
    await F.step('5 missing evidence is a list, not a sentence: every gap that lacks a stored record prints "Evidence missing — verify …" and names the dates; the gap count equals the selector\'s', async () => {
      const s = await state('jperez'); const per = s.evidence_periods.filter(p => p.client === 'MR').at(-1); const idx = evidenceIndex(s, 'MR', { from: per.from, to: per.to || s.today });
      const txt = (await panelFrame(lp).locator('#panel').innerText()).replace(/\s+/g, ' ');
      const m = txt.match(/Gaps · (\d+)/); assert.ok(m, 'a gaps heading'); assert.eq(Number(m[1]), idx.gaps.length, 'the gap count on screen = the selector');
      const missing = idx.gaps.filter(g => /^Evidence missing — verify/.test(g.text)); assert.ok(missing.length >= 2, 'gaps that are missing evidence: ' + missing.length);
      for (const g of missing) assert.ok(txt.includes(g.text.slice(0, 60)), 'printed on the panel: ' + g.text.slice(0, 60));
      assert.match(L.homeTxt, /27 units left · out about Nov 11, before Nov 13/, 'EXA-01: the units run out before the authorization ends, and the panel home says so');
      L.gaps = idx.gaps.length;
    });
    await F.step('6 household context is OFF by default (a person must include it); "Use it in the continued-stay request", Review statements: a statement with no stored evidence has no Accept; counts in the text equal the rows', async () => {
      await P.getByRole('button', { name: /Use it in the continued-stay request/ }).click(); await lp.waitForTimeout(800);
      const home = (await panelFrame(lp).locator('#panel').innerText()).replace(/\s+/g, ' '); assert.match(home, /Household context\s*Not included/);
      await P.getByRole('button', { name: /Review \d statements/ }).click(); await P.locator('.ui-dr__item.px-open').getByText(/Evidence missing/).first().waitFor();
      assert.ok(await P.locator('.ui-dr__item.px-open').getByRole('button', { name: 'Accept' }).count() === 0, 'a box with no stored evidence has no Accept');
      await P.locator('.ui-dr__item.px-open').getByRole('button', { name: 'Reject' }).click();
      await P.getByRole('button', { name: /Accept the \d+ with sources/ }).click(); await P.getByRole('button', { name: 'Approve and fill' }).click(); await P.getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
      const s = await state('jperez'); const per = s.evidence_periods.filter(p => p.client === 'MR').at(-1); const idx = evidenceIndex(s, 'MR', { from: per.from, to: per.to || s.today }); const v = await formValues(lp);
      assert.match(v['Progress toward goals'], new RegExp('^' + idx.counts.daily + ' daily notes stored for this period')); assert.match(v['Family involvement'], new RegExp('^' + idx.counts.weekly + ' weekly guardian calls in the period'));
      assert.eq(v['Request'], '', 'the unevidenced box was rejected, not typed'); assert.noMatch(Object.values(v).join(' '), /household/i, 'household context stays out until a person includes it');
      assert.ok(await yellow(lp) >= 2, 'typed yellow, for the clinician to review'); await shot(lp, `s4-${mode}-6-filled`);
      L.typed = { progress: v['Progress toward goals'].slice(0, 45), family: v['Family involvement'].slice(0, 45) };
    });
    await F.step('7 nothing is processed: R-0411 stays Draft ready, Lauris holds no new session and the same units, every processed note is byte-identical, the draft is Psyflo\'s record', async () => {
      const s = await state('jperez'), l = await lsnap();
      assert.eq(req(s, R).stage, 'draft_ready'); assert.eq(stable(s), L.stable0, 'processed notes are write-once'); assert.eq(JSON.stringify(l3310(l).map(x => [x.id, x.status, x.form, x.date])), L.ls0, 'no Lauris session was created or changed'); assert.eq(lcons(l, 3310).auth.used, 83);
      assert.eq(cli(s, 'MR').authorization.used, 83, 'units unchanged by reading evidence'); assert.ok(!req(s, R).signed_at && !req(s, R).sent);
      assert.ok(s.doc_versions.some(d => d.client === 'MR' && d.mode === 'historical') || s.doc_versions.some(d => d.client === 'MR'), 'the analysis is stored as a Psyflo record');
      const hist = s.doc_versions.filter(d => d.mode === 'historical'); for (const h of hist) assert.eq(h.lauris_status, 'read-only', 'a Mode B record never has a Lauris write status');
    });
    await F.step('8 the platform follows: the case Evidence section counts the exclusion, the queue still says Draft ready, Analytics counts no processed note for this', async () => {
      await desk.goto(BASE + '/#/Authorization?id=' + R + '&section=evidence'); await desk.waitForTimeout(1300); const t = await mainText(desk);
      assert.match(t, /Draft ready/); assert.match(t, /40 stored/);
      const a = scoreRows(await state('dowens'), 'dowens'), a0 = scoreRows(L.s0.preset ? await (async () => { return state('dowens'); })() : L.s0, 'dowens'); assert.eq(a.notes.headline, a0.notes.headline, 'reading evidence moves no note measure');
      const s = await state('jperez'); L.last = { stage: req(s, R).stage, marks: s.evidence_marks.length, marksBy: s.evidence_marks.map(m => m.by + ':' + !!m.excluded), periods: s.evidence_periods.length, counts: L.counts2, gaps: L.gaps, typed: L.typed, lSessions: l3310(await lsnap()).length, units: cli(s, 'MR').authorization.used, stable: stable(s) === L.stable0 };
    });
    await F.step('8b the case Evidence section and the panel agree on what is missing: the case must not say "Nothing missing" while the panel lists gaps for the same request', async () => {
      await desk.goto(BASE + '/#/Authorization?id=' + R + '&section=evidence'); await desk.waitForTimeout(1300); const t = await mainText(desk);
      assert.ok(L.gaps > 0 && !/Nothing missing in the stored record/.test(t) && !/3 sources · 0 missing/.test(t), `the case says "3 sources · 0 missing / Nothing missing in the stored record" but the panel lists ${L.gaps} gaps (days with no stored daily note, an absent weekly call, a note whose text Psyflo does not hold)`);
    }, { soft: true, once: true });
    await F.step('no console errors on the platform, Lauris or the panel', async () => { noErrors(pages, /LANG_OFF|Parent(Schedule|Progress)|HTTP 422 http:\/\/localhost:\d+\/api\/do/); });   // the 422 is the deliberate empty-reason Exclude in step 4 (the server refuses it)
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}

for (const m of MODES) await run(m);
if (MODES.length < 2) T.skip('S4 parity: first and last state across start modes', 'MODES was narrowed to one start mode');
else await T.test('S4 parity: the first and the last state are the same whether it started from demo.scenario, the fixture mr-corpus or a fresh canvas reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) { same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`); same(ledgers[ms[0]].last, ledgers[m].last, `last state (${ms[0]} vs ${m})`); }
});
await b.close();
await T.done();
