// R7 · Oprox parity, Denial Intelligence in the browser (D-01 to D-09). Standalone: `BASE=http://localhost:6400 node test/intel-denial-ui.mjs`
// (test/run-all.mjs starts a fresh server for it). Screenshots go to $SHOTS.
// Proves, for the queue and the case page: urgency groups with counts, a due-in chip and dollars at risk on every row, Needs input and the sample lift (clinician), the
// Urgency filter and the grouping switch; the payer line (pulse) with See why and its dismissal; the Insights button; the Analyze a denial wizard (stored documents or a
// file name only, identifiers removed, two streaming lists, then the analysis); the appeal analysis document (rationale, synthesis, findings tagged critical or strong,
// six dimensions, payer pattern as a labelled sample, numbered suggestions); the Decision details strip with revenue at risk; the suggestions drawer footer (Submit disabled
// with a printed reason until a draft is ready, Refine, Add clinical context, Dismiss suggestions, a live Apply selected count, each logged). Also: sample numbers carry the
// Simulated chip and the basis; an administrator sees money, due, the pulse and insights but no clinical view; keyboard and focus return; 390 px; zero page errors.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { suite, assert, login, errors, playwright, reset, state, api, tryApi, BASE, SHOTS } from './lib/index.mjs';
import * as D from '../web/js/shared/sel/disputes.js';
import { appealAnalysis, denialFields } from '../web/js/shared/sel/denial-intel.js';
import { atRisk, urgency, packetLine, liftLine, payerPulse, insights } from '../web/js/shared/intel.js';
import { denialRecsFor } from '../web/js/shared/recs.js';

const T = suite('intel-denial-ui');
const { chromium } = playwright();
const browser = await chromium.launch();
const open = async (user, width = 1440, o = {}) => { const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, ...(o.reduce ? { reducedMotion: 'reduce' } : {}) }); const page = await ctx.newPage(); page.errs = errors(page); await login(page, user, { presenter: false }); page.ctx = ctx; return page; };
const txt = (page, sel = '#root') => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
const hash = page => page.evaluate(() => location.hash);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/r7b-${name}.png`, fullPage: true });
const active = page => page.evaluate(() => { const a = document.activeElement; return a ? { id: a.id || '', tag: a.tagName } : null; });
const queue = async (p, q = '') => { await p.goto(BASE + '/#/DenialIntelligence' + q); await p.waitForSelector('.ui-qt__row, .ui-empty, [data-empty]', { timeout: 8000 }).catch(() => { }); await p.waitForTimeout(250); };
const goCase = async (p, id) => { await p.goto(BASE + `/#/DenialCase?id=${id}`); await p.waitForSelector('.d-menu'); await p.waitForSelector('.d-body h2'); };
const top = p => p.locator('[role=dialog]').last();
const rowOrder = p => p.$$eval('.ui-qt__row, tr.in-band', trs => trs.map(t => t.classList.contains('in-band') ? 'band:' + t.dataset.band : t.dataset.rowId));
const BANNED = /\b(school|student|TDT|therapeutic day|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
const events = async what => (await state('jperez')).events.filter(e => what.test(e.what)).map(e => e.what);
const CASES = ['R-0402', 'R-0384', 'R-0408', 'R-0388'];
const reqOf = (s, id) => s.requests.find(r => r.id === id);

await reset('canvas');

await T.test('queue: urgency groups with counts, a due-in chip and dollars at risk on every row, Needs input and the sample lift for the clinician, one basis line (D-01, D-09)', async () => {
  const p = await open('jperez'); await queue(p); const s = await state('jperez');
  assert.deepEq(await p.$$eval('tr.in-band th', ths => ths.map(t => t.innerText.replace(/\s+/g, ' ').trim())), ['Highest financial risk · act now 1 case', 'Due this week 1 case', 'Later 2 cases'], 'the urgency headings, with counts');
  assert.eq(await p.locator('tr.in-band th[scope=colgroup]').count(), 3, 'a heading is a column-group header cell, so a screen reader hears it');
  assert.deepEq(await rowOrder(p), ['band:risk', 'DI-0408', 'band:week', 'DI-0402', 'band:later', 'DI-0388', 'DI-0384'], 'the highest financial risk first, then the clock');
  assert.deepEq(await p.$$eval('.ui-qt__table thead th', ths => ths.map(t => t.innerText.trim())), ['Case', 'Payer', 'Decision', 'Status', 'Next step', 'Deadline', 'Suggestions'], 'no new column');
  for (const id of CASES) {
    const r = reqOf(s, id); const row = p.locator(`.ui-qt__row[data-row-id="${D.byRequest(s, id).id}"]`); const k = atRisk(s, r); const u = urgency(s, r);
    assert.eq((await row.locator('.in-money').innerText()).trim(), k.label, id + ' dollars at risk'); assert.match(await row.locator('.in-money').getAttribute('title'), /units × \$205 a unit \(demo assumption\)/, id + ' the basis is on hover');
    assert.eq((await row.locator('.in-due').innerText()).trim(), u.label, id + ' due-in chip');
    const recs = denialRecsFor(s, D.byRequest(s, id), r); const inputs = packetLine(recs).inputs;
    assert.eq(await row.locator('.in-needs').count(), inputs ? 1 : 0, id + ' needs input'); if (inputs) assert.match((await row.locator('.in-needs').innerText()).trim(), new RegExp(`^Needs input · ${inputs}$`));
    assert.eq((await row.locator('.d-lift').innerText()).trim(), liftLine(recs), id + ' the lift line, as the shared helper words it'); assert.match(liftLine(recs), /^Historically improves approval by \+\d+ pts \(sample\)$/);
  }
  assert.deepEq(await p.$$eval('.in-due', els => els.map(e => e.innerText.trim())), ['Due in 2h', 'Due tomorrow', 'Due Dec 9', 'Due Dec 21']); assert.deepEq(await p.$$eval('.ui-qt__row .in-money', els => els.map(e => e.innerText.trim())), ['$30,750 at risk', '$8,200 at risk', '$17,425 at risk', '$18,450 at risk']);
  const basis = p.locator('main .in-basis').last(); assert.match(await basis.innerText(), /Simulated[\s\S]*Illustrative sample from the demo data\. It is not Harvest's own history and it is not a prediction/); assert.eq(await p.locator('.ui-qt__row .in-basis').count(), 0, 'the basis is printed once under the table, not on every row');
  await shot(p, 'queue-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('queue: the Urgency filter (URL key urg) and the "Group by urgency" switch (URL key grp), both in the Filters drawer, both survive a reload', async () => {
  const p = await open('jperez', 1440, { reduce: true });
  await queue(p, '?urg=24h'); assert.deepEq(await rowOrder(p), ['band:risk', 'DI-0408'], 'due within 24 hours: only K.T.');
  await queue(p, '?urg=week'); assert.deepEq(await rowOrder(p), ['band:risk', 'DI-0408', 'band:week', 'DI-0402'], 'due this week');
  await queue(p, '?urg=overdue'); assert.eq(await p.locator('.ui-qt__row').count(), 0, 'nothing is overdue on this demo day'); assert.match(await txt(p), /Nothing matches/);
  await queue(p, '?urg=week'); assert.match(await p.getByRole('button', { name: /^Filters/ }).innerText(), /Filters \(1\)/);
  await p.getByRole('button', { name: /^Filters/ }).click(); let dlg = top(p); await dlg.waitFor();
  assert.deepEq(await dlg.locator('.ui-fsel__l').allInnerTexts(), ['Decision type', 'Payer', 'Service', 'Assigned clinician', 'Deadline', 'Urgency', 'Next step', 'ASAM dimension']);
  assert.deepEq(await dlg.locator('#di-fx-urg option').allInnerTexts(), ['All urgency', 'Overdue', 'Due within 24 hours', 'Due this week']); assert.eq(await dlg.locator('#di-fx-urg').inputValue(), 'week');
  await dlg.locator('#di-fx-urg').focus(); await dlg.locator('#di-fx-urg').selectOption('24h'); await p.waitForTimeout(300); assert.match(await dlg.innerText(), /1 denial case matches/); assert.match(await hash(p), /urg=24h/); assert.eq((await active(p)).id, 'di-fx-urg', 'focus stays on the control you used');
  await dlg.locator('#di-fx-urg').selectOption(''); await p.waitForTimeout(300); assert.match(await dlg.innerText(), /4 denial cases match/);
  // the switch: off = the flat list, on again = groups
  assert.ok(await dlg.locator('#di-grp').isChecked(), 'on by default'); await dlg.locator('#di-grp').uncheck(); await p.waitForTimeout(300);
  assert.match(await hash(p), /grp=0/); assert.eq(await p.locator('tr.in-band').count(), 0, 'no headings when grouping is off'); assert.deepEq(await rowOrder(p), ['DI-0408', 'DI-0402', 'DI-0388', 'DI-0384'], 'the flat list, by deadline'); assert.eq((await active(p)).id, 'di-grp', 'focus stays on the switch');
  await dlg.getByRole('button', { name: 'Done' }).click(); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(200); assert.eq((await active(p)).id, 'di-filters-b', 'focus returns to Filters'); assert.match(await p.getByRole('button', { name: /^Filters/ }).innerText(), /^Filters$/, 'the switch is not counted as a filter');
  await p.reload(); await p.waitForSelector('.ui-qt__row'); assert.eq(await p.locator('tr.in-band').count(), 0, 'still flat after a reload');
  await queue(p, '?grp=1'); assert.eq(await p.locator('tr.in-band').count(), 3, 'groups are the default');
  // the status filter All lists closed cases under their own heading; the closed filter alone is flat
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the payer line (D-02): the shared pulse strip, Simulated, See why opens the payer pattern and the denial insights, dismiss is remembered for the session', async () => {
  const p = await open('jperez'); await queue(p); const s = await state('jperez'); const pulse = payerPulse(s);
  const strip = p.locator('.in-pulse'); assert.eq(await strip.count(), 1); const t = (await strip.innerText()).replace(/\s+/g, ' ');
  assert.match(t, new RegExp(`New ${pulse.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · ${pulse.detail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · Suggestion lift 67% to 83% · about \\$28,000 at risk`)); assert.ok(await strip.locator('.ui-maturity--simulated').count() === 1, 'marked Simulated');
  await strip.getByRole('button', { name: 'See why' }).click(); const dlg = top(p); await dlg.waitFor(); assert.match(await dlg.locator('.ui-dialog__t').innerText(), /Payer intelligence update/);
  const dt = await dlg.innerText(); assert.match(dt, /What Sentara tends to do/); assert.match(dt, /Calls to offer fewer units/); assert.match(dt, /Analogous cases\s*312/i); assert.match(dt, /Reversed on first-level appeal\s*78%/i); assert.match(dt, /Peer-to-peer overturned\s*62%/i);
  assert.eq(await dlg.locator('[data-pattern] .in-bar').count(), 5, 'five strategies as bars'); assert.ok(await dlg.locator('.in-basis .ui-maturity--simulated').count() >= 2, 'the sample is marked Simulated with its basis'); assert.match(dt, /Illustrative sample from the demo data/);
  assert.deepEq(await dlg.locator('.in-ins [data-sec]').evaluateAll(els => els.map(e => e.dataset.sec)), ['reasons', 'actions', 'approval', 'overrides'], 'the denial insights, reasons first'); await shot(p, 'pulse-drawer-1440');
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'di-pulse-see', 'focus returns to See why');
  await strip.getByRole('button', { name: 'Dismiss this update' }).click(); await p.waitForTimeout(250); assert.eq(await p.locator('.in-pulse').count(), 0); assert.eq((await active(p)).id, 'di-insights-b', 'focus moves to the next control, not to nothing');
  await p.reload(); await p.waitForSelector('.ui-qt__row'); assert.eq(await p.locator('.in-pulse').count(), 0, 'stays dismissed for the session');
  const q = await open('jperez'); await queue(q); assert.eq(await q.locator('.in-pulse').count(), 1, 'a new session sees it again'); await q.ctx.close();
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('Insights (D-03): the button opens the denial insights (reasons first) in a side drawer for the clinician and the administrator; sample numbers are marked Simulated; focus returns', async () => {
  const before = (await events(/Facility insights opened/)).length; const p = await open('jperez'); await queue(p); const s = await state('jperez'); const ins = insights(s, 'denial');
  await p.getByRole('button', { name: 'Insights' }).click(); const dlg = top(p); await dlg.waitFor(); assert.match(await dlg.locator('.ui-dialog__t').innerText(), /Denial insights/);
  assert.deepEq(await dlg.locator('[data-sec]').evaluateAll(els => els.map(e => e.dataset.sec)), ins.sections); assert.deepEq(ins.sections, ['reasons', 'actions', 'approval', 'overrides']);
  assert.deepEq(await dlg.locator('.in-kpi__v').allInnerTexts(), ins.kpis.map(k => k.value)); assert.eq(await dlg.locator('.in-kpi').count(), 4); assert.eq(await dlg.locator('[data-sec=reasons] tbody tr').count(), 9, 'nine denial reasons by payer');
  assert.match(await dlg.innerText(), /Applied \d+ times/); assert.match(await dlg.innerText(), /% success/); assert.ok(await dlg.locator('.in-basis .ui-maturity--simulated').count() >= 1 && /Illustrative sample/.test(await dlg.locator('.in-basis').first().innerText()), 'Simulated, with the basis');
  await shot(p, 'insights-1440'); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'di-insights-b', 'focus returns to Insights');
  await p.waitForTimeout(300); assert.eq((await events(/Facility insights opened/)).length, before + 1, 'the clinician\'s open is logged (no text in it)'); await p.ctx.close();
  const a = await open('dowens'); await queue(a); await a.getByRole('button', { name: 'Insights' }).click(); const ad = top(a); await ad.waitFor();
  assert.deepEq((await ad.locator('.in-kpi__v').allInnerTexts()).slice(0, 3), ins.kpis.slice(0, 3).map(k => k.value), 'the administrator reads the same sample KPIs'); assert.match(await ad.locator('.in-kpi__l').nth(3).innerText(), /Autonomy rate/i); assert.ok(await ad.locator('.in-basis .ui-maturity--simulated').count() >= 1);
  assert.deepEq(await ad.locator('[data-sec]').evaluateAll(els => els.map(e => e.dataset.sec)), ins.sections); await a.keyboard.press('Escape'); assert.eq((await active(a)).id, 'di-insights-b');
  assert.deepEq(a.errs, [], a.errs.join('|')); await a.ctx.close();
});

await T.test('Analyze a denial (D-04): either file is enough, a stored document or a file name only, identifiers removed from the record, two streaming lists, then the appeal analysis; recorded and logged', async () => {
  await reset('canvas'); const p = await open('jperez'); await queue(p); const posted = [];
  p.on('request', r => { const d = r.postData(); if (d) posted.push(d); });
  const file = path.join(os.tmpdir(), 'Clinical Info.docx'); fs.writeFileSync(file, 'secret clinical text of the uploaded file');
  await p.getByRole('button', { name: 'Analyze a denial' }).click(); const dlg = top(p); await dlg.waitFor(); assert.match(await dlg.locator('.ui-dialog__t').innerText(), /Analyze a denial/);
  assert.match(await dlg.innerText(), /Add the denial letter and clinical documentation[\s\S]*Either one is enough/); assert.deepEq((await dlg.locator('.d-wz__steps li').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim()), ['1 Add the record', '2 Add context', '3 Analysis']);
  assert.eq(await dlg.locator('#d-wz-next').isDisabled(), true, 'Continue waits for a document'); assert.match(await dlg.locator('#d-wz-help').innerText(), /Add at least one document to continue\./);
  assert.deepEq(await dlg.locator('#d-wz-case option').allInnerTexts(), ['K.T., 16 · R-0408 · Anthem · Not decided yet', 'D.W., 15 · R-0402 · Sentara · 110 of 150 offered', 'T.N., 16 · R-0388 · Sentara · 65 of 150 approved', 'E.C., 15 · R-0384 · Anthem · 0 of 90 approved'], 'the open cases, most urgent first');
  await dlg.locator('#d-wz-case').selectOption('R-0402'); await p.waitForTimeout(200);
  assert.match(await dlg.locator('[data-slot=letter]').innerText(), /No stored decision letter is on file for this case\./, 'a phone offer has no letter on file');
  assert.deepEq(await dlg.locator('#d-wz-clinical-s option').allInnerTexts(), ['Choose an assessment or document on file', 'ASAM reassessment · Oct 9', 'ASAM initial assessment · Jul 21']);
  // a file: only its name is kept; its content never leaves the browser and the input is cleared
  await dlg.locator('#d-wz-clinical-f').setInputFiles(file); await p.waitForTimeout(200);
  assert.match(await dlg.locator('[data-got=clinical]').innerText(), /Clinical Info\.docx[\s\S]*file name only/); assert.eq(await dlg.locator('#d-wz-next').isDisabled(), false, 'either file is enough'); assert.match(await dlg.locator('#d-wz-help').innerText(), /Ready to continue/);
  assert.eq(await dlg.locator('#d-wz-clinical-f').inputValue(), '', 'the input holds no file'); assert.eq((await active(p)).id, 'd-wz-clinical-x', 'focus lands on Remove, which now exists');
  await dlg.locator('#d-wz-clinical-x').click(); assert.eq(await dlg.locator('#d-wz-next').isDisabled(), true, 'remove it and Continue waits again');
  await dlg.locator('#d-wz-clinical-s').selectOption({ label: 'ASAM reassessment · Oct 9' }); assert.eq(await dlg.locator('#d-wz-next').isDisabled(), false); assert.match(await dlg.locator('[data-got=clinical]').innerText(), /ASAM reassessment · Oct 9/);
  await dlg.locator('#d-wz-next').click(); await p.waitForTimeout(150);
  assert.match(await dlg.innerText(), /Add any additional context \(optional\)/); assert.eq((await active(p)).id, 'd-wz-h', 'focus moves to the step heading'); assert.match(await dlg.locator('[data-step="2"]').innerText(), /Clinical documentation: ASAM reassessment · Oct 9/);
  assert.eq(await dlg.locator('#d-wz-ctx').getAttribute('placeholder'), '(no additional context provided)');
  await dlg.locator('#d-wz-back').click(); assert.match(await dlg.innerText(), /Which consumer is this for/); assert.eq(await dlg.locator('#d-wz-next').isDisabled(), false, 'the choices are kept going back'); await dlg.locator('#d-wz-next').click();
  await dlg.locator('#d-wz-ctx').fill('Mother Tamika Wells called from 434-555-0171, member ID: ZX1234567. Group notes are in the chart.');
  await dlg.locator('#d-wz-run').click(); await p.waitForSelector('[data-step="3"]');
  // the sanitized record first
  const rec = dlg.locator('[data-record]'); const rt = await rec.innerText(); assert.match(rt, /CLINICAL DOCUMENTATION · ASAM reassessment · Oct 9/i); assert.match(rt, /From\s*Sentara Health Plans/); assert.match(rt, /Re\s*D\.W\. · Intensive outpatient · request R-0402/); assert.match(rt, /Service\s*IOP · H0015/); assert.match(rt, /Requested\s*150 units/);
  assert.match(rt, /Offered\s*110 units/); assert.match(rt, /Revenue at risk\s*\$8,200/); assert.match(rt, /Decision\s*Partial approval · 110 of 150 units offered/); assert.match(rt, /Rationale\s*We'd really like to give you 110\./);
  assert.match(rt, /Additional context\s*Mother \[client\] \[client\] called from \[removed\], \[removed\]\. Group notes are in the chart\./); assert.match(rt, /4 identifiers removed from your context/); assert.match(await dlg.innerText(), /Initials only\. Member number, names, phone numbers and birth dates removed\./);
  const html = await p.content(); assert.ok(!/Tamika|ZX1234567|555-0171/.test(html), 'no identifier is anywhere in the page after the record is built');
  // two streaming lists (an aria-live list each), the second marked Simulated with its basis
  assert.eq(await dlg.locator('#d-wz-s1 .in-steps').getAttribute('aria-live'), 'polite'); assert.eq(await dlg.locator('#d-wz-s1').getAttribute('data-total'), '8'); assert.match(await dlg.locator('#d-wz-r1').innerText(), /Reading and digesting the record/); assert.match(await dlg.locator('#d-wz-r2').innerText(), /Cross-referencing historical appeals[\s\S]*Simulated/);
  const seen = new Set(); for (let i = 0; i < 8; i++) { seen.add(await dlg.locator('#d-wz-s1').getAttribute('data-done')); await p.waitForTimeout(450); } assert.ok(seen.size >= 3, 'the first list streams one step at a time: ' + [...seen].join(','));
  await p.waitForFunction(() => { const e = document.querySelector('#d-wz-s2'); return e && e.getAttribute('data-total') === '7'; }, null, { timeout: 15000 });
  const lists = await dlg.locator('#d-wz-s1 li').allInnerTexts(); assert.ok(lists[0].startsWith('Parsing the record structure · 18 dated records on file'), lists[0]); assert.ok(lists.some(x => /Validating diagnoses against ICD-10/.test(x)));
  await p.waitForSelector('[data-analysis]', { timeout: 20000 }); await p.waitForTimeout(200);
  const an = top(p); assert.match(await an.locator('.ui-dialog__t').innerText(), /Analyze Denial/); assert.match(await an.innerText(), /Denial rationale[\s\S]*Sentara offered 110 of the 150 units requested/);
  const st = await state('jperez'); const d = D.byRequest(st, 'R-0402'); assert.eq(d.analysis.by, 'jperez', 'the analysis is recorded on the case'); assert.ok((await events(/Denial analysis run · R-0402/)).length === 1 && (await events(/Denial analyzed from stored records/)).length >= 1, 'two audit lines');
  assert.ok(!posted.some(x => /secret clinical text|Clinical Info|Tamika|ZX1234567|555-0171/.test(x)), 'the file, its name and the identifiers were never sent anywhere');
  assert.ok(!JSON.stringify(st.events).match(/Tamika|ZX1234567|Clinical Info/), 'nothing the clinician typed is in the audit text'); await shot(p, 'wizard-analysis-1440');
  await p.keyboard.press('Escape'); await an.waitFor({ state: 'detached' }); await p.waitForTimeout(250); assert.eq((await active(p)).id, 'di-analyze-b', 'focus returns to Analyze a denial');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('Analyze a denial: a denial letter alone is enough; a case with no stored letter says so; closing mid-run stops it and records nothing', async () => {
  await reset('canvas'); const p = await open('jperez'); await queue(p);
  await p.getByRole('button', { name: 'Analyze a denial' }).focus(); await p.keyboard.press('Enter'); const dlg = top(p); await dlg.waitFor(); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'focus moves into the drawer');
  await dlg.locator('#d-wz-case').selectOption('R-0384'); await p.waitForTimeout(150); assert.deepEq(await dlg.locator('#d-wz-letter-s option').allInnerTexts(), ['Choose a decision notice on file', 'Availity determination notice · Oct 22']);
  await dlg.locator('#d-wz-letter-s').selectOption({ index: 1 }); assert.eq(await dlg.locator('#d-wz-next').isDisabled(), false, 'the letter alone is enough'); await dlg.locator('#d-wz-next').click(); await dlg.locator('#d-wz-run').click(); await p.waitForSelector('[data-step="3"]');
  assert.match(await dlg.locator('[data-record]').innerText(), /DENIAL LETTER · Availity determination notice · Oct 22/i); assert.match(await dlg.locator('[data-record]').innerText(), /Decision\s*Denied · 0 of 90 units approved/);
  await p.waitForTimeout(700); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(1200);
  assert.eq(await p.locator('[role=dialog]').count(), 0, 'closing mid-run opens nothing'); assert.eq((await active(p)).id, 'di-analyze-b'); const d = D.byRequest(await state('jperez'), 'R-0384'); assert.ok(!d.analysis, 'nothing was recorded'); assert.eq((await events(/Denial analysis run/)).length, 0);
  // Tab stays inside the wizard
  await p.getByRole('button', { name: 'Analyze a denial' }).click(); await top(p).waitFor(); for (let i = 0; i < 30; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'Tab stays trapped in the drawer'); await p.keyboard.press('Escape');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the appeal analysis document (D-05, D-07) for R-0402, R-0384, R-0408 and R-0388: rationale, synthesis, findings tagged critical or strong, six dimensions, the payer pattern as a labelled sample, numbered suggestions', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); const s = await state('jperez');
  for (const id of CASES) {
    const d = D.byRequest(s, id); const r = reqOf(s, id); const a = appealAnalysis(s, d, r); await goCase(p, id);
    await p.getByRole('button', { name: 'Analyze Denial' }).click(); const dlg = top(p); await dlg.waitFor(); await p.waitForTimeout(200);
    assert.deepEq(await dlg.locator('.d-an h3').allInnerTexts(), ['Decision details', 'Denial rationale', 'Core clinical synthesis', 'Why this denial is contestable', a.dimensions.heading, `Payer pattern · ${a.pattern.first}`, 'What Psyflo would do'], id + ' the document, in order');
    assert.match(await dlg.locator('.in-ds').innerText(), /Decision support for authorization documentation and workflow only\. Not clinical guidance\./); assert.ok(await dlg.locator('.d-an__top .ui-maturity--simulated').count() === 1, id + ' marked Simulated');
    assert.eq((await dlg.locator('.d-an section').nth(1).locator('p').first().innerText()).trim(), a.rationale.text, id + ' rationale is the stored words'); assert.eq((await dlg.locator('.d-an section').nth(2).locator('p').first().innerText()).trim(), a.synthesis.text, id + ' synthesis is the stored sentences');
    assert.deepEq(await dlg.locator('[data-finding]').evaluateAll(els => els.map(e => [e.dataset.finding, e.dataset.sev])), a.findings.map(f => [f.key, f.sev]), id + ' findings and tags');
    assert.deepEq(await dlg.locator('[data-finding] .in-sev').allInnerTexts(), a.findings.map(f => f.sev.toUpperCase()), id + ' CRITICAL and STRONG tags');
    for (const f of a.findings) { const li = dlg.locator(`[data-finding="${f.key}"]`); assert.match(await li.innerText(), new RegExp(f.title.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); assert.eq(await li.locator('.ui-evidence').count(), f.evidence.length, id + ' ' + f.key + ' evidence chips'); }
    const rows = await dlg.locator('[data-dim]').evaluateAll(els => els.map(e => ({ n: e.dataset.dim, r: e.dataset.r, t: e.innerText.replace(/\s+/g, ' ') })));
    assert.deepEq(rows.map(x => x.n), ['1', '2', '3', '4', '5', '6'], id + ' six dimensions'); assert.deepEq(rows.map(x => x.r), a.dimensions.rows.map(x => String(x.rating)), id + ' ratings'); rows.forEach((x, i) => assert.match(x.t, new RegExp(`Rated ${a.dimensions.rows[i].rating} · ${a.dimensions.rows[i].ratingLabel}`), id + ' D' + (i + 1)));
    assert.deepEq(await dlg.locator('[data-dim] .ui-chip--warning').evaluateAll(els => els.map(e => e.closest('[data-dim]').dataset.dim)), a.dimensions.rows.filter(x => x.needsRecord).map(x => String(x.n)), id + ' the dimensions with no dated record say so');
    for (const x of a.dimensions.rows.filter(y => y.needsRecord)) assert.match(rows[x.n - 1].t, new RegExp(`No dated record on file for D${x.n}\\. Add one before replying\\.`));
    const pt = dlg.locator('[data-pattern]'); assert.ok(await pt.locator('.in-basis .ui-maturity--simulated').count() === 1, id + ' the pattern is marked Simulated'); assert.match(await pt.innerText(), /Illustrative sample from the demo data\. It is not Harvest's own history and it is not a prediction\./);
    assert.deepEq(await pt.locator('.in-kpi__v').allInnerTexts(), ['312', '78%', '62%'], id + ' analogous, reversed, overturned'); assert.eq(await pt.locator('.in-bar').count(), 5, id + ' strategies as bars'); assert.deepEq(await pt.locator('.in-bar__v').allInnerTexts(), ['78%', '72%', '67%', '66%', '57%'], id + ' ranked by success');
    assert.deepEq(await dlg.locator('[data-action]').evaluateAll(els => els.map(e => e.dataset.action)), a.actions.map(x => x.key), id + ' the numbered suggestions'); assert.eq(await dlg.locator('.d-act > li').first().evaluate(el => getComputedStyle(el, '::before').content), 'counter(dact)', 'numbered by a counter');
    assert.ok(!BANNED.test(await dlg.locator('.ui-dialog__t, .d-an h3, .in-sev, .d-an__sub, .d-dd__g dt, .d-act__t, .in-ds, .in-basis').allInnerTexts().then(a2 => a2.join(' '))), id + ' final wording: ' + (await dlg.innerText()).match(BANNED));
    if (id === 'R-0402') await shot(p, 'analysis-0402-1440');
    await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the analysis: Review opens that suggestion over the document and focus comes back to the button; an included suggestion shows as included in the analysis', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'Analyze Denial' }).click(); const an = top(p); await an.waitFor();
  await an.locator('#d-an-rec-cite-asam').click(); await p.waitForTimeout(250); assert.eq(await p.locator('[role=dialog]').count(), 2, 'the suggestions drawer opens over the analysis'); const rc = top(p); assert.match(await rc.locator('.ui-dialog__t').innerText(), /What Psyflo would do/);
  assert.ok(await p.evaluate(() => document.activeElement && !!document.activeElement.closest('[data-rec="cite-asam"]')), 'that card has focus'); await rc.locator('[data-rec="cite-asam"] [data-rc-check]').check(); await rc.getByRole('button', { name: /^Apply selected/ }).click(); await p.waitForTimeout(700);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await p.locator('[role=dialog]').count(), 1); assert.eq((await active(p)).id, 'd-an-rec-cite-asam', 'focus returns to the Review button of that action');
  assert.match(await p.locator('[data-action="cite-asam"]').innerText(), /Included/); assert.match(await p.locator('[data-action="cite-asam"]').getAttribute('data-state'), /included/);
  await an.locator('#d-an-recs').click(); await p.waitForTimeout(250); assert.eq(await p.locator('.rc__card').count(), 9, 'all nine, in the same drawer as the page'); await p.keyboard.press('Escape');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq((await active(p)).id, 'd-t-analyze', 'closing the document returns focus to Analyze Denial');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('Decision details strip (D-06, D-09): payer, service with code, requested, offered or approved, revenue at risk, decision and the rationale (clinician); the money chip is in the header too', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); const s = await state('jperez');
  for (const id of CASES) {
    const f = denialFields(s, D.byRequest(s, id), reqOf(s, id)); await goCase(p, id); const strip = p.locator('[data-decision-details]');
    assert.eq((await strip.locator('h2').innerText()).trim(), 'Decision details'); const get = async k => (await strip.locator(`[data-field="${k}"] dd`).innerText()).trim();
    assert.eq(await get('from'), f.payer.name); assert.eq(await get('service'), 'IOP · H0015'); assert.eq(await get('requested'), f.requested.text); assert.eq(await get('approved'), f.rows.find(x => x.key === 'approved').value); assert.eq(await get('risk'), f.risk.label); assert.eq(await get('decision'), f.decision.text);
    assert.eq((await strip.locator('[data-field=rationale]').innerText()).replace(/^Rationale\s*/i, '').trim(), f.rationale.text, id + ' the payer\'s reason, quoted from the stored notice');
    assert.match(await strip.locator('.in-money').getAttribute('title'), new RegExp(`${f.risk.units} units × \\$205 a unit \\(demo assumption\\)`), 'basis on hover'); assert.eq((await p.locator('.ui-hcard .in-money').innerText()).trim(), f.risk.label, id + ' the money chip in the case header');
    assert.deepEq(await p.$$eval('.d-body h2', hs => hs.map(h => h.innerText.trim())), ['Decision details', 'What Psyflo would do', 'Where the case stands', 'Packet', 'More'], 'one strip added, nothing else');
    assert.ok(!BANNED.test(await strip.innerText()) && !/TDT|H2016/.test(await p.locator('.ui-hcard').innerText()), id + ' final wording in the strip and the header: ' + (await p.locator('.ui-hcard').innerText()).match(BANNED));
  }
  await goCase(p, 'R-0402'); assert.match(await p.locator('.ui-hcard__s').innerText(), /Sentara Health Plans · IOP · H0015 · ASAM Level 2\.1 · Request R-0402/); await p.locator('#d-dd-more').click(); await p.waitForSelector('#d-h-said'); assert.match(await hash(p), /section=said/, 'More detail opens the full decision record');
  await goCase(p, 'R-0402'); await shot(p, 'overview-0402-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('suggestions drawer footer (D-08): Submit is disabled with its reason printed until a reviewed draft is ready, then opens the send step; Refine, Add clinical context and Dismiss suggestions work; Apply selected counts live; each is logged', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); await goCase(p, 'R-0408');
  await p.getByRole('button', { name: 'Review suggestions' }).click(); let dlg = top(p); await dlg.waitFor();
  const sub = dlg.locator('[data-rc-submit]'); assert.eq((await sub.innerText()).trim(), 'Open the send step'); assert.eq(await sub.isDisabled(), true); assert.eq((await dlg.locator('[data-rc-submit-why]').innerText()).trim(), 'No draft yet. Draft the reply from the Packet card first.', 'the reason is printed, not only in a tooltip');
  assert.eq(await sub.getAttribute('aria-describedby'), 'd-submit-why'); assert.deepEq(await dlg.locator('.rc__more button').allInnerTexts(), ['Refine suggestions', 'Add clinical context', 'Dismiss suggestions']);
  // Apply selected (n) counts the ticked cards live
  const free = await dlg.locator('.rc__card:not(:has([data-rc-ctx])) [data-rc-check]'); assert.ok(await free.count() >= 2); const applyN = async () => (await dlg.locator('[data-rc-n]').innerText()).trim(); assert.eq(await applyN(), '0'); await free.nth(0).check(); await free.nth(1).check(); assert.eq(await applyN(), '2', 'the count follows the ticks'); await free.nth(1).uncheck(); assert.eq(await applyN(), '1'); assert.match((await dlg.locator('[data-rc-apply]').innerText()).replace(/\s+/g, ' '), /^Apply selected \( ?1 ?\)$/);
  // Refine: checked against the record again, logged
  await dlg.getByRole('button', { name: 'Refine suggestions' }).click(); await p.waitForTimeout(500); assert.match(await txt(p, '#toasts'), /Checked against the record again/); assert.eq((await events(/Suggestions refined against the record · R-0408/)).length, 1);
  // Add clinical context: opens the add form titled for context; saving adds the clinician's own suggestion; logged without the text
  await dlg.getByRole('button', { name: 'Add clinical context' }).click(); const form = dlg.locator('[data-rc-addform]'); assert.eq(await form.isVisible(), true); assert.eq(await form.locator('input[name=title]').inputValue(), 'Clinical context'); assert.ok(await p.evaluate(() => document.activeElement && document.activeElement.name === 'text'), 'focus is in the words box');
  await form.locator('textarea[name=text]').fill('The client was seen twice in the last week; both visits are in the chart.'); await form.getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(700);
  assert.ok((await state('jperez')).rec_decisions.some(x => x.custom && x.title === 'Clinical context' && x.state === 'included'), 'stored as the clinician\'s own suggestion'); assert.eq((await events(/Clinical context added · R-0408/)).length, 1); assert.ok(!JSON.stringify((await state('jperez')).events).includes('seen twice in the last week'), 'the words stay out of the audit text');
  // make the info draft ready (the clinician writes the missing item and reviews), then Submit opens the existing send step
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await api('dispute.genDoc', { id: 'R-0408', doc: 'info' }, 'jperez'); const doc = D.byRequest(await state('jperez'), 'R-0408').docs.info; const gap = doc.sections.find(x => /Evidence missing/.test(x.text));
  await api('dispute.editDoc', { id: 'R-0408', doc: 'info', section: gap.key, text: gap.text.replace(/\[Evidence missing — verify [^\]]*\]/g, 'The clinician adds the withdrawal screen and the last-use date.') }, 'jperez');
  await p.reload(); await p.waitForSelector('.d-wwd'); await p.getByRole('button', { name: 'Review suggestions' }).click(); dlg = top(p); await dlg.waitFor(); assert.eq(await dlg.locator('[data-rc-submit]').isDisabled(), true); assert.eq((await dlg.locator('[data-rc-submit-why]').innerText()).trim(), 'Review the draft first, then it can be sent.'); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await api('dispute.reviewDoc', { id: 'R-0408', doc: 'info' }, 'jperez'); await p.reload(); await p.waitForSelector('.d-wwd'); await p.getByRole('button', { name: 'Review suggestions' }).click(); dlg = top(p); await dlg.waitFor();
  assert.eq(await dlg.locator('[data-rc-submit]').isDisabled(), false, 'ready'); assert.eq(await dlg.locator('[data-rc-submit-why]').count(), 0, 'no reason when it is ready');
  await dlg.locator('[data-rc-submit]').click(); await p.waitForTimeout(500); const send = top(p); assert.match(await send.locator('.ui-dialog__t').innerText(), /^Send$/); assert.match(await send.innerText(), /Send the reply to the information request to Anthem/); assert.eq(await p.locator('.rc').count(), 0, 'the suggestions drawer closed'); assert.eq((await events(/Opened the send step · R-0408/)).length, 1);
  await p.keyboard.press('Escape'); await send.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'd-rec-open', 'focus returns to the opener of the drawer');
  // Dismiss suggestions: all of them, logged; they can be brought back
  await p.getByRole('button', { name: 'Review suggestions' }).click(); dlg = top(p); await dlg.waitFor(); const n = await dlg.locator('.rc__card').count(); await dlg.getByRole('button', { name: 'Dismiss suggestions' }).click(); await p.waitForTimeout(700);
  const dec = (await state('jperez')).rec_decisions.filter(x => x.scope === 'denial' && x.ref === 'R-0408'); assert.ok(dec.filter(x => x.state === 'dismissed').length === n - 0 || dec.filter(x => x.state === 'dismissed').length >= n - 1, 'every suggestion on the list is dismissed');
  assert.eq(await dlg.locator('.rc__card').count(), 0); assert.eq(await dlg.locator('[data-rc-dismissall]').count(), 0, 'nothing left to dismiss'); assert.match(await dlg.locator('.rc__gone summary').innerText(), /dismissed suggestions?/); assert.eq((await events(/All suggestions dismissed · R-0408/)).length, 1); assert.match(await txt(p, '#toasts'), /dismissed\. Bring them back from the list below/);
  await p.keyboard.press('Escape'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the same footer from the queue chip: Submit is disabled with its reason there too, and a ready draft takes the clinician to the reply that holds the send step', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); await queue(p);
  await p.locator('#d-sug-R-0402').click(); let dlg = top(p); await dlg.waitFor(); assert.eq(await dlg.locator('[data-rc-submit]').isDisabled(), true); assert.match(await dlg.locator('[data-rc-submit-why]').innerText(), /There is no reply to send yet\. Choose a path in All paths, draft it, then review it\./); assert.deepEq(await dlg.locator('.rc__more button').allInnerTexts(), ['Refine suggestions', 'Add clinical context', 'Dismiss suggestions']);
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await api('dispute.genDoc', { id: 'R-0408', doc: 'info' }, 'jperez'); const d = D.byRequest(await state('jperez'), 'R-0408'); const gap = d.docs.info.sections.find(x => /Evidence missing/.test(x.text));
  await api('dispute.editDoc', { id: 'R-0408', doc: 'info', section: gap.key, text: gap.text.replace(/\[Evidence missing — verify [^\]]*\]/g, 'The clinician adds the withdrawal screen.') }, 'jperez'); await api('dispute.reviewDoc', { id: 'R-0408', doc: 'info' }, 'jperez');
  await p.reload(); await p.waitForSelector('.ui-qt__row'); await p.locator('#d-sug-R-0408').click(); dlg = top(p); await dlg.waitFor(); assert.eq(await dlg.locator('[data-rc-submit]').isDisabled(), false); await dlg.locator('[data-rc-submit]').click(); await p.waitForSelector('#d-h-info', { timeout: 6000 });
  assert.match(await hash(p), /DenialCase\?id=R-0408&section=action&action=info/); assert.eq(await p.locator('[role=dialog]').count(), 0); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('administrator: money, due-in, the payer line and Insights; no suggestion, no rationale, no analysis, no wizard, nothing clinical in the page or the data', async () => {
  await reset('canvas'); await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'cite-asam', state: 'included', context: 'Private clinician words.' }, 'jperez');
  const p = await open('dowens'); await queue(p); const s = await state('dowens');
  assert.deepEq(await p.$$eval('tr.in-band th', ths => ths.map(t => t.innerText.replace(/\s+/g, ' ').trim())), ['Highest financial risk · act now 1 case', 'Due this week 1 case', 'Later 2 cases'], 'urgency groups for the administrator too');
  assert.deepEq(await p.$$eval('.ui-qt__row .in-money', els => els.map(e => e.innerText.trim())), ['$30,750 at risk', '$8,200 at risk', '$17,425 at risk', '$18,450 at risk']); assert.deepEq(await p.$$eval('.in-due', els => els.map(e => e.innerText.trim())), ['Due in 2h', 'Due tomorrow', 'Due Dec 9', 'Due Dec 21']);
  assert.eq(await p.locator('.in-pulse').count(), 1, 'the payer line'); assert.match(await txt(p, '.in-pulse'), /Sentara partial approvals for IOP rose 31% this week/); assert.eq(await p.getByRole('button', { name: 'Insights' }).count(), 1);
  assert.eq(await p.locator('.d-sug, .in-needs, .d-lift, #di-analyze-b').count(), 0, 'no suggestions, needs-input, lift or wizard'); assert.ok(!(await p.$$eval('.ui-qt__table thead th', ths => ths.map(t => t.innerText.trim()))).includes('Suggestions')); assert.eq(await p.locator('main .in-basis').count(), 0, 'no sample lift is shown, so no basis line either');
  assert.ok(!/Historically improves|Needs input|Analyze a denial|Private clinician/.test(await txt(p)), 'no clinical copy'); assert.ok((s.intel_sample.pulse || {}).payer === 'sentara' && (s.rec_outcomes || []).length > 0, 'the sample numbers the payer line and insights read are in the administrator\'s data'); assert.eq(s.rec_decisions.length, 0, 'but no decision rows');
  await p.getByRole('button', { name: 'See why' }).click(); let dlg = top(p); await dlg.waitFor(); const dt = await dlg.innerText(); assert.match(dt, /Sentara partial approvals for IOP rose 31% this week/); assert.match(dt, /Clinical views are for the treating clinician/); assert.ok(!/What Sentara tends to do|Calls to offer fewer units|Strategies, ranked/.test(dt), 'the payer\'s strategies are the clinician\'s'); assert.ok(await dlg.locator('.in-ins').count() === 1, 'the insights stay'); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await goCase(p, 'R-0402'); const strip = p.locator('[data-decision-details]'); assert.eq((await strip.locator('[data-field=risk]').innerText()).replace(/\s+/g, ' ').trim().replace(/^REVENUE AT RISK\s*/i, ''), '$8,200 at risk'); assert.eq(await strip.locator('[data-field=rationale]').count(), 0, 'no rationale');
  assert.match(await strip.innerText(), /The payer's reason is for the treating clinician/); assert.eq(await p.locator('.ui-hcard .in-money').count(), 1, 'the money chip in the header');
  assert.eq(await p.getByRole('button', { name: 'Analyze Denial' }).count(), 0); assert.ok(!/We'd really like|ASAM Level 2\.1 is still needed|Cite the ASAM|ratings support/i.test(await p.content()), 'not even in the DOM'); await shot(p, 'admin-overview-1440');
  for (const [a, args] of [['intel.event', { kind: 'insights', scope: 'denial' }], ['dispute.analyze', { id: 'R-0402' }]]) { const r = await tryApi(a, args, 'dowens'); assert.ok(!r.ok && r.status === 403, a + ' is refused for an administrator: ' + r.status); }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('supervisor: Denial Intelligence stays hidden from the role, and the data holds no denial case; the sample numbers (no client data) are present for Insights elsewhere', async () => {
  const p = await open('cdiaz'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForTimeout(800); assert.match(await txt(p), /Not available for Site supervisor/); assert.eq(await p.locator('.ui-qt__row, .in-pulse').count(), 0);
  const s = await state('cdiaz'); assert.eq(s.disputes.length, 0); assert.eq(s.dispute_evidence.length, 0); assert.eq(s.rec_decisions.length, 0); assert.ok(Object.keys(s.intel_sample).length > 0 && s.rec_outcomes.length > 0, 'the aggregate sample is there'); assert.ok(!JSON.stringify(s.intel_sample).match(/"client"|initials/), 'and holds no client data');
  const r = await tryApi('dispute.analyze', { id: 'R-0402' }, 'cdiaz'); assert.ok(!r.ok && r.status === 403); assert.deepEq(p.errs.filter(e => !/403|404/.test(e)), [], p.errs.join('|')); await p.ctx.close();
});

await T.test('keyboard and focus: every new opener is reachable and operable without a mouse, Escape closes the top layer, focus returns to the opener', async () => {
  await reset('canvas'); const p = await open('jperez', 1440, { reduce: true }); await queue(p);
  for (const [name, id] of [['Insights', 'di-insights-b'], ['Analyze a denial', 'di-analyze-b'], ['See why', 'di-pulse-see'], [/^Filters/, 'di-filters-b']]) {
    const b = p.getByRole('button', { name }).first(); await b.focus(); await p.keyboard.press(name === 'Insights' ? 'Space' : 'Enter'); await top(p).waitFor(); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), `${name}: focus moved in`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert.eq(await p.locator('[role=dialog]').count(), 0); assert.eq((await active(p)).id, id, `${name}: focus returns`);
  }
  // the grouping switch and the Urgency select are real controls with labels
  await p.getByRole('button', { name: /^Filters/ }).click(); const dlg = top(p); await dlg.waitFor(); assert.ok(await dlg.getByLabel('Group by urgency').count() === 1 && (await dlg.locator('#di-fx-urg').evaluate(e => e.labels.length)) === 1, 'labelled controls');
  await dlg.getByLabel('Group by urgency').focus(); await p.keyboard.press('Space'); await p.waitForTimeout(250); assert.eq(await p.locator('tr.in-band').count(), 0, 'Space toggles the switch'); await p.keyboard.press('Escape');
  // the wizard by keyboard: Tab to the file input, the select, Continue
  await p.getByRole('button', { name: 'Analyze a denial' }).click(); const wz = top(p); await wz.waitFor(); await wz.locator('#d-wz-clinical-s').focus(); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Tab'); assert.eq((await active(p)).id, 'd-wz-clinical-f'); assert.eq(await wz.locator('#d-wz-next').isDisabled(), false, 'the select changed by keyboard counts');
  await wz.locator('#d-wz-next').focus(); await p.keyboard.press('Enter'); assert.eq((await active(p)).id, 'd-wz-h'); const unnamed = await wz.locator('button, select, input, textarea').evaluateAll(els => els.filter(e => !(e.getAttribute('aria-label') || e.innerText || (e.labels && e.labels.length) || e.getAttribute('title') || '').toString().trim()).length); assert.eq(unnamed, 0, 'every control has a name');
  await p.keyboard.press('Escape'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('390 px: no horizontal scroll on the queue, the Filters, Insights, payer line and wizard drawers, the analysis or the strip; touch targets are 44 px', async () => {
  await reset('canvas'); const p = await open('jperez', 390, { reduce: true });
  const noScroll = async what => { await p.waitForTimeout(250); const o = await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, dsw: d ? d.scrollWidth : 0, dcw: d ? d.clientWidth : 0 }; }); assert.ok(o.sw <= o.cw + 1, `${what}: page ${o.sw} > ${o.cw}`); assert.ok(o.dsw <= o.dcw + 1, `${what}: drawer ${o.dsw} > ${o.dcw}`); };
  const small = async (sel, what) => { const bad = await p.$$eval(sel, els => els.filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).map(b => (b.innerText || b.getAttribute('aria-label') || b.id || '').trim().slice(0, 28) + ' ' + Math.round(b.getBoundingClientRect().height))); assert.deepEq(bad, [], `${what}: ${bad.join(', ')}`); };
  await queue(p); await noScroll('queue'); await small('.d-hact .ui-btn, #di-filters-b, .in-pulse .ui-btn', 'queue buttons'); await shot(p, 'queue-390');
  await p.locator('.in-pulse').getByRole('button', { name: 'See why' }).click(); await top(p).waitFor(); await noScroll('payer line drawer'); await shot(p, 'pulse-drawer-390'); await p.keyboard.press('Escape');
  await p.getByRole('button', { name: 'Insights' }).click(); await top(p).waitFor(); await noScroll('insights drawer'); await p.keyboard.press('Escape');
  await p.getByRole('button', { name: /^Filters/ }).click(); await top(p).waitFor(); await noScroll('filters drawer'); await small('[role=dialog] .d-sw, [role=dialog] .ui-select', 'filters'); await p.keyboard.press('Escape');
  await p.getByRole('button', { name: 'Analyze a denial' }).click(); const wz = top(p); await wz.waitFor(); await noScroll('wizard step 1'); await small('[role=dialog] .d-wz .ui-btn, [role=dialog] .d-wz .ui-select', 'wizard step 1'); await shot(p, 'wizard1-390');
  await wz.locator('#d-wz-clinical-s').selectOption({ index: 1 }); await wz.locator('#d-wz-next').click(); await noScroll('wizard step 2'); await small('[role=dialog] .d-wz .ui-btn', 'wizard step 2'); await wz.locator('#d-wz-run').click(); await p.waitForSelector('[data-analysis]', { timeout: 10000 });
  await noScroll('analysis'); await shot(p, 'analysis-390'); await small('[role=dialog] .d-an .ui-btn, [role=dialog] .d-an .ui-evidence', 'analysis'); await p.keyboard.press('Escape');
  for (const id of CASES) { await goCase(p, id); await noScroll('overview ' + id); await small('.d-dd .ui-btn, .d-wwd .ui-btn, .d-stand .ui-btn, .d-tools .ui-btn', 'overview ' + id); }
  await goCase(p, 'R-0402'); await shot(p, 'overview-390'); await p.getByRole('button', { name: 'Review suggestions' }).click(); await top(p).waitFor(); await noScroll('suggestions drawer with the footer'); await small('[role=dialog] .rc__more .ui-btn, [role=dialog] [data-rc-submit]', 'footer'); await p.keyboard.press('Escape');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await browser.close();
await T.done();
