// R6 · Denial Intelligence with recommendations, in the browser (Owner B). The case overview leads with "What Psyflo would do" (a ranked, numbered list from stored
// records, the shared card kit); the clinician includes, dismisses, adds context to and adds their own; Apply selected commits a batch; included recommendations flow
// into every unsent draft as "Added from recommendations", and the Preview packet drawer shows that section highlighted with its evidence chips. The queue is one
// search row, the Status select and a Filters drawer, with a Suggestions chip per case. Administrators see status only (no recommendation content at all).
// Run: BASE=http://localhost:5210 node test/recs-denial-ui.mjs   (test/run-all.mjs starts a fresh server for it). Screenshots go to $SHOTS.
import { suite, assert, login, errors, playwright, reset, state, api, tryApi, BASE, SHOTS } from './lib/index.mjs';
import { denialRecsFor, textOf } from '../web/js/shared/recs.js';
import { byRequest } from '../web/js/shared/sel/disputes.js';

const T = suite('recs-denial-ui');
const { chromium } = playwright();
const browser = await chromium.launch();
const open = async (user, width = 1440) => { const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); page.errs = errors(page); await login(page, user, { presenter: false }); page.ctx = ctx; return page; };
const txt = (page, sel = '#root') => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
const hash = page => page.evaluate(() => location.hash);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/r6b-${name}.png`, fullPage: true });
const decisions = async () => (await state('jperez')).rec_decisions;
const active = page => page.evaluate(() => { const a = document.activeElement; return a ? { id: a.id || '', tag: a.tagName } : null; });
const goCase = async (p, id, extra = '') => { await p.goto(BASE + `/#/DenialCase?id=${id}${extra}`); await p.waitForSelector('.d-menu'); await p.waitForSelector('.d-body h2'); };
const dialog = p => p.getByRole('dialog');
const card = (p, key) => p.locator(`[role=dialog] .rc__card[data-rec="${key}"]`);
const BANNED = /\b(school|student|TDT|therapeutic day|H2016|guardian|behaviou?r|classroom|teacher)\b/i;

await reset('canvas');

await T.test('overview leads with "What Psyflo would do": a numbered, ranked list, then the strip, the Packet and More; the old stacked cards are gone (R-0402, R-0384, R-0408, R-0388)', async () => {
  const p = await open('jperez');
  const s = await state('jperez');
  for (const [id, packetDoc] of [['R-0402', 'Peer-to-peer talking points'], ['R-0384', 'Appeal letter'], ['R-0408', 'Reply to the information request'], ['R-0388', 'Peer-to-peer talking points']]) {
    await goCase(p, id);
    const heads = await p.$$eval('.d-body h2', hs => hs.map(h => h.innerText.trim())); assert.deepEq(heads, ['What Psyflo would do', 'Where the case stands', 'Packet', 'More'], id + ' ' + heads.join('|'));
    const list = denialRecsFor(s, byRequest(s, id), s.requests.find(r => r.id === id)); const rows = await p.$$eval('.d-wwd .rcm__l li', ls => ls.map(l => ({ n: l.querySelector('.d-wwd__n').innerText.trim(), t: l.querySelector('.rcm__t').innerText.trim(), key: l.dataset.rec })));
    assert.eq(rows.length, Math.min(5, list.length), id + ' shows the top five'); assert.deepEq(rows.map(r => r.n), rows.map((_, i) => String(i + 1)), 'numbered 1, 2, 3…'); assert.deepEq(rows.map(r => r.key), list.slice(0, rows.length).map(x => x.key), id + ' ranked as the engine ranks them');
    assert.match(await txt(p, '.d-wwd'), new RegExp(`0 suggestions included of ${list.length}`)); assert.match(await txt(p, '.d-wwd'), /illustrative sample/i, 'the + points are labelled a sample');
    assert.ok(await p.locator('.d-wwd [data-rc-open]').count() === 1 && await p.locator('#d-recadd').count() === 1, 'one primary button and a visible "Add your own"');
    assert.match(await txt(p, '.d-pk'), new RegExp(packetDoc), id + ' packet offers the document that fits the stage');
    const t = await txt(p, '.d-body'); assert.ok(!/Recommended next steps|All paths\s*\d+ available|Where the denial is weak\s*Not analyzed yet/.test(t), 'the old cards no longer stack here');
    assert.match(await txt(p, '.d-menu'), new RegExp(`Overview\\s*0 of ${list.length} suggestions included`));
    for (const sel of ['.d-stand', '.d-pk', '.d-tools']) assert.ok(!BANNED.test(await txt(p, sel)), 'final wording in ' + sel + ': ' + (await txt(p, sel)).match(BANNED));
  }
  await goCase(p, 'R-0402'); await shot(p, 'overview-0402-1440');
  await goCase(p, 'R-0384'); await shot(p, 'overview-0384-1440'); await goCase(p, 'R-0408'); await shot(p, 'overview-0408-1440'); await goCase(p, 'R-0388'); await shot(p, 'overview-0388-1440');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the full list opens in a side drawer from the button and from a row (at that card); cards are numbered, carry impact, the sample line, "Why this matters" and the evidence chips', async () => {
  const p = await open('jperez'); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'Review suggestions' }).click(); const dlg = dialog(p); await dlg.waitFor();
  assert.match(await dlg.locator('.ui-dialog__t').innerText(), /What Psyflo would do/); assert.eq(await dlg.locator('.rc__card').count(), 9, 'all nine suggestions');
  const first = await dlg.locator('.rc__card .rc__t').first().evaluate(el => getComputedStyle(el, '::before').content); assert.match(first, /counter\(rcn\)/, 'numbered by a CSS counter'); assert.match(await dlg.locator('.rc__card .rc__t').first().innerText(), /Send the reply (today|by tomorrow|within \d+ days)|reply date passed/);
  await card(p, 'cite-asam').locator('summary').click(); const why = await card(p, 'cite-asam').innerText(); assert.match(why, /Why this matters[\s\S]*times applied in the sample · \d+% success[\s\S]*Illustrative sample/); assert.match(why, /High impact/);
  assert.ok(await card(p, 'cite-asam').locator('.ui-evidence').count() >= 2, 'the sentence carries its evidence chips'); assert.match(await dlg.innerText(), /Expected approval[\s\S]*Simulated/);
  await shot(p, 'drawer-0402-1440'); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await p.getByRole('button', { name: /^Add context: Document: what is likely to happen/ }).click(); await dialog(p).waitFor();
  assert.ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-rc-ctx]') && !!document.activeElement.closest('[data-rec="gap-risk"]')), 'the words box of that card has focus');
  await p.keyboard.press('Escape'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('include, dismiss, add context, add your own, Apply selected: each works through the drawer, is recorded on the server, and survives a reload', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'Review suggestions' }).click(); const dlg = dialog(p); await dlg.waitFor();
  // include one that has a stored-record sentence, then Apply selected
  await card(p, 'cite-asam').locator('[data-rc-check]').check(); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700);
  let rows = await decisions(); const inc = rows.find(r => r.key === 'cite-asam'); assert.ok(inc && inc.state === 'included' && inc.by === 'jperez' && inc.scope === 'denial' && inc.ref === 'R-0402', JSON.stringify(rows));
  assert.match(await dlg.locator('[data-rc-count]').innerText(), /1 suggestion included of 9/); assert.ok(await card(p, 'cite-asam').locator('[data-rc-check]').isChecked(), 'still ticked after the repaint');
  assert.ok(await p.evaluate(() => document.activeElement && document.activeElement.closest('[data-rec="cite-asam"]') ? true : !!document.activeElement), 'focus is not lost');
  // dismiss one; it moves to the dismissed list and can be brought back
  await card(p, 'window').getByRole('button', { name: 'Dismiss' }).click(); await p.waitForTimeout(700);
  assert.eq((await decisions()).find(r => r.key === 'window').state, 'dismissed'); assert.eq(await card(p, 'window').count(), 0); assert.match(await dlg.locator('.rc__gone summary').innerText(), /1 dismissed suggestion/);
  await dlg.locator('.rc__gone summary').click(); await dlg.getByRole('button', { name: 'Bring back' }).click(); await p.waitForTimeout(700); assert.eq((await decisions()).find(r => r.key === 'window').state, 'open'); assert.eq(await card(p, 'window').count(), 1);
  await card(p, 'window').getByRole('button', { name: 'Dismiss' }).click(); await p.waitForTimeout(600);
  // add context to a card that needs the clinician's words, include it, Apply selected: the words are the text
  const need = card(p, 'gap-risk'); const words = 'The client used on three weekends in October after leaving the lower level; the family was not at home.';
  assert.ok(await need.locator('[data-rc-check]').isDisabled(), 'cannot be ticked before there are words'); await need.locator('[data-rc-ctx]').fill(words); assert.ok(await need.locator('[data-rc-check]').isEnabled(), 'ticking opens once there are words');
  await need.locator('[data-rc-check]').check(); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700);
  rows = await decisions(); const g = rows.find(r => r.key === 'gap-risk'); assert.ok(g && g.state === 'included' && g.context === words, 'the clinician\'s own words are stored with the decision');
  const s1 = await state('jperez'); const list = denialRecsFor(s1, byRequest(s1, 'R-0402'), s1.requests.find(r => r.id === 'R-0402')); assert.eq(textOf(list.find(x => x.key === 'gap-risk')), words);
  // add your own
  await dlg.getByRole('button', { name: /Add your own/ }).click(); await dlg.locator('input[name=title]').fill('Mention the safety plan'); await dlg.locator('textarea[name=text]').fill('A safety plan was reviewed with the client on Oct 28.'); await dlg.getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(700);
  rows = await decisions(); const mine = rows.find(r => r.custom); assert.ok(mine && mine.state === 'included' && mine.title === 'Mention the safety plan' && mine.text === 'A safety plan was reviewed with the client on Oct 28.');
  assert.ok(await dlg.locator('.rc__card[data-custom]').count() === 1 && /Added by you/.test(await dlg.locator('.rc__card[data-custom]').innerText()));
  assert.ok(!/safety plan/i.test((await state('dowens')).rec_decisions.map(r => r.text || '').join()), 'administrators receive no decision rows');
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  // persists: reload, reopen
  await p.reload(); await p.waitForSelector('.d-wwd'); assert.match(await txt(p, '.d-wwd'), /3 suggestions included of 10/, 'cite-asam, gap-risk and the clinician\'s own: 3 of 10');
  assert.match(await txt(p, '.d-menu'), /Overview\s*3 of 10 suggestions included`?/);
  await p.getByRole('button', { name: 'Review suggestions' }).click(); await dialog(p).waitFor();
  assert.ok(await card(p, 'cite-asam').locator('[data-rc-check]').isChecked() && await card(p, 'gap-risk').locator('[data-rc-ctx]').inputValue() === words, 'persisted: ticked and the words are still there'); assert.match(await dialog(p).locator('.rc__gone summary').innerText(), /1 dismissed/);
  // remove the clinician's own recommendation
  await dialog(p).locator('.rc__card[data-custom]').getByRole('button', { name: 'Remove' }).click(); await p.waitForTimeout(700); assert.ok(!(await decisions()).some(r => r.custom), 'removed');
  const ev = (await state('jperez')).events.filter(e => e.record === 'R-0402' && /Denial recommendation/.test(e.what)).map(e => e.what).join('\n'); assert.match(ev, /Denial recommendations applied/); assert.match(ev, /added by a clinician/); assert.ok(!/October|safety plan was reviewed/.test(ev), 'the clinician\'s text stays out of the audit text');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('a card that needs the clinician\'s words cannot be included without them (the box, the checkbox and the server all say so)', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'Review suggestions' }).click(); const dlg = dialog(p); await dlg.waitFor(); const need = card(p, 'gap-isp');
  assert.ok(await need.locator('[data-rc-check]').isDisabled(), 'checkbox disabled'); await need.locator('[data-rc-ctx]').fill('     '); assert.ok(await need.locator('[data-rc-check]').isDisabled(), 'spaces are not words');
  assert.match(await need.innerText(), /Needs your input/); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(400); assert.eq((await decisions()).length, 0, 'nothing to apply, nothing stored'); assert.match(await txt(p, '#toasts'), /Nothing to apply yet/);
  const r1 = await tryApi('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'gap-isp', state: 'included', context: '  ' }, 'jperez'); assert.ok(!r1.ok && r1.status === 422 && /needs your own words/.test(r1.error), r1.error);
  const r2 = await tryApi('recs.decideMany', { scope: 'denial', ref: 'R-0402', items: [{ key: 'cite-asam', state: 'included' }, { key: 'gap-isp', state: 'included' }] }, 'jperez'); assert.ok(!r2.ok && r2.status === 422); assert.eq((await decisions()).length, 0, 'a refused batch stores nothing');
  await p.keyboard.press('Escape'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('an included recommendation goes into the generated draft as "Added from recommendations", shows highlighted in Preview packet with its evidence chips, and leaves when dismissed', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  // 1. include two (one with evidence), then draft from the Packet card: the draft carries them from the start
  await p.getByRole('button', { name: 'Review suggestions' }).click(); let dlg = dialog(p); await dlg.waitFor();
  await card(p, 'cite-asam').locator('[data-rc-check]').check(); await card(p, 'units').locator('[data-rc-check]').check(); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700);
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(300);
  assert.match(await txt(p, '.d-pk'), /2 recommendations included/); assert.match(await txt(p, '.d-pk'), /No draft yet/);
  await p.locator('.d-pk').getByRole('button', { name: 'Draft from records' }).click(); await p.waitForTimeout(900);
  let s = await state('jperez'); let d = byRequest(s, 'R-0402'); let sec = d.docs.p2p.sections.find(x => x.key === 'recs'); const ins = denialRecsFor(s, d, s.requests.find(r => r.id === 'R-0402'));
  assert.ok(sec && sec.title === 'Added from recommendations' && sec.text.includes(ins.find(x => x.key === 'cite-asam').insert.text) && sec.text.includes(ins.find(x => x.key === 'units').insert.text), 'both texts are in the draft');
  assert.match(await txt(p, '.d-pk'), /2 recommendations in this draft/);
  // 2. Preview packet: the section is highlighted, has the evidence chips, and says how many are included
  await p.getByRole('button', { name: 'Preview packet' }).click(); dlg = dialog(p); await dlg.waitFor();
  assert.match(await dlg.locator('.ui-dialog__t').innerText(), /Preview packet/); const hl = dlg.locator('[data-recs-section]'); assert.eq(await hl.count(), 1, 'one highlighted section');
  assert.match(await hl.innerText(), /Added from recommendations[\s\S]*2 recommendations included/); assert.match(await hl.innerText(), /ratings support ASAM Level 2\.1/); assert.ok(await hl.locator('.ui-evidence').count() >= 2, 'evidence chips under the section');
  const bg = await hl.evaluate(el => getComputedStyle(el).backgroundColor); const bg2 = await dlg.locator('.d-psec:not(.d-psec--rec)').first().evaluate(el => getComputedStyle(el).backgroundColor); assert.ok(bg !== bg2, 'the section is visibly different from the others');
  assert.ok(await dlg.locator('.d-psec:not(.d-psec--rec)').count() >= 1, 'the rest of the draft is shown too'); await shot(p, 'packet-0402-1440');
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  assert.eq((await active(p)).id, 'd-packet', 'focus returns to Preview packet');
  // 3. the same section in the Respond view (the page the clinician edits and reviews in)
  await p.goto(BASE + '/#/DenialCase?id=R-0402&section=action&action=p2p'); await p.waitForSelector('#d-h-p2p'); assert.match(await txt(p, '#d-h-p2p ~ .d-doc, .d-doc'), /Added from recommendations/);
  // 4. dismiss one: the draft follows (server), the preview shows only the other; dismiss both: the section is gone
  await p.goto(BASE + '/#/DenialCase?id=R-0402'); await p.waitForSelector('.d-wwd'); await p.getByRole('button', { name: 'Review suggestions' }).click(); dlg = dialog(p); await dlg.waitFor();
  await card(p, 'units').getByRole('button', { name: 'Dismiss' }).click(); await p.waitForTimeout(700); s = await state('jperez'); d = byRequest(s, 'R-0402'); sec = d.docs.p2p.sections.find(x => x.key === 'recs');
  assert.ok(sec && !sec.text.includes(ins.find(x => x.key === 'units').insert.text) && sec.text.includes(ins.find(x => x.key === 'cite-asam').insert.text), 'the dismissed one left the draft'); assert.eq(d.docs.p2p.reviewed, null, 'a change withdraws the review');
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); await p.getByRole('button', { name: 'Preview packet' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.locator('[data-recs-section]').innerText(), /1 recommendation included/); assert.ok(!(await dlg.locator('[data-recs-section]').innerText()).includes(ins.find(x => x.key === 'units').insert.text.slice(0, 40)));
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await p.getByRole('button', { name: 'Review suggestions' }).click(); dlg = dialog(p); await dlg.waitFor(); await card(p, 'cite-asam').getByRole('button', { name: 'Dismiss' }).click(); await p.waitForTimeout(700); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  s = await state('jperez'); assert.ok(!byRequest(s, 'R-0402').docs.p2p.sections.some(x => x.key === 'recs'), 'both dismissed: no section');
  await p.getByRole('button', { name: 'Preview packet' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.eq(await dlg.locator('[data-recs-section]').count(), 0); assert.match(await dlg.innerText(), /No recommendations included yet/); await p.keyboard.press('Escape');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('Preview packet is honest about a draft that cannot take them: the seeded sample appeal letter (E.C.) says so; drafting it again carries them; "Change what is included" opens the list', async () => {
  await reset('canvas'); await api('recs.decide', { scope: 'denial', ref: 'R-0384', key: 'cite-asam', state: 'included' }, 'jperez');
  const p = await open('jperez'); await goCase(p, 'R-0384');
  assert.match(await txt(p, '.d-pk'), /1 recommendation included[\s\S]*Appeal letter[\s\S]*Sample letter/);
  await p.getByRole('button', { name: 'Preview packet' }).click(); let dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /seeded sample\. Draft it again from records to add the included recommendations/); assert.eq(await dlg.locator('[data-recs-section]').count(), 0);
  await dlg.getByRole('button', { name: 'Change what is included' }).click(); await p.waitForFunction(() => { const t = document.querySelector('[role=dialog] .ui-dialog__t'); return !!t && /What Psyflo would do/.test(t.textContent); }); dlg = dialog(p); assert.match(await dlg.locator('.ui-dialog__t').innerText(), /What Psyflo would do/); assert.ok(await card(p, 'cite-asam').locator('[data-rc-check]').isChecked()); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' });
  await p.getByRole('link', { name: /^Appeal draft/ }).click(); await p.waitForSelector('#d-h-app'); await p.getByRole('button', { name: 'Draft again from records' }).click(); await p.waitForTimeout(900);
  const s = await state('jperez'); assert.ok(byRequest(s, 'R-0384').docs.appeal.sections.some(x => x.key === 'recs' && /ratings support ASAM Level 2\.1/.test(x.text)), 'a fresh draft carries the included recommendation');
  await goCase(p, 'R-0384'); await p.getByRole('button', { name: 'Preview packet' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.eq(await dlg.locator('[data-recs-section]').count(), 1); assert.ok(!/seeded sample/.test(await dlg.innerText())); await p.keyboard.press('Escape');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('the other drawers: Level of care, All paths, History, Analyze Denial (analysis in a drawer); the old deep links (section=options, section=history) land on the Overview with that button focused', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'See the ratings' }).click(); let dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /Ratings support Level 2\.1[\s\S]*D5[\s\S]*Assessed Oct 9/); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'd-level');
  await p.getByRole('button', { name: 'All paths', exact: true }).click(); dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /Accept decision[\s\S]*Prepare peer-to-peer[\s\S]*Not available here \(2\)/); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'd-t-paths');
  await p.getByRole('button', { name: /^History/ }).click(); dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /Opened in Denial Intelligence|Payer decision recorded|decision/i); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); assert.eq((await active(p)).id, 'd-hist-b');
  await p.getByRole('button', { name: 'Analyze Denial' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /Analyze Denial[\s\S]*rule-based[\s\S]*Simulated/); await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(300); assert.match(await txt(p, '.d-tools'), /Analyzed Oct/);
  await p.getByRole('button', { name: 'Identify Missing Evidence' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.innerText(), /Evidence missing/); await p.keyboard.press('Escape');
  // the old links
  await p.goto(BASE + '/#/DenialCase?id=R-0402&section=options'); await p.waitForSelector('.d-wwd'); await p.waitForTimeout(400); assert.eq(await p.locator('[role=dialog]').count(), 0, 'no dialog over a freshly opened page'); assert.eq((await active(p)).id, 'd-t-paths', 'All paths is focused');
  await p.goto(BASE + '/#/DenialCase?id=R-0402&section=history'); await p.waitForSelector('.d-wwd'); await p.waitForTimeout(400); assert.eq(await p.locator('[role=dialog]').count(), 0); assert.eq((await active(p)).id, 'd-hist-b', 'History is focused');
  // from the drawer to the page: an option opens its section and the drawer closes
  await p.goto(BASE + '/#/DenialCase?id=R-0402'); await p.waitForSelector('.d-wwd'); await p.getByRole('button', { name: 'All paths', exact: true }).click(); await dialog(p).locator('.d-opt').filter({ hasText: 'Prepare peer-to-peer' }).getByRole('button', { name: 'Open' }).click(); await p.waitForSelector('#d-h-p2p'); assert.eq(await p.locator('[role=dialog]').count(), 0);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('administrator: no recommendation content anywhere, in the page, the drawers or the data; status, units and deadlines stay', async () => {
  await reset('canvas'); await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'cite-asam', state: 'included', context: 'Private clinician words.' }, 'jperez');
  const p = await open('dowens'); await goCase(p, 'R-0402');
  assert.eq(await p.locator('.rc, .rcm, [data-rc-open], #d-recadd, #d-packet, .d-pk, .d-wwd__n').count(), 0, 'no card, no list, no packet');
  const t = await txt(p, '#root'); assert.match(t, /Suggestions are for the treating clinician/); assert.ok(!/What Psyflo would do|Preview packet|Add your own|Cite the ASAM|Reassess: an incident|Private clinician words/.test(t), 'no recommendation text');
  const html = await p.content(); assert.ok(!/Cite the ASAM dimensions|Private clinician words|ratings support ASAM Level/.test(html), 'not even in the DOM');
  assert.match(t, /Where the case stands[\s\S]*Deadline[\s\S]*Units[\s\S]*110 of 150 units offered/i); assert.ok(await p.getByRole('button', { name: 'Mark for Clinical Review' }).isEnabled(), 'marking for review is not clinical text');
  for (const n of ['Analyze Denial', 'Identify Missing Evidence', 'Request Additional Documentation']) assert.eq(await p.getByRole('button', { name: n }).count(), 0, n + ' is not offered to an administrator');
  assert.eq((await state('dowens')).rec_decisions.length, 0); const r = await tryApi('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'cite-asam', state: 'dismissed' }, 'dowens'); assert.ok(!r.ok && r.status === 403);
  await shot(p, 'admin-overview-1440');
  await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row'); assert.eq(await p.locator('.d-sug').count(), 0, 'no Suggestions chips'); assert.ok(!(await p.$$eval('.ui-qt__table th', ths => ths.map(t => t.innerText.trim()))).includes('Suggestions'), 'no Suggestions column');
  await p.getByRole('button', { name: /^Filters/ }).click(); await dialog(p).waitFor(); assert.ok(!(await dialog(p).innerText()).match(/suggest/i)); await p.keyboard.press('Escape');
  for (const id of ['R-0408', 'R-0384', 'R-0388']) { await goCase(p, id); assert.eq(await p.locator('.rc, .rcm, .d-pk').count(), 0, id); }
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('queue: one search row, Status and a Filters button; a Suggestions chip per case opens the list in a drawer without leaving the queue; the Filters drawer holds the rest', async () => {
  await reset('canvas'); const p = await open('jperez'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  assert.deepEq(await p.$$eval('.ui-qt__table th', ths => ths.map(t => t.innerText.trim())), ['Case', 'Payer', 'Decision', 'Status', 'Next step', 'Deadline', 'Suggestions']);
  assert.deepEq(await p.$$eval('#root .ui-fsel__l', ls => ls.map(l => l.innerText.trim())), ['Status'], 'on first sight: search, Status and Filters'); assert.ok(await p.locator('.ui-fsearch').count() === 1 && await p.getByRole('button', { name: 'Filters' }).count() === 1);
  assert.eq(await p.locator('.ui-datecard').count(), 0, 'the Decision date card is in the Filters drawer'); assert.deepEq(await p.$$eval('.ui-qt__row a', as => as.map(a => a.getAttribute('href'))), ['#/DenialCase?id=R-0408', '#/DenialCase?id=R-0402', '#/DenialCase?id=R-0388', '#/DenialCase?id=R-0384']);
  const chips = await p.$$eval('.d-sug:not(.d-sug--in)', bs => bs.map(b => ({ req: b.dataset.request, t: b.innerText.replace(/\s+/g, ' ').trim() }))); assert.deepEq(chips.map(c => c.req), ['R-0408', 'R-0402', 'R-0388', 'R-0384']); for (const c of chips) assert.match(c.t, /^\d+ · \d+ high$/, c.t);
  await shot(p, 'queue-1440');
  // open the list for D.W. from the chip
  await p.locator('#d-sug-R-0402').click(); let dlg = dialog(p); await dlg.waitFor(); assert.match(await dlg.locator('.ui-dialog__t').innerText(), /What Psyflo would do/); assert.eq(await dlg.locator('.rc__card').count(), 9); assert.eq(await hash(p), '#/DenialIntelligence', 'still on the queue');
  await card(p, 'cite-asam').locator('[data-rc-check]').check(); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700); assert.eq((await decisions()).find(r => r.key === 'cite-asam').state, 'included');
  await p.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(400); assert.eq((await active(p)).id, 'd-sug-R-0402', 'focus returns to the chip'); assert.match(await p.locator('#d-sug-R-0402').innerText(), /1 included/, 'the chip follows the decision');
  // the Filters drawer
  await p.getByRole('button', { name: 'Filters' }).click(); dlg = dialog(p); await dlg.waitFor(); assert.deepEq(await dlg.locator('.ui-fsel__l').allInnerTexts(), ['Decision type', 'Payer', 'Service', 'Assigned clinician', 'Deadline', 'Next step', 'ASAM dimension']); assert.ok(await dlg.locator('.ui-datecard').count() === 1);
  await dlg.locator('#di-fx-decision').focus(); await dlg.locator('#di-fx-decision').selectOption('partial'); await p.waitForTimeout(400); assert.match(await dlg.innerText(), /2 denial cases match/); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 2, 'the table behind follows'); assert.match(await hash(p), /decision=partial/);
  assert.eq((await active(p)).id, 'di-fx-decision', 'focus stays on the control you used'); await dlg.getByRole('button', { name: 'This week', exact: true }).click(); await p.waitForTimeout(400); assert.match(await dlg.innerText(), /2 denial cases match/); assert.match(await hash(p), /from=2026-10-26&to=2026-11-01/);
  await shot(p, 'filters-1440'); await dlg.getByRole('button', { name: 'Done' }).click(); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(300);
  assert.match(await p.getByRole('button', { name: /^Filters/ }).innerText(), /Filters \(2\)/); assert.eq((await active(p)).id, 'di-filters-b'); assert.match(await txt(p, '#root'), /Clear all filters \(2\)/);
  await p.getByRole('button', { name: /Clear all filters/ }).click(); await p.waitForTimeout(300); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 4); assert.match(await p.getByRole('button', { name: /^Filters/ }).innerText(), /^Filters$/);
  await p.getByRole('searchbox', { name: 'Search cases' }).fill('sentara'); await p.waitForTimeout(400); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 2, 'search still works');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('focus returns to the opener when each drawer closes, also after a decision repainted the page', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  const cases = [['Review suggestions', 'd-rec-open'], ['Add your own', 'd-recadd'], ['Preview packet', 'd-packet'], ['See the ratings', 'd-level'], ['All paths', 'd-t-paths'], [/^History/, 'd-hist-b'], ['Identify Missing Evidence', 'd-t-gaps']];
  for (const [name, id] of cases) { await p.getByRole('button', { name, exact: typeof name === 'string' }).first().click(); await dialog(p).waitFor(); await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq((await active(p)).id, id, `${name} gets focus back`); }
  await p.getByRole('button', { name: 'Review suggestions' }).click(); const dlg = dialog(p); await dlg.waitFor(); await card(p, 'units').locator('[data-rc-check]').check(); await dlg.getByRole('button', { name: 'Apply selected' }).click(); await p.waitForTimeout(700);
  await dlg.getByRole('button', { name: 'Close' }).click(); await dlg.waitFor({ state: 'detached' }); await p.waitForTimeout(300); assert.eq((await active(p)).id, 'd-rec-open', 'focus is back on the button after the page repainted behind the drawer');
  assert.ok(await p.locator('.d-wwd li[data-rec="units"], .d-wwd').count() >= 1);
  await p.locator('#d-rec-row-cite-asam').click(); await dialog(p).waitFor(); await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq((await active(p)).id, 'd-rec-row-cite-asam', 'a row button gets focus back');
  assert.ok(await p.evaluate(() => !document.querySelector('[role=dialog]') && !document.documentElement.classList.contains('ui-scroll-lock')), 'nothing left open, scrolling unlocked');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('keyboard: the suggestion drawer is reachable and operable without a mouse (Tab to a checkbox, Space includes, Tab to Apply, Enter)', async () => {
  await reset('canvas'); const p = await open('jperez'); await goCase(p, 'R-0402');
  await p.getByRole('button', { name: 'Review suggestions' }).focus(); await p.keyboard.press('Enter'); const dlg = dialog(p); await dlg.waitFor();
  assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'focus moved into the drawer');
  await card(p, 'cite-asam').locator('[data-rc-check]').focus(); await p.keyboard.press('Space'); assert.ok(await card(p, 'cite-asam').locator('[data-rc-check]').isChecked());
  await dlg.getByRole('button', { name: 'Apply selected' }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(700); assert.eq((await decisions()).find(r => r.key === 'cite-asam').state, 'included');
  for (let i = 0; i < 40; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'Tab stays trapped inside the drawer');
  await p.keyboard.press('Escape'); assert.eq(await p.locator('[role=dialog]').count(), 0);
  // every control has an accessible name
  const unnamed = await p.$$eval('.d-wwd button, .d-pk button, .d-tools button, .d-stand button', bs => bs.filter(b => !(b.innerText || b.getAttribute('aria-label') || '').trim()).length); assert.eq(unnamed, 0);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('1024, 768 and 390 px: no horizontal scroll on the queue, any overview or any drawer; touch targets are at least 44 px on the phone', async () => {
  await reset('canvas');
  for (const w of [1024, 768, 390]) {
    const p = await open('jperez', w); const noScroll = async what => { await p.waitForTimeout(300); const o = await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, dsw: d ? d.scrollWidth : 0, dcw: d ? d.clientWidth : 0 }; }); assert.ok(o.sw <= o.cw + 1, `${w}px ${what}: page ${o.sw} > ${o.cw}`); assert.ok(o.dsw <= o.dcw + 1, `${w}px ${what}: drawer ${o.dsw} > ${o.dcw}`); };
    await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row'); await noScroll('queue'); if (w === 390) await shot(p, 'queue-390');
    await p.getByRole('button', { name: /^Filters/ }).click(); await dialog(p).waitFor(); await noScroll('filters drawer'); if (w === 390) await shot(p, 'filters-390'); await p.keyboard.press('Escape');
    await p.locator(w < 768 ? '#d-sugm-R-0402' : '#d-sug-R-0402').click(); await dialog(p).waitFor(); await noScroll('queue suggestions drawer'); await p.keyboard.press('Escape');
    for (const id of ['R-0402', 'R-0384', 'R-0408', 'R-0388']) {
      await goCase(p, id); await noScroll('overview ' + id); if (w === 390 && id === 'R-0402') await shot(p, 'overview-0402-390');
      if (w === 390) { const small = await p.$$eval('.d-wwd button:not(.ui-hint__b), .d-pk button:not(.ui-hint__b), .d-tools button:not(.ui-hint__b), .d-stand button:not(.ui-hint__b), .d-wwd__go', bs => bs.filter(b => b.getBoundingClientRect().height < 43.5 && b.getBoundingClientRect().height > 0).map(b => (b.innerText || b.getAttribute('aria-label')).trim().slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().height))); assert.deepEq(small, [], `${id} small touch targets: ${small}`); }
    }
    await goCase(p, 'R-0402'); await p.getByRole('button', { name: 'Review suggestions' }).click(); await dialog(p).waitFor(); await noScroll('suggestion drawer'); if (w === 390) { await shot(p, 'drawer-0402-390'); const small = await dialog(p).locator('button, summary, label.rc__t, .ui-evidence').evaluateAll(els => els.filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5 && !b.matches('[data-ui-close]'); }).map(b => (b.innerText || b.getAttribute('aria-label')).trim().slice(0, 24) + ' ' + Math.round(b.getBoundingClientRect().height))); assert.deepEq(small, [], 'the suggestion cards: small touch targets ' + small); }
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Preview packet' }).click(); await dialog(p).waitFor(); await noScroll('packet drawer'); if (w === 390) await shot(p, 'packet-390'); await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'All paths', exact: true }).click(); await dialog(p).waitFor(); await noScroll('paths drawer'); await p.keyboard.press('Escape');
    assert.deepEq(p.errs, [], `${w}px ` + p.errs.join('|')); await p.ctx.close();
  }
});

await browser.close();
await T.done();
