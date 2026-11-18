// R7 · Owner C: the Oprox features in the extension panel (X-01 authorization path, X-02 denial packet, X-03 home), in a real browser beside the mock Lauris.
// Standalone: `BASE=http://localhost:6500 node test/intel-panel.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves:
//   X-01  the authorization path shows the case strip (due, dollars at risk, expected approval, model confidence, comparable cases, the historical line, the Simulated chip
//         and basis, the decision-support line), the collapsed Payer criteria accordion (status line, Documented / Needs strengthening rows with their evidence note, what to
//         include) and the collapsed Clinical trajectory accordion (summary, chart with a text table, key drivers, risk signals, evidence chips), all read from the stored
//         record through the platform's selectors
//   footer  Apply selected (n), Refine suggestions, Add clinical context and Dismiss suggestions are logged with intel.event exactly as the platform logs them; the panel has
//         no Submit and sends nothing; Apply selected still types the included text in yellow and never twice
//   X-02  the denial packet shows the parsed fields, the findings (CRITICAL / STRONG, a stored-fact paragraph, evidence chips), the six dimensions (collapsed), the payer
//         pattern (stored behaviour, then the labelled sample), then the numbered suggestions with the same footer
//   X-03  the home tile of the open case shows the due-in chip and the dollars-at-risk chip
//   the other roles get none of it; the new wording is clean; 400 px and 320 px without sideways scroll; keyboard; no page errors
import { suite, assert, api, tryApi, state, reset, session, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';
import { headerOf, trajectoryOf, criteriaView, historicalView } from '../web/js/shared/sel/auth-intel.js';
import { appealAnalysis, denialFields } from '../web/js/shared/sel/denial-intel.js';
import { authRecsFor, denialRecsFor } from '../web/js/shared/recs.js';
import { byRequest } from '../web/js/shared/sel/disputes.js';
import { INTEL_BASIS, DECISION_SUPPORT } from '../web/js/shared/intel.js';

const T = suite('intel-panel');
const { chromium } = playwright();
const snap = async () => (await fetch(LAURIS + '/__test/lauris')).json();
const until = async (fn, ms = 15000, step = 200) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) { } await new Promise(r => setTimeout(r, step)); } return false; };
const WORDS = /\b(school|student|TDT|therapeutic day treatment|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
const squash = t => String(t || '').replace(/\s+/g, ' ').trim();
// ONLY=<regex on the title> runs a few tests while developing (each test after the first starts from its own reset and page, or says what it needs)
const test = (title, fn) => (!process.env.ONLY || new RegExp(process.env.ONLY, 'i').test(title) ? T.test(title, fn) : null);

await reset('canvas');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
const errs = errors(p);
if (process.env.DEBUG_HTTP) p.on('response', async r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url(), (r.request().postData() || '').slice(0, 300), (await r.text().catch(() => '')).slice(0, 200)); });
const frame =() => p.frames().find(f => f.url().includes('/panel/'));
const panel = () => p.frameLocator('#psyflo-frame');
const card = key => panel().locator(`.prc[data-rec="${key}"]`);
const ptext = async () => squash(await frame().locator('#panel').innerText());          // as a person reads it (CSS capitals applied)
const text = async loc => squash(await loc.first().textContent());                     // the words as written
const acc = id => panel().locator(`details[data-acc="${id}"]`);
const openAcc = async id => { const d = acc(id); if (!(await d.evaluate(e => e.open))) await d.locator('> summary').click(); await until(async () => await d.evaluate(e => e.open)); return d; };
const closed = async id => !(await acc(id).evaluate(e => e.open));
async function open(as, path, ready = '#panel .body, #panel .idcard') {
  await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`);
  await p.waitForSelector('#psyflo-frame', { timeout: 15000 });
  assert.ok(await until(async () => { const f = frame(); return f && await f.evaluate(sel => !!document.querySelector(sel), ready); }, 15000), 'the panel is ready on ' + path);
  await p.waitForTimeout(500);
}
const formValues = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => { const e = document.getElementById(l.htmlFor); return [l.textContent.trim(), { v: e.tagName === 'SELECT' ? (e.options[e.selectedIndex] || {}).text || '' : e.value, typed: e.dataset.psyflo === 'typed', bg: getComputedStyle(e).backgroundColor }]; })));
const overflow = () => frame().evaluate(() => { const w = document.documentElement.clientWidth; return { w, sx: document.documentElement.scrollWidth - w, wide: [...document.querySelectorAll('#panel *')].filter(e => !e.closest('.sr,.ui-sr') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > w + 1).map(e => ((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.tagName) + ':' + Math.round(e.getBoundingClientRect().right)).slice(0, 5) }; });
const openAll = async () => { await frame().evaluate(() => document.querySelectorAll('#panel details').forEach(d => { d.open = true; })); await p.waitForTimeout(400); };
const req = (s, id) => s.requests.find(r => r.id === id);
const events = async (n0) => (await state('jperez')).events.slice(n0).map(e => e.what);
const sig = async () => { const s = await state('jperez'); return { s, me: (await session('jperez')).actor }; };

try {
  // ------------------------------------------------------------------------------------------------ X-01 the case strip
  await test('X-01 the authorization path opens with the case strip: dollars at risk, due-in, expected approval, model confidence, comparable cases, the historical line, the Simulated chip and basis, decision support', async () => {
    await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    const { s, me } = await sig(); const r = req(s, 'R-0402'); const h = headerOf(s, r, me); const hv = historicalView(s, r);
    assert.deepEq([h.expected.base, h.expected.expected, h.confidence.value, h.comparable.count, h.risk.dollars, h.urgency.label], [62, 96, 0.89, 142, 8200, 'Due tomorrow'], 'the seeded values behind the strip');
    const strip = panel().locator('[data-px="strip"]'); assert.eq(await strip.count(), 1, 'one strip');
    const t = await text(strip);
    assert.ok(t.includes(DECISION_SUPPORT), 'the decision-support line: ' + t.slice(0, 120));
    assert.match(t, /Due tomorrow/); assert.match(t, /\$8,200 at risk/);
    assert.match(squash(await strip.locator('[data-k="expected"]').innerText()), /Expected approval\s*62%\s*→\s*to\s*96%/i);
    assert.match(squash(await strip.locator('[data-k="confidence"]').innerText()), /Model confidence\s*0\.89\s*Validated on similar cases/i);
    assert.match(squash(await strip.locator('[data-k="comparable"]').innerText()), /Comparable cases\s*142\s*Sentara Health Plans/i);
    const it = hv.interpretation; assert.ok(t.includes(`Current historical alignment: ${it.label}`), 'the historical alignment: ' + it.label); assert.eq(it.label, 'Approval-favorable with documentation completion');
    const lk = await strip.locator('.pxs-lk li').evaluateAll(els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    assert.deepEq(hv.outcomes.map(o => o.likelihood), [72, 67, 36]); assert.eq(lk.length, 3);
    hv.outcomes.forEach((o, i) => { assert.ok(lk[i].includes(`${o.likelihood}%`) && lk[i].includes(o.kind === 'approved' ? 'Approved' : 'Denied') && lk[i].includes('modeled approval likelihood'), 'likelihood ' + i + ': ' + lk[i]); });
    // the sample is labelled: the Simulated chip and the basis sentence sit in the strip
    assert.ok(t.includes('Simulated') && t.includes(INTEL_BASIS), 'the Simulated chip and the basis sentence'); assert.ok(await strip.locator('.ui-chip', { hasText: 'Simulated' }).count() >= 1);
    // dollars on hover: the basis of the number
    assert.match(await strip.locator('.in-money').getAttribute('title'), /40 units × \$205 a unit \(demo assumption\)/);
    // the strip sits above the suggestions; the two accordions sit below them
    assert.match(await ptext(), /Decision support[\s\S]*Expected approval[\s\S]*Historical outcomes[\s\S]*Suggested by Psyflo[\s\S]*Payer criteria[\s\S]*Clinical trajectory/i);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-auth.png' }).catch(() => { });
  });

  // ------------------------------------------------------------------------------------------------ X-01 payer criteria
  await test('X-01 Payer criteria: collapsed with its count; opens to the status line, the rows with Documented / Needs strengthening and the evidence note, and what to include', async () => {
    const { s } = await sig(); const cv = criteriaView(s, req(s, 'R-0402'));
    assert.ok(await closed('px-crit'), 'collapsed by default');
    assert.match(await text(acc('px-crit').locator('> summary')), /Payer criteria\s*1 item needs strengthening/);
    await openAcc('px-crit'); const d = acc('px-crit');
    assert.eq(await text(d.locator('[data-crit-status]')), cv.status.text); assert.eq(cv.status.text, '1 item needs strengthening before submission');
    assert.match(await text(d.locator('[data-crit-sum]')), /7 of 8 documented/);
    assert.eq(await d.locator('li.pxc').count(), cv.rows.length);
    for (const x of cv.rows) {
      const li = d.locator(`li.pxc[data-crit="${x.key}"]`); assert.eq(await li.count(), 1, x.key); assert.eq(await li.getAttribute('data-state'), x.state);
      const t = await text(li); assert.ok(t.includes(x.text), x.key + ' carries the evidence note: ' + t.slice(0, 120)); assert.ok(t.includes(x.label), x.key + ' label');
      assert.ok(t.includes(x.state === 'documented' ? 'Documented' : 'Needs strengthening'), x.key + ' pill');
      assert.eq(await li.locator('[data-pill]').getAttribute('data-pill'), x.state === 'documented' ? 'documented' : 'needs', 'a pill with words and an icon, not colour alone');
    }
    assert.eq(cv.rows.filter(x => x.state === 'needs').map(x => x.key).join(), 'clock', 'the reassessment clock is the one item to strengthen');
    // what to include: the suggestion titles from the engine, each with its state
    const inc = await d.locator('[data-inc]').evaluateAll(els => els.map(e => ({ key: e.dataset.inc, text: e.textContent.replace(/\s+/g, ' ').trim() })));
    assert.deepEq(inc.map(x => x.key), cv.maximize.include.map(x => x.key)); cv.maximize.include.forEach((x, i) => assert.ok(inc[i].text.includes(x.title), 'title: ' + x.title));
    assert.match(inc.find(x => x.key === 'risk').text, /Needs your words/);
    const why = await text(d.locator('[data-crit-max]')); assert.ok(why.includes('Why this matters for Sentara Health Plans') && why.includes('What to include in your submission') && why.includes('To maximize approval probability'));
    assert.ok(why.includes('Does not meet ASAM Level 2.1 criteria') && why.includes('Simulated') && why.includes(INTEL_BASIS), 'the denial reasons come from the sample and say so');
    assert.ok(await d.locator('.ui-evidence').count() === 0, 'criteria rows carry the sentence of the record (no chips needed)');
  });
  await test('"See suggestion" shows every card, brings the one it names into view and puts focus on it', async () => {
    await acc('px-crit').locator('li.pxc[data-crit="d3"] [data-act="recSee"]').click();
    assert.ok(await until(async () => await card('d3-cite').count() === 1), 'the card of D3 is shown although it was not in the first three');
    assert.ok(await until(async () => await card('d3-cite').evaluate(e => e.contains(document.activeElement) && e.classList.contains('prc-focus'))), 'focus is on that card');
    assert.ok(await card('d3-cite').evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'and it is in view');
  });

  // ------------------------------------------------------------------------------------------------ X-01 clinical trajectory
  await test('X-01 Clinical trajectory: summary lines, the chart with its text table, the current values, key drivers and risk signals, each with evidence chips', async () => {
    const { s } = await sig(); const tv = trajectoryOf(s, req(s, 'R-0402'));
    assert.ok(await closed('px-traj'), 'collapsed by default'); assert.match(await text(acc('px-traj').locator('> summary')), /Clinical trajectory\s*4 risk signals/);
    await openAcc('px-traj'); const d = acc('px-traj');
    for (const x of tv.summary) { const row = d.locator(`[data-tj="summary"] > div[data-key="${x.key}"]`); assert.eq(await row.count(), 1, x.key); const t = await text(row); assert.ok(t.includes(x.label) && t.includes(x.value), x.key + ': ' + t); }
    assert.ok((await text(d.locator('[data-tj="summary"] [data-key="trajectory"]'))).includes('Lower risk: D4 3 to 2 since Jul 21'), 'the trajectory is computed from two stored assessments');
    // the chart: an image with a name, and the same numbers as a table
    const fig = d.locator('figure.in-chart').first(); assert.eq(await fig.locator('svg[role="img"]').getAttribute('aria-label'), tv.trend.title);
    const tbl = fig.locator('table'); assert.eq(await text(tbl.locator('caption')), tv.trend.title);
    assert.eq(await tbl.locator('thead th').count(), tv.trend.series.length + 1); assert.eq(await tbl.locator('tbody tr').count(), tv.trend.labels.length);
    const rows = await tbl.locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(c => c.textContent.trim())));
    tv.trend.labels.forEach((lb, i) => assert.deepEq(rows[i], [lb, ...tv.trend.series.map(sr => String(sr.points[i]))], 'table row ' + lb));
    assert.ok(await fig.locator('.in-chart__legend li').count() === tv.trend.series.length, 'a legend in words');
    for (const c of tv.trend.callouts) assert.ok((await text(d)).includes(`Current ${c.name}`), 'current value: ' + c.name);
    // key drivers: the dimensions rated 2 or more, each with the stored sentence and its records
    assert.deepEq(await d.locator('[data-tj="drivers"] > li').evaluateAll(l => l.map(e => +e.dataset.dim)), tv.drivers.map(x => x.n)); assert.deepEq(tv.drivers.map(x => x.n), [5, 6, 3, 4]);
    for (const x of tv.drivers) { const li = d.locator(`[data-tj="drivers"] > li[data-dim="${x.n}"]`); const t = await text(li); assert.ok(t.includes(x.text) && t.includes(`Rated ${x.rating} · ${x.ratingLabel}`), 'D' + x.n); assert.ok(await li.locator('.ui-evidence').count() >= 1, 'D' + x.n + ' has evidence chips'); }
    // risk signals: from records and rules, with the evidence behind them
    const risks = await d.locator('[data-tj="risks"] > li').evaluateAll(l => l.map(e => ({ tone: e.dataset.tone, text: e.textContent.replace(/\s+/g, ' ').trim() })));
    assert.eq(risks.length, tv.risks.length); tv.risks.forEach((x, i) => { assert.eq(risks[i].tone, x.tone); assert.ok(risks[i].text.includes(x.text), 'risk: ' + x.key); });
    assert.deepEq(tv.risks.map(x => x.key), ['incident', 'd5-high', 'd6-high', 'inputs']);
    assert.ok(await d.locator('[data-tj="risks"] li[data-tone="danger"] .ui-evidence').count() === 1, 'the incident has its record chip'); assert.ok((await text(d.locator('[data-tj="risks"] li[data-tone="danger"]'))).includes('Needs action'), 'a word, not only a colour');
    assert.match(await text(d.locator('[data-tj="engagement"]')), /80%\s*Attended 8 of 10 scheduled groups, from the stored record/);
    // evidence chips open the stored record
    await d.locator('[data-tj="risks"] .ui-evidence').first().click(); await p.waitForTimeout(400);
    assert.ok((await frame().locator('body').innerText()).includes('Emergency department visit') || await frame().locator('.ui-pop, [role="dialog"], [role="tooltip"]').count() >= 1, 'the chip opens the quote of the record');
    await p.keyboard.press('Escape');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-trajectory.png' }).catch(() => { });
  });

  // ------------------------------------------------------------------------------------------------ the footer
  await test('footer: Apply selected shows its count; Refine, Add clinical context and Dismiss suggestions are logged with intel.event; the panel has no Submit', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    const list = authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')); assert.ok(list.length >= 6);
    assert.ok(await panel().getByRole('button', { name: 'Apply selected (0)' }).isDisabled(), 'nothing included: Apply selected (0) is off');
    assert.eq(await panel().getByRole('button', { name: /Submit/ }).count(), 0, 'the panel never sends: no Submit button'); assert.match(await ptext(), /Nothing is sent from here/);
    for (const name of ['Refine suggestions', 'Add clinical context', 'Dismiss suggestions']) assert.eq(await panel().getByRole('button', { name }).count(), 1, name);
    // include one: the count follows
    await card('level-cite').getByRole('button', { name: 'Include' }).click();
    assert.ok(await until(async () => await panel().getByRole('button', { name: 'Apply selected (1)' }).count() === 1), 'Apply selected (1)');
    // Refine with nothing dismissed: logged, says so
    let n0 = (await state('jperez')).events.length;
    await panel().getByRole('button', { name: 'Refine suggestions' }).click();
    assert.ok(await until(async () => (await events(n0)).some(w => w === 'Suggestions refined against the record · R-0402')), 'refine is in the audit trail: ' + (await events(n0)).join(' | '));
    await panel().getByText(/Checked against the record again\. Nothing new to suggest/).first().waitFor({ timeout: 8000 });
    // dismiss one, then Refine brings it back
    await card('d6-cite').getByRole('button', { name: 'Dismiss' }).click();
    assert.ok(await until(async () => authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')).find(x => x.key === 'd6-cite').state === 'dismissed'));
    n0 = (await state('jperez')).events.length;
    await panel().getByRole('button', { name: 'Refine suggestions' }).click();
    assert.ok(await until(async () => authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')).find(x => x.key === 'd6-cite').state === 'open'), 'the dismissed suggestion is back');
    await panel().getByText(/1 dismissed suggestion is back/).first().waitFor({ timeout: 8000 });
    const ev1 = await events(n0); assert.ok(ev1.includes('Suggestions refined against the record · R-0402') && ev1.some(w => /Authorization recommendations applied · 0 included/.test(w)), ev1.join(' | '));
    // Add clinical context: the same form, titled, focus in the words; nothing is logged until it is saved; saving logs it once
    n0 = (await state('jperez')).events.length;
    await panel().getByRole('button', { name: 'Add clinical context' }).click();
    assert.ok(await until(async () => await panel().locator('#pra-t').inputValue() === 'Clinical context'), 'titled Clinical context');
    assert.ok(await until(async () => await panel().locator('#pra-x').evaluate(e => document.activeElement === e)), 'focus is in the words box');
    assert.deepEq((await events(n0)).filter(w => /Clinical context added/.test(w)), [], 'not logged before it is saved');
    const ctxWords = 'The client missed two groups after the Oct 28 incident and the family asked for a call.';
    await panel().locator('#pra-x').fill(ctxWords); await panel().getByLabel('Which box').selectOption('Barriers'); await panel().getByRole('button', { name: 'Save' }).click();
    assert.ok(await until(async () => (await events(n0)).filter(w => w === 'Clinical context added · R-0402').length === 1), 'logged once, after the save: ' + (await events(n0)).join(' | '));
    const mine = authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')).find(x => x.custom && x.title === 'Clinical context'); assert.ok(mine && mine.state === 'included' && mine.insert.text === ctxWords && mine.insert.box === 'Barriers', 'the clinician\'s words are the text; Psyflo wrote none');
    assert.ok(!(await events(n0)).some(w => w.includes('missed two groups')), 'the audit text never holds the clinician\'s words');
    // Dismiss suggestions: logged, every suggestion that was not dismissed goes, Bring back is still there
    n0 = (await state('jperez')).events.length;
    await panel().getByRole('button', { name: 'Dismiss suggestions' }).click();
    assert.ok(await until(async () => authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')).every(x => x.state === 'dismissed')), 'every suggestion is dismissed');
    const ev2 = await events(n0); assert.ok(ev2.includes('All suggestions dismissed · R-0402'), ev2.join(' | ')); assert.ok(ev2.some(w => /Authorization recommendations applied · 0 included, \d+ dismissed/.test(w)), ev2.join(' | '));
    assert.ok(await until(async () => /\d+ dismissed suggestions/.test(await ptext())), 'they wait in the dismissed list'); assert.eq(await panel().getByRole('button', { name: 'Dismiss suggestions' }).count(), 0, 'nothing left to dismiss');
    assert.ok(await until(async () => await panel().locator('[data-act="recRefine"]').evaluate(e => document.activeElement === e)), 'focus moved to the next control, not lost');
    await panel().getByRole('button', { name: 'Refine suggestions' }).click();
    assert.ok(await until(async () => authRecsFor((await sig()).s, req((await sig()).s, 'R-0402')).every(x => x.state === 'open' || x.state === 'included')), 'Refine brings them all back');
  });
  await test('Apply selected still types the included text into the open form (yellow, after what is there), once; panel.filled records it; no Lauris button is pressed', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    const before = await snap(); const s0 = (await sig()).s; const lc = authRecsFor(s0, req(s0, 'R-0402')).find(x => x.key === 'level-cite');
    await card('level-cite').getByRole('button', { name: 'Include' }).click();
    await panel().getByRole('button', { name: 'Add clinical context' }).click(); const words = 'A safety plan was reviewed with the client on Oct 28 and a copy went home.';
    await panel().locator('#pra-x').fill(words); await panel().getByLabel('Which box').selectOption('Barriers'); await panel().getByRole('button', { name: 'Save' }).click();
    assert.ok(await until(async () => await panel().getByRole('button', { name: 'Apply selected (2)' }).count() === 1), 'two included');
    await panel().getByRole('button', { name: 'Apply selected (2)' }).click();
    await panel().getByText(/boxes? typed into the form · yellow/).first().waitFor({ timeout: 20000 });
    const v = await formValues(); assert.ok(v['Level of care'].v.includes(lc.insert.text) && v['Level of care'].typed, 'the stored sentence is in Level of care'); assert.ok(v['Barriers'].v.includes(words) && v['Barriers'].typed, 'the clinician\'s words are in their box');
    for (const k of ['Level of care', 'Barriers']) assert.match(v[k].bg, /rgb\(255, 248, 230\)/, k + ' is yellow');
    const s = (await sig()).s; const fill = s.fills.at(-1); assert.eq(fill.form, 'sra-continued'); assert.deepEq(fill.boxes.map(x => x.label).sort(), ['Barriers', 'Level of care']);
    assert.eq((await snap()).sessions.length, before.sessions.length, 'no session saved or processed'); assert.eq(await p.locator('#lauris-flash').count(), 0);
    await panel().getByRole('button', { name: 'Apply selected (2)' }).click(); await p.waitForTimeout(900);
    const v2 = await formValues(); assert.eq(v2['Barriers'].v, v['Barriers'].v, 'the same text is never typed twice'); assert.eq(v2['Level of care'].v, v['Level of care'].v);
  });
  await test('the initial request (sra-initial) carries the same blocks', async () => {
    await open('jperez', '/consumers/4492/session/sra-initial', '#panel .prs');
    const t = await ptext(); assert.match(t, /Expected approval[\s\S]*Suggested by Psyflo[\s\S]*Payer criteria[\s\S]*Clinical trajectory/i); assert.match(t, /Refine suggestions[\s\S]*Add clinical context[\s\S]*Dismiss suggestions/);
    assert.eq(await panel().locator('[data-px="strip"]').count(), 1);
  });

  // ------------------------------------------------------------------------------------------------ X-02 the denial packet
  await test('X-02 the parsed fields strip: payer, service, requested, offered, revenue at risk, decision and the rationale, from the stored case', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs');
    const s = (await sig()).s; const r = req(s, 'R-0402'); const d = byRequest(s, 'R-0402'); const f = denialFields(s, d, r);
    const strip = panel().locator('[data-px="fields"]'); const t = await text(strip);
    assert.deepEq(await strip.locator('dt').allInnerTexts().then(a => a.map(x => x.toLowerCase())), ['payer', 'service', 'requested', 'offered', 'revenue at risk', 'decision']);
    const want = { from: 'Sentara Health Plans', service: 'IOP · H0015', requested: '150 units', approved: '110 units', decision: 'Partial approval · 110 of 150 units offered' };
    for (const [k, v] of Object.entries(want)) assert.eq(await text(strip.locator(`[data-field="${k}"] dd`)), v, k);
    assert.eq(await text(strip.locator('[data-field="risk"] dd')), '$8,200 at risk'); assert.match(await strip.locator('[data-field="risk"] .in-money').getAttribute('title'), /40 units × \$205/);
    const rat = await text(panel().locator('[data-field="rationale"]')); assert.ok(rat.includes(f.rationale.text) && rat.startsWith('Rationale'), 'the payer\'s stored words: ' + rat);
    assert.ok(f.rows.find(x => x.key === 'decision').value === want.decision);
    assert.match(await ptext(), /Sentara Health Plans · Partial approval[\s\S]*110 of 150 units offered/);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-denial.png' }).catch(() => { });
  });
  await test('X-02 findings: CRITICAL and STRONG tags, each with its stored-fact paragraph and evidence chips; collapsed until opened', async () => {
    const s = (await sig()).s; const r = req(s, 'R-0402'); const d = byRequest(s, 'R-0402'); const a = appealAnalysis(s, d, r);
    assert.ok(await closed('px-find')); assert.match(await text(acc('px-find').locator('> summary')), /Why this denial is contestable\s*7 findings · 3 critical/);
    await openAcc('px-find'); const box = acc('px-find');
    assert.deepEq(a.findings.map(x => x.sev), ['critical', 'critical', 'critical', 'strong', 'strong', 'strong', 'strong']);
    assert.eq(await box.locator('li.pxf').count(), a.findings.length);
    for (const x of a.findings) {
      const li = box.locator(`li.pxf[data-finding="${x.key}"]`); assert.eq(await li.count(), 1, x.key); assert.eq(await li.getAttribute('data-sev'), x.sev);
      const t = await text(li); assert.ok(t.startsWith(x.sev.toUpperCase()), x.key + ' starts with its tag: ' + t.slice(0, 40)); assert.ok(t.includes(x.title) && t.includes(x.text), x.key + ' title and the stored-fact paragraph');
      if (x.evidence.length) assert.ok(await li.locator('.ui-evidence').count() >= Math.min(x.evidence.length, 3), x.key + ' has its evidence chips'); else assert.eq(await li.locator('.ui-evidence').count(), 0, x.key + ' has no record, so it shows no chip');
    }
    assert.ok(await box.locator('li.pxf[data-sev="critical"] .ui-evidence').count() >= 3, 'the critical findings cite records');
    assert.ok((await text(box)).includes('nothing is scored'), 'no score is claimed');
    assert.match(await text(box), /\d+ notes? before you rely on this/, 'the caveats are said');
  });
  await test('X-02 the six ASAM dimensions are collapsed; the payer pattern shows the stored behaviour, then the labelled sample (analogous cases, reversed, peer-to-peer, strategies with bars)', async () => {
    const s = (await sig()).s; const r = req(s, 'R-0402'); const d = byRequest(s, 'R-0402'); const a = appealAnalysis(s, d, r);
    assert.ok(await closed('px-dims')); assert.match(await text(acc('px-dims').locator('> summary')), /Six ASAM dimensions\s*6 of 6 rated/);
    await openAcc('px-dims'); const dm = acc('px-dims');
    assert.deepEq(await dm.locator('ul.pxdm > li').evaluateAll(l => l.map(e => +e.dataset.dim)), [1, 2, 3, 4, 5, 6]);
    for (const x of a.dimensions.rows) { const t = await text(dm.locator(`ul.pxdm > li[data-dim="${x.n}"]`)); assert.ok(t.includes(x.label) && t.includes(x.text) && t.includes(`Rated ${x.rating} · ${x.ratingLabel}`), 'D' + x.n + ': ' + t.slice(0, 100)); }
    assert.ok((await text(dm)).includes(a.dimensions.heading) && (await text(dm)).includes(a.dimensions.summary));
    assert.ok(await closed('px-pattern')); await openAcc('px-pattern'); const pt = acc('px-pattern'); const pp = a.pattern; const t = await text(pt);
    assert.match(await text(acc('px-pattern').locator('> summary')), /Payer pattern · Sentara/);
    assert.ok(t.includes(pp.tends) && t.includes(pp.works) && t.includes(`About ${pp.partialRate}% of Sentara decisions on file are partial approvals.`), 'the stored behaviour comes first');
    assert.ok(t.indexOf(pp.tends) < t.indexOf('Simulated'), 'stored behaviour before the sample');
    assert.deepEq([pp.analogous, pp.reversedPct, pp.p2pOverturnPct], [312, 78, 62]);
    assert.match(await text(pt.locator('.in-kpi', { hasText: 'Analogous cases' })), /312/); assert.match(await text(pt.locator('.in-kpi', { hasText: 'Reversed on first-level appeal' })), /78%/); assert.match(await text(pt.locator('.in-kpi', { hasText: 'Peer-to-peer overturned' })), /62%/);
    assert.ok(t.includes('Simulated') && t.includes(INTEL_BASIS), 'Simulated chip and basis');
    assert.eq(await pt.locator('.in-bars .in-bar').count(), pp.strategies.length); for (const x of pp.strategies) assert.ok(t.includes(x.label) && t.includes(`${x.success}%`), x.label);
    assert.deepEq(await pt.locator('.in-bar__t i').evaluateAll(l => l.map(e => e.style.width)), pp.strategies.map(x => x.success + '%'), 'success bars, widths from the sample');
    assert.ok(pp.strategies.every((x, i, l) => !i || l[i - 1].success >= x.success), 'ranked by success');
  });
  await test('X-02 numbered suggestions with the same footer; each action is logged with scope denial; the panel sends nothing', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs');
    const s = (await sig()).s; const list = denialRecsFor(s, byRequest(s, 'R-0402'), req(s, 'R-0402')); assert.eq(list.length, 9);
    const nums = await panel().locator('ol.prl > .prc .prc-n').allInnerTexts(); assert.deepEq(nums, ['1', '2', '3'], 'numbered, three first');
    assert.match(await text(panel().locator('ol.prl > .prc').first()), new RegExp(list[0].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click(); assert.ok(await until(async () => (await panel().locator('ol.prl > .prc .prc-n').allInnerTexts()).join() === '1,2,3,4,5,6,7,8,9'), 'all nine, in order');
    assert.ok(await panel().getByRole('button', { name: 'Apply selected (0)' }).isDisabled());
    for (const name of ['Refine suggestions', 'Add clinical context', 'Dismiss suggestions']) assert.eq(await panel().getByRole('button', { name }).count(), 1, name);
    assert.eq(await panel().getByRole('button', { name: /Submit|Send/ }).count(), 0, 'no Submit, no Send');
    await card('units').getByRole('button', { name: 'Include' }).click(); assert.ok(await until(async () => await panel().getByRole('button', { name: 'Apply selected (1)' }).count() === 1));
    let n0 = (await state('jperez')).events.length;
    await panel().getByRole('button', { name: 'Refine suggestions' }).click(); assert.ok(await until(async () => (await events(n0)).includes('Suggestions refined against the record · R-0402')));
    await panel().getByRole('button', { name: 'Add clinical context' }).click(); await panel().locator('#pra-x').fill('The payer reviewer spoke with the program director on Oct 29 and asked for the dated counts.'); await panel().getByRole('button', { name: 'Save' }).click();
    assert.ok(await until(async () => (await events(n0)).includes('Clinical context added · R-0402')), (await events(n0)).join(' | '));
    assert.ok((await events(n0)).some(w => /Denial recommendation added by a clinician/.test(w)), 'added to the denial scope');
    await panel().getByRole('button', { name: 'Dismiss suggestions' }).click(); assert.ok(await until(async () => (await events(n0)).includes('All suggestions dismissed · R-0402')));
    assert.ok(await until(async () => { const sx = (await sig()).s; return denialRecsFor(sx, byRequest(sx, 'R-0402'), req(sx, 'R-0402')).every(q => q.state === 'dismissed'); }), 'every suggestion of the case is dismissed');
    const sx = (await sig()).s; const x = byRequest(sx, 'R-0402'); assert.ok(!(x.docs.p2p && x.docs.p2p.sent), 'nothing was sent'); assert.deepEq((await events(n0)).filter(w => /\bsent\b|upload|submitted/i.test(w)), []);
    assert.eq((await snap()).sessions.filter(q => q.no === 4102).length, 0, 'nothing saved or processed in Lauris');
    // an information request has the same blocks (a different decision, no units)
    await open('jperez', '/consumers/4480/session/payer-reply?request=R-0408', '#panel .prs'); const t = await ptext();
    assert.match(t, /Information requested/); assert.match(t, /Why this denial is contestable/); assert.match(t, /Six ASAM dimensions/); assert.match(t, /Payer pattern/);
  });

  // ------------------------------------------------------------------------------------------------ X-03 home
  await test('X-03 home: the open case shows the due-in chip and the dollars-at-risk chip (Denial packet tile and the next-task tile)', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102', '#panel .body');
    const s = (await sig()).s; const h = headerOf(s, req(s, 'R-0402'), (await sig()).me);
    const tile = panel().locator('button[data-view="denial"]'); const t = squash(await tile.innerText());
    assert.match(t, /^Denial packet Partial approval · R-0402/); assert.ok(t.includes(h.urgency.label) && t.includes(h.risk.label), 'due-in and dollars: ' + t); assert.eq(h.urgency.label, 'Due tomorrow'); assert.eq(h.risk.label, '$8,200 at risk');
    assert.match(await tile.locator('.in-money').getAttribute('title'), /units × \$205 a unit \(demo assumption\)/);
    assert.match(await ptext(), /Denial packet\s*Partial approval · R-0402/, 'the existing line is unchanged');
    // when the next task is a request, its tile shows them too (the three new referrals are handled first)
    for (const [i, r] of s.referrals.filter(x => x.stage === 'needs_screening' && !x.lauris_no).entries()) await api('referral.inLauris', { id: r.id, no: 9500 + i }, 'jperez');
    await open('jperez', '/consumers/4102', '#panel .body');
    const next = panel().locator('section.next'); const nt = squash(await next.innerText()); const pend = req((await sig()).s, 'R-0411');
    assert.match(nt, /Continued stay · M\.R\.[\s\S]*R-0411/); assert.ok(nt.includes('Overdue 3d') && nt.includes('$8,610 at risk'), 'the next-task tile: ' + nt);
    assert.ok(pend.id === 'R-0411');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-home.png' }).catch(() => { });
  });

  // ------------------------------------------------------------------------------------------------ roles
  await test('the other roles get none of it: no strip, accordions, findings, footer or chips (supervisor, administrator, direct support); the server refuses their intel.event', async () => {
    await reset('canvas');
    const NO = /Expected approval|Model confidence|Comparable cases|Payer criteria|Clinical trajectory|Why this denial is contestable|Payer pattern|Six ASAM dimensions|Refine suggestions|Add clinical context|Dismiss suggestions|Apply selected|Historical outcomes|Suggested by Psyflo|at risk|Due tomorrow/i;
    for (const [as, path] of [['cdiaz', '/consumers/4102/session/sra-continued'], ['cdiaz', '/consumers/4102/session/payer-reply?request=R-0402'], ['cdiaz', '/consumers/4102'], ['khale', '/consumers/3310/session/dpn'], ['khale', '/consumers/4102'], ['dowens', '/consumers/4102/session/sra-continued'], ['dowens', '/consumers/4102/session/payer-reply'], ['dowens', '/consumers/4102']]) {
      await open(as, path, '#panel .body, #panel .idcard'); const t = await ptext();
      assert.noMatch(t, NO, `${as} on ${path}: no clinical block, no chips (${t.slice(0, 160)})`); assert.eq(await panel().locator('[data-px], .pxs, details[data-acc^="px-"]').count(), 0, `${as} on ${path}: nothing of the new blocks in the page`);
    }
    await open('cdiaz', '/consumers/4102/session/sra-continued', '#panel .body'); assert.match(await ptext(), /Authorization drafts are for clinicians/, 'the one quiet line they have now');
    await open('cdiaz', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .body'); assert.match(await ptext(), /for the treating clinician/, 'the denial packet keeps its quiet line');
    for (const who of ['cdiaz', 'khale', 'dowens']) for (const kind of ['refine', 'context', 'dismissAll']) await assert.refused(tryApi('intel.event', { scope: 'auth', ref: 'R-0402', kind }, who), /not allowed/i, 403);
  });

  // ------------------------------------------------------------------------------------------------ wording, layout, keyboard
  await test('the new wording is clean: none of school, student, TDT, H2016, guardian, behaviour, classroom, teacher in the blocks (all accordions open)', async () => {
    for (const [path, ready] of [['/consumers/4102/session/sra-continued', '#panel .prs'], ['/consumers/4492/session/sra-initial', '#panel .prs'], ['/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs'], ['/consumers/4480/session/payer-reply?request=R-0408', '#panel .prs']]) {
      await open('jperez', path, ready); await openAll();
      const blocks = await frame().evaluate(() => [...document.querySelectorAll('[data-px], details[data-acc^="px-"], .prs-m, .prs-l')].map(e => e.textContent.replace(/\s+/g, ' ')).join(' | '));
      assert.ok(blocks.length > 500, path + ': the blocks are there'); assert.noMatch(blocks, WORDS, path + ': ' + (blocks.match(WORDS) || [''])[0]); assert.noMatch(blocks, /—/, path + ': no em dash in the new copy');
    }
  });
  await test('400 px and 320 px: no sideways scroll with every accordion open, text 12 px or more, controls 40 px or more, one h1, aria-live only on the status line', async () => {
    for (const w of [400, 320]) {
      await p.evaluate(px => { const s = document.getElementById('psyflo-slot'); s.style.flex = `0 0 ${px}px`; s.style.width = px + 'px'; }, w);
      for (const [name, path, ready] of [['auth', '/consumers/4102/session/sra-continued', '#panel .prs'], ['initial', '/consumers/4492/session/sra-initial', '#panel .prs'], ['denial', '/consumers/4102/session/payer-reply?request=R-0402', '#panel .prs'], ['info', '/consumers/4480/session/payer-reply?request=R-0408', '#panel .prs'], ['home', '/consumers/4102', '#panel .body']]) {
        await open('jperez', path, ready); await p.evaluate(px => { const s = document.getElementById('psyflo-slot'); s.style.flex = `0 0 ${px}px`; s.style.width = px + 'px'; }, w); await openAll();
        if (name === 'denial') await panel().getByRole('button', { name: /Show \d+ more suggestions/ }).click().catch(() => { });
        await p.waitForTimeout(400); const o = await overflow(); assert.ok(o.sx <= 0 && o.wide.length === 0, `${name} at ${w}: no sideways scroll (${o.w} wide; ${o.sx}; ${o.wide.join(', ')})`);
        const m = await frame().evaluate(() => { const px = document.getElementById('panel'); const small = []; const walker = document.createTreeWalker(px, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || e.closest('.ui-sr,.sr') || !(e.checkVisibility && e.checkVisibility())) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11.95) small.push((e.className.baseVal !== undefined ? e.className.baseVal : e.className || e.tagName) + ':' + fs); }
          const low = [...px.querySelectorAll('.btn:not(.sm),.btn.sm,.tog,select,summary')].filter(e => e.checkVisibility && e.checkVisibility() && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 39.5).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
          return { small: small.slice(0, 5), low: low.slice(0, 5), live: [...document.querySelectorAll('[aria-live]')].map(e => e.id || e.tagName), h1: px.querySelectorAll('h1').length, charts: [...px.querySelectorAll('.in-chart svg')].map(s => Math.round(s.getBoundingClientRect().width)) }; });
        assert.deepEq(m.small, [], `${name} at ${w}: text below 12 px`); assert.deepEq(m.low, [], `${name} at ${w}: controls below 40 px`); assert.deepEq(m.live, ['px-status'], `${name} at ${w}: aria-live only on the status region`); assert.eq(m.h1, 1, `${name} at ${w}: one h1`);
        if (name === 'auth') assert.ok(m.charts.length >= 1 && m.charts.every(c => c > 150 && c <= w), `the charts fit the panel: ${m.charts.join(',')}`);
      }
      if (w === 400) await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-400.png' }).catch(() => { });
      if (w === 320) await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/intel-panel-320.png' }).catch(() => { });
    }
    await p.evaluate(() => { const s = document.getElementById('psyflo-slot'); s.style.flex = ''; s.style.width = ''; });
  });
  await test('keyboard: an accordion opens and closes with Enter and Space and keeps its state across a repaint; the footer buttons are reachable by Tab; every control has a name', async () => {
    await reset('canvas'); await open('jperez', '/consumers/4102/session/sra-continued', '#panel .prs');
    const sum = acc('px-traj').locator('> summary'); await sum.focus(); await p.keyboard.press('Enter'); assert.ok(await until(async () => !(await closed('px-traj'))), 'Enter opens'); await p.keyboard.press('Space'); assert.ok(await until(async () => await closed('px-traj')), 'Space closes'); await p.keyboard.press('Enter');
    assert.ok(await until(async () => !(await closed('px-traj')))); await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'd5-cite', state: 'included' }, 'jperez');   // a state change repaints the panel
    assert.ok(await until(async () => (await card('d5-cite').getAttribute('data-state')) === 'included', 20000), 'the repaint happened'); assert.ok(!(await closed('px-traj')), 'the accordion kept the state the person gave it');
    // Tab reaches the footer buttons in order
    await panel().getByRole('button', { name: 'Refine suggestions' }).focus(); await p.keyboard.press('Tab'); assert.eq(await frame().evaluate(() => document.activeElement.textContent.trim()), 'Add clinical context'); await p.keyboard.press('Tab'); assert.eq(await frame().evaluate(() => document.activeElement.textContent.trim()), 'Dismiss suggestions');
    const unnamed = await frame().evaluate(() => [...document.querySelectorAll('#panel button, #panel summary, #panel input, #panel textarea, #panel select')].filter(e => !(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('title') || (e.labels && e.labels.length))).map(e => e.outerHTML.slice(0, 80)));
    assert.deepEq(unnamed, [], 'every control has a name');
    // Enter on "Refine suggestions" with the keyboard works like a click
    const n0 = (await state('jperez')).events.length; await panel().getByRole('button', { name: 'Refine suggestions' }).focus(); await p.keyboard.press('Enter');
    assert.ok(await until(async () => (await events(n0)).includes('Suggestions refined against the record · R-0402')), 'Refine by keyboard is logged');
  });
  await test('no page errors in Lauris or the panel', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
